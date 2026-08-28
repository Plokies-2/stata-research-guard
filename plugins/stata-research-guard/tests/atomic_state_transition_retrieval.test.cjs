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

test("fixed e(sample) standardization remains a complete reference-only mechanics block", async (t) => {
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

  const row = resultById(result, "clean.standardize_fixed_esample_complete_components.v1");
  assert.equal(row.rubric_classification, "reference_only");
  assert.equal(row.auto_select_allowed, false);
  assert.match(row.code, /^\s*foreach\s+\w+\s+of\s+(?:local|global)\b/im);
  assert.match(row.code, /^\s*(?:quietly\s+)?summarize\s+`\w+'\s+if\s+\S+/im);
  assert.match(row.code, /^\s*assert\s+r\(N\)\s*>\s*1\b/im);
  assert.match(row.code, /^\s*assert\s+r\(sd\)\s*>\s*0\b/im);
  assert.match(row.code, /^\s*gen(?:erate)?\s+z_`\w+'\s*=\s*\(/im);
  assert.match(row.code, /^\s*assert\s+`\w+'\s*==\s*0\s+if\s+`\w+'/im);
  assert.match(row.code, /^\s*egen\s+\w+\s*=\s*rowmean\(`\w+'\)\s+if\s+`\w+'/im);
  assert.doesNotMatch(row.code, /^\s*(?:foreach|forvalues|while)\b[\s\S]*^\s*(?:foreach|forvalues|while)\b/im);
  assert.doesNotMatch(row.code, /\bcap(?:ture)?\b/i);
  assert.doesNotMatch(row.code, /^\s*program\s+define\b/im);
});

test("1:1 master-retained merge retrieves the explicit marker assertion transition", async (t) => {
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

  const row = resultById(result, "merge.11_require_using_match_allow_master_only.v1");
  assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification));
  assert.equal(row.auto_select_allowed, true);
  assert.match(row.code, /^\s*merge\s+1:1\s+\S+.*\bgen\(\w+\)/im);
  const marker = row.code.match(/^\s*merge\s+1:1\s+\S+.*\bgen\((\w+)\)/im)?.[1];
  assert.ok(marker, `expected explicit merge marker: ${row.code}`);
  assert.match(row.code, new RegExp(`^\\s*assert\\s+${marker}\\s*!=\\s*2\\b`, "im"));
  assert.match(row.code, new RegExp(`^\\s*drop\\s+${marker}\\b`, "im"));
  assert.doesNotMatch(row.code, /\bkeep\s*\(/i);
  assert.doesNotMatch(row.code, /\bnogen\b/i);
  assert.doesNotMatch(row.code, /^\s*(?:rename|save|keep|drop\s+if|drop\s+in)\b/im);
});
