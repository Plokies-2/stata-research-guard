* Official Stata mechanics-only candidates; Git staging before independent audit.
* Sources: Stata Base Reference manuals and [R] Estimation/Postestimation syntax.
regress outcome treatment control_1 control_2, vce(robust)
regress outcome treatment control_1 control_2, vce(cluster cluster_id)
regress outcome treatment control_1 control_2 [aw=analysis_weight], vce(robust)
regress outcome c.exposure##i.post control_1 control_2, vce(cluster cluster_id)
areg outcome treatment control_1 control_2, absorb(entity_id) vce(robust)
xtset panel_id time_id
xtreg outcome treatment control_1 control_2, fe vce(cluster cluster_id)
xtreg outcome treatment control_1 control_2, re vce(robust)
xtreg outcome treatment control_1 control_2 [pw=analysis_weight], re vce(cluster cluster_id)
logit outcome treatment control_1 control_2, vce(robust)
logistic outcome treatment control_1 control_2, vce(cluster cluster_id)
probit outcome treatment control_1 control_2 [pw=analysis_weight], vce(robust)
probit outcome treatment control_1 control_2, vce(cluster cluster_id)
poisson count_outcome treatment control_1 control_2, exposure(exposure_time) vce(cluster cluster_id)
poisson count_outcome treatment control_1 control_2, offset(log_exposure) vce(robust)
nbreg count_outcome treatment control_1 control_2, exposure(exposure_time) vce(cluster cluster_id)
nbreg count_outcome treatment control_1 control_2, offset(log_exposure) vce(robust)
ivregress 2sls outcome control_1 control_2 (treatment = instrument_1 instrument_2), vce(robust)
ivregress 2sls outcome control_1 control_2 (treatment = instrument_1), vce(cluster cluster_id) first
predict fitted_linear, xb
predict predicted_probability, pr
predict predicted_count, n
predict residual_linear, residuals
test treatment = 0 control_1 = 0
testparm i.treatment#i.post
lincom treatment + control_1
lincom 2.treatment - 1.treatment
table group_var, statistic(mean outcome) statistic(sd outcome) statistic(count outcome)
table group_var, c(mean outcome sd outcome n outcome)
dtable outcome treatment control_1 control_2, by(group_var) statistics(mean sd n)
dtable outcome treatment control_1 control_2, export("$results/descriptives.xlsx", replace)
collect get _r_b _r_se
collect style cell result[_r_b _r_se], nformat(%9.3f)
collect export "$results/collection.xlsx", replace
etable, estimates(model_1 model_2) export("$results/etable.xlsx", replace)
putexcel set "$results/table.xlsx", sheet("Table 1") modify
putexcel A1=matrix(summary_matrix), names
putexcel B2=(mean_value) C2=(sd_value), nformat(number_d3)
twoway line outcome time_id, sort
twoway (line outcome time_id, sort) (line control_outcome time_id, sort)
twoway (scatter outcome exposure) (lfit outcome exposure)
twoway scatter outcome exposure, mlabel(group_var) msymbol(circle)
twoway rarea upper_ci lower_ci time_id, sort
histogram outcome, fraction discrete
histogram outcome, percent normal
graph export "$results/figure.pdf", as(pdf) replace
margins, dydx(treatment) atmeans
margins group_var, at(treatment=(0 1))
marginsplot, recast(line) recastci(rarea)
