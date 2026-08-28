version 18.0
clear all
set more off
set seed 20260828

args fixture_root
capture log close _all
log using "`fixture_root'/event_compact_numlist_runtime.log", replace text

set obs 720
generate int firm_id = ceil(_n / 9)
generate int year = 2015 + mod(_n - 1, 9)
generate byte treated = mod(firm_id, 2)
generate double outcome = 0.1 * treated * (year - 2019) + rnormal()

regress outcome                                      ///
    i(2015/2018 2020/2023).year#1.treated,           ///
    vce(cluster firm_id)

matrix event_b = e(b)
local event_colnames : colfullnames event_b
display as text "COMPACT_EVENT_COLNAMES `event_colnames'"
assert strpos("`event_colnames'", "2015b.year#1.treated") > 0
assert strpos("`event_colnames'", "2018.year#1.treated") > 0
assert strpos("`event_colnames'", "2020.year#1.treated") > 0
assert strpos("`event_colnames'", "2023.year#1.treated") > 0
assert strpos("`event_colnames'", "2019.year#1.treated") == 0
assert el(event_b, 1, 1) != 0

display "EVENT_COMPACT_NUMLIST_RUNTIME_PASSED"
log close
