version 18.0
clear all
set more off
capture log close _all
args output_dir
cd "`output_dir'"
log using "run_details.log", text replace

* The same complete-case sample supports all three outcomes and both OLS specifications.
sysuse nlsw88, clear
describe wage hours age grade ttl_exp tenure union
count
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) & wage > 0 & hours > 0
count
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
assert !missing(ln_wage)
save "nlsw88_analysis.dta", replace

* Record the derived variable and its original Stata source in a five-column codebook.
putexcel set "codebook.xlsx", sheet("Variables") replace open
putexcel A1 = "varname"
putexcel B1 = "Item"
putexcel C1 = "Item Name"
putexcel D1 = "format / unit"
putexcel E1 = "note"
putexcel A2 = "ln_wage"
putexcel C2 = "Natural logarithm of hourly wage"
putexcel D2 = "Natural log of wage's original hourly monetary unit"
putexcel E2 = "Source: Stata sysuse nlsw88, wage. Generated as ln(wage) after retaining observations with nonmissing wage, hours, age, grade, ttl_exp, tenure and union, wage>0, hours>0. No missing ln_wage remains in the saved analysis data."
putexcel A1:E1, bold font("Malgun Gothic", 11)
putexcel A2:E2, font("Malgun Gothic", 10) txtwrap
putexcel save
* Set readable widths after Stata has written the five codebook fields.
shell python -c "from openpyxl import load_workbook; p='codebook.xlsx'; w=load_workbook(p); s=w.active; s.column_dimensions['A'].width=17; s.column_dimensions['B'].width=12; s.column_dimensions['C'].width=38; s.column_dimensions['D'].width=55; s.column_dimensions['E'].width=95; s.row_dimensions[2].height=62; s.freeze_panes='A2'; w.save(p)"

* Each outcome uses the identical saved sample; its mean is attached to each fitted model.
foreach y in wage ln_wage hours {
    regress `y' age grade, vce(robust)
    quietly summarize `y' if e(sample), meanonly
    local mean_y = r(mean)
    estimates store `y'_short
    estimates save "`y'_short.ster", replace

    regress `y' age grade ttl_exp tenure union, vce(robust)
    assert e(N) == _N
    estimates store `y'_full
    estimates save "`y'_full.ster", replace

    etable, estimates(`y'_short `y'_full) column(estimates) ///
        mstat(N, label("N")) mstat(r2, label("R-squared")) ///
        mstat(mean_y=`mean_y', label("Outcome mean")) ///
        title("`y': OLS with robust standard errors") ///
        note("Common complete-case sample; standard errors in parentheses.") ///
        export("table_`y'.xlsx", replace)

    histogram `y', frequency bins(30) ///
        title("Distribution of `y'") xtitle("`y'") ytitle("Number of observations") ///
        xsize(8) ysize(5)
    graph export "distribution_`y'.pdf", replace
}

log close
