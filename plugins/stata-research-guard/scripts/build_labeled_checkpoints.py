from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from build_command_template_coverage import validate_promotion_audit


REQUIRED = {
    "label_id",
    "checkpoint",
    "variant_id",
    "stage",
    "decision",
    "adaptation_mode",
    "research_situations",
    "selection_conditions",
    "required_changes",
    "minimal_edit_fields",
    "tradeoffs",
    "relationships",
    "source_kind",
    "review_notes",
    "reuse_scope",
    "readability_score",
    "portability_score",
    "source_specific_elements",
    "reusable_core",
    "preferred_within_checkpoint",
    "generality_rationale_ko",
    "generality_review",
    "quality_rubric_review",
}
DECISIONS = {"keep", "conditional_keep", "drop"}
ADAPTATION_MODES = {"minimal_substitution", "structural_reference", "do_not_reuse"}
REUSE_SCOPES = {"general", "method_specific", "project_specific", "negative"}
RUBRIC_CLASSES = {"preferred_candidate", "conditional_candidate", "reference_only", "exclude"}
def is_noncompeting_guide_mechanics(row: dict) -> bool:
    """Return true only for the new audited companion-layer guide atoms.

    Two legacy official-manual mechanics labels remain compatibility evidence
    in the old diagnostic search; they are reference-only and cannot be
    auto-selected.  The new audited batch is isolated from all legacy ranking.
    """
    return bool(row.get("promotion_audit"))
INPUT_DATA_STRUCTURES = {"cross_section", "panel", "repeated_cross_section", "time_series", "other", "unknown"}
TEMPLATE_INPUT_PROFILE_FIELDS = {
    "data_structure",
    "record_unit",
    "required_keys",
    "source_basis",
    "time_structure",
    "variable_characteristics",
}
STATE_SIGNATURE_FIELDS = {"requires", "observable_signals", "produces"}
LOOP_OPEN = re.compile(r"(?i)^\s*(?:foreach|forv(?:al(?:ues)?)?|while)\b.*\{")
TEX_OUTPUT = re.compile(r"(?i)^\s*(?:texdoc|tex\s|esttab\b.*\.tex\b|estout\b.*\.tex\b)")
PANEL_DECLARATION = re.compile(r"(?im)^\s*(?:xtset|tsset)\s+([^,\n]+)")
IDENTIFIER_DECLARATION = re.compile(r"(?im)^\s*isid\s+([^,\n]+)")
OBSERVABLE_PATTERNS = [
    ("loads a Stata dataset", re.compile(r"(?im)^\s*use\b")),
    ("imports an external source", re.compile(r"(?im)^\s*(?:import|infile|infix)\b")),
    ("appends source rows", re.compile(r"(?im)^\s*append\b")),
    ("merges or joins datasets", re.compile(r"(?im)^\s*(?:merge|joinby)\b")),
    ("reshapes or collapses the data", re.compile(r"(?im)^\s*(?:reshape|collapse)\b")),
    ("checks identifiers or assertions", re.compile(r"(?im)^\s*(?:isid|assert|duplicates)\b")),
    ("creates or recodes variables", re.compile(r"(?im)^\s*(?:g(?:en(?:erate)?)?|egen|replace|recode|rename|destring|encode)\b")),
    ("winsorizes a declared variable", re.compile(r"(?im)^\s*(?:winsor2?|winsorize)\b")),
    ("restricts variables or observations", re.compile(r"(?im)^\s*(?:keep|drop)\b")),
    ("labels generated variables", re.compile(r"(?im)^\s*label\s+(?:variable|values)\b")),
    ("declares panel or time-series state", re.compile(r"(?im)^\s*(?:xtset|tsset)\b")),
    ("materializes missing panel-time rows", re.compile(r"(?im)^\s*tsfill\b")),
    ("runs an estimation command", re.compile(r"(?im)^\s*(?:reg|regress|areg|xtreg|xtivreg2|cgmreg|reghdfe|ppmlhdfe|jwdid|csdid|did_imputation|did_multiplegt|eventstudyinteract|ivreg2|ivreghdfe)\b")),
    ("reads the active estimation sample", re.compile(r"(?i)\be\(sample\)")),
    ("persists or restores an estimate", re.compile(r"(?im)^\s*estimates\s+(?:save|use|store|restore)\b")),
    ("reattaches an estimation-sample marker", re.compile(r"(?im)^\s*estimates\s+esample\b")),
    ("materializes a posted Stata dataset", re.compile(r"(?im)^\s*(?:postfile|post|postclose)\b")),
    ("combines named graphs", re.compile(r"(?im)^\s*graph\s+combine\b")),
    ("assembles an outreg2 table", re.compile(r"(?im)^\s*outreg2\b")),
    ("exports Excel output", re.compile(r"(?im)^\s*(?:export\s+excel|putexcel)\b")),
    ("exports a PDF figure", re.compile(r"(?im)^\s*graph\s+export\b[^\n]*\.pdf\b")),
    ("saves a Stata dataset", re.compile(r"(?im)^\s*save\b")),
    ("erases named files", re.compile(r"(?im)^\s*erase\b")),
    ("preserves and restores data in memory", re.compile(r"(?ims)^\s*preserve\b.*^\s*restore\b")),
    ("calls another do-file or include", re.compile(r"(?im)^\s*(?:do|include)\b")),
    ("defines path or workflow macros", re.compile(r"(?im)^\s*(?:global|local)\b")),
]

COMMAND_PREFIX = re.compile(
    r"(?i)^\s*(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:eststo(?:\s+[^:]+)?\s*:\s*)?"
)
COMPOUND_COMMANDS = [
    (re.compile(r"(?i)^estimates\s+(save|use|store|restore|esample)\b"), lambda m: f"estimates {m.group(1).lower()}"),
    (re.compile(r"(?i)^import\s+(excel|delimited)\b"), lambda m: f"import {m.group(1).lower()}"),
    (re.compile(r"(?i)^export\s+(excel|delimited)\b"), lambda m: f"export {m.group(1).lower()}"),
    (re.compile(r"(?i)^collect\s+(export|get|style)\b"), lambda m: f"collect {m.group(1).lower()}"),
    (re.compile(r"(?i)^graph\s+(export|combine|save|display|bar)\b"), lambda m: f"graph {m.group(1).lower()}"),
    (re.compile(r"(?i)^label\s+(variable|values|define)\b"), lambda m: f"label {m.group(1).lower()}"),
]
COMMAND_ALIASES = {
    "g": "generate",
    "gen": "generate",
    "reg": "regress",
    "sum": "summarize",
    "qui": "quietly",
    "cap": "capture",
}
COMMAND_NOISE = {"else", "forvalues", "forval", "forv", "foreach", "if", "timer", "while"}
ALLOWED_DERIVED_CANONICAL_LABEL_IDS = {
    "export.regression_excel.from_ster_default_style.v1",
}


def materialize_guide_mechanics(entry: dict) -> dict:
    """Build one non-selectable official/maintainer-guide mechanics row.

    Guide atoms are deliberately kept separate from the canonical registry:
    they document a command's supported mechanics but do not constitute
    researcher-style evidence or an implementation default.
    """
    label_id = entry["label_id"]
    generation_class = entry.get("canonical_generation_class", "reference_only")
    if generation_class != "reference_only":
        raise ValueError(f"guide mechanics must be reference_only: {label_id}")
    return {
        "decision": "conditional_keep",
        "adaptation_mode": "structural_reference",
        "relationships": {"alternatives": [], "duplicates": [], "supersedes": []},
        "source_kind": entry.get("source_kind", "official_manual_derived_mechanics"),
        "derivation_provenance": {
            "kind": "guide_atomic_template_batch:audit",
            "independent_support": False,
            "researcher_style_evidence": False,
            "raw_source_bytes_claimed": False,
            "reason": "Guide mechanics document a command contract, not a research-design default.",
            "source_collection_next_step": "Add independent deposited research-code support before making a template selectable.",
            **entry.get("derivation_provenance", {}),
        },
        "promotion_status": "staged_pending_independent_audit",
        "reuse_scope": "method_specific" if entry.get("reuse_scope") == "negative" else entry.get("reuse_scope", "general"),
        "readability_score": entry.get("readability_score", 5),
        "portability_score": entry.get("portability_score", 4),
        "preferred_within_checkpoint": False,
        "explicit_canonical_exception": False,
        "generality_rationale_ko": entry["generality_rationale_ko"],
        "generality_review": {
            "status": "external_evidence_rubric_reviewed",
            "version": "2.0",
            "criterion": "guide-derived mechanics with explicit state and bounded substitutions",
            "rubric_sha256": "81b41a0232c6bdcd4956ba7bfe5258afe9b6e0a71422430a177295a6d0bd2b46",
        },
        "quality_rubric_review": {},
        **entry,
        "decision": "conditional_keep",
        "adaptation_mode": "structural_reference",
        "reuse_scope": "method_specific" if entry.get("reuse_scope") == "negative" else entry.get("reuse_scope", "general"),
        "review_notes": entry["review_notes"] + " Guide mechanics are reference-only and never a canonical implementation default.",
    }


def read_text(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"cannot decode {path}")


def resolve_annotation_source(workspace: Path, plugin: Path, source_path: str) -> Path:
    """Resolve corpus evidence from the workspace and plugin snapshots from this checkout."""
    plugin_prefix = "plugins/stata-research-guard/"
    if source_path.startswith(plugin_prefix):
        source = (plugin / source_path[len(plugin_prefix) :]).resolve()
        if not source.is_relative_to(plugin):
            raise ValueError(f"plugin source leaves plugin root: {source_path}")
        return source
    source = (workspace / source_path).resolve()
    if not source.is_relative_to(workspace):
        raise ValueError(f"source leaves workspace: {source_path}")
    return source


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical_json_sha256(value: object) -> str:
    """Hash a JSON value using one documented, whitespace-independent encoding."""
    canonical = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256_text(canonical)


def source_span_spec(spans: list[list[int]]) -> str:
    """Return the canonical audit-ledger spelling of one or more exact line spans."""
    values = []
    for start, end in spans:
        values.append(str(start) if start == end else f"{start}-{end}")
    return ",".join(values)


def _audit_record_map(audit: dict) -> dict[str, dict]:
    records: dict[str, dict] = {}
    for record in audit["candidate_records"]:
        label_id = record["label_id"]
        if label_id in records:
            raise ValueError(f"duplicate atomic promotion audit label_id: {label_id}")
        records[label_id] = record
    return records


def _require_exact_profile(label_id: str, name: str, observed: object, expected: object, fields: set[str]) -> None:
    if not isinstance(expected, dict) or set(expected) != fields:
        raise ValueError(f"atomic candidate {label_id}.{name} must contain exactly {sorted(fields)}")
    if observed != expected:
        raise ValueError(f"atomic promotion audit {name} mismatch for {label_id}")


def audit_atomic_template_entry(entry: dict, record: dict) -> dict:
    """Validate and materialize one code-free guide-metadata record."""
    label_id = entry.get("label_id")
    if not isinstance(label_id, str) or not label_id:
        raise ValueError("atomic candidate has no label_id")
    if record.get("label_id") != label_id:
        raise ValueError(f"atomic promotion audit label_id mismatch for {label_id}")
    if record.get("contract_ids") != entry.get("contract_ids"):
        raise ValueError(f"atomic promotion audit contract_ids mismatch for {label_id}")
    expected_entry_hash = canonical_json_sha256(entry)
    if record.get("candidate_inventory_sha256") != expected_entry_hash:
        raise ValueError(f"atomic promotion audit candidate_inventory_sha256 mismatch for {label_id}")

    source = record.get("source")
    if not isinstance(source, dict):
        raise ValueError(f"atomic promotion audit source missing for {label_id}")
    if not isinstance(source.get("role"), str) or not source["role"].strip():
        raise ValueError(f"atomic promotion audit source.role missing for {label_id}")
    source_layers = record.get("source_layers")
    source_layer = source_layers.get(source["role"]) if isinstance(source_layers, dict) else None
    if not isinstance(source_layer, dict) or source_layer.get("status") != "pass" or not source_layer.get("source_id"):
        raise ValueError(f"atomic promotion audit source.role must identify a passed source layer for {label_id}")
    if source.get("kind") != entry.get("source_kind"):
        raise ValueError(f"atomic promotion audit source.kind mismatch for {label_id}")
    if not isinstance(source.get("source_id"), str) or not source["source_id"].strip():
        raise ValueError(f"atomic promotion audit source.source_id missing for {label_id}")
    declared_sources = entry.get("source_urls", [])
    if declared_sources and source["source_id"] not in declared_sources:
        raise ValueError(f"atomic promotion audit source.source_id mismatch for {label_id}")

    _require_exact_profile(
        label_id,
        "input_profile",
        record.get("input_profile"),
        entry.get("template_input_profile"),
        TEMPLATE_INPUT_PROFILE_FIELDS,
    )
    _require_exact_profile(
        label_id,
        "state_signature",
        record.get("state_signature"),
        entry.get("state_signature"),
        STATE_SIGNATURE_FIELDS,
    )
    distinctness = record.get("variant_distinctness")
    if not isinstance(distinctness, dict) or distinctness.get("reason") != entry.get("variant_distinction"):
        raise ValueError(f"atomic promotion audit variant_distinctness mismatch for {label_id}")
    safety = record.get("safety_checks")
    if not isinstance(safety, dict) or safety.get("nested_loop") != "pass" or safety.get("tex_output") != "pass":
        raise ValueError(f"atomic promotion audit safety_checks must pass for {label_id}")
    auditor = record.get("auditor")
    if not isinstance(auditor, dict) or auditor.get("status") != "pass" or not auditor.get("reviewer"):
        raise ValueError(f"atomic promotion audit auditor must be an independent passed review for {label_id}")
    independence = record.get("independence")
    expected_independence = bool(entry.get("independent_support", False))
    if (
        not isinstance(independence, dict)
        or independence.get("independent_support") is not expected_independence
        or not independence.get("scope")
    ):
        raise ValueError(f"atomic promotion audit independence mismatch for {label_id}")

    if record.get("disposition") != "reference_only" or record.get("auto_selectable") is not False:
        raise ValueError(f"guide mechanics must remain reference_only and non-selectable: {label_id}")
    expanded = materialize_guide_mechanics(entry)
    expanded["quality_rubric_review"] = {
        "status": "external_evidence_rubric_reviewed",
        "version": "1.1",
        "rubric_sha256": "81b41a0232c6bdcd4956ba7bfe5258afe9b6e0a71422430a177295a6d0bd2b46",
        "source_verification": {
            "manual_source_declared": True,
            "code_template_shipped": False,
        },
        "hard_fails": [],
        "applicable_dimensions": [
            "state_visibility", "input_output_contract", "portability", "readability",
            "sample_estimand_visibility", "loop_program_abstraction", "reproducibility",
            "project_specific_coupling", "minimal_adaptation",
        ],
        "dimension_scores": {
            "state_visibility": 5, "input_output_contract": 5, "portability": 4,
            "readability": 5, "sample_estimand_visibility": 4,
            "loop_program_abstraction": 5, "reproducibility": 4,
            "project_specific_coupling": 4, "minimal_adaptation": 5,
        },
        "weighted_score": 0,
        "classification": "reference_only",
        "reviewer_classification": "reference_only",
        "classification_calibration_override": None,
        "preferred_eligible": False,
        "reviewer_notes_ko": "독립 감사 ledger가 command metadata와 declared manual source를 확인한 reference-only guide mechanics record이다.",
        "uncertainty": "가이드는 syntax/state 정보만 제공하며 연구 설계나 구현 기본값을 제공하지 않는다.",
        "current_vs_recommended_changes": [],
        "canonical_exception_override": None,
    }
    runtime = record.get("runtime", {})
    selector = record.get("selector", {})
    if not runtime.get("reason") or not selector.get("reason"):
        raise ValueError(f"reference_only runtime and selector reasons are required for {label_id}")
    expanded["canonical_generation_class"] = "reference_only"
    expanded["preferred_within_checkpoint"] = False
    expanded["canonical_default"] = False
    expanded["auto_selectable"] = False
    expanded["promotion_status"] = "reference_only"
    expanded["relationships"] = {"alternatives": [], "duplicates": [], "supersedes": []}
    expanded["audit_status"] = "metadata_only"
    expanded["promotion_audit"] = {
        "disposition": "reference_only",
        "candidate_inventory_sha256": expected_entry_hash,
        "reviewer": auditor["reviewer"],
    }
    return expanded


def load_audited_atomic_template_sets(
    plugin: Path,
    hard_fail_rule_ids: list[str],
    *,
    legacy_label_count: int,
) -> list[dict]:
    """Load code-free guide metadata only after an exact ledger match."""
    atomic_template_dir = plugin / "annotations" / "atomic_template_sets"
    if not atomic_template_dir.exists():
        return []
    audit = json.loads((plugin / "annotations" / "template_promotion_audit.json").read_text(encoding="utf-8"))
    requirements = json.loads((plugin / "annotations" / "command_template_requirements.json").read_text(encoding="utf-8"))
    validate_promotion_audit(audit, requirements, legacy_label_count)
    commands_by_group = {
        group["group_id"]: group["commands"]
        for group in [*requirements["ranked_groups"], *requirements["supplemental_groups"]]
    }
    audit_by_id = _audit_record_map(audit)
    candidates: list[dict] = []
    seen: set[str] = set()
    for template_path in sorted(atomic_template_dir.glob("*.json")):
        values = json.loads(template_path.read_text(encoding="utf-8"))
        if not isinstance(values, list):
            raise ValueError(f"atomic template set must be a JSON array: {template_path}")
        for entry in values:
            label_id = entry.get("label_id") if isinstance(entry, dict) else None
            if not isinstance(label_id, str) or not label_id:
                raise ValueError(f"atomic candidate has no label_id: {template_path}")
            if label_id in seen:
                raise ValueError(f"duplicate atomic candidate label_id: {label_id}")
            seen.add(label_id)
            candidates.append(entry)
    if set(audit_by_id) != seen:
        missing = sorted(seen - set(audit_by_id))
        stale = sorted(set(audit_by_id) - seen)
        raise ValueError(f"atomic promotion audit label set mismatch: missing={missing}, stale={stale}")

    expanded: list[dict] = []
    for entry in candidates:
        urls = entry.get("source_urls")
        if (
            not isinstance(urls, list)
            or not urls
            or any(not isinstance(url, str) or not url.startswith(("https://", "http://")) for url in urls)
        ):
            raise ValueError(f"guide metadata requires an authoritative source URL: {entry['label_id']}")
        row = audit_atomic_template_entry(entry, audit_by_id[entry["label_id"]])
        row["command_anchors"] = list(dict.fromkeys(
            command
            for contract_id in entry.get("contract_ids", [])
            for command in commands_by_group.get(contract_id.partition(".")[0], [])
        ))
        row["quality_rubric_review"]["hard_fails"] = [
            {
                "rule_id": rule_id,
                "triggered": False,
                "evidence": "Declared guide metadata; no code template is shipped.",
            }
            for rule_id in hard_fail_rule_ids
        ]
        expanded.append(row)
    return expanded


def markdown_cell(value: object) -> str:
    if isinstance(value, list):
        text = "; ".join(str(item) for item in value)
    elif isinstance(value, dict):
        text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    else:
        text = str(value)
    return text.replace("|", "\\|").replace("\n", " ")


def loop_structure(text: str) -> tuple[int, int]:
    stack: list[str] = []
    maximum = 0
    in_block_comment = False
    for raw in text.splitlines():
        active = raw
        if in_block_comment:
            end = active.find("*/")
            if end < 0:
                continue
            active = active[end + 2 :]
            in_block_comment = False
        while "/*" in active:
            start = active.find("/*")
            end = active.find("*/", start + 2)
            if end < 0:
                active = active[:start]
                in_block_comment = True
                break
            active = active[:start] + active[end + 2 :]
        if not active.strip() or active.lstrip().startswith(("*", "//")):
            continue
        active = active.split("//", 1)[0]
        active = re.sub(r'"(?:[^"\\]|\\.)*"', '""', active)
        close_match = re.match(r"^\s*(?:}\s*)+", active)
        close_count = close_match.group(0).count("}") if close_match else 0
        for _ in range(close_count):
            if stack:
                stack.pop()
        opens_block = active.strip().rstrip(";").endswith("{")
        if opens_block:
            first_kind = "loop" if LOOP_OPEN.search(active) else "block"
            stack.append(first_kind)
            maximum = max(maximum, sum(kind == "loop" for kind in stack))
    return maximum, len(stack)


def enforce_reusable_block_safety(
    label_id: str,
    decision: str,
    max_loop_depth: int,
    unclosed_blocks: int,
    tex_output: bool,
    *,
    allow_reference_fragment: bool = False,
) -> None:
    """Reject unsafe executable structure before a reusable label is published.

    A bounded guide companion can quote the interior of a documented conditional
    block.  It is never auto-selectable, so retaining that reference fragment
    must not weaken the executable-template gate for any other label.
    """
    if decision == "drop":
        return
    if max_loop_depth >= 3:
        raise ValueError(f"reusable label has loop depth three or greater: {label_id}")
    if unclosed_blocks and not allow_reference_fragment:
        raise ValueError(f"reusable label has unclosed block: {label_id}")
    if tex_output:
        raise ValueError(f"reusable label contains TeX output: {label_id}")


def signature_variables(match_text: str) -> list[str]:
    """Keep only directly declared Stata variable tokens; never expand macros or infer names."""
    variables = []
    for token in match_text.split():
        cleaned = token.strip()
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", cleaned) and cleaned not in variables:
            variables.append(cleaned)
    return variables


def source_context(source_text: str, source_spans: list[list[int]], radius: int = 120) -> list[tuple[int, str]]:
    """Return a bounded, line-numbered source neighborhood for a labeled block."""
    lines = source_text.splitlines()
    selected = set()
    for start, end in source_spans:
        selected.update(range(max(1, start - radius), min(len(lines), end + radius) + 1))
    return [(line_number, lines[line_number - 1]) for line_number in sorted(selected)]


def signature_evidence(annotation: dict, line_number: int, signal: str) -> dict:
    return {
        "source_path": annotation["source_path"],
        "line_spans": [[line_number, line_number]],
        "signal": signal,
    }


def context_command_variables(context: list[tuple[int, str]], pattern: re.Pattern[str], signal: str, annotation: dict) -> list[tuple[list[str], dict]]:
    matches = []
    for line_number, line in context:
        match = pattern.search(line)
        if match:
            matches.append((signature_variables(match.group(1)), signature_evidence(annotation, line_number, signal)))
    return matches


def one_consistent_value(values: list[object]) -> object | None:
    unique = []
    for value in values:
        if value not in unique:
            unique.append(value)
    return unique[0] if len(unique) == 1 else None


def input_signature(annotation: dict, source_text: str) -> dict:
    """Describe only source-context facts that can be used for target preflight comparison."""
    context = source_context(source_text, annotation["source_spans"])
    panel_declarations = context_command_variables(context, PANEL_DECLARATION, "xtset_or_tsset", annotation)
    identifier_declarations = context_command_variables(context, IDENTIFIER_DECLARATION, "isid", annotation)
    merge_declarations = context_command_variables(
        context,
        re.compile(r"(?i)^\s*merge\s+\d:\d\s+([^,\n]+)"),
        "merge_key",
        annotation,
    )

    required_keys = []
    required_key_evidence = []
    for variables, evidence in [*panel_declarations, *identifier_declarations, *merge_declarations]:
        if variables:
            for variable in variables:
                if variable not in required_keys:
                    required_keys.append(variable)
            required_key_evidence.append(evidence)

    data_structure = "unknown"
    observation_unit = "not_stated"
    time_structure = "not_stated"
    field_evidence = {
        "data_structure": [],
        "observation_unit": [],
        "time_structure": [],
        "required_keys": required_key_evidence,
        "variable_characteristics": [],
    }
    consistent_panel = one_consistent_value([tuple(variables) for variables, _evidence in panel_declarations if variables])
    if consistent_panel and len(consistent_panel) >= 2:
        data_structure = "panel"
        observation_unit = consistent_panel[0]
        time_structure = f"panel index {consistent_panel[0]}; time index {consistent_panel[1]}"
        panel_evidence = [evidence for variables, evidence in panel_declarations if tuple(variables) == consistent_panel]
        field_evidence["data_structure"] = panel_evidence
        field_evidence["observation_unit"] = panel_evidence
        field_evidence["time_structure"] = panel_evidence
    elif consistent_panel and len(consistent_panel) == 1:
        data_structure = "time_series"
        time_structure = f"time index {consistent_panel[0]}"
        panel_evidence = [evidence for variables, evidence in panel_declarations if tuple(variables) == consistent_panel]
        field_evidence["data_structure"] = panel_evidence
        field_evidence["time_structure"] = panel_evidence
    else:
        consistent_identifier = one_consistent_value([tuple(variables) for variables, _evidence in identifier_declarations if variables])
        if consistent_identifier and len(consistent_identifier) == 1:
            data_structure = "cross_section"
            observation_unit = consistent_identifier[0]
            identifier_evidence = [evidence for variables, evidence in identifier_declarations if tuple(variables) == consistent_identifier]
            field_evidence["data_structure"] = identifier_evidence
            field_evidence["observation_unit"] = identifier_evidence

    variable_characteristics = []
    signal_map = [
        (re.compile(r"(?i)^\s*use\b"), "Stata dataset input", "use"),
        (re.compile(r"(?i)^\s*(?:import|infile|infix)\b"), "external-source input", "import"),
        (re.compile(r"(?i)^\s*(?:merge|joinby)\b"), "additional dataset join", "merge_or_join"),
        (re.compile(r"(?i)^\s*reshape\s+long\b"), "long form declared", "reshape_long"),
        (re.compile(r"(?i)^\s*reshape\s+wide\b"), "wide form declared", "reshape_wide"),
    ]
    for pattern, characteristic, signal in signal_map:
        for line_number, line in context:
            if pattern.search(line):
                if characteristic not in variable_characteristics:
                    variable_characteristics.append(characteristic)
                field_evidence["variable_characteristics"].append(signature_evidence(annotation, line_number, signal))
    for line_number, line in context:
        cohort = re.search(r"(?i)^\s*egen\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*csgvar\(([A-Za-z_][A-Za-z0-9_]*)\)", line)
        if cohort:
            characteristic = f"treatment timing: {cohort.group(1)} from {cohort.group(2)}"
            if characteristic not in variable_characteristics:
                variable_characteristics.append(characteristic)
            field_evidence["variable_characteristics"].append(signature_evidence(annotation, line_number, "csgvar_treatment_timing"))
    if not variable_characteristics:
        variable_characteristics.append("not_stated")

    return {
        "data_structure": data_structure,
        "observation_unit": observation_unit,
        "time_structure": time_structure,
        "required_keys": required_keys,
        "variable_characteristics": variable_characteristics,
        "field_evidence": field_evidence,
        "evidence": {
            "source_path": annotation["source_path"],
            "source_spans": annotation["source_spans"],
            "context_radius_lines": 120,
            "basis": "bounded source context around exact labeled source spans",
        },
    }


def validate_input_signature(label_id: str, signature: dict) -> None:
    if signature["data_structure"] not in INPUT_DATA_STRUCTURES:
        raise ValueError(f"invalid input data_structure: {label_id}")
    if not signature["observation_unit"] or not signature["time_structure"]:
        raise ValueError(f"input signature must state unknowns explicitly: {label_id}")
    if not isinstance(signature["required_keys"], list) or not isinstance(signature["variable_characteristics"], list):
        raise ValueError(f"input signature fields must be lists: {label_id}")
    if not isinstance(signature.get("field_evidence"), dict):
        raise ValueError(f"input signature must preserve field-level evidence: {label_id}")
    if set(signature["field_evidence"]) != {"data_structure", "observation_unit", "time_structure", "required_keys", "variable_characteristics"}:
        raise ValueError(f"input signature evidence fields are incomplete: {label_id}")
    evidence = signature["evidence"]
    if evidence.get("basis") not in {
        "bounded source context around exact labeled source spans",
        "declared official or maintainer manual metadata; no code template shipped",
    }:
        raise ValueError(f"input signature has non-source evidence: {label_id}")


def enforce_event_plot_metadata(label_id: str, checkpoint: str, decision: str, annotation: dict) -> None:
    if (
        checkpoint != "figures.event_study"
        or decision == "drop"
        or annotation.get("canonical_generation_class") == "reference_only"
        or annotation.get("promotion_status") == "reference_only"
    ):
        return
    metadata = annotation.get("event_plot_metadata")
    if not isinstance(metadata, dict):
        raise ValueError(f"event-study label is missing event_plot_metadata: {label_id}")
    if metadata.get("sheet_group") != "Declared independently for workbook or display placement; it never determines the y-axis.":
        raise ValueError(f"event-study sheet_group must be independent: {label_id}")
    if metadata.get("axis_group") != "Declare only for a direct comparison of closely related outcomes.":
        raise ValueError(f"event-study axis_group must be close-related-only: {label_id}")
    if metadata.get("axis_policy") != "Use fixed range and ticks when that axis_group is declared; otherwise use automatic axes.":
        raise ValueError(f"event-study axis policy must allow automatic axes: {label_id}")
    if metadata.get("implementation") != "Apply the declared graph options directly in the figure job; do not encode an axis dispatcher.":
        raise ValueError(f"event-study axis dispatcher is prohibited: {label_id}")


def extract_block(source_text: str, spans: list[list[int]]) -> str:
    lines = source_text.splitlines()
    blocks = []
    for start, end in spans:
        if start < 1 or end < start or end > len(lines):
            raise ValueError(f"invalid source span {start}-{end}; file has {len(lines)} lines")
        blocks.append("\n".join(lines[start - 1 : end]))
    return "\n\n".join(blocks).rstrip() + "\n"


def infer_observable_signals(code: str) -> list[str]:
    return [name for name, pattern in OBSERVABLE_PATTERNS if pattern.search(code)]


def extract_command_anchors(code: str) -> list[str]:
    """Extract normalized line-leading Stata commands, never substrings in code or comments."""
    anchors: list[str] = []
    in_block_comment = False
    previous_continued = False
    for raw in code.splitlines():
        line = raw.strip()
        continued = line.endswith("///")
        if previous_continued:
            previous_continued = continued
            continue
        previous_continued = continued
        if in_block_comment:
            if "*/" in line:
                line = line.split("*/", 1)[1].strip()
                in_block_comment = False
            else:
                continue
        if line.startswith("/*"):
            if "*/" not in line[2:]:
                in_block_comment = True
                continue
            line = line.split("*/", 1)[1].strip()
        if not line or line.startswith(("*", "//", "///", "#", "}", "{")):
            continue
        line = line.split("//", 1)[0].strip()
        line = COMMAND_PREFIX.sub("", line)
        line = re.sub(r"(?i)^xi\s*:\s*", "", line)
        line = re.sub(r"(?i)^(?:by|bys|bysort)\b[^:]*:\s*", "", line)
        if not line:
            continue
        anchor = None
        for pattern, formatter in COMPOUND_COMMANDS:
            match = pattern.match(line)
            if match:
                anchor = formatter(match)
                break
        if anchor is None:
            match = re.match(r"(?i)^([a-z_][a-z0-9_]*)\b", line)
            if not match:
                continue
            anchor = COMMAND_ALIASES.get(match.group(1).lower(), match.group(1).lower())
        if anchor in COMMAND_NOISE:
            continue
        if anchor not in anchors:
            anchors.append(anchor)
    return anchors


def observable_signals(code: str, anchors: list[str]) -> list[str]:
    signals = infer_observable_signals(code)
    estimation_commands = {"regress", "areg", "xtreg", "xtivreg2", "cgmreg", "reghdfe", "ppmlhdfe", "jwdid", "csdid", "did_imputation", "did_multiplegt", "eventstudyinteract", "ivreg2", "ivreghdfe"}
    supplements = []
    if estimation_commands.intersection(anchors):
        supplements.append("runs an estimation command")
    if "erase" in anchors:
        supplements.append("erases named files")
    for signal in supplements:
        if signal not in signals:
            signals.append(signal)
    return signals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--plugin", type=Path)
    args = parser.parse_args()

    plugin = (args.plugin or Path(__file__).resolve().parents[1]).resolve()
    workspace = (args.workspace or plugin.parents[1]).resolve()
    annotations_path = plugin / "annotations" / "labeled_checkpoints.json"
    atomic_template_dir = plugin / "annotations" / "atomic_template_sets"
    contracts_path = plugin / "annotations" / "checkpoint_contracts.json"
    rubric_path = plugin / "annotations" / "generality_rubric.json"
    output_path = plugin / "data" / "labeled_checkpoints.jsonl"
    summary_path = plugin / "data" / "labeled_checkpoint_summary.json"
    dictionary_path = plugin / "data" / "workflow_block_dictionary.json"

    annotations = json.loads(annotations_path.read_text(encoding="utf-8"))
    if not isinstance(annotations, list) or not annotations:
        raise ValueError("annotations must be a nonempty JSON array")
    contract_document = json.loads(contracts_path.read_text(encoding="utf-8"))
    rubric_document = json.loads(rubric_path.read_text(encoding="utf-8"))
    active_hard_fail_rule_ids = [rule["id"] for rule in rubric_document["hard_fail_rules"]]
    derived_ids = {
        row["label_id"]
        for row in annotations
        if row.get("source_kind") == "derived_canonical_implementation"
    }
    if derived_ids != ALLOWED_DERIVED_CANONICAL_LABEL_IDS:
        raise ValueError(
            "derived canonical implementations must be limited to the approved outreg2 formatter: "
            f"{sorted(derived_ids)}"
        )
    if atomic_template_dir.exists():
        legacy_label_count = len(annotations)
        annotations.extend(
            load_audited_atomic_template_sets(
                plugin,
                active_hard_fail_rule_ids,
                legacy_label_count=legacy_label_count,
            )
        )
    display_names = contract_document.get("display_names", {})
    contract_rows = contract_document.get("contracts", [])
    contracts = {row["checkpoint"]: row for row in contract_rows}
    if len(contracts) != len(contract_rows):
        raise ValueError("checkpoint contracts must have unique checkpoint names")
    if set(display_names) != set(contracts):
        missing_names = sorted(set(contracts) - set(display_names))
        extra_names = sorted(set(display_names) - set(contracts))
        raise ValueError(f"display-name mismatch; missing={missing_names}, extra={extra_names}")
    for checkpoint, contract in contracts.items():
        for relation in ("can_follow", "can_precede"):
            dangling = sorted(set(contract[relation]) - set(contracts))
            if dangling:
                raise ValueError(f"dangling {relation} for {checkpoint}: {dangling}")

    seen = set()
    rows = []
    for position, annotation in enumerate(annotations, start=1):
        missing = sorted(REQUIRED - set(annotation))
        if missing:
            raise ValueError(f"annotation {position} missing fields: {missing}")
        label_id = annotation["label_id"]
        if label_id in seen:
            raise ValueError(f"duplicate label_id: {label_id}")
        seen.add(label_id)
        if annotation["decision"] not in DECISIONS:
            raise ValueError(f"invalid decision for {label_id}")
        if annotation["adaptation_mode"] not in ADAPTATION_MODES:
            raise ValueError(f"invalid adaptation_mode for {label_id}")
        if annotation["decision"] == "drop" and annotation["adaptation_mode"] != "do_not_reuse":
            raise ValueError(f"dropped label must use do_not_reuse: {label_id}")
        if annotation["reuse_scope"] not in REUSE_SCOPES:
            raise ValueError(f"invalid reuse_scope for {label_id}: {annotation['reuse_scope']}")
        if annotation["decision"] == "drop" and annotation["reuse_scope"] != "negative":
            raise ValueError(f"dropped label must have negative reuse_scope: {label_id}")
        if annotation["decision"] != "drop" and annotation["reuse_scope"] == "negative":
            raise ValueError(f"reusable label cannot have negative reuse_scope: {label_id}")
        for score_field in ("readability_score", "portability_score"):
            if not isinstance(annotation[score_field], int) or not 1 <= annotation[score_field] <= 5:
                raise ValueError(f"{score_field} must be an integer from 1 through 5: {label_id}")
        if annotation["generality_review"].get("status") != "external_evidence_rubric_reviewed":
            raise ValueError(f"generality review must use the external-evidence rubric: {label_id}")
        rubric_review = annotation["quality_rubric_review"]
        if rubric_review.get("status") != "external_evidence_rubric_reviewed":
            raise ValueError(f"quality rubric review is not final: {label_id}")
        if rubric_review.get("classification") not in RUBRIC_CLASSES:
            raise ValueError(f"invalid rubric classification: {label_id}")
        if not isinstance(rubric_review.get("weighted_score"), (int, float)) or not 0 <= rubric_review["weighted_score"] <= 100:
            raise ValueError(f"invalid rubric weighted score: {label_id}")
        if (
            not isinstance(rubric_review.get("hard_fails"), list)
            or [item.get("rule_id") for item in rubric_review["hard_fails"]] != active_hard_fail_rule_ids
        ):
            raise ValueError(f"hard-fail review is incomplete: {label_id}")
        if (annotation["decision"] == "drop") != (rubric_review["classification"] == "exclude"):
            raise ValueError(f"only drop/negative labels may be rubric-excluded: {label_id}")
        checkpoint = annotation["checkpoint"]
        if checkpoint not in contracts:
            raise ValueError(f"missing checkpoint contract for {label_id}: {checkpoint}")

        guide_mechanics = is_noncompeting_guide_mechanics(annotation)
        if not guide_mechanics:
            missing_source_fields = sorted({"source_path", "source_spans"} - set(annotation))
            if missing_source_fields:
                raise ValueError(f"annotation {position} missing source fields: {missing_source_fields}")
        if guide_mechanics:
            source = None
            source_text = ""
            code = None
            command_anchors = list(annotation.get("command_anchors", []))
            inferred_signals = []
            max_loop_depth, unclosed_blocks, tex_output = 0, 0, False
        else:
            source = resolve_annotation_source(workspace, plugin, annotation["source_path"])
            source_text = read_text(source)
            code = extract_block(source_text, annotation["source_spans"])
            command_anchors = extract_command_anchors(code)
            inferred_signals = observable_signals(code, command_anchors)
            max_loop_depth, unclosed_blocks = loop_structure(code)
            tex_output = any(TEX_OUTPUT.search(line) for line in code.splitlines())
        enforce_reusable_block_safety(
            label_id,
            annotation["decision"],
            max_loop_depth,
            unclosed_blocks,
            tex_output,
            allow_reference_fragment=(
                is_noncompeting_guide_mechanics(annotation)
                and annotation.get("canonical_generation_class") == "reference_only"
                and annotation.get("promotion_status") == "reference_only"
                and annotation.get("adaptation_mode") == "structural_reference"
            ),
        )
        enforce_event_plot_metadata(label_id, checkpoint, annotation["decision"], annotation)
        if guide_mechanics:
            profile = annotation["template_input_profile"]
            signature = {
                "data_structure": profile["data_structure"] if profile["data_structure"] in INPUT_DATA_STRUCTURES else "unknown",
                "observation_unit": profile["record_unit"],
                "time_structure": profile["time_structure"],
                "required_keys": profile["required_keys"],
                "variable_characteristics": profile["variable_characteristics"],
                "field_evidence": {
                    "data_structure": [], "observation_unit": [], "time_structure": [],
                    "required_keys": [], "variable_characteristics": [],
                },
                "evidence": {
                    "source_urls": annotation["source_urls"],
                    "context_radius_lines": 0,
                    "basis": "declared official or maintainer manual metadata; no code template shipped",
                },
            }
        else:
            signature = input_signature(annotation, source_text)
        validate_input_signature(label_id, signature)

        checkpoint_contract = contracts[checkpoint]
        annotation_output = annotation.get("output_contract")
        state_signature = annotation.get("state_signature")
        if state_signature is None:
            state_signature = {
                "requires": checkpoint_contract["input_contract"],
                "observable_signals": inferred_signals,
                "produces": checkpoint_contract["output_contract"],
            }
        else:
            state_signature = dict(state_signature)
            observed = list(state_signature.get("observable_signals", []))
            for signal in inferred_signals:
                if signal not in observed:
                    observed.append(signal)
            state_signature["observable_signals"] = observed
        rows.append(
            {
                "variant_group": checkpoint,
                "unit_kind": checkpoint_contract["unit_kind"],
                "purpose_ko": checkpoint_contract["purpose_ko"],
                "name_ko": display_names[checkpoint]["ko"],
                "name_en": display_names[checkpoint]["en"],
                "aliases": checkpoint_contract["aliases"],
                "input_contract": checkpoint_contract["input_contract"],
                "output_contract": annotation_output or checkpoint_contract["output_contract"],
                "composition": {
                    "can_follow": checkpoint_contract["can_follow"],
                    "can_precede": checkpoint_contract["can_precede"],
                    "incompatible_with": checkpoint_contract["incompatible_with"],
                    "selection_rule": "Choose at most one complete variant in this group when its selection_conditions and input_contract match. Never splice fragments; compose a distinct sequential group only when the state contracts connect.",
                },
                "state_signature": state_signature,
                "state_signature_origin": "variant_specific" if "state_signature" in annotation else "code_derived",
                "command_anchors": command_anchors,
                "required_signals": annotation.get("required_signals", state_signature.get("observable_signals", [])),
                "forbidden_signals": annotation.get("forbidden_signals", ["nested_loop", "tex_output"]),
                "canonical_default": bool(annotation.get("canonical_default", False)),
                "state_confidence": annotation.get("state_confidence", "strong" if "state_signature" in annotation else "code_derived"),
                **annotation,
                "annotation_order": position,
                **({} if guide_mechanics else {
                    "source_file_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                    "code_sha256": sha256_text(code),
                    "code": code,
                }),
                "input_signature": signature,
                "max_loop_depth": max_loop_depth,
                "unclosed_blocks": unclosed_blocks,
                "tex_output": tex_output,
                "human_labeled": True,
            }
        )

    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    summary = {
        "schema_version": "1.2",
        "labels": len(rows),
        "checkpoints": len({row["checkpoint"] for row in rows}),
        "decision_counts": dict(Counter(row["decision"] for row in rows)),
        "stage_counts": dict(Counter(row["stage"] for row in rows)),
        "unit_kind_counts": dict(Counter(row["unit_kind"] for row in rows)),
        "reuse_scope_counts": dict(Counter(row["reuse_scope"] for row in rows)),
        "rubric_classification_counts": dict(Counter(row["quality_rubric_review"]["classification"] for row in rows)),
        "input_signature_summary": {
            "labels_with_signature": len(rows),
            "labels_with_template_input_profile": sum(bool(row.get("template_input_profile")) for row in rows),
            "labels_with_known_source_structure_or_template_profile": sum(
                row["input_signature"]["data_structure"] != "unknown" or bool(row.get("template_input_profile"))
                for row in rows
            ),
            "data_structure_counts": dict(Counter(row["input_signature"]["data_structure"] for row in rows)),
            "observation_unit_not_stated": sum(row["input_signature"]["observation_unit"] == "not_stated" for row in rows),
            "time_structure_not_stated": sum(row["input_signature"]["time_structure"] == "not_stated" for row in rows),
            "labels_with_required_keys": sum(bool(row["input_signature"]["required_keys"]) for row in rows),
            "variable_characteristics_not_stated": sum(row["input_signature"]["variable_characteristics"] == ["not_stated"] for row in rows),
            "unknown_data_structure": sum(row["input_signature"]["data_structure"] == "unknown" for row in rows),
            "confirmed_field_counts": {
                "data_structure": sum(row["input_signature"]["data_structure"] != "unknown" for row in rows),
                "observation_unit": sum(row["input_signature"]["observation_unit"] != "not_stated" for row in rows),
                "time_structure": sum(row["input_signature"]["time_structure"] != "not_stated" for row in rows),
                "required_keys": sum(bool(row["input_signature"]["required_keys"]) for row in rows),
                "variable_characteristics": sum(row["input_signature"]["variable_characteristics"] != ["not_stated"] for row in rows),
            },
        },
        "preferred_within_checkpoint_count": sum(row["preferred_within_checkpoint"] for row in rows),
        "variant_groups": dict(Counter(row["variant_group"] for row in rows)),
        "variant_policy": contract_document["variant_policy"],
        "source": "human-reviewed annotations with exact source spans",
    }
    if set(contracts) != {row["checkpoint"] for row in rows}:
        missing_labels = sorted(set(contracts) - {row["checkpoint"] for row in rows})
        extra_labels = sorted({row["checkpoint"] for row in rows} - set(contracts))
        raise ValueError(f"contract-label checkpoint mismatch; without_labels={missing_labels}, without_contracts={extra_labels}")
    label_ids = {row["label_id"] for row in rows}
    for row in rows:
        for relation in ("alternatives", "duplicates", "supersedes"):
            dangling = sorted(set(row["relationships"].get(relation, [])) - label_ids)
            if dangling:
                raise ValueError(f"dangling relationship {relation} for {row['label_id']}: {dangling}")
    for checkpoint in contracts:
        defaults = [row["label_id"] for row in rows if row["checkpoint"] == checkpoint and row["canonical_default"]]
        if len(defaults) > 1:
            raise ValueError(f"multiple canonical defaults for {checkpoint}: {defaults}")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    dictionary = {
        "schema_version": "1.1",
        "description": "Search dictionary of human-labeled atomic Stata workflow blocks.",
        "usage_rule": contract_document["variant_policy"],
        "retrieval_guide": {
            "order": [
                "resolve a fine-grained checkpoint from bilingual aliases and the requested state transition",
                "match exact normalized line-leading command anchors",
                "match required input/output state and required observable signals",
                "prefer external-evidence-rubric preferred or conditional general/method-specific variants; retain reference-only variants for gap diagnosis but never auto-select them",
                "hide project-specific assembly unless it is an explicit canonical exception",
                "apply variant selection conditions; use canonical_default only as the final compatible tie-break",
                "if no compatible label exists, search all approved collected examples",
                "if examples remain empty, consult the official Stata manual for syntax, return values, and command state only",
                "ask the user when a substantive research choice remains unresolved",
            ],
            "prohibitions": [
                "do not use substrings in comments, variable names, or filenames as command matches",
                "do not treat a manual example as researcher-style evidence",
                "do not invent glue code when an existing workflow interface is frozen",
            ],
        },
        "entries": [],
    }
    for checkpoint in sorted(contracts):
        contract = contracts[checkpoint]
        checkpoint_rows = [row for row in rows if row["checkpoint"] == checkpoint]
        guide_variants = [row for row in checkpoint_rows if is_noncompeting_guide_mechanics(row)]
        # The legacy workflow dictionary remains the usage/template selector.
        # Guide mechanics have their own always-provided companion index and
        # therefore cannot enter this dictionary's ranking or command index.
        variants = [row for row in checkpoint_rows if not is_noncompeting_guide_mechanics(row)]
        reusable_count = sum(row["decision"] != "drop" for row in variants)
        auto_selectable_count = sum(row["quality_rubric_review"]["classification"] in {"preferred_candidate", "conditional_candidate"} for row in variants)
        reference_only_count = sum(row["quality_rubric_review"]["classification"] == "reference_only" for row in variants)
        maturity = "guide_only" if not variants and guide_variants else ("negative_only" if reusable_count == 0 else ("comparative" if reusable_count >= 2 else "prototype"))
        command_rows = [row for row in variants if row["decision"] != "drop"] or variants
        common_commands = [command for command, _count in Counter(command for row in command_rows for command in row["command_anchors"]).most_common()]
        retrieval_features = []
        for value in [contract["unit_kind"], *contract["input_contract"], *contract["output_contract"], *contract["aliases"]]:
            if value not in retrieval_features:
                retrieval_features.append(value)
        dictionary["entries"].append(
            {
                "headword": checkpoint,
                "name_ko": display_names[checkpoint]["ko"],
                "name_en": display_names[checkpoint]["en"],
                "purpose_ko": contract["purpose_ko"],
                "maturity": maturity,
                "auto_selectable_count": auto_selectable_count,
                "reference_only_count": reference_only_count,
                "guide_mechanics_count": len(guide_variants),
                "aliases": contract["aliases"],
                "unit_kind": contract["unit_kind"],
                "input_contract": contract["input_contract"],
                "output_contract": contract["output_contract"],
                "common_commands": common_commands,
                "retrieval_features": retrieval_features,
                "composition": {
                    "can_follow": contract["can_follow"],
                    "can_precede": contract["can_precede"],
                    "incompatible_with": contract["incompatible_with"],
                },
                "variants": [
                    {
                        "label_id": row["label_id"],
                        "variant_id": row["variant_id"],
                        "decision": row["decision"],
                        "selection_conditions": row["selection_conditions"],
                        "tradeoffs": row["tradeoffs"],
                        "relationships": row["relationships"],
                        "method_family": row.get("method_family"),
                        "specification_facet": row.get("specification_facet"),
                        "state_signature": row.get("state_signature", {"requires": row["input_contract"], "observable_signals": [], "produces": row["output_contract"]}),
                        "input_signature": row["input_signature"],
                        "command_anchors": row["command_anchors"],
                        "required_signals": row["required_signals"],
                        "forbidden_signals": row["forbidden_signals"],
                        "canonical_default": row["canonical_default"],
                        "state_confidence": row["state_confidence"],
                        "reuse_scope": row["reuse_scope"],
                        "readability_score": row["readability_score"],
                        "portability_score": row["portability_score"],
                        "source_specific_elements": row["source_specific_elements"],
                        "reusable_core": row["reusable_core"],
                        "preferred_within_checkpoint": row["preferred_within_checkpoint"],
                        "explicit_canonical_exception": bool(row.get("explicit_canonical_exception", False)),
                        "quality_rubric_review": row["quality_rubric_review"],
                        "source_path": row.get("source_path"),
                        "source_spans": row.get("source_spans", []),
                        "source_file_sha256": row.get("source_file_sha256"),
                        "code_sha256": row.get("code_sha256"),
                    }
                    for row in variants
                ],
            }
        )
    dictionary["command_index"] = {
        command: sorted(entry["headword"] for entry in dictionary["entries"] if command in entry["common_commands"])
        for command in sorted({command for entry in dictionary["entries"] for command in entry["common_commands"]})
    }
    dictionary["alias_index"] = {
        alias: sorted(entry["headword"] for entry in dictionary["entries"] if alias in entry["aliases"])
        for alias in sorted({alias for entry in dictionary["entries"] for alias in entry["aliases"]})
    }
    dictionary_path.write_text(json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    review_dir = plugin / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    toc_lines = [
        "# Stata workflow dictionary 목차",
        "",
        "> 이 문서는 라벨링이 끝나기 전에도 현재 사전 상태를 검토할 수 있도록 builder가 갱신합니다.",
        "",
        "## 현재 규모",
        "",
        f"- 표제어: {summary['checkpoints']}개",
        f"- 용례: {summary['labels']}개",
        f"- 판정: keep {summary['decision_counts'].get('keep', 0)} / conditional_keep {summary['decision_counts'].get('conditional_keep', 0)} / drop {summary['decision_counts'].get('drop', 0)}",
        f"- 심사표: preferred {summary['rubric_classification_counts'].get('preferred_candidate', 0)} / conditional {summary['rubric_classification_counts'].get('conditional_candidate', 0)} / reference {summary['rubric_classification_counts'].get('reference_only', 0)} / exclude {summary['rubric_classification_counts'].get('exclude', 0)}",
        "- 검색 구조: 단계 표제어 → 상태 계약 → 연구자별 variant → 원문 코드 조각",
        "",
        "## 표제어별 현황",
        "",
        "| 한글 표제어 | English name | checkpoint | 대표 명령 / Common commands | 찾는 특징 / Retrieval features | 성숙도 | 용례 | 자동선택 | 참고전용 | keep | conditional | drop | 상태 신호 있음 | 사람 직접기록 |",
        "|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for entry in dictionary["entries"]:
        variants = [row for row in rows if row["checkpoint"] == entry["headword"]]
        decisions = Counter(row["decision"] for row in variants)
        specific_states = sum(row["state_signature_origin"] == "variant_specific" for row in variants)
        signaled_states = sum(bool(row["state_signature"].get("observable_signals")) for row in variants)
        toc_lines.append(
            "| " + " | ".join(
                [
                    markdown_cell(entry["name_ko"]),
                    markdown_cell(entry["name_en"]),
                    f"`{entry['headword']}`",
                    markdown_cell(entry["common_commands"][:5]),
                    markdown_cell(entry["retrieval_features"][:3]),
                    entry["maturity"],
                    str(len(variants)),
                    str(sum(row["quality_rubric_review"]["classification"] in {"preferred_candidate", "conditional_candidate"} for row in variants)),
                    str(sum(row["quality_rubric_review"]["classification"] == "reference_only" for row in variants)),
                    str(decisions.get("keep", 0)),
                    str(decisions.get("conditional_keep", 0)),
                    str(decisions.get("drop", 0)),
                    f"{signaled_states}/{len(variants)}",
                    f"{specific_states}/{len(variants)}",
                ]
            ) + " |"
        )
    toc_lines.extend(
        [
            "",
            "## 검토 기준",
            "",
            "- 용례가 1개뿐이면 아직 연구자 간 변형이 충분하지 않을 수 있습니다.",
            "- `prototype`은 재사용 가능 용례가 1개, `comparative`는 2개 이상, `negative_only`는 금지 사례만 있다는 뜻입니다.",
            "- `drop`만 있는 표제어는 안전한 대체 용례가 없는 빈칸입니다.",
            "- `상태 신호 있음`은 원문 코드에서 관측 가능한 command/state 신호가 기록됐다는 뜻입니다.",
            "- `사람 직접기록`이 낮으면 상태 신호는 코드에서 자동 추출됐고, 연구자별 handoff 의미는 아직 사람이 세분하지 않았다는 뜻입니다.",
            "- 같은 표제어의 variant는 함께 보존하되 selection condition이 겹치면 중복 또는 통합 여부를 검토합니다.",
            "",
        ]
    )
    (review_dir / "dictionary_toc.md").write_text("\n".join(toc_lines), encoding="utf-8", newline="\n")

    review_lines = [
        "# Stata workflow 라벨링 중간 검토",
        "",
        "> 정본 annotations에서 생성한 현재 라벨 전수표입니다. 라벨링이 진행될 때마다 갱신됩니다.",
        "",
        "| label_id | 한글 / English / checkpoint / variant | 판정 | 명령 anchor | 실제 입력 상태 | 실제 출력 상태 | 최소 수정 필드 | 원문 | 이번 검토 질문 | 검토 메모 |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for row in rows:
        state = row["state_signature"]
        source_spans = ",".join(f"{start}-{end}" for start, end in row.get("source_spans", []))
        source_reference = row.get("source_path") or "; ".join(row.get("source_urls", []))
        review_question = (
            "이 금지 판정과 대체 원칙의 근거가 충분한가?"
            if row["decision"] == "drop"
            else "선택 조건과 실제 입출력 상태가 이 코드 조각을 고르기에 충분히 구체적인가?"
            if row["decision"] == "conditional_keep"
            else "원문 상태와 사용자 코드의 입출력·호출 인터페이스를 그대로 보존할 수 있는가?"
        )
        review_lines.append(
            "| " + " | ".join(
                [
                    f"`{row['label_id']}`",
                    f"{row['name_ko']} / {row['name_en']} / `{row['checkpoint']}` / `{row['variant_id']}`",
                    row["decision"],
                    markdown_cell(row["command_anchors"]),
                    markdown_cell(state.get("requires", [])),
                    markdown_cell(state.get("produces", [])),
                    markdown_cell(row["minimal_edit_fields"]),
                    f"`{source_reference}:{source_spans}`",
                    review_question,
                    markdown_cell(row["review_notes"]),
                ]
            ) + " |"
        )
    review_lines.extend(
        [
            "",
            "## 판정 해석",
            "",
            "- `keep`: 현재 선택 조건 아래 거의 그대로 재사용 가능한 용례",
            "- `conditional_keep`: 명시된 상태·가정·필수 수정이 충족될 때만 재사용",
            "- `drop`: 비교·반례 전용이며 생성 코드로 복사하지 않음",
            "",
        ]
    )
    (review_dir / "labeling_review.md").write_text("\n".join(review_lines), encoding="utf-8", newline="\n")

    generality_lines = [
        "# 범용성 선별 중간 검토 / Generalizability selection review",
        "",
        "> 각 원문 source span과 주변 문맥을 읽은 뒤 범용성, 가독성, 이식성을 별도로 판정한 전수표입니다. `project_specific`은 명시적 canonical 예외가 아니면 기본 생성 검색에서 제외됩니다.",
        "",
        f"- general: {summary['reuse_scope_counts'].get('general', 0)}",
        f"- method_specific: {summary['reuse_scope_counts'].get('method_specific', 0)}",
        f"- project_specific: {summary['reuse_scope_counts'].get('project_specific', 0)}",
        f"- negative: {summary['reuse_scope_counts'].get('negative', 0)}",
        f"- preferred-within-checkpoint flags: {summary['preferred_within_checkpoint_count']}",
        f"- input_signature coverage: {summary['input_signature_summary']['labels_with_signature']}/{summary['labels']}",
        f"- input data structure unknown: {summary['input_signature_summary']['unknown_data_structure']}/{summary['labels']}",
        f"- input observation unit not stated: {summary['input_signature_summary']['observation_unit_not_stated']}/{summary['labels']}",
        f"- input time structure not stated: {summary['input_signature_summary']['time_structure_not_stated']}/{summary['labels']}",
        f"- input required keys observed: {summary['input_signature_summary']['labels_with_required_keys']}/{summary['labels']}",
        f"- input variable characteristics not stated: {summary['input_signature_summary']['variable_characteristics_not_stated']}/{summary['labels']}",
        "",
        "| 한글 단계 | English stage | label_id | 범용성 / Scope | 심사등급 | 점수 | 가독성 | 이식성 | 기본 우선 | 범용 핵심 | 프로젝트 특수 요소 | 판정 근거 | 원문 |",
        "|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|",
    ]
    for row in rows:
        source_spans = ",".join(f"{start}-{end}" for start, end in row.get("source_spans", []))
        source_reference = row.get("source_path") or "; ".join(row.get("source_urls", []))
        preferred = "yes" if row["preferred_within_checkpoint"] else "no"
        if row.get("explicit_canonical_exception"):
            preferred += " (explicit canonical exception)"
        generality_lines.append(
            "| " + " | ".join(
                [
                    markdown_cell(row["name_ko"]),
                    markdown_cell(row["name_en"]),
                    f"`{row['label_id']}`",
                    row["reuse_scope"],
                    row["quality_rubric_review"]["classification"],
                    str(row["quality_rubric_review"]["weighted_score"]),
                    str(row["readability_score"]),
                    str(row["portability_score"]),
                    preferred,
                    markdown_cell(row["reusable_core"]),
                    markdown_cell(row["source_specific_elements"]),
                    markdown_cell(row["generality_rationale_ko"]),
                    f"`{source_reference}:{source_spans}`",
                ]
            ) + " |"
        )
    generality_lines.extend(
        [
            "",
            "## 검색 원칙 / Retrieval policy",
            "",
            "- `general`: 상태 계약이 맞으면 기본 생성 후보입니다.",
            "- `method_specific`: 사용자가 그 방법과 식별 조건을 선택한 경우에만 후보입니다.",
            "- `project_specific`: 기본 검색에서 숨기며, 명시적 canonical 예외 또는 사용자의 정확한 요청이 있을 때만 봅니다.",
            "- `negative`: 반례 전용이며 생성 코드로 복사하지 않습니다.",
            "- `preferred_candidate`와 `conditional_candidate`만 자동 조립 후보입니다. `reference_only`는 자료를 버리지 않기 위한 비교·gap 진단용이며 자동 선택하지 않습니다.",
            "- 같은 상태에 여러 후보가 있으면 `preferred_within_checkpoint`, 가독성, 이식성 순으로 우선하고, 입력·출력 상태가 다르면 별도 variant로 보존합니다.",
            "",
        ]
    )
    (review_dir / "generality_selection_review.md").write_text("\n".join(generality_lines), encoding="utf-8", newline="\n")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
