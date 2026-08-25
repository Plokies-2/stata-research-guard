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

function regressionLines(code) {
  return code.split(/\r?\n/).filter((line) => /^\s*reg(?:ress)?\b/i.test(line));
}

test("cross-sectional robust OLS retrieval selects the atomic explicit regression rather than a table-ready multi-specification block", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "estimation.conventional",
    stage: "estimation",
    commands: ["regress"],
    task: "cross-sectional ln_wage OLS with two explicitly visible specifications and heteroskedasticity-robust standard errors",
    current_state: "cross-sectional worker-level analysis data with continuous ln_wage, an explicit treatment or covariate list, and no declared panel, fixed effect, cluster, stored-estimate, or export requirement",
    target_state: "one active robust OLS e-class result; repeat the same atomic template explicitly for each of two visible specifications",
    limit: 20,
  });

  const row = resultById(result, "estimation.ols_explicit_vce.v1");
  assert.ok(["preferred_candidate", "conditional_candidate"].includes(row.rubric_classification));
  assert.equal(row.auto_select_allowed, true);
  assert.equal(row.source, "corpus/packages/115162/do/Analysis-4.do:428-428");

  const commands = regressionLines(row.code);
  assert.equal(commands.length, 1, `expected one atomic regression command: ${row.code}`);
  assert.match(commands[0], /^\s*reg(?:ress)?\s+\S+/i);
  assert.match(commands[0], /,\s*(?:robust\b|vce\(\s*robust\s*\))/i);
  assert.doesNotMatch(row.code, /\b(?:eststo|estadd)\b/i);
  assert.doesNotMatch(row.code, /\bcluster(?:\(|\b)/i);
  assert.doesNotMatch(row.code, /^\s*(?:foreach|forvalues|while)\b/im);
  assert.doesNotMatch(row.code, /^\s*program\s+define\b/im);
  assert.doesNotMatch(row.code, /^\s*(?:outreg2|putexcel|export)\b/im);
});

test("broad table-ready OLS block remains reference evidence and cannot become the automatic atomic choice", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const exact = await client.tool("search_labeled_checkpoints", {
    variant_id: "explicit_sequential_specs_with_eststo",
    limit: 5,
  });
  const broad = resultById(exact, "estimation.ols_visible_specs_eststo.v1");
  assert.equal(broad.rubric_classification, "reference_only");
  assert.equal(broad.auto_select_allowed, false);

  const atomic = await client.tool("search_labeled_checkpoints", {
    checkpoint: "estimation.conventional",
    commands: ["regress"],
    task: "cross-sectional ln_wage OLS with robust standard errors",
    current_state: "cross-sectional analysis data without a requested stored-estimate or table-export handoff",
    target_state: "one active robust OLS e-class result",
    limit: 20,
  });
  assert.ok(!atomic.results.some((row) => row.label_id === broad.label_id && row.auto_select_allowed));
});
