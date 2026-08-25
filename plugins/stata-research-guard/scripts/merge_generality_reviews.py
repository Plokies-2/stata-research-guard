from __future__ import annotations

import argparse
import json
import os
from collections import Counter, defaultdict
from pathlib import Path


SCOPES = {"general", "method_specific", "project_specific", "negative"}
CANONICAL_EXCEPTIONS = {
    "setup.paths.default_style_roles.v1",
    "export.regression_excel.from_ster_default_style.v1",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_review(row: dict) -> None:
    required = {
        "annotation_order",
        "label_id",
        "reuse_scope",
        "readability",
        "portability",
        "source_specific_elements",
        "reusable_core",
        "preferred_within_checkpoint",
        "rationale_ko",
    }
    missing = sorted(required - set(row))
    if missing:
        raise ValueError(f"{row.get('label_id', '<unknown>')}: missing review fields {missing}")
    if row["reuse_scope"] not in SCOPES:
        raise ValueError(f"{row['label_id']}: invalid reuse_scope {row['reuse_scope']}")
    for field in ("readability", "portability"):
        if not isinstance(row[field], int) or not 1 <= row[field] <= 5:
            raise ValueError(f"{row['label_id']}: {field} must be an integer from 1 through 5")
    if not isinstance(row["source_specific_elements"], list):
        raise ValueError(f"{row['label_id']}: source_specific_elements must be an array")
    if not isinstance(row["preferred_within_checkpoint"], bool):
        raise ValueError(f"{row['label_id']}: preferred_within_checkpoint must be boolean")


def merge(annotation_path: Path, review_paths: list[Path]) -> dict:
    annotations = load_json(annotation_path)
    if not isinstance(annotations, list):
        raise ValueError("annotation source must be an array")
    review_rows: list[dict] = []
    for review_path in review_paths:
        payload = load_json(review_path)
        rows = payload.get("labels", payload.get("reviews"))
        if not isinstance(rows, list):
            raise ValueError(f"{review_path}: labels or reviews must be an array")
        review_rows.extend(rows)
    for row in review_rows:
        validate_review(row)

    by_id: dict[str, dict] = {}
    for row in review_rows:
        if row["label_id"] in by_id:
            raise ValueError(f"duplicate generality review: {row['label_id']}")
        by_id[row["label_id"]] = row
    annotation_ids = {row["label_id"] for row in annotations}
    if set(by_id) != annotation_ids:
        raise ValueError(
            f"review coverage mismatch; missing={sorted(annotation_ids - set(by_id))}; "
            f"unexpected={sorted(set(by_id) - annotation_ids)}"
        )

    merged = []
    for annotation in annotations:
        review = by_id[annotation["label_id"]]
        if review["annotation_order"] != annotation.get("annotation_order", review["annotation_order"]):
            raise ValueError(f"{annotation['label_id']}: annotation_order mismatch")
        if annotation["decision"] == "drop" and review["reuse_scope"] != "negative":
            raise ValueError(f"{annotation['label_id']}: drop labels must be classified negative")
        if annotation["decision"] != "drop" and review["reuse_scope"] == "negative":
            raise ValueError(f"{annotation['label_id']}: reusable label cannot be classified negative")
        enriched = dict(annotation)
        enriched.update(
            reuse_scope=review["reuse_scope"],
            readability_score=review["readability"],
            portability_score=review["portability"],
            source_specific_elements=review["source_specific_elements"],
            reusable_core=review["reusable_core"],
            preferred_within_checkpoint=review["preferred_within_checkpoint"],
            generality_rationale_ko=review["rationale_ko"],
            explicit_canonical_exception=annotation["label_id"] in CANONICAL_EXCEPTIONS,
            generality_review={
                "status": "raw_source_span_reviewed",
                "version": "1.0",
                "criterion": "generalizability_readability_portability",
            },
        )
        if enriched["explicit_canonical_exception"]:
            enriched["preferred_within_checkpoint"] = True
        merged.append(enriched)

    checkpoint_rows: dict[str, list[dict]] = defaultdict(list)
    for row in merged:
        checkpoint_rows[row["checkpoint"]].append(row)
    unserved = []
    for checkpoint, rows in checkpoint_rows.items():
        available = [
            row for row in rows
            if row["decision"] != "drop"
            and (row["reuse_scope"] != "project_specific" or row["explicit_canonical_exception"])
        ]
        if not available:
            unserved.append(checkpoint)

    temp_path = annotation_path.with_suffix(annotation_path.suffix + ".tmp")
    temp_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temp_path, annotation_path)
    return {
        "labels": len(merged),
        "reuse_scope_counts": dict(Counter(row["reuse_scope"] for row in merged)),
        "preferred": sum(row["preferred_within_checkpoint"] for row in merged),
        "explicit_canonical_exceptions": [row["label_id"] for row in merged if row["explicit_canonical_exception"]],
        "headwords_without_default_general_or_method_variant": sorted(unserved),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser()
    parser.add_argument("--annotations", type=Path, default=root / "plugins/stata-research-guard/annotations/labeled_checkpoints.json")
    parser.add_argument("reviews", nargs="*", type=Path, default=[root / "work/generality_review_part_a.json", root / "work/generality_review_part_b.json"])
    args = parser.parse_args()
    print(json.dumps(merge(args.annotations, args.reviews), ensure_ascii=False))


if __name__ == "__main__":
    main()
