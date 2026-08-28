from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_labeled_checkpoints import ALLOWED_DERIVED_CANONICAL_LABEL_IDS, enforce_reusable_block_safety


class GeneralityMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rows = json.loads((ROOT / "annotations/labeled_checkpoints.json").read_text(encoding="utf-8"))
        cls.guide_rows = [
            row
            for path in (ROOT / "annotations/atomic_template_sets").glob("*.json")
            for row in json.loads(path.read_text(encoding="utf-8"))
        ]

    def test_only_the_approved_outreg_formatter_is_derived_canonical(self) -> None:
        derived = {row["label_id"] for row in self.rows if row.get("source_kind") == "derived_canonical_implementation"}
        self.assertEqual(derived, ALLOWED_DERIVED_CANONICAL_LABEL_IDS)
        self.assertNotIn("setup.paths.default_style_roles.v1", {row["label_id"] for row in self.rows})

    def test_guide_metadata_is_code_free_and_nonselectable(self) -> None:
        self.assertEqual(len(self.guide_rows), 454)
        for row in self.guide_rows:
            with self.subTest(label_id=row["label_id"]):
                self.assertEqual(row["canonical_generation_class"], "reference_only")
                self.assertEqual(row["candidate_disposition"], "reference_only")
                self.assertEqual(row["audit_status"], "metadata_only")
                self.assertEqual(row["runtime_status"], "not_run")
                self.assertEqual(row["selector_status"], "not_run")
                self.assertFalse(row["independent_support"])
                self.assertFalse(row["researcher_style_evidence"])
                self.assertTrue(row["source_urls"])
                self.assertNotIn("source_spans", row)
                self.assertNotIn("source_snapshot_path", row)

    def test_reusable_unclosed_block_fails_before_publication(self) -> None:
        with self.assertRaisesRegex(ValueError, "reusable label has unclosed block: fixture.unclosed.v1"):
            enforce_reusable_block_safety("fixture.unclosed.v1", "conditional_keep", 1, 1, False)
        enforce_reusable_block_safety("fixture.closed.v1", "conditional_keep", 1, 0, False)


if __name__ == "__main__":
    unittest.main()
