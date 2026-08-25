version 18.0
clear all
set more off

args fixture_root
capture mkdir "`fixture_root'"
capture log close _all
log using "`fixture_root'/direct_outreg2_xls_runtime.log", replace text

sysuse auto, clear
regress price mpg weight, vce(robust)
quietly summarize price if e(sample), meanonly
local dep_mean = r(mean)
outreg2 using "`fixture_root'/auto_price.xls", excel replace ///
    adjr2 addstat(Dep. variable mean, `dep_mean')

confirm file "`fixture_root'/auto_price.xls"
capture confirm file "`fixture_root'/auto_price.xml"
assert _rc == 601
capture confirm file "`fixture_root'/auto_price.xlsx"
assert _rc == 601
display "DIRECT_OUTREG2_XLS_RUNTIME_PASSED"
log close
exit, clear
