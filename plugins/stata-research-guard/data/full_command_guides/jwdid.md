# jwdid complete maintainer help

Maintainer help version: 2.0 May_4_2024

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

jwdid — ETWFE-DID estimator

## Syntax

jwdid
[varlist]
[if] [in]
weight
[, options]

### Basic Specification options

- i[var](varname): Declares the Panel ID variable. If not declared, the data is assumed to be Repeated cross-section.

- t[var](varname): Declares the time variable

- time(varname): Same as tvar()

- g[var](varname): Provides the cohort variable

### Treatment-control Specification options

- trtvar(varname): If Gvar is not available, you can provide the post-treatment variable. By default, the panel data identifier is used to create the equivalent to Gvar. This option also allows you to add a variable that identifies intensity (0-1)

- trgvar(varname): If data is repeated cross-section (RC), trtvar() can be combined with trtgvar() to identify the cohort variable. trtgvar should identify pseudo panels in the data, where each pseudo panel contains observations that were (or could have) been treated at the same point in time

### Basic DID Specification options

- never: By default, jwdid uses all never and not-yet treated observations as controls. The option never requests to use only never-treated as the control group. With this option, for each group/cohort, the period g-1 is excluded from the specification.

- group: Request using Group fixed effects instead of Panel ID fixed effects. In linear models, with balanced panel, estimates are numerically identical. However, it may reduce the computational burden with nonlinear models. This is the default whenever method() is called for except for ppmlhdfe.

- corr: When using group with unbalanced panel data, estimates are no longer identical to those that use the panel identifier fixed effect. The option corr applies a correction for this, following a Mundlak approach

This option is used to request a correlated random effects (Mundlak) correction as an alternative to inclusion of fixed effects model. Particularly useful when using non-linear models. Supersedes -corr-

- cluster(varname): This option is used to request standard errors to be clustered at cluster() level. When using panel data, the default is using ivar() for clustering standard errors. When using RC data, standard errors are estimated based on the Method default. For reghdfe, one should use vce(robust) to obtain robust standard errors.

- method(method_name): Request other methods for the estimation of ATTs. For example poisson or logit. Default is linear regression model, which is estimated using reghdfe.

- other_options: It is also possible to request other method-specific options. For example, for reghdfe robust standard errors can be requested using vce(robust).

### Advanced DID Specification options

- hettype(hetspec): This option allows you to request different types of treatment effect heterogeneity. The default is to use full time-cohort heterogeneity. Other options include time, cohort, event and twfe. The last one reduces to the traditional TWFE estimator

- xasis: Unless this option is requested, all variables in varlist are demeaned and interacted with the corresponding level of treatment heterogeneity. Declaring xasis requests using covariates without transformation.

- exovar(varlist): Variables declared using this option are added to the model specification without interactions

- xtvar(varlist): Variables declared are only interacted with the time variable

- xgvar(varlist): Variables declared are only interacted with the group/cohort variable

- xattvar(varlist): Variables declared are only interacted with the group/cohort x time interactions. Useful for treatment heterogeneity analysis.

- fevar(varlist): This option is used to add additional fixed effects to the model, different from cohort, panel or time. Only valid when using default method (reghdfe) or if using ppmlhdfe.

- anti[cipation](#1): This is used to declare a period different from g-1 as the baseline. #1 can only take integer positive values, default is 1

pweights are allowed; see weight.

## Description

jwdid is a program that implements the Extended TWFE estimator proposed by Wooldridge (2021, 2023) for a generalized DID design that addresses the problems related to the standard TWFE. The program also incorporates additional options that allow for a more flexible model specification. This includes the guidelines for the estimation of Gravity-trade models as proposed by Nagengast and Yotov (2024) and Nagengast et al. (2024).

In principle, this estimator suggests that to avoid some of the negative aspects of the traditional TWFE-DID estimator, one should simply use a fully interacted set of dummies allowing for treatment effect heterogeneity by cohort and timing. By using such interaction, one avoids using already treated units as controls, preventing the so-called negative weights problems.

Specifically, instead of estimating a model as follows:

y_it = gamma * D_it + a_i + b_t + e_t

where D_it indicates if unit i is treated at time t. One should estimate a model like the following:

y_it = sum(gamma_gt * G_i * T) + a_i + b_t + e_t

where G_i * T corresponds to all possible interactions of the cohort unit i belongs to (G_i) and the period we aim to estimate that effect at (T), using as reference group all units that have not been treated yet.

In the simplest case, gamma_gt represents the ATT for cohort G at time t. When the option never is used, the specification also includes the Group period interactions including all those periods before treatment occurred. In the case without covariates, the estimates are numerically identical to those identified using Callaway and Sant'Anna (2021)-regression outcome method, or using Sun and Abraham (2021) approach.

Similar to xthdidregres and hdidregress, it is possible to estimate the DID model by declaring a treatment variable trtvar() instead of the group variable gvar(). Similarly, to reduce the complexity of the estimation, it is possible to impose some restrictions on the treatment effect heterogeneity using hettype().

In addition to imposing constraints on the treatment effect heterogeneity, it is also possible to add covariates that allow for covariate heterogeneity, as well as restricting the heterogeneity only across time, across cohorts or no heterogeneity at all. Any variable that is included in the varlist is interacted with the corresponding level of treatment heterogeneity. The default option is to add sub-group demeaned variables to the model, but it is possible to request using the original variables using the option xasis. Both approaches produce the same aggregate average treatment effects, but the interpretation of the model coefficients changes.

One can also request adding variables that are interacted with the time variable only xtvar(), cohort variable only xgvar(), or not interacted at all exovar(). Similarly, additional fixed effects can be added to the model using the option fevar().

One should also be aware that jwdid will create as many interactions as cohorts and periods there are in the data, times all possible controls, unless heterogeneity is restricted and covariate heterogeneity is restricted using the above options.

This could provide an extremely large number of estimated coefficients, which could make some models difficult to estimate.

Other estimation methods can be used by declaring the option method(). The default method is reghdfe, which is a linear regression model with fixed effects. Other methods include poisson, logit, or ppmlhdfe, which is the leading approach for the estimation of gravity-trade models.

Except when ppmlhdfe is used, whenever method() is declared, the program will assume group/cohort fixed effects only, instead of individual fixed effects. This is to avoid the incidental parameter problem.

## Remarks

The code of this program is based on some of the advances by Prof. Wooldridge on the estimation of DID models. It has important advantages over other methods:

1. It is based on regression analysis, and most people understand regression, compared to the other alternatives.

2. It is flexible for other methods. Namely, you should be easily able to apply it for binary or count models, or even for the estimation of gravity-trade models, as we show in Nagengast et al. (2024).

This program was coded independently from Jeff Wooldridge but is based on some of his early simulation codes he shared with the community. Some further advances were made following the official implementation of xthdidregress and hdidregress. Most advances were developed for the joint work with Arne Nagengast and Yoto Yotov, for the estimation of DID-type models in gravity trade settings.

To estimate aggregates, see jwdid_postestimation

## Examples

Setup

"ssc install frause"

"frause mpdta.dta, clear"

Simple DID using not-treated as controls

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat)"

Simple DID using never treated as controls

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) never"

Simple DID using not-treated as controls, based on group (rather than individual) fixed effects

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) group"

DID using not-treated as controls, based on group (rather than individual) fixed effects, and one time-invariant control.

"jwdid lemp lpop, ivar(countyreal) tvar(year) gvar(first_treat) group"

DID using not-treated as controls, based on group (rather than individual) fixed effects, and one time-invariant control. Using Poisson regression estimator.

"gen emp = exp(lemp)"

"jwdid emp lpop, ivar(countyreal) tvar(year) gvar(first_treat) method(poisson)"

DID using never treated as controls, using different treatment effects heterogeneity restrictions.

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) never hettype(time)"

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) never hettype(cohort)"

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) never hettype(event)"

"jwdid lemp, ivar(countyreal) tvar(year) gvar(first_treat) never hettype(twfe)"

## Authors

Fernando Rios-Avila

Levy Economics Institute of Bard College

Annandale-on-Hudson, NY

friosavi@levy.org

Arne J. Nagengast

Deutsche Bundesbank

arne.nagengast@bundesbank.de

Yoto V. Yotov

School of Economics, Drexel University

yotov@drexel.edu

## References

Nagengast, Arne J., Fernando Rios-Avila and Yoto V. Yotov. 2024. The European Single Market and Intra-EU Trade: An Assessment with Heterogeneity-Robust Difference-in-Differences Methods.
School of Economics Working Paper Series 2024-5, LeBow College of Business, Drexel University. https://ideas.repec.org/p/ris/drxlwp/2024_005.html. [Paper](https://drive.google.com/file/d/1d3RocZguRYoFNLjK6KFbX3oHXeVrbJcM/view).

Nagengast, Arne J. and Yoto V. Yotov. 2024. Staggered Difference-in-Differences in Gravity Settings: Revisiting the Effects of Trade Agreements. American Economic Journal: Applied Economics (forthcoming).

Wooldridge, Jeffrey. 2021.
Two-Way Fixed Effects, the Two-Way Mundlak Regression, and Differences-in-Differences
Estimators. Working paper.

Wooldridge, Jeffrey. 2023.
Simple Approaches to Nonlinear Difference-in-Differences with Panel Data. The Econometrics Journal, Volume 26, Issue 3, September 2023, Pages C31–C66.

## Acknowledgement

This command started as an isolated project before becoming a dad! 2 years later and I'm almost ready to get a much better version of it.

## Also see

Help: drdid, csdid, jwdid_postestimation, xtdidregress, xthdidregress, hdidregress
