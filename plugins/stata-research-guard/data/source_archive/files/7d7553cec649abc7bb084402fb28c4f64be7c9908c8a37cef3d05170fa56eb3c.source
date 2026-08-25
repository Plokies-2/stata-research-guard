* Candidate source snapshot: community maintainer-guide mechanics only.
* This file is a pre-audit candidate; it is not an executed replication script.
* Sources: reghdfe help (sergiocorreia/reghdfe/current-code/reghdfe.sthlp),
* ivreg2 help (sergiocorreia/ivreghdfe and mark schaffer/ivreg2),
* ivreghdfe help (sergiocorreia/ivreghdfe), ppmlhdfe help (sergiocorreia/ppmlhdfe),
* gtools/ftools help (mcaceresb/stata-gtools and ftools).
* Placeholders are intentional. Research design, identification, and estimator
* selection must be supplied by the researcher and are never inferred here.

* reghdfe: one absorbed effect with one-way clustered inference.
reghdfe outcome treatment controls, absorb(firm_id) vce(cluster firm_id)
* reghdfe: two-way clustering; firm year differs from firm#year.
reghdfe outcome treatment controls, absorb(firm_id year) vce(cluster firm_id year)
* reghdfe: heterogeneous slope is explicit and requires a declared slope variable.
reghdfe outcome treatment controls, absorb(firm_id c.firm_age#c.exposure) vce(cluster firm_id)
* reghdfe: group-level outcome with declared individual and group effects.
reghdfe outcome treatment controls, absorb(individual_id group_id) vce(cluster group_id)
* reghdfe: postestimation residual/prediction is a separate state transition.
reghdfe outcome treatment controls, absorb(firm_id year) vce(cluster firm_id)
predict double residual_hat, residuals

* ivreg2: one endogenous regressor, excluded instrument, clustered first stage.
ivreg2 outcome controls (endog = instrument), cluster(firm_id) first
* ivreg2: explicit first-stage diagnostics requested by the analysis contract.
ivreg2 outcome controls (endog = instrument), cluster(firm_id) ffirst
* ivreg2: retain named first-stage estimates for a declared downstream consumer.
ivreg2 outcome controls (endog = instrument), cluster(firm_id) first savefirst savefprefix(fs_)
* ivreg2: two-step GMM with declared HAC bandwidth and kernel.
ivreg2 outcome controls (endog = instrument), gmm2s bw(3) kernel(bartlett)
* ivreg2: LIML with a declared Fuller adjustment; method choice is conditional.
ivreg2 outcome controls (endog = instrument), liml fuller(1)

* ivreghdfe: HDFE IV with declared absorbed effects and clustered inference.
ivreghdfe outcome controls (endog = instrument), absorb(firm_id year) cluster(firm_id)
* ivreghdfe: first-stage diagnostics and named first-stage handoff.
ivreghdfe outcome controls (endog = instrument), absorb(firm_id) cluster(firm_id) ffirst savefirst savefprefix(fs_)
* ivreghdfe: LIML HDFE IV variant with a declared Fuller adjustment.
ivreghdfe outcome controls (endog = instrument), absorb(firm_id year) cluster(firm_id) liml fuller(1)
* ivreghdfe: postestimation fitted value/residual state is separate from estimation.
ivreghdfe outcome controls (endog = instrument), absorb(firm_id year) cluster(firm_id)
predict double iv_residual, residuals

* ppmlhdfe: nonnegative outcome, absorbed effects, and clustered inference.
ppmlhdfe count_outcome treatment controls, absorb(firm_id year) vce(cluster firm_id)
* ppmlhdfe: exposure must be positive and its interpretation is declared upstream.
ppmlhdfe count_outcome treatment controls, absorb(firm_id) vce(cluster firm_id) exposure(exposure_time)
* ppmlhdfe: offset is supplied on the log scale and is distinct from exposure().
ppmlhdfe count_outcome treatment controls, absorb(firm_id) vce(cluster firm_id) offset(log_exposure)
* ppmlhdfe: prediction consumes the immediately preceding ppmlhdfe result.
ppmlhdfe count_outcome treatment controls, absorb(firm_id year) vce(cluster firm_id)
predict double structural_fe, d

* fcollapse: reduce the active data to declared group-level statistics.
fcollapse (mean) outcome (sum) sales, by(firm_id year)
* fcollapse: compute group statistics and merge them back to the original rows.
fcollapse (mean) outcome (sum) sales, by(firm_id year) merge

* fmerge: one-to-one key merge; key uniqueness must be checked before this call.
fmerge 1:1 firm_id year using "firm_year_controls.dta"
* fmerge: many-to-one key merge; the using-side key must be unique.
fmerge m:1 firm_id using "firm_controls.dta"

* reghdfe: robust HDFE inference without a cluster dimension.
reghdfe outcome treatment controls, absorb(firm_id) vce(robust)
* reghdfe: declared probability/frequency weight with clustered inference.
reghdfe outcome treatment controls [pw=sample_weight], absorb(firm_id) vce(cluster firm_id)

* ivreg2: robust 2SLS without a cluster dimension.
ivreg2 outcome controls (endog = instrument), robust
* ivreghdfe: multiple endogenous regressors and excluded instruments.
ivreghdfe outcome controls (endog_a endog_b = instrument_a instrument_b), absorb(firm_id) cluster(firm_id)
* ivreghdfe: declared weight with clustered inference.
ivreghdfe outcome controls (endog = instrument) [pw=sample_weight], absorb(firm_id) cluster(firm_id)
* ivreghdfe: multiple absorbed effects and separately declared multi-way clusters.
ivreghdfe outcome controls (endog = instrument), absorb(firm_id year) cluster(firm_id year)

* ppmlhdfe: declared weight with absorbed effects and clustered inference.
ppmlhdfe count_outcome treatment controls [pw=sample_weight], absorb(firm_id year) vce(cluster firm_id)
* ppmlhdfe: separately declared multi-way clustering.
ppmlhdfe count_outcome treatment controls, absorb(firm_id year) vce(cluster firm_id year)

* reghdfe: multiple absorbed FE dimensions with one-way clustered inference.
reghdfe outcome treatment controls, absorb(unit_fe time_fe) vce(cluster unit_fe)
