"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const test = require("node:test");

const SERVER = path.join(path.resolve(__dirname, ".."), "mcp", "server.cjs");

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

  async tool(name, args) {
    const id = this.nextId++;
    const result = await new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } })}\n`);
    });
    assert.equal(result.isError, undefined, result.content?.[0]?.text);
    return result.structuredContent;
  }

  close() { this.child.kill(); }
}

test("external deposited scatter evidence remains inspectable while internal scatter examples are absent", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());

  const external = await client.tool("search_labeled_checkpoints", {
    variant_id: "collapse_municipality_year_then_two_wave_scatter",
    limit: 5,
  });
  assert.equal(external.results.length, 1);
  const row = external.results[0];
  assert.equal(row.label_id, "figure.municipality_year_scatter_pdf.v1");
  assert.equal(row.source_kind, "deposited_research_code");
  assert.equal(row.rubric_classification, "reference_only");
  assert.equal(row.auto_select_allowed, false);
  assert.match(row.code, /graph\s+export\b/i);

  for (const variantId of ["common_sample_binary_group_scatter_lfit_pdf", "common_sample_binary_group_scatter_lfit_active_graph"]) {
    const removed = await client.tool("search_labeled_checkpoints", { variant_id: variantId, limit: 5 });
    assert.deepEqual(removed.results, [], variantId);
  }
});
