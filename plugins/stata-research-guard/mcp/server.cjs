"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");

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
  return {
    source_path: GENERAL_RULES_SOURCE_PATH,
    content: readUtf8(GENERAL_RULES_PATH),
  };
}

function selectedCommandsFrom(args) {
  if (!Array.isArray(args.selected_commands) || args.selected_commands.length === 0) {
    throw new Error("ABORT command_not_in_dictionary: selected_commands must be a non-empty array of canonical registry keys");
  }
  const seen = new Set();
  for (const command of args.selected_commands) {
    if (typeof command !== "string" || !commandsByName.has(command)) {
      throw new Error(`ABORT command_not_in_dictionary: ${JSON.stringify(command)}`);
    }
    if (seen.has(command)) {
      throw new Error(`ABORT duplicate_selected_command: ${JSON.stringify(command)}`);
    }
    seen.add(command);
  }
  return [...args.selected_commands];
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
  return selectedBlockIdsFrom(args);
}

function optionalExpandedCommandsFrom(args, selectedCommands) {
  if (!Object.prototype.hasOwnProperty.call(args, "expanded_commands")) return [];
  if (!Array.isArray(args.expanded_commands) || args.expanded_commands.length === 0) {
    throw new Error("ABORT empty_expanded_command_selection: expanded_commands must be a non-empty array of exact selected command keys");
  }
  const seen = new Set();
  for (const command of args.expanded_commands) {
    if (typeof command !== "string" || !commandsByName.has(command)) {
      throw new Error(`ABORT command_not_in_dictionary: ${JSON.stringify(command)}`);
    }
    if (seen.has(command)) {
      throw new Error(`ABORT duplicate_expanded_command: ${JSON.stringify(command)}`);
    }
    if (!selectedCommands.includes(command)) {
      throw new Error(`ABORT expanded_command_not_selected: ${JSON.stringify(command)}`);
    }
    seen.add(command);
  }
  return [...args.expanded_commands];
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

  const selectedCommands = phase === "discovery" ? null : selectedCommandsFrom(args);
  const selectedBlockIds = phase === "expanded_context" ? optionalSelectedBlockIdsFrom(args) : null;
  const expandedCommands = phase === "expanded_context"
    ? optionalExpandedCommandsFrom(args, selectedCommands)
    : null;
  if (phase === "expanded_context" && expandedCommands.length === 0 && selectedBlockIds.length === 0) {
    throw new Error("ABORT empty_expanded_context: supply expanded_commands, selected_block_ids, or both");
  }

  return { phase, selectedCommands, selectedBlockIds, expandedCommands };
}

function commandHelp(command) {
  const entry = helpGuidesByCommand.get(command);
  if (!entry || !entry.content_file) return null;
  const contentPath = path.join(DATA_ROOT, entry.content_file);
  return { ...entry, content: readUtf8(contentPath) };
}

function commandEvidence(command) {
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

function buildCommandEvidence(args) {
  const { phase, selectedCommands, selectedBlockIds, expandedCommands } = validateArguments(args);

  if (phase === "discovery") {
    return {
      phase: "discovery",
      main_rules: mainRules(),
      command_dictionary: registry.commands,
    };
  }

  if (phase === "selected_command_evidence") {
    return {
      phase: "selected_command_evidence",
      main_rules: mainRules(),
      selected_commands: selectedCommands,
      command_evidence: selectedCommands.map(commandEvidence),
    };
  }

  for (const blockId of selectedBlockIds) {
    const profile = profilesById.get(blockId);
    if (!selectedCommands.includes(profile.focus_command)) {
      throw new Error(
        `ABORT paper_block_not_selected_command: ${blockId} belongs to ${profile.focus_command}`,
      );
    }
  }
  return {
    phase: "expanded_context",
    main_rules: mainRules(),
    selected_commands: selectedCommands,
    expanded_commands: expandedCommands,
    selected_block_ids: selectedBlockIds,
    expanded_command_evidence: expandedCommands.map((command) => ({
      command,
      expanded_documentation: expandedDocumentation(command),
    })),
    paper_usage_cards: selectedBlockIds.map(paperCard),
  };
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Stateless three-phase exact-key Stata evidence lookup. Every phase includes the common main rules. Phase 1 returns the 115-command neutral dictionary. The model autonomously selects exact canonical commands. Phase 2 returns Stata 18-rendered official or maintainer help, factual expanded-documentation status, and a compact paper-profile catalog. When help does not fully settle the requested action, Phase 3 can combine whole Stata 18 manual entries for only the exact expanded_commands subset with optional exact paper blocks and directly linked raw log or artifact excerpts. The model chooses which selected commands to expand and which exact block IDs to request; the server never scores, ranks, recommends, promotes, audits, semantically validates, or automatically chooses commands, blocks, specifications, or outputs.",
    inputSchema: {
      oneOf: [
        {
          title: "Phase 1 command dictionary",
          type: "object",
          additionalProperties: false,
          required: ["request"],
          properties: { request: { type: "string", minLength: 1 } },
        },
        {
          title: "Phase 2 selected command help and paper profiles",
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
            expanded_commands: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
            selected_block_ids: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
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
};
