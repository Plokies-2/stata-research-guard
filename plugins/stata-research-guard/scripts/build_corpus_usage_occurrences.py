"""Build the release-safe occurrence ledger from the independent corpus audit.

The ledger deliberately stores provenance and observed mechanics only.  It never
copies the source code lines into the plugin and it cannot be used as generation
authority.  The input audit is authoritative for the three-way disposition.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Iterable


DECISIONS = {"pass_reference_only", "needs_manual_followup", "reject"}
CORPUS_OCCURRENCE_SCHEMA_VERSION = "2.0"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
OPENICPSR_DOI_RE = re.compile(r"^10\.3886/[A-Za-z0-9]+$")
ZENODO_DOI_RE = re.compile(r"^10\.5281/zenodo\.[0-9]+$")
ZENODO_URL_RE = re.compile(r"^https://zenodo\.org/records/[0-9]+$")


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def canonical_json_sha256(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSONL at {path}:{line_number}: {error}") from error
        if not isinstance(row, dict):
            raise ValueError(f"JSONL row must be an object at {path}:{line_number}")
        rows.append(row)
    return rows


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def require_sha256(value: object, field: str, record_id: str) -> str:
    text = str(value or "").lower()
    if not SHA256_RE.fullmatch(text):
        raise ValueError(f"{record_id} has invalid {field}")
    return text


def require_int(value: object, field: str, record_id: str) -> int:
    try:
        result = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{record_id} has invalid {field}: {value!r}") from error
    if result < 1:
        raise ValueError(f"{record_id} has non-positive {field}: {result}")
    return result


def _single_index(rows: Iterable[dict], key: str, description: str) -> dict[str, dict]:
    index: dict[str, dict] = {}
    for row in rows:
        value = str(row.get(key) or "").strip()
        if not value:
            raise ValueError(f"{description} row is missing {key}")
        if value in index:
            raise ValueError(f"duplicate {description} key: {value}")
        index[value] = row
    return index


def _code_file_index(rows: Iterable[dict]) -> dict[tuple[str, str], dict]:
    index: dict[tuple[str, str], dict] = {}
    for row in rows:
        project_id = str(row.get("project_id") or "").strip()
        source_path = str(row.get("path") or "").strip()
        if not project_id or not source_path:
            raise ValueError("code_files row is missing project_id or path")
        key = (project_id, source_path)
        if key in index:
            raise ValueError(f"duplicate code_files key: {key}")
        index[key] = row
    return index


def _repository_kind(repository_doi: str) -> str:
    if OPENICPSR_DOI_RE.fullmatch(repository_doi):
        return "openicpsr"
    if ZENODO_DOI_RE.fullmatch(repository_doi):
        return "zenodo"
    raise ValueError(f"unsupported repository DOI (only OpenICPSR or Zenodo): {repository_doi}")


def _validate_repository(
    record_id: str,
    source: dict,
    provenance: dict,
    metadata: dict[str, dict],
    archive_manifest: dict[str, dict],
) -> tuple[dict, dict]:
    project_id = str(source.get("project_id") or "").strip()
    meta = metadata.get(project_id)
    if meta is None:
        raise ValueError(f"{record_id} project_id is absent from package_metadata.csv: {project_id}")
    repository_doi = str(source.get("repository_doi") or "").strip()
    repository_url = str(provenance.get("source_container_url") or "").strip()
    if repository_doi != str(meta.get("repository_doi") or "").strip():
        raise ValueError(f"{record_id} repository DOI does not match package catalog")
    if repository_url != str(meta.get("repository_url") or "").strip():
        raise ValueError(f"{record_id} repository URL does not match package catalog")
    kind = _repository_kind(repository_doi)
    if kind == "openicpsr":
        if repository_url != f"https://doi.org/{repository_doi}":
            raise ValueError(f"{record_id} OpenICPSR URL is not the catalog DOI URL")
        archive = archive_manifest.get(project_id)
        # archive_manifest.csv is a partial catalog (it does not cover every
        # audited OpenICPSR package).  When present, use it as an additional
        # exact check; otherwise retain the independently read-back container
        # identity from the audit rather than inventing a URL/hash.
        if archive is not None:
            if str(archive.get("sha256") or "").lower() != str(provenance.get("source_container_sha256") or "").lower():
                raise ValueError(f"{record_id} OpenICPSR archive hash does not match archive_manifest.csv")
            if str(archive.get("archive") or "") != str(provenance.get("source_container_path") or ""):
                raise ValueError(f"{record_id} OpenICPSR archive path does not match archive_manifest.csv")
    else:
        if not ZENODO_URL_RE.fullmatch(repository_url):
            raise ValueError(f"{record_id} Zenodo URL is not an allowed records URL")
        expected_id = repository_doi.rsplit(".", 1)[-1]
        if repository_url.rsplit("/", 1)[-1] != expected_id:
            raise ValueError(f"{record_id} Zenodo DOI and URL identify different records")
    return meta, {
        "kind": kind,
        "archive_manifest_verified": kind == "openicpsr" and project_id in archive_manifest,
    }


def _validate_and_build_row(
    representative: dict,
    audit: dict,
    metadata: dict[str, dict],
    code_files: dict[tuple[str, str], dict],
    archive_manifest: dict[str, dict],
) -> dict:
    record_id = str(audit.get("record_id") or "").strip()
    if not record_id or str(representative.get("record_id") or "").strip() != record_id:
        raise ValueError(f"representative/audit record_id mismatch: {record_id!r}")
    status = str(audit.get("status") or "").strip()
    if status not in DECISIONS:
        raise ValueError(f"{record_id} has unsupported audit decision: {status!r}")
    if audit.get("evidence_class") != "deposited_paper_corpus_support_only":
        raise ValueError(f"{record_id} is not corpus support-only evidence")
    if audit.get("canonical_generation_class") != "reference_only":
        raise ValueError(f"{record_id} is not reference_only")
    if audit.get("promotion_prohibited") is not True or audit.get("auto_selectable") is not False:
        raise ValueError(f"{record_id} violates the non-promotion contract")

    source = audit.get("source") or {}
    source_project = str(source.get("project_id") or "").strip()
    source_path = str(source.get("source_path") or "").strip()
    if source_project != str(representative.get("package", {}).get("project_id") or "").strip():
        raise ValueError(f"{record_id} representative/audit project mismatch")
    if source_path != str(representative.get("source_path") or "").strip():
        raise ValueError(f"{record_id} representative/audit source path mismatch")
    code_file = code_files.get((source_project, source_path))
    if code_file is None:
        raise ValueError(f"{record_id} source path is absent from code_files.csv")

    provenance = audit.get("provenance_verification") or {}
    expected_file_hash = require_sha256(provenance.get("source_file_sha256_expected"), "source_file_sha256_expected", record_id)
    readback_file_hash = require_sha256(provenance.get("source_file_sha256_readback"), "source_file_sha256_readback", record_id)
    catalog_file_hash = require_sha256(code_file.get("sha256"), "catalog code-file sha256", record_id)
    representative_file_hash = require_sha256(representative.get("source_file_sha256"), "representative source_file_sha256", record_id)
    if not (expected_file_hash == readback_file_hash == catalog_file_hash == representative_file_hash):
        raise ValueError(f"{record_id} source file hash readback/catalog mismatch")
    if provenance.get("source_file_hash_match") is not True or provenance.get("source_path_exists") is not True:
        raise ValueError(f"{record_id} source file provenance verification is not complete")

    start = require_int(provenance.get("span_start"), "span_start", record_id)
    end = require_int(provenance.get("span_end"), "span_end", record_id)
    if end < start:
        raise ValueError(f"{record_id} span_end precedes span_start")
    expected_span_hash = require_sha256(provenance.get("span_sha256_expected"), "span_sha256_expected", record_id)
    readback_span_hash = require_sha256(provenance.get("span_sha256_readback"), "span_sha256_readback", record_id)
    if expected_span_hash != readback_span_hash or provenance.get("span_hash_match") is not True:
        raise ValueError(f"{record_id} source span hash readback mismatch")
    container_hash = require_sha256(provenance.get("source_container_sha256"), "source_container_sha256", record_id)
    meta, repository_check = _validate_repository(record_id, source, provenance, metadata, archive_manifest)

    package = representative.get("package") or {}
    if str(package.get("repository_doi") or "") != str(source.get("repository_doi") or ""):
        raise ValueError(f"{record_id} representative/audit repository DOI mismatch")
    if str(package.get("article_doi") or "") != str(source.get("article_doi") or ""):
        raise ValueError(f"{record_id} representative/audit article DOI mismatch")
    exact_contracts = audit.get("decision", {}).get("exact_contract_ids_proposed") or []
    if not isinstance(exact_contracts, list) or any(not isinstance(item, str) or not item.strip() for item in exact_contracts):
        raise ValueError(f"{record_id} has malformed exact contract proposals")
    facet_signature = representative.get("facet_signature")
    try:
        facets = json.loads(facet_signature) if isinstance(facet_signature, str) else facet_signature or {}
    except json.JSONDecodeError as error:
        raise ValueError(f"{record_id} has invalid facet_signature") from error
    if not isinstance(facets, dict):
        raise ValueError(f"{record_id} facet_signature must decode to an object")

    return {
        "schema_version": CORPUS_OCCURRENCE_SCHEMA_VERSION,
        "record_type": "occurrence",
        "record_id": record_id,
        "evidence_layer": "research_usage",
        "evidence_role": "occurrence_support",
        "evidence_class": audit["evidence_class"],
        "audit_decision": status,
        "canonical_generation_class": audit["canonical_generation_class"],
        "promotion_prohibited": True,
        "auto_selectable": False,
        "runtime_status": "not_run",
        "selector_status": "not_run",
        "code_available": False,
        "source_tier": "corpus_research_code_occurrence",
        "package_lineage": representative.get("package_lineage"),
        "package_corpus_role": representative.get("package_corpus_role"),
        "command_anchors": representative.get("command_anchors") or [],
        "facets": facets,
        "variant_facets": facets,
        "observed": audit.get("observed") or {},
        "facet_signature": representative.get("facet_signature"),
        "context_flags": representative.get("context_flags") or {},
        "contamination": audit.get("contamination") or {},
        "exact_contract_ids_proposed": exact_contracts,
        "unmapped_reason": (audit.get("decision") or {}).get("unmapped_reason"),
        "reject_reasons": representative.get("reject_reasons") or [],
        "audit_decision_detail": audit.get("decision") or {},
        "duplicate_cluster_id": audit.get("duplicate_cluster_id"),
        "source": {
            "project_id": source_project,
            "version": source.get("version"),
            "project_path": source.get("project_path"),
            "source_path": source_path,
            "article_doi": source.get("article_doi"),
            "article_url": meta.get("article_url"),
            "repository_doi": source.get("repository_doi"),
            "repository_url": meta.get("repository_url"),
            "line_span": representative.get("line_span"),
            "source_file_sha256": expected_file_hash,
            "source_span_sha256": expected_span_hash,
            "source_container_sha256": container_hash,
            "source_container_path": provenance.get("source_container_path"),
            "source_container_url": provenance.get("source_container_url"),
        },
        "source_span": {
            "line_span": representative.get("line_span"),
            "start": start,
            "end": end,
            "span_sha256": expected_span_hash,
        },
        "source_file": {
            "sha256": expected_file_hash,
            "encoding": representative.get("source_encoding"),
            "catalog_path": code_file.get("path"),
            "catalog_project_path": code_file.get("project_path"),
        },
        "source_container": {
            "path": provenance.get("source_container_path"),
            "sha256": container_hash,
            "url": provenance.get("source_container_url"),
            "repository_kind": repository_check["kind"],
            "archive_manifest_verified": repository_check["archive_manifest_verified"],
        },
        "lineage": {
            "representative_input_row_sha256": canonical_json_sha256(representative),
            "audit_input_row_sha256": canonical_json_sha256(audit),
            "reduction_status": representative.get("reduction_status"),
            "source_kind": representative.get("source_kind"),
            "source_manifest_entry": representative.get("source_manifest_entry") or {},
        },
    }


def build_occurrences(
    representative_rows: Iterable[dict],
    audit_rows: Iterable[dict],
    package_metadata_rows: Iterable[dict],
    code_file_rows: Iterable[dict],
    archive_manifest_rows: Iterable[dict],
    superseded_rows: Iterable[dict] | None = None,
    reduction_summary: dict | None = None,
) -> tuple[list[dict], dict]:
    representatives = _single_index(representative_rows, "record_id", "representative")
    audits = _single_index(audit_rows, "record_id", "audit")
    metadata = _single_index(package_metadata_rows, "project_id", "package_metadata")
    code_files = _code_file_index(code_file_rows)
    archive_manifest = _single_index(archive_manifest_rows, "project_id", "archive_manifest")
    if set(representatives) != set(audits):
        raise ValueError("representative and audit IDs are not 1:1 identical")

    rows = [
        _validate_and_build_row(representatives[record_id], audits[record_id], metadata, code_files, archive_manifest)
        for record_id in sorted(audits)
    ]
    decisions = Counter(row["audit_decision"] for row in rows)
    expected = {"pass_reference_only": 38, "needs_manual_followup": 13, "reject": 81}
    if dict(decisions) != expected:
        raise ValueError(f"audit decision totals changed: {dict(decisions)} != {expected}")
    proposal_count = sum(bool(row["exact_contract_ids_proposed"]) for row in rows)
    if proposal_count != 21:
        raise ValueError(f"exact contract proposal count changed: {proposal_count} != 21")
    superseded_count = None
    if superseded_rows is not None or reduction_summary is not None:
        if superseded_rows is None or reduction_summary is None:
            raise ValueError("superseded_dedup and usage_reduction_summary must be supplied together")
        superseded = list(superseded_rows)
        superseded_count = len(superseded)
        if reduction_summary.get("status") != "candidate_audit_packet_only":
            raise ValueError("usage_reduction_summary is not the expected candidate-audit packet")
        if int(reduction_summary.get("representative_count", -1)) != len(rows):
            raise ValueError("usage_reduction_summary representative_count mismatch")
        if int(reduction_summary.get("superseded_count", -1)) != superseded_count:
            raise ValueError("usage_reduction_summary superseded_count mismatch")
        dedup_ids = [str(row.get("record_id") or "") for row in superseded]
        if not all(dedup_ids) or len(dedup_ids) != len(set(dedup_ids)):
            raise ValueError("superseded_dedup record_id values must be present and unique")
    summary = {
        "status": "corpus_occurrence_ledger_built",
        "schema_version": CORPUS_OCCURRENCE_SCHEMA_VERSION,
        "row_count": len(rows),
        "decision_totals": dict(sorted(decisions.items())),
        "exact_contract_proposal_rows": proposal_count,
        "reference_only_rows": sum(row["audit_decision"] == "pass_reference_only" for row in rows),
        "followup_rows_excluded_from_generation": sum(row["audit_decision"] == "needs_manual_followup" for row in rows),
        "reject_rows_excluded_from_generation": sum(row["audit_decision"] == "reject" for row in rows),
        "repository_kind_totals": dict(sorted(Counter(row["source_container"]["repository_kind"] for row in rows).items())),
        "code_available_false_rows": sum(row["code_available"] is False for row in rows),
        "promotion_prohibited_rows": sum(row["promotion_prohibited"] is True for row in rows),
        "runtime_not_run_rows": sum(row["runtime_status"] == "not_run" for row in rows),
        "selector_not_run_rows": sum(row["selector_status"] == "not_run" for row in rows),
    }
    if superseded_count is not None:
        summary["superseded_dedup_rows"] = superseded_count
        summary["reduction_summary_status"] = reduction_summary["status"]
    return rows, summary


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = "".join(canonical_json(row) + "\n" for row in rows)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(payload, encoding="utf-8", newline="\n")
    temporary.replace(path)


def write_report(path: Path, summary: dict, input_paths: dict[str, Path], output_path: Path) -> None:
    lines = [
        "# Corpus usage occurrence 추출 보고서",
        "",
        "이 문서는 독립 occurrence audit를 release-safe support ledger로 변환한 결과다. 논문 raw code는 복제하지 않으며, 모든 row는 `reference_only`, `promotion_prohibited=true`, `auto_selectable=false`다.",
        "",
        "## 결과",
        "",
        f"- ledger rows: `{summary['row_count']}`",
        f"- corpus occurrence schema: `{summary['schema_version']}`",
        f"- pass_reference_only (research_usage `occurrence_support`로 추가 가능): `{summary['reference_only_rows']}`",
        f"- needs_manual_followup (generation에서 제외): `{summary['followup_rows_excluded_from_generation']}`",
        f"- reject (generation에서 제외): `{summary['reject_rows_excluded_from_generation']}`",
        f"- exact contract proposal rows: `{summary['exact_contract_proposal_rows']}`",
        f"- superseded dedup rows retained as audit provenance only: `{summary.get('superseded_dedup_rows', 'not supplied')}`",
        f"- repository kinds: `{json.dumps(summary['repository_kind_totals'], ensure_ascii=False, sort_keys=True)}`",
        "",
        "## 불변 안전 계약",
        "",
        "- 모든 row: `code_available=false`, `runtime_status=not_run`, `selector_status=not_run`.",
        "- source path, line span, source-file hash, span hash, source-container hash와 catalog DOI/URL을 함께 보존한다.",
        "- exact contract 제안은 감사가 완결된 21건의 제안만 저장하며, 나머지는 `unmapped_reason` 또는 감사 사유로 남긴다.",
        "- corpus occurrence input schema는 `2.0`이며 기존 19건 AEA exact support ledger의 `1.0` 계약과 구분된다.",
        "",
        "## 입력 및 산출물 SHA-256",
        "",
    ]
    for name, source in input_paths.items():
        lines.append(f"- `{name}`: `{sha256_file(source)}`")
    lines.append(f"- `output`: `{sha256_file(output_path)}`")
    lines.append("")
    lines.append("재현 명령은 `build_corpus_usage_occurrences.py`의 인자 기본값을 사용하거나, 위 입력 파일을 명시적으로 지정하면 된다.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a code-free corpus occurrence ledger from the independent audit.")
    repo = Path(__file__).resolve().parents[3]
    parser.add_argument("--representative", type=Path, default=repo / "work/top100_expansion_20260826/usage_reduced/representative_usage.jsonl")
    parser.add_argument("--audit", type=Path, default=repo / "work/top100_expansion_20260826/usage_audit/independent_occurrence_audit.jsonl")
    parser.add_argument("--superseded-dedup", type=Path, default=repo / "work/top100_expansion_20260826/usage_reduced/superseded_dedup.jsonl")
    parser.add_argument("--usage-reduction-summary", type=Path, default=repo / "work/top100_expansion_20260826/usage_reduced/usage_reduction_summary.json")
    parser.add_argument("--package-metadata", type=Path, default=repo / "catalog/package_metadata.csv")
    parser.add_argument("--code-files", type=Path, default=repo / "catalog/code_files.csv")
    parser.add_argument("--archive-manifest", type=Path, default=repo / "catalog/archive_manifest.csv")
    parser.add_argument("--output", type=Path, default=repo / "plugins/stata-research-guard/annotations/corpus_usage_occurrences.jsonl")
    parser.add_argument("--report", type=Path, default=repo / "plugins/stata-research-guard/review/corpus_usage_extraction_report.md")
    args = parser.parse_args()

    rows, summary = build_occurrences(
        read_jsonl(args.representative),
        read_jsonl(args.audit),
        read_csv(args.package_metadata),
        read_csv(args.code_files),
        read_csv(args.archive_manifest),
        read_jsonl(args.superseded_dedup),
        json.loads(args.usage_reduction_summary.read_text(encoding="utf-8")),
    )
    write_jsonl(args.output, rows)
    input_paths = {
        "representative_usage.jsonl": args.representative,
        "independent_occurrence_audit.jsonl": args.audit,
        "superseded_dedup.jsonl": args.superseded_dedup,
        "usage_reduction_summary.json": args.usage_reduction_summary,
        "package_metadata.csv": args.package_metadata,
        "code_files.csv": args.code_files,
        "archive_manifest.csv": args.archive_manifest,
    }
    write_report(args.report, summary, input_paths, args.output)
    print(json.dumps({**summary, "output_sha256": sha256_file(args.output)}, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
