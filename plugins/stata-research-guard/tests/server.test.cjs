"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const {
  FORBIDDEN_RESPONSE_KEYS,
  TOOL_DEFINITIONS,
  assertNoForbiddenKeys,
  buildPaperUsageByCommand,
  buildCommandEvidence,
  dispatch,
  paperUsageCardsFor,
  scanProjectCommandObservations,
} = require(path.join(ROOT, "mcp", "server.cjs"));

function deepKeys(value, output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => deepKeys(item, output));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      output.add(key);
      deepKeys(child, output);
    }
  }
  return output;
}

test("MCP exposes one exact-key two-stage evidence tool", () => {
  assert.deepEqual(TOOL_DEFINITIONS.map((tool) => tool.name), ["get_stata_command_evidence"]);
  assert.match(TOOL_DEFINITIONS[0].description, /omit selected_commands/i);
  assert.match(TOOL_DEFINITIONS[0].description, /must abort instead of guessing/i);
  assert.ok(TOOL_DEFINITIONS[0].inputSchema.properties.selected_commands);
  assert.equal(TOOL_DEFINITIONS[0].outputSchema.oneOf.length, 2);

  const listed = dispatch({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["get_stata_command_evidence"]);
  const initialized = dispatch({ jsonrpc: "2.0", id: 2, method: "initialize" });
  assert.equal(initialized.result.serverInfo.name, "stataResearchGuard");
});

test("discovery returns all 109 canonical dictionary entries without guide or paper bodies", () => {
  const discovery = buildCommandEvidence({ request: "Discover available commands" });
  assert.equal(discovery.phase, "discovery");
  assert.equal(discovery.command_dictionary.length, 109);
  assert.equal(new Set(discovery.command_dictionary.map((row) => row.command)).size, 109);
  assert.ok(discovery.command_dictionary.some((row) => row.command === "regress"));
  for (const row of discovery.command_dictionary) {
    assert.deepEqual(Object.keys(row), [
      "command",
      "invocation",
      "label",
      "description",
      "functional_labels",
      "guide_available",
      "paper_available",
    ]);
    assert.equal(typeof row.guide_available, "boolean");
    assert.equal(typeof row.paper_available, "boolean");
  }
  assert.equal("command_cards" in discovery, false);
  assert.equal("authoritative_examples" in discovery, false);
  assert.equal("full_command_guides" in discovery, false);
  assert.equal("paper_usage_cards" in discovery, false);
  assertNoForbiddenKeys(discovery);
});

test("general guidance is source-backed and identical in both phases", () => {
  const discovery = buildCommandEvidence({ request: "Discover available commands" });
  const evidence = buildCommandEvidence({
    request: "Use regress",
    selected_commands: ["regress"],
  });
  assert.deepEqual(evidence.general_guidance, discovery.general_guidance);
  assert.equal(
    discovery.general_guidance.source_path,
    "plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md",
  );
  assert.ok(discovery.general_guidance.content.includes("# General Rules"));
  assert.equal(
    discovery.general_guidance.source_hash,
    crypto.createHash("sha256").update(discovery.general_guidance.content).digest("hex"),
  );
});

test("evidence returns guide and paper payloads only for exact selected subset", () => {
  const evidence = buildCommandEvidence({
    request: "Estimate with regress and export with outreg2",
    selected_commands: ["regress", "outreg2"],
  });
  assert.equal(evidence.phase, "evidence");
  assert.deepEqual(evidence.selected_commands, ["regress", "outreg2"]);
  assert.deepEqual(evidence.command_cards.map((card) => card.command), ["regress", "outreg2"]);
  assert.ok(evidence.authoritative_examples.length > 0);
  assert.ok(evidence.authoritative_examples.every((row) => ["regress", "outreg2"].includes(row.command)));
  assert.ok(evidence.full_command_guides.every((row) => ["regress", "outreg2"].includes(row.command)));
  assert.ok(evidence.paper_usage_cards.every((row) => ["regress", "outreg2"].includes(row.command)));
  assert.ok(evidence.paper_usage_cards.every((row) => row.evidence_role === "high_quality_example"));
  assert.ok(evidence.paper_usage_cards.every((row) => row.usage_instruction.template_status === "not_a_template"));
  assert.equal(evidence.paper_usage_cards.filter((row) => row.command === "outreg2").length, 4);
  assert.deepEqual(evidence.related_artifacts.map((row) => row.artifact), ["outreg2_xlsx"]);
  assert.ok(evidence.related_artifacts[0].boundaries.some((row) => row.includes("does not choose or replace the estimator")));
  assert.equal(evidence.command_cards.some((card) => card.command === "areg"), false);
  assert.equal(evidence.authoritative_examples.some((row) => row.command === "areg"), false);

  const repeated = buildCommandEvidence({
    request: "Estimate with regress and export with outreg2",
    selected_commands: ["regress", "outreg2"],
  });
  assert.deepEqual(repeated.authoritative_examples, evidence.authoritative_examples);
});

test("dictionary exposes canonical multiword invocations and syntax-anchored outreg2 guide", () => {
  const discovery = buildCommandEvidence({ request: "Discover available commands" });
  assert.equal(discovery.command_dictionary.find((row) => row.command === "graph_bar").invocation, "graph bar");
  assert.equal(discovery.command_dictionary.find((row) => row.command === "collect_get").invocation, "collect get");

  const outreg2 = buildCommandEvidence({ request: "Use outreg2", selected_commands: ["outreg2"] });
  const guide = outreg2.authoritative_examples.find((row) => row.command === "outreg2");
  assert.ok(guide);
  assert.match(guide.excerpt, /outreg2\s+\[varlist\]/i);

  const regress = buildCommandEvidence({ request: "Use regress", selected_commands: ["regress"] });
  assert.deepEqual(regress.related_artifacts, []);
  assert.deepEqual(regress.full_command_guides, []);
});

test("selected reghdfe receives the complete cleaned maintainer guide without truncation", () => {
  const evidence = buildCommandEvidence({ request: "Use reghdfe", selected_commands: ["reghdfe"] });
  assert.equal(evidence.full_command_guides.length, 1);
  const guide = evidence.full_command_guides[0];
  assert.equal(guide.command, "reghdfe");
  assert.equal(guide.complete, true);
  assert.equal(guide.content_format, "markdown");
  assert.equal(guide.source_commit, "29b2b203f534413369d675d0c0f674d61291f536");
  assert.match(guide.content, /Maintainer help version: 6\.14\.1 08Jul2026/);
  assert.match(guide.content, /## Syntax/);
  assert.match(guide.content, /## Postestimation Syntax/);
  assert.match(guide.content, /## Examples/);
  assert.match(guide.content, /## Stored results/);
  assert.match(guide.content, /dk\[raay\]/);
  assert.match(guide.content, /vce\(dkraay\)/);
  assert.doesNotMatch(guide.content, /8 10 10 2|\[\+\]|\{(?:cmd|synopt|title|p2col)/);

  const contentPath = path.join(ROOT, "data", ...guide.content_file.split("/"));
  const sourcePath = path.join(ROOT, "data", ...guide.source_file.split("/"));
  assert.equal(guide.content, fs.readFileSync(contentPath, "utf8"));
  assert.equal(guide.content_sha256, crypto.createHash("sha256").update(guide.content).digest("hex"));
  assert.equal(guide.source_sha256, crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex"));
  assert.equal(evidence.command_cards[0].authority_sources[0].full_content_available, true);
  assertNoForbiddenKeys(evidence);
});

test("selected commands reject empty, duplicate, unregistered, alias-like, and case-changed keys", () => {
  for (const selected_commands of [[], ["regress", "regress"], ["not_a_stata_command"], ["reg"], ["Regress"]]) {
    assert.throws(
      () => buildCommandEvidence({ request: "Need exact evidence", selected_commands }),
      /^Error: ABORT command_not_in_dictionary:/,
    );
  }

  const aborted = dispatch({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_stata_command_evidence",
      arguments: { request: "Need exact evidence", selected_commands: [] },
    },
  });
  assert.equal(aborted.result.isError, true);
  assert.match(aborted.result.content[0].text, /^ABORT command_not_in_dictionary:/);
});

test("a selected command without a reviewed high-quality example reports guide-only fallback", () => {
  const discovery = buildCommandEvidence({ request: "Discover available commands" });
  const dictionaryRow = discovery.command_dictionary.find((row) => row.guide_available && !row.paper_available);
  assert.ok(dictionaryRow, "fixture must include a guide-only command");
  const evidence = buildCommandEvidence({
    request: `Use ${dictionaryRow.command}`,
    selected_commands: [dictionaryRow.command],
  });
  assert.equal(evidence.command_cards[0].evidence_mode, "guide_only_fallback");
  assert.deepEqual(evidence.paper_usage_cards, []);
  assert.ok(evidence.unresolved_facts.some((fact) => fact.includes("guide_only_fallback")));
});

test("paper helper returns selected high-quality blocks and keeps other commands nonbinding", () => {
  const rows = [
    { occurrence_id: "outreg2-1", command: "outreg2" },
    { occurrence_id: "regress-1", command: "regress" },
    { occurrence_id: "outreg2-2", command: "outreg2" },
  ];
  const blocks = [
    { block_id: "block-1", focus_command: "outreg2", target_occurrence_ids: ["outreg2-1"] },
    { block_id: "block-2", focus_command: "regress", target_occurrence_ids: ["regress-1"] },
    { block_id: "block-3", focus_command: "outreg2", target_occurrence_ids: ["outreg2-2"] },
  ];
  const cards = paperUsageCardsFor(["outreg2"], blocks, rows);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((card) => card.example), [blocks[0], blocks[2]]);
  assert.deepEqual(cards.map((card) => card.linked_target_occurrences), [[rows[0]], [rows[2]]]);
  assert.ok(cards.every((card) => card.command === "outreg2"));
  assert.ok(cards.every((card) => card.evidence_role === "high_quality_example"));
  assert.ok(cards.every((card) => card.usage_instruction.template_status === "not_a_template"));
  assert.ok(cards.every((card) => card.source_role.focus_command === "outreg2"));
  assert.ok(cards.every((card) => card.source_role.surrounding_code === "reference_context"));
  assert.ok(cards.every((card) => card.source_role.owns_other_command_choices === false));
  assert.equal(cards.some((card) => card.command === "regress" || card.command === "areg"), false);
});

test("reviewed paper index must cover all 109 commands and link exact occurrence ids once", () => {
  const dictionary = buildCommandEvidence({ request: "Discover available commands" }).command_dictionary;
  const rows = [
    { record_type: "paper_usage_occurrence", occurrence_id: "paper-outreg2-1", command: "outreg2" },
    { record_type: "paper_usage_occurrence", occurrence_id: "paper-regress-1", command: "regress" },
  ];
  const commands = dictionary.map(({ command }) => {
    const occurrenceIds = rows.filter((row) => row.command === command).map((row) => row.occurrence_id);
    return {
      command,
      occurrence_ids: occurrenceIds,
      paper_occurrence_count: occurrenceIds.length,
      guide_only_fallback: occurrenceIds.length === 0,
    };
  });
  const index = {
    record_type: "reviewed_command_paper_occurrence_index",
    registry_command_count: 109,
    occurrence_file: "paper_usage_occurrences.jsonl",
    occurrence_file_sha256: "fixture-hash",
    commands,
  };

  const byCommand = buildPaperUsageByCommand(index, rows, "fixture-hash");
  assert.equal(byCommand.size, 109);
  assert.deepEqual(byCommand.get("outreg2"), [rows[0]]);
  assert.deepEqual(byCommand.get("regress"), [rows[1]]);
  assert.deepEqual(byCommand.get("collect_export"), []);

  const incomplete = { ...index, commands: commands.slice(1) };
  assert.throws(
    () => buildPaperUsageByCommand(incomplete, rows, "fixture-hash"),
    /does not cover the complete command dictionary/,
  );
  assert.throws(
    () => buildPaperUsageByCommand(index, rows, "wrong-hash"),
    /does not match command_paper_index/,
  );
});

test("project scan joins continuation lines and ignores unknown first tokens and abbreviations", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-project-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "analysis.do"), [
    "reghdfe outcome treatment ///",
    "    controls, absorb(firm year) // inline note",
    "custom_local_program x y",
    "reg outcome treatment",
    'outreg2 using "output/table.xls", replace',
  ].join("\n"), "utf8");

  const scan = scanProjectCommandObservations(project, ["analysis.do"]);
  assert.deepEqual(scan.observations.map((row) => row.command), ["reghdfe", "outreg2"]);
  assert.equal(scan.observations[0].line, 1);
  assert.equal(
    scan.observations[0].statement,
    "reghdfe outcome treatment controls, absorb(firm year)",
  );
  assert.ok(scan.observations[1].relations.some((relation) => relation.value === "output/table.xls"));
});

test("project observations remain factual context in evidence and are not selected-command filtered", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-context-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "analysis.do"), [
    'use "data/panel.dta", clear',
    "regress outcome treatment",
    'outreg2 using "output/table.xls", replace',
  ].join("\n"), "utf8");

  const evidence = buildCommandEvidence({
    request: "Inspect outreg2",
    selected_commands: ["outreg2"],
    project_path: project,
    target_files: ["analysis.do"],
  });
  assert.deepEqual(evidence.command_cards.map((row) => row.command), ["outreg2"]);
  assert.deepEqual(evidence.project_observations.map((row) => row.command), ["use", "regress", "outreg2"]);
  const keys = deepKeys(evidence);
  for (const forbidden of FORBIDDEN_RESPONSE_KEYS) assert.equal(keys.has(forbidden), false, forbidden);
});

test("target files cannot escape the selected project", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-contained-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "inside.do"), "summarize x\n", "utf8");
  assert.throws(() => scanProjectCommandObservations(project, ["../outside.do"]), /escapes project_path/);
  assert.throws(() => scanProjectCommandObservations(project, [path.join(project, "inside.do")]), /project-relative/);
});

test("tool call validates request and rejects legacy tool names", () => {
  const missing = dispatch({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: {} },
  });
  assert.equal(missing.result.isError, true);
  assert.match(missing.result.content[0].text, /request/);

  const legacy = dispatch({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "resolve_transition_evidence", arguments: { request: "regress" } },
  });
  assert.equal(legacy.result.isError, true);
  assert.match(legacy.result.content[0].text, /unknown tool/);
});

test("JSON-RPC notifications never receive responses", () => {
  assert.equal(dispatch({ jsonrpc: "2.0", method: "tools/list" }), null);
  assert.equal(dispatch({
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: { request: "regress" } },
  }), null);
  assert.equal(dispatch({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});
