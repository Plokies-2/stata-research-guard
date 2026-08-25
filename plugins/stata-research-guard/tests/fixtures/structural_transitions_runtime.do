version 18.0
clear all
set more off

args fixture_root
capture mkdir "`fixture_root'"
capture mkdir "`fixture_root'/figures"
capture log close _all
log using "`fixture_root'/structural_transitions_runtime.log", replace text

* SECTION: reshape.long_stubs_to_wide.v1
clear
input byte firm_id int year double sales
1 2020 10
1 2021 12
2 2020 20
2 2021 24
end
isid firm_id year
reshape wide sales, i(firm_id) j(year)
isid firm_id
assert _N == 2
assert sales2020 == 10 if firm_id == 1
assert sales2021 == 12 if firm_id == 1
assert sales2020 == 20 if firm_id == 2
assert sales2021 == 24 if firm_id == 2
display "RESHAPE_LONG_TO_WIDE_RUNTIME_PASSED"

* SECTION: reshape.multi_stub_wide_to_long.v1
clear
input byte firm_id double revenue_2020 revenue_2021 cost_2020 cost_2021
1 100 110 60 65
2 200 220 120 130
end
isid firm_id
reshape long revenue_ cost_, i(firm_id) j(year)
isid firm_id year
assert _N == 4
assert revenue_ == 100 & cost_ == 60 if firm_id == 1 & year == 2020
assert revenue_ == 110 & cost_ == 65 if firm_id == 1 & year == 2021
assert revenue_ == 200 & cost_ == 120 if firm_id == 2 & year == 2020
assert revenue_ == 220 & cost_ == 130 if firm_id == 2 & year == 2021
display "RESHAPE_MULTI_STUB_WIDE_TO_LONG_RUNTIME_PASSED"

* SECTION: panel.materialize_declared_time_grid_tsfill.v1
clear
input byte firm_id int year double outcome
1 2000 10
1 2002 12
2 2001 21
2 2003 23
end
isid firm_id year
xtset firm_id year
tsfill
isid firm_id year
assert _N == 6
assert missing(outcome) if firm_id == 1 & year == 2001
assert missing(outcome) if firm_id == 2 & year == 2002
assert firm_id != 1 | inrange(year, 2000, 2002)
assert firm_id != 2 | inrange(year, 2001, 2003)
assert !missing(outcome) if (firm_id == 1 & inlist(year, 2000, 2002)) | ///
    (firm_id == 2 & inlist(year, 2001, 2003))
display "PANEL_TSFILL_RUNTIME_PASSED"

* SECTION: descriptives.collapse_preserve_retained_labels.v1
clear
input byte firm_id int year double sales byte employees
1 2020 100 10
1 2020 120 12
2 2020 200 20
2 2020 240 24
end
label variable sales "Sales amount"
label variable employees "Employee count"
foreach v of varlist sales employees {
    local `v'_label : variable label `v'
}
collapse (mean) sales employees, by(firm_id year)
foreach v of varlist sales employees {
    label variable `v' `"``v'_label'"'
}
isid firm_id year
assert sales == 110 & employees == 11 if firm_id == 1
assert sales == 220 & employees == 22 if firm_id == 2
local sales_label : variable label sales
local employees_label : variable label employees
assert `"`sales_label'"' == "Sales amount"
assert `"`employees_label'"' == "Employee count"
display "COLLAPSE_LABEL_ROUNDTRIP_RUNTIME_PASSED"

* SECTION: figure.named_graph_combine.v1
clear
set obs 4
generate byte period = _n
generate double series_a = 2 * period
generate double series_b = 10 - period
twoway line series_a period, name(graph_left, replace)
twoway scatter series_b period, name(graph_right, replace)
graph combine graph_left graph_right, cols(2) name(graph_combined, replace)
graph save "`fixture_root'/figures/named_graph_combine.gph", replace
graph export "`fixture_root'/figures/named_graph_combine.pdf", replace
confirm file "`fixture_root'/figures/named_graph_combine.gph"
confirm file "`fixture_root'/figures/named_graph_combine.pdf"
display "NAMED_GRAPH_COMBINE_RUNTIME_PASSED"

display "STRUCTURAL_TRANSITIONS_RUNTIME_PASSED"
log close
exit, clear
