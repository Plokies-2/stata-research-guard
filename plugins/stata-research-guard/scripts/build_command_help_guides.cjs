"use strict";

/*
 * Build Phase 2 command-help material from Stata help sources.
 *
 * prepare:
 *   - resolves official Stata 18 help topics and stored maintainer help files
 *   - expands INCLUDE help directives without changing their source order
 *   - writes a Stata do-file that renders the staged SMCL with smcl2txt
 *
 * finalize:
 *   - combines rendered topic files per command
 *   - writes data/command_help_guides/<command>.txt and the JSON index
 *
 * Stata execution is intentionally kept outside this script so the generated
 * do-file can be run through the project's normal mcpStata execution path.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_ROOT = path.join(PLUGIN_ROOT, "data");
const REGISTRY_PATH = path.join(DATA_ROOT, "command_registry.json");
const SOURCE_CATALOG_PATH = path.join(DATA_ROOT, "command_source_catalog.json");
const OUTPUT_INDEX_PATH = path.join(DATA_ROOT, "command_help_guides.json");
const OUTPUT_CONTENT_DIR = path.join(DATA_ROOT, "command_help_guides");

const OFFICIAL_TOPIC_OVERRIDES = new Map([
  ["decode", ["encode"]],
  ["export_delimited", ["import_delimited"]],
  ["export_excel", ["import_excel"]],
  ["replace", ["generate"]],
  ["testparm", ["test"]],
  ["tostring", ["destring"]],
  ["twoway", ["graph_twoway"]],
]);

const COLLECT_STYLE_TOPICS = [
  "collect_style__cons",
  "collect_style_autolevels",
  "collect_style_cell",
  "collect_style_clear",
  "collect_style_column",
  "collect_style_header",
  "collect_style_html",
  "collect_style_notes",
  "collect_style_putdocx",
  "collect_style_putpdf",
  "collect_style_row",
  "collect_style_save",
  "collect_style_showbase",
  "collect_style_showempty",
  "collect_style_showomit",
  "collect_style_table",
  "collect_style_tex",
  "collect_style_title",
  "collect_style_use",
];

const COLLECT_STYLE_MISSING_TOPICS = ["collect_style_smcl", "collect_style_txt"];
const COLLECT_STYLE_ONLINE_SOURCES = [
  {
    topic: "collect_style_smcl",
    source_kind: "official Stata 19 command-entry PDF",
    source_url: "https://www.stata.com/manuals/tablescollectstylesmcl.pdf",
  },
  {
    topic: "collect_style_txt",
    source_kind: "official Stata 19 command-entry PDF",
    source_url: "https://www.stata.com/manuals/tablescollectstyletxt.pdf",
  },
];

const STATANOW_LIMITATIONS = new Map([
  ["areg", "This installed Stata 18 entry includes options explicitly marked as StataNow-only. Do not use those options unless the active Stata environment provides StataNow features."],
  ["xtreg", "This installed Stata 18 entry includes options explicitly marked as StataNow-only. Do not use those options unless the active Stata environment provides StataNow features."],
]);

function readUtf8(file) {
  return new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
}

function readHelpText(file) {
  const bytes = fs.readFileSync(file);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_) {
    return new TextDecoder("windows-1252", { fatal: true }).decode(bytes);
  }
}

function readJson(file) {
  return JSON.parse(readUtf8(file));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function relativeToPlugin(file) {
  return slash(path.relative(PLUGIN_ROOT, file));
}

function sourceStem(value) {
  return path.basename(value).replace(/\.(?:sthlp|hlp|ihlp)$/i, "").toLowerCase();
}

function addSourceKeys(map, source, aliases = []) {
  for (const alias of [path.basename(source), sourceStem(source), ...aliases]) {
    if (!alias) continue;
    const key = String(alias).replace(/\.(?:sthlp|hlp|ihlp)$/i, "").toLowerCase();
    if (!map.has(key)) map.set(key, source);
  }
}

function walkHelpFiles(root, output = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) walkHelpFiles(target, output);
    else if (entry.isFile() && /\.(?:sthlp|hlp|ihlp)$/i.test(entry.name)) output.push(target);
  }
  return output;
}

function buildInstalledHelpMap(stataBase) {
  const map = new Map();
  for (const file of walkHelpFiles(stataBase)) addSourceKeys(map, file);
  return map;
}

function buildMaintainerHelpMap(sourceCatalog) {
  const map = new Map();
  for (const guide of sourceCatalog) {
    for (const source of [guide, ...(guide.supplemental_sources || [])]) {
      if (!source.source_file || !/\.(?:sthlp|hlp|ihlp)$/i.test(source.source_file)) continue;
      const absolute = path.join(DATA_ROOT, ...source.source_file.split("/"));
      const aliases = [];
      if (source.include_name) aliases.push(source.include_name);
      if (source.source_url) {
        try { aliases.push(path.basename(new URL(source.source_url).pathname)); } catch (_) { /* stored URL may be nonstandard */ }
      }
      addSourceKeys(map, absolute, aliases);
    }
  }
  return map;
}

function resolveInclude(name, localMap, installedMap) {
  const key = String(name).trim().replace(/["']/g, "").replace(/\.(?:sthlp|hlp|ihlp)$/i, "").toLowerCase();
  return localMap.get(key) || installedMap.get(key) || null;
}

function expandHelpSource(file, localMap, installedMap, state = { stack: [], used: [], unresolved: [] }) {
  const absolute = path.resolve(file);
  if (state.stack.includes(absolute)) {
    state.unresolved.push(`cyclic include: ${sourceStem(absolute)}`);
    return `{pstd}Cyclic help include omitted: ${sourceStem(absolute)}{p_end}`;
  }
  state.stack.push(absolute);
  state.used.push(absolute);
  const lines = readHelpText(absolute).split(/\r?\n/);
  const output = [];
  for (const line of lines) {
    const include = line.match(/^\s*INCLUDE\s+help\s+([^\s]+)\s*$/i);
    if (include) {
      const target = resolveInclude(include[1], localMap, installedMap);
      if (!target) {
        state.unresolved.push(`unresolved include: ${include[1]}`);
        output.push(line);
      } else {
        output.push(expandHelpSource(target, localMap, installedMap, state));
      }
      continue;
    }
    const alias = line.match(/^\s*\.h\s+([^\s]+)\s*$/i);
    if (alias) {
      const target = resolveInclude(alias[1], localMap, installedMap);
      if (!target) {
        state.unresolved.push(`unresolved help alias: ${alias[1]}`);
        output.push(line);
      } else {
        output.push(expandHelpSource(target, localMap, installedMap, state));
      }
      continue;
    }
    output.push(line);
  }
  state.stack.pop();
  return output.join("\n");
}

function provenance(file, stataBase) {
  const bytes = fs.readFileSync(file);
  const installed = path.resolve(file).startsWith(path.resolve(stataBase) + path.sep);
  return {
    source_path: installed
      ? `Stata18/ado/base/${slash(path.relative(stataBase, file))}`
      : relativeToPlugin(file),
    source_sha256: sha256(bytes),
  };
}

function componentPlan(label, source, workDir, localMap, installedMap, stataBase, index) {
  const state = { stack: [], used: [], unresolved: [] };
  const expanded = expandHelpSource(source, localMap, installedMap, state);
  const safeLabel = label.replace(/[^A-Za-z0-9_]+/g, "_");
  const stem = `${String(index).padStart(3, "0")}-${safeLabel}`;
  const staged = path.join(workDir, "staged", `${stem}.sthlp`);
  const rendered = path.join(workDir, "rendered", `${stem}.txt`);
  fs.writeFileSync(staged, expanded.replace(/\r\n/g, "\n"), "utf8");
  return {
    label,
    staged_file: staged,
    rendered_file: rendered,
    source_files: [...new Set(state.used)].map((file) => provenance(file, stataBase)),
    unresolved_includes: [...new Set(state.unresolved)],
  };
}

function topicsForOfficial(command) {
  if (command === "collect_style") return COLLECT_STYLE_TOPICS;
  return OFFICIAL_TOPIC_OVERRIDES.get(command) || [command];
}

function prepare({ workDir, stataBase }) {
  fs.mkdirSync(path.join(workDir, "staged"), { recursive: true });
  fs.mkdirSync(path.join(workDir, "rendered"), { recursive: true });

  const registry = readJson(REGISTRY_PATH);
  const sourceCatalog = readJson(SOURCE_CATALOG_PATH).commands;
  const sourcesByCommand = new Map(sourceCatalog.map((row) => [row.command, row]));
  const installedMap = buildInstalledHelpMap(stataBase);
  const localMap = buildMaintainerHelpMap(sourceCatalog);
  const records = [];
  let componentIndex = 0;

  for (const commandRow of registry.commands) {
    const command = commandRow.command;
    const guide = sourcesByCommand.get(command);
    const record = {
      command,
      authority: guide?.authority || null,
      source_kind: null,
      source_version: null,
      source_url: guide?.source_url || null,
      help_status: "unavailable",
      help_topics: [],
      components: [],
      limitations: [...(guide?.limitations || [])],
      related_online_sources: [],
    };

    if (guide?.authority?.startsWith("StataCorp")) {
      record.source_kind = "installed official Stata help";
      record.source_version = STATANOW_LIMITATIONS.has(command)
        ? "Stata 18 installation with explicitly marked StataNow features"
        : "Stata 18";
      if (STATANOW_LIMITATIONS.has(command)) record.limitations.push(STATANOW_LIMITATIONS.get(command));
      const topics = topicsForOfficial(command);
      for (const topic of topics) {
        const source = installedMap.get(topic.toLowerCase());
        if (!source) {
          record.limitations.push(`Stata 18 help topic not found: ${topic}`);
          continue;
        }
        record.help_topics.push(topic);
        record.components.push(componentPlan(topic, source, workDir, localMap, installedMap, stataBase, componentIndex++));
      }
      if (command === "collect_style") {
        record.help_status = record.components.length === COLLECT_STYLE_TOPICS.length ? "available" : "partial";
        record.limitations.push(`Stata 18 scope excludes the later Stata 19 topics: ${COLLECT_STYLE_MISSING_TOPICS.join(", ")}`);
        record.related_online_sources = COLLECT_STYLE_ONLINE_SOURCES;
      } else if (record.components.length > 0) {
        record.help_status = "available";
      }
    } else if (guide && /\.(?:sthlp|hlp|ihlp)$/i.test(guide.source_file || "")) {
      record.source_kind = guide.source_kind || "stored maintainer help";
      record.source_version = guide.source_version || null;
      const sources = [path.join(DATA_ROOT, ...guide.source_file.split("/"))];
      if (command === "gstats") {
        for (const supplemental of guide.supplemental_sources || []) {
          if (/\.(?:sthlp|hlp|ihlp)$/i.test(supplemental.source_file || "")) {
            sources.push(path.join(DATA_ROOT, ...supplemental.source_file.split("/")));
          }
        }
      }
      for (const source of sources) {
        const label = sourceStem(source).replace(/[-_][0-9a-f]{7,}.*$/i, "");
        record.help_topics.push(label);
        record.components.push(componentPlan(label, source, workDir, localMap, installedMap, stataBase, componentIndex++));
      }
      record.help_status = record.components.length > 0 ? "available" : "unavailable";
    } else {
      record.source_kind = guide?.expanded_source ? "help unavailable; author supplement retained" : "help unavailable";
      record.source_version = guide?.expanded_source?.source_version || null;
      record.limitations.push("No authoritative Stata help source is stored for this command.");
    }

    for (const component of record.components) {
      record.limitations.push(...component.unresolved_includes);
    }
    record.limitations = [...new Set(record.limitations)];
    records.push(record);
  }

  const plan = {
    schema_version: "1.0",
    renderer: "Stata translate with translator(smcl2txt)",
    renderer_options: "replace header(off) logo(off) cmdnumber(off) lmargin(0) linesize(255) pagelines(0)",
    records,
  };
  fs.writeFileSync(path.join(workDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  const doLines = ["version 18", "set more off"];
  for (const record of records) {
    for (const component of record.components) {
      const input = slash(component.staged_file).replaceAll('"', '""');
      const output = slash(component.rendered_file).replaceAll('"', '""');
      doLines.push(`translate "${input}" "${output}", translator(smcl2txt) replace header(off) logo(off) cmdnumber(off) lmargin(0) linesize(255) pagelines(0)`);
    }
  }
  doLines.push("display as text \"COMMAND_HELP_RENDER_COMPLETE\"");
  fs.writeFileSync(path.join(workDir, "render_help.do"), `${doLines.join("\n")}\n`, "utf8");
  return plan;
}

function finalize({ workDir }) {
  const plan = readJson(path.join(workDir, "plan.json"));
  fs.mkdirSync(OUTPUT_CONTENT_DIR, { recursive: true });
  const guides = [];

  for (const record of plan.records) {
    const rendered = [];
    for (const component of record.components) {
      if (!fs.existsSync(component.rendered_file)) {
        record.limitations.push(`Rendered help topic missing: ${component.label}`);
        continue;
      }
      const content = readUtf8(component.rendered_file).replace(/\r\n/g, "\n").trim();
      if (content) rendered.push({ label: component.label, content });
    }

    let contentFile = null;
    let contentHash = null;
    let status = record.help_status;
    if (rendered.length > 0) {
      const content = rendered.length === 1
        ? `${rendered[0].content}\n`
        : `${rendered.map((part) => `===== Help topic: ${part.label} =====\n\n${part.content}`).join("\n\n")}\n`;
      const output = path.join(OUTPUT_CONTENT_DIR, `${record.command}.txt`);
      fs.writeFileSync(output, content, "utf8");
      contentFile = relativeToPlugin(output).replace(/^data\//, "");
      contentHash = sha256(fs.readFileSync(output));
      if (rendered.length < record.components.length && status === "available") status = "partial";
    } else {
      status = "unavailable";
    }

    guides.push({
      record_type: "command_help_guide",
      command: record.command,
      help_status: status,
      authority: record.authority,
      source_kind: record.source_kind,
      source_version: record.source_version,
      source_url: record.source_url,
      help_topics: record.help_topics,
      source_files: record.components.flatMap((component) => component.source_files),
      content_file: contentFile,
      content_sha256: contentHash,
      content_format: contentFile ? "plain_text" : null,
      renderer: plan.renderer,
      renderer_options: plan.renderer_options,
      limitations: [...new Set(record.limitations)],
      related_online_sources: record.related_online_sources,
    });
  }

  const index = {
    schema_version: "1.0",
    source_runtime: "Stata 18",
    guides,
  };
  fs.writeFileSync(OUTPUT_INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return index;
}

function parseArgs(argv) {
  const mode = argv[0];
  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    values.set(argv[index], argv[index + 1]);
  }
  const workDir = path.resolve(values.get("--work-dir") || path.join(PLUGIN_ROOT, "..", "..", "work", "command-help-phase2"));
  const stataBase = path.resolve(values.get("--stata-base") || "C:/Program Files/Stata18/ado/base");
  if (!new Set(["prepare", "finalize"]).has(mode)) {
    throw new Error("usage: node build_command_help_guides.cjs <prepare|finalize> [--work-dir PATH] [--stata-base PATH]");
  }
  return { mode, workDir, stataBase };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = options.mode === "prepare" ? prepare(options) : finalize(options);
  const counts = result.guides
    ? result.guides.reduce((acc, row) => ((acc[row.help_status] = (acc[row.help_status] || 0) + 1), acc), {})
    : result.records.reduce((acc, row) => ((acc[row.help_status] = (acc[row.help_status] || 0) + 1), acc), {});
  process.stdout.write(`${JSON.stringify({ mode: options.mode, work_dir: options.workDir, command_count: (result.guides || result.records).length, status_counts: counts }, null, 2)}\n`);
}

if (require.main === module) main();

module.exports = { finalize, prepare };
