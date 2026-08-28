# estadd — complete maintainer help

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

help estadd

## Title

estadd
Add results to (stored) estimates

## Syntax

estadd subcommand [,
options ] [ : namelist ]

where namelist is _all | * | name [name ...]

subcommands | description

Elementary
local name ... |
add a macro
scalar name = exp |
add a scalar
matrix name = mat |
add a matrix
r(name) |
add contents of r(name) (matrix or scalar)

Statistics for each
coefficient
beta |
standardized coefficients
vif |
variance inflation factors (after regress)
pcorr |
partial (and semi-partial) correlations
expb |
exponentiated coefficients
ebsd |
standardized factor change coefficients
mean |
means of regressors
sd |
standard deviations of regressors
summ |
various descriptives of the regressors

Summary statistics
coxsnell |
Cox & Snell's pseudo R-squared
nagelkerke |
Nagelkerke's pseudo R-squared
lrtest model |
likelihood-ratio test
ysumm |
descriptives of the dependent variable

Other
margins |
add results from margins (Stata 11 or newer)

SPost9
brant |
add results from brant (if installed)
fitstat |
add results from fitstat (if installed)
listcoef |
add results from listcoef (if installed)
mlogtest |
add results from mlogtest (if installed)
prchange |
add results from prchange (if installed)
prvalue |
add results from prvalue (if installed)
asprvalue |
add results from asprvalue (if installed)

options | description

r:eplace |
permit overwriting existing e()'s
p:refix(string) |
specify prefix for names of added results
q:uietly |
suppress output from subcommand (if any)
subcmdopts |
subcommand specific options

## Description

estadd adds additional results to the e()-returns of an
estimation command (see help estcom, help ereturn). If no
namelist is provided, then the results are added to the
currently active estimates (i.e. the model fit last). If these
estimates have been previously stored, the stored copy of the
estimates will also be modified. Alternatively, if namelist is
provided after the colon, results are added to all indicated sets of
stored estimates (see help estimates store or help
eststo). You may use the * and ?
wildcards in namelist. Execution is silent if namelist is
provided.

Adding additional results to the e()-returns is useful, for example,
if the estimates be tabulated by commands such as estout
or esttab. See the Examples section below for
illustration of the usage of estadd.

Technical note: Some of the subcommands below make use of the
information contained in e(sample) to determine estimation sample.
These subcommands return error if the estimates do not contain
e(sample).

## Subcommands

### Elementary

estadd loc:al name ...

adds in macro e(name) the specified contents (also
see help ereturn).

estadd sca:lar name = exp

adds in scalar e(name) the evaluation of exp
(also see help ereturn). name must not be b or V.

estadd sca:lar r(name)

adds in scalar e(name) the value of scalar
r(name). name must not be b or V.

estadd sca:lar name

adds in scalar e(name) the the value of scalar
name. name must not be b or V.

estadd mat:rix name = matrix_expression

adds in matrix e(name) the evaluation of matrix_expression
(also see help matrix define). name must not be b or V.

estadd mat:rix r(name)

adds in matrix e(name) a copy of matrix
r(name). name must not be b or V.

estadd mat:rix name

adds in matrix e(name) a copy of matrix name. name
must not be b or V.

estadd r(name)

adds in e(name) the value of scalar r(name)
or a copy of matrix r(name), depending on the nature of
r(name). name must not be b or V.

### Statistics for each coefficient

estadd beta

adds in e(beta) the standardized beta coefficients.

estadd vif [, tol:erance sqr:vif ]

adds in e(vif) the variance inflation factors (VIFs) for the
regressors (see help vif). Note that vif only works
with estimates produced by regress. tolerance
additionally adds the tolerances (1/VIF) in e(tolerance).
sqrvif additionally adds the square roots of the VIFs in
e(sqrvif).

estadd pcorr [, semi ]

adds the partial correlations (see help pcorr) and,
optionally, the semi-partial correlations between the dependent
variable and the individual regressors (see, e.g., the pcorr2
package from the SSC Archive). In the case of multiple-equations
models, the results are computed for the first equation only. The
partial correlations will be returned in e(pcorr) and, if
semi is specified, the semi-partial correlations will be
returned in e(spcorr).

estadd expb [, nocons:tant ]

adds in e(expb) the exponentiated coefficients (see the help
eform_option). noconstant excludes the constant
from the added results.

estadd ebsd

adds in e(ebsd) the standardized factor change coefficients,
i.e. exp(b_jS_j), where b_j is the raw coefficient and S_j is the
standard deviation of regressor j, that are sometimes reported for
logistic regression (see Long 1997).

estadd mean

adds in e(mean) the means of the regressors.

estadd sd [, nob:inary ]

adds in e(sd) the standard deviations of the regressors.
nobinary suppresses the computation of the standard deviation
for 0/1 variables.

estadd summ [, stats ]

adds vectors of the regressors' descriptive statistics to the
estimates. The following stats are available:

stats | description

me:an | mean
su:m | sum
mi:n | minimum
ma:x | maximum
ra:nge | range = max - min
sd | standard deviation
v:ar | variance
cv | coefficient of variation (sd/mean)
sem:ean | standard error of mean = sd/sqrt(n)
sk:ewness | skewness
k:urtosis | kurtosis
p1 | 1st percentile
p5 | 5th percentile
p10 | 10th percentile
p25 | 25th percentile
p50 | 50th percentile
p75 | 75th percentile
p90 | 90th percentile
p95 | 95th percentile
p99 | 99th percentile
iqr | interquartile range = p75 - p25
all | all of the above
med:ian | equivalent to specifying "p50"
q | equivalent to specifying "p25 p50 p75"

The default is mean sd min max. Alternatively, indicate the
desired statistics. For example, to add information on the
regressors' skewness and kurtosis, type

. estadd summ, skewness kurtosis

The statistics names are used as the names for the returned e()
matrices. For example, estadd summ, mean will store the means
of the regressors in e(mean).

### Summary statistics

estadd coxsnell

adds in e(coxsnell) the Cox & Snell pseudo R-squared, which is
defined as

r2_coxsnell = 1 - ( L0 / L1 )^(2/N)

where L0 is the likelihood of the model without regressors, L1 the
likelihood of the full model, and N is the sample size.

estadd nagelkerke

adds in e(nagelkerke) the Nagelkerke pseudo R-squared (or Cragg
& Uhler pseudo R-squared), which is defined as

r2_nagelkerke = r2_coxsnell / (1 - L0^(2/N))

estadd lrtest model [, n:ame:(string)
lrtest_options ]

adds the results from a likelihood-ratio test, where model is
the comparison model (see help lrtest). Added are
e(lrtest_chi2), e(lrtest_df), and e(lrtest_p). The
names may be modified using the name() option. Specify
name(myname) to add e(mynamechi2),
e(mynamedf), and e(mynamep). See
help lrtest for the lrtest_options.

estadd ysumm [, stats ]

adds descriptive statistics of the dependent variable. See the
summ subcommand above for a list of the available
stats. The default is mean sd min max. The default prefix
for the names of the added scalars is y (e.g. the mean of the
dependent variable will be returned in e(ymean)). Use
estadd's prefix() option to change the prefix. If a model
has multiple dependent variables, results for the first variable will
be added.

### Other

estadd margins [marginlist] [if] [in] [weight] [, options ]

adds results from the margins command, which was introduced
in Stata 11. See help margins for options. All results returned by
margins except e(V) are added using "margins_" as a default
prefix. For example, the margins are added in e(margins_b). The
standard errors are added in e(margins_se). Use the prefix()
option to change the default prefix.

### SPost9

The following subcommands are wrappers for
commands from Long and Freese's SPost9 package (see
[http://www.indiana.edu/~jslsoc/spost9.htm](http://www.indiana.edu/~jslsoc/spost9.htm)). Type

. "from http://www.indiana.edu/~jslsoc/stata":net from http://www.indiana.edu/~jslsoc/stata

to obtain the SPost9 package (spost9_ado). SPost for Stata 8 (spostado) is not
supported.

For examples on using the subcommands see
[http://repec.sowi.unibe.ch/stata/estout/spost.html](http://repec.sowi.unibe.ch/stata/estout/spost.html).

estadd brant [, brant_options ]

applies brant from Long and
Freese's SPost package and adds the returned results to
e(). You may specify brant_options as described in
help brant. The following results are added:

e(...) Contents

Scalars
brant_chi2 Chi-squared of overall Brant test
brant_df Degrees of freedom of overall Brant test
brant_p P-value of overall Brant test

Matrix
brant Test results for individual regressors
(rows: chi2, p<chi2)

To address the rows of e(brant) in estout's cells()
option type brant[chi2] and brant[p<chi2].

estadd fitstat [, fitstat_options ]

applies fitstat from Long and
Freese's SPost package and adds the returned scalars to
e(). You may specify fitstat_options as described in
help fitstat. Depending on model
and options, a selection of the following scalar statistics is added:

e(...) Contents

dev Deviance (D)
dev_df Degrees of freedom of D
lrx2 LR or Wald X2
lrx2_df Degrees of freedom of X2
lrx2_p Prob > LR or Wald X2
r2_adj Adjusted R2
r2_mf McFadden's R2
r2_mfadj McFadden's Adj R2
r2_ml ML (Cox-Snell) R2
r2_cu Cragg-Uhler(Nagelkerke) R2
r2_mz McKelvey & Zavoina's R2
r2_ef Efron's R2
v_ystar Variance of y*
v_error Variance of error
r2_ct Count R2
r2_ctadj Adj Count R2
aic0 AIC
aic_n AIC*n
bic0 BIC
bic_p BIC'
statabic BIC used by Stata
stataaic AIC used by Stata
n_rhs Number of rhs variables
n_parm Number of parameters

estadd listcoef [varlist] [, nosd listcoef_options ]

applies listcoef from Long and
Freese's SPost package and adds the returned results to
e(). You may specify listcoef_options as described in
help listcoef. Furthermore, option nosd suppresses
adding the standard deviations of the variables in e(b_sdx).

Depending on the estimation command and options, several of the
following matrices are added:

e(...) Contents

b_xs x-standardized coefficients
b_ys y-standardized coefficients
b_std Fully standardized coefficients
b_fact Factor change coefficients
b_facts Standardized factor change coefficients
b_pct Percent change coefficients
b_pcts Standardized percent change coefficients
b_sdx Standard deviation of the Xs

For nominal models (mlogit, mprobit) the
original parametrization of e(b) may not match the contrasts
computed by listcoef. To be able to tabulate standardized
coefficients along with the raw coefficients for the requested
contrasts, the following additional matrices are added for
these models:

e(...) Contents

b_raw raw coefficients
b_se standard errors of raw coefficients
b_z z statistics
b_p p-values

estadd mlogtest [varlist] [, mlogtest_options ]

applies mlogtest from Long and
Freese's SPost package and adds the returned results to
e(). You may specify mlogtest_options as described in
help mlogtest.

Depending on the specified options, a selection of the following
returns are added:

e(...) Contents

Scalars
hausman_set#_chi2 Hausman IIA tests using hausman
hausman_set#_df
hausman_set#_p

suest_set#_chi2 Hausman IIA tests using suest
suest_set#_df
suest_set#_p

smhsiao_set#_chi2 Small-Hsiao IIA tests
smhsiao_set#_df
smhsiao_set#_p

combine_#1_#2_chi2 Wald tests for combination of outcomes
combine_#1_#2_df
combine_#1_#2_p

lrcomb_#1_#2_chi2 LR tests for combination of outcomes
lrcomb_#1_#2_df
lrcomb_#1_#2_p

wald_set#_chi2 Wald tests for sets of independent
wald_set#_df variables
wald_set#_p

lrtest_set#_chi2 LR tests for sets of independent
lrtest_set#_df variables
lrtest_set#_p

Matrices
wald Wald tests for individual variables
(rows: chi2, df, p)
lrtest LR tests for individual variables
(rows: chi2, df, p)

To address the rows of e(wald) and e(lrtest) in estout's
cells() option type the row names in brackets, for example, wald[p] or
lrtest[chi2].

estadd prchange [varlist] [if exp] [in range] [,
pa:ttern(typepattern) b:inary(type) c:ontinuous(type)
[no]a:vg split[(prefix)] prchange_options ]

applies prchange from Long and
Freese's SPost package and adds the returned results to
e(). You may specify prchange_options as described in
help prchange. In particular, the outcome() option may be
used with models for count, ordered, or nominal outcomes
to request results for a specific outcome. Further options are:

pattern(typepattern), binary(type), and
continuous(type) to determine which types of discrete change
effects are added as the main results. The default is to add the 0 to 1
change effect for binary variables and the standard deviation change effect
for continuous variables. Use binary(type) and
continuous(type) to change these defaults. Available
types are:

type Description

mi:nmax minimum to maximum change effect
0:1 0 to 1 change effect
d:elta delta() change effect
s:d standard deviation change effect
m:argefct marginal effect (some models only)

Use pattern(typepattern) if you want to determine the
type of the added effects individually for each regressor. For example,
pattern(minmax sd delta) would add minmax for the first regressor,
sd for the second, and delta for the third, and then proceed
using the defaults for the remaining variables.

avg to request that only the average results over
all outcomes are added if applied to ordered
or nominal models (ologit, oprobit, slogit, mlogit, mprobit). The
default is to add the average results as well as the individual results for
the different outcomes (unless prchange's outcome() option is
specified, in which case only results for the indicated outcome are
added). Furthermore, specify noavg to suppress the average results
and only add the outcome-specific results. avg cannot be combined with split
or outcome().

split[(prefix)] to save
each outcome's results in a separate estimation set if applied to ordered
or nominal models (ologit, oprobit, slogit, mlogit,
mprobit). The estimation sets are named
prefix#, where # is the value of the outcome at hand. If no
prefix is provided, the name of the estimation set followed by an
underscore is used as the prefix. If the estimation set has no name
(because it has not been stored yet) the name of the estimation command
followed by an underscore is used as the prefix (e.g. ologit_). The
estimation sets stored by the split option are intended for
tabulation only and should not be used with other post-estimation
commands.

Depending on model and options, several of the following matrices
and scalars are added:

e(...) Contents

Scalars
centered 1 if effects are centered, 0 else
delta Value of delta()
predval[#] Prediction(s) at the base values
outcome Outcome value (outcome()/split only)

Matrices
dc Discrete change effects (rows: main, minmax,
01, delta, sd [, margefct])
pattern Types of effects in the main row of e(dc)
X Base values and descriptive statistics
(rows: X, SD, Min, Max)

The e(dc) and e(X) matrices have multiple rows. The
e(dc) matrix contains the main results as determined by
pattern(), binary(), and continuous() in the first row.
The second and following rows contain the separate results for each type of
effect using the labels provided by prchange as row names. Type
dc[#] or dc[rowname] to address the rows
in estout's cells() option, where # is the row number
or rowname is the
row name. For example, type dc[-+sd/2] to address the centered
standard deviation change effects. To tabulate the main results (1st row),
simply type dc. e(pattern) indicates the types of effects
contained in the main row of e(dc) using numeric codes. The codes are 1
for the minimum to maximum change effect, 2 for the 0 to 1 change effect, 3
for the delta() change effect, 4 for the standard deviation change
effect, and 5 for the marginal effect. e(X) has four rows
containing the base values, standard deviations, minimums, and maximums. If
the fromto option is specified, two additional matrices,
e(dcfrom) and e(dcto) are added.

estadd prvalue [if exp] [in range] [, lab:el:(string)
prvalue_options ]

estadd prvalue post [name] [, t:itle:(string) swap ]

applies prvalue from Long and Freese's SPost
package and adds the returned results to e(). The procedure is to
first collect a series of predictions by repeated calls to
estadd prvalue and then apply estadd prvalue post to prepare the results
for tabulation as in the following example:

. logit lfp k5 k618 age wc hc lwg inc
. estadd prvalue, x(inc 10) label(low inc)
. estadd prvalue, x(inc 20) label(med inc)
. estadd prvalue, x(inc 30) label(high inc)
. estadd prvalue post
. estout

You may specify prvalue_options with estadd prvalue as
described in help prvalue. For example, use x() and
rest() to set the values of the independent variables. Use
label() to label the single calls. "pred#" is used as label if
label() is omitted, where # is the number of the call. Labels may
contain spaces but they will be trimmed to a maximum
length of 30 characters and some characters (:,
., ") will be replaced by underscore. The results
from the single calls are collected in matrix e(_estadd_prvalue)
(predictions) and matrix e(_estadd_prvalue_x) (x-values). Specify
replace to drop results from previous calls.

estadd prvalue post posts the collected predictions in e(b)
so that they can be tabulated. The following results are saved:

e(...) Contents

Scalars
N number of observations

Macros
depvar name of dependent variable
cmd estadd_prvalue
model model estimation command
properties b

Matrices
b predictions
se standard errors
LB lower confidence interval bounds
UB upper confidence interval bounds
Category outcome values
Cond conditional predictions (some models only)
X values of predictors (for each prediction)
X2 second equation predictors (some models only)

estadd prvalue post replaces the current model unless
name is specified, in which case the results are stored under name and the model
remains active. However, if the model has a name
(because it has been stored), the name of the model is used as a prefix.
If, for example, the model has been stored as model1, then
estadd prvalue post stores its results under model1name.
Use title() to specify a title for the stored results.

The default for estadd prvalue post is to arrange
e(b) in a way so that predictions are grouped by outcome (i.e. outcome labels are used
as equations). Alternatively, specify swap to group predictions by
prvalue calls (i.e. to use the prediction labels as equations).

e(X) contains one row for each independent variable. To address the rows in
estout's cells() option type X[varname], where varname is
the name of the variable of interest. e(X2), if provided, is analogous to e(X).

estadd asprvalue [, lab:el:(string)
asprvalue_options ]

estadd asprvalue post [name] [, t:itle:(string) swap ]

applies asprvalue from Long and Freese's SPost
package and adds the returned results to e(). The procedure is to
first collect a series of predictions by repeated calls to
estadd asprvalue and then apply estadd asprvalue post to prepare the results
for tabulation as in the following example:

. clogit choice train bus time invc, group(id)
. estadd asprvalue, cat(train bus) label(at means)
. estadd asprvalue, cat(train bus) rest(asmean) label(at asmeans)
. estadd asprvalue post
. estout

You may specify asprvalue_options with estadd asprvalue as
described in help asprvalue. For example, use x() and
rest() to set the values of the independent variables. Use
label() to label the single calls. "pred#" is used as label if
label() is omitted, where # is the number of the call. Labels may
contain spaces but they will be trimmed to a maximum
length of 30 characters and some characters (:,
., ") will be replaced by underscore. The results
from the single calls are collected in matrices e(_estadd_asprval)
(predictions), e(_estadd_asprval_asv) (values of alternative-specific
variables), and e(_estadd_asprval_csv) (values of case-specific
variables). Specify replace to drop results from previous calls.

estadd asprvalue post posts the collected predictions in e(b)
so that they can be tabulated. The following results are saved:

e(...) Contents

Scalars
N number of observations

Macros
depvar name of dependent variable
cmd estadd_asprvalue
model model estimation command
properties b

Matrices
b predictions
asv alternative-specific variables (if available)
csv case-specific variables (if available)

estadd asprvalue post replaces the current model unless
name is specified, in which case the results are stored under
name and the model remains active. However, if the model has a name
(because it has been stored), the name of the model is used as a prefix.
If, for example, the model has been stored as model1, then
estadd asprvalue post stores its results under model1name.
Use title() to specify a title for the stored results.

The default for estadd asprvalue post is to arrange
e(b) in a way so that predictions are grouped by outcome (i.e. outcome labels are used
as equations). Alternatively, specify swap to group predictions by
prvalue calls (i.e. to use the prediction labels as equations).

e(asv) and e(csv) contain one row for each variable.
To address the rows in estout's cells() option type
asv[varname] or csv[varname], where
varname is the name of the variable of interest.

## Options

replace permits estadd to overwrite existing e()
macros, scalars, or matrices.

prefix(string) denotes a prefix for the names of the
added results. The default prefix is an empty string. For example, if
prefix(string) is specified, the beta
subcommand will return the matrix e(stringbeta).

quietly suppresses the output from the called subcommand and displays only
the list of added results. Note that many of estadd's subcommands do not generate
output, in which case quietly has no effect.

subcmdopts are subcommand specific options. See the descriptions
of the subcommands above.

## Examples

Example 1: Add r()-returns from other programs to the
current estimates

. sysuse auto
(1978 Automobile Data)

. quietly regress price mpg weight

. test mpg=weight

( 1) mpg - weight = 0

F( 1, 71) = 0.36
| Prob > F = 0.5514

. estadd scalar p_diff = r(p)

added scalar:
e(p_diff) = .55138216

. estout, stats(p_diff)

b

mpg -49.51222
weight 1.746559
_cons 1946.069

p_diff .5513822

Example 2: Add means and standard deviations of the model's regressors
to the current estimates

. quietly logit foreign price mpg

. estadd summ, mean sd

added matrices:
e(sd) : 1 x 3
e(mean) : 1 x 3

. estout, cells("mean sd") drop(_cons)

mean sd

price 6165.257 2949.496
mpg 21.2973 5.785503

Example 3: Add standardized beta coefficients to stored estimates

. eststo: quietly regress price mpg
(est1 stored)

. eststo: quietly regress price mpg foreign
(est2 stored)

. estadd beta: *

. estout, cells(beta) drop(_cons)

est1 est2
beta beta

mpg -.4685967 -.5770712
foreign .2757378

See
[http://repec.sowi.unibe.ch/stata/estout/](http://repec.sowi.unibe.ch/stata/estout/)
for additional examples.

## Writing one's own subcommands

A program providing a new estadd subcommand should be called
estadd_mysubcommand (see help program for advice
on defining programs). mysubcommand will be available to estadd as a new
subcommand after the program definition has been executed or
saved to a file called "estadd_mysubcommand.ado" in either the
current directory or somewhere else in the adopath
(see help sysdir).

Use the subcommands provided within "estadd.ado" as a starting
point for writing new subcommands. See
[http://repec.sowi.unibe.ch/stata/estout/estadd.html#007](http://repec.sowi.unibe.ch/stata/estout/estadd.html#007)
for an example.

## Author

Ben Jann, Institute of Sociology, University of Bern, jann@soz.unibe.ch

## Also see

Manual: [R] estimates

Online: help for
estimates,
ereturn,
program,
esttab,
estout,
eststo,
estpost
