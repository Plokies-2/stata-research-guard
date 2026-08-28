"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "mcp", "server.cjs");
const PROFILE_FIELDS = [
  "data_structure",
  "record_unit",
  "required_keys",
  "source_basis",
  "time_structure",
  "variable_characteristics",
];

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

function commandLineIndex(code, command) {
  return code.split(/\r?\n/).findIndex((line) => new RegExp(`^\\s*${command}\\b`, "i").test(line));
}

test("clean-test merge gap retrieves the complete-match m:1 assertion template without retained-state alternatives", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "merge_reshape.integration",
    stage: "merge_reshape",
    commands: ["merge"],
    task: "clean-test gap: complete-match m:1 merge, assert every row matched, then remove _merge",
    current_state: "master data has a unique firm-year key; using data has one row per firm-year key",
    target_state: "complete matched firm-year panel with merge status asserted and removed",
    limit: 20,
  });

  assert.equal(result.stage_gate.mode, "ranking_only_with_exact_checkpoint");
  const row = resultById(result, "merge.m1_complete_match_assert.v1");
  assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification));
  assert.equal(row.auto_select_allowed, true);
  assert.match(row.code, /^\s*merge\s+m:1\b/im);
  assert.match(row.code, /^\s*assert\s+_merge\s*==\s*3\b/im);
  assert.match(row.code, /^\s*drop\s+_merge\b/im);
  assert.doesNotMatch(row.code, /\bkeep\s*\(\s*match\s*\)/i);
  assert.doesNotMatch(row.code, /\bnogen\b/i);
});

test("clean-test finalization keeps the deposited continuation span as reference-only mechanics", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "dataset.finalize_keep_label_save",
    stage: "cleaning_labels",
    commands: ["keep", "order", "sort", "compress", "save"],
    task: "clean-test gap: retain the declared analysis inventory, order it, sort by the declared key, compress, and save",
    current_state: "analysis-ready panel with declared retained variables and declared sort key",
    target_state: "final declared-variable dataset saved after explicit inventory ordering and compression",
    limit: 20,
  });

  const row = resultById(result, "dataset.finalize_declared_inventory_order_sort_save.v1");
  assert.equal(row.rubric_classification, "reference_only");
  assert.equal(row.auto_select_allowed, false);
  assert.deepEqual(Object.keys(row.template_input_profile).sort(), PROFILE_FIELDS);
  const sequence = ["keep", "order", "sort", "compress", "save"].map((command) => commandLineIndex(row.code, command));
  assert.ok(sequence.every((index) => index >= 0), `missing finalization command: ${row.code}`);
  assert.ok(sequence.every((index, position) => position === 0 || sequence[position - 1] < index), `expected keep < order < sort < compress < save: ${row.code}`);
  assert.doesNotMatch(row.code, /^\s*(?:foreach|forvalues|while)\b/im);
  assert.doesNotMatch(row.code, /^\s*program\s+define\b/im);
});
