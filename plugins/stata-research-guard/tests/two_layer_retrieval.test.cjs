"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const {
  GUIDE_CODE_MAX_CHARS,
  GUIDE_CODE_MAX_LINES,
  MATERIAL_ALTERNATIVE_LIMIT,
  dispatch,
  resolveTransitionEvidence,
} = require(path.join(ROOT, "mcp", "server.cjs"));

function provenance(sourceKind) {
  return {
    source_kind: sourceKind,
    source_path: "fixture.do",
    source_spans: [[1, 2]],
    source_file_sha256: "a".repeat(64),
    code_sha256: "b".repeat(64),
    input_row_sha256: "c".repeat(64),
    audit_gate: { passed: true, basis: "audited_template" },
  };
}

function guide(overrides = {}) {
  return {
    evidence_layer: "guide_mechanics",
    layer_id: `guide_mechanics:${overrides.label_id || "guide.regress"}`,
    label_id: overrides.label_id || "guide.regress",
    checkpoint: "estimation.conventional",
    variant_group: "estimation.regress",
    variant_id: "regress_mechanics",
    stage: "estimation",
    unit_kind: "estimation",
    authority_tier: "official_manual",
    command_anchors: ["regress"],
    state_signature: { requires: ["fixed sample"], observable_signals: ["regress"], produces: ["active estimate"] },
    template_input_profile: { data_structure: "panel", record_unit: "unit-period", required_keys: [], source_basis: "manual", time_structure: "panel", variable_characteristics: [] },
    code: "regress outcome treatment",
    auto_selectable: false,
    research_decisions_supplied: false,
    provenance: provenance("official_manual_guide_derived_mechanics"),
    ...overrides,
  };
}

function usage(overrides = {}) {
  return {
    evidence_layer: "research_usage",
    layer_id: `research_usage:${overrides.label_id || "usage.regress"}`,
    label_id: overrides.label_id || "usage.regress",
    checkpoint: "estimation.conventional",
    variant_group: "estimation.regress",
    variant_id: "research_regress",
    stage: "estimation",
    unit_kind: "estimation",
    command_anchors: ["regress"],
    state_signature: { requires: ["fixed sample"], observable_signals: ["regress"], produces: ["active estimate"] },
    template_input_profile: { data_structure: "panel", record_unit: "unit-period", required_keys: [], source_basis: "paper", time_structure: "panel", variable_characteristics: [] },
    selection_conditions: ["the estimand and sample are fixed"],
    minimal_edit_fields: ["outcome", "regressors"],
    code: "regress outcome treatment, vce(cluster id)",
    decision: "conditional_keep",
    rubric_classification: "conditional_candidate",
    source_tier: "deposited_or_independent_research_code",
    auto_selectable: true,
    provenance: provenance("deposited_research_code"),
    ...overrides,
  };
}

function resolve(overrides = {}, sources = {}) {
  return resolveTransitionEvidence({
    transition: {
      checkpoint: "estimation.conventional",
      commands: ["regress"],
      ...overrides.transition,
    },
    target_input_profile: overrides.target_input_profile,
    substantive_choices: overrides.substantive_choices,
  }, {
    guideCards: sources.guideCards || [guide()],
    usageCards: sources.usageCards || [usage()],
  });
}

test("exact audited usage returns guide and one separately selected usage template", () => {
  const result = resolve();
  assert.equal(result.implementation_route.mode, "guide+usage_template");
  assert.equal(result.guide_layer.status, "provided");
  assert.equal(result.guide_layer.primary_card.auto_selectable, false);
  assert.equal(result.usage_layer.status, "audited_exact_match");
  assert.equal(result.usage_layer.example.label_id, "usage.regress");
  assert.equal(result.safety.guide_and_usage_scores_combined, false);
  assert.equal(result.safety.guide_auto_selectable_count, 0);
  assert.equal("score" in result.guide_layer.primary_card, false);
  assert.equal("score" in result.usage_layer.example, false);
});

test("A/B: a matching guide is never omitted when the usage layer is empty", () => {
  const withUsage = resolve();
  const withoutUsage = resolve({}, { guideCards: [guide()], usageCards: [] });
  assert.equal(withUsage.guide_layer.primary_card.label_id, "guide.regress");
  assert.equal(withoutUsage.guide_layer.primary_card.label_id, "guide.regress");
  assert.equal(withoutUsage.implementation_route.mode, "guide_informed_fallback");
  assert.equal(withoutUsage.safety.guide_exists_but_omitted, false);
});

test("known profile contradiction blocks usage auto-selection but retains guide mechanics", () => {
  const result = resolve({
    target_input_profile: {
      data_structure: "cross_section",
      record_unit: "one unit",
      required_keys: [],
      source_basis: "target",
      time_structure: "cross_section",
      variable_characteristics: [],
    },
  });
  assert.equal(result.guide_layer.status, "provided");
  assert.equal(result.usage_layer.example, null);
  assert.equal(result.usage_layer.status, "profile_mismatch");
  assert.equal(result.implementation_route.mode, "guide+fallback");
  assert.ok(result.usage_layer.profile_mismatches.length >= 1);
});

test("multiple material usage variants require a substantive selection", () => {
  const result = resolve({}, {
    guideCards: [guide()],
    usageCards: [
      usage({ label_id: "usage.regress.cluster", variant_id: "clustered" }),
      usage({ label_id: "usage.regress.robust", variant_id: "robust" }),
    ],
  });
  assert.equal(result.implementation_route.mode, "selection_required");
  assert.equal(result.usage_layer.example, null);
  assert.equal(result.usage_layer.material_alternatives.length, 2);
});

test("an unresolved substantive choice stops both template and fallback routing", () => {
  const result = resolve({
    substantive_choices: { status: "unresolved", unresolved: ["VCE choice"] },
  });
  assert.equal(result.implementation_route.mode, "selection_required");
  assert.deepEqual(result.implementation_route.unresolved_substantive_choices, ["VCE choice"]);
  assert.equal(result.usage_layer.example, null);
  assert.equal(result.guide_layer.primary_card.research_decisions_supplied, false);
});

test("guide context and alternative metadata obey hard caps", () => {
  const longCode = Array.from({ length: 20 }, (_, index) => `${index + 1} ${"x".repeat(80)}`).join("\n");
  const guides = [
    guide({ label_id: "guide.a", code: longCode }),
    guide({ label_id: "guide.b", variant_id: "b" }),
    guide({ label_id: "guide.c", variant_id: "c" }),
    guide({ label_id: "guide.d", variant_id: "d" }),
  ];
  const result = resolve({}, { guideCards: guides, usageCards: [] });
  const primary = result.guide_layer.primary_card;
  assert.ok(primary.context.returned_line_count <= GUIDE_CODE_MAX_LINES);
  assert.ok(primary.context.returned_character_count <= GUIDE_CODE_MAX_CHARS);
  assert.equal(primary.context.truncated, true);
  assert.equal(result.guide_layer.material_alternatives.length, MATERIAL_ALTERNATIVE_LIMIT);
  assert.equal(result.usage_layer.example, null);
});

test("unrelated multi-command query requires split; exact producer-consumer handoff is bounded", () => {
  const split = resolve({ transition: { commands: ["regress", "graph export"] } });
  assert.equal(split.implementation_route.mode, "split_required");
  assert.equal(split.safety.bounded_composition, false);

  const bounded = resolve({
    transition: {
      commands: ["regress", "graph export"],
      composition: {
        kind: "inseparable_producer_consumer",
        producer_state: "active estimate",
        consumer_requires: "active estimate",
      },
    },
  });
  assert.notEqual(bounded.implementation_route.mode, "split_required");
  assert.equal(bounded.safety.bounded_composition, true);
});

test("generated evidence layers have disjoint source tiers and guide auto-select count zero", () => {
  const readJsonl = (name) => fs.readFileSync(path.join(ROOT, "data", name), "utf8")
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const guides = readJsonl("guide_mechanics_cards.jsonl");
  const usages = readJsonl("research_usage_examples.jsonl");
  assert.ok(guides.length > 0);
  assert.ok(usages.length > 0);
  assert.equal(guides.filter((card) => card.auto_selectable).length, 0);
  assert.ok(guides.every((card) => card.evidence_layer === "guide_mechanics"));
  assert.ok(usages.every((card) => card.evidence_layer === "research_usage"));
  assert.ok(usages.every((card) => /^deposited_research_code|^external_research_code|^independent_researcher_code/.test(card.provenance.source_kind)));
  assert.ok(usages.every((card) => !/guide|manual|canonical/i.test(card.provenance.source_kind)));
  const guideIds = new Set(guides.map((card) => card.label_id));
  assert.equal(usages.some((card) => guideIds.has(card.label_id)), false);
  const exactSupports = usages.filter((card) => card.evidence_role === "exact_usage_support");
  assert.equal(exactSupports.length, 19);
  assert.ok(exactSupports.every((card) => card.auto_selectable === false));
  assert.ok(exactSupports.every((card) => card.code === "" && card.code_available === false));
  assert.ok(exactSupports.every((card) => card.provenance.source_url.startsWith("https://www.openicpsr.org/")));
  assert.ok(exactSupports.every((card) => card.provenance.audit_gate.runtime_status === "not_checked"));
});

test("AEA exact-usage support can explain fallback but can never become generation authority", () => {
  const usages = fs.readFileSync(path.join(ROOT, "data", "research_usage_examples.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const aregSupport = usages.filter((card) => card.evidence_role === "exact_usage_support" && card.command_anchors.includes("areg"));
  const result = resolveTransitionEvidence({
    transition: { commands: ["areg"] },
  }, {
    guideCards: [guide({ command_anchors: ["areg"], label_id: "guide.areg" })],
    usageCards: aregSupport,
  });
  assert.equal(result.implementation_route.mode, "guide+fallback");
  assert.equal(result.implementation_route.auto_select_allowed, false);
  assert.equal(result.usage_layer.status, "exact_usage_support_only");
  assert.equal(result.usage_layer.example, null);
  assert.ok(result.usage_layer.material_alternatives.length >= 1);
  assert.ok(result.usage_layer.material_alternatives.every((item) => item.code_available === false));
});

test("MCP wrapper is listed first and initialization makes it the required first resolver", async () => {
  const listed = await dispatch("tools/list", {});
  assert.equal(listed.tools[0].name, "resolve_transition_evidence");
  const initialized = await dispatch("initialize", {});
  assert.match(initialized.instructions, /call resolve_transition_evidence first/i);
  assert.match(initialized.instructions, /Guide mechanics.*never supply or resolve a sample, estimand, model/i);
});

test("evidence builder fails closed on duplicate IDs and ambiguous source tiers", (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-layers-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const python = path.resolve(path.dirname(process.execPath), "..", "..", "python", "python.exe");
  const builder = path.join(ROOT, "scripts", "build_evidence_layers.py");
  const guideOutput = path.join(temporary, "guide.jsonl");
  const usageOutput = path.join(temporary, "usage.jsonl");
  const noAuxiliary = path.join(temporary, "absent.jsonl");
  const run = (rows) => {
    const input = path.join(temporary, `input-${Math.random().toString(16).slice(2)}.jsonl`);
    fs.writeFileSync(input, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
    return spawnSync(python, [builder, "--input", input, "--guide-output", guideOutput, "--usage-output", usageOutput, "--usage-evidence", noAuxiliary], { encoding: "utf8" });
  };

  const duplicate = run([{ label_id: "duplicate" }, { label_id: "duplicate" }]);
  assert.notEqual(duplicate.status, 0);
  assert.match(`${duplicate.stdout}\n${duplicate.stderr}`, /duplicate label_id/i);

  const ambiguous = run([{
    label_id: "ambiguous",
    source_kind: "deposited_research_code_guide_derived",
  }]);
  assert.notEqual(ambiguous.status, 0);
  assert.match(`${ambiguous.stdout}\n${ambiguous.stderr}`, /ambiguous research usage source tier/i);
});
