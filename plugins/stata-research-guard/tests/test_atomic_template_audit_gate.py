from __future__ import annotations

import copy
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_labeled_checkpoints import (  # noqa: E402
    audit_atomic_template_entry,
    canonical_json_sha256,
    extract_block,
    read_text,
    sha256_text,
    source_span_spec,
)


class AtomicTemplateAuditGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.snapshot = Path(self.temporary.name) / "fixture.do"
        self.snapshot.write_text("* context\nregress outcome treatment, vce(robust)\n", encoding="utf-8", newline="\n")
        self.source_path = "plugins/stata-research-guard/annotations/source_snapshots/fixture.do"
        self.entry = {
            "label_id": "estimation.audit_fixture.v1",
            "contract_ids": ["regress.robust_vce"],
            "canonical_generation_class": "conditional_candidate",
            "checkpoint": "estimation.conventional",
            "variant_id": "robust_vce",
            "stage": "estimation",
            "source_spans": [[2, 2]],
            "source_kind": "official_manual_derived_mechanics",
            "research_situations": ["robust covariance is declared"],
            "selection_conditions": ["the model and VCE are supplied"],
            "required_changes": ["replace outcome and regressors"],
            "minimal_edit_fields": ["outcome", "regressors"],
            "tradeoffs": ["does not select the estimand"],
            "state_signature": {
                "requires": ["fixed sample"],
                "observable_signals": ["regress", "vce(robust)"],
                "produces": ["active e-class estimate"],
            },
            "template_input_profile": {
                "data_structure": "cross_section",
                "record_unit": "one observation",
                "required_keys": [],
                "source_basis": "official regress manual",
                "time_structure": "not_stated",
                "variable_characteristics": ["numeric outcome"],
            },
            "source_specific_elements": ["placeholder names"],
            "reusable_core": "robust linear regression",
            "generality_rationale_ko": "VCE 상태를 분리한 원자다.",
            "variant_distinction": "robust covariance rather than conventional covariance",
            "independent_support": False,
            "review_notes": "Audit fixture.",
        }

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def record(self, disposition: str = "audited_template") -> dict:
        record = {
            "label_id": self.entry["label_id"],
            "disposition": disposition,
            "contract_ids": copy.deepcopy(self.entry["contract_ids"]),
            "candidate_inventory_sha256": canonical_json_sha256(self.entry),
            "template_sha256": sha256_text(extract_block(read_text(self.snapshot), self.entry["source_spans"])),
            "source": {
                "path": self.source_path,
                "sha256": hashlib.sha256(self.snapshot.read_bytes()).hexdigest(),
                "span": source_span_spec(self.entry["source_spans"]),
                "role": "official_manual",
                "kind": self.entry["source_kind"],
            },
            "source_layers": {"official_manual": {"status": "pass", "source_id": "regress.pdf"}},
            "independence": {"independent_support": False, "scope": "manual mechanics only"},
            "input_profile": copy.deepcopy(self.entry["template_input_profile"]),
            "state_signature": copy.deepcopy(self.entry["state_signature"]),
            "variant_distinctness": {"against": [], "reason": self.entry["variant_distinction"]},
            "safety_checks": {"nested_loop": "pass", "tex_output": "pass"},
            "auditor": {"reviewer": "independent-auditor", "status": "pass"},
            "runtime": {"case_id": "runtime.fixture", "status": "pass"},
            "selector": {
                "positive": {"case_id": "selector.fixture.positive", "status": "pass"},
                "negative": {"case_id": "selector.fixture.negative", "status": "pass"},
            },
        }
        if disposition == "reference_only":
            record.update(
                auto_selectable=False,
                runtime={"status": "not_run", "reason": "manual mechanics only"},
                selector={"status": "not_run", "reason": "reference-only candidates are not selected"},
            )
        return record

    def build(self, entry: dict, record: dict) -> dict | None:
        return audit_atomic_template_entry(
            entry,
            record,
            source_path=self.source_path,
            snapshot_path=self.snapshot,
        )

    def test_positive_exact_audit_promotes_conditional_candidate(self) -> None:
        result = self.build(self.entry, self.record())
        self.assertIsNotNone(result)
        self.assertTrue(result["auto_selectable"])
        self.assertEqual(result["promotion_status"], "audited_template")

    def test_missing_exact_audit_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "label_id mismatch"):
            self.build(self.entry, {})

    def test_source_tamper_fails_closed(self) -> None:
        record = self.record()
        self.snapshot.write_text("* context\nregress outcome treatment\n", encoding="utf-8", newline="\n")
        with self.assertRaisesRegex(ValueError, "source.sha256 mismatch"):
            self.build(self.entry, record)

    def test_canonical_entry_tamper_fails_closed(self) -> None:
        record = self.record()
        changed = copy.deepcopy(self.entry)
        changed["required_changes"].append("replace the VCE")
        with self.assertRaisesRegex(ValueError, "candidate_inventory_sha256 mismatch"):
            self.build(changed, record)

    def test_reference_only_is_downgraded_and_not_auto_selectable(self) -> None:
        result = self.build(self.entry, self.record("reference_only"))
        self.assertIsNotNone(result)
        self.assertEqual(result["canonical_generation_class"], "reference_only")
        self.assertEqual(result["quality_rubric_review"]["classification"], "reference_only")
        self.assertFalse(result["quality_rubric_review"]["preferred_eligible"])
        self.assertFalse(result["auto_selectable"])
        self.assertEqual(result["promotion_status"], "reference_only")

    def test_rejected_candidate_is_verified_then_excluded(self) -> None:
        self.assertIsNone(self.build(self.entry, self.record("rejected")))


if __name__ == "__main__":
    unittest.main()
