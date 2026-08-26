from __future__ import annotations

import json
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_corpus_usage_occurrences import (  # noqa: E402
    CORPUS_OCCURRENCE_SCHEMA_VERSION,
    build_occurrences,
    read_jsonl,
    write_jsonl,
)
from build_evidence_layers import build_layers  # noqa: E402


LEDGER = ROOT / "annotations/corpus_usage_occurrences.jsonl"


def _all_keys(value):
    if isinstance(value, dict):
        yield from value.keys()
        for child in value.values():
            yield from _all_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from _all_keys(child)


def _release_owned_rebuild_inputs(rows: list[dict]) -> tuple[list[dict], list[dict], list[dict], list[dict], list[dict]]:
    """Invert the code-free canonical ledger into the builder's audit inputs.

    The release intentionally does not ship raw paper code or the private
    collection workspace.  Every field used here is already present in the
    reviewed, promotion-prohibited occurrence ledger.
    """

    representatives = []
    audits = []
    metadata_by_project = {}
    code_files_by_key = {}
    archives_by_project = {}
    for row in rows:
        source = row["source"]
        source_file = row["source_file"]
        source_span = row["source_span"]
        source_container = row["source_container"]
        lineage = row["lineage"]
        project_id = source["project_id"]
        source_path = source["source_path"]

        representatives.append({
            "record_id": row["record_id"],
            "package": {
                "project_id": project_id,
                "repository_doi": source["repository_doi"],
                "article_doi": source["article_doi"],
            },
            "source_path": source_path,
            "source_file_sha256": source_file["sha256"],
            "facet_signature": row["facet_signature"],
            "package_lineage": row["package_lineage"],
            "package_corpus_role": row["package_corpus_role"],
            "command_anchors": row["command_anchors"],
            "context_flags": row["context_flags"],
            "reject_reasons": row["reject_reasons"],
            "line_span": source_span["line_span"],
            "source_encoding": source_file["encoding"],
            "reduction_status": lineage["reduction_status"],
            "source_kind": lineage["source_kind"],
            "source_manifest_entry": lineage["source_manifest_entry"],
        })
        audits.append({
            "record_id": row["record_id"],
            "status": row["audit_decision"],
            "evidence_class": row["evidence_class"],
            "canonical_generation_class": row["canonical_generation_class"],
            "promotion_prohibited": row["promotion_prohibited"],
            "auto_selectable": row["auto_selectable"],
            "source": {
                "project_id": project_id,
                "version": source["version"],
                "project_path": source["project_path"],
                "source_path": source_path,
                "article_doi": source["article_doi"],
                "repository_doi": source["repository_doi"],
            },
            "provenance_verification": {
                "source_file_sha256_expected": source_file["sha256"],
                "source_file_sha256_readback": source_file["sha256"],
                "source_file_hash_match": True,
                "source_path_exists": True,
                "span_start": source_span["start"],
                "span_end": source_span["end"],
                "span_sha256_expected": source_span["span_sha256"],
                "span_sha256_readback": source_span["span_sha256"],
                "span_hash_match": True,
                "source_container_sha256": source_container["sha256"],
                "source_container_path": source_container["path"],
                "source_container_url": source_container["url"],
            },
            "observed": row["observed"],
            "contamination": row["contamination"],
            "decision": row["audit_decision_detail"],
            "duplicate_cluster_id": row["duplicate_cluster_id"],
        })

        metadata = {
            "project_id": project_id,
            "repository_doi": source["repository_doi"],
            "repository_url": source["repository_url"],
            "article_url": source["article_url"],
        }
        previous_metadata = metadata_by_project.setdefault(project_id, metadata)
        if previous_metadata != metadata:
            raise AssertionError(f"inconsistent package metadata in canonical ledger: {project_id}")

        code_file = {
            "project_id": project_id,
            "path": source_path,
            "project_path": source_file["catalog_project_path"],
            "sha256": source_file["sha256"],
        }
        code_key = (project_id, source_path)
        previous_code_file = code_files_by_key.setdefault(code_key, code_file)
        if previous_code_file != code_file:
            raise AssertionError(f"inconsistent code-file metadata in canonical ledger: {code_key}")

        if source_container["archive_manifest_verified"]:
            archive = {
                "project_id": project_id,
                "archive": source_container["path"],
                "sha256": source_container["sha256"],
            }
            previous_archive = archives_by_project.setdefault(project_id, archive)
            if previous_archive != archive:
                raise AssertionError(f"inconsistent archive metadata in canonical ledger: {project_id}")

    return (
        representatives,
        audits,
        list(metadata_by_project.values()),
        list(code_files_by_key.values()),
        list(archives_by_project.values()),
    )


def _without_input_hashes(rows: list[dict]) -> list[dict]:
    normalized = deepcopy(rows)
    for row in normalized:
        row["lineage"].pop("representative_input_row_sha256", None)
        row["lineage"].pop("audit_input_row_sha256", None)
    return normalized


class CorpusUsageExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = read_jsonl(LEDGER)
        (
            cls.representative,
            cls.audit,
            cls.metadata,
            cls.code_files,
            cls.archive_manifest,
        ) = _release_owned_rebuild_inputs(cls.rows)

    def test_canonical_ledger_preserves_audit_one_to_one_and_decisions(self):
        rows = self.rows
        self.assertEqual(len(rows), 132)
        self.assertEqual(CORPUS_OCCURRENCE_SCHEMA_VERSION, "2.0")
        self.assertTrue(all(row["schema_version"] == "2.0" for row in rows))
        self.assertEqual(len({row["record_id"] for row in rows}), 132)
        self.assertEqual(
            {key: sum(row["audit_decision"] == key for row in rows) for key in ("pass_reference_only", "needs_manual_followup", "reject")},
            {"pass_reference_only": 38, "needs_manual_followup": 13, "reject": 81},
        )
        self.assertEqual(sum(bool(row["exact_contract_ids_proposed"]) for row in rows), 21)
        self.assertTrue(
            all(
                not row["exact_contract_ids_proposed"] or row["audit_decision"] == "pass_reference_only"
                for row in rows
            )
        )
        self.assertTrue(all(row["evidence_class"] == "deposited_paper_corpus_support_only" for row in rows))
        self.assertTrue(all(row["canonical_generation_class"] == "reference_only" for row in rows))
        self.assertTrue(all(row["promotion_prohibited"] is True for row in rows))
        self.assertTrue(all(row["auto_selectable"] is False for row in rows))
        self.assertTrue(all(row["code_available"] is False for row in rows))
        self.assertTrue(all(row["runtime_status"] == "not_run" for row in rows))
        self.assertTrue(all(row["selector_status"] == "not_run" for row in rows))
        self.assertNotIn("\ufffd", LEDGER.read_text(encoding="utf-8"))
        self.assertNotIn("code", set(_all_keys(rows)))

    def test_rebuild_is_deterministic_and_corpus_layer_adds_only_38_pass_rows(self):
        rows, summary = build_occurrences(
            self.representative,
            self.audit,
            self.metadata,
            self.code_files,
            self.archive_manifest,
        )
        self.assertEqual(summary["decision_totals"], {"needs_manual_followup": 13, "pass_reference_only": 38, "reject": 81})
        self.assertEqual(summary["repository_kind_totals"], {"openicpsr": 105, "zenodo": 27})
        self.assertEqual(_without_input_hashes(rows), _without_input_hashes(self.rows))
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.jsonl"
            second = Path(directory) / "second.jsonl"
            write_jsonl(first, rows)
            write_jsonl(second, rows)
            self.assertEqual(first.read_bytes(), second.read_bytes())

        cards, usages, layer_summary = build_layers([], [], rows)
        self.assertEqual(cards, [])
        self.assertEqual(len(usages), 38)
        self.assertEqual(layer_summary["occurrence_support"], 38)
        self.assertEqual(layer_summary["corpus_occurrence_followup_excluded"], 13)
        self.assertEqual(layer_summary["corpus_occurrence_reject_excluded"], 81)
        self.assertTrue(all(card["evidence_role"] == "occurrence_support" for card in usages))
        self.assertTrue(all(card["code"] == "" and card["code_available"] is False for card in usages))
        self.assertTrue(all(card["auto_selectable"] is False for card in usages))
        self.assertTrue(all(card["schema_version"] == "2.0" for card in usages))

    def test_corpus_layer_rejects_legacy_schema_version(self):
        rows = read_jsonl(LEDGER)
        next(row for row in rows if row["audit_decision"] == "pass_reference_only")["schema_version"] = "1.0"
        with self.assertRaisesRegex(ValueError, "requires schema_version 2.0"):
            build_layers([], [], rows)

    def test_arbitrary_repository_url_fails_closed(self):
        audit = [json.loads(json.dumps(row)) for row in self.audit]
        audit[0]["provenance_verification"]["source_container_url"] = "https://example.invalid/not-a-catalog-source"
        with self.assertRaisesRegex(ValueError, "repository URL does not match package catalog"):
            build_occurrences(
                self.representative,
                audit,
                self.metadata,
                self.code_files,
                self.archive_manifest,
            )


if __name__ == "__main__":
    unittest.main()
