twoway ///
    (scatter outcome covariate if group == 0, mcolor(teal)) ///
    (scatter outcome covariate if group == 1, mcolor(navy) msymbol(triangle)) ///
    (lfit outcome covariate if group == 0, lcolor(teal) lpattern(dash)) ///
    (lfit outcome covariate if group == 1, lcolor(navy) lpattern(dash)), ///
    legend(order(1 "Group 0" 2 "Group 1") position(6) rows(1)) ///
    xtitle("Covariate") ytitle("Outcome") ///
    graphregion(color(white))
