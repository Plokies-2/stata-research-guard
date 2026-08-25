version 18.0
clear all
set more off

args fixture_root
capture mkdir "`fixture_root'"
capture log close _all
log using "`fixture_root'/state_transition_runtime.log", replace text

set obs 40
generate long id = _n
generate double x = _n
generate byte restricted = _n <= 20
generate double y = 1 + 2 * x + sin(_n)

local n_before = _N
quietly summarize id, meanonly
local id_sum_before = r(sum)

tempname sample_flow
postfile `sample_flow' str40 checkpoint long n using "`fixture_root'/sample_flow.dta", replace
post `sample_flow' ("raw_load") (`n_before')
quietly count if restricted
post `sample_flow' ("restricted_sample") (r(N))
postclose `sample_flow'

assert _N == `n_before'
quietly summarize id, meanonly
assert r(sum) == `id_sum_before'

quietly regress y x
assert e(N) == 40
estimates save "`fixture_root'/ordered_results.ster", replace

quietly regress y x if restricted
assert e(N) == 20
estimates save "`fixture_root'/ordered_results.ster", append

estimates clear
estimates use "`fixture_root'/ordered_results.ster", number(1)
assert e(N) == 40
scalar first_beta = _b[x]
estimates store full_sample

estimates use "`fixture_root'/ordered_results.ster", number(2)
assert e(N) == 20
estimates store restricted_sample

estimates restore full_sample
assert e(N) == 40
assert abs(_b[x] - first_beta) < 1e-12

use "`fixture_root'/sample_flow.dta", clear
assert _N == 2
confirm string variable checkpoint
confirm numeric variable n
assert checkpoint[1] == "raw_load"
assert checkpoint[2] == "restricted_sample"
assert n[1] == 40
assert n[2] == 20

display "STATE_TRANSITION_RUNTIME_PASSED"
log close
exit, clear
