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

test("event-study manuals resolve as reference-only metadata, never reusable code", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  const guideVariants = [
    ["single_event_auto_axis", "figures.coefplot_event_single_auto_axis.v1", "coefplot.event_single_auto_axis", "figures.coefplot_event_axis"],
    ["multiple_event_auto_axis", "figures.coefplot_event_multiple_auto_axis.v1", "coefplot.event_multiple_auto_axis", "figures.coefplot_event_axis"],
    ["event_declared_fixed_axis", "figures.coefplot_event_fixed_axis.v1", "coefplot.event_fixed_axis", "figures.coefplot_event_axis"],
    ["mixed_family_comparison_reference", "figures.coefplot_mixed_family_reference.v1", "coefplot.mixed_family_comparison", "figures.coefplot_model_family"],
  ];
  for (const [variantId, labelId, contractId, variantGroup] of guideVariants) {
    const result = await client.tool("resolve_transition_evidence", {
      transition: {
        checkpoint: "figures.event_study",
        stage: "figures",
        unit_kind: "post_estimation_export",
        variant_group: variantGroup,
        variant_id: variantId,
        commands: ["coefplot"],
        contract_ids: [contractId],
        variant_facets: {},
        version: { stata: "18" },
      },
    });
    const card = result.guide_layer.primary_card;
    assert.equal(result.guide_layer.status, "provided", variantId);
    assert.equal(card.label_id, labelId);
    assert.equal(card.auto_selectable, false);
    assert.equal(card.code_available, false);
    assert.equal(result.implementation_route.auto_select_allowed, false);
    assert.ok(!Object.prototype.hasOwnProperty.call(card, "code"), `${labelId} must not expose guide mechanics as code`);
  }
});

test("removed synthetic event figures cannot be retrieved by their old variants", async (t) => {
  const client = new McpClient();
  t.after(() => client.close());
  for (const variantId of [
    "stored_samples_single_outcome_direct_automatic_axis_pdf",
    "stored_samples_flat_outcome_loop_automatic_axis_pdf",
    "stored_samples_flat_close_group_fixed_axis_pdf",
    "stored_samples_flat_outcome_loop_one_fixed_group_automatic_remainder_pdf",
  ]) {
    const result = await client.tool("search_labeled_checkpoints", { variant_id: variantId, limit: 5 });
    assert.deepEqual(result.results, [], variantId);
  }
});
