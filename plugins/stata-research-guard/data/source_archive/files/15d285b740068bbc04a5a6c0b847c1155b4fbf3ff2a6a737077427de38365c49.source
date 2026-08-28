* Internal canonical source snapshot. Generated projects copy only the labeled executable span.

xtset panel_id year

* The design reference (2019 here) is absent from the selected levels.
* Keep the event window visible in the estimation block.
reghdfe outcome ///
    i(2015/2018 2020/2024).year#1.treat2019 controls, ///
    absorb(panel_id year) ///
    vce(cluster panel_id)
