
*Figure 6: Structural Model Fit  

*------------------
* Panel A: Output
*------------------

****** Import results from matlab model solution 
clear
import delimited "$revision/Structural_Analysis/Estimation/moments.txt", delimiter("   ", asstring) 
drop v1 
gen moment = _n 
reshape long v , i(moment) j(type)

label define typel  2 "Data"  3 "Model"
label values type typel 

replace moment = 0 if moment == 9 
replace moment = moment + 1

label define momentl  1 "<1" 2 "5-20"  3 "20-100" 4 "100+" 5 "5-20" 6 "20-100" 7 "100+" 8 "1st-2nd" 9 "2nd-3rd" 
label values moment momentl 

graph bar v ,  over(type, label(labsize(small))) over(moment, label(labsize(small)))  asyvars /// 
text(-.065 25 "Share of Firms") text(-.065 62.5 "Share of Output")  text(-.065 90 "Relative Output")  ///
bar(1,fcolor(maroon) lcolor(maroon)) bar(2, fcolor(white) lcolor(navy) lwidth(medthick)) ///
graphregion(fcolor(white)) graphregion(color(white)) ///  
plotregion(fcolor(white)) ///
ytitle("Moment Value") legend(position(12)   region(col(white)))

graph export "$revision/Figure/Figure6_A.pdf", replace 	


*------------------
* Panel B: Output
*------------------

clear
import delimited "$revision/Structural_Analysis/Counterfactual Baseline/results_figure_6B.txt", delimiter("   ", asstring) 

replace v1 = v2 if v1 == . 
drop v2 

**** Collect Summary of Reduced Form Estimates 
gen type = -_n
mat var = (-20.4, 	4.2 \ /// Table 1: Panel B: Column 3 
	   11.8,	3.7 \ /// Table 2: Panel A: Column 3
	   7.3,		1.9 \ /// Table 3: Column 2 
	   -36.7,	7.0 \ /// Table 3: Column 3 
	   -15.6,	4.7 \ /// Table 1: Panel A: Column 3
	   30.2,	7.6 \ /// Table 2: Panel A: Column 3
	   -4.9,  	4.6 \ /// Table 1: Panel C: Column 3
	   -5.9,  	8     /// Table 2: Panel B: Column 3			
	) 
svmat var
rename var2 var3
rename var1 var2
rename v1 var1 
replace var1 = var1*100
gen ci_l = var2-2*var3
gen ci_h = var2+2*var3


replace type = type-1 if type< -4

replace type = type-1 if type< -7
twoway 	(scatter type var2  , msymbol(diamond) color(navy) xline(0))  /// 
	(rcap  ci_h ci_l  type , lpattern(dash) hor color(navy))  ///
	 (scatter  type var1 ,  msymbol(square) color(maroon) yline(-5 -8, lpattern(dash) lcolor(black))) , /// 
	 graphregion(fcolor(white)) graphregion(color(white)) ///
	 xtitle("Estimate vs. Model Prediction") ytitle("") ///
	 xlabel(-50(10)50) ///
	 text(0 -47 "Output"  -.7 -20.4 "Regulated Firms"  -1.7 11.8 "Related Firms"  -2.7 7.3 "Market Spillover" -3.7 -36.7 "Within-Conglomerate") ///
	 text(-5.25 -47 "Inputs"  -5.7 -15.6 "Regulated Firms"  -6.7 30.2 "Related Firms" ) ///	 
	 text(-8.25 -40 "Energy Efficiency"  -8.7 -5 "Regulated Firms"  -9.7 -7 "Related Firms" ) ///	 
	 ylabel("") ysc(r(-7 0)) ///
	 legend(r(1) pos(6) order(3 "Model Prediction" 1 "95% CI of Estimate")  region(col(white)) )

graph export "$revision/Figure/Figure6_B.pdf", replace 

