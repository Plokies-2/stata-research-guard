version 18.0
use "$data/final/analysis_panel.dta", clear

global regression_outcomes outcome_a outcome_b

foreach outcome of global regression_outcomes {
    reghdfe `outcome'                                      ///
        i(2015/2018 2020/2024).year#1.treat2019           ///
        baseline_size baseline_age,                        ///
        absorb(entity_id year)                             ///
        vce(cluster entity_id)

    quietly summarize `outcome' if e(sample), meanonly
    local dep_mean = r(mean)
    if "`outcome'" == "outcome_a" {
        outreg2 using "$table/regressions.xls", excel replace adjr2 ///
            addstat(Dep. variable mean, `dep_mean')
    }
    else {
        outreg2 using "$table/regressions.xls", excel append adjr2 ///
            addstat(Dep. variable mean, `dep_mean')
    }

    estimates store `outcome'
    estimates save "$ster/`outcome'.ster", replace
}
