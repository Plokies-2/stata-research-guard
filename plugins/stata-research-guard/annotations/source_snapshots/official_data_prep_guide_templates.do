* Git candidate source snapshot: official Stata data-preparation mechanics.
* Every span in official_data_prep.json points to this file; audit before promotion.
import delimited using "$raw/source.csv", delimiter(";") varnames(1) encoding("UTF-8") numericcols(1 2) clear
import delimited using "$raw/headerless.csv", varnames(1 2 3) clear
import excel using "$raw/input.xlsx", sheet("Data") firstrow clear
import excel using "$raw/input.xlsx", sheet("Data") cellrange(A1:Z500) firstrow clear
export delimited using "$results/data.csv", replace
export excel using "$results/data.xlsx", sheet("Data") firstrow(variables) replace
generate treatment_ind = (treatment == 1) if !missing(treatment)
replace income = 0 if income < 0 & !missing(income)
egen total_score = rowtotal(score_1 score_2 score_3), missing
egen group_id = group(firm year)
egen mean_outcome = mean(outcome), by(industry)
keep if inrange(year, 2015, 2024) & !missing(outcome)
drop if missing(outcome, treatment, control_1)
sort firm year
gsort -rank firm
merge 1:1 firm year using "$raw/firm_year.dta", assert(match master using) keep(match master) nogen
merge m:1 industry using "$raw/industry.dta", keepusing(industry_name sector) nogen
append using "$raw/part_2.dta", generate(source_id)
append using "$raw/part_3.dta", generate(source_id)
reshape long sales profit, i(firm) j(year)
reshape wide sales profit, i(firm) j(year)
collapse (mean) outcome control_1, by(industry year)
collapse (sum) revenue (count) obs_id, by(industry year)
label define yesno 0 "No" 1 "Yes"
label values treatment yesno
destring revenue_text, generate(revenue_num) ignore(",")
tostring firm_id, generate(firm_text) format(%12.0f)
encode industry_text, generate(industry_code)
decode industry_code, generate(industry_text_restore)
duplicates report firm year
duplicates tag firm year, generate(duplicate_key)
preserve
contract industry year, zero
restore
tsset firm year
xtset firm year
contract industry year, zero
set seed 12345
sample 10, count
correlate outcome treatment control_1 control_2
pwcorr outcome treatment control_1 control_2, sig obs
