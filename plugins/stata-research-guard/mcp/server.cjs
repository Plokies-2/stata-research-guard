"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");
const { lookupLiveStataHelp } = require("./live-help.cjs");
const { deliverHelp } = require("./help-sections.cjs");

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
const EXACT_HELP_TOPIC = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Navigation threshold for the combined response, never a text truncation limit.
const HELP_RESPONSE_CHARACTER_THRESHOLD = 48000;
const STATA_COMMAND_WORDS = /^[A-Za-z][A-Za-z0-9_]*(?: [A-Za-z][A-Za-z0-9_]*)+$/;
const LIVE_HELP_TOPIC_ALIASES = new Map([
  ["global", "macro"],
  ["local", "macro"],
  ["tempfile", "macro"],
  ["tempname", "macro"],
  ["postfile", "post"],
  ["postclose", "post"],
  ["postutil", "post"],
  // Identity entries also admit the known spaced command spelling.
  ["estimates_save", "estimates_save"],
  ["estimates_use", "estimates_save"],
  ["estimates_store", "estimates_store"],
  ["estimates_restore", "estimates_store"],
  ["graph_export", "graph_export"],
  ["matrix_rownames", "matrix_rownames"],
]);

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

const pluginMetadata = readJson(path.join(PLUGIN_ROOT, ".codex-plugin", "plugin.json"));
const registry = readJson(REGISTRY_PATH);
const commandsByName = new Map(registry.commands.map((row) => [row.command, row]));

const helpGuideIndex = readJson(COMMAND_HELP_GUIDES_PATH);
const helpGuidesByCommand = new Map(helpGuideIndex.guides.map((row) => [row.command, row]));
const helpSectionsByCommand = new Map(readJson(path.join(DATA_ROOT, "command_help_sections.json")).guides.map((row) => [row.command, row]));
const workflowNotes = readJson(path.join(DATA_ROOT, "command_workflow_notes.json"));

const expandedGuideIndex = readJson(EXPANDED_COMMAND_GUIDES_PATH);
const expandedGuidesByCommand = new Map(expandedGuideIndex.guides.map((row) => [row.command, row]));
const expandedSectionsByCommand = new Map(readJson(path.join(DATA_ROOT, "expanded_help_sections.json")).guides.map((row) => [row.command, row]));

const paperProfiles = readJsonl(PAPER_PROFILES_PATH);
const profilesById = new Map(paperProfiles.map((row) => [row.block_id, row]));
const profilesByCommand = groupBy(paperProfiles, "focus_command");
const paperLicensesByDoi = new Map(readJson(path.join(DATA_ROOT, "paper_source_licenses.json")).sources
  .map((source) => [source.repository_doi.toLowerCase(), source]));
let blocksById, occurrencesById, executionContextsByBlock;

function loadPaperDetails() {
  if (blocksById) return;
  const blocks = new Map(readJsonl(PAPER_BLOCKS_PATH).map((row) => [row.block_id, row]));
  const occurrences = new Map(readJsonl(PAPER_OCCURRENCES_PATH).map((row) => [row.occurrence_id, row]));
  const contexts = fs.existsSync(PAPER_EXECUTION_CONTEXTS_PATH) ? readJsonl(PAPER_EXECUTION_CONTEXTS_PATH) : [];
  blocksById = blocks;
  occurrencesById = occurrences;
  executionContextsByBlock = groupBy(contexts, "parent_block_id");
}

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

function mainRules(knownHash) {
  const content = readUtf8(GENERAL_RULES_PATH);
  const sha256 = sha256Text(content);
  return {
    source_path: GENERAL_RULES_SOURCE_PATH,
    sha256,
    ...(knownHash === sha256 ? { unchanged: true } : { content }),
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

function selectedHelpTopic(command) {
  if (typeof command === "string" && EXACT_HELP_TOPIC.test(command)) {
    return { requested: command, resolved: command, normalization: null };
  }
  if (typeof command === "string" && STATA_COMMAND_WORDS.test(command)) {
    const resolved = command.replaceAll(" ", "_");
    if (commandsByName.has(resolved) || LIVE_HELP_TOPIC_ALIASES.has(resolved)) {
      return {
        requested: command,
        resolved,
        normalization: {
          requested: command,
          resolved,
          reason: commandsByName.has(resolved) ? "registered_multiword_command" : "known_multiword_help_topic",
        },
      };
    }
  }
  throw new Error(`invalid_argument: invalid_help_topic: ${JSON.stringify(command)}`
    + "\nUse an exact help topic such as graph_export, matrix_rownames, or _ms_omit_info, without arguments or options. Known spaced command names are normalized explicitly; other names are not guessed.");
}

function selectedCommandsFrom(args) {
  if (!Array.isArray(args.selected_commands) || args.selected_commands.length === 0) {
    throw new Error("invalid_argument: empty_command_selection: selected_commands must be a non-empty array of exact command topics");
  }
  const seen = new Set();
  const selectedCommands = [];
  const topicNormalizations = [];
  for (const command of args.selected_commands) {
    const topic = selectedHelpTopic(command);
    if (seen.has(topic.resolved)) {
      throw new Error(`invalid_argument: duplicate_selected_command: ${JSON.stringify(topic.resolved)}`);
    }
    seen.add(topic.resolved);
    selectedCommands.push(topic.resolved);
    if (topic.normalization) topicNormalizations.push(topic.normalization);
  }
  return { selectedCommands, topicNormalizations };
}

function selectedBlockIdsFrom(args) {
  if (!Array.isArray(args.selected_block_ids) || args.selected_block_ids.length === 0) {
    throw new Error("invalid_argument: empty_paper_block_selection: selected_block_ids must be a non-empty array of exact catalog IDs");
  }
  const seen = new Set();
  for (const blockId of args.selected_block_ids) {
    if (typeof blockId !== "string" || !profilesById.has(blockId)) {
      throw new Error(`invalid_argument: paper_block_not_in_catalog: ${JSON.stringify(blockId)}`);
    }
    if (seen.has(blockId)) {
      throw new Error(`invalid_argument: duplicate_paper_block_id: ${JSON.stringify(blockId)}`);
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
    throw new Error("invalid_argument: invalid_expanded_command_selection: expanded_commands must be an array of exact selected command keys");
  }
  if (args.expanded_commands.length === 0) return [];
  const seen = new Set();
  const expandedCommands = [];
  for (const command of args.expanded_commands) {
    const topic = selectedHelpTopic(command);
    if (!commandsByName.has(topic.resolved)) {
      throw new Error(`invalid_argument: expanded_command_not_registered: ${JSON.stringify(topic.resolved)}`);
    }
    if (seen.has(topic.resolved)) {
      throw new Error(`invalid_argument: duplicate_expanded_command: ${JSON.stringify(topic.resolved)}`);
    }
    if (!selectedCommands.includes(topic.resolved)) {
      throw new Error(`invalid_argument: expanded_command_not_selected: ${JSON.stringify(topic.resolved)}`);
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
    throw new Error("invalid_argument: invalid_phase_arguments: expanded must be true when supplied");
  }
  const phase = hasExpanded ? "expanded_context" : hasCommands ? "selected_command_evidence" : "discovery";
  const allowed = phase === "discovery"
    ? new Set(["request", "known_rules_sha256"])
    : phase === "selected_command_evidence"
      ? new Set(["request", "selected_commands", "known_rules_sha256", "known_help_foundations", "help_view", "help_sections", "refresh_live_help", "include_paper_catalog", "deduplicate_help", "help_source", "execution_sources", "workflow_notes"])
      : new Set(["request", "selected_commands", "expanded", "expanded_commands", "selected_block_ids", "known_rules_sha256", "known_help_foundations", "help_view", "expanded_sections", "deduplicate_help"]);
  const unexpected = Object.keys(args).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(`invalid_argument: invalid_phase_arguments: ${phase} does not allow ${unexpected.join(", ")}`
      + (unexpected.some((key) => key === "phase" || key === "commands")
        ? "\nUse request and selected_commands; the phase is inferred. For selected paper blocks or expanded documentation, also send expanded: true."
        : ""));
  }
  if (phase === "expanded_context" && !hasCommands) {
    throw new Error("invalid_argument: invalid_phase_arguments: expanded_context requires selected_commands");
  }
  if (hasBlocks && phase !== "expanded_context") {
    throw new Error("invalid_argument: invalid_phase_arguments: selected_block_ids requires expanded: true");
  }

  const selected = phase === "discovery"
    ? { selectedCommands: null, topicNormalizations: [] }
    : selectedCommandsFrom(args);
  const selectedCommands = selected.selectedCommands;
  if (args.known_rules_sha256 !== undefined && (typeof args.known_rules_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(args.known_rules_sha256))) {
    throw new Error("known_rules_sha256 must be the SHA-256 of complete rules still visible in this context");
  }
  if (args.help_view !== undefined && !["catalog", "full"].includes(args.help_view)) throw new Error("help_view must be catalog or full");
  if (args.help_source !== undefined && !["bundled", "installed"].includes(args.help_source)) throw new Error("help_source must be bundled or installed");
  if (args.refresh_live_help !== undefined && typeof args.refresh_live_help !== "boolean") throw new Error("refresh_live_help must be boolean");
  for (const option of ["include_paper_catalog", "deduplicate_help"]) {
    if (args[option] !== undefined && typeof args[option] !== "boolean") throw new Error(`${option} must be boolean`);
  }
  for (const key of ["execution_sources", "workflow_notes"]) {
    if (args[key] === undefined) continue;
    const selections = args[key];
    if (!selections || typeof selections !== "object" || Array.isArray(selections) || !Object.keys(selections).length) {
      throw new Error(`${key} must map selected commands to nonempty selections`);
    }
    for (const [command, selection] of Object.entries(selections)) {
      if (!selectedCommands.includes(command)) throw new Error(`${key} unavailable for selected command: ${command}`);
      if (key === "workflow_notes") {
        if (!Array.isArray(selection) || !selection.length || new Set(selection).size !== selection.length
            || !Object.hasOwn(workflowNotes, command)
            || selection.some((id) => typeof id !== "string" || !Object.hasOwn(workflowNotes[command], id))) {
          throw new Error(`invalid exact workflow note selection: ${command}`);
        }
        continue;
      }
      if (!selection || typeof selection !== "object" || Array.isArray(selection)
          || Object.keys(selection).some((field) => !["path", "line_spans", "expected_sha256"].includes(field))
          || typeof selection.path !== "string" || !path.isAbsolute(selection.path)
          || path.basename(selection.path).toLowerCase() !== `${command}.ado`.toLowerCase()) {
        throw new Error(`execution_sources requires an absolute ${command}.ado path`);
      }
      if (selection.expected_sha256 !== undefined && (typeof selection.expected_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(selection.expected_sha256))) {
        throw new Error("expected_sha256 must be a lowercase SHA-256");
      }
      if (selection.line_spans !== undefined && (!Array.isArray(selection.line_spans) || !selection.line_spans.length
          || selection.line_spans.some((span) => !span || typeof span !== "object" || Array.isArray(span)
            || Object.keys(span).some((field) => !["start", "end"].includes(field))
            || !Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < 1 || span.end < span.start))) {
        throw new Error("line_spans must contain exact positive start/end line ranges");
      }
    }
  }
  const selectedBlockIds = phase === "expanded_context" ? optionalSelectedBlockIdsFrom(args) : null;
  const expandedCommands = phase === "expanded_context" ? optionalExpandedCommandsFrom(args, selectedCommands) : null;
  if (args.known_help_foundations !== undefined) {
    const known = args.known_help_foundations;
    if (!known || typeof known !== "object" || Array.isArray(known) || !Object.keys(known).length) {
      throw new Error("known_help_foundations must map selected help commands to visible foundation SHA-256 values");
    }
    const availableCommands = phase === "expanded_context" ? expandedCommands : selectedCommands;
    for (const [command, hash] of Object.entries(known)) {
      if (!availableCommands.includes(command) || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
        throw new Error(`invalid known_help_foundations entry: ${command}`);
      }
    }
  }
  const sectionRequest = args.help_sections !== undefined ? args.help_sections : args.expanded_sections;
  if (sectionRequest !== undefined) {
    if (!sectionRequest || typeof sectionRequest !== "object" || Array.isArray(sectionRequest) || Object.keys(sectionRequest).length === 0) {
      throw new Error("help sections must map selected command keys to nonempty exact section IDs");
    }
    if (args.help_view) throw new Error("help_view and section selections are separate requests");
    const availableCommands = phase === "expanded_context" ? expandedCommands : selectedCommands;
    for (const [command, ids] of Object.entries(sectionRequest)) {
      if (!availableCommands.includes(command)) throw new Error(`help sections unavailable for selected command: ${command}`);
      if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !id)) {
        throw new Error(`invalid exact help section selection: ${command}`);
      }
    }
  }
  if (phase === "expanded_context" && expandedCommands.length === 0 && selectedBlockIds.length === 0) {
    throw new Error("invalid_argument: empty_expanded_context: supply expanded_commands, selected_block_ids, or both");
  }

  return {
    phase,
    selectedCommands,
    selectedBlockIds,
    expandedCommands,
    topicNormalizations: selected.topicNormalizations,
  };
}

function commandHelp(command, args) {
  const entry = helpGuidesByCommand.get(command);
  if (!entry || !entry.content_file) return null;
  return deliverHelp({ ...entry, content: readUtf8(path.join(DATA_ROOT, entry.content_file)) },
    helpSectionsByCommand.get(command), args.help_sections?.[command], args.help_view, args.known_help_foundations?.[command]);
}

async function dynamicCommandEvidence(command, liveHelpLookup, args) {
  const helpTopic = LIVE_HELP_TOPIC_ALIASES.get(command) || command;
  const bundled = args.help_source !== "installed" && helpGuidesByCommand.get(helpTopic);
  const source = bundled?.content_file
    ? { status: bundled.help_status, limitations: bundled.limitations,
      help: { ...bundled, command, content: readUtf8(path.join(DATA_ROOT, bundled.content_file)) } }
    : await liveHelpLookup(helpTopic, { refresh: args.refresh_live_help === true });
  return {
    command,
    help_topic: helpTopic,
    registry_status: "outside_dictionary",
    help_status: source.status,
    command_help: source.help ? deliverHelp(source.help, bundled ? helpSectionsByCommand.get(helpTopic) : null,
      args.help_sections?.[command], args.help_view, args.known_help_foundations?.[command]) : null,
    limitations: source.limitations,
    expanded_documentation: {
      status: "unavailable",
      authority: null,
      source_kind: null,
      source_version: null,
      source_relation_to_help: null,
      limitations: ["Out-of-dictionary exact help topics do not have bundled expanded documentation."],
    },
    ...(args.include_paper_catalog === false ? { paper_example_catalog_omitted: true } : { paper_example_catalog: [] }),
  };
}

async function commandEvidence(command, liveHelpLookup, args) {
  if (!commandsByName.has(command)) return dynamicCommandEvidence(command, liveHelpLookup, args);
  const entry = helpGuidesByCommand.get(command);
  if (!entry) throw new Error(`command help index is missing registry command: ${command}`);
  return {
    command,
    help_status: entry.help_status,
    command_help: commandHelp(command, args),
    expanded_documentation: expandedDocumentationSummary(command),
    ...(args.include_paper_catalog === false
      ? { paper_example_catalog_omitted: true }
      : { paper_example_catalog: profilesByCommand.get(command) || [] }),
  };
}

async function installedCommandEvidence(command, liveHelpLookup, args) {
  if (!commandsByName.has(command)) return dynamicCommandEvidence(command, liveHelpLookup, args);
  const topic = helpGuidesByCommand.get(command).help_topics[0] || LIVE_HELP_TOPIC_ALIASES.get(command) || command;
  const live = await liveHelpLookup(topic, { refresh: args.refresh_live_help === true });
  // The exact-topic helper also serves outside-dictionary calls. Its catalog
  // limitation does not apply to a registered command's own bundled references.
  const limitations = live.limitations.filter((line) => line !== "No bundled PDF expansion or paper example catalog is attached for an out-of-dictionary topic.");
  const help = live.help ? deliverHelp({ ...live.help, limitations }, null, args.help_sections?.[command], args.help_view, args.known_help_foundations?.[command]) : null;
  if (help?.source_path) {
    try {
      help.source_version_markers = readUtf8(help.source_path).split(/\r?\n/)
        .filter((line) => /^\s*(?:\{\*\s*)?\*!\s/.test(line));
    } catch (error) {
      limitations.push(`Installed help version markers could not be read: ${error.message}`);
    }
  }
  const expansion = expandedDocumentationSummary(command);
  if (expansion.status === "same_source_as_help") expansion.status = "same_source_as_bundled_help";
  return {
    command,
    help_topic: topic,
    help_status: live.status,
    command_help: help,
    limitations,
    expanded_documentation: {
      ...expansion,
      source_relation_to_help: "Bundled documentation; its version may differ from the selected installed help and execution source.",
    },
    ...(args.include_paper_catalog === false
      ? { paper_example_catalog_omitted: true }
      : { paper_example_catalog: profilesByCommand.get(command) || [] }),
  };
}

function executionSource(selection) {
  try {
    const bytes = fs.readFileSync(selection.path);
    const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const lines = content.match(/[^\n]*\n|[^\n]+$/g) || [];
    const result = {
      source_path: selection.path,
      source_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      source_kind: "caller_selected_ado_source",
      line_count: lines.length,
      scope_note: "Caller-selected file, not proof of the file loaded by estimation. Read exact source with maintainer help; source hashes do not judge option semantics or results.",
    };
    if (selection.expected_sha256 !== undefined) {
      result.expected_sha256 = selection.expected_sha256;
      result.matches_expected_sha256 = result.source_sha256 === selection.expected_sha256;
    }
    if (selection.line_spans) {
      if (selection.line_spans.some((span) => span.end > lines.length)) throw new Error("Selected line span exceeds the ADO source");
      result.excerpts = selection.line_spans.map((span) => ({ ...span, content: lines.slice(span.start - 1, span.end).join("") }));
    }
    return result;
  } catch (error) {
    return { source_path: selection.path, unavailable: true, limitations: [error.message] };
  }
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

function expandedDocumentation(command, args) {
  const entry = expandedGuidesByCommand.get(command);
  const content = entry?.content_file ? readUtf8(path.join(DATA_ROOT, entry.content_file)) : null;
  return deliverHelp({ ...entry, content }, expandedSectionsByCommand.get(command), args.expanded_sections?.[command], args.help_view, args.known_help_foundations?.[command]);
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

function withPaperLicense(provenance) {
  const source = paperLicensesByDoi.get((provenance.repository_doi || "").toLowerCase());
  if (!source) return provenance;
  const noticeFiles = [...source.notice_files];
  const thirdParty = source.third_party_notice;
  const usesThirdParty = thirdParty && (provenance.original_path || "").includes(thirdParty.source_path_contains);
  if (usesThirdParty) noticeFiles.push(thirdParty.notice_file);
  return {
    ...provenance,
    paper_authors: source.paper_authors,
    code_license: source.code_license,
    license_url: source.license_url,
    attribution_notice: "THIRD_PARTY_NOTICES.md",
    license_notices: noticeFiles.map((relative) => ({ path: relative, content: readUtf8(path.join(PLUGIN_ROOT, relative)) })),
    ...(usesThirdParty ? { third_party_notice: thirdParty.note } : {}),
  };
}

function sourceProvenanceForBlock(block) {
  if (Array.isArray(block.source_provenance) && block.source_provenance.length > 0) {
    return block.source_provenance.map(withPaperLicense);
  }
  return block.target_occurrence_ids.map((occurrenceId) => {
    const occurrence = occurrencesById.get(occurrenceId);
    const provenance = occurrence?.provenance || {};
    return withPaperLicense({
      occurrence_id: occurrenceId,
      title: provenance.title || null,
      article_doi: provenance.article_doi || null,
      article_url: provenance.article_url || null,
      repository_doi: provenance.repository_doi || null,
      repository_url: provenance.repository_url || null,
      version: provenance.version || null,
      original_path: provenance.original_path || provenance.project_path || block.source_path,
    });
  });
}

function paperCard(blockId) {
  loadPaperDetails();
  const block = blocksById.get(blockId);
  if (!block) {
    throw new Error(`invalid_argument: paper_block_not_in_catalog: ${JSON.stringify(blockId)}`);
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
    ...(block.editorial_adaptation ? { editorial_adaptation: block.editorial_adaptation } : {}),
  };
}

// References only earlier bodies in this response, never a prior call or cache.
// Compare the delivered text, not source hashes: different selected sections
// can belong to the same source without containing the same text.
function deduplicateHelp(result, rowsKey, helpKey) {
  const seen = new Map();
  for (const [index, row] of result[rowsKey].entries()) {
    const help = row[helpKey];
    if (typeof help?.content !== "string" || !help.content) continue;
    const reference = seen.get(help.content);
    if (reference) {
      row[helpKey] = { ...help, content: null, content_ref: reference };
    } else {
      seen.set(help.content, `#/${rowsKey}/${index}/${helpKey}/content`);
    }
  }
}

function finishHelpDelivery(result, rowsKey, helpKey, args, navigationByCommand) {
  const rows = result[rowsKey];
  const originals = rows.map((row) => row[helpKey]);
  if (args.deduplicate_help === true) deduplicateHelp(result, rowsKey, helpKey);
  if (args.help_view === "full" || args.help_view === "catalog") return;
  const responseCharacters = Array.from(JSON.stringify(result)).length;
  if (responseCharacters <= HELP_RESPONSE_CHARACTER_THRESHOLD) return;

  const selections = args.help_sections || args.expanded_sections || {};
  const deferred = rows.filter((row, index) => originals[index]?.delivery === "full_help"
    && typeof originals[index].content === "string" && !selections[row.command]);
  if (!deferred.length) return;
  // Restore the original bodies before rebuilding same-response content_ref links.
  rows.forEach((row, index) => { row[helpKey] = originals[index]; });
  for (const row of deferred) {
    const help = row[helpKey];
    const navigation = help.source_kind === "live_installed_help" ? null
      : navigationByCommand.get(row.command) || navigationByCommand.get(row.help_topic);
    row[helpKey] = deliverHelp(help, navigation, undefined, "catalog");
  }
  if (args.deduplicate_help === true) deduplicateHelp(result, rowsKey, helpKey);
  result.response_navigation = {
    reason: "combined_response_size",
    threshold_characters: HELP_RESPONSE_CHARACTER_THRESHOLD,
    response_characters_before: responseCharacters,
    deferred_commands: deferred.map((row) => row.command),
    note: "Only automatic full-help bodies were deferred to their intact source catalogs. Explicit sections, full-source requests, rules and paper material are not shortened. Select needed sections or help_view full; no help body was read for a deferred command. This is a navigation trigger, not a hard response-size cap.",
  };
}

async function buildCommandEvidence(args, options = {}) {
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
      main_rules: mainRules(args.known_rules_sha256),
      command_dictionary: compactCommandDictionary(),
    };
  }

  if (phase === "selected_command_evidence") {
    const result = {
      phase: "selected_command_evidence",
      main_rules: mainRules(args.known_rules_sha256),
      selected_commands: selectedCommands,
      command_evidence: await Promise.all(selectedCommands.map((command) => args.help_source === "installed"
        ? installedCommandEvidence(command, liveHelpLookup, args)
        : commandEvidence(command, liveHelpLookup, args))),
    };
    for (const evidence of result.command_evidence) {
      const command = evidence.command;
      if (args.execution_sources?.[command]) evidence.execution_source = executionSource(args.execution_sources[command]);
      if (args.workflow_notes?.[command]) evidence.workflow_notes = args.workflow_notes[command].map((id) => ({
        id, record_type: "authoring_guidance", source_path: "data/command_workflow_notes.json", ...workflowNotes[command][id],
      }));
    }
    if (topicNormalizations.length > 0) result.topic_normalizations = topicNormalizations;
    finishHelpDelivery(result, "command_evidence", "command_help", args, helpSectionsByCommand);
    return result;
  }

  for (const blockId of selectedBlockIds) {
    const profile = profilesById.get(blockId);
    if (!selectedCommands.includes(profile.focus_command)) {
      throw new Error(
        `invalid_argument: paper_block_not_selected_command: ${blockId} belongs to ${profile.focus_command}`,
      );
    }
  }
  const result = {
    phase: "expanded_context",
    main_rules: mainRules(args.known_rules_sha256),
    selected_commands: selectedCommands,
    expanded_commands: expandedCommands,
    selected_block_ids: selectedBlockIds,
    expanded_command_evidence: expandedCommands.map((command) => ({
      command,
      expanded_documentation: expandedDocumentation(command, args),
    })),
    paper_usage_cards: selectedBlockIds.map(paperCard),
  };
  if (topicNormalizations.length > 0) result.topic_normalizations = topicNormalizations;
  finishHelpDelivery(result, "expanded_command_evidence", "expanded_documentation", args, expandedSectionsByCommand);
  return result;
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Stata command evidence, not command selection or research judgment. Call Phase 2 directly for known commands; discovery is optional. Help over 24000 Unicode characters returns a section catalog first, including live help and expanded manuals. Combined responses over 48000 characters defer automatic full-help bodies to catalogs; explicit sections and help_view full remain intact. Select exact help_sections in Phase 2 or expanded_sections in Phase 3. Foundation sections accompany selections unless known_help_foundations maps the command to a foundation_sha256 from complete foundation text still visible to the caller; explicitly requested sections always return. help_view full retrieves the complete source, and catalog requests navigation. Paper blocks are unchanged. Rules are included unless known_rules_sha256 matches complete rules still visible to the caller. Omit both reuse acknowledgments in fresh or compacted contexts. Registered commands and the five supplemental basic help topics use bundled documentation unless help_source installed is explicit. refresh_live_help refreshes only selected live snapshots. Optional execution_sources return caller-selected ADO metadata/excerpts; workflow_notes return selected authoring guidance, never semantic verdicts.",
    inputSchema: {
      oneOf: [
        {
          title: "Phase 1 compact command index",
          type: "object",
          additionalProperties: false,
          required: ["request"],
          properties: {
            request: { type: "string", minLength: 1, description: "Describe the current question. Retrieval follows the exact selections below; this text does not rank commands." },
            known_rules_sha256: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Hash of complete rules still visible in this caller context. Omit after context loss." },
          },
        },
        {
          title: "Phase 2 bundled or live exact command help",
          type: "object",
          additionalProperties: false,
          required: ["request", "selected_commands"],
          properties: {
            request: { type: "string", minLength: 1, description: "Describe the current question. Retrieval follows the exact selections below; this text does not rank commands." },
            selected_commands: { type: "array", description: "Exact Stata commands selected by the model. Known commands can be requested without discovery.", minItems: 1, items: { type: "string", minLength: 1 } },
            known_rules_sha256: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Hash of complete rules still visible in this caller context. Omit after context loss." },
            known_help_foundations: { type: "object", minProperties: 1, additionalProperties: { type: "string", pattern: "^[a-f0-9]{64}$" }, description: "Map exact selected commands to foundation_sha256 returned with complete foundation text still visible in this context. A matching hash skips only unrequested duplicate foundation sections. Explicit sections and full help always return. Omit after context loss; catalog/source hashes are not reading acknowledgments." },
            help_view: { type: "string", enum: ["catalog", "full"], description: "Request source navigation or the complete source. Do not combine with section selections." },
            help_sections: { type: "object", description: "Map each selected command to exact IDs from its current help catalog; common foundation sections also accompany the selection.", minProperties: 1, additionalProperties: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } } },
            refresh_live_help: { type: "boolean", description: "Refresh a selected live snapshot. Without help_source installed, registered commands and supplemental basic topics keep their bundled source." },
            help_source: { type: "string", enum: ["bundled", "installed"], description: "Default bundled for registered commands and supplemental basic topics. Installed explicitly requests the active installation's help; it may differ from the execution ADO." },
            execution_sources: {
              type: "object", minProperties: 1, description: "Map selected commands to caller-confirmed execution ADO files. Omit line_spans for metadata only; exact spans are chosen by the model, not cut automatically.",
              additionalProperties: {
                type: "object", additionalProperties: false, required: ["path"],
                properties: {
                  path: { type: "string", minLength: 1, description: "Absolute path whose filename is the selected command plus .ado." },
                  expected_sha256: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Optional execution-record file hash. Equality is a byte-identity fact, not a research or syntax verdict." },
                  line_spans: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["start", "end"], properties: { start: { type: "integer", minimum: 1 }, end: { type: "integer", minimum: 1 } } } },
                },
              },
            },
            workflow_notes: { type: "object", minProperties: 1, description: "Exact note IDs: import_delimited input-variable-names; did_multiplegt_dyn control-learning-sample, comparison-sample, effect-interpretation, output-recovery. Omitted by default.", additionalProperties: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } } },
            include_paper_catalog: { type: "boolean", description: "Default true. Set false for help-only calls or when the paper catalog is already visible; omitted catalogs are explicitly marked." },
            deduplicate_help: { type: "boolean", description: "Default false. True replaces identical help bodies with content_ref JSON Pointers to the first body in this response; all command/source metadata remains." },
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
            request: { type: "string", minLength: 1, description: "Describe the current question. Retrieval follows the exact selections below; this text does not rank commands." },
            selected_commands: { type: "array", description: "Exact Stata commands selected by the model. Known commands can be requested without discovery.", minItems: 1, items: { type: "string", minLength: 1 } },
            expanded: { const: true, description: "Request selected longer documents, exact paper blocks, or both; a preceding phase call is not required." },
            known_rules_sha256: { type: "string", pattern: "^[a-f0-9]{64}$", description: "Hash of complete rules still visible in this caller context. Omit after context loss." },
            known_help_foundations: { type: "object", minProperties: 1, additionalProperties: { type: "string", pattern: "^[a-f0-9]{64}$" }, description: "Map expanded_commands to foundation_sha256 returned with complete expanded-document foundation text still visible in this context. Explicit sections and full help always return. Omit after context loss or when only a catalog was read." },
            help_view: { type: "string", enum: ["catalog", "full"], description: "Request source navigation or the complete source. Do not combine with section selections." },
            expanded_sections: { type: "object", description: "Map each expanded command to exact IDs from its current expanded-document catalog.", minProperties: 1, additionalProperties: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", minLength: 1 } } },
            expanded_commands: { type: "array", description: "Subset of selected_commands whose longer documents are needed.", items: { type: "string", minLength: 1 } },
            selected_block_ids: { type: "array", description: "Exact paper block IDs from the selected commands' catalogs. Omit for documentation-only requests.", items: { type: "string", minLength: 1 } },
            deduplicate_help: { type: "boolean", description: "Default false. True replaces identical expanded help bodies with content_ref JSON Pointers to the first body in this response; all command/source metadata remains." },
          },
        },
      ],
    },
  },
];

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

function errorResult(message) {
  return { isError: true, content: [{ type: "text", text: String(message) }] };
}

async function dispatch(message) {
  if (!message || typeof message !== "object") return null;
  if (message.id === undefined || message.id === null) return null;
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "stataResearchGuard", version: pluginMetadata.version },
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
      return { jsonrpc: "2.0", id: message.id, result: textResult(await buildCommandEvidence(message.params?.arguments || {})) };
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
  input.on("line", async (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } });
      return;
    }
    const response = await dispatch(message);
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
