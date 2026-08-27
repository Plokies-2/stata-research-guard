"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const DICTIONARY = path.join(ROOT, "data", "workflow_block_dictionary.json");
const SOURCE_ARCHIVE_INDEX = path.join(ROOT, "data", "source_archive", "index.json");
const LABELS = fs.readFileSync(path.join(ROOT, "data", "labeled_checkpoints.jsonl"), "utf8")
  .trim().split(/\r?\n/).map((line) => JSON.parse(line));
const PACKAGES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference_packages.json"), "utf8"));
const {
  templateReuseCheck,
  commandSequence,
  extractSpans,
  extractSourceSpans,
  matchingAutoSelectableLabels,
} = require(path.join(ROOT, "mcp", "template_reuse.cjs"));

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function groupedExcelFlowProfile() {
  const outcome = (name, family) => ({ name, meaning: `${family} outcome`, family, unit: "index points", transform: "level", sample: "analysis sample", estimand: "same treatment effect", estimate_handoff: `estimates/${name}.ster`, specification_order: [1, 2, 3] });
  return {
    outcomes: [outcome("y1", "family_a"), outcome("y2", "family_a"), outcome("y3", "family_b"), outcome("y4", "family_b")],
    sheet_groups: [
      { sheet_group_id: "a", outcomes: ["y1", "y2"], grouping_reason: "readers compare family-a outcomes", decision_source: "model_from_metadata", grouping_evidence: ["variable labels identify the family-a topic"] },
      { sheet_group_id: "b", outcomes: ["y3", "y4"], grouping_reason: "readers compare family-b outcomes", decision_source: "existing_project", grouping_evidence: ["the existing workbook has a family-b section"] },
    ],
    sheet_plan: [
      { workbook: "table.xlsx", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "reader-facing topic" },
      { workbook: "table.xlsx", sheet: "family_b", sample: "all", sheet_group_id: "b", estimate_names: ["y3_s1", "y3_s2", "y3_s3", "y4_s1", "y4_s2", "y4_s3"], reason: "reader-facing topic" },
    ],
  };
}

function repeatedWorkbookExcelFlowProfile() {
  const profile = groupedExcelFlowProfile();
  profile.sheet_plan = [
    { workbook: "table_all.xlsx", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "family-a topic in the all-sample workbook" },
    { workbook: "table_all.xlsx", sheet: "family_b", sample: "all", sheet_group_id: "b", estimate_names: ["y3_s1", "y3_s2", "y3_s3", "y4_s1", "y4_s2", "y4_s3"], reason: "family-b topic in the all-sample workbook" },
    { workbook: "table_subsample.xlsx", sheet: "family_a", sample: "subsample", sheet_group_id: "a", estimate_names: ["sub_y1_s1", "sub_y1_s2", "sub_y1_s3", "sub_y2_s1", "sub_y2_s2", "sub_y2_s3"], reason: "the same family-a topic in the subsample workbook" },
    { workbook: "table_subsample.xlsx", sheet: "family_b", sample: "subsample", sheet_group_id: "b", estimate_names: ["sub_y3_s1", "sub_y3_s2", "sub_y3_s3", "sub_y4_s1", "sub_y4_s2", "sub_y4_s3"], reason: "the same family-b topic in the subsample workbook" },
  ];
  return profile;
}

function oneGroupRepeatedWorkbookFlowProfile() {
  const profile = groupedExcelFlowProfile();
  profile.outcomes = profile.outcomes.slice(0, 2);
  profile.sheet_groups = profile.sheet_groups.slice(0, 1);
  profile.sheet_plan = [
    { workbook: "table_all.xls", sheet: "family_a", sample: "all", sheet_group_id: "a", estimate_names: ["y1_s1", "y1_s2", "y1_s3", "y2_s1", "y2_s2", "y2_s3"], reason: "family-a topic in the all-sample workbook" },
    { workbook: "table_subsample.xls", sheet: "family_a", sample: "subsample", sheet_group_id: "a", estimate_names: ["sub_y1_s1", "sub_y1_s2", "sub_y1_s3", "sub_y2_s1", "sub_y2_s2", "sub_y2_s3"], reason: "the same family-a topic in the subsample workbook" },
  ];
  return profile;
}

function singleSheetExcelFlowProfile() {
  return {
    outcomes: [{ name: "y", meaning: "primary outcome", unit: "level", transform: "none", sample: "analysis sample", estimand: "conditional mean association", estimate_handoff: "active estimate", specification_order: [1] }],
    sheet_groups: [{ sheet_group_id: "primary", outcomes: ["y"], grouping_reason: "one requested result table", decision_source: "user", grouping_evidence: ["the user requested one workbook with one results sheet"] }],
    sheet_plan: [{ workbook: "table.xls", sheet: "Sheet1", sample: "analysis sample", sheet_group_id: "primary", estimate_names: ["model_1"], reason: "one requested workbook with one sheet" }],
  };
}

function automaticAxisProfile(targetPath, targetSpans) {
  return {
    expected_plots: [{ outcome: "Y", specification: "TWFE", sample_comparison: "analysis sample" }],
    axis_groups: [{
      axis_group_id: "outcome_y_auto",
      axis_mode: "automatic",
      outcomes: ["Y"],
      specification: "TWFE",
      sample_comparison: "analysis sample",
      decision_source: "existing_project",
      grouping_evidence: ["Y is not directly comparable with another requested outcome"],
      target_path: targetPath,
      target_spans: targetSpans,
    }],
  };
}

function mixedAxisProfile(targetPath, targetSpans) {
  return {
    rendering_mode: "single_flat_mixed_axis_loop",
    expected_plots: [
      { outcome: "close_outcome_a", specification: "TWFE", sample_comparison: "analysis sample" },
      { outcome: "close_outcome_b", specification: "TWFE", sample_comparison: "analysis sample" },
      { outcome: "other_outcome_a", specification: "TWFE", sample_comparison: "analysis sample" },
      { outcome: "other_outcome_b", specification: "TWFE", sample_comparison: "analysis sample" },
    ],
    axis_groups: [
      {
        axis_group_id: "close_pair",
        axis_mode: "fixed_group",
        outcomes: ["close_outcome_a", "close_outcome_b"],
        specification: "TWFE",
        sample_comparison: "analysis sample",
        coefficient_family: "event-time treatment effects",
        unit: "percentage points",
        transform: "level",
        grouping_reason: "the outcomes form one directly comparable pair",
        decision_source: "model_from_metadata",
        grouping_evidence: ["the outcome definitions identify one close pair"],
        range_basis: "one range covers the pair and confidence intervals",
        range: { min: -0.1, max: 0.1, step: 0.05 },
      },
      ...["other_outcome_a", "other_outcome_b"].map((outcome) => ({
        axis_group_id: `${outcome}_auto`,
        axis_mode: "automatic",
        outcomes: [outcome],
        specification: "TWFE",
        sample_comparison: "analysis sample",
        decision_source: "caller_declared",
        grouping_evidence: [`${outcome} belongs to the automatic-axis complement`],
      })),
    ],
    mixed_loop_binding: {
      target_path: targetPath,
      target_spans: targetSpans,
      outcome_loop_local: "all_outcomes",
      fixed_outcomes_local: "fixed_outcomes",
      axis_options_local: "axis_options",
    },
  };
}

function lintStub(content) {
  const depthTwo = /foreach[^\n]*\{[\s\S]*forvalues[^\n]*\{/i.test(content);
  const depthThree = /foreach[^\n]*\{[\s\S]*foreach[^\n]*\{[\s\S]*forvalues[^\n]*\{/i.test(content);
  const opaqueProgram = /program\s+define\b[\s\S]*?\b(?:regress|reg|reghdfe|xtreg)\b[\s\S]*?\bend\b/i.test(content);
  const findings = [];
  if (depthThree) findings.push({ severity: "error", rule: "nested_loop" });
  if (opaqueProgram) findings.push({ severity: "error", rule: "opaque_program" });
  if (/^outreg2\b.*\b(?:keep|drop)\s*\(/im.test(content)) findings.push({ severity: "error", rule: "outreg2_raw_rows_modified" });
  return {
    findings,
    summary: { max_loop_depth: depthThree ? 3 : depthTwo ? 2 : 1 },
  };
}

function fixture(t, labelId = "export.regression_excel.from_ster_default_style.v1") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-template-reuse-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "code"));
  const label = LABELS.find((row) => row.label_id === labelId);
  assert.ok(label, labelId);
  const target = path.join(root, "code", "module.do");
  fs.writeFileSync(target, label.code, "utf8");
  const manifest = {
    schema_version: "1.0",
    plugin_dictionary_sha256: hash(fs.readFileSync(DICTIONARY)),
    required_headwords: [{ checkpoint: label.checkpoint, mode: "template" }],
    selections: [{
      label_id: label.label_id,
      source_code_sha256: label.code_sha256,
      source: { path: label.source_path, spans: label.source_spans },
      source_kind: label.source_kind,
      target_path: "code/module.do",
      target_spans: [[1, label.code.split(/\r?\n/).length]],
      target_span_sha256: hash(Buffer.from(label.code, "utf8")),
      edited_fields: [],
      selection_conditions_met: label.selection_conditions || [],
      required_changes_applied: label.required_changes || [],
    }],
  };
  if (label.label_id === "export.regression_excel.from_ster_default_style.v1") {
    manifest.output_flow_profile = groupedExcelFlowProfile();
    fs.writeFileSync(path.join(root, "code", "invoke.do"), [
      'outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3 y2_s1 y2_s2 y2_s3") workbook("table.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
      'outreg2_xlsx, estimates("y3_s1 y3_s2 y3_s3 y4_s1 y4_s2 y4_s3") workbook("table.xlsx") sheet("family_b") adjdec(3) meandec(2)',
    ].join("\n"), "utf8");
  }
  const packageId = label.source_path.replaceAll("\\", "/").match(/^corpus\/packages\/([^/]+)\//)?.[1];
  if (packageId) {
    const packageMetadata = PACKAGES.find((row) => String(row.project_id) === packageId);
    manifest.selections[0].source_package_id = packageId;
    manifest.selections[0].repository_doi = packageMetadata.repository_doi;
  }
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return { root, label, manifest, target };
}

function check(root, overrides = {}, contextOverrides = {}) {
  return templateReuseCheck({
    path: root,
    manifest_path: "template_reuse_manifest.json",
    enforce_template_reuse: true,
    ...overrides,
  }, { labels: LABELS, packages: PACKAGES, dictionaryPath: DICTIONARY, lintContent: lintStub, ...contextOverrides });
}

function commandPrefix(code, commandCount) {
  const lines = code.split(/\r?\n/);
  for (let end = 1; end <= lines.length; end += 1) {
    const candidate = lines.slice(0, end).join("\n");
    if (commandSequence(candidate).length >= commandCount) return candidate;
  }
  throw new Error(`source contains fewer than ${commandCount} commands`);
}

function useAtomicSubsteps(root, manifest, label, substeps) {
  manifest.schema_version = "2.0";
  manifest.required_headwords = [{ checkpoint: label.checkpoint, mode: "mixed", substeps }];
  for (const selection of manifest.selections) {
    selection.source_file_sha256 = label.source_file_sha256;
    selection.substep_id = substeps.find((row) => row.mode === "template")?.substep_id;
  }
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
}

function nativeTarget(root, id, content) {
  const relative = `code/native_${id.replace(/[^a-z0-9_]+/gi, "_")}.do`;
  fs.writeFileSync(path.join(root, ...relative.split("/")), content, "utf8");
  return {
    target_path: relative,
    target_spans: [[1, content.split(/\r?\n/).length]],
    target_span_sha256: hash(Buffer.from(content, "utf8")),
  };
}

function standardizationNativeClaim(t, transform) {
  const current = fixture(t, "clean.standardize_fixed_esample_complete_components.v1");
  current.manifest.selections = [];
  const content = `${transform(current.label.code)}\ndisplay "zebra"`;
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: "standardization_native_claim",
    mode: "general_rule",
    match: { commands: ["display"], tokens: ["zebra"], query: "display zebra" },
    ...nativeTarget(current.root, "standardization_native_claim", content),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "Print a project-specific marker after the claimed native standardization flow.",
    },
  }]);
  return { ...current, result: check(current.root) };
}

function crossFileGlobalOutput(t, globalDefinition, outputLine) {
  const current = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [current.label.label_id] },
  }]);
  fs.writeFileSync(path.join(current.root, "runner.do"), `${globalDefinition}\ndo "hidden.do"\n`, "utf8");
  fs.writeFileSync(path.join(current.root, "hidden.do"), `${outputLine}\n`, "utf8");
  return { ...current, result: check(current.root) };
}

function installedCacheForLabel(t, label) {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stata-installed-cache-"));
  t.after(() => fs.rmSync(cacheRoot, { recursive: true, force: true }));
  const pluginRoot = path.join(cacheRoot, "cache", "stata-research-guard");
  const dictionaryPath = path.join(pluginRoot, "data", "workflow_block_dictionary.json");
  fs.mkdirSync(path.dirname(dictionaryPath), { recursive: true });
  fs.copyFileSync(DICTIONARY, dictionaryPath);
  const completeIndex = JSON.parse(fs.readFileSync(SOURCE_ARCHIVE_INDEX, "utf8"));
  const sourceEntry = completeIndex.sources[label.source_path];
  assert.ok(sourceEntry, label.source_path);
  const index = { schema_version: completeIndex.schema_version, sources: { [label.source_path]: { ...sourceEntry } } };
  const archiveSource = path.join(ROOT, ...sourceEntry.archive_path.split("/"));
  const archiveTarget = path.join(pluginRoot, ...sourceEntry.archive_path.split("/"));
  fs.mkdirSync(path.dirname(archiveTarget), { recursive: true });
  fs.copyFileSync(archiveSource, archiveTarget);
  const indexPath = path.join(pluginRoot, "data", "source_archive", "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  return { pluginRoot, dictionaryPath, indexPath, archiveTarget, index };
}

function atomicSelectionFixture(t, labelId, targetCode, editedFields) {
  const current = fixture(t, labelId);
  const substepId = `atomic_${labelId.replace(/[^a-z0-9_]+/gi, "_")}`;
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: substepId,
    mode: "template",
    match: { label_ids: [labelId] },
  }]);
  fs.writeFileSync(current.target, `${targetCode}\n`, "utf8");
  const selection = current.manifest.selections[0];
  selection.target_spans = [[1, 1]];
  selection.target_span_sha256 = hash(Buffer.from(targetCode, "utf8"));
  selection.edited_fields = editedFields;
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  return current;
}

function setAtomicTarget(current, targetCode) {
  fs.writeFileSync(current.target, `${targetCode}\n`, "utf8");
  current.manifest.selections[0].target_spans = [[1, targetCode.split(/\r?\n/).length]];
  current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(targetCode, "utf8"));
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
}

const ATOMIC_TRANSITIONS = [
  ["merge.retain_matched_rows.v1", "merge 1:m firm_id year using \"$data/using.dta\", keep(match) nogen", ["merge cardinality", "key variables", "using file"], "merge"],
  ["integrity.assert_unique_key.v1", "isid firm_id year", ["key variables"], "isid"],
  ["integrity.declare_panel.v1", "xtset firm_id year, yearly", ["unit identifier", "time variable", "frequency option"], "xtset"],
  ["descriptives.summarize_esample_mean.v1", "estadd ysumm, mean", [], "estadd"],
  ["postest.load_saved_ster.v1", "estimates use \"$ster/spec_1.ster\"", ["estimate path"], "estimates use"],
  ["postest.store_named_estimate.v1", "estimates store spec_1", ["estimate name"], "estimates store"],
];

test("every archived label source span reproduces the builder code hash", () => {
  const index = JSON.parse(fs.readFileSync(SOURCE_ARCHIVE_INDEX, "utf8"));
  let multiSpanCount = 0;
  for (const label of LABELS) {
    const entry = index.sources[label.source_path];
    assert.ok(entry, `archive entry missing for ${label.label_id}`);
    const bytes = fs.readFileSync(path.join(ROOT, ...entry.archive_path.split("/")));
    assert.equal(hash(bytes), label.source_file_sha256, `${label.label_id} source bytes`);
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const extracted = extractSourceSpans(source, label.source_spans, `source ${label.label_id}`);
    assert.equal(hash(Buffer.from(extracted, "utf8")), label.code_sha256, `${label.label_id} source span`);
    if (label.source_spans.length > 1) multiSpanCount += 1;
  }
  assert.ok(multiSpanCount > 0, "fixture must exercise multi-span extraction");
  assert.ok(LABELS.some((row) => row.label_id === "descriptives.depvar_mean_esample.v1"));
  assert.ok(LABELS.some((row) => row.label_id === "descriptives.collapse_entity_means_max.v1"));
});

test("atomic state-transition labels remain selectable while reference-only evidence stays excluded", (t) => {
  for (const [labelId, targetCode, editedFields] of ATOMIC_TRANSITIONS) {
    const current = atomicSelectionFixture(t, labelId, targetCode, editedFields);
    const result = check(current.root, { min_command_retention: 0.75 });
    assert.equal(result.status, "pass", `${labelId}: ${JSON.stringify(result.blockers)}`);
    assert.equal(result.selection_checks[0].evidence.command_retention, 1, labelId);
  }
  for (const labelId of ["integrity.panel_key_before_merge.v1", "descriptives.depvar_mean_esample.v1"]) {
    const label = LABELS.find((row) => row.label_id === labelId);
    assert.equal(label.quality_rubric_review.classification, "reference_only", labelId);
  }
  const keyMatches = matchingAutoSelectableLabels(LABELS, "integrity.audit", { commands: ["isid"] });
  assert.ok(keyMatches.some((row) => row.label_id === "integrity.assert_unique_key.v1"));
  assert.ok(!keyMatches.some((row) => row.label_id === "integrity.panel_key_before_merge.v1"));
  const attachedMeanMatches = matchingAutoSelectableLabels(LABELS, "descriptives.sample_mean", { commands: ["estadd"], tokens: ["e(ymean)"] });
  assert.ok(attachedMeanMatches.some((row) => row.label_id === "descriptives.summarize_esample_mean.v1"));
  const broadMeanMatches = matchingAutoSelectableLabels(LABELS, "descriptives.sample_mean", { commands: ["summarize"], tokens: ["e(sample)"] });
  assert.ok(!broadMeanMatches.some((row) => row.label_id === "descriptives.depvar_mean_esample.v1"));
  const referenceLabel = LABELS.find((row) => row.label_id === "cleanup.erase_named_spmon_intermediates.v1");
  assert.equal(referenceLabel.quality_rubric_review.classification, "reference_only");
  const cleanupMatches = matchingAutoSelectableLabels(LABELS, "cleanup", { commands: ["erase"] });
  assert.ok(!cleanupMatches.some((row) => row.label_id === referenceLabel.label_id));
});

test("one-command PDF export is an archive-backed template and cannot be claimed native", (t) => {
  const targetCode = 'graph export "$OUTPUT/figures/figure_1.pdf", replace';
  const current = atomicSelectionFixture(t, "export.figure_pdf.v1", targetCode, ["output PDF path"]);
  const passed = check(current.root, { min_command_retention: 0.75 });
  assert.equal(passed.status, "pass", JSON.stringify(passed.blockers));
  assert.equal(passed.selection_checks[0].evidence.command_retention, 1);

  const installed = installedCacheForLabel(t, current.label);
  const archivePassed = check(current.root, {}, { dictionaryPath: installed.dictionaryPath });
  assert.equal(archivePassed.status, "pass", JSON.stringify(archivePassed.blockers));
  assert.equal(archivePassed.selection_checks[0].evidence.live_source.resolution, "plugin_source_archive");

  const native = fixture(t, "export.figure_pdf.v1");
  native.manifest.selections = [];
  useAtomicSubsteps(native.root, native.manifest, native.label, [{
    substep_id: "native_pdf_export",
    mode: "general_rule",
    match: { commands: ["graph export"], tokens: ["pdf"] },
    ...nativeTarget(native.root, "native_pdf_export", targetCode),
    general_rule_justification: {
      kind: "template_mismatch",
      nearest_template_hint: "export.figure_pdf.v1",
      template_status: "wrong_selection",
      hint_used: "graph export syntax",
    },
  }]);
  const nativeBlocked = check(native.root);
  assert.equal(nativeBlocked.status, "needs_revision");
  assert.ok(nativeBlocked.blockers.some((row) => row.rule === "general_rule_substep_template_available"
    && row.matched_candidate_ids.includes("export.figure_pdf.v1")));
  const nativeAdvisory = check(native.root, { enforce_template_reuse: false });
  assert.equal(nativeAdvisory.status, "pass", JSON.stringify(nativeAdvisory.blockers));
  assert.equal(nativeAdvisory.template_reuse_enforcement, "advisory");
  assert.ok(nativeAdvisory.warnings.some((row) => row.rule === "preferred_template_not_selected"
    && row.matched_candidate_ids.includes("export.figure_pdf.v1")));

  const broad = fixture(t, "figure.municipality_year_scatter_pdf.v1");
  fs.writeFileSync(broad.target, `${targetCode}\n`, "utf8");
  broad.manifest.selections[0].target_spans = [[1, 1]];
  broad.manifest.selections[0].target_span_sha256 = hash(Buffer.from(targetCode, "utf8"));
  fs.writeFileSync(path.join(broad.root, "template_reuse_manifest.json"), JSON.stringify(broad.manifest, null, 2), "utf8");
  const broadBlocked = check(broad.root, { min_command_retention: 0.75 });
  assert.equal(broadBlocked.status, "needs_revision");
  assert.ok(broadBlocked.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"));
});

test("graph export and graph save retain distinct atomic signatures and native candidates", (t) => {
  assert.deepEqual(commandSequence('graph export "$OUTPUT/figure.pdf", replace'), ["graph export:pdf"]);
  assert.deepEqual(commandSequence('graph export "$OUTPUT/figure.png", replace'), ["graph export:png"]);
  assert.deepEqual(commandSequence('graph export "$OUTPUT/figure", as(pdf) replace'), ["graph export:pdf"]);
  assert.deepEqual(commandSequence('graph save "$OUTPUT/figure.gph", replace'), ["graph save"]);
  assert.deepEqual(commandSequence('estimates use "$ster/spec.ster"\nestimates store spec\nestimates save "$ster/spec.ster"'), ["estimates use", "estimates store", "estimates save"]);
  assert.deepEqual(commandSequence('merge m:1 firm_id year using "$data/a.dta"\nmerge 1:m firm_id year using "$data/b.dta"'), ["merge:m:1", "merge:1:m"]);

  const saveCode = 'graph save "$OUTPUT/figures/figure_1.gph", replace';
  const pdfTemplate = atomicSelectionFixture(t, "export.figure_pdf.v1", saveCode, ["output PDF path"]);
  const saveResult = check(pdfTemplate.root, { min_command_retention: 0.75 });
  assert.equal(saveResult.status, "needs_revision");
  assert.equal(saveResult.selection_checks[0].evidence.command_retention, 0);
  assert.ok(saveResult.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"));

  const nativeSave = fixture(t, "export.figure_pdf.v1");
  nativeSave.manifest.selections = [];
  useAtomicSubsteps(nativeSave.root, nativeSave.manifest, nativeSave.label, [{
    substep_id: "native_gph_save",
    mode: "general_rule",
    match: { commands: ["graph save"], tokens: ["gph"] },
    ...nativeTarget(nativeSave.root, "native_gph_save", saveCode),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "The project requires a durable GPH graph artifact.",
    },
  }]);
  const nativeSaveResult = check(nativeSave.root);
  assert.equal(nativeSaveResult.status, "pass", JSON.stringify(nativeSaveResult.blockers));
  assert.ok(!nativeSaveResult.substep_checks[0].general_rule_target_evidence.observed_candidate_ids.includes("export.figure_pdf.v1"));

  const nativePdf = fixture(t, "export.figure_pdf.v1");
  nativePdf.manifest.selections = [];
  useAtomicSubsteps(nativePdf.root, nativePdf.manifest, nativePdf.label, [{
    substep_id: "native_pdf_export",
    mode: "general_rule",
    match: { commands: ["graph export"], tokens: ["pdf"] },
    ...nativeTarget(nativePdf.root, "native_pdf_export", 'graph export "$OUTPUT/figures/figure_1.pdf", replace'),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "The PDF output location is specific to this project.",
    },
  }]);
  const nativePdfResult = check(nativePdf.root);
  assert.equal(nativePdfResult.status, "needs_revision");
  assert.ok(nativePdfResult.substep_checks[0].general_rule_target_evidence.observed_candidate_ids.includes("export.figure_pdf.v1"));
  assert.ok(nativePdfResult.blockers.some((row) => row.rule === "general_rule_substep_template_available"));
});

test("coefplot graph assembly and PDF export remain separate atomic templates", (t) => {
  const labelId = "figure.coefplot_named_estimates_labels.v1";
  const sourceLabel = LABELS.find((row) => row.label_id === labelId);
  const pdfLabelId = "export.figure_pdf.v1";
  const pdfLabel = LABELS.find((row) => row.label_id === pdfLabelId);
  assert.deepEqual(sourceLabel.command_anchors, ["coefplot"]);
  assert.ok(!/\bgraph\s+(?:save|export)\b/i.test(sourceLabel.code));
  assert.deepEqual(pdfLabel.command_anchors, ["graph export"]);

  const assembly = atomicSelectionFixture(t, labelId, sourceLabel.code, sourceLabel.minimal_edit_fields);
  setAtomicTarget(assembly, sourceLabel.code);
  const assemblyResult = check(assembly.root, { min_command_retention: 0.75 });
  assert.equal(assemblyResult.status, "pass", JSON.stringify(assemblyResult.blockers));
  assert.equal(assemblyResult.selection_checks[0].evidence.command_retention, 1);

  const summaryPdf = 'graph export "$figures/summary/female_director_age_summary.pdf", replace';
  const summary = atomicSelectionFixture(t, pdfLabelId, summaryPdf, ["output PDF path"]);
  const summaryResult = check(summary.root, { min_command_retention: 0.75 });
  assert.equal(summaryResult.status, "pass", JSON.stringify(summaryResult.blockers));
  assert.equal(summaryResult.selection_checks[0].evidence.command_retention, 1);
});

test("m:1 retained merge has a distinct atomic template and blocks cardinality drift", (t) => {
  const forms = [
    'merge m:1 firm_id year using "$data/firm_year.dta", keep(match) gen(merge_state)',
    'merge m:1 firm_id year using "$data/firm_year.dta", ///\n    keep(match) keepusing(industry) gen(merge_state)',
    'merge m:1 year using "$data/year_controls.dta", keep(match) gen(merge_state)',
  ];
  for (const targetCode of forms) {
    const current = atomicSelectionFixture(t, "merge.retain_matched_rows_m1.v1", targetCode,
      ["key variables", "using file", "keepusing variables", "merge indicator policy"]);
    const lineCount = targetCode.split(/\r?\n/).length;
    current.manifest.selections[0].target_spans = [[1, lineCount]];
    current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(targetCode, "utf8"));
    fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
    const result = check(current.root, { min_command_retention: 0.75 });
    assert.equal(result.status, "pass", JSON.stringify(result.blockers));
    assert.ok(result.selection_checks[0].evidence.command_retention >= 0.75);
    assert.equal(result.selection_checks[0].evidence.command_retention, 1);
  }

  const installedCurrent = atomicSelectionFixture(t, "merge.retain_matched_rows_m1.v1", forms[0],
    ["key variables", "using file", "keepusing variables", "merge indicator policy"]);
  const installed = installedCacheForLabel(t, installedCurrent.label);
  const archivePassed = check(installedCurrent.root, {}, { dictionaryPath: installed.dictionaryPath });
  assert.equal(archivePassed.status, "pass", JSON.stringify(archivePassed.blockers));
  assert.equal(archivePassed.selection_checks[0].evidence.live_source.resolution, "plugin_source_archive");

  const wrongCardinality = atomicSelectionFixture(t, "merge.retain_matched_rows.v1", forms[0],
    ["merge cardinality", "key variables", "using file"]);
  const wrongResult = check(wrongCardinality.root, { min_command_retention: 0.75 });
  assert.equal(wrongResult.status, "needs_revision");
  assert.equal(wrongResult.selection_checks[0].evidence.command_retention, 0);
  assert.ok(wrongResult.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"));

  const native = fixture(t, "merge.retain_matched_rows_m1.v1");
  native.manifest.selections = [];
  useAtomicSubsteps(native.root, native.manifest, native.label, [{
    substep_id: "native_retained_m1_merge",
    mode: "general_rule",
    match: { commands: ["merge"], tokens: ["m:1", "keep(match)"] },
    ...nativeTarget(native.root, "native_retained_m1_merge", forms[0]),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "The merge fields are project specific but the retained m:1 transition is not.",
    },
  }]);
  const nativeBlocked = check(native.root);
  assert.equal(nativeBlocked.status, "needs_revision");
  assert.ok(nativeBlocked.blockers.some((row) => row.rule === "general_rule_substep_template_available"
    && row.matched_candidate_ids.includes("merge.retain_matched_rows_m1.v1")));
});

test("six v4-shaped reghdfe specifications select the estimator-only label at full retention", (t) => {
  const specifications = Array.from({ length: 6 }, (_, index) =>
    `reghdfe outcome_${index + 1} treatment control_a control_b if sample_${index + 1}, absorb(firm_id year) vce(cluster firm_id)`);
  for (const code of specifications) {
    const current = atomicSelectionFixture(t, "estimation.reghdfe_fe_clustered.v1", code,
      ["outcome", "treatment", "controls", "sample restriction", "absorbed fixed effects", "cluster level"]);
    const result = check(current.root, { min_command_retention: 0.75 });
    assert.equal(result.status, "pass", JSON.stringify(result.blockers));
    assert.equal(result.selection_checks[0].evidence.command_retention, 1);
  }
});

test("native claims cannot bypass any exact atomic transition", (t) => {
  const cases = [...ATOMIC_TRANSITIONS, [
    "estimation.reghdfe_fe_clustered.v1",
    "reghdfe outcome treatment controls, absorb(firm_id year) vce(cluster firm_id)",
    [],
    "reghdfe",
  ]];
  for (const [labelId, targetCode, , command] of cases) {
    const current = fixture(t, labelId);
    current.manifest.selections = [];
    useAtomicSubsteps(current.root, current.manifest, current.label, [{
      substep_id: `native_${labelId.replace(/[^a-z0-9_]+/gi, "_")}`,
      mode: "general_rule",
      match: { commands: [command], query: command },
      ...nativeTarget(current.root, labelId, targetCode),
      general_rule_justification: {
        kind: "project_specific_formula",
        formula_or_definition: "Claimed project-specific implementation of this atomic transition.",
      },
    }]);
    const result = check(current.root);
    assert.equal(result.status, "needs_revision", labelId);
    assert.ok(result.blockers.some((row) => row.rule === "general_rule_substep_template_available"), `${labelId}: ${JSON.stringify(result.blockers)}`);
  }
});

test("canonical default style formatter passes provenance, structural retention, and one approved helper", (t) => {
  const { root } = fixture(t);
  const result = check(root, { required_headwords: ["final_excel_assembly"] });
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.equal(result.selection_checks[0].evidence.command_retention, 1);
  assert.equal(result.program_policy.definitions.length, 1);
  assert.deepEqual(result.program_policy.approved_exception_labels, ["export.regression_excel.from_ster_default_style.v1"]);
});

test("semantic sheet groups can be placed once in each of two workbooks", (t) => {
  const current = fixture(t);
  current.manifest.output_flow_profile = repeatedWorkbookExcelFlowProfile();
  current.manifest.output_flow_profile.sheet_plan = current.manifest.output_flow_profile.sheet_plan.map((row) => ({
    ...row,
    workbook: `$table/${row.workbook}`,
  }));
  fs.writeFileSync(path.join(current.root, "code", "paths.do"), [
    "global project \"`c(pwd)'\"",
    'global output_root "$project/output"',
    'global table "$output_root/excel"',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(current.root, "code", "invoke.do"), [
    'outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3 y2_s1 y2_s2 y2_s3") ///',
    '    workbook("$table/table_all.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("y3_s1 y3_s2 y3_s3 y4_s1 y4_s2 y4_s3") ///',
    '    workbook("$table/table_all.xlsx") sheet("family_b") adjdec(3) meandec(2)',
    'outreg2_xlsx, estimates("sub_y1_s1 sub_y1_s2 sub_y1_s3 sub_y2_s1 sub_y2_s2 sub_y2_s3") ///',
    '    workbook("$table/table_subsample.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("sub_y3_s1 sub_y3_s2 sub_y3_s3 sub_y4_s1 sub_y4_s2 sub_y4_s3") ///',
    '    workbook("$table/table_subsample.xlsx") sheet("family_b") adjdec(3) meandec(2)',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");

  const result = check(current.root);
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.equal(result.project_policy.output_flow_profile.decision.sheet_groups.length, 2);
  assert.equal(result.project_policy.output_flow_profile.decision.sheet_plan.length, 4);
  assert.equal(result.program_policy.outreg2_helper_multiplicity.call_count, 4);
  assert.equal(result.program_policy.outreg2_helper_multiplicity.distinct_placement_count, 4);
  assert.ok(result.program_policy.outreg2_helper_multiplicity.calls.every((row) => row.workbook?.includes("/output/excel/table_")));
});

test("one multi-outcome semantic group can require two physical workbook placements", (t) => {
  const current = fixture(t);
  current.manifest.output_flow_profile = oneGroupRepeatedWorkbookFlowProfile();
  current.manifest.required_headwords = [{ checkpoint: "final_excel_assembly", mode: "native" }];
  current.manifest.selections = [];
  fs.writeFileSync(current.target, [
    "estimates restore y1_s1",
    'outreg2 using "table_all.xls", excel replace adjr2',
    "estimates restore sub_y1_s1",
    'outreg2 using "table_subsample.xls", excel replace adjr2',
  ].join("\n"), "utf8");
  fs.rmSync(path.join(current.root, "code", "invoke.do"));
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");

  const result = check(current.root);
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.equal(result.project_policy.output_flow_profile.decision.sheet_groups.length, 1);
  assert.equal(result.project_policy.output_flow_profile.decision.sheet_plan.length, 2);
  assert.equal(result.project_policy.output_flow_profile.decision.selection_class, "direct_single_sheet_workbook");
  assert.equal(result.program_policy.definitions.length, 0);
});

test("output-flow profile rejects a duplicate workbook and sheet placement", (t) => {
  const current = fixture(t);
  current.manifest.output_flow_profile = repeatedWorkbookExcelFlowProfile();
  current.manifest.output_flow_profile.sheet_plan[3] = {
    ...current.manifest.output_flow_profile.sheet_plan[3],
    workbook: "table_all.xlsx",
    sheet: "family_a",
  };
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");

  const result = check(current.root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "output_flow_profile_incomplete"
    && row.failures.some((failure) => failure.includes("duplicate physical workbook/sheet placements"))), JSON.stringify(result.blockers));
});

test("output-flow helper calls must include every declared workbook placement", (t) => {
  const current = fixture(t);
  current.manifest.output_flow_profile = repeatedWorkbookExcelFlowProfile();
  fs.writeFileSync(path.join(current.root, "code", "invoke.do"), [
    'outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3 y2_s1 y2_s2 y2_s3") workbook("table_all.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("y3_s1 y3_s2 y3_s3 y4_s1 y4_s2 y4_s3") workbook("table_all.xlsx") sheet("family_b") adjdec(3) meandec(2)',
    'outreg2_xlsx, estimates("sub_y1_s1 sub_y1_s2 sub_y1_s3 sub_y2_s1 sub_y2_s2 sub_y2_s3") workbook("table_subsample.xlsx") sheet("family_a") adjdec(3) meandec(2) replace',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");

  const result = check(current.root);
  assert.equal(result.status, "needs_revision");
  const mismatch = result.blockers.find((row) => row.rule === "output_flow_helper_calls_mismatch");
  assert.ok(mismatch, JSON.stringify(result.blockers));
  assert.deepEqual(mismatch.unmatched_expected_calls, ["table_subsample.xlsx::family_b::sub_y3_s1 sub_y3_s2 sub_y3_s3 sub_y4_s1 sub_y4_s2 sub_y4_s3"]);
  assert.deepEqual(mismatch.unmatched_observed_calls, []);
});

test("multi-sheet canonical formatter rejects non-xlsx workbook targets", (t) => {
  const current = fixture(t);
  current.manifest.output_flow_profile.sheet_plan = current.manifest.output_flow_profile.sheet_plan.map((row) => ({
    ...row,
    workbook: "table.xls",
  }));
  fs.writeFileSync(path.join(current.root, "code", "invoke.do"), [
    'outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3 y2_s1 y2_s2 y2_s3") workbook("table.xls") sheet("family_a") adjdec(3) meandec(2) replace',
    'outreg2_xlsx, estimates("y3_s1 y3_s2 y3_s3 y4_s1 y4_s2 y4_s3") workbook("table.xls") sheet("family_b") adjdec(3) meandec(2)',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");

  const result = check(current.root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "output_flow_profile_incomplete"
    && row.failures.some((failure) => /multi-sheet workbook.*\.xlsx/i.test(failure))), JSON.stringify(result.blockers));
});

test("a second program is rejected even when the canonical helper is selected", (t) => {
  const { root } = fixture(t);
  fs.writeFileSync(path.join(root, "code", "extra.do"), "program define hidden_helper\nend\n", "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "program_definition_limit_exceeded"));
  assert.ok(result.blockers.some((row) => row.rule === "unapproved_program_definition"));
});

test("event-study automatic axes stay automatic in the bound target", (t) => {
  const current = fixture(t, "figure.event_study_flat_loop_automatic.v1");
  current.manifest.event_study_axis_profile = automaticAxisProfile("code/module.do", current.manifest.selections[0].target_spans);
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const passed = check(current.root);
  assert.equal(passed.status, "pass", JSON.stringify(passed.blockers));

  const fixedTarget = current.label.code.replace(
    'xtitle("Year")',
    'yscale(range(-1 1)) ylabel(-1(.5)1) xtitle("Year")',
  );
  fs.writeFileSync(current.target, fixedTarget, "utf8");
  current.manifest.selections[0].target_spans = [[1, fixedTarget.split(/\r?\n/).length]];
  current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(fixedTarget, "utf8"));
  current.manifest.event_study_axis_profile.axis_groups[0].target_spans = current.manifest.selections[0].target_spans;
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const blocked = check(current.root);
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "event_study_automatic_axis_forced"), JSON.stringify(blocked.blockers));
});

test("mixed event-study axes require one explicit flat loop with branch-local axis options and loop-scoped output", (t) => {
  const passing = fixture(t, "figure.event_study_flat_loop_mixed_axis.v1");
  passing.manifest.event_study_axis_profile = mixedAxisProfile("code/module.do", passing.manifest.selections[0].target_spans);
  fs.writeFileSync(path.join(passing.root, "template_reuse_manifest.json"), JSON.stringify(passing.manifest, null, 2), "utf8");
  const passed = check(passing.root);
  assert.equal(passed.status, "pass", JSON.stringify(passed.blockers));

  const cases = [
    {
      rule: "event_study_mixed_automatic_axis_not_cleared",
      mutate: (code) => code.replace('    local axis_options ""\n', ""),
    },
    {
      rule: "event_study_mixed_fixed_membership_condition_missing",
      mutate: (code) => code.replace('if strpos(" `fixed_outcomes\' ", " `outcome\' ")', "if 1"),
    },
    {
      rule: "event_study_mixed_axis_branch_count",
      mutate: (code) => code.replace(
        "    estimates clear\n",
        '    if 1 {\n        display "extra branch"\n    }\n\n    estimates clear\n',
      ),
    },
    {
      rule: "event_study_mixed_fixed_axis_options_missing",
      mutate: (code) => code
        .replace(
          "        local axis_options \"yscale(range(`axis_min' `axis_max') noextend) ylabel(`axis_min'(`axis_step')`axis_max')\"\n",
          "",
        )
        .replace(
          "    }\n\n    estimates clear",
          "    }\n    local axis_options \"yscale(range(`axis_min' `axis_max') noextend) ylabel(`axis_min'(`axis_step')`axis_max')\"\n\n    estimates clear",
        ),
    },
    {
      rule: "event_study_mixed_fixed_membership_condition_missing",
      mutate: (code) => code.replace(
        'if strpos(" `fixed_outcomes\' ", " `outcome\' ") {',
        'if strpos(" `fixed_outcomes\' ", " `outcome\' ") | 1 {',
      ),
    },
    {
      rule: "event_study_mixed_fixed_membership_condition_missing",
      mutate: (code) => code.replace(
        'if strpos(" `fixed_outcomes\' ", " `outcome\' ") {',
        'if strpos("`fixed_outcomes\'", "`outcome\'") {',
      ),
    },
    {
      rule: "event_study_mixed_graph_axis_binding_missing",
      mutate: (code) => code.replace("        `axis_options' ///\n", ""),
    },
    {
      rule: "event_study_mixed_raw_title_missing",
      mutate: (code) => code.replace('title("`outcome\'")', 'title("Event study")'),
    },
    {
      rule: "event_study_mixed_bottom_legend_missing",
      mutate: (code) => code.replace("legend(position(6) rows(1))", "legend(position(3) rows(1))"),
    },
    {
      rule: "event_study_mixed_pdf_export_scope",
      mutate: (code) => code.replace('    graph export "$figures/`outcome\'_event.pdf", replace\n', ""),
    },
    {
      rule: "event_study_mixed_loop_dispatcher_forbidden",
      mutate: (code) => `global plot_jobs "encoded registry"\n${code}`,
    },
  ];
  for (const item of cases) {
    const current = fixture(t, "figure.event_study_flat_loop_mixed_axis.v1");
    const changed = item.mutate(current.label.code);
    fs.writeFileSync(current.target, changed, "utf8");
    const spans = [[1, changed.split(/\r?\n/).length]];
    current.manifest.selections[0].target_spans = spans;
    current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
    current.manifest.event_study_axis_profile = mixedAxisProfile("code/module.do", spans);
    fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
    const blocked = check(current.root);
    assert.equal(blocked.status, "needs_revision");
    assert.ok(blocked.blockers.some((row) => row.rule === item.rule), `${item.rule}: ${JSON.stringify(blocked.blockers)}`);
  }
});

test("axis bindings follow selected local-macro branches without a loop initializer", (t) => {
  const fixed = fixture(t, "figure.event_study_flat_loop_fixed_group.v1");
  const fixedTarget = [
    'local metrics "Yvol Yinvol"',
    'foreach metric of local metrics {',
    '    local axis_opts "yscale(range(-.1 .1)) ylabel(-.1(.05).1)"',
    fixed.label.code
      .replace('local fixed_outcomes "close_outcome_a close_outcome_b"', 'local fixed_outcomes "Yvol Yinvol"')
      .replace('xtitle("Year")', "`axis_opts' xtitle(\"Year\")"),
    '}',
  ].join("\n");
  fs.writeFileSync(fixed.target, fixedTarget, "utf8");
  fixed.manifest.selections[0].target_spans = [[1, fixedTarget.split(/\r?\n/).length]];
  fixed.manifest.selections[0].target_span_sha256 = hash(Buffer.from(fixedTarget, "utf8"));
  fixed.manifest.event_study_axis_profile = {
    expected_plots: [
      { outcome: "Yvol", specification: "TWFE", sample_comparison: "analysis sample" },
      { outcome: "Yinvol", specification: "TWFE", sample_comparison: "analysis sample" },
    ],
    axis_groups: [{
      axis_group_id: "close_pair",
      axis_mode: "fixed_group",
      outcomes: ["Yvol", "Yinvol"],
      specification: "TWFE",
      sample_comparison: "analysis sample",
      coefficient_family: "event-time treatment effects",
      unit: "percentage points",
      transform: "level",
      grouping_reason: "two directly comparable outcomes",
      decision_source: "model_from_metadata",
      grouping_evidence: ["the two outcomes are declared as a close pair"],
      range_basis: "one readable range covers the pair",
      range: { min: -0.1, max: 0.1, step: 0.05 },
      target_path: "code/module.do",
      target_spans: fixed.manifest.selections[0].target_spans,
    }],
  };
  fs.writeFileSync(path.join(fixed.root, "template_reuse_manifest.json"), JSON.stringify(fixed.manifest, null, 2), "utf8");
  const fixedPassed = check(fixed.root);
  assert.equal(fixedPassed.status, "pass", JSON.stringify(fixedPassed.blockers));

  const automatic = fixture(t, "figure.event_study_flat_loop_automatic.v1");
  const automaticTarget = [
    'local metrics "Y"',
    'foreach metric of local metrics {',
    '    local axis_opts "yscale(range(-.2 .2)) ylabel(-.2(.1).2)"',
    '    local axis_opts',
    automatic.label.code.replace('xtitle("Year")', "`axis_opts' xtitle(\"Year\")"),
    '}',
  ].join("\n");
  fs.writeFileSync(automatic.target, automaticTarget, "utf8");
  automatic.manifest.selections[0].target_spans = [[1, automaticTarget.split(/\r?\n/).length]];
  automatic.manifest.selections[0].target_span_sha256 = hash(Buffer.from(automaticTarget, "utf8"));
  automatic.manifest.event_study_axis_profile = automaticAxisProfile("code/module.do", automatic.manifest.selections[0].target_spans);
  fs.writeFileSync(path.join(automatic.root, "template_reuse_manifest.json"), JSON.stringify(automatic.manifest, null, 2), "utf8");
  const automaticPassed = check(automatic.root);
  assert.equal(automaticPassed.status, "pass", JSON.stringify(automaticPassed.blockers));

  const forcedTarget = automaticTarget.replace('    local axis_opts\n', '    local axis_opts "yscale(range(-.2 .2)) ylabel(-.2(.1).2)"\n');
  fs.writeFileSync(automatic.target, forcedTarget, "utf8");
  automatic.manifest.selections[0].target_span_sha256 = hash(Buffer.from(forcedTarget, "utf8"));
  fs.writeFileSync(path.join(automatic.root, "template_reuse_manifest.json"), JSON.stringify(automatic.manifest, null, 2), "utf8");
  const automaticBlocked = check(automatic.root);
  assert.equal(automaticBlocked.status, "needs_revision");
  assert.ok(automaticBlocked.blockers.some((row) => row.rule === "event_study_automatic_axis_forced"), JSON.stringify(automaticBlocked.blockers));
});

test("close-related event-study outcomes share the declared fixed range and ticks", (t) => {
  const current = fixture(t, "figure.event_study_flat_loop_fixed_group.v1");
  const fixedTarget = current.label.code
    .replace('local fixed_outcomes "close_outcome_a close_outcome_b"', 'local fixed_outcomes "Yvol Yinvol"');
  fs.writeFileSync(current.target, fixedTarget, "utf8");
  current.manifest.selections[0].target_spans = [[1, fixedTarget.split(/\r?\n/).length]];
  current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(fixedTarget, "utf8"));
  current.manifest.selections[0].edited_fields = current.label.minimal_edit_fields;
  current.manifest.event_study_axis_profile = {
    expected_plots: [
      { outcome: "Yvol", specification: "TWFE", sample_comparison: "analysis sample" },
      { outcome: "Yinvol", specification: "TWFE", sample_comparison: "analysis sample" },
    ],
    axis_groups: [{
      axis_group_id: "unemployment_pair",
      axis_mode: "fixed_group",
      outcomes: ["Yvol", "Yinvol"],
      specification: "TWFE",
      sample_comparison: "analysis sample",
      coefficient_family: "event-time treatment effects",
      unit: "percentage points",
      transform: "level",
      grouping_reason: "direct decomposition into voluntary and involuntary unemployment",
      decision_source: "model_from_metadata",
      grouping_evidence: ["the outcome definitions are two margins of the same unemployment concept"],
      range_basis: "one range covers both series and their confidence intervals",
      range: { min: -0.1, max: 0.1, step: 0.05 },
      target_path: "code/module.do",
      target_spans: current.manifest.selections[0].target_spans,
    }],
  };
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const passed = check(current.root);
  assert.equal(passed.status, "pass", JSON.stringify(passed.blockers));

  const mismatched = fixedTarget.replace("local axis_max   0.10", "local axis_max   0.20");
  fs.writeFileSync(current.target, mismatched, "utf8");
  current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(mismatched, "utf8"));
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const blocked = check(current.root);
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "event_study_fixed_axis_mismatch"), JSON.stringify(blocked.blockers));
});

test("a corpus label locks package ID and repository DOI", (t) => {
  const { root, manifest } = fixture(t, "postest.save_active_result_ster.v1");
  assert.equal(check(root).status, "pass");
  manifest.selections[0].repository_doi = "10.0000/not-the-source";
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const blocked = check(root);
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "repository_doi_mismatch"));
});

test("drop labels and edit fields outside minimal_edit_fields fail closed", (t) => {
  const { root, manifest } = fixture(t, "setup.paths.username_dropbox_root.v1");
  manifest.selections[0].edited_fields = ["invented adapter"];
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "drop_label_selected"));
  assert.ok(result.blockers.some((row) => row.rule === "undeclared_edit_field"));
});

test("legacy native allowance does not waive the hard final-Excel output contract", (t) => {
  const { root, manifest, target } = fixture(t);
  manifest.required_headwords = [{ checkpoint: "final_excel_assembly", mode: "native", reason: "source-independent code" }];
  manifest.selections = [];
  delete manifest.output_flow_profile;
  fs.writeFileSync(target, "export excel using table.xlsx, replace\n", "utf8");
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  assert.equal(check(root).status, "needs_revision");
  const allowed = check(root, { allow_native_headwords: ["final_excel_assembly"] });
  assert.equal(allowed.status, "needs_revision");
  assert.ok(allowed.blockers.some((row) => row.rule === "output_flow_profile_incomplete"));
});

test("advisory native final Excel still requires the fixed output-flow contract", (t) => {
  const { root, label, manifest } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  manifest.selections = [];
  delete manifest.output_flow_profile;
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "direct_excel",
    mode: "general_rule",
    match: { commands: ["outreg2"], tokens: ["Excel"] },
    ...nativeTarget(root, "direct_excel", "outreg2 using table.xlsx, replace"),
    general_rule_justification: { kind: "template_mismatch", nearest_template_hint: "export.regression_excel.from_ster_default_style.v1", template_status: "wrong_selection", hint_used: "outreg2 output idiom" },
  }]);
  const result = check(root, { enforce_template_reuse: false });
  assert.equal(result.template_reuse_enforcement, "advisory");
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "output_flow_profile_incomplete"));
});

test("complete output flow cannot replace the canonical final-Excel formatter selection", (t) => {
  const { root, label, manifest } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  manifest.selections = [];
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "direct_excel_with_profile",
    mode: "general_rule",
    match: { commands: ["outreg2"], tokens: ["Excel"] },
    ...nativeTarget(root, "direct_excel_with_profile", "outreg2 using table.xlsx, replace"),
    general_rule_justification: { kind: "template_mismatch", nearest_template_hint: "export.regression_excel.from_ster_default_style.v1", template_status: "wrong_selection", hint_used: "none" },
  }]);
  const result = check(root, { enforce_template_reuse: false });
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "final_excel_canonical_template_missing"));
});

test("a declared one-sheet workbook requires direct outreg2 and rejects the formatter program", (t) => {
  const { root, manifest, target } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  manifest.required_headwords = [{ checkpoint: "final_excel_assembly", mode: "native" }];
  manifest.selections = [];
  manifest.output_flow_profile = singleSheetExcelFlowProfile();
  fs.rmSync(path.join(root, "code", "invoke.do"));
  fs.writeFileSync(target, [
    "regress y x, vce(robust)",
    "summarize y if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const direct = check(root);
  assert.equal(direct.status, "pass", JSON.stringify(direct.blockers));
  assert.equal(direct.project_policy.output_flow_profile.decision.selection_class, "direct_single_sheet_workbook");

  fs.writeFileSync(target, [
    "regress y x, vce(robust)",
    "summarize y if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\') keep(x)',
  ].join("\n"), "utf8");
  const invalidDirect = check(root);
  assert.equal(invalidDirect.status, "needs_revision");
  assert.ok(invalidDirect.blockers.some((row) => row.rule === "direct_single_sheet_excel_contract_blocked"));

  fs.writeFileSync(target, [
    "regress y x, vce(robust)",
    "summarize y if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xlsx", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n"), "utf8");
  const wrongDirectExtension = check(root);
  assert.equal(wrongDirectExtension.status, "needs_revision");
  assert.ok(wrongDirectExtension.blockers.some((row) => row.rule === "direct_single_sheet_excel_contract_blocked"
    && row.findings.some((finding) => finding.rule === "direct_outreg2_requires_xls")));

  fs.writeFileSync(target, [
    "regress y x, vce(robust)",
    'export excel using "table.xlsx", sheet("Regression") replace',
  ].join("\n"), "utf8");
  const missingOutreg2 = check(root);
  assert.equal(missingOutreg2.status, "needs_revision");
  assert.ok(missingOutreg2.blockers.some((row) => row.rule === "direct_single_sheet_outreg2_missing"));

  fs.writeFileSync(target, [
    "regress y x, vce(robust)",
    "summarize y if e(sample), meanonly",
    "local dep_mean = r(mean)",
    'outreg2 using "table.xls", excel replace adjr2 addstat(Dep. variable mean, `dep_mean\')',
  ].join("\n"), "utf8");

  manifest.required_headwords = [{ checkpoint: "final_excel_assembly", mode: "template" }];
  manifest.selections = fixture(t, "export.regression_excel.from_ster_default_style.v1").manifest.selections;
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const blocked = check(root);
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "unnecessary_outreg2_formatter_for_single_sheet"));
});

test("advisory native event study cannot omit the 4-way axis profile", (t) => {
  const { root, label, manifest } = fixture(t, "figure.event_study_single_automatic.v1");
  manifest.selections = [];
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "direct_event_figure",
    mode: "general_rule",
    match: { commands: ["coefplot"], tokens: ["event study"] },
    ...nativeTarget(root, "direct_event_figure", "coefplot model\ngraph export event.pdf, replace"),
    general_rule_justification: { kind: "template_mismatch", nearest_template_hint: "figure.event_study_single_automatic.v1", template_status: "wrong_selection", hint_used: "coefplot and PDF export idioms" },
  }]);
  const result = check(root, { enforce_template_reuse: false });
  assert.equal(result.template_reuse_enforcement, "advisory");
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "event_study_axis_profile_incomplete"));
});

test("fallback nearest-template hints must exist and match the ranked candidate", (t) => {
  const unknown = fixture(t, "figure.event_study_single_automatic.v1");
  unknown.manifest.selections = [];
  useAtomicSubsteps(unknown.root, unknown.manifest, unknown.label, [{
    substep_id: "unknown_hint",
    mode: "general_rule",
    match: { commands: ["coefplot"], tokens: ["event study"] },
    ...nativeTarget(unknown.root, "unknown_hint", "coefplot model\ngraph export event.pdf, replace"),
    general_rule_justification: { kind: "template_mismatch", nearest_template_hint: "not.a.real.label", template_status: "wrong_selection", hint_used: "none" },
  }]);
  const unknownResult = check(unknown.root, { enforce_template_reuse: false });
  assert.ok(unknownResult.blockers.some((row) => row.rule === "template_mismatch_nearest_template_hint_unknown"));

  const nonNearest = fixture(t, "figure.event_study_single_automatic.v1");
  nonNearest.manifest.selections = [];
  useAtomicSubsteps(nonNearest.root, nonNearest.manifest, nonNearest.label, [{
    substep_id: "non_nearest_hint",
    mode: "general_rule",
    match: { commands: ["coefplot"], tokens: ["event study"] },
    ...nativeTarget(nonNearest.root, "non_nearest_hint", "coefplot model\ngraph export event.pdf, replace"),
    general_rule_justification: { kind: "template_mismatch", nearest_template_hint: "figure.event_study_flat_loop_fixed_group.v1", template_status: "wrong_selection", hint_used: "none" },
  }]);
  const nonNearestResult = check(nonNearest.root, { enforce_template_reuse: false });
  assert.ok(nonNearestResult.blockers.some((row) => row.rule === "template_mismatch_nearest_template_hint_not_ranked_first"));
});

test("schema 2.0 composes one template and one justified native substep under a broad stage", (t) => {
  const { root, label, manifest } = fixture(t, "estimation.twfe_did_no_controls.v1");
  useAtomicSubsteps(root, manifest, label, [
    {
      substep_id: "twfe_no_controls",
      mode: "template",
      match: { label_ids: [label.label_id], commands: ["reghdfe"] },
    },
    {
      substep_id: "twfe_firm_specific_trends",
      mode: "general_rule",
      match: { commands: ["reghdfe"], tokens: ["firm-specific trends"] },
      ...nativeTarget(root, "twfe_firm_specific_trends", "reghdfe y event_terms, absorb(year firm_id##c.linear_time) vce(cluster firm_id)"),
      general_rule_justification: {
        kind: "dictionary_gap",
        search_evidence: {
          query: "reghdfe firm-specific trends",
          searched_checkpoints: [label.checkpoint],
          result_label_ids: [],
        },
      },
    },
  ]);
  const result = check(root);
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.equal(result.substep_checks.length, 2);
  assert.ok(result.substep_checks[0].matched_candidate_ids.includes(label.label_id));
  assert.ok(result.substep_checks[0].matched_candidate_ids.includes("estimation.twfe_did_both_control_sets.v1"));
  assert.deepEqual(result.substep_checks[1].matched_candidate_ids, []);
});

test("schema 2.0 blocks native bypass when an auto-selectable matching LEGO exists", (t) => {
  const { root, label, manifest } = fixture(t, "descriptives.summarize_esample_mean.v1");
  manifest.selections = [];
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "dependent_variable_mean_on_esample",
    mode: "general_rule",
    match: { commands: ["estadd"], tokens: ["e(ymean)"] },
    ...nativeTarget(root, "dependent_variable_mean_on_esample", label.code),
    general_rule_justification: {
      kind: "dictionary_gap",
      search_evidence: {
        query: "dependent-variable mean on e(sample)",
        searched_checkpoints: [label.checkpoint],
        result_label_ids: [label.label_id],
      },
    },
  }]);
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  const blocked = result.blockers.find((row) => row.rule === "general_rule_substep_template_available");
  assert.ok(blocked.matched_candidate_ids.includes(label.label_id));
  assert.ok(result.substep_checks[0].matched_candidate_ids.includes(label.label_id));
});

test("schema 2.0 derives native search evidence from the target and blocks self-declared nonmatching terms", (t) => {
  const { root, label, manifest } = fixture(t, "descriptives.summarize_esample_mean.v1");
  manifest.selections = [];
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "disguised_esample_mean",
    mode: "general_rule",
    match: { commands: ["rename"], tokens: ["zebra bypass"], query: "rename zebra bypass" },
    ...nativeTarget(root, "disguised_esample_mean", label.code),
    general_rule_justification: {
      kind: "dictionary_gap",
      search_evidence: {
        query: "rename zebra bypass",
        searched_checkpoints: [label.checkpoint],
        result_label_ids: [],
      },
    },
  }]);
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "general_rule_target_declared_commands_missing"));
  assert.ok(result.blockers.some((row) => row.rule === "general_rule_target_declared_tokens_missing"));
  assert.ok(result.blockers.some((row) => row.rule === "general_rule_substep_template_available" && row.matched_candidate_ids.includes(label.label_id)));
  assert.ok(result.substep_checks[0].general_rule_target_evidence.observed_commands.includes("estadd"));
  assert.ok(result.substep_checks[0].general_rule_target_evidence.observed_candidate_ids.includes(label.label_id));
});

test("schema 2.0 structural fingerprint catches one consistently renamed identifier behind a distractor", (t) => {
  const { label, result } = standardizationNativeClaim(t, (code) => code
    .replace(/\bcomponent_index\b/g, "standardized_index"));
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "general_rule_substep_template_available" && row.matched_candidate_ids.includes(label.label_id)));
  assert.ok(!result.substep_checks[0].general_rule_target_evidence.exact_source_block_candidate_ids.includes(label.label_id));
  assert.ok(result.substep_checks[0].general_rule_target_evidence.structural_source_block_candidate_ids.includes(label.label_id));
});

test("schema 2.0 structural fingerprint catches multiple consistent identifier substitutions", (t) => {
  const { label, result } = standardizationNativeClaim(t, (code) => code
    .replace(/\bcomponent_rowmiss\b/g, "analysis_rowmiss")
    .replace(/\bcomponent_index\b/g, "standardized_index"));
  assert.equal(result.status, "needs_revision");
  const match = result.substep_checks[0].general_rule_target_evidence.structural_source_block_matches.find((row) => row.label_id === label.label_id);
  assert.ok(match);
  assert.equal(match.source_command_count, commandSequence(label.code).length);
  assert.ok(match.fingerprint_sha256);
});

test("schema 2.0 structural fingerprint leaves a genuinely different project formula native", (t) => {
  const { label, result } = standardizationNativeClaim(t, () => [
    "generate burden_index = annual_cost / household_income",
    "replace burden_index = . if household_income <= 0",
    'label var burden_index "Annual housing-cost burden"',
    "drop temporary_cost_component",
  ].join("\n"));
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.ok(!result.substep_checks[0].general_rule_target_evidence.exact_source_block_candidate_ids.includes(label.label_id));
  assert.ok(!result.substep_checks[0].general_rule_target_evidence.structural_source_block_candidate_ids.includes(label.label_id));
});

test("schema 2.0 structural fingerprint preserves numeric and string research constants", (t) => {
  for (const transform of [
    (code) => code.replace(/\bcomponent_index\b/g, "standardized_index").replace("== 0", "== 1"),
    (code) => code.replace(/\bcomponent_index\b/g, "standardized_index").replace('"component_a component_b component_c"', '"math_score reading_score science_score"'),
  ]) {
    const { label, result } = standardizationNativeClaim(t, transform);
    assert.equal(result.status, "pass", JSON.stringify(result.blockers));
    assert.ok(!result.substep_checks[0].general_rule_target_evidence.exact_source_block_candidate_ids.includes(label.label_id));
    assert.ok(!result.substep_checks[0].general_rule_target_evidence.structural_source_block_candidate_ids.includes(label.label_id));
  }
});

test("schema 2.0 rejects one selection assigned to multiple template substeps", (t) => {
  const { root, label, manifest } = fixture(t, "estimation.twfe_did_no_controls.v1");
  useAtomicSubsteps(root, manifest, label, [
    { substep_id: "first_twfe", mode: "template", match: { label_ids: [label.label_id] } },
    { substep_id: "second_twfe", mode: "template", match: { label_ids: [label.label_id] } },
  ]);
  delete manifest.selections[0].substep_id;
  manifest.selections[0].substep_ids = ["first_twfe", "second_twfe"];
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "selection_multiple_substeps_not_allowed"));
  assert.ok(result.blockers.filter((row) => row.rule === "required_template_substep_missing").length === 2);
});

test("schema 2.0 permits prompt-directed manual paths but blocks merge-policy and collapse LEGOs", (t) => {
  const manualPath = fixture(t, "setup.paths.manual_root_derived_folders.v1");
  manualPath.manifest.selections = [];
  useAtomicSubsteps(manualPath.root, manualPath.manifest, manualPath.label, [{
    substep_id: `native_bypass_${manualPath.label.variant_id}`,
    mode: "general_rule",
    match: { label_ids: [manualPath.label.label_id], commands: [manualPath.label.command_anchors[0]] },
    ...nativeTarget(manualPath.root, `native_bypass_${manualPath.label.variant_id}`, manualPath.label.code),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "The project explicitly directs its manual path interface.",
    },
  }]);
  const manualPathResult = check(manualPath.root);
  assert.equal(manualPath.label.quality_rubric_review.classification, "reference_only");
  assert.equal(manualPathResult.status, "pass", JSON.stringify(manualPathResult.blockers));
  assert.ok(!manualPathResult.blockers.some((row) => row.rule === "general_rule_substep_template_available"));

  const cases = [
    "merge.m1_complete_match_assert.v1",
    "descriptives.collapse_entity_means_max.v1",
  ];
  for (const labelId of cases) {
    const { root, label, manifest } = fixture(t, labelId);
    manifest.selections = [];
    useAtomicSubsteps(root, manifest, label, [{
      substep_id: `native_bypass_${label.variant_id}`,
      mode: "general_rule",
      match: { label_ids: [label.label_id], commands: [label.command_anchors[0]] },
      ...nativeTarget(root, `native_bypass_${label.variant_id}`, label.code),
      general_rule_justification: {
        kind: "project_specific_formula",
        formula_or_definition: "A claimed project-specific definition cannot override an existing exact reusable block.",
      },
    }]);
    const result = check(root);
    assert.equal(result.status, "needs_revision", label.label_id);
    const blocker = result.blockers.find((row) => row.rule === "general_rule_substep_template_available");
    assert.ok(blocker?.matched_candidate_ids.includes(label.label_id), label.label_id);
  }
});

test("schema 2.0 accepts a project-specific formula only as an atomic unmatched substep", (t) => {
  const { root, label, manifest } = fixture(t, "input.wto_trade_minimal_harmonization.v1");
  manifest.selections = [];
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "cpi_label_to_year_mapping",
    mode: "general_rule",
    match: { commands: ["import excel"], tokens: ["CPI label-to-year mapping"] },
    ...nativeTarget(root, "cpi_label_to_year_mapping", "import excel using cpi.xlsx, firstrow clear\nrename cpi_value cpi\ngenerate year = real(substr(period_label, 1, 4))"),
    general_rule_justification: {
      kind: "project_specific_formula",
      formula_or_definition: "Map the supplied CPI workbook column labels to the contract-defined calendar year before deflation.",
    },
  }]);
  assert.equal(check(root).status, "pass");
});

test("schema 2.0 reads legacy native manifest vocabulary and normalizes it to general_rule", (t) => {
  const { root, label, manifest } = fixture(t, "input.wto_trade_minimal_harmonization.v1");
  manifest.selections = [];
  const target = nativeTarget(root, "legacy_cpi_mapping", "import excel using cpi.xlsx, firstrow clear\nrename cpi_value cpi\ngenerate year = real(substr(period_label, 1, 4))");
  manifest.schema_version = "2.0";
  manifest.required_headwords = [{
    checkpoint: label.checkpoint,
    mode: "mixed",
    substeps: [{
      substep_id: "legacy_cpi_mapping",
      mode: "native_substep",
      match: { commands: ["import excel"], tokens: ["CPI label-to-year mapping"] },
      ...target,
      native_justification: {
        kind: "project_specific_formula",
        formula_or_definition: "Map the supplied CPI workbook column labels to the contract-defined calendar year before deflation.",
      },
    }],
  }];
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.equal(result.status, "pass");
  assert.equal(result.substep_checks[0].mode, "general_rule");
  assert.ok(result.warnings.some((row) => row.rule === "legacy_native_substep_mode"));
  assert.ok(result.warnings.some((row) => row.rule === "legacy_native_justification_field"));
});

test("schema 2.0 requires the raw source-file hash while schema 1.0 only warns", (t) => {
  const modern = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(modern.root, modern.manifest, modern.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [modern.label.label_id] },
  }]);
  delete modern.manifest.selections[0].source_file_sha256;
  fs.writeFileSync(path.join(modern.root, "template_reuse_manifest.json"), JSON.stringify(modern.manifest, null, 2), "utf8");
  const blocked = check(modern.root);
  assert.equal(blocked.status, "needs_revision");
  assert.ok(blocked.blockers.some((row) => row.rule === "source_file_hash_missing"));

  const legacy = fixture(t, "postest.save_active_result_ster.v1");
  const legacyResult = check(legacy.root);
  assert.equal(legacyResult.status, "pass");
  assert.ok(legacyResult.warnings.some((row) => row.rule === "legacy_source_file_hash_missing"));
});

test("schema 2.0 resolves canonical snapshots from the approved workspace or installed archive", (t) => {
  for (const labelId of [
    "setup.paths.default_style_roles.v1",
    "export.regression_excel.from_ster_default_style.v1",
  ]) {
    const current = fixture(t, labelId);
    useAtomicSubsteps(current.root, current.manifest, current.label, [{
      substep_id: `snapshot_${labelId.replace(/[^a-z0-9]+/gi, "_")}`,
      mode: "template",
      match: { label_ids: [labelId] },
    }]);
    const result = check(current.root);
    assert.equal(result.status, "pass", `${labelId}: ${JSON.stringify(result.blockers)}`);
    const liveSource = result.selection_checks[0].evidence.live_source;
    const workspaceOriginal = path.resolve(ROOT, "..", "..", ...current.label.source_path.split("/"));
    if (fs.existsSync(workspaceOriginal)) {
      assert.equal(liveSource.path, fs.realpathSync(workspaceOriginal));
      assert.equal(liveSource.resolution, "approved_original");
    } else {
      const archiveIndex = JSON.parse(fs.readFileSync(SOURCE_ARCHIVE_INDEX, "utf8"));
      const archiveEntry = archiveIndex.sources[current.label.source_path];
      assert.ok(archiveEntry, current.label.source_path);
      const archivePath = path.resolve(ROOT, ...archiveEntry.archive_path.split("/"));
      assert.equal(liveSource.path, fs.realpathSync(archivePath));
      assert.equal(liveSource.resolution, "plugin_source_archive");
      assert.equal(archiveEntry.sha256, current.label.source_file_sha256);
      assert.equal(hash(fs.readFileSync(archivePath)), current.label.source_file_sha256);
    }
  }
});

test("schema 2.0 live source resolution still rejects provenance path traversal", (t) => {
  const current = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [current.label.label_id] },
  }]);
  const traversingLabel = { ...current.label, source_path: "../outside.do" };
  current.manifest.selections[0].source.path = traversingLabel.source_path;
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const result = check(current.root, {}, { labels: LABELS.map((row) => row.label_id === traversingLabel.label_id ? traversingLabel : row) });
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "live_source_read_or_decode_error" && /approved provenance root/.test(row.message)));
});

test("schema 2.0 resolves a real corpus label from a self-contained installed plugin archive", (t) => {
  const current = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [current.label.label_id] },
  }]);
  const installed = installedCacheForLabel(t, current.label);
  const result = check(current.root, {}, { dictionaryPath: installed.dictionaryPath });
  assert.equal(result.status, "pass", JSON.stringify(result.blockers));
  assert.equal(result.selection_checks[0].evidence.live_source.resolution, "plugin_source_archive");
  assert.equal(result.selection_checks[0].evidence.live_source.path, fs.realpathSync(installed.archiveTarget));
});

test("schema 2.0 installed archive rejects tampered bytes, index metadata, and traversal", (t) => {
  for (const mutate of [
    (installed) => fs.appendFileSync(installed.archiveTarget, Buffer.from("tamper", "utf8")),
    (installed) => {
      installed.index.sources[Object.keys(installed.index.sources)[0]].bytes += 1;
      fs.writeFileSync(installed.indexPath, JSON.stringify(installed.index, null, 2), "utf8");
    },
    (installed) => {
      installed.index.sources[Object.keys(installed.index.sources)[0]].archive_path = "../outside.source";
      fs.writeFileSync(installed.indexPath, JSON.stringify(installed.index, null, 2), "utf8");
    },
  ]) {
    const current = fixture(t, "postest.save_active_result_ster.v1");
    useAtomicSubsteps(current.root, current.manifest, current.label, [{
      substep_id: "save_ster",
      mode: "template",
      match: { label_ids: [current.label.label_id] },
    }]);
    const installed = installedCacheForLabel(t, current.label);
    mutate(installed);
    const result = check(current.root, {}, { dictionaryPath: installed.dictionaryPath });
    assert.equal(result.status, "needs_revision");
    assert.ok(result.blockers.some((row) => row.rule === "live_source_read_or_decode_error" && /source archive/.test(row.message)));
  }
});

test("schema 2.0 lints every project do-file, including unselected nested-loop and TeX code", (t) => {
  const { root, label, manifest } = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [label.label_id] },
  }]);
  fs.writeFileSync(path.join(root, "code", "unselected.do"), [
    "foreach sample in all kospi {",
    "foreach outcome in y1 y2 {",
    "forvalues specification = 1/2 {",
    "summarize `outcome'",
    "}",
    "}",
    "}",
    "esttab using hidden.tex, replace",
  ].join("\n"), "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "project_nested_loop" && row.file === "code/unselected.do"));
  assert.ok(result.blockers.some((row) => row.rule === "project_tex_output" && row.file === "code/unselected.do"));
});

test("invalid UTF-8 JSON and malformed selection rows return structured blockers", (t) => {
  const invalid = fixture(t, "postest.save_active_result_ster.v1");
  fs.writeFileSync(path.join(invalid.root, "template_reuse_manifest.json"), Buffer.from([0xff, 0xfe, 0x7b]));
  const invalidResult = check(invalid.root);
  assert.equal(invalidResult.status, "needs_revision");
  assert.ok(invalidResult.blockers.some((row) => row.rule === "manifest_invalid_utf8_or_json"));

  const malformed = fixture(t, "postest.save_active_result_ster.v1");
  malformed.manifest.schema_version = "2.0";
  malformed.manifest.required_headwords = [{ checkpoint: malformed.label.checkpoint, substeps: [{ substep_id: "save_ster", mode: "template", match: { label_ids: [malformed.label.label_id] } }] }];
  malformed.manifest.selections = [null];
  fs.writeFileSync(path.join(malformed.root, "template_reuse_manifest.json"), JSON.stringify(malformed.manifest), "utf8");
  const malformedResult = check(malformed.root);
  assert.equal(malformedResult.status, "needs_revision");
  assert.ok(malformedResult.blockers.some((row) => row.rule === "selection_schema_invalid"));
});

test("schema 2.0 rejects unknown and duplicate manifest checkpoints and enforces caller coverage", (t) => {
  const unknown = fixture(t, "postest.save_active_result_ster.v1");
  unknown.manifest.schema_version = "2.0";
  unknown.manifest.selections = [];
  unknown.manifest.required_headwords = [{
    checkpoint: "totally.fake.headword",
    mode: "mixed",
    substeps: [{
      substep_id: "fake_native",
      mode: "general_rule",
      match: { commands: ["display"], tokens: ["zebra"] },
      ...nativeTarget(unknown.root, "fake_native", 'display "zebra"'),
      general_rule_justification: { kind: "project_specific_formula", formula_or_definition: "Print the declared project marker." },
    }],
  }];
  fs.writeFileSync(path.join(unknown.root, "template_reuse_manifest.json"), JSON.stringify(unknown.manifest, null, 2), "utf8");
  assert.ok(check(unknown.root).blockers.some((row) => row.rule === "unknown_manifest_checkpoint" && row.checkpoint === "totally.fake.headword"));

  const duplicate = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(duplicate.root, duplicate.manifest, duplicate.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [duplicate.label.label_id] },
  }]);
  duplicate.manifest.required_headwords.push(JSON.parse(JSON.stringify(duplicate.manifest.required_headwords[0])));
  fs.writeFileSync(path.join(duplicate.root, "template_reuse_manifest.json"), JSON.stringify(duplicate.manifest, null, 2), "utf8");
  assert.ok(check(duplicate.root).blockers.some((row) => row.rule === "duplicate_manifest_checkpoint"));

  const uncovered = fixture(t, "postest.save_active_result_ster.v1");
  useAtomicSubsteps(uncovered.root, uncovered.manifest, uncovered.label, [{
    substep_id: "save_ster",
    mode: "template",
    match: { label_ids: [uncovered.label.label_id] },
  }]);
  const uncoveredResult = check(uncovered.root, { required_headwords: [uncovered.label.checkpoint, "project_setup.paths"] });
  assert.ok(uncoveredResult.blockers.some((row) => row.rule === "caller_required_headword_missing_from_manifest" && row.checkpoint === "project_setup.paths"));
  assert.equal(uncoveredResult.headword_contract.rule, "validate_all_manifest_checkpoints_and_cover_caller_required_headwords");
});

test("canonical helper body rejects inserted estimation even when target hash is current", (t) => {
  const { root, label, manifest, target } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [label.label_id], commands: ["outreg2"] },
  }]);
  const changed = label.code.replace("\nend\n", "\nregress hidden_y hidden_x\nend\n");
  fs.writeFileSync(target, changed, "utf8");
  manifest.selections[0].target_spans = [[1, changed.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "canonical_program_body_forbidden_command" && row.findings.some((finding) => finding.rule === "estimation")));
});

test("canonical helper blocks lossy outreg2 statistic passthrough and missing stored-mean assembly", (t) => {
  const lossy = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(lossy.root, lossy.manifest, lossy.label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [lossy.label.label_id], commands: ["outreg2"] },
  }]);
  const lossyCode = lossy.label.code.replaceAll("nor2", "adjr2 addstat(Dep. variable mean, e(ymean))");
  fs.writeFileSync(lossy.target, lossyCode, "utf8");
  lossy.manifest.selections[0].target_spans = [[1, lossyCode.split(/\r?\n/).length]];
  lossy.manifest.selections[0].target_span_sha256 = hash(Buffer.from(lossyCode, "utf8"));
  fs.writeFileSync(path.join(lossy.root, "template_reuse_manifest.json"), JSON.stringify(lossy.manifest, null, 2), "utf8");
  const lossyResult = check(lossy.root);
  assert.ok(lossyResult.blockers.some((row) => row.rule === "canonical_outreg2_statistics_contract" && row.findings.some((finding) => finding.rule === "statistics_routed_through_outreg2")));

  const missing = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(missing.root, missing.manifest, missing.label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [missing.label.label_id], commands: ["outreg2"] },
  }]);
  const missingCode = missing.label.code.replaceAll("strofreal(e(ymean)", "strofreal(e(N)");
  fs.writeFileSync(missing.target, missingCode, "utf8");
  missing.manifest.selections[0].target_spans = [[1, missingCode.split(/\r?\n/).length]];
  missing.manifest.selections[0].target_span_sha256 = hash(Buffer.from(missingCode, "utf8"));
  fs.writeFileSync(path.join(missing.root, "template_reuse_manifest.json"), JSON.stringify(missing.manifest, null, 2), "utf8");
  const missingResult = check(missing.root);
  assert.ok(missingResult.blockers.some((row) => row.rule === "canonical_outreg2_statistics_contract" && row.findings.some((finding) => finding.rule === "statistics_contract_missing" && finding.contract === "dependent_mean_declared_precision")));
});

test("canonical helper accepts only the two exact outreg2 standard-error notes", (t) => {
  const current = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(current.root, current.manifest, current.label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [current.label.label_id], commands: ["outreg2"] },
  }]);
  const changed = current.label.code.replace(
    '"Robust standard errors in parentheses"',
    '"Arbitrary standard-error note"',
  );
  fs.writeFileSync(current.target, changed, "utf8");
  current.manifest.selections[0].target_spans = [[1, changed.split(/\r?\n/).length]];
  current.manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
  fs.writeFileSync(path.join(current.root, "template_reuse_manifest.json"), JSON.stringify(current.manifest, null, 2), "utf8");
  const result = check(current.root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "canonical_outreg2_statistics_contract"
    && row.findings.some((finding) => finding.rule === "statistics_contract_missing"
      && finding.contract === "exact_standard_error_note_variants")));
});

test("prefix-colon commands are normalized for project lint and canonical helper inspection", (t) => {
  const { root, label, manifest, target } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [label.label_id], commands: ["outreg2"] },
  }]);
  const changed = label.code.replace("\nend\n", "\nquietly: regress hidden_y hidden_x\nend\n");
  fs.writeFileSync(target, changed, "utf8");
  manifest.selections[0].target_spans = [[1, changed.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.ok(result.blockers.some((row) => row.rule === "project_do_lint_blocked" && row.findings.some((finding) => finding.rule === "opaque_program")));
  assert.ok(result.blockers.some((row) => row.rule === "canonical_program_body_forbidden_command" && row.findings.some((finding) => finding.rule === "estimation")));
  assert.ok(result.project_policy.files.some((row) => row.file === "code/module.do" && row.prefix_colon_normalized));
});

test("macro-expanded outreg2 TeX output is blocked in the full project and canonical helper body", (t) => {
  const { root, label, manifest, target } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [label.label_id], commands: ["outreg2"] },
  }]);
  const macroTex = 'local fmt tex\noutreg2 using "hidden.`fmt\'", `fmt\' replace';
  const changed = label.code.replace("\nend\n", `\n${macroTex}\nend\n`);
  fs.writeFileSync(target, changed, "utf8");
  manifest.selections[0].target_spans = [[1, changed.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.ok(result.blockers.some((row) => row.rule === "project_tex_output" && row.file === "code/module.do"));
  assert.ok(result.blockers.some((row) => row.rule === "canonical_program_body_forbidden_command" && row.findings.some((finding) => finding.rule === "tex_output")));
});

test("cross-file literal global TeX format is propagated from the runner to the called output file", (t) => {
  const { result } = crossFileGlobalOutput(t, "global fmt tex", 'outreg2 using "hidden.$fmt", $fmt replace');
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "project_tex_output" && row.file === "hidden.do"));
  assert.ok(result.project_policy.global_macros.some((row) => row.name === "fmt" && row.status === "resolved_literal" && row.literal === "tex"));
  assert.ok(result.project_policy.files.some((row) => row.file === "hidden.do" && row.tex_output));
});

test("cross-file xlsx format and unrelated dynamic path globals do not false-positive", (t) => {
  const xlsx = crossFileGlobalOutput(t, "global fmt xlsx", 'outreg2 using "hidden.$fmt", $fmt replace');
  assert.equal(xlsx.result.status, "pass", JSON.stringify(xlsx.result.blockers));

  const unrelated = crossFileGlobalOutput(t, "global output_root $project_root", 'outreg2 using "$output_root/hidden.xlsx", replace');
  assert.equal(unrelated.result.status, "pass", JSON.stringify(unrelated.result.blockers));
  assert.ok(unrelated.result.project_policy.global_macros.some((row) => row.name === "output_root" && row.status === "ambiguous_or_dynamic"));
  assert.ok(unrelated.result.project_policy.files.every((row) => !row.output_format_macro_issues?.length));

  const statistic = crossFileGlobalOutput(t, "global reported_mean $runtime_mean", 'outreg2 using "hidden.xlsx", addstat("Mean", $reported_mean) replace');
  assert.equal(statistic.result.status, "pass", JSON.stringify(statistic.result.blockers));
  assert.ok(statistic.result.project_policy.files.every((row) => !row.output_format_macro_issues?.length));
});

test("dynamic global used as an outreg2 extension or option fails closed", (t) => {
  const { result } = crossFileGlobalOutput(t, "global fmt $chosen_format", 'outreg2 using "hidden.$fmt", $fmt replace');
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "project_output_format_macro_ambiguous" && row.file === "hidden.do" && row.issues.some((issue) => issue.name === "fmt" && issue.status === "ambiguous_or_dynamic")));
});

test("canonical helper body receives the project global output-format environment", (t) => {
  const { root, label, manifest, target } = fixture(t, "export.regression_excel.from_ster_default_style.v1");
  useAtomicSubsteps(root, manifest, label, [{
    substep_id: "regression_excel_outreg2_assembly",
    mode: "template",
    match: { label_ids: [label.label_id], commands: ["outreg2"] },
  }]);
  fs.writeFileSync(path.join(root, "runner.do"), 'global fmt tex\ndo "code/module.do"\n', "utf8");
  const changed = label.code.replace("\nend\n", '\noutreg2 using "hidden.$fmt", $fmt replace\nend\n');
  fs.writeFileSync(target, changed, "utf8");
  manifest.selections[0].target_spans = [[1, changed.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(changed, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.ok(result.blockers.some((row) => row.rule === "project_tex_output" && row.file === "code/module.do"));
  assert.ok(result.blockers.some((row) => row.rule === "canonical_program_body_forbidden_command" && row.findings.some((finding) => finding.rule === "tex_output")));
});

test("target path traversal is rejected before code is attributed to a template", (t) => {
  const { root, manifest } = fixture(t);
  manifest.selections[0].target_path = "../outside.do";
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root);
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "target_read_or_span_error" && /escapes project root/.test(row.message)));
});

test("structural replacement rather than minimal adaptation fails command retention", (t) => {
  const { root, label, manifest, target } = fixture(t);
  fs.writeFileSync(target, "use analysis.dta, clear\nregress y x\nexport excel using table.xlsx, replace\n", "utf8");
  manifest.selections[0].target_spans = [[1, 3]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from("use analysis.dta, clear\nregress y x\nexport excel using table.xlsx, replace", "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root, { min_command_retention: 0.75 });
  assert.equal(result.status, "needs_revision");
  assert.ok(result.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"), label.label_id);
});

test("caller cannot lower the hard command-retention floor below 0.75", (t) => {
  const { root, label, manifest, target } = fixture(t);
  const sourceCommandCount = commandSequence(label.code).length;
  const prefixCommandCount = Array.from({ length: sourceCommandCount + 1 }, (_, count) => count)
    .find((count) => count / sourceCommandCount >= 0.74 && count / sourceCommandCount < 0.75);
  assert.ok(prefixCommandCount, "fixture needs an integer command prefix between 0.74 and 0.75 retention");
  const targetText = commandPrefix(label.code, prefixCommandCount);
  fs.writeFileSync(target, targetText, "utf8");
  manifest.selections[0].target_spans = [[1, targetText.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(targetText, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const result = check(root, { min_command_retention: 0.74 });
  const retention = result.selection_checks[0].evidence;
  assert.ok(retention.command_retention >= 0.74 && retention.command_retention < 0.75);
  assert.equal(retention.minimum_command_retention, 0.75);
  assert.ok(result.blockers.some((row) => row.rule === "min_command_retention_out_of_range"));
  assert.ok(result.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"));
});

test("label metadata cannot lower the hard command-retention floor below 0.75", (t) => {
  const { root, label, manifest, target } = fixture(t);
  const sourceCommandCount = commandSequence(label.code).length;
  const prefixCommandCount = Array.from({ length: sourceCommandCount + 1 }, (_, count) => count)
    .find((count) => count / sourceCommandCount >= 0.74 && count / sourceCommandCount < 0.75);
  assert.ok(prefixCommandCount, "fixture needs an integer command prefix between 0.74 and 0.75 retention");
  const targetText = commandPrefix(label.code, prefixCommandCount);
  fs.writeFileSync(target, targetText, "utf8");
  manifest.selections[0].target_spans = [[1, targetText.split(/\r?\n/).length]];
  manifest.selections[0].target_span_sha256 = hash(Buffer.from(targetText, "utf8"));
  fs.writeFileSync(path.join(root, "template_reuse_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const labels = LABELS.map((row) => row.label_id === label.label_id
    ? { ...row, reuse_contract: { ...(row.reuse_contract || {}), min_command_retention: 0.5 } }
    : row);
  const result = check(root, {}, { labels });
  assert.equal(result.selection_checks[0].evidence.minimum_command_retention, 0.75);
  assert.ok(result.blockers.some((row) => row.rule === "command_sequence_retention_below_contract"));
});
