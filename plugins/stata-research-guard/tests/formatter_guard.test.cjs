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
const SNAPSHOT = fs.readFileSync(path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do"), "utf8");
const DICTIONARY = path.join(ROOT, "data", "workflow_block_dictionary.json");
const LABELS = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
const PACKAGES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference_packages.json"), "utf8"));
const { templateReuseCheck } = require(path.join(ROOT, "mcp", "template_reuse.cjs"));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

class McpClient {
  constructor() {
    this.id = 1;
    this.pending = new Map();
    this.child = spawn(process.execPath, [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
    readline.createInterface({ input: this.child.stdout, crlfDelay: Infinity }).on("line", (line) => {
      const message = JSON.parse(line);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      pending.resolve(message.result);
    });
  }

  request(method, params) {
    const id = this.id++;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async lint(content) {
    const result = await this.request("tools/call", { name: "lint_do_file", arguments: { content } });
    return result.structuredContent;
  }

  close() {
    this.child.kill();
  }
}

function canonicalFormatterWithCall() {
  return `${SNAPSHOT}\noutreg2_xlsx, estimates("m1 m2") workbook("table.xlsx") sheet("results") adjdec(3) meandec(2) replace\n`;
}

function formatterReuseFixture(t, code) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-formatter-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  const label = LABELS.find((row) => row.label_id === "export.regression_excel.from_ster_default_style.v1");
  assert.ok(label);
  const target = path.join(root, "code", "tables.do");
  fs.writeFileSync(target, code, "utf8");
  fs.writeFileSync(path.join(root, "code", "invoke.do"), 'outreg2_xlsx, estimates("m1 m2") workbook("table.xlsx") sheet("results") adjdec(3) meandec(2) replace\n', "utf8");
  const packageId = label.source_path.replaceAll("\\", "/").match(/^corpus\/packages\/([^/]+)\//)?.[1];
  const packageMetadata = PACKAGES.find((row) => String(row.project_id) === packageId);
  const manifest = {
    schema_version: "1.0",
    plugin_dictionary_sha256: sha256(fs.readFileSync(DICTIONARY)),
    required_headwords: [{ checkpoint: label.checkpoint, mode: "template" }],
    selections: [{
      label_id: label.label_id,
      source_code_sha256: label.code_sha256,
      source: { path: label.source_path, spans: label.source_spans },
      source_kind: label.source_kind,
      source_package_id: packageId,
      ...(packageMetadata ? { repository_doi: packageMetadata.repository_doi } : {}),
      target_path: "code/tables.do",
      target_spans: [[1, code.split(/\r?\n/).length]],
      target_span_sha256: sha256(Buffer.from(code, "utf8")),
      edited_fields: [],
      selection_conditions_met: label.selection_conditions || [],
      required_changes_applied: label.required_changes || [],
    }],
  };
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest), "utf8");
  return root;
}

test("exact canonical outreg2 scratch cleanup is the only permitted erase", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const valid = await client.lint(canonicalFormatterWithCall());
  assert.equal(valid.findings.some((row) => row.rule === "destructive_delete"), false, JSON.stringify(valid.findings));
  assert.equal(valid.findings.some((row) => row.rule === "canonical_outreg2_scratch_contract"), false);
  assert.ok(valid.strengths.some((row) => row.rule === "named_outreg2_scratch_cleanup"));

  const unsafe = await client.lint(`${canonicalFormatterWithCall()}erase "results/keep.dta"\n`);
  assert.ok(unsafe.findings.some((row) => row.rule === "destructive_delete"));
});

test("scratch cleanup rejects tempfile mutation and missing postcondition", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const tempfile = canonicalFormatterWithCall().replace('local scratch "$table/__outreg2_`sheet\'"', "tempfile scratch");
  const tempfileResult = await client.lint(tempfile);
  assert.ok(tempfileResult.findings.some((row) => row.rule === "canonical_outreg2_scratch_contract"));
  assert.ok(tempfileResult.findings.some((row) => row.rule === "destructive_delete"));

  const noPostcondition = canonicalFormatterWithCall().replace('capture confirm file "`scratch\'.txt"\n    if !_rc {', 'capture confirm file "`scratch\'.txt"\n    display "unchecked"');
  const missingResult = await client.lint(noPostcondition);
  assert.ok(missingResult.findings.some((row) => row.rule === "canonical_outreg2_scratch_contract"));
});

test("invalid e-return ymean is blocked while estadd and actual eclass programs pass", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const invalid = await client.lint("summarize outcome if e(sample)\nereturn scalar ymean = r(mean)\nestimates store m1");
  assert.ok(invalid.findings.some((row) => row.rule === "invalid_ereturn_ymean_outside_eclass"));
  const estadd = await client.lint("summarize outcome if e(sample)\nestadd scalar ymean = r(mean)\nestimates store m1");
  assert.equal(estadd.findings.some((row) => row.rule === "invalid_ereturn_ymean_outside_eclass"), false);
  const eclass = await client.lint("program define record_mean, eclass\nereturn scalar ymean = r(mean)\nend");
  assert.equal(eclass.findings.some((row) => row.rule === "invalid_ereturn_ymean_outside_eclass"), false);
});

test("template reuse reports a scratch-contract mutation even when most commands remain", (t) => {
  const changed = SNAPSHOT.replace('local scratch "$table/__outreg2_`sheet\'"', "tempfile scratch");
  const root = formatterReuseFixture(t, changed);
  const result = templateReuseCheck({ path: root, manifest_path: "template_reuse_manifest.json" }, {
    labels: LABELS,
    packages: PACKAGES,
    dictionaryPath: DICTIONARY,
    lintContent: () => ({ findings: [], summary: { max_loop_depth: 1 } }),
  });
  assert.ok(result.blockers.some((row) => row.rule === "canonical_outreg2_scratch_contract"));
});
