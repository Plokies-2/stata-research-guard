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

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", name), "utf8"));
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
const PAPER_EXECUTION_CONTEXTS = readJsonl("paper_execution_contexts.jsonl");
const COMMAND_HELP_INDEX = readJson("command_help_guides.json");
const EXPANDED_GUIDE_INDEX = readJson("expanded_command_guides.json");

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
  assert.match(result.main_rules.content, /If the appropriate command is clear from the request and project context, select only that command/);
  assert.match(result.main_rules.content, /When multiple commands are genuinely needed/);
  assert.match(result.main_rules.content, /you may request only those relevant evidence packets together/);
  assert.match(result.main_rules.content, /Do not create a `program` merely to shorten one call or anticipate future reuse/);
  assert.match(result.main_rules.content, /Indent only inside a real control-flow scope/);
  assert.match(result.main_rules.content, /In each core regression or estimation call/);
  assert.match(result.main_rules.content, /Do not replace them with local or global macros/);
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

test("Phase 2 returns Stata-rendered xtreg help and its three exact profiles", () => {
  const result = buildCommandEvidence({ request: "Use xtreg", selected_commands: ["xtreg"] });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "command_evidence",
  ]);
  assert.deepEqual(result.selected_commands, ["xtreg"]);
  assert.equal(result.command_evidence.length, 1);
  const evidence = result.command_evidence[0];
  assert.equal(evidence.command, "xtreg");
  assert.equal(evidence.help_status, "available");
  assert.equal(evidence.command_help.command, "xtreg");
  assert.equal(evidence.command_help.source_version, "Stata 18");
  assert.match(evidence.command_help.content, /xtreg depvar/);
  assert.match(evidence.command_help.content, /Syntax/);
  assert.equal(evidence.expanded_documentation.status, "available");
  assert.equal(evidence.expanded_documentation.source_version, "Stata 18 installation");
  assert.deepEqual(
    evidence.paper_example_catalog.map((row) => row.block_id),
    ["block-139-184-033", "block-139-184-034", "block-139-184-035"],
  );
  assert.equal("block_code" in evidence.paper_example_catalog[0], false);
  assert.equal(deepKeys(evidence).has("full_command_guide"), false);
});

test("Phase 2 resolves multiple selected commands independently in request order", () => {
  const result = buildCommandEvidence({
    request: "Use several commands",
    selected_commands: ["duplicates", "cgmreg", "xtivreg", "jwdidstacked"],
  });
  assert.deepEqual(
    result.command_evidence.map((row) => row.command),
    ["duplicates", "cgmreg", "xtivreg", "jwdidstacked"],
  );
  assert.deepEqual(
    result.command_evidence.map((row) => row.help_status),
    ["available", "available", "available", "unavailable"],
  );

  const [duplicates, cgmreg, xtivreg, jwdidstacked] = result.command_evidence;
  assert.equal(duplicates.command_help.command, "duplicates");
  assert.ok(duplicates.paper_example_catalog.length > 0);
  assert.match(cgmreg.command_help.content, /cluster\(varlist\)/);
  assert.equal(cgmreg.expanded_documentation.status, "same_source_as_help");
  assert.equal(cgmreg.paper_example_catalog.length, 3);
  assert.equal(xtivreg.command_help.command, "xtivreg");
  assert.deepEqual(xtivreg.paper_example_catalog.map((row) => row.block_id), ["block-139-184-032"]);
  assert.equal(jwdidstacked.command_help, null);
  assert.equal(jwdidstacked.expanded_documentation.status, "unavailable");
  assert.equal(jwdidstacked.paper_example_catalog.length, 1);
});

test("the Stata 18 help and expanded-document indexes cover all 109 commands", () => {
  assert.equal(COMMAND_HELP_INDEX.guides.length, 109);
  const counts = Object.groupBy(COMMAND_HELP_INDEX.guides, (row) => row.help_status);
  assert.equal(counts.available.length, 107);
  assert.equal(counts.partial, undefined);
  assert.equal(counts.unavailable.length, 2);
  assert.deepEqual(counts.unavailable.map((row) => row.command).sort(), ["jregress", "jwdidstacked"]);

  const collectStyle = COMMAND_HELP_INDEX.guides.find((row) => row.command === "collect_style");
  assert.equal(collectStyle.help_status, "available");
  assert.equal(collectStyle.help_topics.length, 19);
  assert.match(collectStyle.limitations.join(" "), /Stata 18 scope excludes/);
  const content = fs.readFileSync(path.join(ROOT, "data", collectStyle.content_file), "utf8");
  assert.match(content, /collect style _cons/);

  assert.equal(EXPANDED_GUIDE_INDEX.guides.length, 109);
  const expandedCounts = Object.groupBy(
    EXPANDED_GUIDE_INDEX.guides,
    (row) => row.expanded_documentation_status,
  );
  assert.equal(expandedCounts.available.length, 63);
  assert.equal(expandedCounts.same_source_as_help.length, 44);
  assert.equal(expandedCounts.supplemental.length, 1);
  assert.equal(expandedCounts.unavailable.length, 1);
});

test("Phase 3 returns Stata 18 expanded documentation without requiring a paper block", () => {
  const result = buildCommandEvidence({
    request: "Read more about regress",
    selected_commands: ["regress"],
    expanded: true,
  });
  assert.equal(result.phase, "expanded_context");
  assert.deepEqual(result.selected_block_ids, []);
  assert.deepEqual(result.paper_usage_cards, []);
  const documentation = result.expanded_command_evidence[0].expanded_documentation;
  assert.equal(documentation.expanded_documentation_status, "available");
  assert.equal(documentation.source_version, "Stata 18 installation");
  assert.match(documentation.content, /^regress — Linear regression/m);
  assert.match(documentation.content, /regress depvar/);
});

test("Phase 3 returns one slim exact xtreg paper card with an empty log array", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtreg example",
    selected_commands: ["xtreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-033"],
  });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "selected_block_ids",
    "expanded_command_evidence",
    "paper_usage_cards",
  ]);
  assert.equal(result.paper_usage_cards.length, 1);
  const card = result.paper_usage_cards[0];
  assert.equal(card.block_id, "block-139-184-033");
  assert.equal(card.focus_command, "xtreg");
  assert.match(card.paper_code, /xtreg ln_mortality_rate/);
  assert.equal(card.source_provenance.length, 1);
  assert.equal("paper_occurrences" in card, false);
  assert.equal("boundary_rationale" in card, false);
  assert.deepEqual(card.paper_log_contexts, []);
});

test("Phase 3 attaches the exact raw xtivreg log span without interpretation fields", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtivreg example",
    selected_commands: ["xtivreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-032"],
  });
  const card = result.paper_usage_cards[0];
  assert.equal(card.paper_code.split(/\r?\n/).length, 15);
  assert.equal(card.source_provenance.length, 1);
  assert.equal(card.paper_log_contexts.length, 1);
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

test("Phase 3 manually narrows the one giant ivregress nuisance table to exact raw ranges", () => {
  const result = buildCommandEvidence({
    request: "Inspect the focal ivregress result",
    selected_commands: ["ivregress"],
    expanded: true,
    selected_block_ids: ["manual-block-084"],
  });
  const spans = result.paper_usage_cards[0].paper_log_contexts[0].log_spans;
  assert.deepEqual(spans.map((row) => [row.role, row.start, row.end]), [
    ["command_echo", 472, 472],
    ["displayed_output", 473, 482],
    ["displayed_output", 992, 994],
  ]);
  assert.match(spans[1].text, /Instrumental-variables LIML regression/);
  assert.match(spans[1].text, /educ/);
  assert.match(spans[2].text, /Endogenous: educ/);
  assert.doesNotMatch(JSON.stringify(spans), /_YPyobXpob_39_56/);
});

test("outreg2 profiles remain nonbinding when a selected block contains another estimator", () => {
  const phase2 = buildCommandEvidence({
    request: "Keep regress and use outreg2",
    selected_commands: ["regress", "outreg2"],
  });
  const outreg2Evidence = phase2.command_evidence.find((row) => row.command === "outreg2");
  assert.deepEqual(
    outreg2Evidence.paper_example_catalog.map((row) => row.block_id),
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
    expanded: true,
    selected_block_ids: ["outreg2_table3_excel_loop_specs"],
  });
  assert.deepEqual(phase3.selected_commands, ["regress", "outreg2"]);
  assert.equal(phase3.paper_usage_cards[0].focus_command, "outreg2");
  assert.match(phase3.paper_usage_cards[0].paper_code, /reghdfe/);
});

test("paper data stays at 166 blocks and 12 optional raw-log attachments", () => {
  assert.equal(PAPER_PROFILES.length, 166);
  assert.equal(PAPER_BLOCKS.length, 166);
  assert.equal(PAPER_EXECUTION_CONTEXTS.length, 12);
});

test("missing dictionary commands abort while unavailable help remains command-local", () => {
  assert.throws(
    () => buildCommandEvidence({ request: "Use madeup", selected_commands: ["madeup"] }),
    /ABORT command_not_in_dictionary/,
  );
  for (const command of ["jregress", "jwdidstacked"]) {
    const result = buildCommandEvidence({ request: `Use ${command}`, selected_commands: [command] });
    const evidence = result.command_evidence[0];
    assert.equal(evidence.command, command);
    assert.equal(evidence.help_status, "unavailable");
    assert.equal(evidence.command_help, null);
    assert.ok(evidence.paper_example_catalog.length > 0);
  }
});

test("Phase 3 reports duplicate maintainer help and the limited jregress supplement honestly", () => {
  const result = buildCommandEvidence({
    request: "Read the available expansion",
    selected_commands: ["cgmreg", "jregress", "jwdidstacked"],
    expanded: true,
  });
  const rows = result.expanded_command_evidence.map((row) => row.expanded_documentation);
  assert.deepEqual(rows.map((row) => row.expanded_documentation_status), [
    "same_source_as_help",
    "supplemental",
    "unavailable",
  ]);
  assert.equal(rows[0].content, null);
  assert.match(rows[1].content, /jackknife standard errors/);
  assert.match(rows[1].limitations.join(" "), /does not replace missing authoritative syntax help/);
  assert.equal(rows[2].content, null);
});

test("Phase 3 returns available paper blocks when another selected command lacks help", () => {
  const result = buildCommandEvidence({
    request: "Inspect the available branch",
    selected_commands: ["jregress", "xtivreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-032"],
  });
  assert.deepEqual(result.selected_commands, ["jregress", "xtivreg"]);
  assert.equal(result.paper_usage_cards.length, 1);
  assert.equal(result.paper_usage_cards[0].focus_command, "xtivreg");
  assert.equal(result.paper_usage_cards[0].paper_log_contexts.length, 1);
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
      expanded: true,
      selected_block_ids: ["block-139-184-032"],
    }),
    /ABORT paper_block_not_selected_command/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Missing expanded flag",
      selected_commands: ["xtreg"],
      selected_block_ids: ["block-139-184-033"],
    }),
    /ABORT invalid_phase_arguments/,
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
