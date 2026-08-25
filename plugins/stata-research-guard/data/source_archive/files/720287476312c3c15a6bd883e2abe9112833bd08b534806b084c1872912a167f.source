* Guide-derived mechanics snapshot; candidate templates only, not yet audited.
* Sources: Leuven psmatch2.sthlp; Roodman xtabond2 guide/help;
* Sant'Anna csdid guides; Callaway did_imputation guide;
* Sun-Abraham eventstudyinteract help; de Chaisemartin did_multiplegt_dyn;
* Arkhangelsky sdid guide; Heß ritest guide; Roodman boottest guide;
* Stata event_plot help. Identification, estimands, samples, and instruments
* must be supplied by the researcher; no template infers them.

* psmatch2: nearest-neighbor ATT mechanics; matching design is predeclared.
psmatch2 treatment covariate_list, outcome(outcome) neighbor(1)

* psmatch2: kernel ATT mechanics; bandwidth and kernel are predeclared.
psmatch2 treatment covariate_list, outcome(outcome) kernel kerneltype(epan) bw(0.06) ate

* psmatch2 postestimation: balance diagnostics are a separate active state.
pstest covariate_list, both graph

* xtabond2: difference-GMM mechanics with explicit lag and collapsed instruments.
xtabond2 outcome L.outcome endogenous_vars controls, gmm(L.outcome endogenous_vars, lag(2 4) collapse) iv(controls) twostep robust small

* xtabond2: system-GMM mechanics; level equation instrument role is explicit.
xtabond2 outcome L.outcome endogenous_vars controls, gmm(L.outcome endogenous_vars, lag(2 4) collapse) iv(controls, eq(level)) twostep robust small

* csdid 1.82: version-pinned panel estimator; not-yet/never choice is explicit.
version 17
csdid outcome treatment time id, ivar(id) time(time) gvar(first_treat) notyet vce(cluster id)

* csdid 1.82: simple aggregation is a separate postestimation transition.
csdid_estat simple

* csdid 2.0: version-pinned estimator; defaults must not be silently carried across versions.
version 18
csdid outcome treatment time id, ivar(id) time(time) gvar(first_treat) notyet vce(cluster id)

* csdid 2.0: event aggregation with simultaneous bands is explicit.
csdid_estat event, window(-5 5) estore(event_result)

* did_imputation: imputation estimator; horizons, balance, and autosample are declared.
did_imputation outcome id time first_treat, horizons(0/5) pretrend(5) autosample hbalance(1) cluster(id)

* did_imputation postestimation: event-study plot consumer is separate from estimation.
event_plot did_imputation_result, stub_lag(tau#) stub_lead(tau#) together plottype(scatter) ciplottype(rcap)

* eventstudyinteract: reference-only mechanics because producer event dummies are manual.
eventstudyinteract outcome event_leads event_lags controls, absorb(i.id i.time) cohort(first_treat) control_cohort(never_treated) vce(cluster id)

* did_multiplegt_dyn: non-normalized dynamic effects; normalization is a declared choice.
did_multiplegt_dyn outcome id time treatment, effects(0/5) placebo(5) cluster(id) dynamic(5)

* did_multiplegt_dyn: normalized effects are a separate estimator variant.
did_multiplegt_dyn outcome id time treatment, effects(0/5) placebo(5) cluster(id) normalized dynamic(5)

* sdid: synthetic-DID estimator with explicit unit/time identifiers and covariates.
sdid outcome id time treatment, vce(placebo) reps(200) seed(12345) covariates(control_list)

* sdid: inference mechanism is a separate state; bootstrap is not inferred.
sdid outcome id time treatment, vce(bootstrap) reps(200) seed(12345)

* stackedev: reference-only mechanics because the stacked event indicators are manually produced.
stackedev outcome event_leads event_lags controls, cohort(first_treat) time(time) never_treat vce(cluster id)

* ritest: permutation inference with assignment mechanism and seed declared.
ritest treatment _b[treatment], reps(999) seed(12345) cluster(id): regress outcome treatment controls, vce(cluster id)

* ritest: a separate assignment-cluster variant; assignment and VCE clusters differ.
ritest treatment _b[treatment], reps(999) seed(12345) strata(stratum) cluster(assign_cluster): regress outcome treatment controls, vce(cluster inference_cluster)

* boottest: single-coefficient wild bootstrap after an active compatible estimate.
boottest treatment, null(0) cluster(id) reps(999) seed(12345) webb

* boottest: joint Wald-style wild bootstrap for a declared coefficient set.
boottest treatment control_1 control_2, joint null(0) cluster(id) reps(999) seed(12345)

* event_plot: did_imputation active-result consumer, separated from estimator.
event_plot did_imputation_result, stub_lag(tau#) stub_lead(tau#) together

* event_plot: generic stored-estimate consumer is reference-only until producer contract is supplied.
event_plot model_a model_b, stub_lag(coef_#) stub_lead(coef_#) together

* psmatch2: ATE is explicit and is a separate estimand state from ATU.
psmatch2 treatment covariate_list, outcome(outcome) neighbor(1) ate

* psmatch2: ATU is explicit and must not be inferred from ATE.
psmatch2 treatment covariate_list, outcome(outcome) neighbor(1) atu

* psmatch2: use a researcher-supplied propensity score; do not estimate one implicitly.
psmatch2 treatment, pscore(pscore) outcome(outcome) neighbor(1) ate

* psmatch2: common-support and caliper restrictions are explicit mechanics.
psmatch2 treatment covariate_list, outcome(outcome) neighbor(1) ate common caliper(0.05)

* psmatch2: generated matching-state variables are retained as a reference-only handoff.
psmatch2 treatment covariate_list, outcome(outcome) neighbor(1) ate generate(_w _t _s)

* xtabond2: one-step dynamic-panel GMM is a separate estimator variant.
xtabond2 outcome L.outcome endogenous_vars controls, gmm(L.outcome endogenous_vars, lag(2 4) collapse) iv(controls) onestep robust

* xtabond2: explicit collapsed and lag-limited two-step mechanics.
xtabond2 outcome L.outcome endogenous_vars controls, gmm(L.outcome endogenous_vars, lag(2 4) collapse) iv(controls) twostep robust small

* xtabond2: AR and Hansen diagnostics are a returned-results reference handoff.
xtabond2 outcome L.outcome endogenous_vars controls, gmm(L.outcome endogenous_vars, lag(2 4) collapse) iv(controls) twostep robust small
estat abond

* csdid: never-treated comparison is distinct from not-yet-treated comparison.
csdid outcome treatment time id, ivar(id) time(time) gvar(first_treat) never vce(cluster id)

* csdid postestimation: pretrend testing is a separate returned-result state.
csdid_estat pretrend

* boottest: confidence-interval output is a separate postestimation state.
boottest treatment, level(95) cluster(id) reps(999) seed(12345)

* boottest: restricted-versus-unrestricted inference is reference-only until the model producer contract is supplied.
boottest treatment, null(0) cluster(id) reps(999) seed(12345)
