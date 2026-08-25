* Official Stata manual mechanics-only candidates. Researcher supplies estimator, VCE, weights, sample, and estimand choices.
regress outcome treatment control_1 control_2
regress outcome treatment control_1 control_2 [pw=prob_weight], vce(cluster cluster_id)
areg outcome treatment control_1 control_2, absorb(entity_id)
areg outcome treatment control_1 control_2, absorb(entity_id) vce(cluster cluster_id)
areg outcome treatment control_1 control_2 [pw=prob_weight], absorb(entity_id) vce(cluster cluster_id)
xtreg outcome treatment control_1 control_2, fe
logistic binary_outcome treatment control_1 control_2 [pw=prob_weight]
probit binary_outcome treatment control_1 control_2
probit binary_outcome treatment control_1 control_2
margins, dydx(treatment) post
poisson count_outcome treatment control_1 control_2 [pw=prob_weight], vce(cluster cluster_id)
nbreg count_outcome treatment control_1 control_2
ivregress liml outcome control_1 control_2 (treatment = instrument_1 instrument_2)
ivregress gmm outcome control_1 control_2 (treatment = instrument_1 instrument_2)
margins, over(group_var) post
margins r.group_var, contrast predict(pr) post
marginsplot, recast(line) recastci(rarea)
marginsplot, recast(line) recastci(rarea) plot1opts(lcolor(navy)) plot2opts(lcolor(maroon))
marginsplot, yscale(range(0 1)) ylabel(0(.2)1)
predict prediction_se, stdp
predict equation_prediction, xb equation(outcome_eq)
test treatment = 0
test [equation_1]treatment = [equation_2]treatment
lincom treatment, eform
test treatment = 0
local test_p = r(p)
xtreg outcome treatment control_1 control_2 [pw=prob_weight], fe vce(cluster panel_id)
table row_var col_var, statistic(mean outcome) statistic(sd outcome) statistic(count outcome)
