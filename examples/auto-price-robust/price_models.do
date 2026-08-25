version 18.0
clear all
set more off

* Stata 내장 자동차 횡단면 자료를 불러오고 분석변수의 완전성을 확인한다.
sysuse auto, clear
isid make
count
display "AUTO_SOURCE_N=" r(N)
count if missing(price, mpg, weight, foreign, headroom, trunk)
assert r(N) == 0

* 결과변수는 price이며 전체 비결측 표본에서 이분산-강건 표준오차를 사용한다.
* 사양 1: mpg만 포함한다.
regress price mpg, vce(robust)
display "MODEL_1_N=" e(N)
quietly summarize price if e(sample), meanonly
local mean_m1 = r(mean)
outreg2 using "price_robust_models.xls", replace excel dec(3) adjr2 addstat(Dep. variable mean, `mean_m1')

* 사양 2: mpg에 차량 중량을 추가한다.
regress price mpg weight, vce(robust)
display "MODEL_2_N=" e(N)
quietly summarize price if e(sample), meanonly
local mean_m2 = r(mean)
outreg2 using "price_robust_models.xls", append excel dec(3) adjr2 addstat(Dep. variable mean, `mean_m2')

* 사양 3: mpg와 중량에 국내외 구분을 추가한다.
regress price mpg weight i.foreign, vce(robust)
display "MODEL_3_N=" e(N)
quietly summarize price if e(sample), meanonly
local mean_m3 = r(mean)
outreg2 using "price_robust_models.xls", append excel dec(3) adjr2 addstat(Dep. variable mean, `mean_m3')

* 사양 4: mpg, 중량, 국내외 구분에 실내 높이와 트렁크 크기를 추가한다.
regress price mpg weight i.foreign headroom trunk, vce(robust)
display "MODEL_4_N=" e(N)
quietly summarize price if e(sample), meanonly
local mean_m4 = r(mean)
outreg2 using "price_robust_models.xls", append excel dec(3) adjr2 addstat(Dep. variable mean, `mean_m4')

display "AUTO_PRICE_ROBUST_COMPLETE"
