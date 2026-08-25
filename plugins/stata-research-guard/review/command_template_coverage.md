# Top 50 command-template coverage / Top 50 명령어 템플릿 범위

> 이 표는 명령어의 사용 빈도 순위 자체가 아니라, 현재 플러그인이 보유해야 할 변형 계약의 충족 상태입니다. `legacy_pre_policy` 라벨은 새 사전승격 감사를 통과한 것으로 계산하지 않습니다.

## 현재 판정

- Top 50 그룹: 50개
- 필수 변형 계약: 203개
- 추가 user-written command까지 포함한 전체 계약: 251개
- 상태별 수: {'direct_primitive_policy': 19, 'reference_only': 184}
- `direct_primitive_policy`: 명시적 진단·언어 primitive라 독립 template를 억지로 만들지 않는 계약입니다.
- `audited_template`: 명령어 종류에 맞는 official manual 또는 maintainer guide, candidate inventory와 source/template exact SHA, source span, runtime, selector 양성·음성 검사를 모두 통과한 경우만 해당합니다.
- `reference_only`: 가이드 mechanics 또는 불완전한 근거로 남기며 자동 선택하지 않습니다.
- `uncovered`: 아직 정식 템플릿으로 승격할 수 없습니다.

## 그룹별 계약

| rank | group | commands | required variants: status |
|---:|---|---|---|
| 1 | `use_save` | `use`, `save` | `use_declared_dataset`: reference_only; `save_intermediate_replace`: reference_only; `save_final_inventory_order_sort`: reference_only |
| 2 | `import` | `import_delimited`, `import_excel` | `delimited_header_delimiter_encoding_id_types`: reference_only; `excel_firstrow_sheet`: reference_only; `excel_fixed_cellrange`: reference_only; `multiple_sources_then_append`: reference_only |
| 3 | `export` | `export_excel`, `export_delimited` | `excel_new_workbook_first_sheet`: reference_only; `excel_additional_sheet`: reference_only; `delimited_replace_with_declared_schema`: reference_only |
| 4 | `describe_codebook` | `describe`, `codebook` | `declared_direct_diagnostic`: direct_primitive_policy |
| 5 | `summarize` | `summarize` | `plain_direct`: direct_primitive_policy; `esample_mean_immediate_capture`: reference_only; `detail_percentiles_immediate_capture`: reference_only |
| 6 | `tabulate` | `tabulate` | `plain_direct`: direct_primitive_policy; `two_way_grouped_output`: reference_only; `cell_or_row_column_percent_contract`: reference_only |
| 7 | `table_dtable` | `table`, `dtable` | `modern_table_one_way_statistics`: reference_only; `modern_table_two_way_statistics`: reference_only; `dtable_continuous_categorical`: reference_only; `dtable_grouped_by`: reference_only |
| 8 | `generate` | `generate` | `declared_formula`: reference_only; `missing_preserving_indicator`: reference_only; `missing_preserving_interaction`: reference_only |
| 9 | `replace` | `replace` | `declared_value_map`: reference_only; `declared_missing_map`: reference_only; `conditional_update_preserving_other_values`: reference_only |
| 10 | `egen` | `egen` | `rowmax`: reference_only; `rowtotal_missing_rule`: reference_only; `group_total`: reference_only; `group_mean`: reference_only; `group_id`: reference_only; `group_tag`: reference_only |
| 11 | `keep_drop` | `keep`, `drop` | `final_variable_inventory_direct`: direct_primitive_policy; `declared_eligibility_restriction`: reference_only; `declared_time_window`: reference_only; `declared_required_missing_exclusion`: reference_only |
| 12 | `sort_gsort` | `sort`, `gsort` | `plain_sort_direct`: direct_primitive_policy; `final_sort_before_save`: reference_only; `descending_within_group_rank_with_tie_rule`: reference_only |
| 13 | `merge` | `merge` | `one_to_one_complete_match`: reference_only; `many_to_one_complete_match`: reference_only; `one_to_one_master_retained`: reference_only; `many_to_one_master_retained`: reference_only; `using_retained_with_declared_reason`: reference_only |
| 14 | `append` | `append` | `option_free_schema_identical_direct`: direct_primitive_policy; `multiple_sources_with_provenance_id`: reference_only; `schema_harmonization_before_append`: reference_only |
| 15 | `reshape` | `reshape` | `wide_to_long_declared_i_j`: reference_only; `long_to_wide_declared_i_j`: reference_only |
| 16 | `collapse` | `collapse` | `mean_count`: reference_only; `weighted_aggregation`: reference_only; `percentile_aggregation`: reference_only; `label_roundtrip`: reference_only; `frequency_contract`: reference_only |
| 17 | `rename_order` | `rename`, `order` | `declared_rename_map`: direct_primitive_policy; `declared_final_order`: direct_primitive_policy |
| 18 | `label` | `label` | `variable_label_near_creation`: reference_only; `value_label_define_attach`: reference_only; `value_label_extend_modify`: reference_only |
| 19 | `type_conversion` | `destring`, `tostring`, `encode`, `decode` | `destring_generate_validated`: reference_only; `destring_decimal_comma_reference`: reference_only; `tostring_generate_format_preserved`: reference_only; `encode_declared_categories_direct`: direct_primitive_policy; `decode_to_new_string`: reference_only |
| 20 | `duplicates` | `duplicates` | `report_list_tag_direct`: direct_primitive_policy; `drop_force_forbidden`: direct_primitive_policy |
| 21 | `count_list` | `count`, `list` | `declared_direct_diagnostic`: direct_primitive_policy |
| 22 | `assert_isid` | `assert`, `isid` | `direct_diagnostic`: direct_primitive_policy; `transition_bound_integrity_guard`: reference_only |
| 23 | `preserve_restore` | `preserve`, `restore` | `paired_state_guard_embedded_in_consumer`: direct_primitive_policy |
| 24 | `local_global` | `local`, `global` | `language_primitive_policy`: direct_primitive_policy |
| 25 | `foreach` | `foreach` | `flat_loop_depth_one_policy`: direct_primitive_policy |
| 26 | `forvalues` | `forvalues` | `flat_loop_depth_one_policy`: direct_primitive_policy |
| 27 | `levelsof` | `levelsof` | `immediate_local_consumer_policy`: direct_primitive_policy |
| 28 | `regress` | `regress` | `classical`: reference_only; `robust`: reference_only; `clustered`: reference_only; `aweight`: reference_only; `pweight_clustered`: reference_only |
| 29 | `areg` | `areg` | `absorb_unclustered`: reference_only; `absorb_robust`: reference_only; `absorb_clustered`: reference_only; `absorb_weighted_clustered`: reference_only |
| 30 | `xtset_tsset` | `xtset`, `tsset` | `panel_id_time`: reference_only; `single_time_series`: reference_only; `declared_delta_or_frequency`: reference_only |
| 31 | `xtreg` | `xtreg` | `fixed_effects`: reference_only; `fixed_effects_clustered`: reference_only; `fixed_effects_weighted_clustered`: reference_only; `random_effects`: reference_only |
| 32 | `reghdfe` | `reghdfe` | `one_fe_clustered`: reference_only; `multiple_fe_clustered`: reference_only; `robust`: reference_only; `weighted_clustered`: reference_only; `heterogeneous_slopes`: reference_only; `multiway_clustered`: reference_only; `group_level_individual_fe`: reference_only; `residuals_enabled`: reference_only |
| 33 | `logit_logistic` | `logit`, `logistic` | `coefficient_scale`: reference_only; `odds_ratio_scale`: reference_only; `robust`: reference_only; `clustered`: reference_only; `weighted`: reference_only |
| 34 | `probit` | `probit` | `default`: reference_only; `robust_or_clustered`: reference_only; `weighted`: reference_only; `marginal_effect_handoff`: reference_only |
| 35 | `poisson_nbreg` | `poisson`, `nbreg` | `poisson_default_or_clustered`: reference_only; `poisson_exposure_or_offset`: reference_only; `poisson_weighted`: reference_only; `nbreg_mean_dispersion`: reference_only; `nbreg_exposure_or_offset`: reference_only; `nbreg_constant_dispersion_reference`: reference_only |
| 36 | `ivregress` | `ivregress` | `two_stage_least_squares_clustered`: reference_only; `multiple_endogenous_or_instruments`: reference_only; `robust_or_hac`: reference_only; `first_stage_diagnostics`: reference_only; `liml_or_gmm_reference`: reference_only |
| 37 | `ivreg2` | `ivreg2` | `clustered_first`: reference_only; `robust`: reference_only; `hac`: reference_only; `weak_iv_diagnostics`: reference_only; `saved_first_stage_handoff`: reference_only; `liml_or_gmm_reference`: reference_only |
| 38 | `ivreghdfe` | `ivreghdfe` | `one_endogenous_one_iv_fe_cluster`: reference_only; `multiple_endogenous_instruments`: reference_only; `weighted_clustered`: reference_only; `multiple_fe_or_multiway_cluster`: reference_only; `first_stage_diagnostics`: reference_only; `liml_or_gmm_reference`: reference_only; `prediction_or_residual_handoff`: reference_only |
| 39 | `margins_marginsplot` | `margins`, `marginsplot` | `at_values`: reference_only; `dydx_at`: reference_only; `over_post`: reference_only; `contrast_predict_post`: reference_only; `marginsplot_single_profile_ci`: reference_only; `marginsplot_multi_series`: reference_only; `marginsplot_declared_fixed_axis`: reference_only |
| 40 | `predict` | `predict` | `linear_prediction_xb_esample`: reference_only; `residuals_esample`: reference_only; `probability_esample`: reference_only; `count_mean_esample`: reference_only; `standard_error`: reference_only; `equation_specific_reference`: reference_only |
| 41 | `test_testparm_lincom` | `test`, `testparm`, `lincom` | `single_linear_hypothesis`: reference_only; `joint_coefficients`: reference_only; `factor_interaction_joint_zero`: reference_only; `cross_equation`: reference_only; `lincom_sum_difference`: reference_only; `lincom_eform`: reference_only; `immediate_rclass_capture`: reference_only |
| 42 | `estimates_lifecycle` | `estimates` | `store_restore`: reference_only; `ster_seed_append`: reference_only; `use_numbered_store`: reference_only; `reattach_active_estimate`: reference_only |
| 43 | `correlate_pwcorr_tabstat` | `correlate`, `pwcorr`, `tabstat` | `correlate_direct`: direct_primitive_policy; `pwcorr_observations_significance`: reference_only; `tabstat_by_statistics`: reference_only; `tabstat_weighted`: reference_only |
| 44 | `twoway` | `twoway`, `scatter`, `line`, `histogram` | `scatter`: reference_only; `line_single_series`: reference_only; `scatter_with_lfit`: reference_only; `multiple_series`: reference_only; `confidence_band_with_line`: reference_only; `by_panel`: reference_only; `histogram_continuous`: reference_only; `histogram_discrete`: reference_only |
| 45 | `graph_export` | `graph_export`, `graph_combine` | `active_graph_to_pdf`: reference_only; `combined_graph_to_pdf`: reference_only; `loop_immediate_pdf_export`: reference_only |
| 46 | `estout_family` | `estpost`, `eststo`, `esttab`, `estout` | `estpost_summarize`: reference_only; `estpost_detail`: reference_only; `estpost_tabstat`: reference_only; `estpost_ttest`: reference_only; `eststo_named_active_result`: reference_only; `esttab_csv_or_excel`: reference_only; `estout_non_tex`: reference_only |
| 47 | `outreg2` | `outreg2` | `single_sheet_seed_replace`: reference_only; `single_sheet_append`: reference_only; `coherent_multioutcome`: reference_only; `multi_sheet_xlsx_formatter`: reference_only; `iv_first_stage_raw`: reference_only |
| 48 | `coefplot` | `coefplot` | `active_estimate_selected_coefficients`: reference_only; `multiple_named_estimates`: reference_only; `event_single_auto_axis`: reference_only; `event_multiple_auto_axis`: reference_only; `event_fixed_axis`: reference_only; `mixed_family_comparison`: reference_only |
| 49 | `winsor2` | `winsor2` | `upper_tail_replace`: reference_only; `two_sided_replace`: reference_only; `generate_preserving_original`: reference_only; `by_group`: reference_only; `trim_separate_variant`: reference_only; `arbitrary_declared_cuts`: reference_only |
| 50 | `putexcel_collect_etable` | `putexcel`, `collect_get`, `collect_style`, `collect_export`, `etable` | `putexcel_matrix`: reference_only; `putexcel_scalar_and_format`: reference_only; `collect_get_results`: reference_only; `collect_style_layout`: reference_only; `collect_style_number_format`: reference_only; `collect_export_xlsx`: reference_only; `etable_active_estimate`: reference_only; `etable_stored_estimates`: reference_only |

## 승격 경계

- guide-derived mechanics는 `reference_only`로 시작합니다. 독립 연구 코드·정확한 source span·runtime·selector 검사가 누적되어야만 `audited_template`가 됩니다.
- 기존 148개 라벨은 provenance를 유지하되 이 새 gate의 통과 주장에는 쓰지 않습니다.
