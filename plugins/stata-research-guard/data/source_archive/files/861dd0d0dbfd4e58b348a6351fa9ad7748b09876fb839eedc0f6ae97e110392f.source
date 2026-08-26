* Official StataCorp manual mechanics-only guide atoms for ranks 75-94. Researcher supplies all substantive choices.
glm outcome treatment control_1 control_2, family(family_name) link(link_name)
glm outcome treatment control_1 control_2, family(family_name) link(link_name) exposure(exposure_var)
glm outcome treatment control_1 control_2, family(family_name) link(link_name) offset(offset_var)
glm outcome treatment control_1 control_2, family(family_name) link(link_name) vce(cluster cluster_id)
ologit ordered_outcome treatment control_1 control_2
oprobit ordered_outcome treatment control_1 control_2
ologit ordered_outcome treatment control_1 control_2, vce(cluster cluster_id)
margins, predict(outcome(1))
mlogit nominal_outcome treatment control_1 control_2, baseoutcome(base_category)
mprobit nominal_outcome treatment control_1 control_2
mlogit nominal_outcome treatment control_1 control_2, rrr
margins, predict(outcome(1))
clogit binary_outcome treatment control_1 control_2, group(matched_set)
xtlogit binary_outcome treatment control_1 control_2, fe
xtlogit binary_outcome treatment control_1 control_2, re
xtlogit binary_outcome treatment control_1 control_2, pa
tobit outcome treatment control_1 control_2, ll(lower_limit) ul(upper_limit)
intreg lower_bound upper_bound treatment control_1 control_2
truncreg outcome treatment control_1 control_2, ll(lower_limit) ul(upper_limit)
tobit outcome treatment control_1 control_2, ul(upper_limit)
heckman outcome treatment control_1, select(selected = treatment control_2) twostep
heckman outcome treatment control_1, select(selected = treatment control_2) mle
heckprobit binary_outcome treatment control_1, select(selected = treatment control_2)
predict outcome_prediction, ycond
qreg outcome treatment control_1 control_2, quantile(q)
iqreg outcome treatment control_1 control_2, quantile(q_high) quantile2(q_low)
sqreg outcome treatment control_1 control_2, quantile(q_1 q_2)
sqreg outcome treatment control_1 control_2, quantile(q_1 q_2) reps(100) seed(12345)
mixed outcome treatment control_1 || cluster_id:
mixed outcome treatment control_1 || cluster_id: treatment
mixed outcome treatment control_1 || cluster_id: treatment, covariance(unstructured)
meglm outcome treatment control_1 
sem (outcome <- treatment control_1)
gsem (outcome <- treatment control_1), family(family_name) link(link_name)
sem (outcome <- latent_factor) (latent_factor -> indicator_1 indicator_2)
gsem (outcome <- treatment), group(group_id)
sureg (eq1: outcome = treatment control_1) (eq2: outcome_2 = treatment control_2)
mvreg outcome outcome_2 = treatment control_1 control_2
sureg (eq1: outcome = treatment control_1) (eq2: outcome_2 = control_2 control_3)
test [eq1]treatment = [eq2]treatment
gmm (outcome - {b0} - {b1}*treatment)
gmm (outcome - {b0} - {b1}*treatment), instruments(treatment instrument_1 instrument_2)
gmm (outcome - {b0} - {b1}*treatment), twostep
gmm (outcome - {b0} - {b1}*treatment), vce(cluster cluster_id)
didregress (outcome control_1 control_2) (treatment), group(group_id) time(time_var)
xtdidregress (outcome control_1 control_2) (treatment), group(group_id) time(time_var)
didregress (outcome) (treatment), group(group_id) time(time_var)
estat atetplot
hdidregress (outcome control_1) (treatment), group(group_id) time(time_var)
xthdidregress (outcome control_1) (treatment), group(group_id) time(time_var)
estat aggregation, over(cohort)
estat atetplot
teffects ra (outcome control_1 control_2) (treatment), ate
teffects ipwra (outcome control_1 control_2) (treatment control_1 control_2), ate
teffects nnmatch (outcome) (treatment control_1 control_2), atet
tebalance summarize
eteffects (outcome: outcome treatment control_1) (treatment: treatment instrument_1)
etregress outcome treatment control_1, treat(treatment = instrument_1)
etpoisson count_outcome treatment control_1, treat(treatment = instrument_1)
margins, dydx(treatment)
stset time_to_event, failure(failure)
stset stop_time, failure(failure) enter(start_time) id(subject_id)
stsplit time_band, at(0 1 2 3)
stjoin, id(subject_id)
stcox treatment control_1 control_2
streg treatment control_1 control_2, distribution(distribution_name)
sts graph, by(group_id)
sts test group_id
meta set effect_size effect_se
meta esize, esize(cohensd) studyid(study_id)
meta summarize, random
meta forestplot, studylabel(study_label)
mi impute chained (outcome treatment control_1 = control_2), add(5) rseed(12345)
mi estimate: regress outcome treatment control_1 control_2
mi passive: generate interaction = treatment * control_1
mi extract 1
bayes: regress outcome treatment control_1 control_2
bayesmh (outcome = {b0} + {b1}*treatment), likelihood(normal({var})) prior({b1}, normal(0,1))
bayesmh (outcome = {b0} + {b1}*treatment), likelihood(normal({var})) prior({b1}, normal(0,1)) nchains(2) burnin(1000) mcmcsize(5000) rseed(12345)
bayesstats summary {b1}
predict outcome_prediction, ystar(., upper_limit)
teffects ipw (outcome) (treatment control_1 control_2), ate
teffects aipw (outcome control_1 control_2) (treatment control_1 control_2), ate
teffects psmatch (outcome) (treatment control_1 control_2), atet
margins, dydx(treatment) post
