version 18.0
clear all
set more off
set linesize 120
args root
cd "`root'"
capture mkdir estimates
capture mkdir tables
capture mkdir figures
capture log close
log using "analysis_run.log", text replace

* Common complete-case sample for comparable outcome/specification columns.
sysuse nlsw88, clear
describe
count
local source_N = r(N)
keep if !missing(wage,hours,age,grade,ttl_exp,tenure,union,south,smsa,married) & wage>0 & hours>0
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
isid idcode
assert !missing(ln_wage)
count
display "SOURCE_N = `source_N'; COMMON_N = " r(N)
count if married==1
display "MARRIED_N = " r(N)
summarize wage ln_wage hours age grade ttl_exp tenure union south smsa married
codebook wage hours age grade ttl_exp tenure union south smsa married ln_wage, compact
save "analysis.dta", replace

* Record definitions and exclusions alongside the analysis data.
putexcel set "codebook.xlsx", replace open sheet(Variables)
putexcel A1=("varname") B1=("Item") C1=("Item Name") D1=("format / unit") E1=("note")
putexcel A2=("wage") B2=("wage") C2=("시간당 임금") D2=("달러/시간") E2=("출처: Stata nlsw88, 1988 NLSW extract. 원자료 단위 유지; 결측 및 0 이하 제외.")
putexcel A3=("hours") B3=("hours") C3=("통상 주당 근로시간") D3=("시간/주") E3=("출처: nlsw88 hours (usual hours worked). 결측 및 0 이하 제외.")
putexcel A4=("age") B4=("age") C4=("연령") D4=("년") E4=("출처: nlsw88 age. 결측 제외.")
putexcel A5=("grade") B5=("grade") C5=("완료한 교육연수") D5=("년") E5=("출처: nlsw88 grade (current grade completed). 결측 제외.")
putexcel A6=("ttl_exp") B6=("ttl_exp") C6=("총 근로경력") D6=("년") E6=("출처: nlsw88 ttl_exp. 결측 제외.")
putexcel A7=("tenure") B7=("tenure") C7=("현 직장 근속기간") D7=("년") E7=("출처: nlsw88 tenure. 결측 제외.")
putexcel A8=("union") B8=("union") C8=("노동조합 가입 여부") D8=("0=비가입, 1=가입") E8=("출처: nlsw88 union. 결측 제외; 사양 3에서 연속형 0/1 설명변수.")
putexcel A9=("south") B9=("south") C9=("남부 거주 여부") D9=("0=아니오, 1=예") E9=("출처: nlsw88 south. 결측 제외; 사양 3에서 i.south, 기준=0.")
putexcel A10=("smsa") B10=("smsa") C10=("SMSA 거주 여부") D10=("0=아니오, 1=예") E10=("출처: nlsw88 smsa. 결측 제외; 사양 3에서 i.smsa, 기준=0.")
putexcel A11=("married") B11=("married") C11=("기혼 여부") D11=("0=미혼, 1=기혼") E11=("출처: nlsw88 married. 결측 제외; 기혼 분석은 married==1.")
putexcel A12=("ln_wage") C12=("시간당 임금의 자연로그") D12=("ln(달러/시간)") E12=("출처: nlsw88 wage에서 생성. ln_wage=ln(wage), double 저장. 공통 표본 내 결측 없음.")
putexcel A13=("표본") E13=("위 원자료 변수 10개가 모두 관측되고 wage>0, hours>0인 관측만 유지. 대체 없음. 나머지 원자료 변수는 그대로 보존.")
putexcel A1:E13, font("Malgun Gothic",11) txtwrap
putexcel A1:E1, bold fpattern(solid,lightblue)
putexcel save
mata: book = xl()
mata: book.load_book("codebook.xlsx")
mata: book.set_sheet("Variables")
mata: book.set_column_width(1,2,16)
mata: book.set_column_width(3,3,28)
mata: book.set_column_width(4,4,28)
mata: book.set_column_width(5,5,85)
mata: book.set_row_height(2,13,42)

* Each model stores its own estimation-sample mean before any result reload.
program define store_ymean, eclass
    ereturn scalar ymean = r(mean)
end
foreach sample in full married {
    local restriction ""
    if "`sample'" == "married" local restriction "if married==1"
    foreach outcome in wage ln_wage hours {
        regress `outcome' age grade `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m1.ster", replace

        regress `outcome' age grade ttl_exp tenure `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m2.ster", replace

        regress `outcome' age grade ttl_exp tenure union i.south i.smsa `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m3.ster", replace
    }
}

* Native combined table retains coefficient identities and base categories.
foreach sample in full married {
    foreach outcome in wage ln_wage hours {
        estimates use "estimates/`outcome'_`sample'_m1.ster"
        estimates store M1
        estimates use "estimates/`outcome'_`sample'_m2.ster"
        estimates store M2
        estimates use "estimates/`outcome'_`sample'_m3.ster"
        estimates store M3
        estimates table M1 M2 M3, b(%10.6f) se(%10.6f) stats(N r2 ymean) allbaselevels nofvlabel
        putexcel set "tables/`outcome'_`sample'.xlsx", replace open sheet(OLS)
        putexcel A1=("`outcome': `sample' sample")
        putexcel A3=etable
        putexcel A32=("OLS; robust SE below coefficients. M1: age grade; M2 adds ttl_exp tenure; M3 adds union i.south i.smsa.")
        putexcel A33=("ymean: dependent-variable mean in each regression sample. Blank: variable absent; base: reference category.")
        putexcel A1:D33, font("Calibri",11)
        putexcel A1:D1, bold
        putexcel A32:D32, merge txtwrap
        putexcel A33:D33, merge txtwrap
        putexcel save
        mata: book.load_book("tables/`outcome'_`sample'.xlsx")
        mata: book.set_sheet("OLS")
        mata: book.set_column_width(1,1,20)
        mata: book.set_column_width(2,4,19)
        mata: book.set_row_height(32,33,32)
        estimates drop M1 M2 M3
    }
}

* Full common-sample distributions, with no trimming of the observed range.
foreach outcome in wage ln_wage hours {
    histogram `outcome', percent bins(30) title("`outcome'") subtitle("Full common sample") ytitle("Percent") xsize(9) ysize(5) scheme(s2color)
    graph export "figures/`outcome'_full.pdf", replace
}
display "ANALYSIS COMPLETED: 18 models, 6 workbooks, 3 PDFs."
log close
