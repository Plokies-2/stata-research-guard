version 18.0
clear all
set more off

args fixture_root
if `"`fixture_root'"' == "" {
    display as error "fixture root is required"
    exit 198
}

log using "`fixture_root'/summary_templates_runtime.log", text replace

capture mkdir "`fixture_root'/data"
capture mkdir "`fixture_root'/tables"
capture mkdir "`fixture_root'/figures"

sysuse auto, clear

* SECTION: canonical grouped long summary dataset
collapse ///
    (mean) mean_price=price mean_mpg=mpg ///
    (sd) sd_price=price sd_mpg=mpg ///
    (count) n_price=price n_mpg=mpg ///
    (sum) sum_price=price sum_mpg=mpg ///
    (p25) p25_price=price p25_mpg=mpg ///
    (p50) p50_price=price p50_mpg=mpg ///
    (p75) p75_price=price p75_mpg=mpg, by(foreign)

reshape long mean_ sd_ n_ sum_ p25_ p50_ p75_, ///
    i(foreign) j(variable) string
rename (mean_ sd_ n_ sum_ p25_ p50_ p75_) ///
    (mean sd n sum p25 p50 p75)
isid foreign variable
assert _N == 4
assert n == 52 if foreign == 0
assert n == 22 if foreign == 1
order foreign variable n mean sd sum p25 p50 p75
sort foreign variable
save "`fixture_root'/data/summary_long.dta", replace
display "SUMMARY_LONG_RUNTIME_PASSED"

* SECTION: one direct descriptive sheet from the canonical dataset
preserve
    keep if variable == "price"
    count
    local last_row = r(N) + 1
    export excel foreign n mean sd sum p25 p50 p75 using ///
        "`fixture_root'/tables/summary.xlsx", ///
        sheet("Price", replace) firstrow(varlabels)
    putexcel set "`fixture_root'/tables/summary.xlsx", sheet("Price") modify
    putexcel A1:H1, bold hcenter border(bottom)
    putexcel B2:B`last_row', nformat(number)
    putexcel C2:H`last_row', nformat(number_d2)
restore
display "SUMMARY_EXCEL_RUNTIME_PASSED"

* SECTION: one named bar graph from the canonical dataset
preserve
    keep if variable == "price"
    graph bar (asis) mean, ///
        over(foreign, relabel(1 "Domestic" 2 "Foreign")) ///
        ytitle("Mean price") ///
        title("price") ///
        name(summary_price, replace)
restore
graph export "`fixture_root'/figures/summary_price.pdf", ///
    name(summary_price) replace
display "SUMMARY_BAR_RUNTIME_PASSED"

display "SUMMARY_TEMPLATES_RUNTIME_PASSED"
log close
