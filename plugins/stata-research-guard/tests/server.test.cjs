"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER_PATH = path.join(ROOT, "mcp", "server.cjs");
const {
  TOOL_DEFINITIONS,
  buildCommandEvidence,
  dispatch,
} = require(SERVER_PATH);

function readJsonl(name) {
  return fs.readFileSync(path.join(ROOT, "data", name), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(JSON.parse);
}

function deepKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const row of value) deepKeys(row, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      deepKeys(child, keys);
    }
  }
  return keys;
}

const PAPER_PROFILES = readJsonl("paper_example_profiles.jsonl");
const PAPER_BLOCKS = readJsonl("high_quality_paper_blocks.jsonl");
const PAPER_OCCURRENCES = readJsonl("paper_usage_occurrences.jsonl");
const PAPER_EXECUTION_CONTEXTS = readJsonl("paper_execution_contexts.jsonl");

test("MCP exposes one simple exact-key three-phase lookup tool", () => {
  assert.equal(TOOL_DEFINITIONS.length, 1);
  assert.equal(TOOL_DEFINITIONS[0].name, "get_stata_command_evidence");
  assert.equal(TOOL_DEFINITIONS[0].inputSchema.oneOf.length, 3);
  assert.equal(TOOL_DEFINITIONS[0].outputSchema.oneOf.length, 3);
  assert.doesNotMatch(JSON.stringify(TOOL_DEFINITIONS), /project_path|target_files|known_constraints/);
});

test("Phase 1 returns common main rules and the neutral 109-command dictionary only", () => {
  const result = buildCommandEvidence({ request: "Choose Stata commands" });
  assert.deepEqual(Object.keys(result), ["phase", "main_rules", "command_dictionary"]);
  assert.equal(result.phase, "discovery");
  assert.match(result.main_rules.content, /# General Rules/);
  assert.equal(result.command_dictionary.length, 109);

  for (const command of result.command_dictionary) {
    for (const field of [
      "command",
      "role",
      "capabilities",
      "required_input_state",
      "output_interface",
      "tradeoffs_and_incompatibilities",
    ]) {
      assert.ok(Object.hasOwn(command, field), `${command.command} lacks ${field}`);
    }
  }

  const keys = deepKeys(result);
  for (const key of [
    "full_command_guides",
    "paper_example_catalog",
    "paper_usage_cards",
    "score",
    "rank",
    "winner",
    "promotion_status",
  ]) {
    assert.equal(keys.has(key), false);
  }
});

test("Phase 2 returns the full xtreg guide and its three exact profiles", () => {
  const result = buildCommandEvidence({ request: "Use xtreg", selected_commands: ["xtreg"] });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "full_command_guides",
    "paper_example_catalog",
  ]);
  assert.deepEqual(result.selected_commands, ["xtreg"]);
  assert.equal(result.full_command_guides.length, 1);
  assert.equal(result.full_command_guides[0].command, "xtreg");
  assert.equal(result.full_command_guides[0].content.length, 149155);
  assert.deepEqual(
    result.paper_example_catalog.map((row) => row.block_id),
    ["block-139-184-033", "block-139-184-034", "block-139-184-035"],
  );
  assert.equal("block_code" in result.paper_example_catalog[0], false);
});

test("Phase 3 returns one exact xtreg block and occurrence with an empty log array", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtreg example",
    selected_commands: ["xtreg"],
    selected_block_ids: ["block-139-184-033"],
  });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "selected_block_ids",
    "paper_usage_cards",
  ]);
  assert.equal(result.paper_usage_cards.length, 1);
  const card = result.paper_usage_cards[0];
  assert.deepEqual(Object.keys(card), ["paper_block", "paper_occurrences", "paper_log_contexts"]);
  assert.deepEqual(card.paper_block, PAPER_BLOCKS.find((row) => row.block_id === "block-139-184-033"));
  assert.ok(card.paper_occurrences.length > 0);
  assert.deepEqual(card.paper_log_contexts, []);
});

test("Phase 3 attaches the exact raw xtivreg log span without interpretation fields", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtivreg example",
    selected_commands: ["xtivreg"],
    selected_block_ids: ["block-139-184-032"],
  });
  const card = result.paper_usage_cards[0];
  assert.equal(card.paper_block.block_code.split(/\r?\n/).length, 15);
  assert.equal(card.paper_occurrences.length, 1);
  assert.deepEqual(
    card.paper_occurrences[0],
    PAPER_OCCURRENCES.find((row) => row.occurrence_id === card.paper_block.target_occurrence_ids[0]),
  );
  assert.equal(card.paper_log_contexts.length, 1);
  assert.deepEqual(
    card.paper_log_contexts[0],
    PAPER_EXECUTION_CONTEXTS.find((row) => row.parent_block_id === "block-139-184-032"),
  );
  assert.equal(card.paper_log_contexts[0].log_spans[0].start, 1);
  assert.equal(card.paper_log_contexts[0].log_spans[0].end, 71);
  assert.equal(card.paper_log_contexts[0].log_spans[0].text.split(/\r?\n/).length, 71);

  const keys = deepKeys(card.paper_log_contexts);
  for (const key of [
    "observed_output_facts",
    "returned_state_facts",
    "factual_limitations",
    "score",
    "rank",
    "winner",
    "promotion_status",
    "pass",
    "fail",
  ]) {
    assert.equal(keys.has(key), false);
  }
});

test("outreg2 profiles remain nonbinding when a selected block contains another estimator", () => {
  const phase2 = buildCommandEvidence({
    request: "Keep regress and use outreg2",
    selected_commands: ["regress", "outreg2"],
  });
  assert.deepEqual(
    phase2.paper_example_catalog.filter((row) => row.focus_command === "outreg2").map((row) => row.block_id),
    [
      "outreg2_table6_replace_append_stats",
      "outreg2_table2_word_columns",
      "outreg2_table3_excel_loop_specs",
      "outreg2_appendixB2a_instrument_columns",
    ],
  );

  const phase3 = buildCommandEvidence({
    request: "Inspect one outreg2 example without changing regress",
    selected_commands: ["regress", "outreg2"],
    selected_block_ids: ["outreg2_table3_excel_loop_specs"],
  });
  assert.deepEqual(phase3.selected_commands, ["regress", "outreg2"]);
  assert.equal(phase3.paper_usage_cards[0].paper_block.focus_command, "outreg2");
  assert.match(phase3.paper_usage_cards[0].paper_block.block_code, /reghdfe/);
});

test("paper data stays at 166 blocks and 12 optional raw-log attachments", () => {
  assert.equal(PAPER_PROFILES.length, 166);
  assert.equal(PAPER_BLOCKS.length, 166);
  assert.equal(PAPER_EXECUTION_CONTEXTS.length, 12);
});

test("missing dictionary commands and missing full guides abort without substitution", () => {
  assert.throws(
    () => buildCommandEvidence({ request: "Use madeup", selected_commands: ["madeup"] }),
    /ABORT command_not_in_dictionary/,
  );
  for (const command of ["cgmreg", "jwdidstacked"]) {
    assert.throws(
      () => buildCommandEvidence({ request: `Use ${command}`, selected_commands: [command] }),
      /ABORT full_command_guide_unavailable/,
    );
  }
});

test("phase arguments and exact IDs fail closed", () => {
  assert.throws(
    () => buildCommandEvidence({ request: "Scan", selected_commands: ["xtreg"], project_path: "." }),
    /ABORT invalid_phase_arguments/,
  );
  assert.throws(
    () => buildCommandEvidence({ request: "Duplicate", selected_commands: ["xtreg", "xtreg"] }),
    /ABORT duplicate_selected_command/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Wrong command",
      selected_commands: ["xtreg"],
      selected_block_ids: ["block-139-184-032"],
    }),
    /ABORT paper_block_not_selected_command/,
  );
});

test("JSON-RPC transport lists and calls the lookup tool", () => {
  const list = dispatch({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(list.result.tools.length, 1);

  const call = dispatch({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: { request: "Discover" } },
  });
  assert.equal(call.result.isError, undefined);
  assert.equal(JSON.parse(call.result.content[0].text).command_dictionary.length, 109);
  assert.equal(dispatch({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});
