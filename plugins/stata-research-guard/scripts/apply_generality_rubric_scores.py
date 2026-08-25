from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from pathlib import Path


CLASSES = {"preferred_candidate", "conditional_candidate", "reference_only", "exclude"}
SCOPES = {"general", "method_specific", "project_specific", "negative"}
CANONICAL_EXCEPTIONS = {
    "setup.paths.default_style_roles.v1",
    "export.regression_excel.from_ster_default_style.v1",
}
RETIRED_REVIEW_ITEMS = {"uncontrolled_dependency", "dependency_version"}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def score_band(score: float, bands: list[dict]) -> str:
    for band in sorted(bands, key=lambda row: row["min"], reverse=True):
        if score >= band["min"]:
            return band["classification"]
    raise ValueError(f"no score band covers {score}")


def validate_evaluation(row: dict, annotation: dict, position: int, rubric: dict) -> None:
    required = (set(rubric["evaluation_record_schema"]["required"]) - {"reviewer_notes"}) | {
        "annotation_order",
        "source_specific_elements",
        "recommended_reuse_scope",
        "preferred_eligible",
        "recommended_preferred_within_checkpoint",
        "current_vs_recommended_changes",
        "reviewer_notes_ko",
        "uncertainty",
    }
    missing = sorted(required - set(row))
    if missing:
        raise ValueError(f"{row.get('label_id', '<unknown>')}: missing score fields {missing}")
    if row["label_id"] != annotation["label_id"] or row["annotation_order"] != position:
        raise ValueError(f"annotation order/id mismatch at {position}: {row.get('label_id')}")
    verification = row["source_verification"]
    if not verification.get("source_file_sha256_match") or not verification.get("code_sha256_match"):
        raise ValueError(f"{row['label_id']}: source provenance did not verify")
    if not verification.get("context_read") and not row.get("uncertainty"):
        raise ValueError(f"{row['label_id']}: missing boundary/context uncertainty")

    rule_ids = [rule["id"] for rule in rubric["hard_fail_rules"]]
    if RETIRED_REVIEW_ITEMS & set(rule_ids):
        raise ValueError("retired dependency rules remain active in the rubric")
    hard_fails = row["hard_fails"]
    if not isinstance(hard_fails, list) or [item.get("rule_id") for item in hard_fails] != rule_ids:
        raise ValueError(f"{row['label_id']}: hard-fail rule coverage/order mismatch")
    if any(not isinstance(item.get("triggered"), bool) or not item.get("evidence") for item in hard_fails):
        raise ValueError(f"{row['label_id']}: malformed hard-fail evidence")

    dimensions = {item["id"]: item for item in rubric["scoring"]["dimensions"]}
    if RETIRED_REVIEW_ITEMS & set(dimensions):
        raise ValueError("retired dependency dimensions remain active in the rubric")
    applicable = row["applicable_dimensions"]
    if RETIRED_REVIEW_ITEMS & (set(applicable) | set(row["dimension_scores"])):
        raise ValueError(f"{row['label_id']}: retired dependency metadata remains active")
    if len(applicable) != len(set(applicable)) or any(item not in dimensions for item in applicable):
        raise ValueError(f"{row['label_id']}: invalid applicable dimensions")
    if set(row["dimension_scores"]) != set(applicable):
        raise ValueError(f"{row['label_id']}: dimension score coverage mismatch")
    if any(not isinstance(value, int) or not 0 <= value <= 5 for value in row["dimension_scores"].values()):
        raise ValueError(f"{row['label_id']}: dimension score outside 0..5")
    denominator = sum(dimensions[item]["weight"] for item in applicable)
    calculated = round(
        100
        * sum(dimensions[item]["weight"] * row["dimension_scores"][item] / 5 for item in applicable)
        / denominator,
        1,
    )
    if abs(calculated - float(row["weighted_score"])) > 0.01:
        raise ValueError(f"{row['label_id']}: score {row['weighted_score']} != {calculated}")

    if row["classification"] not in CLASSES or row["recommended_reuse_scope"] not in SCOPES:
        raise ValueError(f"{row['label_id']}: invalid class or scope")
    expected_class = "exclude" if annotation["decision"] == "drop" else score_band(calculated, rubric["scoring"]["score_bands"])
    if row["classification"] == "exclude" and annotation["decision"] != "drop":
        raise ValueError(f"{row['label_id']}: a provenance-valid non-drop row cannot be reviewer-excluded")
    if (annotation["decision"] == "drop") != (row["recommended_reuse_scope"] == "negative"):
        raise ValueError(f"{row['label_id']}: negative scope must equal drop decision")
    if row["recommended_preferred_within_checkpoint"] and not row["preferred_eligible"] and row["label_id"] not in CANONICAL_EXCEPTIONS:
        raise ValueError(f"{row['label_id']}: preferred selection is not eligible")
    if row["preferred_eligible"] != (expected_class == "preferred_candidate"):
        raise ValueError(f"{row['label_id']}: preferred eligibility must follow the preferred score band")


def apply_scores(annotation_path: Path, rubric_path: Path, score_paths: list[Path]) -> dict:
    annotations = load_json(annotation_path)
    rubric = load_json(rubric_path)
    expected_annotation_hash = sha256(annotation_path)
    expected_rubric_hash = sha256(rubric_path)
    already_applied = all(
        row.get("quality_rubric_review", {}).get("status") == "external_evidence_rubric_reviewed"
        and row.get("generality_review", {}).get("status") == "external_evidence_rubric_reviewed"
        for row in annotations
    )
    evaluations: list[dict] = []
    for score_path in score_paths:
        payload = load_json(score_path)
        if str(payload.get("rubric_sha256", "")).lower() != expected_rubric_hash:
            raise ValueError(f"{score_path}: rubric hash mismatch")
        if str(payload.get("annotation_sha256", "")).lower() != expected_annotation_hash and not already_applied:
            raise ValueError(f"{score_path}: annotation hash mismatch")
        if payload.get("evaluated_count") != len(payload.get("evaluations", [])):
            raise ValueError(f"{score_path}: evaluated_count mismatch")
        evaluations.extend(payload["evaluations"])

    by_order = {row["annotation_order"]: row for row in evaluations}
    if len(by_order) != len(evaluations) or set(by_order) != set(range(1, len(annotations) + 1)):
        raise ValueError("rubric score files must cover every annotation order exactly once")

    merged = []
    for position, annotation in enumerate(annotations, 1):
        review = by_order[position]
        validate_evaluation(review, annotation, position, rubric)
        calibrated_classification = "exclude" if annotation["decision"] == "drop" else score_band(
            float(review["weighted_score"]), rubric["scoring"]["score_bands"]
        )
        canonical_exception = annotation["label_id"] in CANONICAL_EXCEPTIONS
        preferred = bool(review["recommended_preferred_within_checkpoint"])
        override = None
        if canonical_exception:
            preferred = True
            override = {
                "applied": True,
                "basis": "explicit user-approved canonical contract",
                "effect": "preferred_within_checkpoint only; score and reuse_scope are not upgraded",
            }
        enriched = dict(annotation)
        enriched.update(
            reuse_scope=review["recommended_reuse_scope"],
            source_specific_elements=review["source_specific_elements"],
            preferred_within_checkpoint=preferred,
            explicit_canonical_exception=canonical_exception,
            quality_rubric_review={
                "status": "external_evidence_rubric_reviewed",
                "version": rubric["schema_version"],
                "rubric_sha256": expected_rubric_hash,
                "source_verification": review["source_verification"],
                "hard_fails": review["hard_fails"],
                "applicable_dimensions": review["applicable_dimensions"],
                "dimension_scores": review["dimension_scores"],
                "weighted_score": review["weighted_score"],
                "classification": calibrated_classification,
                "reviewer_classification": review["classification"],
                "classification_calibration_override": None if calibrated_classification == review["classification"] else {
                    "from": review["classification"],
                    "to": calibrated_classification,
                    "basis": "main-agent cutoff calibration against 35-headword atomic-block coverage",
                },
                "preferred_eligible": calibrated_classification == "preferred_candidate",
                "reviewer_notes_ko": review["reviewer_notes_ko"],
                "uncertainty": review["uncertainty"],
                "current_vs_recommended_changes": review["current_vs_recommended_changes"],
                "canonical_exception_override": override,
            },
            generality_review={
                "status": "external_evidence_rubric_reviewed",
                "version": "2.0",
                "criterion": "raw_source_generality_readability_portability_and_minimal_adaptation",
                "rubric_sha256": expected_rubric_hash,
            },
        )
        merged.append(enriched)

    temp_path = annotation_path.with_suffix(annotation_path.suffix + ".tmp")
    temp_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    os.replace(temp_path, annotation_path)
    return {
        "labels": len(merged),
        "classification_counts": dict(Counter(row["quality_rubric_review"]["classification"] for row in merged)),
        "reuse_scope_counts": dict(Counter(row["reuse_scope"] for row in merged)),
        "preferred_after_explicit_overrides": sum(row["preferred_within_checkpoint"] for row in merged),
        "canonical_exceptions": sorted(CANONICAL_EXCEPTIONS),
        "context_boundary_limited": sum(not row["quality_rubric_review"]["source_verification"]["context_read"] for row in merged),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser()
    parser.add_argument("--annotations", type=Path, default=root / "plugins/stata-research-guard/annotations/labeled_checkpoints.json")
    parser.add_argument("--rubric", type=Path, default=root / "plugins/stata-research-guard/annotations/generality_rubric.json")
    parser.add_argument(
        "scores",
        nargs="*",
        type=Path,
        default=[
            root / "work/generality_rubric_scores_a.json",
            root / "work/generality_rubric_scores_b.json",
        ],
    )
    args = parser.parse_args()
    print(json.dumps(apply_scores(args.annotations, args.rubric, args.scores), ensure_ascii=False))


if __name__ == "__main__":
    main()
