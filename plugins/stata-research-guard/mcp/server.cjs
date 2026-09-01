"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");
const os = require("node:os");
const childProcess = require("node:child_process");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_ROOT = path.join(PLUGIN_ROOT, "data");
const REGISTRY_PATH = path.join(DATA_ROOT, "command_registry.json");
const COMMAND_HELP_GUIDES_PATH = path.join(DATA_ROOT, "command_help_guides.json");
const EXPANDED_COMMAND_GUIDES_PATH = path.join(DATA_ROOT, "expanded_command_guides.json");
const PAPER_PROFILES_PATH = path.join(DATA_ROOT, "paper_example_profiles.jsonl");
const PAPER_BLOCKS_PATH = path.join(DATA_ROOT, "high_quality_paper_blocks.jsonl");
const PAPER_OCCURRENCES_PATH = path.join(DATA_ROOT, "paper_usage_occurrences.jsonl");
const PAPER_EXECUTION_CONTEXTS_PATH = path.join(DATA_ROOT, "paper_execution_contexts.jsonl");
const GENERAL_RULES_PATH = path.join(
  PLUGIN_ROOT,
  "skills",
  "stata-replication-workflow",
  "references",
  "general-rules.md",
);
const GENERAL_RULES_SOURCE_PATH = "skills/stata-replication-workflow/references/general-rules.md";
const EXACT_HELP_TOPIC = /^[A-Za-z][A-Za-z0-9_]*$/;
const STATA_COMMAND_WORDS = /^[A-Za-z][A-Za-z0-9_]*(?: [A-Za-z][A-Za-z0-9_]*)+$/;
const LIVE_HELP_TOPIC_ALIASES = new Map([
  ["global", "macro"],
  ["local", "macro"],
  ["tempfile", "macro"],
  ["tempname", "macro"],
]);
const LIVE_HELP_CACHE = new Map();

function readUtf8(file) {
  return new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
}

function readJson(file) {
  return JSON.parse(readUtf8(file));
}

function readJsonl(file) {
  return readUtf8(file).split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path.basename(file)}:${index + 1}: ${error.message}`);
    }
  });
}

function groupBy(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const value = row?.[key];
    if (!result.has(value)) result.set(value, []);
    result.get(value).push(row);
  }
  return result;
}

const registry = readJson(REGISTRY_PATH);
const commandsByName = new Map(registry.commands.map((row) => [row.command, row]));

const helpGuideIndex = readJson(COMMAND_HELP_GUIDES_PATH);
const helpGuidesByCommand = new Map(helpGuideIndex.guides.map((row) => [row.command, row]));

const expandedGuideIndex = readJson(EXPANDED_COMMAND_GUIDES_PATH);
const expandedGuidesByCommand = new Map(expandedGuideIndex.guides.map((row) => [row.command, row]));

const paperProfiles = readJsonl(PAPER_PROFILES_PATH);
const paperBlocks = readJsonl(PAPER_BLOCKS_PATH);
const paperOccurrences = readJsonl(PAPER_OCCURRENCES_PATH);
const paperExecutionContexts = fs.existsSync(PAPER_EXECUTION_CONTEXTS_PATH)
  ? readJsonl(PAPER_EXECUTION_CONTEXTS_PATH)
  : [];

const profilesById = new Map(paperProfiles.map((row) => [row.block_id, row]));
const profilesByCommand = groupBy(paperProfiles, "focus_command");
const blocksById = new Map(paperBlocks.map((row) => [row.block_id, row]));
const occurrencesById = new Map(paperOccurrences.map((row) => [row.occurrence_id, row]));
const executionContextsByBlock = groupBy(paperExecutionContexts, "parent_block_id");

// This one stored run contains 510 nuisance-coefficient rows.  These exact,
// manually chosen source ranges retain the output header, focal coefficient,
// and endogenous-variable footer.  There is no automatic size truncation.
const CURATED_LOG_RANGES = new Map([
  [
    "ooe--isolated-fresh-run--manual-block-084--a8f9001897094243b29824cf764bbdf09651a5c6371d5274d992a7da43c0b082",
    [
      { source_span_id: "log-span-002", start: 473, end: 482 },
      { source_span_id: "log-span-002", start: 992, end: 994 },
    ],
  ],
]);

function mainRules() {
  const content = readUtf8(GENERAL_RULES_PATH);
  return {
    source_path: GENERAL_RULES_SOURCE_PATH,
    sha256: sha256Text(content),
    content,
  };
}

function mainRulesReference() {
  const content = readUtf8(GENERAL_RULES_PATH);
  return {
    source_path: GENERAL_RULES_SOURCE_PATH,
    sha256: sha256Text(content),
  };
}

function compactCommandDictionary() {
  return registry.commands.map(({ command, family_id, stages, role }) => ({
    command,
    family_id,
    stages,
    role,
  }));
}

function exactHelpTopic(command) {
  if (typeof command !== "string" || !EXACT_HELP_TOPIC.test(command)) {
    throw new Error(`ABORT invalid_help_topic: ${JSON.stringify(command)}`);
  }
  return command;
}

function selectedHelpTopic(command) {
  if (typeof command === "string" && EXACT_HELP_TOPIC.test(command)) {
    return { requested: command, resolved: command, normalization: null };
  }
  if (typeof command === "string" && STATA_COMMAND_WORDS.test(command)) {
    const resolved = command.replaceAll(" ", "_");
    if (commandsByName.has(resolved)) {
      return {
        requested: command,
        resolved,
        normalization: {
          requested: command,
          resolved,
          reason: "registered_multiword_command",
        },
      };
    }
  }
  throw new Error(`ABORT invalid_help_topic: ${JSON.stringify(command)}`);
}

function selectedCommandsFrom(args) {
  if (!Array.isArray(args.selected_commands) || args.selected_commands.length === 0) {
    throw new Error("ABORT empty_command_selection: selected_commands must be a non-empty array of exact command topics");
  }
  const seen = new Set();
  const selectedCommands = [];
  const topicNormalizations = [];
  for (const command of args.selected_commands) {
    const topic = selectedHelpTopic(command);
    if (seen.has(topic.resolved)) {
      throw new Error(`ABORT duplicate_selected_command: ${JSON.stringify(topic.resolved)}`);
    }
    seen.add(topic.resolved);
    selectedCommands.push(topic.resolved);
    if (topic.normalization) topicNormalizations.push(topic.normalization);
  }
  return { selectedCommands, topicNormalizations };
}

function selectedBlockIdsFrom(args) {
  if (!Array.isArray(args.selected_block_ids) || args.selected_block_ids.length === 0) {
    throw new Error("ABORT empty_paper_block_selection: selected_block_ids must be a non-empty array of exact catalog IDs");
  }
  const seen = new Set();
  for (const blockId of args.selected_block_ids) {
    if (typeof blockId !== "string" || !profilesById.has(blockId)) {
      throw new Error(`ABORT paper_block_not_in_catalog: ${JSON.stringify(blockId)}`);
    }
    if (seen.has(blockId)) {
      throw new Error(`ABORT duplicate_paper_block_id: ${JSON.stringify(blockId)}`);
    }
    seen.add(blockId);
  }
  return [...args.selected_block_ids];
}

function optionalSelectedBlockIdsFrom(args) {
  if (!Object.prototype.hasOwnProperty.call(args, "selected_block_ids")) return [];
  if (Array.isArray(args.selected_block_ids) && args.selected_block_ids.length === 0) return [];
  return selectedBlockIdsFrom(args);
}

function optionalExpandedCommandsFrom(args, selectedCommands) {
  if (!Object.prototype.hasOwnProperty.call(args, "expanded_commands")) return [];
  if (!Array.isArray(args.expanded_commands)) {
    throw new Error("ABORT invalid_expanded_command_selection: expanded_commands must be an array of exact selected command keys");
  }
  if (args.expanded_commands.length === 0) return [];
  const seen = new Set();
  const expandedCommands = [];
  for (const command of args.expanded_commands) {
    const topic = selectedHelpTopic(command);
    if (!commandsByName.has(topic.resolved)) {
      throw new Error(`ABORT expanded_command_not_registered: ${JSON.stringify(topic.resolved)}`);
    }
    if (seen.has(topic.resolved)) {
      throw new Error(`ABORT duplicate_expanded_command: ${JSON.stringify(topic.resolved)}`);
    }
    if (!selectedCommands.includes(topic.resolved)) {
      throw new Error(`ABORT expanded_command_not_selected: ${JSON.stringify(topic.resolved)}`);
    }
    seen.add(topic.resolved);
    expandedCommands.push(topic.resolved);
  }
  return expandedCommands;
}

function validateArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("arguments must be an object");
  }
  if (typeof args.request !== "string" || !args.request.trim()) {
    throw new Error("request must be a non-empty string");
  }

  const hasCommands = Object.prototype.hasOwnProperty.call(args, "selected_commands");
  const hasBlocks = Object.prototype.hasOwnProperty.call(args, "selected_block_ids");
  const hasExpanded = Object.prototype.hasOwnProperty.call(args, "expanded");
  if (hasExpanded && args.expanded !== true) {
    throw new Error("ABORT invalid_phase_arguments: expanded must be true when supplied");
  }
  const phase = hasExpanded ? "expanded_context" : hasCommands ? "selected_command_evidence" : "discovery";
  const allowed = phase === "discovery"
    ? new Set(["request"])
    : phase === "selected_command_evidence"
      ? new Set(["request", "selected_commands"])
      : new Set(["request", "selected_commands", "expanded", "expanded_commands", "selected_block_ids"]);
  const unexpected = Object.keys(args).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(`ABORT invalid_phase_arguments: ${phase} does not allow ${unexpected.join(", ")}`);
  }
  if (phase === "expanded_context" && !hasCommands) {
    throw new Error("ABORT invalid_phase_arguments: expanded_context requires selected_commands");
  }
  if (hasBlocks && phase !== "expanded_context") {
    throw new Error("ABORT invalid_phase_arguments: selected_block_ids requires expanded: true");
  }

  const selected = phase === "discovery"
    ? { selectedCommands: null, topicNormalizations: [] }
    : selectedCommandsFrom(args);
  const selectedCommands = selected.selectedCommands;
  const selectedBlockIds = phase === "expanded_context" ? optionalSelectedBlockIdsFrom(args) : null;
  const expandedCommands = phase === "expanded_context"
    ? optionalExpandedCommandsFrom(args, selectedCommands)
    : null;
  if (phase === "expanded_context" && expandedCommands.length === 0 && selectedBlockIds.length === 0) {
    throw new Error("ABORT empty_expanded_context: supply expanded_commands, selected_block_ids, or both");
  }

  return {
    phase,
    selectedCommands,
    selectedBlockIds,
    expandedCommands,
    topicNormalizations: selected.topicNormalizations,
  };
}

function commandHelp(command) {
  const entry = helpGuidesByCommand.get(command);
  if (!entry || !entry.content_file) return null;
  const contentPath = path.join(DATA_ROOT, entry.content_file);
  return { ...entry, content: readUtf8(contentPath) };
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function stataPathCandidates() {
  const candidates = [];
  if (process.env.STATA_PATH) candidates.push(process.env.STATA_PATH);
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Stata18\\StataMP-64.exe",
      "C:\\Program Files\\Stata18\\StataSE-64.exe",
      "C:\\Program Files\\Stata18\\StataBE-64.exe",
      "C:\\Program Files\\Stata18\\Stata-64.exe",
    );
  } else {
    for (const name of ["stata-mp", "stata-se", "stata"]) {
      const located = childProcess.spawnSync("which", [name], { encoding: "utf8" });
      if (located.status === 0 && located.stdout.trim()) candidates.push(located.stdout.trim());
    }
  }
  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

function discoverStataPath() {
  return stataPathCandidates().find((candidate) => fs.existsSync(candidate)) || null;
}

function stataPath(file) {
  return path.resolve(file).replaceAll("\\", "/").replaceAll('"', '""');
}

function runStataBatch(stata, doFile, cwd, marker, timeoutMs = 60000) {
  const completed = childProcess.spawnSync(stata, ["/e", "do", doFile], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs,
  });
  const deadline = Date.now() + Math.min(timeoutMs, 10000);
  while (!fs.existsSync(marker) && Date.now() < deadline) sleepSync(100);
  return completed;
}

function locateInstalledHelp(stata, topic, workspace) {
  const resultFile = path.join(workspace, "located.txt");
  const doFile = path.join(workspace, "locate.do");
  fs.writeFileSync(doFile, [
    "version 18",
    "set more off",
    `capture findfile ${topic}.sthlp`,
    "local lookup_rc = _rc",
    "if `lookup_rc' {",
    `    capture findfile ${topic}.hlp`,
    "    local lookup_rc = _rc",
    "}",
    "if !`lookup_rc' local help_path `\"`r(fn)'\"'",
    `file open guard_help using "${stataPath(resultFile)}", write text replace`,
    "if `lookup_rc' file write guard_help \"NOT_FOUND\"",
    "else {",
    "    file write guard_help \"FOUND\" _n",
    "    file write guard_help `\"`help_path'\"'",
    "}",
    "file close guard_help",
    "exit, clear",
  ].join("\n"), "utf8");
  const completed = runStataBatch(stata, doFile, workspace, resultFile);
  if (!fs.existsSync(resultFile)) {
    const detail = completed.error?.message || completed.stderr || completed.stdout || "no lookup result";
    throw new Error(`live Stata help lookup failed: ${String(detail).trim()}`);
  }
  const [status, ...sourceLines] = fs.readFileSync(resultFile, "utf8").split(/\r?\n/);
  return status.trim() === "FOUND" ? sourceLines.join("\n").trim() : null;
}

function includeCandidates(sourceFile, includeName) {
  const sourceDir = path.dirname(sourceFile);
  const parentDir = path.dirname(sourceDir);
  const fileName = includeName.endsWith(".ihlp") ? includeName : `${includeName}.ihlp`;
  const first = fileName[0].toLowerCase();
  return [
    path.join(sourceDir, fileName),
    path.join(sourceDir, first, fileName),
    path.join(parentDir, fileName),
    path.join(parentDir, first, fileName),
  ];
}

function expandHelpIncludes(sourceFile, seen = new Set(), depth = 0) {
  const resolved = path.resolve(sourceFile);
  if (depth > 8 || seen.has(resolved)) return { content: "", missing: [] };
  seen.add(resolved);
  const missing = [];
  const output = [];
  for (const line of fs.readFileSync(resolved, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^INCLUDE\s+help\s+([A-Za-z0-9_.]+)$/i);
    if (!match) {
      output.push(line);
      continue;
    }
    const includeFile = includeCandidates(resolved, match[1]).find((candidate) => fs.existsSync(candidate));
    if (!includeFile) {
      missing.push(match[1]);
      continue;
    }
    const expanded = expandHelpIncludes(includeFile, seen, depth + 1);
    output.push(expanded.content);
    missing.push(...expanded.missing);
  }
  return { content: output.join("\n"), missing: [...new Set(missing)] };
}

function renderInstalledHelp(stata, sourceFile, topic, workspace) {
  const expandedFile = path.join(workspace, `${topic}.sthlp`);
  const renderedFile = path.join(workspace, `${topic}.txt`);
  const statusFile = path.join(workspace, "rendered.status");
  const doFile = path.join(workspace, "render.do");
  const expanded = expandHelpIncludes(sourceFile);
  fs.writeFileSync(expandedFile, expanded.content, "utf8");
  fs.writeFileSync(doFile, [
    "version 18",
    "set more off",
    `capture noisily translate "${stataPath(expandedFile)}" "${stataPath(renderedFile)}", translator(smcl2txt) replace header(off) logo(off) cmdnumber(off) lmargin(0) linesize(255) pagelines(0)`,
    "local translate_rc = _rc",
    `file open guard_status using "${stataPath(statusFile)}", write text replace`,
    "file write guard_status `\"`translate_rc'\"'",
    "file close guard_status",
    "exit, clear",
  ].join("\n"), "utf8");
  const completed = runStataBatch(stata, doFile, workspace, statusFile);
  const rc = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, "utf8").trim() : null;
  if (rc !== "0" || !fs.existsSync(renderedFile)) {
    const detail = completed.error?.message || completed.stderr || completed.stdout || `translate rc=${rc}`;
    throw new Error(`live Stata help rendering failed: ${String(detail).trim()}`);
  }
  return {
    content: fs.readFileSync(renderedFile, "utf8").trim(),
    missingIncludes: expanded.missing,
  };
}

function liveHelpAuthority(sourceFile) {
  const normalized = sourceFile.replaceAll("\\", "/").toLowerCase();
  return normalized.includes("/stata18/ado/base/") || normalized.includes("/stata18/ado/updates/")
    ? "StataCorp official help from active Stata 18 installation"
    : "installed package help from active Stata ado-path";
}

function lookupLiveStataHelp(command) {
  const topic = exactHelpTopic(command);
  if (LIVE_HELP_CACHE.has(topic)) return LIVE_HELP_CACHE.get(topic);
  const stata = discoverStataPath();
  if (!stata) {
    const unavailable = {
      status: "unavailable",
      help: null,
      limitations: ["No Stata executable was found through STATA_PATH or the supported Stata 18 installation paths."],
    };
    LIVE_HELP_CACHE.set(topic, unavailable);
    return unavailable;
  }
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-help-"));
  try {
    const sourceFile = locateInstalledHelp(stata, topic, workspace);
    if (!sourceFile || !fs.existsSync(sourceFile)) {
      const unavailable = {
        status: "unavailable",
        help: null,
        limitations: [`help ${topic} was not found on the active Stata ado-path.`],
      };
      LIVE_HELP_CACHE.set(topic, unavailable);
      return unavailable;
    }
    const rendered = renderInstalledHelp(stata, sourceFile, topic, workspace);
    const limitations = [
      "This exact-topic fallback is read from the active Stata installation and is not a bundled registry entry.",
      "No bundled PDF expansion or paper example catalog is attached for an out-of-dictionary topic.",
    ];
    if (rendered.missingIncludes.length > 0) {
      limitations.push(`Unresolved INCLUDE help fragments: ${rendered.missingIncludes.join(", ")}.`);
    }
    const available = {
      status: "available",
      help: {
        command: topic,
        authority: liveHelpAuthority(sourceFile),
        source_kind: "live_installed_help",
        source_version: "active Stata installation",
        source_path: sourceFile,
        help_topics: [topic],
        limitations,
        content: rendered.content,
      },
      limitations,
    };
    LIVE_HELP_CACHE.set(topic, available);
    return available;
  } catch (error) {
    const unavailable = {
      status: "unavailable",
      help: null,
      limitations: [error.message],
    };
    LIVE_HELP_CACHE.set(topic, unavailable);
    return unavailable;
  } finally {
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
    } catch {
      // Stata can briefly retain a batch-log handle on Windows; temp cleanup is best effort.
    }
  }
}

function dynamicCommandEvidence(command, liveHelpLookup) {
  const helpTopic = LIVE_HELP_TOPIC_ALIASES.get(command) || command;
  const live = liveHelpLookup(helpTopic);
  return {
    command,
    help_topic: helpTopic,
    registry_status: "outside_dictionary",
    help_status: live.status,
    command_help: live.help,
    limitations: live.limitations,
    expanded_documentation: {
      status: "unavailable",
      authority: null,
      source_kind: null,
      source_version: null,
      source_relation_to_help: null,
      limitations: ["Out-of-dictionary exact help topics do not have bundled expanded documentation."],
    },
    paper_example_catalog: [],
  };
}

function commandEvidence(command, liveHelpLookup = lookupLiveStataHelp) {
  if (!commandsByName.has(command)) return dynamicCommandEvidence(command, liveHelpLookup);
  const entry = helpGuidesByCommand.get(command);
  if (!entry) throw new Error(`command help index is missing registry command: ${command}`);
  return {
    command,
    help_status: entry.help_status,
    command_help: commandHelp(command),
    expanded_documentation: expandedDocumentationSummary(command),
    paper_example_catalog: profilesByCommand.get(command) || [],
  };
}

function expandedDocumentationSummary(command) {
  const entry = expandedGuidesByCommand.get(command);
  if (!entry) throw new Error(`expanded documentation index is missing registry command: ${command}`);
  return {
    status: entry.expanded_documentation_status,
    authority: entry.authority,
    source_kind: entry.source_kind,
    source_version: entry.source_version,
    source_relation_to_help: entry.source_relation_to_help,
    limitations: entry.limitations,
  };
}

function expandedDocumentation(command) {
  const entry = expandedGuidesByCommand.get(command);
  const content = entry?.content_file ? readUtf8(path.join(DATA_ROOT, entry.content_file)) : null;
  return { ...entry, content };
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function selectRawLogRange(span, selection) {
  const lines = String(span.text || "").split(/\r?\n/);
  const offsetStart = selection.start - span.start;
  const offsetEnd = selection.end - span.start;
  if (offsetStart < 0 || offsetEnd >= lines.length || offsetEnd < offsetStart) {
    throw new Error(`curated log range falls outside ${selection.source_span_id}`);
  }
  const text = lines.slice(offsetStart, offsetEnd + 1).join("\n");
  return {
    span_id: `${span.span_id}-${selection.start}-${selection.end}`,
    role: span.role,
    unit: span.unit,
    start: selection.start,
    end: selection.end,
    text,
    text_sha256: sha256Text(text),
    source_span_id: span.span_id,
    source_span_sha256: span.text_sha256,
  };
}

function projectedLogSpans(context) {
  const selections = CURATED_LOG_RANGES.get(context.evidence_id);
  if (!selections) return context.log_spans || [];
  const selectedSourceIds = new Set(selections.map((row) => row.source_span_id));
  const retained = (context.log_spans || []).filter((span) => !selectedSourceIds.has(span.span_id));
  const curated = selections.map((selection) => {
    const source = (context.log_spans || []).find((span) => span.span_id === selection.source_span_id);
    if (!source) throw new Error(`curated log source span not found: ${selection.source_span_id}`);
    return selectRawLogRange(source, selection);
  });
  return [...retained, ...curated];
}

function projectedExecutionContext(context) {
  return {
    evidence_id: context.evidence_id,
    evidence_origin: context.evidence_origin,
    source_archive_provenance: context.source_archive_provenance,
    log_provenance: context.log_provenance,
    log_spans: projectedLogSpans(context),
    artifacts: context.artifacts || [],
  };
}

function sourceProvenanceForBlock(block) {
  return block.target_occurrence_ids.map((occurrenceId) => {
    const occurrence = occurrencesById.get(occurrenceId);
    const provenance = occurrence?.provenance || {};
    return {
      occurrence_id: occurrenceId,
      title: provenance.title || null,
      article_doi: provenance.article_doi || null,
      article_url: provenance.article_url || null,
      repository_doi: provenance.repository_doi || null,
      repository_url: provenance.repository_url || null,
      version: provenance.version || null,
      original_path: provenance.original_path || provenance.project_path || block.source_path,
    };
  });
}

function paperCard(blockId) {
  const block = blocksById.get(blockId);
  if (!block) {
    throw new Error(`ABORT paper_block_not_in_catalog: ${JSON.stringify(blockId)}`);
  }
  return {
    block_id: block.block_id,
    focus_command: block.focus_command,
    source_provenance: sourceProvenanceForBlock(block),
    source_path: block.source_path,
    source_file_sha256: block.source_file_sha256,
    source_line_span: { start: block.block_span_start, end: block.block_span_end },
    paper_code: block.block_code,
    paper_code_sha256: block.block_code_sha256,
    target_spans: block.target_spans,
    paper_log_contexts: (executionContextsByBlock.get(blockId) || []).map(projectedExecutionContext),
  };
}

function buildCommandEvidence(args, options = {}) {
  const {
    phase,
    selectedCommands,
    selectedBlockIds,
    expandedCommands,
    topicNormalizations,
  } = validateArguments(args);
  const liveHelpLookup = options.liveHelpLookup || lookupLiveStataHelp;

  if (phase === "discovery") {
    return {
      phase: "discovery",
      main_rules: mainRules(),
      command_dictionary: compactCommandDictionary(),
    };
  }

  if (phase === "selected_command_evidence") {
    const result = {
      phase: "selected_command_evidence",
      main_rules: mainRulesReference(),
      selected_commands: selectedCommands,
      command_evidence: selectedCommands.map((command) => commandEvidence(command, liveHelpLookup)),
    };
    if (topicNormalizations.length > 0) result.topic_normalizations = topicNormalizations;
    return result;
  }

  for (const blockId of selectedBlockIds) {
    const profile = profilesById.get(blockId);
    if (!selectedCommands.includes(profile.focus_command)) {
      throw new Error(
        `ABORT paper_block_not_selected_command: ${blockId} belongs to ${profile.focus_command}`,
      );
    }
  }
  const result = {
    phase: "expanded_context",
    main_rules: mainRulesReference(),
    selected_commands: selectedCommands,
    expanded_commands: expandedCommands,
    selected_block_ids: selectedBlockIds,
    expanded_command_evidence: expandedCommands.map((command) => ({
      command,
      expanded_documentation: expandedDocumentation(command),
    })),
    paper_usage_cards: selectedBlockIds.map(paperCard),
  };
  if (topicNormalizations.length > 0) result.topic_normalizations = topicNormalizations;
  return result;
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Stateless Stata evidence lookup. Phase 1 is optional discovery when the exact command is not yet clear; a model that already knows the material command may call Phase 2 directly. Read-only explanation, comment-only edits, formatting-only edits, and verbatim relocation of unchanged commands do not require a lookup. Phase 2 returns bundled Stata 18 official or maintainer help for registered commands and queries active installed help for an exact out-of-dictionary topic. Registered multiword Stata spelling such as export excel is normalized transparently to export_excel; global, local, tempfile, and tempname retain their requested labels while using official macro help. Phase 3 adds only explicitly requested expanded documentation or paper blocks. The server never scores, ranks, recommends, promotes, audits, semantically validates, or automatically chooses commands, blocks, specifications, or outputs.",
    inputSchema: {
      oneOf: [
        {
          title: "Phase 1 compact command index",
          type: "object",
          additionalProperties: false,
          required: ["request"],
          properties: { request: { type: "string", minLength: 1 } },
        },
        {
          title: "Phase 2 bundled or live exact command help",
          type: "object",
          additionalProperties: false,
          required: ["request", "selected_commands"],
          properties: {
            request: { type: "string", minLength: 1 },
            selected_commands: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          },
        },
        {
          title: "Phase 3 combined expanded documentation and paper context",
          type: "object",
          additionalProperties: false,
          required: ["request", "selected_commands", "expanded"],
          anyOf: [
            { required: ["expanded_commands"] },
            { required: ["selected_block_ids"] },
          ],
          properties: {
            request: { type: "string", minLength: 1 },
            selected_commands: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
            expanded: { const: true },
            expanded_commands: { type: "array", items: { type: "string", minLength: 1 } },
            selected_block_ids: { type: "array", items: { type: "string", minLength: 1 } },
          },
        },
      ],
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
  TOOL_DEFINITIONS,
  buildCommandEvidence,
  dispatch,
  lookupLiveStataHelp,
};
