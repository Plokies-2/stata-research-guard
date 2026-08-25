* Internal canonical source snapshot. Generated projects copy only the labeled executable span.

xtset panel_id year

xtivreg2 outcome controls (endogenous = excluded_instrument), ///
    fe cluster(panel_id) first savefirst savefprefix(first_)

estadd ysumm, mean
estimates save "$ster/second_stage/outcome.ster", replace

estimates restore first_endogenous
estadd ysumm, mean
estimates save "$ster/first_stage/endogenous.ster", replace
