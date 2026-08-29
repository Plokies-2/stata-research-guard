"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_ROOT = path.join(PLUGIN_ROOT, "data");
const REGISTRY_PATH = path.join(DATA_ROOT, "command_registry.json");
const COMMAND_HELP_GUIDES_PATH = path.join(DATA_ROOT, "command_help_guides.json");
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

function validateArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("arguments must be an object");
  }
  if (typeof args.request !== "string" || !args.request.trim()) {
    throw new Error("request must be a non-empty string");
  }

  const hasCommands = Object.prototype.hasOwnProperty.call(args, "selected_commands");
  const hasBlocks = Object.prototype.hasOwnProperty.call(args, "selected_block_ids");
  const phase = hasBlocks ? "paper_examples" : hasCommands ? "selected_command_evidence" : "discovery";
  const allowed = phase === "discovery"
    ? new Set(["request"])
    : phase === "selected_command_evidence"
      ? new Set(["request", "selected_commands"])
      : new Set(["request", "selected_commands", "selected_block_ids"]);
  const unexpected = Object.keys(args).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(`ABORT invalid_phase_arguments: ${phase} does not allow ${unexpected.join(", ")}`);
  }
  if (phase === "paper_examples" && !hasCommands) {
    throw new Error("ABORT invalid_phase_arguments: paper_examples requires selected_commands");
  }

  return {
    phase,
    selectedCommands: phase === "discovery" ? null : selectedCommandsFrom(args),
    selectedBlockIds: phase === "paper_examples" ? selectedBlockIdsFrom(args) : null,
  };
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
    full_manual_available: entry.full_manual_available,
    paper_example_catalog: profilesByCommand.get(command) || [],
  };
}

function paperCard(blockId) {
  const block = blocksById.get(blockId);
  if (!block) {
    throw new Error(`ABORT paper_block_not_in_catalog: ${JSON.stringify(blockId)}`);
  }
  const paperOccurrencesForBlock = block.target_occurrence_ids
    .map((occurrenceId) => occurrencesById.get(occurrenceId))
    .filter(Boolean);
  return {
    paper_block: block,
    paper_occurrences: paperOccurrencesForBlock,
    paper_log_contexts: executionContextsByBlock.get(blockId) || [],
  };
}

function buildCommandEvidence(args) {
  const { phase, selectedCommands, selectedBlockIds } = validateArguments(args);

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
    phase: "paper_examples",
    main_rules: mainRules(),
    selected_commands: selectedCommands,
    selected_block_ids: selectedBlockIds,
    paper_usage_cards: selectedBlockIds.map(paperCard),
  };
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Stateless three-phase exact-key Stata evidence lookup. Every phase includes the common main rules. Phase 1 returns the 109-command neutral dictionary. The model autonomously selects exact canonical commands. Phase 2 returns one independent packet per selected command with Stata-rendered official or maintainer help, factual help and full-manual availability, and a compact paper-profile catalog. It does not return the retained full manuals or raw paper code. Phase 3 currently returns only exact selected raw paper blocks, linked occurrences, and optional directly linked raw log or artifact context; any redesigned expanded manual-plus-paper phase remains deferred. Commands outside the dictionary abort. The server does not score, rank, recommend, promote, audit, semantically validate, or automatically choose commands, blocks, specifications, or outputs.",
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
          title: "Phase 3 exact raw paper context",
          type: "object",
          additionalProperties: false,
          required: ["request", "selected_commands", "selected_block_ids"],
          properties: {
            request: { type: "string", minLength: 1 },
            selected_commands: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
            selected_block_ids: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          },
        },
      ],
    },
    outputSchema: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["phase", "main_rules", "command_dictionary"],
          properties: {
            phase: { const: "discovery" },
            main_rules: { type: "object" },
            command_dictionary: { type: "array", items: { type: "object" } },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["phase", "main_rules", "selected_commands", "command_evidence"],
          properties: {
            phase: { const: "selected_command_evidence" },
            main_rules: { type: "object" },
            selected_commands: { type: "array", items: { type: "string" } },
            command_evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["command", "help_status", "command_help", "full_manual_available", "paper_example_catalog"],
                properties: {
                  command: { type: "string" },
                  help_status: { enum: ["available", "partial", "unavailable"] },
                  command_help: { anyOf: [{ type: "object" }, { type: "null" }] },
                  full_manual_available: { type: "boolean" },
                  paper_example_catalog: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["phase", "main_rules", "selected_commands", "selected_block_ids", "paper_usage_cards"],
          properties: {
            phase: { const: "paper_examples" },
            main_rules: { type: "object" },
            selected_commands: { type: "array", items: { type: "string" } },
            selected_block_ids: { type: "array", items: { type: "string" } },
            paper_usage_cards: { type: "array", items: { type: "object" } },
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
