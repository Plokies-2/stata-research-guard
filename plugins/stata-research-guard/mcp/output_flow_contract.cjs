"use strict";

const DECISION_SOURCES = new Set([
  "user",
  "existing_project",
  "model_from_metadata",
  "caller_declared",
]);

const DECISION_SOURCE_ALIASES = new Map([
  ["user_contract", "user"],
  ["explicit_user_request", "user"],
  ["semantic_definition", "model_from_metadata"],
]);

const DECISION_SOURCE_CONTRACT = Object.freeze({
  canonical_values: [...DECISION_SOURCES],
  accepted_aliases: Object.fromEntries(DECISION_SOURCE_ALIASES),
  accepted_object_keys: ["source", "type", "kind"],
  rule: "Use user for an explicit researcher request, existing_project for an established project convention, model_from_metadata for a grouping inferred from labels or definitions, and caller_declared for a caller-owned grouping decision. Grouping evidence remains required.",
});

function rows(value) {
  return Array.isArray(value) ? value : [];
}

function knownValue(value) {
  return value !== null
    && value !== undefined
    && String(value).trim() !== ""
    && !/^(?:unknown|not[_ ]stated|n\/a)$/i.test(String(value).trim());
}

function normalizedName(value) {
  return String(value || "").trim();
}

function normalizedWorkbook(value) {
  return normalizedName(value).replace(/\\/g, "/").toLowerCase();
}

function outcomeName(row) {
  return normalizedName(row?.name || row?.variable || row?.outcome);
}

function normalizedEvidence(value) {
  if (Array.isArray(value)) return value.map(normalizedName).filter(Boolean);
  return knownValue(value) ? [normalizedName(value)] : [];
}

function normalizeDecisionSource(value) {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value.source ?? value.type ?? value.kind
    : value;
  const token = normalizedName(candidate).toLowerCase();
  return DECISION_SOURCE_ALIASES.get(token) || token;
}

function validDecisionSource(value) {
  return DECISION_SOURCES.has(normalizeDecisionSource(value));
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function normalizeOutputFlowProfile(profile = {}) {
  const input = profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  const outcomes = rows(input.outcomes).map((row) => ({
    name: outcomeName(row),
    meaning: row?.meaning || row?.variable_label || row?.family || null,
    variable_label: row?.variable_label || null,
    family: row?.family || null,
    unit: row?.unit || row?.scale || null,
    transform: row?.transform || null,
    sample: row?.sample || null,
    estimand: row?.estimand || null,
    model_role: normalizedName(row?.model_role || "outcome_or_second_stage").toLowerCase(),
    estimate_handoff: row?.estimate_handoff || null,
    specification_order: normalizedEvidence(row?.specification_order),
    evidence_source: row?.evidence_source || null,
  })).filter((row) => row.name);
  const sourceGroups = rows(input.sheet_groups).length ? rows(input.sheet_groups) : rows(input.outcome_groups);
  const sheetGroups = sourceGroups.map((row, index) => ({
    sheet_group_id: normalizedName(row?.sheet_group_id || row?.group_id || `sheet_group_${index + 1}`),
    outcomes: rows(row?.outcomes).map(normalizedName).filter(Boolean),
    grouping_reason: row?.grouping_reason || null,
    decision_source: normalizeDecisionSource(row?.decision_source || (rows(input.outcome_groups).length && !rows(input.sheet_groups).length ? "caller_declared" : null)),
    grouping_evidence: normalizedEvidence(row?.grouping_evidence || row?.evidence),
  }));
  const sheetPlan = rows(input.sheet_plan).map((row, index) => ({
    sheet: normalizedName(row?.sheet || row?.name || `sheet_${index + 1}`),
    sample: row?.sample || null,
    workbook: normalizedName(row?.workbook || row?.workbook_path || row?.output_workbook) || null,
    sheet_group_id: normalizedName(row?.sheet_group_id || row?.group_id || sheetGroups[index]?.sheet_group_id),
    estimate_names: rows(row?.estimate_names).map(normalizedName).filter(Boolean),
    reason: row?.reason || null,
  }));
  return {
    schema_version: input.schema_version || "1.0",
    outcomes,
    sheet_groups: sheetGroups,
    sheet_plan: sheetPlan,
    used_legacy_outcome_groups: !rows(input.sheet_groups).length && rows(input.outcome_groups).length > 0,
  };
}

function analyzeOutputFlowProfile(profile = {}) {
  const normalized = normalizeOutputFlowProfile(profile);
  const failures = [];
  const warnings = [];
  const names = normalized.outcomes.map((row) => row.name);
  const nameSet = new Set(names);
  const assigned = normalized.sheet_groups.flatMap((row) => row.outcomes);
  const assignedSet = new Set(assigned);
  const sheetsByWorkbook = new Map();
  for (const row of normalized.sheet_plan) {
    const workbook = normalizedWorkbook(row.workbook) || "<default_workbook>";
    if (!sheetsByWorkbook.has(workbook)) sheetsByWorkbook.set(workbook, new Set());
    sheetsByWorkbook.get(workbook).add(String(row.sheet || "").toLowerCase());
  }
  const maximumSheetCountPerWorkbook = Math.max(0, ...[...sheetsByWorkbook.values()].map((sheetNames) => sheetNames.size));
  const multiSheetRequested = maximumSheetCountPerWorkbook >= 2;

  const duplicateOutcomes = duplicateValues(names);
  if (duplicateOutcomes.length) failures.push(`duplicate outcomes: ${duplicateOutcomes.join(", ")}`);
  const duplicateAssignments = duplicateValues(assigned);
  if (duplicateAssignments.length) failures.push(`outcomes assigned to more than one sheet_group: ${duplicateAssignments.join(", ")}`);
  const missingAssignments = names.filter((name) => !assignedSet.has(name));
  if (missingAssignments.length) failures.push(`outcomes missing from sheet_groups: ${missingAssignments.join(", ")}`);
  const unknownAssignments = assigned.filter((name) => !nameSet.has(name));
  if (unknownAssignments.length) failures.push(`sheet_groups contain undeclared outcomes: ${[...new Set(unknownAssignments)].join(", ")}`);

  if (!normalized.outcomes.length) failures.push("no outcomes were declared");
  for (const outcome of normalized.outcomes) {
    if (!["outcome_or_second_stage", "outcome", "second_stage", "first_stage", "reduced_form"].includes(outcome.model_role)) {
      failures.push(`outcome ${outcome.name} has unsupported model_role ${outcome.model_role}`);
    }
    const fields = multiSheetRequested ? [
      ["meaning", outcome.meaning],
      ["unit", outcome.unit],
      ["transform", outcome.transform],
      ["sample", outcome.sample],
      ["estimand", outcome.estimand],
      ["estimate_handoff", outcome.estimate_handoff],
      ["specification_order", outcome.specification_order],
    ] : [
      ["sample", outcome.sample],
      ["specification_order", outcome.specification_order],
    ];
    const missing = fields.filter(([, value]) => !knownValue(value)).map(([field]) => field);
    if (missing.length) failures.push(`outcome ${outcome.name} is missing ${missing.join(", ")}`);
  }

  if (!normalized.sheet_groups.length) failures.push("no sheet_groups were declared");
  for (const group of normalized.sheet_groups) {
    if (!group.outcomes.length) failures.push(`sheet_group ${group.sheet_group_id} has no outcomes`);
    if (multiSheetRequested && !knownValue(group.grouping_reason)) failures.push(`sheet_group ${group.sheet_group_id} lacks a reader-facing grouping reason`);
    if ((multiSheetRequested || knownValue(group.decision_source)) && !validDecisionSource(group.decision_source)) failures.push(`sheet_group ${group.sheet_group_id} has invalid decision_source ${group.decision_source || "<missing>"}; use one of ${DECISION_SOURCE_CONTRACT.canonical_values.join(", ")}`);
    if (multiSheetRequested && !group.grouping_evidence.length) failures.push(`sheet_group ${group.sheet_group_id} lacks grouping_evidence`);
    const roles = new Set(group.outcomes.map((name) => normalized.outcomes.find((outcome) => outcome.name === name)?.model_role).filter(Boolean));
    if (roles.has("first_stage") && [...roles].some((role) => role !== "first_stage")) {
      failures.push(`sheet_group ${group.sheet_group_id} mixes first_stage with other model roles`);
    }
  }

  const groupIds = normalized.sheet_groups.map((row) => row.sheet_group_id);
  const duplicateGroupIds = duplicateValues(groupIds);
  if (duplicateGroupIds.length) failures.push(`duplicate sheet_group ids: ${duplicateGroupIds.join(", ")}`);
  const plannedGroupIds = normalized.sheet_plan.map((row) => row.sheet_group_id);
  const physicalPlacementKeys = normalized.sheet_plan.map((row) => [
    normalizedWorkbook(row.workbook) || "<default_workbook>",
    row.sheet.toLowerCase(),
  ].join("::"));
  const duplicatePlacements = duplicateValues(physicalPlacementKeys);
  if (duplicatePlacements.length) failures.push(`duplicate physical workbook/sheet placements: ${duplicatePlacements.join(", ")}`);
  if (!normalized.sheet_plan.length) failures.push("no sheet_plan was declared");
  for (const sheet of normalized.sheet_plan) {
    if (!knownValue(sheet.sheet)) failures.push("sheet_plan contains an unnamed sheet");
    if (!knownValue(sheet.workbook)) failures.push(`sheet ${sheet.sheet} lacks an explicit workbook path`);
    else if (multiSheetRequested && !/\.xlsx$/i.test(sheet.workbook)) failures.push(`multi-sheet workbook ${sheet.workbook} must use an explicit .xlsx target`);
    else if (!multiSheetRequested && !/\.xls$/i.test(sheet.workbook)) failures.push(`direct one-sheet workbook ${sheet.workbook} must use an explicit .xls target`);
    if (!groupIds.includes(sheet.sheet_group_id)) failures.push(`sheet ${sheet.sheet} refers to unknown sheet_group ${sheet.sheet_group_id}`);
    if (multiSheetRequested && !knownValue(sheet.reason)) failures.push(`sheet ${sheet.sheet} lacks a reader-facing reason`);
    if (!sheet.estimate_names.length) failures.push(`sheet ${sheet.sheet} lacks ordered readable estimate_names`);
    const invalidEstimateNames = sheet.estimate_names.filter((name) => !/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(name));
    if (invalidEstimateNames.length) failures.push(`sheet ${sheet.sheet} has invalid Stata estimate names: ${invalidEstimateNames.join(", ")}`);
    const duplicateEstimateNames = duplicateValues(sheet.estimate_names);
    if (duplicateEstimateNames.length) failures.push(`sheet ${sheet.sheet} repeats estimate names: ${duplicateEstimateNames.join(", ")}`);
    const group = normalized.sheet_groups.find((row) => row.sheet_group_id === sheet.sheet_group_id);
    const expectedEstimateCount = rows(group?.outcomes).reduce((total, name) => {
      const outcome = normalized.outcomes.find((row) => row.name === name);
      return total + rows(outcome?.specification_order).length;
    }, 0);
    if (expectedEstimateCount && sheet.estimate_names.length !== expectedEstimateCount) {
      failures.push(`sheet ${sheet.sheet} has ${sheet.estimate_names.length} estimate_names but its declared outcomes and specification_order require ${expectedEstimateCount}`);
    }
  }
  const unplannedGroups = groupIds.filter((id) => !plannedGroupIds.includes(id));
  if (unplannedGroups.length) failures.push(`sheet_groups missing from sheet_plan: ${unplannedGroups.join(", ")}`);

  if (normalized.used_legacy_outcome_groups) warnings.push("outcome_groups is accepted for compatibility; write new manifests with sheet_groups");
  const complete = failures.length === 0;
  const placementCount = normalized.sheet_plan.length;
  const estimateCount = normalized.sheet_plan.reduce((total, row) => total + row.estimate_names.length, 0);
  const formatterRequired = complete && maximumSheetCountPerWorkbook >= 2;
  const directSingleSheet = complete && !formatterRequired;
  let selectionClass = "user_decision_required";
  let recommendedLabelId = null;
  if (complete) {
    if (directSingleSheet) {
      selectionClass = "direct_single_sheet_workbook";
    } else {
      selectionClass = "canonical_raw_outreg2_formatter";
      recommendedLabelId = "export.regression_excel.from_ster_default_style.v1";
    }
  }

  return {
    ...normalized,
    selection_class: selectionClass,
    recommended_label_id: recommendedLabelId,
    selection_ready: complete,
    direct_implementation_allowed: directSingleSheet,
    formatter_required: formatterRequired,
    placement_count: placementCount,
    estimate_count: estimateCount,
    maximum_sheet_count_per_workbook: maximumSheetCountPerWorkbook,
    failures,
    warnings,
    decision_source_contract: DECISION_SOURCE_CONTRACT,
    rule: "Define each reader-facing semantic variable group once, then use sheet_plan to place that group in one or more workbook and sheet contexts with an explicit ordered estimate_names list matching the declared outcomes and specification_order. Groups require label, definition, or project evidence; variable names alone are never evidence. A workbook with one sheet uses concise direct outreg2 replace/append code with an explicit .xls target and no program, regardless of model-column count. Use the canonical formatter and .xlsx only when one workbook requires two or more sheets. Both paths preserve raw outreg2 rows and add only adjusted R-squared and the dependent-variable mean.",
  };
}

function expectedOutreg2Calls(decision, options = {}) {
  return rows(decision?.sheet_plan).map((row) => {
    const workbookValue = typeof options.normalizeWorkbook === "function"
      ? options.normalizeWorkbook(row.workbook)
      : row.workbook;
    const workbook = knownValue(workbookValue) ? normalizedWorkbook(workbookValue) : "*";
    return `${workbook}::${String(row.sheet || "").toLowerCase()}::${rows(row.estimate_names).map(String).join(" ")}`;
  }).sort();
}

function plotKey(row) {
  return [outcomeName(row), normalizedName(row?.specification), normalizedName(row?.sample_comparison)].join("::").toLowerCase();
}

const MIXED_AXIS_RENDERING_MODE = "single_flat_mixed_axis_loop";

function normalizedMixedLoopBinding(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    target_path: normalizedName(input.target_path) || null,
    target_spans: rows(input.target_spans),
    outcome_loop_local: normalizedName(input.outcome_loop_local),
    fixed_outcomes_local: normalizedName(input.fixed_outcomes_local),
    axis_options_local: normalizedName(input.axis_options_local),
  };
}

function validStataLocalName(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ""));
}

function validOrderedSpans(spans) {
  if (!Array.isArray(spans) || !spans.length) return false;
  let previousEnd = 0;
  for (const span of spans) {
    if (!Array.isArray(span) || span.length !== 2 || !span.every(Number.isInteger)) return false;
    const [start, end] = span;
    if (start < 1 || end < start || start <= previousEnd) return false;
    previousEnd = end;
  }
  return true;
}

function analyzeEventStudyAxisProfile(profile = {}, options = {}) {
  const input = profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  const renderingMode = normalizedName(input.rendering_mode).toLowerCase() || null;
  const mixedLoopBinding = normalizedMixedLoopBinding(input.mixed_loop_binding);
  const expectedPlots = rows(input.expected_plots).map((row) => ({
    outcome: outcomeName(row),
    specification: normalizedName(row?.specification),
    sample_comparison: normalizedName(row?.sample_comparison),
  }));
  const axisGroups = rows(input.axis_groups).map((row, index) => ({
    axis_group_id: normalizedName(row?.axis_group_id || `axis_group_${index + 1}`),
    axis_mode: normalizedName(row?.axis_mode).toLowerCase(),
    outcomes: rows(row?.outcomes).map(normalizedName).filter(Boolean),
    specification: normalizedName(row?.specification),
    sample_comparison: normalizedName(row?.sample_comparison),
    coefficient_family: row?.coefficient_family || null,
    unit: row?.unit || null,
    transform: row?.transform || null,
    grouping_reason: row?.grouping_reason || null,
    decision_source: normalizeDecisionSource(row?.decision_source || null),
    grouping_evidence: normalizedEvidence(row?.grouping_evidence || row?.evidence),
    range_basis: row?.range_basis || null,
    range: row?.range && typeof row.range === "object" ? {
      min: Number(row.range.min),
      max: Number(row.range.max),
      step: Number(row.range.step),
    } : null,
    target_path: row?.target_path || null,
    target_spans: rows(row?.target_spans),
  }));
  const failures = [];
  const expectedKeys = expectedPlots.map(plotKey);
  const duplicateExpected = duplicateValues(expectedKeys);
  if (duplicateExpected.length) failures.push(`duplicate expected event-study plots: ${duplicateExpected.join(", ")}`);
  const ids = axisGroups.map((row) => row.axis_group_id);
  const duplicateIds = duplicateValues(ids);
  if (duplicateIds.length) failures.push(`duplicate axis_group ids: ${duplicateIds.join(", ")}`);
  if (!axisGroups.length && expectedPlots.length) failures.push("expected event-study plots exist but axis_groups are missing");

  const covered = [];
  for (const group of axisGroups) {
    if (!group.outcomes.length) failures.push(`axis_group ${group.axis_group_id} has no outcomes`);
    if (!knownValue(group.specification)) failures.push(`axis_group ${group.axis_group_id} lacks specification`);
    if (!knownValue(group.sample_comparison)) failures.push(`axis_group ${group.axis_group_id} lacks sample_comparison`);
    if (!validDecisionSource(group.decision_source)) failures.push(`axis_group ${group.axis_group_id} has invalid decision_source ${group.decision_source || "<missing>"}; use one of ${DECISION_SOURCE_CONTRACT.canonical_values.join(", ")}`);
    if (!group.grouping_evidence.length) failures.push(`axis_group ${group.axis_group_id} lacks grouping_evidence`);
    for (const outcome of group.outcomes) covered.push(plotKey({ outcome, specification: group.specification, sample_comparison: group.sample_comparison }));

    if (group.axis_mode === "fixed_group") {
      if (group.outcomes.length < 2) failures.push(`fixed_group ${group.axis_group_id} requires at least two closely related outcomes`);
      for (const [field, value] of [["coefficient_family", group.coefficient_family], ["unit", group.unit], ["transform", group.transform], ["grouping_reason", group.grouping_reason], ["range_basis", group.range_basis]]) {
        if (!knownValue(value)) failures.push(`fixed_group ${group.axis_group_id} lacks ${field}`);
      }
      const range = group.range;
      if (!range || ![range.min, range.max, range.step].every(Number.isFinite) || !(range.min < range.max) || !(range.step > 0)) {
        failures.push(`fixed_group ${group.axis_group_id} has an invalid fixed range`);
      } else if (range.min > 0 || range.max < 0) failures.push(`fixed_group ${group.axis_group_id} range must include zero`);
    } else if (group.axis_mode === "automatic") {
      if (group.outcomes.length !== 1) failures.push(`automatic axis_group ${group.axis_group_id} must describe exactly one outcome plot`);
      if (group.range) failures.push(`automatic axis_group ${group.axis_group_id} must not declare a fixed range`);
    } else failures.push(`axis_group ${group.axis_group_id} has unsupported axis_mode ${group.axis_mode || "<missing>"}`);

    if (options.requireBindings && renderingMode !== MIXED_AXIS_RENDERING_MODE) {
      if (!knownValue(group.target_path)) failures.push(`axis_group ${group.axis_group_id} lacks target_path`);
      if (!group.target_spans.length) failures.push(`axis_group ${group.axis_group_id} lacks target_spans`);
      else if (!group.target_spans.every((span) => Array.isArray(span) && span.length === 2 && span.every(Number.isInteger))) failures.push(`axis_group ${group.axis_group_id} has invalid target_spans`);
    }
  }

  const duplicateCoverage = duplicateValues(covered);
  if (duplicateCoverage.length) failures.push(`event-study plots covered more than once: ${duplicateCoverage.join(", ")}`);
  if (expectedPlots.length) {
    const expected = expectedPlots.map(plotKey);
    const missing = expected.filter((key) => !covered.includes(key));
    const unexpected = covered.filter((key) => !expected.includes(key));
    if (missing.length) failures.push(`event-study plots missing axis policy: ${missing.join(", ")}`);
    if (unexpected.length) failures.push(`axis_groups contain undeclared event-study plots: ${unexpected.join(", ")}`);
  }

  if (renderingMode && renderingMode !== MIXED_AXIS_RENDERING_MODE) {
    failures.push(`unsupported event-study rendering_mode ${renderingMode}`);
  }
  if (input.mixed_loop_binding && renderingMode !== MIXED_AXIS_RENDERING_MODE) {
    failures.push(`mixed_loop_binding requires rendering_mode ${MIXED_AXIS_RENDERING_MODE}`);
  }
  if (renderingMode === MIXED_AXIS_RENDERING_MODE) {
    const fixedGroups = axisGroups.filter((group) => group.axis_mode === "fixed_group");
    const automaticGroups = axisGroups.filter((group) => group.axis_mode === "automatic");
    if (fixedGroups.length !== 1) failures.push(`${MIXED_AXIS_RENDERING_MODE} requires exactly one fixed_group; found ${fixedGroups.length}`);
    if (automaticGroups.length < 1) failures.push(`${MIXED_AXIS_RENDERING_MODE} requires at least one automatic axis_group`);
    if (!expectedPlots.length) failures.push(`${MIXED_AXIS_RENDERING_MODE} requires expected_plots so mixed-loop coverage can be verified`);
    for (const field of ["outcome_loop_local", "fixed_outcomes_local", "axis_options_local"]) {
      if (!validStataLocalName(mixedLoopBinding[field])) failures.push(`mixed_loop_binding.${field} must be a Stata local name`);
    }
    const localNames = [mixedLoopBinding.outcome_loop_local, mixedLoopBinding.fixed_outcomes_local, mixedLoopBinding.axis_options_local].filter(Boolean);
    if (duplicateValues(localNames.map((value) => value.toLowerCase())).length) failures.push("mixed_loop_binding local names must be distinct");
    if (!knownValue(mixedLoopBinding.target_path)) failures.push("mixed_loop_binding.target_path is required");
    if (!mixedLoopBinding.target_spans.length) failures.push("mixed_loop_binding.target_spans is required");
    else if (!validOrderedSpans(mixedLoopBinding.target_spans)) failures.push("mixed_loop_binding.target_spans is invalid");
  }

  return {
    schema_version: input.schema_version || "1.0",
    rendering_mode: renderingMode,
    mixed_loop_binding: renderingMode === MIXED_AXIS_RENDERING_MODE ? mixedLoopBinding : null,
    expected_plots: expectedPlots,
    axis_groups: axisGroups,
    selection_ready: axisGroups.length > 0 && failures.length === 0,
    status: axisGroups.length ? (failures.length ? "needs_revision" : "ready") : "not_declared",
    failures,
    decision_source_contract: DECISION_SOURCE_CONTRACT,
    rule: "Use one common fixed vertical axis only for genuinely close, directly comparable outcomes within the same specification and sample comparison. Every other event-study plot keeps an automatic axis. A single_flat_mixed_axis_loop is opt-in and valid only for exactly one fixed_group plus one or more automatic groups bound to one explicit flat loop. Axis groups are independent of Excel sheet groups.",
  };
}

module.exports = {
  analyzeEventStudyAxisProfile,
  analyzeOutputFlowProfile,
  expectedOutreg2Calls,
  knownValue,
  normalizeOutputFlowProfile,
  plotKey,
  MIXED_AXIS_RENDERING_MODE,
};
