
* Table A.7. Summary Statistics

****************************
*  Panel A. Firm-Level Data
****************************

*Top1000

use "$revision/Data/Table1.dta",clear

keep if top1000==1
tabstat lenergy loutput lefficiency soe roa age exp, stat( count mean sd ) columns(s)  save

clear
mat tabB = r(StatTotal)
mat tabA = tabB'
svmat tabA

ren tabA1 Top1000_Obs
ren tabA2 Top1000_Mean
ren tabA3 Top1000_SD

gen name=""
replace name="ln(Energy)" in 1
replace name="ln(Output)" in 2
replace name="ln(Efficiency)" in 3
replace name="Soe" in 4
replace name="ROA" in 5
replace name="Age" in 6
replace name="Export" in 7

gen rank=_n

gen source="CESD" if rank<=3
replace source="ASIF" if rank>3

order source name

tostring Top1000_Obs, force replace format(%9.0f)
tostring Top1000_Mean, force replace format(%8.2f)
tostring Top1000_SD, force replace format(%8.2f)

save "$revision/Data/TableA7_A.dta",replace

*Top10000

use "$revision/Data/Table1.dta",clear

keep if top1000!=1
tabstat lenergy loutput lefficiency soe roa age exp, stat( count mean sd ) columns(s)  save

clear
mat tabB = r(StatTotal)
mat tabA = tabB'
svmat tabA

ren tabA1 Top10000_Obs
ren tabA2 Top10000_Mean
ren tabA3 Top10000_SD

gen name=""
replace name="ln(Energy)" in 1
replace name="ln(Output)" in 2
replace name="ln(Efficiency)" in 3
replace name="Soe" in 4
replace name="ROA" in 5
replace name="Age" in 6
replace name="Export" in 7

gen rank=_n

gen source="CESD" if rank<=3
replace source="ASIF" if rank>3

order source name

tostring Top10000_Obs, force replace format(%9.0f)
tostring Top10000_Mean, force replace format(%8.2f)
tostring Top10000_SD, force replace format(%8.2f)

merge 1:1 source name using "$revision/Data/TableA7_A.dta",update
drop _merge

sort rank
keep source name Top1000_Obs Top1000_Mean Top1000_SD Top10000_Obs Top10000_Mean Top10000_SD
order source name Top1000_Obs Top1000_Mean Top1000_SD Top10000_Obs Top10000_Mean Top10000_SD

save "$revision/Data/TableA7_A.dta",replace

listtex * using "$revision/Appendix_Table/TableA7_A.tex", replace rstyle(tabular)

erase "$revision/Data/TableA7_A.dta"

*************************************************
* Panel B Conglomerate Network: Related Parties
*************************************************

*----------------------------
* CARD & ASIF, Two Level 25%
*----------------------------

use "$revision/Data/TableA7_1.dta",clear

sum same_ind4 if same_ind4==1
local a=r(N)

sum same_ind2 if same_ind2==1
local b=r(N)

sum related if related==1
local c=r(N)

clear
mat A = (`c', `b', `a')
mat B = A'
svmat B

ren B1 Column3
gen Datasets=""
replace Datasets="CARD\&ASIF" in 1
replace Datasets="CARD\&ASIF(same 2-digit industry)" in 2
replace Datasets="CARD\&ASIF(same 4-digit industry)" in 3
order Datasets

save "$revision/Data/TableA7_B.dta",replace

*----------------------
* CARD, Two Level 25%
*----------------------

use "$revision/Data/TableA7_0.dta",clear
keep if type3==1

gen num=_n
sum num
local d=r(N)

clear
mat A = (`d')
svmat A
ren A1 Column3
gen Datasets="CARD"
order Datasets

append using "$revision/Data/TableA7_B.dta"
save "$revision/Data/TableA7_B.dta",replace

*----------------------------
* CARD & ASIF, Two Level 20%
*----------------------------

use "$revision/Data/TableA7_5.dta",clear

sum same_ind4 if same_ind4==1
local a=r(N)

sum same_ind2 if same_ind2==1
local b=r(N)

sum related if related==1
local c=r(N)

clear
mat A = (`c', `b', `a')
mat B = A'
svmat B

ren B1 Column2
gen Datasets=""
replace Datasets="CARD\&ASIF" in 1
replace Datasets="CARD\&ASIF(same 2-digit industry)" in 2
replace Datasets="CARD\&ASIF(same 4-digit industry)" in 3
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta"
drop _merge
save "$revision/Data/TableA7_B.dta",replace

*----------------------
* CARD, Two Level 20%
*----------------------

use "$revision/Data/TableA7_0.dta",clear
keep if type2==1

gen num=_n
sum num
local d=r(N)

clear
mat A = (`d')
svmat A
ren A1 Column2
gen Datasets="CARD"
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta",update
drop _merge

save "$revision/Data/TableA7_B.dta",replace

*----------------------------
* CARD & ASIF, Two Level 51%
*----------------------------

use "$revision/Data/TableA7_7.dta",clear

sum same_ind4 if same_ind4==1
local a=r(N)

sum same_ind2 if same_ind2==1
local b=r(N)

sum related if related==1
local c=r(N)

clear
mat A = (`c', `b', `a')
mat B = A'
svmat B

ren B1 Column4
gen Datasets=""
replace Datasets="CARD\&ASIF" in 1
replace Datasets="CARD\&ASIF(same 2-digit industry)" in 2
replace Datasets="CARD\&ASIF(same 4-digit industry)" in 3
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta"
drop _merge
save "$revision/Data/TableA7_B.dta",replace

*----------------------
* CARD, Two Level 51%
*----------------------

use "$revision/Data/TableA7_0.dta",clear
keep if type4==1

gen num=_n
sum num
local d=r(N)

clear
mat A = (`d')
svmat A
ren A1 Column4
gen Datasets="CARD"
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta",update
drop _merge

save "$revision/Data/TableA7_B.dta",replace

*----------------------------
* CARD & ASIF, Six Level 20%
*----------------------------

use "$revision/Data/TableA7_3.dta",clear

sum same_ind4 if same_ind4==1
local a=r(N)

sum same_ind2 if same_ind2==1
local b=r(N)

sum related if related==1
local c=r(N)

clear
mat A = (`c', `b', `a')
mat B = A'
svmat B

ren B1 Column1
gen Datasets=""
replace Datasets="CARD\&ASIF" in 1
replace Datasets="CARD\&ASIF(same 2-digit industry)" in 2
replace Datasets="CARD\&ASIF(same 4-digit industry)" in 3
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta"
drop _merge
save "$revision/Data/TableA7_B.dta",replace

*----------------------
* CARD, Six Level 20%
*----------------------

use "$revision/Data/TableA7_0.dta",clear
keep if type1==1

gen num=_n
sum num
local d=r(N)

clear
mat A = (`d')
svmat A
ren A1 Column1
gen Datasets="CARD"
order Datasets

merge 1:1 Datasets using "$revision/Data/TableA7_B.dta",update
drop _merge

order Datasets Column1 Column2 Column3 Column4

tostring Column1, force replace format(%9.0f)
tostring Column2, force replace format(%9.0f)
tostring Column3, force replace format(%9.0f)
tostring Column4, force replace format(%9.0f)

save "$revision/Data/TableA7_B.dta",replace

listtex * using "$revision/Appendix_Table/TableA7_B.tex", replace rstyle(tabular)

erase "$revision/Data/TableA7_B.dta"
