version 18.0
clear all
set more off
args output_dir
cd "`output_dir'"

* Keep one complete, positive-wage and positive-hours sample for every model.
sysuse nlsw88, clear
count
local n_original = r(N)
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) ///
    & wage > 0 & hours > 0
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
order wage ln_wage hours age grade ttl_exp tenure union
count
local n_analysis = r(N)
display as text "Original observations: `n_original'"
display as text "Common analysis observations: `n_analysis'"
assert !missing(wage, ln_wage, hours, age, grade, ttl_exp, tenure, union)
isid idcode
summarize wage ln_wage hours age grade ttl_exp tenure union
save "nlsw88_analysis.dta", replace

* Record the derived variable and the input fields used to construct the sample.
putexcel set "codebook.xlsx", replace
putexcel A1=("Variable") B1=("Definition") C1=("Source") D1=("Unit") E1=("Missing-value treatment")
putexcel A2=("wage") B2=("Hourly wage") C2=("Stata nlsw88.wage") D2=("US dollars per hour") E2=("Required observed and >0")
putexcel A3=("ln_wage") B3=("Natural logarithm of wage") C3=("Generated as ln(wage) from nlsw88.wage") D3=("log US dollars per hour") E3=("Computed only after complete-case selection and wage>0; no missing values remain")
putexcel A4=("hours") B4=("Hours worked per week") C4=("Stata nlsw88.hours") D4=("hours per week") E4=("Required observed and >0")
putexcel A5=("age") B5=("Respondent age") C5=("Stata nlsw88.age") D5=("years") E5=("Required observed")
putexcel A6=("grade") B6=("Highest grade completed") C6=("Stata nlsw88.grade") D6=("years of schooling") E6=("Required observed")
putexcel A7=("ttl_exp") B7=("Total work experience") C7=("Stata nlsw88.ttl_exp") D7=("years") E7=("Required observed")
putexcel A8=("tenure") B8=("Job tenure") C8=("Stata nlsw88.tenure") D8=("years") E8=("Required observed")
putexcel A9=("union") B9=("Union membership") C9=("Stata nlsw88.union") D9=("indicator (0/1)") E9=("Required observed")
putexcel A11=("Sample rule") B11=("Complete on all seven source variables, wage>0, hours>0")
putexcel A12=("Original N") B12=(`n_original')
putexcel A13=("Analysis N") B13=(`n_analysis')

foreach outcome in wage ln_wage hours {
    histogram `outcome', percent title("Distribution of `outcome'") ///
        xtitle("`outcome'") ytitle("Percent") name(g_`outcome', replace)
    graph export "`outcome'_distribution.pdf", replace
    graph drop g_`outcome'

    putexcel set "`outcome'_regression.xlsx", replace
    putexcel A1=("Outcome: `outcome'")
    putexcel A2=("Term") B2=("Model 1: age, grade") C2=("Model 2: age, grade, ttl_exp, tenure, union")
    putexcel A3=("Coefficient followed by robust standard error")
    putexcel A4=("age") A5=("Robust SE") A6=("grade") A7=("Robust SE")
    putexcel A8=("ttl_exp") A9=("Robust SE") A10=("tenure") A11=("Robust SE")
    putexcel A12=("union") A13=("Robust SE") A14=("Constant") A15=("Robust SE")
    putexcel A16=("N") A17=("R-squared") A18=("Outcome mean in regression sample")

    regress `outcome' age grade, vce(robust)
    estimates save "`outcome'_m1.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel B4=(_b[age]) B5=(_se[age]) B6=(_b[grade]) B7=(_se[grade])
    putexcel B14=(_b[_cons]) B15=(_se[_cons])
    putexcel B16=(`model_n') B17=(`model_r2') B18=(`outcome_mean')

    regress `outcome' age grade ttl_exp tenure union, vce(robust)
    estimates save "`outcome'_m2.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel C4=(_b[age]) C5=(_se[age]) C6=(_b[grade]) C7=(_se[grade])
    putexcel C8=(_b[ttl_exp]) C9=(_se[ttl_exp]) C10=(_b[tenure]) C11=(_se[tenure])
    putexcel C12=(_b[union]) C13=(_se[union]) C14=(_b[_cons]) C15=(_se[_cons])
    putexcel C16=(`model_n') C17=(`model_r2') C18=(`outcome_mean')
}
