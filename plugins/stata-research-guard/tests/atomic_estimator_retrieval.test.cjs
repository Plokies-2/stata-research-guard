"use strict";

const assert = require("node:assert/strict");
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

function onlyCommandLines(code, pattern) {
  return code.split(/\r?\n/).filter((line) => pattern.test(line));
}

function assertAtomicHandoff(code, expected) {
  assert.equal(onlyCommandLines(code, expected).length, 1, `expected exactly one estimator command: ${code}`);
  assert.doesNotMatch(code, /\b(?:outreg2|putexcel|export|save|estadd|ereturn\s+post|event_plot|graph\s+export)\b/i);
  assert.doesNotMatch(code, /\bestimates\s+(?:save|restore)\b/i);
  assert.doesNotMatch(code, /\bsummarize\b[^\r\n]*\be\(sample\)\b/i);
  assert.doesNotMatch(code, /^\s*(?:foreach|forvalues|while)\b/im);
  assert.doesNotMatch(code, /^\s*program\s+define\b/im);
}

const CASES = [
  {
    labelId: "estimation.staggered_jwdid_ppmlhdfe_active.v1",
    variantId: "staggered_jwdid_ppmlhdfe_active",
    command: /^\s*jwdid\b/im,
  },
  {
    labelId: "estimation.twfe_ppmlhdfe_active.v1",
    variantId: "twfe_ppmlhdfe_active",
    command: /^\s*ppmlhdfe\b/im,
  },
  {
    labelId: "estimation.did_imputation_active_result.v1",
    variantId: "did_imputation_active_result",
    command: /^\s*did_imputation\b/im,
  },
  {
    labelId: "estimation.did_multiplegt_dynamic_active.v1",
    variantId: "did_multiplegt_dynamic_active",
    command: /^\s*did_multiplegt\b/im,
  },
  {
    labelId: "estimation.sun_abraham_iw_active.v1",
    variantId: "sun_abraham_iw_active",
    command: /^\s*eventstudyinteract\b/im,
  },
];

for (const scenario of CASES) {
  test(`${scenario.variantId} is retrieved exactly and contains only its active estimator`, async (t) => {
    const client = new McpClient();
    t.after(() => client.close());

    const result = await client.tool("search_labeled_checkpoints", { variant_id: scenario.variantId, limit: 5 });
    assert.equal(result.results.length, 1, scenario.variantId);
    const row = result.results[0];
    assert.equal(row.label_id, scenario.labelId);
    assert.equal(row.variant_id, scenario.variantId);
    assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification));
    assert.equal(row.auto_select_allowed, true);
    assertAtomicHandoff(row.code, scenario.command);
  });
}

test("csdid event handoff is retrieved exactly and retains only csdid plus estat event with an optional estore", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", { variant_id: "csdid_estat_event_active", limit: 5 });
  assert.equal(result.results.length, 1);
  const row = result.results[0];
  assert.equal(row.label_id, "estimation.csdid_estat_event_active.v1");
  assert.equal(row.variant_id, "csdid_estat_event_active");
  assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification));
  assert.equal(row.auto_select_allowed, true);
  assert.equal(onlyCommandLines(row.code, /^\s*csdid\b/im).length, 1, row.code);
  assert.equal(onlyCommandLines(row.code, /^\s*estat\s+event\b/im).length, 1, row.code);
  assert.doesNotMatch(row.code, /^\s*(?!csdid\b|estat\s+event\b)\S+/im,
    `csdid handoff may contain only csdid and estat event (including an estore() option): ${row.code}`);
  assertAtomicHandoff(row.code, /^\s*csdid\b/im);
});

test("canonical reghdfe atom exposes one-use controls instead of an author global", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    variant_id: "reghdfe_visible_fe_cluster",
    limit: 5,
  });
  assert.equal(result.results.length, 1);
  const row = result.results[0];
  assert.equal(row.label_id, "estimation.reghdfe_fe_clustered.v1");
  assert.equal(row.source_kind, "derived_canonical_implementation");
  assert.match(row.source, /research_practice_reghdfe_fe_clustered_visible\.do:1-1$/);
  assert.match(row.code, /\bbaseline_control_1\s+baseline_control_2\b/);
  assert.doesNotMatch(row.code, /\$(?:controls|covariates)|\$\{(?:controls|covariates)\}/i);
  assertAtomicHandoff(row.code, /^\s*reghdfe\b/im);
});

test("every auto-selectable panel FE OLS or IV estimator is a pure one-command atom", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", { checkpoint: "estimation.conventional", limit: 50 });
  const panelEstimatorPattern = /(?:panel.*(?:ols|iv)|(?:ols|iv).*panel|xtreg|xtivreg|ivregress)/i;
  const panelRows = result.results.filter((row) => row.auto_select_allowed && panelEstimatorPattern.test([
    row.method_family || "",
    row.label_id || "",
    row.variant_id || "",
    row.code || "",
  ].join(" ")));

  assert.ok(panelRows.some((row) => row.label_id === "estimation.panel_fe_ols_clustered.v1"), JSON.stringify(panelRows));
  assert.ok(panelRows.some((row) => row.label_id === "estimation.panel_fe_iv_clustered.v1"), JSON.stringify(panelRows));
  assert.equal(
    panelRows.find((row) => row.label_id === "estimation.panel_fe_ols_clustered.v1").source,
    "corpus/packages/120068/Analyse data.do:28-28",
  );
  assert.equal(
    panelRows.find((row) => row.label_id === "estimation.panel_fe_iv_clustered.v1").source,
    "corpus/packages/120068/Analyse data.do:378-378",
  );
  for (const row of panelRows) {
    assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification), row.label_id);
    assertAtomicHandoff(row.code, /^\s*(?:(?:xi\s*:\s*)?xtreg|(?:xi\s*:\s*)?xtivreg2|ivregress)\b/im);
  }
});
