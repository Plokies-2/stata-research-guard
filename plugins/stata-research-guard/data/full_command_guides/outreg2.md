outreg2

---

## Titles & related stuffs

 outreg2 
---
Arrange regression, summary, and tabulation into an illustrative table

 seeout 
---
Opens a tab-delimited table in the data browser

 shellout 
---
Opens documents and their programs from inside Stata

 logout 
---
Converts log or ASCII files into various output formats

 mkest 
---
Convert variables to estimates matrix

## Examples

    0. Basic game plan                  
    1. Prefix and -bys:-                11. Marginal Effects
    2. Running loops                    12. Word or Excel files
    3. Stored estimates                 13. TeX files
    4. Shorthand                        14. Adding column titles or notes
    5. Decimal places                   15. n-way cross-tabulation
    6. Sideway display                  16. Group summary table
    7. Summary tables                   17. Fixed effects or legends
    8. Drop/keep/order variables        18. Stats transformation/manipulation
    9. Adding r( ) e( ) scalars         19. Matching policy variables
    10. Odds ratios and rrr             20. Insert r-class cmd( ) outputs

Frequently asked questions
Terms of Use

---

## Description

outreg2 provides a fast and easy way to produce an illustrative table 
of regression outputs. The regression outputs are produced piecemeal and are 
difficult to compare without some type of rearrangement. outreg2 
automates this process by concatenating the successive regression ouputs in a 
vertical format. The resulting table is saved to the disk in ASCII 
format, which can be read by other programs.

outreg2 thus facilitates the convertion of regression outputs to a standard 
format suitable for inclusion in a scholarly publication. The functionality of outreg2 
is based on the earlier package outreg, by John Gallup. Unlike 
outreg, outreg2 is capable of writing LaTeX-format tables, as well as ASCII, MS Word 
and MS Excel.

outreg2 can report any regression output, provided it conforms to 
the usual convention for ereturn list. This includes 
most regression commands in Stata 7 or later. outreg2 will report the latest regression output 
by default, or the list of stored estimates. The ancillary statistics from from stored 
return can also be accessed using e( ) or adds[tat( )].

outreg2 will also report the usual statistics such as standard error with the asterisks for the levels of 
significance (1%, 5%, and 10%), t-statistics, p-values, the number of observations, 
R-squareds, and the number of groups in a panel estimation. Standarized beta 
coefficients, exponentially transformed coefficients (i.e. odds/risk ratios 
or hazard rate). The user can add their own column titles with ct[itle] and addn[ote] options. 

An immediate access to the produced table is provided in the browser view with 
see option. outreg2 also comes with automatically formatted number of 
significant digits, which avoids the awkward displays assoicated with the fixed 
format.

---

## Syntax

outreg2 [varlist] [estlist]
using filename [, options] [: command] 

outreg2 [varlist] [estlist] 
[, replace seeout] 
[: command] 

where command takes one of estimation commands. The shorthand works 
only after a full syntax has been invoked.

Note that filename must be enclosed within double quotes if it contains embedded spaces.

## Options

replace create a new file or overwrite the existing file.

see[out] display the regression table in the browser.

skip skips a column (adds an empty column).

lab[el] replace variable names with variable labels, also see stats(label)

lab[el( )] takes the following options for label:

    insert - insert labels next to variable names
    proper - proper cases (capitalize the first letter)
    upper - all upper cases
    lower - all lower cases

side[way] specify sideway display (with standard error next to coefficient). Use paren( ) 
or noparen to control the location of parentheses.

long interweave the equation names into the same column 
with the variable names column, the default is usually wide. Also specify text if you want a converted text as well. 

o[necol] specify one column to display multiple equations; the default is usually wide.

wide forces wide format with multiple columns, rarely required.

dta produces Stata file. A suffix "_dta" is added to the file name to prevent the possible loss of main data.

dta(saveold) produces in older Stata file format, as in saveold.

word produces rich text file (rft) compatible with MS Word. The file conversion can be 
specified at any time (you should do it with the last appedning). The existing file must not be open for 
it to be written over.

excel specifies an xml, xls, xlm, or cvs file compatible with a standard spreadsheet 
like MS Excel. Any existing file with the same name must be closed to have it 
replaced with a new file.

tex produces TeX output for a TeX typesetting program such as Scientific Word.

tex( ) takes the following options for tex:

    fragment - a TeX fragment for inclusion in a document
    pretty - with some italics and varying font sizes
    landscape - horizontally

text produces plain text file exactly. long or label will 
sometimes cause the main output text file to be different from what might be 
expected. Use this option to obtain exactly specified text file.

quote specifies quotation marks to encase each observation.  See the noquote 
option in outsheet for more details (all the output of outreg2 comes 
from string variables). quote may cause problems appending tables together. 

comma specifies that the ASCII file output be separated by commas 
rather than by tabs. This can cause problems if any of the user-defined text has 
commas in it (such as variable labels, ct[itle], adds[tat], or 
addn[ote]). If that is the case, consider using quote as well. 

st[ats(stats)] contains statistics to be reported per variable, the default is 
stats(coef se), space or comma separated, restricted to the estimation sample (single equation), will appear 
in the order specified by the user:

coef  se  tstat  pval  ci  ci_low  ci_high  beta 
N  sum_w  mean  Var  sd  sum  min  max  skewness  kurtosis 
p1  p5  p10  p25  p50  p75  p90  p95  p99  
range iqr  cv semean  median  count 
corr covar pcorr semipcorr pcorrpval
spearman tau_a  tau_b

eqname varname aster label label_pr label_up label_low blank

str(str) where str is any string or numeric expression
internally stored and recalled as string1, string2, etc.

cmd(macro: cmd) where macro is to be produced by cmd
internally stored and recalled as cmd1, cmd2, etc.

stnum(commands) applies Stata or user-defined commands to numerical forms of the stats( ), 
use this option for mathematical/numeric operations, comma delimited, use quotes when there is a comma within a command, 
usually limited to stats specified in stats( ), also see ststr( ) below for string operations

ststr(commands) applies Stata or user-defined commands to string forms of the stats( ), 
use this option to attach symbols or concatenate, comma delimited, use compound quotes if there is a comma in the command, 
usually limited to stats specified in stats( ), also see stnum( ) above

ef[orm] specifies coefficients to be reported. This corresponds to or option for 
logit, clogit, and glogit estimation, irr for poisson estimation, rrr 
for mlogit, hr for cox and stcox hazard models, and 
eform for xtgee. The default form of stcox is the hazard rate form; use the eform to report it. 

l[evel(integer)] specifies the confidence level, in percent, for 
confidence intervals. The default is level(95) or as set by set level, 
does not affect the significance levels of asterisks. 

Short-cut for auxillary statistics

nose specifies coefficients reported without std. errors

tstat displays t-statistics under the coefficent

pvalue displays p-values under the coefficent

ci displays conf. intervals under the coefficent

be[ta] displays normalized beta coefficients (see the beta option of regress)

alpha(numlist) specifies the levels of significance, separated by comma 
from the most significant to the least signficiant. Example: alpha(0.001, 0.01, 0.05). Up to 3 are automatically 
assigned asterisks. If more than 3 levels are defined, then the symbols must be specified with sym[bol(text)]. 

sym[bol(text)] specifies symbols for the levels of significance from the most significant 
to the least significant, the default sym[bol(***, **, *)]. The significance levels of 0.01, 
0.05, and 0.10 will be automatically assigned in that order. If more than 3 symbols are assigned, then the 
same number of levels of significance must be specified using alpha( ).

aster[isk( )] specifies asterisks to be placed next to them; default stats(coef).

noas[ter] no asterisks denoting statistical significance 
levels be reported. 

2aster specifies ** for 1% and * for 5% 

10pct equivalent to sym[bol(**, *, +)]

auto(integer) the number of automatically formatted decimals, the default is auto(3), 
i.e. three significant digits not counting the ones (i.e. the digit to the left of the decimal point). 
This means 1.234 and 0.123 might be displayed, while 12.345 or 0.1234 will be trimmed. A probable integer 
is reported without decimals. A very large or small number will be displayed in 
exponential format. Specify dec( ) or bd[ec( )] to disable it. 

less(integer) specifies how many less significant digits to be 
displayed for the auxiliary (non-coefficient) statistics. The default is less(0), meaning no less.

decm[ark( )] contains the decimal marker; default decm[ark(.)]

fixed decimals & formats

        dec(#) or fmt(type) for everything, default dec(3) and fmt(fc)

where # is fixed decimals between 0 and 11, 
and type is one of the following:

         e   exponential
         f   fixed
         fc  fixed with commas for thousands
         g   general
         gc  general with commas for thousands

        Use the following only if you want them different from dec(#) or fmt(type):

        bd[ec(#)] or bf[mt(type)] for coefficient only
        sd[ec(#)] or sf[mt(type)] for standard error
        td[ec(#)] or tf[mt(type)] for t-statistics
        pd[ec(#)] or pf[mt(type)] for p-value
        cd[ec(#)] or cf[mt(type)] for conf. interval
        rd[ec(#)] or rf[mt(type)] for r-square
        ad[ec(#)] or af[mt(type)] for addstat( ) contents

ti[tle(list)] titles for your table; comma separated; use quotes for commas within a title. 
Titles can be added at any time. To erase your title, encase a space between quotes like this: title(" ")

ct[itle(list)] column titles; comma separated for each additonal row; semi-colon for each additional column; 
use quotes if comma is part of title. Example: ctitle("Wage, Participation","Wage: Participation"). To specify empty column title, specify 
ctitle(" ").

cttop(list) place additonal column titles on the top; comma separated, use quotes for multiple column titles.

addn[ote(list)] add your own notes at the bottom. Must be specified in the first outreg2 
call when regression results are appended together. A blank line can be inserted by including "" as a note.

nonot[es] specifies that notes and legends explaining the standard errors, asterisks, etc., not be included.

par[en(stats)] specifies parenthesis ( ) to be placed around the same list as stats( ).

nopa[ren] specifies no parentheses be placed around standard 
errors, t-statistics, standard errors, etc. 

br[acket] specifies square brackets [ ] be used rather than 
parentheses ( ) around standard errors, t-statistics, etc. 

br[acket(stats)] specifies square brackets [ ] to be placed around the same list as stats( ).

e(scalars) reports e-class scalars at the bottom of the table. 
They may be requested individually, as in e(N ll r2), or for all, by specifying e(all). 
The reported e-class statistics are automatically formated by auto-digits, unless ade[c] 
has been specified for it. 

adds[tat(name, stats, ..)] access e-class, r-class, s-class 
scalar statistics, or just plain numbers in new rows below the R-squared (if shown). Comma separted. 
The user must specify both a name and a value for the statistic. See example.

addtext(name, text, ..) specifies user-added text (including 
numbers) to be displayed in new lines below the R-squared (if shown). Unlike adds[tat], 
addt[ext] will not format numbers nor try to interpret any e-class text (such as e(N) or e(title)). 

ad[jr2] specifies that the adjusted R-squared be reported rather than the regular R-squared 
when available.

nocon[s] specifies that the intercept (constant) be not reported.

noni specifies that the number of groups in a panel data regression 
not be reported (e.g. the number of groups specified by the i( ) variable in xtreg).

nor[2] specifies that no R-squared (or adjusted R-squared) be reported.

noobs specifies no number of observations is to be reported.

depvar Include depdendent variable.

nodepvar Attempt to drop depdendent variable.

policy(varlist) Match policy variables across regressions.

drop(varlist) Drop these variables. Do not include the dependent variable in this list.

keep(varlist) Keep and report these variables. 

eqdrop(eqlist) Drop these equations from the table 

eqkeep(eqlist) Keep and report these equations. 

sortvar(varlist) Sort and order variables; non-existent variable names are ignored.

groupvar(names) Sort and order variable; non-existent names are inserted as super-rows or row-heading.

mfx reports marginal effects as computed by mfx. It will reported marginal 
effects instead of estiamted coefficients. 

m[argin(u|c|p)] the unconditional, conditional, and probability marginal 
effects for truncreg, marginal from STB 52, or dtobit from STB 56. 
One of u, c, or p is required after dtobit, corresponding to the unconditional, 
conditional, and probability marginal effects, respectively. It is not necessary to specify 
margin after dprobit, dlogit2, dprobit2, or dmlogit2.

sum summary be reported after a regression command, restricted to the estimation sample, i.e. e(sample)==1, 
unless no regress exists or raw option specified. This is the same as stats(mean sd).

raw do not restrict the sample to e(sample) or perform casewise dropping. Currently works only with sum. 
The number of observation reported is the maximum.

sum(log) summary table just like the one from log file. Default is raw (no casewise dropping). 
Use eqdrop( ) or eqkeep( ) to get what you want.

sum(detail) detailed summary table.  Default is raw (no casewise dropping). 
Use eqdrop( ) or eqkeep( ) to get what you want.

cross[tab] n-way cross-tabulation. Varlist is required. The first 
variable must be counting numbers, i.e. 0, 1, 2, etc., and the rest must be non-strings. See example below. 

slow(#) specifies # of milli-second delay. Specify slow(100) or larger if you are getting 
"could not be openend r(603)" error; it's probably either (1) your storage device is running too slow, or 
(2) you don't have write-access, in which case you need to change working directory 
with cd.

---

## Example 0. Basic game plan

You should specify the current directory where all the files will be stored. Alternatively, you 
can specify the complete pathway from within outreg2, but you need to 
encase it with quotations marks. Either way, you must have write-access to that folder. Otherwise you get r(603) error.

cd "C:\Users\yourname\Documents\"    /* or whatever your directory may be */
sysuse auto,clear
regress mpg foreign weight headroom trunk length turn displacement
outreg2 using myfile, replace cttop(full)
regress mpg foreign weight headroom
outreg2 using myfile, see word excel tex dta

You can immedicately see the changes. The variable "weight" loses some of its significance 
in the full specification. The estimated effect of weight can be shown to be downward-biased from 
-0.00420 to -0.00647 by omitting a number of covariates. This is an easy way to check for 
collinearity and misspecification.

You can use e( ) or addstat( ) option to augment the standard 
regression results with other e-class statistics (scalar only). addstat can handle 
r-class and s-class results as well, if they exist. The following codes are equivalent 
excpet in appearance.

outreg2 using myfile, e(r2 ll)
outreg2 using myfile, addstat(R-squared by hand, e(r2), Log Lik, e(ll))

If you want to see everything available in the e-class, do it like this:

outreg2 using myfile, e(all)

## Example 1. Prefix and -bys:-

outreg2 can be used in as a prefix.

sysuse auto, clear
outreg2 using myfile, replace ti(Car stuff): reg price mpg weight turn
outreg2 using myfile, see excel: reg price mpg weight turn if price > 6100

It is also byable with -bys:- prefix.

bys foreign: outreg2 using myfile, side replace see: reg rep78 head weight gear length turn [aw=mpg]

## Example 2. Running loops

Because this involves a loop, you must copy and paste into a do-file:

sysuse auto,clear
cap erase myfile.txt
forval num=1/5 {
regress mpg weight headroom if rep78==`num'
outreg2 using myfile
}
seeout

Alternatively, make use of macro

local replace replace
forval num=1/5 {
regress mpg weight headroom if rep78==`num'
outreg2 using myfile, `replace' 
local replace
}

## Example 3. Stored estimates

You can automatically recall the stored estimates by specifying them from 
within outreg2. To distinguish them from the varlist, place the estlist 
within a pair of [square brackets].

sysuse auto,clear
regress mpg foreign weight headroom trunk length turn displacement

est store Full
regress mpg foreign weight headroom

est store Restricted1
regress mpg foreign weight

est store Restricted2
outreg2 [Full Restricted1 Restricted2] using myfile, replace see

outreg2 will take the stored estimates as wildcards (*). Try this:

outreg2 [*] using myfile, see replace
outreg2 [R*] using myfile, see replace

The varlist may be combined with the estlist. The varlist will take the 
wildcards as well, provided they exist in the estlist.

outreg2 foreign weight [*] using myfile, see replace

If you are specifying the varlist, you must make certain the desired varlist 
exists in all the stored estiamtes. Since not all equations may contain the 
specified varlist, it is usually a poor idea to combine the one column option 
with the varlist.

## Example 4. Shorthand

outreg2 will remeber the last set of options you specified until the end of
the day. The stored command will expire at mid-night to prevent the possible 
loss of finished table by inadvertantly writing over a finished file. The 
following shorthand should be tried separately.

outreg2
outreg2, replace
outreg2, seeout

The following two options are excluded from the stored command: 
seeout and replace. These two must be specified each time you invoke outreg2
through the shorthand. To change the stored options, you must invoke the full 
syntax with the specified using file (i.e. outreg2 using myfile, etc). The varlist 
and the stored estimates names are not stored with the command.

For someone who is in a hurry, outreg2 will take the following syntax, provided 
the desired options have been stored by invoking them in the full syntax. The 
varlist and/or the estlist are still allowed under this syntax. This 
pre-command syntax is made available for the benefit of iterative users.

outreg2 : reg mpg foreign weight headroom
outreg2, replace : reg mpg foreign weight headroom
outreg2
seeout

## Example 5. Decimal places

By default the regression coefficients are shown with auto-digits, 
but a user may wish to specify their own number of decimals places. We could use 
the option dec(5) to display 5 decimal places for all statistics or bdec(5) 
for just the coefficient, sdec(5) just for standard error, etc.

outreg2 using myfile, replace auto(4)
outreg2 using myfile, dec(5)
outreg2 using myfile, bdec(5) bfmt(f) sdec(7) sfmt(e) see

## Example 6. Sideway display

Medical journals often requires the displays to go sideways. Use side[way] to make this 
happen. side[way] is compatible with st[ats( )].

outreg2 using myfile, sideway stats(coef aster se) noparen dec(3) replace

Note the above code is equivalent to building the table one column at a time like this:

outreg2 using myfile, stats(coef) replace noparen dec(3)
outreg2 using myfile, stats(aster) noparen dec(3)
outreg2 using myfile, stats(se) noparen dec(3)

Some journals often prefer t-statistics to standard errors
and don't use asterisks to denote statistical significance. Some people use brackets. The 
title( ) option requires quotation marks when it contains a comma. Note that dec decimal 
option apply to both the coefficients and the standard errors.

regress mpg foreign weight
outreg2 using myfile, tstat bracket noaster title("No standard errors!")
seeout

## Example 7. Summary tables

Use sum to place summary statistics into a table. The sample mean and the standard 
deviation for the sample used in the earlier regression will be automatically displayed.

* After estimation
sysuse auto, clear
reg mpg price rep weight length
outreg2 using myfile, sum replace
outreg2 using myfile, see

* Regular summary table
* note: version 11 and above requires clear* to prevent mismatch between e(b) and e(sample)
clear*
sysuse auto, clear
outreg2 using myfile, sum(log) replace eqdrop(N mean) see
outreg2 using myfile, sum(detail) replace eqkeep(N max min) see
outreg2 using myfile, sum(detail) replace see

## Example 8. Drop/keep/order variables

Specifying a varlist can be convenient to limit the output 
table to only the essential coefficients.  For example, we may want to control for
the influence of dummy variables, but not report their estimated coefficients.

sysuse auto, clear
tab rep78, gen(repair)
regress mpg foreign weight repair1-repair4
outreg2 weight foreign using myfile, drop(repair*)

Alternatively, keep( ) and drop( ) can be used to control the displayed 
variables. Use nocons to drop constants. 

outreg2 using myfile, drop(repair*) replace
outreg2 using myfile, keep(mpg foreign)
outreg2 using myfile, nocons
seeout

There are several ways to order variables in the output. The first is 
to order them when running regression. The second way is to specify varlist 
from within outreg2. Or you might try sortvar( ) or groupvar( ).

* single equation
reg mpg rep78 head trunk weight
outreg2 using myfile, replace sortvar(trunk turn)
reg mpg rep78 head weight turn disp gear
outreg2 using myfile, sortvar(trunk turn) see

* multiple equations
reg3 (mpg rep78 head trunk weight) (head trunk weight rep78 gear)
outreg2 using myfile, replace long
reg3 (mpg rep78 head weight turn disp ) (mpg rep78 head trunk weight gear)
outreg2 using myfile, sortvar(trunk turn) see long

* groupvar( ) will create super-rows
reg mpg rep78 head trunk weight
outreg2 using myfile, replace
reg mpg rep78 head weight turn disp gear
outreg2 using myfile, groupvar(Group1 trunk turn head weight Group2) see

## Example 9. Adding r( ) e( ) scalars

Additional statistics may be added with adds[tat( )] or addt[ext( )]. Values stored in 
macros r( ), e( ), or s( ) can be included directly. You can see what values are available by typing 
ereturn list or return list.

To test the equality of two of the estimated coefficients and report the results in the table, note 
that test will sometimes return chi-squared, then you would instead use addstat(chi-square test, r(chi2)):

reg mpg foreign weight length
test foreign length
`"outreg2 using myfile, adds(F-test, r(F), Prob > F, `r(p)') replace"'
seeout 

To add results of lincom postestimation command to a table:

sysuse auto, clear
reg price mpg rep78 head
lincom mpg + rep
local tstat=r(estimate)/r(se)
local pval = tprob(r(df), abs(`tstat'))
outreg2 using "myfile", adds(joint, r(estimate), t-stat, `tstat', p-val,`pval') replace see

In some cases it is better to save the value of a previously calculated 
statistic in a local macro and then put that into adds[tat( )]:

regress mpg rep78 headroom
test rep78
local F1 = r(F)
test headroom
outreg2 using 2test, addstat(Test1 F, `F1', Test2 F, `r(F)')

If it is missing, outreg2 will automatically calculate e(p), which is presumably 
the F-test or chi-square-test of significance of a regression.

outreg2 using myfile, addstat(F test, e(p))

Another example would be to report a pseudo R-squared 
after a logit estimation, which outreg2 does not otherwise report.

logit foreign price trunk weight
outreg2 using myfile, addstat(Pseudo R-squared, `e(r2_p)')

## Example 10. Odds ratios and exponentials

Odds ratios are exponential transformations of coefficients. As noted above, 
there is no way of knowing after an estimation command if the 
user chose to report the exponentiated form of coefficients.  The user must 
choose the eform option in outreg2 to get the same form of the coefficients
displayed by the estimation into the outreg2 table.

For duration models, the exponential form is known as the hazard ratio. For 
other models it is known as odds ratio, relative risk ratio, or incidence rate 
ratio.

sysuse auto,clear
logit foreign price mpg rep78, or
outreg2 using myfile, replace cti(raw)
outreg2 using myfile, eform cti(odds ratio) see

* Alternatively:
outreg2 using myfile, stnum(replace coef=exp(coef), replace se=coef*se) cti(odds ratio) see

Note that coef was first transformed, then used to calculate se in the example above.

## Example 11. Marginal Effects

mfx option can be used to report marginal effects after mfx command 
has been applied.
sysuse auto, clear
logit foreign mpg rep78 head
mfx compute
outreg2 using myfile, replace
outreg2 using myfile, mfx ctitle(mfx) see

margins will report it as well.
sysuse auto, clear
logit foreign mpg rep78 head
margins, dydx(_all) post
outreg2 using myfile, ctitle(margins) see

For multiple outcomes, you may want to use mfx2 by Ricahrd Williams or 
search margeff by Tamas Bartus. They are both available from ssc. 

margeff example:
sysuse auto, clear
mlogit rep turn mpg price
margeff, at(mean) replace
outreg2 using myfile, cttop(margeff) see replace

mfx2 runs a little slower:
sysuse auto, clear
mlogit rep turn mpg price
mfx2, replace
outreg2 using myfile, long cttop(mfx2) see replace

The marginal effects reported by search dprobit, dlogit2, dprobit2, 
and search dmlogit2 are automatically reported by outreg2.

Because truncreg, marginal, and dtobit report 
both regression coefficients and marginal effects, the user must specify the 
margin option for outreg2 report the marginal effects.

search dtobit, on the other hand, calculates three different marginal effects. 
The user must specify which marginal effect, the unconditional, conditional, 
or the probability uncensored, to be reported. Note that "version 6" must be set for 
dtobit to work.

 tobit mpg trunk weight, ll(17)"' — `"version 6
 dtobit"' — `"version 6
outreg2 using myfile, margin(u) ctitle(Unconditional) nor2 replace
outreg2 using myfile, margin(c) ctitle(Conditional) nor2
outreg2 using myfile, margin(p) ctitle(Probability) nor2 see

## Example 12. Word or Excel files

Use word or excel for automatic generation of Word/Excel files:

reg price mpg rep78 headroom trunk weight
outreg2 using myfile, word excel replace

Follow these directions for manual conversions from .txt files:

In MS Word, open or insert the file created by outreg2. Select the estimation text that 
is in columns (not the notes at the bottom of the table or the title at the top, if any), and choose 
Table, Convert Text to Table.

To shift the table within MS Word, highlight the entire table, choose Table 
Properties (go the top menu, drag down on the Table option), and then click the alignment as 
Left instead of Center. 

In Excel, open the file created by outreg2 and follow the default choices 
in the Text Import Wizard (if you do not see the file, choose All Files as the File Type). 
Prevent the conversion of the parenthesis into a negative number (an accounting convention) 
by doing the following: 1. import it as "Delimited", 2. choose Tab as the Delimiters, and 
3. Choose "Text" as Column data format after Highlighting all the columns by shift-down, right-clicking.

To export the .xml table to a word processor, you should separately copy the table and the notes 
at the bottom of the table (prevents the notes from taking up too much space). You 
can avoid this problem by opening the .txt file manually from inside MS Excel, 
as detailed earlier, or copy and paste the notes into another cells in 
MS Excel, which will cause them to be displayed properly. 

To get rid of "green tabs" in Excel: From inisde Excel, Tools > Options > Error Checking. 
When you get there, uncheck "Number stored as text". No more green triangles.

You can also use Stat/Transfer (http://www.stata.com/support/faqs/data/convert2.html) 
if you have one. Choose ASCII-Delimited as the input file and choose Excel 
as the output file. You will need to adjust the column widths from inside 
Excel.

## Example 13. TeX files

LaTeX compatible table can be created with tex option. With the use 
of free conversion software, such as MiKTeX, you can create Adobe PDF files of 
the finished tables directly within Stata by invoking a shell command.

regress mpg foreign weight
outreg2 using myfile, tex replace

Free TeX-to-PDF conversion software are available, such as the MiKTeX (www.miktek.org) for 
Windows or teTeX (www.tug.org/teTeX/) for Unix/Linux. They can be invoked with a shell command:

!texify -p -c -b --run-viewer myfile.tex  {using MiKTeX on Windows)
!pdflatex myfile                          (using teTeX on Linux)

outreg2 cannot append TeX format tables to one another, so regressions must be 
appended in ASCII form until the last regression, which is appended with the 
tex option.

The base font point size of tex in a TeX table can be specified with the tex( ) 
parameter. TeX only allows font sizes of 10 and 11 points besides the default
of 12 point. The texfrag option creates a TeX fragment for inclusion in a larger 
TeX document. For example, a TeX fragment table from the first regression above could be created with 

outreg2 using myfile, tex(frag)

and then be included in the following TeX document with the \inputmyfile 
command:

        \documentclass[10pt]
        \begin
        ... text before inclusion of table myfile.tex ...
        \inputmyfile
        ... text after inclusion of table myfile.tex ...
        \end

Technical Note: Non-alphanumeric characters often have special meaning 
in TeX, namely _, %, #, $, &, ~, ^^, \, .  To print them like any other 
character, include a \ in front of the character. outreg2 automatically does this for 
the first two, _ and %. You can include the other characters in titles,
variable labels, or notes if you preceed them with with a \ in the Stata text.
The exception is \ itself; \ must be replaced with $\backslash$ to render
properly in TeX.

In addition, in TeX the characters <, >, and | will only appear as themselves 
in math mode, so they must be written as $<$, $>$, and $|$.

TeX codes can be inserted into outeg2 titles, variable labels, and added 
notes. This requires understanding TeX formatting codes. The example below 
creates a Greek letter chi with a squared exponent for a chi-squared test 
statistic.

outreg2 using myfile, addstat($\chi^2$, 22.1) tex

Note that outreg2 will automatically convert < or > but not chi^2.

`"outreg2 using myfile, addstat(LR $\chi^2$, e(chi2), Prob < $\chi^2$, e(p)) tex"'

outreg2 automatically converts _ to \_, except 
when it finds two $'s in the text, in which case it assumes the _ is a 
subscript designator in a TeX inline equation. That means that if you want to 
add text that includes an inline equation, but you really want the _ to appear 
as such in the TeX table, you must replace it with a \_.

Stata will interpret $ immediately followed by a letter as a global macro. To 
get Stata to output a literal $, insert an escape character "\" like this: \$. 
R-squared, for example, must be "\$R^2$" rather than "$R^2$" because $R would be evaluated 
as the value of global macro R.

Putting a literal "$" in TeX output can be confusing: to get "$US" in the TeX 
output, for example, one needs "\$US" in the TeX input file, which requires  
"\\\$US" in Stata text, because Stata resolves "\\" into "\" and "\$" into "$".

A final quirk: you cannot use the results of the Stata macro $S_FN in outreg2
text for a TeX table if you use Microsoft Windows. $S_FN returns the path name 
for the current data file which in Windows includes \ characters which will 
prevent the TeX table from rendering properly.

## Example 14. Adding column titles or notes

You can add a column title "Base case (mpg)" to distinguish this regression from a 
second regression. No quotation marks are required around the column title because 
it does not contain commas. Use cttop( ) to add additional column title to the default column titles.

outreg2 using myfile, replace ctitle(Base case (mpg))
outreg2 using myfile, cttop(On top)

You can add explanatory note at the bottom of a column using the addn[ote] option.
Note that since the text in addn[ote] does not contain parentheses or commas
it does not need quotation marks.

outreg2 using myfile, addnote(Dummy variables not shown) 

addnote for inserting a blank line, followed by the time the program was run (from the 
built-in Stata functions $S_TIME and $S_DATE), and the dataset used by the 
estimation (from the Stata function $S_FN).

regress mpg foreign weight length
`"outreg2 using myfile, addn("", "Time $S_TIME, $S_DATE", Data from $S_FN) replace"' 

## Example 15. n-way cross-tabulation

n-way tabulation likes of which are also produced by tab3way or table. It will take about a minute to run.

* Prepare data
sysuse auto, clear
egen mileage=cut(mpg), group(10)
egen paid=cut(price), group(3)
egen heavy=cut(weight), group(3)

* 3-way cross-tabulation sideway
outreg2 mileage paid heavy using myfile, see replace cross side

* 5-way cross-tabulation without percentage
outreg2 mileage paid foreign rep78 heavy using myfile, see replace cross stats(coef)

## Example 16. Group summary table

sysuse auto, clear
gen white=cond(uniform( )>.5,1,0)
gen black=cond(white==1,0,1)
gen male=cond(uniform( )>.5,1,0)
gen female=cond(male==1,0,1)

* do it with -bys:-
 outreg2 using myfile, sum(log) eqkeep(mean N) drop(white female male black) excel replace"' — `"bys male black

* do it by hand
outreg2 using myfile if white==1 & male==1, sum(log) eqkeep(mean N) cttop(white, male) drop(white male female) excel replace
outreg2 using myfile if white==1 & female==1, sum(log) eqkeep(mean N) cttop( , female) drop(white male female) excel
outreg2 using myfile if white==1, sum(log) eqkeep(mean N) cttop( , total) drop(white male female) excel
outreg2 using myfile if black==1 & male==1, sum(log) eqkeep(mean N) cttop(black, male) drop(white male female) excel
outreg2 using myfile if black==1 & female==1, sum(log) eqkeep(mean N) cttop( , female) drop(white male female) excel
outreg2 using myfile if black==1, sum(log) eqkeep(mean N) cttop( , total) drop(white male female) excel

## Example 17. Fixed effects or legends

Two-way fixed-effects estimation with dummy indicators:

* set up data
sysuse auto, clear
ren rep78 state
ren turn id
keep id price mpg weight state
tab state, gen(ST)

* regress and report
xtreg price mpg weight ST*, fe i(id)
outreg2 using myfile, replace drop(ST*) addtext(State FE, YES, Year FE, YES)
xtreg price mpg weight ST*, fe i(id)
outreg2 using myfile, drop(ST*) addtext(State FE, NO, Year FE, YES)
reg price mpg weight ST*
outreg2 using myfile, drop(ST*) addtext(State FE, NO, Year FE, NO)

* legend
outreg2 using myfile,  st(str(Coef) str(Stn Err) str(Spearman)) noparen ct(Legend) replace
outreg2 using myfile,  st(coef se spearman blank)

## Example 19. Matching policy variables across regressions

The following matches the variables of interest as "Policy" and their names in the column title.

sysuse auto, clear
local replace replace
foreach var in length turn displacement {
reg price weight gear_ratio foreign `var'
     outreg2 using this, `replace' policy(`var') sortvar(Policy) 
     local replace
}

## Example 18. Stats transformation/manipulation

The contents of stats( ) can be manipuated with standard Stata commands.

Use stnum( ) to work with numerical forms.

* multiply by 100
sysuse auto, clear
reg mpg price weight
outreg2 using myfile, replace
outreg2 using myfile, stats(coef se) stnum(replace coef=coef*100, replace se=se*100)

* exponentiate both coef and se
outreg2 using myfile, stats(coef se) stnum(replace coef=exp(coef), replace se=coef*se)

* absolute value of t-statistics
outreg2 using myfile, stats(coef tstat) stnum(replace tstat=abs(tstat))

Use ststr( ) to apply string operations.

* add dollar-sign ($) for the mean of price
reg mpg price weight
outreg2 using myfile, stats(mean) ststr(replace mean="$"+mean if varname=="price") replace

* add "max" to maximum and "min" to minimum
outreg2 using myfile, stats(max min) ststr(replace max="max "+max if max~="", replace min="min "+min if min~="")

Use stnum( ) and ststr( ) together.

* multiply by 100 and add percent (%) sign
outreg2 using myfile, stats(mean) stnum(replace mean=mean*100) ststr(replace mean=mean+" %" if mean~="")

* You can automate this process by writing your own programs and inserting them like this:

prog drop _all
prog define percent
	replace mean=mean*100
end

prog define symbol
	replace mean=mean+" %" if mean~=""
end

outreg2 using myfile, stats(mean) stnum(percent) ststr(symbol)

* To manipuate string based on numerical content, generate a numerical copy in stnum( ):
outreg2 using myfile, stats(mean) stnum(gen temp=mean) ststr(replace mean="Positive" if temp>0)

* To concatenate (currently works only with major statistics, i.e. coef, se, tstat, etc.:
outreg2 using myfile, stats(coef) ststr(replace coef=coef+" "+se) noaster

## Example 20. Insert r-class cmd( ) outputs

You can insert output from r-class command in the table body through cmd( : ) sub-option. Indep and dependent 
variables will be fed to them.

* outputs Kendall's tau-a and tau-b
sysuse auto, clear
reg rep78 headroom length turn gear_ratio
outreg2 using myfile, replace stats(corr, spearman, cmd(r(tau_a): ktau), /*
*/cmd(r(tau_b): ktau))

* double-check
ktau rep78 headroom
ret list

Write and insert your own r-class output

You can write your own r-class program and insert their outputs. A scalar should be returned 
on two inputs: independent variable and dependent variable. It needs to accept [if] syntax. 
c_local programs will work, too, but there might be a conflict.

* r-class program that calculates coefficient of variation
cap prog drop coefvar
prog define coefvar, rclass
syntax varlist(max=2) [if]
gettoken dep indep : varlist
qui sum `indep' `if'
local variation=`r(sd)'/`r(mean)'*100
ret scalar variation=`variation'
end

* test your r-class program
sysuse auto, clear
reg rep78 headroom length turn gear_ratio
coefvar rep78 headroom if e(sample)
ret list

* run them
sysuse auto, clear
reg rep78 headroom length turn gear_ratio
outreg2 using myfile, replace stats(coef, se, sd, cmd(r(variation): coefvar))

* return c_local instead of r-class scalar
cap prog drop coefvar2
prog define coefvar2
syntax varlist(max=2) [if], [proportion]
gettoken dep indep : varlist
qui sum `indep' `if'
local hundred 100
if "`proportion'"=="proportion" {
local hundred 1
}
local variation=`r(sd)'/`r(mean)'*`hundred'
 c_local variation=`variation'
end

* run them
sysuse auto, clear
reg rep78 headroom length turn gear_ratio
outreg2 using myfile, stats(coef, se, sd, cmd(variation: coefvar2, proportion))

## Send one to the e-mail address below

Programs like these can made into a sub-option for inclusion the future versions. 
Please note that it should be something of interest to other people.

---

## How to report a possible error

1. it's best if you send an example using -sysuse- or -webuse- data
2. create a trace log file containing the error
3. Send them to whoever wrote the thing and ask nicely.

    cap log close
    log using mylog.txt, text replace
    which outreg2                 /* or whatever command you are dealing with */
    cret list
    sysuse auto, clear            /* or whatever data you are using */
    reg rep78 trunk turn foreign  /* or whatever you are doing */
    set trace on
    outreg2 using myfile, replace /* or whatever that gets you the error */
    log close

---

## Frequently asked questions

Q: Why isn't adoupdate working with outreg2?
A: Stata will refuse to update a package if it is incorrectly dated, i.e., backdated at the SSC. 
This has been fixed. To force it to update, you would had to uninstall first (scc uninstall outreg2).

Q: How do I report the first-stage from ivregress?
A: This has been the most frequently asked question with outreg2. What had been requested was a full 
compatibility with the rest of Stata, i.e., factor variables, post estimation commands, etc. This was impletemented 
for the first time by ivregress2, which was the first to extend the official version in about 5 or 6 years.

Q: What error is "could not be openend r(603)"?
A: That usually comes up if you don't have write-acces to the folder. Use -cd- to change the pathway.

Q: Should I use LaTeX?
A: You are probably better off with Word/Adobe conversion to pdf. Most people do it that way. 
LaTeX is great if you actually write lots of equations or white papers - only a small percentage of Stata users do that.

Q: Can I use Stata with Excel? Windows? 
A: Virutally all empirical researchers use Excel. Stata grew up with PC. Microsoft Office is currently the 
defacto standard in academia. I am not sure why this was an issue.

## Terms of use

In my experience economists, particularily health economists, are very generous with their time 
and resources. We often share codes and data sets, some of which are very rare and valuable. We do this out of 
a sense of professional obligation or desire to help facilitate research. We don't do this to provide material to someone 
with a long history of shifting through existing programs, claiming something is not needed after he extracted 
seomthing from it. The program is free to use but may not be republished under false pretense. That is not a part 
of acceptable use.

## Author

Roy Wada
roywada@hotmail.com

## Acknowledgements

outreg2 is based on the earlier works by John Luke Gallup john_gallup@alum.swarthmore.edu
codes from pcorr2 by Richard Williams have been incorporated for stats( ) suboption.

## Also see

STB:   sg97 (STB-46, STB-49, STB-58)
Manual:  [U] Estimation and post-estimation commands
[U] Overview of model estimation
[R] Estimation commands

Online:  est, postfile, outfile, outsheet, save, 
search modltbl, search desrep
