import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "command_registry.json"
MANUAL_INDEX = ROOT / "data" / "manual_index.jsonl"
OFFICIAL_EXAMPLES = ROOT / "data" / "official_examples.json"
COMMAND_SOURCES = ROOT / "data" / "command_sources.json"
FULL_COMMAND_GUIDES = ROOT / "data" / "full_command_guides.json"
GUIDE_STATUS = ROOT / "data" / "guide_status.json"
FULL_GUIDE_AUDIT = ROOT / "data" / "audits" / "final_manifest_audit.json"
PAPER_OCCURRENCES = ROOT / "data" / "paper_usage_occurrences.jsonl"
PAPER_INDEX = ROOT / "data" / "command_paper_index.json"
PAPER_BLOCKS = ROOT / "data" / "high_quality_paper_blocks.jsonl"
PAPER_REVIEW_SUMMARY = ROOT / "data" / "paper_review_summary.json"
PAPER_REVIEW_AUDIT = ROOT / "data" / "paper_review_integrity_audit.json"


class CommandEvidenceTests(unittest.TestCase):
    def test_registry_contains_relations_without_grading_fields(self):
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertEqual(registry["schema_version"], "1.0")
        self.assertGreaterEqual(len(registry["families"]), 40)
        self.assertGreaterEqual(len(registry["commands"]), 100)
        family_ids = {row["family_id"] for row in registry["families"]}
        command_names = [row["command"] for row in registry["commands"]]
        self.assertEqual(len(command_names), len(set(command_names)))
        self.assertIn("regress", command_names)
        self.assertIn("reghdfe", command_names)
        self.assertIn("outreg2", command_names)
        for row in registry["commands"]:
            self.assertIn(row["family_id"], family_ids)

        forbidden = {
            "winner",
            "score",
            "pass",
            "auto_select",
            "auto_selectable",
            "promotion_status",
            "template_policy",
            "priority",
            "coverage",
        }

        def walk(value):
            if isinstance(value, dict):
                self.assertTrue(forbidden.isdisjoint(value))
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)

        walk(registry)

    def test_manual_excerpts_have_sources_and_content_hashes(self):
        rows = [json.loads(line) for line in MANUAL_INDEX.read_text(encoding="utf-8").splitlines() if line]
        self.assertGreaterEqual(len(rows), 200)
        self.assertTrue(any(row["authority"] == "official" and "regress" in row["commands"] for row in rows))
        self.assertTrue(any(row["authority"] == "community" and "reghdfe" in row["commands"] for row in rows))
        for row in rows:
            self.assertTrue(row["source_url"].startswith(("https://", "http://")))
            observed = hashlib.sha256(row["content"].encode("utf-8")).hexdigest()
            self.assertEqual(observed, row["text_sha256"])

    def test_document_derived_examples_are_labeled_nonverbatim(self):
        rows = json.loads(OFFICIAL_EXAMPLES.read_text(encoding="utf-8"))
        self.assertGreater(len(rows), 0)
        for row in rows:
            self.assertFalse(row["verbatim"])
            self.assertTrue(row["source_url"].startswith("https://"))
            self.assertTrue(row["code"].strip())

    def test_command_source_metadata_is_unranked_and_has_web_urls(self):
        payload = json.loads(COMMAND_SOURCES.read_text(encoding="utf-8"))
        self.assertEqual(payload["schema_version"], "1.0")
        rows = payload["sources"]
        self.assertGreaterEqual(len(rows), 500)
        self.assertGreaterEqual(len({row["command"] for row in rows}), 200)
        for row in rows:
            self.assertTrue(row["source_url"].startswith(("https://", "http://")))
            self.assertNotIn("score", row)
            self.assertNotIn("priority", row)
            self.assertNotIn("promotion_status", row)

    def test_full_command_guides_are_complete_hash_linked_and_final_audited(self):
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        registry_commands = [row["command"] for row in registry["commands"]]
        payload = json.loads(FULL_COMMAND_GUIDES.read_text(encoding="utf-8"))
        status = json.loads(GUIDE_STATUS.read_text(encoding="utf-8"))
        audit = json.loads(FULL_GUIDE_AUDIT.read_text(encoding="utf-8"))
        self.assertEqual(payload["schema_version"], "1.0")
        rows = payload["guides"]
        self.assertEqual(len(registry_commands), 109)
        self.assertEqual(len(rows), 107)
        self.assertEqual(len({row["command"] for row in rows}), len(rows))

        self.assertEqual(status["schema_version"], "1.0")
        self.assertEqual(status["registry_order"], registry_commands)
        self.assertEqual([row["command"] for row in status["guides"]], registry_commands)
        ready = [row for row in status["guides"] if row["status"] == "ready"]
        unavailable = [row for row in status["guides"] if row["status"] == "guide_unavailable"]
        self.assertEqual([row["command"] for row in rows], [row["command"] for row in ready])
        self.assertEqual([row["command"] for row in unavailable], ["cgmreg", "jwdidstacked"])

        data_root = (ROOT / "data").resolve()
        row_by_command = {row["command"]: row for row in rows}
        supplemental_count = 0
        for row in rows:
            self.assertTrue(row["complete"])
            self.assertEqual(row["content_format"], "markdown")
            self.assertTrue(row["source_url"].startswith("https://"))
            source = (data_root / row["source_file"]).resolve()
            content_file = (data_root / row["content_file"]).resolve()
            self.assertTrue(source.is_relative_to(data_root))
            self.assertTrue(content_file.is_relative_to(data_root))
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), row["source_sha256"])
            content_bytes = content_file.read_bytes()
            self.assertEqual(hashlib.sha256(content_bytes).hexdigest(), row["content_sha256"])
            self.assertFalse(content_bytes.startswith(b"\xef\xbb\xbf"))
            self.assertNotIn(b"\r\n", content_bytes)
            self.assertTrue(content_bytes.decode("utf-8").strip())
            for supplemental in row.get("supplemental_sources", []):
                supplemental_count += 1
                supplemental_path = (data_root / supplemental["source_file"]).resolve()
                self.assertTrue(supplemental_path.is_relative_to(data_root))
                self.assertTrue(supplemental["source_url"].startswith("https://"))
                self.assertEqual(
                    hashlib.sha256(supplemental_path.read_bytes()).hexdigest(),
                    supplemental["source_sha256"],
                )
        self.assertEqual(supplemental_count, 9)

        for row in ready:
            indexed = row_by_command[row["command"]]
            self.assertEqual(row["audit_status"], "passed")
            self.assertEqual(row["target_source_file"], indexed["source_file"])
            self.assertEqual(row["target_content_file"], indexed["content_file"])
        for row in unavailable:
            self.assertEqual(row["audit_status"], "unavailable_confirmed")
            self.assertIsNone(row["target_source_file"])
            self.assertIsNone(row["target_content_file"])

        self.assertTrue(audit["import_ready"])
        self.assertEqual(audit["registry"]["commands"], registry_commands)
        self.assertEqual(audit["accounting"]["ready"], 107)
        self.assertEqual(audit["accounting"]["guide_unavailable"], 2)
        self.assertEqual(audit["accounting"]["unavailable_commands"], ["cgmreg", "jwdidstacked"])
        self.assertEqual(audit["checks"]["index_sha256"], hashlib.sha256(FULL_COMMAND_GUIDES.read_bytes()).hexdigest())
        self.assertEqual(audit["checks"]["status_sha256"], hashlib.sha256(GUIDE_STATUS.read_bytes()).hexdigest())
        for check in (
            "all_ready_raw_content_paths_exist",
            "all_ready_hashes_match",
            "all_ready_utf8_bom_free_lf",
            "all_ready_have_final_independent_audit_pass",
            "unavailable_confirmed",
            "https_schema_for_index_source_urls",
            "no_fixed_cap_or_silent_truncation_finding_in_final_audit_gates",
        ):
            self.assertTrue(audit["checks"][check])
        for audit_file in audit["final_audit_authorities"].values():
            authority = (data_root / audit_file).resolve()
            self.assertTrue(authority.is_relative_to(data_root))
            self.assertTrue(authority.is_file())

        reghdfe = next(row for row in rows if row["command"] == "reghdfe")
        self.assertEqual(reghdfe["source_version"], "6.14.1 08Jul2026")
        source = (data_root / reghdfe["source_file"]).resolve()
        content_file = (data_root / reghdfe["content_file"]).resolve()
        content_bytes = content_file.read_bytes()
        content = content_bytes.decode("utf-8")
        self.assertGreater(len(content), 30000)
        for anchor in ("## Syntax", "## Postestimation Syntax", "## Examples", "## Stored results"):
            self.assertIn(anchor, content)
        self.assertNotRegex(content, r"8 10 10 2|\[\+\]|\{(?:cmd|synopt|title|p2col)")

    def test_reviewed_paper_bundle_is_hash_linked_and_high_quality_not_template_data(self):
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        registry_commands = [row["command"] for row in registry["commands"]]
        occurrences = [json.loads(line) for line in PAPER_OCCURRENCES.read_text(encoding="utf-8").splitlines() if line]
        index = json.loads(PAPER_INDEX.read_text(encoding="utf-8"))
        blocks = [json.loads(line) for line in PAPER_BLOCKS.read_text(encoding="utf-8").splitlines() if line]
        summary = json.loads(PAPER_REVIEW_SUMMARY.read_text(encoding="utf-8"))
        audit = json.loads(PAPER_REVIEW_AUDIT.read_text(encoding="utf-8"))

        self.assertEqual(index["record_type"], "reviewed_command_paper_occurrence_index")
        self.assertEqual([row["command"] for row in index["commands"]], registry_commands)
        self.assertEqual(index["registry_command_count"], len(registry_commands))
        self.assertEqual(index["occurrence_file"], PAPER_OCCURRENCES.name)
        self.assertEqual(index["occurrence_file_sha256"], hashlib.sha256(PAPER_OCCURRENCES.read_bytes()).hexdigest())
        self.assertEqual(len(occurrences), 168)
        self.assertEqual(len({row["occurrence_id"] for row in occurrences}), len(occurrences))

        self.assertEqual(summary["counts"]["include_count"], len(occurrences))
        self.assertEqual(summary["counts"]["high_quality_block_count"], len(blocks))
        self.assertEqual(summary["hashes"]["reviewed_paper_usage_occurrences.jsonl"], hashlib.sha256(PAPER_OCCURRENCES.read_bytes()).hexdigest())
        self.assertEqual(summary["hashes"]["reviewed_command_paper_index.json"], hashlib.sha256(PAPER_INDEX.read_bytes()).hexdigest())
        self.assertEqual(summary["hashes"]["high_quality_paper_blocks.jsonl"], hashlib.sha256(PAPER_BLOCKS.read_bytes()).hexdigest())
        self.assertTrue(all(summary["validation"].values()))
        self.assertTrue(audit["pass"])
        self.assertEqual(audit["errors"], [])
        self.assertEqual(audit["hashes"]["review_summary.json"], hashlib.sha256(PAPER_REVIEW_SUMMARY.read_bytes()).hexdigest())
        self.assertTrue(audit["checks"]["block_target_span_records_readback"])
        self.assertTrue(audit["checks"]["outreg2_unlinked_target_spans_are_explicit_source_spans"])

        occurrence_ids = {row["occurrence_id"] for row in occurrences}
        self.assertEqual(len(blocks), 166)
        self.assertEqual(len({row["block_id"] for row in blocks}), len(blocks))
        self.assertEqual(sum(row["focus_command"] == "outreg2" for row in blocks), 4)
        for block in blocks:
            self.assertEqual(block["evidence_role"], "high_quality_example")
            self.assertIn(block["focus_command"], registry_commands)
            self.assertEqual(hashlib.sha256(block["block_code"].encode("utf-8")).hexdigest(), block["block_code_sha256"])
            self.assertTrue(set(block["target_occurrence_ids"]).issubset(occurrence_ids))
            self.assertTrue(block["what_this_example_shows"].strip())
            self.assertTrue(block["do_not_carry_over"].strip())


if __name__ == "__main__":
    unittest.main()
