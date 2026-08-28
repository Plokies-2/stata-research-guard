version 18.0
use "$data/raw/source_panel.dta", clear

* 결과변수는 명목값을 기준가격지수로 나눈 실질값이다.
generate double outcome_real = outcome_nominal / price_index
label variable outcome_real "실질 결과변수"
generate double outcome_a = outcome_real
label variable outcome_a "주 결과변수"
generate double outcome_b = outcome_real / baseline_size
label variable outcome_b "규모 조정 결과변수"

isid entity_id year
assert !missing(entity_id, year)
compress
save "$data/final/analysis_panel.dta", replace
