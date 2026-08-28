from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_labeled_checkpoints import audit_atomic_template_entry, canonical_json_sha256


class AtomicTemplateAuditGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.entry = {
            "label_id": "estimation.audit_fixture.v1",
            "contract_ids": ["regress.robust_vce"],
            "canonical_generation_class": "reference_only",
            "checkpoint": "estimation.conventional",
            "variant_id": "robust_vce",
            "stage": "estimation",
            "source_kind": "official_manual_derived_mechanics",
            "source_urls": ["https://www.stata.com/manuals/rregress.pdf"],
            "research_situations": ["robust covariance is declared"],
            "selection_conditions": ["the model and VCE are supplied"],
            "required_changes": ["replace outcome and regressors"],
            "minimal_edit_fields": ["outcome", "regressors"],
            "tradeoffs": ["does not select the estimand"],
            "state_signature": {"requires": ["fixed sample"], "observable_signals": ["regress"], "produces": ["active e-class estimate"]},
            "template_input_profile": {"data_structure": "cross_section", "record_unit": "one observation", "required_keys": [], "source_basis": "official regress manual", "time_structure": "not_stated", "variable_characteristics": ["numeric outcome"]},
            "source_specific_elements": ["placeholder names"],
            "reusable_core": "robust linear regression",
            "generality_rationale_ko": "VCE 상태를 분리한 메타데이터다.",
            "variant_distinction": "robust covariance rather than conventional covariance",
            "independent_support": False,
            "review_notes": "Audit fixture.",
        }

    def record(self) -> dict:
        return {
            "label_id": self.entry["label_id"], "disposition": "reference_only", "auto_selectable": False,
            "contract_ids": copy.deepcopy(self.entry["contract_ids"]),
            "candidate_inventory_sha256": canonical_json_sha256(self.entry),
            "source": {"source_id": self.entry["source_urls"][0], "role": "official_manual", "kind": self.entry["source_kind"]},
            "source_layers": {"official_manual": {"status": "pass", "source_id": self.entry["source_urls"][0]}},
            "independence": {"independent_support": False, "scope": "manual mechanics only"},
            "input_profile": copy.deepcopy(self.entry["template_input_profile"]),
            "state_signature": copy.deepcopy(self.entry["state_signature"]),
            "variant_distinctness": {"against": [], "reason": self.entry["variant_distinction"]},
            "safety_checks": {"nested_loop": "pass", "tex_output": "pass"},
            "auditor": {"reviewer": "independent-auditor", "status": "pass"},
            "runtime": {"status": "not_run", "reason": "manual metadata only"},
            "selector": {"status": "not_run", "reason": "guide metadata is never selected"},
        }

    def test_reference_only_metadata_is_materialized_without_code(self) -> None:
        result = audit_atomic_template_entry(self.entry, self.record())
        self.assertFalse(result["auto_selectable"])
        self.assertEqual(result["promotion_status"], "reference_only")
        self.assertNotIn("source_spans", result)
        self.assertNotIn("source_path", result)
        self.assertNotIn("source_file_sha256", result)
        self.assertNotIn("code", result)

    def test_source_and_inventory_tampering_fail_closed(self) -> None:
        broken = self.record(); broken["source"]["source_id"] = ""
        with self.assertRaisesRegex(ValueError, "source.source_id"):
            audit_atomic_template_entry(self.entry, broken)
        changed = copy.deepcopy(self.entry); changed["required_changes"].append("replace VCE")
        with self.assertRaisesRegex(ValueError, "candidate_inventory_sha256 mismatch"):
            audit_atomic_template_entry(changed, self.record())


if __name__ == "__main__":
    unittest.main()
