from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_command_template_coverage import validate_promotion_audit  # noqa: E402


class TemplatePromotionAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = json.loads(
            (PLUGIN / "annotations" / "command_template_requirements.json").read_text(encoding="utf-8")
        )
        cls.audit = json.loads(
            (PLUGIN / "annotations" / "template_promotion_audit.json").read_text(encoding="utf-8")
        )
        cls.legacy_count = len(
            json.loads((PLUGIN / "annotations" / "labeled_checkpoints.json").read_text(encoding="utf-8"))
        ) + len(
            json.loads((PLUGIN / "annotations" / "package_first_atomic_templates.json").read_text(encoding="utf-8"))
        )

    @staticmethod
    def good_record() -> dict:
        return {
            "label_id": "guide.audit.fixture.v1",
            "disposition": "audited_template",
            "contract_ids": ["reghdfe.one_fe_clustered"],
            "template_sha256": "a" * 64,
            "candidate_inventory_sha256": "c" * 64,
            "source_layers": {"maintainer_guide": {"status": "pass", "source_id": "reghdfe.sthlp"}},
            "source": {"path": "annotations/source_snapshots/fixture.do", "sha256": "b" * 64, "span": "4-9", "role": "maintainer_guide", "kind": "guide_derived_mechanics"},
            "independence": {"independent_support": False, "scope": "guide_mechanics_only"},
            "input_profile": {"data_structure": "panel"},
            "state_signature": {"requires": ["panel id"], "produces": ["e(b)"]},
            "variant_distinctness": {"against": [], "reason": "one fixed effect and clustered inference"},
            "safety_checks": {"nested_loop": "pass", "tex_output": "pass"},
            "auditor": {"reviewer": "independent", "status": "pass"},
            "runtime": {"case_id": "runtime.reghdfe.cluster.v1", "status": "pass"},
            "selector": {"positive": {"case_id": "selector.reghdfe.positive.v1", "status": "pass"}, "negative": {"case_id": "selector.reghdfe.negative.v1", "status": "pass"}},
        }

    def test_populated_ledger_keeps_legacy_separate_and_guides_reference_only(self) -> None:
        validate_promotion_audit(self.audit, self.requirements, self.legacy_count)
        self.assertEqual(self.audit["legacy_baseline"]["status"], "legacy_pre_policy")
        self.assertEqual(len(self.audit["candidate_records"]), 262)
        self.assertTrue(all(row["disposition"] == "reference_only" for row in self.audit["candidate_records"]))
        self.assertTrue(all(row.get("auto_selectable") is False for row in self.audit["candidate_records"]))

    def test_audited_template_requires_hash_runtime_and_both_selector_cases(self) -> None:
        complete = copy.deepcopy(self.audit)
        complete["candidate_records"] = [self.good_record()]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)
        for mutator, expected in (
            (lambda row: row.pop("template_sha256"), "template_sha256"),
            (lambda row: row.pop("candidate_inventory_sha256"), "candidate_inventory_sha256"),
            (lambda row: row["source_layers"].pop("maintainer_guide"), "source_layers.maintainer_guide"),
            (lambda row: row["source"].pop("sha256"), "source.sha256"),
            (lambda row: row["runtime"].update(status="not_checked"), "runtime.status"),
            (lambda row: row["selector"].pop("negative"), "selector.negative"),
        ):
            broken = copy.deepcopy(complete)
            mutator(broken["candidate_records"][0])
            with self.subTest(expected=expected), self.assertRaisesRegex(ValueError, expected):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_reference_only_never_counts_as_auto_selectable(self) -> None:
        broken = copy.deepcopy(self.audit)
        record = self.good_record()
        record["disposition"] = "reference_only"
        record["auto_selectable"] = True
        broken["candidate_records"] = [record]
        with self.assertRaisesRegex(ValueError, "reference_only"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_reference_only_still_requires_provenance_profile_safety_and_auditor(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "reference_only",
            "auto_selectable": False,
            "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
            "selector": {"status": "not_run", "reason": "reference-only candidates are not auto-selected"},
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)
        for missing in ("template_sha256", "candidate_inventory_sha256", "source", "input_profile", "safety_checks", "auditor"):
            broken = copy.deepcopy(complete)
            broken["candidate_records"][0].pop(missing)
            with self.subTest(missing=missing), self.assertRaisesRegex(ValueError, missing):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_unmapped_reference_may_use_a_named_supplemental_contract(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "reference_only",
            "contract_ids": [],
            "supplemental_contract_id": "reghdfe.group_level_guide_supplement",
            "auto_selectable": False,
            "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
            "selector": {"status": "not_run", "reason": "unmapped references are never selected"},
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)

    def test_unmapped_rejected_candidate_may_record_a_reason(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "rejected",
            "contract_ids": [],
            "unmapped_reason": "unsafe option bundle has no reusable requirements contract",
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)

    def test_empty_contracts_are_forbidden_for_audited_template(self) -> None:
        broken = copy.deepcopy(self.audit)
        record = self.good_record()
        record["contract_ids"] = []
        record["supplemental_contract_id"] = "reghdfe.not_coverage"
        broken["candidate_records"] = [record]
        with self.assertRaisesRegex(ValueError, "nonempty for audited_template"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_empty_reference_contracts_require_exactly_one_mapping_explanation(self) -> None:
        for metadata in ({}, {"supplemental_contract_id": "x", "unmapped_reason": "y"}):
            broken = copy.deepcopy(self.audit)
            record = self.good_record()
            record.update({
                "disposition": "reference_only",
                "contract_ids": [],
                "auto_selectable": False,
                "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
                "selector": {"status": "not_run", "reason": "unmapped references are never selected"},
                **metadata,
            })
            broken["candidate_records"] = [record]
            with self.subTest(metadata=metadata), self.assertRaisesRegex(ValueError, "exactly one"):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)


if __name__ == "__main__":
    unittest.main()
