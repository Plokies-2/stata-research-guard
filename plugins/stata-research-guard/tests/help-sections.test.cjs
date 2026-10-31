"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { deliverHelp, HELP_CHARACTER_THRESHOLD } = require("../mcp/help-sections.cjs");
const { buildCommandEvidence, dispatch } = require("../mcp/server.cjs");
const root = path.join(__dirname, "../data");
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");

test("volume threshold counts Unicode characters and never cuts unknown sources", () => {
  const small = "😀".repeat(HELP_CHARACTER_THRESHOLD);
  assert.equal(deliverHelp({ content: small }).content, small);
  const large = small + "x";
  const catalog = deliverHelp({ content: large });
  assert.equal(catalog.content, null);
  assert.equal(catalog.section_catalog.length, 1);
  assert.equal(deliverHelp({ content: large }, null, ["whole-source"]).content, large);
  assert.equal(deliverHelp({ content: large }, null, null, "full").content, large);
});

test("selection includes intact required sections in source order without duplicate copies", () => {
  const content = "Syntax\noptions\nExample\nbody\nResults\nvalues\n";
  const navigation = { content_sha256: hash(content), required_sections: ["syntax", "results"], sections: [
    { id: "syntax", start: 1, end: 2 }, { id: "example", start: 3, end: 4, read_when: "Read for the worked example." }, { id: "results", start: 5, end: 6 },
  ] };
  const selected = deliverHelp({ content }, navigation, ["example", "syntax"]);
  assert.deepEqual(selected.selected_sections.map((s) => s.id), ["syntax", "example", "results"]);
  assert.equal(selected.content, "Syntax\noptions\n\nExample\nbody\n\nResults\nvalues\n");
  assert.equal(selected.selected_sections[1].read_when, "Read for the worked example.");
  assert.equal(deliverHelp({ content }, navigation, null, "catalog").section_catalog[1].read_when, "Read for the worked example.");
  assert.throws(() => deliverHelp({ content }, navigation, ["missing"]), /invalid exact/);
});

test("stale navigation returns a whole-source catalog rather than stale slices or silent full injection", () => {
  const content = "changed source";
  const result = deliverHelp({ content }, { content_sha256: "stale", sections: [] }, ["old-id"]);
  assert.equal(result.content, null);
  assert.equal(result.section_catalog[0].id, "whole-source");
});

test("invalid section errors expose current IDs over MCP so callers can retry without a catalog call", async () => {
  const args = { request: "Read the selected fixed-effect help", selected_commands: ["reghdfe"],
    help_sections: { reghdfe: ["options-absorb"] }, include_paper_catalog: false };
  const call = (arguments_) => dispatch({ jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: arguments_ } });
  const failed = (await call(args)).result;
  assert.equal(failed.isError, true);
  const message = failed.content[0].text;
  assert.match(message, /invalid exact help section selection: reghdfe/);
  assert.deepEqual(JSON.parse(message.split("\nInvalid IDs: ")[1].split("\n")[0]), ["options-absorb"]);
  const validIds = JSON.parse(message.split("\nValid IDs: ")[1].split("\n")[0]);
  const map = JSON.parse(fs.readFileSync(path.join(root, "command_help_sections.json"), "utf8"))
    .guides.find((guide) => guide.command === "reghdfe");
  assert.deepEqual(validIds, map.sections.map((section) => section.id));
  assert.deepEqual(JSON.parse(message.split("\nTitles in the same order: ")[1].split("\n")[0]),
    map.sections.map((section) => section.title));
  assert.ok(validIds.includes("absorb-syntax"));
  const retried = (await call({ ...args, help_sections: { reghdfe: ["absorb-syntax"] } })).result;
  assert.notEqual(retried.isError, true);
  const help = JSON.parse(retried.content[0].text).command_evidence[0].command_help;
  assert.deepEqual(help.requested_sections, ["absorb-syntax"]);
  assert.ok(help.content.length > 0);
});

test("every bundled large help and manual has a current map preserving every source line", async () => {
  for (const [directory, mapFile, expanded] of [
    ["command_help_guides", "command_help_sections.json", false],
    ["expanded_command_guides", "expanded_help_sections.json", true],
  ]) {
    const maps = JSON.parse(fs.readFileSync(path.join(root, mapFile), "utf8")).guides;
    for (const file of fs.readdirSync(path.join(root, directory)).filter((f) => f.endsWith(".txt"))) {
      const content = fs.readFileSync(path.join(root, directory, file), "utf8");
      if (Array.from(content).length <= HELP_CHARACTER_THRESHOLD) continue;
      const command = file.slice(0, -4);
      const navigation = maps.find((m) => m.command === command);
      assert.ok(navigation, `${directory}/${file} needs navigation`);
      assert.equal(navigation.content_sha256, hash(content));
      const lines = content.match(/[^\n]*\n|[^\n]+$/g) || [];
      let next = 1;
      const ids = new Set();
      for (const section of navigation.sections) {
        assert.equal(section.start, next, `${command}: consecutive complete coverage`);
        assert.ok(section.end >= section.start && section.end <= lines.length);
        assert.ok(!ids.has(section.id)); ids.add(section.id);
        next = section.end + 1;
      }
      assert.equal(next, lines.length + 1);
      assert.ok((navigation.required_sections || []).every((id) => ids.has(id)));
      assert.equal(navigation.sections.map((s) => lines.slice(s.start - 1, s.end).join("")).join(""), content);
      const args = { request: "Read source navigation", selected_commands: [command],
        ...(expanded ? { expanded: true, expanded_commands: [command] } : {}),
      };
      const result = await buildCommandEvidence(args);
      const delivered = expanded ? result.expanded_command_evidence[0].expanded_documentation : result.command_evidence[0].command_help;
      assert.equal(delivered.delivery, "catalog_only");
      assert.equal(delivered.content, null);
    }
  }
});

test("large live help uses the same catalog and explicit intact retrieval path", async () => {
  const content = "a".repeat(HELP_CHARACTER_THRESHOLD + 1);
  const options = { liveHelpLookup: async () => ({ status: "available", help: { content }, limitations: [] }) };
  const args = { request: "Live source", selected_commands: ["anova"] };
  assert.equal((await buildCommandEvidence(args, options)).command_evidence[0].command_help.content, null);
  assert.equal((await buildCommandEvidence({ ...args, help_sections: { anova: ["whole-source"] } }, options)).command_evidence[0].command_help.content, content);
});

test("foundation acknowledgment skips only duplicates and invalidates on source or foundation changes", () => {
  const content = "Syntax\nDefaults\nFirst option\nSecond option\n";
  const navigation = { content_sha256: hash(content), required_sections: ["basics"], sections: [
    { id: "basics", start: 1, end: 2 }, { id: "first", start: 3, end: 3 }, { id: "second", start: 4, end: 4 },
  ] };
  const initial = deliverHelp({ content }, navigation, ["first"]);
  assert.equal(initial.content, "Syntax\nDefaults\n\nFirst option\n");
  const reused = deliverHelp({ content }, navigation, ["second"], undefined, initial.foundation_sha256);
  assert.equal(reused.content, "Second option\n");
  assert.equal(reused.foundation_unchanged, true);
  assert.deepEqual(reused.reused_foundation_sections, ["basics"]);
  assert.equal(deliverHelp({ content }, navigation, ["basics"], undefined, initial.foundation_sha256).content, "Syntax\nDefaults\n");
  assert.equal(deliverHelp({ content }, navigation, ["second"]).content, "Syntax\nDefaults\n\nSecond option\n");
  assert.equal(deliverHelp({ content }, navigation, undefined, "full", initial.foundation_sha256).content, content);
  assert.equal(deliverHelp({ content }, navigation, undefined, "catalog").foundation_sha256, undefined);
  const changed = content.replace("Defaults", "Changed defaults");
  const refreshed = deliverHelp({ content: changed }, { ...navigation, content_sha256: hash(changed) }, ["second"], undefined, initial.foundation_sha256);
  assert.equal(refreshed.content, "Syntax\nChanged defaults\n\nSecond option\n");
  assert.notEqual(refreshed.foundation_sha256, initial.foundation_sha256);
  const remapped = deliverHelp({ content }, { ...navigation, required_sections: ["basics", "first"] }, ["second"], undefined, initial.foundation_sha256);
  assert.equal(remapped.content, "Syntax\nDefaults\n\nFirst option\n\nSecond option\n");
  assert.notEqual(remapped.foundation_sha256, initial.foundation_sha256);
});

test("MCP foundation reuse preserves explicit original sections in both help phases", async () => {
  for (const expanded of [false, true]) {
    const command = expanded ? "regress" : "estout";
    const sectionId = expanded ? "stored_results" : "options-output";
    const args = { request: "Read the selected original section", selected_commands: [command],
      ...(expanded ? { expanded: true, expanded_commands: [command], expanded_sections: { [command]: [sectionId] } }
        : { include_paper_catalog: false, help_sections: { estout: ["options-output"] } }) };
    const call = async (arguments_) => {
      const r = (await dispatch({ jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "get_stata_command_evidence", arguments: arguments_ } })).result;
      assert.notEqual(r.isError, true);
      return JSON.parse(r.content[0].text);
    };
    const rows = expanded ? "expanded_command_evidence" : "command_evidence";
    const key = expanded ? "expanded_documentation" : "command_help";
    const first = (await call(args))[rows][0][key];
    const reused = (await call({ ...args, known_help_foundations: { [command]: first.foundation_sha256 } }))[rows][0][key];
    assert.deepEqual(reused.selected_sections.map((s) => s.id), [sectionId]);
    const source = fs.readFileSync(path.join(root, first.content_file), "utf8").match(/[^\n]*\n|[^\n]+$/g);
    const section = first.selected_sections.find((s) => s.id === sectionId);
    assert.equal(reused.content, source.slice(section.start - 1, section.end).join(""));
    assert.equal(reused.foundation_unchanged, true);
    assert.ok(reused.content.length < first.content.length);
  }
  const args = { request: "Read output", selected_commands: ["estout"] };
  for (const value of [null, {}, [], { regress: "a".repeat(64) }, { estout: "not-a-hash" }]) {
    await assert.rejects(buildCommandEvidence({ ...args, known_help_foundations: value }), /known_help_foundations/);
  }
});

test("combined automatic help uses catalogs while explicit full help retains every original byte", async () => {
  const commands = ["regress", "summarize", "import_delimited", "export_excel", "tabulate"];
  const args = { request: "Read selected sources", selected_commands: commands, include_paper_catalog: false };
  const initial = await buildCommandEvidence(args);
  assert.equal(initial.response_navigation.reason, "combined_response_size");
  assert.deepEqual(initial.response_navigation.deferred_commands, commands);
  const full = await buildCommandEvidence({ ...args, help_view: "full" });
  assert.equal(full.response_navigation, undefined);
  assert.deepEqual(initial.main_rules, full.main_rules);
  for (const [index, row] of initial.command_evidence.entries()) {
    assert.equal(row.command_help.delivery, "catalog_only");
    assert.equal(row.command_help.content, null);
    const original = fs.readFileSync(path.join(root, row.command_help.content_file), "utf8");
    assert.equal(full.command_evidence[index].command_help.content, original);
  }
});

test("aggregate navigation respects deduplication and never leaves an explicit section pointing at a deferred body", async () => {
  const same = "a".repeat(HELP_CHARACTER_THRESHOLD);
  const different = "b".repeat(HELP_CHARACTER_THRESHOLD);
  const options = { liveHelpLookup: async (command) => ({ status: "available", limitations: [],
    help: { content: command === "gamma" ? different : same, source_kind: "live_installed_help" } }) };
  // Isolate help payload size from unrelated edits to the prose rules.
  const rules = fs.readFileSync(path.join(__dirname, "../skills/stata-replication-workflow/references/general-rules.md"), "utf8");
  const args = { request: "Read shared help", selected_commands: ["alpha", "beta"], include_paper_catalog: false,
    deduplicate_help: true, known_rules_sha256: hash(rules) };
  const compact = await buildCommandEvidence(args, options);
  assert.equal(compact.response_navigation, undefined);
  assert.equal(compact.command_evidence[1].command_help.content_ref, "#/command_evidence/0/command_help/content");
  const mixed = await buildCommandEvidence({ ...args, selected_commands: ["alpha", "beta", "gamma"], help_sections: { beta: ["whole-source"] } }, options);
  assert.deepEqual(mixed.response_navigation.deferred_commands, ["alpha", "gamma"]);
  assert.equal(mixed.command_evidence[1].command_help.content, same);
  assert.equal(mixed.command_evidence[1].command_help.content_ref, undefined);
  assert.equal(mixed.command_evidence[0].command_help.content, null);
  assert.equal(mixed.command_evidence[2].command_help.content, null);
});
