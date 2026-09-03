"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SERVER_PATH = path.join(ROOT, "mcp", "server.cjs");
const HOOK_PATH = path.join(ROOT, "hooks", "session-start.cjs");
const PEER_AUDIT_PATH = path.join(ROOT, "skills", "stata-peer-audit", "SKILL.md");
const {
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

test("SessionStart hook emits the compact peer-audit reminder", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, "hooks", "hooks.json"), "utf8"));
  const sessionStart = hooks.hooks.SessionStart;
  assert.equal(sessionStart.length, 1);
  assert.equal(sessionStart[0].matcher, "startup|resume|compact");
  assert.equal(sessionStart[0].hooks[0].additionalContextLimit, 800);

  const output = childProcess.execFileSync(process.execPath, [HOOK_PATH], { encoding: "utf8" });
  assert.ok(Buffer.byteLength(output, "utf8") < 800);
  assert.match(output, /fresh read-only stata-peer-audit before edits and after runtime inspection/);
  assert.match(output, /Read complete general-rules.*reread the refactoring contract alongside code/);
  assert.match(output, /Refactoring reduces indirection, not lines.*repetition never authorizes a new program/);
  assert.match(output, /install it separately.*restart Stata.*original command/);
  assert.match(output, /workflow-role names.*calls and docs together.*do not retroactively rename/);
  assert.doesNotMatch(output, /UserPromptSubmit|Stop hook|score|ledger/);

  const peerAudit = fs.readFileSync(PEER_AUDIT_PATH, "utf8");
  assert.match(peerAudit, /installation is a separate, authority-bounded step/);
  assert.match(peerAudit, /`cleaning_data\.do`.*`placebo\.do`/);
  assert.doesNotMatch(peerAudit, /pass\/fail|scorecard|audit state/);
});

test("MCP exposes one simple exact-key three-phase lookup tool", () => {
  assert.equal(TOOL_DEFINITIONS.length, 1);
  assert.equal(TOOL_DEFINITIONS[0].name, "get_stata_command_evidence");
  assert.equal(TOOL_DEFINITIONS[0].inputSchema.oneOf.length, 3);
  assert.equal(TOOL_DEFINITIONS[0].inputSchema.oneOf[2].anyOf.length, 2);
  assert.equal("outputSchema" in TOOL_DEFINITIONS[0], false);
  assert.doesNotMatch(JSON.stringify(TOOL_DEFINITIONS), /project_path|target_files|known_constraints/);
  assert.match(TOOL_DEFINITIONS[0].description, /complete compact main rules/);
  assert.match(TOOL_DEFINITIONS[0].description, /call Phase 2 directly/);
});

test("Phase 1 returns common main rules and a compact neutral 115-command index", () => {
  const result = buildCommandEvidence({ request: "Choose Stata commands" });
  assert.deepEqual(Object.keys(result), ["phase", "main_rules", "command_dictionary"]);
  assert.equal(result.phase, "discovery");
  assert.match(result.main_rules.content, /# General Rules/);
  assert.ok(Buffer.byteLength(result.main_rules.content, "utf8") < 7500);
  for (const pattern of [
    /registries, modes, dispatchers/,
    /Locals are only for iterators/,
    /Repeated calls alone never justify one/,
    /Never present line-count reduction as evidence/,
    /parameter plumbing that hides the estimator/,
    /indent once per real scope/,
    /depth two only.*never depth three/,
    /Do not multiply `if` or conditional branches/,
    /`which`, `capture which`, `findfile`, `ado dir`, or `confirm command`/,
    /separate step.*official or maintainer installation guidance.*restart Stata.*original command/,
    /`cleaning_data\.do`.*`placebo\.do`.*Do not retroactively rename/,
    /native factor-variable syntax and raw `e\(b\)` names/,
    /native bulk or append interface, then a flat loop, then a mechanical two-axis loop/,
    /documented command's own options.*before manual code/,
    /let `outreg2` produce its native coefficients, standard errors, significance markers, headers, and notes/,
    /Excel for tables, PDF for figures, and `.ster`/,
    /semantic validators, graders, rankers/,
  ]) {
    assert.match(result.main_rules.content, pattern);
  }
  assert.equal(result.command_dictionary.length, 115);

  const directPhase2 = buildCommandEvidence({ request: "Use count", selected_commands: ["count"] });
  const directPhase3 = buildCommandEvidence({
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
  assert.ok(JSON.stringify(result).length < 40000, "Phase 1 should remain compact");

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

test("Phase 2 returns official help for the six core data-inspection commands", () => {
  const commands = ["count", "describe", "ds", "levelsof", "list", "lookfor"];
  const result = buildCommandEvidence({
    request: "Inspect data structure, variables, values, levels, and sample size",
    selected_commands: commands,
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

test("Phase 2 returns Stata-rendered xtreg help and its three exact profiles", () => {
  const result = buildCommandEvidence({ request: "Use xtreg", selected_commands: ["xtreg"] });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "command_evidence",
  ]);
  assert.match(result.main_rules.content, /registries, modes, dispatchers/);
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
  assert.deepEqual(
    evidence.paper_example_catalog.map((row) => row.block_id),
    ["block-139-184-033", "block-139-184-034", "block-139-184-035"],
  );
  assert.equal("block_code" in evidence.paper_example_catalog[0], false);
  assert.equal(deepKeys(evidence).has("full_command_guide"), false);
});

test("Phase 2 resolves multiple selected commands independently in request order", () => {
  const result = buildCommandEvidence({
    request: "Use several commands",
    selected_commands: ["duplicates", "cgmreg", "xtivreg", "jwdidstacked"],
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
  assert.ok(duplicates.paper_example_catalog.length > 0);
  assert.match(cgmreg.command_help.content, /cluster\(varlist\)/);
  assert.equal(cgmreg.expanded_documentation.status, "same_source_as_help");
  assert.equal(cgmreg.paper_example_catalog.length, 3);
  assert.equal(xtivreg.command_help.command, "xtivreg");
  assert.deepEqual(xtivreg.paper_example_catalog.map((row) => row.block_id), ["block-139-184-032"]);
  assert.equal(jwdidstacked.command_help, null);
  assert.equal(jwdidstacked.expanded_documentation.status, "unavailable");
  assert.equal(jwdidstacked.paper_example_catalog.length, 1);
});

test("the Stata 18 help and expanded-document indexes cover all 115 commands", () => {
  assert.equal(COMMAND_SOURCE_CATALOG.commands.length, 115);
  assert.doesNotMatch(JSON.stringify(COMMAND_SOURCE_CATALOG), /full_command_guides/);
  assert.equal(COMMAND_HELP_INDEX.guides.length, 115);
  const counts = Object.groupBy(COMMAND_HELP_INDEX.guides, (row) => row.help_status);
  assert.equal(counts.available.length, 113);
  assert.equal(counts.partial, undefined);
  assert.equal(counts.unavailable.length, 2);
  assert.deepEqual(counts.unavailable.map((row) => row.command).sort(), ["jregress", "jwdidstacked"]);

  const collectStyle = COMMAND_HELP_INDEX.guides.find((row) => row.command === "collect_style");
  assert.equal(collectStyle.help_status, "available");
  assert.equal(collectStyle.help_topics.length, 19);
  assert.match(collectStyle.limitations.join(" "), /Stata 18 scope excludes/);
  const content = fs.readFileSync(path.join(ROOT, "data", collectStyle.content_file), "utf8");
  assert.match(content, /collect style _cons/);

  assert.equal(EXPANDED_GUIDE_INDEX.guides.length, 115);
  const expandedCounts = Object.groupBy(
    EXPANDED_GUIDE_INDEX.guides,
    (row) => row.expanded_documentation_status,
  );
  assert.equal(expandedCounts.available.length, 69);
  assert.equal(expandedCounts.same_source_as_help.length, 44);
  assert.equal(expandedCounts.supplemental.length, 1);
  assert.equal(expandedCounts.unavailable.length, 1);
});

test("Phase 3 expands only the exact requested command subset without requiring a paper block", () => {
  const result = buildCommandEvidence({
    request: "Read more about regress",
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

test("Phase 3 returns one slim exact xtreg paper card with an empty log array", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtreg example",
    selected_commands: ["xtreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-033"],
  });
  assert.deepEqual(Object.keys(result), [
    "phase",
    "main_rules",
    "selected_commands",
    "expanded_commands",
    "selected_block_ids",
    "expanded_command_evidence",
    "paper_usage_cards",
  ]);
  assert.deepEqual(result.expanded_commands, []);
  assert.deepEqual(result.expanded_command_evidence, []);
  assert.match(result.main_rules.content, /merely to retain an analysis, robustness check, placebo, permutation, or export/);
  assert.equal(result.paper_usage_cards.length, 1);
  const card = result.paper_usage_cards[0];
  assert.equal(card.block_id, "block-139-184-033");
  assert.equal(card.focus_command, "xtreg");
  assert.match(card.paper_code, /xtreg ln_mortality_rate/);
  assert.equal(card.source_provenance.length, 1);
  assert.equal("paper_occurrences" in card, false);
  assert.equal("boundary_rationale" in card, false);
  assert.deepEqual(card.paper_log_contexts, []);
});

test("Phase 3 attaches the exact raw xtivreg log span without interpretation fields", () => {
  const result = buildCommandEvidence({
    request: "Inspect the selected xtivreg example",
    selected_commands: ["xtivreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-032"],
  });
  const card = result.paper_usage_cards[0];
  assert.equal(card.paper_code.split(/\r?\n/).length, 15);
  assert.equal(card.source_provenance.length, 1);
  assert.equal(card.paper_log_contexts.length, 1);
  assert.equal(card.paper_log_contexts[0].log_spans[0].start, 1);
  assert.equal(card.paper_log_contexts[0].log_spans[0].end, 71);
  assert.equal(card.paper_log_contexts[0].log_spans[0].text.split(/\r?\n/).length, 71);

  const keys = deepKeys(card.paper_log_contexts);
  for (const key of [
    "observed_output_facts",
    "returned_state_facts",
    "factual_limitations",
    "score",
    "rank",
    "winner",
    "promotion_status",
    "pass",
    "fail",
  ]) {
    assert.equal(keys.has(key), false);
  }
});

test("Phase 3 manually narrows the one giant ivregress nuisance table to exact raw ranges", () => {
  const result = buildCommandEvidence({
    request: "Inspect the focal ivregress result",
    selected_commands: ["ivregress"],
    expanded: true,
    selected_block_ids: ["manual-block-084"],
  });
  const spans = result.paper_usage_cards[0].paper_log_contexts[0].log_spans;
  assert.deepEqual(spans.map((row) => [row.role, row.start, row.end]), [
    ["command_echo", 472, 472],
    ["displayed_output", 473, 482],
    ["displayed_output", 992, 994],
  ]);
  assert.match(spans[1].text, /Instrumental-variables LIML regression/);
  assert.match(spans[1].text, /educ/);
  assert.match(spans[2].text, /Endogenous: educ/);
  assert.doesNotMatch(JSON.stringify(spans), /_YPyobXpob_39_56/);
});

test("outreg2 profiles remain nonbinding when a selected block contains another estimator", () => {
  const phase2 = buildCommandEvidence({
    request: "Keep regress and use outreg2",
    selected_commands: ["regress", "outreg2"],
  });
  const outreg2Evidence = phase2.command_evidence.find((row) => row.command === "outreg2");
  assert.deepEqual(
    outreg2Evidence.paper_example_catalog.map((row) => row.block_id),
    [
      "outreg2_table6_replace_append_stats",
      "outreg2_table2_word_columns",
      "outreg2_table3_excel_loop_specs",
      "outreg2_appendixB2a_instrument_columns",
    ],
  );

  const phase3 = buildCommandEvidence({
    request: "Inspect one outreg2 example without changing regress",
    selected_commands: ["regress", "outreg2"],
    expanded: true,
    selected_block_ids: ["outreg2_table3_excel_loop_specs"],
  });
  assert.deepEqual(phase3.selected_commands, ["regress", "outreg2"]);
  assert.equal(phase3.paper_usage_cards[0].focus_command, "outreg2");
  assert.match(phase3.paper_usage_cards[0].paper_code, /reghdfe/);
});

test("paper data stays at 166 blocks and 12 optional raw-log attachments", () => {
  assert.equal(PAPER_PROFILES.length, 166);
  assert.equal(PAPER_BLOCKS.length, 166);
  assert.equal(PAPER_EXECUTION_CONTEXTS.length, 12);
});

test("out-of-dictionary exact topics use live help without restoring an mcpStata help tool", () => {
  const result = buildCommandEvidence(
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
  assert.deepEqual(evidence.paper_example_catalog, []);

  assert.throws(
    () => buildCommandEvidence({ request: "Unsafe topic", selected_commands: ["anova;erase"] }),
    /ABORT invalid_help_topic/,
  );

  for (const command of ["jregress", "jwdidstacked"]) {
    const result = buildCommandEvidence({ request: `Use ${command}`, selected_commands: [command] });
    const evidence = result.command_evidence[0];
    assert.equal(evidence.command, command);
    assert.equal(evidence.help_status, "unavailable");
    assert.equal(evidence.command_help, null);
    assert.ok(evidence.paper_example_catalog.length > 0);
  }
});

test("registered multiword Stata spelling normalizes transparently", () => {
  const result = buildCommandEvidence({
    request: "Export the workbook",
    selected_commands: ["export excel", "import excel"],
  });
  assert.deepEqual(result.selected_commands, ["export_excel", "import_excel"]);
  assert.deepEqual(result.topic_normalizations, [
    {
      requested: "export excel",
      resolved: "export_excel",
      reason: "registered_multiword_command",
    },
    {
      requested: "import excel",
      resolved: "import_excel",
      reason: "registered_multiword_command",
    },
  ]);
  assert.equal(result.command_evidence[0].help_status, "available");
  assert.equal(result.command_evidence[1].help_status, "available");
});

test("Stata language tokens retain their labels while using official macro help", () => {
  const lookedUp = [];
  const result = buildCommandEvidence(
    {
      request: "Check macro language constructs",
      selected_commands: ["global", "local", "tempfile", "tempname"],
    },
    {
      liveHelpLookup: (topic) => {
        lookedUp.push(topic);
        return {
          status: "available",
          help: { command: topic, source_kind: "live_installed_help", content: "macro syntax" },
          limitations: [],
        };
      },
    },
  );
  assert.deepEqual(lookedUp, ["macro", "macro", "macro", "macro"]);
  assert.deepEqual(result.command_evidence.map((row) => row.command), [
    "global",
    "local",
    "tempfile",
    "tempname",
  ]);
  assert.deepEqual(result.command_evidence.map((row) => row.help_topic), [
    "macro",
    "macro",
    "macro",
    "macro",
  ]);
});

test("empty optional Phase 3 arrays are equivalent to omission", () => {
  const documentationOnly = buildCommandEvidence({
    request: "Expand putexcel only",
    selected_commands: ["putexcel"],
    expanded: true,
    expanded_commands: ["putexcel"],
    selected_block_ids: [],
  });
  assert.deepEqual(documentationOnly.selected_block_ids, []);
  assert.equal(documentationOnly.expanded_command_evidence.length, 1);

  const paperOnly = buildCommandEvidence({
    request: "Read one paper block only",
    selected_commands: ["xtreg"],
    expanded: true,
    expanded_commands: [],
    selected_block_ids: ["block-139-184-033"],
  });
  assert.deepEqual(paperOnly.expanded_commands, []);
  assert.equal(paperOnly.paper_usage_cards.length, 1);
});

test("an unavailable live-help topic stops only that evidence branch", () => {
  const result = buildCommandEvidence(
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

test("live Stata exact-help fallback renders an unregistered official topic when Stata 18 is installed", (t) => {
  const stata = process.env.STATA_PATH || "C:\\Program Files\\Stata18\\StataMP-64.exe";
  if (!fs.existsSync(stata)) return t.skip("Stata 18 is unavailable");
  const result = lookupLiveStataHelp("anova");
  assert.equal(result.status, "available");
  assert.equal(result.help.source_kind, "live_installed_help");
  assert.match(result.help.authority, /StataCorp official/);
  assert.match(result.help.content, /Analysis of variance and covariance/i);
});

test("Phase 3 reports duplicate maintainer help and the limited jregress supplement honestly", () => {
  const result = buildCommandEvidence({
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

test("Phase 3 returns available paper blocks when another selected command lacks help", () => {
  const result = buildCommandEvidence({
    request: "Inspect the available branch",
    selected_commands: ["jregress", "xtivreg"],
    expanded: true,
    selected_block_ids: ["block-139-184-032"],
  });
  assert.deepEqual(result.selected_commands, ["jregress", "xtivreg"]);
  assert.equal(result.paper_usage_cards.length, 1);
  assert.equal(result.paper_usage_cards[0].focus_command, "xtivreg");
  assert.equal(result.paper_usage_cards[0].paper_log_contexts.length, 1);
});

test("phase arguments and exact IDs fail closed", () => {
  assert.throws(
    () => buildCommandEvidence({ request: "Scan", selected_commands: ["xtreg"], project_path: "." }),
    /ABORT invalid_phase_arguments/,
  );
  assert.throws(
    () => buildCommandEvidence({ request: "Duplicate", selected_commands: ["xtreg", "xtreg"] }),
    /ABORT duplicate_selected_command/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Wrong command",
      selected_commands: ["xtreg"],
      expanded: true,
      selected_block_ids: ["block-139-184-032"],
    }),
    /ABORT paper_block_not_selected_command/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Missing expanded flag",
      selected_commands: ["xtreg"],
      selected_block_ids: ["block-139-184-033"],
    }),
    /ABORT invalid_phase_arguments/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Empty expanded context",
      selected_commands: ["xtreg"],
      expanded: true,
    }),
    /ABORT empty_expanded_context/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Expansion outside selected boundary",
      selected_commands: ["xtreg"],
      expanded: true,
      expanded_commands: ["regress"],
    }),
    /ABORT expanded_command_not_selected/,
  );
  assert.throws(
    () => buildCommandEvidence({
      request: "Expand a live-only topic",
      selected_commands: ["anova"],
      expanded: true,
      expanded_commands: ["anova"],
    }),
    /ABORT expanded_command_not_registered/,
  );
});

test("JSON-RPC transport lists and calls the lookup tool", () => {
  const list = dispatch({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(list.result.tools.length, 1);

  const call = dispatch({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "get_stata_command_evidence", arguments: { request: "Discover" } },
  });
  assert.equal(call.result.isError, undefined);
  assert.equal(JSON.parse(call.result.content[0].text).command_dictionary.length, 115);
  assert.equal(dispatch({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});
