from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Iterable


GUIDE_SOURCE_KINDS = {
    "official_guide_derived_mechanics",
    "official_manual_derived_mechanics",
    "official_manual_guide_derived_mechanics",
    "official_manual_mechanics",
    "official_stata_manual_derived_mechanics",
    "official_stata_manual_guide_derived_mechanics",
    "maintainer_command_guide_derived_mechanics",
    "maintainer_guide_derived_mechanics",
    "user_written_command_guide_derived_mechanics",
    "user_written_guide_derived_mechanics",
}
USAGE_SOURCE_PREFIXES = (
    "deposited_research_code",
    "external_research_code",
    "independent_researcher_code",
)
EXCLUDED_DERIVED_SOURCE_MARKERS = (
    "canonical",
    "guide",
    "manual",
    "project_snapshot",
)
AUDITED_RUBRIC_STATUSES = {
    "external_evidence_rubric_reviewed",
    "independent_audit_passed",
}
AUTO_SELECTABLE_CLASSES = {"preferred_candidate", "conditional_candidate"}
CORPUS_OCCURRENCE_SCHEMA_VERSION = "2.0"


def canonical_json_sha256(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSONL at {path}:{line_number}: {error}") from error
        if not isinstance(value, dict):
            raise ValueError(f"JSONL row must be an object at {path}:{line_number}")
        rows.append(value)
    return rows


def source_tier(row: dict) -> str:
    kind = str(row.get("source_kind") or "").strip().lower()
    if kind in GUIDE_SOURCE_KINDS:
        return "guide_mechanics"
    if any(kind.startswith(prefix) for prefix in USAGE_SOURCE_PREFIXES):
        if any(marker in kind for marker in EXCLUDED_DERIVED_SOURCE_MARKERS):
            raise ValueError(
                f"ambiguous research usage source tier for {row.get('label_id')}: {kind}"
            )
        return "research_usage"
    return "excluded_derived_or_unclassified"


def guide_authority_tier(row: dict) -> str:
    kind = str(row.get("source_kind") or "").lower()
    provenance = row.get("derivation_provenance") or {}
    authority = str(provenance.get("authority") or "").lower()
    source_url = str(provenance.get("source_url") or "").lower()
    if kind.startswith("official_") or "statacorp" in authority or "stata.com/manuals/" in source_url:
        return "official_manual"
    if kind.startswith("maintainer_") or kind.startswith("user_written_"):
        return "maintainer_or_user_written_guide"
    raise ValueError(f"unsupported guide authority tier for {row.get('label_id')}: {kind}")


def _promotion_check_statuses(row: dict) -> tuple[object, object, object]:
    promotion_audit = row.get("promotion_audit") or {}
    runtime = row.get("runtime") or promotion_audit.get("runtime") or {}
    selector = row.get("selector") or promotion_audit.get("selector") or {}
    runtime_status = row.get("runtime_status") or runtime.get("status")
    positive = selector.get("positive") if isinstance(selector, dict) else {}
    negative = selector.get("negative") if isinstance(selector, dict) else {}
    selector_positive_status = row.get("selector_positive_status") or (
        positive.get("status") if isinstance(positive, dict) else None
    )
    selector_negative_status = (
        row.get("selector_sibling_negative_status")
        or row.get("selector_negative_status")
        or (negative.get("status") if isinstance(negative, dict) else None)
    )
    return runtime_status, selector_positive_status, selector_negative_status


def audit_gate(row: dict) -> dict:
    review = row.get("quality_rubric_review") or {}
    verification = review.get("source_verification") or {}
    promotion_status = str(row.get("promotion_status") or "")
    runtime_status, selector_positive_status, selector_negative_status = _promotion_check_statuses(row)
    explicit_pass = (
        promotion_status == "audited_template"
        and runtime_status == "pass"
        and selector_positive_status == "pass"
        and selector_negative_status == "pass"
        and verification.get("code_sha256_match") is True
        and verification.get("source_file_sha256_match") is True
    )
    legacy_pass = (
        review.get("status") in AUDITED_RUBRIC_STATUSES
        and verification.get("code_sha256_match") is True
        and verification.get("source_file_sha256_match") is True
    )
    passed = explicit_pass or legacy_pass
    return {
        "passed": passed,
        "basis": "audited_template" if explicit_pass else "legacy_external_evidence_rubric_review" if legacy_pass else "not_audited",
        "promotion_status": promotion_status or None,
        "rubric_status": review.get("status"),
        "source_hash_verified": verification.get("source_file_sha256_match") is True,
        "code_hash_verified": verification.get("code_sha256_match") is True,
        "runtime_status": runtime_status,
        "selector_positive_status": selector_positive_status,
        "selector_sibling_negative_status": selector_negative_status,
        "auto_selectable_passed": explicit_pass,
    }


def common_card(row: dict, tier: str) -> dict:
    provenance = {
        "source_kind": row.get("source_kind"),
        "source_path": row.get("source_path"),
        "source_spans": row.get("source_spans") or [],
        "source_file_sha256": row.get("source_file_sha256"),
        "code_sha256": row.get("code_sha256"),
        "derivation_provenance": row.get("derivation_provenance"),
        "promotion_audit": row.get("promotion_audit"),
        "audit_gate": audit_gate(row),
        "input_row_sha256": canonical_json_sha256(row),
    }
    return {
        "schema_version": "1.0",
        "evidence_layer": tier,
        "layer_id": f"{tier}:{row['label_id']}",
        "label_id": row["label_id"],
        "checkpoint": row.get("checkpoint"),
        "variant_group": row.get("variant_group"),
        "variant_id": row.get("variant_id"),
        "contract_ids": row.get("contract_ids") or [],
        "supplemental_contract_id": row.get("supplemental_contract_id"),
        "unmapped_reason": row.get("unmapped_reason"),
        "variant_facets": row.get("variant_facets") or {},
        "version": row.get("version"),
        "stage": row.get("stage"),
        "unit_kind": row.get("unit_kind"),
        "name_ko": row.get("name_ko"),
        "name_en": row.get("name_en"),
        "purpose_ko": row.get("purpose_ko"),
        "aliases": row.get("aliases") or [],
        "command_anchors": row.get("command_anchors") or [],
        "state_signature": row.get("state_signature") or {},
        "template_input_profile": row.get("template_input_profile") or {},
        "selection_conditions": row.get("selection_conditions") or [],
        "input_contract": row.get("input_contract") or [],
        "output_contract": row.get("output_contract") or [],
        "minimal_edit_fields": row.get("minimal_edit_fields") or [],
        "tradeoffs": row.get("tradeoffs") or [],
        "decision": row.get("decision"),
        "promotion_status": row.get("promotion_status"),
        "rubric_classification": (row.get("quality_rubric_review") or {}).get("classification"),
        "code": row.get("code") or "",
        "provenance": provenance,
    }


def research_usage_support_card(row: dict) -> dict:
    required = {
        "record_id",
        "project_id",
        "version",
        "file",
        "line_span",
        "command",
        "contract_ids",
        "disposition",
        "source_container_sha256",
        "extracted_file_sha256",
        "source_url",
    }

    missing = sorted(required - set(row))
    if missing:
        raise ValueError(f"research usage evidence {row.get('record_id')} missing fields: {', '.join(missing)}")
    for field in ("source_container_sha256", "extracted_file_sha256"):
        value = str(row[field])
        if len(value) != 64 or any(character not in "0123456789abcdef" for character in value.lower()):
            raise ValueError(f"research usage evidence {row['record_id']} has invalid {field}")
    if not str(row["source_url"]).startswith("https://www.openicpsr.org/"):
        raise ValueError(f"research usage evidence {row['record_id']} has invalid source_url")
    return {
        "schema_version": "1.0",
        "evidence_layer": "research_usage",
        "evidence_role": "exact_usage_support",
        "layer_id": f"research_usage_support:{row['record_id']}",
        "label_id": row["record_id"],
        "checkpoint": None,
        "variant_group": None,
        "variant_id": row["record_id"],
        "variant_facets": row.get("variant_facets") or {},
        "version": row["version"],
        "stage": None,
        "unit_kind": None,
        "name_ko": "독립 연구자 exact usage support",
        "name_en": "Independent researcher exact usage support",
        "purpose_ko": row.get("context") or "",
        "aliases": [],
        "command_anchors": [row["command"]],
        "contract_ids": row["contract_ids"],
        "supplemental_contract_id": row.get("supplemental_contract_id"),
        "unmapped_reason": row.get("unmapped_reason"),
        "state_signature": {},
        "template_input_profile": {},
        "selection_conditions": [],
        "input_contract": [],
        "output_contract": [],
        "minimal_edit_fields": [],
        "tradeoffs": [row.get("reason") or ""],
        "decision": "conditional_keep",
        "rubric_classification": "reference_only",
        "code": "",
        "code_available": False,
        "source_tier": "deposited_or_independent_research_code",
        "auto_selectable": False,
        "independent_research_usage": True,
        "disposition": row["disposition"],
        "provenance": {
            "source_kind": "external_research_code_exact_usage_support",
            "source_path": row["file"],
            "source_spans": row["line_span"],
            "source_file_sha256": row["extracted_file_sha256"],
            "source_container_sha256": row["source_container_sha256"],
            "source_url": row["source_url"],
            "project_id": row["project_id"],
            "version": row["version"],
            "file": row["file"],
            "line_span": row["line_span"],
            "contract_ids": row["contract_ids"],
            "disposition": row["disposition"],
            "reason": row.get("reason"),
            "context": row.get("context"),
            "input_row_sha256": canonical_json_sha256(row),
            "audit_gate": {
                "passed": True,
                "basis": "independent_exact_usage_ledger_audit",
                "runtime_status": "not_checked",
                "selector_status": "not_checked",
            },
        },
    }


def corpus_occurrence_support_card(row: dict) -> dict:
    """Convert one passed corpus occurrence into non-competing support metadata.

    Corpus occurrences are deliberately not exact usage templates: the release
    ledger contains no source code, and all runtime/selector checks are
    explicitly not run.  This is separate from the immutable AEA support ledger
    handled by ``research_usage_support_card`` above.
    """
    required = {
        "record_id",
        "audit_decision",
        "evidence_role",
        "code_available",
        "promotion_prohibited",
        "runtime_status",
        "selector_status",
        "command_anchors",
        "exact_contract_ids_proposed",
        "source",
        "source_span",
        "source_file",
        "source_container",
    }
    if row.get("schema_version") != CORPUS_OCCURRENCE_SCHEMA_VERSION:
        raise ValueError(
            f"corpus occurrence {row.get('record_id')} requires schema_version "
            f"{CORPUS_OCCURRENCE_SCHEMA_VERSION}"
        )
    missing = sorted(required - set(row))
    if missing:
        raise ValueError(f"corpus occurrence {row.get('record_id')} missing fields: {', '.join(missing)}")
    if row.get("audit_decision") != "pass_reference_only":
        raise ValueError(f"non-pass corpus occurrence cannot enter research usage output: {row.get('record_id')}")
    if row.get("evidence_role") != "occurrence_support":
        raise ValueError(f"unexpected corpus occurrence evidence_role: {row.get('record_id')}")
    if row.get("code_available") is not False or row.get("promotion_prohibited") is not True:
        raise ValueError(f"corpus occurrence violates code/promotion contract: {row.get('record_id')}")
    if row.get("runtime_status") != "not_run" or row.get("selector_status") != "not_run":
        raise ValueError(f"corpus occurrence runtime/selector status is not not_run: {row.get('record_id')}")
    source = row["source"]
    source_span = row["source_span"]
    source_file = row["source_file"]
    source_container = row["source_container"]
    for field, value in {
        "source_file.sha256": source_file.get("sha256"),
        "source_span.span_sha256": source_span.get("span_sha256"),
        "source_container.sha256": source_container.get("sha256"),
    }.items():
        text = str(value or "")
        if len(text) != 64 or any(character not in "0123456789abcdef" for character in text.lower()):
            raise ValueError(f"corpus occurrence {row['record_id']} has invalid {field}")
    return {
        "schema_version": CORPUS_OCCURRENCE_SCHEMA_VERSION,
        "evidence_layer": "research_usage",
        "evidence_role": "occurrence_support",
        "layer_id": f"research_usage_occurrence_support:{row['record_id']}",
        "label_id": row["record_id"],
        "checkpoint": None,
        "variant_group": None,
        "variant_id": row["record_id"],
        "variant_facets": {},
        "version": source.get("version"),
        "stage": None,
        "unit_kind": None,
        "name_ko": "논문 코드 occurrence support",
        "name_en": "Paper-code occurrence support",
        "purpose_ko": "독립 감사에서 확인된 논문 코드의 관찰 command mechanics를 provenance-only로 제공한다.",
        "aliases": [],
        "command_anchors": row["command_anchors"],
        "contract_ids": row["exact_contract_ids_proposed"],
        "supplemental_contract_id": None,
        "unmapped_reason": row.get("unmapped_reason"),
        "state_signature": {},
        "template_input_profile": {},
        "selection_conditions": [],
        "input_contract": [],
        "output_contract": [],
        "minimal_edit_fields": [],
        "tradeoffs": list((row.get("audit_decision_detail") or {}).get("reasons") or []),
        "decision": "reference_only",
        "rubric_classification": "reference_only",
        "code": "",
        "code_available": False,
        "source_tier": "deposited_or_independent_research_code",
        "auto_selectable": False,
        "independent_research_usage": True,
        "promotion_prohibited": True,
        "runtime_status": "not_run",
        "selector_status": "not_run",
        "provenance": {
            "source_kind": "deposited_research_code_occurrence_support",
            "source_path": source.get("source_path"),
            "source_spans": [[source_span.get("start"), source_span.get("end")]],
            "source_file_sha256": source_file.get("sha256"),
            "source_container_sha256": source_container.get("sha256"),
            "source_container_path": source_container.get("path"),
            "source_url": source.get("repository_url"),
            "source_container_url": source_container.get("url"),
            "source_span_sha256": source_span.get("span_sha256"),
            "project_id": source.get("project_id"),
            "project_path": source.get("project_path"),
            "version": source.get("version"),
            "article_doi": source.get("article_doi"),
            "article_url": source.get("article_url"),
            "repository_doi": source.get("repository_doi"),
            "repository_url": source.get("repository_url"),
            "lineage": row.get("lineage") or {},
            "observed": row.get("observed") or {},
            "audit_decision": row["audit_decision"],
            "audit_decision_detail": row.get("audit_decision_detail") or {},
            "promotion_prohibited": True,
            "auto_selectable": False,
            "runtime_status": "not_run",
            "selector_status": "not_run",
        },
    }
def _guide_duplicate_key(card: dict) -> str | None:
    if not card.get("contract_ids"):
        return None
    identity = {
        "contract_ids": sorted(card["contract_ids"]),
        "variant_id": card.get("variant_id"),
        "command_anchors": sorted(card.get("command_anchors") or []),
        "version": card.get("version"),
        "variant_facets": card.get("variant_facets") or {},
        "code_sha256": (card.get("provenance") or {}).get("code_sha256"),
    }
    return canonical_json_sha256(identity)


def merge_duplicate_guide_cards(cards: Iterable[dict]) -> list[dict]:
    """Merge exact mechanics duplicates without collapsing material variants."""
    merged: list[dict] = []
    by_key: dict[str, dict] = {}
    for card in cards:
        key = _guide_duplicate_key(card)
        if key is None or key not in by_key:
            merged.append(card)
            if key is not None:
                by_key[key] = card
            continue
        primary = by_key[key]
        provenance = primary["provenance"]
        supporting = provenance.setdefault("supporting_provenance", [])
        if not supporting:
            supporting.append({
                "label_id": primary["label_id"],
                "source_kind": provenance.get("source_kind"),
                "source_path": provenance.get("source_path"),
                "source_spans": provenance.get("source_spans") or [],
                "source_file_sha256": provenance.get("source_file_sha256"),
                "code_sha256": provenance.get("code_sha256"),
                "input_row_sha256": provenance.get("input_row_sha256"),
            })
        duplicate_provenance = card["provenance"]
        supporting.append({
            "label_id": card["label_id"],
            "source_kind": duplicate_provenance.get("source_kind"),
            "source_path": duplicate_provenance.get("source_path"),
            "source_spans": duplicate_provenance.get("source_spans") or [],
            "source_file_sha256": duplicate_provenance.get("source_file_sha256"),
            "code_sha256": duplicate_provenance.get("code_sha256"),
            "input_row_sha256": duplicate_provenance.get("input_row_sha256"),
        })
        primary["merged_duplicate_label_ids"] = [item["label_id"] for item in supporting]
    return merged


def build_layers(
    rows: Iterable[dict],
    research_usage_evidence: Iterable[dict] = (),
    corpus_occurrences: Iterable[dict] = (),
) -> tuple[list[dict], list[dict], dict]:
    source_rows = list(rows)
    label_ids = [str(row.get("label_id") or "") for row in source_rows]
    missing_ids = [index + 1 for index, value in enumerate(label_ids) if not value]
    if missing_ids:
        raise ValueError(f"missing label_id at input rows: {missing_ids}")
    duplicates = sorted(label_id for label_id, count in Counter(label_ids).items() if count > 1)
    if duplicates:
        raise ValueError(f"duplicate label_id(s): {', '.join(duplicates)}")

    guide_cards: list[dict] = []
    usage_cards: list[dict] = []
    skipped = Counter()
    for row in source_rows:
        tier = source_tier(row)
        if tier == "excluded_derived_or_unclassified":
            skipped[str(row.get("source_kind") or "<missing>")] += 1
            continue
        gate = audit_gate(row)
        if not gate["passed"]:
            raise ValueError(
                f"evidence layer input did not pass the upstream audit gate: {row['label_id']} ({gate['basis']})"
            )
        card = common_card(row, tier)
        if tier == "guide_mechanics":
            card.update(
                authority_tier=guide_authority_tier(row),
                auto_selectable=False,
                research_decisions_supplied=False,
                usage_rule=(
                    "Guide mechanics explain command syntax and state handling only. "
                    "They never select a sample, estimand, model, treatment, key, VCE, axis, sheet, or output placement."
                ),
            )
            guide_cards.append(card)
        elif tier == "research_usage":
            review_class = card["rubric_classification"]
            explicit_auto = row.get("auto_selectable")
            requested_auto_selectable = (
                explicit_auto is True
                if isinstance(explicit_auto, bool)
                else row.get("decision") != "drop" and review_class in AUTO_SELECTABLE_CLASSES
            )
            auto_selectable = requested_auto_selectable and gate["auto_selectable_passed"]
            card.update(
                source_tier="deposited_or_independent_research_code",
                auto_selectable=bool(auto_selectable),
                independent_research_usage=True,
            )
            usage_cards.append(card)
        else:  # pragma: no cover - source_tier is deliberately closed.
            raise ValueError(f"unsupported source tier for {row['label_id']}: {tier}")

    support_rows = list(research_usage_evidence)
    audit_summaries = [row for row in support_rows if row.get("record_type") == "audit_summary"]
    if len(audit_summaries) > 1:
        raise ValueError("research usage evidence contains multiple audit_summary rows")
    support_ids = [str(row.get("record_id") or "") for row in support_rows if row.get("record_type") == "evidence"]
    duplicate_support_ids = sorted(value for value, count in Counter(support_ids).items() if count > 1)
    if duplicate_support_ids:
        raise ValueError(f"duplicate research usage evidence record_id(s): {', '.join(duplicate_support_ids)}")
    rejected_support = [row for row in support_rows if row.get("record_type") == "reject"]
    if audit_summaries:
        declared_evidence = int(audit_summaries[0].get("evidence_count", -1))
        if declared_evidence != len(support_ids):
            raise ValueError(
                f"research usage audit summary evidence_count mismatch: {declared_evidence} != {len(support_ids)}"
            )
    for row in support_rows:
        record_type = row.get("record_type")
        if record_type in {"audit_summary", "reject"}:
            continue
        if record_type != "evidence":
            raise ValueError(f"unsupported research usage evidence record_type: {record_type}")
        if str(row.get("disposition") or "").startswith("reject"):
            raise ValueError(f"rejected evidence cannot enter research usage layer: {row.get('record_id')}")
        usage_cards.append(research_usage_support_card(row))

    corpus_rows = list(corpus_occurrences)
    corpus_decisions = Counter(str(row.get("audit_decision") or "") for row in corpus_rows)
    if corpus_rows:
        expected_decisions = {"needs_manual_followup": 13, "pass_reference_only": 38, "reject": 81}
        if dict(corpus_decisions) != expected_decisions:
            raise ValueError(
                f"corpus occurrence decision totals mismatch: {dict(corpus_decisions)} != {expected_decisions}"
            )
        corpus_ids = [str(row.get("record_id") or "") for row in corpus_rows]
        if not all(corpus_ids) or len(corpus_ids) != len(set(corpus_ids)):
            raise ValueError("corpus occurrence record_id values must be present and unique")
        for row in corpus_rows:
            if row.get("schema_version") != CORPUS_OCCURRENCE_SCHEMA_VERSION:
                raise ValueError(
                    f"corpus occurrence {row.get('record_id')} requires schema_version "
                    f"{CORPUS_OCCURRENCE_SCHEMA_VERSION}"
                )
            if row.get("audit_decision") == "pass_reference_only":
                usage_cards.append(corpus_occurrence_support_card(row))
            elif row.get("audit_decision") not in {"needs_manual_followup", "reject"}:
                raise ValueError(f"unsupported corpus occurrence audit_decision: {row.get('audit_decision')}")

    guide_cards = merge_duplicate_guide_cards(guide_cards)
    guide_cards.sort(key=lambda row: (row["checkpoint"] or "", row["variant_group"] or "", row["label_id"]))
    usage_cards.sort(key=lambda row: (row["checkpoint"] or "", row["variant_group"] or "", row["label_id"]))
    layer_ids = [row["layer_id"] for row in guide_cards + usage_cards]
    duplicate_layer_ids = sorted(value for value, count in Counter(layer_ids).items() if count > 1)
    if duplicate_layer_ids:
        raise ValueError(f"duplicate layer_id(s): {', '.join(duplicate_layer_ids)}")
    if any(row["auto_selectable"] for row in guide_cards):
        raise ValueError("guide layer contains an auto-selectable card")

    summary = {
        "input_rows": len(source_rows),
        "guide_cards": len(guide_cards),
        "research_usage_examples": len(usage_cards),
        "guide_auto_selectable": sum(bool(row["auto_selectable"]) for row in guide_cards),
        "usage_auto_selectable": sum(bool(row["auto_selectable"]) for row in usage_cards),
        "exact_usage_support": sum(row.get("evidence_role") == "exact_usage_support" for row in usage_cards),
        "occurrence_support": sum(row.get("evidence_role") == "occurrence_support" for row in usage_cards),
        "corpus_occurrence_input_rows": len(corpus_rows),
        "corpus_occurrence_schema_version": CORPUS_OCCURRENCE_SCHEMA_VERSION if corpus_rows else None,
        "corpus_occurrence_pass_reference_only": corpus_decisions.get("pass_reference_only", 0),
        "corpus_occurrence_followup_excluded": corpus_decisions.get("needs_manual_followup", 0),
        "corpus_occurrence_reject_excluded": corpus_decisions.get("reject", 0),
        "research_usage_rejects_excluded": max(
            len(rejected_support),
            int(audit_summaries[0].get("reject_count", 0)) if audit_summaries else 0,
        ),
        "skipped_source_kinds": dict(sorted(skipped.items())),
    }
    return guide_cards, usage_cards, summary


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows)
    temporary = path.with_name(f"{path.name}.tmp")
    temporary.write_text(payload, encoding="utf-8", newline="\n")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build non-competing guide-mechanics and research-usage evidence layers."
    )
    plugin = Path(__file__).resolve().parents[1]
    parser.add_argument("--input", type=Path, default=plugin / "data" / "labeled_checkpoints.jsonl")
    parser.add_argument("--guide-output", type=Path, default=plugin / "data" / "guide_mechanics_cards.jsonl")
    parser.add_argument("--usage-output", type=Path, default=plugin / "data" / "research_usage_examples.jsonl")
    parser.add_argument(
        "--usage-evidence",
        type=Path,
        default=plugin / "annotations" / "research_usage_evidence.jsonl",
        help="Optional plugin-owned audited exact-usage ledger. Evidence rows are reference-only; reject rows are counted and excluded.",
    )
    parser.add_argument(
        "--corpus-occurrences",
        type=Path,
        default=plugin / "annotations" / "corpus_usage_occurrences.jsonl",
        help="Optional code-free corpus occurrence ledger. Only pass_reference_only rows become occurrence_support cards.",
    )
    args = parser.parse_args()

    usage_evidence = read_jsonl(args.usage_evidence) if args.usage_evidence.exists() else []
    corpus_occurrences = read_jsonl(args.corpus_occurrences) if args.corpus_occurrences.exists() else []
    guide_cards, usage_cards, summary = build_layers(read_jsonl(args.input), usage_evidence, corpus_occurrences)
    write_jsonl(args.guide_output, guide_cards)
    write_jsonl(args.usage_output, usage_cards)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
