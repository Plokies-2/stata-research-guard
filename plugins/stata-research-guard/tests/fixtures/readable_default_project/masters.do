* Project Inputs: data/raw/source_panel.dta
* Project Outputs: data/final/analysis_panel.dta, table/summary_statistics.xlsx, table/regressions.xls, figures/summary_bar.pdf, ster/outcome_a.ster, ster/outcome_b.ster

version 18.0
global project = c(pwd)
global data "$project/data"
global table "$project/table"
global figures "$project/figures"
global ster "$project/ster"

log using "$project/do/main.log", replace text

* Input: data/raw/source_panel.dta
* Output: data/final/analysis_panel.dta
* 공통 전처리를 완료하고 분석용 패널을 저장한다.
do "$project/do/build_analysis_panel.do"

* Input: data/final/analysis_panel.dta
* Output: table/summary_statistics.xlsx, figures/summary_bar.pdf
* 같은 분석용 패널에서 기초통계 표와 막대그래프를 만든다.
do "$project/do/build_summary.do"

* Input: data/final/analysis_panel.dta
* Output: table/regressions.xls, ster/outcome_a.ster, ster/outcome_b.ster
* 같은 분석용 패널에서 회귀표와 재사용 추정치를 만든다.
do "$project/do/run_regressions.do"

log close
