# ivreg2 complete maintainer help

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

help for ivreg2

## Extended instrumental variables/2SLS, GMM and AC/HAC, LIML and k-class regression

Full syntax

ivreg2 depvar [varlist1]
(varlist2=varlist_iv) [weight]
[if exp] [in range]
[, gmm2s
bw(#)
kernel(string)
dkraay(integer)
kiefer
liml
fuller(#)
kclass(#)
coviv
cue
b0(matrix)
r[obust]
cl[uster](varlist)
orthog(varlist_ex)
endog(varlist_en)
red[undant](varlist_ex)
partial(varlist)
sm[all]
noc[onstant]
center
smatrix(matrix)
wmatrix(matrix)
first ffirst savefirst savefp[refix](prefix)
sfirst savesfirst savesfp[refix](prefix)
rf saverf saverfp[refix](prefix)
nocollin noid
l[evel](#)
bvclean
nohe[ader]
nofo[oter]
ef[orm](string)
dep[name](varname)
plus ]

Replay syntax

ivreg2
[, first sfirst
ffirst rf
l[evel](#)
nohe[ader]
nofo[oter]
ef[orm](string)
dep[name](varname)
plus ]}

Version syntax

ivreg2, version

ivreg2 is compatible with Stata version 8 or later.
The most-up-to-date implementation of ivreg2 requires
Stata version 11 or later.
If ivreg2 is called under earlier versions of Stata,
it will run a legacy version ivreg2x.
See below under Running ivreg2 under earlier versions of Stata
for details.

ivreg2 may be used with time-series or panel data,
in which case the data must be tsset
before using ivreg2; see help tsset.

All varlists may contain time-series operators or factor variables;
see help varlist.

by, rolling, statsby, xi,
bootstrap and jackknife are allowed; see help prefix.

aweights, fweights, iweights and pweights
are allowed; see help weights.

The syntax of predict following ivreg2 is

predict [type] newvarname [if exp]
[in range] [, statistic]

where statistic is

xb fitted values; the default

r[esiduals] residuals

stdp standard error of the prediction

These statistics are available both in and out of sample;
type "predict ... if e(sample) ..."
if wanted only for the estimation sample.

## Contents

Description

Robust, cluster and 2-way cluster, AC, HAC, and cluster+HAC SEs and statistics

GMM estimation

LIML, k-class and GMM-CUE estimation

Summary of robust, HAC, AC, GMM, LIML and CUE options

Testing overidentifying restrictions

Testing subsets of regressors and instruments for endogeneity

Tests of under- and weak identification

Testing instrument redundancy

First-stage regressions, identification, and weak-id-robust inference

Reduced form estimates

Partialling-out exogenous regressors

OLS and Heteroskedastic OLS (HOLS) estimation

Collinearities

nocollin and noid

Small sample corrections

Options summary

Running ivreg2 under earlier versions of Stata

Remarks and saved results

Examples

References

Acknowledgements

Authors

Citation of ivreg2

## Description

ivreg2 implements a range of single-equation estimation methods
for the linear regression model: OLS, instrumental
variables (IV, also known as two-stage least squares, 2SLS),
the generalized method of moments (GMM),
limited-information maximum likelihood (LIML), and k-class estimators.
In the language of IV/GMM, varlist1 are the exogenous
regressors or "included instruments",
varlist_iv are the exogenous variables excluded
from the regression or "excluded instruments",
and varlist2 the endogenous regressors that are being "instrumented".

ivreg2 will also estimate linear regression models using
robust (heteroskedastic-consistent),
autocorrelation-consistent (AC),
heteroskedastic and autocorrelation-consistent (HAC)
and cluster-robust variance estimates.

ivreg2 is an alternative to Stata's official ivregress.
Its features include:
two-step feasible GMM estimation (gmm2s option)
and continuously-updated GMM estimation (cue option);
LIML and k-class estimation;
automatic output of overidentification and underidentification test statistics;
C statistic test of exogeneity of subsets of instruments
(orthog() option);
endogeneity tests of endogenous regressors
(endog() option);
test of instrument redundancy
(redundant() option);
kernel-based autocorrelation-consistent (AC)
and heteroskedastic and autocorrelation consistent (HAC) standard errors
and covariance estimation (bw(#) option),
with user-specified choice of kernel (kernel() option);
two-level cluster-robust standard errors and statistics;
default reporting of large-sample statistics
(z and chi-squared rather than t and F);
small option to report small-sample statistics;
first-stage regressions reported with various tests and statistics for
identification and instrument relevance;
ffirst option to report only these identification statistics
and not the first-stage regression results themselves.
ivreg2 can also be used for ordinary least squares (OLS) estimation
using the same command syntax as official regress and newey.

### Robust, cluster and 2-level cluster, AC, HAC, and cluster+HAC SEs and statistics

The standard errors and test statistics reported by ivreg2 can be made consistent
to a variety of violations of the assumption of i.i.d. errors.
When these options are combined with
either the gmm2s or cue options (see below),
the parameter estimators reported are also efficient
in the presence of the same violation of i.i.d. errors.

The options for SEs and statistics are:

(1) robust causes ivreg2 to report SEs and statistics that are
robust to the presence of arbitrary heteroskedasticity.

(2) cluster(varname) SEs and statistics are robust to both
arbitrary heteroskedasticity and arbitrary intra-group correlation,
where varname identifies the group.
See the relevant Stata manual entries on obtaining robust covariance estimates
for further details.

(3) cluster(varname1 varname2) provides 2-way clustered SEs
and statistics (Cameron et al. 2006, Thompson 2009)
that are robust to arbitrary heteroskedasticity and intra-group correlation
with respect to 2 non-nested categories defined by varname1 and varname2.
See below for a detailed description.

(4) bw(#) requests AC SEs and statistics that are
robust to arbitrary autocorrelation.

(5) bw(#) combined with robust
requests HAC SEs and statistics that are
robust to both arbitrary heteroskedasticity and arbitrary autocorrelation.

(6) bw(#) combined with cluster(varname)
is allowed with either 1- or 2-level clustering if the data are panel data
that are tsset on the time variable varname.
Following Driscoll and Kray (1998),
the SEs and statistics reported will be robust to disturbances
that are common to panel units and that are persistent, i.e., autocorrelated.

(7) dkraay(#) is a shortcut for the Driscoll-Kraay SEs
for panel data in (6).
It is equivalent to clustering on the tsset time variable
and the bandwidth supplied as #.
The default kernel Bartlett kernel can be overridden with the kernel option.

(8) kiefer implements SEs and statistics for panel data
that are robust to arbitrary intra-group autocorrelation
(but not heteroskedasticity) as per Kiefer (1980).
It is equivalent to to specifying the truncated kernel with kernel(tru)
and bw(#) where # is the full length of the panel.

Details:

cluster(varname1 varname2) provides 2-way cluster-robust SEs
and statistics as proposed by Cameron, Gelbach and Miller (2006) and Thompson (2009).
"Two-way cluster-robust" means the SEs and statistics
are robust to arbitrary within-group correlation in two distinct non-nested categories
defined by varname1 and varname2.
A typical application would be panel data where one "category" is the panel
and the other "category" is time;
the resulting SEs are robust
to arbitrary within-panel autocorrelation (clustering on panel id)
and to arbitrary contemporaneous cross-panel correlation (clustering on time).
There is no point in using 2-way cluster-robust SEs if the categories are nested,
because the resulting SEs are equivalent to clustering on the larger category.
varname1 and varname2 do not have to
uniquely identify observations.
The order of varname1 and varname2 does not matter for the results,
but processing may be faster if the category with the larger number of categories
(typically the panel dimension) is listed first.

Cameron, Gelbach and Miller (2006) show how this approach can accommodate
multi-way clustering, where the number of different non-nested categories is arbitary.
Their Stata command cgmreg implements 2-way and multi-way clustering
for OLS estimation.
The two-way clustered variance-covariance estimator
is calculated using 3 different VCEs: one clustered on varname1,
the second clustered on varname2, and the third clustered on the
intersection of varname1 and varname2.
Cameron et al. (2006, pp. 8-9) discuss two possible small-sample adjustments
using the number of clusters in each category.
cgmreg uses one method (adjusting the 3 VCEs separately based on
the number of clusters in the categories VCE clusters on);
ivreg2 uses the second (adjusting the final 2-way cluster-robust VCE
using the smaller of the two numbers of clusters).
For this reason, ivreg2 and cgmreg will produce slightly different SEs.
See also small sample corrections below.

ivreg2 allows a variety of options for kernel-based HAC and AC estimation.
The bw(#) option sets the bandwidth used in the estimation
and kernel(string) is the kernel used;
the default kernel is the Bartlett kernel,
also known in econometrics as Newey-West (see help newey).
The full list of kernels available is (abbreviations in parentheses):
Bartlett (bar); Truncated (tru); Parzen (par); Tukey-Hanning (thann);
Tukey-Hamming (thamm); Daniell (dan); Tent (ten); and Quadratic-Spectral (qua or qs).
When using the Bartlett, Parzen, or Quadratic spectral kernels, the automatic
bandwidth selection procedure of Newey and West (1994) can be chosen
by specifying bw(auto).
ivreg2 can also be used for kernel-based estimation
with panel data, i.e., a cross-section of time series.
Before using ivreg2 for kernel-based estimation
of time series or panel data,
the data must be tsset; see help tsset.

Following Driscoll and Kraay (1998),
bw(#) combined with cluster(varname)
and applied to panel data produces SEs that are
robust to arbitary common autocorrelated disturbances.
The data must be tsset with the time variable specified as varname.
Driscoll-Kraay SEs also can be specified using the dkraay(#)} option,
where # is the bandwidth.
The default Bartlett kernel can be overridden with the kernel option.
Note that the Driscoll-Kraay variance-covariance estimator is a large-T estimator,
i.e., the panel should have a long-ish time-series dimension.

Used with 2-way clustering as per Thompson (2009),
bw(#) combined with cluster(varname)
provides SEs and statistics that are robust
to autocorrelated within-panel disturbances (clustering on panel id)
and to autocorrelated across-panel disturbances (clustering on time
combined with kernel-based HAC).
The approach proposed by Thompson (2009) can be implemented in ivreg2
by choosing the truncated kernel kernel(tru)
and bw(#), where the researcher knows or assumes
that the common autocorrelated disturbances can be ignored after # periods.

Important: Users should be aware of the asymptotic requirements
for the consistency of the chosen VCE.
In particular: consistency of the 1-way cluster-robust VCE requires
the number of clusters to go off to infinity;
consistency of the 2-way cluster-robust VCE requires the numbers of
clusters in both categories to go off to infinity;
consistency of kernel-robust VCEs requires the numbers of
observations in the time dimension to go off to infinity.
See Angrist and Pischke (2009), Cameron et al. (2006) and Thompson (2009)
for detailed discussions of the performance of the cluster-robust VCE
when the numbers of clusters is small.

### GMM estimation

When combined with the above options, the gmm2s option generates
efficient estimates of the coefficients as well as consistent
estimates of the standard errors.
The gmm2s option implements the two-step efficient
generalized method of moments (GMM) estimator.
The efficient GMM estimator minimizes the GMM criterion function
J=N*g'*W*g, where N is the sample size,
g are the orthogonality or moment conditions
(specifying that all the exogenous variables, or instruments,
in the equation are uncorrelated with the error term)
and W is a weighting matrix.
In two-step efficient GMM, the efficient or optimal weighting matrix
is the inverse of an estimate of the covariance matrix of orthogonality conditions.
The efficiency gains of this estimator relative to the
traditional IV/2SLS estimator derive from the use of the optimal
weighting matrix, the overidentifying restrictions of the model,
and the relaxation of the i.i.d. assumption.
For an exactly-identified model,
the efficient GMM and traditional IV/2SLS estimators coincide,
and under the assumptions of conditional homoskedasticity and independence,
the efficient GMM estimator is the traditional IV/2SLS estimator.
For further details, see Hayashi (2000), pp. 206-13 and 226-27.

The center option specifies that the moments in the GMM weighting matrix
are centered so that they have mean zero.
There is some evidence that the use of centered moments leads to better
finite-sample performance; see e.g. Hall (2005), pp. 131-8 and 145-8.

The wmatrix option allows the user to specify a weighting matrix
rather than computing the optimal weighting matrix.
Estimation with the wmatrix option yields a possibly inefficient GMM estimator.
ivreg2 will use this inefficient estimator as the first-step GMM estimator
in two-step efficient GMM when combined with the gmm2s option;
otherwise, ivreg2 reports the regression results
using this inefficient GMM estimator.

The smatrix option allows the user to directly
specify the matrix S, the covariance matrix of orthogonality conditions.
ivreg2 will use this matrix in the calculation of the variance-covariance
matrix of the estimator, the J statistic,
and, if the gmm2s option is specified,
the two-step efficient GMM coefficients.
The smatrix can be useful for guaranteeing a positive test statistic
in user-specified "GMM-distance tests" (see below).
For further details, see Hayashi (2000), pp. 220-24.

### LIML, k-class and GMM-CUE estimation

Maximum-likelihood estimation of a single equation of this form
(endogenous RHS variables and excluded instruments)
is known as limited-information maximum likelihood or LIML.
The overidentifying restrictions test
reported after LIML estimation is the Anderson-Rubin (1950) overidentification
statistic in a homoskedastic context.
LIML, OLS and IV/2SLS are examples of k-class estimators.
LIML is a k-class estimator with k=the LIML eigenvalue lambda;
2SLS is a k-class estimator with k=1;
OLS is a k-class esimator with k=0.
Estimators based on other values of k have been proposed.
Fuller's modified LIML (available with the fuller(#) option)
sets k = lambda - alpha/(N-L), where lambda is the LIML eigenvalue,
L = number of instruments (L1 excluded and L2 included),
and the Fuller parameter alpha is a user-specified positive constant.
Nagar's bias-adjusted 2SLS estimator can be obtained with the
kclass(#) option by setting
k = 1 + (L-K)/N, where L-K = number of overidentifying restrictions,
K = number of regressors (K1 endogenous and K2=L2 exogenous)
and N = the sample size.
For a discussion of LIML and k-class estimators,
see Davidson and MacKinnon (1993, pp. 644-51).

The GMM generalization of the LIML estimator
to the case of possibly heteroskedastic
and autocorrelated disturbances
is the "continuously-updated" GMM estimator or CUE
of Hansen, Heaton and Yaron (1996).
The CUE estimator directly maximizes the GMM objective function
J=N*g'*W(b_cue)*g, where W(b_cue) is an optimal weighting matrix
that depends on the estimated coefficients b_cue.
cue, combined with robust, cluster, and/or bw,
generates coefficient estimates that are efficient in the presence
of the corresponding deviations from homoskedasticity.
Specifying cue with no other options
is equivalent to the combination of the options liml and coviv.
The CUE estimator requires numerical optimization methods,
and the implementation here uses Mata's optimize routine.
The starting values are either IV or two-step efficient GMM
coefficient estimates.
If the user wants to evaluate the CUE objective function at
an arbitrary user-defined coefficient vector instead of having ivreg2
find the coefficient vector that minimizes the objective function,
the b0(matrix) option can be used.
The value of the CUE objective function at b0
is the Sargan or Hansen J statistic reported in the output.

### Summary of robust, HAC, AC, GMM, LIML and CUE options

Estimator | No VCE option specificed | VCE option
option | robust, cluster, bw, kernel
(none) | IV/2SLS | IV/2SLS with
| SEs consistent under homoskedasticity | robust SEs

liml | LIML | LIML with
| SEs consistent under homoskedasticity | robust SEs

gmm2s | IV/2SLS | Two-step GMM with
| SEs consistent under homoskedasticity | robust SEs

cue | LIML | CUE GMM with
| SEs consistent under homoskedasticity | robust SEs

kclass | k-class estimator | k-class estimator with
| SEs consistent under homoskedasticity | robust SEs

wmatrix | Possibly inefficient GMM | Ineff GMM with
| SEs consistent under homoskedasticity | robust SEs

gmm2s + | Two-step GMM | Two-step GMM with
wmatrix | with user-specified first step | robust SEs
| SEs consistent under homoskedasticity

With the bw or bw and kernel VCE options,
SEs are autocorrelation-robust (AC).
Combining the robust option with bw, SEs are heteroskedasticity- and
autocorrelation-robust (HAC).

For further details, see Hayashi (2000), pp. 206-13 and 226-27
(on GMM estimation), Wooldridge (2002), p. 193 (on cluster-robust GMM),
and Hayashi (2000), pp. 406-10 or Cushing and McGarvey (1999)
(on kernel-based covariance estimation).

### Testing overidentifying restrictions

The Sargan-Hansen test is a test of overidentifying restrictions.
The joint null hypothesis is that the instruments are valid
instruments, i.e., uncorrelated with the error term,
and that the excluded instruments are correctly excluded from the estimated equation.
Under the null, the test statistic is distributed as chi-squared
in the number of (L-K) overidentifying restrictions.
A rejection casts doubt on the validity of the instruments.
For the efficient GMM estimator, the test statistic is
Hansen's J statistic, the minimized value of the GMM criterion function.
For the 2SLS estimator, the test statistic is Sargan's statistic,
typically calculated as N*R-squared from a regression of the IV residuals
on the full set of instruments.
Under the assumption of conditional homoskedasticity,
Hansen's J statistic becomes Sargan's statistic.
The J statistic is consistent in the presence of heteroskedasticity
and (for HAC-consistent estimation) autocorrelation;
Sargan's statistic is consistent if the disturbance is homoskedastic
and (for AC-consistent estimation) if it is also autocorrelated.
With robust, bw and/or cluster,
Hansen's J statistic is reported.
In the latter case the statistic allows observations
to be correlated within groups.
For further discussion see e.g. Hayashi (2000, pp. 227-8, 407, 417).

The Sargan statistic can also be calculated after
ivreg or ivreg2 by the command overid.
The features of ivreg2 that are unavailable in overid
are the J statistic and the C statistic;
the overid options unavailable in ivreg2
are various small-sample and pseudo-F versions of Sargan's statistic
and its close relative, Basmann's statistic.
See help overid (if installed).

### Testing subsets of regressors and instruments for endogeneity

The C statistic
(also known as a "GMM distance"
or "difference-in-Sargan" statistic)
implemented using the orthog option,
allows a test of a subset of the orthogonality conditions, i.e.,
it is a test of the exogeneity of one or more instruments.
It is defined as
the difference of the Sargan-Hansen statistic
of the equation with the smaller set of instruments
(valid under both the null and alternative hypotheses)
and the equation with the full set of instruments,
i.e., including the instruments whose validity is suspect.
Under the null hypothesis that
both the smaller set of instruments
and the additional, suspect instruments are valid,
the C statistic is distributed as chi-squared
in the number of instruments tested.
Note that failure to reject the null hypothesis
requires that the full set of orthogonality conditions be valid;
the C statistic and the Sargan-Hansen test statistics
for the equations with both the smaller and full set of instruments
should all be small.
The instruments tested may be either excluded or included exogenous variables.
If excluded exogenous variables are being tested,
the equation that does not use these orthogonality conditions
omits the suspect instruments from the excluded instruments.
If included exogenous variables are being tested,
the equation that does not use these orthogonality conditions
treats the suspect instruments as included endogenous variables.
To guarantee that the C statistic is non-negative in finite samples,
the estimated covariance matrix of the full set orthogonality conditions
is used to calculate both Sargan-Hansen statistics
(in the case of simple IV/2SLS, this amounts to using the MSE
from the unrestricted equation to calculate both Sargan statistics).
If estimation is by LIML, the C statistic reported
is now based on the Sargan-Hansen test statistics from
the restricted and unrestricted equation.
For further discussion, see Hayashi (2000), pp. 218-22 and pp. 232-34.

Endogeneity tests of one or more endogenous regressors
can implemented using the endog option.
Under the null hypothesis that the specified endogenous regressors
can actually be treated as exogenous, the test statistic is distributed
as chi-squared with degrees of freedom equal to the number of regressors tested.
The endogeneity test implemented by ivreg2, is, like the C statistic,
defined as the difference of two Sargan-Hansen statistics:
one for the equation with the smaller set of instruments,
where the suspect regressor(s) are treated as endogenous,
and one for the equation with the larger set of instruments,
where the suspect regressors are treated as exogenous.
Also like the C statistic, the estimated covariance matrix used
guarantees a non-negative test statistic.
Under conditional homoskedasticity,
this endogeneity test statistic is numerically equal to
a Hausman test statistic; see Hayashi (2000, pp. 233-34).
The endogeneity test statistic can also be calculated after
ivreg or ivreg2 by the command ivendog.
Unlike the Durbin-Wu-Hausman tests reported by ivendog,
the endog option of ivreg2 can report test statistics
that are robust to various violations of conditional homoskedasticity;
the ivendog option unavailable in ivreg2
is the Wu-Hausman F-test version of the endogeneity test.
See help ivendog (if installed).

### Tests of under- and weak identification

ivreg2 automatically reports tests of
both underidentification and weak identification.
The underidentification test is an LM test of whether the equation is identified,
i.e., that the excluded instruments are "relevant",
meaning correlated with the endogenous regressors.
The test is essentially the test of the rank of a matrix:
under the null hypothesis that the equation is underidentified,
the matrix of reduced form coefficients on the L1 excluded instruments
has rank=K1-1 where K1=number of endogenous regressors.
Under the null,
the statistic is distributed as chi-squared
with degrees of freedom=(L1-K1+1).
A rejection of the null indicates that the matrix is full column rank,
i.e., the model is identified.

For a test of whether a particular endogenous regressor alone is identified,
see the discussion below of the
Sanderson-Windmeijer (2015) and Angrist-Pischke (2009) procedures.

When errors are assumed to be i.i.d.,
ivreg2 automatically reports an LM version of
the Anderson (1951) canonical correlations test.
Denoting the minimum eigenvalue of the canonical correlations as CCEV,
the smallest canonical correlation between the K1 endogenous regressors
and the L1 excluded instruments
(after partialling out the K2=L2 exogenous regressors)
is sqrt(CCEV),
and the Anderson LM test statistic is N*CCEV,
i.e., N times the square of the smallest canonical correlation.
With the first or ffirst options,
ivreg2 also reports the closely-related
Cragg-Donald (1993) Wald test statistic.
Again assuming i.i.d. errors,
and denoting the minimum eigenvalue of the Cragg-Donald statistic as CDEV,
CDEV=CCEV/(1-CCEV),
and the Cragg-Donald Wald statistic is N*CDEV.
Like the Anderson LM statistic, the Cragg-Donald Wald statistic
is distributed as chi-squred with (L1-K1+1) degrees of freedom.
Note that a result of rejection of the null
should be treated with caution,
because weak instrument problems may still be present.
See Hall et al. (1996) for a discussion of this test,
and below for discussion of testing for the presence of weak instruments.

When the i.i.d. assumption is dropped
and ivreg2 reports heteroskedastic, AC, HAC
or cluster-robust statistics,
the Anderson LM and Cragg-Donald Wald statistics are no longer valid.
In these cases, ivreg2 reports the LM and Wald versions
of the Kleibergen-Paap (2006) rk statistic,
also distributed as chi-squared with (L1-K1+1) degrees of freedom.
The rk statistic can be seen as a generalization of these tests
to the case of non-i.i.d. errors;
see Kleibergen and Paap (2006) for discussion,
and Kleibergen and Schaffer (2007) for a Stata implementation, ranktest.
ivreg2 requires ranktest to be installed,
and will prompt the user to install it if necessary.
If ivreg2 is invoked with the robust option,
the rk underidentification test statistics will be heteroskedastic-robust,
and similarly with bw and cluster.

"Weak identification" arises when the excluded instruments are correlated
with the endogenous regressors, but only weakly.
Estimators can perform poorly when instruments are weak,
and different estimators are more robust to weak instruments (e.g., LIML)
than others (e.g., IV);
see, e.g., Stock and Yogo (2002, 2005) for further discussion.
When errors are assumed to be i.i.d.,
the test for weak identification automatically reported
by ivreg2 is an F version of the Cragg-Donald Wald statistic, (N-L)/L1*CDEV,
where L is the number of instruments and L1 is the number of excluded instruments.
Stock and Yogo (2005) have compiled critical values
for the Cragg-Donald F statistic for
several different estimators (IV, LIML, Fuller-LIML),
several different definitions of "perform poorly" (based on bias and test size),
and a range of configurations (up to 100 excluded instruments
and up to 2 or 3 endogenous regressors,
depending on the estimator).
ivreg2 will report the Stock-Yogo critical values
if these are available;
missing values mean that the critical values
haven't been tabulated or aren't applicable.
See Stock and Yogo (2002, 2005) for details.

When the i.i.d. assumption is dropped
and ivreg2 is invoked with the robust, bw or cluster options,
the Cragg-Donald-based weak instruments test is no longer valid.
ivreg2 instead reports a correspondingly-robust
Kleibergen-Paap Wald rk F statistic.
The degrees of freedom adjustment for the rk statistic is (N-L)/L1,
as with the Cragg-Donald F statistic,
except in the cluster-robust case,
when the adjustment is N/(N-1) * (N_clust-1)/N_clust,
following the standard Stata small-sample adjustment for cluster-robust. In the case of two-way clustering, N_clust is the minimum of N_clust1 and N_clust2.
The critical values reported by ivreg2 for the Kleibergen-Paap statistic
are the Stock-Yogo critical values for the Cragg-Donald i.i.d. case.
The critical values reported with 2-step GMM
are the Stock-Yogo IV critical values,
and the critical values reported with CUE
are the LIML critical values.

### Testing instrument redundancy

The redundant option allows a test of
whether a subset of excluded instruments is "redundant".
Excluded instruments are redundant if the asymptotic efficiency
of the estimation is not improved by using them.
Breusch et al. (1999) show that the condition for the redundancy of a set of instruments
can be stated in several equivalent ways:
e.g., in the reduced form regressions of the endogenous regressors
on the full set of instruments,
the redundant instruments have statistically insignificant coefficients;
or the partial correlations between the endogenous regressors
and the instruments in question are zero.
ivreg2 uses a formulation based on testing the rank
of the matrix cross-product between the endogenous regressors
and the possibly-redundant instruments after both have
all other instruments partialled-out;
ranktest is used to test whether the matrix has zero rank.
The test statistic is an LM test
and numerically equivalent to a regression-based LM test.
Under the null that the specified instruments are redundant,
the statistic is distributed as chi-squared
with degrees of freedom=(#endogenous regressors)*(#instruments tested).
Rejection of the null indicates that
the instruments are not redundant.
When the i.i.d. assumption is dropped
and ivreg2 reports heteroskedastic, AC, HAC
or cluster-robust statistics,
the redundancy test statistic is similarly robust.
See Baum et al. (2007) for further discussion.

Calculation and reporting of all underidentification
and weak identification statistics
can be supressed with the noid option.

### First-stage regressions, identification, and weak-id-robust inference

The first, sfirst and ffirst options report
various first-stage results and identification statistics.
The first option reports the individual first-stage regressions separately.
The sfirst option reports all the first-stage regressions jointly
in a single estimation table along with the reduced form equation
for the dependent variable (see below);
the output is similar in appearance and usage (e.g., in testing)
as that generated by Stata's mvreg.

Tests of both underidentification and weak identification are reported
for each endogenous regressor separately,
using the method of Sanderson-Windmeijer (2015)
(a modification and improvement of the described by
Angrist and Pischke (2009), pp. 217-18, and implemented
in previous versions of ivreg2;
the AP test statistics remain available in the e(first) matrix).

The Sanderson-Windmeijer (SW) first-stage chi-squared and F statistics
are tests of underidentification and weak identification, respectively,
of individual endogenous regressors.
They are constructed by "partialling-out" linear projections of the
remaining endogenous regressors.
The SW chi-squared Wald statistic is distributed as chi2(L1-K1+1))
under the null that the particular endogenous regressor
in question is unidentified.
In the special case of a single endogenous regressor,
the SW statistic reported is identical to underidentification statistics reported
in the ffirst output,
namely the Cragg-Donald Wald statistic (if i.i.d.)
or the Kleibergen-Paap rk Wald statistic (if robust, cluster-robust, AC or HAC
statistics have been requested);
see above.
The SW first-stage F statistic is the F form of the same test statistic.
It can be used as a diagnostic for whether a particular endogenous regressor
is "weakly identified" (see above).
For further details and discussion, see Sanderson and Windmeijer (2015).

The first-stage results are always reported with small-sample statistics,
to be consistent with the recommended use of the first-stage F-test as a diagnostic.
If the estimated equation is reported with robust standard errors,
the first-stage F-test is also robust.

A full set of first-stage statistics for each of the K1 endogenous regressors
is saved in the matrix e(first).
These include (a) the SW and AP F and chi-squared statistics; (b) the "partial R-squared"
(squared partial correlation) corresponding to the SW and SP statistics;
(c) Shea's (1997) partial R-squared measure (closely related to the SW and AP statistics,
but not amenable to formal testing); (d) the simple F and partial R-squared
statistics for each of the first-stage equations,
with no adjustments if there is more than one endogenous regressor.
In the special case of a single endogenous regressor,
these F statistics and partial R-squareds are identical.

The first-stage output also includes
two statistics that provide weak-instrument robust inference
for testing the significance of the endogenous regressors in the structural equation being estimated.
The first statistic is the Anderson-Rubin (1949) test
(not to be confused with the Anderson-Rubin overidentification test for LIML estimation;
see above).
The second is the closely related Stock-Wright (2000) S statistic.
The null hypothesis tested in both cases is that
the coefficients of the endogenous regressors in the structural equation are jointly equal to zero,
and, in addition, that the overidentifying restrictions are valid.
Both tests are robust to the presence of weak instruments.
The tests are equivalent to estimating the reduced form of the equation
(with the full set of instruments as regressors)
and testing that the coefficients of the excluded instruments are jointly equal to zero.
In the form reported by ivreg2,the Anderson-Rubin statistic is a Wald test
and the Stock-Wright S statistic is an LM test.
Both statistics are distributed as chi-squared with L1 degrees of freedom,
where L1=number of excluded instruments.
The traditional F-stat version of the Anderson-Rubin test is also reported.
See Stock and Watson (2000), Dufour (2003), Chernozhukov and Hansen (2005) and Kleibergen (2007)
for further discussion.
For related alternative test statistics that are also robust to weak instruments,
see condivreg and weakiv,
and the corresponding discussions
in Moreira and Poi (2003) and Mikusheva and Poi (2006),
and in Finlay and Magnusson (2009), respectively.

The savefirst option requests that the individual first-stage regressions
be saved for later access using the estimates command.
If saved, they can also be displayed using first or ffirst and the ivreg2 replay syntax.
The regressions are saved with the prefix "_ivreg2_",
unless the user specifies an alternative prefix with the
savefp[refix](prefix) option.
The savesfirst and savesfp[refix](prefix) options
work similarly for the sfirst option if the user wishes to save
the first-stage and reduced form estimations as a single estimated system.

### Reduced form estimates

The rf option requests that the reduced form estimation of the equation be displayed.
The saverf option requests that the reduced form estimation is saved
for later access using the estimates command.
If saved, it can also be displayed using the rf and the ivreg2 replay syntax.
The regression is saved with the prefix "_ivreg2_",
unless the user specifies an alternative prefix with the
saverfp[refix](prefix) option.

### Partialling-out exogenous regressors

The partial(varlist) option requests that
the exogenous regressors in varlist are "partialled out"
from all the other variables (other regressors and excluded instruments) in the estimation.
If the equation includes a constant, it is also automatically partialled out as well.
The coefficients corresponding to the regressors in varlist are not calculated.
By the Frisch-Waugh-Lovell (FWL) theorem, in IV,
two-step GMM and LIML estimation the coefficients for the remaining regressors
are the same as those that would be obtained if the variables were not partialled out.
(NB: this does not hold for CUE or GMM iterated more than two steps.)
The partial option is most useful when using cluster
and #clusters < (#exogenous regressors + #excluded instruments).
In these circumstances,
the covariance matrix of orthogonality conditions S is not of full rank,
and efficient GMM and overidentification tests are infeasible
since the optimal weighting matrix W = S^-1
cannot be calculated.
The problem can be addressed by using partial
to partial out enough exogenous regressors for S to have full rank.
A similar problem arises when the regressors include a variable that is a singleton dummy,
i.e., a variable with one 1 and N-1 zeros or vice versa,
if a robust covariance matrix is requested.
The singleton dummy causes the robust covariance matrix estimator
to be less than full rank.
In this case, partialling-out the variable with the singleton dummy solves the problem.
Specifying partial(_cons) will cause just the constant to be partialled-out,
i.e., the equation will be estimated in deviations-from-means form.
When ivreg2 is invoked with partial,
it reports test statistics with the same small-sample adjustments
as if estimating without partial,
with the exception of the information in the output header
(the model F, R-sqs and total sums-of-squares
refer to the model after the variables are partialled-out).
Note that after estimation using the partial option,
the post-estimation predict can be used only to generate residuals.

### OLS and Heteroskedastic OLS (HOLS) estimation

ivreg2 also allows straightforward OLS estimation
by using the same syntax as regress, i.e.,
ivreg2 depvar varlist1.
This can be useful if the user wishes to use one of the
features of ivreg2 in OLS regression, e.g., AC or
HAC standard errors.

If the list of endogenous variables varlist2 is empty
but the list of excluded instruments varlist_iv is not,
and the option gmm2s is specified,
ivreg2 calculates Cragg's "heteroskedastic OLS" (HOLS) estimator,
an estimator that is more efficient than OLS
in the presence of heteroskedasticity of unknown form
(see Davidson and MacKinnon (1993), pp. 599-600).
If the option bw(#) is specified,
the HOLS estimator is efficient in the presence of
arbitrary autocorrelation;
if both bw(#) and robust are specified
the HOLS estimator is efficient in the presence of
arbitrary heteroskedasticity and autocorrelation;
and if cluster(varlist) is used,
the HOLS estimator is efficient in the presence of
arbitrary heteroskedasticity and within-group correlation.
The efficiency gains of HOLS derive from the orthogonality conditions
of the excluded instruments listed in varlist_iv.
If no endogenous variables are specified and gmm2s is not specified,
ivreg2 reports standard OLS coefficients.
The Sargan-Hansen statistic reported
when the list of endogenous variables varlist2 is empty
is a Lagrange multiplier (LM) test
of the hypothesis that the excluded instruments varlist_iv are
correctly excluded from the restricted model.
If the estimation is LIML, the LM statistic reported
is now based on the Sargan-Hansen test statistics from
the restricted and unrestricted equation.
For more on LM tests, see e.g. Wooldridge (2002), pp. 58-60.
Note that because the approach of the HOLS estimator
has applications beyond heteroskedastic disturbances,
and to avoid confusion concerning the robustness of the estimates,
the estimators presented above as "HOLS"
are described in the output of ivreg2
as "2-Step GMM", "CUE", etc., as appropriate.

### Collinearities

ivreg2 checks the lists of included instruments,
excluded instruments, and endogenous regressors
for collinearities and duplicates. If an endogenous regressor is
collinear with the instruments, it is reclassified as exogenous. If any
endogenous regressors are collinear with each other, some are dropped.
If there are any collinearities among the instruments, some are dropped;
excluded instruments are dropped before included instruments.
If any variables are dropped, a list of their names are saved
in the macros e(collin) and/or e(dups).

Starting with ivreg2 v4.1,
the Stata 11+ convention is followed and
omitted variables are reported in the regression output
and saved in the e(b) and e(V) macros.
These omitted variables, as well as other omitted variables
(e.g., empty factor variables) can be suppressed
by use of the bvclean option.
The Stata display options
noomitted, vsquish, noemptycells, baselevels and allbaselevels
are also supported; see ereturn.
Variable lists with collinear variables, duplicates marked with Stata's "o." operator,
and factor variable base variables
are saved in macros with a "0" appended to the corresponding macro names;
lists with these variables removed are saved in macros with a "1" appended.

Collinearity checks can be supressed with the nocollin option.

### Speed options: nocollin and noid

Two options are available for speeding execution.
nocollin specifies that the collinearity checks not be performed.
noid suspends calculation and reporting of
the underidentification and weak identification statistics
in the main output.

### Small sample corrections

Mean square error = sqrt(RSS/(N-K)) if small, = sqrt(RSS/N) otherwise.

If robust is chosen, the finite sample adjustment
(see [R] regress) to the robust variance-covariance matrix
qc = N/(N-K) if small, qc = 1 otherwise.

If cluster is chosen, the finite sample adjustment
qc = (N-1)/(N-K)*M/(M-1) if small, where M=number of clusters,
qc = 1 otherwise.
If 2-way clustering is used, M=min(M1,M2),
where M1=number of clusters in group 1
and M2=number of clusters in group 2.

If the partial(varlist) option is used,
the partialled-out exogenous regressors are included in K.

The Sargan and C (difference-in-Sargan) statistics use
error variance = RSS/N, i.e., there is no small sample correction.

A full discussion of these computations and related topics
can be found in Baum, Schaffer, and Stillman (2003) and Baum, Schaffer and
Stillman (2007). Some features of the program postdate the former article and are described in the latter paper.
Some features, such as two-way clustering, postdate the latter article as well.

## Options summary

gmm2s requests the two-step efficient GMM estimator.
If no endogenous variables are specified, the estimator is Cragg's HOLS estimator.

liml requests the limited-information maximum likelihood estimator.

fuller(#) specifies that Fuller's modified LIML estimator
is calculated using the user-supplied Fuller parameter alpha,
a non-negative number.
Alpha=1 has been suggested as a good choice.

kclass(#) specifies that a general k-class estimator is calculated
using the user-supplied #, a non-negative number.

coviv specifies that the matrix used to calculate the
covariance matrix for the LIML or k-class estimator
is based on the 2SLS matrix, i.e., with k=1.
In this case the covariance matrix will differ from that calculated for the 2SLS
estimator only because the estimate of the error variance will differ.
The default is for the covariance matrix to be based on the LIML or k-class matrix.

cue requests the GMM continuously-updated estimator (CUE).

b0(matrix) specifies that the J statistic
(i.e., the value of the CUE objective function)
should be calculated for an arbitrary coefficient vector b0.
That vector must be provided as a matrix with appropriate row and column names.
Under- and weak-identification statistics are not reported
in the output.

robust specifies that the Eicker/Huber/White/sandwich estimator of
variance is to be used in place of the traditional calculation. robust
combined with cluster() further allows residuals which are not
independent within cluster (although they must be independent between
clusters). See [U] Obtaining robust variance estimates.

cluster(varlist) specifies that the observations
are independent across groups (clusters) but not necessarily independent
within groups.
With 1-way clustering, cluster(varname)
specifies to which group each observation
belongs; e.g., cluster(personid) in data with repeated observations on
individuals.
With 2-way clustering, cluster(varname1 varname2)
specifies the two (non-nested) groups to which each observation belongs.
Specifying cluster() implies robust.

bw(#) impements AC or HAC covariance estimation
with bandwidth equal to #, where # is an integer greater than zero.
Specifying robust implements HAC covariance estimation;
omitting it implements AC covariance estimation.
If the Bartlett (default), Parzen or Quadratic Spectral kernels are selected,
the value auto may be given (rather than an integer)
to invoke Newey and West's (1994) automatic bandwidth selection procedure.

kernel(string)) specifies the kernel
to be used for AC and HAC covariance estimation;
the default kernel is Bartlett (also known in econometrics
as Newey-West).
The full list of kernels available is (abbreviations in parentheses):
Bartlett (bar); Truncated (tru); Parzen (par); Tukey-Hanning (thann);
Tukey-Hamming (thamm); Daniell (dan); Tent (ten); and Quadratic-Spectral (qua or qs).

Note: in the cases of the Bartlett, Parzen,
and Tukey-Hanning/Hamming kernels, the number of lags used
to construct the kernel estimate equals the bandwidth minus one.
Stata's official newey implements
HAC standard errors based on the Bartlett kernel,
and requires the user to specify
the maximum number of lags used and not the bandwidth;
see help newey.
If these kernels are used with bw(1),
no lags are used and ivreg2 will report the usual
Eicker/Huber/White/sandwich variance estimates.

center specifies that the moments used to construct
the efficient GMM weighting matrix are centered.
If used with an inefficient 1-step estimator,
the estimated coefficients and their standard errors are unaffected but
centered moments will be used in the reported Hansen J statistic.

wmatrix(matrix) specifies a user-supplied weighting matrix
in place of the computed optimal weighting matrix.
The matrix must be positive definite.
The user-supplied matrix must have the same row and column names
as the instrument variables in the regression model (or a subset thereof).

smatrix(matrix) specifies a user-supplied covariance matrix
of the orthogonality conditions to be used in calculating the covariance matrix of the estimator.
The matrix must be positive definite.
The user-supplied matrix must have the same row and column names
as the instrument variables in the regression model (or a subset thereof).

orthog(varlist_ex) requests that a C-statistic
be calculated as a test of the exogeneity of the instruments in varlist_ex.
These may be either included or excluded exogenous variables.
The standard order condition for identification applies:
the restricted equation that does not use these variables
as exogenous instruments must still be identified.

endog(varlist_en) requests that a C-statistic
be calculated as a test of the endogeneity
of the endogenous regressors in varlist_en.

redundant(varlist_ex) requests an LM test
of the redundancy of the instruments in varlist_ex.
These must be excluded exogenous variables.
The standard order condition for identification applies:
the restricted equation that does not use these variables
as exogenous instrumenst must still be identified.

small requests that small-sample statistics (F and t-statistics)
be reported instead of large-sample statistics (chi-squared and z-statistics).
Large-sample statistics are the default.
The exception is the statistic for the significance of the regression,
which is always reported as a small-sample F statistic.

noconstant suppresses the constant term (intercept) in the
regression. If noconstant is specified, the constant term is excluded
from both the final regression and the first-stage regression. To include a
constant in the first-stage when noconstant is specified, explicitly
include a variable containing all 1's in varlist_iv.

first requests that the full first-stage regression results be displayed,
along with the associated diagnostic and identification statistics.

sfirst requests that the first-stage and reduced form regressions
are reported as a single system of equations (i.e., in a single regression output table).

ffirst requests the first-stage diagnostic and identification statistics.
The results are saved in various e() macros.

nocollin suppresses the checks for collinearities
and duplicate variables.

noid suppresses the calculation and reporting
of underidentification and weak identification statistics.

savefirst requests that the first-stage regressions results
are saved for later access using the estimates command.
The names under which the first-stage regressions are saved
are the names of the endogenous regressors prefixed by "_ivreg2_".
If these use Stata's time-series operators,
the "." is replaced by a "_".

savefp[refix](prefix) requests that
the first-stage regression results be saved using the user-specified prefix
instead of the default "_ivreg2_".

rf requests that the reduced-form estimation of the equation
be displayed.

saverf requests that the reduced-form estimation of the equation
be saved for later access using the estimates command.
The estimation is stored under the name of the dependent variable
prefixed by "_ivreg2_".
If this uses Stata's time-series operators,
the "." is replaced by a "_".

saverfp[refix](prefix) requests that
the reduced-form estimation be saved using the user-specified prefix
instead of the default "_ivreg2_".

sfirst requests that the first-stage and reduced form equations
are estimated and displayed as a single system of equations.

savesfirst requests that the system of first-stage
and reduced form estimations be saved for later access
using the estimates command.
The estimation is stored under the name of the dependent variable
prefixed by "_ivreg2_sfirst_".
If this uses Stata's time-series operators,
the "." is replaced by a "_".

saverfp[refix](prefix) requests that
the reduced-form estimation be saved using the user-specified prefix
instead of the default "_ivreg2_sfirst_".

partial(varlist) requests that
the exogenous regressors in varlist be partialled out
from the other variables in the equation.
If the equation includes a constant,
it is automatically partialled out as well.
The coefficients corresponding to the regressors in varlist
are not calculated.

level(#) specifies the confidence level, in percent,
for confidence intervals of the coefficients; see help level.

bvclean specifies that omitted variables (including factor base variables)
are not reported in the estimation output and are not saved in the
e(b) and e(V) macros.

noheader, eform(), depname() and plus
are for ado-file writers; see [R] ivreg and [R] regress.

nofooter suppresses the display of the footer containing
identification and overidentification statistics,
exogeneity and endogeneity tests,
lists of endogenous variables and instruments, etc.

version causes ivreg2 to display its current version number
and to leave it in the macro e(version).
It cannot be used with any other options.
and will clear any existing e() saved results.

## Running ivreg2 under earlier versions of Stata

The most-up-to-date implementation of ivreg2 requires Stata version 11 or later.
If ivreg2 is called under earlier versions of Stata,
it will automatically run a legacy version ivreg2x,
where "x" denotes the required Stata version.
These versions of ivreg2 - ivreg28, ivreg29 and ivreg210 -
are self-contained and require a minimum of Stata version 8/9/10, respectively.
"Self-contained" means these legacy versions (unlike the main up-to-date ivreg2 code)
do not require access to any external Mata library or user-written Stata routines.
These legacy versions are installed with the ivreg2 package,
can also be called directly from the Stata command line or in do files,
and come with their own help files.

For example, if a user has Stata 8 installed and calls ivreg2,
it will invoke the legacy version ivreg28.
If a user has a later version of Stata
but wants to run the Stata 8 legacy version of ivreg2,
s/he can estimate either calling ivreg28 directly
or by calling ivreg2 under version control (i.e., "version 8: ivreg2").
To see what options are/aren't available with this particular legacy version,
the user can see help ivreg28.

## Remarks and saved results

ivreg2 does not report an ANOVA table.
Instead, it reports the RSS and both the centered and uncentered TSS.
It also reports both the centered and uncentered R-squared.
NB: the TSS and R-squared reported by official ivreg is centered
if a constant is included in the regression, and uncentered otherwise.

ivreg2 saves the following results in e():

Scalars
| e(N) | Number of observations
| e(yy) | Total sum of squares (SS), uncentered (y'y)
| e(yyc) | Total SS, centered (y'y - ((1'y)^2)/n)
| e(rss) | Residual SS
| e(mss) | Model SS =yyc-rss if the eqn has a constant, =yy-rss otherwise
| e(df_m) | Model degrees of freedom
| e(df_r) | Residual degrees of freedom
| e(r2u) | Uncentered R-squared, 1-rss/yy
| e(r2c) | Centered R-squared, 1-rss/yyc
| e(r2) | Centered R-squared if the eqn has a constant, uncentered otherwise
| e(r2_a) | Adjusted R-squared
| e(ll) | Log likelihood
| e(rankxx) | Rank of the matrix of observations on rhs variables=K
| e(rankzz) | Rank of the matrix of observations on instruments=L
| e(rankV) | Rank of covariance matrix V of coefficients
| e(rankS) | Rank of covariance matrix S of orthogonality conditions
| e(rmse) | root mean square error=sqrt(rss/(N-K)) if -small-, =sqrt(rss/N) if not
| e(F) | F statistic
| e(N_clust) | Number of clusters (or min(N_clust1,N_clust2) if 2-way clustering)
| e(N_clust1) | Number of clusters in dimension 1 (if 2-way clustering)
| e(N_clust2) | Number of clusters in dimension 2 (if 2-way clustering)
| e(bw) | Bandwidth
| e(lambda) | LIML eigenvalue
| e(kclass) | k in k-class estimation
| e(fuller) | Fuller parameter alpha
| e(sargan) | Sargan statistic
| e(sarganp) | p-value of Sargan statistic
| e(sargandf) | dof of Sargan statistic = degree of overidentification = L-K
| e(j) | Hansen J statistic
| e(jp) | p-value of Hansen J statistic
| e(jdf) | dof of Hansen J statistic = degree of overidentification = L-K
| e(arubin) | Anderson-Rubin overidentification LR statistic N*ln(lambda)
| e(arubinp) | p-value of Anderson-Rubin overidentification LR statistic
| e(arubin_lin) | Anderson-Rubin linearized overidentification statistic N*(lambda-1)
| e(arubin_linp) | p-value of Anderson-Rubin linearized overidentification statistic
| e(arubindf) | dof of A-R overid statistic = degree of overidentification = L-K
| e(idstat) | LM test statistic for underidentification (Anderson or Kleibergen-Paap)
| e(idp) | p-value of underidentification LM statistic
| e(iddf) | dof of underidentification LM statistic
| e(widstat) | F statistic for weak identification (Cragg-Donald or Kleibergen-Paap)
| e(arf) | Anderson-Rubin F-test of significance of endogenous regressors
| e(arfp) | p-value of Anderson-Rubin F-test of endogenous regressors
| e(archi2) | Anderson-Rubin chi-sq test of significance of endogenous regressors
| e(archi2p) | p-value of Anderson-Rubin chi-sq test of endogenous regressors
| e(ardf) | degrees of freedom of Anderson-Rubin tests of endogenous regressors
| e(ardf_r) | denominator degrees of freedom of AR F-test of endogenous regressors
| e(redstat) | LM statistic for instrument redundancy
| e(redp) | p-value of LM statistic for instrument redundancy
| e(reddf) | dof of LM statistic for instrument redundancy
| e(cstat) | GMM distance test statistic of exogeneity
| e(cstatp) | p-value of GMM distance test statistic of exogeneity
| e(cstatdf) | Degrees of freedom of GMM distance test statistic of exogeneity
| e(estat) | GMM distance test statistic of endogeneity
| e(estatp) | p-value of GMM distance test statistic of endogeneity
| e(estatdf) | Degrees of freedom of GMM distance test statistic of endogeneity
| e(cons) | 1 when equation has a Stata-supplied constant; 0 otherwise
| e(center) | 1 when moments are mean-centered; 0 otherwise
| e(partialcons) | as above but prior to partialling-out (see e(partial))
| e(partial_ct) | Number of partialled-out variables (see e(partial))

Macros
| e(cmd) | ivreg2
| e(cmdline) | Command line invoking ivreg2
| e(ivreg2cmd) | Version of ivreg2 (ivreg2, ivreg28, ivreg29, etc.)
| e(version) | Version number of ivreg2
| e(model) | ols, iv, gmm, liml, or kclass
| e(depvar) | Name of dependent variable
| e(instd) | Instrumented (RHS endogenous) variables
| e(insts) | Instruments
| e(inexog) | Included instruments (regressors)
| e(exexog) | Excluded instruments
| e(collin) | Variables dropped because of collinearities
| e(dups) | Duplicate variables
| e(ecollin) | Endogenous variables reclassified as exogenous because of
| collinearities with instruments
| e(clist) | Instruments tested for orthogonality
| e(redlist) | Instruments tested for redundancy
| e(partial) | Partialled-out exogenous regressors
| e(small) | small
| e(wtype) | weight type
| e(wexp) | weight expression
| e(clustvar) | Name of cluster variable
| e(vcetype) | Covariance estimation method
| e(kernel) | Kernel
| e(tvar) | Time variable
| e(ivar) | Panel variable
| e(firsteqs) | Names of stored first-stage equations
| e(rfeq) | Name of stored reduced form equation
| e(sfirsteq) | Name of stored system of first-stage and reduced form equations
| e(predict) | Program used to implement predict

Matrices
| e(b) | Coefficient vector
| e(V) | Variance-covariance matrix of the estimators
| e(S) | Covariance matrix of orthogonality conditions
| e(W) | GMM weighting matrix (=inverse of S if efficient GMM estimator)
| e(first) | First-stage regression results
| e(ccev) | Eigenvalues corresponding to the Anderson canonical correlations test
| e(cdev) | Eigenvalues corresponding to the Cragg-Donald test

Functions
| e(sample) | Marks estimation sample

## Examples

"use http://fmwww.bc.edu/ec-p/data/hayashi/griliches76.dta" : . use http://fmwww.bc.edu/ec-p/data/hayashi/griliches76.dta

(Wages of Very Young Men, Zvi Griliches, J.Pol.Ec. 1976)

| (Instrumental variables. Examples follow Hayashi 2000, p. 255.)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), small ffirst" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), small ffirst

| (Testing for the presence of heteroskedasticity in IV/GMM estimation)

"ivhettest, fitlev" : . ivhettest, fitlev

| (Two-step GMM efficient in the presence of arbitrary heteroskedasticity)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust

(GMM with user-specified first-step weighting matrix or matrix of orthogonality conditions)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), robust" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), robust

"predict double uhat if e(sample), resid" : . predict double uhat if e(sample), resid

"mat accum S = `e(insts)' [iw=uhat^2]" : . mat accum S = `e(insts)' [iw=uhat^2]

"mat S = 1/`e(N)' * S" : . mat S = 1/`e(N)' * S

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust smatrix(S)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust smatrix(S)

"mat W = invsym(S)" : . mat W = invsym(S)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust wmatrix(W)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s robust wmatrix(W)

(Equivalence of J statistic and Wald tests of included regressors, irrespective of instrument choice (Ahn, 1997))

"ivreg2 lw (iq=med kww age), gmm2s" : . ivreg2 lw (iq=med kww age), gmm2s

"mat S0 = e(S)" : . mat S0 = e(S)

"qui ivreg2 lw (iq=kww) med age, gmm2s smatrix(S0)" : . qui ivreg2 lw (iq=kww) med age, gmm2s smatrix(S0)

"test med age" : . test med age

"qui ivreg2 lw (iq=med) kww age, gmm2s smatrix(S0)" : . qui ivreg2 lw (iq=med) kww age, gmm2s smatrix(S0)

"test kww age" : . test kww age

"qui ivreg2 lw (iq=age) med kww, gmm2s smatrix(S0)" : . qui ivreg2 lw (iq=age) med kww, gmm2s smatrix(S0)

"test med kww" : . test med kww

(Continuously-updated GMM (CUE) efficient in the presence of arbitrary heteroskedasticity. NB: may require 30+ iterations.)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), cue robust" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), cue robust

| (Sargan-Basmann tests of overidentifying restrictions for IV estimation)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt)

"overid, all" : . overid, all

| (Tests of exogeneity and endogeneity)

| (Test the exogeneity of one regressor)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s orthog(s)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s orthog(s)

| (Test the exogeneity of two excluded instruments)

"ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s orthog(age mrt)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age mrt), gmm2s orthog(age mrt)

| (Frisch-Waugh-Lovell (FWL): equivalence of estimations with and without partialling-out)

"ivreg2 lw s expr tenure rns i.year (iq=kww age), cluster(year)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age), cluster(year)

"ivreg2 lw s expr tenure rns i.year (iq=kww age), cluster(year) partial(i.year)" : . ivreg2 lw s expr tenure rns smsa i.year (iq=med kww age), cluster(year) partial(i.year)

| (partial(): efficient GMM with #clusters<#instruments feasible after partialling-out)

"ivreg2 lw s expr tenure rns i.year (iq=kww age), cluster(year) partial(i.year) gmm2s" : . ivreg2 lw s expr tenure rns smsa (iq=med kww age), cluster(year) partial(i.year) gmm2s

| (Examples following Wooldridge 2002, pp.59, 61)

"use http://fmwww.bc.edu/ec-p/data/wooldridge/mroz.dta" : . use http://fmwww.bc.edu/ec-p/data/wooldridge/mroz.dta

| (Equivalence of DWH endogeneity test when regressor is endogenous...)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6)" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6)

"ivendog educ" :. ivendog educ

| (... endogeneity test using the endog option)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), endog(educ)" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), endog(educ)

| (...and C-test of exogeneity when regressor is exogenous, using the orthog option)

"ivreg2 lwage exper expersq educ (=age kidslt6 kidsge6), orthog(educ)" : . ivreg2 lwage exper expersq educ (=age kidslt6 kidsge6), orthog(educ)

| (Heteroskedastic Ordinary Least Squares, HOLS)

"ivreg2 lwage exper expersq educ (=age kidslt6 kidsge6), gmm2s" : . ivreg2 lwage exper expersq educ (=age kidslt6 kidsge6), gmm2s

| (Equivalence of Cragg-Donald Wald F statistic and F-test from first-stage regression
| in special case of single endogenous regressor. Also illustrates first, sfirst
| and savefirst options.)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), first sfirst savefirst" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), first sfirst savefirst

"di e(widstat)" : . di e(widstat)

"estimates restore _ivreg2_educ" : . estimates restore _ivreg2_educ

"test age kidslt6 kidsge6" : . test age kidslt6 kidsge6

"di r(F)" : . di r(F)

| (Equivalence of Kleibergen-Paap robust rk Wald F statistic and F-test from first-stage
| regression in special case of single endogenous regressor.)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust savefirst" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust savefirst

"di e(widstat)" : . di e(widstat)

"estimates restore _ivreg2_educ" : . estimates restore _ivreg2_educ

"test age kidslt6 kidsge6" : . test age kidslt6 kidsge6

"di r(F)" : . di r(F)

| (Equivalence of Kleibergen-Paap robust rk LM statistic for identification and LM test
| of joint significance of excluded instruments in first-stage regression in special
| case of single endogenous regressor. Also illustrates use of ivreg2 to perform an
| LM test in OLS estimation.)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust

"di e(idstat)" : . di e(idstat)

"ivreg2 educ exper expersq (=age kidslt6 kidsge6) if e(sample), robust" : . ivreg2 educ exper expersq (=age kidslt6 kidsge6) if e(sample), robust

"di e(j)" : . di e(j)

| (Equivalence of an LM test of an excluded instrument for redundancy and an LM test of
| significance from first-stage regression in special case of single endogenous regressor.)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust redundant(age)" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust redundant(age)

"di e(redstat)" : . di e(redstat)

"ivreg2 educ exper expersq kidslt6 kidsge6 (=age) if e(sample), robust" : . ivreg2 educ exper expersq kidslt6 kidsge6 (=age) if e(sample), robust

"di e(j)" : . di e(j)

| (Weak-instrument robust inference: Anderson-Rubin Wald F and chi-sq and
| Stock-Wright S statistics. Also illusrates use of saverf option.)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust ffirst saverf" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust ffirst saverf

"di e(arf)" : . di e(arf)

"di e(archi2)" : . di e(archi2)

"di e(sstat)" : . di e(sstat)

| (Obtaining the Anderson-Rubin Wald F statistic from the reduced-form estimation)

"estimates restore _ivreg2_lwage" : . estimates restore _ivreg2_lwage

"test age kidslt6 kidsge6" : . test age kidslt6 kidsge6

"di r(F)" : . di r(F)

| (Obtaining the Anderson-Rubin Wald chi-sq statistic from the reduced-form estimation.
| Use ivreg2 without small to obtain large-sample test statistic.)

"ivreg2 lwage exper expersq age kidslt6 kidsge6, robust" : . ivreg2 lwage exper expersq age kidslt6 kidsge6, robust

"test age kidslt6 kidsge6" : . test age kidslt6 kidsge6

"di r(chi2)" : . di r(chi2)

| (Obtaining the Stock-Wright S statistic as the value of the GMM CUE objective function.
| Also illustrates use of b0 option. Coefficients on included exogenous regressors
| are OLS coefficients, which is equivalent to partialling them out before obtaining
| the value of the CUE objective function.)

"mat b = 0" : . mat b = 0

"mat colnames b = educ" : . mat colnames b = educ

"qui ivreg2 lwage exper expersq" : . qui ivreg2 lwage exper expersq

"mat b = b, e(b)" : . mat b = b, e(b)

"ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust b0(b)" : . ivreg2 lwage exper expersq (educ=age kidslt6 kidsge6), robust b0(b)

"di e(j)" : . di e(j)

| (LIML and k-class estimation using Klein data)

| "webuse klein" :. webuse klein
| "tsset yr" :. tsset yr

| (LIML estimates of Klein's consumption function)

"ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), liml" :. ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), liml

| (Equivalence of LIML and CUE+homoskedasticity+independence)

"ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), liml coviv" :. ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), liml coviv

"ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), cue" :. ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), cue

| (Fuller's modified LIML with alpha=1)

"ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), fuller(1)" :. ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), fuller(1)

| (k-class estimation with Nagar's bias-adjusted IV, k=1+(L-K)/N=1+4/21=1.19)

"ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), kclass(1.19)" :. ivreg2 consump L.profits (profits wagetot = govt taxnetx year wagegovt capital1 L.totinc), kclass(1.19)

| (Kernel-based covariance estimation using time-series data)

| "use http://fmwww.bc.edu/ec-p/data/wooldridge/phillips.dta" :. use http://fmwww.bc.edu/ec-p/data/wooldridge/phillips.dta
| "tsset year, yearly" :. tsset year, yearly

| (Autocorrelation-consistent (AC) inference in an OLS Regression)

"ivreg2 cinf unem, bw(3)" :. ivreg2 cinf unem, bw(3)

"ivreg2 cinf unem, kernel(qs) bw(auto)" :. ivreg2 cinf unem, kernel(qs) bw(auto)

| (Heteroskedastic and autocorrelation-consistent (HAC) inference in an OLS regression)

"ivreg2 cinf unem, bw(3) kernel(bartlett) robust small" :. ivreg2 cinf unem, bw(3) kernel(bartlett) robust small

"newey cinf unem, lag(2)" :. newey cinf unem, lag(2)

| (AC and HAC in IV and GMM estimation)

"ivreg2 cinf (unem = l(1/3).unem), bw(3)" :. ivreg2 cinf (unem = l(1/3).unem), bw(3)

"ivreg2 cinf (unem = l(1/3).unem), bw(3) gmm2s kernel(thann)" :. ivreg2 cinf (unem = l(1/3).unem), bw(3) gmm2s kernel(thann)

"ivreg2 cinf (unem = l(1/3).unem), bw(3) gmm2s kernel(qs) robust orthog(l1.unem)" :. ivreg2 cinf (unem = l(1/3).unem), bw(3) gmm2s kernel(qs) robust orthog(l1.unem)

| (Examples using Large N, Small T Panel Data)

"use http://fmwww.bc.edu/ec-p/data/macro/abdata.dta" : . use http://fmwww.bc.edu/ec-p/data/macro/abdata.dta

"tsset id year" :. tsset id year

| (Two-step effic. GMM in the presence of arbitrary heteroskedasticity and autocorrelation)

"ivreg2 n (w k ys = d.w d.k d.ys d2.w d2.k d2.ys), gmm2s cluster(id)": . ivreg2 n (w k ys = d.w d.k d.ys d2.w d2.k d2.ys), gmm2s cluster(id)

| (Kiefer (1980) SEs - robust to arbitrary serial correlation but not heteroskedasticity)

"ivreg2 n w k, kiefer": . ivreg2 n w k, kiefer

"ivreg2 n w k, bw(8) kernel(tru)": . ivreg2 n w k, bw(8) kernel(tru)

| (Equivalence of cluster-robust and kernel-robust with truncated kernel and max bandwidth)

"ivreg2 n w k, cluster(id)": . ivreg2 n w k, cluster(id)

"ivreg2 n w k, bw(8) kernel(tru) robust": . ivreg2 n w k, bw(8) kernel(tru) robust

| (Examples using factor variables)

"sysuse auto" : . sysuse auto

"ivreg2 price i.foreign i.rep78": . ivreg2 price i.foreign i.rep78

"ivreg2 price i.rep78 (foreign = weight turn trunk)": . ivreg2 price i.rep78 (foreign = weight turn trunk)

"ivreg2 price i.rep78 (c.mpg#c.mpg = weight length turn)": . ivreg2 price i.rep78 (c.mpg#c.mpg = weight length turn)

| (Examples using Small N, Large T Panel Data. NB: T is actually not very large - only
| 20 - so results should be interpreted with caution)

"webuse grunfeld" : . webuse grunfeld

"tsset" : . tsset

| (Autocorrelation-consistent (AC) inference)

"ivreg2 invest mvalue kstock, bw(1) kernel(tru)": . ivreg2 invest mvalue kstock, bw(1) kernel(tru)

| (Heteroskedastic and autocorrelation-consistent (HAC) inference)

"ivreg2 invest mvalue kstock, robust bw(1) kernel(tru)": . ivreg2 invest mvalue kstock, robust bw(1) kernel(tru)

| (HAC inference, SEs also robust to disturbances correlated across panels)

"ivreg2 invest mvalue kstock, robust cluster(year) bw(1) kernel(tru)": . ivreg2 invest mvalue kstock, robust cluster(year) bw(1) kernel(tru)

| (Equivalence of Driscoll-Kraay SEs as implemented by ivreg2 and xtscc)
| (See Hoeschle (2007) for discussion of xtscc)

"ivreg2 invest mvalue kstock, dkraay(2) small": . ivreg2 invest mvalue kstock, dkraay(2) small

"ivreg2 invest mvalue kstock, cluster(year) bw(2) small": . ivreg2 invest mvalue kstock, cluster(year) bw(2) small

"xtscc invest mvalue kstock, lag(1)": . xtscc invest mvalue kstock, lag(1)

| (Examples using Large N, Large T Panel Data. NB: T is again not very large - only
| 20 - so results should be interpreted with caution)

"webuse nlswork" : . webuse nlswork

"tsset" : . tsset

| (One-way cluster-robust: SEs robust to arbitrary heteroskedasticity and within-panel
| autocorrelation)

"ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode)": . ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode)

| (Two-way cluster-robust: SEs robust to arbitrary heteroskedasticity and within-panel
| autocorrelation, and contemporaneous cross-panel correlation, i.e., the cross-panel
| correlation is not autocorrelated)

"ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode year)": . ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode year)

| (Two-way cluster-robust: SEs robust to arbitrary heteroskedasticity and within-panel
| autocorrelation and cross-panel autocorrelated disturbances that disappear after 2 lags)

"ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode year) bw(2) kernel(tru) ": . ivreg2 ln_w grade age ttl_exp tenure, cluster(idcode year) bw(2) kernel(tru)

## References

Ahn, Seung C. 1997. Orthogonality tests in linear models. Oxford Bulletin
of Economics and Statistics, Vol. 59, pp. 183-186.

Anderson, T.W. 1951. Estimating linear restrictions on regression coefficients
for multivariate normal distributions. Annals of Mathematical Statistics, Vol. 22, pp. 327-51.

Anderson, T. W. and H. Rubin. 1949. Estimation of the parameters of a single equation
in a complete system of stochastic equations. Annals of Mathematical Statistics, Vol. 20,
pp. 46-63.

Anderson, T. W. and H. Rubin. 1950. The asymptotic properties of estimates of the parameters of a single
equation in a complete system of stochastic equations. Annals of Mathematical Statistics,
Vol. 21, pp. 570-82.

Angrist, J.D. and Pischke, J.-S. 2009. Mostly Harmless Econometrics: An Empiricist's Companion.
Princeton: Princeton University Press.

Baum, C.F., Schaffer, M.E., and Stillman, S. 2003. Instrumental Variables and GMM:
Estimation and Testing. The Stata Journal, Vol. 3, No. 1, pp. 1-31.
[http://ideas.repec.org/a/tsj/stataj/v3y2003i1p1-31.html](http://ideas.repec.org/a/tsj/stataj/v3y2003i1p1-31.html).
Working paper version: Boston College Department of Economics Working Paper No. 545.
[http://ideas.repec.org/p/boc/bocoec/545.html](http://ideas.repec.org/p/boc/bocoec/545.html).
Citations in [published work](http://scholar.google.com/scholar?oi=bibs&hl=en&cites=9432785573549481148).

Baum, C. F., Schaffer, M.E., and Stillman, S. 2007. Enhanced routines for instrumental variables/GMM estimation and testing.
The Stata Journal, Vol. 7, No. 4, pp. 465-506.
[http://ideas.repec.org/a/tsj/stataj/v7y2007i4p465-506.html](http://ideas.repec.org/a/tsj/stataj/v7y2007i4p465-506.html).
Working paper version: Boston College Department of Economics Working Paper No. 667.
[http://ideas.repec.org/p/boc/bocoec/667.html](http://ideas.repec.org/p/boc/bocoec/667.html).
Citations in [published work](http://scholar.google.com/scholar?oi=bibs&hl=en&cites=1691909976816211536).

Breusch, T., Qian, H., Schmidt, P. and Wyhowski, D. 1999.
Redundancy of moment conditions.
Journal of Econometrics, Vol. 9, pp. 89-111.

Cameron, A.C., Gelbach, J.B. and Miller, D.L. 2006.
Robust Inference with Multi-Way Clustering.
NBER Technical Working paper 327.
[http://www.nber.org/papers/t0327](http://www.nber.org/papers/t0327).
Forthcoming in the Journal of Business and Economic Statistics.
cgmreg is available at
[http://www.econ.ucdavis.edu/faculty/dlmiller/statafiles](http://www.econ.ucdavis.edu/faculty/dlmiller/statafiles).

Chernozhukov, V. and Hansen, C. 2005. The Reduced Form:
A Simple Approach to Inference with Weak Instruments.
Working paper, University of Chicago, Graduate School of Business.

Cragg, J.G. and Donald, S.G. 1993. Testing Identfiability and Specification in
Instrumental Variables Models. Econometric Theory, Vol. 9, pp. 222-240.

Cushing, M.J. and McGarvey, M.G. 1999. Covariance Matrix Estimation.
In L. Matyas (ed.), Generalized Methods of Moments Estimation.
Cambridge: Cambridge University Press.

Davidson, R. and MacKinnon, J. 1993. Estimation and Inference in Econometrics.
1993. New York: Oxford University Press.

Driscoll, J.C. and Kraay, A. 1998. Consistent Covariance Matrix Estimation With Spatially Dependent Panel Data.
Review of Economics and Statistics. Vol. 80, No. 4, pp. 549-560.

Dufour, J.M. 2003. Identification, Weak Instruments and Statistical Inference
in Econometrics. Canadian Journal of Economics, Vol. 36, No. 4, pp. 767-808.
Working paper version: CIRANO Working Paper 2003s-49.
[http://www.cirano.qc.ca/pdf/publication/2003s-49.pdf](http://www.cirano.qc.ca/pdf/publication/2003s-49.pdf).

Finlay, K., and Magnusson, L.M. 2009. Implementing Weak-Instrument Robust Tests
for a General Class of Instrumental-Variables Models.
The Stata Journal, Vol. 9, No. 3, pp. 398-421.
[http://www.stata-journal.com/article.html?article=st0171](http://www.stata-journal.com/article.html?article=st0171).

Hall, A.R. Generalized Method of Moments. 2005. Oxford: Oxford University Press.

Hall, A.R., Rudebusch, G.D. and Wilcox, D.W. 1996. Judging Instrument Relevance in
Instrumental Variables Estimation. International Economic Review, Vol. 37, No. 2, pp. 283-298.

Hayashi, F. Econometrics. 2000. Princeton: Princeton University Press.

Hansen, L.P., Heaton, J., and Yaron, A. 1996. Finite Sample Properties
of Some Alternative GMM Estimators. Journal of Business and Economic Statistics, Vol. 14, No. 3, pp. 262-280.

Hoechle, D. 2007. Robust Standard Errors for Panel Regressions with Crossñsectional Dependence.
Stata Journal, Vol. 7, No. 3, pp. 281-312.
[http://www.stata-journal.com/article.html?article=st0128](http://www.stata-journal.com/article.html?article=st0128).

Kiefer, N.M. 1980. Estimation of Fixed Effect Models for Time Series of Cross-Sections with
Arbitrary Intertemporal Covariance. Journal of Econometrics, Vol. 14, No. 2, pp. 195-202.

Kleibergen, F. 2007. Generalizing Weak Instrument Robust Statistics Towards Multiple Parameters, Unrestricted Covariance Matrices and Identification Statistics. Journal of Econometrics, forthcoming.

Kleibergen, F. and Paap, R. 2006. Generalized Reduced Rank Tests Using the Singular Value Decomposition.
Journal of Econometrics, Vol. 133, pp. 97-126.

Kleibergen, F. and Schaffer, M.E. 2007. ranktest: Stata module for testing the rank
of a matrix using the Kleibergen-Paap rk statistic.
[http://ideas.repec.org/c/boc/bocode/s456865.html](http://ideas.repec.org/c/boc/bocode/s456865.html).

Mikusheva, A. and Poi, B.P. 2006.
Tests and Confidence Sets with Correct Size When Instruments are Potentially Weak. The Stata Journal, Vol. 6, No. 3, pp. 335-347.

Moreira, M.J. and Poi, B.P. 2003. Implementing Tests with the Correct Size in the Simultaneous Equations Model. The Stata Journal, Vol. 3, No. 1, pp. 57-70.

Newey, W.K. and K.D. West, 1994. Automatic Lag Selection in Covariance Matrix Estimation. Review of Economic Studies, Vol. 61, No. 4, pp. 631-653.

Sanderson, E. and F. Windmeijer, 2015. A Weak Instrument F-Test in Linear IV Models with Multiple Endogenous Variables.
Journal of Econometrics (forthcoming).
Working paper version: University of Bristol Discussion Paper 14/644.
[http://ideas.repec.org/p/bri/uobdis/14-644.html](http://ideas.repec.org/p/bri/uobdis/14-644.html).

Shea, J. 1997. Instrument Relevance in Multivariate Linear Models: A Simple Measure.
Review of Economics and Statistics, Vol. 49, No. 2, pp. 348-352.

Stock, J.H. and Wright, J.H. 2000. GMM with Weak Identification.
Econometrica, Vol. 68, No. 5, September, pp. 1055-1096.

Stock, J.H. and Yogo, M. 2005. Testing for Weak Instruments in Linear IV Regression. In D.W.K. Andrews and J.H. Stock, eds. Identification and Inference for Econometric Models: Essays in Honor of Thomas Rothenberg. Cambridge: Cambridge University Press, 2005, pp. 80Ò108.
Working paper version: NBER Technical Working Paper 284.
[http://www.nber.org/papers/T0284](http://www.nber.org/papers/T0284).

Thompson, S.B. 2009. Simple Formulas for Standard Errors that Cluster by Both Firm and Time.
[http://ssrn.com/abstract=914002](http://ssrn.com/abstract=914002).

Wooldridge, J.M. 2002. Econometric Analysis of Cross Section and Panel Data. Cambridge, MA: MIT Press.

## Acknowledgements

We would like to thanks various colleagues who helped us along the way, including
David Drukker,
Frank Kleibergen,
Austin Nichols,
Brian Poi,
Vince Wiggins,
and, not least, the users of ivreg2
who have provided suggestions,
spotted bugs,
and helped test the package.
We are also grateful to Jim Stock and Moto Yogo for permission to reproduce
their critical values for the Cragg-Donald statistic.

## Citation of ivreg2

ivreg2 is not an official Stata command. It is a free contribution
to the research community, like a paper. Please cite it as such:

Baum, C.F., Schaffer, M.E., Stillman, S. 2010.
ivreg2: Stata module for extended instrumental variables/2SLS, GMM and AC/HAC, LIML and k-class regression.
[http://ideas.repec.org/c/boc/bocode/s425401.html](http://ideas.repec.org/c/boc/bocode/s425401.html)

## Authors

Christopher F Baum, Boston College, USA
baum@bc.edu

Mark E Schaffer, Heriot-Watt University, UK
m.e.schaffer@hw.ac.uk

Steven Stillman, Motu Economic and Public Policy Research
stillman@motu.org.nz

## Also see

Articles:Stata Journal, volume 3, number 1: [st0030](http://ideas.repec.org/a/tsj/stataj/v3y2003i1p1-31.html)

Stata Journal, volume 7, number 4: [st0030_3](http://ideas.repec.org/a/tsj/stataj/v7y2007i4p465-506.html)

Manual: [U] 23 Estimation and post-estimation commands

[U] 29 Overview of model estimation in Stata

[R] ivreg

On-line: help for ivregress, ivreg, newey;
overid, ivendog, ivhettest, ivreset,
xtivreg2, xtoverid, ranktest,
condivreg (if installed);
weakiv (if installed);
cgmreg (if installed);
xtscc (if installed);
est, postest;
regress
