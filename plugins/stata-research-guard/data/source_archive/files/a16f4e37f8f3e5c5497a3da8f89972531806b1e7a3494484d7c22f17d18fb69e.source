merge 1:1 firm_id year using "${intermediate}/firm_year_controls.dta", gen(merge_state)
assert merge_state != 2
drop merge_state
