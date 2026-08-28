# estpost — complete maintainer help

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

help estpost

[http://repec.sowi.unibe.ch/stata/estout/](http://repec.sowi.unibe.ch/stata/estout/)

## Title

estpost
Post results from various commands in e()

## Syntax

estpost command [...]

command | description

summarize |
post summary statistics
tabstat |
post summary statistics
gtabstat |
post summary statistics (using gstats tab from gtools)
ttest |
post two-group mean-comparison tests
prtest |
post two-group tests of proportions
tabulate |
post one-way or two-way frequency table
tabulate |
post frequency table for survey data
correlate |
post correlations
ci |
post confidence intervals for means,
|
proportions, or counts
stci |
post confidence intervals for means
|
and percentiles of survival time
margins |
post results from margins (Stata 11 or newer)

## Description

estpost posts results from various Stata commands in e()
so that they can be tabulated using esttab or estout. Type
ereturn list after estpost to list the elements saved
in e().

## Commands

### summarize

estpost su:mmarize
[varlist] [if] [in] [weight]
[,
d:etail
mean:only
list:wise
case:wise
q:uietly
es:ample
]

posts summary statistics computed by summarize. If no
varlist is specified, summary statistics are calculated for all
variables in the dataset.

aweights, fweights, and iweights are allowed
(however, iweights may not be used with the detail option);
see weight.

Options are:

detail and meanonly as described in help summarize.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation
sample if any of the variables in varlist is missing for that
observation. The default is to determine the used observations for
each variable separately without regard to whether other variables
are missing. casewise is a synonym for listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

The following results vectors are saved in e():

number of observations
mean
minimum
maximum
sum of variable
sum of the weights
variance (unless meanonly)
standard deviation (unless meanonly)
1st percentile (detail only)
5th percentile (detail only)
10th percentile (detail only)
25th percentile (detail only)
50th percentile (detail only)
75th percentile (detail only)
90th percentile (detail only)
95th percentile (detail only)
99th percentile (detail only)
skewness (detail only)
kurtosis (detail only)

Example:

. sysuse auto, clear
(1978 Automobile Data)

. estpost summarize price mpg rep78 foreign

|

+

|
|
|
|

|

+

|
|
|
|

. esttab ., cells("mean sd count") noobs

(1)

mean sd count

price 6165.257 2949.496 74
mpg 21.2973 5.785503 74
rep78 3.405797 .9899323 69
foreign .2972973 .4601885 74

### tabstat

estpost tabstat
varlist [if] [in] [weight]
[,
s:tatistics:(statname [...])
c:olumns:(v:ariables|s:tatistics:)
by(varname)
not:otal
m:issing
list:wise
case:wise
q:uietly
es:ample
el:abels
]

posts summary statistics computed by tabstat. aweights and
fweights are allowed; see weight.

Options are:

statistics(), columns(), by(), nototal,
and missing as described in help tabstat.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation
sample if any of the variables in varlist is missing for that
observation. The default is to determine the used observations for
each variable separately without regard to whether other variables
are missing. casewise is a synonym for listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels to enforce saving the by() values/labels in macro
e(labels).

A vector of results is saved in e() for each specified
variable or statistic, depending on columns().

Examples:

. sysuse auto, clear
(1978 Automobile Data)

. estpost tabstat price mpg rep78, listwise ///
> statistics(mean sd)

Summary statistics: mean sd
for variables: price mpg rep78

|

+

|
|

. esttab ., cells("price mpg rep78")

(1)

price mpg rep78

mean 6146.043 21.28986 3.405797
sd 2912.44 5.866408 .9899323

N 69

. estpost tabstat price mpg rep78, listwise ///
> statistics(mean sd) columns(statistics)

Summary statistics: mean sd
for variables: price mpg rep78

|

+

|
|
|

. esttab ., cells("mean(fmt(a3)) sd")

(1)

mean sd

price 6146.0 2912.4
mpg 21.29 5.866
rep78 3.406 0.990

N 69

. estpost tabstat price mpg rep78, by(foreign) ///
> statistics(mean sd) columns(statistics) listwise

Summary statistics: mean sd
for variables: price mpg rep78
by categories of: foreign

|

+

|
|
|
|

+

|
|
|
|

+

|
|
|
|

. esttab ., main(mean) aux(sd) nostar unstack ///
> noobs nonote label

(1)

Domestic Foreign Total

Price 6179.3 6070.1 6146.0

Mileage (mpg) 19.54 25.29 21.29

Repair Record 1978 3.021 4.286 3.406

### gtabstat

estpost gtabstat
varlist [if] [in] [weight]
[,
s:tatistics:(statname [...])
c:olumns:(v:ariables|s:tatistics:)
by(varname)
m:issing
q:uietly
es:ample
el:abels
]

posts summary statistics computed by gstats tab from
the gtools package. gstats tab is a fast, by-able
alternative to tabstat. aweights, fweights, pweights
and pweights are allowed; see weight. However, total, casewise,
and listwise are not allowed.

Options are:

statistics(), columns(), and by() as described
in help gstats tab. By default nomissing is passed;
use missing to include missing-value groups.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels to enforce saving the by() values/labels in macro
e(labels).

A vector of results is saved in e() for each specified
variable or statistic, depending on columns().

Examples:

. sysuse auto, clear
(1978 Automobile Data)

. estpost gtabstat price mpg rep78, ///
> statistics(mean sd)

Summary statistics: mean sd
for variables: price mpg rep78

|

+

|
|

. esttab ., cells("price mpg rep78")

(1)

price mpg rep78

mean 6146.043 21.28986 3.405797
sd 2912.44 5.866408 .9899323

N 69

. estpost gtabstat price mpg rep78, ///
> statistics(mean sd) columns(statistics)

Summary statistics: mean sd
for variables: price mpg rep78

|

+

|
|
|

. esttab ., cells("mean(fmt(a3)) sd")

(1)

mean sd

price 6146.0 2912.4
mpg 21.29 5.866
rep78 3.406 0.990

N 69

. estpost gtabstat price mpg rep78, by(foreign) ///
> statistics(mean sd) columns(statistics)

Summary statistics: mean sd
for variables: price mpg rep78
by categories of: foreign

|

+

|
|
|
|

+

|
|
|
|

+

|
|
|
|

. esttab ., main(mean) aux(sd) nostar unstack ///
> noobs nonote label

(1)

Domestic Foreign Total

Price 6179.3 6070.1 6146.0

Mileage (mpg) 19.54 25.29 21.29

Repair Record 1978 3.021 4.286 3.406

### ttest

estpost ttest
varlist [if] [in],
by(groupvar)
[
une:qual w:elch
list:wise
case:wise
q:uietly
es:ample
]

posts two-group mean-comparison tests computed by ttest.

Options are:

by(), unequal, and welch as described in
help ttest.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation
sample if any of the variables in varlist is missing for that
observation. The default is to determine the used observations for
each variable separately without regard to whether other variables
are missing. casewise is a synonym for listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

The following results vectors are saved in e():

mean difference
number of observations
standard error of difference
t statistic
degrees of freedom
lower one-sided p-value
two-sided p-value
upper one-sided p-value
number of observations in group 1
mean in group 1
number of observations in group 2
mean in group 2

Example:

. sysuse auto, clear
(1978 Automobile Data)

. estpost ttest price mpg headroom trunk, by(foreign)

|

+

|
|
|
|

|

+

|
|
|
|

|

+

|
|
|
|

. esttab ., wide

(1)

price -312.3
mpg -4.946***
headroom 0.540*
trunk 3.341**

N 74

t statistics in parentheses
* p<0.05, ** p<0.01, *** p<0.001

### prtest

estpost prtest
varlist [if] [in],
by(groupvar)
[
list:wise
case:wise
q:uietly
es:ample
]

posts two-group tests of proportions computed by prtest.

Options are:

by() as described in
help prtest.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation
sample if any of the variables in varlist is missing for that
observation. The default is to determine the used observations for
each variable separately without regard to whether other variables
are missing. casewise is a synonym for listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

The following results vectors are saved in e():

difference in proportions
number of observations
standard error of difference
standard error under Ho
z statistic
lower one-sided p-value
two-sided p-value
upper one-sided p-value
number of observations in group 1
proportion in group 1
number of observations in group 2
proportion in group 2

Example:

. webuse cure2, clear

. estpost prtest cure, by(sex)

|

+

|

|

+

|

|

+

|

. esttab ., cell("b se0 z p")

(1)

b se0 z p

cure -.0729167 .0942404 -.7737309 .43909

N 109

### tabulate

One-way table:

estpost ta:bulate
varname [if] [in] [weight]
[,
m:issing
nol:abel
sort
subpop(varname)
notot:al
q:uietly
es:ample
el:abels
]

Two-way table:

estpost ta:bulate
varname1 varname2 [if] [in] [weight]
[,
m:issing
nol:abel
ch:i2
e:xact[(#)]
g:amma
lr:chi2
t:aub
v
notot:al
q:uietly
es:ample
el:abels
]

estpost tabulate posts a one-way or two-way table
computed by tabulate. aweights, fweights,
and iweights are allowed; see weight.

Options are:

missing,
nolabel,
sort,
subpop(),
chi2,
exact,
gamma,
lrchi2,
taub, and
v
as described in help tabulate.

nototal to omit row and column totals.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels to enforce saving labels in e(labels) and
e(eqlabels).

The following vectors are saved in e():

frequency counts
percent
cumulative percent (one-way only)
column percent (two-way only)
row percent (two-way only)

If two-way options such as, e.g., chi2 or exact are
specified, the results of the tests added as scalars in e() using the
names documented in [R] tabulate.

The value labels of the row variable are stored as names in the
saved vectors, unless
no label exceeds 30 characters or contains unsuitable characters in which case
the labels are stored in macro e(labels). Type
varlabels(`e(labels)') in esttab or estout to
use the labels stored e(labels). The value labels of the column variable
are stored as equation names or, alternatively,
in macro e(eqlabels). Type eqlabels(`e(eqlabels)') in
esttab or estout to use the labels stored in
e(eqlabels). Specify the elabels option to enforce saving labels
in e(labels) and e(eqlabels).

Examples:

. sysuse auto, clear
(1978 Automobile Data)

. estpost tabulate foreign

|

+

|
|

+

|

. esttab ., cells("b pct(fmt(2)) cumpct(fmt(2))") noobs

(1)
foreign
b pct cumpct

Domestic 52 70.27 70.27
Foreign 22 29.73 100.00
Total 74 100.00

. estpost tabulate rep78 foreign

foreign |
|

+

|
|
|
|
|
|
|

+

|
|
|
|
|
|
|

+

|
|
|
|
|
|
|

. esttab ., cell(colpct(fmt(2))) unstack noobs

(1)

Domestic Foreign Total
colpct colpct colpct

1 4.17 0.00 2.90
2 16.67 0.00 11.59
3 56.25 14.29 43.48
4 18.75 42.86 26.09
5 4.17 42.86 15.94
Total 100.00 100.00 100.00

. esttab ., cell(colpct(fmt(2)) count(fmt(g) par keep(Total))) ///
> collabels(none) unstack noobs nonumber nomtitle ///
> eqlabels(, lhs("Repair Rec.")) ///
> varlabels(, blist(Total "-(hline @width)--(break)-"))

Repair Rec. Domestic Foreign Total

1 4.17 0.00 2.90
2 16.67 0.00 11.59
3 56.25 14.29 43.48
4 18.75 42.86 26.09
5 4.17 42.86 15.94

Total 100.00 100.00 100.00

### svy: tabulate

One-way table:

estpost svy [vcetype] [, svy_options] : ta:bulate
varname [if] [in]
[,
notot:al
q:uietly
es:ample
el:abels
svy_tabulate_opts
]

Two-way table:

estpost svy [vcetype] [, svy_options] : ta:bulate
varname1 varname2 [if] [in]
[,
notot:al
q:uietly
es:ample
el:abels
svy_tabulate_opts
]

estpost svy: tabulate posts a one-way or two-way table
for complex survey data computed by tabulate. Stata 9 or newer
is required.

Options are as described in tabulate oneway or
tabulate twoway, respectively, and:

nototal to omit row and column totals (synonym for nomarginals).

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels to enforce saving labels in e(labels) and
e(eqlabels).

estpost svy: tabulate posts results in e() (except e(V))
as documented in tabulate oneway and
tabulate twoway, respectively,
and adds or replaces the following matrices:

cell, column, or row proportions or percentages,
or weighted counts, depending on options
standard errors of e(b)
lower confidence bounds for e(b)
upper confidence bounds for e(b)
deff for variances of e(b)
deft for variances of e(b)
cell proportion or percentages
row proportion or percentages (two-way only)
column proportion or percentages (two-way only)
weighted counts
number of observations

The value labels of the row variable are stored as names in the
saved vectors, unless
no label exceeds 30 characters or contains unsuitable characters in which case
the labels are stored in macro e(labels). Type
varlabels(`e(labels)') in esttab or estout to
use the labels stored e(labels). The value labels of the column variable
are stored as equation names or, alternatively,
in macro e(eqlabels). Type eqlabels(`e(eqlabels)') in
esttab or estout to use the labels stored in
e(eqlabels). Specify the elabels option to enforce saving labels
in e(labels) and e(eqlabels).

Examples:

. webuse nhanes2b, clear

. svyset psuid [pweight=finalwgt], strata(stratid)

pweight: | finalwgt
VCE: | linearized
Single unit: | missing
Strata 1: | stratid
SU 1: | psuid
FPC 1: | <zero>

. estpost svy: tabulate race
(running tabulate on estimation sample)

| Number of strata | = 31 | Number of obs | = 10351
| Number of PSUs | = 62 | Population size | = 117157513
| Design df | = 31

TT

1=white, |
2=black, |
3=other | proportions

+

White | .8792
Black | .0955
Other | .0253
|
Total | 1

BT

Key: | proportions = cell proportions

saved vectors:
e(b) = cell proportions
e(se) = standard errors of cell proportions
e(lb) = lower 95% confidence bounds for cell proportions
e(ub) = upper 95% confidence bounds for cell proportions
e(deff) = deff for variances of cell proportions
e(deft) = deft for variances of cell proportions
e(cell) = cell proportions
e(count) = weighted counts
e(obs) = number of observations

. esttab ., cell("b(f(4)) se deft")

(1)

b se deft

White 0.8792 0.0167 5.2090
Black 0.0955 0.0127 4.4130
Other 0.0253 0.0105 6.8246
Total 1.0000 0.0000

N 10351

. estpost svy: tabulate race diabetes, row percent
(running tabulate on estimation sample)

| Number of strata | = 31 | Number of obs | = 10349
| Number of PSUs | = 62 | Population size | = 117131111
| Design df | = 31

TT

1=white, | diabetes, 1=yes,
2=black, | 0=no
3=other | 0 1 Total

+

White | 96.8 3.195 100
Black | 94.1 5.903 100
Other | 97.97 2.034 100
|
Total | 96.58 3.425 100

BT

Key: | row percentages

Pearson:
| Uncorrected | chi2(2) | = 21.3483
| Design-based | F(1.52, 47.26) | = 15.0056 | P = 0.0000

saved vectors:
e(b) = row percentages
e(se) = standard errors of row percentages
e(lb) = lower 95% confidence bounds for row percentages
e(ub) = upper 95% confidence bounds for row percentages
e(deff) = deff for variances of row percentages
e(deft) = deft for variances of row percentages
e(cell) = cell percentages
e(row) = row percentages
e(col) = column percentages
e(count) = weighted counts
e(obs) = number of observations

. esttab ., b(2) se(2) scalars(F_Pear) nostar unstack ///
> mtitle(`e(colvar)')

(1)
diabetes
0 1 Total

White 96.80 3.20 100.00

Black 94.10 5.90 100.00

Other 97.97 2.03 100.00

Total 96.58 3.42 100.00

N 10349
F_Pear 15.01

Standard errors in parentheses

### correlate

estpost cor:relate
varlist [if] [in] [weight]
[,
m:atrix
noh:alf
print:(#)
b:onferroni
sid:ak
list:wise
case:wise
q:uietly
es:ample
el:abels[(pfx sfx)]
nol:abel
]

posts the pairwise correlations between the first variable in
varlist and the remaining variables. Alternatively, if the
matrix option is specified, all pairwise correlations among the
variable in varlist are posted.

aweights, fweights,
iweights and pweights are allowed; see weight.

Methods and formulas are as described in
[R] correlate. However, if pweights
are specified, the p-values of the correlations are computed
as suggested in the Stata FAQ on
[Estimating correlations with survey data](http://www.stata.com/support/faqs/stat/survey.html).

Options are:

matrix to return the (lower triangle) of the correlation
matrix of the variables in varlist. The default is to return
the pairwise correlations between the first variable in
varlist and the remaining variables.

nohalf to return the full correlation matrix rather than just
the lower triangle. nohalf has no effect unless matrix
is specified.

print(#) to suppress (leave blank)
correlation coefficients with a p-value larger than
#. print() only affects what is saved in
e(rho), e(p), and e(count), but
not what is saved in e(b).

bonferroni to apply the Bonferroni adjustment to the
p-values.

sidak to apply the Sidak adjustment to the
p-values.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation sample
if any of the variables in varlist is missing for that
observation. The default is to handle missing values by pairwise
deletion, i.e. all available observations are used to calculate a
pairwise correlation without regard to whether variables outside
that pair are missing. casewise is a synonym for
listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels[(pfx sfx)] stores numbered labels in
e(labels) and e(eqlabels) if option matrix has been
specified. This is useful if you want to tabulate a correlation
matrix. See below for an example. Specify pfx and
sfx to provide a prefix and suffix for the numbers; for
example, eqlabels([ ]) will format the numbers as
[1], [2], etc.; eqlabels("" .) will format the numbers as
1., 2., etc.

nolabel causes option elabels() to use variable names rather
than variable labels.

The following vectors are saved in e():

correlation coefficients
correlation coefficients
p-values
number of observations

Examples:

. sysuse auto, clear
(1978 automobile data)

. estpost correlate price mpg turn foreign, matrix elabels(( ))

|

+

|
|
|
|
|
|
|
|
|
|
|
|
|
|

. esttab ., not unstack compress noobs

(1)

price mpg turn foreign

price 1
mpg -0.469*** 1
turn 0.310** -0.719*** 1
foreign 0.0487 0.393*** -0.631*** 1

* p<0.05, ** p<0.01, *** p<0.001

. esttab ., not unstack compress noobs nonum nomtitle ///
> varwidth(21) varlabels(`e(labels)') eqlabels(`e(eqlabels)')

(1) (2) (3) (4)

(1) Price 1
(2) Mileage (mpg) -0.469*** 1
(3) Turn circle (ft.) 0.310** -0.719*** 1
(4) Car origin 0.0487 0.393*** -0.631*** 1

* p<0.05, ** p<0.01, *** p<0.001

. bysort foreign: eststo: ///
> estpost correlate price turn weight rep78, listwise

-> Domestic

|

+

|
|
|
(est1 stored)

-> Foreign

|

+

|
|
|
(est2 stored)

. esttab est1 est2, not mtitles

(1) (2)
Domestic Foreign

turn 0.433** 0.510*
weight 0.686*** 0.832***
rep78 -0.0193 0.180

N 48 21

* p<0.05, ** p<0.01, *** p<0.001

### ci

estpost ci
[varlist] [if] [in] [weight]
[,
b:inomial
p:oisson e:xposure:(varname)
ex:act wa:ld w:ilson a:gresti j:effreys
l:evel:(#)
list:wise
case:wise
q:uietly
es:ample
]

posts standard errors and confidence intervals computed by
ci. aweights and fweights are allowed,
but aweights may not be specified with options
binomial or poisson;
see weight.

Options are:

binomial, poisson, exposure(),
exact, wald, wilson, agresti,
jeffreys, and level()
as described in help ci.

listwise to handle missing values through listwise deletion,
meaning that an observation is omitted from the estimation
sample if any of the variables in varlist is missing for that
observation. The default is to determine the used observations for
each variable separately without regard to whether other variables
are missing. casewise is a synonym for listwise.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

The following results vectors are saved in e():

mean
number of observations
estimate of standard error
lower bound of confidence interval
upper bound of confidence interval

Examples:

. sysuse auto, clear
(1978 Automobile Data)

. estpost ci price mpg rep78, listwise
(confidence level is 95%)

|

+

|
|
|

. esttab ., cells("b lb ub") label

(1)

b lb ub

Price 6146.043 5446.399 6845.688
Mileage (mpg) 21.28986 19.88059 22.69912
Repair Record 1978 3.405797 3.167989 3.643605

Observations 69

. eststo exact: estpost ci foreign, binomial exact
(confidence level is 95%)

|

+

|

. eststo agresti: estpost ci foreign, binomial agresti
(confidence level is 95%)

|

+

|

. esttab exact agresti, cells(lb ub) mtitles

(1) (2)
exact agresti
lb/ub lb/ub

foreign .196584 .204807
.4148353 .4097942

N 74 74

### stci

estpost stci
[if] [in]
[,
by(groupvar)
m:edian
r:mean
e:mean
p(#)
cc:orr
l:evel:(#)
q:uietly
es:ample
el:abels
]

posts confidence intervals for means
and percentiles of survival time computed by stci. Stata 9 or
newer is required.

Options are:

by(groupvar)
to report separate summaries for each group defined by
groupvar, along with an overall total.

median,
rmean,
emean,
p(),
ccorr, and
level()
as described in help stci.

quietly to suppress the output.

esample to mark the estimation sample in e(sample).

elabels to enforce saving by() labels in e(labels).

The following vectors are saved in e():

number of subjects
median (if median specified; the default)
#th percentile (if p(#) specified)
restricted mean (if rmean specified)
extended mean (if emean specified)
standard error
lower bound of CI
upper bound of CI

Examples:

. webuse page2, clear

. estpost stci
(confidence level is 95%)

|

+

|

. esttab ., cell("count p50 se lb ub") noobs compress

(1)

count p50 se lb ub

total 40 232 2.562933 213 239

. estpost stci, by(group)
(confidence level is 95%)

|

+

|
|

+

|

. esttab ., cell("count p50 se lb ub") noobs compress

(1)

count p50 se lb ub

1 19 216 5.171042 190 234
2 21 233 2.179595 232 280
total 40 232 2.562933 213 239

### margins

estpost margins
[marginlist] [if] [in] [weight]
[,
q:uietly
margins_opions
]

posts results from the margins command, that was introduced in
Stata 11.

Options are:

quietly to suppress the output.

margins_opions as described in help margins (except post).

estpost margins replaces the current e(b) and
e(V) with r(b) and r(V) from margins and
also copies all other matrixes, scalars, and macros from margins into
e() (possibly replacing identically named existing entries).

Examples:

. sysuse auto, clear
(1978 Automobile Data)

. quietly logit foreign price mpg weight

. estpost margins, dydx(*) quietly

. esttab ., cell("b se") pr2

(1)
foreign
b se

price .0000686 .0000136
mpg -.0089607 .006596
weight -.0005069 .000055

N 74
pseudo R-sq 0.619

## Author

Ben Jann, Institute of Sociology, University of Bern, jann@soz.unibe.ch

estpost gtabstat has been contributed by Mauricio Caceres Bravo.

## Also see

Manual: [R] estimates

Online: help for
estimates,
estout,
esttab,
eststo,
estadd
