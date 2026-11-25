"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER_PATH = path.join(ROOT, "mcp", "server.cjs");
const {
  PHASE_INPUT_SCHEMAS,
  TOOL_DEFINITIONS,
  buildCommandEvidence,
  dispatch,
  lookupLiveStataHelp,
} = require(SERVER_PATH);

function readJsonl(name) {
  return fs.readFileSync(path.join(ROOT, "data", name), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(JSON.parse);
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", name), "utf8"));
}

function deepKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const row of value) deepKeys(row, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      deepKeys(child, keys);
    }
  }
  return keys;
}

const PAPER_PROFILES = readJsonl("paper_example_profiles.jsonl");
const PAPER_BLOCKS = readJsonl("high_quality_paper_blocks.jsonl");
const PAPER_EXECUTION_CONTEXTS = readJsonl("paper_execution_contexts.jsonl");
const COMMAND_HELP_INDEX = readJson("command_help_guides.json");
const EXPANDED_GUIDE_INDEX = readJson("expanded_command_guides.json");
const COMMAND_SOURCE_CATALOG = readJson("command_source_catalog.json");

test("paper catalogs are opt-in and omitting them leaves help and rules unchanged", async () => {
  const args = { request: "Read outreg2 syntax", selected_commands: ["outreg2"] };
  const full = await buildCommandEvidence({ ...args, include_paper_catalog: true });
  const compact = await buildCommandEvidence({ ...args, include_paper_catalog: false });
  const expected = structuredClone(full);
  delete expected.command_evidence[0].paper_example_catalog;
  expected.command_evidence[0].paper_example_catalog_omitted = true;
  assert.deepEqual(compact, expected);
  assert.deepEqual(await buildCommandEvidence(args), compact);
});

test("duplicate help references restore the exact default response in both help phases", async () => {
  for (const expanded of [false, true]) {
    const args = { request: "Read shared encode help", selected_commands: ["encode", "decode"], help_view: "full",
      ...(expanded ? { expanded: true, expanded_commands: ["encode", "decode"] } : {}) };
    const full = await buildCommandEvidence(args);
    const compact = await buildCommandEvidence({ ...args, deduplicate_help: true });
    const rowsKey = expanded ? "expanded_command_evidence" : "command_evidence";
    const helpKey = expanded ? "expanded_documentation" : "command_help";
    const first = compact[rowsKey][0][helpKey];
    const second = compact[rowsKey][1][helpKey];
    assert.equal(typeof first.content, "string");
    assert.equal(second.content, null);
    assert.equal(second.content_ref, `#/${rowsKey}/0/${helpKey}/content`);
    second.content = first.content;
    delete second.content_ref;
    assert.deepEqual(compact, full);
    assert.deepEqual(await buildCommandEvidence({ ...args, deduplicate_help: false }), full);
  }
});

test("help deduplication preserves distinct delivered bodies and unavailable live help", async () => {
  let call = 0;
  const result = await buildCommandEvidence({ request: "Read exact topics", selected_commands: ["alpha", "beta", "gamma"],
    include_paper_catalog: false, deduplicate_help: true }, {
    liveHelpLookup: async () => ++call < 3
      ? { status: "available", limitations: [], help: { content: `Different section ${call}`, content_sha256: "same-source-hash" } }
      : { status: "unavailable", limitations: ["Missing help"], help: null },
  });
  assert.equal(result.command_evidence[0].command_help.content, "Different section 1");
  assert.equal(result.command_evidence[1].command_help.content, "Different section 2");
  assert.equal(result.command_evidence[2].command_help, null);
  assert.deepEqual(result.command_evidence[2].limitations, ["Missing help"]);
  assert.ok(result.command_evidence.every(row => row.paper_example_catalog_omitted === true));
});

test("compact help controls reject invalid types and unsupported phases", async () => {
  const args = { request: "Read count", selected_commands: ["count"] };
  for (const option of ["include_paper_catalog", "deduplicate_help"]) {
    await assert.rejects(buildCommandEvidence({ ...args, [option]: "false" }), /must be boolean/);
    await assert.rejects(buildCommandEvidence({ request: "Discover", [option]: true }), /does not allow/);
  }
  await assert.rejects(buildCommandEvidence({ ...args, expanded: true, expanded_commands: ["count"], include_paper_catalog: false }), /does not allow/);
});

test("MCP exposes one simple exact-key three-phase lookup tool", async () => {
  assert.equal(TOOL_DEFINITIONS.length, 1);
  assert.equal(TOOL_DEFINITIONS[0].name, "get_stata_command_evidence");
  assert.equal(PHASE_INPUT_SCHEMAS.length, 3);
  assert.equal(PHASE_INPUT_SCHEMAS[2].anyOf.length, 2);
  const phaseKeys = new Set(PHASE_INPUT_SCHEMAS.flatMap((phase) => Object.keys(phase.properties)));
  assert.deepEqual(Object.keys(TOOL_DEFINITIONS[0].inputSchema.properties).sort(), [...phaseKeys].sort());
  assert.equal("outputSchema" in TOOL_DEFINITIONS[0], false);
  assert.doesNotMatch(JSON.stringify(TOOL_DEFINITIONS), /project_path|target_files|known_constraints/);
});

test("every tool advertises one top-level object schema that Claude Code accepts", () => {
  for (const tool of TOOL_DEFINITIONS) {
    assert.equal(tool.inputSchema.type, "object", tool.name);
    for (const key of ["oneOf", "anyOf", "allOf"]) assert.equal(key in tool.inputSchema, false, `${tool.name} has top-level ${key}`);
  }
});

test("Phase 1 returns common main rules and a compact neutral index of every registered command", async () => {
  const result = await buildCommandEvidence({ request: "Choose Stata commands" });
  assert.deepEqual(Object.keys(result), ["phase", "main_rules", "command_dictionary"]);
  assert.equal(result.phase, "discovery");
  assert.equal(result.main_rules.content, fs.readFileSync(path.join(ROOT, "skills/stata-replication-workflow/references/general-rules.md"), "utf8"));
  assert.deepEqual(result.command_dictionary.map((row) => row.command), COMMAND_SOURCE_CATALOG.commands.map((row) => row.command));

  const directPhase2 = await buildCommandEvidence({ request: "Use count", selected_commands: ["count"] });
  const directPhase3 = await buildCommandEvidence({
    request: "Expand count",
    selected_commands: ["count"],
    expanded: true,
    expanded_commands: ["count"],
  });
  assert.deepEqual(directPhase2.main_rules, result.main_rules);
  assert.deepEqual(directPhase3.main_rules, result.main_rules);
  assert.equal("command_dictionary" in directPhase2, false);

  for (const command of result.command_dictionary) {
    for (const field of [
      "command",
      "family_id",
      "stages",
      "role",
    ]) {
      assert.ok(Object.hasOwn(command, field), `${command.command} lacks ${field}`);
    }
    for (const omitted of [
      "capabilities",
      "required_input_state",
      "output_interface",
      "tradeoffs_and_incompatibilities",
    ]) {
      assert.equal(Object.hasOwn(command, omitted), false, `${command.command} retained ${omitted}`);
    }
  }
  const keys = deepKeys(result);
  for (const key of [
    "full_command_guides",
    "paper_example_catalog",
    "paper_usage_cards",
    "score",
    "rank",
    "winner",
    "promotion_status",
  ]) {
    assert.equal(keys.has(key), false);
  }
});

test("Phase 2 returns official help for the six core data-inspection commands", async () => {
  const commands = ["count", "describe", "ds", "levelsof", "list", "lookfor"];
  const result = await buildCommandEvidence({
    request: "Inspect data structure, variables, values, levels, and sample size",
    selected_commands: commands,
    help_view: "full",
  });
  assert.deepEqual(result.command_evidence.map((row) => row.command), commands);
  assert.deepEqual(result.command_evidence.map((row) => row.help_status), commands.map(() => "available"));
  for (const evidence of result.command_evidence) {
    assert.equal(evidence.command_help.authority, "StataCorp official");
    assert.equal(evidence.expanded_documentation.status, "available");
  }
  assert.match(result.command_evidence[0].command_help.content, /count observations/i);
  assert.match(result.command_evidence[1].command_help.content, /describe data in memory/i);
  assert.match(result.command_evidence[2].command_help.content, /r\(varlist\)/);
  assert.match(result.command_evidence[3].command_help.content, /distinct levels/i);
  assert.match(result.command_evidence[4].command_help.content, /displays the values of variables/i);
  assert.match(result.command_evidence[5].command_help.content, /variable names and labels/i);
});

test("Phase 2 returns Stata-rendered xtreg help without a default paper catalog", async () => {
  const result = await buildCommandEvidence({ request: "Use xtreg", selected_commands: ["xtreg"], help_view: "full" });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "command_evidence",
  ]);
  assert.match(result.main_rules.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(result.selected_commands, ["xtreg"]);
  assert.equal(result.command_evidence.length, 1);
  const evidence = result.command_evidence[0];
  assert.equal(evidence.command, "xtreg");
  assert.equal(evidence.help_status, "available");
  assert.equal(evidence.command_help.command, "xtreg");
  assert.equal(evidence.command_help.source_version, "Stata 18 installation with explicitly marked StataNow features");
  assert.match(evidence.command_help.content, /xtreg depvar/);
  assert.match(evidence.command_help.content, /Syntax/);
  assert.match(evidence.command_help.limitations.join(" "), /StataNow-only/);
  assert.equal("full_manual_available" in evidence.command_help, false);
  assert.equal("paper_example_count" in evidence.command_help, false);
  assert.equal(evidence.expanded_documentation.status, "available");
  assert.equal(evidence.expanded_documentation.source_version, "Stata 18 installation with explicitly marked StataNow features");
  assert.match(evidence.expanded_documentation.limitations.join(" "), /StataNow-only/);
  assert.equal(evidence.paper_example_catalog_omitted, true);
  assert.equal(deepKeys(evidence).has("full_command_guide"), false);
});

test("Phase 2 resolves multiple selected commands independently in request order", async () => {
  const result = await buildCommandEvidence({
    request: "Use several commands",
    selected_commands: ["duplicates", "cgmreg", "xtivreg", "jwdidstacked"],
    help_view: "full",
  });
  assert.deepEqual(
    result.command_evidence.map((row) => row.command),
    ["duplicates", "cgmreg", "xtivreg", "jwdidstacked"],
  );
  assert.deepEqual(
    result.command_evidence.map((row) => row.help_status),
    ["available", "available", "available", "unavailable"],
  );

  const [duplicates, cgmreg, xtivreg, jwdidstacked] = result.command_evidence;
  assert.equal(duplicates.command_help.command, "duplicates");
  assert.match(cgmreg.command_help.content, /cluster\(varlist\)/);
  assert.equal(cgmreg.expanded_documentation.status, "same_source_as_help");
  assert.equal(xtivreg.command_help.command, "xtivreg");
  assert.equal(jwdidstacked.command_help, null);
  assert.equal(jwdidstacked.expanded_documentation.status, "unavailable");
});

test("every registered command has a help entry and an expanded-documentation entry", async () => {
  assert.doesNotMatch(JSON.stringify(COMMAND_SOURCE_CATALOG), /full_command_guides/);
  const statuses = new Set(["available", "unavailable"]);
  const helpByCommand = new Map(COMMAND_HELP_INDEX.guides.map((row) => [row.command, row]));
  const expandedByCommand = new Map(EXPANDED_GUIDE_INDEX.guides.map((row) => [row.command, row]));
  for (const { command } of COMMAND_SOURCE_CATALOG.commands) {
    assert.ok(helpByCommand.has(command), `${command} lacks help`);
    assert.ok(expandedByCommand.has(command), `${command} lacks expanded documentation status`);
  }
  for (const row of COMMAND_HELP_INDEX.guides) {
    assert.ok(statuses.has(row.help_status), `${row.command}: ${row.help_status}`);
    if (row.help_status === "available") {
      assert.ok(row.help_topics.length > 0, row.command);
      assert.ok(fs.existsSync(path.join(ROOT, "data", row.content_file)), row.content_file);
    }
  }
  const expandedStatuses = new Set(["available", "same_source_as_help", "supplemental", "unavailable"]);
  assert.ok(EXPANDED_GUIDE_INDEX.guides.every((row) => expandedStatuses.has(row.expanded_documentation_status)));

  const collectStyle = helpByCommand.get("collect_style");
  assert.match(collectStyle.limitations.join(" "), /Stata 18 scope excludes/);
  assert.match(fs.readFileSync(path.join(ROOT, "data", collectStyle.content_file), "utf8"), /collect style _cons/);
});

test("Phase 3 expands only the exact requested command subset without requiring a paper block", async () => {
  const result = await buildCommandEvidence({
    request: "Read more about regress",
    help_view: "full",
    selected_commands: ["regress", "margins", "marginsplot", "outreg2"],
    expanded: true,
    expanded_commands: ["regress"],
  });
  assert.equal(result.phase, "expanded_context");
  assert.deepEqual(result.expanded_commands, ["regress"]);
  assert.deepEqual(result.selected_block_ids, []);
  assert.deepEqual(result.paper_usage_cards, []);
  assert.equal(result.expanded_command_evidence.length, 1);
  assert.equal(result.expanded_command_evidence[0].command, "regress");
  const documentation = result.expanded_command_evidence[0].expanded_documentation;
  assert.equal(documentation.expanded_documentation_status, "available");
  assert.equal(documentation.source_version, "Stata 18 installation");
  assert.match(documentation.content, /^regress — Linear regression/m);
  assert.match(documentation.content, /regress depvar/);
});

test("Phase 3 keeps an editorial adaptation separate from the original source", async () => {
  const result = await buildCommandEvidence({
    request: "Read an attributed editorial example",
    selected_commands: ["ivregress"],
    expanded: true,
    selected_block_ids: ["manual-block-085"],
  });
  const card = result.paper_usage_cards[0];
  const stored = PAPER_BLOCKS.find((row) => row.block_id === card.block_id);
  assert.equal(card.paper_code, stored.block_code);
  assert.deepEqual(card.editorial_adaptation, stored.editorial_adaptation);
  assert.notEqual(card.paper_code, card.editorial_adaptation.code);
  assert.equal(card.source_provenance[0].code_license, "CC-BY-4.0");
  assert.ok(card.source_provenance[0].paper_authors.length > 0);
});

test("Phase 3 delivers the original code-specific license notice", async () => {
  const result = await buildCommandEvidence({
    request: "Read a paper example with its MIT notice",
    selected_commands: ["graph"],
    expanded: true,
    selected_block_ids: ["manual-block-069"],
  });
  const provenance = result.paper_usage_cards[0].source_provenance[0];
  assert.equal(provenance.code_license, "MIT");
  assert.equal(provenance.license_notices[0].content,
    fs.readFileSync(path.join(ROOT, "LICENSES", "MIT-185943.txt"), "utf8"));
});

test("out-of-dictionary exact topics use live help without a separate help tool", async () => {
  const result = await buildCommandEvidence(
    { request: "Use anova", selected_commands: ["anova"] },
    {
      liveHelpLookup: (command) => ({
        status: "available",
        help: {
          command,
          authority: "StataCorp official help from active Stata 18 installation",
          source_kind: "live_installed_help",
          content: "anova depvar termlist",
          limitations: [],
        },
        limitations: [],
      }),
    },
  );
  const evidence = result.command_evidence[0];
  assert.equal(evidence.command, "anova");
  assert.equal(evidence.registry_status, "outside_dictionary");
  assert.equal(evidence.help_status, "available");
  assert.equal(evidence.command_help.source_kind, "live_installed_help");
  assert.match(evidence.command_help.content, /anova depvar/);
  assert.equal(evidence.expanded_documentation.status, "unavailable");
  assert.equal(evidence.paper_example_catalog_omitted, true);

  await assert.rejects(
    () => buildCommandEvidence({ request: "Unsafe topic", selected_commands: ["anova;erase"] }),
    /invalid_argument: invalid_help_topic/,
  );

  for (const command of ["jregress", "jwdidstacked"]) {
    const result = await buildCommandEvidence({ request: `Use ${command}`, selected_commands: [command] });
    const evidence = result.command_evidence[0];
    assert.equal(evidence.command, command);
    assert.equal(evidence.help_status, "unavailable");
    assert.equal(evidence.command_help, null);
  }
});

test("supplemental basic topics and aliases deliver the bundled originals without live lookup", async () => {
  const commands = ["estimates_save", "post", "macro", "estimates", "estimates_store",
    "estimates_use", "estimates_restore", "postfile", "postclose", "postutil", "global", "local", "tempfile", "tempname"];
  const result = await buildCommandEvidence({ request: "Read the selected basic help", selected_commands: commands,
    help_view: "full", include_paper_catalog: false }, {
    liveHelpLookup: () => { throw new Error("Bundled basic help must not launch Stata"); },
  });
  assert.deepEqual(result.command_evidence.map((row) => row.command), commands);
  for (const row of result.command_evidence) {
    assert.equal(row.help_status, "available");
    assert.equal(row.registry_status, "outside_dictionary");
    assert.equal(row.command_help.content,
      fs.readFileSync(path.join(ROOT, "data/command_help_guides", `${row.help_topic}.txt`), "utf8"));
    assert.equal(row.command_help.source_version, "Stata 18");
  }
  const installed = await buildCommandEvidence({ request: "Read the selected installation", selected_commands: ["postfile"],
    help_source: "installed" }, {
    liveHelpLookup: () => ({ status: "unavailable", help: null, limitations: ["No installed source"] }),
  });
  assert.equal(installed.command_evidence[0].help_status, "unavailable");
  assert.equal(installed.command_evidence[0].command_help, null);
});

test("macro aliases retain the source section map and explicit foundation reuse", async () => {
  const args = { request: "Read selected macro sections", selected_commands: ["local"], include_paper_catalog: false };
  const catalog = (await buildCommandEvidence(args)).command_evidence[0].command_help;
  assert.deepEqual(catalog.section_catalog.map((section) => section.id), ["syntax", "description", "remarks"]);
  const first = (await buildCommandEvidence({ ...args, help_sections: { local: ["syntax"] } })).command_evidence[0].command_help;
  const next = (await buildCommandEvidence({ ...args, help_sections: { local: ["remarks"] },
    known_help_foundations: { local: first.foundation_sha256 } })).command_evidence[0].command_help;
  assert.deepEqual(next.selected_sections.map((section) => section.id), ["remarks"]);
  const lines = fs.readFileSync(path.join(ROOT, "data/command_help_guides/macro.txt"), "utf8").match(/[^\n]*\n|[^\n]+$/g);
  assert.equal(next.content, lines.slice(219, 668).join(""));
});

function recordingLookup(lookedUp, content = (topic) => `source for ${topic}`) {
  return {
    liveHelpLookup: async (topic) => {
      lookedUp.push(topic);
      return { status: "available", help: { command: topic, source_kind: "live_installed_help", content: content(topic) }, limitations: [] };
    },
  };
}

test("spaced, underscore and multiword spellings normalize to exact topics", async () => {
  const registered = await buildCommandEvidence({ request: "Export the workbook", selected_commands: ["export excel", "import excel"] });
  assert.deepEqual(registered.selected_commands, ["export_excel", "import_excel"]);
  assert.deepEqual(registered.topic_normalizations.map((row) => [row.requested, row.resolved, row.reason]), [
    ["export excel", "export_excel", "registered_multiword_command"],
    ["import excel", "import_excel", "registered_multiword_command"],
  ]);
  assert.ok(registered.command_evidence.every((row) => row.help_status === "available"));

  const lookedUp = [];
  const live = await buildCommandEvidence({ request: "Read exact help topics",
    selected_commands: ["graph export", "matrix rownames", "_ms_omit_info"] }, recordingLookup(lookedUp));
  assert.deepEqual(lookedUp, ["graph_export", "matrix_rownames", "_ms_omit_info"]);
  assert.deepEqual(live.selected_commands, lookedUp);

  await assert.rejects(buildCommandEvidence({ request: "Wrong field names", phase: 2, commands: ["estout"] }),
    /Use request and selected_commands; the phase is inferred/);
  await assert.rejects(
    () => buildCommandEvidence({ request: "Duplicate spelling", selected_commands: ["estimates use", "estimates_use"] }),
    /invalid_argument: duplicate_selected_command/,
  );
  for (const command of ["estimates use; erase", "estimates unknown", "estimates ../save"]) {
    await assert.rejects(
      () => buildCommandEvidence({ request: "Invalid topic", selected_commands: [command] }),
      /invalid_argument: invalid_help_topic/,
    );
  }
});

test("commands sharing an installed help topic keep their own labels", async () => {
  const cases = [
    [["estimates save", "estimates use", "estimates store", "estimates restore"],
      ["estimates_save", "estimates_use", "estimates_store", "estimates_restore"],
      ["estimates_save", "estimates_save", "estimates_store", "estimates_store"]],
    [["global", "local", "tempfile", "tempname"], ["global", "local", "tempfile", "tempname"], ["macro", "macro", "macro", "macro"]],
    [["postfile", "postclose", "postutil"], ["postfile", "postclose", "postutil"], ["post", "post", "post"]],
  ];
  for (const [requested, commands, topics] of cases) {
    const lookedUp = [];
    const result = await buildCommandEvidence({ request: "Read shared help", selected_commands: requested, help_source: "installed" },
      recordingLookup(lookedUp));
    assert.deepEqual(lookedUp, topics);
    assert.deepEqual(result.command_evidence.map((row) => row.command), commands);
    assert.deepEqual(result.command_evidence.map((row) => row.help_topic), topics);
    assert.deepEqual(result.command_evidence.map((row) => row.command_help.content), topics.map((topic) => `source for ${topic}`));
  }
});

test("empty optional Phase 3 arrays are equivalent to omission", async () => {
  const documentationOnly = await buildCommandEvidence({
    request: "Expand putexcel only",
    selected_commands: ["putexcel"],
    expanded: true,
    expanded_commands: ["putexcel"],
    selected_block_ids: [],
  });
  assert.deepEqual(documentationOnly.selected_block_ids, []);
  assert.equal(documentationOnly.expanded_command_evidence.length, 1);

  const paperOnly = await buildCommandEvidence({
    request: "Read one paper block only",
    selected_commands: ["xtreg"],
    help_view: "full",
    expanded: true,
    expanded_commands: [],
    selected_block_ids: ["block-139-184-033"],
  });
  assert.deepEqual(paperOnly.expanded_commands, []);
  assert.equal(paperOnly.paper_usage_cards.length, 1);
});

test("an unavailable live-help topic stops only that evidence branch", async () => {
  const result = await buildCommandEvidence(
    { request: "Inspect two topics", selected_commands: ["regress", "notarealstatatopic"] },
    {
      liveHelpLookup: () => ({
        status: "unavailable",
        help: null,
        limitations: ["No matching installed Stata help file was found."],
      }),
    },
  );
  assert.equal(result.command_evidence[0].command, "regress");
  assert.match(result.command_evidence[0].command_help.authority, /StataCorp official/);
  assert.equal(result.command_evidence[1].registry_status, "outside_dictionary");
  assert.equal(result.command_evidence[1].help_status, "unavailable");
  assert.deepEqual(result.command_evidence[1].limitations, ["No matching installed Stata help file was found."]);
});

test("live Stata exact-help fallback renders an unregistered official topic when Stata 18 is installed", async (t) => {
  const stata = process.env.STATA_PATH || "C:\\Program Files\\Stata18\\StataMP-64.exe";
  if (!fs.existsSync(stata)) return t.skip("Stata 18 is unavailable");
  const result = await lookupLiveStataHelp("anova");
  assert.equal(result.status, "available");
  assert.equal(result.help.source_kind, "live_installed_help");
  assert.match(result.help.authority, /StataCorp official/);
  assert.match(result.help.content, /Analysis of variance and covariance/i);
});

test("Phase 3 reports duplicate maintainer help and the limited jregress supplement honestly", async () => {
  const result = await buildCommandEvidence({
    request: "Read the available expansion",
    selected_commands: ["cgmreg", "jregress", "jwdidstacked"],
    expanded: true,
    expanded_commands: ["cgmreg", "jregress", "jwdidstacked"],
  });
  const rows = result.expanded_command_evidence.map((row) => row.expanded_documentation);
  assert.deepEqual(rows.map((row) => row.expanded_documentation_status), [
    "same_source_as_help",
    "supplemental",
    "unavailable",
  ]);
  assert.equal(rows[0].content, null);
  assert.match(rows[1].content, /jackknife standard errors/);
  assert.match(rows[1].limitations.join(" "), /does not replace missing authoritative syntax help/);
  assert.equal(rows[2].content, null);
});

test("phase arguments and exact IDs fail closed", async () => {
  await assert.rejects(
    () => buildCommandEvidence({ request: "Scan", selected_commands: ["xtreg"],
    help_view: "full", project_path: "." }),
    /invalid_argument: invalid_phase_arguments/,
  );
  await assert.rejects(
    () => buildCommandEvidence({ request: "Duplicate", selected_commands: ["xtreg", "xtreg"] }),
    /invalid_argument: duplicate_selected_command/,
  );
  await assert.rejects(
    () => buildCommandEvidence({
      request: "Wrong command",
      selected_commands: ["xtreg"],
    help_view: "full",
      expanded: true,
      selected_block_ids: ["block-139-184-032"],
    }),
    /invalid_argument: paper_block_not_selected_command/,
  );
  await assert.rejects(
    () => buildCommandEvidence({
      request: "Missing expanded flag",
      selected_commands: ["xtreg"],
    help_view: "full",
      selected_block_ids: ["block-139-184-033"],
    }),
    /invalid_argument: invalid_phase_arguments/,
  );
  await assert.rejects(
    () => buildCommandEvidence({
      request: "Empty expanded context",
      selected_commands: ["xtreg"],
    help_view: "full",
      expanded: true,
    }),
    /invalid_argument: empty_expanded_context/,
  );
  await assert.rejects(
    () => buildCommandEvidence({
      request: "Expansion outside selected boundary",
      selected_commands: ["xtreg"],
    help_view: "full",
      expanded: true,
      expanded_commands: ["regress"],
    }),
    /invalid_argument: expanded_command_not_selected/,
  );
  await assert.rejects(
    () => buildCommandEvidence({
      request: "Expand a live-only topic",
      selected_commands: ["anova"],
      expanded: true,
      expanded_commands: ["anova"],
    }),
    /invalid_argument: expanded_command_not_registered/,
  );
});

test("JSON-RPC transport lists and calls the lookup tool", async () => {
  const list = await dispatch({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(list.result.tools.length, 1);

  const call = await dispatch({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: { request: "Discover" } },
  });
  assert.equal(call.result.isError, undefined);
  assert.equal(JSON.parse(call.result.content[0].text).command_dictionary.length, 115);
  assert.equal(await dispatch({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

test("complete rules are the default and caller hash reuse never suppresses changed rules", async () => {
  const first = await buildCommandEvidence({ request: "Read rules", selected_commands: ["count"] });
  const reused = await buildCommandEvidence({ request: "Use same visible rules", selected_commands: ["count"], known_rules_sha256: first.main_rules.sha256 });
  assert.equal(reused.main_rules.unchanged, true);
  assert.equal("content" in reused.main_rules, false);
  const changed = await buildCommandEvidence({ request: "Old hash", known_rules_sha256: "0".repeat(64) });
  assert.equal(changed.main_rules.content, first.main_rules.content);
  const fresh = await buildCommandEvidence({ request: "Fresh context" });
  assert.equal(fresh.main_rules.content, first.main_rules.content);
});

test("help section navigation preserves exact selected source ranges and explicit full help", async () => {
  const catalog = await buildCommandEvidence({ request: "Navigate help", selected_commands: ["outreg2", "regress"], help_view: "catalog" });
  assert.equal(catalog.command_evidence[0].command_help.content, null);
  assert.equal(catalog.command_evidence[0].command_help.delivery, "catalog_only");
  assert.equal(catalog.command_evidence[1].command_help.content, null);
  const full = await buildCommandEvidence({ request: "Full source", selected_commands: ["outreg2"], help_view: "full" });
  const raw = fs.readFileSync(path.join(ROOT, "data/command_help_guides/outreg2.txt"), "utf8");
  assert.equal(full.command_evidence[0].command_help.content, raw);
  const result = await buildCommandEvidence({ request: "Selected original sections", selected_commands: ["outreg2"], help_sections: { outreg2: ["example-12", "reference-basics", "example-3"] } });
  const help = result.command_evidence[0].command_help;
  const lines = raw.match(/[^\n]*\n|[^\n]+$/g);
  assert.deepEqual(help.selected_sections.map((row) => row.id), ["reference-basics", "options-main", "example-0", "example-3", "example-12"]);
  assert.equal(help.content, help.selected_sections.map((row) => lines.slice(row.start - 1, row.end).join("")).join("\n"));
  await assert.rejects(() => buildCommandEvidence({ request: "Unknown ID", selected_commands: ["outreg2"], help_sections: { outreg2: ["invented"] } }), /invalid exact help section/);
  await assert.rejects(() => buildCommandEvidence({ request: "Wrong command", selected_commands: ["regress"], help_sections: { outreg2: ["reference"] } }), /unavailable for selected command/);
});

test("a pending live topic does not block bundled evidence and refresh is forwarded", async () => {
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  let refresh;
  const delayed = buildCommandEvidence({ request: "Slow live help", selected_commands: ["anova"], refresh_live_help: true }, { liveHelpLookup: async (_topic, options) => { refresh = options.refresh; await waiting; return { status: "unavailable", help: null, limitations: ["fixture"] }; } });
  const bundled = await buildCommandEvidence({ request: "Independent bundled request", selected_commands: ["regress"], help_view: "full" });
  assert.ok(bundled.command_evidence[0].command_help.content);
  assert.equal(refresh, true);
  release();
  assert.equal((await delayed).command_evidence[0].help_status, "unavailable");
});

async function callTool(arguments_) {
  const response = await dispatch({ jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: arguments_ } });
  assert.notEqual(response.result.isError, true, response.result.content?.[0]?.text);
  return JSON.parse(response.result.content[0].text);
}

test("MCP sends the complete rules once per session and again on include_rules", async () => {
  const args = { request: "Read count help", selected_commands: ["count"], include_paper_catalog: false };
  const rules = fs.readFileSync(path.join(ROOT, "skills/stata-replication-workflow/references/general-rules.md"), "utf8");
  assert.equal((await callTool({ ...args, include_rules: true })).main_rules.content, rules);
  const later = (await callTool(args)).main_rules;
  assert.equal(later.unchanged, true);
  assert.equal("content" in later, false);
  assert.match(later.note, /include_rules: true/);
  assert.equal((await callTool({ ...args, include_rules: true })).main_rules.content, rules);
});

test("MCP responses omit provenance and do not count rules toward the help threshold", async () => {
  const result = await callTool({ request: "Read regress options", selected_commands: ["regress"], include_rules: true, include_paper_catalog: true });
  assert.equal(typeof result.main_rules.content, "string");
  assert.equal("response_navigation" in result, false);
  assert.equal(typeof result.command_evidence[0].command_help.content, "string");
  assert.doesNotMatch(JSON.stringify(result), /"(source_files|content_sha256|source_content_sha256|renderer_options|license_notices|code_license)"/);

  const papers = await callTool({ request: "Read one paper block", selected_commands: ["regress"], expanded: true,
    selected_block_ids: [result.command_evidence[0].paper_example_catalog[0].block_id] });
  const provenance = papers.paper_usage_cards[0].source_provenance[0];
  assert.ok(provenance.title || provenance.article_doi || provenance.repository_doi);
  assert.doesNotMatch(JSON.stringify(papers), /"(license_notices|paper_code_sha256|source_file_sha256|log_provenance)"/);
});
