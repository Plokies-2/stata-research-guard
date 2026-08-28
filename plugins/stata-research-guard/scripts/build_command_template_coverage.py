from __future__ import annotations

"""Deterministically report Top-100 template coverage and enforce promotion evidence.

This intentionally sits beside, rather than inside, the legacy label builder.  The
legacy corpus is a useful retrieval source but does not thereby claim a pass under
the newer Top 50 promotion policy.  A later builder integration can consume the
same pure validation functions without changing the gate's meaning.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


VALID_MODES = {"direct_primitive", "template_required", "mixed", "guide_mechanics_reference_only"}
VALID_DISPOSITIONS = {"audited_template", "reference_only", "rejected"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
SPAN_RE = re.compile(r"^[1-9][0-9]*(?:-[1-9][0-9]*)?(?:,[1-9][0-9]*(?:-[1-9][0-9]*)?)*$")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_direct_variant(group: dict[str, Any], variant: str) -> bool:
    """Keep direct language primitives visible without pretending they are templates."""
    if group["coverage_mode"] == "direct_primitive":
        return True
    if group["coverage_mode"] != "mixed":
        return False
    return variant.startswith("direct_") or any(token in variant for token in ("_direct", "_policy", "_forbidden"))


def requirement_ids(requirements: dict[str, Any]) -> set[str]:
    return {
        f"{group['group_id']}.{variant}"
        for group in [*requirements["ranked_groups"], *requirements["supplemental_groups"]]
        for variant in group["required_variants"]
    }


def _stable_sha256(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def validate_requirements(requirements: dict[str, Any]) -> None:
    if requirements.get("schema_version") != "2.0":
        raise ValueError("requirements schema_version must be 2.0")
    ranking_contract = requirements.get("ranking_contract")
    if not isinstance(ranking_contract, dict):
        raise ValueError("requirements must declare a ranking_contract")
    groups = requirements.get("ranked_groups")
    if not isinstance(groups, list) or len(groups) != 100:
        raise ValueError("Top-100 requirements must contain exactly 100 ranked groups")
    ranks = [group.get("rank") for group in groups]
    if ranks != list(range(1, 101)):
        raise ValueError("Top-100 ranks must be contiguous from 1 through 100")
    if ranking_contract.get("rank_limit") != 100 or ranking_contract.get("unit") != "command_group":
        raise ValueError("ranking_contract must declare 100 command groups")
    if ranking_contract.get("top50_prefix_frozen") is not True:
        raise ValueError("ranking_contract must freeze the Top-50 prefix")
    _require_sha(ranking_contract.get("top50_prefix_sha256"), "ranking_contract.top50_prefix_sha256")
    if _stable_sha256(groups[:50]) != ranking_contract["top50_prefix_sha256"]:
        raise ValueError("frozen Top-50 prefix hash does not match ranked_groups")
    _require_sha(ranking_contract.get("rank_research_sha256"), "ranking_contract.rank_research_sha256")
    complexity = requirements.get("complexity_weighted_sufficiency")
    if not isinstance(complexity, dict) or complexity.get("fixed_per_command_quota_forbidden") is not True:
        raise ValueError("complexity-weighted sufficiency must explicitly prohibit fixed per-command quotas")
    for key in ("simple_command_rule", "complex_command_rule", "duplicate_rule", "verification_rule"):
        _require_nonempty_string(complexity.get(key), f"complexity_weighted_sufficiency.{key}")
    dimensions = complexity.get("material_dimensions")
    if not isinstance(dimensions, list) or len(dimensions) < 3 or len(dimensions) != len(set(dimensions)):
        raise ValueError("complexity-weighted sufficiency must declare unique material dimensions")
    supplemental = requirements.get("supplemental_groups")
    if not isinstance(supplemental, list) or len(supplemental) != 15:
        raise ValueError("requirements must contain exactly 15 supplemental groups")
    all_groups = [*groups, *supplemental]
    group_ids: set[str] = set()
    for group in all_groups:
        group_id = group.get("group_id")
        if not isinstance(group_id, str) or not re.fullmatch(r"[a-z0-9_]+", group_id):
            raise ValueError(f"invalid group_id: {group_id!r}")
        if group_id in group_ids:
            raise ValueError(f"duplicate group_id: {group_id}")
        group_ids.add(group_id)
        if group.get("coverage_mode", "template_required") not in VALID_MODES:
            raise ValueError(f"invalid coverage_mode for {group_id}")
        commands = group.get("commands")
        if not isinstance(commands, list) or not commands or any(not isinstance(item, str) or not item for item in commands):
            raise ValueError(f"commands must be a nonempty string array for {group_id}")
        variants = group.get("required_variants")
        if not isinstance(variants, list) or not variants or len(variants) != len(set(variants)):
            raise ValueError(f"required_variants must be a unique nonempty array for {group_id}")
        if any(not isinstance(item, str) or not re.fullmatch(r"[a-z0-9_]+", item) for item in variants):
            raise ValueError(f"invalid required variant identifier for {group_id}")
        if group.get("user_written_guide_required") and group.get("coverage_mode", "template_required") == "direct_primitive":
            raise ValueError(f"user-written guide requirement cannot be direct-only: {group_id}")
        declared_contracts = group.get("contract_ids")
        if declared_contracts is not None:
            expected_contracts = [f"{group_id}.{variant}" for variant in variants]
            if declared_contracts != expected_contracts:
                raise ValueError(f"declared contract_ids must exactly match required_variants for {group_id}")
    if len(requirement_ids(requirements)) != sum(len(group["required_variants"]) for group in all_groups):
        raise ValueError("duplicate group/variant contract identifier")
    if sum(len(group["required_variants"]) for group in groups) != 395:
        raise ValueError("Top-100 ranked requirements must contain exactly 395 variants")
    if sum(len(group["required_variants"]) for group in supplemental) != 48:
        raise ValueError("supplemental requirements must contain exactly 48 variants")
    if "\ufffd" in json.dumps(requirements, ensure_ascii=False):
        raise ValueError("requirements contains replacement-character corruption")


def validate_ranked_atomic_contract_coverage(requirements: dict[str, Any], atomic_records: list[dict[str, Any]]) -> None:
    """Require a one-to-one pre-audit guide atom for every newly ranked contract.

    This checks the guide-candidate layer only.  It does not grant auto-selection
    status: runtime, selector, and independent promotion-audit gates remain
    separate and fail closed.
    """
    validate_requirements(requirements)
    expected = {
        f"{group['group_id']}.{variant}"
        for group in requirements["ranked_groups"][50:]
        for variant in group["required_variants"]
    }
    seen_labels: set[str] = set()
    by_contract: dict[str, list[str]] = {}
    for record in atomic_records:
        label_id = record.get("label_id")
        _require_nonempty_string(label_id, "atomic.label_id")
        if label_id in seen_labels:
            raise ValueError(f"duplicate atomic label_id: {label_id}")
        seen_labels.add(label_id)
        if (
            record.get("canonical_generation_class") != "reference_only"
            or record.get("candidate_disposition") not in {None, "reference_only"}
            or record.get("audit_status") != "metadata_only"
        ):
            raise ValueError(f"Top-100 guide atom must remain pre-audit reference_only: {label_id}")
        contracts = record.get("contract_ids")
        if not isinstance(contracts, list) or len(contracts) != 1 or not isinstance(contracts[0], str):
            raise ValueError(f"Top-100 guide atom must have exactly one contract: {label_id}")
        by_contract.setdefault(contracts[0], []).append(label_id)
    duplicate = {contract: labels for contract, labels in by_contract.items() if len(labels) != 1}
    unexpected = sorted(set(by_contract) - expected)
    missing = sorted(expected - set(by_contract))
    if duplicate or unexpected or missing:
        raise ValueError(
            "Top-100 guide atomic contract coverage mismatch: "
            f"duplicate={duplicate}, unexpected={unexpected}, missing={missing}"
        )


def _require_sha(value: Any, context: str) -> None:
    if not isinstance(value, str) or not SHA256_RE.fullmatch(value):
        raise ValueError(f"{context} must be a lowercase SHA-256")


def _require_nonempty_string(value: Any, context: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context} must be a nonempty string")


def validate_promotion_audit(audit: dict[str, Any], requirements: dict[str, Any], legacy_label_count: int) -> None:
    if audit.get("schema_version") != "2.0":
        raise ValueError("promotion audit schema_version must be 2.0")
    legacy = audit.get("legacy_baseline")
    if not isinstance(legacy, dict) or legacy.get("status") != "current_code_free_registry":
        raise ValueError("registry baseline must be explicitly current_code_free_registry")
    if legacy.get("label_count") != legacy_label_count:
        raise ValueError("legacy baseline label_count must match labeled_checkpoints.jsonl")
    records = audit.get("candidate_records")
    if not isinstance(records, list):
        raise ValueError("candidate_records must be an array")
    known_contracts = requirement_ids(requirements)
    group_by_id = {
        group["group_id"]: group
        for group in [*requirements["ranked_groups"], *requirements["supplemental_groups"]]
    }
    seen_labels: set[str] = set()
    seen_contracts: set[str] = set()
    for position, record in enumerate(records, start=1):
        context = f"candidate_records[{position}]"
        if not isinstance(record, dict):
            raise ValueError(f"{context} must be an object")
        label_id = record.get("label_id")
        _require_nonempty_string(label_id, f"{context}.label_id")
        if label_id in seen_labels:
            raise ValueError(f"duplicate audit label_id: {label_id}")
        seen_labels.add(label_id)
        disposition = record.get("disposition")
        if disposition not in VALID_DISPOSITIONS:
            raise ValueError(f"invalid disposition for {label_id}")
        contract_ids = record.get("contract_ids")
        if not isinstance(contract_ids, list) or len(contract_ids) != len(set(contract_ids)):
            raise ValueError(f"{label_id}.contract_ids must be a unique array")
        if not contract_ids:
            if disposition == "audited_template":
                raise ValueError(f"{label_id}.contract_ids must be nonempty for audited_template")
            supplemental = record.get("supplemental_contract_id")
            unmapped_reason = record.get("unmapped_reason")
            markers = sum(isinstance(value, str) and bool(value.strip()) for value in (supplemental, unmapped_reason))
            if markers != 1:
                raise ValueError(
                    f"{label_id} with empty contract_ids must set exactly one of supplemental_contract_id or unmapped_reason"
                )
        unknown = set(contract_ids) - known_contracts
        if unknown:
            raise ValueError(f"{label_id} references unknown contract ids: {sorted(unknown)}")
        _require_sha(record.get("candidate_inventory_sha256"), f"{label_id}.candidate_inventory_sha256")
        source_layers = record.get("source_layers")
        if not isinstance(source_layers, dict):
            raise ValueError(f"{label_id}.source_layers is required")
        source = record.get("source")
        if not isinstance(source, dict):
            raise ValueError(f"{label_id}.source must be an object")
        for key in ("source_id", "role", "kind"):
            _require_nonempty_string(source.get(key), f"{label_id}.source.{key}")
        if contract_ids:
            required_layer = (
                "maintainer_guide"
                if any(group_by_id[contract_id.partition(".")[0]].get("user_written_guide_required") for contract_id in contract_ids)
                else "official_manual"
            )
        else:
            required_layer = source["role"]
            if required_layer not in {"official_manual", "maintainer_guide"}:
                raise ValueError(f"{label_id}.source.role must identify an official_manual or maintainer_guide layer")
        layer = source_layers.get(required_layer)
        if not isinstance(layer, dict) or layer.get("status") != "pass" or not layer.get("source_id"):
            raise ValueError(f"{label_id}.source_layers.{required_layer} must be a passed named source")
        if source["role"] != required_layer:
            raise ValueError(f"{label_id}.source.role must match required source layer {required_layer}")
        for key in ("independence", "input_profile", "state_signature", "variant_distinctness", "safety_checks", "auditor"):
            if not record.get(key):
                raise ValueError(f"{label_id}.{key} is required")
        if disposition == "reference_only":
            # Reference records remain useful, but must never satisfy auto-selection coverage.
            if record.get("auto_selectable") is not False:
                raise ValueError(f"reference_only record must set auto_selectable=false: {label_id}")
            runtime = record.get("runtime")
            if not isinstance(runtime, dict) or runtime.get("status") not in {"not_run", "not_available", "not_applicable", "failed"}:
                raise ValueError(f"{label_id}.runtime must record why a reference-only candidate was not promoted")
            _require_nonempty_string(runtime.get("reason"), f"{label_id}.runtime.reason")
            selector = record.get("selector")
            if not isinstance(selector, dict) or selector.get("status") not in {"not_run", "not_applicable", "blocked"}:
                raise ValueError(f"{label_id}.selector must record its reference-only gate status")
            _require_nonempty_string(selector.get("reason"), f"{label_id}.selector.reason")
        else:
            raise ValueError(f"code-free guide registry cannot contain {disposition}: {label_id}")


def build_coverage(
    requirements: dict[str, Any],
    audit: dict[str, Any],
    command_example_audit: dict[str, Any] | None = None,
) -> dict[str, Any]:
    validate_requirements(requirements)
    audited_by_contract: dict[str, str] = {}
    reference_by_contract: dict[str, str] = {}
    guide_metadata: dict[str, dict[str, object]] = {}
    overrides = (command_example_audit or {}).get("label_overrides", {})
    for record in audit["candidate_records"]:
        override = overrides.get(record["label_id"])
        if override and override.get("action") == "suppress_semantic_duplicate":
            continue
        if record["disposition"] == "rejected":
            continue
        if record["disposition"] == "reference_only":
            source = record.get("source")
            if isinstance(source, dict) and source.get("role") and source.get("source_id"):
                guide_metadata[record["label_id"]] = {
                    "label_id": record["label_id"],
                    "authority": source["role"],
                    "source_url": source["source_id"],
                    "code_available": False,
                }
        target = audited_by_contract if record["disposition"] == "audited_template" else reference_by_contract
        contract_ids = override.get("contract_ids", []) if override else record["contract_ids"]
        for contract_id in contract_ids:
            target[contract_id] = record["label_id"]
    rows = []
    for group in requirements["ranked_groups"]:
        variants = []
        for variant in group["required_variants"]:
            contract_id = f"{group['group_id']}.{variant}"
            if _is_direct_variant(group, variant):
                status, evidence = "direct_primitive_policy", "declared direct-primitive contract"
            elif contract_id in audited_by_contract:
                status, evidence = "audited_template", audited_by_contract[contract_id]
            elif contract_id in reference_by_contract:
                status, evidence = "reference_only", reference_by_contract[contract_id]
            else:
                status, evidence = "uncovered", "no audited template record"
            variants.append({
                "contract_id": contract_id, "variant": variant, "status": status, "evidence": evidence,
                "guide": guide_metadata.get(evidence) if status == "reference_only" else None,
            })
        rows.append({
            "rank": group["rank"], "group_id": group["group_id"], "commands": group["commands"],
            "coverage_mode": group["coverage_mode"], "user_written_guide_required": bool(group.get("user_written_guide_required", False)),
            "variants": variants,
        })
    counts = Counter(variant["status"] for row in rows for variant in row["variants"])
    return {
        "schema_version": "2.0",
        "summary": {
            "ranked_groups": len(rows),
            "ranked_required_variants": sum(len(row["variants"]) for row in rows),
            "supplemental_groups": len(requirements["supplemental_groups"]),
            "supplemental_required_variants": sum(len(group["required_variants"]) for group in requirements["supplemental_groups"]),
            "all_required_variants": sum(len(group["required_variants"]) for group in [*requirements["ranked_groups"], *requirements["supplemental_groups"]]),
            "top50_prefix_groups": 50,
            "top50_prefix_required_variants": sum(len(row["variants"]) for row in rows[:50]),
            "top50_prefix_status_counts": dict(sorted(Counter(variant["status"] for row in rows[:50] for variant in row["variants"]).items())),
            "status_counts": dict(sorted(counts.items())),
            "audit_gate": "guide metadata requires a declared authoritative source URL, inventory/profile/auditor checks, and reference_only/non-selectable status; it ships no code template",
        },
        "groups": rows,
    }


def render_markdown(coverage: dict[str, Any]) -> str:
    summary = coverage["summary"]
    lines = [
        "# Top 100 command-template coverage / Top 100 명령어 템플릿 범위",
        "",
        "> 이 표는 명령어의 사용 빈도 순위 자체가 아니라, 현재 플러그인이 보유해야 할 변형 계약의 충족 상태입니다. guide metadata는 manual/maintainer authority를 가리키는 reference-only 정보이며 코드를 제공하지 않습니다.",
        "",
        "## 현재 판정",
        "",
        f"- ranked 그룹: {summary['ranked_groups']}개 (Top 50 prefix {summary['top50_prefix_groups']}개 고정)",
        f"- ranked 필수 변형 계약: {summary['ranked_required_variants']}개",
        f"- supplemental 그룹/계약: {summary['supplemental_groups']}개 / {summary['supplemental_required_variants']}개",
        f"- 전체 계약: {summary['all_required_variants']}개",
        f"- 상태별 수: {summary['status_counts']}",
        "- `direct_primitive_policy`: 명시적 진단·언어 primitive라 독립 template를 억지로 만들지 않는 계약입니다.",
        "- `audited_template`: 명령어 종류에 맞는 official manual 또는 maintainer guide, candidate inventory와 source/template exact SHA, source span, runtime, selector 양성·음성 검사를 모두 통과한 경우만 해당합니다.",
        "- `reference_only`: 가이드 mechanics 또는 불완전한 근거로 남기며 자동 선택하지 않습니다.",
        "- `uncovered`: 아직 정식 템플릿으로 승격할 수 없습니다.",
        "",
        "## 그룹별 계약",
        "",
        "| rank | group | commands | required variants: status |",
        "|---:|---|---|---|",
    ]
    for row in coverage["groups"]:
        variants = "; ".join(
            f"`{item['variant']}`: {item['status']}"
            + (
                f" (`{item['guide']['label_id']}`, {item['guide']['authority']}, "
                f"{item['guide']['source_url']}, code_available=false)"
                if item.get("guide") else ""
            )
            for item in row["variants"]
        )
        lines.append(f"| {row['rank']} | `{row['group_id']}` | {', '.join(f'`{item}`' for item in row['commands'])} | {variants} |")
    lines.extend(["", "## 승격 경계", "", "- guide-derived mechanics는 `reference_only`로 시작합니다. 독립 연구 코드·정확한 source span·runtime·selector 검사가 누적되어야만 `audited_template`가 됩니다.", "- Top 50 prefix는 별도 hash로 고정합니다. guide card 수는 명령어별 고정 quota가 아니라 material state 차이로 결정합니다.", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plugin", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--write-review", action="store_true")
    args = parser.parse_args()
    plugin = args.plugin.resolve()
    requirements = load_json(plugin / "annotations" / "command_template_requirements.json")
    audit = load_json(plugin / "annotations" / "template_promotion_audit.json")
    command_example_audit_path = plugin / "annotations" / "command_example_audit.json"
    command_example_audit = load_json(command_example_audit_path) if command_example_audit_path.exists() else None
    legacy_labels = load_json(plugin / "annotations" / "labeled_checkpoints.json")
    validate_promotion_audit(audit, requirements, len(legacy_labels))
    coverage = build_coverage(requirements, audit, command_example_audit)
    if args.write_review:
        (plugin / "review" / "command_template_coverage.md").write_text(render_markdown(coverage), encoding="utf-8", newline="\n")
    print(json.dumps(coverage["summary"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
