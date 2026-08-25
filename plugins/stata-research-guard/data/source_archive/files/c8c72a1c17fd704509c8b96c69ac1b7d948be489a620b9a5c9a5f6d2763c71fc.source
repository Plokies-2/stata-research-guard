* Git candidate source snapshot: official Stata data-management and time-series mechanics.
* Every span in top50_prep_gap_fill.json is bounded here; audit before promotion.
use "$data/declared_input.dta", clear
save "$data/intermediate_clean.dta", replace
keep firm_id year outcome treatment control_1
order firm_id year outcome treatment control_1
sort firm_id year
compress
save "$data/analysis_final.dta", replace
use "$raw/source_a.dta", clear
append using "$raw/source_b.dta"
export excel using "$tables/descriptives.xlsx", sheet("Additional") firstrow(variables) sheetmodify
quietly summarize outcome if e(sample), meanonly
local outcome_mean = r(mean)
quietly summarize income if e(sample), detail
local income_p50 = r(p50)
local income_p90 = r(p90)
tabulate treatment cohort, missing
tabulate treatment cohort, row missing
generate log_sales = ln(sales) if sales > 0 & !missing(sales)
generate treated_observed = (treatment == 1) if !missing(treatment)
generate treatment_post = treatment * post if !missing(treatment, post)
replace status_code = 1 if raw_status == "approved"
replace score = 0 if missing(score) & impute_zero == 1
egen highest_score = rowmax(score_a score_b score_c)
bysort firm_id year: egen group_sales = total(sales)
egen first_in_firm_year = tag(firm_id year)
keep if inrange(year, 2010, 2024)
isid firm_id year
sort firm_id year
save "$data/final_sorted.dta", replace
gsort firm_id -sales employee_id
by firm_id: generate sales_rank = _n if !missing(sales)
isid firm_id year
merge m:1 industry using "$raw/industry_lookup.dta", keepusing(industry_name sector) keep(master match) generate(merge_industry)
assert inlist(merge_industry, 1, 3)
use "$raw/source_a.dta", clear
rename id firm_id
keep firm_id year outcome
append using "$raw/source_b_harmonized.dta"
isid firm_id year
preserve
collapse (mean) mean_outcome=outcome (count) n_outcome=outcome, by(industry year)
restore
preserve
collapse (mean) mean_outcome=outcome [aw=analysis_weight], by(industry year)
restore
preserve
collapse (p50) outcome_p50=outcome (p90) outcome_p90=outcome, by(industry year)
restore
local outcome_label : variable label outcome
preserve
collapse (mean) outcome, by(industry year)
label variable outcome "`outcome_label'"
restore
generate exposure_rate = exposed / population if population > 0 & !missing(exposed, population)
label variable exposure_rate "Declared exposure rate"
label define status_label 2 "Pending", add modify
destring revenue_text, generate(revenue) dpcomma
isid firm_id year
assert inrange(year, 2010, 2024) if !missing(year)
tsset month
tsset month, delta(1)
isid firm_id year
preserve
use "$raw/using_firm_year.dta", clear
isid firm_id year
restore
merge 1:1 firm_id year using "$raw/using_firm_year.dta"
assert _merge == 3
drop _merge
isid firm_id year
preserve
use "$raw/industry_lookup.dta", clear
isid industry
restore
merge m:1 industry using "$raw/industry_lookup.dta"
assert _merge == 3
drop _merge
