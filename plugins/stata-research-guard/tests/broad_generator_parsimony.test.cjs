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

const BROAD_VARIANTS = [
  ["panel.cohort_anticipation_exit_filter.v1", "cohort_with_anticipation_and_exit_filter"],
  ["panel.turnover_event_time.v1", "principal_turnover_first_event_and_relative_time"],
  ["clean.standardize_on_fixed_esample.v1", "standardize_components_on_named_common_sample"],
  ["sample.trade_share_threshold.v1", "cumulative_share_threshold_sample"],
  ["estimation.staggered_jwdid_ppmlhdfe.v1", "jwdid_ppmlhdfe_simple_effect"],
  ["estimation.twfe_ppmlhdfe.v1", "twfe_ppmlhdfe_same_sample_comparator"],
  ["panel.stack_wide_year_suffixes.v1", "reshape_wide_year_families_to_long_panel"],
  ["integrity.zip_using_rows_matched.v1", "using_side_rows_must_match_master"],
  ["robustness.dynamic_did_preperiod_placebo.v1", "preperiod_dynamic_did_placebo"],
  ["outlier.winsorize_two_sided_aggregate_wage.v1", "aggregate_then_two_sided_percentile_winsorization"],
  ["estimation.cgmreg_multicluster_arm_contrast.v1", "cgmreg_teacher_student_clusters_and_arm_tests"],
  ["clean.load_numeric_household_id.v1", "load_then_destring_household_id_in_place"],
  ["figure.event_study_did_imputation_event_plot.v1", "did_imputation_active_result_event_plot"],
  ["figure.event_study_did_multiplegt_event_plot.v1", "did_multiplegt_returned_matrices_event_plot"],
  ["figure.event_study_csdid_event_plot.v1", "csdid_estat_event_named_result_plot"],
  ["figure.event_study_sun_abraham_event_plot.v1", "eventstudyinteract_named_stub_plot"],
  ["figure.event_study_twfe_event_plot.v1", "twfe_named_event_terms_active_result_plot"],
  ["robustness.heterogeneity_nlcom_grid.v1", "nlcom_effect_grid_to_named_matrix"],
  ["setup.paths.manual_root_derived_folders.v1", "manual_root_with_derived_role_paths"],
  ["master.sequence.direct_calls.v1", "ordered_direct_do_calls"],
  ["clean.treatment_full_vs_control.v1", "map_multiarms_to_full_treatment_and_control"],
  ["treatment.teacher_any_arm_mapping.v1", "combine_gain_and_loss_teacher_arms"],
  ["sample.arm_response_eligibility.testscore_observed.v1", "observed_score_and_declared_study_arms"],
  ["descriptives.depvar_arm_means_esample.v1", "treatment_arm_means_on_named_estimation_sample"],
];

test("broad, project-bound generators remain reference evidence and are never automatically selectable", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  for (const [labelId, variantId] of BROAD_VARIANTS) {
    const result = await client.tool("search_labeled_checkpoints", { variant_id: variantId, limit: 5 });
    const row = result.results.find((candidate) => candidate.label_id === labelId);
    assert.ok(row, `${labelId} was not retrieved for exact variant ${variantId}`);
    assert.equal(row.rubric_classification, "reference_only", labelId);
    assert.equal(row.auto_select_allowed, false, labelId);
  }
});
