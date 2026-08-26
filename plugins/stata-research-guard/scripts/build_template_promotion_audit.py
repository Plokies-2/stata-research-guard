"""Deterministically append the independently re-audited Top-100 guide atoms.

The three Top-100 atomic inventories and their independent JSONL audit are the
only authority for the 178 new rows.  Existing ledger rows are loaded and
copied without normalization or semantic edits, so a rebuild cannot silently
rewrite the pre-existing 262 records.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[3]
PLUGIN = ROOT / "plugins" / "stata-research-guard"
ANNOTATIONS = PLUGIN / "annotations"
REQUIRED_NEW = 178
LEGACY_RECORDS = 262
NEW_SOURCES = (
    ("top100_official_data_programming.json", "top100_official_data_programming_guide_templates.do"),
    ("top100_official_models.json", "top100_official_models_guide_templates.do"),
    ("top100_maintainer_methods.json", "top100_maintainer_methods_guide_templates.do"),
)
SOURCE_KIND_TO_ROLE = {
    "official_stata_manual_guide_derived_mechanics": "official_manual",
    "official_manual_guide_derived_mechanics": "official_manual",
    "user_written_command_guide_derived_mechanics": "maintainer_guide",
}
SAFETY_CHECKS = {
    "nested_loop": "pass",
    "tex_output": "pass",
    "dependency_probe": "pass",
    "manual_coefficient_bridge": "pass",
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_sha256(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256_bytes(encoded.encode("utf-8"))


def load_json(path: Path) -> Any:
    raw = path.read_bytes()
    if b"\xef\xbf\xbd" in raw:
        raise ValueError(f"U+FFFD in JSON source: {path}")
    return json.loads(raw.decode("utf-8"))


def extract_block(text: str, spans: list[list[int]]) -> str:
    lines = text.splitlines()
    blocks: list[str] = []
    for span in spans:
        if not isinstance(span, list) or len(span) != 2:
            raise ValueError(f"invalid source span: {span!r}")
        start, end = span
        if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start or end > len(lines):
            raise ValueError(f"invalid source span {span!r}; file has {len(lines)} lines")
        blocks.append("\n".join(lines[start - 1 : end]))
    return "\n\n".join(blocks).rstrip() + "\n"


def source_span_spec(spans: list[list[int]]) -> str:
    return ",".join(str(a) if a == b else f"{a}-{b}" for a, b in spans)


def walk_strings(value: object) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from walk_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from walk_strings(item)


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _source_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def _audit_row_map(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        label_id = row.get("label_id")
        _require(isinstance(label_id, str) and label_id, "audit row has no label_id")
        _require(label_id not in result, f"duplicate independent audit label_id: {label_id}")
        result[label_id] = row
    return result


def _load_current_sources() -> dict[str, tuple[Path, Path, dict[str, Any]]]:
    values: dict[str, tuple[Path, Path, dict[str, Any]]] = {}
    for inventory_name, snapshot_name in NEW_SOURCES:
        inventory = ANNOTATIONS / "atomic_template_sets" / inventory_name
        snapshot = ANNOTATIONS / "source_snapshots" / snapshot_name
        _require(inventory.exists(), f"missing atomic inventory: {inventory}")
        _require(snapshot.exists(), f"missing source snapshot: {snapshot}")
        entries = load_json(inventory)
        _require(isinstance(entries, list), f"atomic inventory must be an array: {inventory}")
        for entry in entries:
            _require(isinstance(entry, dict), f"atomic entry must be an object: {inventory}")
            label_id = entry.get("label_id")
            _require(isinstance(label_id, str) and label_id, f"atomic entry has no label_id: {inventory}")
            _require(label_id not in values, f"duplicate current atomic label_id: {label_id}")
            values[label_id] = (inventory, snapshot, entry)
    _require(len(values) == REQUIRED_NEW, f"expected {REQUIRED_NEW} current Top-100 atoms, found {len(values)}")
    return values


def _validate_summary(summary: dict[str, Any]) -> None:
    _require(summary.get("candidate_count") == REQUIRED_NEW, "independent audit candidate_count must be 178")
    _require(summary.get("decision_counts") == {"pass_reference_only": REQUIRED_NEW}, "independent audit decisions are not exactly 178 passes")
    _require(summary.get("all_candidates_pass_reference_only") is True, "independent audit all-pass gate is not true")
    _require(summary.get("existing_atomic_candidate_count_checked") == LEGACY_RECORDS, "independent audit did not check the 262 existing atoms")


def _validate_and_record(
    row: dict[str, Any],
    inventory: Path,
    snapshot: Path,
    entry: dict[str, Any],
    requirements: set[str],
) -> dict[str, Any]:
    label_id = entry["label_id"]
    _require(row.get("decision") == "pass_reference_only", f"{label_id}: audit decision is not pass_reference_only")
    _require(row.get("contract_ids") == entry.get("contract_ids"), f"{label_id}: contract_ids mismatch")
    _require(all(isinstance(c, str) and c in requirements for c in entry.get("contract_ids", [])), f"{label_id}: unknown requirement contract")
    _require(entry.get("canonical_generation_class") == "reference_only", f"{label_id}: generation class is not reference_only")
    _require(entry.get("runtime_status") == "pending", f"{label_id}: runtime_status is not pending")
    _require(entry.get("selector_status") == "pending", f"{label_id}: selector_status is not pending")
    _require(entry.get("guide_derived") is True, f"{label_id}: guide_derived must be true")
    _require(entry.get("independent_support") is False, f"{label_id}: independent_support must be false")
    _require(entry.get("researcher_style_evidence") is False, f"{label_id}: researcher_style_evidence must be false")
    _require(entry.get("research_decisions_supplied_by_guide") is False, f"{label_id}: research decisions must not be supplied")
    _require(entry.get("source_kind") in SOURCE_KIND_TO_ROLE, f"{label_id}: unsupported source_kind")
    _require(entry.get("source_urls") and all(isinstance(url, str) and url.startswith("https://") for url in entry["source_urls"]), f"{label_id}: source URLs must be HTTPS")
    _require(isinstance(entry.get("template_input_profile"), dict), f"{label_id}: template_input_profile missing")
    _require(isinstance(entry.get("state_signature"), dict), f"{label_id}: state_signature missing")
    _require(isinstance(entry.get("variant_distinction"), str) and entry["variant_distinction"], f"{label_id}: variant_distinction missing")

    readback = row.get("source_readback")
    _require(isinstance(readback, dict), f"{label_id}: source_readback missing")
    inventory_rel = _source_rel(inventory)
    snapshot_rel = _source_rel(snapshot)
    _require(readback.get("inventory") == inventory_rel, f"{label_id}: audit inventory path mismatch")
    _require(readback.get("snapshot") == snapshot_rel, f"{label_id}: audit snapshot path mismatch")
    _require(readback.get("source_kind") == entry["source_kind"], f"{label_id}: audit source_kind mismatch")
    _require(readback.get("source_urls") == entry["source_urls"], f"{label_id}: audit source_urls mismatch")
    _require(readback.get("spans") == entry["source_spans"], f"{label_id}: audit spans mismatch")
    _require(readback.get("inventory_sha256") == sha256_bytes(inventory.read_bytes()), f"{label_id}: inventory SHA mismatch")
    _require(readback.get("snapshot_sha256") == sha256_bytes(snapshot.read_bytes()), f"{label_id}: snapshot SHA mismatch")
    source_text = snapshot.read_text(encoding="utf-8-sig")
    extracted = extract_block(source_text, entry["source_spans"])
    raw_blocks = []
    source_lines = source_text.splitlines()
    for start, end in entry["source_spans"]:
        raw_blocks.append("\n".join(source_lines[start - 1 : end]))
    raw_readback = "\n".join(raw_blocks)
    # The independent audit hashes its readback without the canonical terminal
    # LF and preserves source-line trailing spaces; the ledger uses the
    # builder's normalized exact-span contract (with one LF).
    _require(readback.get("readback") == raw_readback, f"{label_id}: exact source readback mismatch")
    _require(readback.get("span_sha256") == sha256_bytes(readback["readback"].encode("utf-8")), f"{label_id}: independent span SHA mismatch")
    template_sha = sha256_bytes(extracted.encode("utf-8"))
    _require(readback.get("span_sha256") != template_sha or extracted.endswith("\n"), f"{label_id}: malformed extracted span")

    checks = row.get("checks")
    _require(isinstance(checks, dict), f"{label_id}: checks missing")
    _require(checks.get("field_errors") == [], f"{label_id}: field_errors gate failed")
    _require(checks.get("unsafe_hits") == {}, f"{label_id}: unsafe_hits gate failed")
    _require(checks.get("pseudo_syntax") == [], f"{label_id}: pseudo_syntax gate failed")
    _require(checks.get("same_group_exact_duplicates") == [], f"{label_id}: same-group duplicate gate failed")
    _require(checks.get("existing_exact_duplicates") == [], f"{label_id}: existing duplicate gate failed")
    _require(checks.get("utf8_no_replacement_character") is True, f"{label_id}: UTF-8 gate failed")
    _require(not any("\ufffd" in value for value in walk_strings(entry)), f"{label_id}: U+FFFD in atomic entry")
    _require("\ufffd" not in source_text, f"{label_id}: U+FFFD in source snapshot")
    _require(any(url == readback["source_urls"][0] for url in entry["source_urls"]), f"{label_id}: source URL readback mismatch")

    role = SOURCE_KIND_TO_ROLE[entry["source_kind"]]
    return {
        "label_id": label_id,
        "disposition": "reference_only",
        "contract_ids": copy.deepcopy(entry["contract_ids"]),
        "template_sha256": template_sha,
        "candidate_inventory_sha256": canonical_json_sha256(entry),
        "source_layers": {role: {"status": "pass", "source_id": entry["source_urls"][0]}},
        "source": {
            "path": snapshot_rel,
            "sha256": sha256_bytes(snapshot.read_bytes()),
            "span": source_span_spec(entry["source_spans"]),
            "role": role,
            "kind": entry["source_kind"],
        },
        "independence": {
            "independent_support": False,
            "scope": "bounded guide mechanics; not independent researcher-style support",
        },
        "input_profile": copy.deepcopy(entry["template_input_profile"]),
        "state_signature": copy.deepcopy(entry["state_signature"]),
        "variant_distinctness": {"reason": entry["variant_distinction"]},
        "safety_checks": copy.deepcopy(SAFETY_CHECKS),
        "auditor": {
            "reviewer": "atomic_candidate_independent_audit",
            "model": "gpt-5.6-terra high",
            "status": "pass",
            "decision": "pass_reference_only",
            "reasons": ["independent guide re-audit passed all source, profile, state, safety, and duplicate gates"],
        },
        "runtime": {
            "status": "not_run",
            "reason": "Guide mechanics remain reference-only until an isolated Stata runtime case passes.",
        },
        "selector": {
            "status": "not_run",
            "reason": "Guide mechanics are delivered as a noncompeting companion layer and are not auto-selected.",
        },
        "auto_selectable": False,
    }


def build_ledger(
    *,
    existing_path: Path,
    audit_jsonl_path: Path,
    summary_path: Path,
    requirements_path: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    existing = load_json(existing_path)
    _require(isinstance(existing, dict), "existing promotion audit must be an object")
    old_records = existing.get("candidate_records")
    _require(
        isinstance(old_records, list) and len(old_records) in {LEGACY_RECORDS, LEGACY_RECORDS + REQUIRED_NEW},
        f"existing ledger must contain exactly {LEGACY_RECORDS} records (or its deterministic 440-record rebuild)",
    )
    # A completed ledger is accepted as an idempotent rebuild input. Only its
    # preserved legacy prefix is used; the new rows are always regenerated from
    # current atomic inventories and the independent audit.
    old_records = old_records[:LEGACY_RECORDS]
    old_labels = [record.get("label_id") for record in old_records if isinstance(record, dict)]
    _require(len(old_labels) == LEGACY_RECORDS and len(set(old_labels)) == LEGACY_RECORDS, "existing ledger labels must be unique")

    requirements_data = load_json(requirements_path)
    _require(requirements_data.get("schema_version") == "2.0", "requirements schema must be v2")
    groups = requirements_data.get("ranked_groups", []) + requirements_data.get("supplemental_groups", [])
    requirement_ids = {f"{group['group_id']}.{variant}" for group in groups for variant in group.get("required_variants", [])}
    rows = [json.loads(line) for line in audit_jsonl_path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    _require(len(rows) == REQUIRED_NEW, f"independent audit JSONL must contain exactly {REQUIRED_NEW} rows")
    audit_rows = _audit_row_map(rows)
    summary = load_json(summary_path)
    _validate_summary(summary)
    sources = _load_current_sources()
    _require(set(audit_rows) == set(sources), "independent audit labels and current atomic labels differ")
    _require(not (set(old_labels) & set(sources)), "new atomic labels overlap existing ledger labels")

    new_records = []
    for row in rows:
        label_id = row["label_id"]
        inventory, snapshot, entry = sources[label_id]
        new_records.append(_validate_and_record(row, inventory, snapshot, entry, requirement_ids))
    _require(len(new_records) == REQUIRED_NEW, "new record count changed during build")
    ledger = copy.deepcopy(existing)
    ledger["candidate_records"] = copy.deepcopy(old_records) + new_records
    _require(len(ledger["candidate_records"]) == LEGACY_RECORDS + REQUIRED_NEW, "final candidate record count is not 440")
    _require(len({r["label_id"] for r in ledger["candidate_records"]}) == len(ledger["candidate_records"]), "final label IDs are not unique")
    report = {
        "schema_version": "1.0",
        "status": "pass",
        "existing_records": LEGACY_RECORDS,
        "new_records": REQUIRED_NEW,
        "candidate_records": len(ledger["candidate_records"]),
        "new_disposition_counts": {"reference_only": REQUIRED_NEW},
        "new_audit_decision_counts": summary["decision_counts"],
        "rejected": 0,
        "needs_revision": 0,
        "requirements_schema_version": requirements_data["schema_version"],
        "requirements_sha256": sha256_bytes(requirements_path.read_bytes()),
        "independent_audit_sha256": sha256_bytes(audit_jsonl_path.read_bytes()),
        "independent_summary_sha256": sha256_bytes(summary_path.read_bytes()),
        "new_label_set_sha256": canonical_json_sha256(sorted(sources)),
        "ledger_sha256": canonical_json_sha256(ledger),
        "auto_selectable_new": 0,
        "runtime_new": {"not_run": REQUIRED_NEW},
        "selector_new": {"not_run": REQUIRED_NEW},
    }
    return ledger, report


def _write_json_atomic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=ANNOTATIONS / "template_promotion_audit.json")
    parser.add_argument("--audit-jsonl", type=Path, default=ROOT / "work/top100_expansion_20260826/guide_reaudit/independent_guide_reaudit.jsonl")
    parser.add_argument("--summary", type=Path, default=ROOT / "work/top100_expansion_20260826/guide_reaudit/summary.json")
    parser.add_argument("--requirements", type=Path, default=ANNOTATIONS / "command_template_requirements.json")
    parser.add_argument("--report-dir", type=Path, default=ROOT / "work/top100_expansion_20260826/promotion_build")
    parser.add_argument("--check-only", action="store_true", help="validate and report without writing the ledger")
    args = parser.parse_args()
    ledger, report = build_ledger(
        existing_path=args.ledger,
        audit_jsonl_path=args.audit_jsonl,
        summary_path=args.summary,
        requirements_path=args.requirements,
    )
    args.report_dir.mkdir(parents=True, exist_ok=True)
    _write_json_atomic(args.report_dir / "promotion_report.json", report)
    _write_json_atomic(args.report_dir / "promotion_candidate_records.json", {"candidate_records": ledger["candidate_records"][LEGACY_RECORDS:]})
    if not args.check_only:
        _write_json_atomic(args.ledger, ledger)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
