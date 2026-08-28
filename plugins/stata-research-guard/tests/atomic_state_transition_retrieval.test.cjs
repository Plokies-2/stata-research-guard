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

test("external fixed e(sample) standardization remains inspectable but nonselectable", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "scale.standardize_esample",
    stage: "cleaning_labels",
    commands: ["summarize", "generate", "assert"],
    task: "standardize a declared set of component variables on the fixed estimation sample, require at least two observations and positive standard deviation for each component, then construct an index only where all standardized components are complete",
    current_state: "analysis data has a declared fixed e(sample) indicator and a short declared component list",
    target_state: "one flat-loop standardization block and one component-complete standardized index",
    limit: 20,
  });

  const row = resultById(result, "clean.standardize_on_fixed_esample.v1");
  assert.equal(row.rubric_classification, "reference_only");
  assert.equal(row.auto_select_allowed, false);
  assert.equal(row.source_kind, "deposited_research_code_partial_reference");
  assert.match(row.code, /foreach\s+var\b/i);
  assert.match(row.code, /if\s+sample2\s*==\s*1/i);
});

test("external merge atom remains selectable while the internal 1:1 example is gone", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "merge_reshape.integration",
    stage: "merge_reshape",
    commands: ["merge", "assert", "drop"],
    task: "perform a 1:1 merge on the declared key, permit master-only records, reject using-only records, and remove the explicit merge marker after the assertion",
    current_state: "master and using datasets each have at most one record per declared key",
    target_state: "master-retained analysis data with no using-only record and no residual merge marker",
    limit: 20,
  });

  const row = resultById(result, "merge.retain_matched_rows.v1");
  assert.equal(row.rubric_classification, "preferred_candidate");
  assert.equal(row.auto_select_allowed, true);
  assert.match(row.code, /^\s*merge\s+1:m\b/im);
  assert.match(row.code, /\bkeep\(match\)\s+nogen\b/i);

  const removed = await client.tool("search_labeled_checkpoints", {
    variant_id: "merge_11_require_using_match_allow_master_only",
    limit: 5,
  });
  assert.deepEqual(removed.results, []);
});
