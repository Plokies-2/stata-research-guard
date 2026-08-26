* Top-100 ranks 95-100 maintainer-guide mechanics snapshot; reference-only.
* Source matrix: work/top100_expansion_20260826/guide_sources_95_100/source_matrix_95_100.json.
* Guide atoms expose bounded syntax/state only; they do not choose design, sample, estimand, inference, or output policy.
* Restricted operations and hidden methodological choices are intentionally excluded.

* rank 95 rdrobust_suite.sharp_estimation: bounded maintainer mechanics.
rdrobust y x, c(cutoff)
* rank 95 rdrobust_suite.fuzzy_estimation: bounded maintainer mechanics.
rdrobust y x, c(cutoff) fuzzy(treat)
* rank 95 rdrobust_suite.bandwidth_selection: bounded maintainer mechanics.
rdbwselect y x, c(cutoff) bwselect(method)
* rank 95 rdrobust_suite.covariate_cluster_estimation: bounded maintainer mechanics.
rdrobust y x, c(cutoff) covs(z1 z2) vce(cluster cluster_id)
* rank 95 rdrobust_suite.rd_plot: bounded maintainer mechanics.
rdplot y x, c(cutoff) binselect(method) ci(level)
* rank 95 rdrobust_suite.rd_plot_generated_bins: bounded maintainer mechanics.
rdplot y x, c(cutoff) genvars

* rank 96 synth.baseline_predictor_path: bounded maintainer mechanics.
synth y predictor1 predictor2, trunit(id) trperiod(t0)
* rank 96 synth.outcome_lag_predictors: bounded maintainer mechanics.
synth y y(pre_t1) y(pre_t2), trunit(id) trperiod(t0)
* rank 96 synth.explicit_unit_time_panel: bounded maintainer mechanics.
synth y predictors, trunit(id) trperiod(t0) unitnames(unit_name) keep(file)
* rank 96 synth.placebo_reassignment: bounded maintainer mechanics.
* Removed: a single synth trunit() fit does not implement placebo reassignment.

* rank 97 did2s_drdid.did2s_static: bounded maintainer mechanics.
did2s y, first_stage(i.unit i.time controls) second_stage(treat) treatment(treat) cluster(unit)
* rank 97 did2s_drdid.did2s_event_study: bounded maintainer mechanics.
did2s y, first_stage(i.unit i.time controls) second_stage(event_leads_lags) treatment(treat) cluster(unit)
* rank 97 did2s_drdid.did2s_support_guard: bounded maintainer mechanics.
* Removed: did2s support guard requires a verified guard, not a duplicate estimator call.
* rank 97 did2s_drdid.drdid_panel: bounded maintainer mechanics.
drdid y covariates, ivar(id) time(t) tr(treat)
* rank 97 did2s_drdid.drdid_repeated_cross_section: bounded maintainer mechanics.
drdid y covariates, time(t) tr(treat)
* rank 97 did2s_drdid.drdid_bootstrap_if: bounded maintainer mechanics.
drdid y covariates, ivar(id) time(t) tr(treat) wboot cluster(cluster_id) stub(prefix) replace

* rank 98 honestdid.event_estimate_input: bounded maintainer mechanics.
honestdid, pre(1/k) post(kplus1/m) mvec(grid) omit
* rank 98 honestdid.custom_b_v_input: bounded maintainer mechanics.
honestdid, pre(1/k) post(kplus1/m) b(b) vcov(V) mvec(grid)
* rank 98 honestdid.numpre_input: bounded maintainer mechanics.
honestdid, numpre(k) mvec(grid) omit
* rank 98 honestdid.cached_plot: bounded maintainer mechanics.
honestdid, cached coefplot

* rank 99 rwolf2.single_target_per_model: bounded maintainer mechanics.
rwolf2 (reg y1 treat controls) (reg y2 treat controls), indepvars(treat, treat) reps(B) seed(S)
* rank 99 rwolf2.multiple_targets_per_model: bounded maintainer mechanics.
rwolf2 (reg y1 t1 controls) (reg y2 t2 controls), indepvars(t1 t2, t1) reps(B) seed(S)
* rank 99 rwolf2.clustered_resampling: bounded maintainer mechanics.
rwolf2 (reg y1 treat controls) (reg y2 treat controls), indepvars(treat, treat) cluster(cluster_id) reps(B) seed(S)
* rank 99 rwolf2.stratified_resampling: bounded maintainer mechanics.
rwolf2 (reg y1 treat controls) (reg y2 treat controls), indepvars(treat, treat) strata(strata_id) reps(B) seed(S)

* rank 100 binscatter.default_quantile_bins: bounded maintainer mechanics.
binscatter y x if sample
* rank 100 binscatter.declared_bin_count: bounded maintainer mechanics.
binscatter y x, nquantiles(K)
* rank 100 binscatter.residualized_bins: bounded maintainer mechanics.
binscatter y x, controls(z1 z2)
* rank 100 binscatter.group_series: bounded maintainer mechanics.
binscatter y x, by(group)
* rank 100 binscatter.precomputed_bins: bounded maintainer mechanics.
binscatter y x, genxq(bin_id)
* rank 100 binscatter.discrete_x: bounded maintainer mechanics.
binscatter y x, discrete


* rank 100 binscatter.reuse_precomputed_bins: bounded maintainer mechanics.
binscatter y x, xq(bin_id)
