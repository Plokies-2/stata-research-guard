version 18.0
clear all
set more off
set seed 20260824

args fixture_root
capture mkdir "`fixture_root'"
capture mkdir "`fixture_root'/figures"
capture log close _all
log using "`fixture_root'/event_reference_slot_runtime.log", replace text

* The omitted 2019 base is absent from the RHS and from keep(), but has one
* visible display slot. These bindings are deliberately generic event tokens.
local event_terms "2015bn.year#1.treated 2016.year#1.treated 2017.year#1.treated 2018.year#1.treated 2020.year#1.treated 2021.year#1.treated 2022.year#1.treated 2023.year#1.treated"
local event_order "2015bn.year#1.treated 2016.year#1.treated 2017.year#1.treated 2018.year#1.treated . 2020.year#1.treated 2021.year#1.treated 2022.year#1.treated 2023.year#1.treated"
local event_xlabels `"1 "2015" 2 "2016" 3 "2017" 4 "2018" 5 "2019" 6 "2020" 7 "2021" 8 "2022" 9 "2023""'
local reference_position 5
local policy_line = `reference_position' + 0.5

set obs 720
generate int firm_id = ceil(_n / 9)
generate int year = 2015 + mod(_n - 1, 9)
generate byte treated = mod(firm_id, 2)
generate byte restricted = mod(firm_id, 3) != 0
generate double shock = rnormal()
generate double outcome_auto = 0.15 * treated * (year - 2019) + shock
generate double close_outcome_a = 0.08 * treated * (year - 2019) + 0.7 * shock + rnormal()
generate double close_outcome_b = 0.10 * treated * (year - 2019) + 0.7 * shock + rnormal()
local event_rhs 2015bn.year#1.treated 2016bn.year#1.treated ///
    2017bn.year#1.treated 2018bn.year#1.treated ///
    2020bn.year#1.treated 2021bn.year#1.treated ///
    2022bn.year#1.treated 2023bn.year#1.treated

foreach outcome in outcome_auto close_outcome_a close_outcome_b {
    regress `outcome' `event_rhs', vce(cluster firm_id)
    matrix event_b = e(b)
    local event_colnames : colnames event_b
    display as text "EVENT_COLNAMES_ALL `event_colnames'"
    local event_count : word count `event_colnames'
    assert `event_count' == 9
    assert strpos(" `event_colnames' ", " 2015bn.year#1.treated ") > 0
    assert strpos("`event_colnames'", "2016.year#1.treated") > 0
    assert strpos("`event_colnames'", "2017.year#1.treated") > 0
    assert strpos("`event_colnames'", "2018.year#1.treated") > 0
    assert strpos("`event_colnames'", "2020.year#1.treated") > 0
    assert strpos("`event_colnames'", "2021.year#1.treated") > 0
    assert strpos("`event_colnames'", "2022.year#1.treated") > 0
    assert strpos("`event_colnames'", "2023.year#1.treated") > 0
    assert strpos("`event_colnames'", "2019.year#1.treated") == 0
    assert strpos(" `event_colnames' ", " 2015b.year#1.treated ") == 0
    estimates store `outcome'_all

    regress `outcome' `event_rhs' if restricted, vce(cluster firm_id)
    matrix event_b = e(b)
    local event_colnames : colnames event_b
    display as text "EVENT_COLNAMES_RESTRICTED `event_colnames'"
    local event_count : word count `event_colnames'
    assert `event_count' == 9
    assert strpos(" `event_colnames' ", " 2015bn.year#1.treated ") > 0
    assert strpos("`event_colnames'", "2016.year#1.treated") > 0
    assert strpos("`event_colnames'", "2017.year#1.treated") > 0
    assert strpos("`event_colnames'", "2018.year#1.treated") > 0
    assert strpos("`event_colnames'", "2020.year#1.treated") > 0
    assert strpos("`event_colnames'", "2021.year#1.treated") > 0
    assert strpos("`event_colnames'", "2022.year#1.treated") > 0
    assert strpos("`event_colnames'", "2023.year#1.treated") > 0
    assert strpos("`event_colnames'", "2019.year#1.treated") == 0
    assert strpos(" `event_colnames' ", " 2015b.year#1.treated ") == 0
    estimates store `outcome'_restricted
}

display "EVENT_NONREFERENCE_EB_PASSED"

* Automatic y-axis is the default for outcomes outside a close comparison group.
local automatic_outcomes "outcome_auto"
foreach outcome of local automatic_outcomes {
    coefplot ///
        (`outcome'_all, label("All firms")) ///
        (`outcome'_restricted, label("Restricted sample")), ///
        keep(`event_terms') order(`event_order') xlabel(`event_xlabels') ///
        vertical levels(95) ///
        addplot(scatteri 0 `reference_position', msymbol(O) mcolor(black)) ///
        yline(0, lcolor(gs8)) xline(`policy_line', lpattern(dash)) ///
        xtitle("Year") ytitle("Coefficient (95% CI)") ///
        title("`outcome'") ///
        legend(position(6) rows(1)) ///
        graphregion(color(white)) plotregion(color(white)) ///
        saving("`fixture_root'/figures/`outcome'_event.gph", replace)
    graph export "`fixture_root'/figures/`outcome'_event.pdf", replace
}

* A fixed range is only used by an explicitly declared close-outcome group.
local fixed_outcomes "close_outcome_a close_outcome_b"
local axis_min -1.5
local axis_max 1.5
local axis_step 0.5
foreach outcome of local fixed_outcomes {
    coefplot ///
        (`outcome'_all, label("All firms")) ///
        (`outcome'_restricted, label("Restricted sample")), ///
        keep(`event_terms') order(`event_order') xlabel(`event_xlabels') ///
        vertical levels(95) ///
        addplot(scatteri 0 `reference_position', msymbol(O) mcolor(black)) ///
        yline(0, lcolor(gs8)) xline(`policy_line', lpattern(dash)) ///
        yscale(range(`axis_min' `axis_max') noextend) ///
        ylabel(`axis_min'(`axis_step')`axis_max') ///
        xtitle("Year") ytitle("Coefficient (95% CI)") ///
        title("`outcome'") ///
        legend(position(6) rows(1)) ///
        graphregion(color(white)) plotregion(color(white)) ///
        saving("`fixture_root'/figures/`outcome'_event.gph", replace)
    graph export "`fixture_root'/figures/`outcome'_event.pdf", replace
}

foreach outcome in outcome_auto close_outcome_a close_outcome_b {
    confirm file "`fixture_root'/figures/`outcome'_event.pdf"
    confirm file "`fixture_root'/figures/`outcome'_event.gph"
}

display "EVENT_REFERENCE_SLOT_RUNTIME_PASSED"
log close
exit, clear
