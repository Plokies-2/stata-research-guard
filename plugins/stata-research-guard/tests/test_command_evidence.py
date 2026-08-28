import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "command_registry.json"
MANUAL_INDEX = ROOT / "data" / "manual_index.jsonl"
OFFICIAL_EXAMPLES = ROOT / "data" / "official_examples.json"
COMMAND_SOURCES = ROOT / "data" / "command_sources.json"


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


if __name__ == "__main__":
    unittest.main()
