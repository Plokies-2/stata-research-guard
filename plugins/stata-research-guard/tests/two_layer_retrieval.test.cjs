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
    audit_gate: {
      passed: true,
      basis: "audited_template",
      promotion_status: "audited_template",
      source_hash_verified: true,
      code_hash_verified: true,
      runtime_status: "pass",
      selector_positive_status: "pass",
      selector_sibling_negative_status: "pass",
      auto_selectable_passed: true,
    },
  };
}

function guide(overrides = {}) {
  return {
    evidence_layer: "guide_mechanics",
    layer_id: `guide_mechanics:${overrides.label_id || "guide.regress"}`,
    label_id: overrides.label_id || "guide.regress",
    checkpoint: "estimation.conventional",
    variant_group: "estimation.regress",
    variant_id: "regress_clustered",
    contract_ids: ["regress.clustered"],
    variant_facets: { vce: "cluster" },
    version: { stata: "18" },
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
    variant_id: "regress_clustered",
    contract_ids: ["regress.clustered"],
    variant_facets: { vce: "cluster" },
    version: { stata: "18" },
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
    promotion_status: "audited_template",
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
      contract_ids: ["regress.clustered"],
      variant_id: "regress_clustered",
      variant_facets: { vce: "cluster" },
      version: { stata: "18" },
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

test("explicit contract filtering applies to guides, usage, and support; contractless legacy is comparison-only", () => {
  const result = resolve({}, {
    guideCards: [
      guide({ label_id: "guide.match" }),
      guide({ label_id: "guide.sibling", contract_ids: ["regress.robust"] }),
      guide({ label_id: "guide.legacy", contract_ids: [] }),
    ],
    usageCards: [
      usage({ label_id: "usage.match" }),
      usage({ label_id: "usage.sibling", contract_ids: ["regress.robust"] }),
      usage({ label_id: "usage.legacy", contract_ids: [] }),
      usage({
        label_id: "support.sibling",
        evidence_role: "exact_usage_support",
        contract_ids: ["regress.robust"],
        auto_selectable: false,
        promotion_status: "reference_only",
        code: "",
        code_available: false,
      }),
    ],
  });
  assert.equal(result.guide_layer.primary_card.label_id, "guide.match");
  assert.equal(result.usage_layer.example.label_id, "usage.match");
  assert.equal(result.guide_layer.material_alternatives.some((item) => item.label_id !== "guide.match"), false);
  assert.deepEqual(result.safety.contractless_comparison_only_counts, { guide: 1, usage: 1 });
});

test("unknown requested version or mismatched known version cannot select a known-version guide", () => {
  for (const transition of [{ version: null }, { version: { stata: "17" } }]) {
    const result = resolve({ transition });
    assert.equal(result.guide_layer.primary_card, null);
    assert.equal(result.guide_layer.status, "selection_required");
    assert.equal(result.implementation_route.auto_select_allowed, false);
  }
});

test("unknown guide compatibility does not contradict a known request, but declared compatibility fails closed", () => {
  const unknownVersionGuide = guide({ label_id: "guide.unknown-version", version: null });
  const bothUnknown = resolve({ transition: { version: null } }, {
    guideCards: [unknownVersionGuide],
    usageCards: [],
  });
  assert.equal(bothUnknown.guide_layer.status, "provided");
  assert.equal(bothUnknown.guide_layer.primary_card.label_id, "guide.unknown-version");
  assert.equal(bothUnknown.guide_layer.primary_card.stata_compatibility, null);
  assert.equal(bothUnknown.guide_layer.primary_card.version_semantics, "unspecified_no_runtime_constraint");
  assert.equal(bothUnknown.guide_layer.primary_card.auto_selectable, false);
  assert.equal(bothUnknown.implementation_route.mode, "guide_informed_fallback");
  assert.equal(bothUnknown.implementation_route.auto_select_allowed, false);

  const knownRequestUnknownGuide = resolve({}, {
    guideCards: [unknownVersionGuide],
    usageCards: [],
  });
  assert.equal(knownRequestUnknownGuide.guide_layer.status, "provided");
  assert.equal(knownRequestUnknownGuide.guide_layer.primary_card.label_id, "guide.unknown-version");

  const unknownRequestKnownGuide = resolve({ transition: { version: null } }, {
    guideCards: [guide()],
    usageCards: [],
  });
  assert.equal(unknownRequestKnownGuide.guide_layer.primary_card, null);
  assert.equal(unknownRequestKnownGuide.guide_layer.status, "selection_required");

  const sourceNote = guide({ label_id: "guide.source-note", version: "Base [R]; verify options against installed release." });
  const knownRequestSourceNote = resolve({}, { guideCards: [sourceNote], usageCards: [] });
  assert.equal(knownRequestSourceNote.guide_layer.status, "provided");
  assert.equal(knownRequestSourceNote.guide_layer.primary_card.version, sourceNote.version);
  assert.equal(knownRequestSourceNote.guide_layer.primary_card.stata_compatibility, null);
  assert.equal(knownRequestSourceNote.guide_layer.primary_card.version_semantics, "source_or_manual_edition_note_no_runtime_constraint");

  const introduced18 = guide({ label_id: "guide.introduced-18", version: "Introduced Stata 18; later options vary by release." });
  const tooOld = resolve({ transition: { version: { stata: "17" } } }, {
    guideCards: [introduced18],
    usageCards: [],
  });
  assert.equal(tooOld.guide_layer.primary_card, null);
  assert.equal(tooOld.guide_layer.status, "selection_required");
  const compatible = resolve({}, { guideCards: [introduced18], usageCards: [] });
  assert.equal(compatible.guide_layer.status, "provided");
  assert.deepEqual(compatible.guide_layer.primary_card.stata_compatibility, { kind: "minimum", value: 18 });
  assert.equal(compatible.guide_layer.primary_card.version_semantics, "stata_runtime_compatibility");
});

test("all 178 new Top100 guides are retrievable at Stata 18 by exact contract and facets", () => {
  const guides = fs.readFileSync(path.join(ROOT, "data", "guide_mechanics_cards.jsonl"), "utf8")
    .split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const top100Guides = guides.filter((card) => {
    const sourcePath = card.provenance?.source_path || "";
    return /source_snapshots\/top100_(?:official_data_programming|official_models|maintainer_methods)_guide_templates\.do$/.test(sourcePath);
  });
  assert.equal(top100Guides.length, 178);
  assert.equal(top100Guides.filter((card) => card.version === null).length, 93);

  for (const card of top100Guides) {
    const result = resolveTransitionEvidence({
      transition: {
        checkpoint: card.checkpoint,
        stage: card.stage,
        unit_kind: card.unit_kind,
        variant_group: card.variant_group,
        variant_id: card.variant_id,
        commands: card.command_anchors,
        contract_ids: card.contract_ids,
        variant_facets: card.variant_facets || {},
        version: { stata: "18" },
      },
    }, {
      guideCards: guides,
      usageCards: [],
    });
    assert.equal(result.guide_layer.status, "provided", card.label_id);
    assert.equal(result.guide_layer.primary_card?.label_id, card.label_id, card.label_id);
    assert.equal(result.guide_layer.primary_card?.auto_selectable, false, card.label_id);
    assert.equal(result.implementation_route.auto_select_allowed, false, card.label_id);
  }
});

test("legacy rubric/hash pass never authorizes usage selection", () => {
  const legacy = usage({
    label_id: "usage.legacy-gate",
    promotion_status: "reference_only",
    provenance: {
      ...provenance("deposited_research_code"),
      audit_gate: {
        passed: true,
        basis: "legacy_external_evidence_rubric_review",
        promotion_status: "reference_only",
        source_hash_verified: true,
        code_hash_verified: true,
      },
    },
  });
  const result = resolve({}, { guideCards: [guide()], usageCards: [legacy] });
  assert.equal(result.usage_layer.example, null);
  assert.equal(result.implementation_route.auto_select_allowed, false);
  assert.equal(result.implementation_route.mode, "guide+fallback");
});

test("multiple material usage variants require a substantive selection", () => {
  const result = resolve({ transition: { variant_id: null, variant_facets: null } }, {
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
  const result = resolve({}, { guideCards: [guide({ label_id: "guide.a", code: longCode })], usageCards: [] });
  const primary = result.guide_layer.primary_card;
  assert.ok(primary.context.returned_line_count <= GUIDE_CODE_MAX_LINES);
  assert.ok(primary.context.returned_character_count <= GUIDE_CODE_MAX_CHARS);
  assert.equal(primary.context.truncated, true);
  assert.equal(result.usage_layer.example, null);

  const ambiguous = resolve({ transition: { variant_id: null, variant_facets: null } }, { guideCards: [
    guide({ label_id: "guide.a", variant_id: "a", variant_facets: {} }),
    guide({ label_id: "guide.b", variant_id: "b", variant_facets: {} }),
    guide({ label_id: "guide.c", variant_id: "c", variant_facets: {} }),
  ], usageCards: [] });
  assert.equal(ambiguous.guide_layer.status, "ambiguous_variant");
  assert.equal(ambiguous.guide_layer.primary_card, null);
  assert.equal(ambiguous.guide_layer.material_alternatives.length, MATERIAL_ALTERNATIVE_LIMIT);
  assert.equal(ambiguous.implementation_route.mode, "selection_required");
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
  const support = aregSupport[0];
  const version = support.version || support.provenance.version;
  const result = resolveTransitionEvidence({
    transition: {
      commands: ["areg"],
      contract_ids: support.contract_ids,
      variant_id: support.variant_id,
      version,
    },
  }, {
    guideCards: [guide({
      command_anchors: ["areg"],
      label_id: "guide.areg",
      contract_ids: support.contract_ids,
      variant_id: support.variant_id,
      variant_facets: {},
      version,
    })],
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

test("evidence builder preserves contract metadata, merges exact guide provenance, and enforces the promotion gate", (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "stata-evidence-contracts-"));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const python = path.resolve(path.dirname(process.execPath), "..", "..", "python", "python.exe");
  const builder = path.join(ROOT, "scripts", "build_evidence_layers.py");
  const input = path.join(temporary, "input.jsonl");
  const guideOutput = path.join(temporary, "guide.jsonl");
  const usageOutput = path.join(temporary, "usage.jsonl");
  const noAuxiliary = path.join(temporary, "absent.jsonl");
  const review = (classification = "conditional_candidate") => ({
    status: "external_evidence_rubric_reviewed",
    classification,
    source_verification: { code_sha256_match: true, source_file_sha256_match: true },
  });
  const common = {
    checkpoint: "estimation.conventional",
    variant_group: "estimation.regress",
    variant_id: "regress_clustered",
    contract_ids: ["regress.clustered"],
    variant_facets: { vce: "cluster" },
    version: { stata: "18" },
    command_anchors: ["regress"],
    source_spans: [[1, 1]],
    source_file_sha256: "a".repeat(64),
    code_sha256: "b".repeat(64),
    code: "regress outcome treatment, vce(cluster id)",
    decision: "conditional_keep",
    quality_rubric_review: review(),
  };
  const rows = [
    { ...common, label_id: "guide.one", source_kind: "official_manual_mechanics", source_path: "manual-a.txt" },
    { ...common, label_id: "guide.two", source_kind: "official_manual_mechanics", source_path: "manual-b.txt" },
    {
      ...common,
      label_id: "usage.audited",
      source_kind: "deposited_research_code",
      source_path: "paper-a.do",
      promotion_status: "audited_template",
      auto_selectable: true,
      promotion_audit: {
        runtime: { status: "pass" },
        selector: { positive: { status: "pass" }, negative: { status: "pass" } },
      },
    },
    {
      ...common,
      label_id: "usage.legacy",
      source_kind: "deposited_research_code",
      source_path: "paper-b.do",
      promotion_status: "reference_only",
      auto_selectable: true,
    },
    {
      ...common,
      label_id: "usage.supplemental",
      source_kind: "deposited_research_code",
      source_path: "paper-c.do",
      contract_ids: [],
      supplemental_contract_id: "regress.experimental",
      unmapped_reason: null,
      promotion_status: "reference_only",
      auto_selectable: false,
    },
  ];
  fs.writeFileSync(input, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  const run = spawnSync(python, [builder, "--input", input, "--guide-output", guideOutput, "--usage-output", usageOutput, "--usage-evidence", noAuxiliary], { encoding: "utf8" });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const guides = fs.readFileSync(guideOutput, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  const usages = fs.readFileSync(usageOutput, "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(guides.length, 1);
  assert.deepEqual(guides[0].contract_ids, ["regress.clustered"]);
  assert.deepEqual(guides[0].variant_facets, { vce: "cluster" });
  assert.deepEqual(guides[0].version, { stata: "18" });
  assert.deepEqual(guides[0].merged_duplicate_label_ids, ["guide.one", "guide.two"]);
  assert.equal(guides[0].provenance.supporting_provenance.length, 2);
  assert.equal(usages.find((row) => row.label_id === "usage.audited").auto_selectable, true);
  assert.equal(usages.find((row) => row.label_id === "usage.legacy").auto_selectable, false);
  const supplemental = usages.find((row) => row.label_id === "usage.supplemental");
  assert.equal(supplemental.supplemental_contract_id, "regress.experimental");
  assert.deepEqual(supplemental.contract_ids, []);
});
