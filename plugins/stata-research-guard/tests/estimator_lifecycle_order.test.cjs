"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "mcp", "server.cjs");
const DICTIONARY = path.join(ROOT, "data", "workflow_block_dictionary.json");
const LABELS = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8")
  .trim().split(/\r?\n/).map((line) => JSON.parse(line));
const PACKAGES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference_packages.json"), "utf8"));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

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

function label(id) {
  const result = LABELS.find((row) => row.label_id === id);
  assert.ok(result, `missing label ${id}`);
  return result;
}

function packageFields(row) {
  const packageId = String(row.source_path || "").replaceAll("\\", "/").match(/^corpus\/packages\/([^/]+)\//)?.[1];
  if (!packageId) return { source_kind: row.source_kind };
  const packageMetadata = PACKAGES.find((candidate) => String(candidate.project_id) === packageId);
  return {
    source_package_id: packageId,
    ...(packageMetadata?.repository_doi ? { repository_doi: packageMetadata.repository_doi } : {}),
  };
}

function selectionFor(row, targetPath, substepId) {
  return {
    label_id: row.label_id,
    source_code_sha256: row.code_sha256,
    source_file_sha256: row.source_file_sha256,
    source: { path: row.source_path, spans: row.source_spans },
    ...packageFields(row),
    target_path: targetPath,
    target_spans: [[1, row.code.split(/\r?\n/).length]],
    target_span_sha256: sha256(Buffer.from(row.code, "utf8")),
    edited_fields: [],
    selection_conditions_met: row.selection_conditions || [],
    required_changes_applied: row.required_changes || [],
    substep_id: substepId,
  };
}

function schema2Fixture(t, rows) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-estimator-lifecycle-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  for (const [index, row] of rows.entries()) {
    fs.writeFileSync(path.join(root, "code", `step_${index + 1}.do`), row.code, "utf8");
  }
  const checkpoint = rows[0].checkpoint;
  const manifest = {
    schema_version: "2.0",
    plugin_dictionary_sha256: sha256(fs.readFileSync(DICTIONARY)),
    required_headwords: [{
      checkpoint,
      mode: "mixed",
      substeps: rows.map((row, index) => ({
        substep_id: `estimator_${index + 1}`,
        mode: "template",
        match: { label_ids: [row.label_id] },
      })),
    }],
    selections: rows.map((row, index) => selectionFor(row, `code/step_${index + 1}.do`, `estimator_${index + 1}`)),
  };
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return root;
}

function singleExcelFlowProfile() {
  return {
    outcomes: [{ name: "outcome", meaning: "primary outcome", unit: "percentage points", transform: "level", sample: "analysis sample", estimand: "treatment effect", estimate_handoff: "estimates/outcome.ster", specification_order: [1] }],
    sheet_groups: [{ sheet_group_id: "primary", outcomes: ["outcome"], grouping_reason: "one requested primary outcome", decision_source: "user", grouping_evidence: ["the user requested one primary-outcome sheet"] }],
    sheet_plan: [{ workbook: "table.xls", sheet: "results", sample: "analysis sample", sheet_group_id: "primary", estimate_names: ["outcome_main"], reason: "one requested estimate column" }],
  };
}

test("schema 2.0 permits one exact staggered-DID estimator target but rejects two alternatives from its method group", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const first = label("estimation.did_imputation_active_result.v1");
  const second = label("estimation.did_multiplegt_dynamic_active.v1");
  assert.equal(first.variant_group, "estimation.staggered_did_method");
  assert.equal(second.variant_group, first.variant_group);

  const validRoot = schema2Fixture(t, [first]);
  const valid = await client.tool("template_reuse_check", { path: validRoot, manifest_path: "template_reuse_manifest.json" });
  assert.equal(valid.status, "pass", JSON.stringify(valid.blockers));
  assert.equal(valid.selection_checks.length, 1);
  assert.equal(valid.selection_checks[0].evidence.command_retention, 1);

  const competingRoot = schema2Fixture(t, [first, second]);
  const competing = await client.tool("template_reuse_check", { path: competingRoot, manifest_path: "template_reuse_manifest.json" });
  assert.equal(competing.status, "needs_revision", JSON.stringify(competing.blockers));
  assert.ok(competing.blockers.some((row) => row.rule === "competing_template_variant_group_selections"
    && row.variant_group === first.variant_group
    && new Set(row.selected_label_ids).size === 2), JSON.stringify(competing.blockers));
});

test("external reference-only estimator evidence cannot be selected as a schema 2.0 shortcut", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const iv = label("estimation.ols_visible_specs_eststo.v1");
  const retrieved = await client.tool("search_labeled_checkpoints", { variant_id: iv.variant_id, limit: 5 });
  assert.equal(retrieved.results.length, 1);
  assert.equal(retrieved.results[0].rubric_classification, "reference_only");
  assert.equal(retrieved.results[0].auto_select_allowed, false);

  const root = schema2Fixture(t, [iv]);
  const result = await client.tool("template_reuse_check", { path: root, manifest_path: "template_reuse_manifest.json" });
  assert.equal(result.status, "needs_revision", JSON.stringify(result.blockers));
  assert.ok(result.blockers.some((row) => row.rule === "template_substep_match_mismatch"), JSON.stringify(result.blockers));
  assert.ok(!result.substep_checks[0].matched_candidate_ids.includes(iv.label_id));
});

test("public retrieval keeps one-sheet active-estimate Excel direct and avoids storage or formatter atoms", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const estimator = (await client.tool("search_labeled_checkpoints", { variant_id: "staggered_jwdid_ppmlhdfe_active", limit: 5 })).results[0];
  const excel = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly", output_flow_profile: singleExcelFlowProfile(), limit: 5,
  });

  assert.equal(estimator.label_id, "estimation.staggered_jwdid_ppmlhdfe_active.v1");
  assert.ok(estimator.auto_select_allowed);
  assert.deepEqual(excel.results, []);
  assert.equal(excel.output_flow_selection.selection_class, "direct_single_sheet_workbook");
  assert.equal(excel.output_flow_selection.direct_implementation_allowed, true);

  assert.match(estimator.state_signature.produces.join(" "), /active .*e-class|active .*e\(sample\)/i);
  assert.match(excel.final_excel_rule, /direct outreg2 replace\/append code with an explicit \.xls target and no program/i);
});

test("a complete one-sheet Excel flow selects direct outreg2 and no formatter program", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "final_excel_assembly",
    output_flow_profile: singleExcelFlowProfile(),
    limit: 20,
  });
  assert.equal(result.output_flow_selection.selection_ready, true, JSON.stringify(result.output_flow_selection.failures));
  assert.deepEqual(result.results.map((row) => row.label_id), []);
  assert.equal(result.output_flow_selection.selection_class, "direct_single_sheet_workbook");
  assert.equal(result.output_flow_selection.direct_implementation_allowed, true);
  assert.equal(result.output_flow_selection.formatter_required, false);
  assert.match(result.final_excel_rule, /adds exactly adjusted R-squared and the dependent-variable mean/i);
  assert.match(result.final_excel_rule, /direct outreg2 replace\/append code with an explicit \.xls target and no program/i);
});
