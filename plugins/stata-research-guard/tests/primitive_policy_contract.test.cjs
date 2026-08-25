"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "mcp", "server.cjs");

class McpClient {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.child = spawn(process.execPath, [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
    const lines = readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    lines.on("line", (line) => {
      const message = JSON.parse(line);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  request(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async tool(name, args) {
    const result = await this.request("tools/call", { name, arguments: args });
    assert.equal(result.isError, undefined, result.content?.[0]?.text);
    return result.structuredContent;
  }

  close() {
    this.child.kill();
  }
}

function fallback(reason, statements) {
  return `* BEGIN DIRECT FALLBACK: ${reason}\n${statements}\n* END DIRECT FALLBACK`;
}

test("iteration cleanly re-renders an atomic span and freezes one final path", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const initialized = await client.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "iteration-policy-contract", version: "1" },
  });
  assert.match(initialized.instructions, /Iteration is allowed; judge the final frozen source/i);
  assert.match(initialized.instructions, /cleanly re-render it from the same selected block/i);
  assert.match(initialized.instructions, /Never stack patches, wrappers/i);
  assert.match(initialized.instructions, /one final implementation path per atomic transition/i);

  const skill = fs.readFileSync(path.join(ROOT, "skills", "stata-replication-workflow", "SKILL.md"), "utf8");
  const authoring = fs.readFileSync(path.join(ROOT, "skills", "stata-replication-workflow", "references", "template-first-authoring.md"), "utf8");
  assert.match(skill, /number of drafts is not a failure criterion/i);
  assert.match(skill, /canonical block rejected by the linter is a plugin defect/i);
  assert.match(authoring, /only the final frozen source is judged/i);
  assert.match(authoring, /leave exactly one implementation path for each atomic transition/i);
  assert.match(authoring, /Revision count is never a pass\/fail metric/i);
});

test("source-isolated trials preserve evidence boundaries without imposing template-only code", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const initialized = await client.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "source-isolation-contract", version: "1" },
  });
  assert.match(initialized.instructions, /source-isolated blind trial/i);
  assert.match(initialized.instructions, /Do not use Browser, web search, external URLs/i);
  assert.match(initialized.instructions, /does not require template-only code/i);
  assert.match(initialized.instructions, /narrow fallback implementations are allowed/i);
  assert.match(initialized.instructions, /rank-relative nearest inspected candidate.*nonbinding hint/i);
  assert.match(initialized.instructions, /Stop only when a substantive research choice is unresolved/i);

  const evaluation = fs.readFileSync(
    path.join(ROOT, "skills", "stata-replication-workflow", "references", "workflow-reproduction-evaluation.md"),
    "utf8",
  );
  assert.match(evaluation, /source-isolated trial/i);
  assert.match(evaluation, /Do not use Browser, web search, external URLs/i);
  assert.match(evaluation, /not a template-only requirement/i);
  assert.match(evaluation, /narrow contract-driven implementations may be written/i);
});

test("safe one-statement bindings need neither fallback markers nor a third schema mode", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const initialized = await client.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "primitive-policy-contract", version: "1" },
  });
  assert.match(initialized.instructions, /Do not invent a primitive mode/i);

  for (const [reason, statements] of [
    ["load declared built-in example", "sysuse auto, clear"],
    ["load approved producer output", 'use "$final/panel.dta", clear'],
    ["confirm declared input variable", "confirm variable price"],
    ["assert declared integrity condition", "assert !missing(price)"],
    ["bind approved generated-data path", 'global generated "$project/data/generated"'],
    ["bind declared identifier", 'encode firm_code, generate(firm_id)\nlabel variable firm_id "Firm identifier"'],
    ["retain requested active graph", 'graph save "$figures/result.gph", replace'],
  ]) {
    const direct = await client.tool("lint_do_file", { content: statements });
    assert.equal(direct.findings.some((row) => /direct_fallback/.test(row.rule)), false, reason);

    const wrapped = await client.tool("lint_do_file", { content: fallback(reason, statements) });
    assert.ok(
      wrapped.findings.some((row) => row.rule === "direct_fallback_markers_forbidden"),
      `${reason}: ${JSON.stringify(wrapped.findings)}`,
    );
  }
});

test("an already-declared direct master shell stays prompt-only and unmarked", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const initialized = await client.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "master-shell-contract", version: "1" },
  });
  assert.match(initialized.instructions, /prompt-only (?:master )?shell/i);
  assert.match(initialized.instructions, /log using.*flat direct do calls.*log close/i);
  assert.match(initialized.instructions, /Do not infer stages, paths, or order/i);
  assert.match(initialized.instructions, /above every individual do call.*one Korean comment sentence.*role/i);

  const skill = fs.readFileSync(path.join(ROOT, "skills", "stata-replication-workflow", "SKILL.md"), "utf8");
  const authoring = fs.readFileSync(path.join(ROOT, "skills", "stata-replication-workflow", "references", "template-first-authoring.md"), "utf8");
  for (const text of [skill, authoring]) {
    assert.match(text, /prompt-only (?:master |orchestration )?shell/i);
    assert.match(text, /flat (?:caller-declared sequence|list) of (?:the caller-declared )?direct `do` calls/i);
    assert.match(text, /(?:without a|no) template, ledger row, (?:or )?provenance/i);
    assert.match(text, /Every (?:called file|target) must (?:already )?exist/i);
    assert.match(text, /above each individual `do` call.*one Korean comment sentence.*role/i);
  }

  const shell = [
    'log using "$logs/master.log", replace text',
    '* 원자료를 정리해 분석용 자료를 만든다.',
    'do "$do/10_prepare.do"',
    '* 분석 모형을 추정하고 결과를 저장한다.',
    'do "$do/20_analyze.do"',
    "log close",
  ].join("\n");
  const linted = await client.tool("lint_do_file", { content: shell, role: "master", authoring_state: "new" });
  assert.equal(linted.findings.some((row) => /fallback|nested_loop|opaque_program/.test(row.rule)), false, JSON.stringify(linted.findings));
  assert.equal(linted.findings.some((row) => row.rule === "master_call_role_comment_missing"), false, JSON.stringify(linted.findings));
  assert.equal(linted.strengths.filter((row) => row.rule === "master_call_role_comment").length, 2);

  const missingComment = await client.tool("lint_do_file", {
    content: [
      'log using "$logs/master.log", replace text',
      'do "$do/10_prepare.do"',
      '* 분석 모형을 추정하고 결과를 저장한다.',
      'do "$do/20_analyze.do"',
      "log close",
    ].join("\n"),
    role: "master",
    authoring_state: "new",
  });
  assert.equal(missingComment.status, "blocked");
  assert.deepEqual(
    missingComment.findings.filter((row) => row.rule === "master_call_role_comment_missing").map((row) => row.line),
    [2],
  );

  const existingAutoAudit = await client.tool("lint_do_file", {
    content: 'do "$do/10_prepare.do"',
    role: "auto",
  });
  assert.equal(existingAutoAudit.findings.some((row) => row.rule === "master_call_role_comment_missing"), false);

  const nonDoCall = await client.tool("lint_do_file", {
    content: 'include "$do/00_config.do"',
    role: "master",
  });
  assert.equal(nonDoCall.findings.some((row) => row.rule === "master_call_role_comment_missing"), false);
});

test("primitive direct statements stay direct, while optioned variants remain research decisions", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const safeDirect = [
    ["load declared built-in example", "sysuse auto, clear"],
    ["inspect declared input", "describe price mpg weight"],
    ["assert a declared condition", "assert price > 0"],
    ["append one declared wave", 'append using "$raw/wave2.dta"'],
    ["plain descriptive summary", "summarize outcome"],
    ["plain descriptive tabstat", "tabstat outcome, statistics(mean sd n)"],
    ["clear stored estimates", "estimates clear"],
  ];

  for (const [reason, statement] of safeDirect) {
    const direct = await client.tool("lint_do_file", { content: statement });
    assert.equal(direct.findings.some((row) => row.rule === "unnecessary_safe_binding_fallback"), false, reason);

    const wrapped = await client.tool("lint_do_file", { content: fallback(reason, statement) });
    assert.ok(
      wrapped.findings.some((row) => row.rule === "direct_fallback_markers_forbidden"),
      `${reason}: ${JSON.stringify(wrapped.findings)}`,
    );
  }

  const decisionBearing = [
    ["sysuse accepts only a bare built-in name and clear", 'sysuse "auto", clear'],
    ["sysuse extra options are not a primitive", "sysuse auto, clear label"],
    ["append force changes compatibility", 'append using "$raw/wave2.dta", force'],
    ["append generate changes source coding", 'append using "$raw/wave2.dta", generate(source_wave)'],
    ["append keep selects source variables", 'append using "$raw/wave2.dta", keep(firm_id year outcome)'],
    ["summary chooses an estimation sample", "summarize outcome if e(sample)"],
    ["tabstat chooses a sample", "tabstat outcome if eligible == 1, statistics(mean sd n)"],
    ["tabstat creates groups", "tabstat outcome, by(treated) statistics(mean sd n)"],
    ["estimate save persists a selected result", 'estimates save "$ster/outcome.ster", replace'],
    ["estimate use selects a saved result", 'estimates use "$ster/outcome.ster"'],
    ["estimate store names a selected result", "estimates store main"],
    ["estimate restore selects a named result", "estimates restore main"],
  ];

  for (const [reason, statement] of decisionBearing) {
    const wrapped = await client.tool("lint_do_file", { content: fallback(reason, statement) });
    assert.equal(
      wrapped.findings.some((row) => row.rule === "direct_fallback_markers_forbidden"),
      true,
      `${reason}: ${JSON.stringify(wrapped.findings)}`,
    );
  }
});

test("research state transitions never leak into the safe-binding exception", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const unsafeTransitions = [
    ["merge retained states", 'merge m:1 firm_id year using "$raw/attributes.dta", keep(match) nogen'],
    ["assert declared unique key", "isid firm_id year"],
    ["declare panel", "xtset firm_id year, yearly"],
    ["construct treatment formula", "generate byte treated = asset_value >= 2000000"],
    ["restrict analysis sample", "keep if eligible == 1"],
    ["compute estimation sample mean", "summarize outcome if e(sample), meanonly"],
    ["attach estimation sample mean", "estadd scalar ymean = r(mean)"],
    ["persist estimate state", 'estimates save "$ster/outcome.ster", replace'],
    ["assemble event figure", "coefplot (full_sample) (subsample), keep(*.year#1.treated)"],
    ["export event PDF", 'graph export "$figures/outcome.pdf", replace'],
    ["finalize analysis dataset", 'save "$final/analysis_panel.dta", replace'],
  ];

  for (const [reason, statement] of unsafeTransitions) {
    const result = await client.tool("lint_do_file", { content: fallback(reason, statement) });
    assert.equal(
      result.findings.some((row) => row.rule === "direct_fallback_markers_forbidden"),
      true,
      `${reason}: ${JSON.stringify(result.findings)}`,
    );
  }
});

test("generated tool schemas retain researcher documentation without packaging requirements", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const listed = await client.request("tools/list");
  for (const toolName of ["workflow_blueprint", "research_output_check"]) {
    const schema = listed.tools.find((row) => row.name === toolName).inputSchema.properties.planned_variables.items;
    assert.deepEqual(
      schema.required,
      ["name", "reader_description", "source_or_formula", "unit_observation_level"],
    );
    assert.ok(schema.properties.creation_file);
  }

  const blueprint = await client.tool("workflow_blueprint", {
    project_mode: "new",
    new_project_confirmed: true,
    planned_variables: [{
      name: "large_firm",
      reader_description: "원자료 자산 기준을 충족하는 기업 지표",
      source_or_formula: "asset_value [thousand currency units] -> asset_value >= 2,000,000 -> 0/1 indicator",
      unit_observation_level: "0/1 indicator, firm-year",
      creation_file: "do/10_prep_master.do",
    }],
  });
  assert.ok(blueprint.recommended_tree.includes("project/README.md"));
  assert.equal(blueprint.planned_variables[0].name, "large_firm");
  assert.equal(blueprint.planned_variables[0].creation_file, "do/10_prep_master.do");
  assert.ok(blueprint.readme_contract.variable_dictionary_columns.includes("source_or_formula"));
  assert.ok(blueprint.readme_contract.variable_dictionary_columns.includes("unit_observation_level"));
  assert.ok(blueprint.readme_contract.variable_dictionary_columns.includes("creation_file"));
  assert.equal(
    blueprint.write_approval_contract.proposal_must_list.some((value) => /dependenc|deploy|submission|packag/i.test(value)),
    false,
  );
});

test("master role-comment severity depends on authoring state, not the file role alone", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const missingRoleComment = 'do "code/10_prepare.do"';

  const newlyAuthored = await client.tool("lint_do_file", {
    content: missingRoleComment,
    role: "master",
    authoring_state: "new",
  });
  const modified = await client.tool("lint_do_file", {
    content: missingRoleComment,
    role: "master",
    authoring_state: "modified",
  });
  const existingAudit = await client.tool("lint_do_file", {
    content: missingRoleComment,
    role: "master",
    authoring_state: "existing_audit",
  });

  const newFinding = newlyAuthored.findings.find((row) => row.rule === "master_call_role_comment_missing");
  const modifiedFinding = modified.findings.find((row) => row.rule === "master_call_role_comment_missing");
  assert.equal(newFinding.severity, "error");
  assert.equal(modifiedFinding.severity, "warning");
  assert.equal(existingAudit.findings.some((row) => row.rule === "master_call_role_comment_missing"), false);
});

test("depth summary keeps loop nesting distinct from general structural nesting", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const structuralOnly = await client.tool("lint_do_file", { content: [
    "if ready == 1 {",
    "    if eligible == 1 {",
    "        if period >= 0 {",
    "            foreach model in base extended {",
    "                summarize response",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n") });
  const structuralFinding = structuralOnly.findings.find((row) => row.rule === "deep_structural_nesting");
  assert.equal(structuralOnly.status, "needs_review", JSON.stringify(structuralOnly.findings));
  assert.equal(structuralOnly.summary.max_loop_depth, 1);
  assert.equal(structuralOnly.summary.max_structural_depth, 4);
  assert.equal(structuralFinding.severity, "warning");
  assert.equal(structuralFinding.structural_depth, 4);
  assert.equal(structuralFinding.allowed_structural_depth, 3);
  assert.deepEqual(structuralOnly.summary.max_active_loop_depth, {
    observed: 1,
    blocking_threshold: 3,
    definition: "simultaneously active foreach, forvalues, or while loops",
  });
  assert.deepEqual(structuralOnly.summary.max_braced_structural_depth, {
    observed: 4,
    review_threshold: 4,
    definition: "all simultaneously active braced blocks, including loops and conditionals",
  });
});
