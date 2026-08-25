* Assemble one current outcome in one current sheet.
* Keep the direct path because this output has no repeated placement.
* Preserve the declared specification order in the output columns.

preserve
estimates clear
local adjusted_r2_values
local dependent_mean_values

estimates use "$ster/single_outcome.ster", number(1)
local adjusted_r2 = strtrim(strofreal(e(r2_a), "%18.3f"))
local dependent_mean = strtrim(strofreal(e(ymean), "%18.2f"))
local adjusted_r2_values "`adjusted_r2_values' `adjusted_r2'"
local dependent_mean_values "`dependent_mean_values' `dependent_mean'"
outreg2 using "$table/__outreg2_single_sheet", replace bdec(3) sdec(3) nor2

estimates use "$ster/single_outcome.ster", number(2)
local adjusted_r2 = strtrim(strofreal(e(r2_a), "%18.3f"))
local dependent_mean = strtrim(strofreal(e(ymean), "%18.2f"))
local adjusted_r2_values "`adjusted_r2_values' `adjusted_r2'"
local dependent_mean_values "`dependent_mean_values' `dependent_mean'"
outreg2 using "$table/__outreg2_single_sheet", append bdec(3) sdec(3) nor2

estimates use "$ster/single_outcome.ster", number(3)
local adjusted_r2 = strtrim(strofreal(e(r2_a), "%18.3f"))
local dependent_mean = strtrim(strofreal(e(ymean), "%18.2f"))
local adjusted_r2_values "`adjusted_r2_values' `adjusted_r2'"
local dependent_mean_values "`dependent_mean_values' `dependent_mean'"
outreg2 using "$table/__outreg2_single_sheet", append bdec(3) sdec(3) nor2

import delimited using "$table/__outreg2_single_sheet.txt", clear ///
    varnames(nonames) delimiters(tab) stringcols(_all)

if !inlist(v1[_N - 1], "Standard errors in parentheses", "Robust standard errors in parentheses") | substr(v1[_N], 1, 3) != "***" {
    display as error "outreg2 note rows are not in the expected final positions"
    exit 498
}
local adjusted_r2_row = _N - 1
local dependent_mean_row = _N
local standard_error_note_row = _N + 1
local significance_note_row = _N + 2
set obs `significance_note_row'
replace v1 = v1[`dependent_mean_row'] in `significance_note_row'
replace v1 = v1[`adjusted_r2_row'] in `standard_error_note_row'
replace v1 = "Adjusted R-squared" in `adjusted_r2_row'
replace v1 = "Dep. variable mean" in `dependent_mean_row'

local spec_labels `" "Specification 1" "Specification 2" "Specification 3" "'
local spec_num = 0
local statistic_num = 0
ds v1, not
foreach cellvar of varlist `r(varlist)' {
    local ++statistic_num
    local adjusted_r2 : word `statistic_num' of `adjusted_r2_values'
    local dependent_mean : word `statistic_num' of `dependent_mean_values'
    replace `cellvar' = `cellvar'[`dependent_mean_row'] in `significance_note_row'
    replace `cellvar' = `cellvar'[`adjusted_r2_row'] in `standard_error_note_row'
    replace `cellvar' = "`adjusted_r2'" in `adjusted_r2_row'
    replace `cellvar' = "`dependent_mean'" in `dependent_mean_row'
    local spec_num = mod(`spec_num', 3) + 1
    local spec_label : word `spec_num' of `spec_labels'
    replace `cellvar' = "`spec_label'" in 3
}
assert `statistic_num' == 3
replace v1 = "Specification" in 3

export excel using "$table/single_outcome_regression.xlsx", ///
    sheet("single_outcome") replace
mata:
book = xl()
book.load_book("$table/single_outcome_regression.xlsx")
book.set_sheet("single_outcome")
book.set_column_width(1, 1, 36)
book.set_column_width(2, 4, 22)
book.close_book()
end
estimates clear
restore
erase "$table/__outreg2_single_sheet.txt"
capture confirm file "$table/__outreg2_single_sheet.txt"
assert _rc != 0
