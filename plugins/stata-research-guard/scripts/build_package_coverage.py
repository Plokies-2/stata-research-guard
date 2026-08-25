from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from build_reference_data import STAGES, active_source_lines, detect_commands, detect_stages, has_tex_output, loop_depth_profile, normalize_command_prefixes


REVIEW_LEVELS = {"end_to_end_read", "targeted_search_only", "inventory_only"}
STAGE_STATUSES = {"present", "absent", "uncertain"}
DISPOSITIONS = {
    "labeled",
    "approved_reference_only",
    "negative_only",
    "no_safe_block",
    "not_applicable",
}
EVIDENCE_RE = re.compile(r"^(?P<path>.+):(?P<span>\d+(?:-(?:\d+|end))?(?:,\d+(?:-(?:\d+|end))?)*)$", re.IGNORECASE)
SPAN_RE = re.compile(r"^\d+(?:-(?:\d+|end))?(?:,\d+(?:-(?:\d+|end))?)*$", re.IGNORECASE)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def read_do(path: Path, encoding: str) -> str:
    raw = path.read_bytes()
    for candidate in (encoding, "utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(candidate)
        except (UnicodeDecodeError, LookupError):
            continue
    raise RuntimeError(f"cannot decode {path}")


def markdown_cell(value) -> str:
    if isinstance(value, list):
        value = "; ".join(str(item) for item in value)
    return str(value).replace("|", "\\|").replace("\n", " ")


def normalize_project_path(value: str) -> str:
    return str(value).strip().replace("\\", "/").removeprefix("./")


def validate_span(span: str, line_count: int, context: str) -> None:
    if not SPAN_RE.fullmatch(str(span).strip()):
        raise ValueError(f"invalid line span for {context}: {span}")
    for piece in str(span).split(","):
        start_text, separator, end_text = piece.partition("-")
        start = int(start_text)
        end = line_count if end_text.lower() == "end" else int(end_text) if separator else start
        if start < 1 or end < start or end > line_count:
            raise ValueError(f"out-of-range line span for {context}: {span}; file has {line_count} lines")


def validate_path_span(value: str, files: dict[str, dict], context: str) -> None:
    match = EVIDENCE_RE.fullmatch(str(value).strip())
    if not match:
        raise ValueError(f"evidence must be package-relative path:line span for {context}: {value}")
    project_path = normalize_project_path(match.group("path"))
    if project_path not in files:
        raise ValueError(f"unknown evidence file for {context}: {project_path}")
    validate_span(match.group("span"), int(files[project_path]["lines"]), context)


def validate_structured_path_span(item: dict, files: dict[str, dict], context: str) -> None:
    if not isinstance(item, dict) or set(item) != {"path", "span", "reason"}:
        raise ValueError(f"{context} must contain exactly path, span, reason")
    project_path = normalize_project_path(item["path"])
    if project_path not in files:
        raise ValueError(f"unknown file for {context}: {project_path}")
    validate_span(item["span"], int(files[project_path]["lines"]), context)
    if not str(item["reason"]).strip():
        raise ValueError(f"missing reason for {context}")


def span_text(text: str, span: str) -> str:
    lines = text.splitlines()
    selected = []
    for piece in span.split(","):
        start_text, separator, end_text = piece.partition("-")
        start = int(start_text)
        end = len(lines) if end_text.lower() == "end" else int(end_text) if separator else start
        selected.extend(lines[start - 1 : end])
    return "\n".join(selected)


def unsafe_candidate_flags(text: str) -> list[str]:
    flags = []
    _depths, maximum = loop_depth_profile(text)
    if maximum >= 2:
        flags.append("nested_loop")
    active = "\n".join(normalize_command_prefixes(line) for _line_number, line in active_source_lines(text))
    if has_tex_output(active):
        flags.append("tex_output")
    patterns = {
        "merge_m_m": r"(?im)^\s*merge\s+m:m\b",
        "duplicates_drop_force": r"(?im)^\s*duplicates\s+drop\b.*\bforce\b",
        "manual_matrix_bridge": r"(?im)^\s*(?:mkmat|svmat|matrix)\b",
    }
    for name, pattern in patterns.items():
        if re.search(pattern, active):
            flags.append(name)
    return flags


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--plugin", type=Path)
    args = parser.parse_args()

    plugin = (args.plugin or Path(__file__).resolve().parents[1]).resolve()
    workspace = (args.workspace or plugin.parents[1]).resolve()
    annotation_path = plugin / "annotations" / "package_workflow_reviews.json"
    data_dir = plugin / "data"
    review_dir = plugin / "review"

    reviews = load_json(annotation_path)
    packages = {row["project_id"]: row for row in load_json(data_dir / "reference_packages.json")}
    labels = load_jsonl(data_dir / "labeled_checkpoints.jsonl")
    references = load_jsonl(data_dir / "reference_index.jsonl")
    code_rows = [row for row in load_csv(workspace / "catalog" / "code_files.csv") if row["extension"] == ".do"]

    review_by_id = {row["package_id"]: row for row in reviews}
    if len(review_by_id) != len(reviews):
        raise ValueError("package reviews must have unique package_id values")
    if set(review_by_id) != set(packages):
        raise ValueError(
            f"package review mismatch; missing={sorted(set(packages)-set(review_by_id))}, extra={sorted(set(review_by_id)-set(packages))}"
        )

    code_by_package: dict[str, list[dict]] = defaultdict(list)
    for row in code_rows:
        code_by_package[row["project_id"]].append(row)
    labels_by_path: dict[str, list[dict]] = defaultdict(list)
    labels_by_package: dict[str, list[dict]] = defaultdict(list)
    for row in labels:
        source = row["source_path"].replace("\\", "/")
        labels_by_path[source].append(row)
        if source.startswith("corpus/packages/"):
            labels_by_package[source.split("/", 3)[2]].append(row)
    references_by_path: dict[str, list[dict]] = defaultdict(list)
    for row in references:
        references_by_path[row["path"].replace("\\", "/")].append(row)

    output_packages = []
    for package_id in sorted(packages):
        review = review_by_id[package_id]
        if review.get("review_level") not in REVIEW_LEVELS:
            raise ValueError(f"invalid review_level for {package_id}")
        if set(review.get("stages", {})) != set(STAGES):
            missing = sorted(set(STAGES) - set(review.get("stages", {})))
            extra = sorted(set(review.get("stages", {})) - set(STAGES))
            raise ValueError(f"stage review mismatch for {package_id}; missing={missing}, extra={extra}")
        for stage, stage_review in review["stages"].items():
            if stage_review.get("status") not in STAGE_STATUSES:
                raise ValueError(f"invalid stage status for {package_id}/{stage}")
            if stage_review.get("reusable_disposition") not in DISPOSITIONS:
                raise ValueError(f"invalid disposition for {package_id}/{stage}")

        file_rows = sorted(code_by_package[package_id], key=lambda row: row["project_path"].lower())
        files_by_project_path = {normalize_project_path(row["project_path"]): row for row in file_rows}
        if len(files_by_project_path) != len(file_rows):
            raise ValueError(f"duplicate project_path values in catalog for {package_id}")
        expected_files = len(file_rows)
        expected_lines = sum(int(row["lines"]) for row in file_rows)
        if int(review["do_files_expected"]) != expected_files or int(review["lines_expected"]) != expected_lines:
            raise ValueError(
                f"inventory mismatch for {package_id}: annotation={review['do_files_expected']}/{review['lines_expected']}, actual={expected_files}/{expected_lines}"
            )
        if review["review_level"] == "end_to_end_read" and (
            int(review["do_files_reviewed"]) != expected_files or int(review["lines_reviewed"]) != expected_lines
        ):
            raise ValueError(f"end_to_end_read lacks exact accounting for {package_id}")
        if int(review["do_files_reviewed"]) > expected_files or int(review["lines_reviewed"]) > expected_lines:
            raise ValueError(f"review accounting exceeds catalog inventory for {package_id}")

        workflow_order = review.get("workflow_order")
        if workflow_order != "no_master":
            if not isinstance(workflow_order, list) or not workflow_order:
                raise ValueError(f"workflow_order for {package_id} must be no_master or a nonempty path array")
            for position, value in enumerate(workflow_order, start=1):
                project_path = normalize_project_path(value)
                if project_path not in files_by_project_path:
                    raise ValueError(f"unknown workflow_order path for {package_id} position {position}: {project_path}")

        for stage, stage_review in review["stages"].items():
            evidence_files = stage_review.get("evidence_files")
            if not isinstance(evidence_files, list):
                raise ValueError(f"evidence_files must be an array for {package_id}/{stage}")
            for evidence in evidence_files:
                validate_path_span(evidence, files_by_project_path, f"{package_id}/{stage}")
            if stage_review["status"] == "absent" and evidence_files:
                raise ValueError(f"absent stage cannot contain evidence files for {package_id}/{stage}")
            if not str(stage_review.get("notes", "")).strip():
                raise ValueError(f"stage notes are required for {package_id}/{stage}")

        excluded_patterns = review.get("excluded_patterns")
        if not isinstance(excluded_patterns, list):
            raise ValueError(f"excluded_patterns must be an array for {package_id}")
        for index, item in enumerate(excluded_patterns, start=1):
            validate_structured_path_span(item, files_by_project_path, f"{package_id}/excluded_patterns/{index}")

        candidates = review.get("unlabeled_reusable_candidates")
        if not isinstance(candidates, list):
            raise ValueError(f"unlabeled_reusable_candidates must be an array for {package_id}")
        for index, item in enumerate(candidates, start=1):
            if not isinstance(item, dict) or set(item) != {"path", "span", "checkpoint", "reason"}:
                raise ValueError(
                    f"{package_id}/unlabeled_reusable_candidates/{index} must contain exactly path, span, checkpoint, reason"
                )
            project_path = normalize_project_path(item["path"])
            if project_path not in files_by_project_path:
                raise ValueError(f"unknown candidate file for {package_id}: {project_path}")
            validate_span(item["span"], int(files_by_project_path[project_path]["lines"]), f"{package_id}/candidate/{index}")
            if item["checkpoint"] not in {row["checkpoint"] for row in labels}:
                raise ValueError(f"unknown candidate checkpoint for {package_id}: {item['checkpoint']}")
            if not str(item["reason"]).strip():
                raise ValueError(f"missing candidate reason for {package_id}/{index}")
            candidate_catalog = files_by_project_path[project_path]
            candidate_source = workspace / candidate_catalog["path"]
            candidate_text = read_do(candidate_source, candidate_catalog["encoding"])
            safety_flags = unsafe_candidate_flags(span_text(candidate_text, item["span"]))
            if safety_flags:
                raise ValueError(f"unsafe unlabeled candidate for {package_id}/{index}: {safety_flags}")

        unresolved_questions = review.get("unresolved_questions")
        if not isinstance(unresolved_questions, list) or any(not str(item).strip() for item in unresolved_questions):
            raise ValueError(f"unresolved_questions must be an array of nonempty strings for {package_id}")

        file_inventory = []
        for code in file_rows:
            source_path = code["path"].replace("\\", "/")
            source = workspace / source_path
            raw = source.read_bytes()
            actual_sha256 = hashlib.sha256(raw).hexdigest()
            if actual_sha256 != code["sha256"]:
                raise ValueError(f"catalog hash mismatch for {source_path}")
            text = read_do(source, code["encoding"])
            actual_lines = len(text.splitlines())
            if actual_lines != int(code["lines"]):
                raise ValueError(f"catalog line-count mismatch for {source_path}: {code['lines']} != {actual_lines}")
            _depths, maximum = loop_depth_profile(text)
            detected_stages = detect_stages(code["project_path"], text, code["role"])
            file_labels = labels_by_path.get(source_path, [])
            file_references = references_by_path.get(source_path, [])
            file_inventory.append(
                {
                    "path": code["project_path"].replace("\\", "/"),
                    "workspace_path": source_path,
                    "role": code["role"],
                    "lines": int(code["lines"]),
                    "sha256": actual_sha256,
                    "stages": detected_stages,
                    "commands": detect_commands(text),
                    "max_loop_depth": maximum,
                    "tex_output": has_tex_output(text),
                    "label_ids": [row["label_id"] for row in file_labels],
                    "approved_reference_spans": sum(row.get("approved_for_generation", False) for row in file_references),
                    "reference_spans": len(file_references),
                }
            )

        package_labels = labels_by_package.get(package_id, [])
        stage_summary = {}
        for stage in STAGES:
            label_rows = [row for row in package_labels if row["stage"] == stage]
            reusable_label_count = sum(row["decision"] != "drop" for row in label_rows)
            if review["stages"][stage]["reusable_disposition"] == "labeled" and reusable_label_count == 0:
                raise ValueError(f"labeled disposition has no reusable label for {package_id}/{stage}")
            stage_summary[stage] = {
                **review["stages"][stage],
                "label_ids": [row["label_id"] for row in label_rows],
                "reusable_label_count": reusable_label_count,
                "drop_label_count": sum(row["decision"] == "drop" for row in label_rows),
            }
        output_packages.append(
            {
                "package_id": package_id,
                "title": packages[package_id]["title"],
                "journal": packages[package_id]["journal"],
                "repository_doi": packages[package_id]["repository_doi"],
                "entrypoint": packages[package_id]["entrypoint"],
                "review_level": review["review_level"],
                "review_accounting": {
                    "do_files_expected": expected_files,
                    "do_files_reviewed": int(review["do_files_reviewed"]),
                    "lines_expected": expected_lines,
                    "lines_reviewed": int(review["lines_reviewed"]),
                },
                "review_verification": {
                    "reviewer_attestation": review["review_level"],
                    "catalog_paths_and_spans_validated": True,
                    "all_cataloged_files_opened_and_hashed_by_builder": len(file_inventory) == expected_files,
                    "builder_file_count": len(file_inventory),
                    "claim_boundary": "The builder verifies complete file access, hashes, counts, and evidence paths. Semantic end-to-end reading remains a reviewer attestation, not a human-attention proof or a runtime result.",
                },
                "workflow_order": review["workflow_order"],
                "stages": stage_summary,
                "excluded_patterns": review["excluded_patterns"],
                "unlabeled_reusable_candidates": review["unlabeled_reusable_candidates"],
                "unresolved_questions": review["unresolved_questions"],
                "label_count": len(package_labels),
                "reusable_label_count": sum(row["decision"] != "drop" for row in package_labels),
                "labeled_checkpoints": sorted({row["checkpoint"] for row in package_labels}),
                "files": file_inventory,
            }
        )

    summary = {
        "schema_version": "1.0",
        "packages": len(output_packages),
        "do_files": sum(row["review_accounting"]["do_files_expected"] for row in output_packages),
        "lines": sum(row["review_accounting"]["lines_expected"] for row in output_packages),
        "review_level_counts": dict(Counter(row["review_level"] for row in output_packages)),
        "packages_with_labels": sum(row["label_count"] > 0 for row in output_packages),
        "packages_without_labels": sum(row["label_count"] == 0 for row in output_packages),
        "unlabeled_reusable_candidates": sum(len(row["unlabeled_reusable_candidates"]) for row in output_packages),
        "unresolved_questions": sum(len(row["unresolved_questions"]) for row in output_packages),
        "files_opened_and_hashed": sum(row["review_verification"]["builder_file_count"] for row in output_packages),
        "verification_basis": "reviewer stage judgments plus deterministic catalog path, line-count, SHA-256, and evidence-span validation",
    }
    document = {"summary": summary, "stages": list(STAGES), "packages": output_packages}
    (data_dir / "package_checkpoint_coverage.json").write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )

    review_lines = [
        "# Package × checkpoint coverage / 패키지별 체크포인트 범위",
        "",
        "> 이 문서는 35개 package의 모든 `.do` 파일을 라벨 수와 별도로 accounting합니다. `end_to_end_read`는 reviewer의 전수 독해 attestation이며, builder가 별도로 전 파일의 경로·행 수·SHA-256과 인용 span을 검증합니다.",
        "",
        "## 현재 범위",
        "",
        f"- package: {summary['packages']}개",
        f"- `.do`: {summary['do_files']}개 / {summary['lines']}행",
        f"- review level: {summary['review_level_counts']}",
        f"- 라벨 출처가 있는 package: {summary['packages_with_labels']}개; 없는 package: {summary['packages_without_labels']}개",
        f"- 아직 라벨로 승격하지 않은 안전 후보: {summary['unlabeled_reusable_candidates']}개",
        f"- 해결되지 않은 연구·자료 질문: {summary['unresolved_questions']}개",
        "",
        "## Package accounting",
        "",
        "| package | journal | review level | files | lines | labels | reusable | unlabeled candidates | unresolved | entrypoint |",
        "|---|---|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for row in output_packages:
        accounting = row["review_accounting"]
        review_lines.append(
            "| " + " | ".join(
                [
                    f"`{row['package_id']}`",
                    markdown_cell(row["journal"]),
                    row["review_level"],
                    f"{accounting['do_files_reviewed']}/{accounting['do_files_expected']}",
                    f"{accounting['lines_reviewed']}/{accounting['lines_expected']}",
                    str(row["label_count"]),
                    str(row["reusable_label_count"]),
                    str(len(row["unlabeled_reusable_candidates"])),
                    str(len(row["unresolved_questions"])),
                    markdown_cell(row["entrypoint"]),
                ]
            ) + " |"
        )
    review_lines.extend(
        [
            "",
            "## 해석",
            "",
            "- `end_to_end_read`: reviewer가 package의 모든 `.do`를 읽고 11개 stage를 판정했다고 attestation한 상태입니다. Builder는 전 파일을 다시 열어 hash·행 수·근거 경로를 검증하지만 인간의 주의나 Stata runtime을 증명하지는 않습니다.",
            "- `targeted_search_only`: 특정 명령·표·그림·추정법을 전수검색했지만 전체 workflow 독해는 아직 아닙니다.",
            "- `inventory_only`: 파일과 자동 stage 신호만 확인됐으며 사람의 end-to-end 판정이 필요합니다.",
            "- 라벨이 없다는 사실은 stage가 없다는 뜻이 아닙니다. 양성 블록 부재, 안전성 탈락, 중복, TeX·중첩 loop 제외를 별도로 봐야 합니다.",
            "",
        ]
    )
    (review_dir / "package_checkpoint_coverage.md").write_text(
        "\n".join(review_lines), encoding="utf-8", newline="\n"
    )
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
