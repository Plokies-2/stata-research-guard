version 18.0
clear all
set more off
set linesize 120
args output_dir
cd "`output_dir'"

* Run from this task directory; all exports use relative paths.
capture mkdir outputs
capture mkdir work
capture log close _all
log using "outputs/analysis.log", text replace

* Use Stata's bundled 1988 National Longitudinal Survey of Women data.
sysuse nlsw88, clear
local original_N = _N
keep wage hours age grade ttl_exp tenure union south smsa married
drop if missing(wage, hours, age, grade, ttl_exp, tenure, union, south, smsa, married)
keep if wage > 0 & hours > 0
generate double ln_wage = ln(wage)
label variable ln_wage "Natural logarithm of hourly wage"
assert !missing(ln_wage)
assert inlist(union, 0, 1) & inlist(south, 0, 1) & inlist(smsa, 0, 1) & inlist(married, 0, 1)
local common_N = _N
count if married == 1
local married_N = r(N)
display "SAMPLE: original=`original_N'; common=`common_N'; excluded=" `original_N' - `common_N' "; married=`married_N'"
describe
summarize
save "outputs/analysis_data.dta", replace

* Record definitions, units, and the common complete-case rule for every variable.
putexcel set "outputs/codebook.xlsx", replace sheet("Codebook")
putexcel A1=("Variable") B1=("Definition") C1=("Source") D1=("Unit / coding") E1=("Missing-value treatment")
local unit_wage "US dollars per hour (as supplied)"
local unit_ln_wage "Natural log of wage in US dollars per hour"
local unit_hours "Hours per week"
local unit_age "Years"
local unit_grade "Completed years of education"
local unit_ttl_exp "Years"
local unit_tenure "Years"
local unit_union "0 = nonunion; 1 = union"
local unit_south "0 = not South; 1 = South"
local unit_smsa "Standard metropolitan statistical area; 0 = no; 1 = yes"
local unit_married "0 = single; 1 = married"
local row = 2
foreach v of varlist _all {
    local definition : variable label `v'
    local source "Stata 18 bundled nlsw88; original variable"
    if "`v'" == "ln_wage" local source "Derived: ln(wage), after common-sample restriction"
    putexcel A`row'=("`v'") B`row'=("`definition'") C`row'=("`source'") D`row'=("`unit_`v''") E`row'=("Exclude if any of the 10 input variables is missing; also require wage > 0 and hours > 0; no imputation")
    local ++row
}
putexcel A1:E1, bold txtwrap
putexcel A2:E12, txtwrap
putexcel set "outputs/codebook.xlsx", modify sheet("Sample")
putexcel A1=("Stage") B1=("N") A2=("Original nlsw88") B2=(`original_N') A3=("Common analysis sample") B3=(`common_N') A4=("Excluded") B4=(`original_N' - `common_N') A5=("Married common sample") B5=(`married_N')
mata: book = xl()
mata: book.load_book("outputs/codebook.xlsx")
mata: book.set_sheet("Codebook")
mata: book.set_column_width(1,1,16)
mata: book.set_column_width(2,2,35)
mata: book.set_column_width(3,4,48)
mata: book.set_column_width(5,5,65)
mata: book.set_row_height(2,12,50)
mata: book.set_sheet("Sample")
mata: book.set_column_width(1,1,32)
mata: book.set_column_width(2,2,12)
mata: book.close_book()

* A fixed coefficient roster aligns the nested specifications, including base levels.
local rhs1 "age grade"
local rhs2 "age grade ttl_exp tenure"
local rhs3 "age grade ttl_exp tenure union ib0.south ib0.smsa"
local terms "age grade ttl_exp tenure union 0b.south 1.south 0b.smsa 1.smsa _cons"
local bcols "B D F"
local secols "C E G"

foreach sample in full married {
    local restriction ""
    if "`sample'" == "married" local restriction "if married == 1"
    foreach y in wage ln_wage hours {
        putexcel set "outputs/reg_`y'_`sample'.xlsx", replace sheet("OLS")
        putexcel A1=("Outcome: `y'; sample: `sample'") A2=("Term") B2=("(1) Coef.") C2=("Robust SE") D2=("(2) Coef.") E2=("Robust SE") F2=("(3) Coef.") G2=("Robust SE")
        local row = 3
        foreach term of local terms {
            putexcel A`row'=("`term'")
            local ++row
        }
        putexcel A14=("N") A15=("R-squared") A16=("Outcome mean in e(sample)") A18=("OLS; heteroskedasticity-robust standard errors. Blank = term absent from specification.") A19=("0b.south and 0b.smsa are reference categories: coefficient and SE are zero by normalization.")
        forvalues spec = 1/3 {
            regress `y' `rhs`spec'' `restriction', vce(robust)
            local model_N = e(N)
            local model_R2 = e(r2)
            quietly summarize `y' if e(sample), meanonly
            local model_mean = r(mean)
            estimates save "outputs/`y'_`sample'_m`spec'.ster", replace
            matrix b = e(b)
            matrix V = e(V)
            local bc : word `spec' of `bcols'
            local sc : word `spec' of `secols'
            local row = 3
            foreach term of local terms {
                local j = colnumb(b, "`term'")
                if `j' < . {
                    putexcel `bc'`row'=(b[1,`j']) `sc'`row'=(sqrt(V[`j',`j']))
                }
                local ++row
            }
            putexcel `bc'14=(`model_N') `bc'15=(`model_R2') `bc'16=(`model_mean')
            display "MODEL: `y' `sample' m`spec'; N=" e(N) "; R2=" %10.7f e(r2) "; mean=" %10.7f `model_mean'
        }
        putexcel A1:G2, bold
        putexcel B3:G16, nformat("0.000000")
        putexcel B14:G14, nformat("0")
        putexcel A18:G19, txtwrap
        putexcel A1:G1, merge
        putexcel A18:G18, merge
        putexcel A19:G19, merge
        mata: book = xl()
        mata: book.load_book("outputs/reg_`y'_`sample'.xlsx")
        mata: book.set_sheet("OLS")
        mata: book.set_column_width(1,1,32)
        mata: book.set_column_width(2,7,16)
        mata: book.set_row_height(18,19,30)
        mata: book.close_book()
    }
}

* Full-sample distributions retain the observed scale of each outcome.
foreach y in wage ln_wage hours {
    histogram `y', fraction title("Distribution of `y'") subtitle("Common sample (N = `common_N')") ytitle("Fraction") graphregion(color(white)) name(dist_`y', replace)
    graph export "outputs/distribution_`y'.pdf", as(pdf) replace
}

* Read back the saved estimation files and report their stored results.
foreach sample in full married {
    foreach y in wage ln_wage hours {
        forvalues spec = 1/3 {
            estimates use "outputs/`y'_`sample'_m`spec'.ster"
            display "SAVED MODEL: `y' `sample' m`spec'; N=" e(N) "; R2=" %10.7f e(r2) "; VCE=`e(vce)'"
        }
    }
}
display "ANALYSIS COMPLETED"
log close
