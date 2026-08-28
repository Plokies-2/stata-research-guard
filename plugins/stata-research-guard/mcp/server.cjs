#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const {
  templateReuseCheck,
  matchingAutoSelectableLabels,
  collectProjectGlobalEnvironment,
  canonicalOutreg2HelperMultiplicity,
} = require("./template_reuse.cjs");
const {
  analyzeEventStudyAxisProfile,
  analyzeOutputFlowProfile,
  MIXED_AXIS_RENDERING_MODE,
} = require("./output_flow_contract.cjs");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const STAGES = [
  "import",
  "integrity_audit",
  "cleaning_labels",
  "merge_reshape",
  "panel_construction",
  "descriptives_balance_sample_flow",
  "estimation",
  "robustness",
  "figures",
  "exports",
  "master_orchestration",
];
const NEW_PROJECT_TREE = [
  "project/README.md",
  "project/report.md",
  "project/masters.do",
  "project/do/build_analysis_panel.do",
  "project/do/build_summary.do",
  "project/do/run_regressions.do",
  "project/do/main.log",
  "project/data/raw/ (read-only)",
  "project/data/final/",
  "project/ster/",
  "project/table/",
  "project/figures/",
];
const NEW_PROJECT_TREE_MARKDOWN = [
  "project/",
  "├─ README.md",
  "├─ report.md",
  "├─ masters.do",
  "├─ do/",
  "│  ├─ build_analysis_panel.do",
  "│  ├─ build_summary.do",
  "│  ├─ run_regressions.do",
  "│  └─ main.log",
  "├─ data/",
  "│  ├─ raw/",
  "│  └─ final/",
  "├─ ster/",
  "├─ table/",
  "└─ figures/",
].join("\n");
const README_OUTLINE = [
  { section: "개요", required: true, contents: ["연구 질문과 분석 단위", "정본 entrypoint"] },
  { section: "새로 생성되는 파일 구조", required: true, contents: ["사용자 승인 전 제시한 실제 폴더·파일 tree", "각 폴더와 주요 파일의 역할"] },
  { section: "분석 변수 안내", required: true, contents: ["영구 저장되거나 분석에 쓰이는 신규 변수의 이름과 사용자용 설명", "분석 역할", "원자료 또는 생성 방식", "단위·관측단위", "기간·지리", "값 코딩과 결측 처리"] },
  { section: "실행 방법", required: true, contents: ["masters.do부터의 실행 순서", "사용자가 바꿔야 하는 경로 또는 입력값"] },
  { section: "산출물과 생성 코드", required: true, contents: ["표·그림·.ster와 생성 do-file의 대응"] },
];
const VARIABLE_DICTIONARY_COLUMNS = [
  "variable_name",
  "reader_description",
  "analysis_role",
  "source_or_formula",
  "unit_observation_level",
  "period_geography",
  "coding_missing",
  "creation_file",
  "used_in",
];
const PLANNED_VARIABLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "reader_description", "source_or_formula", "unit_observation_level"],
  properties: {
    name: { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]{0,31}$" },
    reader_description: { type: "string", minLength: 1 },
    analysis_role: { type: "string" },
    source_or_formula: { type: "string" },
    unit_observation_level: { type: "string" },
    period_geography: { type: "string" },
    coding_missing: { type: "string" },
    creation_file: { type: "string" },
    used_in: { type: "string" },
  },
};
const INSTRUCTIONS = [
  "Use this server for bounded Stata research authoring and read-only audit. Never claim journal certification.",
  "Classify intent before loading writable code. Review, audit, diagnosis, explanation, and explicit no-change requests are read-only; caller options cannot widen them. Inspect the target and active entrypoint first, preserve compatible interfaces, default to partial repair, and obtain approval for the exact write footprint before changing project files.",
  "Apply the general rules to every substantive transition, including direct implementation and template selection, binding, adaptation, and verification. A template is optional and valid only when permitted bindings leave the complete atomic transition intact. If its frame, algorithm, control flow, interface, estimate handoff, or output contract must change, stop calling it a template; split at a natural state boundary or use general_rule. The nearest inspected candidate is only a nonbinding hint. Neither templates nor general rules supply unresolved research or output choices.",
  "Call resolve_transition_evidence first for substantive reusable work. Guide mechanics are non-writable syntax and state evidence; paper occurrences are context; at most one explicitly promoted, profile-compatible usage row may implement one transition. Direct primitives do not need a checkpoint, report row, or provenance marker unless their returned state determines a substantive sample, estimand, transformation, estimate handoff, or output.",
  "Prioritize correctness, point-of-use readability, and restartable artifacts before brevity, DRY, or modularity. As this plugin's house style rather than a universal Stata textbook rule, use a literal once and otherwise a descriptive global in the consuming do-file; keep shared roots in masters.do and outcome-list globals in run_regressions.do. Never chain substantive aliases. In authored regressions keep treatment or event window, controls, sample, fixed effects, weights, and VCE at zero substantive reference depth. Reserve local for lexical loop, program, temp, scratch, or immediately consumed returned-state cases. Do not apply these preferences as retroactive errors to untouched projects.",
  "Prefer visible sequential blocks or one flat loop. Depth two is allowed only when two plain axes repeat one mechanical body and substantially reduce duplication without hiding research or output choices; depth three is blocking. Do not add positional job strings, registries, dispatchers, one-use programs, one-item loops, unused options, future interfaces, dependency probes, manual event dummies, or coefficient reconstruction. Align long lists by meaning and use /// only for an immediately continued command.",
  "For a new compatible applied-micro panel workflow that needs preparation, summary, and estimation, default to unnumbered masters.do, do/build_analysis_panel.do, do/build_summary.do, and do/run_regressions.do. Complete shared preprocessing in one labeled and checked cleaned panel, record named observation counts after consequential filters and retained-state merges, then reopen the panel independently for summaries and regressions. Preserve compatible existing layouts. A coherent file around 1000 lines may remain intact; split only at a real artifact, rerun, reuse, ownership, or responsibility boundary.",
  "A new masters.do lists exact persistent Project Inputs and Project Outputs. Associate every direct do call with exact Input, exact Output or Output: none, and a concise Korean role comment. File inventories are blocking for new code; prose completeness, punctuation, and blank-line adjacency are advisory. The approved prompt-only master shell may contain shared roots, log using, flat direct do calls, and log close without a template or provenance row; do not infer stages, paths, or order.",
  "Preserve native factor-variable and raw e(b) names. For event studies omit the declared reference, use one #, and never substitute manual interaction dummies. If Stata runtime is not being run or exact raw coefficient names have not been read back, use a level-by-level native no-base list and do not auto-select compact syntax. A compact form is eligible only after runtime confirms support, the omitted level, and exact coefficient names.",
  "Final Excel preserves every raw outreg2 header, coefficient, standard-error, omitted/base, and note row. A one-sheet workbook runs quietly summarize <depvar> if e(sample), meanonly, binds r(mean) to a lexical local, and uses visible direct outreg2 replace or append with an explicit .xls target; it may add only adjusted R-squared and that dependent-variable mean. Use the canonical .xlsx formatter only for two or more sheets in one workbook. Figures are PDF, reusable estimates are .ster, and TeX is prohibited. One event-study outcome uses a direct graph; multiple outcomes use one flat outcome loop with immediate PDF export and automatic axes by default.",
  "Use report_policy required, optional, or disabled. Code writing defaults to required, standalone audit to optional, and explicit no-report to disabled. Keep provenance out of research code. Audit the active reachable workflow unless scope is explicitly widened, keep runtime_success, static_audit, and substantive_validity separate, and compare every contracted outcome, sample, and specification when a baseline is declared.",
  "Iteration is allowed: revise from concrete lint, runtime, or output evidence and leave one final implementation path per transition. For a source-isolated blind trial use only the staged inputs, contract, installed local evidence, and exposed tools; do not use prior outputs as an answer key. Source isolation does not require template-only code. Stop only for an unresolved substantive choice, unavailable required input or execution capability, or a hard safety/output violation."
].join(" ");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

function loadJsonl(name) {
  return fs.readFileSync(path.join(DATA, name), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

let referencesCache = null;

function references() {
  if (referencesCache === null) referencesCache = loadJsonl("reference_index.jsonl");
  return referencesCache;
}

let manualsCache = null;
let officialVerificationCache = null;
let officialWebSourcesCache = null;
let workflowExamplesCache = null;
let top100CommandEvidenceCache = null;

function manuals() {
  if (manualsCache === null) manualsCache = loadJsonl("manual_index.jsonl");
  return manualsCache;
}

function officialVerification() {
  if (officialVerificationCache === null) officialVerificationCache = loadJson("official_example_verification.json");
  return officialVerificationCache;
}

function officialWebSources() {
  if (officialWebSourcesCache === null) officialWebSourcesCache = loadJson("official_web_sources.json");
  return officialWebSourcesCache;
}

function workflowExamples() {
  if (workflowExamplesCache === null) workflowExamplesCache = loadJson("workflow_examples.json");
  return workflowExamplesCache;
}

function top100CommandEvidence() {
  if (top100CommandEvidenceCache === null) {
    top100CommandEvidenceCache = fs.existsSync(path.join(DATA, "top100_command_evidence_matrix.json"))
      ? loadJson("top100_command_evidence_matrix.json")
      : { rows: [], summary: {} };
  }
  return top100CommandEvidenceCache;
}

const PACKAGES = loadJson("reference_packages.json");
const LABELED_CHECKPOINTS = loadJsonl("labeled_checkpoints.jsonl");
const COMMAND_EXAMPLE_AUDIT = fs.existsSync(path.join(ROOT, "annotations", "command_example_audit.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "annotations", "command_example_audit.json"), "utf8"))
  : { label_overrides: {} };
const CHECKPOINT_CONTRACTS = fs.existsSync(path.join(ROOT, "annotations", "checkpoint_contracts.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "annotations", "checkpoint_contracts.json"), "utf8"))
  : { contracts: [] };
const GUIDE_MECHANICS_CARDS = fs.existsSync(path.join(DATA, "guide_mechanics_cards.jsonl"))
  ? loadJsonl("guide_mechanics_cards.jsonl")
  : [];
const GUIDE_MECHANICS_LABEL_IDS = new Set([
  ...GUIDE_MECHANICS_CARDS
    .filter((row) => row.provenance?.promotion_audit)
    .map((row) => row.label_id),
  ...Object.keys(COMMAND_EXAMPLE_AUDIT.label_overrides || {}),
]);
const RESEARCH_USAGE_EXAMPLES = fs.existsSync(path.join(DATA, "research_usage_examples.jsonl"))
  ? loadJsonl("research_usage_examples.jsonl")
  : [];
const WORKFLOW_DICTIONARY = loadJson("workflow_block_dictionary.json");
const PACKAGE_COVERAGE = fs.existsSync(path.join(DATA, "package_checkpoint_coverage.json"))
  ? loadJson("package_checkpoint_coverage.json")
  : null;
const PACKAGE_COMMAND_CATALOG = fs.existsSync(path.join(DATA, "package_command_catalog.json"))
  ? loadJson("package_command_catalog.json")
  : { families: [] };
const CHECKPOINTS = unique(LABELED_CHECKPOINTS.map((row) => row.checkpoint)).sort();
const DICTIONARY_BY_HEADWORD = new Map(WORKFLOW_DICTIONARY.entries.map((row) => [row.headword, row]));
const PACKAGE_COVERAGE_BY_ID = new Map((PACKAGE_COVERAGE?.packages || []).map((row) => [row.package_id, row]));

function asText(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function fail(message, details = {}) {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message, ...details }) }],
    structuredContent: { error: message, ...details },
    isError: true,
  };
}

function projectStateSignature(value) {
  const row = value && typeof value === "object" ? value : {};
  return {
    requires: Array.isArray(row.requires) ? row.requires.map(String) : [],
    observable_signals: Array.isArray(row.observable_signals) ? row.observable_signals.map(String) : [],
    produces: Array.isArray(row.produces) ? row.produces.map(String) : [],
  };
}

function projectGuideMetadata(row = {}) {
  return {
    label_id: row.label_id,
    contract_ids: Array.isArray(row.contract_ids) ? row.contract_ids.map(String) : [],
    counts_toward_complexity: Boolean(row.counts_toward_complexity),
    code_available: false,
    manual_urls: Array.isArray(row.manual_urls) ? row.manual_urls.map(String) : [],
    command_anchors: Array.isArray(row.command_anchors) ? row.command_anchors.map(String) : [],
    state_signature: projectStateSignature(row.state_signature),
    source_kind: row.source_kind || null,
  };
}

function projectMaterialContract(row = {}) {
  return {
    contract_id: row.contract_id,
    policy: row.policy,
    variant: row.variant,
  };
}

function depositedPaperCode(row = {}) {
  const sourceKind = String(row.source_kind || "").toLowerCase();
  return /^deposited_research_code(?:_|$)/.test(sourceKind)
    && !/canonical|guide|manual|project[_-]?snapshot/.test(sourceKind);
}

function projectPaperCodeItem(row = {}) {
  const result = {
    label_id: row.label_id,
    classification: row.classification,
    decision: row.decision,
    rubric_classification: row.rubric_classification,
    command_anchors: Array.isArray(row.command_anchors) ? row.command_anchors.map(String) : [],
    anchor_mapped_group_ids: Array.isArray(row.anchor_mapped_group_ids) ? row.anchor_mapped_group_ids.map(String) : [],
    mapping_scope: row.mapping_scope,
    source_kind: row.source_kind,
    source_path: row.source_path,
    source_spans: Array.isArray(row.source_spans) ? row.source_spans : [],
  };
  if (depositedPaperCode(row)) {
    result.code = row.code;
    result.code_line_count = row.code_line_count;
    result.code_sha256 = row.code_sha256;
    result.source_file_sha256 = row.source_file_sha256;
  } else {
    result.code_available = false;
  }
  return result;
}

function projectPaperCodeContext(value = {}) {
  return Object.fromEntries(["candidate", "reference", "excluded"].map((classification) => [
    classification,
    Array.isArray(value[classification]) ? value[classification].map(projectPaperCodeItem) : [],
  ]));
}

function projectCodeFreePaperSupport(row = {}) {
  return {
    label_id: row.label_id,
    evidence_role: row.evidence_role,
    code_available: false,
    contract_ids: Array.isArray(row.contract_ids) ? row.contract_ids.map(String) : [],
    command_anchors: Array.isArray(row.command_anchors) ? row.command_anchors.map(String) : [],
    runtime_status: row.runtime_status,
    selector_status: row.selector_status,
    source_kind: row.source_kind,
    source_path: row.source_path,
    source_spans: Array.isArray(row.source_spans) ? row.source_spans : [],
    source_file_sha256: row.source_file_sha256,
  };
}

function projectCodeFreePaperSupportMap(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).map(([contractId, rows]) => [
    contractId,
    Array.isArray(rows) ? rows.map(projectCodeFreePaperSupport) : [],
  ]));
}

function inspectTop100CommandExamples(args = {}) {
  const evidence = top100CommandEvidence();
  const requestedGroups = new Set((args.group_ids || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  const requestedCommands = new Set((args.commands || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  if (!requestedGroups.size && !requestedCommands.size) {
    throw new Error("group_ids 또는 commands 중 하나 이상을 지정해야 합니다.");
  }

  const rows = (evidence.rows || []).filter((row) => {
    if (requestedGroups.has(String(row.group_id || "").toLowerCase())) return true;
    const tokens = [...(row.commands || []), ...(row.registry_tokens || [])]
      .map((value) => String(value).trim().toLowerCase());
    return tokens.some((token) => requestedCommands.has(token));
  }).map((row) => {
    const result = {
      rank: row.rank,
      group_id: row.group_id,
      commands: Array.isArray(row.commands) ? row.commands.map(String) : [],
      complexity: {
        example_count: Number(row.complexity?.example_count || 0),
        decision: row.complexity?.decision,
        coverage_status: row.complexity?.coverage_status,
      },
      material_contracts: Array.isArray(row.material_contracts) ? row.material_contracts.map(projectMaterialContract) : [],
      guide_blocks: Array.isArray(row.guide_blocks) ? row.guide_blocks.map(projectGuideMetadata) : [],
      supplemental_guide_context: Array.isArray(row.supplemental_guide_context) ? row.supplemental_guide_context.map(projectGuideMetadata) : [],
      guide_gap_contract_ids: Array.isArray(row.guide_gap_contract_ids) ? row.guide_gap_contract_ids.map(String) : [],
      paper_exact_support_code_unavailable: projectCodeFreePaperSupportMap(row.paper_exact_support_code_unavailable),
      paper_exact_support_gap_contract_ids: Array.isArray(row.paper_exact_support_gap_contract_ids) ? row.paper_exact_support_gap_contract_ids.map(String) : [],
      paper_code_template_exact_mapping_gap_contract_ids: Array.isArray(row.paper_code_template_exact_mapping_gap_contract_ids) ? row.paper_code_template_exact_mapping_gap_contract_ids.map(String) : [],
    };
    if (args.include_paper_context === true) result.paper_code_context = projectPaperCodeContext(row.paper_code_context);
    return result;
  });

  return {
    schema_version: evidence.schema_version,
    mode: "complexity_weighted_command_overview",
    requested: {
      group_ids: [...requestedGroups],
      commands: [...requestedCommands],
      include_paper_context: args.include_paper_context === true,
    },
    matched_group_count: rows.length,
    rows,
    claim_boundary: {
      guide_blocks: "각 명령어의 물질적으로 다른 문법·상태·추정·추론·handoff를 덮는 reference-only manual metadata입니다. 코드, 코드 hash, synthetic source span은 반환하지 않으며 자동 선택 근거가 아닙니다.",
      paper_code_context: "command anchor가 나타난 논문 코드 문맥일 뿐 exact contract template support가 아닙니다.",
      paper_exact_support_code_unavailable: "명시 contract support이나 원문 코드가 없어 코드 템플릿으로 사용할 수 없습니다.",
    },
  };
}

function tokenize(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9_]{2,}|[가-힣]{2,}/g) || [];
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeCommand(value) {
  let command = String(value).trim();
  const modifierColon = /^(?:quietly|qui|noisily|noi|capture|cap)\s*:\s*/i;
  const modifierSpace = /^(?:quietly|qui|noisily|noi|capture|cap)\s+/i;
  const colonPrefix = /^(?:mi\s+estimate|bootstrap|jackknife|statsby|svy|by(?:sort)?|collect|frame|bayesboot|simulate|bayes|fmm|fp|mfp|version|xi|stepwise|nestreg|rolling|permute)\b/i;
  const unquotedColon = (text) => {
    let inDoubleQuote = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === '"') inDoubleQuote = !inDoubleQuote;
      if (text[index] === ":" && !inDoubleQuote) return index;
    }
    return -1;
  };
  while (true) {
    if (modifierColon.test(command)) {
      command = command.replace(modifierColon, "");
      continue;
    }
    if (modifierSpace.test(command)) {
      command = command.replace(modifierSpace, "");
      continue;
    }
    if (!colonPrefix.test(command)) break;
    const colon = unquotedColon(command);
    if (colon < 0) break;
    command = command.slice(colon + 1).trim();
  }
  return command;
}

function stripComments(content) {
  const lines = String(content).split(/\r?\n/);
  const active = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let work = "";
    let inDoubleQuote = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const next = line[index + 1] || "";
      if (inBlock) {
        if (character === "*" && next === "/") {
          inBlock = false;
          index += 1;
        }
        continue;
      }
      if (character === '"') {
        inDoubleQuote = !inDoubleQuote;
        work += character;
        continue;
      }
      if (!inDoubleQuote && character === "/" && next === "*") {
        inBlock = true;
        index += 1;
        continue;
      }
      if (!inDoubleQuote && character === "/" && next === "/") {
        if (line[index + 2] === "/") work += "///";
        break;
      }
      work += character;
    }
    const trimmed = work.trimStart();
    if (!trimmed || trimmed.startsWith("*") || trimmed.startsWith("//")) continue;
    active.push({ line: i + 1, text: work, trimmed });
  }
  return active;
}

function activeLogicalEntries(content) {
  const logical = [];
  let buffer = "";
  let startLine = null;
  for (const row of stripComments(content)) {
    if (startLine === null) startLine = row.line;
    const continuation = /\/\/\/\s*$/.test(row.text);
    const piece = row.text.replace(/\/\/\/\s*$/, "").trim();
    buffer = buffer ? `${buffer} ${piece}` : piece;
    if (!continuation) {
      if (buffer) logical.push({ line: startLine, text: buffer });
      buffer = "";
      startLine = null;
    }
  }
  if (buffer) logical.push({ line: startLine, text: buffer });
  return logical;
}

function delimiterDirectiveFindings(content, authoringState = "existing_audit") {
  return stripComments(content)
    .filter((row) => /^#delimit\b/i.test(row.trimmed))
    .map((row) => finding(
      authoringState === "new" ? "error" : "warning",
      "nonstandard_command_delimiter",
      row.line,
      "#delimit가 line-oriented 안전·가독성 검사를 우회할 수 있는 세미콜론 명령 흐름을 만듭니다.",
      "#delimit를 제거하고 각 명령을 직접 쓰되 긴 명령은 /// continuation으로만 이어 쓰세요.",
      "researcher_style_reference",
    ));
}

function activeLogicalLines(content) {
  return activeLogicalEntries(content).map((entry) => entry.text);
}

function outreg2HelperMultiplicity(content) {
  const macros = new Map();
  const lines = activeLogicalLines(content);
  for (const line of lines) {
    const command = normalizeCommand(line.trim());
    const match = command.match(/^(?:global|local)\s+([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/i);
    if (!match) continue;
    let value = match[2].trim();
    const quoted = value.match(/^(["'])([\s\S]*)\1$/);
    if (quoted) value = quoted[2];
    if (!/[`$]/.test(value)) macros.set(match[1].toLowerCase(), value);
  }
  const resolve = (raw) => {
    let value = String(raw || "").trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
    const macro = value.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
    if (macro) value = macros.get(macro[1].toLowerCase()) || value;
    return /[`$]/.test(value) ? null : value.trim();
  };
  const calls = lines.map((line) => normalizeCommand(line.trim())).filter((line) => /^outreg2_xlsx\s*,/i.test(line));
  const sheets = new Set();
  const sheetsByWorkbook = new Map();
  let maximumEstimateCount = 0;
  let unresolvedEstimates = false;
  let unresolvedPlacement = false;
  for (const call of calls) {
    const estimateMatch = call.match(/\bestimates\s*\(\s*("[^"]*"|'[^']*'|[^)]*?)\s*\)/i);
    const workbookMatch = call.match(/\bworkbook\s*\(\s*("[^"]*"|'[^']*'|[^)]*?)\s*\)/i);
    const sheetMatch = call.match(/\bsheet\s*\(\s*("[^"]*"|'[^']*'|[^)]*?)\s*\)/i);
    const estimates = resolve(estimateMatch?.[1]);
    const workbook = resolve(workbookMatch?.[1]);
    const sheet = resolve(sheetMatch?.[1]);
    if (estimates === null || !estimateMatch) unresolvedEstimates = true;
    if (workbook === null || sheet === null || !workbookMatch || !sheetMatch) unresolvedPlacement = true;
    if (estimates) maximumEstimateCount = Math.max(maximumEstimateCount, estimates.split(/\s+/).filter(Boolean).length);
    if (sheet) sheets.add(sheet.toLowerCase());
    if (workbook && sheet) {
      const workbookKey = workbook.toLowerCase();
      if (!sheetsByWorkbook.has(workbookKey)) sheetsByWorkbook.set(workbookKey, new Set());
      sheetsByWorkbook.get(workbookKey).add(sheet.toLowerCase());
    }
  }
  const maximumSheetCountPerWorkbook = Math.max(0, ...[...sheetsByWorkbook.values()].map((rows) => rows.size));
  return {
    call_count: calls.length,
    maximum_estimate_count: maximumEstimateCount,
    distinct_sheet_count: sheets.size,
    maximum_sheet_count_per_workbook: maximumSheetCountPerWorkbook,
    unresolved: unresolvedEstimates || unresolvedPlacement,
    unresolved_estimates: unresolvedEstimates,
    unresolved_placement: unresolvedPlacement,
    necessary: !unresolvedPlacement && calls.length > 0 && maximumSheetCountPerWorkbook >= 2,
  };
}

function directOutreg2StatisticLines(content) {
  const entries = activeLogicalEntries(content).map((entry) => ({
    ...entry,
    command: normalizeCommand(entry.text.trim()),
  }));
  const allowed = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const command = entries[index].command;
    if (!/^outreg2\b/i.test(command) || !/\badjr2\b/i.test(command)) continue;
    const addstats = [...command.matchAll(/\baddstat\s*\(/ig)];
    if (addstats.length !== 1) continue;
    const meanMatch = command.match(/\baddstat\s*\(\s*Dep\.\s*variable\s*mean\s*,\s*`([A-Za-z_][A-Za-z0-9_]*)'\s*\)/i);
    if (!meanMatch) continue;
    const localName = meanMatch[1].toLowerCase();
    const estimatorPattern = /^(?:reg|regress|areg|qreg|tobit|xtreg|reghdfe|ivregress|ivreg2|ivreghdfe|ppmlhdfe|poisson|logit|logistic|probit)\b/i;
    let localIndex = -1;
    for (let prior = index - 1; prior >= 0; prior -= 1) {
      if (new RegExp(`^local\\s+${localName}\\s*=\\s*r\\(mean\\)\\s*$`, "i").test(entries[prior].command)) {
        localIndex = prior;
        break;
      }
      if (estimatorPattern.test(entries[prior].command)) break;
    }
    if (localIndex < 0) continue;
    let sampleMeanIndex = -1;
    let sampleMean = null;
    for (let prior = localIndex - 1; prior >= 0; prior -= 1) {
      sampleMean = entries[prior].command.match(/^(?:sum|summarize)\s+(`?[A-Za-z_][A-Za-z0-9_]*'?)\s+if\s+e\(sample\)\s*,[\s\S]*\bmeanonly\b/i);
      if (sampleMean) {
        sampleMeanIndex = prior;
        break;
      }
      if (estimatorPattern.test(entries[prior].command)) break;
    }
    if (sampleMeanIndex < 0 || entries.slice(sampleMeanIndex + 1, index).some((row) => estimatorPattern.test(row.command))) continue;
    const estimator = entries.slice(0, sampleMeanIndex).reverse().find((row) => estimatorPattern.test(row.command));
    const dependentVariable = estimator?.command.match(/^(?:reg|regress|areg|qreg|tobit|xtreg|reghdfe|ivregress(?:\s+\w+)?|ivreg2|ivreghdfe|ppmlhdfe|poisson|logit|logistic|probit)\s+(`?[A-Za-z_][A-Za-z0-9_]*'?)/i)?.[1];
    const normalizedDependent = String(dependentVariable || "").replace(/^`|'+$/g, "").toLowerCase();
    const normalizedMean = String(sampleMean[1] || "").replace(/^`|'+$/g, "").toLowerCase();
    if (!normalizedDependent || normalizedDependent !== normalizedMean) continue;
    allowed.add(entries[index].line);
  }
  return allowed;
}

// `erase' is normally prohibited.  The sole exception is deliberately
// structural rather than path-based: the canonical Excel formatter creates a
// named outreg2 scratch text file, imports it, restores the caller's data, and
// immediately proves that its one disposable file was removed.  A loose
// `$table/__outreg2_' prefix would otherwise turn an arbitrary deletion into a
// linter exception.
function canonicalOutreg2ScratchContract(content) {
  const entries = activeLogicalEntries(content).map((entry) => ({
    ...entry,
    command: normalizeCommand(entry.text.trim()),
  }));
  const definitions = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => /^program\s+define\s+outreg2_xlsx\b/i.test(entry.command));
  if (!definitions.length) return { applies: false, valid: false, allowedEraseLines: new Set(), findings: [] };

  const findings = [];
  if (definitions.length !== 1) findings.push({ contract: "single_outreg2_xlsx_formatter", line: definitions[0].entry.line });
  const start = definitions[0].index;
  let end = entries.length;
  for (let index = start + 1; index < entries.length; index += 1) {
    if (/^end\s*$/i.test(entries[index].command)) {
      end = index;
      break;
    }
  }
  const body = entries.slice(start, end + 1);
  const localScratch = /^local\s+scratch\s+"\$table\/__outreg2_`sheet'"\s*$/i;
  const outreg2Scratch = /^outreg2\s+using\s+"`scratch'"/i;
  const importScratch = /^import\s+delimited\s+using\s+"`scratch'\.txt"/i;
  const bareEraseScratch = /^erase\s+"`scratch'\.txt"\s*$/i;
  const confirmScratch = /^(?:(?:capture|cap)\s+)?confirm\s+file\s+"`scratch'\.txt"\s*$/i;
  const temporaryScratch = /^tempfile\s+scratch\b/i;
  if (!body.some((entry) => localScratch.test(entry.command))) findings.push({ contract: "named_table_scratch_local", line: definitions[0].entry.line });
  if (body.some((entry) => temporaryScratch.test(entry.command))) findings.push({ contract: "tempfile_scratch_not_allowed", line: body.find((entry) => temporaryScratch.test(entry.command)).line });
  if (!body.some((entry) => outreg2Scratch.test(entry.command))) findings.push({ contract: "outreg2_produces_named_scratch", line: definitions[0].entry.line });
  if (!body.some((entry) => importScratch.test(entry.command))) findings.push({ contract: "imports_named_scratch", line: definitions[0].entry.line });

  const cleanup = body.map((entry, index) => ({ entry, index })).filter(({ entry }) => bareEraseScratch.test(entry.command));
  if (cleanup.length !== 1) {
    findings.push({ contract: "one_bare_named_scratch_erase", line: cleanup[0]?.entry.line || definitions[0].entry.line });
  } else {
    const eraseIndex = cleanup[0].index;
    const restore = body[eraseIndex - 1];
    const confirm = body[eraseIndex + 1];
    const guard = body[eraseIndex + 2];
    let closesAt = -1;
    if (restore?.command !== "restore") findings.push({ contract: "restore_before_scratch_cleanup", line: cleanup[0].entry.line });
    if (!confirmScratch.test(confirm?.command || "")) findings.push({ contract: "confirm_named_scratch_after_cleanup", line: cleanup[0].entry.line });
    if (!/^if\s+!_rc\s*\{$/i.test(guard?.command || "")) findings.push({ contract: "cleanup_postcondition_guard", line: cleanup[0].entry.line });
    if (/^if\s+!_rc\s*\{$/i.test(guard?.command || "")) {
      for (let index = eraseIndex + 3; index < body.length; index += 1) {
        if (body[index].command === "}") {
          closesAt = index;
          break;
        }
      }
      if (closesAt < 0 || !body.slice(eraseIndex + 3, closesAt).some((entry) => /^exit\s+498\s*$/i.test(entry.command))) {
        findings.push({ contract: "cleanup_postcondition_exit_498", line: cleanup[0].entry.line });
      }
    }
  }
  const valid = findings.length === 0;
  return {
    applies: true,
    valid,
    allowedEraseLines: valid ? new Set(cleanup.map(({ entry }) => entry.line)) : new Set(),
    findings,
  };
}

function invalidEreturnYmeanLines(content) {
  const invalid = new Set();
  const programs = [];
  for (const entry of activeLogicalEntries(content)) {
    const command = normalizeCommand(entry.text.trim());
    if (/^program\s+define\b/i.test(command)) {
      programs.push({ eclass: /,\s*eclass\b/i.test(command) });
      continue;
    }
    if (/^ereturn\s+scalar\s+ymean\s*=\s*r\(mean\)\s*$/i.test(command) && !programs.at(-1)?.eclass) invalid.add(entry.line);
    if (/^end\s*$/i.test(command) && programs.length) programs.pop();
  }
  return invalid;
}

function buildOutputFlowProfile(observed, availableState = {}) {
  const declared = availableState.output_flow_profile && typeof availableState.output_flow_profile === "object"
    ? availableState.output_flow_profile
    : null;
  const staticRows = observed.output_flow_evidence?.outcomes || [];
  const profile = declared || { outcomes: staticRows };
  const decision = analyzeOutputFlowProfile(profile);
  const failures = decision.failures;
  return {
    ...decision,
    failures,
    comparison_label_ids: [],
    source: declared ? "caller_declared_and_static_crosscheck" : "static_code_scan_only",
    outcomes: decision.outcomes.map((row) => ({
      ...row,
      evidence_source: row.evidence_source || (declared ? "caller_declared" : "static_code_scan"),
    })),
  };
}

function structuralSyntax(value) {
  const input = String(value);
  let output = "";
  let inDoubleQuote = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      inDoubleQuote = !inDoubleQuote;
      output += " ";
      continue;
    }
    if (!inDoubleQuote && char === "/" && input[index + 1] === "/") break;
    output += inDoubleQuote ? " " : char;
  }
  return output;
}

function structuralCloseCount(value) {
  const match = structuralSyntax(value).trimStart().match(/^(?:}\s*)+/);
  return match ? (match[0].match(/}/g) || []).length : 0;
}

function hasStructuralOpen(value) {
  return structuralSyntax(value).trim().replace(/;\s*$/, "").endsWith("{");
}

function readableBoundedLoopHeader(value) {
  const command = normalizeCommand(structuralSyntax(value))
    .replace(/\{\s*$/, "")
    .trim();
  if (/^foreach\s+[A-Za-z_][A-Za-z0-9_]*\s+of\s+(?:local|global|varlist|numlist)\s+\S+(?:\s+\S+)*$/i.test(command)) return true;
  if (/^foreach\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+\S+(?:\s+\S+)+$/i.test(command)) return true;
  return /^forv(?:al(?:ues)?)?\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*\S+(?:\s+\S+)*$/i.test(command);
}

function hasTexOutputContent(value) {
  const active = stripComments(value).map((row) => normalizeCommand(row.trimmed)).join("\n");
  return /^(?:texdoc|sutex)\b/im.test(active) || /\.tex(?:["'\s,)\]}]|$)/i.test(active) || /\bsty(?:le)?\s*\(\s*tex\s*\)/i.test(active);
}

function logicalStatements(value) {
  const statements = [];
  let text = "";
  let line = null;
  for (const row of stripComments(value)) {
    const continued = /\/\/\/\s*$/.test(row.trimmed);
    const fragment = row.trimmed.replace(/\/\/\/\s*$/, "").trim();
    if (line === null) line = row.line;
    text = `${text} ${fragment}`.trim();
    if (!continued) {
      statements.push({ line, text: normalizeCommand(text) });
      text = "";
      line = null;
    }
  }
  if (text) statements.push({ line, text: normalizeCommand(text) });
  return statements;
}

function graphPolicyFindings(content) {
  const statements = logicalStatements(content);
  const findings = [];
  const graphBuilders = /^(?:coefplot|event_plot|csdid_plot|twoway|graph\s+(?:bar|box|dot|matrix|pie)|marginsplot)\b/i;
  const nativeInteraction = /(?:\d+|[iboc]\d*|c)\.[A-Za-z_][A-Za-z0-9_]*\s*#\s*(?:\d+|[iboc]\d*|c)\.[A-Za-z_][A-Za-z0-9_]*/i;
  const hasMalgunGothic = statements.some((row) => /^graph\s+set\s+(?:window|print)\s+fontface\s+["']?(?:Malgun Gothic|맑은\s*고딕)["']?$/i.test(row.text));
  const eventGraphs = new Set();
  let lastGraph = null;

  for (const row of statements) {
    if (graphBuilders.test(row.text)) lastGraph = row;
    if (/^(?:event_plot|csdid_plot)\b/i.test(row.text)
      || (/^coefplot\b/i.test(row.text) && (nativeInteraction.test(row.text) || /\b(?:event|pretrend|lead|lag)[_A-Za-z0-9]*/i.test(row.text)))) {
      eventGraphs.add(row);
    }
    if (/^graph\s+(?:save|export)\b/i.test(row.text) && /event[ _-]?study|pretrend/i.test(row.text) && lastGraph) eventGraphs.add(lastGraph);
  }

  for (const row of statements) {
    if (/\brename\s*\([^)]*#[^)]*(?:=|\s)_?y(?:19|20)\d{2}\b/i.test(row.text)) {
      findings.push(finding(
        "error",
        "interaction_coefficient_alias",
        row.line,
        "factor-variable interaction 계수를 _y2015 같은 합성 별칭으로 바꿉니다.",
        "Excel에는 Stata의 원래 coefficient name을 그대로 내보내고, event-study keep()/order()도 그 raw name을 직접 사용하세요.",
      ));
    }
    if (!graphBuilders.test(row.text)) continue;
    const hasKorean = /[가-힣]/.test(row.text);
    if (eventGraphs.has(row) && hasKorean) {
      findings.push(finding(
        "error",
        "event_study_non_english",
        row.line,
        "event-study graph의 표시 문구에 한글이 있습니다.",
        "event-study title, axis title, legend, note, coefficient display labels를 모두 영어로 작성하세요.",
      ));
    } else if (hasKorean && !hasMalgunGothic && !/fontface\s*\(\s*["']?(?:Malgun Gothic|맑은\s*고딕)["']?\s*\)/i.test(row.text)) {
      findings.push(finding(
        "error",
        "korean_graph_without_malgun_gothic",
        row.line,
        "한글 표시 문구가 있는 graph에 맑은고딕이 고정되지 않았습니다.",
        "graph set window/print fontface \"Malgun Gothic\"을 선언하거나 해당 graph text에 fontface(\"Malgun Gothic\")을 지정하세요.",
      ));
    }
  }
  return findings;
}

function syntheticEventAliasToken(value) {
  const match = String(value || "").match(/^(?:(?:[A-Za-z][A-Za-z0-9_]*_)?y((?:19|20)\d{2})|_y((?:19|20)\d{2}))$/i);
  return match ? { token: match[0], year: match[1] || match[2] } : null;
}

function syntheticEventAliasFindings(content) {
  const findings = [];
  const seen = new Set();
  const add = (line, message) => {
    const key = `${line}:synthetic_event_term_alias`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(finding(
      "error",
      "synthetic_event_term_alias",
      line,
      message,
      "수동 yYYYY 변수를 만들지 말고 factor-variable expression을 회귀식에 직접 쓰세요. Excel과 event-study selector에는 e(b)의 raw coefficient name을 그대로 사용하세요.",
    ));
  };
  const statements = logicalStatements(content);
  const constructedAliases = new Map();
  const aliasTokens = (value) => {
    const knownAliases = [...constructedAliases.keys()];
    const conventional = String(value || "").match(/(?<![A-Za-z0-9_])(?:(?:treat|event|did|post|policy|quota)[A-Za-z0-9_]*_y(?:19|20)\d{2}|_y(?:19|20)\d{2})(?![A-Za-z0-9_])/gi) || [];
    const constructed = knownAliases.filter((alias) => new RegExp(`(?<![A-Za-z0-9_])${alias}(?![A-Za-z0-9_])`, "i").test(String(value || "")));
    return [...new Set([...conventional, ...constructed])];
  };
  const estimation = /^(?:(?:quietly|qui|noisily|noi|capture|cap)\s+)*(?:reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  const interactionSignal = /\b(?:treat(?:ed)?[A-Za-z0-9_]*|event[A-Za-z0-9_]*|did[A-Za-z0-9_]*|post[A-Za-z0-9_]*|policy[A-Za-z0-9_]*|quota[A-Za-z0-9_]*|lead[A-Za-z0-9_]*|lag[A-Za-z0-9_]*|cohort[A-Za-z0-9_]*|shock[A-Za-z0-9_]*|expos(?:ed|ure)?[A-Za-z0-9_]*)\b/i;

  for (const row of statements) {
    const assignment = row.text.match(/^(?:gen(?:erate)?\s+(?:(?:byte|int|long|float|double|str\d*)\s+)?|replace\s+)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
    if (assignment) {
      const alias = syntheticEventAliasToken(assignment[1]);
      if (alias) {
        const rhs = assignment[2];
        const yearComparison = new RegExp(`(?:\\b(?:year|yr|time)\\b\\s*==\\s*${alias.year}\\b|\\b${alias.year}\\s*==\\s*\\b(?:year|yr|time)\\b)`, "i");
        const interactionConstruction = /[*&]/.test(rhs)
          || /\bcond\s*\(/i.test(rhs)
          || /\binlist\s*\(\s*(?:year|yr|time)\b/i.test(rhs);
        if (yearComparison.test(rhs) && interactionConstruction) {
          constructedAliases.set(alias.token.toLowerCase(), { line: row.line, knownEventTerm: interactionSignal.test(rhs) });
        }
        if (yearComparison.test(rhs) && interactionSignal.test(rhs) && interactionConstruction) {
          add(row.line, `${alias.token}을 factor-variable interaction의 대용 합성 변수로 수동 생성합니다.`);
        }
      }
    }

    const aliases = aliasTokens(row.text);
    if (!aliases.length) continue;
    if (estimation.test(row.text)) add(row.line, `회귀식이 synthetic event term ${aliases.join(", ")}을 사용합니다.`);
    const macroAssignment = row.text.match(/^(?:local|global)\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (macroAssignment && /event|lead|lag|pre|post/i.test(macroAssignment[1])) {
      add(row.line, `event-term macro가 synthetic name ${aliases.join(", ")}을 나열합니다.`);
    }
    if (/^(?:coefplot|event_plot|csdid_plot)\b/i.test(row.text) || /\b(?:keep|order|rename)\s*\(/i.test(row.text)) {
      add(row.line, `event-study selector가 synthetic name ${aliases.join(", ")}을 사용합니다.`);
    }
  }
  for (const [alias, metadata] of constructedAliases) {
    if (metadata.knownEventTerm) continue;
    const usedAsCoefficient = statements.some((row) => estimation.test(row.text)
      && new RegExp(`\\s${alias}(?=\\s|,|$)`, "i").test(` ${row.text}`)
      && !new RegExp(`^\\s*(?:(?:quietly|qui|noisily|noi|capture|cap)\\s+)*(?:reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe)\\s+${alias}(?=\\s|,|$)`, "i").test(row.text));
    const usedAsEventSelector = statements.some((row) => (/^(?:coefplot|event_plot|csdid_plot)\b/i.test(row.text) || /\b(?:keep|order|rename)\s*\(/i.test(row.text))
      && new RegExp(`(?<![A-Za-z0-9_])${alias}(?![A-Za-z0-9_])`, "i").test(row.text));
    if (usedAsCoefficient || usedAsEventSelector) {
      add(metadata.line, `${alias}을 factor-variable interaction의 대용 합성 변수로 수동 생성합니다.`);
    }
  }
  return findings;
}

function encodedResearchDispatcherFindings(content) {
  const statements = logicalStatements(content);
  const registries = statements.filter((row) => /^(?:global|local)\s+[A-Za-z_][A-Za-z0-9_]*(?:jobs?|dispatch|registry|spec_jobs)[A-Za-z0-9_]*\b/i.test(row.text));
  const dispatcherLoops = statements.filter((row) => /^(?:foreach|forv(?:al(?:ues)?)?)\b[^\r\n]*(?:jobs?|dispatch|registry|spec_jobs)/i.test(row.text));
  const positionalParsers = statements.filter((row) => /^(?:local|global)\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*word\s+\d+\s+of\b/i.test(row.text));
  if (!registries.length || !dispatcherLoops.length || positionalParsers.length < 3) return [];
  const item = finding(
    "error",
    "encoded_research_spec_dispatch",
    registries[0].line,
    "outcome, sample, specification 또는 graph 선택을 positional word record에 인코딩해 뒤에서 해석하는 dispatcher가 감지되었습니다.",
    "실제 작업 순서가 바로 읽히도록 직접 순차 block이나 명시적인 한 단계 loop로 펼치세요. 연구 사양을 문자열 record와 word parser에 숨기지 마세요.",
    "researcher_style_reference",
  );
  item.registry_lines = registries.map((row) => row.line);
  item.dispatcher_loop_lines = dispatcherLoops.map((row) => row.line);
  item.positional_parser_lines = positionalParsers.map((row) => row.line);
  return [item];
}

function normalizeEstimationInvocation(value) {
  let command = normalizeCommand(String(value || "").trim());
  command = command.replace(/^(?:(?:quietly|qui|noisily|noi|capture|cap)\s+)+/i, "");
  const estimatorStart = /^(?:(?:quietly|qui|noisily|noi|capture|cap)\s+)*(?:reg|regr|regre|regres|regress|areg|qreg|tobit|intreg|heckman|xtreg|xtivreg|xtivreg2|reghdfe|ivregress|ivreg2|ivreghdfe|logit|logistic|clogit|xtlogit|probit|xtprobit|poisson|xtpoisson|nbreg|glm|fracreg|mixed|sem|gsem|cmp|ppmlhdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  const prefixStart = /^(?:quietly|qui|noisily|noi|capture|cap|mi\s+estimate|bootstrap|jackknife|statsby|svy|by(?:sort)?|collect|frame|bayesboot|simulate|bayes|fmm|fp|mfp|version|xi|stepwise|nestreg|rolling|permute)\b/i;
  const unquotedColon = (text) => {
    let quote = null;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (character === '"') quote = quote ? null : '"';
      if (character === ":" && !quote) return index;
    }
    return -1;
  };
  while (prefixStart.test(command)) {
    const colon = unquotedColon(command);
    if (colon < 0) break;
    const suffix = command.slice(colon + 1).trim();
    if (!estimatorStart.test(suffix) && !prefixStart.test(suffix)) break;
    command = suffix.replace(/^(?:(?:quietly|qui|noisily|noi|capture|cap)\s+)+/i, "");
  }
  command = command.replace(/^(?:(?:quietly|qui|noisily|noi|capture|cap)\s+)+/i, "");
  return command;
}

function eventInteractionScope(row, estimation, estimationMacros) {
  const command = normalizeEstimationInvocation(row.text);
  if (estimation.test(command)) return command.split(",", 1)[0];
  const macro = row.text.match(/^(?:local|global)\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:"([^"]*)"|'([^']*)'|(.+))\s*$/i);
  if (!macro) return null;
  if (!estimationMacros.has(macro[1].toLowerCase())) return null;
  return macro[2] ?? macro[3] ?? macro[4];
}

function macrosUsedByEstimation(content, estimation) {
  const names = new Set();
  for (const row of logicalStatements(content)) {
    const command = normalizeEstimationInvocation(row.text);
    if (!estimation.test(command)) continue;
    const rhs = command.split(",", 1)[0];
    for (const pattern of [/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, /`([A-Za-z_][A-Za-z0-9_]*)'/g]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(rhs))) names.add(match[1].toLowerCase());
    }
  }
  return names;
}

function eventStudyDoubleHashFindings(content) {
  const findings = [];
  const estimation = /^(?:reg|regr|regre|regres|regress|areg|qreg|tobit|intreg|heckman|xtreg|xtivreg|xtivreg2|reghdfe|ivregress|ivreg2|ivreghdfe|logit|logistic|clogit|xtlogit|probit|xtprobit|poisson|xtpoisson|nbreg|glm|fracreg|mixed|sem|gsem|cmp|ppmlhdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  const estimationMacros = macrosUsedByEstimation(content, estimation);
  const interaction = /(?<![A-Za-z0-9_.])((?:(?:(?:ibn|i)\([^)]*\)|\d+(?:bn|b|o)?|(?:ibn|bn|i|ib|b|o)\d*|c)\.)?([A-Za-z_][A-Za-z0-9_]*))\s*##\s*((?:(?:(?:ibn|i)\([^)]*\)|\d+(?:bn|b|o)?|(?:ibn|bn|i|ib|b|o)\d*|c)\.)?([A-Za-z_][A-Za-z0-9_]*))/gi;
  const timeLike = /^(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?)$/i;
  const treatmentLike = /^(?:treat(?:ed)?[A-Za-z0-9_]*|eligible[A-Za-z0-9_]*|expos(?:ed|ure)[A-Za-z0-9_]*|policy[A-Za-z0-9_]*|post[A-Za-z0-9_]*|did[A-Za-z0-9_]*|quota[A-Za-z0-9_]*|shock[A-Za-z0-9_]*)$/i;

  for (const row of logicalStatements(content)) {
    const rhs = eventInteractionScope(row, estimation, estimationMacros);
    if (!rhs) continue;
    interaction.lastIndex = 0;
    let match;
    while ((match = interaction.exec(rhs))) {
      const left = match[2];
      const right = match[4];
      if (/^c\./i.test(match[1]) || /^c\./i.test(match[3])) continue;
      if (!((timeLike.test(left) && treatmentLike.test(right)) || (treatmentLike.test(left) && timeLike.test(right)))) continue;
      findings.push(finding(
        "error",
        "event_study_double_hash_main_effects",
        row.line,
        `event-study RHS가 ${match[0]}에 ##를 사용해 불필요한 factor main-effect row를 만듭니다.`,
        "설계 기준기간을 뺀 `i(2015/2018 2020/2024).time#1.treatment` 같은 compact selected-level 단일 # 문법이나, irregular window의 level별 native 항을 사용하세요. absorb() 안의 별도 heterogeneous slope는 이 규칙의 대상이 아닙니다.",
        "researcher_style_reference",
      ));
      break;
    }
  }
  return findings;
}

function eventStudySingleHashBaseFindings(content) {
  const findings = [];
  const estimation = /^(?:reg|regr|regre|regres|regress|areg|qreg|tobit|intreg|heckman|xtreg|xtivreg|xtivreg2|reghdfe|ivregress|ivreg2|ivreghdfe|logit|logistic|clogit|xtlogit|probit|xtprobit|poisson|xtpoisson|nbreg|glm|fracreg|mixed|sem|gsem|cmp|ppmlhdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  const estimationMacros = macrosUsedByEstimation(content, estimation);
  const timeLike = /^(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?)$/i;
  const treatmentLike = /^(?:treat(?:ed)?[A-Za-z0-9_]*|eligible[A-Za-z0-9_]*|expos(?:ed|ure)[A-Za-z0-9_]*|policy[A-Za-z0-9_]*|post[A-Za-z0-9_]*|did[A-Za-z0-9_]*|quota[A-Za-z0-9_]*|shock[A-Za-z0-9_]*)$/i;
  const factor = /(?<![A-Za-z0-9_.])((?:(?:(?:ibn|i)\([^)]*\)|\d+(?:bn|b|o)?|(?:ibn|bn|i|ib|b|o)\d*|c)\.)?([A-Za-z_][A-Za-z0-9_]*))\s*#\s*((?:(?:(?:ibn|i)\([^)]*\)|\d+(?:bn|b|o)?|(?:ibn|bn|i|ib|b|o)\d*|c)\.)?([A-Za-z_][A-Za-z0-9_]*))/gi;
  const negativeEventLevel = /(?:-\d+(?:bn|b|o)?\.(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?)\s*#\s*(?:[01]|i)\.(?:treat(?:ed)?|eligible|exposed|policy|post|did|quota|shock)[A-Za-z0-9_]*|(?:[01]|i)\.(?:treat(?:ed)?|eligible|exposed|policy|post|did|quota|shock)[A-Za-z0-9_]*\s*#\s*-\d+(?:bn|b|o)?\.(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?))/i;

  for (const row of logicalStatements(content)) {
    const rhs = eventInteractionScope(row, estimation, estimationMacros);
    if (!rhs) continue;
    if (negativeEventLevel.test(rhs)) {
      findings.push(finding("error", "event_study_negative_factor_level_invalid", row.line, "Stata factor-variable categorical level은 nonnegative integer여야 하므로 음수 event level을 native factor token으로 쓸 수 없습니다.", "event time을 nonnegative integer index로 recode하고 그래프 xlabel에서 음수 상대시점 라벨을 표시하세요.", "stata_manual", "https://www.stata.com/manuals/u11.pdf"));
      continue;
    }
    factor.lastIndex = 0;
    let match;
    while ((match = factor.exec(rhs))) {
      const timeName = match[2];
      const treatmentName = match[4];
      if (/^c\./i.test(match[1]) || /^c\./i.test(match[3])) continue;
      const leftIsTime = timeLike.test(timeName);
      const rightIsTime = timeLike.test(treatmentName);
      const leftIsTreatment = treatmentLike.test(timeName);
      const rightIsTreatment = treatmentLike.test(treatmentName);
      if (!((leftIsTime && rightIsTreatment) || (rightIsTime && leftIsTreatment))) continue;
      const timeFactor = leftIsTime ? match[1] : match[3];
      const hasLevelSpecificNoBase = /^\d+bn\./i.test(timeFactor);
      const hasFullSupportExplicitBase = /^ib\d+\./i.test(timeFactor);
      const compact = timeFactor.match(/^i\(([^)]*)\)\./i);
      if (compact) {
        const tokens = compact[1].trim().split(/\s+/).filter(Boolean);
        const validTokens = tokens.length > 0 && tokens.length <= 200 && tokens.every((token) => /^\d+(?:\/\d+)?$/.test(token));
        if (!validTokens) {
          findings.push(finding(
            "error",
            "event_study_compact_numlist_invalid",
            row.line,
            `event-study compact selected-level 목록 ${compact[1]}을 정수 또는 정수 범위 numlist로 검증할 수 없습니다.`,
            "`i(2015/2018 2020/2024).year#1.treat2019`처럼 명시적인 정수 수준과 범위만 쓰고 실제 raw e(b) 이름을 runtime에서 확인하세요.",
            "researcher_style_reference",
          ));
          break;
        }
        const selected = new Set();
        let cumulativeLevels = 0;
        for (const token of tokens) {
          const [startText, endText] = token.split("/");
          const start = Number(startText);
          const end = endText === undefined ? start : Number(endText);
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
            findings.push(finding("error", "event_study_compact_numlist_invalid", row.line, "event-study compact numlist에 JavaScript와 Stata lint가 안전하게 열거할 수 없는 정수가 있습니다.", "안전한 유한 정수 수준만 직접 쓰세요.", "researcher_style_reference"));
            break;
          }
          cumulativeLevels += Math.abs(end - start) + 1;
          if (cumulativeLevels > 20000) {
            findings.push(finding("error", "event_study_compact_numlist_invalid", row.line, "event-study compact numlist가 중복을 포함해 너무 많은 수준을 열거합니다.", "중복 없는 짧은 event window만 직접 쓰세요.", "researcher_style_reference"));
            break;
          }
          const step = start <= end ? 1 : -1;
          if (Math.abs(end - start) > 10000) {
            findings.push(finding("error", "event_study_compact_numlist_invalid", row.line, "event-study compact numlist 범위가 비정상적으로 큽니다.", "설계된 event window의 유한한 정수 수준만 직접 쓰세요.", "researcher_style_reference"));
            break;
          }
          for (let value = start; ; value += step) {
            selected.add(value);
            if (value === end) break;
          }
        }
        const ordered = [...selected].sort((a, b) => a - b);
        if (!ordered.length || ordered.length > 10001 || ordered.at(-1) - ordered[0] > 10000) {
          findings.push(finding("error", "event_study_compact_numlist_invalid", row.line, "event-study compact numlist의 전체 수준 범위가 안전한 lint 한도를 넘습니다.", "설계된 event window의 유한한 수준만 직접 쓰고, irregular window이면 level-specific native 항을 사용하세요.", "researcher_style_reference"));
          break;
        }
        const missingInterior = [];
        for (let value = ordered[0]; value <= ordered.at(-1); value += 1) if (!selected.has(value)) missingInterior.push(value);
        if (missingInterior.length !== 1) {
          findings.push(finding(
            "error",
            "event_study_compact_reference_not_unique",
            row.line,
            `compact selected-level RHS의 최소·최대 수준 사이에서 빠진 기준기간 후보가 ${missingInterior.length}개라 하나의 설계 기준기간을 확인할 수 없습니다.`,
            "regular event window이면 정확히 한 기준기간만 selected-level 목록에서 빼세요. 여러 간격을 가진 irregular window이면 level-specific native no-base 항을 직접 쓰세요.",
            "researcher_style_reference",
          ));
          break;
        }
        continue;
      }
      if (hasLevelSpecificNoBase || hasFullSupportExplicitBase) continue;
      findings.push(finding(
        "error",
        "event_study_single_hash_base_not_explicit",
        row.line,
        `event-study RHS가 ${match[0]}에 단일 #를 쓰지만 비기준 수준 전체를 보존하는 기준기간 문법이 없습니다.`,
        "지정한 창은 `i(2015/2018 2020/2024).year#1.treat`처럼 compact selected-level 문법으로 쓰거나, irregular window이면 설계 기준기간을 뺀 level별 native 항으로 쓰세요. 전체 관측 support가 곧 event window일 때만 ib2019.year#1.treat를 사용할 수 있습니다.",
        "researcher_style_reference",
      ));
      break;
    }
  }
  return findings;
}

function isSafeBindingStatement(raw) {
  const command = normalizeCommand(String(raw || "").trim());
  if (/^sysuse\s+[A-Za-z_][A-Za-z0-9_]*\s*,\s*clear\s*$/i.test(command)) return true;
  if (/^use\s+(?:"[^"]+"|'[^']+'|[^\s,]+)\s*,\s*clear\s*$/i.test(command) && !/\b(?:if|in)\b/i.test(command)) return true;
  if (/^version\s+\d+(?:\.\d+)?\s*$/i.test(command)) return true;
  if (/^set\s+(?:more|varabbrev)\s+(?:on|off)\s*$/i.test(command)) return true;
  if (/^confirm\s+(?:variable|numeric\s+variable|string\s+variable)\s+[A-Za-z_][A-Za-z0-9_]*\s*$/i.test(command)) return true;
  if (/^(?:describe|codebook|count)\b[^{}]*$/i.test(command)) return true;
  if (/^assert\s+[^{}]+$/i.test(command)) return true;
  if (/^global\s+[A-Za-z_][A-Za-z0-9_]*\s+(?:"(?:[^"\s]+[\\/][^"]+)"|'(?:[^'\s]+[\\/][^']+)')\s*$/i.test(command)) return true;
  if (/^encode\s+[A-Za-z_][A-Za-z0-9_]*\s*,\s*gen(?:erate)?\s*\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*$/i.test(command)) return true;
  if (/^label\s+var(?:iable)?\s+[A-Za-z_][A-Za-z0-9_]*\s+(?:"[^"]*"|'[^']*')\s*$/i.test(command)) return true;
  if (/^graph\s+save\s+(?:"[^"]+\.gph"|'[^']+\.gph'|[^\s,]+\.gph)\s*,\s*replace\s*$/i.test(command)) return true;
  if (/^append\s+using\s+(?:"[^"]+"|'[^']+'|[^\s,]+)(?:\s+(?:"[^"]+"|'[^']+'|[^\s,]+))*\s*$/i.test(command)) return true;
  if (/^(?:sum|summarize)\s+[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*\s*$/i.test(command)) return true;
  if (/^tabstat\s+[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*,\s*(?:stat|statistics)\s*\([^)]*\)\s*)?$/i.test(command)) return true;
  if (/^estimates\s+clear\s*$/i.test(command)) return true;
  if (/^do\s+(?:"[^"]+"|'[^']+'|[^\s]+)\s*$/i.test(command)) return true;
  if (/^(?:(?:capture|cap)\s+)?log\s+close(?:\s+_all)?\s*$/i.test(command)) return true;
  if (/^log\s+using\s+(?:"[^"]+"|'[^']+'|[^\s,]+)\s*,\s*(?:replace|append)\s*$/i.test(command)) return true;
  return false;
}

function directFallbackMarkerFindings(content) {
  const findings = [];
  for (const [index, raw] of String(content || "").split(/\r?\n/).entries()) {
    const line = index + 1;
    if (!/^\s*\*\s+(?:BEGIN DIRECT FALLBACK(?::.*?)?|END DIRECT FALLBACK)\s*$/i.test(raw)) continue;
    findings.push(finding(
      "error",
      "direct_fallback_markers_forbidden",
      line,
      "legacy provenance marker를 연구 .do 코드에 넣을 수 없습니다.",
      "legacy marker를 제거하고 프로젝트 루트 report.md의 general_rule 행에 정확한 target과 line span을 기록하세요.",
      "researcher_style_reference",
    ));
  }
  return findings;
}

function danglingLineContinuationFindings(content) {
  const lines = String(content || "").split(/\r?\n/);
  const findings = [];
  const commandStart = /^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:version|set|use|sysuse|import|append|merge|reshape|generate|gen|replace|recode|egen|clonevar|encode|decode|destring|tostring|rename|label|format|keep|drop|sort|order|collapse|contract|statsby|confirm|assert|describe|codebook|count|summarize|sum|tabstat|isid|xtset|regress|reg|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|csdid|did_imputation|eventstudyinteract|estadd|estimates|outreg2|putexcel|collect|coefplot|event_plot|csdid_plot|graph|twoway|save|log|local|global|matrix|scalar|postfile|post|postclose|foreach|forvalues|while|if|else|program|syntax|preserve|restore|erase|display|exit|do|run|include)\b/i;
  const qualifierCommand = /^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:append|merge|reshape|generate|gen|replace|recode|egen|keep|drop|sort|collapse|contract|statsby|assert|count|summarize|sum|tabstat|regress|reg|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|csdid|did_imputation|eventstudyinteract|outreg2|coefplot|twoway)\b/i;
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\/\/\/\s*$/.test(lines[index])) continue;
    let contextStart = index;
    while (contextStart > 0 && /\/\/\/\s*$/.test(lines[contextStart - 1])) contextStart -= 1;
    const commandContext = lines.slice(contextStart, index + 1)
      .map((line) => line.replace(/\/\/\/\s*$/, "").trim())
      .join(" ")
      .trim();
    const next = index + 1 < lines.length ? lines[index + 1].trim() : "";
    const rootIndent = (lines[contextStart].match(/^\s*/) || [""])[0].length;
    const nextIndent = index + 1 < lines.length
      ? (lines[index + 1].match(/^\s*/) || [""])[0].length
      : 0;
    if (/^(?:\*|\/\/[^/]|\/\*)/.test(next)) {
      findings.push(finding(
        "error",
        "dangling_line_continuation",
        index + 1,
        "/// 바로 다음 물리행이 같은 명령의 연속행이 아니라 주석입니다.",
        "주석은 명령 밖으로 옮기고, /// 다음 물리행에는 이어지는 옵션 또는 식을 두세요.",
        "stata_manual",
        "https://www.stata.com/manuals/u.pdf",
      ));
      continue;
    }
    const qualifierContinues = qualifierCommand.test(commandContext)
      && /^(?:if|in)\b/i.test(next)
      && !/\{\s*$/.test(next);
    const outreg2OptionContinues = /^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*outreg2\b/i.test(commandContext)
      && /^(?:replace|append)\b/i.test(next)
      && !/=/.test(next);
    const coefplotOptionContinues = /^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*coefplot\b/i.test(commandContext)
      && /^(?:keep|order)\s*\(/i.test(next);
    const indentedOptionContinues = /,\s*$/.test(commandContext) && nextIndent > rootIndent;
    const alignedUnknownCommand = !commandStart.test(next)
      && /^[A-Za-z_][A-Za-z0-9_]*(?:\s|,|\()/i.test(next)
      && nextIndent <= rootIndent;
    if (next && next !== "}" && !/^end\b/i.test(next)
      && !alignedUnknownCommand
      && (qualifierContinues || outreg2OptionContinues || coefplotOptionContinues || indentedOptionContinues || !commandStart.test(next))) continue;
    findings.push(finding(
      "error",
      "dangling_line_continuation",
      index + 1,
      "/// 뒤에 같은 명령을 이어 갈 물리행이 없습니다.",
      "///는 바로 다음 물리행에 같은 명령이 계속될 때만 두고, 마지막 옵션 또는 마지막 물리행에서는 제거하세요.",
      "stata_manual",
      "https://www.stata.com/manuals/u.pdf",
    ));
  }
  return findings;
}

function eventStudyPresentationFindings(content, authoringState = "existing_audit") {
  const statements = logicalStatements(content);
  const findings = [];
  const rawTitle = /\btitle\s*\(\s*"?(`?[A-Za-z_][A-Za-z0-9_]*'?)"?\s*(?:,\s*[^)]*(?:\([^)]*\)[^)]*)*)?\)/i;
  const bottomLegend = /\blegend\s*\([\s\S]*\bposition\s*\(\s*6\s*\)/i;
  const eventSignal = /\b(?:event|event_time|eventtime|rel_time|relative_time|pretrend|lead|lag|pre|post)[_A-Za-z0-9]*/i;
  const eventSelector = /(?:(?:\*|-?\d+(?:bn|b|o)?)\.(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?)#(?:[01]|i)\.(?:treat(?:ed)?[A-Za-z0-9_]*|eligible[A-Za-z0-9_]*|exposed[A-Za-z0-9_]*|policy[A-Za-z0-9_]*|post[A-Za-z0-9_]*|did[A-Za-z0-9_]*|quota[A-Za-z0-9_]*|shock[A-Za-z0-9_]*)|(?:event|lead|lag|pretrend|rel_time|relative_time|event_time)[A-Za-z0-9_]*\s*#)/i;

  for (let index = 0; index < statements.length; index += 1) {
    const row = statements[index];
    const reverseEventTokens = row.text.match(/(?:[01]|i)\.(?:treat(?:ed)?[A-Za-z0-9_]*|eligible[A-Za-z0-9_]*|exposed[A-Za-z0-9_]*|policy[A-Za-z0-9_]*|post[A-Za-z0-9_]*|did[A-Za-z0-9_]*|quota[A-Za-z0-9_]*|shock[A-Za-z0-9_]*)#-?\d+(?:bn|b|o)?\.(?:year|yr|time|period|wave|rel(?:ative)?_?time|event(?:_?(?:time|index|year))?)/gi) || [];
    const isEventGraph = /^(?:event_plot|csdid_plot)\b/i.test(row.text)
      || (/^coefplot\b/i.test(row.text) && (eventSignal.test(row.text) || eventSelector.test(row.text) || reverseEventTokens.length >= 2));
    if (!isEventGraph) continue;
    const title = row.text.match(rawTitle);
    if (!title || !/^(?:`[A-Za-z_][A-Za-z0-9_]*'|[A-Za-z_][A-Za-z0-9_]*)$/.test(title[1])) {
      findings.push(finding("error", "event_study_raw_outcome_title", row.line, "event-study 상단 제목이 raw outcome variable name 하나로 고정되지 않았습니다.", "title(\"`outcome'\")처럼 raw 변수명만 두고 설명 문구는 축 또는 문서에 남기세요.", "researcher_style_reference"));
    }
    if (!bottomLegend.test(row.text) || /\blegend\s*\(\s*off\s*\)/i.test(row.text)) {
      findings.push(finding("error", "event_study_bottom_legend", row.line, "event-study comparison/sample legend가 축 하단에 있지 않습니다.", "legend(position(6) rows(1))을 사용하고 비교 대상을 읽을 수 있는 label을 유지하세요.", "researcher_style_reference"));
    }
    if (authoringState !== "existing_audit" && /^coefplot\b/i.test(row.text)) {
      const keep = row.text.match(/\bkeep\s*\(([^)]*)\)/i)?.[1] || "";
      if (!keep || /[*?]/.test(keep) || /\$|`[A-Za-z_][A-Za-z0-9_]*'/.test(keep)) {
        findings.push(finding("error", "event_study_selector_not_exact", row.line, "새 event-study graph의 keep()이 observed raw e(b) token의 literal exact 목록이 아닙니다.", "runtime에서 관측한 raw e(b) token을 wildcard나 macro 없이 keep()에 직접 쓰세요.", "researcher_style_reference"));
      }
      const order = row.text.match(/\border\s*\(([^)]*)\)/i)?.[1] || "";
      const keepTokens = keep.trim().split(/\s+/).filter(Boolean);
      const orderTokens = order.trim().split(/\s+/).filter(Boolean);
      const blankSlots = orderTokens.filter((token) => token === ".").length;
      if (blankSlots !== 1) {
        findings.push(finding("error", "event_study_reference_slot_missing", row.line, "새 event-study graph의 order()에 omitted reference를 나타내는 blank `.` slot이 정확히 하나 있지 않습니다.", "exact raw coefficient order 사이의 설계 기준 위치에 `.` 하나를 넣으세요.", "researcher_style_reference"));
      }
      if (!/\bvertical\b/i.test(row.text)) {
        findings.push(finding("error", "event_study_vertical_missing", row.line, "새 event-study graph가 event positions를 x축에 두는 vertical orientation을 명시하지 않았습니다.", "coefplot 옵션에 `vertical`을 직접 쓰고 x labels, reference point, policy boundary를 같은 x좌표계에 두세요.", "researcher_style_reference"));
      }
      const blankPosition = orderTokens.indexOf(".") + 1;
      const orderedCoefficients = orderTokens.filter((token) => token !== ".");
      const selectorOrderConsistent = blankSlots === 1
        && keepTokens.length === orderedCoefficients.length
        && keepTokens.every((token, position) => token === orderedCoefficients[position]);
      if (!selectorOrderConsistent) {
        findings.push(finding("error", "event_study_selector_order_mismatch", row.line, "event-study order()의 nonblank raw coefficient 목록이 keep()과 정확히 일치하지 않습니다.", "keep()의 observed raw e(b) token을 같은 목록과 순서로 order()에 쓰고 omitted reference 위치에만 `.` 하나를 삽입하세요.", "researcher_style_reference"));
      }
      const xlabel = row.text.match(/\bxlabel\s*\(([^)]*)\)/i)?.[1] || "";
      const xlabelPositions = [...xlabel.matchAll(/(-?\d+(?:\.\d+)?)\s+"[^"]*"/g)].map((match) => Number(match[1]));
      const expectedPositions = orderTokens.map((_token, position) => position + 1);
      const scatterPosition = Number(row.text.match(/\baddplot\s*\(\s*scatteri\s+0\s+(-?\d+(?:\.\d+)?)/i)?.[1]);
      const policyPosition = Number(row.text.match(/\bxline\s*\(\s*(-?\d+(?:\.\d+)?)/i)?.[1]);
      const coordinatesConsistent = blankSlots === 1
        && sameInventory(xlabelPositions, expectedPositions)
        && xlabelPositions.length === expectedPositions.length
        && scatterPosition === blankPosition
        && policyPosition === blankPosition + 0.5;
      if (!coordinatesConsistent) {
        findings.push(finding("error", "event_study_reference_coordinates_missing", row.line, "새 event-study graph에 blank reference slot에서 파생된 x labels, zero reference point, 또는 policy boundary가 모두 보이지 않습니다.", "order()의 한 blank slot과 같은 좌표계를 쓰는 xlabel(), addplot(scatteri 0 ...), xline()을 직접 명시하세요.", "researcher_style_reference"));
      }
    }
    const next = statements[index + 1];
    if (!next || !/^graph\s+export\b/i.test(next.text) || !/\.pdf(?:["']|\s|,|$)/i.test(next.text)) {
      findings.push(finding("error", "event_study_pdf_not_immediate", row.line, "event-study graph 직후 PDF export가 없습니다.", "graph 다음 문장으로 graph export ...pdf, replace를 실행하세요. outcome이 하나면 loop 없이, 둘 이상이면 하나의 flat loop 안에서 처리합니다.", "researcher_style_reference"));
    }
  }
  return findings;
}

function estimabilityRiskFindings(content) {
  const findings = [];
  const estimationPattern = /^(?:reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe|ppmlhdfe|poisson)\b/i;
  for (const statement of logicalStatements(content)) {
    const command = normalizeCommand(statement.text);
    if (!estimationPattern.test(command)) continue;
    const hasEntityTrend = /(?:absorb\s*\([^)]*|\s)(?:i\.)?[A-Za-z_][A-Za-z0-9_]*(?:##|#)c\.[A-Za-z_][A-Za-z0-9_]*/i.test(command);
    const hasDynamicFactorFamily = /(?:^|\s)\d+(?:bn|b|o)?\.[A-Za-z_][A-Za-z0-9_]*#\d+(?:bn|b|o)?\.[A-Za-z_][A-Za-z0-9_]*/i.test(command)
      || /(?:^|\s)(?:i\.)?[A-Za-z_][A-Za-z0-9_]*#(?:i\.)?[A-Za-z_][A-Za-z0-9_]*/i.test(command);
    if (!hasEntityTrend || !hasDynamicFactorFamily) continue;
    findings.push(finding(
      "warning",
      "estimability_runtime_required",
      statement.line,
      "entity-specific linear trend와 dynamic factor family가 같은 추정식에 있어 일부 event coefficient의 추정 가능성은 정적으로 확정할 수 없습니다.",
      "실행 후 model별 matrix e(b)의 exact colfullnames를 readback하고 선언한 nonreference term의 estimated, omitted, missing 상태를 확인하세요.",
      "substantive_validity",
    ));
  }
  return findings;
}

function namedSampleFlowPostfileLines(content) {
  const statements = logicalStatements(content).map((row) => ({
    line: row.line,
    command: normalizeCommand(row.text),
  }));
  const approved = new Set();
  for (let declarationIndex = 0; declarationIndex < statements.length; declarationIndex += 1) {
    const row = statements[declarationIndex];
    if (!/^postfile\b/i.test(row.command)) continue;
    const match = row.command.match(/^postfile\s+(\S+)\s+([\s\S]+?)\s+using\s+([^,]+)\s*,\s*([\s\S]+)$/i);
    if (!match) continue;
    const [, handle, schema, outputPath, options] = match;
    const hasCheckpoint = /\bstr\d*\s+(?:checkpoint|sample_step|stage)\b/i.test(schema);
    const hasCount = /\b(?:byte|int|long|float|double)\s+(?:n|count|observations)\b/i.test(schema);
    const namedOutput = /sample[_ -]?flow/i.test(outputPath);
    const replacesDeclaredOutput = /\breplace\b/i.test(options);
    const coefficientSchema = /\b(?:estimate|coefficient|coef|beta|std(?:_?err(?:or)?)?|se|ci_(?:lo|hi)|p_?value)\b/i.test(schema);
    if (!hasCheckpoint || !hasCount || !namedOutput || !replacesDeclaredOutput || coefficientSchema) continue;

    const escapedHandle = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const postPattern = new RegExp(`^post\\s+${escapedHandle}\\s+\\(\"[^\"]+\"\\)\\s+\\((?:_N|r\\(N\\))\\)\\s*$`, "i");
    const closePattern = new RegExp(`^postclose\\s+${escapedHandle}\\s*$`, "i");
    const posts = statements
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => index > declarationIndex && new RegExp(`^post\\s+${escapedHandle}(?:\\s|$)`, "i").test(item.command));
    if (posts.length < 2 || posts.some(({ item }) => !postPattern.test(item.command))) continue;
    const closes = statements
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => index > declarationIndex && closePattern.test(item.command));
    if (closes.length !== 1 || closes[0].index <= posts.at(-1).index) continue;
    approved.add(row.line);
  }
  return approved;
}

function finding(severity, rule, line, message, suggestion, basis = "replication_safety", source = null) {
  return { severity, rule, line, message, suggestion, basis, source };
}

function parseMasterInventory(value, { allowNone = true, allowActiveDataset = true } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return { valid: false, items: [] };
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) return { valid: false, items: [] };
  const normalized = [];
  for (const token of tokens) {
    if (allowNone && /^none\.?$/i.test(token)) {
      if (tokens.length !== 1) return { valid: false, items: [] };
      return { valid: true, items: [] };
    }
    if (allowActiveDataset && /^(?:active(?:-memory)?\s+dataset|dataset\s+in\s+memory)\.?$/i.test(token)) {
      normalized.push("@active_dataset");
      continue;
    }
    const unquoted = token.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_match, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
    const slashNormalized = String(unquoted || "").replaceAll("\\", "/");
    const base = slashNormalized.split("/").at(-1) || "";
    if (!slashNormalized || /[*?]/.test(slashNormalized) || /\/$/.test(slashNormalized) || !/\.[^./\s]+$/.test(base)) {
      return { valid: false, items: [] };
    }
    normalized.push(slashNormalized.toLowerCase());
  }
  return { valid: true, items: [...new Set(normalized)] };
}

function sameInventory(left, right) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function describesCallRole(value) {
  const text = String(value || "").trim();
  return /[\p{L}\p{N}]/u.test(text)
    && !/^(?:Project\s+Inputs?|Project\s+Outputs?|Inputs?|Outputs?)\s*:/i.test(text);
}

function masterCallRoleCommentAudit(content, role, authoringState = "existing_audit") {
  if (!/^(?:master|entrypoint|new_master)$/i.test(String(role || ""))) return { findings: [], valid_lines: new Set() };
  if (authoringState === "existing_audit") return { findings: [], valid_lines: new Set() };
  const physicalLines = String(content || "").split(/\r?\n/);
  const findings = [];
  const validLines = new Set();
  const contractSeverity = authoringState === "new" ? "error" : "warning";
  const firstActiveLine = stripComments(content)[0]?.line || physicalLines.length + 1;
  const header = physicalLines.slice(0, Math.max(0, firstActiveLine - 1)).join("\n");
  const headerInputs = header.match(/^(?:\s*(?:\*|\/\/|\/\*)\s*)?Project\s+Inputs\s*:\s*(.+)$/im);
  const headerOutputs = header.match(/^(?:\s*(?:\*|\/\/|\/\*)\s*)?Project\s+Outputs\s*:\s*(.+)$/im);
  const parsedHeaderInputs = parseMasterInventory(headerInputs?.[1]);
  const parsedHeaderOutputs = parseMasterInventory(headerOutputs?.[1], { allowActiveDataset: false });
  if (!headerInputs || !parsedHeaderInputs.valid) {
    findings.push(finding(
      contractSeverity,
      "master_project_inputs_comment_missing",
      1,
      "masters.do 상단에 정확한 persistent project input 파일 목록이 없습니다.",
      "첫 실행문 앞에 `* Project Inputs: data/raw/source.dta`처럼 comma-separated 실제 파일명을 쓰세요. Fileless 시작이면 `Project Inputs: none`을 쓰고, 명시적 memory handoff이면 `active dataset`을 쓸 수 있습니다.",
      "researcher_style_reference",
    ));
  }
  if (!headerOutputs || !parsedHeaderOutputs.valid) {
    findings.push(finding(
      contractSeverity,
      "master_project_outputs_comment_missing",
      1,
      "masters.do 상단에 정확한 persistent project output 파일 목록이 없습니다.",
      "첫 실행문 앞에 `* Project Outputs: data/final/analysis_panel.dta, table/results.xlsx, figures/event_study.pdf`처럼 실제 파일명을 쓰세요.",
      "researcher_style_reference",
    ));
  }
  const calls = [];
  for (const entry of activeLogicalEntries(content)) {
    const command = normalizeCommand(entry.text.trim());
    if (!/^do\s+/i.test(command)) continue;
    const block = [];
    for (let index = entry.line - 2; index >= 0; index -= 1) {
      const line = String(physicalLines[index] || "").trim();
      if (!line) continue;
      const comment = line.match(/^(?:\*|\/\/)\s*(.+)$/) || line.match(/^\/\*\s*(.+?)\s*\*\/$/);
      if (!comment) break;
      block.unshift(String(comment[1] || "").trim());
    }
    const input = block.find((line) => /^Input\s*:/i.test(line));
    const output = block.find((line) => /^Output\s*:/i.test(line));
    const roleLine = block.find((line) => describesCallRole(line));
    const inputValue = String(input || "").replace(/^Input\s*:\s*/i, "");
    const outputValue = String(output || "").replace(/^Output\s*:\s*/i, "");
    const parsedInput = parseMasterInventory(inputValue);
    const parsedOutput = parseMasterInventory(outputValue, { allowActiveDataset: false });
    const exactInput = parsedInput.valid;
    const exactOutput = parsedOutput.valid;
    if (!exactInput) {
      findings.push(finding(
        contractSeverity,
        "master_call_input_comment_missing",
        entry.line,
        "master do-file의 개별 do 호출 직전 block에 정확한 Input 파일 주석이 없습니다.",
        "호출 직전의 연속 주석 block에 comma-separated 실제 파일명, `Input: none`, 또는 명시적 `Input: active dataset`을 쓰세요.",
        "researcher_style_reference",
      ));
    }
    if (!exactOutput) {
      findings.push(finding(
        contractSeverity,
        "master_call_output_comment_missing",
        entry.line,
        "master do-file의 개별 do 호출 직전 block에 정확한 Output 파일 또는 Output: none 주석이 없습니다.",
        "호출 직전의 연속 주석 block에 `* Output: table/summary.xlsx` 또는 `* Output: none`을 쓰세요.",
        "researcher_style_reference",
      ));
    }
    if (!roleLine) {
      findings.push(finding(
        "warning",
        "master_call_role_comment_missing",
        entry.line,
        `${authoringState === "new" ? "새" : "수정 중인"} master do-file에서 해당 do 호출의 project-local 역할을 알려 주는 주석을 찾지 못했습니다.`,
        "해당 호출 전의 주석 영역에 `* 분석용 패널 생성`처럼 짧고 명확한 역할 설명을 쓰세요. 문장 종결 기호나 빈 줄 배치는 판정하지 않습니다.",
        "researcher_style_reference",
      ));
    }
    if (exactInput && exactOutput && roleLine) validLines.add(entry.line);
    if (exactInput && exactOutput) calls.push({ line: entry.line, inputs: parsedInput.items, outputs: parsedOutput.items });
  }
  if (headerInputs && headerOutputs && parsedHeaderInputs.valid && parsedHeaderOutputs.valid && calls.length) {
    const produced = new Set();
    const externalInputs = new Set();
    const allOutputs = new Set();
    for (const call of calls) {
      for (const input of call.inputs) if (!produced.has(input)) externalInputs.add(input);
      for (const output of call.outputs) {
        produced.add(output);
        allOutputs.add(output);
      }
    }
    if (!sameInventory(parsedHeaderInputs.items, [...externalInputs])) {
      findings.push(finding(
        contractSeverity,
        "master_project_inputs_inventory_mismatch",
        1,
        "Project Inputs 목록이 실행순서상 앞선 call output에서 만들어지지 않는 개별 call input 전체와 일치하지 않습니다.",
        "각 Input을 호출 순서대로 대조해 외부에서 들어오는 파일 또는 상태만 Project Inputs에 빠짐없이, 중복 없이 쓰세요.",
        "researcher_style_reference",
      ));
    }
    if (!sameInventory(parsedHeaderOutputs.items, [...allOutputs])) {
      findings.push(finding(
        contractSeverity,
        "master_project_outputs_inventory_mismatch",
        1,
        "Project Outputs 목록이 개별 call의 persistent Output 전체와 일치하지 않습니다.",
        "각 call의 Output을 합친 정확한 목록을 Project Outputs에 빠짐없이, 추가 항목 없이 쓰세요.",
        "researcher_style_reference",
      ));
    }
  }
  return { findings, valid_lines: validLines };
}

function commandPositionMacroFindings(content, authoringState = "existing_audit") {
  const severity = authoringState === "new" ? "error" : "warning";
  return logicalStatements(content).flatMap((row) => {
    const command = normalizeCommand(row.text);
    const commandMacro = command.match(/^(\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?|`([A-Za-z_][A-Za-z0-9_]*)')(?=\s|,|$)/i);
    if (!commandMacro) return [];
    return [finding(
      severity,
      "command_position_macro_indirection",
      row.line,
      `실행할 명령 자체가 ${commandMacro[1]} macro 뒤에 숨겨져 안전성과 point-of-use 동작을 검사할 수 없습니다.`,
      "명령 이름은 직접 쓰고 필요한 경로 macro는 명령의 file-path 인자 위치에서만 사용하세요.",
      "researcher_style_reference",
    )];
  });
}

function safetyCriticalMacroIndirectionFindings(content) {
  const findings = [];
  const approvedDirectOutreg2Stats = directOutreg2StatisticLines(content);
  for (const row of logicalStatements(content)) {
    const command = normalizeCommand(row.text);
    const macro = /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|`[A-Za-z_][A-Za-z0-9_]*'/;
    const mergeHead = command.match(/^merge\s+([\s\S]*?)\busing\b/i)?.[1] || "";
    const optionTail = command.includes(",") ? command.slice(command.indexOf(",") + 1) : "";
    if (/^merge\b/i.test(command) && macro.test(mergeHead)) {
      findings.push(finding("error", "merge_contract_macro_indirection", row.line, "merge cardinality 또는 key가 macro 뒤에 숨겨져 결합 계약을 검사할 수 없습니다.", "merge 1:1, 1:m, m:1과 key를 명령에 직접 쓰고 using 경로에만 directory macro를 사용하세요.", "researcher_style_reference"));
    }
    if (/^duplicates\s+drop\b/i.test(command) && macro.test(command)) {
      findings.push(finding("error", "destructive_option_macro_indirection", row.line, "duplicates drop의 변수 또는 삭제 option이 macro 뒤에 숨겨져 있습니다.", "삭제 대상과 option을 명령에 직접 쓰고 force를 사용하지 마세요.", "researcher_style_reference"));
    }
    if (/^(?:ssc|net|github)\b/i.test(command) && macro.test(command)) {
      findings.push(finding("error", "runtime_install_macro_indirection", row.line, "설치 verb 또는 package가 macro 뒤에 숨겨져 runtime 설치 검사를 우회합니다.", "연구 do-file에서 설치 명령을 제거하세요.", "researcher_style_reference"));
    }
    const outreg2TailForAudit = approvedDirectOutreg2Stats.has(row.line)
      ? optionTail.replace(/\baddstat\s*\(\s*Dep\.\s*variable\s*mean\s*,\s*`[A-Za-z_][A-Za-z0-9_]*'\s*\)/i, "")
      : optionTail;
    if (/^outreg2\b/i.test(command) && macro.test(outreg2TailForAudit)) {
      findings.push(finding("error", "outreg2_option_macro_indirection", row.line, "outreg2 option이 macro 뒤에 숨겨져 raw-row 보존 계약을 검사할 수 없습니다.", "replace/append, excel, nor2와 허용 통계 option을 호출부에 직접 쓰고 keep/drop/addstat 같은 row 변형을 숨기지 마세요.", "researcher_style_reference"));
    }
    if (/^coefplot\b/i.test(command)) {
      const selectors = [...command.matchAll(/\b(?:keep|order)\s*\(([^)]*)\)/gi)].map((match) => match[1]);
      if (selectors.some((selector) => macro.test(selector) || /[*?]/.test(selector))) {
        findings.push(finding("error", "coefplot_selector_not_exact", row.line, "coefplot keep()/order()가 macro 또는 wildcard를 사용해 observed raw coefficient의 exact selector가 아닙니다.", "runtime e(b)에서 관측한 raw coefficient token을 keep()과 order()에 literal exact 목록으로 직접 쓰세요.", "researcher_style_reference"));
      }
    }
  }
  return findings;
}

function regressionSubstantiveIndirectionFindings(content, authoringState = "existing_audit") {
  if (authoringState === "existing_audit") return [];
  const findings = [];
  const loopIterators = new Set();
  for (const row of logicalStatements(content)) {
    const match = row.text.match(/^foreach\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:of\s+(?:local|global|varlist|numlist)\s+\S+|in\s+.+?)\s*\{/i);
    if (match) loopIterators.add(match[1].toLowerCase());
  }
  const estimation = /^(?:reg|regr|regre|regres|regress|areg|qreg|tobit|intreg|heckman|xtreg|xtivreg|xtivreg2|reghdfe|ivregress|ivreg2|ivreghdfe|logit|logistic|clogit|xtlogit|probit|xtprobit|poisson|xtpoisson|nbreg|glm|fracreg|mixed|sem|gsem|cmp|ppmlhdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  for (const row of logicalStatements(content)) {
    const command = normalizeEstimationInvocation(row.text);
    const estimator = command.match(estimation);
    if (!estimator) continue;
    let remainder = command.slice(estimator[0].length).trimStart();
    const outcome = remainder.match(/^`([A-Za-z_][A-Za-z0-9_]*)'/);
    if (outcome && loopIterators.has(outcome[1].toLowerCase())) remainder = remainder.slice(outcome[0].length);
    const macro = remainder.match(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?|`([A-Za-z_][A-Za-z0-9_]*)'/);
    if (!macro) continue;
    findings.push(finding(
      authoringState === "new" ? "error" : "warning",
      "regression_substantive_indirection",
      row.line,
      `회귀의 substantive specification이 ${macro[0]} macro 뒤에 숨겨져 point-of-use reference depth가 0이 아닙니다.`,
      "outcome iterator 하나만 flat loop에서 허용하고 treatment, event window, controls, sample, fixed effects, weights, VCE는 estimation block에 직접 쓰세요.",
      "researcher_style_reference",
    ));
  }
  return findings;
}

function substantiveMacroAliasChainFindings(content, authoringState = "existing_audit") {
  if (authoringState === "existing_audit") return [];
  const findings = [];
  const substantive = /(?:^|_)(?:outcomes?|depvars?|controls?|covariates?|samples?|events?|selectors?|keep|order|references?|clusters?|fixed_?effects?|rhs|absorb|vce|weights?|specs?|current)(?:_|$)/i;
  for (const row of logicalStatements(content)) {
    const command = normalizeCommand(row.text.trim());
    const definition = command.match(/^(?:global|local)\s+([A-Za-z_][A-Za-z0-9_]*)\b(?:\s+|=\s*)(.*)$/i);
    if (!definition) continue;
    const referenced = [...String(definition[2] || "").matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?|`([A-Za-z_][A-Za-z0-9_]*)'/g)]
      .map((match) => match[1] || match[2]);
    if (!referenced.length || !(substantive.test(definition[1]) || referenced.some((name) => substantive.test(name)))) continue;
    findings.push(finding(
      authoringState === "new" ? "error" : "warning",
      "substantive_macro_alias_chain",
      row.line,
      `${definition[1]}이 다른 substantive macro (${referenced.join(", ")})를 다시 참조해 역방향 탐색이 필요한 alias chain을 만듭니다.`,
      "최종 소비 지점에서 literal을 직접 쓰거나, 반복되는 binding이면 소비 do-file의 descriptive global 하나에 원시 변수 목록을 직접 정의하세요. Directory-root 조합은 이 규칙의 대상이 아닙니다.",
      "researcher_style_reference",
    ));
  }
  return findings;
}

function lintContent(content, role = "auto", source = "inline", authoringState = null) {
  const resolvedAuthoringState = authoringState || (/^new_master$/i.test(String(role || "")) ? "new" : "existing_audit");
  const active = stripComments(content);
  const logicalByStartLine = new Map(activeLogicalEntries(content).map((entry) => [entry.line, entry.text]));
  const activeText = active.map((row) => normalizeCommand(row.trimmed)).join("\n");
  const outreg2Multiplicity = outreg2HelperMultiplicity(content);
  const directOutreg2Stats = directOutreg2StatisticLines(content);
  const scratchContract = canonicalOutreg2ScratchContract(content);
  const invalidYmeanEreturn = invalidEreturnYmeanLines(content);
  const namedSampleFlowLines = namedSampleFlowPostfileLines(content);
  const canonicalOutreg2Syntax = activeLogicalEntries(content).some((entry) => {
    const command = normalizeCommand(entry.text.trim());
    return /^syntax\s*,/i.test(command)
      && /\bestimates\(string\)/i.test(command)
      && /\bworkbook\(string\)/i.test(command)
      && /\bsheet\(string\)/i.test(command)
      && /\badjdec\(integer\)/i.test(command)
      && /\bmeandec\(integer\)/i.test(command)
      && /\[replace\]/i.test(command);
  });
  const canonicalOutreg2SheetHelperShape = /^program\s+define\s+outreg2_xlsx\b/im.test(activeText)
    && canonicalOutreg2Syntax
    && /^outreg2\b/im.test(activeText)
    && /^import\s+delimited\b/im.test(activeText)
    && /^export\s+excel\b.*\bsheet\s*\(/im.test(activeText)
    && scratchContract.valid;
  const canonicalOutreg2SheetHelper = canonicalOutreg2SheetHelperShape && outreg2Multiplicity.necessary;
  const pendingOutreg2SheetHelperContext = canonicalOutreg2SheetHelperShape
    && (outreg2Multiplicity.call_count === 0 || outreg2Multiplicity.unresolved);
  const findings = [];
  const strengths = [];
  const masterCallComments = masterCallRoleCommentAudit(content, role, resolvedAuthoringState);
  findings.push(...masterCallComments.findings);
  findings.push(...delimiterDirectiveFindings(content, resolvedAuthoringState));
  findings.push(...commandPositionMacroFindings(content, resolvedAuthoringState));
  findings.push(...safetyCriticalMacroIndirectionFindings(content));
  findings.push(...regressionSubstantiveIndirectionFindings(content, resolvedAuthoringState));
  findings.push(...substantiveMacroAliasChainFindings(content, resolvedAuthoringState));
  const mergeLines = [];
  const programStack = [];
  const blockStack = [];
  let maxLoopDepth = 0;
  let maxStructuralDepth = 0;
  let programDefinitions = 0;
  let approvedProgramExceptions = 0;
  const estimationPattern = /^(?:quietly\s+|capture\s+|cap\s+)*(?:reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|csdid|did_imputation|eventstudyinteract)\b/i;
  const hasCompleteGroupSummary = logicalStatements(content).some((row) => {
    const command = normalizeCommand(row.text);
    return /^collapse\b/i.test(command) && /\(mean\)/i.test(command) && /\(sd\)/i.test(command) && /\(count\)/i.test(command) && /\bby\s*\(/i.test(command);
  });
  findings.push(...graphPolicyFindings(content));
  findings.push(...syntheticEventAliasFindings(content));
  findings.push(...encodedResearchDispatcherFindings(content));
  findings.push(...eventStudyDoubleHashFindings(content));
  findings.push(...eventStudySingleHashBaseFindings(content));
  findings.push(...directFallbackMarkerFindings(content));
  findings.push(...danglingLineContinuationFindings(content));
  findings.push(...eventStudyPresentationFindings(content, resolvedAuthoringState));
  findings.push(...estimabilityRiskFindings(content));
  if (scratchContract.applies && !scratchContract.valid) {
    findings.push(finding(
      "error",
      "canonical_outreg2_scratch_contract",
      scratchContract.findings[0].line,
      "canonical outreg2_xlsx formatter의 named scratch 생성·정리 계약이 완전하지 않습니다.",
      "local scratch \"$table/__outreg2_`sheet'\"로 raw table을 만들고 import한 뒤, restore -> erase -> capture confirm file -> if !_rc { exit 498 } 순서를 그대로 유지하세요.",
      "researcher_style_reference",
      scratchContract.findings,
    ));
  }

  for (let index = 0; index < active.length; index += 1) {
    const entry = active[index];
    const text = entry.trimmed;
    const command = normalizeCommand(text);
    const logicalCommand = normalizeCommand(logicalByStartLine.get(entry.line) ?? text);
    const approvedScratchErase = scratchContract.allowedEraseLines.has(entry.line);
    const approvedDirectOutreg2Stats = directOutreg2Stats.has(entry.line);

    if (/^(?:ssc|net|github)\s+install\b/i.test(logicalCommand)) {
      findings.push(finding("error", "runtime_install", entry.line, "연구 do-file 실행 중 설치 명령을 호출합니다.", "설치 코드는 연구 workflow에서 제거하고 분석 명령만 남기세요."));
    }
    if (/^(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:which|findfile|ado\s+dir|confirm\s+(?:command|ado))\b/i.test(text)) {
      findings.push(finding("error", "installed_command_probe", entry.line, "분석 do-file에서 명령 설치 여부를 검사합니다.", "사전 탐색 분기를 제거하고 분석 명령을 직접 실행해 오류가 그대로 드러나게 하세요."));
    }
    if (/^merge\s+m:m\b/i.test(logicalCommand)) {
      findings.push(finding("error", "merge_m_m", entry.line, "Stata 공식 manual은 m:m merge를 나쁜 생각이라고 명시하며 정렬 순서에 결과가 의존한다고 설명합니다.", "키의 유일성을 isid로 검증한 뒤 1:1, 1:m 또는 m:1을 명시하세요.", "stata_manual", "https://www.stata.com/manuals/dmerge.pdf"));
    }
    if (/^duplicates\s+drop\b.*\bforce\b/i.test(logicalCommand)) {
      findings.push(finding("error", "duplicates_drop_force", entry.line, "Stata 공식 manual도 force가 varlist 밖의 정보 손실을 일으킬 수 있다고 경고합니다. 선별 연구자 reference에서는 원인 확인 없는 강제 삭제를 생성하지 않습니다.", "duplicates report/tag와 키 검증 후 명시적 보존 규칙을 사용하세요.", "replication_safety", "https://www.stata.com/manuals/dduplicates.pdf"));
    }
    if (/^if\s+0\s*\{/i.test(command)) {
      findings.push(finding("error", "disabled_if_zero", entry.line, "분석 코드가 if 0 블록으로 비활성화되어 있습니다.", "실행 가능한 master 흐름으로 옮기거나 설명된 선택 옵션으로 바꾸세요."));
    }
    const nativePythonScript = /^python\s+script\s+(?:"[^"]+\.py"|'[^']+\.py'|[^\s,]+\.py)(?:\s*,\s*args\s*\([\s\S]*\))?\s*$/i.test(logicalCommand);
    if (/^(?:shell|winexec|unix|rscript|java|!)\b/i.test(logicalCommand) || (/^python\b/i.test(logicalCommand) && !nativePythonScript)) {
      findings.push(finding("error", "process_escape", entry.line, "외부 프로세스를 직접 호출해 이식성과 재현성이 낮아집니다.", "필수 외부 단계는 별도 스크립트와 README 계약으로 분리하세요."));
    }
    if (nativePythonScript) strengths.push({ rule: "stata_native_python_script", line: entry.line, runtime_verification: "required" });
    if (/^(?:erase|rm|del)\b/i.test(logicalCommand) && !approvedScratchErase) {
      findings.push(finding("error", "destructive_delete", entry.line, "do-file이 파일을 직접 삭제합니다.", "선언된 scratch 산출물만 정리하고 원본과 중간 산출물은 보존하세요."));
    }
    if (approvedScratchErase) strengths.push({ rule: "named_outreg2_scratch_cleanup", line: entry.line });
    if (invalidYmeanEreturn.has(entry.line)) {
      findings.push(finding(
        "error",
        "invalid_ereturn_ymean_outside_eclass",
        entry.line,
        "e-class program 밖에서 ereturn scalar ymean을 설정할 수 없습니다.",
        "estimation 직후 estadd ysumm, mean을 estimates store/save 전에 두어 e(ymean)을 함께 보존하세요.",
        "stata_runtime",
      ));
    }
    if (/^(?:pause|sleep)\b/i.test(command)) {
      findings.push(finding("warning", "manual_pause_or_sleep", entry.line, "수동 개입이나 고정 대기가 필요합니다.", "완료 조건을 확인하는 결정론적 단계로 바꾸세요."));
    }
    if (/(?:[A-Z]:[\\/]|\/Users\/|\/home\/|~[\\/]|\\\\[^\\]+\\|Dropbox)/i.test(text)) {
      findings.push(finding("warning", "machine_path", entry.line, "개인 PC에 종속된 경로가 있습니다.", "master에서 프로젝트 root 하나만 설정하고 하위 경로를 파생하세요."));
    }
    if (!approvedScratchErase && /^(?:capture|cap)\s+(?:erase|merge|reg|regress|reghdfe|use|do)\b/i.test(text)) {
      findings.push(finding("warning", "broad_capture", entry.line, "핵심 단계의 오류를 capture가 숨길 수 있습니다.", "예상 가능한 비핵심 오류에만 capture를 좁게 사용하세요."));
    }
    if (/^postfile\b/i.test(command)) {
      if (namedSampleFlowLines.has(entry.line)) {
        strengths.push({ rule: "named_sample_flow_dataset", line: entry.line });
      } else {
        findings.push(finding("warning", "manual_result_bridge", entry.line, "postfile 기반 결과 조립은 문법상 가능하지만 선별 연구 관행 코드와 같은 결과 계보인지 별도 검토해야 합니다.", "저장된 estimates 또는 명명된 결과 데이터와 연결되는지 확인하세요.", "researcher_style_reference"));
      }
    }
    if (/^(?:texdoc|sutex)\b/i.test(command) || /\.tex(?:["'\s,)\]}]|$)/i.test(text) || /\bsty(?:le)?\s*\(\s*tex\s*\)/i.test(text)) {
      findings.push(finding("error", "tex_output_not_supported", entry.line, "이 연구 workflow의 산출물 계약은 TeX 출력을 사용하지 않습니다.", "표는 Excel, 그림은 PDF, 추정치는 .ster로 저장하세요."));
    }
    if (/^outreg2\b/i.test(logicalCommand)) {
      const outreg2UsingMatch = logicalCommand.match(/^outreg2\s+using\s+(?:"([^"]+)"|([^\s,]+))/i);
      const outreg2Target = outreg2UsingMatch ? (outreg2UsingMatch[1] || outreg2UsingMatch[2] || "") : "";
      const canonicalScratchTarget = scratchContract.applies && /^`scratch'$/i.test(outreg2Target);
      const directExcelTarget = /\bexcel\b/i.test(logicalCommand) || /\.(?:xml|xlsx?)$/i.test(outreg2Target);
      if (directExcelTarget && !canonicalScratchTarget && !/\.xls$/i.test(outreg2Target)) {
        findings.push(finding(
          "warning",
          "direct_outreg2_requires_xls",
          entry.line,
          "program을 쓰지 않는 direct outreg2 Excel 산출물은 명시적 .xls 경로여야 합니다.",
          "outreg2 using 경로를 .xls로 끝내세요. 같은 workbook에 두 개 이상 sheet가 필요한 경우에만 canonical outreg2_xlsx formatter와 .xlsx를 사용하세요.",
          "researcher_style_reference",
        ));
      }
      const mutatingOptions = [];
      for (const [name, pattern] of [
        ["keep()", /\bkeep\s*\(/i],
        ["drop()", /\bdrop\s*\(/i],
        ["label", /(?:^|\s)label(?:\s|,|$)/i],
        ["addstat()", /\baddstat\s*\(/i],
        ["addtext()", /\baddtext\s*\(/i],
        ["e()", /(?:^|\s)e\s*\(/i],
      ]) if (pattern.test(logicalCommand) && !(name === "addstat()" && approvedDirectOutreg2Stats)) mutatingOptions.push(name);
      if (mutatingOptions.length) {
        findings.push(finding(
          "error",
          "outreg2_raw_rows_modified",
          entry.line,
          `outreg2가 raw 결과를 바꾸는 ${mutatingOptions.join(", ")} option을 사용합니다.`,
          "canonical raw outreg2 호출에는 coefficient row filter나 addstat/addtext를 두지 마세요. Adjusted R-squared와 e(sample) dependent-variable mean만 formatter가 별도로 삽입합니다.",
          "researcher_style_reference",
        ));
      }
      if (!/\bnor2\b/i.test(logicalCommand) && !approvedDirectOutreg2Stats) {
        findings.push(finding(
          "error",
          "outreg2_missing_nor2",
          entry.line,
          "outreg2 자체의 statistic row가 남아 canonical 두-row contract와 겹칩니다.",
          "raw outreg2 호출에 nor2를 사용하고 Adjusted R-squared와 dependent-variable mean은 formatter에서 별도로 추가하세요.",
          "researcher_style_reference",
        ));
      } else if (approvedDirectOutreg2Stats) strengths.push({ rule: "direct_single_sheet_outreg2_statistics", line: entry.line });
      else strengths.push({ rule: "canonical_raw_outreg2_source", line: entry.line });
    }
    if (/^rdrobust\b/i.test(command) && /\s&\s*\(/.test(command) && !/\bif\b/i.test(command)) {
      findings.push(finding("error", "malformed_rdrobust_sample", entry.line, "rdrobust 표본 조건 앞의 if가 누락된 것으로 보입니다.", "조건식 앞에 if를 명시하고 실행 로그로 확인하세요."));
    }
    if (/^collapse\b/i.test(logicalCommand) && /\(mean\)/i.test(logicalCommand)) {
      const complete = /\(sd\)/i.test(logicalCommand) && /\(count\)/i.test(logicalCommand) && /\bby\s*\(/i.test(logicalCommand);
      if (complete) {
        strengths.push({ rule: "complete_group_summary", line: entry.line, source: "https://www.stata.com/manuals/dcollapse.pdf" });
      } else {
        findings.push(finding("warning", "incomplete_group_summary", entry.line, "보고용 group summary에 평균만 있고 표준편차, 관측치 수, 또는 명시적 group key가 빠져 있습니다.", "(mean), (sd), (count)를 같은 collapse에 명시하고 by()로 group-period 단위를 고정하세요.", "stata_manual", "https://www.stata.com/manuals/dcollapse.pdf"));
      }
    }

    for (let close = 0; close < structuralCloseCount(text); close += 1) {
      if (blockStack.length) blockStack.pop();
    }
    if (/^(?:adopath\s+\+\+|net\s+from)\b/i.test(command)) {
      findings.push(finding("warning", "external_runtime_change", entry.line, "연구 실행 중 외부 명령 경로나 네트워크 설정을 바꿉니다.", "환경 설정 문장을 연구 do-file에서 제거하세요."));
    }
    const structuralCommand = normalizeCommand(structuralSyntax(text).trim());
    const loopMatch = structuralCommand.match(/^(foreach|forv(?:al(?:ues)?)?|while)\b/i);
    const opensBlock = hasStructuralOpen(text);
    if (opensBlock) {
      const structuralDepth = blockStack.length + 1;
      maxStructuralDepth = Math.max(maxStructuralDepth, structuralDepth);
      if (structuralDepth === 4) {
        const deepFinding = finding(
          "warning",
          "deep_structural_nesting",
          entry.line,
          "block 중첩 깊이 4가 감지되어 연구 사양과 실행 순서를 읽기 어렵습니다.",
          "조건과 반복을 직접 읽히는 순차 단계로 펼치고, 한 시점의 구조적 중첩을 3단계 이하로 줄이세요.",
          "researcher_style_reference",
        );
        deepFinding.structural_depth = structuralDepth;
        deepFinding.allowed_structural_depth = 3;
        findings.push(deepFinding);
      }
    }
    if (loopMatch && opensBlock) {
      const loopDepth = blockStack.filter((block) => block.kind === "loop").length + 1;
      maxLoopDepth = Math.max(maxLoopDepth, loopDepth);
      const outerLoop = [...blockStack].reverse().find((block) => block.kind === "loop");
      const readableTwoLevel = loopDepth === 2
        && readableBoundedLoopHeader(structuralCommand)
        && readableBoundedLoopHeader(outerLoop?.command || "");
      if (loopDepth >= 3 || (loopDepth === 2 && !readableTwoLevel)) {
        const nestedFinding = finding("error", "nested_loop", entry.line, `loop 깊이 ${loopDepth}가 감지되었지만 허용 계약을 충족하지 않습니다.`, "깊이 3 이상은 직접 읽히는 순차 단계로 펼치세요. 깊이 2는 두 반복축이 plain named list 또는 numeric range이고 같은 기계적 본문을 크게 줄일 때만 사용하세요.");
        nestedFinding.loop_depth = loopDepth;
        nestedFinding.allowed_loop_depth = 2;
        findings.push(nestedFinding);
      } else if (readableTwoLevel) {
        strengths.push({
          rule: "readable_two_level_loop",
          line: entry.line,
          loop_depth: loopDepth,
          review_contract: "same mechanical body, substantial reduction, visible research and output choices",
        });
      }
      blockStack.push({ kind: "loop", line: entry.line, command: structuralCommand });
    } else if (opensBlock) blockStack.push({ kind: "block", line: entry.line });
    if (/^program\s+define\b/i.test(command)) {
      programDefinitions += 1;
      const outreg2Formatter = /^program\s+define\s+outreg2_xlsx\b/i.test(command);
      const approvedException = canonicalOutreg2SheetHelper && outreg2Formatter;
      const contextPending = pendingOutreg2SheetHelperContext && outreg2Formatter;
      if (approvedException) approvedProgramExceptions += 1;
      programStack.push({ line: entry.line, researchLogic: false, approvedException: approvedException || contextPending });
      if (approvedException) strengths.push({ rule: "necessary_outreg2_sheet_program", line: entry.line, multiplicity: outreg2Multiplicity });
      else if (contextPending) strengths.push({ rule: "outreg2_sheet_program_project_context_pending", line: entry.line, multiplicity: outreg2Multiplicity });
      else if (outreg2Formatter) findings.push(finding("error", "unnecessary_outreg2_program", entry.line, "canonical outreg2_xlsx가 caller-declared estimate list를 받는 단일 formatter 계약을 충족하지 않습니다.", "syntax estimates(string)과 한 단계 estimate loop를 사용하고, outcome·sample·specification·model role 추론을 넣지 마세요."));
      else findings.push(finding("warning", "program_define", entry.line, "program define은 금지되지 않지만 직접 모듈로 표현할 수 없는 필요한 helper인지 입증해야 합니다.", "명령 자체가 필요한 인터페이스를 제공하지 않는 좁은 helper가 아니라면 직접 읽히는 do-file 단계로 펼치세요.", "researcher_style_reference"));
    }
    if (programStack.length && (estimationPattern.test(command) || /^(?:merge|keep|drop)\b/i.test(command))) {
      programStack[programStack.length - 1].researchLogic = true;
    }
    if (/^end\s*$/i.test(command) && programStack.length) {
      const program = programStack.pop();
      if (program.researchLogic && !program.approvedException) findings.push(finding("warning", "program_wrapped_research_logic", program.line, "program 안의 연구 로직은 선별 research-practice reference에도 존재하므로 자동 block할 수 없습니다. 동일 목적의 reference와 비교가 필요합니다.", "반복되는 명확한 연구 작업인지 확인하고, 과도한 추상화일 때만 직접 코드로 펼치세요.", "researcher_style_reference", ["corpus/packages/173341/dofiles/4. Main_Tables.do", "corpus/packages/173341/dofiles/5. Appendix_Tables.do"]));
    }
    const mergeMatch = logicalCommand.match(/^merge\s+(1:1|1:m|m:1|m:m)\b/i);
    if (mergeMatch) {
      const declaredStatePolicy = /,.*(?:\bkeep\s*\(\s*(?:master|match|matched|using|[123])(?:\s+(?:master|match|matched|using|[123]))*\s*\)|\bassert\s*\([^)]*\))/i.test(logicalCommand);
      mergeLines.push({ index, line: entry.line, cardinality: mergeMatch[1].toLowerCase(), declaredStatePolicy });
      if (declaredStatePolicy) strengths.push({ rule: "merge_state_policy", line: entry.line, source: "https://www.stata.com/manuals/dmerge.pdf" });
    }

    if (/^version\s+\d/i.test(command)) strengths.push({ rule: "stata_version", line: entry.line });
    if (/^(?:global|local)\s+(?:root|project_root|project|replication)\b/i.test(command)) strengths.push({ rule: "single_project_root", line: entry.line });
    if (/^isid\b/i.test(command)) strengths.push({ rule: "key_assertion", line: entry.line });
    if (/^(?:duplicates\s+(?:report|tag)|assert)\b/i.test(command)) strengths.push({ rule: "integrity_check", line: entry.line });
    if (/^label\s+var(?:iable)?\b/i.test(command)) strengths.push({ rule: "variable_labels", line: entry.line });
    if (/^set\s+seed\b/i.test(command)) strengths.push({ rule: "explicit_seed", line: entry.line });
    if (estimationPattern.test(command) && /(?:vce\s*\(cluster|cluster\s*\(|,\s*cluster\s*\()/i.test(command)) strengths.push({ rule: "explicit_cluster", line: entry.line });
    if (/^(?:sum|summarize|tab|tabulate|tabstat|ttest)\b/i.test(command)) strengths.push({ rule: "descriptive_or_balance_check", line: entry.line });
    if (hasCompleteGroupSummary && /^save\b.*\.dta(?:[\"']|\s|,|$)/i.test(command)) strengths.push({ rule: "canonical_summary_dataset", line: entry.line, source: "https://www.stata.com/manuals/dsave.pdf" });
    if (/^(?:do|run|include)\s+/i.test(command)) {
      strengths.push({ rule: "master_call", line: entry.line });
      if (masterCallComments.valid_lines.has(entry.line)) strengths.push({ rule: "master_call_role_comment", line: entry.line });
    }
    if (/^putexcel\b/i.test(command)) strengths.push({ rule: "official_putexcel", line: entry.line, source: "https://www.stata.com/manuals/rptputexcel.pdf" });
    if (/^graph\s+bar\b/i.test(command)) strengths.push({ rule: "official_graph_bar", line: entry.line, source: "https://www.stata.com/manuals/g-2graphbar.pdf" });
    if (/^twoway\b/i.test(command)) strengths.push({ rule: "official_twoway", line: entry.line, source: "https://www.stata.com/manuals/g-2graphtwoway.pdf" });
    if (/^marginsplot\b/i.test(command)) strengths.push({ rule: "official_marginsplot", line: entry.line, source: "https://www.stata.com/manuals/rmarginsplot.pdf" });
    if (/^collect\s+get\b/i.test(command)) strengths.push({ rule: "official_collect_get", line: entry.line, source: "https://www.stata.com/manuals/tablescollectget.pdf" });
    if (/^collect\s+export\b/i.test(command)) strengths.push({ rule: "official_collect_export", line: entry.line, source: "https://www.stata.com/manuals/tablescollectexport.pdf" });
    if (/(?:\b_b\s*\[|\b_se\s*\[|\be\(b\))/i.test(command)) strengths.push({ rule: "stored_result_access", line: entry.line });
  }

  if (blockStack.length) {
    findings.push(finding(
      "error",
      "unclosed_structural_block",
      blockStack[0].line,
      `${blockStack.length}개의 여는 block에 대응하는 닫는 중괄호가 없습니다.`,
      "선택한 template span에 필요한 닫는 중괄호를 포함하고 block 경계를 다시 확인하세요.",
    ));
  }

  for (const merge of mergeLines) {
    const nearby = active.slice(merge.index + 1, merge.index + 13).map((row) => normalizeCommand(row.trimmed)).join("\n");
    const validated = merge.declaredStatePolicy || /(?:assert|tab(?:ulate)?|count|keep)\b[^\n]*(?:_merge|\bmatched\b)|_merge\s*==|assert\s+inlist\s*\(\s*_merge/i.test(nearby);
    const dropsEarly = /^(?:drop|keep)\s+_merge\b/im.test(nearby) && !validated;
    if (!validated) findings.push(finding("warning", "merge_without_state_check", merge.line, "merge 직후 매칭 상태를 검증하지 않습니다.", "_merge 분포와 예상 상태를 assert한 뒤 정리하세요."));
    if (dropsEarly) findings.push(finding("error", "merge_marker_dropped_early", merge.line, "검증 전에 _merge를 삭제합니다.", "매칭 상태를 검증한 다음 _merge를 삭제하세요."));
  }

  const errors = findings.filter((row) => row.severity === "error").length;
  const warnings = findings.filter((row) => row.severity === "warning").length;
  const styleFindings = findings.filter((row) => row.basis === "researcher_style_reference");
  const replicationFindings = findings.filter((row) => row.basis !== "researcher_style_reference");
  return {
    source,
    role,
    authoring_state: resolvedAuthoringState,
    status: errors ? "blocked" : warnings ? "needs_review" : "static_clean",
    summary: {
      errors,
      warnings,
      strengths: unique(strengths.map((row) => row.rule)).length,
      active_lines: active.length,
      max_loop_depth: maxLoopDepth,
      max_structural_depth: maxStructuralDepth,
      max_active_loop_depth: { observed: maxLoopDepth, blocking_threshold: 3, definition: "simultaneously active foreach, forvalues, or while loops" },
      max_braced_structural_depth: { observed: maxStructuralDepth, review_threshold: 4, definition: "all simultaneously active braced blocks, including loops and conditionals" },
      program_definitions: programDefinitions,
      approved_program_exceptions: approvedProgramExceptions,
    },
    syntax_status: "not_validated",
    researcher_style_status: styleFindings.length ? "context_review" : "no_static_conflict",
    replication_status: replicationFindings.some((row) => row.severity === "error") ? "blocked" : replicationFindings.some((row) => row.severity === "warning") ? "needs_review" : "static_clean",
    findings,
    strengths: strengths.filter((row, i, values) => values.findIndex((other) => other.rule === row.rule && other.line === row.line) === i),
    manual_validation: { verdict: "not_run", pass: false, note: "정적 lint만으로 Stata 문법 통과를 선언하지 않습니다." },
    claim_boundary: "연구 관행 코드에 맞춘 검사 결과이며 저널의 공식 인증이 아닙니다.",
  };
}

function readDoInput(args) {
  const hasContent = Object.prototype.hasOwnProperty.call(args, "content");
  const hasPath = Object.prototype.hasOwnProperty.call(args, "path");
  if (hasContent === hasPath) throw new Error("content와 path 중 정확히 하나가 필요합니다.");
  if (hasContent) {
    if (typeof args.content !== "string") throw new Error("content는 문자열이어야 합니다.");
    return { content: args.content, source: "inline" };
  }
  if (typeof args.path !== "string" || !args.path) throw new Error("path는 비어 있지 않은 문자열이어야 합니다.");
  const target = path.resolve(String(args.path));
  if (path.extname(target).toLowerCase() !== ".do") throw new Error("path는 .do 파일이어야 합니다.");
  const stat = fs.statSync(target);
  if (stat.size > 2 * 1024 * 1024) throw new Error("2 MiB를 넘는 do-file은 분할해서 검사하세요.");
  return { content: fs.readFileSync(target, "utf8"), source: target };
}

const REPORT_POLICIES = new Set(["required", "optional", "disabled"]);
const SCOPE_MODES = new Set(["reachable", "all"]);

function resolveReportPolicy(args, fallback) {
  if (!Object.prototype.hasOwnProperty.call(args, "report_policy")) return fallback;
  const value = args.report_policy;
  if (!REPORT_POLICIES.has(value)) throw new Error("report_policy는 required, optional, disabled 중 하나여야 합니다.");
  return value;
}

function resolveScopeMode(scope) {
  if (!Object.prototype.hasOwnProperty.call(scope, "mode")) return "reachable";
  const value = scope.mode;
  if (!SCOPE_MODES.has(value)) throw new Error("scope.mode는 reachable 또는 all이어야 합니다.");
  return value;
}

function canonicalReferenceCommand(value) {
  const command = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (/^import_(?:excel|delimited)$/.test(command)) return "import";
  if (/^export_excel$/.test(command)) return "export excel";
  if (/^(?:graph_|twoway$)/.test(command)) return "graph";
  if (/^import\s+(?:excel|delimited)\b/.test(command)) return "import";
  if (/^reshape\s+(?:long|wide)\b/.test(command)) return "reshape";
  if (/^merge(?:\s|$)/.test(command)) return "merge";
  if (/^graph\s+(?:export|save|use|combine|bar|twoway)\b/.test(command)) return "graph";
  return command;
}

function scoreReference(row, args) {
  let score = 0;
  if (args.stage && row.stages.includes(args.stage)) score += 30;
  const requestedCommands = unique((args.commands || []).map(canonicalReferenceCommand).filter(Boolean));
  const rowCommands = unique((row.commands || []).map(canonicalReferenceCommand).filter(Boolean));
  const wantedCommands = unique([...requestedCommands, ...tokenize(args.task), ...tokenize(args.subtask)]);
  const haystack = `${row.title} ${row.method} ${row.path} ${row.commands.join(" ")} ${row.content}`.toLowerCase();
  for (const token of wantedCommands) if (haystack.includes(token.toLowerCase())) score += 4;
  for (const command of requestedCommands) if (rowCommands.includes(command)) score += 12;
  if (requestedCommands.length) {
    const unexpectedCommands = rowCommands.filter((command) => !requestedCommands.includes(command));
    const spanLines = Math.max(1, Number(row.line_end || 0) - Number(row.line_start || 0) + 1);
    // Prefer exact atomic scope before compactness. Archived references are fixed-width chunks,
    // so keep both adjustments bounded and subordinate to stage and requested-command matches.
    score -= Math.min(24, unexpectedCommands.length * 8);
    score += Math.max(0, 12 - Math.floor((spanLines - 1) / 8));
  }
  if (row.evidence_level === "gold") score += 8;
  if (row.role === "entrypoint" && args.stage === "master_orchestration") score += 12;
  const shapeTerms = {
    panel: ["panel", "fixed effects", "event study", "did", "cohort"],
    repeated_cross_section: ["repeated cross", "survey", "year"],
    cross_section: ["cross section", "rd", "regression discontinuity"],
    time_series: ["time series", "tsset"],
  };
  for (const term of shapeTerms[String(args.data_shape || "").toLowerCase()] || []) {
    if (haystack.includes(term)) score += 5;
  }
  if (!row.cautions.length) score += 3;
  return score;
}

function manualExcerpt(content, terms, width = 1400) {
  const lower = content.toLowerCase();
  const positions = terms.map((term) => lower.indexOf(term.toLowerCase())).filter((value) => value >= 0);
  const center = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, center - 250);
  return content.slice(start, start + width).trim();
}

function searchManual(args) {
  const manualRows = manuals();
  const webSources = officialWebSources();
  const authority = args.authority || "official";
  if (!["official", "community", "any"].includes(authority)) throw new Error("authority는 official, community, any 중 하나여야 합니다.");
  const commands = unique((args.commands || []).map((value) => String(value).toLowerCase()));
  const terms = unique([...commands, ...tokenize(args.query || "")]);
  if (!terms.length) throw new Error("query 또는 commands가 필요합니다.");
  const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 10);
  const results = manualRows.filter((row) => {
    if (authority !== "any" && row.authority !== authority) return false;
    if (commands.length && !commands.some((command) => row.commands.includes(command))) return false;
    return true;
  })
    .map((row) => {
      const haystack = `${row.commands.join(" ")} ${row.content}`.toLowerCase();
      let score = 0;
      for (const command of commands) {
        if (row.commands.includes(command)) score += 40;
        if (haystack.includes(command)) score += 12;
      }
      for (const term of terms) if (haystack.includes(term)) score += 3;
      if (row.authority === "official") score += 5;
      return { row, score };
    })
    .filter((item) => item.score > 5)
    .sort((a, b) => b.score - a.score || a.row.source_file.localeCompare(b.row.source_file) || a.row.page - b.row.page)
    .slice(0, limit)
    .map(({ row, score }) => ({
      manual_id: row.manual_id,
      score,
      authority: row.authority,
      commands: row.commands,
      source_file: row.source_file,
      source_url: row.source_url,
      page: row.page,
      file_sha256: row.file_sha256,
      text_sha256: row.text_sha256,
      excerpt: manualExcerpt(row.content, terms),
    }));
  const coveredCommands = commands.filter((command) => results.some((row) => row.commands.includes(command)));
  const missingCommands = commands.filter((command) => !coveredCommands.includes(command));
  const suggestedSources = webSources.filter((row) => missingCommands.some((command) => {
    const documented = String(row.command || "").toLowerCase();
    return documented === command || documented.includes(command) || command.includes(documented);
  }));
  return {
    query: args.query || "",
    commands,
    authority,
    results,
    covered_commands: coveredCommands,
    missing_commands: missingCommands,
    official_web_search_required: authority === "official" && missingCommands.length > 0,
    suggested_official_web_sources: authority === "official" && missingCommands.length > 0 ? suggestedSources : [],
    web_fallback_rule: "로컬 official 결과가 없으면 stata.com과 stata-press.com의 공식 manual 또는 help만 검색하세요. community 문서로 공식 문법을 대체하지 마세요.",
    verdict_rule: "manual 검색 결과는 근거이며 pass 판정이 아닙니다. pass는 공식 쉬운 예제를 Stata에서 실제 실행한 경우에만 허용합니다.",
  };
}

function getVerifiedExamples(args) {
  const verification = officialVerification();
  const command = String(args.command || "").toLowerCase();
  if (!command) throw new Error("command가 필요합니다.");
  const examples = verification.examples.filter((row) =>
    row.passed
      && row.authority === "official"
      && row.example_origin === "official_document_derived_runtime_fixture"
      && row.verbatim === false
      && row.selection_eligible === false
      && row.independent_support === false
      && row.return_code === 0
      && row.error_codes.length === 0
      && row.command.toLowerCase() === command
  );
  return {
    command,
    pass_definition: "StataCorp 공식 문서에서 파생했지만 원문 그대로는 아닌 격리 runtime fixture를 Stata에서 실제 실행했고 오류 코드 없이 pass marker까지 도달했습니다. selector나 독립 근거로 사용하지 않습니다.",
    examples: examples.map((row) => ({
      example_id: row.example_id,
      command: row.command,
      authority: row.authority,
      example_origin: row.example_origin,
      verbatim: row.verbatim,
      selection_eligible: row.selection_eligible,
      independent_support: row.independent_support,
      source_file: row.source_file,
      source_url: row.source_url,
      page: row.page,
      derivation: row.derivation,
      code: row.code,
      code_sha256: row.code_sha256,
      stata_version: row.stata_version,
      log_file: row.log_file,
      log_sha256: row.log_sha256,
      passed: true,
    })),
    unavailable: examples.length === 0,
    unavailable_rule: "검증된 쉬운 예제가 없으면 pass를 추론하지 말고 search_stata_manual과 Stata 실제 실행 검증이 필요하다고 보고하세요.",
    verified_at: verification.verified_at,
  };
}

function searchApproved(args) {
  if (!STAGES.includes(args.stage)) throw new Error(`stage는 다음 중 하나여야 합니다: ${STAGES.join(", ")}`);
  const includeReference = Boolean(args.include_reference);
  const includeNegative = Boolean(args.include_negative);
  const includeContextual = Boolean(args.include_contextual);
  const contextualCautions = new Set(["program_define", "program_wrapped_research_logic"]);
  const requestedCommands = unique((args.commands || []).map(canonicalReferenceCommand).filter(Boolean));
  const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 10);
  const exhaustive = args._exhaustive === true;
  const ranked = references().filter((row) => {
    if ((row.max_loop_depth || 0) >= 3 || row.cautions.includes("nested_loop_depth_three")) return false;
    if (row.tex_output === true || row.hard_flags.includes("tex_output_not_supported") || hasTexOutputContent(row.content)) return false;
    if (!row.stages.includes(args.stage)) return false;
    const rowCommands = unique((row.commands || []).map(canonicalReferenceCommand).filter(Boolean));
    if (requestedCommands.length && !requestedCommands.some((command) => rowCommands.includes(command))) return false;
    if (row.approved_for_generation) return true;
    if (includeContextual && row.source_allowed_for_generation && !row.hard_flags.length && row.cautions.length && row.cautions.every((item) => contextualCautions.has(item))) return true;
    if (includeReference && row.evidence_level === "reference" && !row.hard_flags.length) return true;
    if (includeNegative && ["negative", "excluded"].includes(row.evidence_level)) return true;
    return false;
  }).map((row) => {
    const rowCommands = unique((row.commands || []).map(canonicalReferenceCommand).filter(Boolean));
    const matchedCommandAnchors = requestedCommands.filter((command) => rowCommands.includes(command));
    const unexpectedCommandAnchors = rowCommands.filter((command) => !requestedCommands.includes(command));
    return {
    row,
    matchedCommandAnchors,
    unmatchedCommandAnchors: requestedCommands.filter((command) => !matchedCommandAnchors.includes(command)),
    unexpectedCommandAnchors,
    score: scoreReference(row, { ...args, commands: requestedCommands }) + (
      includeContextual && row.source_allowed_for_generation && !row.hard_flags.length && row.cautions.length && row.cautions.every((item) => contextualCautions.has(item))
        ? 100
        : 0
    ),
  }})
    .sort((a, b) => b.score - a.score || a.row.path.localeCompare(b.row.path));
  const candidates = exhaustive ? ranked : ranked.slice(0, limit);
  const atomicQuerySplitRequired = requestedCommands.length > 1
    && !ranked.some((item) => item.unmatchedCommandAnchors.length === 0);

  return {
    query: { stage: args.stage, task: args.task || "", subtask: args.subtask || "", commands: args.commands || [], canonical_command_anchors: requestedCommands },
    result_accounting: { returned: candidates.length, total_eligible: ranked.length, exhaustive },
    atomic_query_split_required: atomicQuerySplitRequired,
    atomic_query_rule: "Call this secondary reference search only for one atomic checkpoint. Do not mix commands from separate state transitions in one query; split the query when atomic_query_split_required is true.",
    usage_rule: "Use only after search_labeled_checkpoints found no compatible block for this one atomic transition. Copy only approved_for_generation=true rows with the required matched command anchors. Prefer loop depth one; accept depth two only when the row carries an explicit reviewed readability contract for two plain repeated axes. Never return depth three. Treat unmatched anchors as evidence that the query must be narrowed or split, and unexpected anchors as broader source scope that must not displace an equally compatible atomic span. Contextual, reference, and negative rows are explanation-only.",
    results: candidates.map(({ row, score, matchedCommandAnchors, unmatchedCommandAnchors, unexpectedCommandAnchors }) => ({
      chunk_id: row.chunk_id,
      score,
      evidence_level: row.evidence_level,
      approved_for_generation: row.approved_for_generation,
      usage_class: row.approved_for_generation ? "generation_reference" : row.source_allowed_for_generation && row.cautions.every((item) => contextualCautions.has(item)) ? "contextual_style_reference" : "explanation_only",
      package_id: row.package_id,
      title: row.title,
      article_doi: row.article_doi,
      repository_doi: row.repository_doi,
      source: `${row.path}:${row.line_start}-${row.line_end}`,
      stages: row.stages,
      commands: row.commands,
      matched_command_anchors: matchedCommandAnchors,
      unmatched_command_anchors: unmatchedCommandAnchors,
      unexpected_command_anchors: unexpectedCommandAnchors,
      command_coverage_complete: unmatchedCommandAnchors.length === 0,
      cautions: row.cautions,
      hard_flags: row.hard_flags,
      max_loop_depth: row.max_loop_depth || 0,
      code: row.content,
    })),
    claim_boundary: "검토한 연구 관행 코드 재현 패키지의 선별 구간이며 저널의 줄 단위 승인 목록이 아닙니다.",
  };
}

function packageIdFromSourcePath(sourcePath) {
  const match = String(sourcePath || "").replaceAll("\\", "/").match(/^corpus\/packages\/([^/]+)\//);
  return match ? match[1] : null;
}

function dictionaryEvidence(checkpoint) {
  const entry = DICTIONARY_BY_HEADWORD.get(checkpoint);
  if (!entry) return null;
  return {
    headword: entry.headword,
    name_ko: entry.name_ko,
    name_en: entry.name_en,
    maturity: entry.maturity,
    variant_count: entry.variants.length,
    auto_selectable_count: entry.auto_selectable_count || 0,
    reference_only_count: entry.reference_only_count || 0,
    common_commands: entry.common_commands,
    retrieval_features: entry.retrieval_features,
  };
}

function rubricClassification(row) {
  return row.quality_rubric_review?.classification || (row.decision === "drop" ? "exclude" : "conditional_candidate");
}

const DERIVED_CANONICAL_FORMATTER_FINGERPRINT = Object.freeze({
  label_id: "export.regression_excel.from_ster_default_style.v1",
  source_path: "plugins/stata-research-guard/annotations/source_snapshots/default_style_outreg2_xlsx.do",
  source_file_sha256: "e98c97dfd21e7e4cffd8a0b0520de256afd36dceae8437cbf8a774a2f2b1a473",
  code_sha256: "a192f7487b4db889b2a656b60d88246c2f02c4d53bf86871d1ef26840ab0d827",
});

function derivedCanonicalFormatterAuthorized(row) {
  return row.label_id === DERIVED_CANONICAL_FORMATTER_FINGERPRINT.label_id
    && String(row.source_path || "").replace(/\\/g, "/") === DERIVED_CANONICAL_FORMATTER_FINGERPRINT.source_path
    && row.source_file_sha256 === DERIVED_CANONICAL_FORMATTER_FINGERPRINT.source_file_sha256
    && row.code_sha256 === DERIVED_CANONICAL_FORMATTER_FINGERPRINT.code_sha256;
}

function independentResearchSourceAuthorized(row) {
  const sourceKind = String(row.source_kind || row.provenance?.source_kind || "").toLowerCase();
  if (/canonical|guide|manual|project[_-]?snapshot/.test(sourceKind)) return false;
  return ["deposited_research_code", "external_research_code", "independent_researcher_code"]
    .some((prefix) => sourceKind === prefix || sourceKind.startsWith(`${prefix}_`));
}

function selectorSourceAuthorized(row) {
  const sourceKind = String(row.source_kind || row.provenance?.source_kind || "").toLowerCase();
  if (sourceKind === "derived_canonical_implementation") return derivedCanonicalFormatterAuthorized(row);
  return independentResearchSourceAuthorized(row);
}

function rubricAutoSelectable(row) {
  return selectorSourceAuthorized(row)
    && row.transition_role !== "guidance_only"
    && ["preferred_candidate", "conditional_candidate"].includes(rubricClassification(row));
}

const CONTRACT_MATCH_STOPWORDS = new Set([
  "stata", "code", "block", "using", "use", "add", "make", "create", "please", "existing",
  "project", "data", "analysis", "with", "from", "into", "for", "and", "the", "코드", "추가",
  "만들어", "만들", "프로젝트", "데이터", "분석", "기존", "작업", "기능", "해줘",
]);

function contractSearchText(row) {
  return JSON.stringify({
    variant_id: row.variant_id,
    aliases: row.aliases,
    selection_conditions: row.selection_conditions,
    state_signature: row.state_signature,
    required_signals: row.required_signals,
    command_anchors: row.command_anchors,
  }).toLowerCase();
}

function explicitMethodContractText(row) {
  return JSON.stringify({
    method_family: row.method_family || "",
    specification_facet: row.specification_facet || "",
  }).toLowerCase();
}

function publicSpecificityGate(gate) {
  const { rows, ...summary } = gate;
  return summary;
}

function gateByExplicitMethodContract(rows, queryText) {
  const queryTokens = unique(tokenize(queryText).filter((token) => !CONTRACT_MATCH_STOPWORDS.has(token)));
  const methodRows = rows.filter((row) => row.decision !== "drop"
    && row.reuse_scope === "method_specific"
    && (row.method_family || row.specification_facet));
  if (!queryTokens.length || !methodRows.length) return { rows, active: false, distinguishing_tokens: [], excluded_label_ids: [] };

  const methodText = methodRows.map(explicitMethodContractText).join(" ");
  const generalText = rows.filter((row) => row.decision !== "drop" && row.reuse_scope === "general").map(contractSearchText).join(" ");
  const distinguishingTokens = queryTokens.filter((token) => methodText.includes(token) && !generalText.includes(token));
  if (!distinguishingTokens.length) return { rows, active: false, distinguishing_tokens: [], excluded_label_ids: [] };

  const scored = rows.map((row) => {
    const text = explicitMethodContractText(row);
    return { row, matches: distinguishingTokens.filter((token) => text.includes(token)) };
  });
  const maxMatches = Math.max(...scored.filter((item) => item.row.decision !== "drop").map((item) => item.matches.length), 0);
  if (maxMatches === 0) return { rows, active: false, distinguishing_tokens: [], excluded_label_ids: [] };
  const kept = scored.filter((item) => item.matches.length === maxMatches).map((item) => item.row);
  const keptIds = new Set(kept.map((row) => row.label_id));
  return {
    rows: kept,
    active: true,
    distinguishing_tokens: distinguishingTokens,
    matched_tokens: distinguishingTokens.filter((token) => kept.some((row) => contractSearchText(row).includes(token))),
    excluded_label_ids: rows.filter((row) => !keptIds.has(row.label_id)).map((row) => row.label_id),
    rule: "An explicit request token that appears in a method-specific contract but in no general contract is a compatibility condition, not a soft ranking bonus.",
  };
}

function requestedEventOutcomeCardinality(args) {
  if (args.checkpoint !== "figures.event_study") return "not_applicable";
  return eventOutcomeCardinalityFromText(`${args.task || ""} ${args.current_state || ""} ${args.target_state || ""}`);
}

function eventOutcomeCardinalityFromText(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(?:exactly\s+one|one|single|1)[ -]?outcomes?\b|\bone-outcome\b|단일\s*outcome|outcomes?\s*(?:하나|한\s*개|1\s*개)/i.test(text)) return "single";
  if (/\b(?:several|multiple|two\s+or\s+more|at\s+least\s+two)[ -]?outcomes?\b|\b(?:[2-9]|[1-9]\d+)\+?\s*outcomes?\b|\boutcome\s+list\b|여러\s*outcome|outcomes?\s*(?:(?:[2-9]|[1-9]\d+)\s*개|(?:두|둘)\s*개)/i.test(text)) return "multiple";
  return "unspecified";
}

function eventOutcomeCardinalityCompatible(row, cardinality) {
  if (cardinality === "single") return !/flat.*loop|loop.*outcome/i.test(`${row.variant_id} ${JSON.stringify(row.research_situations || [])}`);
  if (cardinality === "multiple") return !/single[_ -]outcome|exactly one outcome/i.test(`${row.variant_id} ${JSON.stringify(row.research_situations || [])}`);
  return true;
}

const EVENT_AXIS_PATTERNS = Object.freeze({
  single_automatic: "single_automatic_axis",
  flat_automatic: "flat_loop_automatic_axis",
  flat_fixed: "flat_loop_fixed_group_axis",
  flat_mixed: MIXED_AXIS_RENDERING_MODE,
});

function eventStudyAxisPatternSelection(axisDecision, cardinality = "unspecified") {
  if (axisDecision) {
    if (!axisDecision.selection_ready) return { status: "invalid_profile", required_patterns: [] };
    if (axisDecision.rendering_mode === MIXED_AXIS_RENDERING_MODE) {
      return { status: "explicit_mixed", required_patterns: [EVENT_AXIS_PATTERNS.flat_mixed] };
    }
    const modes = new Set(axisDecision.axis_groups.map((group) => group.axis_mode));
    if (modes.has("fixed_group") && modes.has("automatic")) {
      return { status: "mixed_profile_requires_explicit_rendering_mode", required_patterns: [] };
    }
    if (modes.size === 1 && modes.has("fixed_group")) {
      return { status: "all_fixed", required_patterns: [EVENT_AXIS_PATTERNS.flat_fixed] };
    }
    if (modes.size === 1 && modes.has("automatic")) {
      const outcomeCount = axisDecision.expected_plots.length
        || axisDecision.axis_groups.reduce((count, group) => count + group.outcomes.length, 0);
      return {
        status: "all_automatic",
        required_patterns: [outcomeCount === 1 ? EVENT_AXIS_PATTERNS.single_automatic : EVENT_AXIS_PATTERNS.flat_automatic],
      };
    }
    return { status: "axis_profile_has_no_supported_pattern", required_patterns: [] };
  }
  if (cardinality === "single") return { status: "default_automatic_single", required_patterns: [EVENT_AXIS_PATTERNS.single_automatic] };
  if (cardinality === "multiple") return { status: "default_automatic_multiple", required_patterns: [EVENT_AXIS_PATTERNS.flat_automatic] };
  return { status: "metadata_inspection_no_axis_profile", required_patterns: [] };
}

function eventStudyAxisPatternCompatible(row, axisDecision, cardinality = "unspecified") {
  if (row.checkpoint !== "figures.event_study") return true;
  if (!axisDecision && !["single", "multiple"].includes(cardinality)) return true;
  return eventStudyAxisPatternSelection(axisDecision, cardinality).required_patterns.includes(row.event_axis_pattern);
}

function eventStudyAxisAutoSelectReady(row, axisDecision, cardinality = "unspecified") {
  if (row.checkpoint !== "figures.event_study") return true;
  return Boolean(axisDecision) || ["single", "multiple"].includes(cardinality);
}

const GENERAL_RULES = Object.freeze([
  "Implement only the already-declared atomic input-to-output transition; do not invent a sample, estimand, merge key, treatment rule, axis group, sheet group, model, or output placement.",
  "Apply these rules to template selection, binding, adaptation, verification, and direct general-rule implementation. Select a template only when permitted bindings leave the complete atomic transition intact.",
  "If frame, algorithm, control flow, interface, or output contract must change, stop calling the result a template. Split at a natural state boundary when possible; otherwise use general_rule.",
  "Write the shortest readable Stata sequence with one final implementation path and shallow indentation. Prefer one active loop; use depth two only for substantial repetition over two plain named lists or numeric ranges when the same mechanical body and all research choices remain visible. Never use depth three.",
  "Do not create a program, wrapper, registry, dispatcher, positional job string, hidden branch, unused option, future-facing interface, or unnecessary intermediate variable. The only standing program exception remains the canonical formatter for two or more sheets in one workbook.",
  "Do not probe or install dependencies, hide a core error with capture, use merge m:m, force-drop duplicates, write to raw data, or emit TeX.",
  "Keep native factor-variable expressions and raw e(b) coefficient names; do not generate manual event dummies, rename event coefficients, or reconstruct coefficient tables.",
  "Preserve the active output contract: direct one-sheet outreg2 uses an explicit .xls target, multi-sheet output uses the canonical .xlsx formatter, figures use PDF, and durable estimates use .ster only when needed.",
  "Lint the completed target immediately, then verify runtime state and exact declared outputs. Remove superseded attempts before freezing.",
  "A highest-ranked inspected candidate may be retained only as a nonbinding hint. Nearest is rank-relative and may still be absolutely distant or incompatible. Record nearest_template_hint=<label_id|none>, template_status=<no_suitable_template|wrong_selection|project_specific_contract>, and hint_used=<borrowed idea|none>.",
]);

function generalRulePolicy(args, context = {}) {
  const hardStopReasons = [];
  if (args.checkpoint === "figures.event_study") {
    const status = context.axisPatternSelection?.status;
    if (["invalid_profile", "mixed_profile_requires_explicit_rendering_mode", "axis_profile_has_no_supported_pattern"].includes(status)) {
      hardStopReasons.push(`event-study axis contract is unresolved: ${status}`);
    } else if (status === "metadata_inspection_no_axis_profile") {
      hardStopReasons.push("event-study outcome cardinality or a complete axis profile must be declared before writing");
    }
  }
  if (args.checkpoint === "final_excel_assembly") {
    if (!context.requestedFlow?.selection_ready) {
      hardStopReasons.push("final Excel output_flow_profile is incomplete; workbook, sheet, ordered estimates, and required lineage must be fixed before writing");
    } else if (context.requestedFlow.formatter_required && !context.writableCandidateCount) {
      hardStopReasons.push("two or more sheets in one workbook require the compatible canonical formatter; repair or reselect its declared interface rather than bypassing it");
    }
  }
  const reportPolicy = context.reportPolicy || "caller_selected";
  const reportRule = reportPolicy === "required"
    ? "Record every selected template and substantive general-rule span in root report.md with the actual .do path and one-based inclusive lines."
    : reportPolicy === "disabled"
      ? "Do not create or modify report.md; retain template and general-rule evidence in the session only."
      : reportPolicy === "optional"
        ? "report.md may be omitted. If the project already maintains it or the caller chooses to create it, record selected template and substantive general-rule spans consistently."
        : "Apply the caller-selected report_policy before deciding whether report.md is required, optional, or forbidden.";
  return {
    mode: "general_rule",
    always_applies: true,
    implementation_allowed: hardStopReasons.length === 0,
    template_role: "optional specialization for one complete compatible atomic transition",
    template_selection_rule: context.writableCandidateCount
      ? "select one genuinely close writable template only when permitted bindings leave the complete atomic transition intact; otherwise use general_rule with the rank-relative nearest candidate retained only as a nonbinding hint"
      : (hardStopReasons.length ? "stop_and_complete_contract_or_reselect" : "use general_rule for the declared atomic transition"),
    application_scope: [
      "every substantive atomic transition",
      "every template selection, binding, adaptation, and verification",
      "every direct implementation when no complete compatible template exists",
    ],
    closest_template_evidence: context.closestCandidate ? {
      label_id: context.closestCandidate.row.label_id,
      variant_id: context.closestCandidate.row.variant_id,
      checkpoint: context.closestCandidate.row.checkpoint,
      code: context.closestCandidate.row.code,
      source_path: context.closestCandidate.row.source_path,
      source_spans: context.closestCandidate.row.source_spans,
      source_package_id: packageIdFromSourcePath(context.closestCandidate.row.source_path),
      source_review: sourcePackageReview(context.closestCandidate.row),
      input_contract: context.closestCandidate.row.input_contract,
      output_contract: context.closestCandidate.row.output_contract,
      template_input_profile: context.closestCandidate.row.template_input_profile,
      template_input_profile_comparison: context.closestCandidate.templateInputProfileComparison,
      rubric_classification: rubricClassification(context.closestCandidate.row),
      auto_select_allowed: context.closestCandidateWritable,
      hint_role: "nonbinding_rank_relative_hint",
      absolute_compatibility: "not_established",
      rank_basis: "highest-ranked inspected candidate within the requested checkpoint and specificity, cardinality, axis, and output-flow gates",
      comparison_rule: "This is only the highest-ranked inspected candidate and may still be absolutely distant or incompatible. Under the general rules, borrow only useful commands, ordering, state handling, or output idioms, if any.",
    } : {
      label_id: null,
      variant_id: null,
      rubric_classification: null,
      auto_select_allowed: false,
      hint_role: "none",
      absolute_compatibility: "not_available",
      comparison_rule: "No ranked candidate was returned. Record nearest_template_hint=none, template_status=no_suitable_template, hint_used=none, and the exact searched checkpoint plus command/state anchors.",
    },
    hard_stop_reasons: hardStopReasons,
    hard_stop_rule: "General rules never supply a missing substantive research choice and never bypass event-axis, raw-table, sheet-cardinality, merge-key, sample, estimator, or output contracts.",
    rules: [...GENERAL_RULES, reportRule],
    report_policy: reportPolicy,
    report_required: context.reportPolicy ? context.reportPolicy === "required" : null,
    report_path: "report.md",
  };
}

function sourcePackageReview(row) {
  const packageId = packageIdFromSourcePath(row.source_path);
  if (!packageId) {
    const derived = row.derivation_provenance && typeof row.derivation_provenance === "object";
    const sourceKind = row.source_kind || "unclassified_non_corpus_source";
    const derivedCanonical = derived || /derived|canonical/i.test(sourceKind);
    const lineageBasis = String(row.derivation_provenance?.based_on_source_path || row.source_path || row.source_file_sha256 || sourceKind);
    return {
      review_level: "not_applicable_source_snapshot",
      source_kind: sourceKind,
      evidence_class: derivedCanonical ? "derived_canonical" : "declared_source_snapshot",
      lineage_id: `${derivedCanonical ? "derived" : "snapshot"}:${crypto.createHash("sha256").update(lineageBasis).digest("hex").slice(0, 16)}`,
      independent_support: false,
      source_path: row.source_path,
      source_file_sha256: row.source_file_sha256,
      derivation_provenance: derived ? row.derivation_provenance : null,
      provenance_rule: derived
        ? "This is a declared derived canonical implementation, not raw source bytes. Verify its live hash, derivation record, referenced raw-source provenance, and runtime_verification separately."
        : "This source is a declared non-corpus snapshot rather than a corpus package, so package coverage maturity does not apply. Verify the named snapshot hash and any runtime_verification separately.",
    };
  }
  const coverage = PACKAGE_COVERAGE_BY_ID.get(packageId);
  const packageMetadata = PACKAGES.find((item) => String(item.project_id) === packageId) || {};
  if (!coverage) return { package_id: packageId, repository_doi: packageMetadata.repository_doi || null, article_doi: packageMetadata.article_doi || null, review_level: "coverage_not_built" };
  return {
    package_id: packageId,
    title: packageMetadata.title || null,
    journal: packageMetadata.journal || null,
    repository_doi: packageMetadata.repository_doi || null,
    article_doi: packageMetadata.article_doi || null,
    evidence_class: "external_research_source",
    lineage_id: `repository:${packageMetadata.repository_doi || packageId}`,
    independent_support: true,
    review_level: coverage.review_level,
    review_accounting: coverage.review_accounting,
    stage_review: coverage.stages[row.stage] || null,
    unresolved_questions: coverage.unresolved_questions,
  };
}

function labelRankingMetadata(row) {
  return JSON.stringify({
    checkpoint: row.checkpoint,
    variant_id: row.variant_id,
    stage: row.stage,
    unit_kind: row.unit_kind,
    purpose_ko: row.purpose_ko,
    aliases: row.aliases,
    command_anchors: row.command_anchors,
    research_situations: row.research_situations,
    selection_conditions: row.selection_conditions,
    input_contract: row.input_contract,
    output_contract: row.output_contract,
    required_signals: row.required_signals,
    state_signature: row.state_signature,
    template_input_profile: row.template_input_profile,
    method_family: row.method_family,
    specification_facet: row.specification_facet,
  }).toLowerCase();
}

function scoreLabeledCheckpoint(row, args) {
  if (!selectorSourceAuthorized(row)) return Number.NEGATIVE_INFINITY;
  let score = 0;
  if (args.checkpoint && row.checkpoint === args.checkpoint) score += 100;
  if (args.stage && row.stage === args.stage) score += 40;
  if (args.unit_kind && row.unit_kind === args.unit_kind) score += 35;
  if (args.variant_id && row.variant_id === args.variant_id) score += 120;
  if (args.decision && row.decision === args.decision) score += 25;
  const requestedCommands = unique((args.commands || []).map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  const anchors = new Set((row.command_anchors || []).map((value) => String(value).toLowerCase()));
  for (const command of requestedCommands) if (anchors.has(command)) score += 70;
  const terms = unique([
    ...tokenize(args.task || ""),
    ...tokenize(args.method || ""),
    ...tokenize(args.current_state || ""),
    ...tokenize(args.target_state || ""),
  ]);
  const haystack = labelRankingMetadata(row);
  for (const term of terms) if (haystack.includes(term)) score += 5;
  if (row.decision === "keep") score += 8;
  if (row.decision === "conditional_keep") score += 4;
  if (row.reuse_scope === "general") score += 24;
  if (row.reuse_scope === "method_specific") score += 12;
  if (row.reuse_scope === "project_specific") score -= 30;
  score += Number(row.readability_score || 0) * 2;
  score += Number(row.portability_score || 0) * 2;
  if (row.preferred_within_checkpoint) score += 18;
  if (row.canonical_default) score += 8;
  if (row.explicit_canonical_exception) score += 40;
  if (rubricClassification(row) === "preferred_candidate") score += 20;
  if (rubricClassification(row) === "conditional_candidate") score += 10;
  if (rubricClassification(row) === "reference_only") score -= 20;
  if (row.derivation_provenance?.independent_support === false) score -= 15;
  return score;
}

function searchLabeledCheckpoints(args) {
  if (args.checkpoint && !CHECKPOINTS.includes(args.checkpoint)) {
    throw new Error(`checkpoint는 다음 중 하나여야 합니다: ${CHECKPOINTS.join(", ")}`);
  }
  if (args.stage && !STAGES.includes(args.stage)) {
    throw new Error(`stage는 다음 중 하나여야 합니다: ${STAGES.join(", ")}`);
  }
  const includeDropped = Boolean(args.include_dropped);
  const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 20);
  const eligibleRows = LABELED_CHECKPOINTS.filter((row) => {
    // Guide mechanics are resolved by resolve_transition_evidence as an
    // always-present, non-competing companion layer.  They must never enter
    // the legacy template score or displace deposited/reusable examples.
    if (GUIDE_MECHANICS_LABEL_IDS.has(row.label_id)) return false;
    if (!selectorSourceAuthorized(row)) return false;
    if (!includeDropped && row.decision === "drop") return false;
    if (!args.include_project_specific && row.reuse_scope === "project_specific" && !row.explicit_canonical_exception) return false;
    if (args.checkpoint && row.checkpoint !== args.checkpoint) return false;
    // A checkpoint is the atomic state-transition contract.  A caller may also
    // pass a broader workflow stage from its project plan, but that coarse
    // stage must not hide a checkpoint-compatible label whose internal stage
    // is more precise (for example post_estimation inside an exports plan).
    // Keep stage as a ranking signal when checkpoint is exact.
    if (args.stage && !args.checkpoint && row.stage !== args.stage) return false;
    if (args.unit_kind && row.unit_kind !== args.unit_kind) return false;
    if (args.variant_id && row.variant_id !== args.variant_id) return false;
    if (args.decision && row.decision !== args.decision) return false;
    if (args.commands?.length) {
      const anchors = new Set((row.command_anchors || []).map((value) => String(value).toLowerCase()));
      if (!args.commands.some((value) => anchors.has(String(value).trim().toLowerCase()))) return false;
    }
    return true;
  });
  const specificityGate = args.variant_id
    ? { rows: eligibleRows, active: false, distinguishing_tokens: [], excluded_label_ids: [] }
    : gateByExplicitMethodContract(eligibleRows, `${args.method || ""} ${args.current_state || ""} ${args.target_state || ""}`);
  const requestedFlow = args.output_flow_profile
    ? buildOutputFlowProfile({ output_flow_evidence: { outcomes: [] } }, { output_flow_profile: args.output_flow_profile })
    : null;
  const requestedAxisProfile = args.event_study_axis_profile
    ? analyzeEventStudyAxisProfile(args.event_study_axis_profile)
    : null;
  const textEventOutcomeCardinality = requestedEventOutcomeCardinality(args);
  const profileOutcomeCount = requestedAxisProfile?.selection_ready
    ? requestedAxisProfile.expected_plots.length
      || requestedAxisProfile.axis_groups.reduce((count, group) => count + group.outcomes.length, 0)
    : 0;
  const eventOutcomeCardinality = profileOutcomeCount
    ? (profileOutcomeCount === 1 ? "single" : "multiple")
    : textEventOutcomeCardinality;
  const axisPatternSelection = eventStudyAxisPatternSelection(requestedAxisProfile, eventOutcomeCardinality);
  const cardinalityRows = specificityGate.rows.filter((row) => eventOutcomeCardinalityCompatible(row, eventOutcomeCardinality));
  const axisRows = cardinalityRows.filter((row) => eventStudyAxisPatternCompatible(row, requestedAxisProfile, eventOutcomeCardinality));
  const flowRows = axisRows.filter((row) => {
    if (row.checkpoint !== "final_excel_assembly") return true;
    if (row.label_id !== "export.regression_excel.from_ster_default_style.v1") return false;
    if (!requestedFlow) return true;
    return requestedFlow.selection_ready && requestedFlow.formatter_required;
  });
  const comparisonVariants = args.checkpoint === "final_excel_assembly"
    ? specificityGate.rows.filter((row) => row.checkpoint === "final_excel_assembly" && row.label_id !== "export.regression_excel.from_ster_default_style.v1").map((row) => ({
      label_id: row.label_id,
      variant_id: row.variant_id,
      use: "comparison_reference_only",
      rule: "A workbook with one sheet uses concise direct outreg2 replace/append code with an explicit .xls target and no program. The canonical .xlsx formatter is auto-selected only when one workbook requires two or more sheets.",
    }))
    : [];
  const targetInputProfile = args.target_input_profile || args.target_input_signature;
  const profileComparisons = flowRows.map((row) => ({ row, comparison: compareTemplateInputProfile(row.template_input_profile, targetInputProfile) }));
  const profileGate = {
    active: Boolean(targetInputProfile),
    excluded_label_ids: profileComparisons.filter((item) => item.comparison.status === "incompatible").map((item) => item.row.label_id),
    contradictions: profileComparisons.filter((item) => item.comparison.status === "incompatible").map((item) => ({ label_id: item.row.label_id, contradictions: item.comparison.contradictions })),
    rule: "Only a declared incompatible topology, time topology, or required-versus-absent variable characteristic excludes a template. Unknown and ordinary binding differences remain eligible.",
  };
  const inspectedCandidates = profileComparisons.map(({ row, comparison: templateInputProfileComparison }) => {
    const inputSignatureComparison = compareInputSignatures(row.input_signature, args.target_input_signature);
    const topologyScore = inputSignatureComparison.status === "aligned" ? 12
      : inputSignatureComparison.status === "semantic_review_required" ? -12 : 0;
    const profileScore = templateInputProfileComparison.status === "aligned" ? 12 : 0;
    return { row, score: scoreLabeledCheckpoint(row, args) + topologyScore + profileScore, inputSignatureComparison, templateInputProfileComparison };
  })
    .sort((a, b) => b.score - a.score || a.row.annotation_order - b.row.annotation_order);
  const candidates = inspectedCandidates
    .filter((item) => item.templateInputProfileComparison.status !== "incompatible")
    .filter((item) => item.score > 0 || (!args.task && !args.method && !args.current_state && !args.target_state))
    .slice(0, limit);

  const groups = {};
  for (const { row } of candidates) {
    if (!groups[row.variant_group]) groups[row.variant_group] = [];
    groups[row.variant_group].push({
      label_id: row.label_id,
      variant_id: row.variant_id,
      decision: row.decision,
      selection_conditions: row.selection_conditions,
    });
  }

  const writableCandidates = candidates.filter(({ row, inputSignatureComparison }) => rubricAutoSelectable(row)
    && inputSignatureComparison.status !== "semantic_review_required"
    && eventStudyAxisPatternCompatible(row, requestedAxisProfile, eventOutcomeCardinality)
    && eventStudyAxisAutoSelectReady(row, requestedAxisProfile, eventOutcomeCardinality));
  const closestCandidate = writableCandidates[0] || candidates[0] || inspectedCandidates[0] || null;
  const closestCandidateWritable = Boolean(closestCandidate
    && writableCandidates.some((item) => item.row.label_id === closestCandidate.row.label_id));
  const generalPolicy = generalRulePolicy(args, {
    axisPatternSelection,
    requestedFlow,
    writableCandidateCount: writableCandidates.length,
    closestCandidate,
    closestCandidateWritable,
  });

  return {
    query: {
      checkpoint: args.checkpoint || "",
      stage: args.stage || "",
      unit_kind: args.unit_kind || "",
      task: args.task || "",
      method: args.method || "",
      current_state: args.current_state || "",
      target_state: args.target_state || "",
      commands: args.commands || [],
      include_project_specific: Boolean(args.include_project_specific),
      target_input_signature: args.target_input_signature || null,
      target_input_profile: args.target_input_profile || null,
    },
    usage_rule: "Each result is one external-evidence-rubric-reviewed atomic state-transition block. Auto-select only preferred_candidate or conditional_candidate rows. Prefer general, then matching method_specific variants. Compare the target project with input_signature and template_input_profile as well as input_contract and selection_conditions. Apply general_rule_policy throughout. Choose one genuinely close complete block only when permitted bindings leave the complete atomic transition intact. If structural changes are required, discard it as a template, reselect once with the observed mismatch, then split at a natural boundary or use general_rule with the nearest inspected candidate retained only as a nonbinding hint. Ranking does not establish absolute similarity. Do not splice variants or fragments within a group. drop is comparison-only.",
    general_rule_policy: generalPolicy,
    variant_group_rule: "Choose at most one alternative within a variant_group. Distinct groups may represent sequential transitions and may be composed only in the actual producer-to-consumer order.",
    final_excel_rule: "Final Excel preserves the complete native raw outreg2 coefficient, standard-error, omitted/base, and note rows and adds exactly adjusted R-squared and the dependent-variable mean. A workbook with one sheet uses direct outreg2 replace/append code with an explicit .xls target and no program, regardless of model-column count; use the canonical .xlsx formatter only for a workbook with two or more sheets. First-stage results follow the same sheet-cardinality rule while remaining a separate model-role group.",
    output_flow_selection: requestedFlow || {
      selection_ready: false,
      rule: "Final Excel references may be inspected, but none may be auto-selected until output_flow_profile records complete outcome lineage, evidence-backed semantic sheet_groups defined once, and a reason for every workbook/sheet/sample placement in sheet_plan.",
    },
    event_study_axis_selection: requestedAxisProfile || {
      status: "not_declared",
      rule: "Automatic axes are the default. Declare a fixed_group only when closely related outcomes are directly comparable and share a specification, sample comparison, coefficient unit, and transform.",
    },
    stage_gate: {
      mode: args.stage
        ? (args.checkpoint ? "ranking_only_with_exact_checkpoint" : "hard_filter")
        : "not_requested",
      requested_stage: args.stage || "",
      rule: "An exact checkpoint defines the atomic transition. A simultaneous broad stage may rank matching labels but cannot exclude checkpoint-compatible labels.",
    },
    specificity_gate: publicSpecificityGate(specificityGate),
    event_outcome_cardinality_selection: {
      requested: eventOutcomeCardinality,
      request_text_inference: textEventOutcomeCardinality,
      profile_outcome_count: profileOutcomeCount,
      decision_source: profileOutcomeCount ? "event_study_axis_profile" : (["single", "multiple"].includes(textEventOutcomeCardinality) ? "task_text" : "not_declared"),
      excluded_label_ids: specificityGate.rows.filter((row) => !eventOutcomeCardinalityCompatible(row, eventOutcomeCardinality)).map((row) => row.label_id),
      rule: "Exactly one event-study outcome uses the direct no-loop variant; two or more outcomes use one flat loop. A ready explicit event_study_axis_profile overrides conflicting task-text cardinality.",
    },
    event_study_axis_pattern_gate: {
      active: args.checkpoint === "figures.event_study",
      status: axisPatternSelection.status,
      selection_ready_for_auto_select: requestedAxisProfile?.selection_ready === true || ["single", "multiple"].includes(eventOutcomeCardinality),
      requested: requestedAxisProfile?.rendering_mode || null,
      required_patterns: axisPatternSelection.required_patterns,
      excluded_label_ids: cardinalityRows.filter((row) => !eventStudyAxisPatternCompatible(row, requestedAxisProfile, eventOutcomeCardinality)).map((row) => row.label_id),
      rule: "One automatic outcome uses single_automatic_axis, multiple automatic outcomes use flat_loop_automatic_axis, an all-fixed profile uses flat_loop_fixed_group_axis, and only an explicit ready single_flat_mixed_axis_loop profile uses that mixed pattern. A mixed fixed-plus-automatic profile without the explicit rendering mode has no writable label. With neither an axis profile nor outcome cardinality, retain candidates for metadata inspection but set auto_select_allowed=false.",
    },
    template_input_profile_gate: profileGate,
    comparison_variants: comparisonVariants,
    variant_groups: groups,
    results: candidates.map(({ row, score, inputSignatureComparison, templateInputProfileComparison }) => ({
      score,
      label_id: row.label_id,
      checkpoint: row.checkpoint,
      variant_group: row.variant_group,
      variant_id: row.variant_id,
      stage: row.stage,
      unit_kind: row.unit_kind,
      name_ko: row.name_ko,
      name_en: row.name_en,
      purpose_ko: row.purpose_ko,
      aliases: row.aliases,
      decision: row.decision,
      transition_role: row.transition_role || "alternative",
      adaptation_mode: row.adaptation_mode,
      scope: row.scope || "atomic_checkpoint_block",
      does_not_specify: row.does_not_specify || [],
      research_situations: row.research_situations,
      selection_conditions: row.selection_conditions,
      input_contract: row.input_contract,
      input_signature: row.input_signature || null,
      template_input_profile: row.template_input_profile || null,
      template_input_profile_comparison: templateInputProfileComparison,
      input_signature_comparison: inputSignatureComparison,
      output_contract: row.output_contract,
      required_changes: row.required_changes,
      minimal_edit_fields: row.minimal_edit_fields,
      tradeoffs: row.tradeoffs,
      state_signature: row.state_signature || { requires: row.input_contract, observable_signals: [], produces: row.output_contract },
      event_axis_pattern: row.event_axis_pattern || null,
      selector_taxonomy: row.selector_taxonomy || null,
      command_anchors: row.command_anchors || [],
      required_signals: row.required_signals || [],
      forbidden_signals: row.forbidden_signals || [],
      canonical_default: Boolean(row.canonical_default),
      reuse_scope: row.reuse_scope,
      readability_score: row.readability_score,
      portability_score: row.portability_score,
      source_specific_elements: row.source_specific_elements,
      reusable_core: row.reusable_core,
      preferred_within_checkpoint: Boolean(row.preferred_within_checkpoint),
      explicit_canonical_exception: Boolean(row.explicit_canonical_exception),
      generality_rationale_ko: row.generality_rationale_ko,
      generality_review: row.generality_review,
      quality_rubric_review: row.quality_rubric_review,
      rubric_classification: rubricClassification(row),
      auto_select_allowed: rubricAutoSelectable(row)
        && inputSignatureComparison.status !== "semantic_review_required"
        && eventStudyAxisPatternCompatible(row, requestedAxisProfile, eventOutcomeCardinality)
        && eventStudyAxisAutoSelectReady(row, requestedAxisProfile, eventOutcomeCardinality),
      state_confidence: row.state_confidence || "weak",
      dictionary_evidence: dictionaryEvidence(row.checkpoint),
      source_package_review: sourcePackageReview(row),
      composition: row.composition,
      relationships: row.relationships,
      source: `${row.source_path}:${row.source_spans.map(([start, end]) => `${start}-${end}`).join(",")}`,
      source_kind: row.source_kind,
      source_file_sha256: row.source_file_sha256,
      code_sha256: row.code_sha256,
      max_loop_depth: row.max_loop_depth,
      runtime_verification: row.runtime_verification || { status: "not_run" },
      code: row.code,
      review_notes: row.review_notes,
    })),
    claim_boundary: "Human-labeled blocks preserve reviewed researcher variants and provenance; they are reusable parts, not journal certification or a guarantee that a target dataset satisfies the block's assumptions.",
  };
}

function inspectDictionaryCoverage(args) {
  if (!PACKAGE_COVERAGE) {
    throw new Error("package_checkpoint_coverage.json이 아직 생성되지 않았습니다. 패키지 전수 검토를 먼저 완료하세요.");
  }
  if (args.stage && !STAGES.includes(args.stage)) {
    throw new Error(`stage는 다음 중 하나여야 합니다: ${STAGES.join(", ")}`);
  }
  if (args.checkpoint && !CHECKPOINTS.includes(args.checkpoint)) {
    throw new Error(`checkpoint는 다음 중 하나여야 합니다: ${CHECKPOINTS.join(", ")}`);
  }
  if (args.package_id && !PACKAGE_COVERAGE_BY_ID.has(args.package_id)) {
    throw new Error(`알 수 없는 package_id: ${args.package_id}`);
  }
  const limit = Math.min(Math.max(Number(args.limit) || 35, 1), 35);
  const reusableCheckpointLabelIds = new Set(
    LABELED_CHECKPOINTS.filter((row) => row.decision !== "drop" && (!args.checkpoint || row.checkpoint === args.checkpoint)).map((row) => row.label_id),
  );
  const droppedCheckpointLabelIds = new Set(
    LABELED_CHECKPOINTS.filter((row) => row.decision === "drop" && (!args.checkpoint || row.checkpoint === args.checkpoint)).map((row) => row.label_id),
  );
  const results = PACKAGE_COVERAGE.packages.filter((row) => {
    if (args.package_id && row.package_id !== args.package_id) return false;
    if (args.review_level && row.review_level !== args.review_level) return false;
    if (args.checkpoint) {
      const reusableMatch = row.files.some((file) => file.label_ids.some((labelId) => reusableCheckpointLabelIds.has(labelId)));
      const droppedMatch = row.files.some((file) => file.label_ids.some((labelId) => droppedCheckpointLabelIds.has(labelId)));
      const candidateMatch = row.unlabeled_reusable_candidates.some((item) => item.checkpoint === args.checkpoint);
      if (!reusableMatch && !candidateMatch && !(args.include_dropped && droppedMatch)) return false;
    }
    if (args.stage && row.stages[args.stage].status === "absent") return false;
    if (args.only_gaps) {
      const reusableMatch = args.checkpoint && row.files.some((file) => file.label_ids.some((labelId) => reusableCheckpointLabelIds.has(labelId)));
      const droppedMatch = args.checkpoint && row.files.some((file) => file.label_ids.some((labelId) => droppedCheckpointLabelIds.has(labelId)));
      const candidateMatch = args.checkpoint && row.unlabeled_reusable_candidates.some((item) => item.checkpoint === args.checkpoint);
      const isStageGap = (stage) => (
        stage.status === "uncertain"
        || ["negative_only", "no_safe_block"].includes(stage.reusable_disposition)
      ) && stage.reusable_label_count === 0;
      const stageGap = args.stage ? isStageGap(row.stages[args.stage]) : Object.values(row.stages).some(isStageGap);
      const checkpointGap = Boolean(args.checkpoint && !reusableMatch && !candidateMatch && args.include_dropped && droppedMatch);
      if (row.review_level === "end_to_end_read" && !checkpointGap && !stageGap && row.unlabeled_reusable_candidates.length === 0 && row.unresolved_questions.length === 0) return false;
    }
    return true;
  }).slice(0, limit).map((row) => {
    const reusableMatch = args.checkpoint && row.files.some((file) => file.label_ids.some((labelId) => reusableCheckpointLabelIds.has(labelId)));
    const droppedMatch = args.checkpoint && row.files.some((file) => file.label_ids.some((labelId) => droppedCheckpointLabelIds.has(labelId)));
    const candidateMatch = args.checkpoint && row.unlabeled_reusable_candidates.some((item) => item.checkpoint === args.checkpoint);
    const stages = args.stage ? { [args.stage]: row.stages[args.stage] } : row.stages;
    const files = args.include_files
      ? row.files.filter((file) => !args.stage || file.stages.includes(args.stage)).map((file) => ({
        path: file.path,
        lines: file.lines,
        stages: file.stages,
        commands: file.commands,
        max_loop_depth: file.max_loop_depth,
        tex_output: file.tex_output,
        label_ids: file.label_ids,
      }))
      : undefined;
    return {
      package_id: row.package_id,
      title: row.title,
      journal: row.journal,
      review_level: row.review_level,
      review_accounting: row.review_accounting,
      workflow_order: row.workflow_order,
      stages,
      label_count: row.label_count,
      reusable_label_count: row.reusable_label_count,
      labeled_checkpoints: row.labeled_checkpoints,
      unlabeled_reusable_candidates: row.unlabeled_reusable_candidates,
      unresolved_questions: row.unresolved_questions,
      match_kind: !args.checkpoint
        ? "package_or_stage"
        : reusableMatch
          ? "reusable_label"
          : candidateMatch
            ? "unlabeled_candidate"
            : droppedMatch
              ? "drop_only"
              : "stage_only",
      ...(files ? { files } : {}),
    };
  });
  return {
    query: {
      package_id: args.package_id || "",
      stage: args.stage || "",
      checkpoint: args.checkpoint || "",
      review_level: args.review_level || "",
      only_gaps: Boolean(args.only_gaps),
      include_dropped: Boolean(args.include_dropped),
    },
    corpus_summary: PACKAGE_COVERAGE.summary,
    dictionary_summary: {
      headwords: WORKFLOW_DICTIONARY.entries.length,
      variants: WORKFLOW_DICTIONARY.entries.reduce((total, entry) => total + entry.variants.length, 0),
      maturity_counts: WORKFLOW_DICTIONARY.entries.reduce((counts, entry) => {
        counts[entry.maturity] = (counts[entry.maturity] || 0) + 1;
        return counts;
      }, {}),
    },
    results,
    interpretation_rule: "Label count and package coverage are separate. end_to_end_read proves full .do accounting; it does not make every block reusable. Prefer labeled variants, and treat negative_only/no_safe_block as anti-pattern evidence.",
    official_mechanics_rule: "If the fine-grained dictionary and every approved corpus example lack a compatible transition, consult the official Stata manual for mechanics. Ask the user when the remaining choice is substantive rather than syntactic.",
  };
}

function compareInputSignatures(templateSignature, targetSignature) {
  const template = templateSignature && typeof templateSignature === "object" ? templateSignature : {};
  const target = targetSignature && typeof targetSignature === "object" ? targetSignature : {};
  const known = (value) => value !== null && value !== undefined && String(value).trim() !== "" && !/^(?:unknown|not[_ ]stated|n\/a)$/i.test(String(value).trim());
  const verifiedMatches = [];
  const semanticMismatches = [];
  const bindingChanges = [];
  if (known(template.data_structure) && known(target.data_structure)) {
    if (String(template.data_structure).toLowerCase() === String(target.data_structure).toLowerCase()) verifiedMatches.push("data_structure");
    else semanticMismatches.push({ field: "data_structure", template: template.data_structure, target: target.data_structure });
  }
  for (const field of ["observation_unit", "time_structure"]) {
    if (known(template[field]) && known(target[field])) {
      if (String(template[field]).toLowerCase() === String(target[field]).toLowerCase()) verifiedMatches.push(field);
      else bindingChanges.push({ field, template: template[field], target: target[field], action: `replace the template ${field} binding with the verified target binding` });
    }
  }
  const templateKeys = rowsForSignature(template.required_keys);
  const targetKeys = rowsForSignature(target.required_keys);
  if (templateKeys.length && targetKeys.length) {
    const sameKeys = templateKeys.length === targetKeys.length && templateKeys.every((value) => targetKeys.map((item) => item.toLowerCase()).includes(value.toLowerCase()));
    if (sameKeys) verifiedMatches.push("required_keys");
    else bindingChanges.push({ field: "required_keys", template: templateKeys, target: targetKeys, action: "bind the template key roles to the target project's verified keys" });
  }
  const templateKnown = [template.data_structure, template.observation_unit, template.time_structure].some(known) || templateKeys.length > 0;
  const targetKnown = [target.data_structure, target.observation_unit, target.time_structure].some(known) || targetKeys.length > 0;
  let status = "insufficient_evidence";
  if (semanticMismatches.length) status = "semantic_review_required";
  else if (bindingChanges.length) status = "minimal_binding_changes_required";
  else if (templateKnown && targetKnown && verifiedMatches.length) status = "aligned";
  return {
    status,
    verified_matches: verifiedMatches,
    semantic_mismatches: semanticMismatches,
    binding_changes: bindingChanges,
    template_unknown: !templateKnown,
    target_unknown: !targetKnown,
    rule: "input_signature describes evidenced source topology for matching and edit planning. A mismatch triggers review or minimal binding changes; it never licenses invented keys, units, or time variables.",
  };
}

function rowsForSignature(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function normalizeTemplateInputProfile(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    data_structure: source.data_structure || source.topology || "",
    observation_unit: source.observation_unit || source.record_unit || "",
    required_keys: rowsForSignature(source.required_keys),
    source_basis: source.source_basis || "",
    time_structure: source.time_structure || "",
    variable_characteristics: rowsForSignature(source.variable_characteristics),
  };
}

function knownProfileValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "" && !/^(?:unknown|not[_ ]stated|n\/a)$/i.test(String(value).trim());
}

function meaningfulProfileRows(values) {
  return rowsForSignature(values).filter(knownProfileValue);
}

function scalarProfileComparison(templateValue, targetValue, gating = false) {
  const templateKnown = knownProfileValue(templateValue);
  const targetKnown = knownProfileValue(targetValue);
  if (!templateKnown || !targetKnown) {
    return { status: "neutral", template: templateValue || "", target: targetValue || "", gating };
  }
  const aligned = String(templateValue).trim().toLowerCase() === String(targetValue).trim().toLowerCase();
  return { status: aligned ? "aligned" : "different", template: templateValue, target: targetValue, gating };
}

function compareProfileSourceBasis(templateValue, targetValue) {
  const templateKnown = knownProfileValue(templateValue);
  const targetKnown = knownProfileValue(targetValue);
  if (!targetKnown) {
    return { status: "neutral", template: templateValue || "", target: targetValue || "", gating: false };
  }
  if (!templateKnown) {
    return { status: "review_required", template: templateValue || "", target: targetValue, gating: false };
  }
  const normalize = (value) => String(value).trim().toLowerCase().replaceAll("\\", "/").replace(/\s+/g, " ");
  const template = normalize(templateValue);
  const target = normalize(targetValue);
  const status = template === target
    ? "aligned"
    : ((template.length >= 8 && target.includes(template)) || (target.length >= 8 && template.includes(target)))
      ? "review_required"
      : "different";
  return { status, template: templateValue, target: targetValue, gating: false };
}

function topologyTags(value) {
  const text = String(value || "").toLowerCase();
  const tags = new Set();
  if (/topology[ _-]?neutral|any data structure/.test(text)) return tags;
  if (/stored|e-class|eclass|estimate/.test(text)) tags.add("stored_estimates");
  if (/wide|worksheet/.test(text)) tags.add("wide");
  if (/panel/.test(text)) tags.add("panel");
  if (/cross[ _-]?section/.test(text)) tags.add("cross_section");
  if (/\blong\b/.test(text)) tags.add("long");
  return tags;
}

function hasContradictoryTopology(templateValue, targetValue) {
  const template = topologyTags(templateValue);
  const target = topologyTags(targetValue);
  if (!template.size || !target.size) return false;
  const exclusive = ["stored_estimates", "wide", "cross_section"];
  if (exclusive.some((tag) => template.has(tag) && !target.has(tag))) return true;
  if (exclusive.some((tag) => target.has(tag) && !template.has(tag))) return true;
  return (template.has("panel") && target.has("cross_section")) || (target.has("panel") && template.has("cross_section"));
}

function profileNegativeTraits(values) {
  return new Set(rowsForSignature(values)
    .map((value) => String(value).toLowerCase())
    .flatMap((value) => {
      const matches = [];
      for (const [trait, pattern] of Object.entries({
        endogenous: /endogenous/, instrument: /instrument/, event: /event|lead|lag|pretrend/, time: /time|year|period|wave/,
      })) if (/(?:^|\s)(?:no|without|none|absent)(?:\s|$)/.test(value) && pattern.test(value)) matches.push(trait);
      return matches;
    }));
}

function profileRequiredTraits(values) {
  const traits = new Set();
  for (const value of rowsForSignature(values)) {
    const text = String(value).toLowerCase();
    if (/endogenous/.test(text)) traits.add("endogenous");
    if (/excluded instrument|instrument/.test(text)) traits.add("instrument");
    if (/native factor-variable event|event coefficient|event-time/.test(text)) traits.add("event");
    if (/year|time|period|wave/.test(text)) traits.add("time");
  }
  return traits;
}

function compareTemplateInputProfile(templateProfile, targetProfile) {
  const template = normalizeTemplateInputProfile(templateProfile);
  const target = normalizeTemplateInputProfile(targetProfile);
  const templateKnown = [template.data_structure, template.observation_unit, template.time_structure].some(knownProfileValue)
    || template.required_keys.length > 0 || template.variable_characteristics.length > 0;
  const targetKnown = [target.data_structure, target.observation_unit, target.time_structure].some(knownProfileValue)
    || target.required_keys.length > 0 || target.variable_characteristics.length > 0;
  const verifiedMatches = [];
  const contradictions = [];
  const fieldComparisons = {
    data_structure: scalarProfileComparison(template.data_structure, target.data_structure, true),
    record_unit: scalarProfileComparison(template.observation_unit, target.observation_unit, false),
    required_keys: { status: "neutral", template: template.required_keys, target: target.required_keys, gating: false },
    source_basis: compareProfileSourceBasis(template.source_basis, target.source_basis),
    time_structure: scalarProfileComparison(template.time_structure, target.time_structure, true),
    variable_characteristics: { status: "neutral", template: template.variable_characteristics, target: target.variable_characteristics, gating: true },
  };
  if (knownProfileValue(template.data_structure) && knownProfileValue(target.data_structure)) {
    if (hasContradictoryTopology(template.data_structure, target.data_structure)) {
      contradictions.push({ field: "data_structure", template: template.data_structure, target: target.data_structure });
      fieldComparisons.data_structure.status = "incompatible";
    } else if ([...topologyTags(template.data_structure)].some((tag) => topologyTags(target.data_structure).has(tag))) {
      verifiedMatches.push("data_structure");
      fieldComparisons.data_structure.status = "aligned";
    }
  }
  if (knownProfileValue(template.time_structure) && knownProfileValue(target.time_structure)) {
    if (hasContradictoryTopology(template.time_structure, target.time_structure)) {
      contradictions.push({ field: "time_structure", template: template.time_structure, target: target.time_structure });
      fieldComparisons.time_structure.status = "incompatible";
    } else if (String(template.time_structure).toLowerCase() === String(target.time_structure).toLowerCase()) {
      verifiedMatches.push("time_structure");
      fieldComparisons.time_structure.status = "aligned";
    }
  }
  const requiredTraits = profileRequiredTraits(template.variable_characteristics);
  const absentTraits = profileNegativeTraits(target.variable_characteristics);
  for (const trait of requiredTraits) if (absentTraits.has(trait)) contradictions.push({ field: "variable_characteristics", template: trait, target: `no ${trait}` });
  const templateKeys = rowsForSignature(template.required_keys);
  const targetKeys = rowsForSignature(target.required_keys);
  if (templateKeys.length && targetKeys.length) {
    const keysAligned = templateKeys.map((value) => value.toLowerCase()).every((value) => targetKeys.map((item) => item.toLowerCase()).includes(value));
    fieldComparisons.required_keys.status = keysAligned ? "aligned" : "different";
    if (keysAligned) verifiedMatches.push("required_keys");
  }
  const templateVariables = meaningfulProfileRows(template.variable_characteristics);
  const targetVariables = meaningfulProfileRows(target.variable_characteristics);
  if (contradictions.some((item) => item.field === "variable_characteristics")) {
    fieldComparisons.variable_characteristics.status = "incompatible";
  } else if (templateVariables.length && targetVariables.length) {
    const targetSet = new Set(targetVariables.map((value) => value.toLowerCase()));
    fieldComparisons.variable_characteristics.status = templateVariables.every((value) => targetSet.has(value.toLowerCase())) ? "aligned" : "different";
  }
  return {
    status: contradictions.length ? "incompatible" : verifiedMatches.length ? "aligned" : "neutral",
    verified_matches: verifiedMatches,
    contradictions,
    field_comparisons: fieldComparisons,
    non_gating_evidence: {
      record_unit: fieldComparisons.record_unit,
      source_basis: fieldComparisons.source_basis,
    },
    template_unknown: !templateKnown,
    target_unknown: !targetKnown,
    rule: "template_input_profile reports all six fields. Only declared contradictory topology, time topology, or required-versus-absent variable characteristics block a label; record-unit and source-basis differences are explicit non-gating evidence.",
  };
}

const MATERIAL_ALTERNATIVE_LIMIT = 2;

function normalizeEvidenceCommand(value) {
  return canonicalReferenceCommand(String(value || "").trim().toLowerCase());
}

function normalizedCardCommands(card) {
  return unique((card.command_anchors || []).map(normalizeEvidenceCommand).filter(Boolean));
}

function normalizeStateSignals(values) {
  return unique((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean));
}

function cardStateMatches(card, transition) {
  const signature = card.state_signature || {};
  const current = normalizeStateSignals(transition.current_state_signals);
  const target = normalizeStateSignals(transition.target_state_signals);
  const availableCurrent = new Set([
    ...normalizeStateSignals(signature.requires),
    ...normalizeStateSignals(signature.observable_signals),
  ]);
  const availableTarget = new Set(normalizeStateSignals(signature.produces));
  return current.every((signal) => availableCurrent.has(signal))
    && target.every((signal) => availableTarget.has(signal));
}

function materialAlternativeMetadata(card) {
  const stataCompatibility = cardStataCompatibility(card);
  return {
    layer_id: card.layer_id,
    label_id: card.label_id,
    checkpoint: card.checkpoint,
    variant_group: card.variant_group,
    variant_id: card.variant_id,
    command_anchors: card.command_anchors || [],
    authority_tier: card.authority_tier || null,
    source_tier: card.source_tier || card.evidence_layer,
    evidence_role: card.evidence_role || null,
    contract_ids: card.contract_ids || [],
    supplemental_contract_id: card.supplemental_contract_id || null,
    unmapped_reason: card.unmapped_reason || null,
    variant_facets: card.variant_facets || {},
    version: card.version ?? card.provenance?.version ?? null,
    stata_compatibility: stataCompatibility,
    version_semantics: versionSemantics(card, stataCompatibility),
    disposition: card.disposition || null,
    code_available: card.code_available !== false && Boolean(card.code),
    provenance: card.provenance || null,
  };
}

function publicGuideCard(card) {
  if (!card) return null;
  const stataCompatibility = cardStataCompatibility(card);
  return {
    layer_id: card.layer_id,
    label_id: card.label_id,
    checkpoint: card.checkpoint,
    variant_group: card.variant_group,
    variant_id: card.variant_id,
    contract_ids: card.contract_ids || [],
    variant_facets: card.variant_facets || {},
    version: card.version ?? card.provenance?.version ?? null,
    stata_compatibility: stataCompatibility,
    version_semantics: versionSemantics(card, stataCompatibility),
    authority_tier: card.authority_tier,
    command_anchors: card.command_anchors || [],
    state_signature: card.state_signature || {},
    template_input_profile: card.template_input_profile || {},
    manual_urls: card.manual_urls || [],
    code_available: false,
    auto_selectable: false,
    research_decisions_supplied: false,
    provenance: card.provenance || null,
  };
}

function publicUsageExample(card, profileComparison) {
  if (!card) return null;
  const stataCompatibility = cardStataCompatibility(card);
  return {
    layer_id: card.layer_id,
    label_id: card.label_id,
    checkpoint: card.checkpoint,
    variant_group: card.variant_group,
    variant_id: card.variant_id,
    contract_ids: card.contract_ids || [],
    variant_facets: card.variant_facets || {},
    version: card.version ?? card.provenance?.version ?? null,
    stata_compatibility: stataCompatibility,
    version_semantics: versionSemantics(card, stataCompatibility),
    command_anchors: card.command_anchors || [],
    state_signature: card.state_signature || {},
    template_input_profile: card.template_input_profile || {},
    template_input_profile_comparison: profileComparison,
    selection_conditions: card.selection_conditions || [],
    minimal_edit_fields: card.minimal_edit_fields || [],
    code: card.code || "",
    auto_selectable: card.auto_selectable === true,
    source_tier: card.source_tier,
    provenance: card.provenance || null,
  };
}

function stableEvidenceValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableEvidenceValue).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableEvidenceValue(value[key])}`).join(",")}}`;
  }
  if (typeof value === "string") return JSON.stringify(value.trim().toLowerCase());
  return JSON.stringify(value);
}

function cardVersion(card) {
  return card.version ?? card.provenance?.version ?? null;
}

function numericStataVersion(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(?:stata\s*)?(\d+(?:\.\d+)?)$/i);
  return match ? Number(match[1]) : null;
}

function requestedStataCompatibility(version) {
  if (version && typeof version === "object" && !Array.isArray(version)) {
    const exact = numericStataVersion(version.stata);
    return exact === null ? null : { kind: "exact", value: exact };
  }
  const exact = numericStataVersion(version);
  return exact === null ? null : { kind: "exact", value: exact };
}

function cardStataCompatibility(card) {
  const version = cardVersion(card);
  if (version && typeof version === "object" && !Array.isArray(version)) {
    const exact = numericStataVersion(version.stata);
    return exact === null ? null : { kind: "exact", value: exact };
  }
  const exact = numericStataVersion(version);
  if (exact !== null) return { kind: "exact", value: exact };
  if (typeof version === "string") {
    const introduced = version.match(/\bintroduced\s+stata\s+(\d+(?:\.\d+)?)/i);
    if (introduced) return { kind: "minimum", value: Number(introduced[1]) };
  }
  // Null and free-text manual/source-edition notes carry provenance but do not
  // assert a Stata runtime compatibility boundary.
  return null;
}

function versionSemantics(card, compatibility = cardStataCompatibility(card)) {
  if (compatibility) return "stata_runtime_compatibility";
  return cardVersion(card) === null
    ? "unspecified_no_runtime_constraint"
    : "source_or_manual_edition_note_no_runtime_constraint";
}

function stataCompatibilityMatches(card, requestedVersion) {
  const requested = requestedStataCompatibility(requestedVersion);
  const evidence = cardStataCompatibility(card);
  if (!evidence) return true;
  if (!requested) return false;
  if (evidence.kind === "minimum") return requested.value >= evidence.value;
  return requested.value === evidence.value;
}

function hasMappedContract(card) {
  return Array.isArray(card.contract_ids)
    && card.contract_ids.some((value) => String(value || "").trim().length > 0);
}

function cardHasCompletePromotionGate(card) {
  const gate = card.provenance?.audit_gate || {};
  return card.auto_selectable === true
    && card.promotion_status === "audited_template"
    && gate.basis === "audited_template"
    && gate.promotion_status === "audited_template"
    && gate.source_hash_verified === true
    && gate.code_hash_verified === true
    && gate.runtime_status === "pass"
    && gate.selector_positive_status === "pass"
    && gate.selector_sibling_negative_status === "pass"
    && gate.auto_selectable_passed === true;
}

function exactCodeContractMatches(card, transition, requireVariant = true) {
  const requestedContracts = new Set((transition.contract_ids || [])
    .map((value) => String(value || "").trim()).filter(Boolean));
  const cardContracts = (card.contract_ids || []).map((value) => String(value || "").trim()).filter(Boolean);
  const requestedCommands = unique((transition.commands || []).map(normalizeEvidenceCommand).filter(Boolean));
  const anchors = new Set(normalizedCardCommands(card));
  if (!requestedContracts.size || !cardContracts.some((value) => requestedContracts.has(value))) return false;
  if (requireVariant && (!transition.variant_id || card.variant_id !== transition.variant_id)) return false;
  if (!requireVariant && transition.variant_id && card.variant_id !== transition.variant_id) return false;
  if (!requestedCommands.length || !requestedCommands.every((command) => anchors.has(command))) return false;
  if (!stataCompatibilityMatches(card, transition.version)) return false;
  const requestedFacets = transition.variant_facets;
  const cardFacets = card.variant_facets || {};
  if (requestedFacets && stableEvidenceValue(cardFacets) !== stableEvidenceValue(requestedFacets)) return false;
  if (!requestedFacets && Object.keys(cardFacets).length) return false;
  return true;
}

function guideMaterialKey(card) {
  return stableEvidenceValue({
    contract_ids: [...(card.contract_ids || [])].sort(),
    variant_id: card.variant_id || null,
    command_anchors: normalizedCardCommands(card).sort(),
    stata_compatibility: cardStataCompatibility(card),
    variant_facets: card.variant_facets || {},
    code_sha256: card.provenance?.code_sha256 || null,
  });
}

function filterEvidenceCards(cards, transition, options = {}) {
  const requestedCommands = unique((transition.commands || []).map(normalizeEvidenceCommand).filter(Boolean));
  const requestedContractIds = new Set((transition.contract_ids || []).map((value) => String(value).trim()).filter(Boolean));
  let rows = cards.slice();
  if (transition.checkpoint) rows = rows.filter((card) => card.checkpoint === transition.checkpoint || card.evidence_role === "exact_usage_support");
  else if (transition.stage) rows = rows.filter((card) => card.stage === transition.stage || card.evidence_role === "exact_usage_support");
  if (transition.unit_kind) rows = rows.filter((card) => card.unit_kind === transition.unit_kind || card.evidence_role === "exact_usage_support");
  if (transition.variant_group) rows = rows.filter((card) => card.variant_group === transition.variant_group);
  if (transition.variant_id) rows = rows.filter((card) => card.variant_id === transition.variant_id);
  if (requestedContractIds.size) {
    rows = rows.filter((card) => (card.contract_ids || []).some((contractId) => requestedContractIds.has(contractId)));
  }
  rows = rows.filter(hasMappedContract);
  if (requestedCommands.length) {
    const fullyCovered = rows.filter((card) => {
      const anchors = new Set(normalizedCardCommands(card));
      return requestedCommands.every((command) => anchors.has(command));
    });
    if (fullyCovered.length || !options.allowBoundedPartialCommandMatch) rows = fullyCovered;
    else rows = rows.filter((card) => normalizedCardCommands(card).includes(requestedCommands[0]));
  }
  if (transition.current_state_signals?.length || transition.target_state_signals?.length) {
    rows = rows.filter((card) => cardStateMatches(card, transition));
  }
  return rows.sort((left, right) => String(left.label_id).localeCompare(String(right.label_id)));
}

function validBoundedProducerConsumerException(transition) {
  const composition = transition.composition || {};
  const commands = unique((transition.commands || []).map(normalizeEvidenceCommand).filter(Boolean));
  return composition.kind === "inseparable_producer_consumer"
    && commands.length === 2
    && typeof composition.producer_state === "string"
    && composition.producer_state.trim().length > 0
    && composition.producer_state.trim() === String(composition.consumer_requires || "").trim();
}

function assessTransitionAtomicity(transition, evidenceCards) {
  const commands = unique((transition.commands || []).map(normalizeEvidenceCommand).filter(Boolean));
  if (commands.length <= 1) return { status: "atomic", commands };
  const jointlyCovered = evidenceCards.some((card) => {
    const anchors = new Set(normalizedCardCommands(card));
    return commands.every((command) => anchors.has(command));
  });
  if (jointlyCovered) return { status: "atomic_joint_command_contract", commands };
  if (validBoundedProducerConsumerException(transition)) {
    return {
      status: "bounded_inseparable_producer_consumer",
      commands,
      producer_state: transition.composition.producer_state,
    };
  }
  return {
    status: "split_required",
    commands,
    reason: "No single audited atomic evidence card covers every requested command, and no exact bounded producer-consumer handoff was declared.",
  };
}

function unresolvedSubstantiveChoices(args) {
  const choices = args.substantive_choices || {};
  const unresolved = unique((choices.unresolved || []).map((value) => String(value).trim()).filter(Boolean));
  if (choices.status === "unresolved" && !unresolved.length) unresolved.push("unspecified substantive choice");
  return unresolved;
}

function resolveTransitionEvidence(args, sources = {}) {
  const transition = args.transition || {};
  const guideCards = sources.guideCards || GUIDE_MECHANICS_CARDS;
  const usageCards = sources.usageCards || RESEARCH_USAGE_EXAMPLES;
  const atomicity = assessTransitionAtomicity(transition, [...guideCards, ...usageCards]);
  const baseTransition = {
    checkpoint: transition.checkpoint || null,
    stage: transition.stage || null,
    unit_kind: transition.unit_kind || null,
    variant_group: transition.variant_group || null,
    variant_id: transition.variant_id || null,
    task: transition.task || "",
    commands: atomicity.commands,
    contract_ids: unique((transition.contract_ids || []).map((value) => String(value).trim()).filter(Boolean)),
    variant_facets: transition.variant_facets || {},
    version: transition.version ?? null,
    current_state_signals: normalizeStateSignals(transition.current_state_signals),
    target_state_signals: normalizeStateSignals(transition.target_state_signals),
    atomicity: atomicity.status,
  };
  if (atomicity.status === "split_required") {
    return {
      transition: baseTransition,
      guide_layer: { status: "not_evaluated_until_split", primary_card: null, material_alternatives: [] },
      usage_layer: { status: "not_evaluated_until_split", example: null, material_alternatives: [] },
      implementation_route: { mode: "split_required", reason: atomicity.reason, auto_select_allowed: false },
      safety: {
        guide_auto_selectable_count: 0,
        guide_and_usage_scores_combined: false,
        maximum_guide_cards: 1,
        maximum_material_alternatives: MATERIAL_ALTERNATIVE_LIMIT,
        maximum_usage_examples: 1,
        bounded_composition: false,
      },
    };
  }

  const allowBoundedPartialCommandMatch = atomicity.status === "bounded_inseparable_producer_consumer";
  const guides = filterEvidenceCards(guideCards, transition, { allowBoundedPartialCommandMatch });
  const usagesBeforeProfile = filterEvidenceCards(usageCards, transition, { allowBoundedPartialCommandMatch });
  const targetProfile = args.target_input_profile || null;
  const usageComparisons = usagesBeforeProfile.map((card) => ({
    card,
    comparison: compareTemplateInputProfile(card.template_input_profile, targetProfile),
  }));
  const profileMismatches = usageComparisons.filter((item) => item.comparison.status === "incompatible");
  const compatibleUsages = usageComparisons.filter((item) => item.comparison.status !== "incompatible");
  const autoUsages = compatibleUsages.filter((item) => cardHasCompletePromotionGate(item.card)
    && item.card.decision !== "drop"
    && exactCodeContractMatches(item.card, transition));
  const unresolved = unresolvedSubstantiveChoices(args);
  const materialVariants = unique(autoUsages.map((item) => `${item.card.variant_group || ""}:${item.card.variant_id || item.card.label_id}`));
  const multipleVariants = materialVariants.length > 1 && !transition.variant_id;
  const declarationMatchedGuides = guides.filter((card) => exactCodeContractMatches(card, transition, false));
  const exactGuides = declarationMatchedGuides.filter((card) => exactCodeContractMatches(card, transition));
  const guideMaterials = new Map();
  for (const card of declarationMatchedGuides) {
    const key = guideMaterialKey(card);
    if (!guideMaterials.has(key)) guideMaterials.set(key, card);
  }
  const materialGuides = [...guideMaterials.values()];
  const guideAmbiguous = materialGuides.length > 1;
  const primaryGuide = exactGuides.length > 0 && materialGuides.length === 1 ? materialGuides[0] : null;
  const guideAlternatives = (guideAmbiguous ? materialGuides : guides.filter((card) => card !== primaryGuide))
    .slice(0, MATERIAL_ALTERNATIVE_LIMIT).map(materialAlternativeMetadata);
  const guideSelectionMissing = guides.length > 0 && exactGuides.length === 0 && !guideAmbiguous;

  let routeMode;
  let routeReason;
  let selectedUsage = null;
  if (guideAmbiguous) {
    routeMode = "selection_required";
    routeReason = "Multiple materially distinct guide mechanics variants remain; no guide code or usage template can be selected.";
  } else if (guideSelectionMissing) {
    routeMode = "selection_required";
    routeReason = "Guide metadata requires simultaneous exact contract, variant, command-anchor, declared Stata compatibility, and material-facet declarations.";
  } else if (unresolved.length) {
    routeMode = "selection_required";
    routeReason = `Unresolved substantive choice(s): ${unresolved.join(", ")}`;
  } else if (multipleVariants) {
    routeMode = "selection_required";
    routeReason = "Multiple materially distinct audited usage variants remain after deterministic filtering.";
  } else if (autoUsages.length === 1 && primaryGuide) {
    routeMode = "guide+usage_template";
    routeReason = "Exactly one audited research-usage example matches the declared variant, command, state, and profile gates.";
    selectedUsage = autoUsages[0];
  } else if (usagesBeforeProfile.length || compatibleUsages.length) {
    routeMode = "guide+general_rule";
    routeReason = profileMismatches.length
      ? "Known target-profile contradiction blocks research-usage auto-selection."
      : "Only reference, non-auto-selectable, or non-unique research usage remains.";
  } else {
    routeMode = "guide_informed_general_rule";
    routeReason = "No research-usage example matches the declared atomic transition.";
  }

  return {
    transition: baseTransition,
    guide_layer: {
      status: guideAmbiguous ? "ambiguous_variant"
        : primaryGuide ? "provided"
          : guideSelectionMissing ? "selection_required" : "not_available",
      primary_card: publicGuideCard(primaryGuide),
      material_alternatives: guideAlternatives,
      ambiguity_state: guideAmbiguous ? "material_variants_remain"
        : guideSelectionMissing ? "exact_declaration_incomplete_or_mismatched" : "none",
      selection_rule: "Guide mechanics remain a non-competing metadata companion. Deposited research-usage code is returned only for one exact contract, variant, command-anchor, declared Stata compatibility, and material-facet match; free-text manual/source-edition notes do not act as runtime gates, and material ambiguity fails closed.",
    },
    usage_layer: {
      status: selectedUsage ? "audited_exact_match"
        : profileMismatches.length ? "profile_mismatch"
          : usagesBeforeProfile.some((item) => item.evidence_role === "exact_usage_support") ? "exact_usage_support_only"
            : usagesBeforeProfile.length ? "reference_or_ambiguous" : "not_available",
      example: selectedUsage ? publicUsageExample(selectedUsage.card, selectedUsage.comparison) : null,
      material_alternatives: compatibleUsages
        .filter((item) => !selectedUsage || item.card.layer_id !== selectedUsage.card.layer_id)
        .slice(0, MATERIAL_ALTERNATIVE_LIMIT)
        .map((item) => materialAlternativeMetadata(item.card)),
      profile_mismatches: profileMismatches.slice(0, MATERIAL_ALTERNATIVE_LIMIT).map((item) => ({
        ...materialAlternativeMetadata(item.card),
        contradictions: item.comparison.contradictions,
      })),
      selection_rule: "Research usage is filtered independently. A known profile contradiction, unresolved substantive choice, or multiple material variants prevents auto-selection.",
    },
    implementation_route: {
      mode: routeMode,
      reason: routeReason,
      auto_select_allowed: routeMode === "guide+usage_template",
      unresolved_substantive_choices: unresolved,
    },
    safety: {
      guide_auto_selectable_count: guides.filter((card) => card.auto_selectable === true).length,
      guide_exists_but_omitted: guides.length > 0 && !primaryGuide,
      guide_and_usage_scores_combined: false,
      deterministic_filters: ["contract", "variant", "command", "version", "material_facets", "state", "profile"],
      contractless_comparison_only_counts: {
        guide: guideCards.filter((card) => !hasMappedContract(card)).length,
        usage: usageCards.filter((card) => !hasMappedContract(card)).length,
      },
      maximum_guide_cards: 1,
      maximum_material_alternatives: MATERIAL_ALTERNATIVE_LIMIT,
      maximum_usage_examples: 1,
      bounded_composition: allowBoundedPartialCommandMatch,
      research_decisions_from_guide: false,
    },
  };
}

function scanProjectForDictionary(root, scopeInput = {}) {
  const includePaths = (scopeInput.include_paths || []).map((value) => normalizeRelativePath(value, "scope.include_paths").replace(/\/$/, ""));
  const excludePaths = (scopeInput.exclude_paths || []).map((value) => normalizeRelativePath(value, "scope.exclude_paths").replace(/\/$/, ""));
  const projectFiles = listProjectFiles(root, { includePaths, excludePaths });
  const records = projectFiles.filter((file) => /\.do$/i.test(file)).map((relative) => {
    const file = resolveInside(root, relative, "scoped project file").target;
    const content = fs.readFileSync(file, "utf8");
    const active = stripComments(content).map((row) => normalizeCommand(row.trimmed)).join("\n");
    return {
      path: relative,
      content,
      active,
      stages: detectStagesFromContent(file, content),
    };
  });
  const activeText = records.map((row) => row.active).join("\n");
  const extensionCounts = {};
  for (const file of projectFiles) {
    const extension = path.posix.extname(file).toLowerCase() || "[no extension]";
    extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
  }
  const signalPatterns = {
    data_load: /^\s*(?:use|import\s+delimited|import\s+excel|infile|infix)\b/im,
    append_data: /^\s*append\s+using\b/im,
    regression_commands: /^\s*(?:reg|regress|areg|xtreg|reghdfe|ppmlhdfe|jwdid|csdid|did_imputation)\b/im,
    staggered_regression: /^\s*(?:jwdid|csdid|did_imputation|eventstudyinteract)\b/im,
    panel_declaration: /^\s*(?:xtset|tsset)\b/im,
    cohort_construction: /\b(?:cohort|gvar|first[_ ]?treat|event[_ ]?time)\b/i,
    turnover_timing: /\b(?:turnover|first[_ ]?event|relative[_ ]?time)\b/i,
    identifier_normalize: /^\s*(?:destring|encode|decode)\b/im,
    winsorize: /^\s*(?:winsor2?|winsorize)\b/im,
    standardize: /^\s*(?:egen\b[^\n]*std\(|summarize\b[^\n]*if\b[^\n]*e\(sample\))/im,
    treatment_mapping: /\b(?:treatment|treated|treat_arm|assignment)\b/i,
    household_aggregate: /^\s*(?:by|bysort)\b[^\n]*household[^\n]*:\s*egen\b/im,
    section_aggregate: /^\s*(?:by|bysort)\b[^\n]*(?:section|precinct)[^\n]*:\s*egen\b/im,
    dataset_finalize: /^\s*keep\b[\s\S]*?^\s*save\b/im,
    estimates_save: /^\s*estimates\s+save\b/im,
    estimates_use: /^\s*estimates\s+use\b/im,
    estimates_store: /^\s*(?:estimates\s+store|eststo\b)/im,
    esample_reference: /\be\(sample\)\b/i,
    ymean_metadata: /\be\(ymean\)\b|estadd\s+scalar\s+ymean\b/i,
    outreg2: /^\s*outreg2\b/im,
    export_excel: /^\s*export\s+excel\b/im,
    export_pdf: /^\s*graph\s+export\b[^\n]*\.pdf\b/im,
    event_figure: /(?:event.?study|pretrend|event[_ ]?time)[\s\S]*?^\s*graph\s+export\b[^\n]*\.pdf\b/im,
    coefplot_named_estimates: /^\s*coefplot\b/im,
    stage_log_open: /^\s*log\s+using\b/im,
    stage_log_close: /^\s*log\s+close\b/im,
    program_define: /^\s*program\s+define\b/im,
    uses_globals: /^\s*global\s+/im,
    uses_locals: /^\s*local\s+/im,
  };
  const signals = Object.fromEntries(Object.entries(signalPatterns).map(([name, pattern]) => [name, pattern.test(activeText)]));
  signals.ster_files = extensionCounts[".ster"] || 0;
  signals.dta_files = extensionCounts[".dta"] || 0;
  signals.xlsx_files = extensionCounts[".xlsx"] || 0;
  signals.pdf_files = extensionCounts[".pdf"] || 0;
  const policySignals = {
    nested_loop: records.some((row) => lintContent(row.content, "auto", row.path).findings.some((finding) => finding.rule === "nested_loop")),
    tex_output: records.some((row) => hasTexOutputContent(row.content)),
  };
  const stageFiles = {};
  for (const stage of STAGES) stageFiles[stage] = records.filter((row) => row.stages.includes(stage)).map((row) => row.path);
  const matchingFiles = (pattern) => records.filter((row) => pattern.test(row.active)).map((row) => row.path);
  const callSites = [];
  const inputBindings = [];
  const outputBindings = [];
  const macroDefinitions = [];
  const programInterfaces = [];
  const variableLabels = new Map();
  const variableTransforms = new Map();
  const outcomeRecords = [];
  const panelDeclarations = [];
  const targetRequiredKeys = new Set();
  const targetVariableCharacteristics = new Set();
  const targetSignatureEvidence = [];
  for (const record of records) {
    let lastOutcome = null;
    for (const row of stripComments(record.content)) {
      const command = normalizeCommand(row.trimmed);
      const panel = command.match(/^(xtset|tsset)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+([A-Za-z_][A-Za-z0-9_]*))?/i);
      if (panel) {
        panelDeclarations.push({ command: panel[1].toLowerCase(), id: panel[2], time: panel[3] || null, file: record.path, line: row.line });
        targetRequiredKeys.add(panel[2]);
        if (panel[3]) targetRequiredKeys.add(panel[3]);
        targetSignatureEvidence.push({ file: record.path, line: row.line, signal: "xtset_or_tsset", command });
      }
      const uniqueKey = command.match(/^isid\s+(.+?)(?:\s*,|$)/i);
      if (uniqueKey) {
        for (const key of uniqueKey[1].split(/\s+/).filter((value) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value))) targetRequiredKeys.add(key);
        targetSignatureEvidence.push({ file: record.path, line: row.line, signal: "isid", command });
      }
      const reshape = command.match(/^reshape\s+(long|wide)\b/i);
      if (reshape) {
        targetVariableCharacteristics.add(`${reshape[1].toLowerCase()}-form reshape state`);
        targetSignatureEvidence.push({ file: record.path, line: row.line, signal: `reshape_${reshape[1].toLowerCase()}`, command });
      }
      const merge = command.match(/^merge\s+(?:1:1|1:m|m:1)\s+(.+?)\s+using\b/i);
      if (merge) {
        for (const key of merge[1].split(/\s+/).filter((value) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value))) targetRequiredKeys.add(key);
        targetVariableCharacteristics.add("additional dataset join");
        targetSignatureEvidence.push({ file: record.path, line: row.line, signal: "merge", command });
      }
      const treatmentTiming = command.match(/\bcsgvar\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/i);
      if (treatmentTiming) {
        targetVariableCharacteristics.add(`treatment timing variable: ${treatmentTiming[1]}`);
        targetSignatureEvidence.push({ file: record.path, line: row.line, signal: "csgvar_treatment_timing", command });
      }
      if (/^(?:use\b|import\s+(?:delimited|excel)\b)/i.test(command)) targetVariableCharacteristics.add("dataset input");
      const call = command.match(/^(?:do|run|include)\s+(?:"([^"]+)"|([^\s,]+))/i);
      if (call) callSites.push({ file: record.path, line: row.line, target: call[1] || call[2], command });
      if (/^(?:use\b|import\s+(?:delimited|excel)\b|merge\b|append\s+using\b)/i.test(command)) inputBindings.push({ file: record.path, line: row.line, command });
      if (/^(?:save\b|estimates\s+save\b|export\s+excel\b|graph\s+export\b|outreg2\b|putexcel\b)/i.test(command)) outputBindings.push({ file: record.path, line: row.line, command });
      const macro = command.match(/^(global|local)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (macro) macroDefinitions.push({ file: record.path, line: row.line, scope: macro[1].toLowerCase(), name: macro[2] });
      const program = command.match(/^program\s+define\s+([A-Za-z_][A-Za-z0-9_]*)/i);
      if (program) programInterfaces.push({ file: record.path, line: row.line, program: program[1] });
      if (/^syntax\b/i.test(command) && programInterfaces.length) programInterfaces[programInterfaces.length - 1].syntax = command;
      const label = command.match(/^label\s+variable\s+([A-Za-z_][A-Za-z0-9_]*)\s+["']([^"']+)["']/i);
      if (label) variableLabels.set(label[1], label[2]);
      const transform = command.match(/^(?:gen(?:erate)?|egen|replace)\s+(?:\w+\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i);
      if (transform) variableTransforms.set(transform[1], transform[2].trim());
      const estimate = command.match(/^(?:reg|regress|areg|xtreg|reghdfe|ppmlhdfe|jwdid|csdid|did_imputation|eventstudyinteract)\s+([^\s,]+)/i);
      if (estimate) {
        lastOutcome = {
          name: estimate[1], file: record.path, line: row.line,
          sample: /\sif\s+([^,]+)/i.exec(command)?.[1]?.trim() || null,
          estimand: command.split(",")[0].trim(),
          estimate_handoff: null,
          specification_order: null,
          evidence_source: "static_code_scan",
        };
        outcomeRecords.push(lastOutcome);
      }
      const handoff = command.match(/^estimates\s+save\s+(.+)$/i);
      if (handoff && lastOutcome) lastOutcome.estimate_handoff = handoff[1].trim();
    }
  }
  const outputFlowOutcomes = [...new Map(outcomeRecords.map((row) => [row.name, row])).values()].map((row) => ({
    ...row,
    variable_label: variableLabels.get(row.name) || null,
    transform: variableTransforms.get(row.name) || null,
    family: null,
    unit: null,
  }));
  const panelIds = unique(panelDeclarations.map((row) => row.id));
  const timeIds = unique(panelDeclarations.map((row) => row.time).filter(Boolean));
  const hasXtset = panelDeclarations.some((row) => row.command === "xtset");
  const targetInputSignature = {
    data_structure: panelDeclarations.length ? (hasXtset || panelDeclarations.some((row) => row.time) ? "panel" : "time_series") : "unknown",
    observation_unit: panelIds.length === 1 ? panelIds[0] : panelIds.length > 1 ? "multiple declared panel units" : "not_stated",
    time_structure: panelDeclarations.length
      ? timeIds.length === 1 ? `declared time index ${timeIds[0]}` : timeIds.length > 1 ? "multiple declared time indexes" : "time index not stated"
      : "not_stated",
    required_keys: [...targetRequiredKeys],
    variable_characteristics: [...targetVariableCharacteristics],
    evidence: targetSignatureEvidence,
  };
  return {
    scan_scope: { include_paths: includePaths, exclude_paths: excludePaths },
    files: projectFiles,
    do_files: records.map((row) => row.path),
    extension_counts: extensionCounts,
    signals,
    policy_signals: policySignals,
    stage_files: stageFiles,
    intervention_candidates: {
      estimation_files: matchingFiles(signalPatterns.regression_commands),
      estimate_handoff_files: matchingFiles(/^(?:\s*estimates\s+(?:save|use|store)|\s*eststo\b)/im),
      excel_files: matchingFiles(/^\s*(?:outreg2|export\s+excel|putexcel)\b/im),
      figure_files: matchingFiles(/^\s*(?:graph\s+export|twoway|coefplot|marginsplot)\b/im),
      master_files: records.filter((row) => row.stages.includes("master_orchestration")).map((row) => row.path),
    },
    style_profile: {
      macro_style: signals.uses_globals && signals.uses_locals ? "globals_and_locals" : signals.uses_globals ? "globals" : signals.uses_locals ? "locals" : "no_clear_macro_convention",
      helper_programs: signals.program_define,
      path_separator: activeText.includes("\\") && activeText.includes("/") ? "mixed" : activeText.includes("\\") ? "backslash" : "forward_slash_or_unknown",
      persisted_estimate_style: signals.estimates_save || signals.estimates_use,
      in_memory_estimate_style: signals.estimates_store,
      existing_excel_style: signals.outreg2 ? "outreg2" : signals.export_excel ? "export_excel" : "not_detected",
    },
    interface_fingerprint: {
      call_sites: callSites,
      input_bindings: inputBindings,
      output_bindings: outputBindings,
      macro_definitions: macroDefinitions,
      program_interfaces: programInterfaces,
    },
    input_signature: targetInputSignature,
    output_flow_evidence: {
      outcomes: outputFlowOutcomes,
      variable_labels: Object.fromEntries(variableLabels),
      variable_transforms: Object.fromEntries(variableTransforms),
      boundary: "Static code can recover variable labels, transforms, samples, estimands, and some estimate handoffs; it does not infer conceptual families, units, or valuable sheet boundaries from names.",
    },
  };
}

const SOURCE_REUSE_TEMPLATE_IDS = {
  clone_then_edit: "existing_do_file.clone_then_apply_declared_edits.v1",
  modify_in_place: "existing_do_file.modify_in_place_with_staged_exact_diff.v1",
  block_extract_insert: "existing_do_file.extract_block_then_insert_with_exact_diff.v1",
};

function countLiteral(value, needle) {
  if (!needle) return 0;
  return String(value).split(needle).length - 1;
}

function firstDifference(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let offset = 0;
  while (offset < limit && expected[offset] === actual[offset]) offset += 1;
  if (offset === expected.length && offset === actual.length) return null;
  return {
    offset,
    line: expected.slice(0, offset).split(/\r?\n/).length,
    expected_excerpt: expected.slice(offset, offset + 80),
    actual_excerpt: actual.slice(offset, offset + 80),
  };
}

function applyDeclaredLiteralChanges(value, changes, fieldPrefix = "source_reuse.allowed_changes") {
  let expectedText = String(value);
  const appliedChanges = changes.map((change, index) => {
    const operation = String(change.operation || "");
    const match = String(change.match || "");
    const expectedOccurrences = Number(change.expected_occurrences);
    if (!match) throw new Error(`${fieldPrefix}[${index}].match가 필요합니다.`);
    if (!Number.isInteger(expectedOccurrences) || expectedOccurrences < 1) throw new Error(`${fieldPrefix}[${index}].expected_occurrences는 1 이상의 정수여야 합니다.`);
    const observedOccurrences = countLiteral(expectedText, match);
    if (observedOccurrences !== expectedOccurrences) {
      throw new Error(`${fieldPrefix}[${index}] match 개수가 다릅니다: expected ${expectedOccurrences}, observed ${observedOccurrences}.`);
    }
    let replacement;
    if (operation === "replace_literal") replacement = String(change.replacement ?? "");
    else if (operation === "delete_literal") replacement = "";
    else if (operation === "insert_after_literal") replacement = `${match}${String(change.text ?? "")}`;
    else throw new Error(`지원하지 않는 source_reuse operation입니다: ${operation}`);
    expectedText = expectedText.split(match).join(replacement);
    return { operation, match, expected_occurrences: expectedOccurrences, observed_occurrences: observedOccurrences };
  });
  return { expectedText, appliedChanges };
}

function extractDeclaredSourceBlock(sourceText, sourceBlock) {
  if (!sourceBlock) throw new Error("block_extract_insert mode에는 source_reuse.source_block이 필요합니다.");
  const startLiteral = String(sourceBlock.start_literal || "");
  const endLiteral = String(sourceBlock.end_literal || "");
  if (!startLiteral || !endLiteral) throw new Error("source_reuse.source_block에는 start_literal과 end_literal이 필요합니다.");
  if (countLiteral(sourceText, startLiteral) !== 1 || countLiteral(sourceText, endLiteral) !== 1) {
    throw new Error("source_reuse.source_block의 start_literal과 end_literal은 canonical_source에서 각각 정확히 한 번 나타나야 합니다.");
  }
  const start = sourceText.indexOf(startLiteral);
  const endStart = sourceText.indexOf(endLiteral, start + startLiteral.length);
  if (endStart < 0) throw new Error("source_reuse.source_block end_literal은 start_literal 뒤에 있어야 합니다.");
  const includeBoundaries = sourceBlock.include_boundaries !== false;
  const from = includeBoundaries ? start : start + startLiteral.length;
  const to = includeBoundaries ? endStart + endLiteral.length : endStart;
  return {
    text: sourceText.slice(from, to),
    source_offsets: { start: from, end: to },
    include_boundaries: includeBoundaries,
  };
}

function buildSourceReusePlan(root, request, contract) {
  const requested = /(?:(?:기존|원본|정본|canonical|existing|source)[\s\S]{0,80}(?:복제|복사|재사용|그대로|제자리|블록|clone|copy|reuse|in[- ]place|block)[\s\S]{0,80}(?:수정|치환|변경|삽입|adapt|edit|change|insert)|(?:복제|복사|clone|copy)[\s\S]{0,80}(?:기존|원본|정본|canonical|existing|source))/i.test(String(request || ""));
  if (!contract) {
    if (!requested) return null;
    return {
      template_id: SOURCE_REUSE_TEMPLATE_IDS.clone_then_edit,
      status: "needs_declared_reuse_contract",
      direct_generation_allowed: false,
      required_fields: ["mode", "canonical_source", "destination or modify_in_place", "allowed_changes"],
      rule: "Declare the canonical source and every permitted literal edit before writing. Do not synthesize a replacement from an estimator-specific detector or a generic adapter.",
    };
  }

  const mode = String(contract.mode || "clone_then_edit");
  if (!Object.hasOwn(SOURCE_REUSE_TEMPLATE_IDS, mode)) throw new Error(`지원하지 않는 source_reuse mode입니다: ${mode}`);
  const source = resolveInside(root, contract.canonical_source, "source_reuse.canonical_source");
  if (!fs.existsSync(source.target) || !fs.statSync(source.target).isFile()) throw new Error("source_reuse canonical_source는 존재하는 파일이어야 합니다.");
  const destinationValue = mode === "modify_in_place" ? (contract.destination || contract.canonical_source) : contract.destination;
  if (!destinationValue) throw new Error(`${mode} mode에는 source_reuse.destination이 필요합니다.`);
  const destination = resolveInside(root, destinationValue, "source_reuse.destination");
  const sameFile = source.target.toLowerCase() === destination.target.toLowerCase();
  if (mode === "clone_then_edit" && sameFile) throw new Error("clone_then_edit mode의 destination은 canonical_source와 달라야 합니다.");
  if (mode === "modify_in_place" && !sameFile) throw new Error("modify_in_place mode의 destination은 canonical_source와 같아야 합니다.");
  const changes = Array.isArray(contract.allowed_changes) ? contract.allowed_changes : [];
  if (!changes.length) throw new Error("source_reuse.allowed_changes를 하나 이상 선언해야 합니다.");

  const sourceText = fs.readFileSync(source.target, "utf8");
  let expectedText;
  let appliedChanges;
  let blockContract = null;
  if (mode === "block_extract_insert") {
    if (!fs.existsSync(destination.target) || !fs.statSync(destination.target).isFile()) throw new Error("block_extract_insert destination은 기존 파일이어야 합니다.");
    const extracted = extractDeclaredSourceBlock(sourceText, contract.source_block);
    const changed = applyDeclaredLiteralChanges(extracted.text, changes);
    const destinationText = fs.readFileSync(destination.target, "utf8");
    const anchor = String(contract.insertion_anchor?.match || "");
    const expectedOccurrences = Number(contract.insertion_anchor?.expected_occurrences);
    const position = String(contract.insertion_anchor?.position || "after");
    if (!anchor) throw new Error("block_extract_insert mode에는 source_reuse.insertion_anchor.match가 필요합니다.");
    if (!Number.isInteger(expectedOccurrences) || expectedOccurrences < 1 || countLiteral(destinationText, anchor) !== expectedOccurrences) {
      throw new Error(`source_reuse.insertion_anchor match 개수가 다릅니다: expected ${expectedOccurrences}, observed ${countLiteral(destinationText, anchor)}.`);
    }
    const inserted = changed.expectedText;
    let replacement;
    if (position === "after") replacement = `${anchor}${inserted}`;
    else if (position === "before") replacement = `${inserted}${anchor}`;
    else if (position === "replace") replacement = inserted;
    else throw new Error(`지원하지 않는 insertion_anchor position입니다: ${position}`);
    expectedText = destinationText.split(anchor).join(replacement);
    appliedChanges = changed.appliedChanges;
    blockContract = {
      source_block: { ...extracted.source_offsets, include_boundaries: extracted.include_boundaries },
      insertion_anchor: { match: anchor, expected_occurrences: expectedOccurrences, position },
    };
  } else {
    ({ expectedText, appliedChanges } = applyDeclaredLiteralChanges(sourceText, changes));
  }

  const expectedBytes = Buffer.from(expectedText, "utf8");
  let candidateVerification = { status: "not_supplied", rule: "Write only the deterministic expected candidate, then call the planner again with candidate_path before treating the adaptation as verified." };
  if (contract.candidate_path) {
    const candidate = resolveInside(root, contract.candidate_path, "source_reuse.candidate_path");
    if (!fs.existsSync(candidate.target) || !fs.statSync(candidate.target).isFile()) throw new Error("source_reuse candidate_path는 존재하는 파일이어야 합니다.");
    const actualText = fs.readFileSync(candidate.target, "utf8");
    const matchesExpected = actualText === expectedText;
    candidateVerification = {
      status: matchesExpected ? "verified_exact" : "blocked_undeclared_change",
      candidate_path: candidate.relative,
      sha256: sha256File(candidate.target),
      exact_match: matchesExpected,
      first_difference: firstDifference(expectedText, actualText),
    };
  }

  return {
    template_id: SOURCE_REUSE_TEMPLATE_IDS[mode],
    mode,
    status: candidateVerification.status === "blocked_undeclared_change" ? "blocked" : candidateVerification.status === "verified_exact" ? "verified" : "ready_for_clone",
    direct_generation_allowed: false,
    canonical_source: { path: source.relative, bytes: fs.statSync(source.target).size, sha256: sha256File(source.target) },
    destination: destination.relative,
    same_file_destination: sameFile,
    block_contract: blockContract,
    allowed_changes: appliedChanges,
    expected_candidate: { bytes: expectedBytes.length, sha256: crypto.createHash("sha256").update(expectedBytes).digest("hex").toUpperCase() },
    candidate_verification: candidateVerification,
    steps: mode === "block_extract_insert"
      ? ["extract only the declared canonical source block", "apply only declared edits to that block", "insert it at the exact destination anchor", "compare candidate_path to expected_candidate exactly", "stop on any undeclared difference"]
      : mode === "modify_in_place"
        ? ["stage the deterministic in-place candidate without overwriting canonical_source", "apply only the declared literal edits in order", "compare candidate_path to expected_candidate exactly", "replace the same file only after exact verification", "stop on any undeclared difference"]
        : ["copy canonical_source to destination without rewriting it", "apply only the declared literal edits in order", "compare candidate_path to expected_candidate exactly", "stop on any undeclared difference"],
    rule: "This template is estimator-agnostic. A new estimator name must not be added to detection logic merely to preserve an existing source file.",
  };
}

const HEADWORD_SEQUENCE = [
  "project_setup.paths",
  "workflow_orchestration.master",
  "workflow_orchestration.file_execution",
  "input_load.single_source",
  "input_load.combine",
  "preparation.transform",
  "preparation.by_group",
  "preparation.varlist_resolution",
  "preparation.temporary_state",
  "preparation.storage_metadata",
  "preparation.display_metadata",
  "clean.id_normalize",
  "clean.derive_variables",
  "treatment.arm_mapping",
  "outlier.winsorize",
  "integrity.audit",
  "integrity.missing_data",
  "merge_reshape.integration",
  "sample.restriction",
  "sample.trade_share_threshold",
  "sample.arm_response_eligibility",
  "feature.aggregate_household",
  "feature.aggregate_section_exposure",
  "dataset.finalize_keep_label_save",
  "integrity.adjacency_dedup",
  "panel.stack_waves",
  "panel.materialize_time_grid",
  "panel.time_operator",
  "panel.treatment_cohort",
  "panel.turnover_event_time",
  "estimation.conventional",
  "estimation.survey_design",
  "estimation.rdrobust_suite",
  "estimation.synthetic_control",
  "estimation.difference_in_differences",
  "estimation.staggered_did",
  "postest.sample_flag",
  "scale.standardize_esample",
  "descriptives.sample_mean",
  "descriptives.command_result",
  "postest.persist_estimate",
  "postest.margins",
  "postest.command_result",
  "postest.export_sample_keys",
  "postest.estimator_comparison_unsafe",
  "diagnostics.display",
  "robustness.placebo",
  "robustness.heterogeneity",
  "robustness.bootstrap_inference",
  "robustness.jackknife",
  "robustness.resampling_simulation",
  "robustness.multiple_testing",
  "descriptives.entity_collapse",
  "descriptives.sample_flow",
  "descriptives.summary_dataset",
  "descriptives.estpost_active_result",
  "exports.descriptive_excel_sheet",
  "exports.estimate_text_table",
  "exports.matrix_excel",
  "exports.dataset_file",
  "figures.descriptive_bar",
  "figures.descriptive_scatter",
  "figures.binned_scatter",
  "figures.descriptive_graph",
  "figures.event_study",
  "figures.marginsplot",
  "figures.coefplot_named_estimates",
  "figures.named_graph_combine",
  "figures.export_pdf",
  "tables.collection_result",
  "final_excel_assembly",
  "cleanup",
];

function inferCompletedHeadwords(observed) {
  const completed = new Set();
  if (observed.intervention_candidates.master_files.length) completed.add("workflow_orchestration.master");
  if (observed.signals.uses_globals || observed.signals.uses_locals) completed.add("project_setup.paths");
  if (observed.signals.data_load) completed.add("input_load.single_source");
  if (observed.signals.append_data) completed.add("input_load.combine");
  if ((observed.stage_files.merge_reshape || []).length) completed.add("merge_reshape.integration");
  if ((observed.stage_files.integrity_audit || []).length) completed.add("integrity.audit");
  if ((observed.stage_files.cleaning_labels || []).length) completed.add("clean.derive_variables");
  if (observed.signals.identifier_normalize) completed.add("clean.id_normalize");
  if (observed.signals.treatment_mapping) completed.add("treatment.arm_mapping");
  if (observed.signals.winsorize) completed.add("outlier.winsorize");
  if (observed.signals.standardize) completed.add("scale.standardize_esample");
  if (observed.signals.household_aggregate) completed.add("feature.aggregate_household");
  if (observed.signals.section_aggregate) completed.add("feature.aggregate_section_exposure");
  if (observed.signals.dataset_finalize) completed.add("dataset.finalize_keep_label_save");
  if (observed.signals.panel_declaration && observed.signals.cohort_construction) completed.add("panel.treatment_cohort");
  if (observed.signals.turnover_timing) completed.add("panel.turnover_event_time");
  if (observed.signals.regression_commands && !observed.signals.staggered_regression) completed.add("estimation.conventional");
  if (observed.signals.staggered_regression) completed.add("estimation.staggered_did");
  if (observed.signals.esample_reference) completed.add("postest.sample_flag");
  if (observed.signals.estimates_save || observed.signals.estimates_store || observed.signals.ster_files > 0) completed.add("postest.persist_estimate");
  if (observed.signals.outreg2) completed.add("final_excel_assembly");
  if (observed.signals.event_figure) completed.add("figures.event_study");
  if (observed.signals.coefplot_named_estimates) completed.add("figures.coefplot_named_estimates");
  if (observed.signals.export_pdf) completed.add("figures.export_pdf");
  return HEADWORD_SEQUENCE.filter((item) => completed.has(item));
}

function requestInferenceContext(request) {
  const full = String(request || "");
  const segmented = full
    .replace(/\b(?:but|instead)\b/gi, ";")
    .replace(/((?:수정|변경|편집|고치|건드리|손대|바꾸|재작성|재실행)(?:하지|지)\s*말고|(?:보존|유지)하(?:되|면서|고))\s*/g, "$1;");
  const clauses = segmented.split(/[\r\n!?;。！？]+|\.(?![A-Za-z0-9])/i).map((value) => value.trim()).filter(Boolean);
  const preservationPattern = /(?:수정|변경|편집|고치|건드리|손대|바꾸|재작성|재실행)[^.!?;\n]{0,24}(?:마세요|말아|말고|않습니다|않는다|않게|금지)|(?:그대로|보존|유지|동결)[^.!?;\n]{0,24}(?:하세요|해\s*주세요|해줘|합니다|한다|두세요|둬|하고|하되|하면서)|\b(?:do\s+not|don't|dont|must\s+not|should\s+not|never)\s+(?:modify|edit|change|touch|rewrite|refactor|rerun)\b|\b(?:keep|leave)\b[^.!?;\n]{0,60}\b(?:unchanged|as[- ]is|intact)\b|\b(?:preserve|freeze|frozen|already\s+completed|already\s+complete)\b/i;
  const rawOutputContractPattern = /\bpreserve\b[^.!?;\n]{0,40}\braw\b[^.!?;\n]{0,40}\b(?:outreg2|coefficient|row)/i;
  const isPreservationClause = (clause) => preservationPattern.test(clause) && !rawOutputContractPattern.test(clause);
  const preserved = clauses.filter(isPreservationClause);
  const actionable = clauses.filter((clause) => !isPreservationClause(clause));
  return { full, actionable: actionable.join(" "), preserved: preserved.join(" ") };
}

function classifyRequestIntent(request, requestedIntent = "auto", mode = "partial", targetEvidence = {}) {
  const context = requestInferenceContext(request);
  const full = String(context.full || "");
  const actionable = String(context.actionable || "");
  const reviewPattern = /(?:검토|검사|점검|평가|감사|진단|분석|설명|발전\s*가능성)|\b(?:review|audit|inspect|assess|evaluate|diagnose|analy[sz]e|explain)\b/i;
  const writePattern = /(?:추가|수정|고쳐|고치|작성|만들|짜|구축|실행|돌려|내보|생성|구현|재작성|업데이트)|\b(?:add|fix|edit|modify|change|write|create|build|implement|run|export|rewrite|refactor|update)\b/i;
  const modifyPattern = /(?:수정|고쳐|고치|편집|변경|바꾸|재작성|업데이트)|\b(?:fix|edit|modify|change|rewrite|refactor|update)\b/i;
  const prohibitionPattern = /(?:수정|변경|편집|고치|건드리|손대|바꾸|재작성|실행|생성|만들)[^.!?;\n]{0,28}(?:하지\s*마|하지\s*않|말아|말고|않는다|않습니다|금지)|(?:변경|수정)\s*없이|\b(?:review\s+only|audit\s+only|inspection\s+only|make\s+no\s+changes?|no\s+changes?|without\s+(?:modifying|editing|changing)|do\s+not\s+(?:modify|edit|change|write|create|run))\b/i;
  const reviewActions = unique((full.match(new RegExp(reviewPattern.source, "gi")) || []).map((value) => value.toLowerCase()));
  const unnegatedWriteActions = unique((actionable.match(new RegExp(writePattern.source, "gi")) || []).map((value) => value.toLowerCase()));
  const explicitNoChange = prohibitionPattern.test(full);
  const reviewOnly = (reviewActions.length > 0 || explicitNoChange) && unnegatedWriteActions.length === 0;
  let inferred = reviewOnly
    ? "review_only"
    : mode === "overhaul"
      ? "overhaul"
      : modifyPattern.test(actionable) || targetEvidence.existing_do_target ? "modify_existing" : "add_feature";
  let conflict = false;
  if (requestedIntent && requestedIntent !== "auto") {
    if (requestedIntent === "review_only" && unnegatedWriteActions.length > 0) {
      inferred = "review_only";
      conflict = true;
    } else if (reviewOnly && requestedIntent !== "review_only") {
      inferred = "review_only";
      conflict = true;
    } else inferred = requestedIntent;
  }
  return {
    intent: inferred,
    context,
    write_authorization: {
      status: conflict ? "conflict" : inferred === "review_only" ? "not_requested" : "requested",
      decisive_evidence: [
        ...(explicitNoChange ? ["explicit_no_change_clause"] : []),
        ...(reviewActions.length ? ["review_action"] : []),
        ...(unnegatedWriteActions.length ? ["unnegated_write_action"] : []),
        ...(targetEvidence.existing_do_target ? ["explicit_existing_do_target"] : []),
      ],
      review_actions: reviewActions,
      unnegated_write_actions: unnegatedWriteActions,
      rule: "Explicit no-change and review-only intent cannot be overridden by planner checkpoints or caller write modes. A separate unnegated write clause authorizes only its stated mutation scope.",
    },
  };
}

function explicitlyRequestsEstimateConsumer(value) {
  return /\bestimates?\s+(?:use|store)\b|\bconsume\b[^.!?;\n]{0,60}\b(?:numbered\s+)?\.ster\b|\b(?:numbered\s+)?\.ster\b[^.!?;\n]{0,60}\bconsume\b|(?:기존|저장된|numbered)?\s*\.ster[^.!?;\n]{0,60}(?:소비|불러오|사용)|(?:소비|불러오|사용)[^.!?;\n]{0,60}\.ster/i.test(String(value || ""));
}

function inferDictionaryHeadwords(request, explicit, mode) {
  const selected = new Set(explicit || []);
  const value = String(request || "").toLowerCase();
  if (!selected.size && isDocumentationOnlyCommandMention(value)) return [];
  const add = (...items) => items.forEach((item) => selected.add(item));
  const summaryRequested = /summary|descriptive|기초통계|요약통계/.test(value);
  const descriptiveExcelRequested = summaryRequested && /excel|xlsx|workbook|엑셀|표.*내보|export/.test(value);
  const descriptiveFigureRequested = summaryRequested && /figure|graph|plot|그림|그래프|막대/.test(value);
  const exactExportOnly = requestCommandAnchors(value).some((anchor) => {
    const routes = [...(AUTO_LABEL_COMMAND_CHECKPOINTS.get(normalizedCommandAnchor(anchor)) || [])];
    return routes.length > 0 && routes.every((checkpoint) => checkpoint.startsWith("exports."));
  });
  const exactFigureOnly = requestCommandAnchors(value).some((anchor) => {
    const routes = [...(AUTO_LABEL_COMMAND_CHECKPOINTS.get(normalizedCommandAnchor(anchor)) || [])];
    return routes.length > 0 && routes.every((checkpoint) => checkpoint.startsWith("figures."));
  });
  if (((/excel|xlsx|회귀표|표.*내보|outreg2/.test(value) && !descriptiveExcelRequested && !exactExportOnly)
    || /regression.*(?:excel|xlsx|workbook)|회귀.*(?:excel|xlsx|엑셀)/.test(value))) add("final_excel_assembly");
  if (/\bster\b|\.ster\b|estimates?\s+(?:save|use|store)|추정결과.*(?:저장|불러오|소비)/.test(value)) add("postest.persist_estimate");
  const inputLoadValue = value.replace(/\bestimates?\s+use\b/g, "");
  if (/\bsysuse\b|\buse\b|\bimport\s+(?:delimited|excel)\b|불러오|원자료.*(?:읽|로드)/.test(inputLoadValue)) add("input_load.single_source");
  if (/\bappend\b|원자료.*결합/.test(value)) add("input_load.combine");
  if (/event.?study|이벤트.?스터디|pretrend|사전추세/.test(value)) add("figures.event_study");
  if (/\bcoefplot\b|\bcoefficient\s*(?:plot|figure|graph|pdf|gph)\b|\bnamed\s+estimates?\b[^.!?;\n]{0,40}\b(?:plot|figure|graph)\b|(?:회귀\s*)?계수[^.!?;\n]{0,40}(?:그림|그래프|plot|pdf|gph)/.test(value)) add("figures.coefplot_named_estimates");
  if (/pdf|graph\s+export|figure\s+export|그림.*내보|figure.*내보/.test(value)) add("figures.export_pdf");
  if (descriptiveFigureRequested) add("figures.descriptive_bar");
  else if (/figure|graph|plot|그림|그래프/.test(value) && !exactFigureOnly && !/pdf|graph\s+export|figure\s+export|그림.*내보|figure.*내보/.test(value)) add("figures.descriptive_scatter");
  const estimationValue = value.replace(/regression\s+(?:excel|workbook|table)|회귀표/g, "");
  if (/staggered|시차.?도입|jwdid|csdid/.test(value)) add("estimation.staggered_did");
  if (/cohort|처치.*(?:시점|코호트)|도입.*시점|treatment.?timing/.test(value)) add("panel.treatment_cohort");
  else if (/regression|regress|회귀|추정/.test(estimationValue)) add("estimation.conventional");
  if (/e\(sample\)|dependent.?variable mean|종속변수.*평균|estadd\s+ysumm|\bymean\b/.test(value)) add("descriptives.sample_mean");
  if (/merge|병합|결합/.test(value)) add("integrity.audit", "merge_reshape.integration");
  if (/clean|recode|\bprep(?:aration)?\b|전처리|변수.*가공/.test(value)) add("clean.derive_variables");
  if (/식별자|identifier|destring/.test(value)) add("clean.id_normalize");
  if (/처치군|treatment.?arm|assignment/.test(value)) add("treatment.arm_mapping");
  if (/winsor|윈저|이상치/.test(value)) add("outlier.winsorize");
  if (/표준화|standardiz|z.?score/.test(value)) add("scale.standardize_esample");
  const sampleSelectionValue = value.replace(/e\(sample\)|estimation\s+sample|추정표본/g, "");
  if (/무역.*표본|trade.?share.*sample/.test(sampleSelectionValue)) add("sample.trade_share_threshold");
  else if (/sample|표본/.test(sampleSelectionValue)) add("sample.arm_response_eligibility");
  if (/가구.*집계|household.*aggregat/.test(value)) add("feature.aggregate_household");
  if (/(?:구역|투표구|section|precinct).*집계|exposure.*aggregat/.test(value)) add("feature.aggregate_section_exposure");
  if (/wave.*stack|조사시점.*쌓|패널.*쌓/.test(value)) add("panel.stack_waves");
  if (/turnover|교체.*시점/.test(value)) add("panel.turnover_event_time");
  if (/e\(sample\).*키|추정표본.*키|sample.*key.*dta/.test(value)) add("postest.export_sample_keys");
  if (/jackknife|잭나이프/.test(value)) add("robustness.jackknife");
  if (/cleanup|임시파일.*정리/.test(value)) add("cleanup");
  if (summaryRequested) add("descriptives.summary_dataset");
  if (descriptiveExcelRequested) add("exports.descriptive_excel_sheet");
  if (/master|runall|전체.*실행/.test(value)) add("workflow_orchestration.master");
  if (mode === "overhaul" && selected.size === 0) {
    [
      "project_setup.paths", "workflow_orchestration.master", "input_load.single_source", "integrity.audit",
      "clean.id_normalize", "clean.derive_variables", "integrity.audit", "merge_reshape.integration",
      "sample.arm_response_eligibility", "dataset.finalize_keep_label_save", "panel.treatment_cohort",
      "estimation.conventional", "descriptives.sample_mean", "postest.persist_estimate",
      "final_excel_assembly",
    ].forEach((item) => selected.add(item));
  }
  const dynamicRoutes = dynamicallyRoutedCheckpoints(request);
  if (looksLikeSingleStataCommand(value) && dynamicRoutes.length === 1) {
    return unique([...(explicit || []), dynamicRoutes[0]]).filter((item) => CHECKPOINTS.includes(item));
  }
  for (const checkpoint of dynamicRoutes) selected.add(checkpoint);
  return [...selected].filter((item) => CHECKPOINTS.includes(item));
}

function looksLikeStataCommand(value) {
  const normalized = normalizeCommand(String(value || "").trim());
  const firstToken = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]?.toLowerCase();
  if (!firstToken) return false;
  return KNOWN_COMMAND_ANCHORS.some((anchor) => anchor === firstToken || anchor.startsWith(`${firstToken} `));
}

function looksLikeSingleStataCommand(request) {
  const lines = String(request || "").split(/[\r\n;]+/).map((value) => value.trim()).filter(Boolean);
  if (lines.length !== 1 || !looksLikeStataCommand(lines[0])) return false;
  const value = lines[0];
  if (/[.!?]\s+(?:[A-Z가-힣]|$)/.test(value)) return false;
  if (/\b(?:please|existing|unchanged|then\s+create|do\s+not\s+modify)\b/i.test(value)) return false;
  return true;
}

function looksLikeStataCommandSequence(request) {
  const lines = String(request || "").split(/[\r\n;]+/).map((value) => value.trim()).filter(Boolean);
  return lines.length > 1 && lines.filter(looksLikeStataCommand).length >= 2;
}

function normalizedCommandAnchor(value) {
  return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function commandAnchorPattern(anchor) {
  const parts = normalizedCommandAnchor(anchor).split(" ").filter(Boolean).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return parts.length ? new RegExp(`(?<![A-Za-z0-9_])${parts.join("\\s+")}(?![A-Za-z0-9_])`, "i") : null;
}

const DYNAMIC_COMMAND_CHECKPOINTS = (() => {
  const mapping = new Map();
  const add = (anchor, checkpoint) => {
    const key = normalizedCommandAnchor(anchor);
    if (!key || !CHECKPOINTS.includes(checkpoint)) return;
    if (!mapping.has(key)) mapping.set(key, new Set());
    mapping.get(key).add(checkpoint);
  };
  for (const [anchor, checkpoints] of Object.entries(WORKFLOW_DICTIONARY.command_index || {})) {
    for (const checkpoint of checkpoints || []) add(anchor, checkpoint);
  }
  for (const row of LABELED_CHECKPOINTS) for (const anchor of row.command_anchors || []) add(anchor, row.checkpoint);
  return mapping;
})();

// Guide cards carry only command/state metadata, but that metadata still
// defines the atomic checkpoint for an exact command.  Keep this separate
// from auto-selectable labels: it informs planning without making a guide
// card a code candidate.
const GUIDE_COMMAND_CHECKPOINTS = (() => {
  const mapping = new Map();
  const add = (anchor, checkpoint) => {
    const key = normalizedCommandAnchor(anchor);
    if (!key || !CHECKPOINTS.includes(checkpoint)) return;
    if (!mapping.has(key)) mapping.set(key, new Set());
    mapping.get(key).add(checkpoint);
  };
  for (const card of GUIDE_MECHANICS_CARDS) {
    for (const anchor of card.command_anchors || []) add(anchor, card.checkpoint);
  }
  return mapping;
})();

// Contract aliases name the transition itself, independently of whether an
// implementation example is selectable.  They resolve a direct command such
// as `margins` even when guide cards for its downstream `marginsplot` variant
// also list the producer command as required state.
const CONTRACT_ALIAS_CHECKPOINTS = (() => {
  const mapping = new Map();
  const add = (anchor, checkpoint) => {
    const key = normalizedCommandAnchor(anchor);
    if (!key || !CHECKPOINTS.includes(checkpoint)) return;
    if (!mapping.has(key)) mapping.set(key, new Set());
    mapping.get(key).add(checkpoint);
  };
  for (const contract of CHECKPOINT_CONTRACTS.contracts || []) {
    for (const alias of contract.aliases || []) add(alias, contract.checkpoint);
  }
  return mapping;
})();

const AUTO_LABEL_COMMAND_CHECKPOINTS = (() => {
  const mapping = new Map();
  for (const row of LABELED_CHECKPOINTS) {
    if (!rubricAutoSelectable(row) || row.decision === "drop") continue;
    for (const anchor of row.command_anchors || []) {
      const key = normalizedCommandAnchor(anchor);
      if (!mapping.has(key)) mapping.set(key, new Set());
      mapping.get(key).add(row.checkpoint);
    }
  }
  return mapping;
})();

const REGISTERED_COMMAND_ANCHORS = unique((PACKAGE_COMMAND_CATALOG.families || []).flatMap((family) =>
  (family.commands || []).flatMap((item) => {
    const command = typeof item === "string" ? item : item.command;
    const normalized = normalizedCommandAnchor(command);
    return unique([normalized, normalized.replaceAll("_", " ")]);
  })));
const KNOWN_COMMAND_ANCHORS = unique([...DYNAMIC_COMMAND_CHECKPOINTS.keys(), ...REGISTERED_COMMAND_ANCHORS]);

function isDocumentationOnlyCommandMention(request) {
  const value = String(request || "");
  const englishDocumentation = /\b(?:add|write|update|edit|revise)\b[^.!?\n]{0,50}\b(?:note|comment|documentation|readme|description|explanation)\b[^.!?\n]{0,140}\b(?:about|on|for)\b/i.test(value)
    || /\b(?:mention|document|describe|explain)\b[^.!?\n]{0,140}\b(?:command|syntax)\b/i.test(value);
  const koreanDocumentation = /(?:주석|문서|readme|설명|메모|노트)[^.!?\n]{0,120}(?:추가|작성|수정|보충|언급|설명|업데이트|검토)/i.test(value)
    || /(?:추가|작성|수정|보충|언급|설명|업데이트|검토)[^.!?\n]{0,120}(?:주석|문서|readme|설명|메모|노트)/i.test(value);
  const separateExecutionClause = /(?:[.!?;\n]|\b(?:and|then)\b)[^.!?;\n]{0,80}\b(?:use|run|execute|implement|create|export)\b|(?:그리고|그다음|이후)[^.!?;\n]{0,80}(?:사용|실행|구현|생성|내보)/i.test(value);
  return (englishDocumentation || koreanDocumentation) && !separateExecutionClause;
}

function requestCommandAnchors(request) {
  const value = String(request || "");
  if (isDocumentationOnlyCommandMention(value)) return [];
  const statements = value.split(/[;\r\n]+/).map((item) => item.trim()).filter(Boolean);
  const singleFirstToken = statements.length === 1
    ? normalizeCommand(statements[0]).match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]?.toLowerCase()
    : null;
  const singleLooksLikeCode = statements.length === 1
    && !/[.!?]\s+(?:[A-Z가-힣]|$)/.test(statements[0])
    && !/\b(?:please|existing|unchanged|then\s+create|do\s+not\s+modify)\b/i.test(statements[0]);
  if (singleLooksLikeCode) {
    const normalizedStatement = normalizeCommand(statements[0]);
    const firstToken = normalizedStatement.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]?.toLowerCase();
    if (firstToken) {
      const leading = KNOWN_COMMAND_ANCHORS
        .filter((anchor) => (anchor === firstToken || anchor.startsWith(`${firstToken} `))
          && new RegExp(`^${anchor.split(" ").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")}(?:\\s|,|$)`, "i").test(normalizedStatement))
        .sort((a, b) => b.length - a.length);
      if (leading.length) return [leading[0]];
    }
  }
  const rawMatched = KNOWN_COMMAND_ANCHORS
    .sort((a, b) => b.length - a.length)
    .filter((anchor) => anchor.length >= 4
      && (singleLooksLikeCode || anchor !== singleFirstToken)
      && value.includes(anchor)
      && commandAnchorPattern(anchor)?.test(value));
  const matched = rawMatched.filter((anchor) => !rawMatched.some((other) => other !== anchor
    && (other.endsWith(` ${anchor}`) || other.startsWith(`${anchor} `))));
  for (const statement of (statements.length > 1 || singleLooksLikeCode ? statements : [])) {
    const normalized = normalizeCommand(statement.trim());
    if (!looksLikeStataCommand(normalized)) continue;
    const command = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1]?.toLowerCase();
    if (command) matched.push(command);
  }
  return unique(matched);
}

function dynamicallyRoutedCheckpoints(request) {
  const value = String(request || "");
  const summaryContext = /summary|descriptive|기초통계|요약통계/.test(value);
  const figureContext = /figure|graph|plot|그림|그래프|pdf/.test(value);
  const exportContext = /export|excel|xlsx|workbook|내보|엑셀/.test(value);
  const routed = [];
  for (const anchor of requestCommandAnchors(value)) {
    const key = normalizedCommandAnchor(anchor);
    const autoLabelRoutes = [...(AUTO_LABEL_COMMAND_CHECKPOINTS.get(key) || [])];
    const guideRoutes = [...(GUIDE_COMMAND_CHECKPOINTS.get(key) || [])];
    const contractRoutes = [...(CONTRACT_ALIAS_CHECKPOINTS.get(key) || [])];
    const exactRoutes = autoLabelRoutes.length === 1
      ? autoLabelRoutes
      : contractRoutes.length === 1
        ? contractRoutes
        // A single guide contract gives an unambiguous semantic route.  Where
        // multiple guide contracts share a command, retain the existing
        // dictionary routing rather than guessing a variant from metadata.
        : guideRoutes.length === 1 ? guideRoutes : null;
    let checkpoints = exactRoutes || [...(DYNAMIC_COMMAND_CHECKPOINTS.get(key) || [])];
    if (!checkpoints.length) continue;
    if (exactRoutes) {
      checkpoints = exactRoutes;
    } else if (summaryContext) {
      const contextual = checkpoints.filter((checkpoint) => checkpoint === "descriptives.summary_dataset"
        || checkpoint === "descriptives.estpost_active_result"
        || exportContext && checkpoint === "exports.descriptive_excel_sheet"
        || figureContext && checkpoint === "figures.descriptive_bar");
      if (contextual.length) checkpoints = contextual;
      else checkpoints = [];
    } else if (figureContext) {
      const contextual = checkpoints.filter((checkpoint) => checkpoint.startsWith("figures."));
      const hasNonFigureMeaning = checkpoints.some((checkpoint) => !checkpoint.startsWith("figures."));
      checkpoints = contextual.length && !hasNonFigureMeaning ? contextual : [];
    } else if (exportContext) {
      const contextual = checkpoints.filter((checkpoint) => checkpoint.startsWith("exports.") || checkpoint === "final_excel_assembly");
      checkpoints = contextual;
    } else {
      const estimation = checkpoints.filter((checkpoint) => checkpoint.startsWith("estimation."));
      checkpoints = estimation;
    }
    for (const checkpoint of checkpoints) if (!routed.includes(checkpoint)) routed.push(checkpoint);
  }
  return routed;
}

function requestStateAnchors(request) {
  const value = String(request || "");
  const anchors = [];
  if (/\bster\b|\.ster\b/i.test(value)) anchors.push("persisted_ster");
  if (/\be\(sample\)\b|estimation sample|추정표본/i.test(value)) anchors.push("esample_state");
  if (/raw\s+name|raw\s+coefficient|coefficient\s+name|계수명|e\(b\)|factor-?variable/i.test(value)) anchors.push("raw_factor_coefficient_identity");
  if (/preserve|freeze|unchanged|do\s+not\s+modify|don't\s+modify|dont\s+modify|보존|유지|동결/i.test(value)) anchors.push("preserve_existing_prefix");
  if (/single\s+(?:outcome|sheet)|one\s+(?:outcome|sheet)|한\s*(?:개|시트|outcome)/i.test(value)) anchors.push("direct_single_sheet_flow");
  return unique(anchors);
}

function requestPolicyAnchors(request, inferredHeadwords) {
  const value = String(request || "");
  const anchors = [];
  const figureHeadwordSelected = inferredHeadwords.some((item) => item.startsWith("figures."));
  if (/raw\s+name|raw\s+coefficient|coefficient\s+name|계수명|e\(b\)|factor-?variable|합성|synthetic|treat_y|_y(?:19|20)\d{2}|event.?study|이벤트.?스터디/i.test(value)
    || inferredHeadwords.some((item) => ["estimation.staggered_did", "figures.event_study", "figures.coefplot_named_estimates", "final_excel_assembly"].includes(item))) {
    anchors.push("preserve_raw_factor_coefficients");
  }
  if (/event.?study|이벤트.?스터디|pretrend/i.test(value) || inferredHeadwords.includes("figures.event_study")) {
    anchors.push("english_only_event_study_text", "single_hash_event_rhs", "raw_title_bottom_legend_immediate_pdf");
  }
  if (/한글|한국어|맑은고딕|맑은\s*고딕|malgun\s+gothic/i.test(value) || figureHeadwordSelected) {
    anchors.push("malgun_gothic_for_non_event_korean_graphs");
  }
  if (/excel|xlsx|outreg2/i.test(value) || inferredHeadwords.includes("final_excel_assembly")) {
    anchors.push("canonical_outreg2_final_excel");
  }
  if (/2sls|ivreg|first.?stage|1st.?stage|1단계|도구변수/i.test(value)) anchors.push("first_stage_same_raw_outreg2_formatter");
  if (/fallback|template|템플릿|reselect|다시.*선택|직접.*작성/i.test(value)) anchors.push("reselect_before_bounded_direct_fallback");
  return unique(anchors);
}

function buildScaleKeywordBundle(request, inferredHeadwords, requestedSubsteps, scale) {
  const scaleKeywords = {
    no_write: ["read_only", "no_writable_dictionary_code"],
    atomic_substep: ["single_substep", "single_headword", looksLikeSingleStataCommand(request) ? "exact_stata_command" : "requested_substep"].filter(Boolean),
    checkpoint: ["single_checkpoint", "single_headword", "bounded_transition"],
    multi_checkpoint: ["multi_checkpoint", "preserve_nonselected_headwords", "bounded_multi_stage"],
    overhaul: ["explicit_overhaul", "multi_stage_rebuild", "compatible_variants_only"],
  }[scale] || [];
  const headwordQueries = inferredHeadwords.map((headword) => {
    const entry = DICTIONARY_BY_HEADWORD.get(headword);
    return {
      headword,
      commands: (entry?.common_commands || []).slice(0, 8),
      aliases: (entry?.aliases || []).slice(0, 8),
    };
  });
  const atomicSubstepQueries = requestedSubsteps.map((row) => ({
    checkpoint: row.checkpoint,
    substep_id: row.substep_id,
    commands: [...new Set(row.match?.commands || [])].slice(0, 8),
    tokens: [...new Set(row.match?.tokens || [])].slice(0, 8),
    label_ids: [...new Set(row.match?.label_ids || [])].slice(0, 8),
  }));
  return {
    scale_keywords: scaleKeywords,
    command_anchors: requestCommandAnchors(request),
    state_anchors: requestStateAnchors(request),
    policy_anchors: requestPolicyAnchors(request, inferredHeadwords),
    headword_queries: headwordQueries,
    atomic_substep_queries: atomicSubstepQueries,
  };
}

function inferImplementationFootprint(request, mode, explicitHeadwords, requestedSubsteps, inferredHeadwords, intentClassification) {
  const value = String(request || "");
  const exactCommand = looksLikeSingleStataCommand(value);
  const commandSequence = looksLikeStataCommandSequence(value);
  const writeSignal = /(?:추가|수정|고쳐|고치|작성|만들|짜|구축|실행|돌려|내보|생성|업데이트)|\b(?:add|fix|edit|modify|change|write|create|build|implement|run|export|update)\b/i.test(value);
  const userOverride = explicitHeadwords.length > 0 || requestedSubsteps.length > 0;
  const explicitReadOnly = intentClassification?.intent === "review_only";
  const writeAuthorized = !explicitReadOnly;
  const codeRequired = writeAuthorized && (mode === "overhaul" || userOverride || exactCommand || commandSequence || writeSignal);
  let scale = "no_write";
  if (codeRequired) {
    if (mode === "overhaul") scale = "overhaul";
    else if ((requestedSubsteps.length === 1 && inferredHeadwords.length === 1) || (exactCommand && inferredHeadwords.length === 1)) scale = "atomic_substep";
    else if (inferredHeadwords.length === 1) scale = "checkpoint";
    else scale = "multi_checkpoint";
  }
  const scaleKeywordBundle = buildScaleKeywordBundle(request, inferredHeadwords, requestedSubsteps, scale);
  return {
    code_required: codeRequired,
    scale,
    scale_basis: "requested state-transition footprint, not projected line count or hypothetical extensibility",
    classification_order: ["code-change decision", "implementation scale", "dictionary headwords", "state-compatible variant"],
    exact_stata_command_detected: exactCommand,
    stata_command_sequence_detected: commandSequence,
    explicit_read_only_detected: explicitReadOnly,
    user_scope_override: userOverride,
    headword_budget: codeRequired ? inferredHeadwords.length : 0,
    selected_headwords: codeRequired ? inferredHeadwords : [],
    scale_keywords: codeRequired ? scaleKeywordBundle : { ...scaleKeywordBundle, headword_queries: [], atomic_substep_queries: [] },
    keyword_queries: codeRequired ? scaleKeywordBundle.headword_queries : [],
    writable_code_budget_per_headword: 1,
    alternative_metadata_limit_per_headword: 3,
    corpus_context_limit_per_headword: 3,
    loading_rule: codeRequired
      ? "Convert the approved request scale into retrieval keywords, then evaluate dictionary metadata deterministically and load code for only one chosen compatible variant inside each selected headword. Do not retrieve code from unselected headwords."
      : "This is a read-only request. Do not load writable dictionary code or create an intervention.",
  };
}

function variantViolatesRawFactorPolicy(row) {
  const syntheticAlias = syntheticEventAliasFindings(row.code).some((finding) => finding.rule === "synthetic_event_term_alias");
  const graphContractViolation = graphPolicyFindings(row.code).some((finding) => ["interaction_coefficient_alias", "event_study_non_english"].includes(finding.rule));
  return syntheticAlias || graphContractViolation;
}

function checkVariantCompatibility(row, observed, availableState, request = "") {
  const failures = [];
  const state = availableState || {};
  const persistedEstimate = observed.signals.ster_files > 0
    || observed.signals.estimates_save
    || observed.signals.estimates_use
    || state.estimate_state === "ster";
  const activeEstimate = observed.signals.regression_commands
    || ["stored_in_memory", "active_eclass"].includes(state.estimate_state);
  const fromSter = /persisted_ster|estimates use|one ster file/i.test(`${row.variant_id} ${row.code} ${JSON.stringify(row.state_signature || {})}`);
  const inputSignatureComparison = compareInputSignatures(row.input_signature, state.input_signature || observed.input_signature);
  const profileTarget = state.input_profile || state.target_input_profile || state.input_signature
    || (persistedEstimate ? { ...observed.input_signature, data_structure: "stored e-class estimates" } : observed.input_signature);
  const templateInputProfileComparison = compareTemplateInputProfile(row.template_input_profile, profileTarget);
  if (inputSignatureComparison.status === "semantic_review_required") {
    failures.push("source and target input data structures conflict; select another template or resolve the topology evidence before automatic reuse");
  }
  if (templateInputProfileComparison.status === "incompatible") {
    failures.push("template input profile conflicts with the target's declared topology or required variable characteristics; select another template");
  }

  for (const signal of row.forbidden_signals || []) {
    if (observed.policy_signals?.[signal]) failures.push(`target project has forbidden signal: ${signal}`);
  }
  if (variantViolatesRawFactorPolicy(row)) {
    failures.push("candidate code violates the raw factor-coefficient or event-study language contract");
  }
  if (row.checkpoint === "figures.event_study") {
    const axisDecision = availableState?.event_study_axis_profile
      ? analyzeEventStudyAxisProfile(availableState.event_study_axis_profile)
      : null;
    const cardinality = eventOutcomeCardinalityFromText(request);
    const axisPatternSelection = eventStudyAxisPatternSelection(axisDecision, cardinality);
    if (!eventStudyAxisPatternCompatible(row, axisDecision, cardinality)) {
      failures.push(axisPatternSelection.required_patterns.length
        ? `event-study axis selection requires event_axis_pattern ${axisPatternSelection.required_patterns.join(" or ")}`
        : `event-study axis selection has no writable pattern: ${axisPatternSelection.status}`);
    }
  }
  if (row.checkpoint === "final_excel_assembly") {
    if (fromSter && !persistedEstimate) failures.push("persisted-estimate variant requires observed .ster or estimates save/use state");
    if (!fromSter && !activeEstimate) failures.push("immediate outreg2 variant requires observed regression or caller-declared active e-class state");
    const flow = buildOutputFlowProfile(observed, availableState);
    if (!flow.selection_ready) failures.push(...flow.failures.map((failure) => `output-flow selection is unresolved: ${failure}`));
    else if (flow.direct_implementation_allowed) failures.push("output-flow profile requires concise direct single-sheet outreg2 code without a formatter template");
    else if (flow.recommended_label_id !== row.label_id) failures.push(`output-flow profile selects ${flow.recommended_label_id}, not ${row.label_id}`);
  }
  if (row.checkpoint === "descriptives.sample_mean" && !activeEstimate) {
    failures.push("estimation-sample mean requires observed regression or caller-declared active e-class state");
  }
  if (row.checkpoint === "project_setup.paths" && row.canonical_default) {
    const hasExistingDoFiles = Number(observed.extension_counts?.[".do"] || 0) > 0;
    const hasExistingPathInterface = (observed.interface_fingerprint?.macro_definitions || []).length > 0;
    if (hasExistingDoFiles || hasExistingPathInterface) failures.push("default style path roles are a first-build-only canonical and cannot replace an existing project interface");
  }
  if (row.label_id === "master.sequence.config_prepare_analysis.v1") {
    const masterFiles = new Set(observed.intervention_candidates?.master_files || []);
    const masterCalls = (observed.interface_fingerprint?.call_sites || []).filter((call) => masterFiles.has(call.file));
    if (masterCalls.length !== 3) failures.push(`config-prepare-analysis variant requires exactly three direct master calls; observed ${masterCalls.length}`);
  }
  if (row.label_id === "master.sequence.stage_logs.v1") {
    const observedStageLog = observed.signals.stage_log_open && observed.signals.stage_log_close;
    const requestedStageLog = /\b(?:stage[- ]?specific|per[- ]?stage)\s+logs?\b|단계별\s*로그|각\s*(?:단계|do-?file)[^\r\n]{0,30}로그/i.test(String(request || ""));
    if (!observedStageLog && !requestedStageLog) {
      failures.push("stage-log atom requires an observed log/do/log interface or an explicit request for stage-specific logs");
    }
  }
  return {
    compatible: failures.length === 0,
    failures,
    input_signature_comparison: inputSignatureComparison,
    template_input_profile_comparison: templateInputProfileComparison,
    observed_state: { persisted_estimate: persistedEstimate, active_estimate: activeEstimate },
  };
}

function rankVariantForObservedState(row, observed, request, availableState) {
  if (!selectorSourceAuthorized(row)) {
    return {
      score: Number.NEGATIVE_INFINITY,
      reasons: ["candidate failed the fail-closed research-source or exact formatter provenance allowlist"],
      template_input_profile_comparison: compareTemplateInputProfile(
        row.template_input_profile,
        availableState?.input_profile || availableState?.target_input_profile || availableState?.input_signature || observed.input_signature,
      ),
    };
  }
  let score = row.decision === "keep" ? 20 : row.decision === "conditional_keep" ? 10 : -100;
  const reasons = [];
  const inputSignatureComparison = compareInputSignatures(row.input_signature, availableState?.input_signature || observed.input_signature);
  const hasPersistedEstimate = observed.signals.ster_files > 0 || observed.signals.estimates_save || observed.signals.estimates_use || availableState?.estimate_state === "ster";
  const profileTarget = availableState?.input_profile || availableState?.target_input_profile || availableState?.input_signature
    || (hasPersistedEstimate ? { ...observed.input_signature, data_structure: "stored e-class estimates" } : observed.input_signature);
  const templateInputProfileComparison = compareTemplateInputProfile(row.template_input_profile, profileTarget);
  if (inputSignatureComparison.status === "aligned") {
    score += 12;
    reasons.push("source and target input signatures align on evidenced topology");
  } else if (inputSignatureComparison.status === "semantic_review_required") {
    score -= 12;
    reasons.push("source and target data structures differ and require semantic review");
  } else if (inputSignatureComparison.status === "minimal_binding_changes_required") {
    reasons.push("template keys or time/unit bindings require explicit target substitutions");
  }
  if (templateInputProfileComparison.status === "aligned") {
    score += 12;
    reasons.push("template input profile aligns with the declared target topology");
  } else if (templateInputProfileComparison.status === "incompatible") {
    score -= 100;
    reasons.push("template input profile conflicts with declared target topology or required variables");
  }
  if (row.reuse_scope === "general") score += 24;
  if (row.reuse_scope === "method_specific") score += 12;
  score += Number(row.readability_score || 0) * 2 + Number(row.portability_score || 0) * 2;
  if (row.preferred_within_checkpoint) score += 18;
  if (row.explicit_canonical_exception) score += 40;
  if (rubricClassification(row) === "preferred_candidate") score += 20;
  if (rubricClassification(row) === "conditional_candidate") score += 10;
  if (rubricClassification(row) === "reference_only") score -= 20;
  if (row.derivation_provenance?.independent_support === false) {
    score -= 15;
    reasons.push("derived canonical template is non-independent implementation evidence");
  }
  const haystack = labelRankingMetadata(row);
  for (const term of tokenize(request || "")) if (haystack.includes(term)) score += 2;
  const stateText = JSON.stringify(availableState || {}).toLowerCase();
  for (const term of tokenize(stateText)) if (haystack.includes(term)) score += 3;
  if (row.checkpoint === "final_excel_assembly") {
    const flow = buildOutputFlowProfile(observed, availableState);
    if (flow.recommended_label_id === row.label_id) {
      score += 180;
      reasons.push(`whole-flow contract selects ${flow.selection_class}`);
    }
    const persisted = observed.signals.ster_files > 0 || observed.signals.estimates_save || observed.signals.estimates_use || availableState?.estimate_state === "ster";
    const fromSter = /persisted_ster|estimates use|one ster file/i.test(haystack);
    if (persisted && fromSter) {
      score += 20;
      reasons.push("existing ster or estimates-save/use state matches the persisted-estimate variant");
    } else if (persisted && !fromSter) score -= 20;
    if (!persisted && observed.signals.regression_commands && /immediately_after|explicit_control_specs|active e-class/i.test(haystack)) {
      score += 70;
      reasons.push("regression code exists but no persisted estimate state was detected");
    }
    if (observed.style_profile.existing_excel_style === "outreg2") {
      score += 20;
      reasons.push("project already uses outreg2");
    }
  }
  if (row.checkpoint === "postest.persist_estimate" || row.checkpoint === "postest.export_sample_keys") {
    if (observed.style_profile.persisted_estimate_style && /ster/i.test(haystack)) score += 50;
    if (observed.signals.esample_reference && /sample.*dta|keyed/i.test(haystack)) score += 40;
  }
  if (row.checkpoint === "project_setup.paths" && row.canonical_default) {
    const hasExistingDoFiles = Number(observed.extension_counts?.[".do"] || 0) > 0;
    const hasExistingPathInterface = (observed.interface_fingerprint?.macro_definitions || []).length > 0;
    if (!hasExistingDoFiles && !hasExistingPathInterface) {
      score += 80;
      reasons.push("new project has no existing path interface, so the default style role layout is the canonical first-build default");
    } else {
      score -= 40;
      reasons.push("an existing project path interface was detected and must be preserved");
    }
  } else if (row.canonical_default) {
    score += 3;
    reasons.push("compatible canonical default used only as a final tie-break");
  }
  const helperProgramDeclared = /\bhelper[_ -]?program\b|\bprogram[_ -]?defined\b/i.test(haystack);
  if (observed.style_profile.helper_programs && helperProgramDeclared) score += 12;
  if (!observed.style_profile.helper_programs && helperProgramDeclared) score -= 6;
  if (reasons.length === 0) reasons.push("matched by checkpoint, task terms, and the variant's declared state contract");
  return { score, reasons, template_input_profile_comparison: templateInputProfileComparison };
}

function normalizePlannedVariables(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.map((row, index) => {
    const name = String(row?.name || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(name)) throw new Error(`planned_variables ${index + 1}행 name은 32자 이하의 유효한 Stata 변수명이어야 합니다.`);
    if (seen.has(name.toLowerCase())) throw new Error(`planned_variables에 중복 변수명이 있습니다: ${name}`);
    seen.add(name.toLowerCase());
    const readerDescription = String(row?.reader_description || "").trim();
    if (!readerDescription) throw new Error(`planned_variables ${name}에는 사용자용 설명이 필요합니다.`);
    const sourceOrFormula = String(row?.source_or_formula || "").trim();
    if (!sourceOrFormula) throw new Error(`planned_variables ${name}에는 원자료 단위와 정확한 생성식 또는 threshold를 적은 source_or_formula가 필요합니다.`);
    const unitObservationLevel = String(row?.unit_observation_level || "").trim();
    if (!unitObservationLevel) throw new Error(`planned_variables ${name}에는 output 단위와 관측단위를 적은 unit_observation_level이 필요합니다.`);
    return {
      name,
      reader_description: readerDescription,
      analysis_role: String(row?.analysis_role || "").trim() || null,
      source_or_formula: sourceOrFormula,
      unit_observation_level: unitObservationLevel,
      period_geography: String(row?.period_geography || "").trim() || null,
      coding_missing: String(row?.coding_missing || "").trim() || null,
      creation_file: row?.creation_file ? normalizeRelativePath(row.creation_file, `planned_variables ${name} creation_file`) : null,
      used_in: String(row?.used_in || "").trim() || null,
    };
  });
}

function renderProposedPathTree(folders, files) {
  const root = { children: new Map(), directory: true };
  const addPath = (relative, directory) => {
    const parts = String(relative || "").split("/").filter(Boolean);
    let node = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (!node.children.has(part)) node.children.set(part, { children: new Map(), directory: false });
      node = node.children.get(part);
      if (index < parts.length - 1 || directory) node.directory = true;
    }
  };
  folders.forEach((relative) => addPath(relative, true));
  files.forEach((relative) => addPath(relative, false));
  if (!root.children.size) return null;
  const lines = ["project/"];
  const draw = (node, prefix) => {
    const entries = [...node.children.entries()].sort(([nameA, valueA], [nameB, valueB]) => {
      if (valueA.directory !== valueB.directory) return valueA.directory ? -1 : 1;
      return nameA.localeCompare(nameB, "en");
    });
    entries.forEach(([name, child], index) => {
      const last = index === entries.length - 1;
      lines.push(`${prefix}${last ? "└─" : "├─"} ${name}${child.directory ? "/" : ""}`);
      if (child.children.size) draw(child, `${prefix}${last ? "   " : "│  "}`);
    });
  };
  draw(root, "");
  return lines.join("\n");
}

function overhaulPrewriteProposal(args, observed, mode) {
  if (mode !== "overhaul") return null;
  const projectIsEmpty = observed.files.length === 0;
  const targetLayout = args.target_layout || (projectIsEmpty ? "new_first_build" : "preserve_existing");
  if (targetLayout === "new_first_build" && !projectIsEmpty) throw new Error("new_first_build 기본 트리는 비어 있는 최초 구축 대상에만 사용할 수 있습니다. 기존 프로젝트에는 preserve_existing 또는 rebuild_existing과 정확한 변경 경로를 사용하세요.");
  const proposedFolders = unique((args.proposed_folders || []).map((value) => normalizeRelativePath(value, "proposed_folders")));
  const proposedFiles = unique((args.proposed_files || []).map((value) => normalizeRelativePath(value, "proposed_files")));
  const plannedVariables = normalizePlannedVariables(args.planned_variables || []);
  const noNewPersistentVariables = args.no_new_persistent_variables === true;
  if (plannedVariables.length && noNewPersistentVariables) throw new Error("planned_variables와 no_new_persistent_variables: true를 함께 지정할 수 없습니다.");
  const useDefaultTree = targetLayout === "new_first_build";
  const structureReady = useDefaultTree || proposedFolders.length > 0 || proposedFiles.length > 0;
  const variablesReady = plannedVariables.length > 0 || noNewPersistentVariables;
  return {
    status: structureReady && variablesReady ? "ready_for_user_confirmation" : "needs_plan_details",
    target_layout: targetLayout,
    existing_project_rule: targetLayout === "new_first_build"
      ? "Use this compact tree only because the target is an approved new first build."
      : "Preserve existing compatible paths. The tree below must contain only approved additions, replacements, moves, and deletions; do not import the new-project tree automatically.",
    proposed_file_tree: useDefaultTree ? NEW_PROJECT_TREE : [...proposedFolders.map((pathValue) => `${pathValue}/`), ...proposedFiles],
    tree_markdown: useDefaultTree ? NEW_PROJECT_TREE_MARKDOWN : renderProposedPathTree(proposedFolders, proposedFiles),
    proposed_folders: proposedFolders,
    proposed_files: proposedFiles,
    planned_variables: plannedVariables,
    variables_pending_user_definition: !variablesReady,
    no_new_persistent_variables: noNewPersistentVariables,
    readme_path: "README.md",
    readme_outline: README_OUTLINE,
    variable_dictionary_columns: VARIABLE_DICTIONARY_COLUMNS,
    approval_rule: "Show the tree and planned-variable table to the user and obtain explicit approval before any project write. If the plan changes, show the revised tree and table again.",
  };
}

function normalizeSummaryArtifactInterface(root, value) {
  if (!value) return null;
  const producer = normalizeRelativePath(value.producer, "summary_artifact_interface.producer");
  const consumers = unique((value.consumers || []).map((item) => normalizeRelativePath(item, "summary_artifact_interface.consumers")));
  const artifactPath = normalizeRelativePath(value.path, "summary_artifact_interface.path");
  const requiredVariables = unique((value.required_variables || []).map((item) => String(item || "").trim()).filter(Boolean));
  const requiredStatistics = unique((value.required_statistics || []).map((item) => String(item || "").trim()).filter(Boolean));
  if (!producer.toLowerCase().endsWith(".do")) throw new Error("summary_artifact_interface.producer는 .do 파일이어야 합니다.");
  if (!consumers.length || consumers.some((item) => !item.toLowerCase().endsWith(".do"))) throw new Error("summary_artifact_interface.consumers에는 하나 이상의 .do 파일이 필요합니다.");
  if (!artifactPath.toLowerCase().endsWith(".dta")) throw new Error("summary_artifact_interface.path는 .dta 파일이어야 합니다.");
  if (!requiredVariables.length || !requiredStatistics.length) throw new Error("summary_artifact_interface에는 required_variables와 required_statistics가 필요합니다.");
  for (const relative of [producer, ...consumers, artifactPath]) resolveInside(root, relative, "summary_artifact_interface path");
  return {
    status: "declared_immutable",
    producer,
    consumers,
    path: artifactPath,
    required_variables: requiredVariables,
    required_statistics: requiredStatistics,
    immutable_fields: ["producer", "consumers", "path", "required_variables", "required_statistics"],
    rule: "The producer writes exactly one named canonical summary dataset at path. Every table or figure consumer reads that same path and may use only the declared variables and complete statistic set; no consumer may recompute a parallel summary.",
  };
}

function planDictionaryRepairs(args) {
  if (!args.path) throw new Error("프로젝트 path가 필요합니다.");
  const root = path.resolve(String(args.path));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error("path는 디렉터리여야 합니다.");
  const requestText = String(args.request || "");
  const reportDisabledByRequest = /report\.md[^.!?\n]{0,40}(?:만들지|작성하지|수정하지|쓰지|삭제하고|삭제해|불필요|금지)|(?:do\s+not|don't|dont|never)\s+(?:create|write|modify|use)[^.!?\n]{0,30}report\.md|\bno\s+report\.md\b/i.test(requestText);
  const reportPolicy = resolveReportPolicy(args, reportDisabledByRequest ? "disabled" : "required");
  const requestedMode = args.repair_mode || "auto";
  const targetFiles = (args.target_files || []).map((value) => normalizeRelativePath(value, "target_files"));
  const existingDoTarget = targetFiles.some((relative) => {
    if (!relative.toLowerCase().endsWith(".do")) return false;
    const resolved = resolveInside(root, relative, "target_files");
    return fs.existsSync(resolved.target) && fs.statSync(resolved.target).isFile();
  });
  const overhaulSignal = /(?:전면(?:적인)?\s*(?:개편|재작성|재구축)|처음부터\s*(?:다시|새로)|(?:전체|전면|완전한?)\s*오버홀|오버홀(?:을)?\s*(?:해|하|진행|요청|부탁|합시다)|full\s+rebuild|complete\s+rewrite|\boverhaul\s+(?:(?:this|the|my)\s+)?(?:project|workflow|codebase|analysis)\b)/i.test(requestText.trim());
  const negatedOverhaul = /(?:오버홀|전면(?:적인)?\s*(?:개편|재작성|재구축)|처음부터\s*(?:다시|새로)|full\s+rebuild|complete\s+rewrite)[^.!?\n]{0,24}(?:말고|하지\s*말|아니|불필요|제외)/i.test(requestText);
  const inferredOverhaul = overhaulSignal && !negatedOverhaul;
  const incompatibility = args.available_state?.workflow_incompatibility;
  const evidencedIncompatibility = incompatibility?.confirmed === true
    && Array.isArray(incompatibility.evidence)
    && incompatibility.evidence.some((value) => String(value || "").trim());
  const mode = inferredOverhaul || evidencedIncompatibility ? "overhaul" : "partial";
  const scopeWarnings = [];
  if ((requestedMode === "overhaul" || args.intent_mode === "overhaul") && mode !== "overhaul") {
    scopeWarnings.push("caller arguments requested overhaul, but the natural-language request and evidence do not authorize it; partial repair was retained");
  }
  const intentClassification = classifyRequestIntent(
    args.request,
    args.intent_mode === "overhaul" && mode !== "overhaul" ? "auto" : (args.intent_mode || "auto"),
    mode,
    { existing_do_target: existingDoTarget },
  );
  const requestContext = intentClassification.context;
  const intent = intentClassification.intent;
  const planningMode = intent === "review_only" ? "partial" : mode;
  if (intent === "review_only" && mode === "overhaul") scopeWarnings.push("review-only/no-change intent overrides overhaul signals and retains a no-write partial inspection");
  const sourceReusePlan = buildSourceReusePlan(root, args.request, args.source_reuse);
  const summaryArtifactInterface = normalizeSummaryArtifactInterface(root, args.summary_artifact_interface);
  const observed = scanProjectForDictionary(root, args.scope || {});
  const overhaulProposal = overhaulPrewriteProposal(args, observed, planningMode);
  const outputFlowProfile = buildOutputFlowProfile(observed, args.available_state || {});
  const eventStudyAxisProfile = analyzeEventStudyAxisProfile(args.available_state?.event_study_axis_profile || {});
  const completedHeadwords = inferCompletedHeadwords(observed);
  const requestedSubsteps = Array.isArray(args.requested_substeps) ? args.requested_substeps : [];
  const explicitHeadwords = unique([...(args.requested_checkpoints || []), ...requestedSubsteps.map((row) => row.checkpoint).filter(Boolean)]);
  let headwords = inferDictionaryHeadwords(args.request, explicitHeadwords, planningMode);
  if (summaryArtifactInterface) headwords = headwords.filter((checkpoint) => checkpoint !== "descriptives.estpost_active_result");
  const exactCommandAnchors = requestCommandAnchors(args.request);
  const explicitSet = new Set(explicitHeadwords);
  const actionableSet = new Set(inferDictionaryHeadwords(requestContext.actionable, [], planningMode));
  const preservedSet = new Set(inferDictionaryHeadwords(requestContext.preserved, [], planningMode));
  const estimateConsumerRequested = explicitlyRequestsEstimateConsumer(requestContext.actionable || requestContext.full);
  headwords = headwords.filter((item) => explicitSet.has(item)
    || item === "postest.persist_estimate" && estimateConsumerRequested
    || !preservedSet.has(item)
    || actionableSet.has(item));
  if (intent === "add_feature") {
    const completedSet = new Set(completedHeadwords);
    headwords = headwords.filter((item) => {
      if (explicitSet.has(item)) return true;
      if (item === "postest.persist_estimate" && estimateConsumerRequested) return true;
      if (completedSet.has(item) && !actionableSet.has(item)) return false;
      return true;
    });
  }
  const existingPrefixContext = /(?:기존|이미|완료|되어).*(?:전처리|회귀|추정).*(?:뒤|후|이후).*?(?:excel|xlsx|표)/i.test(String(args.request || ""));
  if (intent === "add_feature" && existingPrefixContext && headwords.includes("final_excel_assembly")) {
    const explicitlyRequested = new Set(args.requested_checkpoints || []);
    const contextualUpstream = new Set(["clean.id_normalize", "clean.derive_variables", "treatment.arm_mapping", "outlier.winsorize", "scale.standardize_esample", "sample.trade_share_threshold", "sample.arm_response_eligibility", "panel.treatment_cohort", "panel.turnover_event_time", "estimation.conventional", "estimation.staggered_did"]);
    headwords = headwords.filter((item) => !contextualUpstream.has(item) || explicitlyRequested.has(item));
  }
  const retrievalPlan = inferImplementationFootprint(args.request, planningMode, explicitHeadwords, requestedSubsteps, headwords, intentClassification);
  if (!retrievalPlan.code_required) headwords = [];
  const dictionaryUnmapped = retrievalPlan.code_required && !headwords.length;

  const interventions = headwords.map((checkpoint) => {
    const checkpointLabels = LABELED_CHECKPOINTS.filter((row) =>
      row.checkpoint === checkpoint
        && !GUIDE_MECHANICS_LABEL_IDS.has(row.label_id)
        && selectorSourceAuthorized(row));
    const checkpointCommandAnchors = exactCommandAnchors.filter((anchor) => DYNAMIC_COMMAND_CHECKPOINTS.get(normalizedCommandAnchor(anchor))?.has(checkpoint));
    const finalExcelFlow = checkpoint === "final_excel_assembly"
      ? buildOutputFlowProfile(observed, args.available_state || {})
      : null;
    const evaluatedCandidates = checkpointLabels.filter((row) => row.decision !== "drop" && (row.reuse_scope !== "project_specific" || row.explicit_canonical_exception))
      .map((row) => ({
        row,
        compatibility: checkVariantCompatibility(row, observed, args.available_state || {}, args.request || ""),
        ...rankVariantForObservedState(row, observed, args.request, args.available_state || {}),
      }));
    const referenceOnlyCandidates = evaluatedCandidates.filter((item) => !rubricAutoSelectable(item.row));
    const axisDecision = args.available_state?.event_study_axis_profile
      ? analyzeEventStudyAxisProfile(args.available_state.event_study_axis_profile)
      : null;
    const eventCardinality = eventOutcomeCardinalityFromText(args.request || "");
    const autoSelectableCandidates = evaluatedCandidates.filter((item) => rubricAutoSelectable(item.row)
      && eventStudyAxisPatternCompatible(item.row, axisDecision, eventCardinality)
      && (checkpoint !== "final_excel_assembly" || item.row.label_id === "export.regression_excel.from_ster_default_style.v1")
      && (!checkpointCommandAnchors.length || (item.row.command_anchors || []).some((anchor) => checkpointCommandAnchors.includes(normalizedCommandAnchor(anchor)))));
    const compatibleBeforeSpecificity = autoSelectableCandidates.filter((item) => item.compatibility.compatible);
    const specificityGate = gateByExplicitMethodContract(
      compatibleBeforeSpecificity.map((item) => item.row),
      `${args.request || ""} ${JSON.stringify(args.available_state || {})}`,
    );
    const specificityIds = new Set(specificityGate.rows.map((row) => row.label_id));
    const candidates = compatibleBeforeSpecificity.filter((item) => specificityIds.has(item.row.label_id))
      .map((item) => specificityGate.active
        ? { ...item, reasons: [...item.reasons, `explicit method/state contract matched: ${specificityGate.matched_tokens.join(", ")}`] }
        : item)
      .sort((a, b) => b.score - a.score || a.row.annotation_order - b.row.annotation_order);
    const incompatibleCandidates = autoSelectableCandidates.filter((item) => !item.compatibility.compatible);
    const specificityExcludedCandidates = compatibleBeforeSpecificity.filter((item) => !specificityIds.has(item.row.label_id));
    const stage = candidates[0]?.row.stage || checkpointLabels[0]?.stage || null;
    const existingFiles = stage ? observed.stage_files[stage] || [] : [];
    const existingSpecific = checkpoint === "final_excel_assembly"
      ? observed.intervention_candidates.excel_files
      : checkpoint.startsWith("estimation.")
        ? observed.intervention_candidates.estimation_files
        : existingFiles;
    const approvedFallback = !candidates.length && stage
      ? searchApproved({ stage, task: `${checkpoint} ${args.request}`, _exhaustive: true })
      : null;
    const dictionaryEntry = DICTIONARY_BY_HEADWORD.get(checkpoint);
    const manualFallback = !candidates.length
      ? searchManual({
        query: `${checkpoint} ${args.request}`,
        commands: (dictionaryEntry?.common_commands || []).slice(0, 10),
        authority: "official",
        limit: 5,
      })
      : null;
    const atomicSubsteps = requestedSubsteps.filter((row) => row.checkpoint === checkpoint).map((substep) => {
      const matchedLabels = matchingAutoSelectableLabels(
        LABELED_CHECKPOINTS,
        checkpoint,
        substep.match || {},
        substep.description || "",
      ).filter((row) => eventStudyAxisPatternCompatible(row, axisDecision, eventCardinality)
        && (checkpoint !== "final_excel_assembly" || row.label_id === "export.regression_excel.from_ster_default_style.v1"));
      const matchedCandidates = matchedLabels.map((row) => ({
        row,
        compatibility: checkVariantCompatibility(row, observed, args.available_state || {}, `${args.request || ""} ${substep.description || ""}`),
        ...rankVariantForObservedState(row, observed, `${args.request || ""} ${substep.description || ""}`, args.available_state || {}),
      })).map((item) => ({
        ...item,
        score: item.score + ((substep.match?.label_ids || []).map((value) => String(value).toLowerCase()).includes(String(item.row.label_id).toLowerCase()) ? 1000 : 0),
      })).filter((item) => item.compatibility.compatible)
        .sort((a, b) => b.score - a.score || a.row.annotation_order - b.row.annotation_order);
      const recommendedMode = matchedCandidates.length ? "template" : "general_rule";
      return {
        substep_id: substep.substep_id,
        description: substep.description || null,
        match: substep.match || {},
        recommended_mode: recommendedMode,
        chosen_label_id: matchedCandidates[0]?.row.label_id || null,
        matched_candidate_ids: matchedCandidates.map((item) => item.row.label_id),
        incompatible_candidate_ids: matchedLabels.filter((row) => !matchedCandidates.some((item) => item.row.label_id === row.label_id)).map((row) => row.label_id),
        native_rule: matchedCandidates.length
          ? "Use the compatible template only when permitted bindings leave the complete atomic transition intact. If later evidence shows that selection is wrong, use general_rule and retain the rank-relative nearest candidate only as a nonbinding hint."
          : "No suitable template matched. Use general_rule, retain the rank-relative nearest inspected candidate only as a nonbinding hint if available, write the shortest declared transition, then lint and runtime-test it.",
      };
    });
    return {
      headword: checkpoint,
      action: existingSpecific.length ? "repair_or_extend_existing" : "insert_new_block",
      existing_evidence_files: existingSpecific,
      chosen_variant: candidates.length ? {
        label_id: candidates[0].row.label_id,
        variant_id: candidates[0].row.variant_id,
        state_match_score: candidates[0].score,
        state_match_reasons: candidates[0].reasons,
        decision: candidates[0].row.decision,
        reuse_scope: candidates[0].row.reuse_scope,
        rubric_classification: rubricClassification(candidates[0].row),
        quality_rubric_review: candidates[0].row.quality_rubric_review,
        readability_score: candidates[0].row.readability_score,
        portability_score: candidates[0].row.portability_score,
        preferred_within_checkpoint: Boolean(candidates[0].row.preferred_within_checkpoint),
        explicit_canonical_exception: Boolean(candidates[0].row.explicit_canonical_exception),
        reusable_core: candidates[0].row.reusable_core,
        source_specific_elements: candidates[0].row.source_specific_elements,
        compatibility: candidates[0].compatibility,
        state_signature: candidates[0].row.state_signature || { requires: candidates[0].row.input_contract, observable_signals: [], produces: candidates[0].row.output_contract },
        event_axis_pattern: candidates[0].row.event_axis_pattern || null,
        selection_conditions: candidates[0].row.selection_conditions,
        dictionary_evidence: dictionaryEvidence(candidates[0].row.checkpoint),
        source_package_review: sourcePackageReview(candidates[0].row),
        minimal_edit_contract: {
          required_changes: candidates[0].row.required_changes,
          editable_fields: candidates[0].row.minimal_edit_fields,
          forbidden_change: "Do not change the block's control flow or combine it with another variant. If the frame must change, return to dictionary selection.",
        },
        source: `${candidates[0].row.source_path}:${candidates[0].row.source_spans.map(([start, end]) => `${start}-${end}`).join(",")}`,
        code: candidates[0].row.code,
      } : null,
      status: candidates.length ? "compatible_variant_selected" : "no_compatible_labeled_variant",
      general_rule_policy: generalRulePolicy({ checkpoint }, {
        axisPatternSelection: eventStudyAxisPatternSelection(axisDecision, eventCardinality),
        requestedFlow: finalExcelFlow,
        writableCandidateCount: candidates.length,
        reportPolicy,
      }),
      evidence_progress: {
        labeled_checked: true,
        labeled_result_count: candidates.length,
        labeled_non_drop_count: evaluatedCandidates.length,
        labeled_auto_selectable_count: autoSelectableCandidates.length,
        rubric_reference_only_variants: referenceOnlyCandidates.map((item) => ({
          label_id: item.row.label_id,
          variant_id: item.row.variant_id,
          reuse_scope: item.row.reuse_scope,
          weighted_score: item.row.quality_rubric_review?.weighted_score ?? null,
          reason: "reference_only is preserved as evidence but cannot be auto-selected",
        })),
        incompatible_labeled_variants: incompatibleCandidates.map((item) => ({
          label_id: item.row.label_id,
          variant_id: item.row.variant_id,
          reuse_scope: item.row.reuse_scope,
          readability_score: item.row.readability_score,
          portability_score: item.row.portability_score,
          preferred_within_checkpoint: Boolean(item.row.preferred_within_checkpoint),
          failures: item.compatibility.failures,
        })),
        specificity_gate: publicSpecificityGate(specificityGate),
        command_anchor_gate: {
          active: checkpointCommandAnchors.length > 0,
          requested_anchors: checkpointCommandAnchors,
          rule: "When the request names an exact dictionary/package command, candidates without that command anchor are excluded before ranking.",
        },
        method_mismatch_labeled_variants: specificityExcludedCandidates.map((item) => ({
          label_id: item.row.label_id,
          variant_id: item.row.variant_id,
          reuse_scope: item.row.reuse_scope,
          reason: `did not match the explicit distinguishing contract token(s): ${specificityGate.distinguishing_tokens.join(", ")}`,
        })),
        dictionary_maturity: dictionaryEntry?.maturity || "missing_headword",
        approved_patterns_checked: approvedFallback !== null,
        approved_pattern_query: approvedFallback?.query || null,
        approved_pattern_result_count: approvedFallback?.results.length || 0,
        approved_pattern_total_eligible: approvedFallback?.result_accounting?.total_eligible || 0,
        approved_pattern_exhaustive: Boolean(approvedFallback?.result_accounting?.exhaustive),
        approved_pattern_sources: (approvedFallback?.results || []).slice(0, retrievalPlan.corpus_context_limit_per_headword).map((row) => ({ chunk_id: row.chunk_id, source: row.source })),
        approved_pattern_context_limit: retrievalPlan.corpus_context_limit_per_headword,
        manual_checked: manualFallback !== null,
        manual_query: manualFallback ? { query: manualFallback.query, commands: manualFallback.commands, authority: manualFallback.authority } : null,
        manual_result_count: manualFallback?.results.length || 0,
        manual_sources: (manualFallback?.results || []).map((row) => ({ manual_id: row.manual_id, source_url: row.source_url, page: row.page })),
        user_decision_required: false,
        direct_implementation_allowed: checkpoint !== "final_excel_assembly"
          || Boolean(finalExcelFlow?.direct_implementation_allowed),
        boundary: checkpoint === "final_excel_assembly"
          ? (finalExcelFlow?.direct_implementation_allowed
            ? "A workbook with one sheet must use concise direct outreg2 replace/append code with an explicit .xls target and no program, regardless of model-column count. Preserve raw outreg2 rows, compute each dependent-variable mean on e(sample), add only adjusted R-squared and those means, and avoid generic formatting machinery."
            : "A workbook with two or more sheets uses the canonical formatter to preserve raw outreg2 rows and align exactly the two approved added statistics. Upstream estimation and every other compatible transition remain flexible.")
          : "Apply the general rules throughout. Select a template only when permitted bindings leave the complete atomic transition intact. If no suitable template exists or the selected template is wrong, use general_rule and retain the rank-relative nearest inspected candidate only as a nonbinding hint; ranking does not establish compatibility. Manual evidence is mechanics-only; ask the user only if a substantive choice is not fixed by the request or observed project.",
      },
      general_rule_evidence_chain: candidates.length ? [] : [
        approvedFallback?.results.length
          ? "approved collected examples were returned as evidence; reuse a genuinely close one or implement the declared transition directly"
          : "all approved collected examples were searched and no compatible labeled transition was found",
        "the official Stata manual was searched after the approved-example audit for syntax, return values, and command state only",
        "write the narrow direct transition and ask the user only if a substantive choice remains unresolved",
      ],
      alternative_variants: candidates.slice(1, 1 + retrievalPlan.alternative_metadata_limit_per_headword).map((item) => ({
        label_id: item.row.label_id,
        variant_id: item.row.variant_id,
        state_match_score: item.score,
        state_match_reasons: item.reasons,
        selection_conditions: item.row.selection_conditions,
        tradeoffs: item.row.tradeoffs,
        dictionary_evidence: dictionaryEvidence(item.row.checkpoint),
        source_package_review: sourcePackageReview(item.row),
      })),
      atomic_substeps: atomicSubsteps,
    };
  });

  const missingState = [];
  if (headwords.includes("final_excel_assembly") && !observed.signals.regression_commands && observed.signals.ster_files === 0 && !args.available_state?.estimate_state) {
    missingState.push({
      required_for: "final_excel_assembly",
      missing: "no regression code, ster file, or caller-declared active estimate state was detected",
      rule: "Report the missing prerequisite; do not expand a partial Excel request into a regression overhaul automatically.",
    });
  }
  const requestedStages = new Set(interventions.map((row) => LABELED_CHECKPOINTS.find((item) => item.checkpoint === row.headword)?.stage).filter(Boolean));
  const preservedStages = Object.entries(observed.stage_files)
    .filter(([stage, files]) => files.length && !requestedStages.has(stage))
    .map(([stage, files]) => ({ stage, files, action: "preserve" }));
  const requestedPositions = headwords.map((item) => HEADWORD_SEQUENCE.indexOf(item)).filter((index) => index >= 0);
  const firstRequestedPosition = requestedPositions.length ? Math.min(...requestedPositions) : HEADWORD_SEQUENCE.length;
  const frozenPrefix = completedHeadwords.filter((item) => {
    const position = HEADWORD_SEQUENCE.indexOf(item);
    return intent === "add_feature" ? position >= 0 && position < firstRequestedPosition : !headwords.includes(item);
  });
  const mutableExistingFiles = intent === "modify_existing" ? targetFiles : [];
  const callSites = observed.interface_fingerprint.call_sites;
  const producerCandidates = unique([
    ...observed.intervention_candidates.estimation_files,
    ...observed.intervention_candidates.estimate_handoff_files,
  ]);
  const safeCallBoundaries = callSites.filter((site) => producerCandidates.some((file) => site.target.replaceAll("\\", "/").endsWith(path.posix.basename(file))));

  return {
    root,
    mode: planningMode,
    intent,
    write_authorization: intentClassification.write_authorization,
    scope_decision: {
      requested_repair_mode: requestedMode,
      requested_intent_mode: args.intent_mode || "auto",
      explicit_overhaul_in_request: inferredOverhaul,
      evidenced_workflow_incompatibility: evidencedIncompatibility,
      accepted_mode: planningMode,
      warnings: scopeWarnings,
    },
    request: args.request,
    dictionary_headwords: headwords,
    dictionary_unmapped_request: dictionaryUnmapped,
    dictionary_unmapped_policy: dictionaryUnmapped
      ? {
        direct_implementation_allowed: !sourceReusePlan,
        user_decision_required: false,
        rule: sourceReusePlan
          ? "The request is governed by source_reuse_plan. Clone the canonical source and apply only declared edits; other template search and fresh synthesis are disabled."
          : "No dictionary headword maps this code request. Use general_rule, retain the rank-relative nearest inspected candidate if one exists only as a nonbinding hint, implement the declared transition with the shortest readable Stata statements, then lint and verify it. Ranking does not establish compatibility. Ask the user only if a substantive research choice remains unresolved.",
      }
      : null,
    retrieval_plan: { ...retrievalPlan, selected_headwords: headwords, headword_budget: headwords.length },
    observed_state: {
      extension_counts: observed.extension_counts,
      signals: observed.signals,
      policy_signals: observed.policy_signals,
      style_profile: observed.style_profile,
      intervention_candidates: observed.intervention_candidates,
      interface_fingerprint: observed.interface_fingerprint,
      input_signature: observed.input_signature,
      output_flow_evidence: observed.output_flow_evidence,
      output_flow_profile: outputFlowProfile,
      event_study_axis_profile: eventStudyAxisProfile,
      scan_scope: observed.scan_scope,
    },
    completion_map: {
      completed_headwords: completedHeadwords,
      frozen_prefix: frozenPrefix,
      requested_headwords: headwords,
      rule: intent === "add_feature"
        ? "Freeze completed dictionary headwords before the first requested headword; read them for interfaces but do not rewrite their computational content."
        : "Freeze every nonrequested headword and every existing file outside the explicit modification targets.",
    },
    preserved_scope: preservedStages,
    interventions,
    source_reuse_plan: sourceReusePlan,
    overhaul_prewrite_proposal: overhaulProposal,
    required_interface_changes: missingState,
    compatibility_contract: {
      summary_artifact_interface: summaryArtifactInterface,
      immutable_interfaces: {
        existing_input_bindings: observed.interface_fingerprint.input_bindings,
        existing_output_bindings: observed.interface_fingerprint.output_bindings,
        existing_call_sites: observed.interface_fingerprint.call_sites,
        existing_macro_names: observed.interface_fingerprint.macro_definitions,
        existing_program_signatures: observed.interface_fingerprint.program_interfaces,
      },
      macro_scope_rule: "Macro fingerprints are classification evidence, not automatic public interfaces. As this plugin's researcher-readability house style, use a literal for a one-use binding and otherwise define or redefine a descriptive global in the consuming do-file. Setup keeps shared directory roots, not outcome lists or regression specifications. A leaf artifact global belongs beside its consumer unless multiple files share a real producer-consumer contract. In newly generated or currently revised regression code, reserve local for obvious lexical cases such as loop iterators, program internals, temp objects, per-iteration scratch, or an immediately consumed r()/e() result. Regression treatment or event window, controls, sample, fixed effects, weights, and VCE remain literal at zero substantive reference depth; one local outcome iterator in one flat loop is the normal exception. Read-only audits do not block untouched existing code on this house-style preference.",
      mutable_existing_files: mutableExistingFiles,
      safe_call_boundaries: safeCallBoundaries,
      allowed_integration_edits: [
        "bind the selected block to an existing producer output without renaming that output",
        "add a new output owned by the requested feature",
        "insert one explicit direct call at a verified producer boundary when project approval permits",
      ],
      forbidden_integration_edits: [
        "rename or overwrite an existing input or output",
        "change an existing program syntax or caller arguments",
        "reorder existing master calls",
        "replace the project's estimate handoff merely to fit a preferred dictionary example",
        "generate a custom adapter with new control flow when no labeled compatible interface exists",
      ],
      general_rule: "If no selected variant consumes the frozen interface, preserve that interface and apply the general rules. Retain the rank-relative nearest inspected candidate only as a hint, without presuming compatibility; write the smallest readable binding or transition and do not invent a generic adapter, dispatcher, or framework.",
    },
    general_rule_evidence_chain: [
      "fine-grained labeled checkpoint",
      "all approved collected examples",
      "official Stata manual for mechanics only",
      "general-rule implementation from the declared contract with the rank-relative nearest candidate only as a nonbinding hint",
      "user question only for an unresolved substantive choice",
    ],
    template_reuse_contract: {
      schema_version: "2.0",
      granularity: "broad headword with atomic substeps",
      template_rule: "A genuinely close template is preferred and each selected template substep binds one label with substep_id.",
      general_rule: "general_rule remains valid for a project-specific formula, dictionary gap, or template mismatch. A persistent audit binds its target span; template mismatch records nearest_template_hint, template_status, and hint_used, while stating that nearest-by-ranking does not establish compatibility. Legacy native_substep, template_mismatch_fallback, and fallback_trigger values are accepted only for read compatibility. Template availability is advisory unless strict enforcement is explicitly requested.",
      required_atomic_boundaries: [
        "merge retained-state handling",
        "panel-key declaration",
        "CPI transformation",
        "dataset finalization",
        "age or entity collapse",
        "e(sample) dependent-variable mean",
        "estimation",
        "ster save",
        "ster load",
        "Excel assembly",
        "figure assembly",
      ],
      requested_substeps: requestedSubsteps,
      output_flow_rule: "For final Excel assembly, define semantic variable groups once and map them separately to physical workbook/sheet/sample placements. When formatter_required is true, bind production to output_flow_profile.recommended_label_id. When direct_implementation_allowed is true, use visible direct outreg2 with an explicit .xls target and no program. If selection_ready is false, do not write or improvise a helper.",
      event_study_axis_rule: "Axis grouping is independent of sheet grouping. Use a fixed common range only for declared close, directly comparable outcomes in the same specification and sample comparison; otherwise keep automatic axes.",
    },
    work_report_contract: {
      report_policy: reportPolicy,
      required_after_code_write: reportPolicy === "required",
      path: "report.md",
      table_header: "| mode | target | lines | checkpoint | label_id | reason |",
      modes: ["template", "general_rule"],
      legacy_modes: ["general_rule_fallback"],
      rule: reportPolicy === "disabled"
        ? "The user explicitly disabled report.md. Do not create or modify it; retain template and general-rule evidence in the session only."
        : reportPolicy === "optional"
          ? "report.md may be omitted. If it already exists or the caller elects to maintain it, keep every selected template and substantive general-rule row consistent with actual project-relative .do paths and one-based inclusive line ranges."
          : "After creating or revising Stata code, record each selected template and each substantive general-rule implementation as a separate row with the actual project-relative .do path and one-based inclusive line range. Use - as the general_rule label_id and record nearest_template_hint=<label_id|none>; template_status=<no_suitable_template|wrong_selection|project_specific_contract>; hint_used=<borrowed idea|none>. Keep provenance out of the .do source. Never emit legacy general_rule_fallback or fallback_trigger values.",
    },
    user_summary: {
      decision: intent === "review_only" ? "review_only" : planningMode,
      requested_changes: headwords.slice(0, 8),
      preserved_stage_count: preservedStages.length,
      confirmations_required: [
        ...(overhaulProposal?.status === "needs_plan_details" ? [
          ...(overhaulProposal.tree_markdown ? [] : ["오버홀 전에 새로 만들 폴더와 파일의 정확한 tree가 필요합니다." ]),
          ...(overhaulProposal.variables_pending_user_definition ? ["오버홀에서 새로 만들 영구 분석변수의 이름과 사용자용 설명이 필요합니다. 새 변수가 없다면 no_new_persistent_variables: true를 명시하세요."] : []),
        ] : []),
        ...missingState.map((row) => row.missing),
        ...(headwords.includes("final_excel_assembly") && !outputFlowProfile.selection_ready ? outputFlowProfile.failures.slice(0, 2) : []),
        ...(headwords.includes("figures.event_study") && eventStudyAxisProfile.status === "needs_revision" ? eventStudyAxisProfile.failures.slice(0, 2) : []),
      ].slice(0, 3),
    },
    scope_rule: !retrievalPlan.code_required
      ? "Read-only request: preserve every stage and do not create a code intervention."
      : planningMode === "partial"
        ? "Preserve every nonrequested stage. Change only chosen dictionary blocks and directly required interface transitions. Never convert a partial repair into an overhaul automatically."
        : "Overhaul may replace multiple dictionary blocks, but each replacement still requires an explicit headword, compatible state contract, and minimal-edit variant selection.",
    write_rule: retrievalPlan.code_required
      ? planningMode === "overhaul"
        ? "This is a read-only overhaul plan. Show overhaul_prewrite_proposal.tree_markdown and its planned_variables table to the user, record whether README.md is created or amended, and wait for explicit approval before writing. A material plan change requires a revised preview and renewed approval."
        : "This is a read-only intervention plan. Before writing, bind each intervention to exact existing files or proposed new files and apply the project's approval rule."
      : "No code write is authorized or needed by this plan.",
    claim_boundary: "Static scanning observes files and code signals, not live Stata memory or semantic truth. Caller-declared available_state overrides only when explicitly supplied and remains subject to runtime verification.",
  };
}

function stageContract(stage) {
  const contracts = {
    import: ["원자료는 읽기 전용으로 취급", "출처와 버전 또는 수집일 기록", "가져온 즉시 관측치 수와 키 후보 확인"],
    integrity_audit: ["isid 또는 duplicates report/tag로 키 검증", "결측, 범위, 코드값을 assert 또는 표로 확인", "제외 건수와 이유 기록"],
    cleaning_labels: ["새 변수 생성 직후 정의와 목적 주석", "저장 전 새 변수에 변수 라벨 부여", "원변수 라벨은 변경하지 않음"],
    merge_reshape: ["각 입력의 키 유일성 사전 검증", "merge cardinality 명시", "_merge 상태를 확인하고 assert한 뒤 정리"],
    panel_construction: ["분석 단위와 시간 단위 명시", "unit-time isid 검증", "처치시점과 event time의 범위 확인"],
    descriptives_balance_sample_flow: ["원표본부터 최종표본까지 단계별 N 기록", "핵심 변수 기초통계와 결측률", "처치군 비교 또는 balance를 동일 표본 정의로 산출"],
    estimation: ["outcome, treatment, controls, sample, FE, cluster를 코드 가까이에 명시", "각 사양의 N 보존", "검증된 공식 명령 사용"],
    robustness: ["본문 사양과 위협의 대응관계 명시", "placebo, 대안 결과, 이질성은 사전 지정", "재표집은 seed와 반복 수 기록"],
    figures: ["그림 생성 입력과 표본을 명시", "축, 단위, 기준기간을 라벨링", "수동 편집 없이 재생성 가능"],
    exports: ["표는 Excel, 그림은 PDF, 추정치는 .ster 경로로 저장", "모든 결과가 생성 코드로 연결", "TeX 출력은 생성하거나 제안하지 않음"],
    master_orchestration: ["version과 공유 directory root 설정", "상단에 정확한 프로젝트 Input 및 Output 파일 목록 주석", "각 do 호출 직전의 정확한 Input, Output 또는 Output: none, 역할 주석", "기존 프로젝트는 유효한 호출 순서를 보존하고, 새 applied-micro panel project 또는 승인된 overhaul이 preparation, summary, estimation을 모두 필요로 할 때만 analysis panel을 먼저 만든 뒤 두 consumer를 독립 실행"],
  };
  return contracts[stage];
}

function requestedNewProjectLayout(args, stages) {
  const analysisType = String(args.analysis_type || "applied_micro").toLowerCase();
  const dataShape = String(args.data_shape || "unspecified").toLowerCase();
  const outputs = (args.outputs && args.outputs.length ? args.outputs : ["tables", "figures"]).map((value) => String(value).toLowerCase());
  const wantsTable = outputs.some((value) => /table|excel|xls/.test(value));
  const wantsFigure = outputs.some((value) => /figure|pdf|graph/.test(value));
  const wantsSter = outputs.some((value) => /ster|estimate/.test(value)) || !args.outputs;
  const hasPreparation = stages.some((stage) => ["import", "integrity_audit", "cleaning_labels", "merge_reshape", "panel_construction"].includes(stage));
  const hasSummary = stages.includes("descriptives_balance_sample_flow");
  const hasRegression = stages.some((stage) => ["estimation", "robustness"].includes(stage));
  const isPanel = dataShape === "panel" || dataShape === "longitudinal";
  const isAppliedMicro = analysisType === "applied_micro" || analysisType === "applied micro";
  const useReadablePanelSpine = isAppliedMicro && isPanel && hasPreparation && hasSummary && hasRegression;
  if (useReadablePanelSpine) {
    const paths = NEW_PROJECT_TREE.filter((item) => {
      if (item === "project/figures/") return wantsFigure;
      if (item === "project/table/") return wantsTable;
      if (item === "project/ster/") return hasRegression && wantsSter;
      return true;
    });
    return {
      paths,
      markdown: paths.length === NEW_PROJECT_TREE.length ? NEW_PROJECT_TREE_MARKDOWN : renderProposedPathTree(
        paths.filter((item) => item.endsWith("/")).map((item) => item.replace(/^project\//, "").replace(/\/$/, "")),
        paths.filter((item) => !item.endsWith("/")).map((item) => item.replace(/^project\//, "")),
      ),
      sequence: ["do/build_analysis_panel.do", "do/build_summary.do", "do/run_regressions.do"],
      standard: true,
    };
  }
  const relativeFolders = ["do", "data/raw"];
  const relativeFiles = ["README.md", "masters.do", "do/main.log"];
  const sequence = [];
  if (hasPreparation) {
    relativeFolders.push("data/final");
    relativeFiles.push("do/build_analysis_data.do");
    sequence.push("do/build_analysis_data.do");
  }
  if (hasSummary) {
    if (wantsTable) relativeFolders.push("table");
    if (wantsFigure) relativeFolders.push("figures");
    relativeFiles.push("do/build_summary.do");
    sequence.push("do/build_summary.do");
  }
  if (hasRegression) {
    if (wantsTable) relativeFolders.push("table");
    if (wantsSter) relativeFolders.push("ster");
    if (wantsFigure) relativeFolders.push("figures");
    relativeFiles.push("do/run_regressions.do");
    sequence.push("do/run_regressions.do");
  }
  if (stages.includes("figures")) {
    if (wantsFigure) relativeFolders.push("figures");
    if (!relativeFiles.includes("do/run_regressions.do")) {
      relativeFiles.push("do/build_figures.do");
      sequence.push("do/build_figures.do");
    }
  }
  if (stages.includes("exports") && !hasSummary && !hasRegression) {
    relativeFiles.push("do/export_outputs.do");
    sequence.push("do/export_outputs.do");
    if (wantsTable) relativeFolders.push("table");
    if (wantsFigure) relativeFolders.push("figures");
    if (wantsSter) relativeFolders.push("ster");
  }
  const folders = unique(relativeFolders);
  const files = unique(relativeFiles);
  return {
    paths: [...files.map((item) => `project/${item}`), ...folders.map((item) => `project/${item}/`)],
    markdown: renderProposedPathTree(folders, files),
    sequence,
    standard: false,
  };
}

function workflowBlueprint(args) {
  const workflows = workflowExamples();
  const requested = args.expected_stages && args.expected_stages.length ? args.expected_stages : STAGES;
  if (requested.some((stage) => !STAGES.includes(stage))) throw new Error("expected_stages에 알 수 없는 단계가 있습니다.");
  const projectMode = args.project_mode || "existing";
  if (!["new", "existing"].includes(projectMode)) throw new Error("project_mode는 new 또는 existing이어야 합니다.");
  if (projectMode === "new" && args.new_project_confirmed !== true) throw new Error("new 표준 트리는 읽기 전용 조사 후 new_project_confirmed: true로 최초 구축임을 명시해야 합니다.");
  const plannedVariables = normalizePlannedVariables(args.planned_variables || []);
  const noNewPersistentVariables = args.no_new_persistent_variables === true;
  if (plannedVariables.length && noNewPersistentVariables) throw new Error("planned_variables와 no_new_persistent_variables: true를 함께 지정할 수 없습니다.");
  const stages = STAGES.filter((stage) => requested.includes(stage));
  const newLayout = projectMode === "new" ? requestedNewProjectLayout(args, stages) : null;
  const requestedOutputs = (args.outputs && args.outputs.length ? args.outputs : ["tables", "figures"]).map(String);
  const structures = workflows.packages
    .filter((pkg) => ["gold_candidate", "partial_gold", "conditional_priority"].includes(pkg.corpus_role))
    .map((pkg) => ({
      package_id: pkg.package_id,
      title: pkg.title,
      corpus_role: pkg.corpus_role,
      entrypoint: pkg.entrypoint,
      directories: pkg.directories.filter((value) => /^(?:code|data|output|raw|generated|final|dofiles|replicate)/i.test(value)).slice(0, 20),
      master_files: pkg.files.filter((file) => file.stages.includes("master_orchestration")).map((file) => file.path),
    }));
  return {
    profile: { analysis_type: args.analysis_type || "applied_micro", data_shape: args.data_shape || "unspecified", project_size: args.project_size || "medium", outputs: requestedOutputs, project_mode: projectMode },
    recommended_tree: projectMode === "new" ? newLayout.paths : [],
    proposed_file_tree: projectMode === "new" ? { paths: newLayout.paths, tree_markdown: newLayout.markdown } : { paths: [], tree_markdown: null },
    planned_variables: plannedVariables,
    variables_pending_user_definition: projectMode === "new" && !plannedVariables.length && !noNewPersistentVariables,
    no_new_persistent_variables: noNewPersistentVariables,
    readme_contract: {
      path: "README.md",
      outline: README_OUTLINE,
      variable_dictionary_columns: VARIABLE_DICTIONARY_COLUMNS,
      scope: "Document every newly created persistent variable saved to an analysis dataset or used in a reported analysis. Exclude temporary loop, scratch, and Stata returned-state names.",
    },
    master_sequence: projectMode === "new" ? newLayout.sequence : ["preserve the detected existing entrypoint and call order"],
    structure_policy: {
      standard_tree_applies: projectMode === "new" && newLayout.standard,
      new_project: "Use the unnumbered masters.do plus build_analysis_panel, build_summary, and run_regressions spine only when a new applied-micro panel workflow actually requests preparation, summary, and estimation. Otherwise construct only the requested stages and outputs. A coherent do-file near 1000 lines may remain intact; split only for a durable artifact boundary, independent rerun, genuine reuse, ownership boundary, or distinct responsibility.",
      existing_project: "Inventory first and preserve compatible folder names, file names, entrypoint, and orchestration. Do not rename, move, or add standard folders merely to match the template.",
    },
    write_approval_contract: {
      required_before_any_project_write: true,
      read_only_inventory_allowed_before_approval: true,
      proposal_must_list: ["folder and file tree to create", "files to modify", "files to move or rename", "files to delete", "existing outputs to overwrite", "entrypoint and execution command", "new persistent variable names and reader-facing descriptions", "whether root README.md is created or amended"],
      material_plan_change_requires_new_approval: true,
    },
    stage_contracts: stages.map((stage) => ({ stage, requirements: stageContract(stage) })),
    sample_flow_contract: ["원자료 N", "키 또는 범위 오류 제외 N", "merge 성공 N", "변수 결측 제외 N", "분석 표본 N", "각 표와 그림의 실제 N"],
    research_output_contract: {
      entrypoint: projectMode === "new" ? ["root masters.do", "dynamic project root", ...(newLayout.standard ? ["build analysis-ready cleaned panel, then independently reopen it for summaries and regressions"] : ["run only the caller-requested stages in their declared dependency order"]), "substantive errors stop the run"] : ["preserve the detected existing entrypoint", "dynamic project root", "preserve a valid existing call order", "substantive errors stop the run"],
      readme_sections: ["approved actual file tree", "new persistent-variable names and reader-facing descriptions, or an explicit none statement", "how to run the research entrypoint"],
      execution_evidence: ["actual main log when execution is requested", "no r(#) errors", "optional agreed completion marker"],
      deliverable_evidence: [
        "user-specified names and counts",
        "direct SHA-256 evidence for generated artifacts",
        ...(stages.includes("descriptives_balance_sample_flow") && requestedOutputs.some((value) => /table|excel|xls/i.test(value)) ? ["summary Excel"] : []),
        ...(stages.includes("descriptives_balance_sample_flow") && requestedOutputs.some((value) => /figure|pdf|graph/i.test(value)) ? ["optional descriptive PDFs"] : []),
        ...(stages.some((stage) => ["estimation", "robustness"].includes(stage)) && requestedOutputs.some((value) => /table|excel|xls/i.test(value)) ? ["regression Excel"] : []),
        ...(stages.some((stage) => ["estimation", "robustness"].includes(stage)) && (requestedOutputs.some((value) => /ster|estimate/i.test(value)) || !args.outputs) ? ["reusable .ster"] : []),
        ...(stages.includes("figures") && requestedOutputs.some((value) => /figure|pdf|graph/i.test(value)) ? ["optional event-study PDFs when an event-study figure is contracted"] : []),
        "all outputs regenerated without manual coefficient transfer",
      ],
      verdicts: ["verified only after the requested static, log, README, and output checks pass", "needs_revision with explicit blockers otherwise"],
    },
    observed_structure_references: structures,
    next_actions: ["현재 폴더와 파일 구조를 읽기 전용으로 조사", "생성할 폴더, 생성 및 수정할 파일, 이동, 이름변경, 삭제, 덮어쓰기 대상을 정확히 제시", "사용자의 명시적 승인을 기다림", "승인 후 각 단계에 대해 resolve_transition_evidence 호출", "모든 템플릿 선택·변형과 직접 구현에 general rules 적용", "승인된 범위에서 연구 workflow 생성 또는 수정", "작성한 각 do-file을 lint_do_file로 검사", "report_policy가 required일 때만 root report.md에 template과 substantive general_rule의 실제 line range를 기록", "선택한 report_policy와 scope 계약으로 프로젝트 전체를 audit_stata_project에서 검사", "요청 시 entrypoint clean run", "research_output_check에 계약된 산출물 이름과 정확한 개수를 전달해 직접 hash 증거와 함께 검증"],
    claim_boundary: "이 계획은 연구자가 읽고 실행할 Stata workflow를 정리한다. 배포, dependency 관리, 제출 패키지 또는 저널 인증을 판정하지 않는다.",
  };
}

function normalizeRelativePath(value, label) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || path.posix.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new Error(`${label}은 프로젝트 내부의 상대 경로여야 합니다.`);
  }
  return normalized;
}

function resolveInside(root, value, label) {
  const relative = normalizeRelativePath(value, label);
  const target = path.resolve(root, ...relative.split("/"));
  const prefix = `${root}${path.sep}`.toLowerCase();
  if (target.toLowerCase() !== root.toLowerCase() && !target.toLowerCase().startsWith(prefix)) throw new Error(`${label}이 프로젝트 밖을 가리킵니다.`);
  return { relative, target };
}

const WORK_REPORT_MODES = new Set(["template", "general_rule"]);
const LEGACY_WORK_REPORT_MODES = new Set(["general_rule_fallback"]);
const ACCEPTED_WORK_REPORT_MODES = new Set([...WORK_REPORT_MODES, ...LEGACY_WORK_REPORT_MODES]);

function validateWorkReport(root, options = {}) {
  const required = options.required === true;
  const authoredSpans = Array.isArray(options.authored_spans) ? options.authored_spans : [];
  const reportPath = path.join(root, "report.md");
  const formatContract = {
    path: "report.md",
    columns: ["mode", "target", "lines", "checkpoint", "label_id", "reason"],
    modes: [...WORK_REPORT_MODES],
    legacy_modes: [...LEGACY_WORK_REPORT_MODES],
    line_rule: "Use one row per contiguous one-based inclusive target range, written as start-end.",
    general_rule_reason_rule: "For general_rule, reason must contain nearest_template_hint=<label_id|none>; template_status=<no_suitable_template|wrong_selection|project_specific_contract>; hint_used=<borrowed idea|none>.",
    compatibility_rule: "Legacy general_rule_fallback rows and fallback_trigger fields are accepted for read compatibility and normalized to general_rule and template_status.",
  };
  if (!fs.existsSync(reportPath)) {
    return {
      required,
      status: required ? "missing" : "not_present",
      path: "report.md",
      entries: [],
      errors: required ? ["report.md is required after a workflow creates or revises Stata code"] : [],
      coverage: { status: "not_checked", authored_spans: authoredSpans, reportable: [], covered: [], uncovered: [] },
      format_contract: formatContract,
    };
  }

  const content = fs.readFileSync(reportPath, "utf8");
  const errors = [];
  const entries = [];
  const expectedHeader = ["mode", "target", "lines", "checkpoint", "label_id", "reason"];
  const lines = content.split(/\r?\n/);
  const headerPresent = lines.some((line) => {
    if (!/^\s*\|/.test(line)) return false;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, "").toLowerCase());
    return cells.length === expectedHeader.length && cells.every((cell, index) => cell === expectedHeader[index]);
  });
  if (!headerPresent) errors.push("report.md must contain the exact table header: | mode | target | lines | checkpoint | label_id | reason |");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, ""));
    if (cells.length !== expectedHeader.length || !ACCEPTED_WORK_REPORT_MODES.has(cells[0])) continue;
    const [rawMode, targetValue, rangeValue, checkpoint, labelId, reason] = cells;
    const mode = rawMode === "general_rule_fallback" ? "general_rule" : rawMode;
    const entry = { mode, target: targetValue, lines: rangeValue, checkpoint, label_id: labelId, reason, report_line: index + 1 };
    if (rawMode !== mode) entry.legacy_mode = rawMode;
    const rangeMatch = rangeValue.match(/^(\d+)-(\d+)$/);
    if (!rangeMatch) {
      errors.push(`report.md line ${index + 1}: lines must be one contiguous start-end range`);
      entries.push(entry);
      continue;
    }
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    entry.target_span = [start, end];
    if (start < 1 || end < start) errors.push(`report.md line ${index + 1}: invalid target range ${rangeValue}`);

    let resolved = null;
    try {
      resolved = resolveInside(root, targetValue, `report.md line ${index + 1} target`);
    } catch (error) {
      errors.push(error.message);
    }
    if (resolved) {
      entry.target = resolved.relative;
      if (!/\.do$/i.test(resolved.relative)) errors.push(`report.md line ${index + 1}: target must be a .do file`);
      else if (!fs.existsSync(resolved.target) || !fs.statSync(resolved.target).isFile()) errors.push(`report.md line ${index + 1}: target ${resolved.relative} does not exist`);
      else {
        const targetLines = fs.readFileSync(resolved.target, "utf8").split(/\r?\n/);
        const targetLineCount = targetLines.length;
        entry.target_line_count = targetLineCount;
        if (end > targetLineCount) errors.push(`report.md line ${index + 1}: range ${rangeValue} exceeds ${resolved.relative} line count ${targetLineCount}`);
        else if (start >= 1 && end >= start) {
          const spanStatements = activeLogicalLines(targetLines.slice(start - 1, end).join("\n"));
          if (!spanStatements.length || spanStatements.every(isSafeBindingStatement)) {
            errors.push(`report.md line ${index + 1}: harmless primitive-only ranges must not be recorded`);
          }
        }
      }
    }

    if (!reason || reason === "-") errors.push(`report.md line ${index + 1}: reason is required`);
    if (mode === "template") {
      const label = LABELED_CHECKPOINTS.find((row) => row.label_id === labelId);
      if (!label) errors.push(`report.md line ${index + 1}: unknown template label_id ${labelId || "<missing>"}`);
      else if (checkpoint !== label.checkpoint) errors.push(`report.md line ${index + 1}: checkpoint ${checkpoint} does not match ${labelId}`);
    } else {
      if (labelId !== "-") errors.push(`report.md line ${index + 1}: ${mode} must use - for label_id`);
      if (checkpoint !== "unmapped" && !CHECKPOINTS.includes(checkpoint)) {
        errors.push(`report.md line ${index + 1}: unknown general-rule checkpoint ${checkpoint || "<missing>"}`);
      }
      const generalRuleEvidence = {};
      for (const segment of String(reason || "").split(";")) {
        const field = segment.trim().match(/^([a-z_]+)\s*=\s*(.+)$/i);
        if (field) generalRuleEvidence[field[1].toLowerCase()] = field[2].trim();
      }
      if (!generalRuleEvidence.template_status && generalRuleEvidence.fallback_trigger) {
        generalRuleEvidence.template_status = generalRuleEvidence.fallback_trigger;
        entry.legacy_reason_field = "fallback_trigger";
      }
      entry.general_rule_evidence = generalRuleEvidence;
      if (entry.legacy_mode || entry.legacy_reason_field) entry.fallback_evidence = generalRuleEvidence;
      for (const field of ["nearest_template_hint", "template_status", "hint_used"]) {
        if (!generalRuleEvidence[field]) errors.push(`report.md line ${index + 1}: general-rule reason is missing ${field}=...`);
      }
      if (generalRuleEvidence.template_status && !["no_suitable_template", "wrong_selection", "project_specific_contract"].includes(generalRuleEvidence.template_status)) {
        errors.push(`report.md line ${index + 1}: template_status must be no_suitable_template, wrong_selection, or project_specific_contract`);
      }
      const nearestHint = generalRuleEvidence.nearest_template_hint;
      if (nearestHint && nearestHint !== "none") {
        const hintedLabel = LABELED_CHECKPOINTS.find((row) => row.label_id === nearestHint);
        if (!hintedLabel) errors.push(`report.md line ${index + 1}: unknown nearest_template_hint ${nearestHint}`);
        else if (checkpoint === "unmapped" || hintedLabel.checkpoint !== checkpoint) {
          errors.push(`report.md line ${index + 1}: nearest_template_hint ${nearestHint} does not match general-rule checkpoint ${checkpoint}`);
        }
      }
    }
    entries.push(entry);
  }

  if (!entries.length && !/^(?:No template or substantive general-rule spans\.|No template or general-rule fallback spans\.)$/im.test(content)) {
    errors.push("report.md has no implementation rows and no explicit no-template-or-substantive-general-rule declaration");
  }
  const byTarget = new Map();
  for (const entry of entries.filter((row) => Array.isArray(row.target_span))) {
    if (!byTarget.has(entry.target)) byTarget.set(entry.target, []);
    byTarget.get(entry.target).push(entry);
  }
  for (const [target, targetEntries] of byTarget.entries()) {
    const ordered = targetEntries.slice().sort((a, b) => a.target_span[0] - b.target_span[0] || a.target_span[1] - b.target_span[1]);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index].target_span[0] <= ordered[index - 1].target_span[1]) {
        errors.push(`report.md has overlapping implementation ranges in ${target}: ${ordered[index - 1].lines} and ${ordered[index].lines}`);
      }
    }
  }
  const reportable = [];
  const covered = [];
  const uncovered = [];
  const reportablePattern = /^(?:merge|append|reshape|collapse|keep\b.*\bif\b|drop\b.*\bif\b|gen(?:erate)?|replace|recode|egen|xtset|tsset|reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|csdid|did_imputation|eventstudyinteract|estimates?\s+(?:save|use|store|restore)|outreg2|putexcel|collect\s+export|export\s+excel|graph\s+(?:export|save|bar)|twoway|coefplot|marginsplot|save\b.*\.dta)/i;
  for (const declared of authoredSpans) {
    let resolved;
    const rangeMatch = String(declared?.lines || "").match(/^(\d+)-(\d+)$/);
    try {
      resolved = resolveInside(root, declared?.target, "authored_spans target");
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (!rangeMatch || !/\.do$/i.test(resolved.relative) || !fs.existsSync(resolved.target)) {
      errors.push(`authored_spans ${declared?.target || "<missing>"}: target and one-based start-end lines are required`);
      continue;
    }
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const targetLines = fs.readFileSync(resolved.target, "utf8").split(/\r?\n/);
    if (start < 1 || end < start || end > targetLines.length) {
      errors.push(`authored_spans ${resolved.relative}: invalid range ${declared.lines}`);
      continue;
    }
    for (const entry of activeLogicalEntries(targetLines.slice(start - 1, end).join("\n"))) {
      const line = start + entry.line - 1;
      const command = normalizeCommand(entry.text.trim());
      if (!reportablePattern.test(command) || isSafeBindingStatement(command)) continue;
      const candidate = { target: resolved.relative, line, command };
      reportable.push(candidate);
      const row = entries.find((item) => item.target === resolved.relative
        && Array.isArray(item.target_span)
        && item.target_span[0] <= line
        && item.target_span[1] >= line);
      if (row) covered.push({ ...candidate, report_line: row.report_line });
      else uncovered.push(candidate);
    }
  }
  for (const item of uncovered) errors.push(`report.md does not cover authored substantive transition ${item.target}:${item.line}`);
  const coverage = {
    status: !authoredSpans.length ? "not_declared" : uncovered.length ? "incomplete" : "complete",
    authored_spans: authoredSpans,
    reportable,
    covered,
    uncovered,
    boundary: "Only caller-declared authored spans and statically certain substantive transitions are checked; untouched legacy code and harmless primitives are not assigned provenance.",
  };
  return {
    required,
    status: errors.length ? "invalid" : "valid",
    path: "report.md",
    sha256: sha256File(reportPath),
    entries,
    errors,
    coverage,
    format_contract: formatContract,
  };
}

function listProjectFiles(root, options = {}) {
  const results = [];
  const seenFiles = new Set();
  const seenDirectories = new Set();
  const ignored = new Set([".git", "node_modules"]);
  const includePaths = options.includePaths || [];
  const excludePaths = options.excludePaths || [];
  const excluded = (relative) => excludePaths.some((value) => relative === value || relative.startsWith(`${value}/`));
  const addFile = (full) => {
    const relative = path.relative(root, full).replaceAll("\\", "/");
    if (excluded(relative) || seenFiles.has(relative)) return;
    seenFiles.add(relative);
    results.push(relative);
    if (results.length > 50000) throw new Error("프로젝트 파일이 50,000개를 넘어 제출준비 검사 범위를 초과했습니다. scope.include_paths 또는 scope.exclude_paths로 범위를 줄이세요.");
  };
  function walk(dir) {
    const resolved = path.resolve(dir);
    if (seenDirectories.has(resolved)) return;
    seenDirectories.add(resolved);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name.toLowerCase())) continue;
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).replaceAll("\\", "/");
      if (excluded(relative)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) addFile(full);
    }
  }
  const starts = includePaths.length
    ? includePaths.map((value) => resolveInside(root, value, "scope.include_paths").target)
    : [root];
  for (const start of starts) {
    if (!fs.existsSync(start)) throw new Error(`scope.include_paths 대상을 찾을 수 없습니다: ${path.relative(root, start).replaceAll("\\", "/")}`);
    const relative = path.relative(root, start).replaceAll("\\", "/");
    if (excluded(relative)) throw new Error(`scope.include_paths 대상이 exclude_paths에 포함됩니다: ${relative}`);
    if (fs.statSync(start).isDirectory()) walk(start);
    else if (fs.statSync(start).isFile()) addFile(start);
  }
  return results.sort();
}

function globRegex(pattern) {
  const value = normalizeRelativePath(pattern, "deliverable pattern");
  let expression = "^";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "*") {
      if (value[index + 1] === "*") {
        expression += ".*";
        index += 1;
      } else expression += "[^/]*";
    } else if (character === "?") expression += "[^/]";
    else expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`, "i");
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
}

function researchOutputCheck(args) {
  if (!args.path) throw new Error("프로젝트 path가 필요합니다.");
  const root = path.resolve(String(args.path));
  if (!fs.statSync(root).isDirectory()) throw new Error("path는 디렉터리여야 합니다.");
  const expectedStages = args.expected_stages?.length ? unique(args.expected_stages) : STAGES;
  const strictStructure = args.strict_structure === true;
  const reportPolicy = resolveReportPolicy(args, "required");
  const audit = auditProject({ path: root, expected_stages: expectedStages, strict_structure: strictStructure, report_policy: reportPolicy, authored_spans: args.authored_spans, scope: args.scope, estimability_readback: args.estimability_readback });
  const checks = [];
  const blockers = [];
  const evidence = [];
  const addCheck = (name, pass, detail, blocker = detail) => {
    checks.push({ name, status: pass ? "pass" : "fail", detail });
    if (!pass) blockers.push({ check: name, message: blocker });
  };

  const staticBlocked = audit.static_status === "blocked" || audit.status === "blocked";
  checks.push({
    name: "static_project_audit",
    status: staticBlocked ? "fail" : audit.static_status === "needs_review" ? "review" : "pass",
    detail: `audit_stata_project static_status: ${audit.static_status || audit.status}`,
  });
  if (staticBlocked) blockers.push({ check: "static_project_audit", message: "정적 lint와 workflow의 blocking 오류를 먼저 해결하세요." });
  addCheck("entrypoint", Boolean(audit.summary.top_master), audit.summary.top_master || "entrypoint 없음", "연구 workflow의 실행 entrypoint가 필요합니다.");
  addCheck(
    "work_report",
    reportPolicy === "disabled" || audit.work_report?.status === "valid" || (reportPolicy === "optional" && audit.work_report?.status === "not_present"),
    reportPolicy === "disabled"
      ? "report disabled by explicit contract"
      : audit.work_report?.status === "valid"
        ? `${audit.work_report.path}: ${audit.work_report.entries.length} implementation rows`
        : reportPolicy === "optional" && audit.work_report?.status === "not_present"
          ? "optional report not present"
          : (audit.work_report?.errors || ["report.md validation failed"]).join("; "),
    "report_policy가 required이면 작성·수정한 workflow의 root report.md에 template과 substantive general_rule 구간을 기록하세요. 사용자가 명시적으로 금지했다면 disabled를 사용하세요.",
  );

  const plannedVariables = normalizePlannedVariables(args.planned_variables || []);
  const labelSourceFiles = listDoFiles(root).files;
  const expectedTreePaths = unique((args.expected_tree_paths || []).map((value) => normalizeRelativePath(value, "expected_tree_paths")));
  const readmeRequired = strictStructure || plannedVariables.length > 0 || expectedTreePaths.length > 0;
  const readmeCandidates = ["README.md", "README.txt"]
    .map((relative) => ({ relative, target: path.join(root, relative) }))
    .filter((row) => fs.existsSync(row.target));
  if (readmeRequired) addCheck("researcher_readme", readmeCandidates.length > 0, readmeCandidates.length ? readmeCandidates[0].relative : "README 없음", "승인된 folder tree와 persistent-variable 설명을 남길 root README가 필요합니다.");
  if (readmeCandidates.length) {
    const readme = fs.readFileSync(readmeCandidates[0].target, "utf8");
    for (const relative of expectedTreePaths) {
      const present = readme.replaceAll("\\", "/").includes(relative);
      addCheck(`readme_tree:${relative}`, present, relative, `README에 승인된 경로 ${relative}이 없습니다.`);
    }
    for (const variable of plannedVariables) {
      const hasName = new RegExp(`\\b${variable.name}\\b`).test(readme);
      const hasDescription = readme.includes(variable.reader_description);
      addCheck(`readme_variable:${variable.name}`, hasName && hasDescription, `${variable.name}: ${hasName && hasDescription ? "documented" : "missing name or reader description"}`, `${variable.name}과 승인된 reader_description을 README에 함께 기록하세요.`);
      const hasSourceOrFormula = readme.includes(variable.source_or_formula);
      const hasUnitObservationLevel = readme.includes(variable.unit_observation_level);
      addCheck(
        `readme_variable_lineage:${variable.name}`,
        hasSourceOrFormula && hasUnitObservationLevel,
        `${variable.name}: ${hasSourceOrFormula && hasUnitObservationLevel ? "source/formula and unit documented" : "missing source/formula or unit/observation level"}`,
        `${variable.name}의 raw source unit과 정확한 생성식·threshold, output unit과 관측단위를 README에 기록하세요.`,
      );
      if (variable.creation_file) {
        const normalizedCreationFile = variable.creation_file.replaceAll("\\", "/");
        addCheck(
          `readme_variable_creation_file:${variable.name}`,
          readme.replaceAll("\\", "/").includes(normalizedCreationFile),
          normalizedCreationFile,
          `${variable.name}의 생성 파일 ${normalizedCreationFile}을 README에 기록하세요.`,
        );
      }
    }
  }

  for (const variable of plannedVariables) {
    const candidates = variable.creation_file
      ? [resolveInside(root, variable.creation_file, `planned_variables ${variable.name} creation_file`).target]
      : labelSourceFiles;
    const escapedName = variable.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labelPattern = new RegExp(`^\\s*label\\s+var(?:iable)?\\s+${escapedName}(?:\\s|$)`, "im");
    const labeledIn = candidates.filter((file) => fs.existsSync(file) && fs.statSync(file).isFile() && labelPattern.test(fs.readFileSync(file, "utf8")));
    addCheck(
      `creation_label:${variable.name}`,
      labeledIn.length > 0,
      labeledIn.length ? labeledIn.map((file) => path.relative(root, file).replaceAll("\\", "/")).join(", ") : "label variable evidence missing",
      `${variable.name}을 만드는 do-file에서 저장 전에 label variable을 붙이세요.`,
    );
  }

  const projectFiles = listProjectFiles(root);
  const deliverables = Array.isArray(args.deliverables) ? args.deliverables : [];
  addCheck("deliverable_contract", deliverables.length > 0, `${deliverables.length} deliverable patterns`, "검증할 산출물 pattern과 expected_count가 필요합니다.");
  for (const item of deliverables) {
    const pattern = normalizeRelativePath(item.pattern, "deliverable pattern");
    if (!Number.isInteger(item.expected_count) || item.expected_count < 0) throw new Error("deliverable expected_count는 0 이상의 정수여야 합니다.");
    const matches = projectFiles.filter((file) => globRegex(pattern).test(file));
    addCheck(`deliverable_count:${pattern}`, matches.length === item.expected_count, `expected ${item.expected_count}, observed ${matches.length}`, `${pattern}: 기대 ${item.expected_count}개, 실제 ${matches.length}개입니다.`);
    const files = [];
    for (const relative of matches) {
      const target = resolveInside(root, relative, "deliverable").target;
      let validJson = null;
      let jsonError = null;
      if (/\.json$/i.test(relative)) {
        try { JSON.parse(fs.readFileSync(target, "utf8")); validJson = true; }
        catch (error) { validJson = false; jsonError = error.message; }
        addCheck(`deliverable_json_valid:${relative}`, validJson, validJson ? relative : `${relative}: ${jsonError}`, `${relative}은 유효한 JSON이어야 합니다.`);
      }
      files.push({ relative_path: relative, bytes: fs.statSync(target).size, sha256: sha256File(target), json_valid: validJson });
    }
    evidence.push({ type: "deliverable", pattern, expected_count: item.expected_count, observed_count: matches.length, files });
  }

  if (args.main_log) {
    const logRelative = normalizeRelativePath(args.main_log, "main_log");
    const logTarget = resolveInside(root, logRelative, "main_log").target;
    const exists = fs.existsSync(logTarget) && fs.statSync(logTarget).isFile();
    addCheck("main_log", exists, logRelative, `${logRelative} 실행 log가 필요합니다.`);
    if (exists) {
      const log = fs.readFileSync(logTarget, "utf8");
      const stataErrors = unique(Array.from(log.matchAll(/^\s*(r\(\d+\));?\s*$/gm), (match) => match[1]));
      addCheck("main_log_no_stata_error", stataErrors.length === 0, stataErrors.length ? stataErrors.join(", ") : "no r(#) error", "실행 log의 Stata 오류를 해결하세요.");
      if (args.completion_marker) addCheck("completion_marker", log.includes(String(args.completion_marker)), String(args.completion_marker), "합의한 completion marker가 log에 없습니다.");
      evidence.push({ type: "log", relative_path: logRelative, bytes: fs.statSync(logTarget).size, sha256: sha256File(logTarget), stata_errors: stataErrors });
    }
  }

  return {
    root,
    status: blockers.length ? "needs_revision" : "verified",
    verification_level: "research_workflow_output_check",
    runtime_status: blockers.some((row) => row.check === "main_log" || row.check === "main_log_no_stata_error" || row.check === "completion_marker" || row.check === "deliverable_contract" || row.check.startsWith("deliverable_"))
      ? "failed"
      : args.main_log ? "verified" : "not_checked",
    static_status: audit.static_status,
    substantive_validity: audit.substantive_validity,
    checks,
    blockers,
    evidence,
    static_audit: audit,
    claim_boundary: "Runtime outputs, static audit, and substantive validity are reported separately. Local artifact and log verification is not deployment, dependency, submission, journal certification, or proof of substantive validity.",
  };
}
function listDoFiles(root, options = {}) {
  const files = [];
  const excludedDirectories = [];
  const ignored = new Set([".git", "node_modules", "vendor", "ado", "_packages", "raw"]);
  const excludedPaths = (options.excludePaths || []).map((value) => String(value).replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, ""));
  const isExcluded = (full) => {
    const relative = path.relative(root, full).replaceAll("\\", "/");
    return excludedPaths.some((value) => relative === value || relative.startsWith(`${value}/`));
  };
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && (ignored.has(entry.name.toLowerCase()) || isExcluded(full))) {
        excludedDirectories.push(path.relative(root, path.join(dir, entry.name)).replaceAll("\\", "/"));
        continue;
      }
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".do" && !isExcluded(full)) files.push(full);
      if (files.length > 10000) throw new Error("do-file discovery가 10000개를 넘어 audit 범위를 초과했습니다. scope entrypoint 또는 별도 project root로 범위를 줄이세요.");
    }
  }
  walk(root);
  return { files: files.sort(), excludedDirectories: excludedDirectories.sort() };
}

function detectExternalOrchestrators(root, records) {
  const candidatePaths = ["Makefile", "makefile", "GNUmakefile"]
    .map((name) => path.join(root, name))
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  const candidates = candidatePaths.filter((file, index, values) =>
    values.findIndex((other) => other.toLowerCase() === file.toLowerCase()) === index);
  const byExact = new Map(records.map((record) => [record.path.toLowerCase(), record]));
  const byBase = new Map();
  const bySuffix = new Map();
  for (const record of records) {
    const base = path.posix.basename(record.path).toLowerCase();
    byBase.set(base, [...(byBase.get(base) || []), record]);
    const segments = record.path.toLowerCase().split("/");
    for (let index = 0; index < segments.length; index += 1) {
      const suffix = segments.slice(index).join("/");
      bySuffix.set(suffix, [...(bySuffix.get(suffix) || []), record]);
    }
  }
  const orchestrators = [];
  for (const file of candidates) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const calls = [];
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const active = lines[index].replace(/#.*$/, "");
      const matches = active.matchAll(/(?:"([^"]+\.do)"|'([^']+\.do)'|([A-Za-z0-9_./\\-]+\.do))\b/gi);
      for (const match of matches) {
        const target = match[1] || match[2] || match[3];
        let normalized = target.replaceAll("\\", "/").replace(/^\.\//, "");
        const exact = byExact.get(normalized.toLowerCase());
        const suffix = bySuffix.get(normalized.toLowerCase()) || [];
        const baseMatches = byBase.get(path.posix.basename(normalized).toLowerCase()) || [];
        const resolvedMatches = exact ? [exact] : suffix.length ? suffix : baseMatches;
        const resolved = resolvedMatches.length === 1 ? resolvedMatches[0].path : null;
        calls.push({
          from: relative,
          line: index + 1,
          target,
          resolved,
          status: resolved ? "resolved" : resolvedMatches.length > 1 ? "ambiguous" : "unresolved",
          candidates: resolvedMatches.map((row) => row.path),
        });
      }
    }
    const resolvedDoFiles = unique(calls.filter((call) => call.resolved).map((call) => call.resolved));
    if (resolvedDoFiles.length >= 2) orchestrators.push({ path: relative, kind: "make", resolved_do_files: resolvedDoFiles, calls });
  }
  return orchestrators;
}

function detectStagesFromContent(file, content) {
  const active = stripComments(content).map((row) => normalizeCommand(row.trimmed)).join("\n");
  const stages = [];
  const estimationCommands = active.split("\n").filter((line) => /^\s*(?:reg|regress|areg|xtreg|reghdfe|ivreg|rdrobust|csdid|did_imputation)\b/i.test(line));
  if (/^\s*(?:sysuse|use|import|input|infile|infix|odbc)\b/im.test(active)) stages.push("import");
  if (/^\s*(?:isid|duplicates|assert|codebook|misstable)\b/im.test(active)) stages.push("integrity_audit");
  if (/^\s*(?:gen|generate|replace|recode|egen|label)\b/im.test(active)) stages.push("cleaning_labels");
  if (/^\s*(?:merge|append|reshape)\b/im.test(active)) stages.push("merge_reshape");
  if (/^\s*(?:xtset|tsset|jwdid|csdid|did_imputation|eventstudyinteract)\b/im.test(active)) stages.push("panel_construction");
  if (/^\s*(?:sum|summarize|tab|tabulate|tabstat|ttest|collapse)\b/im.test(active)) stages.push("descriptives_balance_sample_flow");
  if (estimationCommands.length) stages.push("estimation");
  if (/^\s*(?:bootstrap|boottest|ritest)\b/im.test(active) || /\b(?:robustness|robust|placebo|heterogeneity|heterogeneous|sensitivity)(?:\b|_)/i.test(active)) stages.push("robustness");
  if (/^\s*(?:graph|twoway|coefplot|marginsplot)\b/im.test(active)) stages.push("figures");
  if (/^\s*(?:esttab|estout|outreg2|putexcel|export|collect\s+export|estimates\s+save|graph\s+export)\b/im.test(active)) stages.push("exports");
  if (/master|runall|run_all|run-all/.test(path.basename(file).toLowerCase())) stages.push("master_orchestration");
  return unique(stages);
}

function scopedGlobalFindings(records) {
  const definitions = [];
  const specificationName = /(?:^|_)(?:outcomes?|dependent|depvars?|controls?|covariates?|sample|event|selector|keep|order|positions?|reference|notes?|cluster|fixed_effects?|rhs|absorb|vce)(?:_|$)/i;
  const leafFileBinding = /\.(?:dta|ster|xlsx?|csv|pdf|gph|png|svg|json|log|smcl|txt)(?:["']?\s*)$/i;
  for (const record of records) {
    for (const row of stripComments(record.content)) {
      const match = row.trimmed.match(/^global\s+([A-Za-z_][A-Za-z0-9_]*)\b(?:\s+(.+))?$/i);
      if (!match) continue;
      const kind = specificationName.test(match[1])
        ? "specification"
        : leafFileBinding.test(match[2] || "")
          ? "file_binding"
          : null;
      if (kind) definitions.push({ file: record.path, line: row.line, name: match[1], kind });
    }
  }
  const activeByFile = new Map(records.map((record) => [
    record.path,
    stripComments(record.content).map((row) => row.trimmed).join("\n"),
  ]));
  return definitions.flatMap((definition) => {
    const escaped = definition.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reference = new RegExp(`\\$(?:\\{${escaped}\\}|${escaped}\\b)`);
    const foreachGlobal = new RegExp(`^\\s*foreach\\s+[A-Za-z_][A-Za-z0-9_]*\\s+of\\s+global\\s+${escaped}\\b`, "im");
    const consumers = [...activeByFile.entries()].filter(([, content]) => reference.test(content) || foreachGlobal.test(content)).map(([file]) => file);
    if (!consumers.length) {
      return [{
        severity: "warning",
        rule: "unused_global",
        file: definition.file,
        line: definition.line,
        message: `${definition.name} global의 소비 지점이 프로젝트에서 확인되지 않습니다.`,
        suggestion: "사용하지 않는 global은 제거하고 향후 확장용 interface를 남기지 마세요.",
      }];
    }
    if (consumers.includes(definition.file)) return [];
    if (consumers.length > 1 && definition.kind === "file_binding") return [];
    const isFileBinding = definition.kind === "file_binding";
    const message = isFileBinding
      ? `${definition.name} leaf 파일 global이 정의 파일과 다른 ${consumers.join(", ")}에서 소비됩니다.`
      : `${definition.name} substantive global이 정의 파일과 다른 ${consumers.join(", ")}에서 소비됩니다.`;
    return [{
      severity: "warning",
      rule: isFileBinding ? "remote_leaf_file_binding_global" : "remote_specification_global",
      file: definition.file,
      line: definition.line,
      message,
      suggestion: isFileBinding
        ? "실제 producer-consumer artifact contract가 아니라면 소비 do-file에서 literal 또는 descriptive global로 다시 정의하고 setup에는 공유 directory root만 남기세요."
        : "outcome list와 반복되는 설명적 binding은 이를 소비하는 do-file에서 정의하거나 다시 정의하세요. 회귀의 substantive specification은 estimator block에 literal로 보이게 두세요.",
    }];
  });
}

function conceptualFactorTerm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/(^|#)(-?\d+)(?:bn|b|o)\./g, "$1$2.")
    .replace(/\s+/g, "");
}

function omittedFactorTerm(value) {
  return /(?:^|#)-?\d+o\./i.test(String(value || ""));
}

function assessEstimabilityReadback(readback, staticFindings = []) {
  const models = Array.isArray(readback?.models) ? readback.models : [];
  const staticRisk = staticFindings.some((row) => row.rule === "estimability_runtime_required");
  if (!models.length) {
    return {
      runtime_estimability: { status: staticRisk ? "required" : "not_provided", models: [], boundary: "Static analysis cannot establish coefficient survival in e(b)." },
      substantive_validity: { status: staticRisk ? "not_determined" : "not_assessed", issues: [], boundary: "Runtime success and static cleanliness do not establish substantive validity." },
    };
  }
  const modelResults = models.map((model) => {
    const observed = (model.observed_eb_terms || []).map(String);
    const declaredTerms = (model.declared_nonreference_terms || []).map(String).filter(Boolean);
    const declaredReferenceTerms = (model.declared_reference_terms || []).map(String).filter(Boolean);
    const terms = declaredTerms.map((declared) => {
      const exact = observed.find((item) => item === declared);
      const conceptual = observed.find((item) => conceptualFactorTerm(item) === conceptualFactorTerm(declared));
      const matched = exact || conceptual || null;
      return {
        declared,
        observed: matched,
        status: !matched ? "missing" : omittedFactorTerm(matched) ? "omitted" : "estimated",
        exact_raw_match: Boolean(exact),
      };
    });
    const references = declaredReferenceTerms.map((declared) => {
      const exact = observed.find((item) => item === declared);
      const conceptual = observed.find((item) => conceptualFactorTerm(item) === conceptualFactorTerm(declared));
      const matched = exact || conceptual || null;
      return {
        declared,
        observed: matched,
        status: matched ? "reference_present" : "absent_as_declared",
        exact_raw_match: Boolean(exact),
      };
    });
    return {
      model_id: String(model.model_id || "unnamed_model"),
      declaration_status: declaredTerms.length ? "declared" : "missing_nonreference_contract",
      terms,
      declared_reference_terms: declaredReferenceTerms,
      references,
      observed_eb_terms: observed,
    };
  });
  const issues = modelResults.flatMap((model) => [
    ...(model.declaration_status === "missing_nonreference_contract"
      ? [{ model_id: model.model_id, status: "undeclared", message: "declared_nonreference_terms must contain at least one expected nonreference coefficient" }]
      : []),
    ...model.terms
      .filter((term) => term.status !== "estimated")
      .map((term) => ({ model_id: model.model_id, ...term })),
    ...model.terms
      .filter((term) => term.status === "estimated" && !term.exact_raw_match)
      .map((term) => ({ model_id: model.model_id, ...term, status: "raw_name_mismatch", message: "The coefficient is conceptually present, but the declared raw token does not exactly match observed e(b)." })),
    ...model.references
      .filter((term) => term.status === "reference_present")
      .map((term) => ({ model_id: model.model_id, ...term, message: "A declared reference term is present in observed e(b); verify the base or omitted-slot declaration before selector construction." })),
  ]);
  const incomplete = issues.some((row) => ["missing", "undeclared", "raw_name_mismatch", "reference_present"].includes(row.status));
  return {
    runtime_estimability: {
      status: incomplete ? "incomplete" : "complete",
      models: modelResults,
      boundary: "This consumes caller-supplied exact e(b) colfullnames; it does not claim that Stata execution or model interpretation passed unless separately evidenced.",
    },
    selector_readiness: {
      status: modelResults.every((model) => model.terms.every((term) => term.status === "estimated" && term.exact_raw_match)
        && model.references.every((term) => term.status === "absent_as_declared")) ? "complete" : "incomplete",
      required_action: "Bind outreg2 rows and coefplot selectors to the exact observed raw e(b) tokens, not conceptual factor-name matches.",
    },
    substantive_validity: {
      status: issues.length ? "needs_review" : "supported_by_readback",
      issues,
      boundary: "Unexpected omitted or missing nonreference terms change interpretation even when the Stata run exits successfully.",
    },
  };
}

function auditProject(args) {
  if (!args.path) throw new Error("프로젝트 path가 필요합니다.");
  const root = path.resolve(String(args.path));
  if (!fs.statSync(root).isDirectory()) throw new Error("path는 디렉터리여야 합니다.");
  const strictStructure = args.strict_structure === true;
  const reportPolicy = resolveReportPolicy(args, args.require_report === true ? "required" : "optional");
  const requireReport = reportPolicy === "required";
  const scopeInput = args.scope && typeof args.scope === "object" ? args.scope : {};
  const scopeMode = resolveScopeMode(scopeInput);
  const requestedEntrypoints = (scopeInput.entrypoints || []).map((value) => normalizeRelativePath(value, "scope.entrypoints"));
  const includePaths = (scopeInput.include_paths || []).map((value) => normalizeRelativePath(value, "scope.include_paths").replace(/\/$/, ""));
  const excludePaths = (scopeInput.exclude_paths || []).map((value) => normalizeRelativePath(value, "scope.exclude_paths").replace(/\/$/, ""));
  const pathMatches = (candidate, values) => values.some((value) => candidate === value || candidate.startsWith(`${value}/`));
  const requestedStages = args.expected_stages?.length ? unique(args.expected_stages) : STAGES;
  if (requestedStages.some((stage) => !STAGES.includes(stage))) throw new Error("expected_stages에 알 수 없는 단계가 있습니다.");
  const discovered = listDoFiles(root, { excludePaths });
  const files = discovered.files;
  const records = files.map((file) => {
    const content = fs.readFileSync(file, "utf8");
    const calls = stripComments(content).flatMap((row) => {
      const match = row.trimmed.match(/^(?:do|run|include)\s+(?:"([^"]+)"|([^\s,]+))/i);
      return match ? [{ line: row.line, target: match[1] || match[2] }] : [];
    });
    return { path: path.relative(root, file).replaceAll("\\", "/"), absolute_path: file, content, stages: detectStagesFromContent(file, content), calls, lint: null };
  });
  const structural = [];
  const masters = records.filter((record) => {
    const named = /master|runall|run_all|run-all/i.test(path.basename(record.path));
    const rootDispatcher = !record.path.includes("/") && record.calls.length >= 2;
    return named || rootDispatcher;
  });

  const byExact = new Map(records.map((record) => [record.path.toLowerCase(), record]));
  const byBase = new Map();
  const bySuffix = new Map();
  for (const record of records) {
    const base = path.posix.basename(record.path).toLowerCase();
    byBase.set(base, [...(byBase.get(base) || []), record]);
    const segments = record.path.toLowerCase().split("/");
    for (let index = 0; index < segments.length; index += 1) {
      const suffix = segments.slice(index).join("/");
      bySuffix.set(suffix, [...(bySuffix.get(suffix) || []), record]);
    }
  }
  const externalOrchestrators = detectExternalOrchestrators(root, records);
  const callGraph = externalOrchestrators.flatMap((orchestrator) => orchestrator.calls);
  for (const record of records) {
    const seen = new Set();
    for (const call of record.calls) {
      let normalized = call.target.replaceAll("\\", "/").replace(/^\.\//, "");
      normalized = normalized.replace(/^(?:(?:\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|`[A-Za-z_][A-Za-z0-9_]*')\/)+/, "");
      const exact = byExact.get(normalized.toLowerCase());
      const suffix = bySuffix.get(normalized.toLowerCase()) || [];
      const baseMatches = byBase.get(path.posix.basename(normalized).toLowerCase()) || [];
      const matches = exact ? [exact] : suffix.length ? suffix : baseMatches;
      const resolved = matches.length === 1 ? matches[0].path : null;
      const status = resolved ? "resolved" : matches.length > 1 ? "ambiguous" : "unresolved";
      callGraph.push({ from: record.path, line: call.line, target: call.target, resolved, status, candidates: matches.map((row) => row.path) });
      if (status === "unresolved") structural.push({ severity: "error", rule: "unresolved_call", file: record.path, line: call.line, message: `호출 대상 ${call.target}을 찾을 수 없습니다.` });
      if (status === "ambiguous") structural.push({ severity: "warning", rule: "ambiguous_call", file: record.path, line: call.line, message: `호출 대상 ${call.target}이 여러 파일과 일치합니다.` });
      if (resolved && seen.has(resolved)) structural.push({ severity: "warning", rule: "duplicate_call", file: record.path, line: call.line, message: `${resolved}을 같은 파일에서 중복 호출합니다.` });
      if (resolved) seen.add(resolved);
    }
  }

  const namedTopMaster = masters.slice().sort((a, b) => {
    const rootA = a.path.includes("/") ? 1 : 0;
    const rootB = b.path.includes("/") ? 1 : 0;
    return rootA - rootB || b.calls.length - a.calls.length || a.path.localeCompare(b.path);
  })[0] || null;
  const standaloneEntrypoint = records.length === 1 && !namedTopMaster && !externalOrchestrators.length ? records[0] : null;
  const explicitEntrypoints = requestedEntrypoints.map((entrypoint) => {
    const record = byExact.get(entrypoint.toLowerCase());
    if (!record) throw new Error(`scope entrypoint ${entrypoint}을 찾을 수 없습니다.`);
    if (pathMatches(record.path, excludePaths)) throw new Error(`scope entrypoint ${entrypoint}은 exclude_paths에 포함될 수 없습니다.`);
    return record;
  });
  const topLevelMasterCandidates = masters.filter((record) => !record.path.includes("/"));
  const ambiguousDefaultEntrypoint = scopeMode === "reachable" && !explicitEntrypoints.length && topLevelMasterCandidates.length > 1;
  const topMaster = explicitEntrypoints[0] || (!ambiguousDefaultEntrypoint ? namedTopMaster : null) || standaloneEntrypoint;
  if (masters.length && !topMaster && !ambiguousDefaultEntrypoint) structural.push({ severity: "error", rule: "missing_top_master", message: "정본 top-level master를 결정할 수 없습니다." });
  if (ambiguousDefaultEntrypoint) {
    structural.push({ severity: "warning", rule: "entrypoint_selection_ambiguous", message: `top-level entrypoint 후보가 ${topLevelMasterCandidates.length}개입니다. active workflow 판정이 중요하면 scope.entrypoints를 명시하세요.` });
  }
  const masterPolicyTarget = explicitEntrypoints.find((record) => masters.includes(record)) || (!ambiguousDefaultEntrypoint ? namedTopMaster : null);
  if (masterPolicyTarget) {
    masterPolicyTarget.lint = lintContent(masterPolicyTarget.content, "auto", masterPolicyTarget.absolute_path);
    const topEdges = callGraph.filter((edge) => edge.from === masterPolicyTarget.path && edge.resolved);
    const panelIndex = topEdges.findIndex((edge) => /build_analysis_panel/i.test(edge.resolved));
    const summaryIndex = topEdges.findIndex((edge) => /build_summary/i.test(edge.resolved));
    const regressionIndex = topEdges.findIndex((edge) => /run_regressions/i.test(edge.resolved));
    const readableDefault = panelIndex >= 0 && summaryIndex >= 0 && regressionIndex >= 0;
    const legacyPrepIndex = topEdges.findIndex((edge) => /prep|clean/i.test(edge.resolved));
    const legacyAnalysisIndex = topEdges.findIndex((edge) => /analysis_master|table|figure|result/i.test(edge.resolved));
    const compatibleLegacySplit = legacyPrepIndex >= 0 && legacyAnalysisIndex >= 0;
    if (strictStructure && !readableDefault && !compatibleLegacySplit) {
      structural.push({ severity: "warning", rule: "analysis_panel_summary_regression_split", file: masterPolicyTarget.path, message: "새 프로젝트 기본 구조의 analysis panel, summary, regressions 호출이 확인되지 않았고 보존 가능한 기존 prep-analysis split도 확인되지 않습니다." });
    } else if (strictStructure && readableDefault && !(panelIndex < summaryIndex && panelIndex < regressionIndex)) {
      structural.push({ severity: "error", rule: "master_order", file: masterPolicyTarget.path, message: "analysis panel producer가 summary와 regressions consumer보다 먼저 호출되지 않습니다." });
    } else if (strictStructure && !readableDefault && compatibleLegacySplit && legacyPrepIndex > legacyAnalysisIndex) {
      structural.push({ severity: "error", rule: "master_order", file: masterPolicyTarget.path, message: "기존 분석 master가 전처리 master보다 먼저 호출됩니다." });
    }
    const strengthNames = new Set(masterPolicyTarget.lint.strengths.map((row) => row.rule));
    if (!strengthNames.has("stata_version")) structural.push({ severity: "warning", rule: "missing_version", file: masterPolicyTarget.path, message: "top master에 Stata version 선언이 없습니다." });
    if (!strengthNames.has("single_project_root")) structural.push({ severity: "warning", rule: "missing_project_root", file: masterPolicyTarget.path, message: "top master에 단일 프로젝트 root 설정이 없습니다." });
    if (strictStructure) {
      const pathContractRecords = [masterPolicyTarget];
      for (const edge of topEdges) {
        if (!/(?:config|paths?|setup)/i.test(path.posix.basename(edge.resolved))) continue;
        const called = byExact.get(edge.resolved.toLowerCase());
        if (called) pathContractRecords.push(called);
      }
      const lower = pathContractRecords.map((record) => record.content).join("\n").toLowerCase();
      const requiredPathTiers = [
        ...(requestedStages.includes("import") ? ["raw"] : []),
        ...(requestedStages.some((stage) => ["cleaning_labels", "merge_reshape", "panel_construction"].includes(stage)) ? ["final"] : []),
        ...(requestedStages.some((stage) => ["descriptives_balance_sample_flow", "estimation", "exports"].includes(stage)) ? ["table"] : []),
        ...(requestedStages.includes("estimation") ? ["ster"] : []),
        ...(requestedStages.includes("figures") ? ["figures"] : []),
        ...(requestedStages.includes("master_orchestration") ? ["log"] : []),
      ];
      for (const tier of unique(requiredPathTiers)) {
        if (!lower.includes(tier)) structural.push({ severity: "warning", rule: `missing_path_${tier}`, file: masterPolicyTarget.path, message: `새 프로젝트 표준 구조의 ${tier} 경로 계약이 top master 또는 직접 호출된 config에서 확인되지 않습니다.` });
      }
    }
  }

  const adjacency = new Map([
    ...records.map((record) => [record.path, []]),
    ...externalOrchestrators.map((orchestrator) => [orchestrator.path, []]),
  ]);
  for (const edge of callGraph) if (edge.resolved) adjacency.get(edge.from).push(edge.resolved);
  const reachable = new Set();
  function visit(node, trail = new Set()) {
    if (trail.has(node)) {
      structural.push({ severity: "error", rule: "call_cycle", file: node, message: "do-file 호출 graph에 순환이 있습니다." });
      return;
    }
    if (reachable.has(node)) return;
    reachable.add(node);
    const nextTrail = new Set(trail);
    nextTrail.add(node);
    for (const target of adjacency.get(node) || []) visit(target, nextTrail);
  }
  const traversalRoots = explicitEntrypoints.length ? explicitEntrypoints.map((row) => row.path) : topMaster ? [topMaster.path] : [];
  for (const entrypoint of traversalRoots) visit(entrypoint);
  for (const included of records.filter((record) => pathMatches(record.path, includePaths))) visit(included.path);
  let activeSet = scopeMode === "all"
    ? new Set(records.map((record) => record.path))
    : ambiguousDefaultEntrypoint
      ? reachable
      : !traversalRoots.length ? new Set(records.map((record) => record.path)) : reachable;
  activeSet = new Set([...activeSet].filter((value) => !pathMatches(value, excludePaths)));
  for (const edge of callGraph) {
    if (activeSet.has(edge.from) && edge.resolved && !activeSet.has(edge.resolved)) {
      structural.push({ severity: "error", rule: "active_call_excluded", file: edge.from, line: edge.line, message: `active workflow 호출 대상 ${edge.resolved}이 scope에서 제외되었습니다.` });
    }
  }
  const activeRecords = records.filter((record) => activeSet.has(record.path));
  const inactiveRecords = records.filter((record) => !activeSet.has(record.path));
  for (const record of activeRecords) {
    if (!record.lint) record.lint = lintContent(record.content, "auto", record.absolute_path);
  }
  if (!traversalRoots.length && activeRecords.length > 1 && !externalOrchestrators.length && !ambiguousDefaultEntrypoint) {
    structural.push({ severity: "error", rule: "missing_master", message: "active scope의 여러 do-file을 순서대로 호출하는 master 또는 외부 orchestrator가 없습니다." });
  }
  const activeByPath = new Map(activeRecords.map((record) => [record.path, record]));
  const reachableOrder = [...reachable].filter((recordPath) => activeSet.has(recordPath));
  const executionOrder = [
    ...reachableOrder,
    ...activeRecords.map((record) => record.path).filter((recordPath) => !reachableOrder.includes(recordPath)),
  ];
  const projectContents = new Map(executionOrder
    .map((recordPath) => activeByPath.get(recordPath))
    .filter(Boolean)
    .map((record) => [record.absolute_path, record.content]));
  const projectGlobals = collectProjectGlobalEnvironment(projectContents, root);
  const undirected = new Map(activeRecords.map((record) => [record.path, new Set()]));
  for (const edge of callGraph) {
    if (!edge.resolved || !undirected.has(edge.resolved)) continue;
    if (undirected.has(edge.from)) {
      undirected.get(edge.from).add(edge.resolved);
      undirected.get(edge.resolved).add(edge.from);
    }
  }
  for (const orchestrator of externalOrchestrators) {
    const targets = orchestrator.resolved_do_files.filter((recordPath) => undirected.has(recordPath));
    for (let index = 1; index < targets.length; index += 1) {
      undirected.get(targets[0]).add(targets[index]);
      undirected.get(targets[index]).add(targets[0]);
    }
  }
  const componentByPath = new Map();
  let componentIndex = 0;
  for (const record of activeRecords) {
    if (componentByPath.has(record.path)) continue;
    const componentId = `component:${componentIndex += 1}`;
    const pending = [record.path];
    while (pending.length) {
      const current = pending.pop();
      if (componentByPath.has(current)) continue;
      componentByPath.set(current, componentId);
      for (const neighbor of undirected.get(current) || []) pending.push(neighbor);
    }
  }
  const componentIdsByAbsolute = new Map(activeRecords.map((record) => [record.absolute_path, componentByPath.get(record.path)]));
  const projectGlobalsByComponent = new Map();
  for (const componentId of new Set(componentByPath.values())) {
    const componentContents = new Map([...projectContents.entries()]
      .filter(([absolutePath]) => componentIdsByAbsolute.get(absolutePath) === componentId));
    projectGlobalsByComponent.set(componentId, collectProjectGlobalEnvironment(componentContents, root));
  }
  const outreg2HelperMultiplicity = canonicalOutreg2HelperMultiplicity(projectContents, projectGlobals, componentIdsByAbsolute, projectGlobalsByComponent);
  for (const record of activeRecords) {
    const formatterLine = activeLogicalEntries(record.content)
      .find((entry) => /^program\s+define\s+outreg2_xlsx\b/i.test(normalizeCommand(entry.text.trim())))?.line;
    if (!formatterLine) continue;
    record.lint.strengths = record.lint.strengths.filter((row) => row.rule !== "outreg2_sheet_program_project_context_pending");
    if (outreg2HelperMultiplicity.necessary) {
      record.lint.findings = record.lint.findings.filter((row) => row.rule !== "unnecessary_outreg2_program");
      record.lint.strengths.push({ rule: "necessary_outreg2_sheet_program_project_context", line: formatterLine, multiplicity: outreg2HelperMultiplicity });
      record.lint.summary.approved_program_exceptions = Math.max(1, record.lint.summary.approved_program_exceptions);
    } else if (outreg2HelperMultiplicity.unresolved_placement) {
      record.lint.findings = record.lint.findings.filter((row) => row.rule !== "unnecessary_outreg2_program");
      record.lint.strengths.push({ rule: "outreg2_sheet_program_project_context_pending", line: formatterLine, multiplicity: outreg2HelperMultiplicity });
      record.lint.summary.approved_program_exceptions = 0;
    } else if (!record.lint.findings.some((row) => row.rule === "unnecessary_outreg2_program")) {
      record.lint.findings.push(finding("error", "unnecessary_outreg2_program", formatterLine, "canonical outreg2_xlsx는 active project scope에서 같은 workbook의 두 개 이상 resolved sheet() 배치를 충족하지 않습니다.", "한 sheet workbook은 직접 outreg2 replace/append를 사용하고, 여러 sheet가 필요하면 active producer-consumer flow에서 workbook과 sheet 배치를 확인 가능하게 하세요."));
      record.lint.summary.approved_program_exceptions = 0;
    }
    const errors = record.lint.findings.filter((row) => row.severity === "error").length;
    const warnings = record.lint.findings.filter((row) => row.severity === "warning").length;
    record.lint.summary.errors = errors;
    record.lint.summary.warnings = warnings;
    record.lint.summary.strengths = record.lint.strengths.length;
    record.lint.status = errors ? "blocked" : warnings ? "needs_review" : "static_clean";
  }
  structural.push(...scopedGlobalFindings(activeRecords));
  const allFindings = activeRecords.flatMap((record) => record.lint.findings.map((row) => ({ file: record.path, ...row })));
  let inactiveFindings = inactiveRecords.map((record) => ({
    file: record.path,
    severity: "info",
    rule: "inactive_file_outside_scope",
    message: "reachable active workflow 밖에서 발견되어 full lint를 실행하지 않았습니다. 전체 repository 검사가 필요하면 scope.mode=all 또는 include_paths를 사용하세요.",
    scope_reason: "outside_active_workflow",
  }));
  for (const record of activeRecords) {
    const active = stripComments(record.content).map((row) => ({ line: row.line, command: normalizeCommand(row.trimmed) }));
    for (const row of active) {
      if (/^(?:save|export\s+delimited|export\s+excel)\b/i.test(row.command) && /(?:\$\{?[^}]*raw|\/raw\/|\\raw\\)/i.test(row.command)) {
        structural.push({ severity: "error", rule: "write_to_raw", file: record.path, line: row.line, message: "raw 계층에 쓰는 명령이 있습니다." });
      }
    }
  }

  const activeStructural = structural.filter((row) => !row.file || row.file === "report.md" || activeSet.has(row.file));
  inactiveFindings = inactiveFindings.concat(structural
    .filter((row) => row.file && row.file !== "report.md" && !activeSet.has(row.file))
    .map((row) => ({ ...row, original_severity: row.severity, severity: "info", scope_reason: "outside_active_workflow" })));
  const stageCoverage = STAGES.map((stage) => {
    const stageFiles = activeRecords.filter((record) => record.stages.includes(stage)).map((record) => record.path);
    if (stage === "master_orchestration") stageFiles.push(...externalOrchestrators.map((row) => row.path));
    const expected = requestedStages.includes(stage);
    return { stage, expected, status: stageFiles.length ? "present" : expected ? "missing" : "not_expected", files: stageFiles };
  });
  for (const row of stageCoverage) {
    if (row.status === "missing") activeStructural.push({ severity: row.stage === "master_orchestration" && activeRecords.length > 1 ? "error" : "warning", rule: `missing_${row.stage}`, message: `${row.stage} 단계의 증거가 없습니다.` });
  }
  const sampleFlowEvidence = activeRecords.flatMap((record) => stripComments(record.content).flatMap((row) => {
    const command = normalizeCommand(row.trimmed);
    return /^(?:count|sum|summarize|tab|tabulate|tabstat|isid|assert|merge|keep|drop)\b/i.test(command) ? [{ file: record.path, line: row.line, command }] : [];
  }));
  const workReport = reportPolicy === "disabled"
    ? {
      required: false,
      status: "disabled",
      path: "report.md",
      entries: [],
      errors: [],
      coverage: { status: "not_checked", authored_spans: [], reportable: [], covered: [], uncovered: [] },
      policy: "disabled_by_explicit_user_contract",
    }
    : validateWorkReport(root, { required: requireReport, authored_spans: args.authored_spans });
  if (requireReport && workReport.status !== "valid") {
    for (const message of workReport.errors) activeStructural.push({ severity: "error", rule: "work_report_invalid", file: "report.md", message });
  }
  const errors = allFindings.filter((row) => row.severity === "error").length + activeStructural.filter((row) => row.severity === "error").length;
  const warnings = allFindings.filter((row) => row.severity === "warning").length + activeStructural.filter((row) => row.severity === "warning").length;
  const staticStatus = errors ? "blocked" : warnings ? "needs_review" : "static_clean";
  const estimability = assessEstimabilityReadback(args.estimability_readback, allFindings);
  return {
    root,
    status: staticStatus,
    static_status: staticStatus,
    runtime_estimability: estimability.runtime_estimability,
    selector_readiness: estimability.selector_readiness,
    substantive_validity: estimability.substantive_validity,
    verification_level: "static_workflow_audit",
    structure_mode: strictStructure ? "standard_new_project" : "preserve_existing_project",
    summary: { do_files: activeRecords.length, discovered_do_files: files.length, inactive_do_files: inactiveRecords.length, top_master: topMaster?.path || externalOrchestrators[0]?.path || null, master_candidates: [...masters.map((row) => row.path), ...externalOrchestrators.map((row) => row.path)], errors, warnings },
    scope: {
      mode: scopeMode,
      entrypoints: traversalRoots,
      include_paths: includePaths,
      exclude_paths: excludePaths,
      active_files: activeRecords.map((row) => row.path),
      inactive_files: inactiveRecords.map((row) => row.path),
      rule: "Only active files contribute to blocking status. Inactive discoveries retain informational findings and can be promoted with mode=all or explicit include_paths.",
    },
    stage_coverage: stageCoverage,
    call_graph: callGraph,
    sample_flow: { observed_counts: null, static_evidence: sampleFlowEvidence },
    work_report: workReport,
    report_policy: reportPolicy,
    program_policy: {
      outreg2_helper_multiplicity: outreg2HelperMultiplicity,
      project_globals: projectGlobals.evidence,
    },
    orchestration: { stata_masters: masters.map((row) => row.path), external: externalOrchestrators.map(({ calls, ...row }) => row) },
    excluded_directories: discovered.excludedDirectories,
    structural_findings: activeStructural,
    file_findings: allFindings,
    inactive_findings: inactiveFindings,
    files: activeRecords.map((record) => ({ path: record.path, stages: record.stages, calls: record.calls, status: record.lint.status })),
    claim_boundary: "프로젝트 구조와 정적 패턴 검사이며 실제 데이터로 모든 결과를 재실행한 인증은 아닙니다.",
  };
}

function workflowReproductionCheck(args) {
  if (!args.path) throw new Error("프로젝트 path가 필요합니다.");
  if (!args.contract || typeof args.contract !== "object" || Array.isArray(args.contract)) throw new Error("contract object가 필요합니다.");
  const root = path.resolve(String(args.path));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error("path는 디렉터리여야 합니다.");
  const contract = args.contract;
  const requiredStages = Array.isArray(contract.required_stages) ? unique(contract.required_stages) : [];
  if (requiredStages.some((stage) => !STAGES.includes(stage))) throw new Error("required_stages에 알 수 없는 단계가 있습니다.");
  const audit = auditProject({ path: root, expected_stages: requiredStages.length ? requiredStages : STAGES, strict_structure: false });
  const projectFiles = listProjectFiles(root);
  const doFiles = audit.files.map((row) => row.path);
  const doContent = new Map(doFiles.map((relative) => [relative.toLowerCase(), fs.readFileSync(resolveInside(root, relative, "do-file").target, "utf8")]));
  const checks = [];
  const blockers = [];
  const addCheck = (name, pass, detail, message = detail) => {
    checks.push({ name, status: pass ? "pass" : "fail", detail });
    if (!pass) blockers.push({ check: name, message });
  };

  if (contract.entrypoint) {
    const entrypoint = normalizeRelativePath(contract.entrypoint, "entrypoint");
    addCheck("entrypoint", audit.summary.top_master?.toLowerCase() === entrypoint.toLowerCase(), `expected ${entrypoint}; observed ${audit.summary.top_master || "없음"}`, "정본 entrypoint가 계약과 일치해야 합니다.");
  }
  for (const stage of requiredStages) {
    const coverage = audit.stage_coverage.find((row) => row.stage === stage);
    addCheck(`stage:${stage}`, coverage?.status === "present", coverage?.files?.join(", ") || "증거 없음", `${stage} 단계의 정적 workflow 증거가 필요합니다.`);
  }
  for (const item of contract.required_files || []) {
    const relative = normalizeRelativePath(item, "required file");
    const target = resolveInside(root, relative, "required file").target;
    addCheck(`required_file:${relative}`, fs.existsSync(target) && fs.statSync(target).isFile(), relative, `${relative} 파일이 필요합니다.`);
  }
  for (const item of contract.required_calls || []) {
    const relative = normalizeRelativePath(item, "required call");
    const present = audit.call_graph.some((edge) => edge.resolved?.toLowerCase() === relative.toLowerCase());
    addCheck(`required_call:${relative}`, present, present ? relative : "호출 graph에 없음", `${relative}이 정본 orchestration에서 호출되어야 합니다.`);
  }
  for (const item of contract.deliverables || []) {
    const pattern = normalizeRelativePath(item.pattern, "deliverable pattern");
    if (!Number.isInteger(item.expected_count) || item.expected_count < 0) throw new Error("deliverable expected_count는 0 이상의 정수여야 합니다.");
    const matches = projectFiles.filter((file) => globRegex(pattern).test(file));
    addCheck(`deliverable_count:${pattern}`, matches.length === item.expected_count, `expected ${item.expected_count}; observed ${matches.length}: ${matches.join(", ")}`, `${pattern} 산출물 개수가 계약과 일치해야 합니다.`);
  }

  const summaryContract = [];
  for (let index = 0; index < (contract.summary_datasets || []).length; index += 1) {
    const item = contract.summary_datasets[index];
    const dataset = normalizeRelativePath(item.path, "summary dataset");
    const basename = path.posix.basename(dataset).toLowerCase();
    const target = resolveInside(root, dataset, "summary dataset").target;
    addCheck(`summary_dataset:${index + 1}`, fs.existsSync(target) && fs.statSync(target).isFile(), dataset, `${dataset} 정본 summary dataset이 필요합니다.`);
    const requiredStatistics = unique((item.required_statistics || []).map((value) => String(value).toLowerCase()));
    const requiredVariables = unique((item.required_variables || []).map((value) => String(value)));
    const commandHasStatistic = (command, statistic) => {
      const normalized = statistic === "n" ? "count" : statistic;
      const collapseAliases = {
        mean: ["mean"],
        sd: ["sd"],
        count: ["count", "n"],
        sum: ["sum", "rawsum"],
        rawsum: ["rawsum"],
        se: ["semean", "sebinomial", "sepoisson"],
        median: ["median", "p50"],
      };
      const aliases = collapseAliases[normalized] || (/^p\d{1,2}$/i.test(normalized) ? [normalized] : []);
      if (!aliases.length) return false;
      return aliases.some((alias) => new RegExp(`\\(${alias}\\)`, "i").test(command))
        || (/^tabstat\b/i.test(command) && aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(command.replace(/^.*?\bstat(?:istics)?\s*\(/i, ""))));
    };
    const producers = [];
    for (const [relative, content] of doContent) {
      const active = stripComments(content).map((row) => normalizeCommand(row.trimmed));
      const summaryCommands = active.filter((command) => /^(?:collapse|tabstat)\b/i.test(command));
      const savesDataset = active.some((command) => /^save\b/i.test(command) && command.toLowerCase().includes(basename));
      if (summaryCommands.length && savesDataset) producers.push({
        file: relative,
        summaryCommands,
        statistics: requiredStatistics.filter((statistic) => summaryCommands.some((command) => commandHasStatistic(command, statistic))),
      });
    }
    const producer = producers.find((row) => requiredStatistics.every((statistic) => row.statistics.includes(statistic)));
    addCheck(`summary_statistics:${index + 1}`, Boolean(producer), producer ? `${producer.file}: ${producer.statistics.join(", ")}` : `${basename}: ${requiredStatistics.join(", ")} 생성 증거 없음`, "정본 summary dataset은 계약된 통계를 같은 명명된 build 단계에서 생성해야 합니다.");
    if (requiredVariables.length) {
      const producerText = producer
        ? stripComments(doContent.get(producer.file.toLowerCase()) || "").map((row) => normalizeCommand(row.trimmed)).join("\n")
        : "";
      const missingVariables = requiredVariables.filter((variable) => {
        const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return !new RegExp(`\\b${escaped}\\b`, "i").test(producerText);
      });
      addCheck(`summary_variables:${index + 1}`, missingVariables.length === 0, missingVariables.length ? `missing: ${missingVariables.join(", ")}` : requiredVariables.join(", "), "정본 summary dataset producer에 계약된 변수 이름이 모두 있어야 합니다.");
    }

    const consumerChecks = {};
    for (const [kind, field] of [["table", "table_consumer"], ["figure", "figure_consumer"]]) {
      if (!item[field]) continue;
      const consumer = normalizeRelativePath(item[field], field);
      const content = doContent.get(consumer.toLowerCase());
      const usesDataset = Boolean(content && stripComments(content).some((row) => /^use\b/i.test(normalizeCommand(row.trimmed)) && row.trimmed.toLowerCase().includes(basename)));
      consumerChecks[kind] = { file: consumer, uses_dataset: usesDataset };
      addCheck(`summary_${kind}_consumer:${index + 1}`, usesDataset, `${consumer} -> ${basename}`, `${consumer}이 정본 ${basename}을 직접 읽어야 합니다.`);
    }
    summaryContract.push({
      path: dataset,
      required_statistics: requiredStatistics,
      required_variables: requiredVariables,
      producer: producer?.file || null,
      consumers: consumerChecks,
      shared_consumer_dataset: Boolean(consumerChecks.table?.uses_dataset && consumerChecks.figure?.uses_dataset),
    });
  }

  if (contract.estimation && typeof contract.estimation === "object") {
    const activeText = [...doContent.values()].map((content) => stripComments(content).map((row) => normalizeCommand(row.trimmed)).join("\n")).join("\n").toLowerCase();
    for (const token of contract.estimation.required_tokens || []) {
      const value = String(token).toLowerCase();
      addCheck(`estimation_token:${value}`, activeText.includes(value), value, `추정 계약 토큰 ${value}의 정적 증거가 필요합니다.`);
    }
    if (Number.isInteger(contract.estimation.expected_ster_count)) {
      const sterFiles = projectFiles.filter((file) => /\.ster$/i.test(file));
      addCheck("estimation_ster_count", sterFiles.length === contract.estimation.expected_ster_count, `expected ${contract.estimation.expected_ster_count}; observed ${sterFiles.length}`, "저장된 estimation container 개수가 계약과 일치해야 합니다.");
    }
  }

  return {
    root,
    status: blockers.length ? "needs_revision" : "reproduced",
    verification_level: "semantic_workflow_contract_static_check",
    checks,
    blockers,
    summary_contract: summaryContract,
    static_audit: audit,
    leakage_rule: "원본 do-file 또는 예시 코드와의 code similarity는 부정 유출을 찾는 보조 검사일 뿐 성공 기준이 아닙니다.",
    claim_boundary: "reproduced는 계약된 stage role, call graph, summary lineage, 추정 토큰, 산출물 개수의 정적 증거가 있다는 뜻입니다. Code similarity는 성공 기준이 아니며 실제 수치 동일성과 fresh runtime은 별도 검증해야 합니다.",
  };
}

const TOOLS = [
  {
    name: "resolve_transition_evidence",
    description: "Resolve one substantive atomic Stata transition through two non-competing evidence layers. The guide layer returns mechanics metadata only—never guide code, code hashes, or synthetic source spans—and only for an exact contract, variant, command-anchor, declared Stata compatibility, and material-facet match; free-text manual/source-edition notes remain provenance rather than runtime gates, guide ambiguity fails closed, and guides never supply research decisions. Separately, it may return at most one audited deposited/independent research-usage example that passed runtime plus selector positive and sibling-negative gates. Routes are guide+usage_template, guide+general_rule, guide_informed_general_rule, selection_required, or split_required.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["transition"],
      properties: {
        transition: {
          type: "object",
          additionalProperties: false,
          properties: {
            checkpoint: { type: "string", enum: CHECKPOINTS },
            stage: { type: "string", enum: STAGES },
            unit_kind: { type: "string", enum: ["setup", "orchestration", "preparation", "validation", "estimation", "post_estimation", "post_estimation_export", "cleanup"] },
            variant_group: { type: "string" },
            variant_id: { type: "string" },
            task: { type: "string" },
            commands: { type: "array", minItems: 1, maxItems: 2, uniqueItems: true, items: { type: "string", minLength: 1 } },
            contract_ids: { type: "array", maxItems: 20, uniqueItems: true, items: { type: "string", minLength: 1 } },
            version: { anyOf: [{ type: "string", minLength: 1 }, { type: "number" }, { type: "object", additionalProperties: true }] },
            variant_facets: { type: "object", additionalProperties: true },
            current_state_signals: { type: "array", maxItems: 20, uniqueItems: true, items: { type: "string", minLength: 1 } },
            target_state_signals: { type: "array", maxItems: 20, uniqueItems: true, items: { type: "string", minLength: 1 } },
            composition: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "producer_state", "consumer_requires"],
              properties: {
                kind: { type: "string", enum: ["inseparable_producer_consumer"] },
                producer_state: { type: "string", minLength: 1 },
                consumer_requires: { type: "string", minLength: 1 },
              },
            },
          },
          anyOf: [
            { required: ["checkpoint"] },
            { required: ["variant_id"] },
            { required: ["commands"] },
          ],
        },
        target_input_profile: {
          type: "object",
          additionalProperties: false,
          properties: {
            data_structure: { type: "string" },
            record_unit: { type: "string" },
            required_keys: { type: "array", uniqueItems: true, items: { type: "string" } },
            source_basis: { type: "string" },
            time_structure: { type: "string" },
            variable_characteristics: { type: "array", uniqueItems: true, items: { type: "string" } },
          },
        },
        substantive_choices: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: { type: "string", enum: ["resolved", "unresolved"] },
            unresolved: { type: "array", maxItems: 20, uniqueItems: true, items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["transition", "guide_layer", "usage_layer", "implementation_route", "safety"],
      properties: {
        transition: { type: "object", additionalProperties: true },
        guide_layer: { type: "object", additionalProperties: true },
        usage_layer: { type: "object", additionalProperties: true },
        implementation_route: { type: "object", additionalProperties: true },
        safety: { type: "object", additionalProperties: true },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "inspect_top100_command_examples",
    description: "Inspect the complexity-weighted manual metadata and paper-evidence status for one or more Top 100 Stata commands. Unlike the atomic resolver, this command-level overview returns every distinct guide contract judged necessary for the command, but never guide code, code hashes, or synthetic source spans. Deposited paper code is returned only when include_paper_context=true and remains group context rather than exact reusable template support.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        group_ids: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "string", minLength: 1 } },
        commands: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "string", minLength: 1 } },
        include_paper_context: { type: "boolean", default: false },
      },
      anyOf: [{ required: ["group_ids"] }, { required: ["commands"] }],
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_stata_manual",
    description: "Search page-level StataCorp official manuals first, or explicitly requested community maintainer references. Returns authority, URL, page, hashes, and excerpts; it never declares code passed.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      query: { type: "string" }, commands: { type: "array", items: { type: "string" }, maxItems: 10 }, authority: { type: "string", enum: ["official", "community", "any"] }, limit: { type: "integer", minimum: 1, maximum: 10 },
    }, anyOf: [{ required: ["query"] }, { required: ["commands"] }] },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_verified_stata_examples",
    description: "Return only official-document-derived runtime fixtures that were actually executed successfully in Stata. These fixtures are adapted rather than verbatim, are isolated from selectors, and are not independent research-style support; source, page, code hash, runtime version, and log hash are included for verification.",
    inputSchema: { type: "object", additionalProperties: false, required: ["command"], properties: { command: { type: "string" } } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_approved_patterns",
    description: "Secondary reference search for one atomic transition. It canonicalizes detailed commands such as import excel, reshape long, and graph export to the corpus span index, reports matched and unmatched anchors, and flags mixed-transition queries. Default results are safe generation references; optional reference and negative tiers are explanation-only. General rules govern whether and how any result is used.",
    inputSchema: { type: "object", additionalProperties: false, required: ["stage"], properties: {
      stage: { type: "string", enum: STAGES }, task: { type: "string" }, subtask: { type: "string" }, commands: { type: "array", items: { type: "string" }, maxItems: 10 }, data_shape: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 10 }, include_contextual: { type: "boolean" }, include_reference: { type: "boolean" }, include_negative: { type: "boolean" },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_labeled_checkpoints",
    description: "Search human-labeled atomic Stata workflow blocks from loading and preparation through estimation and post-estimation. Returns compatible researcher variants together, with input/output contracts, selection conditions, tradeoffs, provenance, and minimal-edit fields. Dropped variants are excluded by default.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      checkpoint: { type: "string", enum: CHECKPOINTS },
      stage: { type: "string", enum: STAGES },
      unit_kind: { type: "string", enum: ["setup", "orchestration", "preparation", "validation", "estimation", "post_estimation", "post_estimation_export", "cleanup"] },
      variant_id: { type: "string" },
      decision: { type: "string", enum: ["keep", "conditional_keep", "drop"] },
      task: { type: "string" },
      method: { type: "string" },
      commands: { type: "array", items: { type: "string" }, maxItems: 10 },
      current_state: { type: "string" },
      target_state: { type: "string" },
      include_dropped: { type: "boolean" },
      include_project_specific: { type: "boolean" },
      output_flow_profile: { type: "object", additionalProperties: true, description: "Outcome lineage, semantic sheet_groups, and physical sheet_plan. Each sheet_group decision_source is user, existing_project, model_from_metadata, or caller_declared; common aliases user_contract, explicit_user_request, and semantic_definition are normalized. A documented object may put the value in source, type, or kind." },
      event_study_axis_profile: { type: "object", additionalProperties: true, description: "Independent automatic or selective fixed_group axis plan. Opt-in rendering_mode single_flat_mixed_axis_loop additionally requires exactly one fixed_group, one or more automatic groups, complete expected_plots, and mixed_loop_binding {target_path,target_spans,outcome_loop_local,fixed_outcomes_local,axis_options_local}." },
      target_input_signature: { type: "object", additionalProperties: true },
      target_input_profile: { type: "object", additionalProperties: true },
      limit: { type: "integer", minimum: 1, maximum: 20 },
    }, anyOf: [{ required: ["checkpoint"] }, { required: ["stage"] }, { required: ["unit_kind"] }, { required: ["variant_id"] }, { required: ["task"] }] },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "inspect_dictionary_coverage",
    description: "Inspect package-by-checkpoint review coverage separately from label count. Reports full-read accounting, stage dispositions, unresolved questions, unlabeled reusable candidates, and optional file-level command/loop/TeX signals.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      package_id: { type: "string" },
      stage: { type: "string", enum: STAGES },
      checkpoint: { type: "string", enum: CHECKPOINTS },
      review_level: { type: "string", enum: ["end_to_end_read", "targeted_search_only", "inventory_only"] },
      only_gaps: { type: "boolean" },
      include_dropped: { type: "boolean" },
      include_files: { type: "boolean" },
      limit: { type: "integer", minimum: 1, maximum: 35 },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "plan_dictionary_repairs",
    description: "Read-only scan of a Stata codebase and artifacts. First decides whether code is required and classifies the requested state-transition footprint as no-write, atomic substep, checkpoint, multi-checkpoint, or explicit overhaul. It then converts only that footprint into workflow-dictionary headwords, preserves every other stage, and ranks matching researcher variants. Overhaul results include a user-facing pre-write file tree, root-README outline, and planned persistent-variable dictionary; existing projects keep compatible paths.",
    inputSchema: { type: "object", additionalProperties: false, required: ["path", "request"], $defs: {
      checkpoint: { type: "string", enum: CHECKPOINTS },
    }, properties: {
      path: { type: "string" },
      request: { type: "string", minLength: 1 },
      repair_mode: { type: "string", enum: ["auto", "partial", "overhaul"] },
      intent_mode: { type: "string", enum: ["auto", "review_only", "add_feature", "modify_existing", "overhaul"] },
      report_policy: { type: "string", enum: ["required", "optional", "disabled"] },
      target_layout: { type: "string", enum: ["new_first_build", "preserve_existing", "rebuild_existing"] },
      proposed_folders: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 100 },
      proposed_files: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 200 },
      planned_variables: { type: "array", items: PLANNED_VARIABLE_SCHEMA, uniqueItems: true, maxItems: 500 },
      no_new_persistent_variables: { type: "boolean" },
      target_files: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 30 },
      scope: {
        type: "object",
        additionalProperties: false,
        properties: {
          include_paths: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 100, description: "Project-relative files or directories scanned by the planner." },
          exclude_paths: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 100, description: "Project-relative files or directories pruned before the planner file-count limit." },
        },
      },
      source_reuse: {
        type: "object",
        additionalProperties: false,
        required: ["canonical_source", "allowed_changes"],
        properties: {
          mode: { type: "string", enum: ["clone_then_edit", "modify_in_place", "block_extract_insert"], default: "clone_then_edit" },
          canonical_source: { type: "string", description: "Project-relative existing .do file that must be cloned rather than regenerated." },
          destination: { type: "string", description: "Project-relative destination. Required for clone_then_edit and block_extract_insert; omitted or identical to canonical_source for modify_in_place." },
          candidate_path: { type: "string", description: "Optional existing candidate to compare exactly against the deterministic clone-and-edit result." },
          source_block: {
            type: "object",
            additionalProperties: false,
            required: ["start_literal", "end_literal"],
            properties: {
              start_literal: { type: "string", minLength: 1 },
              end_literal: { type: "string", minLength: 1 },
              include_boundaries: { type: "boolean", default: true },
            },
          },
          insertion_anchor: {
            type: "object",
            additionalProperties: false,
            required: ["match", "expected_occurrences"],
            properties: {
              match: { type: "string", minLength: 1 },
              expected_occurrences: { type: "integer", minimum: 1 },
              position: { type: "string", enum: ["before", "after", "replace"], default: "after" },
            },
          },
          allowed_changes: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["operation", "match", "expected_occurrences"],
              properties: {
                operation: { type: "string", enum: ["replace_literal", "delete_literal", "insert_after_literal"] },
                match: { type: "string", minLength: 1 },
                replacement: { type: "string" },
                text: { type: "string" },
                expected_occurrences: { type: "integer", minimum: 1 },
              },
            },
          },
        },
      },
      summary_artifact_interface: {
        type: "object",
        additionalProperties: false,
        required: ["producer", "consumers", "path", "required_variables", "required_statistics"],
        properties: {
          producer: { type: "string", description: "Project-relative .do file that exclusively produces the canonical summary dataset." },
          consumers: { type: "array", items: { type: "string" }, uniqueItems: true, minItems: 1, maxItems: 30, description: "Project-relative table and figure .do files that all read the same summary dataset." },
          path: { type: "string", description: "Project-relative canonical .dta artifact path shared by every consumer." },
          required_variables: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true, minItems: 1, maxItems: 500 },
          required_statistics: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true, minItems: 1, maxItems: 100 },
        },
      },
      requested_checkpoints: { type: "array", items: { $ref: "#/$defs/checkpoint" }, uniqueItems: true, maxItems: 30 },
      requested_substeps: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["checkpoint", "substep_id", "match"], properties: {
        checkpoint: { $ref: "#/$defs/checkpoint" },
        substep_id: { type: "string", minLength: 1 },
        description: { type: "string" },
        match: { type: "object", additionalProperties: false, properties: {
          checkpoints: { type: "array", items: { $ref: "#/$defs/checkpoint" }, uniqueItems: true },
          searched_checkpoints: { type: "array", items: { $ref: "#/$defs/checkpoint" }, uniqueItems: true },
          commands: { type: "array", items: { type: "string" }, uniqueItems: true },
          tokens: { type: "array", items: { type: "string" }, uniqueItems: true },
          label_ids: { type: "array", items: { type: "string" }, uniqueItems: true },
          query: { type: "string" },
        } },
      } } },
      available_state: { type: "object", additionalProperties: true, properties: {
        estimate_state: { type: "string", enum: ["ster", "stored_in_memory", "active_eclass", "keyed_sample_dta", "unknown"] },
        output_path: { type: "string" },
        output_flow_profile: { type: "object", additionalProperties: true, description: "Outcome lineage, semantic sheet_groups, and physical sheet_plan. Each sheet_group decision_source is user, existing_project, model_from_metadata, or caller_declared; common aliases user_contract, explicit_user_request, and semantic_definition are normalized. A documented object may put the value in source, type, or kind." },
        event_study_axis_profile: { type: "object", additionalProperties: true, description: "Independent axis plan. The opt-in single_flat_mixed_axis_loop mode requires exactly one fixed_group plus automatic complement groups and an explicit mixed_loop_binding to one flat outcome loop." },
        input_signature: { type: "object", additionalProperties: true },
        workflow_incompatibility: { type: "object", additionalProperties: false, properties: {
          confirmed: { type: "boolean" },
          evidence: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 10 },
        } },
        notes: { type: "string" },
      } },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "template_reuse_check",
    description: "Verify a project-declared template provenance manifest against the current labeled dictionary. By default, a matching template that was not selected is reported as an advisory; a general_rule template-mismatch row records the rank-relative nearest hint, template status, and hint used without asserting compatibility. Legacy native_substep and template_mismatch_fallback values are accepted for read compatibility. Set enforce_template_reuse only for an explicit strict benchmark. Schema 2.0 still verifies live source hashes, target-bound general-rule code, full-project lint/loop/TeX policy, structural retention, and approved program bodies. This is a static provenance check, not runtime or substantive certification.",
    inputSchema: { type: "object", additionalProperties: false, required: ["path", "manifest_path"], $defs: {
      checkpoint: { type: "string", enum: CHECKPOINTS },
    }, properties: {
      path: { type: "string" },
      manifest_path: { type: "string" },
      required_headwords: { type: "array", items: { $ref: "#/$defs/checkpoint" }, uniqueItems: true, maxItems: 35 },
      allow_native_headwords: { type: "array", items: { $ref: "#/$defs/checkpoint" }, uniqueItems: true, maxItems: 35 },
      enforce_template_reuse: { type: "boolean", default: false },
      min_command_retention: { type: "number", minimum: 0.75, maximum: 1 },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workflow_blueprint",
    description: "Build a read-only Stata workflow plan. The default-style tree applies only to a new first build; existing projects preserve compatible structure. Returns a display-ready file tree, root-README outline, planned persistent-variable dictionary, and mandatory pre-write approval contract.",
    inputSchema: { type: "object", additionalProperties: false, properties: {
      analysis_type: { type: "string" }, data_shape: { type: "string" }, project_size: { type: "string", enum: ["small", "medium", "large"] }, project_mode: { type: "string", enum: ["new", "existing"] }, new_project_confirmed: { type: "boolean" }, outputs: { type: "array", items: { type: "string" } }, expected_stages: { type: "array", items: { type: "string", enum: STAGES }, uniqueItems: true }, planned_variables: { type: "array", items: PLANNED_VARIABLE_SCHEMA, uniqueItems: true, maxItems: 500 }, no_new_persistent_variables: { type: "boolean" },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "lint_do_file",
    description: "Statically lint one Stata do-file or inline code. role describes the file; authoring_state controls whether new master file-contract comments, local-macro scope, and zero-depth regression readability are blocking, modified-file findings are advisory, or existing code is audited without retroactive house-style enforcement.",
    inputSchema: { type: "object", additionalProperties: false, properties: { path: { type: "string" }, content: { type: "string" }, role: { type: "string" }, authoring_state: { type: "string", enum: ["new", "modified", "existing_audit"] } }, oneOf: [{ required: ["path"] }, { required: ["content"] }] },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "audit_stata_project",
    description: "Audit the active reachable Stata workflow by default, keeping inactive discoveries informational. Use scope.mode=all for an explicit repository-wide audit. Static findings, optional e(b) estimability readback, and substantive-validity status remain separate. report_policy can be required, optional, or explicitly disabled.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["path"],
      properties: {
        path: { type: "string" },
        strict_structure: { type: "boolean" },
        require_report: { type: "boolean", description: "Legacy alias for report_policy=required." },
        report_policy: { type: "string", enum: ["required", "optional", "disabled"] },
        expected_stages: { type: "array", items: { type: "string", enum: STAGES }, uniqueItems: true },
        scope: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { type: "string", enum: ["reachable", "all"], description: "reachable is the active-workflow default; all explicitly promotes every discovered non-excluded do-file." },
            entrypoints: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 20, description: "Project-relative explicit roots. Required to select an active workflow when multiple top-level masters are plausible." },
            include_paths: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 100, description: "Project-relative files or directories promoted into reachable scope." },
            exclude_paths: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 100, description: "Project-relative files or directories pruned before discovery limits and call-graph construction." },
          },
        },
        authored_spans: {
          type: "array",
          uniqueItems: true,
          maxItems: 200,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["target", "lines"],
            properties: {
              target: { type: "string" },
              lines: { type: "string", pattern: "^[1-9][0-9]*-[1-9][0-9]*$" },
            },
          },
        },
        estimability_readback: {
          type: "object",
          additionalProperties: false,
          required: ["models"],
          properties: {
            models: {
              type: "array",
              maxItems: 500,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["model_id", "declared_nonreference_terms", "observed_eb_terms"],
                properties: {
                  model_id: { type: "string" },
                  declared_nonreference_terms: { type: "array", minItems: 1, items: { type: "string" }, uniqueItems: true },
                  declared_reference_terms: { type: "array", items: { type: "string" }, uniqueItems: true },
                  observed_eb_terms: { type: "array", items: { type: "string" }, uniqueItems: true },
                },
              },
            },
          },
        },
      },
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "workflow_reproduction_check",
    description: "Check whether an independently authored Stata project reproduces a declared semantic workflow contract: entrypoint, stages, call graph, required files, deliverable counts, canonical summary datasets shared by tables and figures, and optional estimation tokens. It does not use source-code similarity as a success criterion and does not replace runtime or numerical validation.",
    inputSchema: { type: "object", additionalProperties: false, required: ["path", "contract"], properties: {
      path: { type: "string" },
      contract: { type: "object", additionalProperties: true },
    } },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "research_output_check",
    description: "Verify an approved Stata research workflow's selected report_policy, static audit, entrypoint, optional researcher-facing README tree and variable descriptions, actual log when supplied, exact deliverable counts, JSON validity, and direct SHA-256 evidence. Under report_policy=required, report.md maps each template and substantive general_rule span to actual one-based .do-file ranges or explicitly states that neither was used; optional permits omission and disabled forbids creating or modifying it. Runtime, static, and substantive statuses remain separate. It does not manage dependencies or assess deployment or submission packaging.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["path", "deliverables"],
      properties: {
        path: { type: "string" },
        deliverables: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pattern", "expected_count"],
            properties: {
              pattern: { type: "string" },
              expected_count: { type: "integer", minimum: 0 },
              description: { type: "string" },
            },
          },
        },
        main_log: { type: "string" },
        completion_marker: { type: "string" },
        strict_structure: { type: "boolean" },
        report_policy: { type: "string", enum: ["required", "optional", "disabled"] },
        scope: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: { type: "string", enum: ["reachable", "all"], description: "reachable is the active-workflow default; all explicitly promotes every discovered non-excluded do-file." },
            entrypoints: { type: "array", items: { type: "string" }, uniqueItems: true, description: "Project-relative explicit roots. Required to select an active workflow when multiple top-level masters are plausible." },
            include_paths: { type: "array", items: { type: "string" }, uniqueItems: true, description: "Project-relative files or directories promoted into reachable scope." },
            exclude_paths: { type: "array", items: { type: "string" }, uniqueItems: true, description: "Project-relative files or directories pruned before discovery limits and call-graph construction." },
          },
        },
        authored_spans: {
          type: "array",
          uniqueItems: true,
          maxItems: 200,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["target", "lines"],
            properties: {
              target: { type: "string" },
              lines: { type: "string", pattern: "^[1-9][0-9]*-[1-9][0-9]*$" },
            },
          },
        },
        estimability_readback: { type: "object", additionalProperties: true },
        expected_stages: { type: "array", items: { type: "string", enum: STAGES }, uniqueItems: true },
        planned_variables: { type: "array", items: PLANNED_VARIABLE_SCHEMA, uniqueItems: true, maxItems: 500 },
        expected_tree_paths: { type: "array", items: { type: "string" }, uniqueItems: true, maxItems: 300 },
      },
    },
    outputSchema: { type: "object", additionalProperties: true },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

async function dispatch(method, params) {
  if (method === "initialize") return { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "stata-research-guard", version: "0.2.0" }, instructions: INSTRUCTIONS };
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    try {
      if (name === "resolve_transition_evidence") return resolveTransitionEvidence(args);
      if (name === "inspect_top100_command_examples") return inspectTop100CommandExamples(args);
      if (name === "search_stata_manual") return searchManual(args);
      if (name === "get_verified_stata_examples") return getVerifiedExamples(args);
      if (name === "search_approved_patterns") return searchApproved(args);
      if (name === "search_labeled_checkpoints") return searchLabeledCheckpoints(args);
      if (name === "inspect_dictionary_coverage") return inspectDictionaryCoverage(args);
      if (name === "plan_dictionary_repairs") return planDictionaryRepairs(args);
      if (name === "template_reuse_check") return templateReuseCheck(args, {
        labels: LABELED_CHECKPOINTS,
        packages: PACKAGES,
        dictionaryPath: path.join(DATA, "workflow_block_dictionary.json"),
        lintContent,
      });
      if (name === "workflow_blueprint") return workflowBlueprint(args);
      if (name === "lint_do_file") {
        const input = readDoInput(args);
        return lintContent(input.content, args.role || "auto", input.source, args.authoring_state || null);
      }
      if (name === "audit_stata_project") return auditProject(args);
      if (name === "workflow_reproduction_check") return workflowReproductionCheck(args);
      if (name === "research_output_check") return researchOutputCheck(args);
      throw new Error(`알 수 없는 도구: ${name}`);
    } catch (error) {
      return { __toolError: true, message: error.message };
    }
  }
  throw new Error(`Method not found: ${method}`);
}

function send(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

if (require.main === module) {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", async (line) => {
    if (!line.trim()) return;
    let request;
    try {
      request = JSON.parse(line);
    } catch (error) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    if (request.id === undefined) return;
    try {
      const result = await dispatch(request.method, request.params || {});
      if (result?.__toolError) send({ jsonrpc: "2.0", id: request.id, result: fail(result.message) });
      else if (request.method === "tools/call") send({ jsonrpc: "2.0", id: request.id, result: asText(result) });
      else send({ jsonrpc: "2.0", id: request.id, result });
    } catch (error) {
      send({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: error.message } });
    }
  });
}

module.exports = {
  MATERIAL_ALTERNATIVE_LIMIT,
  assessTransitionAtomicity,
  dispatch,
  filterEvidenceCards,
  rubricAutoSelectable,
  resolveTransitionEvidence,
};
