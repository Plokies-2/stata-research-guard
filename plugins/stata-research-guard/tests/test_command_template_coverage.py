from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_command_template_coverage import build_coverage, validate_requirements  # noqa: E402


class CommandTemplateCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = json.loads(
            (PLUGIN / "annotations" / "command_template_requirements.json").read_text(encoding="utf-8")
        )
        cls.audit = json.loads(
            (PLUGIN / "annotations" / "template_promotion_audit.json").read_text(encoding="utf-8")
        )

    def test_top50_contract_is_exact_and_variant_complete(self) -> None:
        validate_requirements(self.requirements)
        groups = self.requirements["top50_groups"]
        self.assertEqual(len(groups), 50)
        self.assertEqual([row["rank"] for row in groups], list(range(1, 51)))
        self.assertEqual(sum(len(row["required_variants"]) for row in groups), 203)
        self.assertEqual(
            sum(len(row["required_variants"]) for row in [*groups, *self.requirements["additional_user_written_groups"]]),
            251,
        )
        self.assertIn("reghdfe", {row["group_id"] for row in groups})
        self.assertTrue(next(row for row in groups if row["group_id"] == "outreg2")["user_written_guide_required"])

    def test_coverage_keeps_direct_primitives_distinct_from_reference_guides(self) -> None:
        coverage = build_coverage(self.requirements, self.audit)
        self.assertEqual(coverage["summary"]["top50_groups"], 50)
        self.assertEqual(coverage["summary"]["top50_required_variants"], 203)
        self.assertEqual(coverage["summary"]["all_required_variants_including_additional_user_written"], 251)
        statuses = coverage["summary"]["status_counts"]
        self.assertEqual(statuses["direct_primitive_policy"], 19)
        self.assertEqual(statuses["reference_only"], 184)
        self.assertEqual(statuses.get("uncovered", 0), 0)
        reghdfe = next(row for row in coverage["groups"] if row["group_id"] == "reghdfe")
        self.assertTrue(all(row["status"] == "reference_only" for row in reghdfe["variants"]))
        diagnostics = next(row for row in coverage["groups"] if row["group_id"] == "describe_codebook")
        self.assertTrue(all(row["status"] == "direct_primitive_policy" for row in diagnostics["variants"]))
        assert_isid = next(row for row in coverage["groups"] if row["group_id"] == "assert_isid")
        direct_diagnostic = next(row for row in assert_isid["variants"] if row["variant"] == "direct_diagnostic")
        self.assertEqual(direct_diagnostic["status"], "direct_primitive_policy")

    def test_rank_gap_is_rejected(self) -> None:
        broken = copy.deepcopy(self.requirements)
        broken["top50_groups"][49]["rank"] = 51
        with self.assertRaisesRegex(ValueError, "contiguous"):
            validate_requirements(broken)

    def test_rejected_record_never_counts_as_reference_coverage(self) -> None:
        audit = copy.deepcopy(self.audit)
        audit["candidate_records"] = [{
            "label_id": "rejected.reghdfe.fixture.v1",
            "disposition": "rejected",
            "contract_ids": ["reghdfe.one_fe_clustered"],
        }]
        coverage = build_coverage(self.requirements, audit)
        reghdfe = next(row for row in coverage["groups"] if row["group_id"] == "reghdfe")
        one_fe = next(row for row in reghdfe["variants"] if row["contract_id"] == "reghdfe.one_fe_clustered")
        self.assertEqual(one_fe["status"], "uncovered")

    def test_unmapped_reference_record_does_not_contribute_coverage(self) -> None:
        baseline = build_coverage(self.requirements, self.audit)["summary"]["status_counts"]
        audit = copy.deepcopy(self.audit)
        audit["candidate_records"].append({
            "label_id": "reference.supplemental.fixture.v1",
            "disposition": "reference_only",
            "contract_ids": [],
            "supplemental_contract_id": "reghdfe.guide_only_supplement",
        })
        observed = build_coverage(self.requirements, audit)["summary"]["status_counts"]
        self.assertEqual(observed, baseline)


if __name__ == "__main__":
    unittest.main()
