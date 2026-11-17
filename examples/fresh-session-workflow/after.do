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
putexcel A2=("wage") B2=("wage") C2=("Hourly wage") D2=("USD/hour") E2=("Source: Stata nlsw88, 1988 NLSW extract. Original units; missing and nonpositive values excluded.")
putexcel A3=("hours") B3=("hours") C3=("Usual weekly hours") D3=("hours/week") E3=("Source: nlsw88 hours. Missing and nonpositive values excluded.")
putexcel A4=("age") B4=("age") C4=("Age") D4=("years") E4=("Source: nlsw88 age. Missing values excluded.")
putexcel A5=("grade") B5=("grade") C5=("Completed years of schooling") D5=("years") E5=("Source: nlsw88 grade. Missing values excluded.")
putexcel A6=("ttl_exp") B6=("ttl_exp") C6=("Total work experience") D6=("years") E6=("Source: nlsw88 ttl_exp. Missing values excluded.")
putexcel A7=("tenure") B7=("tenure") C7=("Current job tenure") D7=("years") E7=("Source: nlsw88 tenure. Missing values excluded.")
putexcel A8=("union") B8=("union") C8=("Union membership") D8=("0=no, 1=yes") E8=("Source: nlsw88 union. Missing values excluded; numeric 0/1 regressor in M3.")
putexcel A9=("south") B9=("south") C9=("South residence") D9=("0=no, 1=yes") E9=("Source: nlsw88 south. Missing values excluded; i.south in M3, reference=0.")
putexcel A10=("smsa") B10=("smsa") C10=("SMSA residence") D10=("0=no, 1=yes") E10=("Source: nlsw88 smsa. Missing values excluded; i.smsa in M3, reference=0.")
putexcel A11=("married") B11=("married") C11=("Marital status") D11=("0=not married, 1=married") E11=("Source: nlsw88 married. Missing values excluded; married sample uses married==1.")
putexcel A12=("ln_wage") C12=("Natural log of hourly wage") D12=("ln(USD/hour)") E12=("Source: nlsw88 wage. ln_wage=ln(wage), stored as double. No missing values in the common sample.")
putexcel A13=("Sample") E13=("Keep observations with all ten source inputs observed, wage>0 and hours>0. No imputation. Other source variables are retained.")
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
