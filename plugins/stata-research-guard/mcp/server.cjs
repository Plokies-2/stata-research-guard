"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_ROOT = path.join(PLUGIN_ROOT, "data");
const REGISTRY_PATH = path.join(DATA_ROOT, "command_registry.json");
const MANUAL_INDEX_PATH = path.join(DATA_ROOT, "manual_index.jsonl");
const OFFICIAL_EXAMPLES_PATH = path.join(DATA_ROOT, "official_examples.json");
const WEB_SOURCES_PATH = path.join(DATA_ROOT, "official_web_sources.json");
const COMMAND_SOURCES_PATH = path.join(DATA_ROOT, "command_sources.json");
const FORMATTER_PATH = path.join(
  PLUGIN_ROOT,
  "annotations",
  "source_snapshots",
  "default_style_outreg2_xlsx.do",
);

const FORBIDDEN_RESPONSE_KEYS = new Set([
  "winner",
  "score",
  "pass",
  "fail",
  "auto_select",
  "auto_selectable",
  "promotion_status",
  "approved_for_generation",
  "generation_authority",
  "selection_required",
  "split_required",
  "general_rule",
  "recommended",
  "recommendation",
]);

const MAX_PROJECT_FILES = 1000;
const MAX_PROJECT_OBSERVATIONS = 500;
const MAX_EXAMPLE_CHARS = 2600;

function readJson(file) {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file)));
}

function readJsonl(file) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path.basename(file)}:${index + 1}: ${error.message}`);
    }
  });
}

const registry = readJson(REGISTRY_PATH);
const manualIndex = readJsonl(MANUAL_INDEX_PATH);
const officialExamples = readJson(OFFICIAL_EXAMPLES_PATH);
const webSources = readJson(WEB_SOURCES_PATH);
const commandSources = readJson(COMMAND_SOURCES_PATH).sources;

const familiesById = new Map(registry.families.map((family) => [family.family_id, family]));
const commandsByName = new Map(registry.commands.map((command) => [command.command, command]));

const ATOM_RULES = [
  {
    id: "estimation.instrumental_variables",
    label: "Instrumental-variables estimation",
    pattern: /\b(iv|2sls|instrumental variables?|ivregress|ivreg2|ivreghdfe)\b|도구변수|도구 변수/i,
    commands: ["ivregress", "ivreg2", "ivreghdfe", "xtivreg"],
  },
  {
    id: "estimation.difference_in_differences",
    label: "Difference-in-differences estimation",
    pattern: /difference[- ]in[- ]differences?|\bdid\b|차분의 차분|이중차분|didregress|xtdidregress|csdid|did_multiplegt_dyn/i,
    commands: ["didregress", "xtdidregress", "csdid", "did_multiplegt_dyn", "eventstudyinteract", "reghdfe"],
  },
  {
    id: "estimation.event_study",
    label: "Event-study estimation",
    pattern: /event[- ]study|event study|사건연구|이벤트[ -]?스터디/i,
    commands: ["reghdfe", "xtreg", "areg", "regress", "eventstudyinteract", "csdid"],
  },
  {
    id: "estimation.linear",
    label: "Linear regression",
    pattern: /\b(regress|regression|ols|linear model|areg|reghdfe|xtreg)\b|회귀|선형모형|선형 모형/i,
    commands: ["regress", "areg", "xtreg", "reghdfe"],
  },
  {
    id: "export.regression_excel",
    label: "Regression-table export to Excel",
    pattern: /(excel|xlsx|xls|workbook|엑셀).*(export|save|table|regression|회귀|저장|표)|(export|save|table|regression|회귀|저장|표).*(excel|xlsx|xls|workbook|엑셀)|\boutreg2\b/i,
    commands: ["collect_export", "etable", "esttab", "outreg2", "putexcel"],
    includeFormatter: true,
  },
  {
    id: "descriptives.summary",
    label: "Descriptive statistics",
    pattern: /descriptive|summary statistics?|summari[sz]e|tabstat|기술통계|요약통계|요약 통계/i,
    commands: ["summarize", "tabstat", "table", "dtable", "tabulate"],
  },
  {
    id: "data.merge_append",
    label: "Dataset combination",
    pattern: /\b(merge|append|join)\b|병합|결합|붙이기/i,
    commands: ["merge", "append", "joinby", "rangejoin"],
  },
  {
    id: "data.reshape_collapse",
    label: "Data reshaping or aggregation",
    pattern: /\b(reshape|collapse|contract|aggregate)\b|재구조화|집계/i,
    commands: ["reshape", "collapse", "contract", "gcollapse"],
  },
  {
    id: "figures.graph",
    label: "Graph construction and export",
    pattern: /\b(graph|plot|figure|coefplot|twoway)\b|그래프|그림|도표/i,
    commands: ["coefplot", "graph", "twoway", "marginsplot"],
  },
];

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function commandInvocation(command) {
  const special = {
    collect_export: "collect export",
    export_delimited: "export delimited",
    export_excel: "export excel",
    import_delimited: "import delimited",
    import_excel: "import excel",
  };
  return special[command] || command;
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function formatterCard() {
  if (!fs.existsSync(FORMATTER_PATH)) return null;
  return {
    command: "outreg2_xlsx",
    invocation: "outreg2_xlsx, estimates() workbook() sheet() adjdec() meandec()",
    package: "Stata Research Guard approved helper",
    aliases: ["multi-sheet outreg2 formatter"],
    functional_labels: ["exports"],
    supported_features: [
      "places caller-declared stored estimates on one named worksheet",
      "preserves the raw outreg2 body and adds adjusted R-squared and dependent-variable mean rows",
    ],
    required_input_state: [
      "caller has already chosen and stored the estimates",
      "caller has already chosen the workbook and worksheet placement",
    ],
    output_interface: ["one named worksheet in an .xlsx workbook"],
    tradeoffs_and_incompatibilities: [
      "a formatter, not an estimator or research-design rule",
      "does not choose outcomes, samples, specifications, model roles, or worksheet grouping",
    ],
    authority_sources: [{
      authority: "user-approved internal implementation",
      source_path: "annotations/source_snapshots/default_style_outreg2_xlsx.do",
      source_hash: sha256File(FORMATTER_PATH),
    }],
  };
}

function commandMentioned(request, command) {
  const forms = unique([command, commandInvocation(command), ...(commandsByName.get(command)?.aliases || [])]);
  const haystack = request.toLowerCase();
  const ambiguous = new Set([
    "append", "contract", "generate", "graph", "merge", "predict", "replace",
    "save", "summarize", "table", "test", "use",
  ]);
  return forms.some((form) => {
    const needle = String(form).toLowerCase();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (ambiguous.has(needle)) {
      return new RegExp(`(?:command|명령(?:어)?)\\s+[\`']?${escaped}[\`']?\\b`, "i").test(haystack)
        || new RegExp(`[\`]${escaped}[\`]`, "i").test(haystack);
    }
    return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:$|[^A-Za-z0-9_])`, "i").test(haystack);
  });
}

function deriveTaskAtoms(request) {
  const atoms = [];
  for (const rule of ATOM_RULES) {
    if (!rule.pattern.test(request)) continue;
    atoms.push({
      id: rule.id,
      functional_label: rule.label,
      request_fragment: request,
      candidate_commands: rule.commands.filter((command) => commandsByName.has(command)).sort(),
      include_formatter: Boolean(rule.includeFormatter),
    });
  }

  const mentioned = registry.commands
    .filter((command) => commandMentioned(request, command.command))
    .map((command) => command.command)
    .sort();
  const alreadyIncluded = new Set(atoms.flatMap((atom) => atom.candidate_commands));
  const uncovered = mentioned.filter((command) => !alreadyIncluded.has(command));
  if (uncovered.length) {
    atoms.push({
      id: "stata.explicit_commands",
      functional_label: "Explicitly named Stata commands",
      request_fragment: request,
      candidate_commands: uncovered,
      include_formatter: false,
    });
  }

  if (!atoms.length) {
    atoms.push({
      id: "stata.command_support",
      functional_label: "Stata command support",
      request_fragment: request,
      candidate_commands: mentioned,
      include_formatter: false,
    });
  }
  return atoms;
}

function manualRowsFor(command) {
  return manualIndex
    .filter((row) => Array.isArray(row.commands) && row.commands.includes(command))
    .sort((left, right) => {
      const authorityOrder = String(left.authority).localeCompare(String(right.authority));
      if (authorityOrder) return authorityOrder;
      return Number(left.page || 0) - Number(right.page || 0);
    });
}

function sourceCardsFor(command) {
  const cards = [];
  const seen = new Set();
  for (const row of manualRowsFor(command)) {
    const key = `${row.source_url}|${row.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority === "community" ? "maintainer or package documentation" : "StataCorp official",
      source_url: row.source_url,
      page_or_section: row.page ? `page ${row.page}` : null,
      source_file: row.source_file,
      source_hash: row.file_sha256,
    });
    if (cards.length >= 2) break;
  }
  for (const row of webSources.filter((source) => source.command === command)) {
    const key = `${row.source_url}|`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority === "official" ? "StataCorp official" : "maintainer or package documentation",
      source_url: row.source_url,
      page_or_section: null,
      verified_on: row.verified_on || null,
    });
  }
  for (const row of commandSources.filter((source) => source.command === command)) {
    const key = `${row.source_url}|`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority,
      source_url: row.source_url,
      page_or_section: row.page_or_section || null,
      source_kind: row.source_kind,
    });
  }
  return cards;
}

function commandCard(commandName) {
  const command = commandsByName.get(commandName);
  if (!command) return null;
  const family = familiesById.get(command.family_id) || {};
  const readableSourceAvailable = manualRowsFor(command.command).length > 0;
  return {
    command: command.command,
    invocation: command.invocation || commandInvocation(command.command),
    package: family.display_name || command.family_id,
    aliases: command.aliases || [],
    functional_labels: unique([family.category, ...(command.stages || [])]),
    supported_features: unique([family.display_name, family.category, ...(command.stages || []), ...(family.features || [])]),
    required_input_state: command.required_input_state || [],
    output_interface: command.output_interface || [],
    tradeoffs_and_incompatibilities: command.tradeoffs_and_incompatibilities || [],
    authority_sources: sourceCardsFor(command.command),
    evidence_gaps: unique([
      ...(!readableSourceAvailable ? ["readable local authoritative example unavailable"] : []),
      ...(!(command.required_input_state || []).length ? ["required input state not summarized in the registry; read the authoritative source"] : []),
      ...(!(command.output_interface || []).length ? ["returned state or output interface not summarized in the registry; read the authoritative source"] : []),
      ...(!(command.tradeoffs_and_incompatibilities || []).length ? ["tradeoffs and incompatibilities not summarized in the registry; read the authoritative source"] : []),
    ]),
  };
}

function excerpt(text, limit = MAX_EXAMPLE_CHARS) {
  const clean = String(text || "").replace(/\u0000/g, "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trimEnd()}…`;
}

function manualExampleQuality(row, command) {
  const content = String(row.content || "");
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let quality = 0;
  if (/quick start/i.test(content)) quality += 8;
  if (/syntax/i.test(content)) quality += 5;
  if (new RegExp(`(?:^|\\n)\\s*\\.?\\s*${escaped}(?:\\s|,)`, "im").test(content)) quality += 10;
  if (/\/help\//i.test(String(row.source_url))) quality += 5;
  if (/abstract/i.test(content.slice(0, 500))) quality -= 10;
  return quality;
}

function anchoredExcerpt(text, command) {
  const lines = String(text || "").replace(/\u0000/g, "").split(/\r?\n/);
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const invocation = new RegExp(`^\\s*\\.?\\s*${escaped}(?:\\s|,)`, "i");
  const anchor = lines.findIndex((line) => invocation.test(line));
  if (anchor < 0) return excerpt(text);
  return excerpt(lines.slice(Math.max(0, anchor - 2), anchor + 19).join("\n"));
}

function examplesFor(commands) {
  const output = [];
  for (const command of commands) {
    const manual = manualRowsFor(command)
      .sort((left, right) => manualExampleQuality(right, command) - manualExampleQuality(left, command))[0];
    if (manual) {
      output.push({
        command,
        authority: manual.authority === "community" ? "maintainer or package documentation" : "StataCorp official",
        example_kind: "readable documentation excerpt",
        binding: "nonbinding",
        source_url: manual.source_url,
        page_or_section: manual.page ? `page ${manual.page}` : null,
        source_file: manual.source_file,
        source_hash: manual.file_sha256,
        excerpt: anchoredExcerpt(manual.content, command),
      });
    }
    const fixture = officialExamples.find((row) => row.command === command);
    if (fixture) {
      output.push({
        command,
        authority: fixture.authority === "official" ? "StataCorp official source" : fixture.authority,
        example_kind: fixture.example_origin,
        binding: "nonbinding document-derived fixture",
        verbatim: Boolean(fixture.verbatim),
        source_url: fixture.source_url,
        page_or_section: fixture.page ? `page ${fixture.page}` : null,
        source_file: fixture.source_file,
        derivation: fixture.derivation,
        code: fixture.code,
      });
    }
  }
  return output;
}

function isInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function resolveProjectRoot(projectPath) {
  const resolved = path.resolve(projectPath);
  const real = fs.realpathSync(resolved);
  if (!fs.statSync(real).isDirectory()) throw new Error("project_path must resolve to a directory");
  return real;
}

function resolveExistingInside(root, relative) {
  if (typeof relative !== "string" || !relative.trim()) throw new Error("target_files entries must be non-empty strings");
  if (path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) throw new Error(`target file must be project-relative: ${relative}`);
  const lexical = path.resolve(root, relative);
  if (!isInside(root, lexical)) throw new Error(`target file escapes project_path: ${relative}`);
  const real = fs.realpathSync(lexical);
  if (!isInside(root, real)) throw new Error(`target file resolves outside project_path: ${relative}`);
  if (!fs.statSync(real).isFile()) throw new Error(`target is not a file: ${relative}`);
  return real;
}

function listDoFiles(root) {
  const output = [];
  const excluded = new Set([".git", "node_modules", "cache", "tmp"]);
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (output.length >= MAX_PROJECT_FILES) return;
      if (entry.isSymbolicLink()) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name.toLowerCase())) walk(target);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".do")) {
        output.push(target);
      }
    }
  }
  walk(root);
  return output;
}

function logicalStatements(text) {
  const lines = text.split(/\r?\n/);
  const statements = [];
  let inBlockComment = false;
  let buffer = "";
  let startLine = null;
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    let visible = "";
    for (let position = 0; position < line.length;) {
      if (!inBlockComment && line.slice(position, position + 2) === "/*") {
        inBlockComment = true;
        position += 2;
      } else if (inBlockComment && line.slice(position, position + 2) === "*/") {
        inBlockComment = false;
        position += 2;
      } else {
        if (!inBlockComment) visible += line[position];
        position += 1;
      }
    }
    line = visible.trim();
    if (!line || line.startsWith("*") || line.startsWith("//")) continue;
    line = line.replace(/\s+\/\/.*$/, "").trim();
    if (startLine === null) startLine = index + 1;
    const continues = /\/\/\/\s*$/.test(line);
    buffer += `${buffer ? " " : ""}${line.replace(/\/\/\/\s*$/, "").trim()}`;
    if (!continues) {
      statements.push({ line: startLine, text: buffer.trim() });
      buffer = "";
      startLine = null;
    }
  }
  if (buffer) statements.push({ line: startLine, text: buffer.trim() });
  return statements;
}

function stripPrefixes(statement) {
  let value = statement.trim();
  value = value.replace(/^(capture|quietly|noisily)\s*:?\s*/i, "");
  value = value.replace(/^(bysort|by)\s+[^:]+:\s*/i, "");
  return value;
}

function detectCommand(statement) {
  const value = stripPrefixes(statement).toLowerCase();
  const commands = [...registry.commands].sort((left, right) => {
    return commandInvocation(right.command).length - commandInvocation(left.command).length;
  });
  for (const command of commands) {
    const forms = unique([command.invocation || commandInvocation(command.command), command.command, ...(command.aliases || [])]);
    if (forms.some((form) => value === form.toLowerCase() || value.startsWith(`${form.toLowerCase()} `) || value.startsWith(`${form.toLowerCase()},`))) {
      return command.command;
    }
  }
  const token = value.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
  return token || null;
}

function extractOptions(statement) {
  const comma = statement.indexOf(",");
  return comma >= 0 ? statement.slice(comma + 1).trim() : null;
}

function relationsFor(statement, command) {
  const relations = [];
  const rules = [
    ["call", /^(?:capture\s+|quietly\s+|noisily\s+)*(?:do|run|include)\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["input", /^(?:capture\s+|quietly\s+|noisily\s+)*use\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["output", /^(?:capture\s+|quietly\s+|noisily\s+)*save\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["output", /\b(?:graph\s+export|putexcel\s+set|collect\s+export)\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
  ];
  for (const [kind, pattern, fallbackIndex] of rules) {
    const match = statement.match(pattern);
    if (!match) continue;
    const value = match[1] || match[2] || match[fallbackIndex];
    if (value) relations.push({ kind, value });
  }
  const using = statement.match(/\busing\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i);
  if (using) {
    const outputUsingCommands = new Set([
      "collect_export", "esttab", "estout", "export_delimited", "export_excel",
      "outfile", "outreg2", "outsheet",
    ]);
    relations.push({
      kind: outputUsingCommands.has(command) ? "output" : "input",
      value: using[1] || using[2] || using[3],
    });
  }
  if (/\bestimates\s+(?:store|save|use|restore)\b/i.test(statement)) {
    relations.push({ kind: "estimate_handoff", value: stripPrefixes(statement) });
  }
  return relations;
}

function scanProjectCommandObservations(projectPath, targetFiles) {
  const root = resolveProjectRoot(projectPath);
  const files = targetFiles?.length
    ? targetFiles.map((file) => resolveExistingInside(root, file))
    : listDoFiles(root);
  const observations = [];
  const unresolved = [];
  if (!targetFiles?.length && files.length >= MAX_PROJECT_FILES) {
    unresolved.push(`project file scan reached the ${MAX_PROJECT_FILES}-file limit`);
  }
  for (const file of files) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
    } catch (error) {
      unresolved.push(`${path.relative(root, file)} could not be read as UTF-8: ${error.message}`);
      continue;
    }
    for (const statement of logicalStatements(text)) {
      const command = detectCommand(statement.text);
      if (!command) continue;
      observations.push({
        file: path.relative(root, file).split(path.sep).join("/"),
        line: statement.line,
        command,
        statement: statement.text,
        options: extractOptions(statement.text),
        relations: relationsFor(statement.text, command),
      });
      if (observations.length >= MAX_PROJECT_OBSERVATIONS) {
        unresolved.push(`project observation scan reached the ${MAX_PROJECT_OBSERVATIONS}-statement limit`);
        return { observations, unresolved };
      }
    }
  }
  return { observations, unresolved };
}

function assertNoForbiddenKeys(value, trail = "response") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key)) throw new Error(`forbidden response key at ${trail}.${key}`);
    assertNoForbiddenKeys(child, `${trail}.${key}`);
  }
}

function validateArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("arguments must be an object");
  if (typeof args.request !== "string" || !args.request.trim()) throw new Error("request must be a non-empty string");
  if (args.project_path !== undefined && (typeof args.project_path !== "string" || !args.project_path.trim())) {
    throw new Error("project_path must be a non-empty string when provided");
  }
  if (args.target_files !== undefined && (!Array.isArray(args.target_files) || args.target_files.some((file) => typeof file !== "string"))) {
    throw new Error("target_files must be an array of project-relative strings");
  }
  if (args.target_files?.length && !args.project_path) {
    throw new Error("project_path is required when target_files are provided");
  }
}

function buildCommandEvidence(args) {
  validateArguments(args);
  const taskAtoms = deriveTaskAtoms(args.request.trim());
  const commandNames = unique(taskAtoms.flatMap((atom) => atom.candidate_commands)).sort();
  const cards = commandNames.map(commandCard).filter(Boolean);
  if (taskAtoms.some((atom) => atom.include_formatter)) {
    const formatter = formatterCard();
    if (formatter) cards.push(formatter);
  }

  const unresolved = [];
  for (const card of cards) {
    if (!card.authority_sources.length) {
      unresolved.push(`No readable local official or maintainer source is stored for ${card.command}.`);
    }
  }

  let projectObservations = [];
  if (args.project_path) {
    const scan = scanProjectCommandObservations(args.project_path, args.target_files || []);
    projectObservations = scan.observations;
    unresolved.push(...scan.unresolved);
  }

  if (/paper|article|replication|논문|복제|선행연구|사용례/i.test(args.request)) {
    unresolved.push("No reviewed paper_usage_occurrence or paper_adaptation_card is currently stored.");
  }

  const response = {
    task_atoms: taskAtoms.map(({ include_formatter: includeFormatter, ...atom }) => ({
      ...atom,
      known_constraints: args.known_constraints === undefined
        ? null
        : typeof args.known_constraints === "string"
          ? args.known_constraints
          : JSON.stringify(args.known_constraints),
      candidate_commands: includeFormatter && cards.some((card) => card.command === "outreg2_xlsx")
        ? unique([...atom.candidate_commands, "outreg2_xlsx"]).sort()
        : atom.candidate_commands,
    })),
    command_cards: cards.sort((left, right) => left.command.localeCompare(right.command)),
    project_observations: projectObservations,
    authoritative_examples: examplesFor(commandNames),
    paper_usage_cards: [],
    unresolved_facts: unique(unresolved),
  };
  assertNoForbiddenKeys(response);
  return response;
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Return task-separated Stata command candidates, readable official or maintainer examples, factual project observations, and non-authoritative paper usage context. The tool does not choose a command or grade model-written code.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["request"],
      properties: {
        request: { type: "string", minLength: 1 },
        project_path: { type: "string", minLength: 1 },
        target_files: { type: "array", items: { type: "string", minLength: 1 } },
        known_constraints: {
          description: "Optional user- or project-supplied facts. They remain context for the model and do not trigger deterministic command selection.",
          oneOf: [{ type: "string" }, { type: "array" }, { type: "object" }],
        },
      },
    },
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "task_atoms",
        "command_cards",
        "project_observations",
        "authoritative_examples",
        "paper_usage_cards",
        "unresolved_facts",
      ],
      properties: {
        task_atoms: { type: "array", items: { type: "object" } },
        command_cards: { type: "array", items: { type: "object" } },
        project_observations: { type: "array", items: { type: "object" } },
        authoritative_examples: { type: "array", items: { type: "object" } },
        paper_usage_cards: { type: "array", items: { type: "object" } },
        unresolved_facts: { type: "array", items: { type: "string" } },
      },
    },
  },
];

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message) {
  return { isError: true, content: [{ type: "text", text: String(message) }] };
}

function dispatch(message) {
  if (!message || typeof message !== "object") return null;
  if (message.id === undefined || message.id === null) return null;
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "stataResearchGuard", version: "0.3.0" },
      },
    };
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: TOOL_DEFINITIONS } };
  }
  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (name !== "get_stata_command_evidence") {
      return { jsonrpc: "2.0", id: message.id, result: errorResult(`unknown tool: ${name}`) };
    }
    try {
      return { jsonrpc: "2.0", id: message.id, result: textResult(buildCommandEvidence(message.params?.arguments || {})) };
    } catch (error) {
      return { jsonrpc: "2.0", id: message.id, result: errorResult(error.message) };
    }
  }
  return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `method not found: ${message.method}` } };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function main() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } });
      return;
    }
    const response = dispatch(message);
    if (response) send(response);
  });
}

if (require.main === module) main();

module.exports = {
  FORBIDDEN_RESPONSE_KEYS,
  TOOL_DEFINITIONS,
  assertNoForbiddenKeys,
  buildCommandEvidence,
  deriveTaskAtoms,
  dispatch,
  logicalStatements,
  scanProjectCommandObservations,
};
