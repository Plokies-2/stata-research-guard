ssc install reghdfe, replace
use "C:\Users\researcher\Desktop\analysis.dta", clear
merge m:m id using "other.dta"
drop _merge
duplicates drop id, force

foreach outcome in y1 y2 {
    foreach treatment in d1 d2 {
        forvalues specification = 1/2 {
            regress `outcome' `treatment'
        }
    }
}
