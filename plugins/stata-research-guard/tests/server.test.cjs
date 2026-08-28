"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const {
  FORBIDDEN_RESPONSE_KEYS,
  TOOL_DEFINITIONS,
  assertNoForbiddenKeys,
  buildCommandEvidence,
  dispatch,
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

test("MCP exposes one evidence tool", () => {
  assert.deepEqual(TOOL_DEFINITIONS.map((tool) => tool.name), ["get_stata_command_evidence"]);
  const listed = dispatch({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["get_stata_command_evidence"]);
  const initialized = dispatch({ jsonrpc: "2.0", id: 2, method: "initialize" });
  assert.equal(initialized.result.serverInfo.name, "stataResearchGuard");
});

test("regression and Excel export remain separate task atoms", () => {
  const evidence = buildCommandEvidence({
    request: "Run a regression and export the regression table to Excel",
    known_constraints: { cluster: "firm" },
  });
  const estimation = evidence.task_atoms.find((atom) => atom.id === "estimation.linear");
  const exporting = evidence.task_atoms.find((atom) => atom.id === "export.regression_excel");
  assert.ok(estimation);
  assert.ok(exporting);
  assert.ok(estimation.candidate_commands.includes("regress"));
  assert.equal(estimation.candidate_commands.includes("outreg2"), false);
  assert.ok(exporting.candidate_commands.includes("outreg2"));
  assert.equal(exporting.candidate_commands.includes("regress"), false);
  assert.equal(evidence.task_atoms.some((atom) => atom.id === "command.table"), false);
  assert.ok(evidence.task_atoms.every((atom) => atom.known_constraints === '{"cluster":"firm"}'));
  assert.ok(TOOL_DEFINITIONS[0].outputSchema);
});

test("response contains readable sources without grading keys", () => {
  const evidence = buildCommandEvidence({ request: "Estimate an OLS regression with regress" });
  const regress = evidence.command_cards.find((card) => card.command === "regress");
  assert.ok(regress);
  assert.ok(regress.authority_sources.some((source) => source.source_url === "https://www.stata.com/manuals/rregress.pdf"));
  assert.ok(evidence.authoritative_examples.some((example) => example.command === "regress" && example.excerpt.includes("regress")));
  assertNoForbiddenKeys(evidence);
  const keys = deepKeys(evidence);
  for (const forbidden of FORBIDDEN_RESPONSE_KEYS) assert.equal(keys.has(forbidden), false, forbidden);
});

test("every surfaced candidate has a source or an explicit source gap", () => {
  for (const request of [
    "Estimate an instrumental variables model",
    "Create and export a graph",
    "Estimate a difference-in-differences event study",
  ]) {
    const evidence = buildCommandEvidence({ request });
    for (const card of evidence.command_cards) {
      if (card.authority_sources.length) continue;
      assert.ok(
        evidence.unresolved_facts.some((fact) => fact.includes(card.command)),
        `missing source gap for ${card.command}`,
      );
    }
  }
});

test("paper evidence is empty and honest until reviewed cards exist", () => {
  const evidence = buildCommandEvidence({ request: "Show a paper replication usage example for reghdfe" });
  assert.deepEqual(evidence.paper_usage_cards, []);
  assert.ok(evidence.unresolved_facts.some((fact) => fact.includes("paper_usage_occurrence")));
});

test("project scan returns literal observations without recommendation fields", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-project-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, "do"));
  fs.writeFileSync(path.join(project, "do", "analysis.do"), [
    'use "data/panel.dta", clear',
    'reghdfe outcome treatment controls, absorb(firm year) vce(cluster firm)',
    'outreg2 using "output/table.xls", replace',
    'do "do/figures.do"',
  ].join("\n"), "utf8");

  const scan = scanProjectCommandObservations(project, ["do/analysis.do"]);
  assert.equal(scan.observations.length, 4);
  assert.deepEqual(scan.observations.map((row) => row.command), ["use", "reghdfe", "outreg2", "do"]);
  assert.equal(scan.observations[1].line, 2);
  assert.equal(scan.observations[1].options, "absorb(firm year) vce(cluster firm)");
  assert.ok(scan.observations[2].relations.some((relation) => relation.value === "output/table.xls"));
  const keys = deepKeys(scan);
  for (const forbidden of FORBIDDEN_RESPONSE_KEYS) assert.equal(keys.has(forbidden), false, forbidden);
});

test("export commands treat using paths as outputs", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-exports-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "exports.do"), [
    'export delimited using "output/data.csv", replace',
    'export excel using "output/data.xlsx", firstrow(variables) replace',
  ].join("\n"), "utf8");

  const scan = scanProjectCommandObservations(project, ["exports.do"]);
  assert.equal(scan.observations.length, 2);
  for (const observation of scan.observations) {
    assert.deepEqual(observation.relations.map((relation) => relation.kind), ["output"]);
  }
});

test("target files cannot escape the selected project", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-contained-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "inside.do"), "summarize x\n", "utf8");
  assert.throws(() => scanProjectCommandObservations(project, ["../outside.do"]), /escapes project_path/);
  assert.throws(() => scanProjectCommandObservations(project, [path.join(project, "inside.do")]), /project-relative/);
});

test("tool call validates input and rejects legacy tool names", () => {
  const missing = dispatch({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: {} },
  });
  assert.equal(missing.result.isError, true);
  assert.match(missing.result.content[0].text, /request/);

  const filesWithoutProject = dispatch({
    jsonrpc: "2.0",
    id: 31,
    method: "tools/call",
    params: {
      name: "get_stata_command_evidence",
      arguments: { request: "inspect this file", target_files: ["analysis.do"] },
    },
  });
  assert.equal(filesWithoutProject.result.isError, true);
  assert.match(filesWithoutProject.result.content[0].text, /project_path/);

  const userVocabulary = buildCommandEvidence({
    request: "Estimate a regression",
    known_constraints: { score: "baseline_score", pass: "pass_rate" },
  });
  assert.ok(userVocabulary.task_atoms.every((atom) => atom.known_constraints.includes("baseline_score")));

  const legacy = dispatch({
    jsonrpc: "2.0",
    id: 4,
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
