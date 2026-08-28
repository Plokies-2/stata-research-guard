version 18.0
use "$data/final/analysis_panel.dta", clear

collapse (mean) mean_outcome_a=outcome_a mean_outcome_b=outcome_b ///
    (sd) sd_outcome_a=outcome_a sd_outcome_b=outcome_b             ///
    (count) n_outcome_a=outcome_a n_outcome_b=outcome_b, by(treat2019)

export excel using "$table/summary_statistics.xlsx", firstrow(variables) replace
graph bar mean_outcome_a mean_outcome_b, over(treat2019)
graph export "$figures/summary_bar.pdf", replace
