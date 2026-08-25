* Internal canonical source snapshot. Generated projects copy only the labeled executable span.

xtset panel_id year

* The design reference (2019 here) is absent. Every declared nonreference
* level is an explicit bn term, so the runtime can verify every raw e(b) token.
local event_rhs 2015bn.year#1.treat2019 2016bn.year#1.treat2019 ///
    2017bn.year#1.treat2019 2018bn.year#1.treat2019 ///
    2020bn.year#1.treat2019 2021bn.year#1.treat2019 ///
    2022bn.year#1.treat2019 2023bn.year#1.treat2019 ///
    2024bn.year#1.treat2019
reghdfe outcome `event_rhs' controls, ///
    absorb(panel_id year) ///
    vce(cluster panel_id)
