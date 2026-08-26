# Top 100 rank research appendix: groups 51–100

## Decision boundary

This ordered list is an editorial priority for bounded Stata mechanics coverage, not a universal command-frequency or execution-telemetry ranking. It extends the frozen Top 50 without duplicating its groups or the 15 supplemental user-written groups. Official means StataCorp documentation; maintainer means the named package's own documentation or repository. Both are syntax and state-mechanics evidence only, never independent validation or generation authority.

## Primary source key

- **D** — [Stata Data Management Reference Manual](https://www.stata.com/bookstore/data-management-reference-manual/)
- **R** — [Stata Base Reference Manual](https://www.stata.com/bookstore/base-reference-manual/)
- **P** — [Stata User's Guide](https://www.stata.com/manuals/u.pdf)
- **TS** — [Stata Time-Series Reference Manual](https://www.stata.com/bookstore/time-series-reference-manual/)
- **SVY** — [Stata Survey Data Reference Manual](https://www.stata.com/bookstore/survey-data-reference-manual/)
- **ME** — [Stata Multilevel Mixed-Effects Reference Manual](https://www.stata.com/bookstore/multilevel-mixed-effects-reference-manual/)
- **SEM** — [Stata SEM Reference Manual](https://www.stata.com/manuals/sem.pdf)
- **CAUSAL** — [Stata Causal Inference and Treatment-Effects Manual](https://www.stata.com/bookstore/causal-inference-and-treatment-effects-reference-manual/)
- **ST** — [Stata Survival Analysis Reference Manual](https://www.stata.com/bookstore/survival-analysis-reference-manual/)
- **META** — [Stata Meta-Analysis Reference Manual](https://www.stata.com/bookstore/meta-analysis-reference-manual/)
- **BAYES** — [Stata Bayesian Analysis Reference Manual](https://www.stata.com/bookstore/bayesian-analysis-reference-manual/)
- **RD** — [rdrobust maintainer documentation](https://rdpackages.github.io/rdrobust/)
- **SYNTH** — [synth maintainer page](https://web.stanford.edu/~jhain/synthpage.html)
- **DID2S** — [did2s maintainer repository](https://github.com/kylebutts/did2s)
- **DRDID** — [drdid maintainer repository](https://github.com/friosavila/drdid)
- **HONESTDID** — [honestdid maintainer repository](https://github.com/mcaceresb/stata-honestdid)
- **RWOLF2** — [rwolf2 maintainer repository](https://github.com/damiancclarke/rwolf2)
- **BINSCATTER** — [binscatter maintainer repository](https://github.com/michaelstepner/binscatter)

## Ordered coverage groups

| Rank | Group and commands | Authority | Material guide dimensions | Source |
|---:|---|---|---|---|
| 51 | `by_bysort`; `by`, `bysort` | Official | sorted state; `_n`/`_N`; qualifier ordering | P/R |
| 52 | `if_in_qualifiers`; `if`, `in` | Official | predicate versus positional range; missing-aware scope | P/R |
| 53 | `recode`; `recode` | Official | interval mapping; else/missing; `generate()` | D |
| 54 | `missing_mi`; `missing()`, `mi`, `mi_misstable`, `mi_register` | Official | extended missing; MI style; variable registration/stability | D/MI |
| 55 | `clonevar_recast_compress`; `clonevar`, `recast`, `compress` | Official | exact clone; guarded storage conversion; compression | D |
| 56 | `format`; `format` | Official | numeric/date and string display; stored-value boundary | D |
| 57 | `ds_unab`; `ds`, `unab` | Official | include/exclude filters; stored varlist; required-name failure | D/P |
| 58 | `temp_objects`; `tempfile`, `tempvar`, `tempname` | Official | temporary data/variable/name handles and immediate consumer | P |
| 59 | `capture_confirm`; `capture`, `confirm` | Official | optional-resource branch; explicit `_rc`; error-hiding boundary | P/R |
| 60 | `quietly_noisily`; `quietly`, `noisily` | Official | silent result capture; diagnostic replay; command/block scope | P/R |
| 61 | `do_include`; `do`, `include`, `run` | Official | call versus textual include; paths; local-macro boundary | P |
| 62 | `postfile_post`; `postfile`, `post`, `postclose` | Official | typed schema/values; close before consumer | P/R |
| 63 | `contract`; `contract` | Official | frequency data; percent/cumulative; zero/missing policy | D |
| 64 | `cross_joinby`; `cross`, `joinby` | Official | Cartesian versus keyed many-to-many; unmatched and row-count guards | D |
| 65 | `frames`; `frame create`, `frame change`, `frame put`, `frame post` | Official | current/target frame; selected copy; named post target | D |
| 66 | `frlink_frget`; `frlink`, `frget`, `fralias add` | Official | `1:1` versus `m:1`; link state; copied versus alias values | [frlink](https://www.stata.com/manuals/dfrlink.pdf) |
| 67 | `import_other_formats`; `import sas`, `import spss`, `import stata`, `import fred` | Official | format labels/encoding; remote key/configuration; provenance | D |
| 68 | `xpose_stack_separate`; `xpose`, `stack`, `separate` | Official | transpose names; source indicator; group/output naming | D |
| 69 | `tsfill`; `tsfill` | Official | within-panel versus `full`; declared panel/time; gap policy | TS |
| 70 | `time_series_operators`; `L.`, `F.`, `D.`, `S.` | Official | lag/lead/difference; interactions; boundary/gap missingness | TS |
| 71 | `rolling_statsby`; `rolling`, `statsby` | Official | window/step; `e()` versus `r()`; saved result state | R/P |
| 72 | `bootstrap_jackknife`; `bootstrap`, `jackknife` | Official | statistic; cluster/strata; seed/reps and replicate output | [bootstrap](https://www.stata.com/manuals/rbootstrap.pdf) |
| 73 | `simulate_permute`; `simulate`, `permute` | Official | rclass/eclass contract; seed/reps; treatment/strata result data | R/P |
| 74 | `svyset_svy`; `svyset`, `svy:` | Official | PSU/strata/pweight; subpopulation; replicate-weight VCE | SVY |
| 75 | `glm`; `glm` | Official | family/link; exposure/offset; VCE and postestimation scale | R |
| 76 | `ordered_response`; `ologit`, `oprobit` | Official | ordered coding; VCE; probability/margins handoff | R |
| 77 | `multinomial_response`; `mlogit`, `mprobit` | Official | base outcome; result scale; prediction/marginal effects | R |
| 78 | `conditional_binary_panel`; `clogit`, `xtlogit` | Official | matched set versus panel FE/RE; retained variation | R/XT |
| 79 | `censored_interval_truncated`; `tobit`, `intreg`, `truncreg` | Official | censoring bounds; interval endpoints; truncation boundary | R |
| 80 | `sample_selection`; `heckman`, `heckprobit` | Official | outcome/selection equations; two-step versus ML; identification gap | R |
| 81 | `quantile_regression`; `qreg`, `iqreg`, `sqreg` | Official | quantile; VCE/bootstrap; joint output | R |
| 82 | `mixed_effects`; `mixed`, `melogit`, `meglm` | Official | random intercept/slope; nesting; family/link/covariance | ME |
| 83 | `sem_gsem`; `sem`, `gsem` | Official | observed/latent paths; generalized response; identification | SEM |
| 84 | `systems_regression`; `sureg`, `mvreg` | Official | equation system; cross-equation handoff; predictions | R |
| 85 | `gmm`; `gmm` | Official | moments; instruments; step and weight/VCE choice | R |
| 86 | `standard_did`; `didregress`, `xtdidregress` | Official | repeated cross-section versus panel; treatment/group/time; diagnostics | [DID overview](https://www.stata.com/stata17/difference-in-differences-DID-DDD/) |
| 87 | `heterogeneous_did`; `hdidregress`, `xthdidregress`, `estat aggregation`, `estat atetplot` | Official | data form; estimator; cohort/time aggregation and pretrend | [heterogeneous DID](https://www.stata.com/features/overview/heterogeneous-difference-in-differences/) |
| 88 | `teffects`; `teffects ra`, `ipw`, `ipwra`, `aipw`, `nnmatch`, `psmatch` | Official | estimand; treatment/outcome models; overlap/balance state | CAUSAL |
| 89 | `endogenous_treatment`; `eteffects`, `etregress`, `etpoisson` | Official | formulation; treatment equation; ATE/margins | [endogenous treatment](https://www.stata.com/features/overview/endogenous-treatment-effects/) |
| 90 | `survival_setup_split`; `stset`, `stsplit`, `stjoin` | Official | failure/origin/entry/id; time split; reversibility/count | ST |
| 91 | `survival_models`; `stcox`, `streg`, `sts graph`, `sts test` | Official | Cox versus parametric; time variation/PH; plot/test output | ST |
| 92 | `meta`; `meta set`, `meta esize`, `meta summarize`, `meta forestplot` | Official | precomputed versus raw effects; model; labels/plot ownership | META |
| 93 | `multiple_imputation`; `mi impute`, `mi estimate`, `mi passive`, `mi extract` | Official | imputation model; chained/monotone; passive and pooled state | MI |
| 94 | `bayesian`; `bayes:`, `bayesmh`, `bayesstats` | Official | likelihood/prior; chain/seed/diagnostics; posterior output | BAYES |
| 95 | `rdrobust_suite`; `rdrobust`, `rdbwselect`, `rdplot` | Maintainer | sharp/fuzzy; cutoff/bandwidth; covariates/cluster/plot | RD |
| 96 | `synth`; `synth` | Maintainer | treated unit/time; donors/pre-period; optimization/placebo boundary | SYNTH |
| 97 | `did2s_drdid`; `did2s`, `drdid` | Maintainer | first-stage FE; cohort/comparison; aggregation/inference | DID2S/DRDID |
| 98 | `honestdid`; `honestdid`, `honestdid_plot` | Maintainer | coefficient/VCE compatibility; pre-index; sensitivity/plot | HONESTDID |
| 99 | `rwolf2`; `rwolf2` | Maintainer | hypothesis family; reps/seed; adjusted-p mapping | RWOLF2 |
| 100 | `binscatter`; `binscatter` | Maintainer | bin method/count; controls/residualization; group/CI graph | BINSCATTER |

## Nonoverlap and implementation caveats

The groups exclude all frozen Top 50 groups and all 15 supplemental user-written groups, including `ppmlhdfe`, `csdid`, `boottest`, the `gtools` family, `rangestat`, `psmatch2`, `xtabond2`, `asdoc`, `did_imputation`, `eventstudyinteract`, `did_multiplegt_dyn`, `sdid`, `stackedev`, `ritest`, and `event_plot`. A guide atom belongs to one group even when a workflow uses several commands.

Estimator groups 75–100 require declared estimator, sample/support, inference, and postestimation/output-state choices. Command inclusion never authorizes generation. Release-dependent commands retain their source note, while the resolver separately interprets only machine-readable exact/minimum Stata compatibility. Existing paper occurrences stay in the separate research-usage evidence layer and cannot substitute for guide authority.
