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

test("binary-group scatter+lfit is a graph-only atom and PDF export remains separate", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const result = await client.tool("search_labeled_checkpoints", {
    checkpoint: "figures.descriptive_scatter",
    stage: "figures",
    commands: ["twoway", "scatter", "lfit"],
    task: "cross-sectional common-sample scatter of ln_wage against ttl_exp by binary union group; show observed points and a separate linear fit for each group",
    current_state: "one cross-sectional worker-level analysis sample with ln_wage, ttl_exp, and binary union observed for the same rows",
    target_state: "one descriptive graph with two observed-point series and two group-specific linear-fit series",
    limit: 20,
  });

  assert.equal(result.stage_gate.mode, "ranking_only_with_exact_checkpoint");
  const graph = result.results.find((row) => row.label_id === "figure.scatter_lfit_by_binary_group.v1");
  assert.ok(graph, `graph-only binary-group atom was not retrieved: ${JSON.stringify(result.results.map((row) => row.label_id))}`);
  assert.equal(graph.rubric_classification, "conditional_candidate");
  assert.equal(graph.auto_select_allowed, true);
  assert.equal((graph.code.match(/^\s*\(scatter\b/gim) || []).length, 2, graph.code);
  assert.equal((graph.code.match(/^\s*\(lfit\b/gim) || []).length, 2, graph.code);
  assert.match(graph.code, /legend\([^\r\n]*position\(6\)/i);
  assert.doesNotMatch(graph.code, /^\s*graph\s+export\b/im);
  assert.ok(graph.output_contract.some((value) => /active Stata graph/i.test(value)), JSON.stringify(graph.output_contract));
  assert.ok(graph.output_contract.every((value) => !/reproducible PDF figure/i.test(value)), JSON.stringify(graph.output_contract));
  assert.ok(graph.output_contract.some((value) => /no output file/i.test(value)), JSON.stringify(graph.output_contract));

  const exportResult = await client.tool("search_labeled_checkpoints", { variant_id: "export_active_graph_to_pdf_replace", limit: 5 });
  const pdf = exportResult.results.find((row) => row.label_id === "export.figure_pdf.v1");
  assert.ok(pdf, `separate PDF-export atom was not retrieved: ${JSON.stringify(exportResult.results.map((row) => row.label_id))}`);
  assert.equal(pdf.auto_select_allowed, true);
  assert.match(pdf.code, /graph\s+export\s+[^\r\n]*\.pdf\b/i);

  const legacy = result.results.find((row) => row.label_id === "figure.scatter_lfit_by_binary_group_pdf.v1");
  assert.ok(legacy, "the former synthetic binary-group scatter must remain inspectable as reference evidence");
  assert.equal(legacy.rubric_classification, "reference_only");
  assert.equal(legacy.auto_select_allowed, false);
});
