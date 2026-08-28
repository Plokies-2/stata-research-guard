import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "data" / "source_archive" / "index.json"


class SourceArchiveTests(unittest.TestCase):
    def test_archive_paths_bytes_and_hashes_match(self):
        index = json.loads(INDEX.read_text(encoding="utf-8"))
        self.assertEqual(index["schema_version"], "1.0")
        self.assertGreater(len(index["sources"]), 0)
        for source_path, row in index["sources"].items():
            self.assertTrue(source_path)
            archive = ROOT / row["archive_path"]
            self.assertTrue(archive.is_file(), archive)
            content = archive.read_bytes()
            self.assertEqual(len(content), row["bytes"])
            self.assertEqual(hashlib.sha256(content).hexdigest(), row["sha256"])

    def test_archive_is_provenance_only(self):
        server = (ROOT / "mcp" / "server.cjs").read_text(encoding="utf-8")
        self.assertNotIn("source_archive/files", server)
        self.assertNotIn("research_usage_examples.jsonl", server)
        self.assertNotIn("corpus_usage_occurrences.jsonl", server)


if __name__ == "__main__":
    unittest.main()
