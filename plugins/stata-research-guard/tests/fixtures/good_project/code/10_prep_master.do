clear
input int panel_id int year double outcome byte treatment
1 2020 2.1 0
1 2021 2.3 0
2 2020 2.2 0
2 2021 2.5 0
3 2020 2.4 0
3 2021 2.6 0
4 2020 2.5 0
4 2021 2.8 0
5 2020 2.7 0
5 2021 2.9 0
6 2020 3.5 1
6 2021 3.9 1
7 2020 3.6 1
7 2021 4.0 1
8 2020 3.8 1
8 2021 4.2 1
9 2020 3.9 1
9 2021 4.4 1
10 2020 4.1 1
10 2021 4.6 1
end

label variable panel_id "패널 단위 식별자"
label variable year "연도"
label variable treatment "처치 여부"
label variable outcome "결과 변수"

isid panel_id year
assert inrange(year, 2020, 2021)
count

save "${DATA_GENERATED}/imported_panel.dta", replace

preserve
keep panel_id year
generate double population = 1000 + panel_id * 10
label variable population "인구"
isid panel_id year
tempfile population_data
save `population_data'
restore

isid panel_id year
merge 1:1 panel_id year using `population_data'
tabulate _merge
assert _merge == 3
drop _merge

xtset panel_id year
save "${DATA_FINAL}/analysis_panel.dta", replace
