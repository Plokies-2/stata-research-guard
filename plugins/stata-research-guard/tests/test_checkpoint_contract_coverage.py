from __future__ import annotations

import json
import unittest
from pathlib import Path

import sys


PLUGIN = Path(__file__).resolve().parents[1]
CONTRACT_PATH = PLUGIN / "annotations" / "checkpoint_contracts.json"
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_labeled_checkpoints import enforce_reusable_block_safety  # noqa: E402
LEGACY_PREFIX = (
    "project_setup.paths", "workflow_orchestration.master", "input_load.combine", "clean.derive_variables",
    "clean.id_normalize", "treatment.arm_mapping", "outlier.winsorize", "scale.standardize_esample",
    "integrity.audit", "merge_reshape.integration", "sample.trade_share_threshold", "sample.arm_response_eligibility",
    "panel.treatment_cohort", "panel.turnover_event_time", "estimation.conventional", "estimation.staggered_did",
    "descriptives.sample_mean", "robustness.placebo", "robustness.heterogeneity", "robustness.bootstrap_inference",
    "input_load.single_source", "postest.sample_flag", "postest.persist_estimate", "postest.export_sample_keys",
    "postest.estimator_comparison_unsafe", "descriptives.entity_collapse", "figures.event_study", "panel.stack_waves",
    "dataset.finalize_keep_label_save", "feature.aggregate_household", "feature.aggregate_section_exposure",
    "integrity.adjacency_dedup", "figures.descriptive_scatter", "figures.coefplot_named_estimates",
    "figures.export_pdf", "descriptives.sample_flow", "descriptives.summary_dataset",
    "descriptives.estpost_active_result", "exports.descriptive_excel_sheet", "figures.descriptive_bar",
    "panel.materialize_time_grid", "figures.named_graph_combine", "final_excel_assembly",
    "exports.estimate_text_table", "exports.matrix_excel", "postest.margins", "figures.marginsplot", "cleanup",
    "robustness.jackknife", "preparation.transform", "sample.restriction", "descriptives.command_result",
    "postest.command_result", "figures.descriptive_graph", "exports.dataset_file", "tables.collection_result",
)
NEW_CHECKPOINTS = (
    "diagnostics.display", "estimation.difference_in_differences", "estimation.rdrobust_suite",
    "estimation.survey_design", "estimation.synthetic_control", "figures.binned_scatter",
    "integrity.missing_data", "panel.time_operator", "preparation.by_group", "preparation.display_metadata",
    "preparation.storage_metadata", "preparation.temporary_state", "preparation.varlist_resolution",
    "robustness.multiple_testing", "robustness.resampling_simulation", "workflow_orchestration.file_execution",
)


class CheckpointContractCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.raw = CONTRACT_PATH.read_text(encoding="utf-8")
        cls.document = json.loads(cls.raw)
        cls.rows = cls.document["contracts"]
        cls.contracts = {row["checkpoint"]: row for row in cls.rows}

    def test_legacy_prefix_and_new_checkpoint_order_are_frozen(self) -> None:
        checkpoints = tuple(row["checkpoint"] for row in self.rows)
        self.assertEqual(checkpoints[:len(LEGACY_PREFIX)], LEGACY_PREFIX)
        self.assertEqual(checkpoints[len(LEGACY_PREFIX):], NEW_CHECKPOINTS)
        self.assertEqual(len(checkpoints), len(set(checkpoints)))

    def test_new_reference_mechanics_contracts_are_complete_and_conservative(self) -> None:
        self.assertEqual(set(self.document["display_names"]), set(self.contracts))
        for checkpoint in NEW_CHECKPOINTS:
            row = self.contracts[checkpoint]
            name = self.document["display_names"][checkpoint]
            self.assertTrue(name["ko"].strip())
            self.assertTrue(name["en"].strip())
            self.assertTrue(row["unit_kind"].strip())
            self.assertTrue(row["purpose_ko"].strip())
            self.assertTrue(row["aliases"])
            self.assertTrue(row["input_contract"])
            self.assertTrue(row["output_contract"])
            self.assertTrue(row["incompatible_with"])
            self.assertTrue(set(row["can_follow"]) <= set(self.contracts))
            self.assertTrue(set(row["can_precede"]) <= set(self.contracts))

    def test_every_atomic_template_checkpoint_has_a_contract(self) -> None:
        atomic_rows = [
            row
            for path in sorted((PLUGIN / "annotations" / "atomic_template_sets").glob("*.json"))
            for row in json.loads(path.read_text(encoding="utf-8"))
        ]
        checkpoints = {row["checkpoint"] for row in atomic_rows}
        self.assertTrue(atomic_rows)
        self.assertEqual(checkpoints - set(self.contracts), set())
        self.assertTrue(set(NEW_CHECKPOINTS) <= checkpoints)

    def test_contract_source_is_utf8_without_replacement_characters(self) -> None:
        self.assertNotIn("\ufffd", self.raw)

    def test_only_noncompeting_reference_fragments_may_retain_an_open_documented_block(self) -> None:
        with self.assertRaisesRegex(ValueError, "unclosed block"):
            enforce_reusable_block_safety("fixture.auto", "conditional_keep", 0, 1, False)
        enforce_reusable_block_safety(
            "fixture.reference_fragment", "conditional_keep", 0, 1, False, allow_reference_fragment=True
        )
        with self.assertRaisesRegex(ValueError, "loop depth"):
            enforce_reusable_block_safety("fixture.reference_fragment", "conditional_keep", 3, 1, False, allow_reference_fragment=True)


if __name__ == "__main__":
    unittest.main()
