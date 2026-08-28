import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "command_registry.json"
MANUAL_INDEX = ROOT / "data" / "manual_index.jsonl"
OFFICIAL_EXAMPLES = ROOT / "data" / "official_examples.json"
COMMAND_SOURCES = ROOT / "data" / "command_sources.json"
FULL_COMMAND_GUIDES = ROOT / "data" / "full_command_guides.json"


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

    def test_full_command_guides_are_complete_hash_linked_and_reproducible(self):
        payload = json.loads(FULL_COMMAND_GUIDES.read_text(encoding="utf-8"))
        self.assertEqual(payload["schema_version"], "1.0")
        rows = payload["guides"]
        self.assertGreater(len(rows), 0)
        self.assertEqual(len({row["command"] for row in rows}), len(rows))
        reghdfe = next(row for row in rows if row["command"] == "reghdfe")
        self.assertTrue(reghdfe["complete"])
        self.assertEqual(reghdfe["content_format"], "markdown")
        self.assertEqual(reghdfe["source_version"], "6.14.1 08Jul2026")

        data_root = (ROOT / "data").resolve()
        source = (data_root / reghdfe["source_file"]).resolve()
        content_file = (data_root / reghdfe["content_file"]).resolve()
        self.assertTrue(source.is_relative_to(data_root))
        self.assertTrue(content_file.is_relative_to(data_root))
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), reghdfe["source_sha256"])
        content_bytes = content_file.read_bytes()
        self.assertEqual(hashlib.sha256(content_bytes).hexdigest(), reghdfe["content_sha256"])
        content = content_bytes.decode("utf-8")
        self.assertGreater(len(content), 30000)
        for anchor in ("## Syntax", "## Postestimation Syntax", "## Examples", "## Stored results"):
            self.assertIn(anchor, content)
        self.assertNotRegex(content, r"8 10 10 2|\[\+\]|\{(?:cmd|synopt|title|p2col)")

        with tempfile.TemporaryDirectory() as temp_dir:
            rebuilt = Path(temp_dir) / "reghdfe.md"
            subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts" / "build_clean_command_guide.py"),
                    "--source",
                    str(source),
                    "--output",
                    str(rebuilt),
                    "--title",
                    "reghdfe",
                ],
                check=True,
            )
            self.assertEqual(rebuilt.read_bytes(), content_bytes)


if __name__ == "__main__":
    unittest.main()
