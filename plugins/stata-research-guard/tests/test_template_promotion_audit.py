from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_command_template_coverage import validate_promotion_audit


class TemplatePromotionAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = json.loads((PLUGIN / "annotations/command_template_requirements.json").read_text(encoding="utf-8"))
        cls.audit = json.loads((PLUGIN / "annotations/template_promotion_audit.json").read_text(encoding="utf-8"))
        cls.legacy_count = len(json.loads((PLUGIN / "annotations/labeled_checkpoints.json").read_text(encoding="utf-8")))

    def test_current_ledger_is_code_free_reference_metadata(self) -> None:
        validate_promotion_audit(self.audit, self.requirements, self.legacy_count)
        self.assertEqual(self.audit["schema_version"], "2.0")
        self.assertEqual(self.audit["legacy_baseline"]["status"], "current_code_free_registry")
        self.assertEqual(len(self.audit["candidate_records"]), 454)
        for row in self.audit["candidate_records"]:
            self.assertEqual(row["disposition"], "reference_only")
            self.assertFalse(row["auto_selectable"])
            self.assertNotIn("template_sha256", row)
            self.assertNotIn("sha256", row["source"])
            self.assertNotIn("span", row["source"])
            self.assertTrue(row["source"]["source_id"].startswith(("https://", "http://")))

    def test_missing_authoritative_source_fails_closed(self) -> None:
        broken = copy.deepcopy(self.audit)
        broken["candidate_records"][0]["source"]["source_id"] = ""
        with self.assertRaisesRegex(ValueError, "source.source_id"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_selectable_guide_record_fails_closed(self) -> None:
        broken = copy.deepcopy(self.audit)
        broken["candidate_records"][0]["auto_selectable"] = True
        with self.assertRaisesRegex(ValueError, "reference_only"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)


if __name__ == "__main__":
    unittest.main()
