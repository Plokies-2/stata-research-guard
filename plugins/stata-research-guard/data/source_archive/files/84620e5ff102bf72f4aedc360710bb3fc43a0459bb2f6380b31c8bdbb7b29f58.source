********************************************************************************
**************Local projections - IV for England, baseline**********************
********************************************************************************

preserve

*****keep only English data

drop if cnumber!=1

tsset year


****set endogenous variable
local end ln_mint_adj


******Set horizon
local maxproj 12


******Generation of LHS-Variables
forvalues i=0/`maxproj' {
	
	gen ln_price`i' = f`i'.lnprice-l.lnprice
	gen ln_realGDP`i'= f`i'.ln_realGDP-l.ln_realGDP
	gen ln_nominal`i' = f`i'.lnnominal-l.lnnominal
}


******Figure 13
twoway (tsline $englandshock,  /// 
ytitle("precious metals relative to metals stock (log)", size(medsmall)) ///
fcolor(gs12) lcolor(black) lpattern(solid)) ///
(tsline `end', yaxis(2) ytitle("English mint output relative to coin stock (log)", size(medsmall) axis(2)) ///
fcolor(gs12) lcolor(black) lpattern(dash)) ///
if cnumber==1 & year>=1560 & year<=1700, graphregion(color(white) lwidth(large)) legend(label(1 "precious metals") label(2 "English mint output")) 
graph export "$diroutput/england_firststage_figure.png", replace	
	


*****Storing coefficients, standard errors and degrees of freedom


gen b_ln_realGDP=.
gen se_ln_realGDP=.

gen b_ln_price  =.
gen se_ln_price =.

gen b_ln_nominal  =.
gen se_ln_nominal =.

gen resdof =.


******Local Projections. 
*Note: The following code also outputs the first-stage regression that is used in Table 3, Column 1. 
*In paticular, the coefficient and standard error on "metals_prod_ship5y" is shown in the table.
*The F-statistic can be obtained by squaring the t-statistic of "metals_prod_ship5y".

local end ln_mint_adj

gen graphyear= _n-1 if _n <= `maxproj' +1
gen zero = 0 if _n <= `maxproj' +1
	
forvalues i=0/`maxproj' {	
	
if `i'== 0 {

	log using "$diroutput/Table3_col1.log", replace
	
	
	ivregress 2sls ln_realGDP`i' (`end' = l.$englandshock) year year2 i.cottington if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_realGDP`i'
	
	replace b_ln_realGDP  =  _b[`end'] if _n == `i'+1
	replace se_ln_realGDP = _se[`end'] if _n == `i'+1
	replace resdof = e(df_r) if _n == `i'+1
	
	log close 

	ivregress 2sls ln_price`i' (`end' = l.$englandshock) year year2 i.cottington  if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_price`i'
	
	replace b_ln_price  =  _b[`end'] if _n == `i'+1
	replace se_ln_price = _se[`end'] if _n == `i'+1

	ivregress 2sls ln_nominal`i' (`end' = l.$englandshock)  year year2 i.cottington if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_nominal`i'
	
	replace b_ln_nominal  =  _b[`end'] if _n == `i'+1
	replace se_ln_nominal = _se[`end'] if _n == `i'+1
	
	}
	
else {


	
	ivregress 2sls ln_realGDP`i' (`end' = l.$englandshock) year year2 i.cottington if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_realGDP`i'
	
	replace b_ln_realGDP  =  _b[`end'] if _n == `i'+1
	replace se_ln_realGDP = _se[`end'] if _n == `i'+1
	replace resdof = e(df_r) if _n == `i'+1
	
	
	ivregress 2sls ln_price`i' (`end' = l.$englandshock) year year2 i.cottington  if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_price`i'
	
	replace b_ln_price  =  _b[`end'] if _n == `i'+1
	replace se_ln_price = _se[`end'] if _n == `i'+1

	ivregress 2sls ln_nominal`i' (`end' = l.$englandshock)  year year2 i.cottington if cnumber==1 & year>=1559 & year<=1700, vce(hac nw 1) small first 
	eststo ols_ln_nominal`i'
	
	replace b_ln_nominal  =  _b[`end'] if _n == `i'+1
	replace se_ln_nominal = _se[`end'] if _n == `i'+1
			
			}	
				
				}

******Generation of Figures


local title1 "Real GDP, England IV"
local title2 "Prices, England IV"
local title3 "Nominal GDP, England IV"




*Significance level lines	

scalar level1 = 0.05	
scalar level2 = 0.1	 


gen up_ln_realGDP = b_ln_realGDP + invnormal(1-level1/2)*se_ln_realGDP if _n <= (`maxproj' + 1)
gen dn_ln_realGDP = b_ln_realGDP - invnormal(1-level1/2)*se_ln_realGDP if _n <= (`maxproj' + 1)

gen up2_ln_realGDP = b_ln_realGDP + invnormal(1-level2/2)*se_ln_realGDP if _n <= (`maxproj' + 1)
gen dn2_ln_realGDP = b_ln_realGDP - invnormal(1-level2/2)*se_ln_realGDP if _n <= (`maxproj' + 1)

gen up3_ln_realGDP = b_ln_realGDP + 1*se_ln_realGDP if _n <= (`maxproj' + 1)
gen dn3_ln_realGDP = b_ln_realGDP - 1*se_ln_realGDP if _n <= (`maxproj' + 1)

gen up_ln_price = b_ln_price + invnormal(1-level1/2)*se_ln_price if _n <= (`maxproj' + 1)
gen dn_ln_price = b_ln_price - invnormal(1-level1/2)*se_ln_price if _n <= (`maxproj' + 1)

gen up2_ln_price = b_ln_price + invnormal(1-level2/2)*se_ln_price if _n <= (`maxproj' + 1)
gen dn2_ln_price = b_ln_price - invnormal(1-level2/2)*se_ln_price if _n <= (`maxproj' + 1)

gen up3_ln_price = b_ln_price + 1*se_ln_price if _n <= (`maxproj' + 1)
gen dn3_ln_price = b_ln_price - 1*se_ln_price if _n <= (`maxproj' + 1)


gen up_ln_nominal = b_ln_nominal + invnormal(1-level1/2)*se_ln_nominal if _n <= (`maxproj' + 1)
gen dn_ln_nominal = b_ln_nominal - invnormal(1-level1/2)*se_ln_nominal if _n <= (`maxproj' + 1)

gen up2_ln_nominal = b_ln_nominal + invnormal(1-level2/2)*se_ln_nominal if _n <= (`maxproj' + 1)
gen dn2_ln_nominal = b_ln_nominal - invnormal(1-level2/2)*se_ln_nominal if _n <= (`maxproj' + 1)

gen up3_ln_nominal = b_ln_nominal + 1*se_ln_nominal if _n <= (`maxproj' + 1)
gen dn3_ln_nominal = b_ln_nominal - 1*se_ln_nominal if _n <= (`maxproj' + 1)
	
	
	
*The graphs	
twoway (rarea up_ln_realGDP dn_ln_realGDP  graphyear, ///
fcolor(gs13) lcolor(white) lpattern(solid)) ///
(rarea up2_ln_realGDP dn2_ln_realGDP  graphyear, ///
fcolor(gs10) lcolor(white) lpattern(solid)) ///
(rarea up3_ln_realGDP dn3_ln_realGDP  graphyear, ///
fcolor(gs6) lcolor(white) lpattern(solid)) ///
(line b_ln_realGDP graphyear, lcolor(black) ///
lpattern(solid) lwidth(thick)) /// 
(line zero graphyear, lcolor(black)), ///
title("`title1'", color(black) size(medium)) ///
ytitle("Percent", size(medsmall)) xtitle("Year", size(medsmall)) ///
graphregion(color(white)) plotregion(color(white)) xlabel(0(1)12) ///
legend(off) name(real_englandIV, replace)


twoway (rarea up_ln_price dn_ln_price  graphyear, ///
fcolor(gs13) lcolor(white) lpattern(solid)) ///
(rarea up2_ln_price dn2_ln_price  graphyear, ///
fcolor(gs10) lcolor(white) lpattern(solid)) ///
(rarea up3_ln_price dn3_ln_price  graphyear, ///
fcolor(gs6) lcolor(white) lpattern(solid)) ///
(line b_ln_price graphyear, lcolor(black) ///
lpattern(solid) lwidth(thick)) /// 
(line zero graphyear, lcolor(black)), ///
title("`title2'", color(black) size(medium)) ///
ytitle("Percent", size(medsmall)) xtitle("Year", size(medsmall)) ///
graphregion(color(white)) plotregion(color(white)) xlabel(0(1)12) ///
legend(off) name(price_englandIV, replace)


twoway (rarea up_ln_nominal dn_ln_nominal  graphyear, ///
fcolor(gs13) lcolor(white) lpattern(solid)) ///
(rarea up2_ln_nominal dn2_ln_nominal  graphyear, ///
fcolor(gs10) lcolor(white) lpattern(solid)) ///
(rarea up3_ln_nominal dn3_ln_nominal  graphyear, ///
fcolor(gs6) lcolor(white) lpattern(solid)) ///
(line b_ln_nominal graphyear, lcolor(black) ///
lpattern(solid) lwidth(thick)) /// 
(line zero graphyear, lcolor(black)), ///
title("`title3'", color(black) size(medium)) ///
ytitle("Percent", size(medsmall)) xtitle("Year", size(medsmall)) ///
graphregion(color(white)) plotregion(color(white)) xlabel(0(1)12) ///
legend(off) name(nom_englandIV, replace)

	
	
	
*Combining the graphs into Figure 14
graph combine nom_englandIV price_englandIV real_englandIV, name(projections_engIV_base, replace) rows(3) imargin(medsmall) plotregion(color(white)) graphregion(color(white)) 
graph display projections_engIV_base, ysize(7) xsize(4)
graph export "$diroutput/projections_engIV_base.png", replace 	
	
restore
