********************************************************************************
* Assemble the final Excel table from stored estimates.
* Preserve native coefficient rows and add only the declared summary statistics.
* Keep the declared specification order in the output columns.
* Use the stored estimation sample for the dependent-variable mean.
* Remove the scratch table after final placement.
********************************************************************************

capture program drop outreg2_xlsx
program define outreg2_xlsx
    syntax, ESTIMATES(string) WORKBOOK(string) SHEET(string)         ///
        ADJdec(integer) MEANdec(integer)                             ///
        [REPLACE]

    if !inrange(`adjdec', 0, 9) | !inrange(`meandec', 0, 9) {
        display as error "adjdec() and meandec() must be integers from 0 through 9"
        exit 198
    }

    preserve
    local first = 1
    local statistic_count = 0
    local adjusted_r2_values
    local dependent_mean_values
    local scratch "$table/__outreg2_`sheet'"

    foreach estimate of local estimates {
        estimates restore `estimate'
        local ++statistic_count
        local adjusted_r2 = strtrim(strofreal(e(r2_a), "%18.`adjdec'f"))
        local dependent_mean = strtrim(strofreal(e(ymean), "%18.`meandec'f"))
        local adjusted_r2_values "`adjusted_r2_values' `adjusted_r2'"
        local dependent_mean_values "`dependent_mean_values' `dependent_mean'"
        if `first' == 1 {
            outreg2 using "`scratch'",                              ///
                replace bdec(3) sdec(3) nor2
            local first = 0
        }
        else {
            outreg2 using "`scratch'",                              ///
                append bdec(3) sdec(3) nor2
        }
    }

    import delimited using "`scratch'.txt",                         ///
        clear varnames(nonames) delimiters(tab) stringcols(_all)

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

    local statistic_num = 0

    ds v1, not
    foreach cellvar of varlist `r(varlist)' {
        local ++statistic_num
        local adjusted_r2 : word `statistic_num' of `adjusted_r2_values'
        local dependent_mean : word `statistic_num' of `dependent_mean_values'
        if "`adjusted_r2'" == "." local adjusted_r2 ""
        replace `cellvar' = `cellvar'[`dependent_mean_row'] in `significance_note_row'
        replace `cellvar' = `cellvar'[`adjusted_r2_row'] in `standard_error_note_row'
        replace `cellvar' = "`adjusted_r2'" in `adjusted_r2_row'
        replace `cellvar' = "`dependent_mean'" in `dependent_mean_row'
    }
    if `statistic_num' != `statistic_count' {
        display as error "stored estimates and outreg2 columns do not align"
        exit 498
    }
    if "`replace'" != "" {
        export excel using "`workbook'", sheet("`sheet'") replace
    }
    else {
        export excel using "`workbook'", sheet("`sheet'", replace)
    }
    * Keep the row-label column and model columns legible without adding a
    * project-specific formatting interface.
    mata: book = xl(); book.load_book(st_local("workbook")); book.set_sheet(st_local("sheet")); book.set_column_width(1, 1, 36); book.set_column_width(2, `statistic_count' + 1, 22); book.close_book()

    restore
    erase "`scratch'.txt"
    capture confirm file "`scratch'.txt"
    if !_rc {
        display as error "outreg2 scratch file was not removed"
        exit 498
    }
end
