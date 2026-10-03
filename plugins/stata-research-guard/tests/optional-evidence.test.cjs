"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildCommandEvidence, dispatch, TOOL_DEFINITIONS } = require("../mcp/server.cjs");

const ROOT = path.resolve(__dirname, "..");
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, "data/command_workflow_notes.json"), "utf8"));
const args = { request: "Read selected sources", selected_commands: ["did_multiplegt_dyn"], include_paper_catalog: false, help_view: "catalog" };

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "guard-optional-evidence-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function ado(t, content = "** This version: January 17th, 2026\r\nprogram did_multiplegt_dyn, eclass\r\nsyntax varlist [, effects(integer 1) controls(varlist)]\r\nend\r\n") {
  const file = path.join(workspace(t), "did_multiplegt_dyn.ado");
  fs.writeFileSync(file, content);
  return { path: file, content, sha256: crypto.createHash("sha256").update(content).digest("hex") };
}

test("existing Phase 2 arguments and explicit bundled source produce identical JSON", async () => {
  let calls = 0;
  const options = { liveHelpLookup: async () => { calls++; throw new Error("Bundled requests must not launch live help"); } };
  for (const command of ["did_multiplegt_dyn", "import_delimited", "jregress"]) {
    const request = { ...args, selected_commands: [command] };
    const original = await buildCommandEvidence(request, options);
    const explicit = await buildCommandEvidence({ ...request, help_source: "bundled" }, options);
    assert.equal(JSON.stringify(explicit), JSON.stringify(original));
    assert.equal("execution_source" in original.command_evidence[0], false);
    assert.equal("workflow_notes" in original.command_evidence[0], false);
  }
  assert.equal(calls, 0);
});

test("registered installed help uses its exact topic, forwards refresh and retains raw version markers", async (t) => {
  const directory = workspace(t);
  const source = path.join(directory, "did_multiplegt_dyn.sthlp");
  const marker = "{* *! version 1  2026-06-26}{...}";
  fs.writeFileSync(source, `{smcl}\n${marker}\n{title:Syntax}\nreset(#)`);
  const lookedUp = [];
  const liveHelpLookup = async (topic, options) => {
    lookedUp.push({ topic, ...options });
    return { status: "available", limitations: ["No bundled PDF expansion or paper example catalog is attached for an out-of-dictionary topic."], help: { command: topic, source_path: source, source_kind: "live_installed_help", source_version: "selected Stata installation snapshot", content: "Syntax\nreset(#)" } };
  };
  const response = await buildCommandEvidence({ ...args, help_source: "installed", refresh_live_help: true, help_view: "full" }, { liveHelpLookup });
  const evidence = response.command_evidence[0];
  assert.deepEqual(lookedUp, [{ topic: "did_multiplegt_dyn", refresh: true }]);
  assert.equal(evidence.command, "did_multiplegt_dyn");
  assert.equal(evidence.help_topic, "did_multiplegt_dyn");
  assert.equal(evidence.command_help.content, "Syntax\nreset(#)");
  assert.deepEqual(evidence.command_help.source_version_markers, [marker]);
  assert.deepEqual(evidence.limitations, []);
  assert.deepEqual(evidence.command_help.limitations, []);
  assert.equal(evidence.expanded_documentation.status, "same_source_as_bundled_help");
  assert.equal(evidence.paper_example_catalog_omitted, true);
  assert.equal(evidence.expanded_documentation.source_relation_to_help, "Bundled documentation; its version may differ from the selected installed help and execution source.");
});

test("installed selection resolves shared registered topics and commands without a bundled help topic", async () => {
  const topics = [];
  const response = await buildCommandEvidence({ ...args, selected_commands: ["export excel", "jregress"], help_source: "installed", help_view: "full" }, {
    liveHelpLookup: async (topic) => {
      topics.push(topic);
      return { status: "available", limitations: [], help: { content: `Selected installed ${topic}` } };
    },
  });
  assert.deepEqual(topics, ["import_excel", "jregress"]);
  assert.deepEqual(response.selected_commands, ["export_excel", "jregress"]);
  assert.deepEqual(response.command_evidence.map((row) => row.command_help.content), ["Selected installed import_excel", "Selected installed jregress"]);
});

test("unavailable installed help is reported without silently substituting bundled help", async () => {
  const response = await buildCommandEvidence({ ...args, help_source: "installed" }, {
    liveHelpLookup: async () => ({ status: "unavailable", help: null, limitations: ["Selected help is unavailable"] }),
  });
  assert.equal(response.command_evidence[0].help_status, "unavailable");
  assert.equal(response.command_evidence[0].command_help, null);
  assert.deepEqual(response.command_evidence[0].limitations, ["Selected help is unavailable"]);
});

test("large installed help retains whole-source navigation rather than applying a bundled section map", async () => {
  const original = "Installed source\n".repeat(2000);
  const liveHelpLookup = async () => ({ status: "available", limitations: [], help: { content: original } });
  const catalog = await buildCommandEvidence({ ...args, help_source: "installed" }, { liveHelpLookup });
  const help = catalog.command_evidence[0].command_help;
  assert.equal(help.content, null);
  assert.deepEqual(help.section_catalog.map((row) => row.id), ["whole-source"]);
  const selected = await buildCommandEvidence({ ...args, help_view: undefined, help_source: "installed", help_sections: { did_multiplegt_dyn: ["whole-source"] } }, { liveHelpLookup });
  assert.equal(selected.command_evidence[0].command_help.content, original);
  await assert.rejects(buildCommandEvidence({ ...args, help_view: undefined, help_source: "installed", help_sections: { did_multiplegt_dyn: ["syntax"] } }, { liveHelpLookup }), /invalid exact help section/);
});

test("ADO metadata and exact CRLF spans are retained even when the execution-record hash differs", async (t) => {
  const source = ado(t);
  for (const expected of [source.sha256, "0".repeat(64)]) {
    const response = await buildCommandEvidence({ ...args, execution_sources: { did_multiplegt_dyn: { path: source.path, expected_sha256: expected, line_spans: [{ start: 1, end: 1 }, { start: 2, end: 3 }] } } });
    const read = response.command_evidence[0].execution_source;
    assert.equal(read.source_sha256, source.sha256);
    assert.equal(read.matches_expected_sha256, expected === source.sha256);
    const lines = source.content.match(/[^\n]*\n|[^\n]+$/g);
    assert.deepEqual(read.excerpts, [{ start: 1, end: 1, content: lines[0] }, { start: 2, end: 3, content: lines.slice(1, 3).join("") }]);
    assert.equal(read.line_count, 4);
    assert.equal("supported_options" in read, false);
  }
});

test("ADO metadata-only requests omit the source body and preserve UTF-8 BOM in explicit excerpts", async (t) => {
  const source = ado(t, "\ufeff* Source header\nsyntax varlist\nend\n");
  const metadata = await buildCommandEvidence({ ...args, execution_sources: { did_multiplegt_dyn: { path: source.path } } });
  const read = metadata.command_evidence[0].execution_source;
  assert.equal("excerpts" in read, false);
  assert.equal("content" in read, false);
  const selected = await buildCommandEvidence({ ...args, execution_sources: { did_multiplegt_dyn: { path: source.path, line_spans: [{ start: 1, end: 1 }] } } });
  assert.equal(selected.command_evidence[0].execution_source.excerpts[0].content, "\ufeff* Source header\n");
});

test("missing ADO files and out-of-range spans leave bundled help available", async (t) => {
  const source = ado(t);
  for (const selection of [{ path: path.join(workspace(t), "did_multiplegt_dyn.ado") }, { path: source.path, line_spans: [{ start: 1, end: 999 }] }]) {
    const response = await buildCommandEvidence({ ...args, execution_sources: { did_multiplegt_dyn: selection } });
    assert.equal(response.command_evidence[0].execution_source.unavailable, true);
    assert.equal(response.command_evidence[0].help_status, "available");
  }
});

test("input-name and estimator notes return only selected authored text without inventing a mapping", async () => {
  const response = await buildCommandEvidence({ ...args, selected_commands: ["import_delimited", "did_multiplegt_dyn"], workflow_notes: { import_delimited: ["input-variable-names"], did_multiplegt_dyn: ["comparison-sample", "control-learning-sample"] } });
  for (const evidence of response.command_evidence) {
    for (const note of evidence.workflow_notes) {
      assert.equal(note.content, notes[evidence.command][note.id].content);
      assert.deepEqual(note.references, notes[evidence.command][note.id].references);
      assert.equal(note.record_type, "authoring_guidance");
      assert.equal("mapping" in note, false);
    }
  }
  assert.deepEqual(response.command_evidence[1].workflow_notes.map((row) => row.id), ["comparison-sample", "control-learning-sample"]);
});

test("MCP transport returns the selected output-recovery note unchanged", async () => {
  const response = await dispatch({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_stata_command_evidence", arguments: { ...args, workflow_notes: { did_multiplegt_dyn: ["output-recovery"] } } } });
  assert.equal(response.result.isError, undefined);
  const delivered = JSON.parse(response.result.content[0].text).command_evidence[0];
  assert.deepEqual(delivered.workflow_notes, [{
    id: "output-recovery", record_type: "authoring_guidance", source_path: "data/command_workflow_notes.json", ...notes.did_multiplegt_dyn["output-recovery"],
  }]);
});

test("new selections are Phase 2 only and reject malformed exact keys and source ranges", async (t) => {
  const source = ado(t);
  for (const selection of [
    { help_source: "latest" },
    { workflow_notes: {} },
    { workflow_notes: { did_multiplegt_dyn: ["unknown"] } },
    { workflow_notes: { did_multiplegt_dyn: ["comparison-sample", "comparison-sample"] } },
    { workflow_notes: { regress: ["comparison-sample"] } },
    { execution_sources: { did_multiplegt_dyn: { path: "relative.ado" } } },
    { execution_sources: { did_multiplegt_dyn: { path: path.join(path.dirname(source.path), "other.ado") } } },
    { execution_sources: { did_multiplegt_dyn: { path: source.path, expected_sha256: ["0".repeat(64)] } } },
    { execution_sources: { did_multiplegt_dyn: { path: source.path, line_spans: [{ start: 0, end: 2 }] } } },
    { execution_sources: { did_multiplegt_dyn: { path: source.path, line_spans: [{ start: 2, end: 1 }] } } },
    { execution_sources: { did_multiplegt_dyn: { path: source.path, unknown: true } } },
  ]) await assert.rejects(buildCommandEvidence({ ...args, ...selection }));
  const { include_paper_catalog, help_view, ...phase3args } = args;
  for (const selection of [{ help_source: "installed" }, { workflow_notes: { did_multiplegt_dyn: ["comparison-sample"] } }, { execution_sources: { did_multiplegt_dyn: { path: source.path } } }]) {
    await assert.rejects(buildCommandEvidence({ request: "Discover", ...selection }), /does not allow/);
    await assert.rejects(buildCommandEvidence({ ...phase3args, ...selection, expanded: true, expanded_commands: ["did_multiplegt_dyn"] }), /does not allow/);
  }
});

test("MCP transport delivers mismatched ADO/help raw evidence without an option verdict", async (t) => {
  const source = ado(t);
  const response = await dispatch({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_stata_command_evidence", arguments: { ...args, execution_sources: { did_multiplegt_dyn: { path: source.path, line_spans: [{ start: 1, end: 3 }] } }, workflow_notes: { did_multiplegt_dyn: ["control-learning-sample"] } } } });
  assert.equal(response.result.isError, undefined);
  const delivered = JSON.parse(response.result.content[0].text).command_evidence[0];
  assert.equal(delivered.command_help.source_version, "1 2026-06-26");
  assert.equal(delivered.execution_source.excerpts[0].content, source.content.split("end\r\n")[0]);
  assert.equal("version_match" in delivered, false);
  assert.equal("option_verdict" in delivered, false);
  const schema = TOOL_DEFINITIONS[0].inputSchema.oneOf[1].properties;
  assert.deepEqual(schema.help_source.enum, ["bundled", "installed"]);
});
