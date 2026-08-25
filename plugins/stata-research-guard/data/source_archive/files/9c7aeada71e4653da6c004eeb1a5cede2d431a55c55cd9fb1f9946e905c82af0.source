* Derived canonical package atoms. Each span is one transition; do not splice blocks.
estpost summarize outcome control_1 control_2

estpost summarize outcome control_1 control_2, detail

estpost tabstat outcome control_1 control_2, statistics(count mean sd) columns(statistics)

estpost ttest outcome, by(treatment_group)

eststo model_name

esttab model_1 model_2 using "$results/estimates.csv", replace csv se

append using "$temp/next_source.dta", generate(source_id)

tabulate group, missing

tabulate group treatment, row chi2

misstable summarize outcome treatment control_1 control_2

areg outcome treatment control_1 control_2, absorb(entity_id) vce(cluster cluster_id)

ivregress 2sls outcome control_1 control_2 (treatment = instrument), vce(cluster cluster_id)

ivreg2 outcome control_1 control_2 (treatment = instrument), cluster(cluster_id) first

margins treatment, at(time=(0 1 2 3))

marginsplot, recast(line) recastci(rarea)

boottest treatment, null(0) cluster(cluster_id) reps(9999) seed(12345)

putexcel set "$results/summary.xlsx", sheet("Summary") replace
putexcel A1=matrix(summary_matrix), names

collect export "$results/summary.xlsx", replace
