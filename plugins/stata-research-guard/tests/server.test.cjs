"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function groupedExcelFlowProfile() {
  const outcome = (name, family) => ({ name, meaning: `${family} outcome`, family, unit: "index points", transform: "level", sample: "analysis sample", estimand: "same treatment effect", estimate_handoff: `output/estimates/${name}.ster`, specification_order: [1, 2, 3] });
  return {
    outcomes: [outcome("y1", "family_a"), outcome("y2", "family_a"), outcome("y3", "family_b"), outcome("y4", "family_b")],
    sheet_groups: [
      { sheet_group_id: "a", outcomes: ["y1", "y2"], grouping_reason: "readers compare both family-a outcomes together", decision_source: "model_from_metadata", grouping_evidence: ["variable labels identify the same topic"] },
      { sheet_group_id: "b", outcomes: ["y3", "y4"], grouping_reason: "readers compare both family-b outcomes together", decision_source: "existing_project", grouping_evidence: ["the existing workbook uses a family-b section"] },
    ],
    sheet_plan: [
      { workbook: "table.xlsx", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "separate reader-facing topic" },
      { workbook: "table.xlsx", sheet: "family_b", sample: "all", sheet_group_id: "b", estimate_names: ["y3_s1", "y3_s2", "y3_s3", "y4_s1", "y4_s2", "y4_s3"], reason: "separate reader-facing topic" },
    ],
    direct_block_impossible: true,
    direct_block_impossible_reason: "outreg2 has no named-sheet append placement for the required multi-sheet workbook",
  };
}

function repeatedWorkbookExcelFlowProfile() {
  const profile = groupedExcelFlowProfile();
  profile.sheet_plan = [
    { workbook: "table_all.xlsx", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "family-a topic in the all-sample workbook" },
    { workbook: "table_all.xlsx", sheet: "family_b", sample: "all", sheet_group_id: "b", estimate_names: ["y3_s1", "y3_s2", "y3_s3", "y4_s1", "y4_s2", "y4_s3"], reason: "family-b topic in the all-sample workbook" },
    { workbook: "table_subsample.xlsx", sheet: "family_a", sample: "subsample", sheet_group_id: "a", estimate_names: ["y1_sub_s1", "y1_sub_s2", "y1_sub_s3", "y2_sub_s1", "y2_sub_s2", "y2_sub_s3"], reason: "the same family-a topic in the subsample workbook" },
    { workbook: "table_subsample.xlsx", sheet: "family_b", sample: "subsample", sheet_group_id: "b", estimate_names: ["y3_sub_s1", "y3_sub_s2", "y3_sub_s3", "y4_sub_s1", "y4_sub_s2", "y4_sub_s3"], reason: "the same family-b topic in the subsample workbook" },
  ];
  return profile;
}

function oneGroupRepeatedWorkbookFlowProfile() {
  const profile = groupedExcelFlowProfile();
  profile.outcomes = profile.outcomes.slice(0, 2);
  profile.sheet_groups = profile.sheet_groups.slice(0, 1);
  profile.sheet_plan = [
    { workbook: "table_all.xls", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "family-a topic in the all-sample workbook" },
    { workbook: "table_subsample.xls", sheet: "family_a", sample: "subsample", sheet_group_id: "a", estimate_names: ["y1_sub_s1", "y1_sub_s2", "y1_sub_s3", "y2_sub_s1", "y2_sub_s2", "y2_sub_s3"], reason: "the same family-a topic in the subsample workbook" },
  ];
  return profile;
}

function singleExcelFlowProfile() {
  return {
    outcomes: [{ name: "y", meaning: "primary outcome", unit: "percentage points", transform: "level", sample: "analysis sample", estimand: "treatment effect", estimate_handoff: "y.ster", specification_order: [1, 2, 3] }],
    sheet_groups: [{ sheet_group_id: "primary", outcomes: ["y"], grouping_reason: "the workbook has one primary outcome", decision_source: "user", grouping_evidence: ["the user requested one primary-outcome sheet"] }],
    sheet_plan: [{ workbook: "table.xls", sheet: "primary", sample: "all", sheet_group_id: "primary", estimate_names: ["y_s1", "y_s2", "y_s3"], reason: "single requested outcome" }],
  };
}

function eventAxisProfile() {
  return {
    expected_plots: [
      { outcome: "voluntary_unemployment", specification: "baseline", sample_comparison: "full sample" },
      { outcome: "involuntary_unemployment", specification: "baseline", sample_comparison: "full sample" },
      { outcome: "firm_value", specification: "baseline", sample_comparison: "full sample" },
    ],
    axis_groups: [
      {
        axis_group_id: "unemployment_pair",
        axis_mode: "fixed_group",
        outcomes: ["voluntary_unemployment", "involuntary_unemployment"],
        specification: "baseline",
        sample_comparison: "full sample",
        coefficient_family: "event-time treatment effects",
        unit: "percentage points",
        transform: "level",
        grouping_reason: "the two unemployment margins are a direct decomposition",
        decision_source: "model_from_metadata",
        grouping_evidence: ["variable definitions distinguish voluntary and involuntary unemployment within the same total"],
        range_basis: "a common readable range covering both coefficient series and confidence intervals",
        range: { min: -0.1, max: 0.1, step: 0.05 },
      },
      {
        axis_group_id: "firm_value_auto",
        axis_mode: "automatic",
        outcomes: ["firm_value"],
        specification: "baseline",
        sample_comparison: "full sample",
        decision_source: "existing_project",
        grouping_evidence: ["firm value is not directly comparable with unemployment rates"],
      },
    ],
  };
}

function mixedEventAxisProfile() {
  const profile = eventAxisProfile();
  profile.expected_plots.push({ outcome: "other_outcome", specification: "baseline", sample_comparison: "full sample" });
  profile.axis_groups.push({
    axis_group_id: "other_auto",
    axis_mode: "automatic",
    outcomes: ["other_outcome"],
    specification: "baseline",
    sample_comparison: "full sample",
    decision_source: "caller_declared",
    grouping_evidence: ["other_outcome is the automatic-axis complement"],
  });
  profile.rendering_mode = "single_flat_mixed_axis_loop";
  profile.mixed_loop_binding = {
    target_path: "code/module.do",
    target_spans: [[1, 40]],
    outcome_loop_local: "all_outcomes",
    fixed_outcomes_local: "fixed_outcomes",
    axis_options_local: "axis_options",
  };
  return profile;
}
const SERVER = path.join(ROOT, "mcp", "server.cjs");

class McpClient {
  constructor(options = {}) {
    this.nextId = 1;
    this.pending = new Map();
    this.child = options.launcher
      ? spawn("cmd.exe", ["/d", "/s", "/c", "call", path.join(ROOT, "scripts", "run_mcp.cmd")], { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] })
      : spawn(process.execPath, [...(options.execArgs || []), SERVER], { stdio: ["pipe", "pipe", "pipe"] });
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

test("MCP handshake and tool inventory", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const initialized = await client.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal(initialized.serverInfo.name, "stata-research-guard");
  assert.match(initialized.instructions, /Never claim journal certification/);
  assert.match(initialized.instructions, /2024o\.year#1o\.treat2019/);
  assert.match(initialized.instructions, /every contracted outcome, sample, and specification/);
  assert.match(initialized.instructions, /reader-facing do-file comments only for project-local state transitions/);
  assert.match(initialized.instructions, /Do not create a manifest folder or template-reuse manifest/);
  assert.match(initialized.instructions, /Apply the general rules to every substantive transition/i);
  assert.match(initialized.instructions, /permitted bindings leave the complete atomic transition intact/i);
  assert.doesNotMatch(initialized.instructions, /why the remaining direct statements are shorter and clearer/i);
  assert.match(initialized.instructions, /direct primitives do not need a checkpoint/i);
  assert.match(initialized.instructions, /typed named-sample-flow postfile block/i);
  assert.doesNotMatch(initialized.instructions, /femaleboard|\bAEA\b|\bAER\b/i);
  const listed = await client.request("tools/list");
  assert.deepEqual(listed.tools.map((tool) => tool.name), ["resolve_transition_evidence", "inspect_top100_command_examples", "search_stata_manual", "get_verified_stata_examples", "search_approved_patterns", "search_labeled_checkpoints", "inspect_dictionary_coverage", "plan_dictionary_repairs", "template_reuse_check", "workflow_blueprint", "lint_do_file", "audit_stata_project", "workflow_reproduction_check", "research_output_check"]);
  assert.ok(listed.tools.every((tool) => tool.outputSchema?.type === "object"));
  const transitionResolver = listed.tools.find((tool) => tool.name === "resolve_transition_evidence");
  assert.match(transitionResolver.description, /two non-competing evidence layers/i);
  assert.match(transitionResolver.description, /guide code is never auto-selectable/i);
  const reuseTool = listed.tools.find((tool) => tool.name === "template_reuse_check");
  assert.equal(reuseTool.inputSchema.properties.min_command_retention.minimum, 0.75);
  assert.equal(reuseTool.inputSchema.properties.enforce_template_reuse.default, false);
  const labeledTool = listed.tools.find((tool) => tool.name === "search_labeled_checkpoints");
  assert.match(labeledTool.inputSchema.properties.output_flow_profile.description, /user.*existing_project.*model_from_metadata.*caller_declared/);
  const secondaryReferenceTool = listed.tools.find((tool) => tool.name === "search_approved_patterns");
  assert.match(secondaryReferenceTool.description, /one atomic transition/i);
  const negotiated = await client.request("initialize", { protocolVersion: "2099-01-01" });
  assert.equal(negotiated.protocolVersion, "2025-06-18");
});

test("Top 100 command overview returns every complexity-weighted guide block and keeps paper context bounded", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const compact = await client.request("tools/call", {
    name: "inspect_top100_command_examples",
    arguments: { commands: ["regress"] },
  });
  const compactPayload = compact.structuredContent;
  assert.equal(compactPayload.matched_group_count, 1);
  assert.equal(compactPayload.rows[0].group_id, "regress");
  assert.equal(compactPayload.rows[0].complexity.example_count, compactPayload.rows[0].guide_blocks.filter((row) => row.counts_toward_complexity).length);
  assert.equal(Object.hasOwn(compactPayload.rows[0], "paper_code_context"), false);

  const withPaper = await client.request("tools/call", {
    name: "inspect_top100_command_examples",
    arguments: { group_ids: ["regress"], include_paper_context: true },
  });
  assert.ok(withPaper.structuredContent.rows[0].paper_code_context);
  assert.match(withPaper.structuredContent.claim_boundary.paper_code_context, /exact contract template support/i);
});

test("Windows plugin launcher starts the MCP server", async (t) => {
  const client = new McpClient({ launcher: true });
  t.after(() => client.close());
  const initialized = await client.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "launcher-test", version: "1" } });
  assert.equal(initialized.serverInfo.name, "stata-research-guard");
});

test("MCP startup and labeled retrieval do not eagerly load deferred evidence families", { timeout: 5000 }, async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-lazy-reference-"));
  const preload = path.join(temp, "block-reference-index.cjs");
  fs.writeFileSync(preload, [
    '"use strict";',
    'const fs = require("node:fs");',
    'const originalReadFileSync = fs.readFileSync;',
    'const blocked = new Set(["reference_index.jsonl", "top100_command_evidence_matrix.json", "manual_index.jsonl", "official_example_verification.json", "official_web_sources.json", "workflow_examples.json"]);',
    'fs.readFileSync = function guardedReadFileSync(target, ...args) {',
    '  const name = require("node:path").basename(String(target));',
    '  if (blocked.has(name)) throw new Error(`EAGER_DEFERRED_DATA_READ:${name}`);',
    '  return originalReadFileSync.call(this, target, ...args);',
    '};',
  ].join("\n"), "utf8");
  const client = new McpClient({ execArgs: ["--require", preload] });
  t.after(() => {
    client.close();
    fs.rmSync(temp, { recursive: true, force: true });
  });

  const initialized = await client.request("initialize", { protocolVersion: "2025-06-18" });
  assert.equal(initialized.serverInfo.name, "stata-research-guard");
  const labeled = await client.tool("search_labeled_checkpoints", { variant_id: "xtreg_country_year_fe_clustered", limit: 1 });
  assert.equal(labeled.results[0].variant_id, "xtreg_country_year_fe_clustered");
});

test("deferred evidence families load once and preserve cold and warm results", { timeout: 10000 }, async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-lazy-counts-"));
  const preload = path.join(temp, "count-deferred-reads.cjs");
  const readLog = path.join(temp, "reads.log");
  fs.writeFileSync(preload, [
    '"use strict";',
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    `const readLog = ${JSON.stringify(readLog)};`,
    'const watched = new Set(["top100_command_evidence_matrix.json", "manual_index.jsonl", "official_example_verification.json", "official_web_sources.json", "workflow_examples.json"]);',
    'const originalReadFileSync = fs.readFileSync;',
    'fs.readFileSync = function countedReadFileSync(target, ...args) {',
    '  const name = path.basename(String(target));',
    '  if (watched.has(name)) fs.appendFileSync(readLog, `${name}\\n`, "utf8");',
    '  return originalReadFileSync.call(this, target, ...args);',
    '};',
  ].join("\n"), "utf8");
  const client = new McpClient({ execArgs: ["--require", preload] });
  t.after(() => {
    client.close();
    fs.rmSync(temp, { recursive: true, force: true });
  });

  await client.request("initialize", { protocolVersion: "2025-06-18" });
  await client.request("tools/list");
  await client.tool("search_labeled_checkpoints", { variant_id: "xtreg_country_year_fe_clustered", limit: 1 });
  assert.equal(fs.existsSync(readLog), false);

  const calls = [
    ["inspect_top100_command_examples", { commands: ["regress"] }],
    ["search_stata_manual", { commands: ["putexcel"], authority: "official", limit: 3 }],
    ["get_verified_stata_examples", { command: "regress" }],
    ["workflow_blueprint", { analysis_type: "applied_micro", data_shape: "panel", project_size: "large", project_mode: "new", new_project_confirmed: true, no_new_persistent_variables: true }],
  ];
  for (const [name, args] of calls) {
    const cold = await client.tool(name, args);
    const warm = await client.tool(name, args);
    assert.deepEqual(warm, cold, name);
  }

  const counts = fs.readFileSync(readLog, "utf8").trim().split(/\r?\n/).reduce((result, name) => {
    result[name] = (result[name] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, {
    "top100_command_evidence_matrix.json": 1,
    "manual_index.jsonl": 1,
    "official_web_sources.json": 1,
    "official_example_verification.json": 1,
    "workflow_examples.json": 1,
  });
});

test("deferred evidence failures stay isolated and Top 100 absence remains advisory", { timeout: 10000 }, async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-lazy-errors-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));

  const workflowFailurePreload = path.join(temp, "fail-workflow.cjs");
  fs.writeFileSync(workflowFailurePreload, [
    '"use strict";',
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    'const originalReadFileSync = fs.readFileSync;',
    'fs.readFileSync = function guardedReadFileSync(target, ...args) {',
    '  if (path.basename(String(target)) === "workflow_examples.json") throw new Error("WORKFLOW_EXAMPLES_UNAVAILABLE");',
    '  return originalReadFileSync.call(this, target, ...args);',
    '};',
  ].join("\n"), "utf8");
  const workflowClient = new McpClient({ execArgs: ["--require", workflowFailurePreload] });
  t.after(() => workflowClient.close());
  const before = await workflowClient.tool("search_labeled_checkpoints", { variant_id: "xtreg_country_year_fe_clustered", limit: 1 });
  assert.equal(before.results.length, 1);
  const workflowFailure = await workflowClient.request("tools/call", { name: "workflow_blueprint", arguments: { project_mode: "existing" } });
  assert.equal(workflowFailure.isError, true);
  assert.match(workflowFailure.structuredContent.error, /WORKFLOW_EXAMPLES_UNAVAILABLE/);
  const after = await workflowClient.tool("search_labeled_checkpoints", { variant_id: "xtreg_country_year_fe_clustered", limit: 1 });
  assert.deepEqual(after, before);

  const top100MissingPreload = path.join(temp, "missing-top100.cjs");
  fs.writeFileSync(top100MissingPreload, [
    '"use strict";',
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    'const originalExistsSync = fs.existsSync;',
    'fs.existsSync = function guardedExistsSync(target) {',
    '  if (path.basename(String(target)) === "top100_command_evidence_matrix.json") return false;',
    '  return originalExistsSync.call(this, target);',
    '};',
  ].join("\n"), "utf8");
  const missingClient = new McpClient({ execArgs: ["--require", top100MissingPreload] });
  t.after(() => missingClient.close());
  const missing = await missingClient.tool("inspect_top100_command_examples", { commands: ["regress"] });
  assert.equal(missing.matched_group_count, 0);
  assert.deepEqual(missing.rows, []);

  const top100CorruptPreload = path.join(temp, "corrupt-top100.cjs");
  fs.writeFileSync(top100CorruptPreload, [
    '"use strict";',
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    'const originalReadFileSync = fs.readFileSync;',
    'fs.readFileSync = function guardedReadFileSync(target, ...args) {',
    '  if (path.basename(String(target)) === "top100_command_evidence_matrix.json") return "{";',
    '  return originalReadFileSync.call(this, target, ...args);',
    '};',
  ].join("\n"), "utf8");
  const corruptClient = new McpClient({ execArgs: ["--require", top100CorruptPreload] });
  t.after(() => corruptClient.close());
  const corrupt = await corruptClient.request("tools/call", { name: "inspect_top100_command_examples", arguments: { commands: ["regress"] } });
  assert.equal(corrupt.isError, true);
  assert.match(corrupt.structuredContent.error, /JSON|Unexpected|position/i);
});

test("MCP text content is compact JSON equivalent to structuredContent", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.request("tools/call", {
    name: "search_labeled_checkpoints",
    arguments: { variant_id: "xtreg_country_year_fe_clustered", limit: 1 },
  });
  assert.equal(result.content[0].text, JSON.stringify(result.structuredContent));
});

test("default retrieval returns only approved, clean spans with provenance", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_approved_patterns", { stage: "descriptives_balance_sample_flow", task: "summary statistics and sample flow", limit: 10 });
  assert.ok(result.results.length > 0);
  for (const row of result.results) {
    assert.equal(row.approved_for_generation, true);
    assert.deepEqual(row.hard_flags, []);
    assert.deepEqual(row.cautions, []);
    assert.ok(row.package_id);
    assert.ok(row.repository_doi);
    assert.match(row.source, /:\d+-\d+$/);
  }
});

test("every auto-selectable labeled source span passes new-authoring lint", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const labels = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => ["preferred_candidate", "conditional_candidate"].includes(row.quality_rubric_review?.classification));
  assert.equal(labels.length, 70);
  for (const row of labels) {
    const result = await client.tool("lint_do_file", { content: row.code, authoring_state: "new" });
    assert.notEqual(result.status, "blocked", `${row.label_id}: ${JSON.stringify(result.findings)}`);
  }
});

test("approved fallback canonicalizes detailed anchors and exposes mixed atomic queries", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_approved_patterns", {
    stage: "merge_reshape",
    task: "import one nationwide CPI row from Excel year columns and reshape to long annual CPI, then assert the base year",
    commands: ["import excel", "reshape long", "assert"],
    data_shape: "one-row wide Excel with year columns",
    limit: 10,
  });
  assert.deepEqual(result.query.canonical_command_anchors, ["import", "reshape", "assert"]);
  assert.equal(result.atomic_query_split_required, true);
  assert.match(result.atomic_query_rule, /one atomic transition|split/i);
  assert.ok(result.results.length > 0);
  assert.deepEqual(result.results[0].matched_command_anchors, ["import", "reshape"]);
  assert.match(result.results[0].source, /figA8_parental_leave\.do:1-28$/, "the compact task-matched Excel-to-long span should rank first");
  const exactSpan = result.results.find((row) => /figA8_parental_leave\.do:1-28$/.test(row.source));
  assert.ok(exactSpan, "the compact Excel-to-long research-practice span should be retrievable");
  assert.deepEqual(exactSpan.matched_command_anchors, ["import", "reshape"]);
  assert.deepEqual(exactSpan.unmatched_command_anchors, ["assert"]);
  assert.equal(exactSpan.command_coverage_complete, false);

  const atomicImport = await client.tool("search_approved_patterns", {
    stage: "import",
    task: "import excel file and inspect fields",
    commands: ["import excel"],
    limit: 10,
  });
  assert.ok(atomicImport.results[0].matched_command_anchors.includes("import"));
  assert.equal(atomicImport.results[0].unexpected_command_anchors.includes("import_excel"), false, "canonical aliases must not count as extra commands");
  assert.doesNotMatch(atomicImport.results[0].source, /figA8_parental_leave\.do/);

  const broadStageImport = await client.tool("search_approved_patterns", {
    stage: "merge_reshape",
    task: "import excel file and inspect fields",
    commands: ["import excel"],
    limit: 10,
  });
  assert.ok(broadStageImport.results[0].unexpected_command_anchors.length >= 1);
  assert.equal(broadStageImport.results[0].unexpected_command_anchors.includes("import_excel"), false);
  assert.ok(broadStageImport.results[0].matched_command_anchors.includes("import"));

  const load = await client.tool("search_labeled_checkpoints", { variant_id: "excel_sheet_firstrow_clear" });
  const reshape = await client.tool("search_labeled_checkpoints", { variant_id: "wide_year_stub_to_long" });
  assert.equal(load.results[0].label_id, "input.excel_firstrow_clear.v1");
  assert.equal(reshape.results[0].label_id, "reshape.excel_year_stub_long.v1");
});

test("labeled retrieval treats workflow code as atomic state-transition blocks", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", { unit_kind: "preparation", task: "merge sample treatment timing", limit: 20 });
  assert.ok(result.results.length > 0);
  assert.match(result.usage_rule, /atomic state-transition block/i);
  assert.ok(result.results.every((row) => Array.isArray(row.input_contract) && row.input_contract.length > 0));
  assert.ok(result.results.every((row) => row.output_contract && Object.keys(row.output_contract).length > 0));
  assert.ok(result.results.every((row) => Array.isArray(row.composition.can_follow)));
  assert.ok(result.results.every((row) => row.decision !== "drop"));
  assert.ok(result.results.every((row) => row.max_loop_depth < 2));
  assert.ok(result.results.every((row) => Array.isArray(row.command_anchors) && row.command_anchors.length > 0));
});

test("an exact checkpoint is not hidden by a broader project-stage hint", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const stored = await client.tool("search_labeled_checkpoints", {
    checkpoint: "postest.persist_estimate",
    stage: "exports",
    commands: ["estimates store"],
    task: "bind the active estimate to a readable in-memory name",
    limit: 10,
  });
  assert.equal(stored.stage_gate.mode, "ranking_only_with_exact_checkpoint");
  assert.ok(stored.results.some((row) => row.label_id === "postest.store_named_estimate.v1"));

  const loaded = await client.tool("search_labeled_checkpoints", {
    checkpoint: "postest.persist_estimate",
    stage: "exports",
    commands: ["estimates use"],
    task: "load a saved ster result",
    limit: 10,
  });
  assert.equal(loaded.stage_gate.mode, "ranking_only_with_exact_checkpoint");
  assert.ok(loaded.results.some((row) => row.label_id === "postest.load_saved_ster.v1"));
});

test("estimate persistence exposes separate seed append numbered-load store and restore transitions", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "postest.persist_estimate",
    limit: 20,
  });
  const ids = new Set(result.results.map((row) => row.label_id));
  for (const labelId of [
    "postest.save_active_result_ster.v1",
    "postest.append_active_result_to_ster_collection.v1",
    "postest.load_numbered_ster.v1",
    "postest.store_named_estimate.v1",
    "postest.restore_named_estimate.v1",
  ]) assert.ok(ids.has(labelId), labelId);

  const seed = result.results.find((row) => row.label_id === "postest.save_active_result_ster.v1");
  assert.deepEqual(seed.minimal_edit_fields, ["estimate path", "replace policy"]);
  assert.doesNotMatch(seed.reusable_core, /append/i);
  const byId = new Map(result.results.map((row) => [row.label_id, row]));
  assert.equal(byId.get("postest.save_active_result_ster.v1").variant_group, "postest.ster_seed");
  assert.equal(byId.get("postest.append_active_result_to_ster_collection.v1").variant_group, "postest.ster_append");
  assert.equal(byId.get("postest.load_numbered_ster.v1").variant_group, "postest.load_estimate");
  assert.equal(byId.get("postest.store_named_estimate.v1").variant_group, "postest.store_estimate");
  assert.equal(byId.get("postest.restore_named_estimate.v1").variant_group, "postest.restore_estimate");
  assert.notEqual(byId.get("postest.save_active_result_ster.v1").variant_group, byId.get("postest.append_active_result_to_ster_collection.v1").variant_group);
  assert.match(result.variant_group_rule, /at most one alternative within a variant_group/i);
  assert.match(result.variant_group_rule, /sequential transitions/i);

  const variants = [
    ["persist_active_estimate_as_ster", "postest.save_active_result_ster.v1"],
    ["append_active_estimate_to_ordered_ster", "postest.append_active_result_to_ster_collection.v1"],
    ["load_declared_numbered_ster_state", "postest.load_numbered_ster.v1"],
    ["restore_declared_in_memory_estimate", "postest.restore_named_estimate.v1"],
  ];
  for (const [variantId, labelId] of variants) {
    const exact = await client.tool("search_labeled_checkpoints", { variant_id: variantId, limit: 5 });
    assert.equal(exact.results[0].label_id, labelId);
  }
});

test("new sample-flow reshape time-grid and graph-combine transitions remain independently retrievable", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const cases = [
    ["typed_checkpoint_count_postfile", "descriptives.named_sample_flow_dataset.v1"],
    ["validated_long_key_to_wide_stub", "reshape.long_stubs_to_wide.v1"],
    ["aligned_multi_stub_wide_to_long", "reshape.multi_stub_wide_to_long.v1"],
    ["entity_observed_range_internal_gaps", "panel.materialize_declared_time_grid_tsfill.v1"],
    ["declared_named_components_to_composite", "figure.named_graph_combine.v1"],
  ];
  for (const [variantId, labelId] of cases) {
    const exact = await client.tool("search_labeled_checkpoints", { variant_id: variantId, limit: 5 });
    assert.equal(exact.results.length, 1, variantId);
    assert.equal(exact.results[0].label_id, labelId);
    assert.ok(exact.results[0].template_input_profile);
  }

  const sampleFlow = await client.tool("search_labeled_checkpoints", {
    checkpoint: "descriptives.sample_flow",
    commands: ["postfile", "post", "postclose"],
    task: "write an ordered checkpoint and observation-count dataset",
    limit: 5,
  });
  assert.equal(sampleFlow.results[0].label_id, "descriptives.named_sample_flow_dataset.v1");
  assert.match(sampleFlow.results[0].template_input_profile.variable_characteristics.join(" "), /no coefficient/i);

  const reshape = await client.tool("search_labeled_checkpoints", {
    checkpoint: "merge_reshape.integration",
    commands: ["reshape"],
    limit: 20,
  });
  const reshapeById = new Map(reshape.results.map((row) => [row.label_id, row]));
  assert.equal(reshapeById.get("reshape.excel_year_stub_long.v1").variant_group, "reshape.wide_to_long");
  assert.equal(reshapeById.get("reshape.multi_stub_wide_to_long.v1").variant_group, "reshape.wide_to_long");
  assert.equal(reshapeById.get("reshape.long_stubs_to_wide.v1").variant_group, "reshape.long_to_wide");
});

test("collapse aggregation alternatives can compose with the separate label-roundtrip transition", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "descriptives.entity_collapse",
    limit: 20,
  });
  const byId = new Map(result.results.map((row) => [row.label_id, row]));
  assert.equal(byId.get("descriptives.collapse_entity_means_max.v1").variant_group, "descriptives.entity_aggregation");
  assert.equal(byId.get("descriptives.weighted_city_entity_means.v1").variant_group, "descriptives.entity_aggregation");
  assert.equal(byId.get("descriptives.collapse_preserve_retained_labels.v1").variant_group, "descriptives.label_roundtrip");
  assert.match(byId.get("descriptives.collapse_preserve_retained_labels.v1").required_changes.join(" "), /explicit retained/i);
});

test("event RHS is a sequential adjunct and direct master shell remains guidance-only", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const event = await client.tool("search_labeled_checkpoints", {
    variant_id: "event_levels_base_excluded_single_hash",
    limit: 5,
  });
  const rhs = event.results[0];
  assert.equal(rhs.label_id, "estimation.event_rhs_single_hash_base_excluded.v1");
  assert.equal(rhs.variant_group, "estimation.event_rhs");
  assert.equal(rhs.transition_role, "sequential_adjunct");

  const master = await client.tool("search_labeled_checkpoints", {
    variant_id: "ordered_direct_do_calls",
    limit: 5,
  });
  const direct = master.results[0];
  assert.equal(direct.label_id, "master.sequence.direct_calls.v1");
  assert.equal(direct.transition_role, "guidance_only");
  assert.equal(direct.auto_select_allowed, false);
});

test("labeled retrieval uses exact command anchors instead of code substrings", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const merge = await client.tool("search_labeled_checkpoints", { checkpoint: "integrity.audit", commands: ["merge"], limit: 20 });
  assert.ok(merge.results.length >= 3);
  assert.ok(merge.results.every((row) => row.command_anchors.includes("merge")));
  const falsePositive = await client.tool("search_labeled_checkpoints", { checkpoint: "integrity.audit", commands: ["sample"], limit: 20 });
  assert.equal(falsePositive.results.length, 0);
});

test("atomic PDF export is retrieved independently from descriptive figure construction", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.export_pdf",
    commands: ["graph export"],
    task: "active graph export to PDF",
    limit: 5,
  });
  assert.equal(result.results.length, 1);
  const label = result.results[0];
  assert.equal(label.label_id, "export.figure_pdf.v1");
  assert.deepEqual(label.minimal_edit_fields, ["output PDF path"]);
  assert.ok(label.selection_conditions.includes("an active graph exists in memory"));
  assert.equal(label.quality_rubric_review.classification, "preferred_candidate");
  assert.equal(label.source_package_review.repository_doi, "10.3886/E175582V1");
});

test("staggered-DID retrieval exposes atomic method alternatives separately from legacy reference evidence", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", { checkpoint: "estimation.staggered_did", limit: 20 });
  assert.equal(result.results.length, 10);

  const atomic = result.results.filter((row) => row.variant_group === "estimation.staggered_did_method");
  const legacy = result.results.filter((row) => row.variant_group === "estimation.staggered_did_legacy");
  assert.equal(atomic.length, 8, JSON.stringify(result.results.map((row) => ({ label_id: row.label_id, variant_group: row.variant_group }))));
  assert.equal(legacy.length, 2, JSON.stringify(result.results.map((row) => ({ label_id: row.label_id, variant_group: row.variant_group }))));
  const demotedTwfeControls = atomic.find((row) => row.label_id === "estimation.twfe_did_both_control_sets.v1");
  assert.equal(demotedTwfeControls.rubric_classification, "reference_only");
  assert.equal(demotedTwfeControls.auto_select_allowed, false);
  assert.ok(atomic.filter((row) => row !== demotedTwfeControls).every((row) => row.auto_select_allowed), JSON.stringify(atomic));
  assert.ok(atomic.filter((row) => row !== demotedTwfeControls).every((row) => ["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification)), JSON.stringify(atomic));
  assert.equal(new Set(atomic.map((row) => row.label_id)).size, 8);
  assert.equal(new Set(atomic.map((row) => row.variant_id)).size, 8);
  assert.ok(legacy.every((row) => row.rubric_classification === "reference_only" && !row.auto_select_allowed), JSON.stringify(legacy));
  assert.deepEqual(new Set(legacy.map((row) => row.label_id)), new Set([
    "estimation.staggered_jwdid_ppmlhdfe.v1",
    "estimation.twfe_ppmlhdfe.v1",
  ]));
  assert.equal(result.variant_groups["estimation.staggered_did_method"].length, 8);
  assert.equal(result.variant_groups["estimation.staggered_did_legacy"].length, 2);
});

test("explicit method conditions hard-gate generic variants before ranking", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "descriptives.entity_collapse",
    task: "weighted city entity means",
    method: "weighted entity aggregation with a first constant field",
    current_state: "the requested aggregation method is weighted collapse rather than an unweighted mean",
    limit: 20,
  });
  assert.equal(result.specificity_gate.active, true);
  assert.ok(result.specificity_gate.distinguishing_tokens.includes("weighted"));
  assert.equal(result.results[0].variant_id, "weighted_entity_means_with_first_constant_field");
  assert.equal(result.results[0].label_id, "descriptives.weighted_city_entity_means.v1");
  assert.equal(result.results[0].auto_select_allowed, true);
  assert.ok(result.results.every((row) => row.reuse_scope === "method_specific"));
});

test("repair planner applies explicit method contract before generic scope bonuses", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-method-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse city_panel.dta, clear\n");
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "weighted city entity means summary를 추가해줘",
    requested_checkpoints: ["descriptives.entity_collapse"],
  });
  const intervention = plan.interventions[0];
  assert.equal(intervention.evidence_progress.specificity_gate.active, true);
  assert.equal(intervention.chosen_variant.variant_id, "weighted_entity_means_with_first_constant_field");
  assert.ok(intervention.evidence_progress.method_mismatch_labeled_variants.some((row) => row.variant_id === "collapse_means_and_max_to_student"));
});

test("repair planner exposes template and native recommendations for atomic substeps of one broad headword", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-atomic-substeps-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse panel.dta, clear\n");
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "세 개의 visible reghdfe event-study 사양을 만든다",
    requested_substeps: [
      {
        checkpoint: "estimation.staggered_did",
        substep_id: "twfe_no_controls",
        description: "TWFE without controls",
        match: { label_ids: ["estimation.twfe_did_no_controls.v1"], commands: ["reghdfe"] },
      },
      {
        checkpoint: "estimation.staggered_did",
        substep_id: "twfe_firm_specific_trends",
        description: "TWFE with firm-specific trends",
        match: { commands: ["reghdfe"], tokens: ["firm-specific trends"] },
      },
    ],
  });
  const substeps = plan.interventions.find((row) => row.headword === "estimation.staggered_did").atomic_substeps;
  assert.equal(substeps[0].recommended_mode, "template");
  assert.equal(substeps[0].chosen_label_id, "estimation.twfe_did_no_controls.v1");
  assert.equal(substeps[1].recommended_mode, "general_rule");
  assert.deepEqual(substeps[1].matched_candidate_ids, []);
  assert.equal(plan.template_reuse_contract.schema_version, "2.0");
  assert.deepEqual(plan.template_reuse_contract.required_atomic_boundaries, [
    "merge retained-state handling",
    "panel-key declaration",
    "CPI transformation",
    "dataset finalization",
    "age or entity collapse",
    "e(sample) dependent-variable mean",
    "estimation",
    "ster save",
    "ster load",
    "Excel assembly",
    "figure assembly",
  ]);
});

test("repair planner leaves existing direct calls direct and does not force a stage-log template", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-seven-direct-calls-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  const calls = [];
  for (let index = 1; index <= 7; index += 1) {
    const name = `code/${index}.do`;
    calls.push(`do "${name}"`);
    fs.writeFileSync(path.join(root, name), "version 18.0\n", "utf8");
  }
  fs.writeFileSync(path.join(root, "main.do"), `version 18.0\n${calls.join("\n")}\n`, "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 일곱 direct do-file 호출 순서를 보존해 master를 정리해줘",
    requested_checkpoints: ["workflow_orchestration.master"],
  });
  const intervention = plan.interventions[0];
  assert.equal(intervention.chosen_variant, null);
  assert.ok(intervention.evidence_progress.rubric_reference_only_variants.some((row) => row.label_id === "master.sequence.direct_calls.v1"));
  assert.ok(intervention.evidence_progress.incompatible_labeled_variants.some((row) => row.label_id === "master.sequence.stage_logs.v1"));
  assert.equal(plan.compatibility_contract.immutable_interfaces.existing_call_sites.filter((row) => row.file === "main.do").length, 7);
  assert.equal(intervention.status, "no_compatible_labeled_variant");
});

test("repair planner selects the atomic log-do-log stage only when stage logs are explicit", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-one-stage-log-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.writeFileSync(path.join(root, "code", "prep.do"), "version 18.0\n", "utf8");
  fs.writeFileSync(path.join(root, "main.do"), 'version 18.0\nlog using "prep.log", replace\ndo "code/prep.do"\nlog close\n', "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "단계별 로그를 유지하면서 prep do-file 호출을 정리해줘",
    requested_checkpoints: ["workflow_orchestration.master"],
  });
  assert.equal(plan.interventions[0].chosen_variant.label_id, "master.sequence.stage_logs.v1");
});

test("default retrieval hides project-specific blocks and ranks raw-source-reviewed reusable examples", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const defaultResult = await client.tool("search_labeled_checkpoints", { checkpoint: "input_load.single_source", limit: 20 });
  assert.ok(defaultResult.results.length > 0);
  assert.ok(defaultResult.results.every((row) => row.reuse_scope !== "project_specific"));
  assert.ok(defaultResult.results.every((row) => row.generality_review.status === "external_evidence_rubric_reviewed"));
  assert.ok(defaultResult.results.every((row) => row.quality_rubric_review.status === "external_evidence_rubric_reviewed"));

  const expanded = await client.tool("search_labeled_checkpoints", { checkpoint: "input_load.single_source", include_project_specific: true, limit: 20 });
  assert.ok(expanded.results.length > defaultResult.results.length);
  assert.ok(expanded.results.some((row) => row.reuse_scope === "project_specific"));

  const finalExcel = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", limit: 20 });
  assert.equal(finalExcel.results.length, 1);
  assert.deepEqual(finalExcel.results.map((row) => row.label_id), ["export.regression_excel.from_ster_default_style.v1"]);
  assert.equal(finalExcel.output_flow_selection.selection_ready, false);
  assert.ok(finalExcel.results.every((row) => row.explicit_canonical_exception));
  assert.deepEqual(finalExcel.comparison_variants, []);
});

test("reference-only labels remain visible as evidence but are never auto-selected", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", { variant_id: "declared_panel_lags_and_interactions" });
  assert.equal(result.results[0].rubric_classification, "reference_only");
  assert.equal(result.results[0].auto_select_allowed, false);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-reference-only-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse input.dta, clear\n");
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "특정 rename generate keep 변환을 추가해줘",
    requested_checkpoints: ["clean.derive_variables"],
  });
  assert.ok(plan.interventions[0].evidence_progress.rubric_reference_only_variants.length > 0);
  if (plan.interventions[0].chosen_variant) {
    assert.notEqual(plan.interventions[0].chosen_variant.rubric_classification, "reference_only");
  }

  for (const variant_id of ["individual_analysis_keep_list_and_labels", "household_analysis_keep_list_and_labels"]) {
    const finalizer = await client.tool("search_labeled_checkpoints", { variant_id });
    assert.equal(finalizer.results[0].rubric_classification, "reference_only");
    assert.equal(finalizer.results[0].auto_select_allowed, false);
  }
});

test("final Excel assembly keeps default style contract while leaving upstream storage open", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: groupedExcelFlowProfile(), limit: 20 });
  assert.equal(result.results.length, 1);
  assert.equal(result.output_flow_selection.selection_class, "canonical_raw_outreg2_formatter");
  assert.ok(result.results.some((row) => row.variant_id === "outreg2_from_persisted_ster_then_xlsx"));
  for (const row of result.results) {
    assert.equal(row.output_contract.format, "xlsx");
    assert.match(row.output_contract.assembly, /raw outreg2 wide columns in caller-declared named-estimate order/i);
    assert.deepEqual(row.output_contract.required_additional_statistics, ["adjusted R-squared", "dependent-variable mean"]);
    assert.equal(row.scope, "final_excel_assembly_only");
    assert.ok(row.does_not_specify.includes("estimation design"));
  }
  assert.match(result.final_excel_rule, /two or more sheets/i);
  assert.ok(result.results.some((row) => row.code.includes("estimates restore `estimate'")));
  const persisted = result.results.find((row) => row.variant_id === "outreg2_from_persisted_ster_then_xlsx");
  assert.match(persisted.code, /outreg2\b[^\n]*(?:\/\/\/\n[^\n]*)?\bnor2\b/);
  assert.doesNotMatch(persisted.code, /\baddstat\s*\(|\badjr2\b/);
  assert.match(persisted.code, /strofreal\(e\(r2_a\), "%18\.`adjdec'f"\)/);
  assert.match(persisted.code, /if "`adjusted_r2'" == "\." local adjusted_r2 ""/);
  assert.match(persisted.code, /strofreal\(e\(ymean\), "%18\.`meandec'f"\)/);
  assert.match(persisted.code, /inlist\(v1\[_N - 1\], "Standard errors in parentheses", "Robust standard errors in parentheses"\)/);
  assert.match(persisted.output_contract.statistic_assembly, /each named estimate.*adjdec\(\).*meandec\(\)/i);
  assert.equal(persisted.runtime_verification.status, "passed");
  assert.equal(persisted.runtime_verification.stata_version, "18.0 MP");
  assert.deepEqual(persisted.runtime_verification.variance_estimators, ["event-study columns: vce(cluster cluster_id)", "2SLS second-stage column: vce(cluster cluster_id)", "first-stage column: vce(cluster cluster_id)", "Poisson column: vce(cluster cluster_id)"]);
  assert.equal(persisted.runtime_verification.observed_standard_error_note, "Robust standard errors in parentheses");
});

test("canonical outreg2 runtime evidence locks exact mean precision and current artifact hashes", () => {
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "runtime", "outreg2_excel_runtime_20260824.json"), "utf8"));
  assert.deepEqual(record.display_precision, { adjusted_r_squared: 3, dependent_variable_mean: 6 });
  assert.deepEqual(record.variance_estimators, ["event-study columns: vce(cluster cluster_id)", "2SLS second-stage column: vce(cluster cluster_id)", "first-stage column: vce(cluster cluster_id)", "Poisson column: vce(cluster cluster_id)"]);
  assert.deepEqual(record.row_order, ["Observations", "Adjusted R-squared", "Dep. variable mean", "Robust standard errors in parentheses", "significance note"]);
  assert.deepEqual(record.allowed_standard_error_notes, ["Standard errors in parentheses", "Robust standard errors in parentheses"]);
  assert.equal(record.observed_standard_error_note, "Robust standard errors in parentheses");
  assert.deepEqual(record.required_additional_statistics["Adjusted R-squared"], { "Table A": ["0.003", "0.533", "0.543"], "First stage": ["0.344"], "Poisson": [""] });
  assert.deepEqual(record.required_additional_statistics["Dep. variable mean"], { "Table A": ["280.857635", "280.857635", "280.857635"], "First stage": ["-0.068523"], "2SLS": ["280.857635", "-0.068523"], "Poisson": ["1.129167"] });
  assert.ok(record.markers.includes("OUTREG2_XLSX_POISSON_MISSING_R2_PASSED"));
  assert.deepEqual(record.required_additional_statistics.forbidden_extra_first_stage_rows, ["Excluded-instrument F"]);
  assert.deepEqual(record.transient_estimate_cleanup, { count: 6, confirmed_absent_after_runtime_verification: true });
  assert.equal(fs.readdirSync(path.join(ROOT, "tests", "runtime", "outreg2_excel", "estimates", "all")).filter((name) => name.endsWith(".ster")).length, 0);
  assert.equal(record.fixture_sha256, crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, record.fixture))).digest("hex"));
  assert.equal(record.assembly_snapshot_sha256, crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, record.assembly_snapshot))).digest("hex"));
  assert.equal(record.output_workbook_sha256, crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, record.output_workbook))).digest("hex"));
  assert.equal(record.runtime_log_sha256, crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, record.runtime_log))).digest("hex"));
});

test("template provenance tool verifies the canonical formatter and rejects a hidden second program", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-template-tool-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  const labels = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const label = labels.find((row) => row.label_id === "export.regression_excel.from_ster_default_style.v1");
  fs.writeFileSync(path.join(root, "code", "40_tables.do"), label.code, "utf8");
  fs.writeFileSync(path.join(root, "code", "41_table_calls.do"), [
    'outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3 y2_s1 y2_s2 y2_s3") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("y3_s1 y3_s2 y3_s3 y4_s1 y4_s2 y4_s3") workbook("table.xlsx") sheet("family_b") adjdec(3) meandec(2)',
  ].join("\n"), "utf8");
  const dictionaryBytes = fs.readFileSync(path.join(ROOT, "data", "workflow_block_dictionary.json"));
  const manifest = {
    schema_version: "1.0",
    output_flow_profile: groupedExcelFlowProfile(),
    plugin_dictionary_sha256: crypto.createHash("sha256").update(dictionaryBytes).digest("hex"),
    required_headwords: [{ checkpoint: "final_excel_assembly", mode: "template" }],
    selections: [{
      label_id: label.label_id,
      source_code_sha256: label.code_sha256,
      source: { path: label.source_path, spans: label.source_spans },
      source_kind: label.source_kind,
      target_path: "code/40_tables.do",
      target_spans: [[1, label.code.split(/\r?\n/).length]],
      target_span_sha256: crypto.createHash("sha256").update(Buffer.from(label.code, "utf8")).digest("hex"),
      edited_fields: [],
      selection_conditions_met: label.selection_conditions,
      required_changes_applied: label.required_changes,
    }],
  };
  fs.writeFileSync(path.join(root, "output_manifest.json"), JSON.stringify(manifest, null, 2));

  const client = new McpClient();
  t.after(() => client.close());
  const passed = await client.tool("template_reuse_check", { path: root, manifest_path: "output_manifest.json", required_headwords: ["final_excel_assembly"] });
  assert.equal(passed.status, "pass", JSON.stringify(passed.blockers));
  assert.equal(passed.program_policy.definitions.length, 1);
  assert.equal(passed.selection_checks[0].evidence.command_retention, 1);

  fs.writeFileSync(path.join(root, "code", "hidden.do"), "program define hidden_helper\nend\n");
  const blocked = await client.tool("template_reuse_check", { path: root, manifest_path: "output_manifest.json" });
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "program_definition_limit_exceeded"));
});

test("drop labels remain opt-in comparison evidence after positive integrity examples are added", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const hidden = await client.tool("search_labeled_checkpoints", { checkpoint: "integrity.audit" });
  assert.ok(hidden.results.length >= 4);
  assert.ok(hidden.results.every((row) => row.decision !== "drop"));
  const shown = await client.tool("search_labeled_checkpoints", { checkpoint: "integrity.audit", include_dropped: true, limit: 35 });
  const dropped = shown.results.find((row) => row.decision === "drop");
  assert.ok(dropped);
  assert.equal(dropped.adaptation_mode, "do_not_reuse");
});

test("workflow dictionary groups code snippets under stage headwords", () => {
  const dictionary = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "workflow_block_dictionary.json"), "utf8"));
  assert.ok(dictionary.entries.length >= 35);
  const cleaning = dictionary.entries.find((row) => row.headword === "clean.derive_variables");
  assert.ok(cleaning);
  assert.ok(cleaning.aliases.includes("전처리"));
  assert.equal(cleaning.name_ko, "분석변수 생성·재코딩");
  assert.equal(cleaning.name_en, "Analysis-variable derivation and recoding");
  assert.equal(cleaning.maturity, "comparative");
  assert.equal(cleaning.variants.length, 3);
  assert.ok(cleaning.variants.every((variant) => variant.source_path && variant.source_spans.length > 0 && /^[0-9a-f]{64}$/.test(variant.code_sha256)));
  assert.ok(cleaning.variants.every((variant) => variant.relationships));
  for (const split of ["clean.id_normalize", "treatment.arm_mapping", "outlier.winsorize", "scale.standardize_esample"]) {
    assert.ok(dictionary.entries.some((row) => row.headword === split));
  }
  const finalExcel = dictionary.entries.find((row) => row.headword === "final_excel_assembly");
  assert.equal(finalExcel.variants.length, 5);
  assert.ok(dictionary.retrieval_guide.order.some((row) => /official Stata manual/i.test(row)));
  assert.ok(dictionary.command_index.outreg2.includes("final_excel_assembly"));
  assert.ok(dictionary.alias_index["경로 설정"].includes("project_setup.paths"));
  assert.ok(dictionary.entries.every((row) => Array.isArray(row.common_commands)));
  assert.ok(dictionary.entries.every((row) => Array.isArray(row.retrieval_features) && row.retrieval_features.length > 0));
});

test("package coverage is separate from labels and hides drop-only checkpoint matches by default", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const all = await client.tool("inspect_dictionary_coverage", {});
  assert.equal(all.corpus_summary.packages, 35);
  assert.equal(all.corpus_summary.do_files, 639);
  assert.equal(all.corpus_summary.lines, 183794);
  assert.equal(all.corpus_summary.files_opened_and_hashed, 639);
  assert.deepEqual(all.corpus_summary.review_level_counts, { end_to_end_read: 35 });
  assert.equal(all.corpus_summary.unlabeled_reusable_candidates, 0);

  const hidden = await client.tool("inspect_dictionary_coverage", { checkpoint: "integrity.adjacency_dedup" });
  assert.equal(hidden.results.length, 0);
  const shown = await client.tool("inspect_dictionary_coverage", { checkpoint: "integrity.adjacency_dedup", include_dropped: true });
  assert.equal(shown.results.length, 1);
  assert.equal(shown.results[0].package_id, "173341");
  assert.equal(shown.results[0].match_kind, "drop_only");
  const unsafeGap = await client.tool("inspect_dictionary_coverage", { checkpoint: "postest.estimator_comparison_unsafe", include_dropped: true, only_gaps: true });
  assert.equal(unsafeGap.results.length, 1);
  assert.equal(unsafeGap.results[0].package_id, "194561");
  assert.equal(unsafeGap.results[0].match_kind, "drop_only");
});

test("labeled results and repair plans expose dictionary maturity and source-package review", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const labeled = await client.tool("search_labeled_checkpoints", { variant_id: "xtreg_country_year_fe_clustered", task: "panel FE" });
  assert.equal(labeled.results[0].dictionary_evidence.headword, "estimation.conventional");
  assert.equal(labeled.results[0].source_package_review.package_id, "120068");
  assert.equal(labeled.results[0].source_package_review.review_level, "end_to_end_read");

  const finalExcel = await client.tool("search_labeled_checkpoints", { variant_id: "outreg2_from_persisted_ster_then_xlsx" });
  assert.equal(finalExcel.results[0].source_package_review.review_level, "not_applicable_source_snapshot");
  assert.equal(finalExcel.results[0].source_package_review.source_kind, "derived_canonical_implementation");
  assert.equal(finalExcel.results[0].source_package_review.derivation_provenance.raw_source_bytes_claimed, false);
  assert.equal(finalExcel.results[0].source_package_review.derivation_provenance.based_on_source_spans[0][0], 384);
  assert.match(finalExcel.results[0].source_package_review.provenance_rule, /derived canonical implementation/i);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-fallback-progress-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse input.dta, clear\n");
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "인접 행 기준 중복제거 블록을 추가해줘",
    requested_checkpoints: ["integrity.adjacency_dedup"],
  });
  const progress = plan.interventions[0].evidence_progress;
  assert.equal(progress.labeled_checked, true);
  assert.equal(progress.labeled_result_count, 0);
  assert.equal(progress.dictionary_maturity, "negative_only");
  assert.equal(progress.approved_patterns_checked, true);
  assert.match(progress.boundary, /Manual evidence is mechanics-only/);
});

test("repair planning rejects incompatible variants but permits a bounded direct transition", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-no-estimate-state-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\n");
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "최종 Excel 회귀표를 추가해줘",
    requested_checkpoints: ["final_excel_assembly"],
  });
  const intervention = plan.interventions[0];
  assert.equal(intervention.status, "no_compatible_labeled_variant");
  assert.equal(intervention.chosen_variant, null);
  assert.equal(intervention.evidence_progress.labeled_non_drop_count, 1);
  assert.equal(intervention.evidence_progress.incompatible_labeled_variants.length, 1);
  assert.deepEqual(
    intervention.evidence_progress.incompatible_labeled_variants.map((row) => row.label_id),
    ["export.regression_excel.from_ster_default_style.v1"],
  );
  assert.equal(intervention.evidence_progress.approved_pattern_exhaustive, true);
  assert.equal(intervention.evidence_progress.approved_pattern_result_count, intervention.evidence_progress.approved_pattern_total_eligible);
  assert.equal(intervention.evidence_progress.manual_checked, true);
  assert.equal(intervention.evidence_progress.user_decision_required, false);
  assert.equal(intervention.evidence_progress.direct_implementation_allowed, false);
  assert.match(intervention.evidence_progress.boundary, /two or more sheets/i);
  assert.match(intervention.general_rule_evidence_chain.join(" "), /approved collected examples were returned as evidence/i);
  assert.match(intervention.general_rule_evidence_chain.join(" "), /official Stata manual was searched/i);
});

test("every labeled block exposes commands and observable state signals", () => {
  const rows = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.ok(rows.length >= 73);
  for (const row of rows) {
    assert.ok(row.command_anchors.length > 0, row.label_id);
    assert.ok(row.state_signature.observable_signals.length > 0, row.label_id);
  }
  const pathDefaults = rows.filter((row) => row.checkpoint === "project_setup.paths" && row.canonical_default);
  assert.equal(pathDefaults.length, 1);
  assert.equal(pathDefaults[0].variant_id, "default_style_project_role_globals");
});

test("default style path variant is canonical only for a first build", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const labeled = await client.tool("search_labeled_checkpoints", { checkpoint: "project_setup.paths", limit: 20 });
  const defaults = labeled.results.filter((row) => row.canonical_default);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].variant_id, "default_style_project_role_globals");

  const existing = fs.mkdtempSync(path.join(os.tmpdir(), "stata-existing-paths-"));
  t.after(() => fs.rmSync(existing, { recursive: true, force: true }));
  fs.writeFileSync(path.join(existing, "runall.do"), "global oldroot .\nglobal legacy_data \"$oldroot/input\"\n");
  const plan = await client.tool("plan_dictionary_repairs", {
    path: existing,
    request: "기존 경로 설정 코드를 수정해줘",
    requested_checkpoints: ["project_setup.paths"],
    target_files: ["runall.do"],
  });
  assert.equal(plan.interventions[0].chosen_variant, null);
  assert.ok(plan.interventions[0].evidence_progress.incompatible_labeled_variants.some((row) => row.variant_id === "default_style_project_role_globals"));
  assert.ok(plan.interventions[0].evidence_progress.rubric_reference_only_variants.some((row) => row.variant_id === "manual_root_with_derived_role_paths"));
});

test("contracts, labels, compositions, and label relationships have no dangling targets", () => {
  const contractDoc = JSON.parse(fs.readFileSync(path.join(ROOT, "annotations", "checkpoint_contracts.json"), "utf8"));
  const labels = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const contracts = new Set(contractDoc.contracts.map((row) => row.checkpoint));
  const labelCheckpoints = new Set(labels.map((row) => row.checkpoint));
  assert.deepEqual([...labelCheckpoints].sort(), [...contracts].sort());
  assert.deepEqual(Object.keys(contractDoc.display_names).sort(), [...contracts].sort());
  const serverSource = fs.readFileSync(path.join(ROOT, "mcp", "server.cjs"), "utf8");
  const sequenceBody = serverSource.match(/const HEADWORD_SEQUENCE = \[([\s\S]*?)\];/)?.[1] || "";
  const planningSequence = new Set([...sequenceBody.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...planningSequence].sort(), [...contracts].sort());
  for (const contract of contractDoc.contracts) {
    for (const target of [...contract.can_follow, ...contract.can_precede]) assert.ok(contracts.has(target), `${contract.checkpoint} -> ${target}`);
  }
  const labelIds = new Set(labels.map((row) => row.label_id));
  for (const row of labels) {
    for (const relation of ["alternatives", "duplicates", "supersedes"]) {
      for (const target of row.relationships[relation] || []) assert.ok(labelIds.has(target), `${row.label_id} -> ${target}`);
    }
  }
  const combined = labels.find((row) => row.label_id === "input.combine.sequential_import_append.v1");
  assert.deepEqual(combined.source_spans, [[17, 41], [43, 43]]);
});

test("feature addition freezes completed upstream headwords and selects by ster state", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-dictionary-add-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.mkdirSync(path.join(root, "output", "estimates"), { recursive: true });
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global project_root .",
    'do "code/10_prep.do"',
    'do "code/30_regression.do"',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "10_prep.do"), [
    'use "data/raw/source.dta", clear',
    "generate x = source_x",
    'save "data/final/analysis.dta", replace',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "30_regression.do"), [
    'use "data/final/analysis.dta", clear',
    "regress y x",
    "estadd ysumm, mean",
    'estimates save "output/estimates/main.ster", replace',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "output", "estimates", "main.ster"), "fixture");

  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 전처리와 회귀 뒤에 Excel 회귀표 기능을 추가해줘",
    available_state: {
      estimate_state: "ster",
      output_flow_profile: {
        outcomes: [{ name: "y", variable_label: "Outcome", family: "main outcome", unit: "level", transform: "none", sample: "regression e(sample)", estimand: "coefficient on x", estimate_handoff: "output/estimates/main.ster", specification_order: [1] }],
        sheet_groups: [{ sheet_group_id: "main", outcomes: ["y"], grouping_reason: "only requested outcome", decision_source: "existing_project", grouping_evidence: ["the existing regression has one declared outcome"] }],
        sheet_plan: [{ workbook: "table.xls", sheet: "main", sheet_group_id: "main", estimate_names: ["main_s1"], reason: "only requested outcome" }],
      },
    },
  });
  assert.equal(plan.mode, "partial");
  assert.equal(plan.intent, "add_feature");
  assert.deepEqual(plan.dictionary_headwords, ["final_excel_assembly"]);
  assert.ok(plan.completion_map.frozen_prefix.includes("clean.derive_variables"));
  assert.ok(plan.completion_map.frozen_prefix.includes("estimation.conventional"));
  assert.equal(plan.interventions[0].chosen_variant, null);
  assert.equal(plan.interventions[0].status, "no_compatible_labeled_variant");
  assert.equal(plan.interventions[0].evidence_progress.direct_implementation_allowed, true);
  assert.match(plan.interventions[0].evidence_progress.boundary, /one sheet.*direct outreg2/i);
  assert.deepEqual(plan.compatibility_contract.mutable_existing_files, []);
  assert.match(plan.compatibility_contract.general_rule, /general rules/i);
  assert.match(plan.compatibility_contract.general_rule, /smallest readable binding or transition/i);
  assert.match(plan.compatibility_contract.general_rule, /without presuming compatibility/i);
  assert.match(plan.compatibility_contract.general_rule, /do not invent a generic adapter/i);
});

test("output-only ster consumer excludes preserved upstream headwords in Korean and English", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-output-consumer-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.mkdirSync(path.join(root, "output", "estimates"), { recursive: true });
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global project_root .",
    'do "code/10_prep.do"',
    'do "code/20_regression.do"',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "10_prep.do"), [
    'use "data/raw/source.dta", clear',
    "generate x = source_x",
    'save "data/final/analysis.dta", replace',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "20_regression.do"), [
    'use "data/final/analysis.dta", clear',
    "regress y x",
    'estimates save "output/estimates/model.ster", replace',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "output", "estimates", "model.ster"), "fixture");

  const expected = [
    "final_excel_assembly",
    "postest.persist_estimate",
    "figures.coefplot_named_estimates",
    "figures.export_pdf",
  ];
  const client = new McpClient();
  t.after(() => client.close());
  const koreanRequest = "기존 master, preparation, regression은 수정하지 마세요. 기존 numbered .ster만 소비하는 code/30_outputs.do를 추가하고 regression Excel과 coefficient PDF/GPH를 만드세요. master는 수정하지 않습니다. estimates use와 estimates store를 사용하세요.";
  const korean = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: koreanRequest,
    repair_mode: "partial",
    intent_mode: "add_feature",
    available_state: { estimate_state: "ster" },
  });
  assert.deepEqual(korean.dictionary_headwords, expected);
  assert.deepEqual(korean.interventions.map((row) => row.headword), expected);
  assert.ok(korean.completion_map.completed_headwords.includes("workflow_orchestration.master"));
  assert.ok(korean.completion_map.completed_headwords.includes("clean.derive_variables"));
  assert.ok(korean.completion_map.completed_headwords.includes("estimation.conventional"));
  assert.ok(korean.completion_map.completed_headwords.includes("postest.persist_estimate"));
  assert.ok(korean.completion_map.frozen_prefix.includes("workflow_orchestration.master"));
  assert.ok(korean.completion_map.frozen_prefix.includes("clean.derive_variables"));
  assert.ok(korean.completion_map.frozen_prefix.includes("estimation.conventional"));
  assert.ok(!korean.completion_map.frozen_prefix.includes("postest.persist_estimate"));
  assert.ok(korean.preserved_scope.some((row) => row.stage === "master_orchestration" && row.action === "preserve"));
  assert.ok(korean.preserved_scope.some((row) => row.stage === "cleaning_labels" && row.action === "preserve"));
  assert.ok(korean.preserved_scope.some((row) => row.stage === "estimation" && row.action === "preserve"));
  assert.deepEqual(korean.compatibility_contract.mutable_existing_files, []);
  assert.ok(korean.compatibility_contract.immutable_interfaces.existing_call_sites.some((row) => row.target === "code/10_prep.do"));
  assert.ok(korean.compatibility_contract.immutable_interfaces.existing_call_sites.some((row) => row.target === "code/20_regression.do"));
  assert.ok(korean.compatibility_contract.immutable_interfaces.existing_output_bindings.some((row) => /estimates save/i.test(row.command)));

  const english = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Keep the existing master, preparation, and regression unchanged. Add code/30_outputs.do to consume the existing numbered .ster files with estimates use and estimates store, then create a regression Excel workbook and coefficient PDF/GPH. Do not modify the master.",
    repair_mode: "partial",
    available_state: { estimate_state: "ster" },
  });
  assert.equal(english.intent, "add_feature");
  assert.deepEqual(english.dictionary_headwords, expected, JSON.stringify(english.retrieval_plan.scale_keywords.command_anchors));

  const koreanPreserveSter = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 numbered .ster는 보존하고 건드리지 마세요. 새 Excel 출력만 추가하세요.",
    repair_mode: "partial",
  });
  assert.deepEqual(koreanPreserveSter.dictionary_headwords, ["final_excel_assembly"]);
  const englishPreserveSter = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Preserve the existing numbered .ster files. Add a new Excel output only.",
    repair_mode: "partial",
  });
  assert.deepEqual(englishPreserveSter.dictionary_headwords, ["final_excel_assembly"]);

  const koreanMasterEdit = await client.tool("plan_dictionary_repairs", { path: root, request: "master를 수정해줘" });
  assert.equal(koreanMasterEdit.intent, "modify_existing");
  assert.deepEqual(koreanMasterEdit.dictionary_headwords, ["workflow_orchestration.master"]);
  const koreanRegressionEdit = await client.tool("plan_dictionary_repairs", { path: root, request: "회귀를 고쳐줘" });
  assert.equal(koreanRegressionEdit.intent, "modify_existing");
  assert.deepEqual(koreanRegressionEdit.dictionary_headwords, ["estimation.conventional"]);
  const englishMasterEdit = await client.tool("plan_dictionary_repairs", { path: root, request: "Modify the master." });
  assert.equal(englishMasterEdit.intent, "modify_existing");
  assert.deepEqual(englishMasterEdit.dictionary_headwords, ["workflow_orchestration.master"]);
  const englishRegressionEdit = await client.tool("plan_dictionary_repairs", { path: root, request: "Fix the regression." });
  assert.equal(englishRegressionEdit.intent, "modify_existing");
  assert.deepEqual(englishRegressionEdit.dictionary_headwords, ["estimation.conventional"]);
  const koreanMixed = await client.tool("plan_dictionary_repairs", { path: root, request: "master는 건드리지 말고 회귀를 고쳐줘" });
  assert.equal(koreanMixed.intent, "modify_existing");
  assert.deepEqual(koreanMixed.dictionary_headwords, ["estimation.conventional"]);
  const englishMixed = await client.tool("plan_dictionary_repairs", { path: root, request: "Keep the master unchanged but modify the regression." });
  assert.equal(englishMixed.intent, "modify_existing");
  assert.deepEqual(englishMixed.dictionary_headwords, ["estimation.conventional"]);
});

test("summary-only and regression-only requests do not expand into a full package", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-narrow-stage-request-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    'do "code/10_prepare.do"',
    'do "code/20_summary.do"',
    'do "code/30_regression.do"',
    'do "code/40_outputs.do"',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "10_prepare.do"), 'use "analysis.dta", clear\ngenerate x = source_x\n');
  fs.writeFileSync(path.join(root, "code", "20_summary.do"), "collapse (mean) mean_y=y (sd) sd_y=y (count) n_y=y, by(group)\n");
  fs.writeFileSync(path.join(root, "code", "30_regression.do"), "regress y x, vce(robust)\n");
  fs.writeFileSync(path.join(root, "code", "40_outputs.do"), 'outreg2 using "results.xlsx", replace\n');

  const client = new McpClient();
  t.after(() => client.close());
  const summary = await client.tool("plan_dictionary_repairs", { path: root, request: "summary stats만 만들어주세요" });
  assert.deepEqual(summary.dictionary_headwords, ["descriptives.summary_dataset"]);
  assert.equal(summary.retrieval_plan.scale, "checkpoint");
  assert.equal(summary.retrieval_plan.headword_budget, 1);
  assert.deepEqual(summary.retrieval_plan.selected_headwords, summary.dictionary_headwords);
  assert.equal(summary.retrieval_plan.writable_code_budget_per_headword, 1);
  assert.deepEqual(summary.compatibility_contract.mutable_existing_files, []);
  assert.ok(summary.preserved_scope.some((row) => row.stage === "estimation" && row.action === "preserve"));
  assert.ok(summary.preserved_scope.some((row) => row.stage === "exports" && row.action === "preserve"));

  const regression = await client.tool("plan_dictionary_repairs", { path: root, request: "regression만 돌려주세요" });
  assert.deepEqual(regression.dictionary_headwords, ["estimation.conventional"]);
  assert.equal(regression.retrieval_plan.scale, "checkpoint");
  assert.deepEqual(regression.compatibility_contract.mutable_existing_files, []);
  assert.ok(regression.preserved_scope.some((row) => row.stage === "descriptives_balance_sample_flow" && row.action === "preserve"));
  assert.ok(regression.preserved_scope.some((row) => row.stage === "exports" && row.action === "preserve"));

  const command = await client.tool("plan_dictionary_repairs", { path: root, request: "regress y x, vce(robust)" });
  assert.deepEqual(command.dictionary_headwords, ["estimation.conventional"]);
  assert.equal(command.retrieval_plan.scale, "atomic_substep");
  assert.equal(command.retrieval_plan.exact_stata_command_detected, true);
  assert.ok(command.retrieval_plan.scale_keywords.scale_keywords.includes("exact_stata_command"));
  assert.equal(command.interventions.length, 1);
  assert.ok(command.interventions.every((row) => row.alternative_variants.length <= 3));

  const feature = await client.tool("plan_dictionary_repairs", { path: root, request: "Excel과 coefficient PDF를 추가해 주세요" });
  assert.equal(feature.retrieval_plan.scale, "multi_checkpoint");
  assert.deepEqual(feature.retrieval_plan.selected_headwords, feature.dictionary_headwords);
  assert.equal(feature.retrieval_plan.headword_budget, feature.dictionary_headwords.length);
  assert.ok(feature.dictionary_headwords.length > 1);

  const explicitSubstep = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "이 명시된 회귀 substep만 구현하세요",
    requested_substeps: [{
      checkpoint: "estimation.conventional",
      substep_id: "main_regression",
      match: { commands: ["regress"] },
    }],
  });
  assert.equal(explicitSubstep.retrieval_plan.scale, "atomic_substep");
  assert.equal(explicitSubstep.retrieval_plan.user_scope_override, true);
  assert.deepEqual(explicitSubstep.dictionary_headwords, ["estimation.conventional"]);
  assert.equal(explicitSubstep.interventions[0].atomic_substeps.length, 1);

  const reviewOnly = await client.tool("plan_dictionary_repairs", { path: root, request: "회귀 코드를 검토만 해주세요" });
  assert.equal(reviewOnly.retrieval_plan.scale, "no_write");
  assert.equal(reviewOnly.retrieval_plan.code_required, false);
  assert.deepEqual(reviewOnly.dictionary_headwords, []);
  assert.deepEqual(reviewOnly.interventions, []);

  const explicitNoWrite = await client.tool("plan_dictionary_repairs", { path: root, request: "회귀 코드는 수정하지 말고 검토해 주세요" });
  assert.equal(explicitNoWrite.retrieval_plan.scale, "no_write");
  assert.equal(explicitNoWrite.retrieval_plan.code_required, false);
  assert.deepEqual(explicitNoWrite.dictionary_headwords, []);
  assert.deepEqual(explicitNoWrite.interventions, []);

  const neutralQuestion = await client.tool("plan_dictionary_repairs", { path: root, request: "이 프로젝트의 회귀 흐름이 어떻게 되어 있나요?" });
  assert.equal(neutralQuestion.retrieval_plan.scale, "no_write");
  assert.equal(neutralQuestion.retrieval_plan.code_required, false);
  assert.deepEqual(neutralQuestion.retrieval_plan.scale_keywords.scale_keywords, ["read_only", "no_writable_dictionary_code"]);
});

test("toy end-to-end prompts keep load, OLS, e(sample) mean, persistence, and Excel as separate flexible steps", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-toy-flexible-plan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const client = new McpClient();
  t.after(() => client.close());

  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "sysuse auto, clear; regress price mpg weight i.foreign, vce(robust); estadd ysumm for the e(sample) dependent-variable mean; estimates save auto_model.ster; preserve raw outreg2 rows in Excel",
  });
  for (const checkpoint of [
    "input_load.single_source",
    "estimation.conventional",
    "descriptives.sample_mean",
    "postest.persist_estimate",
    "final_excel_assembly",
  ]) assert.ok(plan.dictionary_headwords.includes(checkpoint), `${checkpoint}: ${JSON.stringify(plan.dictionary_headwords)}`);
  assert.equal(plan.dictionary_headwords.includes("sample.arm_response_eligibility"), false);
  assert.ok(plan.retrieval_plan.scale_keywords.command_anchors.includes("sysuse"));
  assert.ok(plan.retrieval_plan.scale_keywords.command_anchors.includes("estadd"));
  assert.equal(plan.retrieval_plan.stata_command_sequence_detected, true);
  assert.equal(plan.dictionary_unmapped_request, false);
  assert.ok(plan.interventions.every((row) => row.evidence_progress.user_decision_required === false));
});

test("unmapped model families remain writable without a fabricated template or forced user stop", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-unmapped-flexible-plan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const client = new McpClient();
  t.after(() => client.close());

  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "poisson count_y x, exposure(person_years); estimates save count.ster, replace",
  });
  assert.equal(plan.retrieval_plan.code_required, true);
  assert.equal(plan.dictionary_unmapped_request, false);
  assert.ok(plan.dictionary_headwords.includes("postest.persist_estimate"));
  const persistence = plan.interventions.find((row) => row.headword === "postest.persist_estimate");
  assert.ok(persistence, JSON.stringify(plan.dictionary_headwords));
  assert.equal(persistence.evidence_progress.user_decision_required, false);
  assert.equal(persistence.evidence_progress.direct_implementation_allowed, true);

  const unmapped = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Implement a Poisson model for count_y using exposure(person_years).",
  });
  assert.equal(unmapped.retrieval_plan.code_required, true);
  assert.equal(unmapped.dictionary_unmapped_request, true);
  assert.deepEqual(unmapped.dictionary_headwords, []);
  assert.equal(unmapped.dictionary_unmapped_policy.direct_implementation_allowed, true);
  assert.equal(unmapped.dictionary_unmapped_policy.user_decision_required, false);
  assert.match(unmapped.dictionary_unmapped_policy.rule, /Use general_rule/i);
  assert.match(unmapped.dictionary_unmapped_policy.rule, /Ranking does not establish compatibility/i);
});

test("existing coefplot output is completed and frozen when only Excel is added", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-completed-coefplot-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.writeFileSync(path.join(root, "code", "30_outputs.do"), [
    'estimates use "model.ster"',
    "estimates store model_1",
    "coefplot (model_1, label(Model 1))",
    'graph export "coefficient.pdf", replace',
  ].join("\n"));
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 coefficient plot은 유지하세요. 새 Excel 출력만 추가하세요.",
    repair_mode: "partial",
  });
  assert.deepEqual(plan.dictionary_headwords, ["final_excel_assembly"]);
  assert.ok(plan.completion_map.completed_headwords.includes("figures.coefplot_named_estimates"));
  assert.ok(plan.completion_map.frozen_prefix.includes("figures.coefplot_named_estimates"));
  assert.ok(!plan.interventions.some((row) => row.headword === "figures.coefplot_named_estimates"));
});

test("explicit code modification freezes non-target files and fingerprints interfaces", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-dictionary-fix-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global project_root .",
    'do "code/30_regression.do"',
    'do "code/40_tables.do"',
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "30_regression.do"), [
    'use "analysis.dta", clear',
    "regress y x",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "40_tables.do"), [
    'outreg2 using "tables/current", replace adjr2',
    'export excel using "tables/current.xlsx", replace',
  ].join("\n"));

  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "code/40_tables.do의 Excel 표 조립 코드를 수정해줘",
    target_files: ["code/40_tables.do"],
  });
  assert.equal(plan.intent, "modify_existing");
  assert.deepEqual(plan.dictionary_headwords, ["final_excel_assembly"]);
  assert.deepEqual(plan.compatibility_contract.mutable_existing_files, ["code/40_tables.do"]);
  assert.ok(plan.completion_map.frozen_prefix.includes("estimation.conventional"));
  assert.ok(plan.observed_state.interface_fingerprint.call_sites.some((row) => row.target === "code/40_tables.do"));
  assert.ok(plan.compatibility_contract.forbidden_integration_edits.some((row) => /reorder existing master calls/.test(row)));
});

test("manual search separates official and community authority", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const official = await client.tool("search_stata_manual", { commands: ["putexcel"], authority: "official", limit: 3 });
  assert.ok(official.results.length > 0);
  assert.ok(official.results.every((row) => row.authority === "official"));
  assert.ok(official.results.every((row) => row.source_url.includes("stata.com/manuals")));
  const community = await client.tool("search_stata_manual", { commands: ["reghdfe"], authority: "community", limit: 3 });
  assert.ok(community.results.length > 0);
  assert.ok(community.results.every((row) => row.authority === "community"));
  const missingLocal = await client.tool("search_stata_manual", { commands: ["merge"], authority: "official" });
  assert.equal(missingLocal.results.length, 0);
  assert.equal(missingLocal.official_web_search_required, true);
  assert.equal(missingLocal.suggested_official_web_sources[0].source_url, "https://www.stata.com/manuals/dmerge.pdf");
  const mixed = await client.tool("search_stata_manual", { commands: ["putexcel", "collapse", "graph bar"], authority: "official", limit: 10 });
  assert.ok(mixed.covered_commands.includes("putexcel"));
  assert.ok(mixed.missing_commands.includes("collapse"));
  assert.ok(mixed.missing_commands.includes("graph bar"));
  assert.equal(mixed.official_web_search_required, true);
  assert.ok(mixed.suggested_official_web_sources.some((row) => row.command === "collapse"));
  assert.ok(mixed.suggested_official_web_sources.some((row) => row.command === "graph bar"));
  const suest = await client.tool("search_stata_manual", { commands: ["suest"], authority: "official" });
  assert.equal(suest.official_web_search_required, true);
  assert.equal(suest.suggested_official_web_sources[0].source_url, "https://www.stata.com/manuals/rsuest.pdf");
  const postfile = await client.tool("search_stata_manual", { commands: ["postfile", "post", "postclose"], authority: "official", limit: 10 });
  assert.ok(postfile.results.length > 0);
  assert.deepEqual(postfile.missing_commands, []);
  assert.equal(postfile.official_web_search_required, false);
  assert.ok(postfile.results.every((row) => row.source_url === "https://www.stata.com/manuals/ppostfile.pdf"));
});

test("only runtime-verified official examples are declared passed", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const regress = await client.tool("get_verified_stata_examples", { command: "regress" });
  assert.equal(regress.examples.length, 1);
  assert.equal(regress.examples[0].passed, true);
  assert.equal(regress.examples[0].stata_version, "18.0");
  assert.match(regress.examples[0].code_sha256, /^[0-9a-f]{64}$/);
  assert.match(regress.examples[0].log_sha256, /^[0-9a-f]{64}$/);
  const durableLog = path.join(ROOT, "data", regress.examples[0].log_file);
  assert.equal(fs.existsSync(durableLog), true);
  const crypto = require("node:crypto");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(durableLog)).digest("hex"), regress.examples[0].log_sha256);
  assert.doesNotMatch(fs.readFileSync(durableLog, "utf8"), /Licensed to|Serial number/i);
  const merge = await client.tool("get_verified_stata_examples", { command: "merge" });
  assert.equal(merge.unavailable, true);
  assert.deepEqual(merge.examples, []);
});

test("official result access and putexcel are not blanket warnings", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("lint_do_file", { content: "putexcel set results.xlsx, replace\nputexcel A1 = _b[treatment]" });
  assert.equal(result.status, "static_clean");
  assert.equal(result.summary.warnings, 0);
  assert.ok(result.strengths.some((row) => row.rule === "official_putexcel"));
});

test("a typed named sample-flow postfile is distinct from coefficient reconstruction", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const sampleFlow = await client.tool("lint_do_file", { content: [
    "tempname sample_flow",
    'postfile `sample_flow\' str40 checkpoint long n using "$data/sample_flow.dta", replace',
    'post `sample_flow\' ("raw_load") (_N)',
    'post `sample_flow\' ("analysis_sample") (_N)',
    "postclose `sample_flow'",
  ].join("\n") });
  assert.equal(sampleFlow.findings.some((row) => row.rule === "manual_result_bridge"), false);
  assert.ok(sampleFlow.strengths.some((row) => row.rule === "named_sample_flow_dataset"));

  const coefficientBridge = await client.tool("lint_do_file", { content: [
    "tempname results",
    'postfile `results\' str40 term double estimate se using "coefficient_results.dta", replace',
    'post `results\' ("treatment") (_b[treatment]) (_se[treatment])',
    "postclose `results'",
  ].join("\n") });
  assert.ok(coefficientBridge.findings.some((row) => row.rule === "manual_result_bridge"));
});

test("named sample-flow exemption requires one same-handle postclose after the last post", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const lint = (body) => client.tool("lint_do_file", { content: [
    "tempname sample_flow other",
    'postfile `sample_flow\' str40 checkpoint long n using "$data/sample_flow.dta", replace',
    ...body,
  ].join("\n") });
  const normal = await lint([
    'post `sample_flow\' ("raw_load") (_N)',
    'post `sample_flow\' ("analysis_sample") (r(N))',
    "postclose `sample_flow'",
    "postclose `other'",
  ]);
  assert.equal(normal.findings.some((row) => row.rule === "manual_result_bridge"), false);
  assert.ok(normal.strengths.some((row) => row.rule === "named_sample_flow_dataset"));

  const closeBeforeLastPost = await lint([
    'post `sample_flow\' ("raw_load") (_N)',
    "postclose `sample_flow'",
    'post `sample_flow\' ("analysis_sample") (_N)',
  ]);
  assert.ok(closeBeforeLastPost.findings.some((row) => row.rule === "manual_result_bridge"));

  const duplicateClose = await lint([
    'post `sample_flow\' ("raw_load") (_N)',
    'post `sample_flow\' ("analysis_sample") (_N)',
    "postclose `sample_flow'",
    "postclose `sample_flow'",
  ]);
  assert.ok(duplicateClose.findings.some((row) => row.rule === "manual_result_bridge"));

  const wrongHandle = await lint([
    'post `sample_flow\' ("raw_load") (_N)',
    'post `sample_flow\' ("analysis_sample") (_N)',
    'display "postclose `sample_flow\'"',
    "* postclose `sample_flow'",
    "postclose `other'",
  ]);
  assert.ok(wrongHandle.findings.some((row) => row.rule === "manual_result_bridge"));
});

test("readable two-level loops pass while opaque depth two and all depth three block", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const single = await client.tool("lint_do_file", { content: [
    "foreach y in y1 y2 {",
    "    regress `y' treatment",
    "}",
    "forvalues year = 2015/2024 {",
    "    summarize outcome if year == `year'",
    "}",
  ].join("\n") });
  assert.equal(single.status, "static_clean");
  assert.equal(single.findings.some((row) => row.rule === "nested_loop"), false);

  const nested = await client.tool("lint_do_file", { content: [
    "foreach y in y1 y2 {",
    "    forvalues specification = 1/3 {",
    "        regress `y' treatment if specification == `specification'",
    "    }",
    "}",
  ].join("\n") });
  assert.equal(nested.status, "static_clean", JSON.stringify(nested.findings));
  assert.ok(nested.strengths.some((row) => row.rule === "readable_two_level_loop" && row.loop_depth === 2));

  const opaque = await client.tool("lint_do_file", { content: [
    "foreach y in y1 y2 {",
    "    while count < 3 {",
    "        summarize `y'",
    "    }",
    "}",
  ].join("\n") });
  assert.equal(opaque.status, "blocked");
  assert.ok(opaque.findings.some((row) => row.rule === "nested_loop" && row.loop_depth === 2 && row.allowed_loop_depth === 2));

  const tooDeep = await client.tool("lint_do_file", { content: [
    "foreach sample in all kospi {",
    "    foreach outcome in y1 y2 {",
    "        forvalues specification = 1/3 {",
    "            regress `outcome' treatment",
    "        }",
    "    }",
    "}",
  ].join("\n") });
  assert.equal(tooDeep.status, "blocked");
  assert.ok(tooDeep.findings.some((row) => row.rule === "nested_loop" && row.loop_depth === 3 && row.allowed_loop_depth === 2));
});

test("structural loop parser ignores macro, string, and comment braces", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("lint_do_file", { content: [
    "global INPUT \"${PROJECT_ROOT}/data/raw\"",
    "local label \"literal { brace } text\"",
    "* foreach fake in x {",
    "// forvalues fake = 1/2 {",
    "foreach y in y1 y2 {",
    "    display \"${INPUT}: `y'\"",
    "}",
  ].join("\n") });
  assert.equal(result.status, "static_clean");
  assert.equal(result.findings.some((row) => row.rule === "nested_loop"), false);
});

test("TeX outputs are blocked while PDF Excel and ster outputs remain supported", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const supported = await client.tool("lint_do_file", { content: [
    "estimates save results/model.ster, replace",
    "putexcel set results/table.xlsx, replace",
    "graph export results/figure.pdf, replace",
  ].join("\n") });
  assert.equal(supported.status, "static_clean");
  const tex = await client.tool("lint_do_file", { content: "esttab using results/table.tex, replace" });
  assert.equal(tex.status, "blocked");
  assert.ok(tex.findings.some((row) => row.rule === "tex_output_not_supported"));
});

test("canonical outreg2 scratch cleanup is narrow while other erases remain blocked", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  const canonical = await client.tool("lint_do_file", { content: [
    formatter,
    'outreg2_xlsx, estimates("y1_s1 y1_s2") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("y2_s1 y2_s2") workbook("table.xlsx") sheet("family_b") adjdec(3) meandec(2)',
  ].join("\n") });
  assert.equal(canonical.findings.some((row) => row.rule === "destructive_delete"), false);
  assert.equal(canonical.findings.some((row) => row.rule === "broad_capture"), false);
  assert.ok(canonical.strengths.some((row) => row.rule === "named_outreg2_scratch_cleanup"));
  const unsafe = await client.tool("lint_do_file", { content: [
    "program define outreg2_xlsx",
    "outreg2 using table, replace",
    "import delimited using table.txt, clear",
    "export excel using table.xlsx, sheet(\"results\") replace",
    "capture erase \"$table/important.txt\"",
    "end",
    'outreg2_xlsx, outcomes("y1 y2") sheet("family_a")',
    'outreg2_xlsx, outcomes("y3 y4") sheet("family_b")',
  ].join("\n") });
  assert.ok(unsafe.findings.some((row) => row.rule === "destructive_delete"));
});

test("standalone canonical outreg2 formatter defers sheet multiplicity to project audit", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  const standalone = await client.tool("lint_do_file", { content: formatter });
  assert.equal(standalone.findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);
  assert.ok(standalone.strengths.some((row) => row.rule === "outreg2_sheet_program_project_context_pending"));

  const unresolvedCalls = await client.tool("lint_do_file", { content: [
    formatter,
    'outreg2_xlsx, estimates("$estimates_a") workbook("$table/book.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("$estimates_b") workbook("$table/book.xlsx") sheet("family_b") adjdec(3) meandec(2)',
  ].join("\n") });
  assert.equal(unresolvedCalls.findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);
  assert.ok(unresolvedCalls.strengths.some((row) => row.rule === "outreg2_sheet_program_project_context_pending"));
});

test("one-sheet direct outreg2 permits only the declared sample mean and adjusted R-squared", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const accepted = await client.tool("lint_do_file", { content: [
    "regress price mpg weight, vce(robust)",
    "quietly summarize price if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'estimates save "model.ster", replace',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n") });
  assert.equal(accepted.status, "static_clean", JSON.stringify(accepted.findings));
  assert.ok(accepted.strengths.some((row) => row.rule === "direct_single_sheet_outreg2_statistics"));
  for (const localCommand of ["loc", "loca", "local"]) {
    const abbreviatedLocal = await client.tool("lint_do_file", { content: [
      "regress price mpg weight, vce(robust)",
      "quietly summarize price if e(sample), meanonly",
      `${localCommand} dep_mean = r(mean)`,
      'estimates save "model.ster", replace',
      'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
    ].join("\n") });
    assert.equal(abbreviatedLocal.status, "static_clean", `${localCommand}: ${JSON.stringify(abbreviatedLocal.findings)}`);
  }

  for (const target of ["table.xml", "table.xlsx", "table"]) {
    const rejected = await client.tool("lint_do_file", { content: [
      "regress price mpg weight, vce(robust)",
      "quietly summarize price if e(sample), meanonly",
      "local dep_mean = r(mean)",
      `outreg2 using "${target}", excel replace adjr2 addstat(Dep. variable mean, \`dep_mean')`,
    ].join("\n") });
    assert.ok(rejected.findings.some((row) => row.rule === "direct_outreg2_requires_xls"), target);
  }

  for (const command of [
    'outreg2 using "table.xls", excel replace adjr2 addstat(Mean, `dep_mean\')',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, e(mean))',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\') keep(mpg)',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\') drop(weight)',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\') addtext(Sample, All)',
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\') e(N)',
    'outreg2 using "table.xls", excel replace addstat(Dep. variable mean, `dep_mean\')',
  ]) {
    const rejected = await client.tool("lint_do_file", { content: [
      "regress price mpg weight, vce(robust)",
      "quietly summarize price if e(sample), meanonly",
      "local dep_mean = r(mean)",
      command,
    ].join("\n") });
    assert.equal(rejected.status, "blocked", command);
  }

  const wrongVariable = await client.tool("lint_do_file", { content: [
    "regress price mpg weight, vce(robust)",
    "quietly summarize mpg if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n") });
  assert.equal(wrongVariable.status, "blocked");

  const interveningEstimator = await client.tool("lint_do_file", { content: [
    "regress price mpg weight, vce(robust)",
    "quietly summarize price if e(sample), meanonly",
    "regress mpg price weight, vce(robust)",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n") });
  assert.equal(interveningEstimator.status, "blocked");
});

test("stage detector keeps collapse and conditional estimates out of unrelated stages", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-stage-signal-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "analysis.do"), [
    "collapse (mean) outcome, by(group)",
    "regress outcome treatment if year == 2020",
    "regress outcome treatment if year == 2021",
  ].join("\n"));
  const result = await client.tool("audit_stata_project", { path: project, expected_stages: ["descriptives_balance_sample_flow", "estimation"] });
  const coverage = new Map(result.stage_coverage.map((row) => [row.stage, row]));
  assert.equal(coverage.get("descriptives_balance_sample_flow").status, "present");
  assert.equal(coverage.get("estimation").status, "present");
  assert.equal(coverage.get("merge_reshape").status, "not_expected");
  assert.equal(coverage.get("robustness").status, "not_expected");
});

test("canonical group summary, graph, and collect exports are recognized", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("lint_do_file", { content: [
    "collapse (mean) mean_age=age (sd) sd_age=age (count) n=age (sum) sum_age=age (p25) p25_age=age (p50) p50_age=age (p75) p75_age=age, by(period)",
    "save \"$FINAL/female_director_age_summary.dta\", replace",
    "graph bar mean_age, over(period)",
    "collect get mean_age = mean_age sd_age = sd_age n = n",
    "collect export \"$OUTPUT/tables/female_director_age.xlsx\", replace",
  ].join("\n") });
  assert.equal(result.status, "static_clean");
  for (const rule of ["complete_group_summary", "canonical_summary_dataset", "official_graph_bar", "official_collect_export"]) {
    assert.ok(result.strengths.some((row) => row.rule === rule), rule);
  }
});

test("factor-interaction names stay raw and graph language/font policies are enforced", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const raw = await client.tool("lint_do_file", { content: [
    "regress y i.treated##ib2019.year, vce(robust)",
    'outreg2 using "results.xlsx", replace',
    "coefplot, keep(1.treated#2015.year 1.treated#2016.year) order(1.treated#2015.year 1.treated#2016.year) ///",
    '    xtitle("Year") ytitle("Treatment x year coefficient") title("Event study")',
    'graph export "figures/event_study.pdf", replace',
  ].join("\n") });
  assert.equal(raw.findings.some((row) => row.rule === "interaction_coefficient_alias"), false);
  assert.equal(raw.findings.some((row) => row.rule === "synthetic_event_term_alias"), false);
  assert.equal(raw.findings.some((row) => row.rule === "event_study_non_english"), false);

  const generatedAliases = await client.tool("lint_do_file", { content: [
    "generate byte treat_y2015 = treat2019*(year==2015)",
    'local events "treat_y2015 treat_y2016"',
    "reghdfe y `events', absorb(fid year) vce(cluster fid)",
  ].join("\n") });
  assert.equal(generatedAliases.status, "blocked");
  assert.ok(generatedAliases.findings.some((row) => row.rule === "synthetic_event_term_alias" && row.line === 1));
  assert.ok(generatedAliases.findings.some((row) => row.rule === "synthetic_event_term_alias" && row.line === 2));

  const generatedAliasesLogical = await client.tool("lint_do_file", { content: [
    "generate byte treat_y2015 = treated==1 & year==2015",
    "reghdfe y treat_y2015, absorb(fid year) vce(cluster fid)",
  ].join("\n") });
  assert.equal(generatedAliasesLogical.status, "blocked");
  assert.ok(generatedAliasesLogical.findings.some((row) => row.rule === "synthetic_event_term_alias" && row.line === 1));

  const directAliasRegression = await client.tool("lint_do_file", {
    content: "reghdfe y treat_y2015 treat_y2016, absorb(fid year) vce(cluster fid)",
  });
  assert.ok(directAliasRegression.findings.some((row) => row.rule === "synthetic_event_term_alias"));
  const legitimateYearNamedOutcome = await client.tool("lint_do_file", {
    content: "generate outcome_y2015 = source_value\nregress y outcome_y2015, vce(robust)",
  });
  assert.equal(legitimateYearNamedOutcome.findings.some((row) => row.rule === "synthetic_event_term_alias"), false);
  const genericConstructedAlias = await client.tool("lint_do_file", { content: [
    "generate byte female_board_y2015 = female_board*(year==2015)",
    "reghdfe outcome female_board_y2015, absorb(fid year) vce(cluster fid)",
  ].join("\n") });
  assert.equal(genericConstructedAlias.status, "blocked");
  assert.ok(genericConstructedAlias.findings.some((row) => row.rule === "synthetic_event_term_alias" && row.line === 1));

  const aliased = await client.tool("lint_do_file", { content: [
    "coefplot, keep(1.treated#2015.year) rename(1.treated#2015.year = _y2015) ///",
    '    xtitle("Year") title("Event study")',
    'graph export "figures/event_study.pdf", replace',
  ].join("\n") });
  assert.equal(aliased.status, "blocked");
  assert.ok(aliased.findings.some((row) => row.rule === "interaction_coefficient_alias"));

  const koreanEvent = await client.tool("lint_do_file", { content: [
    "coefplot, keep(1.treated#2015.year) order(1.treated#2015.year) ///",
    '    xtitle("연도") ytitle("처치효과")',
    'graph export "figures/event_study.pdf", replace',
  ].join("\n") });
  assert.equal(koreanEvent.status, "blocked");
  assert.ok(koreanEvent.findings.some((row) => row.rule === "event_study_non_english"));

  const koreanSummary = await client.tool("lint_do_file", { content: 'graph bar mean_age, title("여성 이사 평균 연령")' });
  assert.ok(koreanSummary.findings.some((row) => row.rule === "korean_graph_without_malgun_gothic"));
  const malgunSummary = await client.tool("lint_do_file", { content: [
    'graph set window fontface "Malgun Gothic"',
    'graph bar mean_age, title("여성 이사 평균 연령")',
  ].join("\n") });
  assert.equal(malgunSummary.findings.some((row) => row.rule === "korean_graph_without_malgun_gothic"), false);
});

test("repair planner surfaces bounded scale keywords and raw-factor policy anchors", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-scale-keywords-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse panel.dta, clear\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const exactCommand = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: 'outreg2 using "results.xlsx", replace',
  });
  assert.equal(exactCommand.retrieval_plan.scale, "atomic_substep");
  assert.deepEqual(exactCommand.dictionary_headwords, ["final_excel_assembly"]);
  assert.ok(exactCommand.retrieval_plan.scale_keywords.command_anchors.includes("outreg2"));
  assert.ok(exactCommand.retrieval_plan.scale_keywords.policy_anchors.includes("canonical_outreg2_final_excel"));
  assert.ok(exactCommand.retrieval_plan.scale_keywords.headword_queries.every((row) => exactCommand.dictionary_headwords.includes(row.headword)));
  assert.equal(exactCommand.retrieval_plan.writable_code_budget_per_headword, 1);

  const rawFactor = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "event-study coefplot과 excel에서 raw coefficient name을 유지하도록 고쳐줘",
  });
  assert.ok(rawFactor.retrieval_plan.scale_keywords.policy_anchors.includes("preserve_raw_factor_coefficients"));
  assert.ok(rawFactor.retrieval_plan.scale_keywords.policy_anchors.includes("english_only_event_study_text"));
});

test("mean-only collapse is flagged as an incomplete reporting summary", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("lint_do_file", { content: "collapse (mean) mean_age=age, by(period)" });
  assert.equal(result.status, "needs_review");
  assert.ok(result.findings.some((row) => row.rule === "incomplete_group_summary"));
});

test("project audit accepts community commands without project setup metadata", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-community-command-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "reghdfe outcome treatment, absorb(village_id) vce(cluster village_id)",
  ].join("\n"));
  const result = await client.tool("audit_stata_project", { path: project, expected_stages: ["estimation"] });
  assert.equal(result.status, "static_clean");
  assert.equal(result.file_findings.length, 0);
});

test("reference build excludes known disabled and defective files", () => {
  const rows = fs.readFileSync(path.join(ROOT, "data", "reference_index.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
  const approved = rows.filter((row) => row.approved_for_generation);
  assert.ok(approved.length >= 50);
  assert.equal(approved.some((row) => row.package_id === "193441"), false);
  assert.equal(approved.some((row) => row.package_id === "195983"), false);
  assert.equal(approved.some((row) => /\/data\/raw_data\//i.test(row.path)), false);
  assert.equal(approved.some((row) => /202444\/code\/(?:main_analysis|pathnames)\.do$/i.test(row.path)), false);
  assert.equal(approved.some((row) => row.hard_flags.length || row.cautions.length), false);
  const forbidden = /^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:ssc\s+install|net\s+install|github\s+install|merge\s+m:m|duplicates\s+drop\b.*\bforce|erase\b|shell\b|rscript\b)/im;
  assert.equal(approved.some((row) => forbidden.test(row.content)), false);
  assert.equal(approved.some((row) => {
    const active = row.content.split(/\r?\n/).filter((line) => line.trim() && !/^\s*(?:\*|\/\/)/.test(line));
    const balance = active.reduce((value, line) => value + (line.match(/{/g) || []).length - (line.match(/}/g) || []).length, 0);
    return active[0]?.trimStart().startsWith("}") || balance !== 0;
  }), false);
  const unsafeMerge = approved.filter((row) => row.commands.includes("merge")).filter((row) => {
    const content = row.content.replace(/^(?:\s*(?:capture|cap|quietly|qui|noisily|noi)\s+)+/gim, "");
    const lines = content.split(/\r?\n/);
    return lines.some((line, index) => {
      if (!/^\s*merge\s+(?:1:1|1:m|m:1|m:m)\b/i.test(line)) return false;
      const nearby = lines.slice(index + 1, index + 13).join("\n");
      const validated = /^(?:\s*assert\b[^\n]*(?:_merge|matched)|\s*(?:tab|tabulate|count)\b[^\n]*_merge)/im.test(nearby);
      return /^\s*drop\s+_merge\b/im.test(nearby) && !validated;
    });
  });
  assert.deepEqual(unsafeMerge.map((row) => row.chunk_id), []);
});

test("nested-loop references remain unavailable even by explicit contextual request", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_approved_patterns", { stage: "cleaning_labels", task: "nested loop variable construction", include_contextual: true, limit: 10 });
  assert.equal(result.results.some((row) => row.cautions.includes("nested_loop") || row.max_loop_depth >= 2), false);
});

test("reference data omits depth-three and TeX-output examples", () => {
  const rows = fs.readFileSync(path.join(ROOT, "data", "reference_index.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.ok(rows.every((row) => Number.isInteger(row.max_loop_depth)));
  assert.equal(rows.some((row) => row.max_loop_depth >= 3), false);
  assert.equal(rows.some((row) => row.tex_output === true), false);
  assert.equal(rows.some((row) => row.max_loop_depth >= 2 && row.approved_for_generation), false);
  assert.equal(rows.some((row) => /\.tex(?:["'\s,)\]}]|$)/i.test(row.content)), false);
  const workflows = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "workflow_examples.json"), "utf8"));
  const files = workflows.packages.flatMap((row) => row.files);
  assert.ok(files.every((row) => row.max_loop_depth < 3 && row.tex_output === false));
});

test("explicit command search returns exact command matches only", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_approved_patterns", { stage: "estimation", commands: ["rdrobust"], limit: 10 });
  assert.ok(result.results.length > 0);
  assert.ok(result.results.every((row) => row.commands.includes("rdrobust")));
});

test("command prefixes cannot bypass blocking rules", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const content = [
    "cap ssc install reghdfe, replace",
    "quietly merge m:m id using other.dta",
    "cap erase raw.dta",
    "noisily shell matlab -batch run",
  ].join("\n");
  const result = await client.tool("lint_do_file", { content });
  assert.equal(result.status, "blocked");
  for (const rule of ["runtime_install", "merge_m_m", "destructive_delete", "process_escape"]) {
    assert.ok(result.findings.some((row) => row.rule === rule), rule);
  }
});

test("analysis code never probes installed packages", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const content of ["which reghdfe", "capture which outreg2", "quietly findfile coefplot.ado", "ado dir reghdfe", "capture confirm command reghdfe\nif _rc display \"missing\""]) {
    const result = await client.tool("lint_do_file", { content });
    assert.equal(result.status, "blocked", content);
    assert.ok(result.findings.some((row) => row.rule === "installed_command_probe"), content);
  }
});

test("whole-flow profile uses direct outreg2 for one-sheet workbooks and the formatter for multi-sheet workbooks", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const single = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: singleExcelFlowProfile(),
  });
  assert.deepEqual(single.results.map((row) => row.label_id), []);
  assert.equal(single.output_flow_selection.selection_class, "direct_single_sheet_workbook");
  assert.equal(single.output_flow_selection.direct_implementation_allowed, true);
  assert.equal(single.output_flow_selection.formatter_required, false);
  assert.equal(single.output_flow_selection.maximum_sheet_count_per_workbook, 1);
  assert.equal(single.general_rule_policy.implementation_allowed, true);
  assert.equal(single.general_rule_policy.mode, "general_rule");
  assert.equal(single.general_rule_policy.always_applies, true);
  assert.equal(single.general_rule_fallback_policy, undefined);
  assert.ok(single.general_rule_policy.rules.some((rule) => /explicit \.xls target/i.test(rule)));
  assert.equal(single.general_rule_policy.report_path, "report.md");
  const helper = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: groupedExcelFlowProfile() });
  assert.deepEqual(helper.results.map((row) => row.label_id), ["export.regression_excel.from_ster_default_style.v1"]);
  assert.equal(helper.output_flow_selection.selection_class, "canonical_raw_outreg2_formatter");
  assert.equal(helper.output_flow_selection.formatter_required, true);
  assert.equal(helper.output_flow_selection.maximum_sheet_count_per_workbook, 2);
  assert.match(helper.general_rule_policy.template_selection_rule, /genuinely close writable template/i);
  const unresolved = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: { outcomes: [{ name: "y1" }, { name: "y2" }] },
  });
  assert.equal(unresolved.output_flow_selection.selection_ready, false);
  assert.equal(unresolved.results.length, 0);
  assert.equal(unresolved.general_rule_policy.implementation_allowed, false);
  assert.ok(unresolved.general_rule_policy.hard_stop_reasons.some((reason) => /output_flow_profile is incomplete/i.test(reason)));
});

test("new import, reshape, event-study, and IV handoff labels are retrievable with input profiles", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const variant_id of [
    "delimited_single_source_clear",
    "excel_sheet_firstrow_clear",
    "wide_year_stub_to_long",
    "event_levels_base_excluded_single_hash",
    "stored_samples_flat_outcome_loop_automatic_axis_pdf",
    "xtivreg2_first_stage_restore_ymean_ster",
  ]) {
    const result = await client.tool("search_labeled_checkpoints", { variant_id, limit: 5 });
    assert.equal(result.results.length, 1, variant_id);
    assert.ok(result.results[0].template_input_profile, variant_id);
    if (variant_id === "delimited_single_source_clear") {
      assert.equal(result.results[0].source_kind, "official_manual_derived_mechanics");
      assert.equal(result.results[0].code.trim(), 'import delimited using "$raw/source_file.csv", clear');
    }
    if (variant_id === "xtivreg2_first_stage_restore_ymean_ster") {
      assert.equal((result.results[0].code.match(/estadd ysumm, mean/g) || []).length, 2);
      assert.doesNotMatch(result.results[0].code, /estadd scalar|ereturn scalar/);
    }
  }
});

test("template input profiles rank compatible new labels and narrowly exclude declared contradictions", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const variants = [
    "delimited_single_source_clear",
    "excel_sheet_firstrow_clear",
    "wide_year_stub_to_long",
    "event_levels_base_excluded_single_hash",
    "stored_samples_flat_outcome_loop_automatic_axis_pdf",
    "stored_samples_flat_close_group_fixed_axis_pdf",
    "xtivreg2_first_stage_restore_ymean_ster",
  ];
  for (const variant_id of variants) {
    const baseline = await client.tool("search_labeled_checkpoints", { variant_id, limit: 5 });
    const profile = baseline.results[0].template_input_profile;
    const matched = await client.tool("search_labeled_checkpoints", { variant_id, target_input_profile: profile, limit: 5 });
    assert.equal(matched.results.length, 1, variant_id);
    if (variant_id === "delimited_single_source_clear") {
      assert.equal(matched.results[0].template_input_profile_comparison.status, "neutral", variant_id);
      assert.ok(!matched.template_input_profile_gate.excluded_label_ids.includes("input.delimited_single_source_clear.v1"));
    }
    else {
      assert.equal(matched.results[0].template_input_profile_comparison.status, "aligned", variant_id);
      assert.ok(matched.results[0].score > baseline.results[0].score, variant_id);
    }
  }
  const wrongTopology = await client.tool("search_labeled_checkpoints", {
    variant_id: "excel_sheet_firstrow_clear",
    target_input_profile: { data_structure: "panel", record_unit: "one entity-time observation", required_keys: ["firm_id", "year"] },
  });
  assert.equal(wrongTopology.results.length, 0);
  assert.ok(wrongTopology.template_input_profile_gate.excluded_label_ids.includes("input.excel_firstrow_clear.v1"));
  assert.equal(wrongTopology.general_rule_policy.closest_template_evidence.label_id, "input.excel_firstrow_clear.v1");
  assert.equal(wrongTopology.general_rule_policy.closest_template_evidence.hint_role, "nonbinding_rank_relative_hint");
  assert.equal(wrongTopology.general_rule_policy.closest_template_evidence.absolute_compatibility, "not_established");
  assert.equal(wrongTopology.general_rule_policy.closest_template_evidence.auto_select_allowed, false);
  assert.equal(wrongTopology.general_rule_policy.closest_template_evidence.template_input_profile_comparison.status, "incompatible");
  assert.match(wrongTopology.general_rule_policy.closest_template_evidence.code, /import excel/i);
  const missingInstrument = await client.tool("search_labeled_checkpoints", {
    variant_id: "xtivreg2_first_stage_restore_ymean_ster",
    target_input_profile: { data_structure: "panel", variable_characteristics: ["no excluded instrument"] },
  });
  assert.equal(missingInstrument.results.length, 0);
  assert.ok(missingInstrument.template_input_profile_gate.excluded_label_ids.includes("postest.iv_first_stage_handoff.v1"));
  assert.equal(missingInstrument.template_input_profile_gate.contradictions[0].contradictions[0].field, "variable_characteristics");
  const unknownTarget = await client.tool("search_labeled_checkpoints", {
    variant_id: "excel_sheet_firstrow_clear",
    target_input_profile: { data_structure: "unknown" },
  });
  assert.equal(unknownTarget.results.length, 1);
  assert.equal(unknownTarget.results[0].template_input_profile_comparison.status, "neutral");
});

test("template input profile comparisons expose all six fields while provenance and record unit stay non-gating", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const variant_id = "explicit_variable_renames_and_derived_fields";
  const baseline = await client.tool("search_labeled_checkpoints", { variant_id, limit: 5 });
  const profile = baseline.results[0].template_input_profile;
  const exact = await client.tool("search_labeled_checkpoints", { variant_id, target_input_profile: profile, limit: 5 });
  const exactComparison = exact.results[0].template_input_profile_comparison;
  assert.deepEqual(Object.keys(exactComparison.field_comparisons).sort(), [
    "data_structure",
    "record_unit",
    "required_keys",
    "source_basis",
    "time_structure",
    "variable_characteristics",
  ]);
  assert.ok(Object.values(exactComparison.field_comparisons).every((row) => row.status === "aligned"));
  assert.equal(exactComparison.non_gating_evidence.record_unit.gating, false);
  assert.equal(exactComparison.non_gating_evidence.source_basis.gating, false);

  const differentBindings = await client.tool("search_labeled_checkpoints", {
    variant_id,
    target_input_profile: {
      ...profile,
      record_unit: "one household-year observation",
      source_basis: "researcher-provided household extract",
    },
    limit: 5,
  });
  assert.equal(differentBindings.results.length, 1);
  const differentComparison = differentBindings.results[0].template_input_profile_comparison;
  assert.equal(differentComparison.status, "aligned");
  assert.equal(differentComparison.field_comparisons.record_unit.status, "different");
  assert.equal(differentComparison.field_comparisons.source_basis.status, "different");
  assert.ok(!differentBindings.template_input_profile_gate.excluded_label_ids.includes("clean.explicit_rename_generate_keep.v1"));

  const partialBasis = await client.tool("search_labeled_checkpoints", {
    variant_id,
    target_input_profile: { source_basis: "corpus/packages/194561/code/10_data_preparation.do" },
    limit: 5,
  });
  assert.equal(partialBasis.results[0].template_input_profile_comparison.status, "neutral");
  assert.equal(partialBasis.results[0].template_input_profile_comparison.field_comparisons.source_basis.status, "review_required");

  const unknownBasis = await client.tool("search_labeled_checkpoints", {
    variant_id,
    target_input_profile: { source_basis: "unknown" },
    limit: 5,
  });
  assert.equal(unknownBasis.results[0].template_input_profile_comparison.field_comparisons.source_basis.status, "neutral");

  const differentKeys = await client.tool("search_labeled_checkpoints", {
    variant_id,
    target_input_profile: { data_structure: "panel", required_keys: ["household_id", "year"] },
    limit: 5,
  });
  assert.equal(differentKeys.results.length, 1);
  assert.equal(differentKeys.results[0].template_input_profile_comparison.field_comparisons.required_keys.status, "different");
});

test("time-shape-agnostic final Excel formatter stays neutral for an annual panel", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const panelTarget = await client.tool("search_labeled_checkpoints", {
    variant_id: "outreg2_from_persisted_ster_then_xlsx",
    target_input_profile: {
      data_structure: "panel",
      record_unit: "one entity-time observation",
      required_keys: ["firm_id", "year"],
      time_structure: "annual panel",
    },
  });
  assert.equal(panelTarget.results.length, 1);
  assert.equal(panelTarget.results[0].template_input_profile_comparison.status, "neutral");
  assert.ok(!panelTarget.template_input_profile_gate.excluded_label_ids.includes("export.regression_excel.from_ster_default_style.v1"));
});

test("output flow permits a first-stage-only group but blocks mixed first- and second-stage groups", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const firstStage = singleExcelFlowProfile();
  firstStage.outcomes[0].model_role = "first_stage";
  firstStage.sheet_groups[0].model_role = "first_stage";
  const accepted = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: firstStage });
  assert.equal(accepted.output_flow_selection.selection_ready, true, JSON.stringify(accepted.output_flow_selection.failures));
  const mixed = groupedExcelFlowProfile();
  mixed.outcomes[0].model_role = "first_stage";
  mixed.outcomes[1].model_role = "second_stage";
  mixed.sheet_groups[0].model_role = "mixed";
  const rejected = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: mixed });
  assert.equal(rejected.output_flow_selection.selection_ready, false);
  assert.ok(rejected.output_flow_selection.failures.some((row) => /first.stage.*second.stage|model.role/i.test(row)));
});

test("one-sheet direct output accepts a minimal physical profile without multi-sheet grouping prose", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: {
      outcomes: [{ name: "price", sample: "active e(sample)", specification_order: [1] }],
      sheet_groups: [{ sheet_group_id: "main", outcomes: ["price"] }],
      sheet_plan: [{ workbook: "table.xls", sheet: "Regression", sheet_group_id: "main", estimate_names: ["active_model"] }],
    },
  });
  assert.equal(result.output_flow_selection.selection_ready, true, JSON.stringify(result.output_flow_selection.failures));
  assert.equal(result.output_flow_selection.selection_class, "direct_single_sheet_workbook");
  assert.equal(result.output_flow_selection.recommended_label_id, null);
  assert.equal(result.results.length, 0);
});

test("decision-source aliases are normalized and the accepted vocabulary is discoverable", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const cases = [
    ["user", "user"],
    ["existing_project", "existing_project"],
    ["model_from_metadata", "model_from_metadata"],
    ["caller_declared", "caller_declared"],
    ["user_contract", "user"],
    ["explicit_user_request", "user"],
    ["semantic_definition", "model_from_metadata"],
    [{ type: "user_contract", evidence: "contract.md" }, "user"],
  ];
  for (const [source, canonical] of cases) {
    const profile = singleExcelFlowProfile();
    profile.sheet_groups[0].decision_source = source;
    const result = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: profile });
    assert.equal(result.output_flow_selection.selection_ready, true, JSON.stringify(result.output_flow_selection.failures));
    assert.equal(result.output_flow_selection.sheet_groups[0].decision_source, canonical);
    assert.deepEqual(result.output_flow_selection.decision_source_contract.canonical_values, ["user", "existing_project", "model_from_metadata", "caller_declared"]);
  }

  const invalid = singleExcelFlowProfile();
  invalid.sheet_groups[0].decision_source = "invented_source";
  const rejected = await client.tool("search_labeled_checkpoints", { checkpoint: "final_excel_assembly", output_flow_profile: invalid });
  assert.equal(rejected.output_flow_selection.selection_ready, false);
  assert.ok(rejected.output_flow_selection.failures.some((value) => /invented_source.*user.*existing_project.*model_from_metadata.*caller_declared/.test(value)));

  const axisProfile = eventAxisProfile();
  axisProfile.axis_groups[0].decision_source = "semantic_definition";
  axisProfile.axis_groups[1].decision_source = { source: "explicit_user_request" };
  const axis = await client.tool("search_labeled_checkpoints", { checkpoint: "figures.event_study", event_study_axis_profile: axisProfile });
  assert.equal(axis.event_study_axis_selection.selection_ready, true, JSON.stringify(axis.event_study_axis_selection.failures));
  assert.equal(axis.event_study_axis_selection.axis_groups[0].decision_source, "model_from_metadata");
  assert.equal(axis.event_study_axis_selection.axis_groups[1].decision_source, "user");
});

test("whole-flow profile separates semantic groups from workbook placements", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const repeated = repeatedWorkbookExcelFlowProfile();
  const accepted = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: repeated,
  });
  assert.equal(accepted.output_flow_selection.selection_ready, true, JSON.stringify(accepted.output_flow_selection.failures));
  assert.equal(accepted.output_flow_selection.sheet_groups.length, 2);
  assert.equal(accepted.output_flow_selection.sheet_plan.length, 4);

  repeated.sheet_plan[3] = { ...repeated.sheet_plan[3], workbook: "table_all.xlsx", sheet: "family_a" };
  const rejected = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: repeated,
  });
  assert.equal(rejected.output_flow_selection.selection_ready, false);
  assert.ok(rejected.output_flow_selection.failures.some((failure) => failure.includes("duplicate physical workbook/sheet placements")));
});

test("separate one-sheet workbooks stay direct even when the semantic group is reused", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: oneGroupRepeatedWorkbookFlowProfile(),
  });
  assert.equal(result.output_flow_selection.selection_ready, true, JSON.stringify(result.output_flow_selection.failures));
  assert.equal(result.output_flow_selection.sheet_groups.length, 1);
  assert.equal(result.output_flow_selection.sheet_plan.length, 2);
  assert.equal(result.output_flow_selection.recommended_label_id, null);
  assert.equal(result.output_flow_selection.selection_class, "direct_single_sheet_workbook");
  assert.equal(result.output_flow_selection.maximum_sheet_count_per_workbook, 1);
  assert.equal(result.results.length, 0);
});

test("sheet grouping is evidence-backed and independent from selective event-study axis grouping", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const mixedUnits = groupedExcelFlowProfile();
  mixedUnits.outcomes[1].unit = "percent";
  mixedUnits.outcomes[1].transform = "share";
  const flow = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: mixedUnits,
  });
  assert.equal(flow.output_flow_selection.selection_ready, true);
  assert.equal(flow.output_flow_selection.recommended_label_id, "export.regression_excel.from_ster_default_style.v1");

  const axis = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: eventAxisProfile(),
  });
  assert.equal(axis.event_study_axis_selection.selection_ready, true);
  assert.equal(axis.event_study_axis_selection.axis_groups[0].axis_mode, "fixed_group");
  assert.equal(axis.event_study_axis_selection.axis_groups[1].axis_mode, "automatic");

  const invalidAutomatic = eventAxisProfile();
  invalidAutomatic.axis_groups[1].range = { min: -1, max: 1, step: 0.5 };
  const blockedAutomatic = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: invalidAutomatic,
  });
  assert.equal(blockedAutomatic.event_study_axis_selection.selection_ready, false);
  assert.ok(blockedAutomatic.event_study_axis_selection.failures.some((value) => /must not declare a fixed range/.test(value)));

  const unsupportedFixed = eventAxisProfile();
  unsupportedFixed.axis_groups[0].grouping_evidence = [];
  const blockedFixed = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: unsupportedFixed,
  });
  assert.equal(blockedFixed.event_study_axis_selection.selection_ready, false);
  assert.ok(blockedFixed.event_study_axis_selection.failures.some((value) => /lacks grouping_evidence/.test(value)));

  const mixed = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: mixedEventAxisProfile(),
  });
  assert.equal(mixed.event_study_axis_selection.selection_ready, true);
  assert.equal(mixed.event_study_axis_pattern_gate.active, true);
  assert.deepEqual(mixed.results.map((row) => row.label_id), ["figure.event_study_flat_loop_mixed_axis.v1"]);
  assert.equal(mixed.results[0].rubric_classification, "reference_only");
  assert.equal(mixed.results[0].auto_select_allowed, false);
  assert.ok(mixed.event_study_axis_pattern_gate.excluded_label_ids.includes("figure.event_study_flat_loop_automatic.v1"));

  const invalidMixedProfile = mixedEventAxisProfile();
  invalidMixedProfile.axis_groups = invalidMixedProfile.axis_groups.filter((group) => group.axis_mode === "automatic");
  invalidMixedProfile.expected_plots = invalidMixedProfile.expected_plots.slice(2);
  const invalidMixed = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: invalidMixedProfile,
  });
  assert.equal(invalidMixed.event_study_axis_selection.selection_ready, false);
  assert.equal(invalidMixed.results.length, 0);
  assert.ok(invalidMixed.event_study_axis_selection.failures.some((value) => /exactly one fixed_group/.test(value)));

  const duplicateExpectedProfile = mixedEventAxisProfile();
  duplicateExpectedProfile.expected_plots.push({ ...duplicateExpectedProfile.expected_plots[0] });
  const duplicateExpected = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: duplicateExpectedProfile,
  });
  assert.equal(duplicateExpected.event_study_axis_selection.selection_ready, false);
  assert.equal(duplicateExpected.results.length, 0);
  assert.ok(duplicateExpected.event_study_axis_selection.failures.some((value) => /duplicate expected event-study plots/.test(value)));

  const invalidSpanProfile = mixedEventAxisProfile();
  invalidSpanProfile.mixed_loop_binding.target_spans = [[0, 40]];
  const invalidSpan = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    event_study_axis_profile: invalidSpanProfile,
  });
  assert.equal(invalidSpan.event_study_axis_selection.selection_ready, false);
  assert.ok(invalidSpan.event_study_axis_selection.failures.some((value) => /mixed_loop_binding\.target_spans is invalid/.test(value)));
});

test("template input signatures expose verified matches and minimal target bindings", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    variant_id: "explicit_variable_renames_and_derived_fields",
    target_input_signature: {
      data_structure: "panel",
      observation_unit: "firm_id",
      time_structure: "declared time index year",
      required_keys: ["firm_id", "year"],
    },
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].input_signature.data_structure, "panel");
  assert.equal(result.results[0].input_signature_comparison.status, "minimal_binding_changes_required");
  assert.ok(result.results[0].input_signature_comparison.verified_matches.includes("data_structure"));
  assert.ok(result.results[0].input_signature_comparison.binding_changes.some((row) => row.field === "required_keys"));
  const mismatch = await client.tool("search_labeled_checkpoints", {
    variant_id: "explicit_variable_renames_and_derived_fields",
    target_input_signature: { data_structure: "cross_section", observation_unit: "firm_id", required_keys: ["firm_id"] },
  });
  assert.equal(mismatch.results.length, 0);
  assert.ok(mismatch.template_input_profile_gate.excluded_label_ids.includes("clean.explicit_rename_generate_keep.v1"));
});

test("linter reviews deep structural nesting while blocking positional research-spec dispatch", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const deep = await client.tool("lint_do_file", { content: [
    "if 1 {",
    "  if 1 {",
    "    if 1 {",
    "      if 1 {",
    '        display "opaque"',
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n") });
  assert.equal(deep.status, "needs_review");
  assert.ok(deep.findings.some((row) => row.rule === "deep_structural_nesting" && row.severity === "warning"));
  assert.equal(deep.summary.max_structural_depth, 4);

  const dispatcher = await client.tool("lint_do_file", { content: [
    'global plot_jobs ""',
    "foreach graph_job in $graph_jobs {",
    "  local outcome : word 1 of `graph_job'",
    "  local sample : word 2 of `graph_job'",
    "  local specification : word 3 of `graph_job'",
    "}",
    "foreach plot_job in $plot_jobs {",
    "  local outcome : word 1 of `plot_job'",
    "  local sample : word 2 of `plot_job'",
    "  local specification : word 3 of `plot_job'",
    "}",
  ].join("\n") });
  assert.equal(dispatcher.status, "blocked");
  assert.ok(dispatcher.findings.some((row) => row.rule === "encoded_research_spec_dispatch"));
  assert.equal(dispatcher.summary.max_loop_depth, 1);
  const abbreviatedDispatcher = await client.tool("lint_do_file", { content: [
    'gl plot_jobs ""',
    "foreach graph_job in $graph_jobs {",
    "  loc outcome : word 1 of `graph_job'",
    "  loca sample : word 2 of `graph_job'",
    "  loc specification : word 3 of `graph_job'",
    "}",
  ].join("\n") });
  assert.ok(abbreviatedDispatcher.findings.some((row) => row.rule === "encoded_research_spec_dispatch"));
});

test("planner keeps mixed-axis labels reference-only even for a ready mixed loop profile", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-mixed-axis-plan-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "analysis.do"), "estimates use outcome.ster\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const mixed = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "여러 outcome의 event-study PDF figure를 추가해줘",
    requested_checkpoints: ["figures.event_study"],
    available_state: {
      event_study_axis_profile: mixedEventAxisProfile(),
      input_profile: { data_structure: "stored e-class estimates" },
    },
  });
  const mixedIntervention = mixed.interventions.find((row) => row.headword === "figures.event_study");
  assert.equal(mixedIntervention.status, "no_compatible_labeled_variant", JSON.stringify(mixedIntervention));
  assert.equal(mixedIntervention.chosen_variant, null);
  assert.equal(mixedIntervention.general_rule_policy.implementation_allowed, true);
  assert.ok(mixedIntervention.evidence_progress.rubric_reference_only_variants.some((row) => row.label_id === "figure.event_study_flat_loop_mixed_axis.v1"));

  const ordinary = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "여러 outcome의 event-study PDF figure를 추가해줘",
    requested_checkpoints: ["figures.event_study"],
    available_state: { input_profile: { data_structure: "stored e-class estimates" } },
  });
  const ordinaryIntervention = ordinary.interventions.find((row) => row.headword === "figures.event_study");
  assert.notEqual(ordinaryIntervention.chosen_variant?.label_id, "figure.event_study_flat_loop_mixed_axis.v1");
});

test("narrow requests cannot be forced into overhaul by caller flags", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-partial-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "analysis.do"), 'use "analysis.dta", clear\nxtset firm_id year\nregress y x\n', "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const partial = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 Excel 표만 수정해줘",
    repair_mode: "overhaul",
    intent_mode: "overhaul",
    requested_checkpoints: ["final_excel_assembly"],
  });
  assert.equal(partial.mode, "partial");
  assert.notEqual(partial.intent, "overhaul");
  assert.ok(partial.scope_decision.warnings.some((value) => /cannot|partial repair/i.test(value)));
  assert.ok(partial.user_summary.confirmations_required.length <= 3);
  assert.equal(partial.observed_state.input_signature.data_structure, "panel");

  for (const request of [
    "기존 오버홀의 회귀 부분만 수정해줘",
    "기존 오버홀 결과에서 figures 부분만 고쳐줘",
    "Review only the regression macros in the existing overhaul result",
  ]) {
    const historicalMention = await client.tool("plan_dictionary_repairs", {
      path: root,
      request,
      repair_mode: "partial",
      intent_mode: "modify_existing",
      requested_checkpoints: ["estimation.conventional"],
    });
    assert.equal(historicalMention.mode, "partial", request);
    assert.notEqual(historicalMention.intent, "overhaul", request);
    assert.equal(historicalMention.scope_decision.explicit_overhaul_in_request, false, request);
  }

  const overhaul = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 workflow를 처음부터 새로 전면 재구축해줘",
    repair_mode: "auto",
  });
  assert.equal(overhaul.mode, "overhaul");
  assert.equal(overhaul.intent, "overhaul");
  assert.equal(overhaul.scope_decision.explicit_overhaul_in_request, true);
  assert.equal(overhaul.overhaul_prewrite_proposal.target_layout, "preserve_existing");
  assert.equal(overhaul.overhaul_prewrite_proposal.status, "needs_plan_details");
  assert.equal(overhaul.overhaul_prewrite_proposal.tree_markdown, null);
  assert.equal(overhaul.overhaul_prewrite_proposal.variables_pending_user_definition, true);
  assert.match(overhaul.write_rule, /tree_markdown.*planned_variables/i);

  const plannedExisting = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 workflow를 처음부터 새로 전면 재구축해줘",
    proposed_folders: ["do/analysis"],
    proposed_files: ["README.md", "do/analysis/30_results.do"],
    no_new_persistent_variables: true,
  });
  assert.equal(plannedExisting.overhaul_prewrite_proposal.status, "ready_for_user_confirmation");
  assert.match(plannedExisting.overhaul_prewrite_proposal.tree_markdown, /^project\//);
  assert.match(plannedExisting.overhaul_prewrite_proposal.tree_markdown, /├─ do\//);
  assert.match(plannedExisting.overhaul_prewrite_proposal.tree_markdown, /└─ analysis\//);
  assert.match(plannedExisting.overhaul_prewrite_proposal.tree_markdown, /└─ 30_results\.do/);
  assert.match(plannedExisting.overhaul_prewrite_proposal.tree_markdown, /README\.md/);
  assert.equal(plannedExisting.overhaul_prewrite_proposal.no_new_persistent_variables, true);

  const shortOverhaul = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "이 workflow를 오버홀해줘",
  });
  assert.equal(shortOverhaul.mode, "overhaul");
  assert.equal(shortOverhaul.scope_decision.explicit_overhaul_in_request, true);
});

test("new-project overhaul displays the compact tree and reader-facing variables before writes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-overhaul-preview-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "이 빈 프로젝트를 처음부터 새로 전면 재구축해줘",
    target_layout: "new_first_build",
    planned_variables: [{
      name: "treatment_post",
      reader_description: "정책 시행 이후 처치집단이면 1인 지표",
      analysis_role: "treatment",
      source_or_formula: "treatment × post",
      unit_observation_level: "0/1, 기업-연도",
      period_geography: "분석기간 전체, 전국",
      coding_missing: "두 구성변수 중 하나가 결측이면 결측",
      creation_file: "do/build_analysis_panel.do",
      used_in: "본문 회귀와 event-study",
    }],
  });
  const proposal = result.overhaul_prewrite_proposal;
  assert.equal(result.mode, "overhaul");
  assert.equal(proposal.status, "ready_for_user_confirmation");
  assert.match(proposal.tree_markdown, /├─ do\//);
  assert.match(proposal.tree_markdown, /├─ ster\//);
  assert.doesNotMatch(proposal.tree_markdown, /(?:work|manifests|output|logs)\//);
  assert.doesNotMatch(proposal.tree_markdown, /dependenc/i);
  assert.equal(proposal.planned_variables[0].reader_description, "정책 시행 이후 처치집단이면 1인 지표");
  assert.ok(proposal.readme_outline.some((row) => row.section === "분석 변수 안내"));
  assert.ok(proposal.variable_dictionary_columns.includes("creation_file"));
});

test("policy eval classifies good, review, and blocked patterns", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "eval_cases.json"), "utf8"));
  assert.equal(cases.length, 33);
  for (const item of cases) {
    const result = await client.tool("lint_do_file", { content: item.content });
    const expectedStatus = item.rule === "deep_structural_nesting" ? "needs_review" : item.status;
    assert.equal(result.status, expectedStatus, item.name);
    if (item.rule) assert.ok(result.findings.some((row) => row.rule === item.rule), item.name);
  }
});

test("event-study RHS preserves every declared nonreference level and forbids double-hash", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const blocked = await client.tool("lint_do_file", { content: "reghdfe outcome ib2019.year##i.treat2019, absorb(firm_id year)" });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.findings.some((row) => row.rule === "event_study_double_hash_main_effects"));
  const relativeDoubleHash = await client.tool("lint_do_file", { content: "reghdfe outcome i.rel_time##i.treated, absorb(firm_id year)" });
  assert.ok(relativeDoubleHash.findings.some((row) => row.rule === "event_study_double_hash_main_effects"));
  const relativeMissingBase = await client.tool("lint_do_file", { content: "reghdfe outcome i.relative_time#1.treated, absorb(firm_id year)" });
  assert.ok(relativeMissingBase.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"));
  for (const estimator of ["ppmlhdfe", "poisson", "logit", "qreg", "mixed"]) {
    const familyDouble = await client.tool("lint_do_file", { content: `${estimator} outcome i.year##i.treated` });
    assert.ok(familyDouble.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), estimator);
    const familyBase = await client.tool("lint_do_file", { content: `${estimator} outcome i.year#1.treated` });
    assert.ok(familyBase.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), estimator);
  }
  for (const modifier of ["quietly:", "capture:", "noisily:"]) {
    const modifierDouble = await client.tool("lint_do_file", { content: `${modifier} reghdfe outcome i.year##i.treated, absorb(firm_id year)` });
    assert.ok(modifierDouble.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), modifier);
    const modifierHidden = await client.tool("lint_do_file", { content: `global controls_current x1 x2\n${modifier} regress outcome $controls_current`, authoring_state: "new" });
    assert.ok(modifierHidden.findings.some((row) => row.rule === "regression_substantive_indirection"), modifier);
  }
  for (const interaction of ["i.year##treated", "year##i.treated", "year##treated"]) {
    const shorthandDouble = await client.tool("lint_do_file", { content: `regress outcome ${interaction}` });
    assert.ok(shorthandDouble.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), interaction);
  }
  for (const abbreviation of ["regr", "regre", "regres"]) {
    const abbreviated = await client.tool("lint_do_file", { content: `${abbreviation} outcome i.year##i.treated` });
    assert.ok(abbreviated.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), abbreviation);
  }
  for (const interaction of ["i.year#treated", "year#1.treated"]) {
    const shorthandSingle = await client.tool("lint_do_file", { content: `regress outcome ${interaction}` });
    assert.ok(shorthandSingle.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), interaction);
  }
  for (const interaction of ["c.year##i.treated", "i.treated##c.year", "c.rel_time#i.treated", "i.treated#c.rel_time"]) {
    const continuous = await client.tool("lint_do_file", { content: `regress outcome ${interaction}` });
    assert.equal(continuous.findings.some((row) => /event_study_(?:double_hash|single_hash)/.test(row.rule)), false, interaction);
  }
  const missingBase = await client.tool("lint_do_file", { content: "reghdfe outcome i.year#1.treat2019, absorb(firm_id year)" });
  assert.equal(missingBase.status, "blocked");
  assert.ok(missingBase.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"));
  const compactSelectedLevels = await client.tool("lint_do_file", { content: "reghdfe outcome i(2015/2018 2020/2024).year#1.treat2019, absorb(firm_id year##c.baseline_control)" });
  assert.equal(compactSelectedLevels.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  const compactWrongWindow = await client.tool("lint_do_file", { content: "reghdfe outcome i(2015/2024).year#1.treat2019, absorb(firm_id year)" });
  assert.ok(compactWrongWindow.findings.some((row) => row.rule === "event_study_compact_reference_not_unique"));
  const boundaryReference = await client.tool("lint_do_file", { content: "reghdfe outcome 2016bn.year#1.treat2019 2017bn.year#1.treat2019, absorb(firm_id year)" });
  assert.equal(boundaryReference.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  assert.equal(boundaryReference.findings.some((row) => row.rule === "event_study_compact_reference_not_unique"), false);
  const compactInvalid = await client.tool("lint_do_file", { content: "reghdfe outcome i(foo).year#1.treat2019, absorb(firm_id year)" });
  assert.ok(compactInvalid.findings.some((row) => row.rule === "event_study_compact_numlist_invalid"));
  const compactDifferentReference = await client.tool("lint_do_file", { content: "reghdfe outcome i(2015/2017 2019/2024).year#1.treat2019, absorb(firm_id year)" });
  assert.equal(compactDifferentReference.findings.some((row) => row.rule === "event_study_compact_reference_not_unique"), false);
  const negativeCompact = await client.tool("lint_do_file", { content: "reghdfe outcome i(-4/-1 1/4).rel_time#1.treated, absorb(firm_id year)" });
  assert.ok(negativeCompact.findings.some((row) => row.rule === "event_study_compact_numlist_invalid"));
  const negativeFlat = await client.tool("lint_do_file", { content: "reghdfe outcome -5bn.rel_time#1.treated -4bn.rel_time#1.treated 1bn.rel_time#1.treated, absorb(firm_id year)" });
  assert.ok(negativeFlat.findings.some((row) => row.rule === "event_study_negative_factor_level_invalid"));
  for (const content of [
    "reghdfe outcome i(32738 32740/32741).year#1.treated, absorb(firm_id year)",
    "reghdfe outcome 32741bn.year#1.treated, absorb(firm_id year)",
    "reghdfe outcome ib32741.year#1.treated, absorb(firm_id year)",
  ]) {
    const outOfRange = await client.tool("lint_do_file", { content });
    assert.ok(outOfRange.findings.some((row) => row.rule === "event_study_factor_level_out_of_range"), content);
  }
  for (const content of [
    "reghdfe outcome i(32738 32740).year#1.treated, absorb(firm_id year)",
    "reghdfe outcome 32740bn.year#1.treated, absorb(firm_id year)",
  ]) {
    const upperBoundary = await client.tool("lint_do_file", { content });
    assert.equal(upperBoundary.findings.some((row) => row.rule === "event_study_factor_level_out_of_range"), false, content);
  }
  for (const unsafeNumlist of ["-1000000000 1000000000", "9007199254740992"]) {
    const unsafe = await client.tool("lint_do_file", { content: `reghdfe outcome i(${unsafeNumlist}).year#1.treated, absorb(firm_id year)` });
    assert.ok(unsafe.findings.some((row) => row.rule === "event_study_compact_numlist_invalid"), unsafeNumlist);
  }
  const repeatedRanges = Array.from({ length: 201 }, () => "0/10000").join(" ");
  const repeated = await client.tool("lint_do_file", { content: `reghdfe outcome i(${repeatedRanges}).year#1.treated, absorb(firm_id year)` });
  assert.ok(repeated.findings.some((row) => row.rule === "event_study_compact_numlist_invalid"));
  const invalidIbnNumlist = await client.tool("lint_do_file", { content: "reghdfe outcome ibn(2015/2018 2020/2024).year#1.treat2019, absorb(firm_id year##c.baseline_control)" });
  assert.ok(invalidIbnNumlist.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"));
  const permitted = await client.tool("lint_do_file", { content: "reghdfe outcome 2015bn.year#1.treat2019 2016bn.year#1.treat2019 2017bn.year#1.treat2019 2018bn.year#1.treat2019 2020bn.year#1.treat2019 2021bn.year#1.treat2019 2022bn.year#1.treat2019 2023bn.year#1.treat2019 2024bn.year#1.treat2019, absorb(firm_id year##c.baseline_control)" });
  assert.equal(permitted.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), false);
  assert.equal(permitted.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  const macroCompact = await client.tool("lint_do_file", { content: 'local event_rhs "i(2015/2018 2020/2024).year#1.treat2019"\nreghdfe outcome `event_rhs\', absorb(firm_id year)', authoring_state: "new" });
  assert.equal(macroCompact.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  assert.ok(macroCompact.findings.some((row) => row.rule === "local_macro_without_lexical_need"));
  assert.ok(macroCompact.findings.some((row) => row.rule === "regression_substantive_indirection"));
  const macroLevelList = await client.tool("lint_do_file", { content: 'global event_rhs "2015bn.year#1.treat2019 2016bn.year#1.treat2019 2017bn.year#1.treat2019 2018bn.year#1.treat2019 2020bn.year#1.treat2019 2021bn.year#1.treat2019 2022bn.year#1.treat2019 2023bn.year#1.treat2019 2024bn.year#1.treat2019"\nreghdfe outcome $event_rhs, absorb(firm_id year)', authoring_state: "new" });
  assert.equal(macroLevelList.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  assert.ok(macroLevelList.findings.some((row) => row.rule === "regression_substantive_indirection"));
  const selectorFixture = fs.readFileSync(path.join(__dirname, "fixtures", "event_reference_slot_runtime.do"), "utf8");
  const selectorOnly = await client.tool("lint_do_file", { content: selectorFixture });
  assert.equal(selectorOnly.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  const namedEventTerms = await client.tool("lint_do_file", { content: 'local event_terms "2016.year#1.treat2019 2017.year#1.treat2019"\nreghdfe outcome `event_terms\', absorb(firm_id year)' });
  assert.ok(namedEventTerms.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"));
  const explicitBase = await client.tool("lint_do_file", { content: "reghdfe outcome ib2019.year#1.treat2019, absorb(firm_id year)" });
  assert.equal(explicitBase.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false);
  const levelDoubleHash = await client.tool("lint_do_file", { content: "reghdfe outcome 2015bn.year##1.treat2019, absorb(firm_id year)" });
  assert.ok(levelDoubleHash.findings.some((row) => row.rule === "event_study_double_hash_main_effects"));
  const reversedMissingBase = await client.tool("lint_do_file", { content: "reghdfe outcome 1.treat2019#i.year, absorb(firm_id year)" });
  assert.ok(reversedMissingBase.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"));
});

test("newly authored regressions keep substantive choices at zero reference depth", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const readable = [
    "global outcomes female_bm sales_growth_real",
    "foreach outcome of global outcomes {",
    "    reghdfe `outcome' i(2015/2018 2020/2024).year#1.treat2019 x1 x2, absorb(fid year) vce(cluster fid)",
    "}",
  ].join("\n");
  const passed = await client.tool("lint_do_file", { content: readable, authoring_state: "new" });
  assert.equal(passed.findings.some((row) => row.rule === "regression_substantive_indirection"), false, JSON.stringify(passed.findings));
  assert.equal(passed.findings.some((row) => row.rule === "local_macro_without_lexical_need"), false, JSON.stringify(passed.findings));

  const hidden = [
    "global controls_current x1 x2",
    "global sample_current analysis_sample == 1",
    "reghdfe outcome $controls_current if $sample_current, absorb(fid year) vce(cluster fid)",
  ].join("\n");
  const blocked = await client.tool("lint_do_file", { content: hidden, authoring_state: "new" });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.findings.some((row) => row.rule === "regression_substantive_indirection"));

  const escapedIterator = await client.tool("lint_do_file", {
    content: "foreach outcome in y1 y2 {\n    display `\"`outcome'\"'\n}\nregress `outcome' x, vce(cluster id)",
    authoring_state: "new",
  });
  assert.equal(escapedIterator.status, "blocked");
  assert.ok(escapedIterator.findings.some((row) => row.rule === "regression_substantive_indirection"));

  for (const commandMacro of [
    "global estimator regress\n$estimator outcome i.year##i.treated",
    "global model reghdfe\n$model outcome i.year#1.treated, absorb(fid year)",
    "global cmd regress\nglobal controls_current x1 x2\n$cmd outcome $controls_current",
    "global estimator regress\nversion 18: $estimator outcome i.year##i.treated",
    "global estimator regress\nmi estimate: $estimator outcome i.year##i.treated",
    "global estimator regress\nmi est: $estimator outcome i.year##i.treated",
    "global estimator regress\nmi esti: $estimator outcome i.year##i.treated",
    "global estimator regress\nby fid: $estimator outcome i.year##i.treated",
    "global estimator regress\nbys fid: $estimator outcome i.year##i.treated",
    "global estimator regress\nbyso fid: $estimator outcome i.year##i.treated",
    "global estimator regress\ncollect: $estimator outcome i.year##i.treated",
    "global estimator regress\nstepwise: $estimator outcome i.year##i.treated",
  ]) {
    const hiddenCommand = await client.tool("lint_do_file", { content: commandMacro, authoring_state: "new" });
    assert.equal(hiddenCommand.status, "blocked");
    assert.ok(hiddenCommand.findings.some((row) => row.rule === "command_position_macro_indirection"));
  }

  const existingHiddenCommand = await client.tool("lint_do_file", { content: "global cmd erase\n$cmd source.dta" });
  assert.equal(existingHiddenCommand.status, "needs_review");
  assert.ok(existingHiddenCommand.findings.some((row) => row.rule === "command_position_macro_indirection"));

  for (const content of ["`1' source.dta", "`=\"erase\"' source.dta"]) {
    const positionalCommand = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.equal(positionalCommand.status, "blocked");
    assert.ok(positionalCommand.findings.some((row) => row.rule === "command_position_macro_indirection"));
  }

  for (const content of ["``cmd'' source.dta", "quietly: ``cmd'' source.dta"]) {
    const nestedCommand = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.equal(nestedCommand.status, "blocked");
    assert.ok(nestedCommand.findings.some((row) => row.rule === "command_position_macro_indirection"));
  }

  for (const [content, rule] of [
    ["global cardinality m:m\nmerge $cardinality id using bad.dta", "merge_contract_macro_indirection"],
    ["global destructive force\nduplicates drop id, $destructive", "destructive_option_macro_indirection"],
    ["global verb install\nssc $verb outreg2", "runtime_install_macro_indirection"],
    ["global rowfilter keep(x)\noutreg2 using \"table.xls\", excel replace nor2 $rowfilter", "outreg2_option_macro_indirection"],
    ["global terms *year*\ncoefplot, keep($terms) order($terms) vertical", "coefplot_selector_not_exact"],
    ["merge `1' id using bad.dta", "merge_contract_macro_indirection"],
    ["outreg2 using \"table.xls\", excel replace nor2 `1'", "outreg2_option_macro_indirection"],
    ["global comma ,\noutreg2 using \"table.xls\" $comma excel replace nor2 nocons", "outreg2_option_macro_indirection"],
    ["local comma ,\noutreg2 using \"table.xls\" `comma' excel replace nor2 nocons", "outreg2_option_macro_indirection"],
    ["global comma ,\noutreg2 using table.xls$comma excel replace nor2 nocons", "outreg2_option_macro_indirection"],
    ["global target table.xls,\noutreg2 using $target excel replace nor2 nocons", "outreg2_option_macro_indirection"],
    ["global comma ,\noutreg2 using table$comma.xls excel replace nor2 nocons", "outreg2_option_macro_indirection"],
    ["global target table,\noutreg2 using ${target}.xls excel replace nor2 nocons", "outreg2_option_macro_indirection"],
  ]) {
    const criticalMacro = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.equal(criticalMacro.status, "blocked");
    assert.ok(criticalMacro.findings.some((row) => row.rule === rule), rule);
  }

  for (const [content, rule] of [
    ["quietly: merge m:m id using bad.dta", "merge_m_m"],
    ["capture: erase \"source.dta\"", "destructive_delete"],
    ["quietly: shell del important.dta", "process_escape"],
    ["version 18: merge m:m id using bad.dta", "merge_m_m"],
    ["vers 18: merge m:m id using bad.dta", "merge_m_m"],
    ["bys id: regress y i.year##i.treated", "event_study_double_hash_main_effects"],
    ["byso id: regress y i.year##i.treated", "event_study_double_hash_main_effects"],
    ["capture noisily: ssc install outreg2", "runtime_install"],
    ["capture: run \"do/stage.do\"", "broad_capture"],
    ["capture ru \"do/stage.do\"", "broad_capture"],
    ["cap include \"do/stage.do\"", "broad_capture"],
    ["quietly capture do \"do/stage.do\"", "broad_capture"],
    ["quietly capture ru \"do/stage.do\"", "broad_capture"],
    ["noisily: cap include \"do/stage.do\"", "broad_capture"],
    ["version 18: capture run \"do/stage.do\"", "broad_capture"],
    ["quietly: duplicates drop id, force", "duplicates_drop_force"],
    ["quietly: outreg2 using \"table.xlsx\", excel replace keep(x)", "outreg2_raw_rows_modified"],
  ]) {
    const prefixedSafety = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.ok(prefixedSafety.findings.some((row) => row.rule === rule), `${rule}: ${content}`);
  }
  const benignCapture = await client.tool("lint_do_file", { content: "quietly capture confirm variable optional_id", authoring_state: "new" });
  assert.equal(benignCapture.findings.some((row) => row.rule === "broad_capture"), false);
  for (const modifier of ["qui", "quie", "quiet", "quietl", "quietly"]) {
    const abbreviated = await client.tool("lint_do_file", { content: `${modifier} capture ru "do/stage.do"`, authoring_state: "new" });
    assert.ok(abbreviated.findings.some((row) => row.rule === "broad_capture"), modifier);
  }
  for (const modifier of ["n", "no", "noi", "nois", "noisi", "noisil", "noisily"]) {
    const abbreviated = await client.tool("lint_do_file", { content: `${modifier} capture include "do/stage.do"`, authoring_state: "new" });
    assert.ok(abbreviated.findings.some((row) => row.rule === "broad_capture"), modifier);
  }
  for (const modifier of ["cap", "capt", "captu", "captur", "capture"]) {
    const abbreviated = await client.tool("lint_do_file", { content: `quietly ${modifier} run "do/stage.do"`, authoring_state: "new" });
    assert.ok(abbreviated.findings.some((row) => row.rule === "broad_capture"), modifier);
  }
  for (const modifier of ["qu", "noisilyx", "ca"]) {
    const nearMiss = await client.tool("lint_do_file", { content: `${modifier} capture ru "do/stage.do"`, authoring_state: "new" });
    assert.equal(nearMiss.findings.some((row) => row.rule === "broad_capture"), false, modifier);
  }
  for (const command of [
    "do \"do/stage.do\", nostop",
    "run \"do/stage.do\", nostop",
    "ru \"do/stage.do\", nostop",
    "quietly: do \"do/stage.do\", nostop",
    "version 18: run \"do/stage.do\", nostop",
  ]) {
    const failMaskingCall = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(failMaskingCall.status, "blocked", command);
    assert.ok(failMaskingCall.findings.some((row) => row.rule === "master_call_nostop"), command);
  }
  for (const command of [
    "do \"do/nostop.do\"",
    "run \"do/nostop, stage.do\"",
    "ru do/nostop.do",
    "do \"$do/stage.do\"",
    "run \"${do}/stage.do\"",
  ]) {
    const filenameSibling = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(filenameSibling.findings.some((row) => row.rule === "master_call_nostop"), false, command);
    assert.equal(filenameSibling.findings.some((row) => row.rule === "master_call_option_macro_indirection"), false, command);
  }
  for (const command of [
    "do \"do/stage.do\" $callopts",
    "run \"do/stage.do\" ${callopts}",
    "ru \"$do/stage.do\" $callopts",
    "do \"do/stage.do\", $callopts",
    "run \"do/stage.do\" `callopts'",
  ]) {
    const hiddenCallOptions = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(hiddenCallOptions.status, "blocked", command);
    assert.ok(hiddenCallOptions.findings.some((row) => row.rule === "master_call_option_macro_indirection"), command);
  }
  for (const command of [
    "do $target",
    "run ${target}",
    "ru `target'",
    "do `1'",
    "run `2'",
    "do \"`0'/stage.do\"",
    "run \"`1'/stage.do\"",
    "ru \"`12'/stage.do\"",
    "do `=cond(1,\"do/stage.do, nostop\",\"\")'",
    "do \"$stagefile\"",
    "run \"${target}\"",
    "ru \"do/$stagefile\"",
    "do \"$root/$stage.do\"",
    "run \"${root}/do/${stage}.do\"",
    "ru \"$root/stage`ext'.do\"",
  ]) {
    const hiddenWholeTarget = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(hiddenWholeTarget.status, "blocked", command);
    assert.ok(hiddenWholeTarget.findings.some((row) => row.rule === "master_call_option_macro_indirection"), command);
  }
  for (const role of ["helper", "auto"]) {
    for (const command of ["do $target", "run `target'", "do `1'"]) {
      const helperWholeTarget = await client.tool("lint_do_file", { content: command, role, authoring_state: "new" });
      assert.ok(helperWholeTarget.findings.some((row) => row.rule === "master_call_option_macro_indirection"), `${role}: ${command}`);
    }
  }
  for (const command of [
    "do \"$PROJECT_ROOT/do/stage.do\"",
    "run ${PROJECT_ROOT}/do/stage.do",
    "ru `root'/do/stage.do",
  ]) {
    const explicitRootPath = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(explicitRootPath.findings.some((row) => row.rule === "master_call_option_macro_indirection"), false, command);
  }
  const helperArguments = await client.tool("lint_do_file", {
    content: "do \"worker.do\" $dataset",
    role: "helper",
    authoring_state: "new",
  });
  assert.equal(helperArguments.findings.some((row) => row.rule === "master_call_option_macro_indirection"), false);
  for (const role of ["helper", "auto"]) {
    const helperNostop = await client.tool("lint_do_file", {
      content: "do \"worker.do\", nostop",
      role,
      authoring_state: "new",
    });
    assert.equal(helperNostop.status, "blocked", role);
    assert.ok(helperNostop.findings.some((row) => row.rule === "master_call_nostop"), role);
  }
  for (const content of [
    "global callopts nostop\ndo \"worker.do\", $callopts",
    "local callopts nostop\nrun \"worker.do\", `callopts'",
    "global callopts , nostop\ndo \"worker.do\" $callopts",
    "global callopts = \", nostop\"\ndo \"worker.do\" $callopts",
    "global callopts=\", nostop\"\ndo \"worker.do\" $callopts",
    "local callopts=\", nostop\"\nrun \"worker.do\" `callopts'",
    "global callopts = \", \" + \"no\" + \"stop\"\nrun \"worker.do\" $callopts",
  ]) {
    const helperMacroNostop = await client.tool("lint_do_file", { content, role: "helper", authoring_state: "new" });
    assert.equal(helperMacroNostop.status, "blocked", content);
    assert.ok(helperMacroNostop.findings.some((row) => ["master_call_nostop", "master_call_option_macro_indirection"].includes(row.rule)), content);
  }
  for (const command of ["gl", "glo", "glob", "globa", "global", "loc", "loca", "local"]) {
    const sigil = command.startsWith("g") ? "$callopts" : "`callopts'";
    const abbreviatedMacro = await client.tool("lint_do_file", {
      content: `${command} callopts=", nostop"\ndo "worker.do" ${sigil}`,
      role: "helper",
      authoring_state: "new",
    });
    assert.ok(abbreviatedMacro.findings.some((row) => row.rule === "master_call_nostop"), command);
  }
  for (const command of ["g", "lo"]) {
    const nearMissMacro = await client.tool("lint_do_file", {
      content: `${command} callopts=", nostop"\ndo "worker.do" $callopts`,
      role: "helper",
      authoring_state: "new",
    });
    assert.equal(nearMissMacro.findings.some((row) => row.rule === "master_call_nostop"), false, command);
  }
  for (const content of [
    "args callopts\ndo \"worker.do\" `callopts'",
    "do \"worker.do\" `1'",
  ]) {
    const positionalOption = await client.tool("lint_do_file", { content, role: "helper", authoring_state: "new" });
    assert.ok(positionalOption.findings.some((row) => row.rule === "master_call_option_macro_indirection"), content);
  }
  for (const content of [
    "global callopts : environment STATA_CALL_OPTS\ndo \"worker.do\" $callopts",
    "gl callopts : copy global upstream\ndo \"worker.do\" $callopts",
    "local callopts : subinstr global upstream \"safe\" \"\", all\ndo \"worker.do\" `callopts'",
  ]) {
    const extendedMacro = await client.tool("lint_do_file", { content, role: "helper", authoring_state: "new" });
    assert.ok(extendedMacro.findings.some((row) => row.rule === "master_call_option_macro_indirection"), content);
  }
  const quotedColonLiteral = await client.tool("lint_do_file", {
    content: "global callopts \": safe_arg\"\ndo \"worker.do\" $callopts",
    role: "helper",
    authoring_state: "new",
  });
  assert.equal(quotedColonLiteral.findings.some((row) => ["master_call_nostop", "master_call_option_macro_indirection"].includes(row.rule)), false);
  const programScopedLocal = await client.tool("lint_do_file", {
    content: "program define p\nlocal callopts , nostop\ndo \"inside.do\" `callopts'\nend\np\ndo \"outside.do\" `callopts'",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(programScopedLocal.findings.some((row) => row.line === 3 && row.rule === "master_call_nostop"));
  assert.equal(programScopedLocal.findings.some((row) => row.line === 6 && row.rule === "master_call_nostop"), false);
  const outerLocalRestored = await client.tool("lint_do_file", {
    content: "local callopts safe_arg\nprogram define p\nlocal callopts , nostop\nend\ndo \"outside.do\" `callopts'",
    role: "helper",
    authoring_state: "new",
  });
  assert.equal(outerLocalRestored.findings.some((row) => row.rule === "master_call_nostop"), false);
  const lateUnsafeProgram = await client.tool("lint_do_file", {
    content: "global callopts safe_arg\nprogram define p\ndo \"worker.do\" $callopts\nend\nglobal callopts=\", nostop\"\np",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(lateUnsafeProgram.findings.some((row) => row.line === 3 && row.rule === "master_call_nostop"));
  const lateSafeProgram = await client.tool("lint_do_file", {
    content: "global callopts , nostop\nprogram define p\ndo \"worker.do\" $callopts\nend\nglobal callopts safe_arg\np",
    role: "helper",
    authoring_state: "new",
  });
  assert.equal(lateSafeProgram.findings.some((row) => row.rule === "master_call_nostop"), false);
  const programSetsGlobal = await client.tool("lint_do_file", {
    content: "program define p\nglobal callopts , nostop\nend\np\ndo \"worker.do\" $callopts",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(programSetsGlobal.findings.some((row) => row.line === 5 && row.rule === "master_call_nostop"));
  const uninvokedLiteralProgram = await client.tool("lint_do_file", {
    content: "program define p\ndo \"worker.do\", nostop\nend",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(uninvokedLiteralProgram.findings.some((row) => row.line === 2 && row.rule === "master_call_nostop"));
  for (const header of ["pr def p", "pro de p", "prog defi p", "program p", "program define p"]) {
    const officialProgramSyntax = await client.tool("lint_do_file", {
      content: `${header}\nlocal callopts , nostop\ndo \"worker.do\" \`callopts'\nend`,
      role: "helper",
      authoring_state: "new",
    });
    assert.ok(officialProgramSyntax.findings.some((row) => row.line === 3 && row.rule === "master_call_nostop"), header);
  }
  for (const header of ["version 18: program define p", "version 18, user: program define p", "program ///\n    define p", "vers 18: pr ///\n    def p"]) {
    const logicalProgramHeader = await client.tool("lint_do_file", {
      content: `${header}\ndo \"worker.do\", nostop\nend`,
      role: "helper",
      authoring_state: "new",
    });
    assert.equal(logicalProgramHeader.summary.program_definitions, 1, header);
    assert.ok(logicalProgramHeader.findings.some((row) => row.rule === "master_call_nostop"), header);
  }
  const nestedProgramCall = await client.tool("lint_do_file", {
    content: "pr def q\ndo \"worker.do\", nostop\nend\npr def p\nq\nend\np",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(nestedProgramCall.findings.some((row) => row.line === 2 && row.rule === "master_call_nostop"));
  for (const dropCommand of ["pr drop p q", "pro drop p q", "program drop p q", "pr drop _all", "pro drop _all", "program drop _all"]) {
    const droppedPrograms = await client.tool("lint_do_file", {
      content: `global opts safe_arg\nprogram p\nglobal opts , nostop\nend\nprogram q\nend\n${dropCommand}\ncapture p\ndo \"worker.do\" $opts`,
      role: "helper",
      authoring_state: "new",
    });
    assert.equal(droppedPrograms.findings.some((row) => row.line === 9 && row.rule === "master_call_nostop"), false, dropCommand);
  }
  const dropAllAdoKeepsDoFilePrograms = await client.tool("lint_do_file", {
    content: "global opts safe_arg\nprogram p\nglobal opts , nostop\nend\nprogram drop _allado\np\ndo \"worker.do\" $opts",
    role: "helper",
    authoring_state: "new",
  });
  assert.ok(dropAllAdoKeepsDoFilePrograms.findings.some((row) => row.line === 7 && row.rule === "master_call_nostop"));
  for (const syntaxLine of ["syntax anything", "syntax anything(name=callopts)"]) {
    const syntaxCarrier = await client.tool("lint_do_file", {
      content: `program define p\n${syntaxLine}\ndo \"worker.do\" \`${syntaxLine.includes("name=") ? "callopts" : "anything"}'\nend\np`,
      role: "helper",
      authoring_state: "new",
    });
    assert.ok(syntaxCarrier.findings.some((row) => row.rule === "master_call_option_macro_indirection"), syntaxLine);
  }
  for (const content of [
    "global opts safe_arg\nglobal opts = cond(1, \", nostop\", \"\")\ndo \"worker.do\" $opts",
    "global opts , nostop\nglobal opts = cond(1, \"safe_arg\", \"safe_arg\")\ndo \"worker.do\" $opts",
  ]) {
    const redefinedMacro = await client.tool("lint_do_file", { content, role: "helper", authoring_state: "new" });
    assert.ok(redefinedMacro.findings.some((row) => row.rule === "master_call_option_macro_indirection"), content);
    assert.equal(redefinedMacro.findings.some((row) => row.rule === "master_call_nostop"), false, content);
  }
  for (const command of [
    "do \"do/stage.do\" skip_checks",
    "run \"do/stage.do\" \"alternate sample\"",
    "ru \"do/stage.do\" 1",
    "include \"do/defs.do\", adopath",
  ]) {
    const indirectMasterCall = await client.tool("lint_do_file", { content: command, role: "master", authoring_state: "new" });
    assert.equal(indirectMasterCall.status, "blocked", command);
    assert.ok(indirectMasterCall.findings.some((row) => row.rule === "master_call_not_direct"), command);
  }

  for (const [content, rule] of [
    ["/* audit */ /* rationale */ merge m:m id using bad.dta", "merge_m_m"],
    ["/* a */ /* b */ erase \"source.dta\"", "destructive_delete"],
    ["/* a */ /* b */ shell del important.dta", "process_escape"],
    ["/* a */ /* b */ ssc install outreg2", "runtime_install"],
    ["/* a */ /* b */ regress y i.year##i.treated", "event_study_double_hash_main_effects"],
    ["display \"prefix /* suffix\"\nshell del important.dta", "process_escape"],
    ["reghdfe y /// event\ni.year##i.treated, absorb(id year)", "event_study_double_hash_main_effects"],
    ["merge /// dangerous cardinality\nm:m id using bad.dta", "merge_m_m"],
    ["outreg2 using \"table.xls\", excel replace nor2 /// mutate rows\nkeep(x)", "outreg2_raw_rows_modified"],
  ]) {
    const parsedSafety = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.ok(parsedSafety.findings.some((row) => row.rule === rule), `${rule}: ${content}`);
  }

  for (const content of [
    "#delimit ;\nregress outcome\n i.year##i.treated\n;\n#delimit cr",
    "#delimit ;\nmerge\n m:m id year\n using bad.dta\n;\n#delimit cr",
  ]) {
    const delimited = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.equal(delimited.status, "blocked");
    assert.ok(delimited.findings.some((row) => row.rule === "nonstandard_command_delimiter"));
  }
  const existingDelimited = await client.tool("lint_do_file", {
    content: "#delimit ;\ndisplay 1; merge m:m id using bad.dta; erase source.dta;\n#delimit cr",
  });
  assert.equal(existingDelimited.status, "blocked");
  assert.ok(existingDelimited.findings.some((row) => row.rule === "nonstandard_command_delimiter"));

  for (const option of ["ctitle(\"Model 1\")", "nocons", "nonotes", "addnote(\"Custom\")", "sortvar(x y)"]) {
    const changedRawTable = await client.tool("lint_do_file", {
      content: `outreg2 using "table.xls", excel replace nor2 ${option}`,
      authoring_state: "new",
    });
    assert.equal(changedRawTable.status, "blocked");
    assert.ok(changedRawTable.findings.some((row) => row.rule === "outreg2_option_not_approved"), option);
  }


  for (const content of [
    'outreg2 using "table,final.xls", excel replace nor2',
  ]) {
    const commaBeforeOptions = await client.tool("lint_do_file", { content, authoring_state: "new" });
    assert.ok(!commaBeforeOptions.findings.some((row) => row.rule === "outreg2_option_not_approved"), content);
  }

  for (const command of [
    "logit outcome $controls_current",
    "qreg outcome $controls_current",
    "mixed outcome $controls_current || entity_id:",
    "mi estimate: regress outcome $controls_current",
    "mi est: regress outcome $controls_current",
    "mi esti: regress outcome $controls_current",
    "bootstrap: regress outcome $controls_current",
    "jackknife: regress outcome $controls_current",
    "statsby: regress outcome $controls_current",
    "xi: regress outcome $controls_current",
    "stepwise: regress outcome $controls_current",
    "rolling _b, window(10): regress outcome $controls_current",
    "permute treated _b[treated], reps(2): regress outcome $controls_current",
    "stepwise, pr(`p'): regress outcome $controls_current",
    "rolling `p', window(10): regress outcome $controls_current",
    "collect: regress outcome $controls_current",
    "frame other: regress outcome $controls_current",
    "simulate b=_b[treated], reps(10): regress outcome $controls_current",
    "version 18: regress outcome $controls_current",
    "bayes: regress outcome $controls_current",
    "fmm 2: regress outcome $controls_current",
    "mfp: regress outcome $controls_current",
    "bayesboot: regress outcome $controls_current",
  ]) {
    const result = await client.tool("lint_do_file", { content: command, authoring_state: "new" });
    assert.ok(result.findings.some((row) => row.rule === "regression_substantive_indirection"), command);
  }
  for (const command of [
    "mi estimate: regress outcome i.year##i.treated",
    "bootstrap: regress outcome i.year##i.treated",
    "by cohort: regress outcome i.year##i.treated",
    "xi: regress outcome i.year##i.treated",
    "stepwise: regress outcome i.year##i.treated",
    "rolling _b, window(10): regress outcome i.year##i.treated",
    "permute treated _b[treated], reps(2): regress outcome i.year##i.treated",
    "stepwise, pr(`p'): regress outcome i.year##i.treated",
    "rolling `p', window(10): regress outcome i.year##i.treated",
    "collect: regress outcome i.year##i.treated",
    "frame other: regress outcome i.year##i.treated",
    "simulate b=_b[treated], reps(10): regress outcome i.year##i.treated",
    "version 18: regress outcome i.year##i.treated",
    "bayes: regress outcome i.year##i.treated",
    "fmm 2: regress outcome i.year##i.treated",
    "mfp: regress outcome i.year##i.treated",
    "bayesboot: regress outcome i.year##i.treated",
  ]) {
    const result = await client.tool("lint_do_file", { content: command, authoring_state: "new" });
    assert.ok(result.findings.some((row) => row.rule === "event_study_double_hash_main_effects"), command);
  }
  for (const nonEstimator of [
    'display "note: regress y i.year##i.treated"',
    'file write handle "note: regress y i.year##i.treated"',
  ]) {
    const result = await client.tool("lint_do_file", { content: nonEstimator, authoring_state: "new" });
    assert.equal(result.findings.some((row) => /event_study_|regression_substantive_indirection/.test(row.rule)), false, nonEstimator);
  }
});

test("substantive macro alias chains are blocked but directory roots may compose", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const aliases = await client.tool("lint_do_file", {
    content: [
      "global controls_base x1 x2",
      "global controls_2019 $controls_base x3",
      "global controls_current $controls_2019",
      'display "$controls_current"',
    ].join("\n"),
    authoring_state: "new",
  });
  assert.equal(aliases.status, "blocked");
  assert.equal(aliases.findings.filter((row) => row.rule === "substantive_macro_alias_chain").length, 2);
  const directories = await client.tool("lint_do_file", {
    content: 'global project "C:/research"\nglobal data "$project/data"\nuse "$data/source.dta", clear',
    authoring_state: "new",
  });
  assert.equal(directories.findings.some((row) => row.rule === "substantive_macro_alias_chain"), false);
});

test("local macros require lexical scope while program, loop, and immediate returned results remain allowed", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const blocked = await client.tool("lint_do_file", {
    content: 'local controls "x1 x2"\nregress outcome `controls\'',
    authoring_state: "new",
  });
  assert.ok(blocked.findings.some((row) => row.rule === "local_macro_without_lexical_need"));
  const allowed = await client.tool("lint_do_file", {
    content: [
      "foreach outcome in y1 y2 {",
      "    local graph_name \"`outcome'_plot\"",
      "    display \"`graph_name'\"",
      "}",
      "quietly summarize y1, meanonly",
      "local ymean = r(mean)",
      "display `ymean'",
      "program define narrow_helper",
      "    syntax, Name(string)",
      "    local shown \"`name'\"",
      "    display \"`shown'\"",
      "end",
    ].join("\n"),
    authoring_state: "new",
  });
  assert.equal(allowed.findings.some((row) => row.rule === "local_macro_without_lexical_need"), false, JSON.stringify(allowed.findings));
});

test("fallback provenance markers are forbidden in research do-files", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const content of [
    "* BEGIN DIRECT FALLBACK: reshape source-specific column names\nrename old_value value\n* END DIRECT FALLBACK",
    "* BEGIN DIRECT FALLBACK: substantive regression\nregress y x\n* END DIRECT FALLBACK",
    '* BEGIN DIRECT FALLBACK: load approved producer output\nuse "$final/panel.dta", clear\n* END DIRECT FALLBACK',
  ]) {
    const result = await client.tool("lint_do_file", { content });
    assert.ok(result.findings.some((row) => row.rule === "direct_fallback_markers_forbidden"));
  }
});

test("line continuation is present only when the same command continues on the next physical line", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const content of [
    "reghdfe y x, ///",
    "reghdfe y x, ///\n",
    "reghdfe y x, ///\n\n    absorb(firm_id year)",
    "reghdfe y x, ///\n* comment\n    absorb(firm_id year)",
    "reghdfe y x, ///\n    absorb(firm_id year) ///\nestimates save result.ster, replace",
    "outreg2 using result.xls, ///\nregress y x",
    "display 1 ///\nkeep if sample_flag",
    "display 1 ///\ngl callopts safe_arg",
    "display 1 ///\nloc callopts safe_arg",
    "display 1 ///\npr def p",
    "custom_estimator y x, ///\nanother_custom_command y x",
  ]) {
    const result = await client.tool("lint_do_file", { content });
    assert.ok(result.findings.some((row) => row.rule === "dangling_line_continuation"), content);
  }
  for (const content of [
    "reghdfe y x, ///\n    absorb(firm_id year) vce(cluster firm_id)",
    "outreg2 using result.xls, ///\n    excel replace",
    "outreg2 using result.xls, ///\n    replace bdec(3) sdec(3)",
    "regress y x ///\n    if sample_flag, vce(robust)",
    "coefplot ///\n    (model_a) ///\n    (model_b), ///\n    keep(term_a term_b) order(term_a term_b)",
    "custom_estimator y x, ///\n    custom_option(value)",
    "assert x == 1 | ///\n    y == 1",
  ]) {
    const result = await client.tool("lint_do_file", { content });
    assert.equal(result.findings.some((row) => row.rule === "dangling_line_continuation"), false, content);
  }
});

test("canonical event snapshots have no dangling line-continuation finding", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const name of [
    "research_practice_event_plot_flat_loops.do",
    "research_practice_event_plot_flat_mixed_axis.do",
    "research_practice_event_plot_single_automatic.do",
  ]) {
    const content = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", name), "utf8");
    const result = await client.tool("lint_do_file", { content });
    assert.equal(result.findings.some((row) => row.rule === "dangling_line_continuation"), false, name);
  }
});

test("project audit identifies substantive globals defined remotely from their consumer", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-macro-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "master.do"), [
    "version 18.0",
    'global project "C:/project"',
    'do "setup.do"',
    'do "regression.do"',
    'do "figure.do"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "setup.do"), [
    'global controls "x1 x2"',
    'global sample "sample_flag == 1"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "regression.do"), "regress y $controls if $sample\n", "utf8");
  fs.writeFileSync(path.join(root, "figure.do"), [
    'global event_keep "2018.year#1.treat 2020.year#1.treat"',
    'display "$event_keep"',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("audit_stata_project", { path: root, strict_structure: false });
  const localizable = result.structural_findings
    .filter((row) => row.rule === "remote_specification_global")
    .map((row) => `${row.file}:${row.line}`);
  assert.deepEqual(localizable.sort(), ["setup.do:1", "setup.do:2"]);
  assert.equal(result.structural_findings.some((row) => row.file === "figure.do" && row.rule === "remote_specification_global"), false);
});

test("project audit moves remote single-consumer leaf filenames but preserves shared roots and artifacts", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-file-binding-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "master.do"), [
    "version 18.0",
    'do "setup.do"',
    'do "export.do"',
    'do "figure.do"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "setup.do"), [
    'global table "C:/project/table"',
    'global summary_excel "$table/policy_appointment_summary_definition2.xlsx"',
    'global shared_data "C:/project/data/generated/summary.dta"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "export.do"), [
    'display "$summary_excel"',
    'use "$shared_data", clear',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "figure.do"), [
    'use "$shared_data", clear',
    'graph export "$table/summary.pdf", replace',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("audit_stata_project", { path: root, strict_structure: false });
  const localizable = result.structural_findings
    .filter((row) => row.rule === "remote_leaf_file_binding_global")
    .map((row) => `${row.file}:${row.line}:${row.message}:${row.suggestion}`);
  assert.equal(localizable.length, 1);
  assert.match(localizable[0], /^setup\.do:2:summary_excel leaf 파일 global이 정의 파일과 다른 export\.do에서 소비됩니다\./);
  assert.match(localizable[0], /소비 do-file에서 literal 또는 descriptive global/);
  assert.equal(result.structural_findings.some((row) => /\btable\b/.test(row.message)), false);
  assert.equal(result.structural_findings.some((row) => /\bshared_data\b/.test(row.message)), false);
});

test("event-study graph requires raw outcome title, bottom legend, and immediate PDF export", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const complete = [
    "coefplot (sample_a, label(Full sample)) (sample_b, label(Subsample)), keep(*.year#1.treat) title(\"`outcome'\", size(medsmall)) legend(position(6) rows(1))",
    "graph export \"figures/`outcome'.pdf\", replace",
  ].join("\n");
  const passed = await client.tool("lint_do_file", { content: complete });
  assert.equal(passed.findings.some((row) => /event_study_(raw_outcome_title|bottom_legend|pdf_not_immediate)/.test(row.rule)), false);
  const ordinaryInteraction = await client.tool("lint_do_file", { content: "coefplot (model, label(Main model)), keep(1.treated#2015.year)" });
  assert.equal(ordinaryInteraction.findings.some((row) => /event_study_(raw_outcome_title|bottom_legend|pdf_not_immediate)/.test(row.rule)), false);
  const reversedEvent = await client.tool("lint_do_file", {
    content: "coefplot, keep(1.treat2019#2015.year 1.treat2019#2016.year)",
    authoring_state: "new",
  });
  assert.ok(reversedEvent.findings.some((row) => row.rule === "event_study_raw_outcome_title"));
  assert.ok(reversedEvent.findings.some((row) => row.rule === "event_study_selector_not_exact") === false);
  assert.ok(reversedEvent.findings.some((row) => row.rule === "event_study_reference_slot_missing"));
  for (const [name, content, rule] of [
    ["title", complete.replace("title(\"`outcome'\", size(medsmall))", "title(\"Outcome effect\", size(medsmall))"), "event_study_raw_outcome_title"],
    ["legend", complete.replace("legend(position(6) rows(1))", "legend(off)"), "event_study_bottom_legend"],
    ["pdf", complete.replace(/\ngraph export[\s\S]*/, ""), "event_study_pdf_not_immediate"],
  ]) {
    const result = await client.tool("lint_do_file", { content });
    assert.ok(result.findings.some((row) => row.rule === rule), name);
  }
  const authoredWildcard = await client.tool("lint_do_file", { content: complete, authoring_state: "new" });
  assert.ok(authoredWildcard.findings.some((row) => row.rule === "event_study_selector_not_exact"));
  assert.ok(authoredWildcard.findings.some((row) => row.rule === "event_study_reference_slot_missing"));
  assert.ok(authoredWildcard.findings.some((row) => row.rule === "event_study_reference_coordinates_missing"));
  assert.ok(authoredWildcard.findings.some((row) => row.rule === "event_study_vertical_missing"));

  const exactButIncomplete = [
    "coefplot, keep(2015b.year#1.treat2019 2016.year#1.treat2019) title(y) legend(position(6) rows(1))",
    'graph export "figures/y.pdf", replace',
  ].join("\n");
  const exactDetected = await client.tool("lint_do_file", { content: exactButIncomplete, authoring_state: "new" });
  assert.ok(exactDetected.findings.some((row) => row.rule === "event_study_reference_slot_missing"));
  assert.ok(exactDetected.findings.some((row) => row.rule === "event_study_vertical_missing"));
  const inconsistentCoordinates = await client.tool("lint_do_file", {
    content: [
      'coefplot, keep(2015b.year#1.treat2019 2016.year#1.treat2019) order(foo . bar) xlabel(99 "junk") addplot(scatteri 0 999) xline(-999) vertical title(y) legend(position(6) rows(1))',
      'graph export "figures/y.pdf", replace',
    ].join("\n"),
    authoring_state: "new",
  });
  assert.ok(inconsistentCoordinates.findings.some((row) => row.rule === "event_study_selector_order_mismatch"));
  assert.ok(inconsistentCoordinates.findings.some((row) => row.rule === "event_study_reference_coordinates_missing"));
});

test("blueprint covers masters, compact result paths, README outline, and planned variables", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("workflow_blueprint", {
    analysis_type: "applied_micro",
    data_shape: "panel",
    project_size: "large",
    project_mode: "new",
    new_project_confirmed: true,
    planned_variables: [{
      name: "analysis_sample",
      reader_description: "본문 분석에 포함되는 관측치 지표",
      source_or_formula: "eligible [0/1] -> eligible == 1 -> indicator",
      unit_observation_level: "0/1 indicator, 기업-연도",
    }],
  });
  assert.deepEqual(result.stage_contracts.map((row) => row.stage), [
    "import", "integrity_audit", "cleaning_labels", "merge_reshape", "panel_construction", "descriptives_balance_sample_flow", "estimation", "robustness", "figures", "exports", "master_orchestration",
  ]);
  assert.ok(result.recommended_tree.includes("project/masters.do"));
  assert.ok(result.recommended_tree.includes("project/do/build_analysis_panel.do"));
  assert.ok(result.recommended_tree.includes("project/do/build_summary.do"));
  assert.ok(result.recommended_tree.includes("project/do/run_regressions.do"));
  assert.ok(result.recommended_tree.some((row) => row.includes("data/raw")));
  assert.ok(result.sample_flow_contract.length >= 5);
  assert.ok(result.recommended_tree.includes("project/README.md"));
  assert.ok(result.recommended_tree.includes("project/do/main.log"));
  assert.ok(result.recommended_tree.includes("project/ster/"));
  assert.ok(result.recommended_tree.includes("project/table/"));
  assert.ok(result.recommended_tree.includes("project/figures/"));
  assert.equal(result.recommended_tree.some((row) => /project\/(?:work|manifests|output|logs)(?:\/|$)/.test(row)), false);
  assert.equal(result.recommended_tree.some((row) => /dependenc/i.test(row)), false);
  assert.match(result.proposed_file_tree.tree_markdown, /└─ figures\//);
  assert.equal(result.planned_variables[0].name, "analysis_sample");
  assert.equal(result.variables_pending_user_definition, false);
  assert.equal(result.readme_contract.path, "README.md");
  assert.ok(result.readme_contract.outline.some((row) => row.section === "새로 생성되는 파일 구조"));
  assert.deepEqual(result.master_sequence, ["do/build_analysis_panel.do", "do/build_summary.do", "do/run_regressions.do"]);
  assert.ok(result.research_output_contract.readme_sections.some((row) => row.includes("file tree")));
  assert.ok(result.research_output_contract.deliverable_evidence.some((row) => row.includes("names and counts")));
  assert.ok(result.research_output_contract.deliverable_evidence.some((row) => row.includes("descriptive PDFs")));
  assert.ok(result.research_output_contract.deliverable_evidence.some((row) => row.includes("event-study PDFs")));
  assert.ok(result.research_output_contract.verdicts.some((row) => row.includes("needs_revision")));
  assert.equal(result.structure_policy.standard_tree_applies, true);
  assert.equal(result.write_approval_contract.required_before_any_project_write, true);
  assert.ok(result.write_approval_contract.proposal_must_list.includes("files to modify"));
  assert.ok(result.write_approval_contract.proposal_must_list.includes("entrypoint and execution command"));
  assert.ok(result.write_approval_contract.proposal_must_list.includes("new persistent variable names and reader-facing descriptions"));
});

test("new-project blueprint emits only stages and outputs supported by the requested profile", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const crossSection = await client.tool("workflow_blueprint", {
    project_mode: "new",
    new_project_confirmed: true,
    analysis_type: "descriptive",
    data_shape: "cross_section",
    expected_stages: ["import", "cleaning_labels"],
    outputs: ["tables"],
    no_new_persistent_variables: true,
  });
  assert.deepEqual(crossSection.master_sequence, ["do/build_analysis_data.do"]);
  assert.equal(crossSection.recommended_tree.some((row) => /build_analysis_panel|build_summary|run_regressions|project\/ster\/|project\/figures\//.test(row)), false);
  assert.equal(crossSection.structure_policy.standard_tree_applies, false);

  const summaryPdf = await client.tool("workflow_blueprint", {
    project_mode: "new",
    new_project_confirmed: true,
    analysis_type: "descriptive",
    data_shape: "cross_section",
    expected_stages: ["descriptives_balance_sample_flow"],
    outputs: ["one descriptive pdf"],
    no_new_persistent_variables: true,
  });
  assert.deepEqual(summaryPdf.master_sequence, ["do/build_summary.do"]);
  assert.ok(summaryPdf.recommended_tree.includes("project/figures/"));
  assert.equal(summaryPdf.recommended_tree.includes("project/table/"), false);

  const sterOnly = await client.tool("workflow_blueprint", {
    project_mode: "new",
    new_project_confirmed: true,
    analysis_type: "applied_micro",
    data_shape: "panel",
    expected_stages: ["estimation"],
    outputs: ["one ster only"],
    no_new_persistent_variables: true,
  });
  assert.deepEqual(sterOnly.master_sequence, ["do/run_regressions.do"]);
  assert.ok(sterOnly.recommended_tree.includes("project/ster/"));
  assert.equal(sterOnly.recommended_tree.includes("project/table/"), false);
});

test("default readable-project fixture locks unnumbered stages, master file contracts, and visible regressions", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const fixture = path.join(__dirname, "fixtures", "readable_default_project");
  const master = fs.readFileSync(path.join(fixture, "masters.do"), "utf8");
  const regression = fs.readFileSync(path.join(fixture, "do", "run_regressions.do"), "utf8");
  const masterLint = await client.tool("lint_do_file", { content: master, role: "master", authoring_state: "new" });
  assert.equal(masterLint.status, "static_clean", JSON.stringify(masterLint.findings));
  assert.equal(masterLint.strengths.filter((row) => row.rule === "master_call_role_comment").length, 3);
  const regressionLint = await client.tool("lint_do_file", { content: regression, authoring_state: "new" });
  assert.equal(regressionLint.status, "static_clean", JSON.stringify(regressionLint.findings));
  assert.equal(regressionLint.findings.some((row) => row.rule === "regression_substantive_indirection"), false, JSON.stringify(regressionLint.findings));
  assert.equal(regressionLint.findings.some((row) => row.rule === "local_macro_without_lexical_need"), false, JSON.stringify(regressionLint.findings));
  assert.equal(regressionLint.findings.some((row) => row.rule === "event_study_single_hash_base_not_explicit"), false, JSON.stringify(regressionLint.findings));
  assert.match(master, /do\/build_analysis_panel\.do/);
  assert.doesNotMatch(master, /do\/[0-9]+_/);
  const panel = fs.readFileSync(path.join(fixture, "do", "build_analysis_panel.do"), "utf8");
  const summary = fs.readFileSync(path.join(fixture, "do", "build_summary.do"), "utf8");
  assert.match(panel, /save "\$data\/final\/analysis_panel\.dta", replace/);
  assert.match(summary, /use "\$data\/final\/analysis_panel\.dta", clear/);
  assert.match(regression, /use "\$data\/final\/analysis_panel\.dta", clear/);
  assert.match(summary, /summary_statistics\.xlsx/);
  assert.match(summary, /summary_bar\.pdf/);
  assert.match(regression, /regressions\.xls/);
  assert.match(regression, /estimates save "\$ster\/`outcome'\.ster"/);
  assert.doesNotMatch(regression, /coefplot|graph export/);
});

test("new-project standard tree requires explicit first-build confirmation", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const response = await client.request("tools/call", { name: "workflow_blueprint", arguments: { project_mode: "new" } });
  assert.equal(response.isError, true);
  assert.match(response.structuredContent.error, /new_project_confirmed: true/);
});

test("blueprint preserves existing structure and requires approval before writes", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("workflow_blueprint", { project_mode: "existing" });
  assert.equal(result.profile.project_mode, "existing");
  assert.deepEqual(result.recommended_tree, []);
  assert.deepEqual(result.master_sequence, ["preserve the detected existing entrypoint and call order"]);
  assert.equal(result.structure_policy.standard_tree_applies, false);
  assert.deepEqual(result.proposed_file_tree.paths, []);
  assert.equal(result.proposed_file_tree.tree_markdown, null);
  assert.match(result.structure_policy.existing_project, /preserve compatible folder names/);
  assert.equal(result.write_approval_contract.required_before_any_project_write, true);
  assert.equal(result.write_approval_contract.material_plan_change_requires_new_approval, true);
  assert.ok(result.write_approval_contract.proposal_must_list.includes("entrypoint and execution command"));
});

test("research output check verifies researcher variable descriptions in root README", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-readme-variables-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const variable = {
    name: "outcome_sq",
    reader_description: "결과변수의 제곱값",
    source_or_formula: "outcome [원단위] -> outcome^2 -> 제곱값",
    unit_observation_level: "원단위 제곱, 기업-연도",
    creation_file: "do/10_prep_master.do",
  };
  fs.appendFileSync(path.join(project, "README.md"), [
    "",
    "## 분석 변수 안내",
    "| 변수명 | 사용자용 설명 | 원자료·생성 방식 | 단위·관측단위 | 생성 파일 |",
    "|---|---|---|---|---|",
    "| `outcome_sq` | 결과변수의 제곱값 | outcome [원단위] -> outcome^2 -> 제곱값 | 원단위 제곱, 기업-연도 | do/10_prep_master.do |",
  ].join("\n"));
  const args = {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 1 }],
    planned_variables: [variable],
  };
  args.main_log = "do/main.log";
  args.completion_marker = "RESEARCH_RUN_COMPLETE";
  const pass = await client.tool("research_output_check", args);
  assert.equal(pass.status, "verified");
  assert.ok(pass.checks.some((row) => row.name === "readme_variable:outcome_sq" && row.status === "pass"));
  assert.ok(pass.checks.some((row) => row.name === "readme_variable_lineage:outcome_sq" && row.status === "pass"));
  assert.ok(pass.checks.some((row) => row.name === "creation_label:outcome_sq" && row.status === "pass"));

  fs.writeFileSync(path.join(project, "README.md"), fs.readFileSync(path.join(project, "README.md"), "utf8").replace(variable.source_or_formula, "원자료·생성식 누락"));
  const fail = await client.tool("research_output_check", args);
  assert.equal(fail.status, "needs_revision");
  assert.ok(fail.blockers.some((row) => row.check === "readme_variable_lineage:outcome_sq"));
});

test("blueprint is research-facing rather than submission packaging", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("workflow_blueprint", {});
  assert.equal(result.profile.project_mode, "existing");
  assert.deepEqual(result.recommended_tree, []);
  assert.match(result.claim_boundary, /배포, dependency 관리, 제출 패키지/i);
});

function buildResearchFixture(root) {
  for (const relative of ["do", "data/raw", "data/generated", "data/final", "ster", "table", "figures"]) {
    fs.mkdirSync(path.join(root, ...relative.split("/")), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "global RAW \"$PROJECT_ROOT/data/raw\"",
    "global GENERATED \"$PROJECT_ROOT/data/generated\"",
    "global FINAL \"$PROJECT_ROOT/data/final\"",
    "global STER \"$PROJECT_ROOT/ster\"",
    "global TABLE \"$PROJECT_ROOT/table\"",
    "global FIGURES \"$PROJECT_ROOT/figures\"",
    "global LOG \"$PROJECT_ROOT/do\"",
    "do \"$PROJECT_ROOT/do/00_config.do\"",
    "do \"$PROJECT_ROOT/do/10_prep_master.do\"",
    "do \"$PROJECT_ROOT/do/20_analysis_master.do\"",
    "display \"RESEARCH_RUN_COMPLETE\"",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "do", "00_config.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "global RAW \"$PROJECT_ROOT/data/raw\"",
    "global GENERATED \"$PROJECT_ROOT/data/generated\"",
    "global FINAL \"$PROJECT_ROOT/data/final\"",
    "global STER \"$PROJECT_ROOT/ster\"",
    "global TABLE \"$PROJECT_ROOT/table\"",
    "global FIGURES \"$PROJECT_ROOT/figures\"",
    "global LOG \"$PROJECT_ROOT/do\"",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "do", "10_prep_master.do"), [
    "version 18.0",
    "use \"$RAW/input.dta\", clear",
    "isid firm_id year",
    "generate outcome_sq = outcome^2",
    "label variable outcome_sq \"Squared outcome\"",
    "save \"$GENERATED/analysis_panel.dta\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "do", "20_analysis_master.do"), [
    "version 18.0",
    "use \"$GENERATED/analysis_panel.dta\", clear",
    "xtset firm_id year",
    "summarize outcome treatment",
    "regress outcome treatment, vce(cluster firm_id)",
    "estimates save \"$STER/model.ster\", replace",
    "putexcel set \"$TABLE/table1.xlsx\", replace",
    "putexcel A1 = _b[treatment]",
    "twoway scatter outcome treatment",
    "graph save \"$FIGURES/figure1.gph\", replace",
    "graph export \"$FIGURES/figure1.pdf\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "README.md"), [
    "# Research workflow",
    "## File tree",
    "The working folders are recorded here.",
    "## How to run",
    "How to run: start Stata in this root and execute 00_master.do.",
    "## Table and figure program crosswalk",
    "Table 1 program: do/20_analysis_master.do. Figure 1 program: do/20_analysis_master.do.",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "table", "table1.xlsx"), "table artifact");
  fs.writeFileSync(path.join(root, "figures", "figure1.gph"), "graph artifact");
  fs.writeFileSync(path.join(root, "figures", "figure1.pdf"), "figure artifact");
  fs.writeFileSync(path.join(root, "ster", "model.ster"), "estimate artifact");
  fs.writeFileSync(path.join(root, "do", "main.log"), "Stata/MP 18.0\nRESEARCH_RUN_COMPLETE\n");
  fs.writeFileSync(path.join(root, "report.md"), [
    "# Stata Research Guard 작업 보고서",
    "",
    "## 구현 구간",
    "",
    "| mode | target | lines | checkpoint | label_id | reason |",
    "|---|---|---|---|---|---|",
    "| general_rule | do/20_analysis_master.do | 5-5 | estimation.conventional | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
    "| general_rule | do/20_analysis_master.do | 6-6 | postest.persist_estimate | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
    "| general_rule | do/20_analysis_master.do | 7-8 | final_excel_assembly | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
    "| general_rule | do/20_analysis_master.do | 9-9 | figures.descriptive_scatter | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
    "| general_rule | do/20_analysis_master.do | 11-11 | figures.export_pdf | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
  ].join("\n"), "utf8");
}

const RESEARCH_STAGES = ["import", "integrity_audit", "cleaning_labels", "panel_construction", "descriptives_balance_sample_flow", "estimation", "figures", "exports", "master_orchestration"];

test("research output checker verifies requested artifacts and direct hashes", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-research-output-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const result = await client.tool("research_output_check", {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    deliverables: [
      { pattern: "table/*.xlsx", expected_count: 1 },
      { pattern: "figures/*.pdf", expected_count: 1 },
      { pattern: "ster/*.ster", expected_count: 1 },
    ],
  });
  assert.equal(result.status, "verified");
  assert.equal(result.verification_level, "research_workflow_output_check");
  assert.equal(result.runtime_status, "not_checked");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.static_audit.work_report.status, "valid");
  assert.ok(result.checks.some((row) => row.name === "work_report" && row.status === "pass"));
  assert.ok(result.checks.every((row) => row.status === "pass"));
  assert.ok(result.evidence.filter((row) => row.type === "deliverable").every((row) => row.files.every((file) => /^[0-9A-F]{64}$/.test(file.sha256))));
  assert.match(result.claim_boundary, /not deployment, dependency, submission/i);
});

test("research output checker ignores number() options but catches standalone Stata r() errors", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-research-log-error-lines-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const logPath = path.join(project, "do", "main.log");
  const args = {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    main_log: "do/main.log",
    completion_marker: "RESEARCH_RUN_COMPLETE",
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 1 }],
  };

  fs.writeFileSync(logPath, "estimates use model.ster, number(1)\nRESEARCH_RUN_COMPLETE\n", "utf8");
  const optionOnly = await client.tool("research_output_check", args);
  assert.equal(optionOnly.status, "verified", JSON.stringify(optionOnly.blockers));
  assert.ok(optionOnly.checks.some((row) => row.name === "main_log_no_stata_error" && row.status === "pass"));

  fs.appendFileSync(logPath, "r(198);\n", "utf8");
  const actualError = await client.tool("research_output_check", args);
  assert.equal(actualError.status, "needs_revision");
  assert.ok(actualError.blockers.some((row) => row.check === "main_log_no_stata_error"));
  assert.deepEqual(actualError.evidence.find((row) => row.type === "log").stata_errors, ["r(198)"]);
});

test("research output check separates runtime verification from static review and permits an optional absent report", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-output-status-separation-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  fs.rmSync(path.join(project, "report.md"));
  fs.appendFileSync(path.join(project, "00_master.do"), "\nglobal controls_for_future x1 x2\n", "utf8");

  const result = await client.tool("research_output_check", {
    path: project,
    report_policy: "optional",
    expected_stages: RESEARCH_STAGES,
    main_log: "do/main.log",
    completion_marker: "RESEARCH_RUN_COMPLETE",
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 1 }],
  });

  assert.equal(result.status, "verified", JSON.stringify(result.blockers));
  assert.equal(result.runtime_status, "verified");
  assert.equal(result.static_status, "needs_review");
  assert.equal(result.static_audit.work_report.status, "not_present");
  assert.ok(result.checks.some((row) => row.name === "static_project_audit" && row.status === "review"));
  assert.ok(result.checks.some((row) => row.name === "work_report" && row.status === "pass"));
  assert.equal(result.substantive_validity.status, "not_assessed");
});

test("completed workflow requires a valid root report with actual implementation ranges", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-work-report-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const args = {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 1 }],
  };

  const validAudit = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(validAudit.work_report.status, "valid", JSON.stringify(validAudit.work_report.errors));

  const reportPath = path.join(project, "report.md");
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, "utf8")
    .replaceAll("general_rule", "general_rule_fallback")
    .replaceAll("template_status", "fallback_trigger"), "utf8");
  const legacyAudit = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(legacyAudit.work_report.status, "valid", JSON.stringify(legacyAudit.work_report.errors));
  assert.ok(legacyAudit.work_report.entries.every((row) => row.mode === "general_rule" && row.legacy_mode === "general_rule_fallback"));

  fs.rmSync(path.join(project, "report.md"));
  const missing = await client.tool("research_output_check", args);
  assert.equal(missing.status, "needs_revision");
  assert.ok(missing.blockers.some((row) => row.check === "work_report"));

  buildResearchFixture(project);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, "utf8").replace("11-11", "11-999"), "utf8");
  const invalid = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.work_report.status, "invalid");
  assert.ok(invalid.structural_findings.some((row) => row.rule === "work_report_invalid" && /exceeds/i.test(row.message)));

  buildResearchFixture(project);
  fs.writeFileSync(reportPath, [
    "# Stata Research Guard 작업 보고서",
    "",
    "| mode | target | lines | checkpoint | label_id | reason |",
    "|---|---|---|---|---|---|",
    "| general_rule | do/20_analysis_master.do | 1-2 | unmapped | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
  ].join("\n"), "utf8");
  const primitiveOnly = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(primitiveOnly.work_report.status, "invalid");
  assert.ok(primitiveOnly.work_report.errors.some((message) => /primitive-only/i.test(message)));

  buildResearchFixture(project);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, "utf8")
    .replace("nearest_template_hint=none; template_status=no_suitable_template; hint_used=none", "template_status=no_suitable_template; hint_used=none"), "utf8");
  const missingFallbackField = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(missingFallbackField.work_report.status, "invalid");
  assert.ok(missingFallbackField.work_report.errors.some((message) => /missing nearest_template_hint/i.test(message)));

  buildResearchFixture(project);
  fs.writeFileSync(reportPath, fs.readFileSync(reportPath, "utf8")
    .replace("nearest_template_hint=none", "nearest_template_hint=not.a.real.label"), "utf8");
  const unknownFallbackHint = await client.tool("audit_stata_project", { path: project, require_report: true, expected_stages: RESEARCH_STAGES });
  assert.equal(unknownFallbackHint.work_report.status, "invalid");
  assert.ok(unknownFallbackHint.work_report.errors.some((message) => /unknown nearest_template_hint/i.test(message)));
});

test("strict structure accepts path contracts declared in a called config do-file", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-config-path-contract-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  fs.appendFileSync(path.join(project, "do", "00_config.do"), "\nglobal LOG \"$PROJECT_ROOT/do\"\n");
  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "do \"$PROJECT_ROOT/do/00_config.do\"",
    "do \"$PROJECT_ROOT/do/10_prep_master.do\"",
    "do \"$PROJECT_ROOT/do/20_analysis_master.do\"",
  ].join("\n"));
  const audit = await client.tool("audit_stata_project", {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    main_log: "do/main.log",
  });
  assert.equal(audit.structural_findings.some((row) => row.rule.startsWith("missing_path_")), false);
});

test("research output checker rejects missing researcher documentation, bad log, and count mismatch", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-research-output-reject-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  fs.rmSync(path.join(project, "README.md"));
  fs.appendFileSync(path.join(project, "do", "main.log"), "r(198);\n");
  const result = await client.tool("research_output_check", {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    main_log: "do/main.log",
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 2 }],
  });
  assert.equal(result.status, "needs_revision");
  for (const check of ["researcher_readme", "deliverable_count:table/*.xlsx", "main_log_no_stata_error"]) {
    assert.ok(result.blockers.some((row) => row.check === check), check);
  }
});

test("research output checker parses JSON when it is a contracted output", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-research-output-json-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const requiredJson = path.join(project, "do", "validation_results.json");
  fs.writeFileSync(requiredJson, JSON.stringify({ status: "pass" }), "utf8");
  const args = {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    main_log: "do/main.log",
    deliverables: [
      { pattern: "table/*.xlsx", expected_count: 1 },
      { pattern: "figures/*.pdf", expected_count: 1 },
      { pattern: "do/validation_results.json", expected_count: 1 },
    ],
  };
  const valid = await client.tool("research_output_check", args);
  assert.equal(valid.status, "verified");
  assert.ok(valid.checks.some((row) => row.name === "deliverable_json_valid:do/validation_results.json" && row.status === "pass"));

  fs.writeFileSync(requiredJson, String.raw`{\"status\":\"pass\"}`, "utf8");
  const invalid = await client.tool("research_output_check", args);
  assert.equal(invalid.status, "needs_revision");
  assert.ok(invalid.blockers.some((row) => row.check === "deliverable_json_valid:do/validation_results.json"));
});

test("research output check does not manage used community commands", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-research-output-community-command-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildResearchFixture(project);
  const analysis = path.join(project, "do", "20_analysis_master.do");
  fs.writeFileSync(analysis, fs.readFileSync(analysis, "utf8").replace("regress outcome treatment, vce(cluster firm_id)", "reghdfe outcome treatment, absorb(firm_id) vce(cluster firm_id)"));
  const result = await client.tool("research_output_check", {
    path: project,
    strict_structure: true,
    expected_stages: RESEARCH_STAGES,
    deliverables: [{ pattern: "table/*.xlsx", expected_count: 1 }],
  });
  assert.equal(result.status, "verified");
  assert.equal(result.blockers.length, 0);
});

function buildExistingResearchFixture(root) {
  for (const relative of ["dofiles", "inputs", "derived", "results", "runlogs", "evidence"]) {
    fs.mkdirSync(path.join(root, relative), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "runall.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "do \"$PROJECT_ROOT/dofiles/step1.do\"",
    "do \"$PROJECT_ROOT/dofiles/step2.do\"",
    "display \"EXISTING_RUN_COMPLETE\"",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "dofiles", "step1.do"), [
    "version 18.0",
    "use \"$PROJECT_ROOT/inputs/input.dta\", clear",
    "isid firm_id year",
    "generate outcome_sq = outcome^2",
    "label variable outcome_sq \"Squared outcome\"",
    "save \"$PROJECT_ROOT/derived/panel.dta\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "dofiles", "step2.do"), [
    "version 18.0",
    "use \"$PROJECT_ROOT/derived/panel.dta\", clear",
    "summarize outcome treatment",
    "regress outcome treatment, vce(cluster firm_id)",
    "export delimited using \"$PROJECT_ROOT/results/table.csv\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "README.md"), [
    "# Existing research workflow",
    "## How to run",
    "How to run: execute runall.do from the existing project root.",
    "## Table and figure program crosswalk",
    "Table program: dofiles/step2.do.",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "results", "table.csv"), "coefficient,standard_error\n1.0,0.2\n");
  fs.writeFileSync(path.join(root, "runlogs", "full.log"), "Stata/MP 18.0\nEXISTING_RUN_COMPLETE\n");
  fs.writeFileSync(path.join(root, "report.md"), [
    "# Stata Research Guard 작업 보고서",
    "",
    "## 구현 구간",
    "",
    "| mode | target | lines | checkpoint | label_id | reason |",
    "|---|---|---|---|---|---|",
    "| general_rule | dofiles/step2.do | 4-4 | estimation.conventional | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
    "| general_rule | dofiles/step2.do | 5-5 | final_excel_assembly | - | nearest_template_hint=none; template_status=no_suitable_template; hint_used=none |",
  ].join("\n"), "utf8");
}

test("research output check preserves a compatible existing layout", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-existing-layout-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildExistingResearchFixture(project);
  const expectedStages = ["import", "integrity_audit", "cleaning_labels", "descriptives_balance_sample_flow", "estimation", "exports", "master_orchestration"];
  const audit = await client.tool("audit_stata_project", { path: project, strict_structure: false, expected_stages: expectedStages });
  assert.equal(audit.status, "static_clean");
  assert.equal(audit.structure_mode, "preserve_existing_project");
  assert.equal(audit.summary.top_master, "runall.do");
  assert.equal(audit.structural_findings.some((row) => row.rule === "prep_analysis_split" || row.rule.startsWith("missing_path_")), false);
  const result = await client.tool("research_output_check", {
    path: project,
    strict_structure: false,
    expected_stages: expectedStages,
    main_log: "runlogs/full.log",
    completion_marker: "EXISTING_RUN_COMPLETE",
    deliverables: [{ pattern: "results/*.csv", expected_count: 1 }],
  });
  assert.equal(result.status, "verified");
  assert.equal(result.static_audit.summary.top_master, "runall.do");
  assert.equal(result.checks.some((row) => row.name.startsWith("required_file:code/")), false);
});

test("project audit distinguishes the good and bad fixtures", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const good = await client.tool("audit_stata_project", { path: path.join(__dirname, "fixtures", "good_project") });
  assert.equal(good.status, "static_clean");
  assert.equal(good.verification_level, "static_workflow_audit");
  assert.equal(good.summary.errors, 0);
  assert.equal(good.summary.warnings, 0);
  assert.ok(good.stage_coverage.every((row) => row.status === "present"));
  assert.ok(good.call_graph.length >= 2);
  assert.ok(good.call_graph.every((edge) => edge.status === "resolved"));
  assert.ok(good.sample_flow.static_evidence.length >= 5);
  const bad = await client.tool("audit_stata_project", { path: path.join(__dirname, "fixtures", "bad_project") });
  assert.equal(bad.status, "blocked");
  assert.ok(bad.file_findings.some((row) => row.rule === "merge_m_m"));
  assert.ok(bad.file_findings.some((row) => row.rule === "nested_loop"));
});

test("project audit accepts sysuse and a lone do-file as the executable entrypoint", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-standalone-entrypoint-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.writeFileSync(path.join(project, "price_models.do"), [
    "version 18.0",
    "sysuse auto, clear",
    "regress price mpg, vce(robust)",
  ].join("\n"), "utf8");

  const audit = await client.tool("audit_stata_project", {
    path: project,
    strict_structure: false,
    expected_stages: ["import", "estimation"],
  });
  assert.equal(audit.status, "static_clean");
  assert.equal(audit.summary.top_master, "price_models.do");
  assert.equal(audit.stage_coverage.find((row) => row.stage === "import").status, "present");
  assert.equal(audit.structural_findings.some((row) => row.rule === "missing_import"), false);
  assert.equal(audit.structural_findings.some((row) => row.rule === "missing_project_root"), false);
});

test("project audit blocks missing masters and unresolved calls", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-audit-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));

  const noMaster = path.join(temp, "no-master");
  fs.mkdirSync(noMaster);
  fs.writeFileSync(path.join(noMaster, "prep.do"), "version 18.0\nisid id\n", "utf8");
  fs.writeFileSync(path.join(noMaster, "analysis.do"), "summarize y\nregress y x\n", "utf8");
  const missingMaster = await client.tool("audit_stata_project", { path: noMaster, expected_stages: ["master_orchestration"] });
  assert.equal(missingMaster.status, "blocked");
  assert.ok(missingMaster.structural_findings.some((row) => row.rule === "missing_master"));

  const unresolved = path.join(temp, "unresolved");
  fs.mkdirSync(unresolved);
  fs.writeFileSync(path.join(unresolved, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo \"missing_prep.do\"\ndo \"missing_analysis.do\"\nru \"missing_ru.do\"\nquietly: ru \"missing_quiet_ru.do\"\nquie ru \"missing_quie_ru.do\"\nqui include ///\n    \"existing_helper.do\"\nnoisil include \"existing_helper.do\"\n", "utf8");
  fs.writeFileSync(path.join(unresolved, "helper.do"), "summarize y\n", "utf8");
  fs.writeFileSync(path.join(unresolved, "existing_helper.do"), "summarize y\n", "utf8");
  const brokenGraph = await client.tool("audit_stata_project", { path: unresolved, expected_stages: ["master_orchestration"] });
  assert.equal(brokenGraph.status, "blocked");
  assert.ok(brokenGraph.structural_findings.some((row) => row.rule === "unresolved_call"));
  assert.ok(brokenGraph.structural_findings.some((row) => row.rule === "unresolved_call" && /missing_ru\.do/.test(row.message)));
  assert.ok(brokenGraph.structural_findings.some((row) => row.rule === "unresolved_call" && /missing_quiet_ru\.do/.test(row.message)));
  assert.ok(brokenGraph.structural_findings.some((row) => row.rule === "unresolved_call" && /missing_quie_ru\.do/.test(row.message)));
  assert.ok(brokenGraph.call_graph.some((row) => row.target === "existing_helper.do" && row.status === "resolved"));
  assert.ok(brokenGraph.call_graph.some((row) => row.target === "existing_helper.do" && row.status === "resolved" && row.line > 8));

  const failFast = path.join(temp, "fail-fast");
  fs.mkdirSync(failFast);
  fs.writeFileSync(path.join(failFast, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo \"stage.do\", nostop\n", "utf8");
  fs.writeFileSync(path.join(failFast, "stage.do"), "summarize y\n", "utf8");
  const failMaskingMaster = await client.tool("audit_stata_project", { path: failFast, expected_stages: ["master_orchestration"] });
  assert.equal(failMaskingMaster.status, "needs_review");
  assert.ok(failMaskingMaster.file_findings.some((row) => row.rule === "master_call_nostop"));

  const transitiveFailFast = path.join(temp, "transitive-fail-fast");
  fs.mkdirSync(transitiveFailFast);
  fs.writeFileSync(path.join(transitiveFailFast, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts=\", nostop\"\ndo \"helper.do\"\nglobal callopts safe_arg\n", "utf8");
  fs.writeFileSync(path.join(transitiveFailFast, "helper.do"), "do \"stage.do\" $callopts\n", "utf8");
  fs.writeFileSync(path.join(transitiveFailFast, "stage.do"), "summarize y\n", "utf8");
  const hiddenHelperNostop = await client.tool("audit_stata_project", { path: transitiveFailFast, expected_stages: ["master_orchestration"] });
  assert.equal(hiddenHelperNostop.status, "needs_review", JSON.stringify({ findings: hiddenHelperNostop.file_findings, scope: hiddenHelperNostop.scope, graph: hiddenHelperNostop.call_graph }));
  assert.ok(hiddenHelperNostop.file_findings.some((row) => row.file === "helper.do" && row.rule === "master_call_nostop"));

  const laterUnsafe = path.join(temp, "later-unsafe");
  fs.mkdirSync(laterUnsafe);
  fs.writeFileSync(path.join(laterUnsafe, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts safe_arg\ndo \"helper.do\"\nglobal callopts , nostop\n", "utf8");
  fs.writeFileSync(path.join(laterUnsafe, "helper.do"), "do \"stage.do\" $callopts\n", "utf8");
  fs.writeFileSync(path.join(laterUnsafe, "stage.do"), "summarize y\n", "utf8");
  const laterUnsafeAudit = await client.tool("audit_stata_project", { path: laterUnsafe, expected_stages: ["master_orchestration"] });
  assert.equal(laterUnsafeAudit.file_findings.some((row) => row.file === "helper.do" && row.rule === "master_call_nostop"), false);

  const programFailFast = path.join(temp, "program-fail-fast");
  fs.mkdirSync(programFailFast);
  fs.writeFileSync(path.join(programFailFast, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts=\", nostop\"\ndo \"helper.do\"\n", "utf8");
  fs.writeFileSync(path.join(programFailFast, "helper.do"), "program define p\ndo \"worker.do\" $callopts\nend\np\n", "utf8");
  fs.writeFileSync(path.join(programFailFast, "worker.do"), "summarize y\n", "utf8");
  const programAudit = await client.tool("audit_stata_project", { path: programFailFast, expected_stages: ["master_orchestration"] });
  assert.ok(programAudit.file_findings.some((row) => row.file === "helper.do" && row.line === 2 && row.rule === "master_call_nostop"));

  fs.writeFileSync(path.join(programFailFast, "helper.do"), "global callopts safe_arg\nprogram define p\ndo \"worker.do\" $callopts\nend\nglobal callopts=\", nostop\"\np\n", "utf8");
  const lateUnsafeProgramAudit = await client.tool("audit_stata_project", { path: programFailFast, expected_stages: ["master_orchestration"] });
  assert.ok(lateUnsafeProgramAudit.file_findings.some((row) => row.file === "helper.do" && row.line === 3 && row.rule === "master_call_nostop"));
  fs.writeFileSync(path.join(programFailFast, "helper.do"), "global callopts , nostop\nprogram define p\ndo \"worker.do\" $callopts\nend\nglobal callopts safe_arg\np\n", "utf8");
  const lateSafeProgramAudit = await client.tool("audit_stata_project", { path: programFailFast, expected_stages: ["master_orchestration"] });
  assert.equal(lateSafeProgramAudit.file_findings.some((row) => row.file === "helper.do" && row.rule === "master_call_nostop"), false);

  const crossFileProgram = path.join(temp, "cross-file-program");
  fs.mkdirSync(crossFileProgram);
  fs.writeFileSync(path.join(crossFileProgram, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts=\", nostop\"\ndo \"define.do\"\np\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "define.do"), "pr def p\ndo \"worker.do\" $callopts\nend\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "worker.do"), "summarize y\n", "utf8");
  const crossFileProgramAudit = await client.tool("audit_stata_project", { path: crossFileProgram, expected_stages: ["master_orchestration"] });
  assert.ok(crossFileProgramAudit.file_findings.some((row) => row.file === "define.do" && row.line === 2 && row.rule === "master_call_nostop"), JSON.stringify(crossFileProgramAudit.file_findings));

  fs.writeFileSync(path.join(crossFileProgram, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts=\", nostop\"\ndo \"define.do\"\nprogram drop p\ndo \"safe.do\"\np\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "safe.do"), "program p\ndo \"worker.do\" safe_arg\nend\n", "utf8");
  const dropRedefineAudit = await client.tool("audit_stata_project", { path: crossFileProgram, expected_stages: ["master_orchestration"] });
  assert.equal(dropRedefineAudit.file_findings.some((row) => row.file === "safe.do" && row.rule === "master_call_nostop"), false, JSON.stringify(dropRedefineAudit.file_findings));

  fs.writeFileSync(path.join(crossFileProgram, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo \"q.do\"\ndo \"p.do\"\np\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "q.do"), "program q\ndo \"worker.do\", nostop\nend\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "p.do"), "program p\nq\nend\n", "utf8");
  const nestedCrossFileAudit = await client.tool("audit_stata_project", { path: crossFileProgram, expected_stages: ["master_orchestration"] });
  assert.ok(nestedCrossFileAudit.file_findings.some((row) => row.file === "q.do" && row.line === 2 && row.rule === "master_call_nostop"), JSON.stringify(nestedCrossFileAudit.file_findings));

  fs.writeFileSync(path.join(crossFileProgram, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal opts safe_arg\ndo \"p.do\"\ndo \"q.do\"\nprogram drop p q\ncapture p\ndo \"worker.do\" $opts\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "p.do"), "program p\nglobal opts , nostop\nend\n", "utf8");
  fs.writeFileSync(path.join(crossFileProgram, "q.do"), "program q\nend\n", "utf8");
  const multiDropAudit = await client.tool("audit_stata_project", { path: crossFileProgram, expected_stages: ["master_orchestration"] });
  assert.equal(multiDropAudit.file_findings.some((row) => row.file === "00_master.do" && row.line === 8 && row.rule === "master_call_nostop"), false, JSON.stringify(multiDropAudit.file_findings));

  fs.writeFileSync(path.join(crossFileProgram, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal opts safe_arg\ndo \"p.do\"\nprogram drop _all\ncapture p\ndo \"worker.do\" $opts\n", "utf8");
  const dropAllAudit = await client.tool("audit_stata_project", { path: crossFileProgram, expected_stages: ["master_orchestration"] });
  assert.equal(dropAllAudit.file_findings.some((row) => row.file === "00_master.do" && row.line === 7 && row.rule === "master_call_nostop"), false, JSON.stringify(dropAllAudit.file_findings));

  const extendedMacroFailFast = path.join(temp, "extended-macro-fail-fast");
  fs.mkdirSync(extendedMacroFailFast);
  fs.writeFileSync(path.join(extendedMacroFailFast, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nglobal callopts : environment STATA_CALL_OPTS\ndo \"helper.do\"\n", "utf8");
  fs.writeFileSync(path.join(extendedMacroFailFast, "helper.do"), "do \"stage.do\" $callopts\n", "utf8");
  fs.writeFileSync(path.join(extendedMacroFailFast, "stage.do"), "summarize y\n", "utf8");
  const extendedMacroAudit = await client.tool("audit_stata_project", { path: extendedMacroFailFast, expected_stages: ["master_orchestration"] });
  assert.ok(extendedMacroAudit.file_findings.some((row) => row.file === "helper.do" && row.rule === "master_call_option_macro_indirection"));

  const includeCallerLocal = path.join(temp, "include-caller-local");
  fs.mkdirSync(includeCallerLocal);
  fs.writeFileSync(path.join(includeCallerLocal, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nlocal callopts , nostop\ninclude \"included.do\"\n", "utf8");
  fs.writeFileSync(path.join(includeCallerLocal, "included.do"), "do \"stage.do\" `callopts'\n", "utf8");
  fs.writeFileSync(path.join(includeCallerLocal, "stage.do"), "summarize y\n", "utf8");
  const includeCallerAudit = await client.tool("audit_stata_project", { path: includeCallerLocal, expected_stages: ["master_orchestration"] });
  assert.ok(includeCallerAudit.file_findings.some((row) => row.file === "included.do" && row.rule === "master_call_nostop"));

  const includeReturnsLocal = path.join(temp, "include-returns-local");
  fs.mkdirSync(includeReturnsLocal);
  fs.mkdirSync(path.join(includeReturnsLocal, "do"));
  fs.writeFileSync(path.join(includeReturnsLocal, "00_master.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo \"do/driver.do\"\n", "utf8");
  fs.writeFileSync(path.join(includeReturnsLocal, "do", "driver.do"), "include \"included.do\"\ndo \"stage.do\" `callopts'\n", "utf8");
  fs.writeFileSync(path.join(includeReturnsLocal, "do", "included.do"), "local callopts , nostop\n", "utf8");
  fs.writeFileSync(path.join(includeReturnsLocal, "do", "stage.do"), "summarize y\n", "utf8");
  const includeReturnAudit = await client.tool("audit_stata_project", { path: includeReturnsLocal, expected_stages: ["master_orchestration"] });
  assert.ok(includeReturnAudit.file_findings.some((row) => row.file === "do/driver.do" && row.line === 2 && row.rule === "master_call_nostop"), JSON.stringify(includeReturnAudit.file_findings));
});

test("project audit evaluates the canonical outreg2 sheet helper with project-wide literal globals", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-outreg2-project-context-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, "code"));
  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'global estimates_a "y1_s1 y1_s2 y1_s3"',
    'global estimates_b "y2_s1 y2_s2 y2_s3"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
  ].join("\n"));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(project, "code", "40_tables.do"), [
    formatter,
    'outreg2_xlsx, estimates("$estimates_a") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(6) replace',
    'outreg2_xlsx, estimates("$estimates_b") workbook("table.xlsx") sheet("family_b") adjdec(3) meandec(6)',
  ].join("\n"));
  const resolved = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(resolved.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);
  assert.equal(resolved.program_policy.outreg2_helper_multiplicity.necessary, true);
  assert.equal(resolved.program_policy.outreg2_helper_multiplicity.maximum_estimate_count, 3);
  assert.equal(resolved.program_policy.outreg2_helper_multiplicity.distinct_sheet_count, 2);
  assert.equal(resolved.program_policy.outreg2_helper_multiplicity.maximum_sheet_count_per_workbook, 2);

  fs.writeFileSync(path.join(project, "code", "40_tables.do"), [
    formatter,
    'outreg2_xlsx, estimates("$estimates_a") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(6) replace',
  ].join("\n"));
  const oneSheet = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(oneSheet.program_policy.outreg2_helper_multiplicity.necessary, false);
  assert.equal(oneSheet.program_policy.outreg2_helper_multiplicity.maximum_sheet_count_per_workbook, 1);
  assert.ok(oneSheet.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"));

  fs.writeFileSync(path.join(project, "code", "40_tables.do"), [
    formatter,
    'outreg2_xlsx, estimates("$estimates_a") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(6) replace',
    'outreg2_xlsx, estimates("$estimates_b") workbook("table.xlsx") sheet("family_b") adjdec(3) meandec(6)',
  ].join("\n"));

  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'global estimates_a = cond(c(os) == "Windows", "y1_s1 y1_s2 y1_s3", "y2_s1 y2_s2 y2_s3")',
    'global estimates_b "y2_s1 y2_s2 y2_s3"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
  ].join("\n"));
  const unresolved = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(unresolved.program_policy.outreg2_helper_multiplicity.unresolved_estimates, true);
  assert.equal(unresolved.program_policy.outreg2_helper_multiplicity.unresolved_placement, false);
  assert.equal(unresolved.program_policy.outreg2_helper_multiplicity.necessary, true);
  assert.equal(unresolved.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);

  fs.writeFileSync(path.join(project, "code", "10_models.do"), "regress y x\nestimates store m1\nregress z x\nestimates store m2\n", "utf8");
  fs.writeFileSync(path.join(project, "code", "40_tables.do"), [
    formatter,
    'outreg2_xlsx, estimates("m1") workbook("$wb") sheet("$sheet_a") adjdec(3) meandec(6) replace',
    'outreg2_xlsx, estimates("m2") workbook("$wb") sheet("$sheet_b") adjdec(3) meandec(6)',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(project, "code", "90_late_defs.do"), 'global wb "table.xlsx"\nglobal sheet_a "family_a"\nglobal sheet_b "family_b"\n', "utf8");
  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'do "$PROJECT_ROOT/code/10_models.do"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
    'do "$PROJECT_ROOT/code/90_late_defs.do"',
  ].join("\n"), "utf8");
  const lateDefinitions = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(lateDefinitions.program_policy.outreg2_helper_multiplicity.unresolved_placement, true);
  assert.equal(lateDefinitions.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);

  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'do "$PROJECT_ROOT/code/10_models.do"',
    'do "$PROJECT_ROOT/code/90_late_defs.do"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
  ].join("\n"), "utf8");
  const earlyDefinitions = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(earlyDefinitions.program_policy.outreg2_helper_multiplicity.unresolved_placement, false);
  assert.equal(earlyDefinitions.program_policy.outreg2_helper_multiplicity.necessary, true);

  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'do "$PROJECT_ROOT/code/10_models.do"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
    'global wb "table.xlsx"',
    'global sheet_a "family_a"',
    'global sheet_b "family_b"',
  ].join("\n"), "utf8");
  const callerLateDefinitions = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(callerLateDefinitions.program_policy.outreg2_helper_multiplicity.unresolved_placement, true);
  assert.equal(callerLateDefinitions.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);

  fs.writeFileSync(path.join(project, "code", "20_uninvoked_seed.do"), [
    "program seed_output",
    "estimates store m1",
    'global wb "table.xlsx"',
    'global sheet_a "family_a"',
    'global sheet_b "family_b"',
    "end",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(project, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    'do "$PROJECT_ROOT/code/20_uninvoked_seed.do"',
    'do "$PROJECT_ROOT/code/40_tables.do"',
  ].join("\n"), "utf8");
  const uninvokedSeed = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(uninvokedSeed.program_policy.outreg2_helper_multiplicity.unresolved_placement, true);
  assert.ok(uninvokedSeed.program_policy.outreg2_helper_multiplicity.missing_producer_names.includes("m1"));
  assert.equal(uninvokedSeed.file_findings.some((row) => row.rule === "unnecessary_outreg2_program"), false);
});

test("project audit accepts a Makefile that orchestrates multiple Stata do-files", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-make-orchestrator-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, "code"));
  fs.writeFileSync(path.join(project, "code", "assemble.do"), "version 18.0\nuse input.dta, clear\n");
  fs.writeFileSync(path.join(project, "code", "tables.do"), "summarize outcome\nregress outcome treatment\n");
  fs.writeFileSync(path.join(project, "code", "appendix.do"), "tabulate treatment\n");
  fs.writeFileSync(path.join(project, "Makefile"), [
    "all: build tables appendix",
    "build:",
    "\tcd code; $(STATA_CLI) -b do assemble.do",
    "tables:",
    "\tcd code; $(STATA_CLI) -b do tables.do",
    "appendix:",
    "\tcd code; $(STATA_CLI) -b do appendix.do",
  ].join("\n"));
  const result = await client.tool("audit_stata_project", { path: project });
  assert.equal(result.summary.top_master, "Makefile");
  assert.deepEqual(result.orchestration.external[0].resolved_do_files, ["code/assemble.do", "code/tables.do", "code/appendix.do"]);
  assert.equal(result.structural_findings.some((row) => row.rule === "missing_master"), false);
  assert.equal(result.structural_findings.some((row) => row.rule === "missing_master_orchestration"), false);
  assert.equal(result.stage_coverage.find((row) => row.stage === "master_orchestration").status, "present");
  assert.ok(result.call_graph.filter((row) => row.from === "Makefile" && row.status === "resolved").length === 3);
});

test("Makefile Stata recipes remain separate execution sessions", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-make-session-isolation-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(project, "alpha.do"), "global callopts , nostop\nregress y x\nestimates store m1\n", "utf8");
  fs.writeFileSync(path.join(project, "beta.do"), [
    formatter,
    'outreg2_xlsx, estimates("m1") workbook("table.xlsx") sheet("a") adjdec(3) meandec(6) replace',
    'outreg2_xlsx, estimates("m1") workbook("table.xlsx") sheet("b") adjdec(3) meandec(6)',
    'do "worker.do" $callopts',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(project, "worker.do"), "summarize y\n", "utf8");
  fs.writeFileSync(path.join(project, "Makefile"), [
    "all: alpha beta",
    "alpha:",
    "\t$(STATA_CLI) -b do alpha.do",
    "beta:",
    "\t$(STATA_CLI) -b do beta.do",
  ].join("\n"), "utf8");
  const result = await client.tool("audit_stata_project", { path: project, expected_stages: ["exports", "master_orchestration"] });
  assert.equal(result.program_policy.outreg2_helper_multiplicity.producer_consumer_status, "missing_active_producer");
  assert.ok(result.program_policy.outreg2_helper_multiplicity.missing_producer_names.includes("m1"));
  assert.equal(result.file_findings.some((row) => row.file === "beta.do" && row.rule === "master_call_nostop"), false, JSON.stringify(result.file_findings));
});

function buildWorkflowReproductionFixture(root) {
  for (const relative of ["code", "data/final", "output/tables", "output/figures", "output/estimates"]) {
    fs.mkdirSync(path.join(root, ...relative.split("/")), { recursive: true });
  }
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "global FINAL \"$PROJECT_ROOT/data/final\"",
    "global OUTPUT \"$PROJECT_ROOT/output\"",
    "do \"$PROJECT_ROOT/code/10_summary_stats.do\"",
    "do \"$PROJECT_ROOT/code/20_estimation.do\"",
    "do \"$PROJECT_ROOT/code/30_tables.do\"",
    "do \"$PROJECT_ROOT/code/40_figures.do\"",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "10_summary_stats.do"), [
    "use \"$PROJECT_ROOT/data/raw/directors.dta\", clear",
    "assert inrange(year, 2015, 2024)",
    "collapse (mean) mean_age=age (sd) sd_age=age (count) n=age (sum) sum_age=age (p25) p25_age=age (p50) p50_age=age (p75) p75_age=age, by(period)",
    "save \"$FINAL/female_director_age_summary.dta\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "20_estimation.do"), [
    "use \"$FINAL/analysis_panel.dta\", clear",
    "regress outcome treatment controls i.year, vce(cluster firm_id)",
    "estimates save \"$OUTPUT/estimates/main.ster\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "30_tables.do"), [
    "use \"$FINAL/female_director_age_summary.dta\", clear",
    "collect get mean_age = mean_age sd_age = sd_age n = n",
    "collect export \"$OUTPUT/tables/female_director_age.xlsx\", replace",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "code", "40_figures.do"), [
    "use \"$FINAL/female_director_age_summary.dta\", clear",
    "graph bar mean_age, over(period)",
    "graph export \"$OUTPUT/figures/female_director_age.pdf\", replace",
  ].join("\n"));
  for (const relative of ["data/final/female_director_age_summary.dta", "output/tables/female_director_age.xlsx", "output/figures/female_director_age.pdf", "output/estimates/main.ster"]) {
    fs.writeFileSync(path.join(root, ...relative.split("/")), "fixture");
  }
}

test("workflow reproduction checker validates semantic stages and a shared summary dataset", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "stata-workflow-reproduction-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  buildWorkflowReproductionFixture(project);
  const contract = {
    entrypoint: "00_master.do",
    required_stages: ["integrity_audit", "descriptives_balance_sample_flow", "estimation", "figures", "exports", "master_orchestration"],
    required_files: ["code/10_summary_stats.do", "code/20_estimation.do", "code/30_tables.do", "code/40_figures.do"],
    required_calls: ["code/10_summary_stats.do", "code/20_estimation.do", "code/30_tables.do", "code/40_figures.do"],
    deliverables: [
      { pattern: "output/tables/*.xlsx", expected_count: 1 },
      { pattern: "output/figures/*.pdf", expected_count: 1 },
      { pattern: "output/estimates/*.ster", expected_count: 1 },
    ],
    summary_datasets: [{
      path: "data/final/female_director_age_summary.dta",
      required_statistics: ["mean", "sd", "n", "sum", "p25", "p50", "p75"],
      required_variables: ["mean_age", "sd_age", "n", "sum_age", "p25_age", "p50_age", "p75_age"],
      table_consumer: "code/30_tables.do",
      figure_consumer: "code/40_figures.do",
    }],
  };
  const passed = await client.tool("workflow_reproduction_check", { path: project, contract });
  assert.equal(passed.status, "reproduced", JSON.stringify(passed.blockers));
  assert.ok(passed.checks.every((row) => row.status === "pass"));
  assert.equal(passed.summary_contract[0].shared_consumer_dataset, true);
  assert.deepEqual(passed.summary_contract[0].required_variables, ["mean_age", "sd_age", "n", "sum_age", "p25_age", "p50_age", "p75_age"]);
  assert.match(passed.claim_boundary, /code similarity/i);

  const missingVariable = await client.tool("workflow_reproduction_check", {
    path: project,
    contract: {
      ...contract,
      summary_datasets: [{ ...contract.summary_datasets[0], required_variables: ["mean_age", "sd_age", "n_age"] }],
    },
  });
  assert.equal(missingVariable.status, "needs_revision");
  assert.ok(missingVariable.blockers.some((row) => row.check === "summary_variables:1"));

  fs.writeFileSync(path.join(project, "code", "40_figures.do"), [
    "use \"$FINAL/other_summary.dta\", clear",
    "graph bar mean_age, over(period)",
  ].join("\n"));
  const failed = await client.tool("workflow_reproduction_check", { path: project, contract });
  assert.equal(failed.status, "needs_revision");
  assert.ok(failed.blockers.some((row) => row.check.includes("summary_figure_consumer")));
});

test("repair planning recognizes Korean and English review-only requests without suppressing actual additions", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-review-intent-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "main.do"), "version 18.0\nuse panel.dta, clear\nregress response treated\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  for (const request of [
    "이 회귀 코드를 수정하지 말고 점검과 발전 가능성만 평가해 주세요.",
    "Review and assess the regression workflow only; do not change files.",
  ]) {
    const plan = await client.tool("plan_dictionary_repairs", { path: root, request });
    assert.equal(plan.intent, "review_only");
    assert.equal(plan.write_authorization.status, "not_requested");
    assert.equal(plan.retrieval_plan.code_required, false);
    assert.equal(plan.retrieval_plan.scale, "no_write");
  }

  const reviewOverhaul = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Review this entire workflow as an overhaul assessment only; do not modify anything.",
    repair_mode: "overhaul",
    intent_mode: "overhaul",
  });
  assert.equal(reviewOverhaul.intent, "review_only");
  assert.equal(reviewOverhaul.mode, "partial");
  assert.equal(reviewOverhaul.write_authorization.status, "not_requested");
  assert.equal(reviewOverhaul.retrieval_plan.code_required, false);
  assert.equal(reviewOverhaul.overhaul_prewrite_proposal, null);

  const repair = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Review the regression and fix the detected error.",
  });
  assert.equal(repair.intent, "modify_existing");
  assert.equal(repair.write_authorization.status, "requested");

  const addition = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Preserve the existing master but add an Excel results workbook.",
  });
  assert.equal(addition.intent, "add_feature");
  assert.equal(addition.write_authorization.status, "requested");
  assert.equal(addition.retrieval_plan.code_required, true);
});

test("tool schemas expose review-only authoring state and reachable audit scope contracts", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const listed = await client.request("tools/list");
  const plan = listed.tools.find((row) => row.name === "plan_dictionary_repairs");
  const lint = listed.tools.find((row) => row.name === "lint_do_file");
  const audit = listed.tools.find((row) => row.name === "audit_stata_project");
  assert.ok(plan.inputSchema.properties.intent_mode.enum.includes("review_only"));
  assert.ok(plan.inputSchema.properties.scope.properties.include_paths);
  assert.deepEqual(plan.inputSchema.properties.source_reuse.properties.allowed_changes.items.properties.operation.enum, ["replace_literal", "delete_literal", "insert_after_literal"]);
  assert.deepEqual(lint.inputSchema.properties.authoring_state.enum, ["new", "modified", "existing_audit"]);
  assert.ok(Array.isArray(lint.inputSchema.oneOf));
  assert.equal(Object.hasOwn(lint.inputSchema, "anyOf"), false);
  assert.deepEqual(lint.inputSchema.oneOf, [{ required: ["path"] }, { required: ["content"] }]);
  assert.deepEqual(audit.inputSchema.properties.scope.properties.mode.enum, ["reachable", "all"]);
  assert.ok(audit.inputSchema.properties.authored_spans);
  assert.ok(audit.inputSchema.properties.estimability_readback);
  assert.equal(audit.inputSchema.properties.estimability_readback.properties.models.items.properties.declared_nonreference_terms.minItems, 1);
  assert.deepEqual(audit.inputSchema.properties.report_policy.enum, ["required", "optional", "disabled"]);
});

test("lint_do_file requires exactly one input source at schema and runtime boundaries", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-lint-input-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const doPath = path.join(root, "sample.do");
  fs.writeFileSync(doPath, "sysuse auto, clear\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  assert.equal((await client.tool("lint_do_file", { content: "" })).source, "inline");
  assert.equal((await client.tool("lint_do_file", { path: doPath })).source, doPath);

  for (const argumentsValue of [{}, { path: doPath, content: "sysuse auto, clear" }]) {
    const result = await client.request("tools/call", { name: "lint_do_file", arguments: argumentsValue });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /정확히 하나/);
    assert.match(result.structuredContent.error, /정확히 하나/);
  }
});

test("report policy and audit scope enums fail closed while valid defaults and aliases remain stable", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-runtime-enums-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "analysis.do"), "sysuse auto, clear\nregress price mpg\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const invalidCalls = [];
  for (const reportPolicy of ["bogus", "", null]) {
    invalidCalls.push(["plan_dictionary_repairs", { path: root, request: "Review only.", report_policy: reportPolicy }]);
    invalidCalls.push(["audit_stata_project", { path: root, report_policy: reportPolicy }]);
    invalidCalls.push(["research_output_check", { path: root, deliverables: [{ pattern: "*.xlsx", expected_count: 0 }], report_policy: reportPolicy }]);
  }
  for (const mode of ["bogus", "", null]) {
    invalidCalls.push(["audit_stata_project", { path: root, scope: { mode } }]);
    invalidCalls.push(["research_output_check", { path: root, deliverables: [{ pattern: "*.xlsx", expected_count: 0 }], scope: { mode } }]);
  }
  for (const [name, args] of invalidCalls) {
    const result = await client.request("tools/call", { name, arguments: args });
    assert.equal(result.isError, true, `${name}: ${JSON.stringify(args)}`);
  }

  const defaultPlan = await client.tool("plan_dictionary_repairs", { path: root, request: "Add an Excel output." });
  assert.equal(defaultPlan.work_report_contract.report_policy, "required");
  const noReportPlan = await client.tool("plan_dictionary_repairs", { path: root, request: "Add an Excel output, but do not create report.md." });
  assert.equal(noReportPlan.work_report_contract.report_policy, "disabled");

  const defaultAudit = await client.tool("audit_stata_project", { path: root, expected_stages: ["import", "estimation"] });
  assert.equal(defaultAudit.scope.mode, "reachable");
  assert.equal(defaultAudit.work_report.required, false);
  const legacyAudit = await client.tool("audit_stata_project", { path: root, require_report: true, expected_stages: ["import", "estimation"] });
  assert.equal(legacyAudit.work_report.required, true);
  const explicitWins = await client.tool("audit_stata_project", { path: root, require_report: true, report_policy: "disabled", expected_stages: ["import", "estimation"] });
  assert.equal(explicitWins.work_report.required, false);

  const defaultOutput = await client.tool("research_output_check", {
    path: root,
    deliverables: [{ pattern: "*.xlsx", expected_count: 0 }],
    expected_stages: ["import", "estimation"],
  });
  assert.equal(defaultOutput.static_audit.work_report.required, true);
});

test("Stata runtime tests return immediately after an unavailable-runtime skip", () => {
  for (const file of [
    "event_reference_slot_runtime.test.cjs",
    "state_transition_runtime.test.cjs",
    "structural_transitions_runtime.test.cjs",
  ]) {
    const content = fs.readFileSync(path.join(__dirname, file), "utf8");
    assert.match(content, /if \(!stata\) return t\.skip\(/, file);
  }
});

test("reachable project audit isolates inactive files while all-files scope retains a full repository scan", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-audit-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.mkdirSync(path.join(root, "archive"));
  fs.mkdirSync(path.join(root, "alt"));
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "* 분석용 자료에서 주 모형을 추정한다.",
    'do "$PROJECT_ROOT/code/10_model.do"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "code", "10_model.do"), "sysuse auto, clear\nregress price mpg\n", "utf8");
  fs.writeFileSync(path.join(root, "archive", "old_attempt.do"), "merge m:m id using legacy.dta\n", "utf8");
  fs.writeFileSync(path.join(root, "alt", "launcher.do"), "global callopts , nostop\ndo \"helper.do\"\n", "utf8");
  fs.writeFileSync(path.join(root, "alt", "helper.do"), "do \"stage.do\" $callopts\n", "utf8");
  fs.writeFileSync(path.join(root, "alt", "stage.do"), "summarize price\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const scopeArgs = { path: root, expected_stages: ["import", "estimation", "master_orchestration"] };
  const reachable = await client.tool("audit_stata_project", scopeArgs);
  assert.equal(reachable.scope.mode, "reachable");
  assert.ok(reachable.scope.active_files.includes("00_master.do"));
  assert.ok(reachable.scope.inactive_files.includes("archive/old_attempt.do"));
  assert.equal(reachable.static_status, "static_clean", JSON.stringify(reachable.structural_findings));
  assert.ok(reachable.inactive_findings.some((row) => row.file === "archive/old_attempt.do" && row.rule === "inactive_file_outside_scope"));
  assert.equal(reachable.file_findings.some((row) => row.file === "archive/old_attempt.do"), false);

  const all = await client.tool("audit_stata_project", { ...scopeArgs, scope: { mode: "all" } });
  assert.equal(all.scope.mode, "all");
  assert.equal(all.static_status, "blocked");
  assert.ok(all.file_findings.some((row) => row.file === "archive/old_attempt.do" && row.rule === "merge_m_m"));
  assert.ok(all.file_findings.some((row) => row.file === "alt/helper.do" && row.rule === "master_call_nostop"));
});

test("explicit reachable entrypoint avoids inactive missing-master blocks and full lint across more than one thousand discovered files", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-large-inactive-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archive = path.join(root, "inactive");
  fs.mkdirSync(archive);
  fs.writeFileSync(path.join(root, "active.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nsysuse auto, clear\n", "utf8");
  for (let index = 0; index < 1001; index += 1) {
    fs.writeFileSync(path.join(archive, `unused_${String(index).padStart(4, "0")}.do`), "shell arbitrary-tool\n", "utf8");
  }
  const client = new McpClient();
  t.after(() => client.close());

  const audit = await client.tool("audit_stata_project", {
    path: root,
    scope: { mode: "reachable", entrypoints: ["active.do"] },
    expected_stages: ["import"],
  });
  assert.equal(audit.summary.discovered_do_files, 1002);
  assert.equal(audit.summary.do_files, 1);
  assert.equal(audit.summary.inactive_do_files, 1001);
  assert.equal(audit.structural_findings.some((row) => row.rule === "missing_master"), false);
  assert.equal(audit.file_findings.some((row) => row.rule === "process_escape"), false);
  assert.equal(audit.inactive_findings.filter((row) => row.rule === "inactive_file_outside_scope").length, 1001);
});

test("excluded archive is pruned before discovery cap and call-graph construction", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-pruned-archive-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const archive = path.join(root, "archive");
  fs.mkdirSync(archive);
  fs.writeFileSync(path.join(root, "active.do"), "version 18.0\nglobal PROJECT_ROOT = c(pwd)\nsysuse auto, clear\n", "utf8");
  for (let index = 0; index < 10001; index += 1) {
    fs.writeFileSync(path.join(archive, `unused_${String(index).padStart(5, "0")}.do`), 'do "another_unused.do"\n', "utf8");
  }
  const client = new McpClient();
  t.after(() => client.close());

  const started = Date.now();
  const audit = await client.tool("audit_stata_project", {
    path: root,
    scope: { mode: "reachable", entrypoints: ["active.do"], exclude_paths: ["archive"] },
    expected_stages: ["import"],
  });
  assert.equal(audit.summary.discovered_do_files, 1);
  assert.deepEqual(audit.scope.active_files, ["active.do"]);
  assert.ok(audit.excluded_directories.includes("archive"));
  assert.equal(audit.file_findings.some((row) => row.rule === "process_escape"), false);
  assert.ok(Date.now() - started < 5000, `pruned audit took ${Date.now() - started}ms`);
});

test("large inactive call graph uses indexed target resolution", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-indexed-callgraph-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inactive = path.join(root, "inactive");
  fs.mkdirSync(inactive);
  fs.writeFileSync(path.join(root, "active.do"), "sysuse auto, clear\n", "utf8");
  fs.writeFileSync(path.join(inactive, "shared.do"), "display 1\n", "utf8");
  for (let index = 0; index < 3000; index += 1) {
    fs.writeFileSync(path.join(inactive, `caller_${String(index).padStart(4, "0")}.do`), 'do "shared.do"\n', "utf8");
  }
  const client = new McpClient();
  t.after(() => client.close());

  const started = Date.now();
  const audit = await client.tool("audit_stata_project", {
    path: root,
    scope: { mode: "reachable", entrypoints: ["active.do"] },
    expected_stages: ["import"],
  });
  const elapsed = Date.now() - started;
  assert.equal(audit.call_graph.length, 3000);
  assert.ok(audit.call_graph.every((row) => row.status === "resolved"));
  assert.equal(audit.summary.do_files, 1);
  assert.ok(elapsed < 5000, `indexed call-graph audit took ${elapsed}ms`);
});

test("ambiguous top-level masters require an explicit entrypoint before active lint", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-ambiguous-entrypoint-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "alpha_master.do"), 'version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo "alpha.do"\n', "utf8");
  fs.writeFileSync(path.join(root, "alpha.do"), "sysuse auto, clear\nregress price mpg\n", "utf8");
  fs.writeFileSync(path.join(root, "beta_master.do"), 'version 18.0\nglobal PROJECT_ROOT = c(pwd)\ndo "beta.do"\n', "utf8");
  fs.writeFileSync(path.join(root, "beta.do"), "merge m:m id using legacy.dta\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const ambiguous = await client.tool("audit_stata_project", { path: root, expected_stages: [] });
  assert.equal(ambiguous.static_status, "needs_review");
  assert.equal(ambiguous.summary.top_master, null);
  assert.deepEqual(ambiguous.scope.active_files, []);
  assert.ok(ambiguous.structural_findings.some((row) => row.rule === "entrypoint_selection_ambiguous"));
  assert.equal(ambiguous.file_findings.some((row) => row.rule === "merge_m_m"), false);

  const explicit = await client.tool("audit_stata_project", {
    path: root,
    scope: { mode: "reachable", entrypoints: ["alpha_master.do"] },
    expected_stages: ["import", "estimation", "master_orchestration"],
  });
  assert.equal(explicit.summary.top_master, "alpha_master.do");
  assert.ok(explicit.scope.active_files.includes("alpha.do"));
  assert.equal(explicit.scope.active_files.includes("beta.do"), false);
  assert.equal(explicit.file_findings.some((row) => row.rule === "merge_m_m"), false);
});

test("producer-consumer state is isolated across disconnected all-scope workflows", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-component-output-flow-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(root, "alpha_master.do"), 'do "alpha_models.do"\n', "utf8");
  fs.writeFileSync(path.join(root, "alpha_models.do"), "sysuse auto, clear\nregress price mpg\nestimates store shared\n", "utf8");
  fs.writeFileSync(path.join(root, "beta_master.do"), 'do "beta_tables.do"\n', "utf8");
  fs.writeFileSync(path.join(root, "beta_tables.do"), [
    formatter,
    'outreg2_xlsx, estimates("shared") workbook("table.xlsx") sheet("first") replace',
    'outreg2_xlsx, estimates("shared") workbook("table.xlsx") sheet("second")',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const audit = await client.tool("audit_stata_project", {
    path: root,
    scope: { mode: "all" },
    expected_stages: ["import", "estimation", "exports", "master_orchestration"],
  });
  const multiplicity = audit.program_policy.outreg2_helper_multiplicity;
  assert.equal(multiplicity.maximum_sheet_count_per_workbook, 2);
  assert.equal(multiplicity.producer_consumer_status, "missing_active_producer", JSON.stringify(multiplicity));
  assert.deepEqual(multiplicity.missing_producer_names, ["shared"]);
  assert.notEqual(multiplicity.calls[0].component_id, multiplicity.producer_evidence[0].component_id);
});

test("report coverage checks authored substantive spans but excludes harmless primitives", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-report-coverage-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "analysis.do"), [
    "sysuse auto, clear",
    "regress price mpg",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "report.md"), "No template or general-rule fallback spans.\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const primitiveOnly = await client.tool("audit_stata_project", {
    path: root,
    require_report: true,
    authored_spans: [{ target: "analysis.do", lines: "1-1" }],
    expected_stages: ["import"],
  });
  assert.equal(primitiveOnly.work_report.coverage.status, "complete");
  assert.deepEqual(primitiveOnly.work_report.coverage.uncovered, []);

  const substantive = await client.tool("audit_stata_project", {
    path: root,
    require_report: true,
    authored_spans: [{ target: "analysis.do", lines: "1-2" }],
    expected_stages: ["import", "estimation"],
  });
  assert.equal(substantive.work_report.coverage.status, "incomplete");
  assert.ok(substantive.work_report.coverage.uncovered.some((row) => row.target === "analysis.do" && row.line === 2));
  assert.equal(substantive.static_status, "blocked");
});

test("project-level local macros resolve multi-sheet formatter placement and estimate producers", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-local-output-flow-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(root, "00_master.do"), [
    "version 18.0",
    "global PROJECT_ROOT = c(pwd)",
    "* 주 추정 결과를 저장한다.",
    'do "$PROJECT_ROOT/code/10_models.do"',
    "* 저장한 추정치를 독자가 읽는 workbook으로 조립한다.",
    'do "$PROJECT_ROOT/code/20_tables.do"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "code", "10_models.do"), [
    "sysuse auto, clear",
    "regress price mpg",
    "estimates store base",
    'estimates save "output/estimates/base.ster", replace',
    "regress price mpg weight",
    "estimates store extended",
    'estimates save "output/estimates/extended.ster", replace',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "code", "20_tables.do"), [
    formatter,
    'local saved_models "base extended"',
    'local workbook "output/tables/results.xlsx"',
    'local first_sheet "baseline"',
    'local second_sheet "sensitivity"',
    'outreg2_xlsx, estimates("`saved_models\'") workbook("`workbook\'") sheet("`first_sheet\'") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("`saved_models\'") workbook("`workbook\'") sheet("`second_sheet\'") adjdec(3) meandec(2)',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const audit = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation", "exports", "master_orchestration"],
  });
  const multiplicity = audit.program_policy.outreg2_helper_multiplicity;
  assert.equal(multiplicity.unresolved_estimates, false, JSON.stringify(multiplicity));
  assert.equal(multiplicity.unresolved_placement, false, JSON.stringify(multiplicity));
  assert.equal(multiplicity.maximum_sheet_count_per_workbook, 2);
  assert.equal(multiplicity.necessary, true);
  assert.equal(multiplicity.producer_consumer_status, "confirmed", JSON.stringify(multiplicity));
  assert.ok(multiplicity.producer_evidence.some((row) => row.estimate_name === "base"));
  assert.ok(multiplicity.producer_evidence.some((row) => row.estimate_name === "extended"));
});

test("durable ster files do not masquerade as active stored-estimate producers", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-durable-only-output-flow-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(root, "analysis.do"), [
    "sysuse auto, clear",
    "regress price mpg",
    'estimates save "base.ster", replace',
    formatter,
    'outreg2_xlsx, estimates("base") workbook("table.xlsx") sheet("main") replace',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const audit = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation", "exports"],
  });
  const multiplicity = audit.program_policy.outreg2_helper_multiplicity;
  assert.equal(multiplicity.producer_consumer_status, "durable_state_requires_load_or_store");
  assert.deepEqual(multiplicity.produced_estimates, []);
  assert.deepEqual(multiplicity.durable_estimates, ["base"]);
  assert.deepEqual(multiplicity.durable_only_producer_names, ["base"]);
});

test("multi-sheet evidence respects producer order and call-time local macro values", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-output-flow-order-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const formatter = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
  fs.writeFileSync(path.join(root, "analysis.do"), [
    "sysuse auto, clear",
    formatter,
    'local workbook "table.xlsx"',
    'local sheet "first"',
    'outreg2_xlsx, estimates("late_model") workbook("`workbook\'") sheet("`sheet\'") replace',
    "regress price mpg",
    "estimates store late_model",
    'local sheet "second"',
    'outreg2_xlsx, estimates("late_model") workbook("`workbook\'") sheet("`sheet\'")',
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const audit = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation", "exports"],
  });
  const multiplicity = audit.program_policy.outreg2_helper_multiplicity;
  assert.equal(multiplicity.maximum_sheet_count_per_workbook, 2, JSON.stringify(multiplicity));
  assert.equal(multiplicity.calls[0].sheet, "first");
  assert.equal(multiplicity.calls[1].sheet, "second");
  assert.deepEqual(multiplicity.calls[0].unresolved_estimate_names, ["late_model"]);
  assert.deepEqual(multiplicity.calls[1].unresolved_estimate_names, []);
  assert.equal(multiplicity.producer_consumer_status, "missing_active_producer");
});

test("estimability readback reports substantive review separately from static workflow status", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-estimability-readback-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "event_model.do"), [
    "sysuse auto, clear",
    "quietly reghdfe price 2019bn.year#1.treated 2020bn.year#1.treated i.foreign##c.year, absorb(foreign)",
  ].join("\n"), "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const staticOnly = await client.tool("audit_stata_project", { path: root, expected_stages: ["import", "estimation"] });
  assert.notEqual(staticOnly.static_status, "blocked");
  assert.equal(staticOnly.runtime_estimability.status, "required");
  assert.equal(staticOnly.substantive_validity.status, "not_determined");

  const readback = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation"],
    estimability_readback: { models: [{
      model_id: "main_event_model",
      declared_nonreference_terms: ["2019bn.year#1.treated", "2020bn.year#1.treated"],
      declared_reference_terms: ["2018bn.year#1.treated"],
      observed_eb_terms: ["2019bn.year#1.treated", "2020o.year#1.treated"],
    }] },
  });
  assert.notEqual(readback.static_status, "blocked");
  assert.equal(readback.runtime_estimability.status, "complete");
  assert.equal(readback.substantive_validity.status, "needs_review");
  assert.equal(
    readback.runtime_estimability.models[0].terms.find((row) => row.declared === "2020bn.year#1.treated").status,
    "omitted",
  );
  assert.equal(readback.selector_readiness.status, "incomplete");

  const rawMismatch = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation"],
    estimability_readback: { models: [{
      model_id: "compact_first_token",
      declared_nonreference_terms: ["2015bn.year#1.treated"],
      observed_eb_terms: ["2015b.year#1.treated"],
    }] },
  });
  assert.equal(rawMismatch.runtime_estimability.status, "incomplete");
  assert.equal(rawMismatch.selector_readiness.status, "incomplete");
  assert.ok(rawMismatch.substantive_validity.issues.some((row) => row.status === "raw_name_mismatch"));

  const presentReference = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation"],
    estimability_readback: { models: [{
      model_id: "present_reference",
      declared_nonreference_terms: ["2018bn.year#1.treated"],
      declared_reference_terms: ["2019bn.year#1.treated"],
      observed_eb_terms: ["2018bn.year#1.treated", "2019bn.year#1.treated"],
    }] },
  });
  assert.equal(presentReference.runtime_estimability.status, "incomplete");
  assert.equal(presentReference.selector_readiness.status, "incomplete");
  assert.ok(presentReference.substantive_validity.issues.some((row) => row.status === "reference_present"));

  const emptyDeclaration = await client.tool("audit_stata_project", {
    path: root,
    expected_stages: ["import", "estimation"],
    estimability_readback: { models: [{
      model_id: "empty_declaration",
      declared_nonreference_terms: [],
      observed_eb_terms: [],
    }] },
  });
  assert.equal(emptyDeclaration.runtime_estimability.status, "incomplete");
  assert.equal(emptyDeclaration.substantive_validity.status, "needs_review");
  assert.equal(emptyDeclaration.substantive_validity.issues[0].status, "undeclared");
});

test("derived canonical source evidence cannot double-count its own lineage as independent support", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    variant_id: "outreg2_from_persisted_ster_then_xlsx",
  });
  const review = result.results[0].source_package_review;
  assert.match(review.evidence_class, /^derived/);
  assert.equal(typeof review.lineage_id, "string");
  assert.ok(review.lineage_id.length > 0);
  assert.equal(review.independent_support, false);
});

test("native Stata python script integration is distinct from external process escapes", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const nativeIntegration = await client.tool("lint_do_file", {
    content: 'python script "tools/transform_records.py", args("data/input.dta" "data/output.dta")',
  });
  assert.equal(nativeIntegration.findings.some((row) => row.rule === "process_escape"), false);
  assert.notEqual(nativeIntegration.status, "blocked", JSON.stringify(nativeIntegration.findings));

  const continuedNativeIntegration = await client.tool("lint_do_file", {
    content: 'python script "tools/transform_records.py", ///\n    args("data/input.dta" "data/output.dta")',
  });
  assert.equal(continuedNativeIntegration.findings.some((row) => row.rule === "process_escape"), false);
  assert.ok(continuedNativeIntegration.strengths.some((row) => row.rule === "stata_native_python_script"));

  for (const command of [
    'shell python "tools/transform_records.py"',
    'winexec python "tools/transform_records.py"',
    '!python "tools/transform_records.py"',
    'python:',
  ]) {
    const result = await client.tool("lint_do_file", { content: command });
    assert.equal(result.status, "blocked", command);
    assert.ok(result.findings.some((row) => row.rule === "process_escape"), command);
  }
});

test("report policy can disable report and authored-span coverage while retaining the legacy required alias", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-report-policy-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "analysis.do"), "sysuse auto, clear\nregress price mpg\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const disabled = await client.tool("audit_stata_project", {
    path: root,
    report_policy: "disabled",
    authored_spans: [{ target: "analysis.do", lines: "1-2" }],
    expected_stages: ["import", "estimation"],
  });
  assert.equal(disabled.static_status, "static_clean");
  assert.equal(disabled.work_report.required, false);
  assert.equal(disabled.work_report.coverage.status, "not_checked");

  const required = await client.tool("audit_stata_project", {
    path: root,
    report_policy: "required",
    authored_spans: [{ target: "analysis.do", lines: "1-2" }],
    expected_stages: ["import", "estimation"],
  });
  assert.equal(required.static_status, "blocked");
  assert.equal(required.work_report.status, "missing");

  const legacyRequired = await client.tool("audit_stata_project", {
    path: root,
    require_report: true,
    authored_spans: [{ target: "analysis.do", lines: "1-2" }],
    expected_stages: ["import", "estimation"],
  });
  assert.equal(legacyRequired.work_report.status, "missing");
  assert.equal(legacyRequired.static_status, required.static_status);

  const disabledPlan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Add an Excel output, but do not create or modify report.md.",
  });
  assert.equal(disabledPlan.work_report_contract.report_policy, "disabled");
  assert.equal(disabledPlan.work_report_contract.required_after_code_write, false);
  assert.ok(disabledPlan.interventions.every((row) => row.general_rule_policy.report_required === false));
  assert.ok(disabledPlan.interventions.every((row) => row.general_rule_policy.rules.some((rule) => /Do not create or modify report\.md/.test(rule))));
  assert.ok(disabledPlan.interventions.every((row) => row.general_rule_policy.rules.every((rule) => !/Record every substantive general-rule span/.test(rule))));

  const optionalPlan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "Add an Excel output.",
    report_policy: "optional",
  });
  assert.equal(optionalPlan.work_report_contract.report_policy, "optional");
  assert.equal(optionalPlan.work_report_contract.required_after_code_write, false);
  assert.match(optionalPlan.work_report_contract.rule, /may be omitted/);
  assert.ok(optionalPlan.interventions.every((row) => row.general_rule_policy.rules.some((rule) => /may be omitted/.test(rule))));
});

test("source reuse planner clones a canonical do-file and blocks every undeclared edit", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-source-reuse-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = [
    "version 18.0",
    'local input "old.csv"',
    "import delimited using \"`input'\", clear",
    'save "old.dta", replace',
    "",
  ].join("\n");
  const expected = [
    "version 18.0",
    "capture log close _all",
    'local input "new.csv"',
    "import delimited using \"`input'\", clear",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, "canonical.do"), source, "utf8");
  fs.writeFileSync(path.join(root, "candidate.do"), expected, "utf8");
  const client = new McpClient();
  t.after(() => client.close());
  const sourceReuse = {
    canonical_source: "canonical.do",
    destination: "adapted.do",
    candidate_path: "candidate.do",
    allowed_changes: [
      { operation: "insert_after_literal", match: "version 18.0", text: "\ncapture log close _all", expected_occurrences: 1 },
      { operation: "replace_literal", match: 'local input "old.csv"', replacement: 'local input "new.csv"', expected_occurrences: 1 },
      { operation: "delete_literal", match: 'save "old.dta", replace\n', expected_occurrences: 1 },
    ],
  };
  const verified = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 원본 do-file을 복제하고 선언된 부분만 수정하세요.",
    source_reuse: sourceReuse,
  });
  assert.equal(verified.source_reuse_plan.template_id, "existing_do_file.clone_then_apply_declared_edits.v1");
  assert.equal(verified.source_reuse_plan.status, "verified");
  assert.equal(verified.source_reuse_plan.candidate_verification.exact_match, true);
  assert.equal(verified.source_reuse_plan.direct_generation_allowed, false);

  fs.writeFileSync(path.join(root, "candidate.do"), expected.replace("import delimited", "regress outcome treatment\nimport delimited"), "utf8");
  const blocked = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 원본 do-file을 복제하고 선언된 부분만 수정하세요.",
    source_reuse: sourceReuse,
  });
  assert.equal(blocked.source_reuse_plan.status, "blocked");
  assert.equal(blocked.source_reuse_plan.candidate_verification.status, "blocked_undeclared_change");
  assert.ok(blocked.source_reuse_plan.candidate_verification.first_difference.line >= 1);
});

test("planner routes updates, summary artifacts, and exact package commands without estimator-name expansion", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-planner-contracts-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  fs.writeFileSync(path.join(root, "code", "20_summary.do"), "summarize y\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const update = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "summarystats를 업데이트하세요",
    target_files: ["code/20_summary.do"],
  });
  assert.equal(update.intent, "modify_existing");
  assert.ok(update.write_authorization.decisive_evidence.includes("explicit_existing_do_target"));
  assert.deepEqual(update.compatibility_contract.mutable_existing_files, ["code/20_summary.do"]);
  assert.ok(update.dictionary_headwords.includes("descriptives.summary_dataset"), JSON.stringify(update.dictionary_headwords));
  assert.equal(update.dictionary_headwords.includes("descriptives.entity_collapse"), false);

  const summary = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기초통계 자료를 만들고 Excel과 그림으로 내보내세요",
    summary_artifact_interface: {
      producer: "code/20_summary.do",
      consumers: ["code/30_table.do", "code/40_figure.do"],
      path: "data/final/summary_stats.dta",
      required_variables: ["group", "mean_y", "sd_y", "n_y"],
      required_statistics: ["mean", "sd", "n"],
    },
  });
  for (const checkpoint of ["descriptives.summary_dataset", "exports.descriptive_excel_sheet", "figures.descriptive_bar"]) {
    assert.ok(summary.dictionary_headwords.includes(checkpoint), JSON.stringify(summary.dictionary_headwords));
  }
  assert.equal(summary.dictionary_headwords.includes("final_excel_assembly"), false);
  assert.equal(summary.compatibility_contract.summary_artifact_interface.status, "declared_immutable");
  assert.deepEqual(summary.compatibility_contract.summary_artifact_interface.consumers, ["code/30_table.do", "code/40_figure.do"]);
  assert.deepEqual(summary.compatibility_contract.summary_artifact_interface.immutable_fields, ["producer", "consumers", "path", "required_variables", "required_statistics"]);
  assert.equal(summary.dictionary_headwords.includes("descriptives.estpost_active_result"), false);

  const atomicRoutes = [
    ['append using "next.dta", generate(source_id)', "input_load.combine"],
    ["eststo model_name", "postest.persist_estimate"],
    ["margins treatment, at(time=(0 1 2))", "postest.margins"],
    ["marginsplot, recast(line) recastci(rarea)", "figures.marginsplot"],
    ['putexcel set "summary.xlsx", sheet("Summary") replace', "exports.matrix_excel"],
    ['collect export "summary.xlsx", replace', "exports.matrix_excel"],
    ["boottest treatment, null(0) cluster(cluster_id) reps(9999) seed(12345)", "robustness.bootstrap_inference"],
  ];
  for (const [request, checkpoint] of atomicRoutes) {
    const plan = await client.tool("plan_dictionary_repairs", { path: root, request });
    assert.deepEqual(plan.dictionary_headwords, [checkpoint], `${request}: ${JSON.stringify(plan.dictionary_headwords)}`);
  }

  for (const request of [
    "Please add a note about collect export.",
    "collect export 사용법을 README에 추가하세요.",
    "marginsplot 결과를 설명하는 문서만 업데이트하세요.",
    "boottest 관련 기존 설명을 검토하세요.",
  ]) {
    const plan = await client.tool("plan_dictionary_repairs", { path: root, request });
    assert.deepEqual(plan.dictionary_headwords, [], `${request}: ${JSON.stringify(plan.dictionary_headwords)}`);
  }

  const sparseCellAudit = await client.tool("search_labeled_checkpoints", {
    variant_id: "tabulate_twoway_row_chi2",
  });
  assert.ok(sparseCellAudit.results[0].selection_conditions.some((condition) => /cell support/i.test(condition)));
  assert.match(sparseCellAudit.results[0].review_notes, /cell support/i);

  const csdid = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "csdid y x, ivar(id) time(year) gvar(first_treat)",
  });
  assert.ok(csdid.dictionary_headwords.includes("estimation.staggered_did"));
  assert.equal(csdid.dictionary_headwords.includes("panel.treatment_cohort"), false);
  assert.equal(csdid.dictionary_headwords.includes("figures.event_study"), false);
  const estimation = csdid.interventions.find((row) => row.headword === "estimation.staggered_did");
  assert.equal(estimation.evidence_progress.command_anchor_gate.active, true);
  assert.ok(estimation.evidence_progress.command_anchor_gate.requested_anchors.includes("csdid"));
  if (estimation.chosen_variant) assert.ok(estimation.chosen_variant.code.toLowerCase().includes("csdid"));
});

test("source reuse supports staged in-place edits and exact block extraction insertion", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-source-reuse-modes-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "same.do"), "local input old\n", "utf8");
  fs.writeFileSync(path.join(root, "same_candidate.do"), "local input new\n", "utf8");
  fs.writeFileSync(path.join(root, "source.do"), "* BEGIN\nregress y x\n* END\n", "utf8");
  fs.writeFileSync(path.join(root, "destination.do"), "version 18.0\n* INSERT\n", "utf8");
  fs.writeFileSync(path.join(root, "block_candidate.do"), "version 18.0\n* INSERT\n* BEGIN\nregress y z\n* END\n", "utf8");
  const client = new McpClient();
  t.after(() => client.close());

  const inPlace = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 do-file을 제자리에서 수정하세요",
    source_reuse: {
      mode: "modify_in_place",
      canonical_source: "same.do",
      candidate_path: "same_candidate.do",
      allowed_changes: [{ operation: "replace_literal", match: "old", replacement: "new", expected_occurrences: 1 }],
    },
  });
  assert.equal(inPlace.source_reuse_plan.mode, "modify_in_place");
  assert.equal(inPlace.source_reuse_plan.same_file_destination, true);
  assert.equal(inPlace.source_reuse_plan.candidate_verification.exact_match, true);

  const block = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 코드 블록을 추출해 선언된 위치에 삽입하세요",
    source_reuse: {
      mode: "block_extract_insert",
      canonical_source: "source.do",
      destination: "destination.do",
      candidate_path: "block_candidate.do",
      source_block: { start_literal: "* BEGIN\n", end_literal: "* END\n" },
      insertion_anchor: { match: "* INSERT\n", expected_occurrences: 1, position: "after" },
      allowed_changes: [{ operation: "replace_literal", match: "regress y x", replacement: "regress y z", expected_occurrences: 1 }],
    },
  });
  assert.equal(block.source_reuse_plan.mode, "block_extract_insert");
  assert.equal(block.source_reuse_plan.status, "verified");
  assert.equal(block.source_reuse_plan.candidate_verification.exact_match, true);
  assert.equal(block.source_reuse_plan.block_contract.insertion_anchor.position, "after");
});

test("repair planner scope prunes inactive output trees before inventory", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-plan-scope-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "bad_codes"));
  fs.mkdirSync(path.join(root, "results"));
  fs.writeFileSync(path.join(root, "scripts", "analysis.do"), "sysuse auto, clear\nregress price mpg\n", "utf8");
  fs.writeFileSync(path.join(root, "bad_codes", "wrong.do"), "merge m:m id using old.dta\n", "utf8");
  fs.writeFileSync(path.join(root, "results", "large.bin"), Buffer.alloc(1024));
  const client = new McpClient();
  t.after(() => client.close());
  const plan = await client.tool("plan_dictionary_repairs", {
    path: root,
    request: "기존 분석을 점검만 하세요.",
    scope: { include_paths: ["scripts"], exclude_paths: ["bad_codes", "results"] },
  });
  assert.deepEqual(plan.observed_state.scan_scope.include_paths, ["scripts"]);
  assert.deepEqual(plan.observed_state.scan_scope.exclude_paths, ["bad_codes", "results"]);
  assert.equal(plan.observed_state.extension_counts[".do"], 1);
  assert.equal(plan.observed_state.extension_counts[".bin"], undefined);
});

test("indented merge options after continuation are not treated as new commands", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("lint_do_file", {
    content: "merge m:1 region_code year using `ledger', ///\n    assert(match) nogen\n",
  });
  assert.equal(result.findings.some((row) => row.rule === "dangling_line_continuation"), false, JSON.stringify(result.findings));
  assert.equal(result.findings.some((row) => row.rule === "merge_without_state_check"), false, JSON.stringify(result.findings));
});
