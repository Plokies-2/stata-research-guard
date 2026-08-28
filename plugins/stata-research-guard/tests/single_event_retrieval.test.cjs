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

function resultById(result, labelId) {
  const row = result.results.find((candidate) => candidate.label_id === labelId);
  assert.ok(row, `${labelId} was not retrieved: ${JSON.stringify(result.results.map((candidate) => candidate.label_id))}`);
  return row;
}

function automaticAxisProfile(outcomes) {
  return {
    expected_plots: outcomes.map((outcome) => ({ outcome, specification: "baseline", sample_comparison: "full sample" })),
    axis_groups: outcomes.map((outcome) => ({
      axis_group_id: `${outcome}_auto`,
      axis_mode: "automatic",
      outcomes: [outcome],
      specification: "baseline",
      sample_comparison: "full sample",
      decision_source: "caller_declared",
      grouping_evidence: [`${outcome} retains automatic scaling`],
    })),
  };
}

function fixedAxisProfile() {
  return {
    expected_plots: ["close_a", "close_b"].map((outcome) => ({ outcome, specification: "baseline", sample_comparison: "full sample" })),
    axis_groups: [{
      axis_group_id: "close_pair",
      axis_mode: "fixed_group",
      outcomes: ["close_a", "close_b"],
      specification: "baseline",
      sample_comparison: "full sample",
      coefficient_family: "event-time treatment effects",
      unit: "percentage points",
      transform: "level",
      grouping_reason: "one directly comparable outcome pair",
      decision_source: "model_from_metadata",
      grouping_evidence: ["the outcome definitions identify one close pair"],
      range_basis: "one readable range covers both confidence intervals",
      range: { min: -0.1, max: 0.1, step: 0.05 },
    }],
  };
}

function mixedAxisProfile(explicit) {
  const profile = fixedAxisProfile();
  profile.expected_plots.push({ outcome: "other", specification: "baseline", sample_comparison: "full sample" });
  profile.axis_groups.push({
    axis_group_id: "other_auto",
    axis_mode: "automatic",
    outcomes: ["other"],
    specification: "baseline",
    sample_comparison: "full sample",
    decision_source: "caller_declared",
    grouping_evidence: ["other is the automatic-axis complement"],
  });
  if (explicit) {
    profile.rendering_mode = "single_flat_mixed_axis_loop";
    profile.mixed_loop_binding = {
      target_path: "code/module.do",
      target_spans: [[1, 40]],
      outcome_loop_local: "all_outcomes",
      fixed_outcomes_local: "fixed_outcomes",
      axis_options_local: "axis_options",
    };
  }
  return profile;
}

test("one-outcome event study retains the older direct automatic-axis figure as reference-only mechanics", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    stage: "figures",
    commands: ["estimates use", "estimates store", "coefplot", "graph export"],
    task: "one-outcome event-study figure from two stored sample estimates; retain raw e(b) event terms with one omitted-base display slot, use automatic vertical scaling, put the comparison legend below the axis, title the graph with the raw outcome name, save GPH, and immediately export PDF",
    current_state: "one declared outcome has two stored e-class estimates with compatible raw factor-variable event coefficients and an explicit calendar display order",
    target_state: "one direct event-study figure with exactly one blank omitted-base slot, bottom comparison legend, raw outcome title, automatic y-axis, saved GPH, and immediate PDF",
    event_study_axis_profile: automaticAxisProfile(["outcome"]),
    limit: 20,
  });

  assert.equal(result.stage_gate.mode, "ranking_only_with_exact_checkpoint");
  const row = resultById(result, "figure.event_study_single_automatic.v1");
  assert.equal(row.rubric_classification, "reference_only");
  assert.equal(row.auto_select_allowed, false);
  assert.match(row.code, /estimates\s+use\b/i);
  assert.match(row.code, /estimates\s+store\b/i);
  assert.match(row.code, /coefplot\b/i);
  assert.match(row.code, /keep\(`event_terms'\)\s+order\(`event_order'\)\s+xlabel\(`event_xlabels'\)/i);
  assert.match(row.code, /addplot\(scatteri\s+0\s+`reference_position'/i);
  assert.match(row.code, /xline\(`policy_line',\s*lpattern\(dash\)\)/i);
  assert.match(row.code, /legend\([\s\S]*?(?:position|pos)\s*\(\s*6\s*\)/i);
  assert.match(row.code, /title\([\s\S]*?outcome/i);
  assert.match(row.code, /saving\([^\r\n]*\.gph[^\r\n]*replace\)/i);
  assert.match(row.code, /graph\s+export\s+[^\r\n]*\.pdf\b/i);
  assert.doesNotMatch(row.code, /^\s*(?:foreach|forvalues|while)\b/im);
  assert.doesNotMatch(row.code, /^\s*program\s+define\b/im);
  assert.doesNotMatch(row.code, /\b(?:yscale|ylabel)\s*\(/i);

  assert.ok(!result.results.some((candidate) => candidate.label_id === "figure.event_study_flat_loop_automatic.v1" && candidate.auto_select_allowed),
    "the multi-outcome flat-loop variant must not auto-select for exactly one outcome");
});

test("a fixed-only close-outcome request retains the dedicated flat-loop variant", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    stage: "figures",
    commands: ["foreach", "estimates use", "coefplot", "yscale", "ylabel", "graph export"],
    task: "2 outcomes form one genuinely close direct-comparison group with the same sample, specification, coefficient unit, and transform; use one evidenced common fixed y-axis, raw outcome titles, bottom legend, and immediate PDF export in one flat loop",
    current_state: "two close outcomes have compatible stored estimates, one declared fixed-axis range, and raw event coefficient display metadata",
    target_state: "one flat loop rendering both close outcomes on the same evidenced fixed range",
    event_study_axis_profile: fixedAxisProfile(),
    limit: 20,
  });

  const fixed = resultById(result, "figure.event_study_flat_loop_fixed_group.v1");
  assert.equal(fixed.rubric_classification, "reference_only");
  assert.equal(fixed.auto_select_allowed, false);
  assert.match(fixed.code, /\byscale\s*\(/i);
  assert.match(fixed.code, /\bylabel\s*\(/i);
  assert.ok(!result.results.some((row) => row.label_id === "figure.event_study_flat_loop_mixed_axis.v1" && row.auto_select_allowed));
});

test("axis-profile metadata strictly selects automatic fixed or explicit mixed rendering", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const scenarios = [
    {
      name: "single automatic",
      profile: automaticAxisProfile(["only_outcome"]),
      task: "2 outcomes event study",
      status: "all_automatic",
      pattern: "single_automatic_axis",
      label: "figure.event_study_single_automatic.v1",
    },
    {
      name: "multiple automatic",
      profile: automaticAxisProfile(["outcome_a", "outcome_b"]),
      task: "1 outcome event study",
      status: "all_automatic",
      pattern: "flat_loop_automatic_axis",
      label: "figure.event_study_flat_loop_automatic.v1",
    },
    {
      name: "all fixed",
      profile: fixedAxisProfile(),
      task: "automatic event study",
      status: "all_fixed",
      pattern: "flat_loop_fixed_group_axis",
      label: "figure.event_study_flat_loop_fixed_group.v1",
    },
    {
      name: "explicit mixed",
      profile: mixedAxisProfile(true),
      task: "mixed event study",
      status: "explicit_mixed",
      pattern: "single_flat_mixed_axis_loop",
      label: "figure.event_study_flat_loop_mixed_axis.v1",
    },
  ];
  for (const scenario of scenarios) {
    const result = await client.tool("search_labeled_checkpoints", {
      checkpoint: "figures.event_study",
      task: scenario.task,
      event_study_axis_profile: scenario.profile,
      limit: 20,
    });
    assert.equal(result.event_study_axis_pattern_gate.status, scenario.status, scenario.name);
    assert.deepEqual(result.event_study_axis_pattern_gate.required_patterns, [scenario.pattern], scenario.name);
    assert.equal(result.event_outcome_cardinality_selection.decision_source, "event_study_axis_profile", scenario.name);
    assert.deepEqual(result.results.filter((row) => row.auto_select_allowed).map((row) => row.label_id), [], scenario.name);
    const selected = resultById(result, scenario.label);
    assert.equal(selected.rubric_classification, "reference_only", scenario.name);
    assert.equal(selected.auto_select_allowed, false, scenario.name);
    assert.equal(selected.transition_role, "alternative", scenario.name);
    assert.equal(selected.selector_taxonomy.artifact_roles.inputs[0], "ster", scenario.name);
    assert.deepEqual(selected.selector_taxonomy.artifact_roles.required_outputs, ["pdf"], scenario.name);
    assert.deepEqual(selected.selector_taxonomy.artifact_roles.conditional_outputs, ["gph"], scenario.name);
    assert.equal(selected.selector_taxonomy.export_timing, "pdf_export_immediate_after_graph", scenario.name);
  }

  const unresolved = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    task: "3 outcomes with one fixed pair and one automatic outcome",
    event_study_axis_profile: mixedAxisProfile(false),
    limit: 20,
  });
  assert.equal(unresolved.event_study_axis_selection.selection_ready, true);
  assert.equal(unresolved.event_study_axis_pattern_gate.status, "mixed_profile_requires_explicit_rendering_mode");
  assert.deepEqual(unresolved.event_study_axis_pattern_gate.required_patterns, []);
  assert.deepEqual(unresolved.results, []);
  assert.equal(unresolved.general_rule_policy.implementation_allowed, false);
  assert.ok(unresolved.general_rule_policy.hard_stop_reasons.some((reason) => /mixed_profile_requires_explicit_rendering_mode/.test(reason)));
});

test("event-study searches without axis evidence retain metadata but expose no writable choice", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.event_study",
    limit: 20,
  });
  assert.equal(result.event_study_axis_pattern_gate.status, "metadata_inspection_no_axis_profile");
  assert.equal(result.event_study_axis_pattern_gate.selection_ready_for_auto_select, false);
  assert.deepEqual(result.event_study_axis_pattern_gate.required_patterns, []);
  assert.deepEqual(
    result.results.filter((row) => row.event_axis_pattern).map((row) => row.event_axis_pattern).sort(),
    ["flat_loop_automatic_axis", "flat_loop_fixed_group_axis", "single_automatic_axis", "single_flat_mixed_axis_loop"].sort(),
  );
  assert.deepEqual(result.results.filter((row) => row.auto_select_allowed), []);
  assert.equal(result.general_rule_policy.implementation_allowed, false);
  assert.ok(result.general_rule_policy.hard_stop_reasons.some((reason) => /cardinality|axis profile/i.test(reason)));

  const fixedMetadata = await client.tool("search_labeled_checkpoints", {
    variant_id: "stored_samples_flat_close_group_fixed_axis_pdf",
    limit: 5,
  });
  const fixed = resultById(fixedMetadata, "figure.event_study_flat_loop_fixed_group.v1");
  assert.ok(fixed.template_input_profile);
  assert.equal(fixed.auto_select_allowed, false);
});

for (const scenario of [
  { text: "1 outcome", requested: "single", selected: "figure.event_study_single_automatic.v1", excluded: "figure.event_study_flat_loop_automatic.v1" },
  { text: "outcome 1개", requested: "single", selected: "figure.event_study_single_automatic.v1", excluded: "figure.event_study_flat_loop_automatic.v1" },
  { text: "2 outcomes", requested: "multiple", selected: "figure.event_study_flat_loop_automatic.v1", excluded: "figure.event_study_single_automatic.v1" },
  { text: "2+ outcomes", requested: "multiple", selected: "figure.event_study_flat_loop_automatic.v1", excluded: "figure.event_study_single_automatic.v1" },
  { text: "outcome 2개", requested: "multiple", selected: "figure.event_study_flat_loop_automatic.v1", excluded: "figure.event_study_single_automatic.v1" },
]) {
  test(`event outcome cardinality ${JSON.stringify(scenario.text)} selects only its compatible figure atom`, async (t) => {
    const client = new McpClient();
    t.after(() => client.close());
    const result = await client.tool("search_labeled_checkpoints", {
      checkpoint: "figures.event_study",
      stage: "figures",
      task: `${scenario.text}; use stored estimates, raw e(b) event terms, an automatic axis, a bottom legend, saved GPH, and immediate PDF export`,
      limit: 20,
    });

    assert.equal(result.event_outcome_cardinality_selection.requested, scenario.requested);
    assert.equal(result.event_outcome_cardinality_selection.decision_source, "task_text");
    const selected = resultById(result, scenario.selected);
    assert.equal(selected.rubric_classification, "reference_only");
    assert.equal(selected.auto_select_allowed, false);
    assert.ok(result.event_outcome_cardinality_selection.excluded_label_ids.includes(scenario.excluded),
      JSON.stringify(result.event_outcome_cardinality_selection));
    assert.ok(!result.results.some((row) => row.label_id === scenario.excluded && row.auto_select_allowed),
      `${scenario.excluded} must not auto-select for ${scenario.text}`);
  });
}
