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
    readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity }).on("line", (line) => {
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

function byId(result, labelId) {
  const row = result.results.find((candidate) => candidate.label_id === labelId);
  assert.ok(row, `${labelId} missing from ${result.results.map((candidate) => candidate.label_id).join(", ")}; gate=${JSON.stringify(result.specificity_gate)}`);
  return row;
}

test("AEA-family summary atoms retain deposited-paper provenance and writable boundaries", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const summary = await client.tool("search_labeled_checkpoints", {
    checkpoint: "descriptives.summary_dataset",
    task: "canonical grouped summary dataset with mean count standard deviation sum and percentiles reshaped for downstream table and figure consumers",
    commands: ["collapse", "tabstat", "reshape long", "save"],
    limit: 20,
  });
  const expectedSummary = [
    ["descriptives.grouped_mean_count_tempfile.v1", "10.3886/E195983V1", true],
    ["descriptives.tabstat_count_mean_sd_rows.v1", "10.3886/E196012V1", true],
    ["descriptives.group_percentiles_collapse.v1", "10.3886/E193441V1", true],
    ["descriptives.rawsum_reshape_long_structure.v1", "10.3886/E209030V1", false],
  ];
  for (const [labelId, repositoryDoi, writable] of expectedSummary) {
    const row = byId(summary, labelId);
    assert.equal(row.source_kind, "deposited_research_code");
    assert.equal(row.source_package_review.repository_doi, repositoryDoi);
    assert.equal(row.auto_select_allowed, writable);
  }
  assert.ok(summary.general_rule_policy.closest_template_evidence.label_id);
  assert.equal(summary.general_rule_policy.closest_template_evidence.hint_role, "nonbinding_rank_relative_hint");
  assert.equal(summary.general_rule_policy.closest_template_evidence.absolute_compatibility, "not_established");
  assert.match(summary.general_rule_policy.closest_template_evidence.comparison_rule, /absolutely distant or incompatible/i);
  assert.match(summary.general_rule_policy.template_selection_rule, /genuinely close writable template/i);
  assert.doesNotMatch(JSON.stringify(summary.general_rule_policy), /why the remaining statements are shorter and clearer|fallback code is superior/i);

  const excel = await client.tool("search_labeled_checkpoints", {
    checkpoint: "exports.descriptive_excel_sheet",
    task: "write first and additional descriptive statistic sheets to one workbook",
    commands: ["export excel"],
    limit: 10,
  });
  for (const labelId of ["export.descriptive_excel.first_sheet.v1", "export.descriptive_excel.additional_sheet.v1"]) {
    const row = byId(excel, labelId);
    assert.equal(row.source_package_review.repository_doi, "10.3886/E209484V1");
    assert.equal(row.auto_select_allowed, true);
  }
  assert.match(byId(excel, "export.descriptive_excel.first_sheet.v1").code, /\breplace\b/i);
  assert.match(byId(excel, "export.descriptive_excel.additional_sheet.v1").code, /\bsheetmod\b/i);

  const bar = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.descriptive_bar",
    task: "grouped bar chart from precomputed long summary values",
    commands: ["graph bar"],
    limit: 10,
  });
  const barRow = byId(bar, "figure.descriptive_grouped_bar.v1");
  assert.equal(barRow.source_package_review.repository_doi, "10.3886/E196012V1");
  assert.equal(barRow.rubric_classification, "reference_only");
  assert.equal(barRow.auto_select_allowed, false);
  assert.doesNotMatch(barRow.code, /graph\s+export/i);
});

test("general-rule policy exposes none when retrieval has no ranked candidate", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    task: "cryptographic wavelet tensor output with no Stata summary transition",
    commands: ["frobnicate"],
    limit: 5,
  });
  assert.equal(result.results.length, 0);
  assert.equal(result.general_rule_policy.closest_template_evidence.label_id, null);
  assert.equal(result.general_rule_policy.closest_template_evidence.hint_role, "none");
  assert.equal(result.general_rule_policy.closest_template_evidence.absolute_compatibility, "not_available");
  assert.match(result.general_rule_policy.closest_template_evidence.comparison_rule, /nearest_template_hint=none/);
});
