use "${DATA_FINAL}/analysis_panel.dta", clear
isid panel_id year
summarize outcome treatment
tabulate treatment
tabstat outcome, by(treatment) statistics(n mean sd)

regress outcome treatment i.year, vce(cluster panel_id)
estimates store main_specification
estimates save "${OUTPUT}/main_specification.ster", replace

graph set window fontface "Malgun Gothic"
graph set print fontface "Malgun Gothic"
twoway scatter outcome treatment, title("결과 변수와 처치")
graph export "${OUTPUT}/outcome_treatment.png", replace

* Robustness: 2021년 표본으로 동일 방향을 확인한다.
regress outcome treatment if year == 2021, vce(cluster panel_id)
estimates store robustness_2021
