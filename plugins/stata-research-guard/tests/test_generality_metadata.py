from __future__ import annotations

import json
import sys
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_labeled_checkpoints import enforce_reusable_block_safety, expand_compact_package_templates


class GeneralityMetadataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rows = json.loads((ROOT / "annotations/labeled_checkpoints.json").read_text(encoding="utf-8"))
        compact = json.loads((ROOT / "annotations/package_first_atomic_templates.json").read_text(encoding="utf-8"))
        rubric = json.loads((ROOT / "annotations/generality_rubric.json").read_text(encoding="utf-8"))
        cls.rows.extend(expand_compact_package_templates(compact, [rule["id"] for rule in rubric["hard_fail_rules"]]))

    def test_all_labels_have_raw_source_generality_review(self) -> None:
        self.assertEqual(len(self.rows), 148)
        self.assertEqual(Counter(row["reuse_scope"] for row in self.rows), {
            "general": 73,
            "method_specific": 60,
            "project_specific": 5,
            "negative": 10,
        })
        self.assertEqual(Counter(row["quality_rubric_review"]["classification"] for row in self.rows), {
            "preferred_candidate": 20,
            "conditional_candidate": 50,
            "reference_only": 68,
            "exclude": 10,
        })
        self.assertEqual(sum(row["preferred_within_checkpoint"] for row in self.rows), 38)

    def test_master_and_finalizer_selection_calibration(self) -> None:
        rows = {row["label_id"]: row for row in self.rows}
        direct = rows["master.sequence.direct_calls.v1"]
        compact = rows["master.sequence.config_prepare_analysis.v1"]
        self.assertFalse(direct["preferred_within_checkpoint"])
        self.assertEqual(direct["quality_rubric_review"]["classification"], "reference_only")
        self.assertEqual(compact["decision"], "conditional_keep")
        self.assertEqual(compact["quality_rubric_review"]["classification"], "reference_only")
        self.assertIn("exactly three direct stages", compact["selection_conditions"][0])
        for label_id in (
            "dataset.finalize_individual_keep_label_save.v1",
            "dataset.finalize_household_keep_label_save.v1",
        ):
            self.assertEqual(rows[label_id]["adaptation_mode"], "structural_reference")
            self.assertEqual(rows[label_id]["quality_rubric_review"]["classification"], "reference_only")
        for row in self.rows:
            self.assertEqual(row["generality_review"]["status"], "external_evidence_rubric_reviewed")
            self.assertEqual(row["quality_rubric_review"]["status"], "external_evidence_rubric_reviewed")
            self.assertEqual(len(row["quality_rubric_review"]["hard_fails"]), 8)
            self.assertLessEqual(1, row["readability_score"])
            self.assertLessEqual(row["readability_score"], 5)
            self.assertLessEqual(1, row["portability_score"])
            self.assertLessEqual(row["portability_score"], 5)
            self.assertIsInstance(row["source_specific_elements"], list)
            self.assertTrue(row["reusable_core"])
            self.assertTrue(row["generality_rationale_ko"])
            self.assertEqual(row["decision"] == "drop", row["reuse_scope"] == "negative")
            self.assertEqual(row["decision"] == "drop", row["quality_rubric_review"]["classification"] == "exclude")

    def test_only_user_selected_canonical_exceptions_bypass_project_specific_filter(self) -> None:
        exceptions = {row["label_id"] for row in self.rows if row["explicit_canonical_exception"]}
        self.assertEqual(exceptions, {
            "setup.paths.default_style_roles.v1",
            "export.regression_excel.from_ster_default_style.v1",
        })
        final_excel = [row for row in self.rows if row["checkpoint"] == "final_excel_assembly" and row["decision"] != "drop"]
        self.assertEqual([row["label_id"] for row in final_excel], [
            "export.regression_excel.single_outcome_direct.v1",
            "export.regression_excel.coherent_multioutcome_direct.v1",
            "export.regression_excel.from_ster_default_style.v1",
        ])

    def test_overtemplating_audit_keeps_provenance_but_removes_broad_blocks_from_generation(self) -> None:
        calibration_override_ids = {
            row["label_id"]
            for row in self.rows
            if row["quality_rubric_review"].get("classification_calibration_override")
        }
        self.assertEqual(calibration_override_ids, {
            "setup.paths.manual_root_derived_folders.v1",
            "master.sequence.direct_calls.v1",
            "clean.explicit_rename_generate_keep.v1",
            "sample.trade_share_threshold.v1",
            "panel.cohort_anticipation_exit_filter.v1",
            "estimation.ols_visible_specs_eststo.v1",
            "estimation.staggered_jwdid_ppmlhdfe.v1",
            "estimation.twfe_ppmlhdfe.v1",
            "descriptives.depvar_mean_esample.v1",
            "robustness.placebo_renamed_treatment.v1",
            "export.regression_excel.single_outcome_direct.v1",
            "export.regression_excel.coherent_multioutcome_direct.v1",
            "clean.load_numeric_household_id.v1",
            "clean.treatment_full_vs_control.v1",
            "panel.stack_two_survey_waves.v1",
            "feature.voting_section_exposure_totals.v1",
            "figure.municipality_year_scatter_pdf.v1",
            "panel.turnover_event_time.v1",
            "clean.standardize_on_fixed_esample.v1",
            "sample.trade_share_threshold_small.v1",
            "master.sequence.config_prepare_analysis.v1",
            "input.single_source.import_recode_save.v1",
            "merge.integrate_country_year_sources.v1",
            "dataset.finalize_labeled_regression_variants.v1",
            "robustness.heterogeneity_nlcom_grid.v1",
            "sample.arm_response_eligibility.testscore_observed.v1",
            "treatment.teacher_any_arm_mapping.v1",
            "merge.teacher_year_attrition_flow.v1",
            "estimation.cgmreg_multicluster_arm_contrast.v1",
            "postest.capture_cluster_reference_sample.v1",
            "descriptives.depvar_arm_means_esample.v1",
            "robustness.heterogeneity_interactions_tests.v1",
            "integrity.strict_merge_complete_match.v1",
            "integrity.zip_using_rows_matched.v1",
            "integrity.panel_key_before_merge.v1",
            "figure.event_study_did_imputation_event_plot.v1",
            "figure.event_study_did_multiplegt_event_plot.v1",
            "figure.event_study_csdid_event_plot.v1",
            "figure.event_study_sun_abraham_event_plot.v1",
            "figure.event_study_twfe_event_plot.v1",
            "panel.stack_wide_year_suffixes.v1",
            "clean.numeric_student_id_from_csv.v1",
            "outlier.winsorize_two_sided_aggregate_wage.v1",
            "robustness.dynamic_did_preperiod_placebo.v1",
            "postest.iv_first_stage_handoff.v1",
            "figure.scatter_lfit_by_binary_group_pdf.v1",
            "figure.coefplot_named_estimates_labels.v1",
            "dataset.finalize_declared_inventory_order_sort_save.v1",
            "figure.descriptive_grouped_bar.v1",
        })
        reference_only_ids = {
            row["label_id"]
            for row in self.rows
            if row["quality_rubric_review"]["classification"] == "reference_only"
        }
        self.assertEqual(reference_only_ids, {
            "setup.paths.manual_root_derived_folders.v1",
            "master.sequence.direct_calls.v1",
            "input.combine.sequential_import_append.v1",
            "clean.explicit_rename_generate_keep.v1",
            "merge.joinby_unmatched_master.v1",
            "sample.trade_share_threshold.v1",
            "panel.cohort_anticipation_exit_filter.v1",
            "estimation.ols_visible_specs_eststo.v1",
            "estimation.ols_explicit_vce.v1",
            "estimation.staggered_jwdid_ppmlhdfe.v1",
            "estimation.twfe_ppmlhdfe.v1",
            "estimation.twfe_did_both_control_sets.v1",
            "descriptives.depvar_mean_esample.v1",
            "robustness.placebo_renamed_treatment.v1",
            "robustness.heterogeneity_interactions_lincom.v1",
            "export.regression_excel.single_outcome_direct.v1",
            "export.regression_excel.coherent_multioutcome_direct.v1",
            "clean.load_numeric_household_id.v1",
            "clean.treatment_full_vs_control.v1",
            "sample.full_control_nonblank_respondents.v1",
            "clean.household_asset_recode.v1",
            "panel.stack_two_survey_waves.v1",
            "dataset.finalize_individual_keep_label_save.v1",
            "dataset.finalize_household_keep_label_save.v1",
            "feature.voting_section_exposure_totals.v1",
            "figure.municipality_year_scatter_pdf.v1",
            "panel.turnover_event_time.v1",
            "clean.standardize_on_fixed_esample.v1",
            "clean.standardize_fixed_esample_complete_components.v1",
            "sample.trade_share_threshold_small.v1",
            "master.sequence.config_prepare_analysis.v1",
            "input.single_source.import_recode_save.v1",
            "merge.integrate_country_year_sources.v1",
            "clean.derive_panel_lags_interactions.v1",
            "dataset.finalize_labeled_regression_variants.v1",
            "robustness.heterogeneity_nlcom_grid.v1",
            "cleanup.erase_named_spmon_intermediates.v1",
            "sample.arm_response_eligibility.testscore_observed.v1",
            "treatment.teacher_any_arm_mapping.v1",
            "merge.teacher_year_attrition_flow.v1",
            "estimation.cgmreg_multicluster_arm_contrast.v1",
            "postest.capture_cluster_reference_sample.v1",
            "descriptives.depvar_arm_means_esample.v1",
            "robustness.heterogeneity_interactions_tests.v1",
            "integrity.strict_merge_complete_match.v1",
            "integrity.zip_using_rows_matched.v1",
            "integrity.panel_key_before_merge.v1",
            "figure.event_study_did_imputation_event_plot.v1",
            "figure.event_study_did_multiplegt_event_plot.v1",
            "figure.event_study_csdid_event_plot.v1",
            "figure.event_study_sun_abraham_event_plot.v1",
            "figure.event_study_twfe_event_plot.v1",
            "figure.event_study_single_automatic.v1",
            "figure.event_study_flat_loop_automatic.v1",
            "figure.event_study_flat_loop_fixed_group.v1",
            "figure.event_study_flat_loop_mixed_axis.v1",
            "panel.stack_wide_year_suffixes.v1",
            "clean.numeric_student_id_from_csv.v1",
            "outlier.winsorize_two_sided_aggregate_wage.v1",
            "robustness.dynamic_did_preperiod_placebo.v1",
            "postest.iv_first_stage_handoff.v1",
            "postest.reattach_esample_to_loaded_ster.v1",
            "figure.scatter_lfit_by_binary_group_pdf.v1",
            "descriptives.rawsum_reshape_long_structure.v1",
            "estimation.event_rhs_single_hash_base_excluded.v1",
            "figure.coefplot_named_estimates_labels.v1",
            "dataset.finalize_declared_inventory_order_sort_save.v1",
            "figure.descriptive_grouped_bar.v1",
        })
        self.assertTrue(calibration_override_ids <= reference_only_ids)
        self.assertEqual(sum(
            row["quality_rubric_review"]["classification"] in {"preferred_candidate", "conditional_candidate"}
            for row in self.rows
        ), 70)

    def test_research_usage_and_top100_surfaces_match_annotation_classification(self) -> None:
        annotations = {row["label_id"]: row["quality_rubric_review"]["classification"] for row in self.rows}
        usage = [
            json.loads(line)
            for line in (ROOT / "data/research_usage_examples.jsonl").read_text(encoding="utf-8").splitlines()
            if line
        ]
        for row in usage:
            if row["label_id"] in annotations:
                self.assertEqual(row["rubric_classification"], annotations[row["label_id"]], row["label_id"])
        top100 = (ROOT / "review/top100_command_evidence_matrix.md").read_text(encoding="utf-8")
        for label_id in ("estimation.ols_explicit_vce.v1", "estimation.twfe_did_both_control_sets.v1"):
            self.assertIn(f"{label_id} [reference_only]", top100)

    def test_human_review_markdown_exposes_every_label(self) -> None:
        text = (ROOT / "review/generality_selection_review.md").read_text(encoding="utf-8")
        self.assertIn("범용성 선별 중간 검토 / Generalizability selection review", text)
        for row in self.rows:
            self.assertIn(f"`{row['label_id']}`", text)

    def test_loop_abbreviations_are_measured_and_never_reusable_when_nested(self) -> None:
        built = [json.loads(line) for line in (ROOT / "data/labeled_checkpoints.jsonl").read_text(encoding="utf-8").splitlines() if line]
        negative = next(row for row in built if row["label_id"] == "simulation.jackknife_nested_loops.v1")
        self.assertGreaterEqual(negative["max_loop_depth"], 2)
        self.assertTrue(all(row["max_loop_depth"] < 2 for row in built if row["decision"] != "drop"))

    def test_reusable_unclosed_block_fails_before_publication(self) -> None:
        with self.assertRaisesRegex(ValueError, "reusable label has unclosed block: fixture.unclosed.v1"):
            enforce_reusable_block_safety("fixture.unclosed.v1", "conditional_keep", 1, 1, False)
        enforce_reusable_block_safety("fixture.closed.v1", "conditional_keep", 1, 0, False)
        enforce_reusable_block_safety("fixture.negative.v1", "drop", 2, 1, True)

    def test_source_grounded_input_signatures_cover_every_label_without_inference(self) -> None:
        built = [json.loads(line) for line in (ROOT / "data/labeled_checkpoints.jsonl").read_text(encoding="utf-8").splitlines() if line]
        promotion_audit = json.loads((ROOT / "annotations/template_promotion_audit.json").read_text(encoding="utf-8"))
        self.assertEqual(len(built), len(self.rows) + len(promotion_audit["candidate_records"]))
        allowed_structures = {"cross_section", "panel", "repeated_cross_section", "time_series", "other", "unknown"}
        self.assertTrue(all(row["input_signature"]["data_structure"] in allowed_structures for row in built))
        self.assertTrue(all(row["input_signature"]["observation_unit"] for row in built))
        self.assertTrue(all(row["input_signature"]["time_structure"] for row in built))
        self.assertTrue(all(isinstance(row["input_signature"]["required_keys"], list) for row in built))
        self.assertTrue(all(row["input_signature"]["evidence"]["basis"] == "bounded source context around exact labeled source spans" for row in built))
        self.assertTrue(all(set(row["input_signature"]["field_evidence"]) == {"data_structure", "observation_unit", "time_structure", "required_keys", "variable_characteristics"} for row in built))
        for row in built:
            signature = row["input_signature"]
            evidence = signature["field_evidence"]
            if signature["data_structure"] != "unknown":
                self.assertTrue(evidence["data_structure"])
            if signature["observation_unit"] != "not_stated":
                self.assertTrue(evidence["observation_unit"])
            if signature["time_structure"] != "not_stated":
                self.assertTrue(evidence["time_structure"])
            if signature["required_keys"]:
                self.assertTrue(evidence["required_keys"])
            if signature["variable_characteristics"] != ["not_stated"]:
                self.assertTrue(evidence["variable_characteristics"])
        summary = json.loads((ROOT / "data/labeled_checkpoint_summary.json").read_text(encoding="utf-8"))
        self.assertEqual(
            Counter(row["input_signature"]["data_structure"] for row in built),
            summary["input_signature_summary"]["data_structure_counts"],
        )
        cohort = next(row for row in built if row["label_id"] == "panel.cohort_anticipation_exit_filter.v1")
        self.assertEqual(cohort["input_signature"]["data_structure"], "panel")
        self.assertEqual(cohort["input_signature"]["required_keys"], ["id_ci_cj", "year"])
        self.assertEqual(cohort["input_signature"]["field_evidence"]["time_structure"][0]["line_spans"], [[188, 188]])

    def test_event_study_axis_metadata_is_close_related_only(self) -> None:
        labels = [row for row in self.rows if row["checkpoint"] == "figures.event_study" and row["decision"] != "drop"]
        self.assertEqual(len(labels), 9)
        for row in labels:
            metadata = row["event_plot_metadata"]
            self.assertEqual(metadata["sheet_group"], "Declared independently for workbook or display placement; it never determines the y-axis.")
            self.assertEqual(metadata["axis_group"], "Declare only for a direct comparison of closely related outcomes.")
            self.assertEqual(metadata["axis_policy"], "Use fixed range and ticks when that axis_group is declared; otherwise use automatic axes.")
            self.assertEqual(metadata["implementation"], "Apply the declared graph options directly in the figure job; do not encode an axis dispatcher.")

    def test_new_template_profiles_expose_data_primitives_for_matching(self) -> None:
        rows = {row["label_id"]: row for row in self.rows}
        expected = {
            "export.regression_excel.from_ster_default_style.v1",
            "input.delimited_single_source_clear.v1",
            "input.excel_firstrow_clear.v1",
            "reshape.excel_year_stub_long.v1",
            "estimation.event_rhs_single_hash_base_excluded.v1",
            "figure.event_study_flat_loop_automatic.v1",
            "figure.event_study_flat_loop_fixed_group.v1",
            "figure.event_study_flat_loop_mixed_axis.v1",
            "figure.scatter_lfit_by_binary_group.v1",
            "postest.iv_first_stage_handoff.v1",
            "descriptives.named_sample_flow_dataset.v1",
            "postest.append_active_result_to_ster_collection.v1",
            "postest.load_numbered_ster.v1",
            "postest.restore_named_estimate.v1",
            "postest.reattach_esample_to_loaded_ster.v1",
            "reshape.long_stubs_to_wide.v1",
            "reshape.multi_stub_wide_to_long.v1",
            "panel.materialize_declared_time_grid_tsfill.v1",
            "figure.named_graph_combine.v1",
            "descriptives.collapse_preserve_retained_labels.v1",
            "descriptives.grouped_mean_count_tempfile.v1",
            "descriptives.tabstat_count_mean_sd_rows.v1",
            "descriptives.group_percentiles_collapse.v1",
            "descriptives.rawsum_reshape_long_structure.v1",
            "export.descriptive_excel.first_sheet.v1",
            "export.descriptive_excel.additional_sheet.v1",
            "figure.descriptive_grouped_bar.v1",
        }
        self.assertTrue(expected.issubset(rows))
        profiled = [row for row in self.rows if row["decision"] != "drop"]
        self.assertEqual(len(profiled), 138)
        required_profile_fields = {
            "data_structure", "record_unit", "required_keys", "source_basis",
            "time_structure", "variable_characteristics",
        }
        for row in profiled:
            profile = row["template_input_profile"]
            self.assertEqual(set(profile), required_profile_fields, row["label_id"])
            self.assertTrue(profile["data_structure"])
            self.assertTrue(profile["record_unit"])
            self.assertTrue(profile["time_structure"])
            self.assertIsInstance(profile["required_keys"], list)
            self.assertIsInstance(profile["variable_characteristics"], list)


if __name__ == "__main__":
    unittest.main()
