"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DATA_ROOT = path.join(PLUGIN_ROOT, "data");
const REGISTRY_PATH = path.join(DATA_ROOT, "command_registry.json");
const MANUAL_INDEX_PATH = path.join(DATA_ROOT, "manual_index.jsonl");
const OFFICIAL_EXAMPLES_PATH = path.join(DATA_ROOT, "official_examples.json");
const WEB_SOURCES_PATH = path.join(DATA_ROOT, "official_web_sources.json");
const COMMAND_SOURCES_PATH = path.join(DATA_ROOT, "command_sources.json");
const FULL_COMMAND_GUIDES_PATH = path.join(DATA_ROOT, "full_command_guides.json");
const PAPER_USAGE_PATH = path.join(DATA_ROOT, "paper_usage_occurrences.jsonl");
const PAPER_USAGE_INDEX_PATH = path.join(DATA_ROOT, "command_paper_index.json");
const HIGH_QUALITY_PAPER_BLOCKS_PATH = path.join(DATA_ROOT, "high_quality_paper_blocks.jsonl");
const PAPER_REVIEW_SUMMARY_PATH = path.join(DATA_ROOT, "paper_review_summary.json");
const PAPER_REVIEW_INTEGRITY_AUDIT_PATH = path.join(DATA_ROOT, "paper_review_integrity_audit.json");
const GENERAL_RULES_PATH = path.join(
  PLUGIN_ROOT,
  "skills",
  "stata-replication-workflow",
  "references",
  "general-rules.md",
);
const GENERAL_RULES_SOURCE_PATH = "plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md";
const FORMATTER_PATH = path.join(
  PLUGIN_ROOT,
  "annotations",
  "source_snapshots",
  "default_style_outreg2_xlsx.do",
);

const FORBIDDEN_RESPONSE_KEYS = new Set([
  "winner",
  "score",
  "pass",
  "fail",
  "auto_select",
  "auto_selectable",
  "promotion_status",
  "approved_for_generation",
  "generation_authority",
  "selection_required",
  "split_required",
  "general_rule",
  "recommended",
  "recommendation",
]);

const MAX_PROJECT_FILES = 1000;
const MAX_PROJECT_OBSERVATIONS = 500;
const MAX_EXAMPLE_CHARS = 2600;

function readJson(file) {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file)));
}

function readJsonl(file) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path.basename(file)}:${index + 1}: ${error.message}`);
    }
  });
}

const registry = readJson(REGISTRY_PATH);
const manualIndex = readJsonl(MANUAL_INDEX_PATH);
const officialExamples = readJson(OFFICIAL_EXAMPLES_PATH);
const webSources = readJson(WEB_SOURCES_PATH);
const commandSources = readJson(COMMAND_SOURCES_PATH).sources;
const fullCommandGuideIndex = readJson(FULL_COMMAND_GUIDES_PATH);
const paperUsageFileAvailable = fs.existsSync(PAPER_USAGE_PATH);
const paperUsageIndexFileAvailable = fs.existsSync(PAPER_USAGE_INDEX_PATH);
const highQualityPaperBlocksFileAvailable = fs.existsSync(HIGH_QUALITY_PAPER_BLOCKS_PATH);
const paperReviewSummaryFileAvailable = fs.existsSync(PAPER_REVIEW_SUMMARY_PATH);
const paperReviewIntegrityAuditFileAvailable = fs.existsSync(PAPER_REVIEW_INTEGRITY_AUDIT_PATH);
const paperBundleAvailability = [
  paperUsageFileAvailable,
  paperUsageIndexFileAvailable,
  highQualityPaperBlocksFileAvailable,
  paperReviewSummaryFileAvailable,
  paperReviewIntegrityAuditFileAvailable,
];
if (paperBundleAvailability.some(Boolean) && !paperBundleAvailability.every(Boolean)) {
  throw new Error("reviewed paper occurrence, index, high-quality block, summary, and integrity-audit files must be installed together");
}
const paperUsageOccurrences = paperUsageFileAvailable ? readJsonl(PAPER_USAGE_PATH) : [];
const paperUsageIndex = paperUsageFileAvailable ? readJson(PAPER_USAGE_INDEX_PATH) : null;
const highQualityPaperBlocks = paperUsageFileAvailable ? readJsonl(HIGH_QUALITY_PAPER_BLOCKS_PATH) : [];
const paperReviewSummary = paperUsageFileAvailable ? readJson(PAPER_REVIEW_SUMMARY_PATH) : null;
const paperReviewIntegrityAudit = paperUsageFileAvailable ? readJson(PAPER_REVIEW_INTEGRITY_AUDIT_PATH) : null;

const familiesById = new Map(registry.families.map((family) => [family.family_id, family]));
const commandsByName = new Map(registry.commands.map((command) => [command.command, command]));

function dataFile(relative, label) {
  if (typeof relative !== "string" || !relative.trim()) {
    throw new Error(`${label} must be a non-empty data-relative path`);
  }
  const target = path.resolve(DATA_ROOT, ...relative.replaceAll("\\", "/").split("/"));
  if (!isInside(DATA_ROOT, target) || target === path.resolve(DATA_ROOT)) {
    throw new Error(`${label} escapes the plugin data directory`);
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`${label} points to a missing guide file`);
  }
  return target;
}

function buildFullCommandGuidesByCommand(indexPayload) {
  if (!indexPayload || indexPayload.schema_version !== "1.0" || !Array.isArray(indexPayload.guides)) {
    throw new Error("full_command_guides.json has an unexpected schema");
  }
  const byCommand = new Map();
  for (const entry of indexPayload.guides) {
    if (!entry || entry.record_type !== "full_command_guide" || !commandsByName.has(entry.command)) {
      throw new Error("full_command_guides.json contains a noncanonical guide");
    }
    if (byCommand.has(entry.command)) {
      throw new Error(`full_command_guides.json contains a duplicate guide for ${entry.command}`);
    }
    if (entry.authority !== "StataCorp official" && entry.authority !== "maintainer or package documentation") {
      throw new Error(`full_command_guides.json has an invalid authority for ${entry.command}`);
    }
    if (typeof entry.source_url !== "string" || !entry.source_url.startsWith("https://")) {
      throw new Error(`full_command_guides.json has an invalid source_url for ${entry.command}`);
    }
    if (entry.content_format !== "markdown" || entry.complete !== true) {
      throw new Error(`full_command_guides.json must declare complete Markdown for ${entry.command}`);
    }
    const sourcePath = dataFile(entry.source_file, `${entry.command} source_file`);
    const contentPath = dataFile(entry.content_file, `${entry.command} content_file`);
    if (sha256File(sourcePath) !== entry.source_sha256) {
      throw new Error(`full command guide source hash mismatch for ${entry.command}`);
    }
    if (sha256File(contentPath) !== entry.content_sha256) {
      throw new Error(`full command guide content hash mismatch for ${entry.command}`);
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(contentPath));
    if (!content.trim()) throw new Error(`full command guide content is empty for ${entry.command}`);
    byCommand.set(entry.command, { ...entry, content });
  }
  return byCommand;
}

const fullCommandGuidesByCommand = buildFullCommandGuidesByCommand(fullCommandGuideIndex);

function buildPaperUsageByCommand(indexPayload, occurrenceRows, occurrenceFileHash) {
  if (indexPayload === null) {
    if (occurrenceRows.length !== 0 || occurrenceFileHash !== null) {
      throw new Error("paper usage occurrence and index data must be supplied together");
    }
    return new Map(registry.commands.map((command) => [command.command, []]));
  }
  if (indexPayload.record_type !== "reviewed_command_paper_occurrence_index") {
    throw new Error("command_paper_index.json has an unexpected record_type");
  }
  if (indexPayload.registry_command_count !== registry.commands.length) {
    throw new Error("command_paper_index.json registry_command_count does not match command_registry.json");
  }
  if (indexPayload.occurrence_file !== path.basename(PAPER_USAGE_PATH)) {
    throw new Error("command_paper_index.json points to an unexpected occurrence file");
  }
  if (indexPayload.occurrence_file_sha256 !== occurrenceFileHash) {
    throw new Error("paper_usage_occurrences.jsonl does not match command_paper_index.json");
  }
  if (!Array.isArray(indexPayload.commands)) {
    throw new Error("command_paper_index.json commands must be an array");
  }

  const occurrencesById = new Map();
  for (const row of occurrenceRows) {
    if (!row || row.record_type !== "paper_usage_occurrence" || !commandsByName.has(row.command)) {
      throw new Error("paper_usage_occurrences.jsonl contains a noncanonical occurrence");
    }
    if (typeof row.occurrence_id !== "string" || occurrencesById.has(row.occurrence_id)) {
      throw new Error("paper_usage_occurrences.jsonl contains a missing or duplicate occurrence_id");
    }
    occurrencesById.set(row.occurrence_id, row);
  }

  const byCommand = new Map();
  const linkedOccurrenceIds = new Set();
  for (const entry of indexPayload.commands) {
    if (!entry || !commandsByName.has(entry.command) || byCommand.has(entry.command)) {
      throw new Error("command_paper_index.json contains a missing, duplicate, or noncanonical command");
    }
    if (!Array.isArray(entry.occurrence_ids)) {
      throw new Error(`command_paper_index.json occurrence_ids must be an array for ${entry.command}`);
    }
    const rows = entry.occurrence_ids.map((occurrenceId) => {
      const row = occurrencesById.get(occurrenceId);
      if (!row || row.command !== entry.command || linkedOccurrenceIds.has(occurrenceId)) {
        throw new Error(`command_paper_index.json has an invalid occurrence link for ${entry.command}`);
      }
      linkedOccurrenceIds.add(occurrenceId);
      return row;
    });
    if (rows.length !== entry.paper_occurrence_count || entry.guide_only_fallback !== (rows.length === 0)) {
      throw new Error(`command_paper_index.json count or fallback mismatch for ${entry.command}`);
    }
    byCommand.set(entry.command, rows);
  }

  if (byCommand.size !== commandsByName.size || linkedOccurrenceIds.size !== occurrenceRows.length) {
    throw new Error("paper occurrence index does not cover the complete command dictionary and occurrence file");
  }
  return byCommand;
}

function buildHighQualityPaperBlocksByCommand(summaryPayload, auditPayload, blockRows, occurrenceRows, hashes = {}) {
  if (summaryPayload === null) {
    if (auditPayload !== null || blockRows.length !== 0 || occurrenceRows.length !== 0 || Object.values(hashes).some(Boolean)) {
      throw new Error("reviewed paper blocks and review summary must be supplied together");
    }
    return new Map(registry.commands.map((command) => [command.command, []]));
  }
  if (summaryPayload.record_type !== "manual_paper_occurrence_review_summary") {
    throw new Error("paper_review_summary.json has an unexpected record_type");
  }
  if (
    !auditPayload
    || auditPayload.record_type !== "final_output_integrity_audit"
    || auditPayload.pass !== true
    || !Array.isArray(auditPayload.errors)
    || auditPayload.errors.length !== 0
  ) {
    throw new Error("paper_review_integrity_audit.json is not a passing final audit");
  }
  const counts = summaryPayload.counts || {};
  const summaryHashes = summaryPayload.hashes || {};
  const inputHashes = summaryPayload.input_hashes || {};
  const validation = summaryPayload.validation || {};
  if (
    counts.registry_command_count !== registry.commands.length
    || counts.include_count !== occurrenceRows.length
    || counts.reviewed_index_link_count !== occurrenceRows.length
    || counts.high_quality_block_count !== blockRows.length
  ) {
    throw new Error("paper_review_summary.json counts do not match the installed reviewed paper bundle");
  }
  if (
    summaryHashes["reviewed_paper_usage_occurrences.jsonl"] !== hashes.occurrences
    || summaryHashes["reviewed_command_paper_index.json"] !== hashes.index
    || summaryHashes["high_quality_paper_blocks.jsonl"] !== hashes.blocks
    || inputHashes["command_registry.json"] !== hashes.registry
  ) {
    throw new Error("paper_review_summary.json hashes do not match the installed reviewed paper bundle");
  }
  for (const key of [
    "review_id_set_matches_original",
    "include_rows_object_identical_to_original",
    "reviewed_index_commands_match_registry",
    "reviewed_index_links_only_include_occurrences",
    "non_outreg2_include_anchors_covered_once_by_high_quality_blocks",
    "high_quality_block_source_spans_and_hashes_read_back",
  ]) {
    if (validation[key] !== true) throw new Error(`paper_review_summary.json validation is not locked: ${key}`);
  }
  const auditCounts = auditPayload.counts || {};
  const auditHashes = auditPayload.hashes || {};
  const auditChecks = auditPayload.checks || {};
  if (
    auditCounts.include_count !== occurrenceRows.length
    || auditCounts.reviewed_index_link_count !== occurrenceRows.length
    || auditCounts.registry_command_count !== registry.commands.length
    || auditCounts.high_quality_block_count !== blockRows.length
    || auditHashes["reviewed_paper_usage_occurrences.jsonl"] !== hashes.occurrences
    || auditHashes["reviewed_command_paper_index.json"] !== hashes.index
    || auditHashes["high_quality_paper_blocks.jsonl"] !== hashes.blocks
    || auditHashes["review_summary.json"] !== hashes.summary
  ) {
    throw new Error("paper_review_integrity_audit.json does not match the installed reviewed paper bundle");
  }
  for (const key of [
    "non_outreg2_include_anchor_exact_once",
    "independent_decision_audit_count",
    "independent_block_boundary_audit_count",
    "summary_counts_exact",
    "summary_validation_flags",
    "block_target_span_records_readback",
    "outreg2_unlinked_target_spans_are_explicit_source_spans",
    "outreg2_target_occurrence_link_consistency",
  ]) {
    if (auditChecks[key] !== true) throw new Error(`paper_review_integrity_audit.json check is not locked: ${key}`);
  }

  const occurrencesById = new Map(occurrenceRows.map((row) => [row.occurrence_id, row]));
  const byCommand = new Map(registry.commands.map((command) => [command.command, []]));
  const blockIds = new Set();
  for (const block of blockRows) {
    if (
      !block
      || block.evidence_role !== "high_quality_example"
      || !commandsByName.has(block.focus_command)
      || typeof block.block_id !== "string"
      || blockIds.has(block.block_id)
    ) {
      throw new Error("high_quality_paper_blocks.jsonl contains a noncanonical or duplicate block");
    }
    if (
      typeof block.block_code !== "string"
      || !block.block_code.trim()
      || crypto.createHash("sha256").update(block.block_code).digest("hex") !== block.block_code_sha256
    ) {
      throw new Error(`high-quality paper block code hash mismatch for ${block.block_id}`);
    }
    if (
      typeof block.source_path !== "string"
      || !/^[0-9a-f]{64}$/.test(block.source_file_sha256)
      || !Number.isInteger(block.block_span_start)
      || !Number.isInteger(block.block_span_end)
      || block.block_span_start < 1
      || block.block_span_end < block.block_span_start
      || !Array.isArray(block.target_occurrence_ids)
      || !Array.isArray(block.target_spans)
      || block.target_spans.length === 0
      || typeof block.what_this_example_shows !== "string"
      || typeof block.do_not_carry_over !== "string"
    ) {
      throw new Error(`high-quality paper block metadata is incomplete for ${block.block_id}`);
    }
    const targetIds = new Set(block.target_occurrence_ids);
    if (targetIds.size !== block.target_occurrence_ids.length) {
      throw new Error(`high-quality paper block repeats a target occurrence for ${block.block_id}`);
    }
    for (const occurrenceId of targetIds) {
      const occurrence = occurrencesById.get(occurrenceId);
      if (!occurrence || occurrence.command !== block.focus_command) {
        throw new Error(`high-quality paper block has an invalid target occurrence for ${block.block_id}`);
      }
    }
    for (const span of block.target_spans) {
      if (
        !span
        || !Number.isInteger(span.span_start)
        || !Number.isInteger(span.span_end)
        || span.span_start < block.block_span_start
        || span.span_end > block.block_span_end
        || span.span_end < span.span_start
        || (span.occurrence_id !== null && !targetIds.has(span.occurrence_id))
      ) {
        throw new Error(`high-quality paper block has an invalid target span for ${block.block_id}`);
      }
    }
    blockIds.add(block.block_id);
    byCommand.get(block.focus_command).push(block);
  }
  const blockCommands = new Set(blockRows.map((block) => block.focus_command));
  const occurrenceCommands = new Set(occurrenceRows.map((row) => row.command));
  if (
    blockCommands.size !== counts.high_quality_block_distinct_command_count
    || blockCommands.size !== counts.include_distinct_command_count
    || blockCommands.size !== occurrenceCommands.size
    || [...blockCommands].some((command) => !occurrenceCommands.has(command))
  ) {
    throw new Error("high-quality paper block command coverage does not match reviewed occurrences");
  }
  return byCommand;
}

const paperUsageByCommand = buildPaperUsageByCommand(
  paperUsageIndex,
  paperUsageOccurrences,
  paperUsageFileAvailable ? sha256File(PAPER_USAGE_PATH) : null,
);

const highQualityPaperBlocksByCommand = buildHighQualityPaperBlocksByCommand(
  paperReviewSummary,
  paperReviewIntegrityAudit,
  highQualityPaperBlocks,
  paperUsageOccurrences,
  paperUsageFileAvailable ? {
    occurrences: sha256File(PAPER_USAGE_PATH),
    index: sha256File(PAPER_USAGE_INDEX_PATH),
    blocks: sha256File(HIGH_QUALITY_PAPER_BLOCKS_PATH),
    summary: sha256File(PAPER_REVIEW_SUMMARY_PATH),
    registry: sha256File(REGISTRY_PATH),
  } : {},
);

function paperUsageRowsFor(command) {
  return paperUsageByCommand.get(command) || [];
}

function highQualityPaperBlocksFor(command) {
  return highQualityPaperBlocksByCommand.get(command) || [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))];
}

function commandInvocation(command) {
  const special = {
    collect_export: "collect export",
    collect_get: "collect get",
    collect_style: "collect style",
    export_delimited: "export delimited",
    export_excel: "export excel",
    graph_bar: "graph bar",
    import_delimited: "import delimited",
    import_excel: "import excel",
  };
  return special[command] || command;
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function manualRowsFor(command) {
  return manualIndex.filter((row) => Array.isArray(row.commands) && row.commands.includes(command));
}

function fullCommandGuidesFor(commands) {
  return commands.flatMap((command) => {
    const guide = fullCommandGuidesByCommand.get(command);
    return guide ? [guide] : [];
  });
}

function sourceCardsFor(command) {
  const cards = [];
  const seen = new Set();
  for (const row of fullCommandGuidesFor([command])) {
    seen.add(`${row.source_url}|`);
    cards.push({
      authority: row.authority,
      source_url: row.source_url,
      page_or_section: "complete help",
      source_kind: row.source_kind,
      source_version: row.source_version,
      source_commit: row.source_commit,
      source_hash: row.source_sha256,
      full_content_available: true,
    });
  }
  for (const row of manualRowsFor(command)) {
    const key = `${row.source_url}|${row.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority === "community" ? "maintainer or package documentation" : "StataCorp official",
      source_url: row.source_url,
      page_or_section: row.page ? `page ${row.page}` : null,
      source_file: row.source_file,
      source_hash: row.file_sha256,
    });
    if (cards.length >= 2) break;
  }
  for (const row of webSources.filter((source) => source.command === command)) {
    const key = `${row.source_url}|`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority === "official" ? "StataCorp official" : "maintainer or package documentation",
      source_url: row.source_url,
      page_or_section: null,
      verified_on: row.verified_on || null,
    });
  }
  for (const row of commandSources.filter((source) => source.command === command)) {
    const key = `${row.source_url}|`;
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push({
      authority: row.authority,
      source_url: row.source_url,
      page_or_section: row.page_or_section || null,
      source_kind: row.source_kind,
    });
  }
  return cards;
}

function paperUsageCardsFor(selectedCommands, blocks = null, rows = null) {
  const selected = new Set(selectedCommands);
  const selectedBlocks = blocks === null
    ? selectedCommands.flatMap((command) => highQualityPaperBlocksFor(command))
    : blocks;
  const occurrenceRows = rows === null ? paperUsageOccurrences : rows;
  const occurrencesById = new Map(occurrenceRows.map((row) => [row.occurrence_id, row]));
  return selectedBlocks
    .filter((block) => block && typeof block === "object" && selected.has(block.focus_command))
    .map((block) => ({
      command: block.focus_command,
      evidence_role: "high_quality_example",
      usage_instruction: {
        template_status: "not_a_template",
        follow_current_selected_commands: true,
        preserve_current_research_and_output_choices: true,
        adapt_the_focus_command_region_when_useful: true,
      },
      source_role: {
        focus_command: block.focus_command,
        surrounding_code: "reference_context",
        owns_other_command_choices: false,
      },
      example: block,
      linked_target_occurrences: block.target_occurrence_ids.map((occurrenceId) => occurrencesById.get(occurrenceId)),
    }));
}

function formatterCard() {
  if (!fs.existsSync(FORMATTER_PATH)) return null;
  return {
    artifact: "outreg2_xlsx",
    related_command: "outreg2",
    invocation: "outreg2_xlsx, estimates() workbook() sheet() adjdec() meandec()",
    role: "approved multi-sheet formatter",
    required_input_state: [
      "the caller has already chosen and stored the estimates",
      "the caller has already chosen workbook and worksheet placement",
    ],
    output_interface: ["one named worksheet in an .xlsx workbook"],
    boundaries: [
      "does not choose or replace the estimator, outcome, sample, specification, or worksheet grouping",
      "use direct outreg2 for a one-sheet .xls table",
    ],
    source_path: "annotations/source_snapshots/default_style_outreg2_xlsx.do",
    source_hash: sha256File(FORMATTER_PATH),
  };
}

function relatedArtifactsFor(selectedCommands) {
  if (!selectedCommands.includes("outreg2")) return [];
  const formatter = formatterCard();
  return formatter ? [formatter] : [];
}

function commandCard(commandName, paperBlocks = null) {
  const command = commandsByName.get(commandName);
  if (!command) return null;
  const family = familiesById.get(command.family_id) || {};
  const readableSourceAvailable = manualRowsFor(command.command).length > 0
    || fullCommandGuidesByCommand.has(command.command);
  const paperAvailable = paperBlocks === null
    ? highQualityPaperBlocksFor(command.command).length > 0
    : paperBlocks.some((block) => block?.focus_command === command.command);
  return {
    command: command.command,
    invocation: commandInvocation(command.command),
    package: family.display_name || command.family_id,
    aliases: command.aliases || [],
    functional_labels: unique([family.category, ...(command.stages || [])]),
    supported_features: unique([family.display_name, family.category, ...(command.stages || []), ...(family.features || [])]),
    required_input_state: command.required_input_state || [],
    output_interface: command.output_interface || [],
    tradeoffs_and_incompatibilities: command.tradeoffs_and_incompatibilities || [],
    authority_sources: sourceCardsFor(command.command),
    evidence_mode: paperAvailable ? "guide_and_paper_context" : "guide_only_fallback",
    evidence_gaps: unique([
      ...(!readableSourceAvailable ? ["readable local authoritative example unavailable"] : []),
      ...(!(command.required_input_state || []).length ? ["required input state not summarized in the registry; read the authoritative source"] : []),
      ...(!(command.output_interface || []).length ? ["returned state or output interface not summarized in the registry; read the authoritative source"] : []),
      ...(!(command.tradeoffs_and_incompatibilities || []).length ? ["tradeoffs and incompatibilities not summarized in the registry; read the authoritative source"] : []),
    ]),
  };
}

function excerpt(text, limit = MAX_EXAMPLE_CHARS) {
  const clean = String(text || "").replace(/\u0000/g, "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trimEnd()}…`;
}

function anchoredExcerpt(text, command) {
  const lines = String(text || "").replace(/\u0000/g, "").split(/\r?\n/);
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const invocation = new RegExp(`^\\s*\\.?\\s*${escaped}(?:\\s|,)`, "i");
  const anchor = lines.findIndex((line) => invocation.test(line));
  if (anchor < 0) return excerpt(text);
  return excerpt(lines.slice(Math.max(0, anchor - 2), anchor + 19).join("\n"));
}

function manualSyntaxRow(command) {
  const invocation = commandInvocation(command);
  const escaped = invocation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const syntaxLine = new RegExp(`^\\s*\\.?\\s*${escaped}(?:\\s|,)`, "im");
  const rows = manualRowsFor(command);
  return rows.find((row) => {
    const content = String(row.content || "");
    return /(?:^|\n)[^\n]{0,80}\b(?:syntax|synopsis)\b/im.test(content) && syntaxLine.test(content);
  }) || rows.find((row) => syntaxLine.test(String(row.content || ""))) || rows[0];
}

function examplesFor(commands) {
  const output = [];
  for (const command of commands) {
    const manual = manualSyntaxRow(command);
    if (manual) {
      output.push({
        command,
        authority: manual.authority === "community" ? "maintainer or package documentation" : "StataCorp official",
        example_kind: "readable documentation excerpt",
        binding: "nonbinding",
        source_url: manual.source_url,
        page_or_section: manual.page ? `page ${manual.page}` : null,
        source_file: manual.source_file,
        source_hash: manual.file_sha256,
        excerpt: anchoredExcerpt(manual.content, commandInvocation(command)),
      });
    }
    const fixture = officialExamples.find((row) => row.command === command);
    if (fixture) {
      output.push({
        command,
        authority: fixture.authority === "official" ? "StataCorp official source" : fixture.authority,
        example_kind: fixture.example_origin,
        binding: "nonbinding document-derived fixture",
        verbatim: Boolean(fixture.verbatim),
        source_url: fixture.source_url,
        page_or_section: fixture.page ? `page ${fixture.page}` : null,
        source_file: fixture.source_file,
        derivation: fixture.derivation,
        code: fixture.code,
      });
    }
  }
  return output;
}

function isInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function resolveProjectRoot(projectPath) {
  const resolved = path.resolve(projectPath);
  const real = fs.realpathSync(resolved);
  if (!fs.statSync(real).isDirectory()) throw new Error("project_path must resolve to a directory");
  return real;
}

function resolveExistingInside(root, relative) {
  if (typeof relative !== "string" || !relative.trim()) throw new Error("target_files entries must be non-empty strings");
  if (path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) throw new Error(`target file must be project-relative: ${relative}`);
  const lexical = path.resolve(root, relative);
  if (!isInside(root, lexical)) throw new Error(`target file escapes project_path: ${relative}`);
  const real = fs.realpathSync(lexical);
  if (!isInside(root, real)) throw new Error(`target file resolves outside project_path: ${relative}`);
  if (!fs.statSync(real).isFile()) throw new Error(`target is not a file: ${relative}`);
  return real;
}

function listDoFiles(root) {
  const output = [];
  const excluded = new Set([".git", "node_modules", "cache", "tmp"]);
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (output.length >= MAX_PROJECT_FILES) return;
      if (entry.isSymbolicLink()) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name.toLowerCase())) walk(target);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".do")) {
        output.push(target);
      }
    }
  }
  walk(root);
  return output;
}

function logicalStatements(text) {
  const lines = text.split(/\r?\n/);
  const statements = [];
  let inBlockComment = false;
  let buffer = "";
  let startLine = null;
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    let visible = "";
    for (let position = 0; position < line.length;) {
      if (!inBlockComment && line.slice(position, position + 2) === "/*") {
        inBlockComment = true;
        position += 2;
      } else if (inBlockComment && line.slice(position, position + 2) === "*/") {
        inBlockComment = false;
        position += 2;
      } else {
        if (!inBlockComment) visible += line[position];
        position += 1;
      }
    }
    line = visible.trim();
    if (!line || line.startsWith("*") || line.startsWith("//")) continue;
    const continues = /\/\/\/\s*$/.test(line);
    line = continues
      ? line.replace(/\/\/\/\s*$/, "").trim()
      : line.replace(/\s+\/\/.*$/, "").trim();
    if (!line) continue;
    if (startLine === null) startLine = index + 1;
    buffer += `${buffer ? " " : ""}${line}`;
    if (!continues) {
      statements.push({ line: startLine, text: buffer.trim() });
      buffer = "";
      startLine = null;
    }
  }
  if (buffer) statements.push({ line: startLine, text: buffer.trim() });
  return statements;
}

function stripPrefixes(statement) {
  let value = statement.trim();
  value = value.replace(/^(capture|quietly|noisily)\s*:?\s*/i, "");
  value = value.replace(/^(bysort|by)\s+[^:]+:\s*/i, "");
  return value;
}

function detectCommand(statement) {
  const value = stripPrefixes(statement).toLowerCase();
  const commands = [...registry.commands].sort((left, right) => {
    return commandInvocation(right.command).length - commandInvocation(left.command).length;
  });
  for (const command of commands) {
    const forms = unique([command.invocation || commandInvocation(command.command), ...(command.aliases || [])]);
    if (forms.some((form) => value === form.toLowerCase() || value.startsWith(`${form.toLowerCase()} `) || value.startsWith(`${form.toLowerCase()},`))) {
      return command.command;
    }
  }
  return null;
}

function extractOptions(statement) {
  const comma = statement.indexOf(",");
  return comma >= 0 ? statement.slice(comma + 1).trim() : null;
}

function relationsFor(statement, command) {
  const relations = [];
  const rules = [
    ["call", /^(?:capture\s+|quietly\s+|noisily\s+)*(?:do|run|include)\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["input", /^(?:capture\s+|quietly\s+|noisily\s+)*use\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["output", /^(?:capture\s+|quietly\s+|noisily\s+)*save\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
    ["output", /\b(?:graph\s+export|putexcel\s+set|collect\s+export)\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i, 3],
  ];
  for (const [kind, pattern, fallbackIndex] of rules) {
    const match = statement.match(pattern);
    if (!match) continue;
    const value = match[1] || match[2] || match[fallbackIndex];
    if (value) relations.push({ kind, value });
  }
  const using = statement.match(/\busing\s+(?:"([^"]+)"|'([^']+)'|([^,\s]+))/i);
  if (using) {
    const outputUsingCommands = new Set([
      "collect_export", "esttab", "estout", "export_delimited", "export_excel",
      "outfile", "outreg2", "outsheet",
    ]);
    relations.push({
      kind: outputUsingCommands.has(command) ? "output" : "input",
      value: using[1] || using[2] || using[3],
    });
  }
  if (/\bestimates\s+(?:store|save|use|restore)\b/i.test(statement)) {
    relations.push({ kind: "estimate_handoff", value: stripPrefixes(statement) });
  }
  return relations;
}

function scanProjectCommandObservations(projectPath, targetFiles) {
  const root = resolveProjectRoot(projectPath);
  const files = targetFiles?.length
    ? targetFiles.map((file) => resolveExistingInside(root, file))
    : listDoFiles(root);
  const observations = [];
  const unresolved = [];
  if (!targetFiles?.length && files.length >= MAX_PROJECT_FILES) {
    unresolved.push(`project file scan reached the ${MAX_PROJECT_FILES}-file limit`);
  }
  for (const file of files) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
    } catch (error) {
      unresolved.push(`${path.relative(root, file)} could not be read as UTF-8: ${error.message}`);
      continue;
    }
    for (const statement of logicalStatements(text)) {
      const command = detectCommand(statement.text);
      if (!command) continue;
      observations.push({
        file: path.relative(root, file).split(path.sep).join("/"),
        line: statement.line,
        command,
        statement: statement.text,
        options: extractOptions(statement.text),
        relations: relationsFor(statement.text, command),
      });
      if (observations.length >= MAX_PROJECT_OBSERVATIONS) {
        unresolved.push(`project observation scan reached the ${MAX_PROJECT_OBSERVATIONS}-statement limit`);
        return { observations, unresolved };
      }
    }
  }
  return { observations, unresolved };
}

function assertNoForbiddenKeys(value, trail = "response") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RESPONSE_KEYS.has(key)) throw new Error(`forbidden response key at ${trail}.${key}`);
    assertNoForbiddenKeys(child, `${trail}.${key}`);
  }
}

function generalGuidance() {
  if (!fs.existsSync(GENERAL_RULES_PATH)) {
    throw new Error(`general guidance source is missing: ${GENERAL_RULES_SOURCE_PATH}`);
  }
  return {
    source_path: GENERAL_RULES_SOURCE_PATH,
    source_hash: sha256File(GENERAL_RULES_PATH),
    content: new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(GENERAL_RULES_PATH)),
  };
}

function commandDictionary() {
  return registry.commands.map((command) => {
    const family = familiesById.get(command.family_id) || {};
    const functionalLabels = unique([family.category, ...(command.stages || [])]);
    const invocation = commandInvocation(command.command);
    return {
      command: command.command,
      invocation,
      label: `${invocation} — ${family.display_name || command.family_id}`,
      description: `Available for ${functionalLabels.join(", ") || "Stata"} work; use returned documentation for syntax and semantics.`,
      functional_labels: functionalLabels,
      guide_available: sourceCardsFor(command.command).length > 0
        || officialExamples.some((row) => row.command === command.command),
      paper_available: highQualityPaperBlocksFor(command.command).length > 0,
    };
  }).sort((left, right) => left.command.localeCompare(right.command));
}

function selectedCommandsFrom(args) {
  if (!Object.prototype.hasOwnProperty.call(args, "selected_commands")) return null;
  if (!Array.isArray(args.selected_commands) || args.selected_commands.length === 0) {
    throw new Error("ABORT command_not_in_dictionary: selected_commands must be a non-empty array of canonical registry keys");
  }
  const seen = new Set();
  for (const command of args.selected_commands) {
    if (typeof command !== "string" || !commandsByName.has(command)) {
      throw new Error(`ABORT command_not_in_dictionary: ${JSON.stringify(command)} is not a canonical registry key`);
    }
    if (seen.has(command)) {
      throw new Error(`ABORT command_not_in_dictionary: duplicate canonical registry key ${JSON.stringify(command)}`);
    }
    seen.add(command);
  }
  return [...args.selected_commands];
}

function validateArguments(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("arguments must be an object");
  if (typeof args.request !== "string" || !args.request.trim()) throw new Error("request must be a non-empty string");
  if (args.project_path !== undefined && (typeof args.project_path !== "string" || !args.project_path.trim())) {
    throw new Error("project_path must be a non-empty string when provided");
  }
  if (args.target_files !== undefined && (!Array.isArray(args.target_files) || args.target_files.some((file) => typeof file !== "string"))) {
    throw new Error("target_files must be an array of project-relative strings");
  }
  if (args.target_files?.length && !args.project_path) {
    throw new Error("project_path is required when target_files are provided");
  }
  return selectedCommandsFrom(args);
}

function buildCommandEvidence(args) {
  const selectedCommands = validateArguments(args);
  const unresolved = [];
  let projectObservations = [];
  if (args.project_path) {
    const scan = scanProjectCommandObservations(args.project_path, args.target_files || []);
    projectObservations = scan.observations;
    unresolved.push(...scan.unresolved);
  }

  if (selectedCommands === null) {
    const response = {
      phase: "discovery",
      general_guidance: generalGuidance(),
      command_dictionary: commandDictionary(),
      project_observations: projectObservations,
      unresolved_facts: unique(unresolved),
    };
    assertNoForbiddenKeys(response);
    return response;
  }

  const cards = selectedCommands.map((command) => commandCard(command)).filter(Boolean);
  const paperCards = paperUsageCardsFor(selectedCommands);
  for (const card of cards) {
    if (!card.authority_sources.length) {
      unresolved.push(`No readable local official or maintainer source is stored for ${card.command}.`);
    }
    if (card.evidence_mode === "guide_only_fallback") {
      const reason = paperUsageFileAvailable
        ? `No reviewed high-quality paper example is stored for ${card.command}; guide_only_fallback.`
        : `Reviewed paper example files are not installed; ${card.command} uses guide_only_fallback.`;
      unresolved.push(reason);
    }
  }

  const response = {
    phase: "evidence",
    general_guidance: generalGuidance(),
    selected_commands: selectedCommands,
    command_cards: cards,
    project_observations: projectObservations,
    authoritative_examples: examplesFor(selectedCommands),
    full_command_guides: fullCommandGuidesFor(selectedCommands),
    paper_usage_cards: paperCards,
    related_artifacts: relatedArtifactsFor(selectedCommands),
    unresolved_facts: unique(unresolved),
  };
  assertNoForbiddenKeys(response);
  return response;
}

const TOOL_DEFINITIONS = [
  {
    name: "get_stata_command_evidence",
    description: "Two-stage exact-key Stata evidence router. First omit selected_commands to receive the complete canonical command dictionary without guide or paper bodies. Then call again with one or more exact canonical registry keys to receive evidence only for those commands, including a complete cleaned official or maintainer guide in one response when stored. Empty, duplicate, alias, abbreviation, inferred, or unregistered keys abort with command_not_in_dictionary; if the needed command is absent from the dictionary, the calling skill must abort instead of guessing. Reviewed paper blocks are high-quality examples, not templates: only the selected focus command is binding, while surrounding estimators, samples, FE, VCE, and outputs remain nonbinding source context. The tool never chooses a command or grades generated code.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["request"],
      properties: {
        request: { type: "string", minLength: 1 },
        selected_commands: {
          type: "array",
          description: "Evidence phase only: one or more unique, exact command keys copied from the discovery command_dictionary. Do not send aliases, abbreviations, inferred names, or commands outside the dictionary.",
          items: { type: "string", minLength: 1 },
        },
        project_path: { type: "string", minLength: 1 },
        target_files: { type: "array", items: { type: "string", minLength: 1 } },
        known_constraints: {
          description: "Optional user- or project-supplied facts. They remain context for the model and do not trigger deterministic command selection.",
          oneOf: [{ type: "string" }, { type: "array" }, { type: "object" }],
        },
      },
    },
    outputSchema: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["phase", "general_guidance", "command_dictionary", "project_observations", "unresolved_facts"],
          properties: {
            phase: { const: "discovery" },
            general_guidance: { type: "object" },
            command_dictionary: { type: "array", items: { type: "object" } },
            project_observations: { type: "array", items: { type: "object" } },
            unresolved_facts: { type: "array", items: { type: "string" } },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: [
            "phase",
            "general_guidance",
            "selected_commands",
            "command_cards",
            "project_observations",
            "authoritative_examples",
            "full_command_guides",
            "paper_usage_cards",
            "related_artifacts",
            "unresolved_facts",
          ],
          properties: {
            phase: { const: "evidence" },
            general_guidance: { type: "object" },
            selected_commands: { type: "array", items: { type: "string" } },
            command_cards: { type: "array", items: { type: "object" } },
            project_observations: { type: "array", items: { type: "object" } },
            authoritative_examples: { type: "array", items: { type: "object" } },
            full_command_guides: { type: "array", items: { type: "object" } },
            paper_usage_cards: { type: "array", items: { type: "object" } },
            related_artifacts: { type: "array", items: { type: "object" } },
            unresolved_facts: { type: "array", items: { type: "string" } },
          },
        },
      ],
    },
  },
];

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(message) {
  return { isError: true, content: [{ type: "text", text: String(message) }] };
}

function dispatch(message) {
  if (!message || typeof message !== "object") return null;
  if (message.id === undefined || message.id === null) return null;
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "stataResearchGuard", version: "0.3.0" },
      },
    };
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: TOOL_DEFINITIONS } };
  }
  if (message.method === "tools/call") {
    const name = message.params?.name;
    if (name !== "get_stata_command_evidence") {
      return { jsonrpc: "2.0", id: message.id, result: errorResult(`unknown tool: ${name}`) };
    }
    try {
      return { jsonrpc: "2.0", id: message.id, result: textResult(buildCommandEvidence(message.params?.arguments || {})) };
    } catch (error) {
      return { jsonrpc: "2.0", id: message.id, result: errorResult(error.message) };
    }
  }
  return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `method not found: ${message.method}` } };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function main() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } });
      return;
    }
    const response = dispatch(message);
    if (response) send(response);
  });
}

if (require.main === module) main();

module.exports = {
  FORBIDDEN_RESPONSE_KEYS,
  TOOL_DEFINITIONS,
  assertNoForbiddenKeys,
  buildHighQualityPaperBlocksByCommand,
  buildPaperUsageByCommand,
  buildFullCommandGuidesByCommand,
  buildCommandEvidence,
  dispatch,
  logicalStatements,
  paperUsageCardsFor,
  scanProjectCommandObservations,
};
