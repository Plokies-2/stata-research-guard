"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { deliverHelp, HELP_CHARACTER_THRESHOLD } = require("../mcp/help-sections.cjs");
const { buildCommandEvidence } = require("../mcp/server.cjs");
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
    { id: "syntax", start: 1, end: 2 }, { id: "example", start: 3, end: 4 }, { id: "results", start: 5, end: 6 },
  ] };
  const selected = deliverHelp({ content }, navigation, ["example", "syntax"]);
  assert.deepEqual(selected.selected_sections.map((s) => s.id), ["syntax", "example", "results"]);
  assert.equal(selected.content, "Syntax\noptions\n\nExample\nbody\n\nResults\nvalues\n");
  assert.throws(() => deliverHelp({ content }, navigation, ["missing"]), /invalid exact/);
});

test("stale navigation returns a whole-source catalog rather than stale slices or silent full injection", () => {
  const content = "changed source";
  const result = deliverHelp({ content }, { content_sha256: "stale", sections: [] }, ["old-id"]);
  assert.equal(result.content, null);
  assert.equal(result.section_catalog[0].id, "whole-source");
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
