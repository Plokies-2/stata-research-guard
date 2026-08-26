from __future__ import annotations

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_command_template_coverage import (  # noqa: E402
    build_coverage,
    validate_ranked_atomic_contract_coverage,
    validate_requirements,
)


class CommandTemplateCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = json.loads(
            (PLUGIN / "annotations" / "command_template_requirements.json").read_text(encoding="utf-8")
        )
        cls.audit = json.loads(
            (PLUGIN / "annotations" / "template_promotion_audit.json").read_text(encoding="utf-8")
        )
        cls.top100_atomic_records = [
            record
            for path in sorted((PLUGIN / "annotations" / "atomic_template_sets").glob("top100_*.json"))
            for record in json.loads(path.read_text(encoding="utf-8"))
        ]

    def test_top100_contract_freezes_the_top50_prefix_and_uses_complexity_weighting(self) -> None:
        validate_requirements(self.requirements)
        groups = self.requirements["ranked_groups"]
        self.assertEqual(len(groups), 100)
        self.assertEqual([row["rank"] for row in groups], list(range(1, 101)))
        self.assertEqual(sum(len(row["required_variants"]) for row in groups), 381)
        self.assertEqual(
            sum(len(row["required_variants"]) for row in [*groups, *self.requirements["supplemental_groups"]]),
            429,
        )
        self.assertEqual(sum(len(row["required_variants"]) for row in groups[:50]), 203)
        self.assertTrue(self.requirements["ranking_contract"]["top50_prefix_frozen"])
        self.assertTrue(self.requirements["complexity_weighted_sufficiency"]["fixed_per_command_quota_forbidden"])
        self.assertEqual(next(row for row in groups if row["group_id"] == "format")["required_variants"], ["format_numeric_currency"])
        self.assertGreater(len(next(row for row in groups if row["group_id"] == "teffects")["required_variants"]), 1)
        self.assertIn("reghdfe", {row["group_id"] for row in groups[:50]})
        self.assertTrue(next(row for row in groups if row["group_id"] == "outreg2")["user_written_guide_required"])

    def test_public_rank_research_appendix_is_release_owned_and_hash_locked(self) -> None:
        contract = self.requirements["ranking_contract"]
        relative = Path(contract["rank_research_path"])
        self.assertEqual(relative.parts[:2], ("plugins", "stata-research-guard"))
        source = PLUGIN.parents[1] / relative
        self.assertTrue(source.is_file())
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), contract["rank_research_sha256"])

    def test_new_ranked_contracts_and_pre_audit_guide_atoms_are_exactly_bijective(self) -> None:
        validate_ranked_atomic_contract_coverage(self.requirements, self.top100_atomic_records)
        self.assertEqual(len(self.top100_atomic_records), 178)

    def test_coverage_keeps_direct_primitives_distinct_from_reference_guides(self) -> None:
        coverage = build_coverage(self.requirements, self.audit)
        self.assertEqual(coverage["summary"]["ranked_groups"], 100)
        self.assertEqual(coverage["summary"]["ranked_required_variants"], 381)
        self.assertEqual(coverage["summary"]["all_required_variants"], 429)
        statuses = coverage["summary"]["status_counts"]
        top50_statuses = coverage["summary"]["top50_prefix_status_counts"]
        self.assertEqual(top50_statuses["direct_primitive_policy"], 19)
        self.assertEqual(top50_statuses["reference_only"], 184)
        reghdfe = next(row for row in coverage["groups"] if row["group_id"] == "reghdfe")
        self.assertTrue(all(row["status"] == "reference_only" for row in reghdfe["variants"]))
        diagnostics = next(row for row in coverage["groups"] if row["group_id"] == "describe_codebook")
        self.assertTrue(all(row["status"] == "direct_primitive_policy" for row in diagnostics["variants"]))
        assert_isid = next(row for row in coverage["groups"] if row["group_id"] == "assert_isid")
        direct_diagnostic = next(row for row in assert_isid["variants"] if row["variant"] == "direct_diagnostic")
        self.assertEqual(direct_diagnostic["status"], "direct_primitive_policy")

    def test_rank_gap_is_rejected(self) -> None:
        broken = copy.deepcopy(self.requirements)
        broken["ranked_groups"][99]["rank"] = 101
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
