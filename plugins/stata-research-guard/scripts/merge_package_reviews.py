from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from build_package_coverage import (
    DISPOSITIONS,
    REVIEW_LEVELS,
    STAGE_STATUSES,
    normalize_project_path,
    validate_path_span,
    validate_span,
    validate_structured_path_span,
)
from build_reference_data import STAGES


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def validate(rows: list[dict], workspace: Path, plugin: Path) -> None:
    expected_packages = {
        row["project_id"] for row in json.loads((plugin / "data" / "reference_packages.json").read_text(encoding="utf-8"))
    }
    observed_packages = {row["package_id"] for row in rows}
    if observed_packages != expected_packages:
        raise ValueError(
            f"package review mismatch; missing={sorted(expected_packages-observed_packages)}, "
            f"extra={sorted(observed_packages-expected_packages)}"
        )
    checkpoints = {
        json.loads(line)["checkpoint"]
        for line in (plugin / "data" / "labeled_checkpoints.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    catalog = [
        row for row in load_csv(workspace / "catalog" / "code_files.csv") if row["extension"] == ".do"
    ]
    catalog_by_package: dict[str, dict[str, dict]] = {}
    for row in catalog:
        catalog_by_package.setdefault(row["project_id"], {})[normalize_project_path(row["project_path"])] = row

    for review in rows:
        package_id = review["package_id"]
        files = catalog_by_package[package_id]
        expected_files = len(files)
        expected_lines = sum(int(row["lines"]) for row in files.values())
        if review.get("review_level") not in REVIEW_LEVELS:
            raise ValueError(f"invalid review_level for {package_id}")
        if set(review.get("stages", {})) != set(STAGES):
            raise ValueError(f"stage review mismatch for {package_id}")
        if int(review["do_files_expected"]) != expected_files or int(review["lines_expected"]) != expected_lines:
            raise ValueError(f"inventory mismatch for {package_id}")
        if review["review_level"] == "end_to_end_read" and (
            int(review["do_files_reviewed"]) != expected_files or int(review["lines_reviewed"]) != expected_lines
        ):
            raise ValueError(f"end_to_end_read lacks exact accounting for {package_id}")

        workflow_order = review.get("workflow_order")
        if workflow_order != "no_master":
            if not isinstance(workflow_order, list) or not workflow_order:
                raise ValueError(f"workflow_order for {package_id} must be no_master or a nonempty path array")
            for value in workflow_order:
                project_path = normalize_project_path(value)
                if project_path not in files:
                    raise ValueError(f"unknown workflow_order path for {package_id}: {project_path}")

        for stage, stage_review in review["stages"].items():
            if stage_review.get("status") not in STAGE_STATUSES:
                raise ValueError(f"invalid stage status for {package_id}/{stage}")
            if stage_review.get("reusable_disposition") not in DISPOSITIONS:
                raise ValueError(f"invalid disposition for {package_id}/{stage}")
            evidence_files = stage_review.get("evidence_files")
            if not isinstance(evidence_files, list):
                raise ValueError(f"evidence_files must be an array for {package_id}/{stage}")
            for evidence in evidence_files:
                validate_path_span(evidence, files, f"{package_id}/{stage}")
            if stage_review["status"] == "absent" and evidence_files:
                raise ValueError(f"absent stage cannot contain evidence for {package_id}/{stage}")

        for index, item in enumerate(review.get("excluded_patterns", []), start=1):
            validate_structured_path_span(item, files, f"{package_id}/excluded_patterns/{index}")
        for index, item in enumerate(review.get("unlabeled_reusable_candidates", []), start=1):
            if not isinstance(item, dict) or set(item) != {"path", "span", "checkpoint", "reason"}:
                raise ValueError(
                    f"{package_id}/unlabeled_reusable_candidates/{index} must contain exactly path, span, checkpoint, reason"
                )
            project_path = normalize_project_path(item["path"])
            if project_path not in files:
                raise ValueError(f"unknown candidate file for {package_id}: {project_path}")
            validate_span(item["span"], int(files[project_path]["lines"]), f"{package_id}/candidate/{index}")
            if item["checkpoint"] not in checkpoints:
                raise ValueError(f"unknown candidate checkpoint for {package_id}: {item['checkpoint']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("batches", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--plugin", type=Path)
    args = parser.parse_args()

    rows = []
    for batch in args.batches:
        document = json.loads(batch.read_text(encoding="utf-8"))
        if not isinstance(document, list):
            raise ValueError(f"batch must be a JSON array: {batch}")
        rows.extend(document)
    package_ids = [row.get("package_id") for row in rows]
    duplicates = sorted({item for item in package_ids if package_ids.count(item) > 1})
    if duplicates:
        raise ValueError(f"duplicate package reviews: {duplicates}")
    output = args.output.resolve()
    plugin = (args.plugin or output.parents[1]).resolve()
    workspace = (args.workspace or plugin.parents[1]).resolve()
    validate(rows, workspace, plugin)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(
        json.dumps(sorted(rows, key=lambda row: row["package_id"]), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(args.output)
    print(json.dumps({"batches": len(args.batches), "packages": len(rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
