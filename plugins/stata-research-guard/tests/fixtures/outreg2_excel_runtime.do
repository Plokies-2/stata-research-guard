version 18.0
clear all
set more off
set seed 20260823

args fixture_root
global ster  "`fixture_root'/estimates"
global table "`fixture_root'/tables"

capture mkdir "plugins/stata-research-guard/tests/runtime"
capture mkdir "`fixture_root'"
capture mkdir "$ster"
capture mkdir "$ster/all"
capture mkdir "$table"
capture log close _all
log using "`fixture_root'/outreg2_excel_runtime.log", replace text

set obs 240
generate int cluster_id = ceil(_n / 8)
generate int year = 2017 + mod(_n - 1, 8)
generate byte exposed = mod(cluster_id, 2)
replace exposed = 0 if year == 2024
generate double z = rnormal()
generate double x1 = 0.8*z + rnormal()
generate double x2 = rnormal()
generate double y1 = 1 + 0.8*x1 - 0.2*x2 + 0.1*(year - 2019)*exposed + rnormal()
summarize y1, meanonly
replace y1 = y1 + (280.857635 - r(mean))
label variable y1 "Synthetic outcome"
local event_rhs "2017bn.year#1.exposed 2018bn.year#1.exposed 2020bn.year#1.exposed 2021bn.year#1.exposed 2022bn.year#1.exposed 2023bn.year#1.exposed 2024bn.year#1.exposed"

regress y1 `event_rhs', vce(cluster cluster_id)
local expected_r2_1 = strtrim(strofreal(e(r2_a), "%18.3f"))
summarize y1 if e(sample), meanonly
local expected_y1_mean_1 = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_y1_mean_1'"
assert "`expected_y1_mean_1'" == "280.857635"
estimates save "$ster/all/y1_s1.ster", replace

regress y1 `event_rhs' x1, vce(cluster cluster_id)
local expected_r2_2 = strtrim(strofreal(e(r2_a), "%18.3f"))
summarize y1 if e(sample), meanonly
local expected_y1_mean_2 = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_y1_mean_2'"
assert "`expected_y1_mean_2'" == "280.857635"
estimates save "$ster/all/y1_s2.ster", replace

regress y1 `event_rhs' x1 x2, vce(cluster cluster_id)
local expected_r2_3 = strtrim(strofreal(e(r2_a), "%18.3f"))
summarize y1 if e(sample), meanonly
local expected_y1_mean_3 = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_y1_mean_3'"
assert "`expected_y1_mean_3'" == "280.857635"
estimates save "$ster/all/y1_s3.ster", replace

* Keep the first-stage estimate as one more ordinary raw-output column source.
regress x1 z x2 i.year, vce(cluster cluster_id)
local expected_first_r2 = strtrim(strofreal(e(r2_a), "%18.3f"))
summarize x1 if e(sample), meanonly
local expected_first_mean = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_first_mean'"
estimates save "$ster/all/first_x1.ster", replace

ivregress 2sls y1 x2 i.year (x1 = z), vce(cluster cluster_id)
local expected_2sls_r2 = strtrim(strofreal(e(r2_a), "%18.3f"))
summarize y1 if e(sample), meanonly
local expected_2sls_mean = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_2sls_mean'"
estimates save "$ster/all/y1_2sls.ster", replace

generate int count_y = rpoisson(exp(0.2 + 0.2*x1 - 0.1*x2))
poisson count_y x1 x2 i.year, vce(cluster cluster_id)
tempname poisson_r2a
scalar `poisson_r2a' = e(r2_a)
assert missing(scalar(`poisson_r2a'))
summarize count_y if e(sample), meanonly
local expected_poisson_mean = strtrim(strofreal(r(mean), "%18.6f"))
estadd ysumm, mean
assert strtrim(strofreal(e(ymean), "%18.6f")) == "`expected_poisson_mean'"
estimates save "$ster/all/count_y_poisson.ster", replace

estimates clear
estimates use "$ster/all/y1_s1.ster"
estimates store y1_s1
estimates use "$ster/all/y1_s2.ster"
estimates store y1_s2
estimates use "$ster/all/y1_s3.ster"
estimates store y1_s3
estimates use "$ster/all/first_x1.ster"
estimates store first_x1
estimates use "$ster/all/y1_2sls.ster"
estimates store y1_2sls
estimates use "$ster/all/count_y_poisson.ster"
estimates store count_y_poisson
do "plugins/stata-research-guard/annotations/source_snapshots/default_style_outreg2_xlsx.do"
outreg2_xlsx, estimates("y1_s1 y1_s2 y1_s3") workbook("$table/all.xlsx") ///
    sheet("Table A") adjdec(3) meandec(6) replace
outreg2_xlsx, estimates("first_x1") workbook("$table/all.xlsx") ///
    sheet("First stage") adjdec(3) meandec(6)
outreg2_xlsx, estimates("y1_2sls first_x1") workbook("$table/all.xlsx") ///
    sheet("2SLS") adjdec(3) meandec(6)
outreg2_xlsx, estimates("count_y_poisson") workbook("$table/all.xlsx") ///
    sheet("Poisson") adjdec(3) meandec(6)

confirm file "$table/all.xlsx"
capture confirm file "$table/__outreg2_Table A.txt"
local scratch_rc = _rc
assert `scratch_rc' == 601
capture confirm file "$table/__outreg2_First stage.txt"
local first_scratch_rc = _rc
assert `first_scratch_rc' == 601
capture confirm file "$table/__outreg2_2SLS.txt"
local iv_scratch_rc = _rc
assert `iv_scratch_rc' == 601
capture confirm file "$table/__outreg2_Poisson.txt"
local poisson_scratch_rc = _rc
assert `poisson_scratch_rc' == 601

import excel using "$table/all.xlsx", sheet("Table A") allstring clear
count if A == "Adjusted R-squared"
assert r(N) == 1
assert B == "`expected_r2_1'" if A == "Adjusted R-squared"
assert C == "`expected_r2_2'" if A == "Adjusted R-squared"
assert D == "`expected_r2_3'" if A == "Adjusted R-squared"
count if A == "Dep. variable mean"
assert r(N) == 1
assert B == "280.857635" if A == "Dep. variable mean"
assert C == "280.857635" if A == "Dep. variable mean"
assert D == "280.857635" if A == "Dep. variable mean"
* Preserve the complete native outreg2 coefficient/SE output from the
* explicitly selected event interactions, including an actual omitted row.
count if strpos(A, "#1.exposed") | strpos(A, "#1o.exposed")
assert r(N) == 7
count if strpos(A, "#0b.exposed")
assert r(N) == 0
count if A == "1.exposed"
assert r(N) == 0
count if A == "2017bn.year#1.exposed"
assert r(N) == 1
count if strpos(A, "2017b.year")
assert r(N) == 0
count if A == "2024o.year#1o.exposed"
assert r(N) == 1
count if strpos(A, "2019b.year#1o.exposed")
assert r(N) == 0
assert A[_N - 4] == "Observations"
assert A[_N - 3] == "Adjusted R-squared"
assert A[_N - 2] == "Dep. variable mean"
assert A[_N - 1] == "Robust standard errors in parentheses"
assert substr(A[_N], 1, 3) == "***"

import excel using "$table/all.xlsx", sheet("First stage") allstring clear
count if A == "Adjusted R-squared"
assert r(N) == 1
assert B == "`expected_first_r2'" if A == "Adjusted R-squared"
count if A == "Dep. variable mean"
assert r(N) == 1
assert B == "`expected_first_mean'" if A == "Dep. variable mean"
count if A == "Excluded-instrument F"
assert r(N) == 0
count if A == "z"
assert r(N) == 1
assert A[_N - 4] == "Observations"
assert A[_N - 3] == "Adjusted R-squared"
assert A[_N - 2] == "Dep. variable mean"
assert A[_N - 1] == "Robust standard errors in parentheses"
assert substr(A[_N], 1, 3) == "***"

import excel using "$table/all.xlsx", sheet("2SLS") allstring clear
assert B[1] == "(1)"
assert C[1] == "(2)"
assert B[2] == "y1"
assert C[2] == "x1"
count if A == "Adjusted R-squared"
assert r(N) == 1
assert B == "`expected_2sls_r2'" if A == "Adjusted R-squared"
assert C == "`expected_first_r2'" if A == "Adjusted R-squared"
count if A == "Dep. variable mean"
assert r(N) == 1
assert B == "`expected_2sls_mean'" if A == "Dep. variable mean"
assert C == "`expected_first_mean'" if A == "Dep. variable mean"
count if A == "Excluded-instrument F"
assert r(N) == 0
count if A == "z"
assert r(N) == 1
count if A == "x1"
assert r(N) == 1
assert A[_N - 4] == "Observations"
assert A[_N - 3] == "Adjusted R-squared"
assert A[_N - 2] == "Dep. variable mean"
assert A[_N - 1] == "Robust standard errors in parentheses"
assert substr(A[_N], 1, 3) == "***"

import excel using "$table/all.xlsx", sheet("Poisson") allstring clear
assert B[1] == "(1)"
assert B[2] == "count_y"
count if A == "Adjusted R-squared"
assert r(N) == 1
assert B == "" if A == "Adjusted R-squared"
count if A == "Dep. variable mean"
assert r(N) == 1
assert B == "`expected_poisson_mean'" if A == "Dep. variable mean"
count if A == "x1"
assert r(N) == 1
assert B != "" if A == "x1"
assert A[_N - 4] == "Observations"
assert A[_N - 3] == "Adjusted R-squared"
assert A[_N - 2] == "Dep. variable mean"
assert A[_N - 1] == "Robust standard errors in parentheses"
assert substr(A[_N], 1, 3) == "***"

foreach estimate in y1_s1 y1_s2 y1_s3 first_x1 y1_2sls count_y_poisson {
    erase "$ster/all/`estimate'.ster"
    capture confirm file "$ster/all/`estimate'.ster"
    assert _rc == 601
}

display "OUTREG2_XLSX_WIDTHS_APPLIED"
display "OUTREG2_XLSX_FIRST_STAGE_PASSED"
display "OUTREG2_XLSX_2SLS_AND_FIRST_STAGE_PASSED"
display "OUTREG2_XLSX_2SLS_STATS `expected_2sls_r2' `expected_2sls_mean'"
display "OUTREG2_XLSX_POISSON_MISSING_R2_PASSED"
display "OUTREG2_XLSX_RUNTIME_PASSED"
log close
exit, clear
