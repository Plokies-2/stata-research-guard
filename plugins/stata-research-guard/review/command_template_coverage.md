# Top 100 command-template coverage / Top 100 명령어 템플릿 범위

> 이 표는 명령어의 사용 빈도 순위 자체가 아니라, 현재 플러그인이 보유해야 할 변형 계약의 충족 상태입니다. `legacy_pre_policy` 라벨은 새 사전승격 감사를 통과한 것으로 계산하지 않습니다.

## 현재 판정

- ranked 그룹: 100개 (Top 50 prefix 50개 고정)
- ranked 필수 변형 계약: 395개
- supplemental 그룹/계약: 15개 / 48개
- 전체 계약: 443개
- 상태별 수: {'direct_primitive_policy': 19, 'reference_only': 375, 'uncovered': 1}
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
| 49 | `winsor2` | `winsor2` | `upper_tail_replace`: uncovered; `two_sided_replace`: reference_only; `generate_preserving_original`: reference_only; `by_group`: reference_only; `trim_separate_variant`: reference_only; `arbitrary_declared_cuts`: reference_only |
| 50 | `putexcel_collect_etable` | `putexcel`, `collect_get`, `collect_style`, `collect_export`, `etable` | `putexcel_matrix`: reference_only; `putexcel_scalar_and_format`: reference_only; `collect_get_results`: reference_only; `collect_style_layout`: reference_only; `collect_style_number_format`: reference_only; `collect_export_xlsx`: reference_only; `etable_active_estimate`: reference_only; `etable_stored_estimates`: reference_only |
| 51 | `by_bysort` | `by`, `bysort` | `by_group_sorted_sequence`: reference_only; `bysort_group_count`: reference_only; `by_group_replace_condition`: reference_only |
| 52 | `if_in_qualifiers` | `if`, `in` | `if_qualifier_nonmissing_summary`: reference_only; `in_qualifier_observation_range`: reference_only; `if_qualifier_missing_replace`: reference_only |
| 53 | `recode` | `recode` | `recode_generate_ranges`: reference_only; `recode_generate_binary_test`: reference_only |
| 54 | `missing_mi` | `missing()`, `mi`, `mi_misstable`, `mi_register` | `missing_function_indicator`: reference_only; `mi_set_mlong`: reference_only; `mi_register_and_misstable`: reference_only |
| 55 | `clonevar_recast_compress` | `clonevar`, `recast`, `compress` | `clonevar_preserve_metadata`: reference_only; `recast_declared_storage`: reference_only; `compress_declared_dataset`: reference_only |
| 56 | `format` | `format` | `format_numeric_currency`: reference_only; `format_date_display`: reference_only; `format_string_width`: reference_only |
| 57 | `ds_unab` | `ds`, `unab` | `ds_numeric_wildcard`: reference_only; `ds_not_string_wildcard`: reference_only; `unab_declared_controls`: reference_only |
| 58 | `temp_objects` | `tempfile`, `tempvar`, `tempname` | `tempfile_intermediate`: reference_only; `tempvar_flag`: reference_only; `tempname_matrix`: reference_only |
| 59 | `capture_confirm` | `capture`, `confirm` | `capture_confirm_variable`: reference_only; `capture_confirm_file`: reference_only; `capture_confirm_new_variable`: reference_only |
| 60 | `quietly_noisily` | `quietly`, `noisily` | `quietly_summary_return`: reference_only; `noisily_detail_summary`: reference_only |
| 61 | `do_include` | `do`, `include`, `run` | `do_declared_file`: reference_only; `include_declared_source`: reference_only |
| 62 | `postfile_post` | `postfile`, `post`, `postclose` | `postfile_typed_results`: reference_only; `post_named_result_row`: reference_only; `postclose_consumer`: reference_only |
| 63 | `contract` | `contract` | `contract_frequency`: reference_only; `contract_frequency_percent_cumulative`: reference_only; `contract_zero_nomiss`: reference_only |
| 64 | `cross_joinby` | `cross`, `joinby` | `cross_cartesian_product`: reference_only; `cross_with_declared_row_count_guard`: reference_only; `joinby_declared_key`: reference_only; `joinby_keep_unmatched`: reference_only |
| 65 | `frames` | `frame create`, `frame change`, `frame put`, `frame post` | `frame_create_named`: reference_only; `frame_put_selected`: reference_only; `frame_post_to_target`: reference_only |
| 66 | `frlink_frget` | `frlink`, `frget`, `fralias add` | `frlink_one_to_one`: reference_only; `frlink_many_to_one`: reference_only; `frget_or_fralias_lookup`: reference_only |
| 67 | `import_other_formats` | `import sas`, `import spss`, `import stata`, `import fred` | `import_sas_file`: reference_only; `import_spss_file`: reference_only; `import_fred_series`: reference_only |
| 68 | `xpose_stack_separate` | `xpose`, `stack`, `separate` | `xpose_clear_varname`: reference_only; `stack_into_value`: reference_only; `separate_by_group`: reference_only |
| 69 | `tsfill` | `tsfill` | `tsfill_gap_rows`: reference_only; `tsfill_full_panel`: reference_only |
| 70 | `time_series_operators` | `L.`, `F.`, `D.`, `S.` | `lag_operator_generate`: reference_only; `lead_operator_generate`: reference_only; `difference_operator_generate`: reference_only; `seasonal_difference_generate`: reference_only; `lag_interaction_estimate`: reference_only |
| 71 | `rolling_statsby` | `rolling`, `statsby` | `rolling_summary_window`: reference_only; `rolling_summary_stepped_window`: reference_only; `rolling_saved_estimates`: reference_only; `statsby_saved_results`: reference_only |
| 72 | `bootstrap_jackknife` | `bootstrap`, `jackknife` | `bootstrap_summary_mean`: reference_only; `bootstrap_clustered_regression`: reference_only; `jackknife_clustered_regression`: reference_only |
| 73 | `simulate_permute` | `simulate`, `permute` | `simulate_regression_coefficient`: reference_only; `simulate_summary_mean`: reference_only; `permute_stratified_regression`: reference_only |
| 74 | `svyset_svy` | `svyset`, `svy:` | `svyset_psu_weight_strata`: reference_only; `svy_subpopulation_mean`: reference_only; `svyset_replicate_weights`: reference_only |
| 75 | `glm` | `glm` | `glm_family_link`: reference_only; `glm_exposure`: reference_only; `glm_offset`: reference_only; `glm_vce`: reference_only; `glm_postest`: reference_only |
| 76 | `ordered_response` | `ologit`, `oprobit` | `ordered_ologit`: reference_only; `ordered_oprobit`: reference_only; `ordered_vce`: reference_only; `ordered_postest`: reference_only |
| 77 | `multinomial_response` | `mlogit`, `mprobit` | `multinomial_base`: reference_only; `multinomial_mprobit`: reference_only; `multinomial_rrr`: reference_only; `multinomial_probability`: reference_only |
| 78 | `conditional_binary_panel` | `clogit`, `xtlogit` | `binary_clogit`: reference_only; `binary_xt_fe`: reference_only; `binary_xt_re`: reference_only; `binary_xt_pa`: reference_only |
| 79 | `censored_interval_truncated` | `tobit`, `intreg`, `truncreg` | `censored_tobit`: reference_only; `censored_intreg`: reference_only; `censored_truncreg`: reference_only; `censored_tobit_right`: reference_only; `censored_prediction`: reference_only |
| 80 | `sample_selection` | `heckman`, `heckprobit` | `selection_heckman_twostep`: reference_only; `selection_heckman_mle`: reference_only; `selection_heckprobit`: reference_only; `selection_prediction`: reference_only |
| 81 | `quantile_regression` | `qreg`, `iqreg`, `sqreg` | `quantile_qreg`: reference_only; `quantile_iqreg`: reference_only; `quantile_sqreg`: reference_only; `quantile_bootstrap`: reference_only |
| 82 | `mixed_effects` | `mixed`, `melogit`, `meglm` | `mixed_random_intercept`: reference_only; `mixed_random_slope`: reference_only; `mixed_covariance`: reference_only; `mixed_meglm_family_link`: reference_only |
| 83 | `sem_gsem` | `sem`, `gsem` | `sem_linear_path`: reference_only; `sem_generalized_link`: reference_only; `sem_latent_measurement`: reference_only; `sem_group_level`: reference_only |
| 84 | `systems_regression` | `sureg`, `mvreg` | `systems_sureg`: reference_only; `systems_mvreg`: reference_only; `systems_equation_lists`: reference_only; `systems_cross_equation_test`: reference_only; `systems_equation_prediction`: reference_only |
| 85 | `gmm` | `gmm` | `gmm_moments`: reference_only; `gmm_instruments`: reference_only; `gmm_twostep`: reference_only; `gmm_vce`: reference_only |
| 86 | `standard_did` | `didregress`, `xtdidregress` | `did_repeated_cross_section`: reference_only; `did_panel`: reference_only; `did_ptrends`: reference_only; `did_trendplots`: reference_only |
| 87 | `heterogeneous_did` | `hdidregress`, `xthdidregress`, `estat aggregation`, `estat atetplot` | `hdid_repeated_cross_section`: reference_only; `hdid_panel`: reference_only; `hdid_aggregation`: reference_only; `hdid_atetplot`: reference_only; `hdid_ptrends`: reference_only |
| 88 | `teffects` | `teffects ra`, `teffects ipw`, `teffects ipwra`, `teffects aipw`, `teffects nnmatch`, `teffects psmatch` | `teffects_ra`: reference_only; `teffects_ipwra`: reference_only; `teffects_nnmatch`: reference_only; `teffects_balance`: reference_only; `teffects_ipw`: reference_only; `teffects_aipw`: reference_only; `teffects_psmatch`: reference_only |
| 89 | `endogenous_treatment` | `eteffects`, `etregress`, `etpoisson` | `endogenous_eteffects`: reference_only; `endogenous_etregress`: reference_only; `endogenous_etpoisson`: reference_only; `endogenous_postestimation`: reference_only |
| 90 | `survival_setup_split` | `stset`, `stsplit`, `stjoin` | `survival_stset_basic`: reference_only; `survival_stset_enter_id`: reference_only; `survival_stset_origin_enter_id`: reference_only; `survival_stsplit`: reference_only; `survival_stjoin`: reference_only |
| 91 | `survival_models` | `stcox`, `streg`, `sts graph`, `sts test` | `survival_stcox`: reference_only; `survival_stcox_tvc_texp`: reference_only; `survival_stcox_ph_diagnostic`: reference_only; `survival_streg`: reference_only; `survival_sts_graph`: reference_only; `survival_sts_test`: reference_only |
| 92 | `meta` | `meta set`, `meta esize`, `meta summarize`, `meta forestplot` | `meta_set`: reference_only; `meta_esize`: reference_only; `meta_summarize`: reference_only; `meta_forestplot`: reference_only |
| 93 | `multiple_imputation` | `mi impute`, `mi estimate`, `mi passive`, `mi extract` | `mi_impute_chained_add_rseed`: reference_only; `mi_impute_monotone_add_rseed`: reference_only; `mi_estimate`: reference_only; `mi_passive`: reference_only; `mi_extract`: reference_only |
| 94 | `bayesian` | `bayes:`, `bayesmh`, `bayesstats` | `bayes_wrapper`: reference_only; `bayesmh_model`: reference_only; `bayes_mcmc`: reference_only; `bayesstats_postestimation`: reference_only |
| 95 | `rdrobust_suite` | `rdrobust`, `rdbwselect`, `rdplot` | `sharp_estimation`: reference_only; `fuzzy_estimation`: reference_only; `bandwidth_selection`: reference_only; `covariate_cluster_estimation`: reference_only; `rd_plot`: reference_only; `rd_plot_generated_bins`: reference_only |
| 96 | `synth` | `synth` | `baseline_predictor_path`: reference_only; `outcome_lag_predictors`: reference_only; `explicit_unit_time_panel`: reference_only |
| 97 | `did2s_drdid` | `did2s`, `drdid` | `did2s_static`: reference_only; `did2s_event_study`: reference_only; `drdid_panel`: reference_only; `drdid_repeated_cross_section`: reference_only; `drdid_bootstrap_if`: reference_only |
| 98 | `honestdid` | `honestdid`, `honestdid_plot` | `event_estimate_input`: reference_only; `custom_b_v_input`: reference_only; `numpre_input`: reference_only; `cached_plot`: reference_only |
| 99 | `rwolf2` | `rwolf2` | `single_target_per_model`: reference_only; `multiple_targets_per_model`: reference_only; `clustered_resampling`: reference_only; `stratified_resampling`: reference_only |
| 100 | `binscatter` | `binscatter` | `default_quantile_bins`: reference_only; `declared_bin_count`: reference_only; `residualized_bins`: reference_only; `group_series`: reference_only; `precomputed_bins`: reference_only; `reuse_precomputed_bins`: reference_only; `discrete_x`: reference_only |

## 승격 경계

- guide-derived mechanics는 `reference_only`로 시작합니다. 독립 연구 코드·정확한 source span·runtime·selector 검사가 누적되어야만 `audited_template`가 됩니다.
- Top 50 prefix는 별도 hash로 고정합니다. guide card 수는 명령어별 고정 quota가 아니라 material state 차이로 결정합니다.
