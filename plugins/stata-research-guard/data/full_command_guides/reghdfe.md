# reghdfe complete maintainer help

Maintainer help version: 6.14.1 08Jul2026

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

- reghdfe — Linear regression with multiple fixed effects. Also supports individual FEs with group-level outcomes

## Syntax

Least-square regressions (no fixed effects):

```stata
reghdfe
depvar [indepvars]
[if] [in] weight
[, options]
```

Fixed effects regressions:

```stata
reghdfe
depvar [indepvars]
[if] [in] weight , a[bsorb](absvars) [options]
```

Fixed effects regressions with group-level outcomes and individual FEs:

```stata
reghdfe
depvar [indepvars]
[if] [in] weight , a[bsorb](absvars indvar) g[roup](groupvar) i[ndividual](indvar) [options]
```

### Standard FEs

- a[bsorb](absvars): categorical variables representing the fixed effects to be absorbed

- a[bsorb](..., save[fe]): save all fixed effect estimates with the __hdfe* prefix

### Group FEs

- g[roup](groupvar): categorical variable representing each group (eg: patent_id)

- note: regression variables (depvar, indepvars) must be constant within each group (eg: patent_citations must be constant within a patent_id)

- note: using group() without individual() is equivalent to running the regression on 1 observation per group

- i[ndividual](indvar): categorical variable representing each individual whose fixed effect will be absorbed(eg: inventor_id)

- note: the individual() option requires the group()

- ag[gregation](str): how are the individual FEs aggregated within a group. Valid values are mean (default) and sum

- note: mean and sum are equivalent if all groups are of equal size (eg: 11 starting players in a football/soccer team)

### Model

- vce(vcetype): vcetype may be un[adjusted] (default), r[obust], cl[uster] fvvarlist (allowing two- and multi-way clustering), or dk[raay] [#] (Driscoll-Kraay)

- res[iduals](newvar): save regression residuals

- note: the postestimation command "predict <varname>, d" requires this option

### Degrees-of-Freedom Adjustments

- dof[adjustments](list): allows selecting the desired adjustments for degrees of freedom;
rarely used but changing it can speed-up execution

- groupv[ar](newvar): unique identifier for the first mobility group

### Optimization

- tech[nique](map): partial out variables using the "method of alternating projections" (MAP) in any of its variants (default)

- tech[nique](lsmr): Fong and Saunders' LSMR algorithm

- tech[nique](lsqr): Page and Saunders' LSQR algorithm

- tech[nique](gt): Variation of Spielman et al's graph-theoretical (GT) approach (using spectral sparsification of graphs); currently disabled

- accel[eration](str): MAP acceleration method; options are conjugate_gradient (cg, default), steep_descent (sd), and a[itken]

- transf[orm](str): MAP transform operation; options are kac[zmarz], cim[mino], and sym[metric] kaczmarz (default)

- prec[onditioner](str): LSMR/LSQR preconditioner. options are no[ne], diag[onal], and block[_diagonal] (default)

- prune: prune vertices of degree-1; acts as a preconditioner that is useful if the underlying network is very sparse; currently disabled

- tol[erance](#): criterion for convergence (default=1e-8, valid values are 1e-1 to 1e-15)

- iter[ate](#): maximum number of iterations (default=16,000); if set to missing (.) it will run for as long as it takes.

- nosamp[le]: will not create e(sample), saving some space and speed

- fastreg[ress]: solve normal equations (X'X b = X'y) instead of the original problem (X=y). Faster but less accurate and less numerically stable. Use carefully

- keepsin[gletons]: do not drop singletons. Use carefully

### Parallel execution

- par[allel](#): partial out variables in # separate Stata processes, speeding up execution depending on data size and computer characteristics. Requires the parallel package

- par[allel](#,cores(#2)): specify that each process will only use #2 cores. More suboptions avalable here

### Memory Usage

- pool[size](#): apply the within algorithm in groups of # variables (else, it will run on all variables at the same time). A large pool size is usually faster but uses more memory

- compact: preserve the dataset and drop variables as much as possible on every step

### Reporting

- l[evel](#): set confidence level; default is level(95)

- display_options: control columns and column formats, row spacing, line width,
display of omitted variables and base and empty cells, and factor-variable labeling

particularly useful are the noomit[ted] and noempty options to hide regressors omitted due to collinearity

- nohead[er]: suppress output header

- notable: suppress coefficient table

- nofoot[note]: suppress fixed effects footnote

- nocon[stant]: suppress showing _cons row

### Diagnostics

- v[erbose](#): amount of debugging information to show (0=None, 1=Some, 2=More, 3=Parsing/convergence details, 4=Every iteration)

- timeit: show elapsed times by stage of computation

- version(#): run previous versions of reghdfe. Valid values are 3 (reghdfe 3, circa 2017) and 5 (reghdfe 5, circa 2020)

depvar and indepvars may contain factor variables and time-series operators.
depvar cannot be of the form i.y though, only #.y (where # is a number)

## Description

reghdfe is a generalization of areg (and xtreg,fe, xtivreg,fe) for multiple levels of fixed effects, and multi-way clustering.

For alternative estimators (2sls, gmm2s, liml), as well as additional standard errors (HAC, etc) see ivreghdfe. For nonlinear fixed effects, see ppmlhdfe (Poisson).
For diagnostics on the fixed effects and additional postestimation tables, see [sumhdfe](https://github.com/ed-dehaan/sumhdfe).

Additional features include:

1. A novel and robust algorithm to efficiently absorb the fixed effects (extending the work of Guimaraes and Portugal, 2010).

2. Can absorb heterogeneous slopes (i.e. regressors with different coefficients for each FE category)

3. Can absorb [individual fixed effects](http://scorreia.com/research/individual_fes.pdf) where outcomes and regressors are at the group level
(e.g. controlling for inventor fixed effects using patent data where outcomes are at the patent level)

4. Can save fixed effect point estimates (caveat emptor: the fixed effects may not be identified, see the references).

5. Calculates the degrees-of-freedom lost due to the fixed effects
(note: beyond two levels of fixed effects, this is still an open problem, but we provide a conservative approximation).

6. Iteratively removes singleton observations, to avoid biasing the standard errors (see ancillary document).

7. Coded in Mata, which in most scenarios makes it even faster than areg and xtreg for a single fixed effect (see benchmarks on the Github page).

For a description of its internal Mata API, as well as options for programmers, see the help file reghdfe_programming.

## Description of individual fixed effects in group setting

reghdfe now permits estimations that include individual fixed effects with group-level outcomes.
For instance, a study of innovation might want to estimate patent citations as a function of patent characteristics, standard fixed effects (e.g. year),
and fixed effects for each inventor that worked in a patent.

To do so, the data must be stored in a long format (e.g. with each patent spanning as many observations as inventors in the patent.)
Specifically, the individual and group identifiers must uniquely identify the observations
(so for instance the command "isid patent_id inventor_id" will not raise an error).
Note that this allows for groups with a varying number of individuals (e.g. one patent might be solo-authored, another might have 10 authors).

Other example cases that highlight the utility of this include:

1. Patents & inventors

2. Papers & co-authors

3. Time-varying executive boards & board members

4. Sports teams & players

For a more detailed explanation, including examples and technical descriptions, see [Constantine and Correia (2021)](http://scorreia.com/research/individual_fes.pdf).

## Links to online documentation

- [Website](http://scorreia.com/software/reghdfe/): main reghdfe website (including online help, quickstart, FAQ).

- [Github page](http://scorreia.com/software/reghdfe/): code repository, issues/problems/suggestions, and latest news.

- [HDFE paper](http://scorreia.com/research/hdfe.pdf): explain the algorithms behind reghdfe.

- [Individual fixed effects paper](http://scorreia.com/research/individual_fes.pdf): explain the algorithms behind individual fixed effects in reghdfe.

- [Group FE paper](http://scorreia.com/research/groupfe.pdf): illustrate the importance of using individual fixed effects with group-level outcomes.

## Absorb() syntax

- varname: categorical variable to be absorbed

- i.varname: categorical variable to be absorbed (same as above; the i. prefix is always implicit)

- i.var1#i.var2: absorb the interactions of multiple categorical variables

- i.var1#c.var2: absorb heterogeneous slopes, where var2 has a different slope estimate depending on var1. Use carefully (see below!)

- var1##c.var2: absorb heterogenous intercepts and slopes. Equivalent to "i.var1 i.var1#c.var2", but much faster

- var1##c.(var2 var3): multiple heterogeneous slopes are allowed together. Alternative syntax: var1##(c.var2 c.var3)

- v1#v2#v3##c.(v4 v5): factor operators can be combined

- To save the estimates of specific absvars, write newvar=absvar.

- However, be aware that estimates for the fixed effects are generally inconsistent and not econometrically identified.

- Using categorical interactions (e.g. x#z) is easier and faster than running egen group(...) beforehand.

- [Singleton observations](http://scorreia.com/research/singletons.pdf) are dropped iteratively until no more singletons are found (see the linked article for details).

- Slope-only absvars ("state#c.time") have poor numerical stability and slow convergence.
If you need those, either i) increase tolerance or
ii) use slope-and-intercept absvars ("state##c.time"), even if the intercept is redundant.
For instance if absvar is "i.zipcode i.state##c.time" then i.state is redundant given i.zipcode, but
convergence will still be much faster.

## Options

### Standard FEs

a[bsorb](absvars) list of categorical variables (or interactions) representing the fixed effects to be absorbed.
This is equivalent to including an indicator/dummy variable for each category of each absvar. absorb() is required.

To save a fixed effect, prefix the absvar with "newvar=".
For instance, the option absorb(firm_id worker_id year_coefs=year_id) will include firm, worker, and year fixed effects,
but will only save the estimates for the year fixed effects (in the new variable year_coefs).

If you want to run predict afterward but don't particularly care about the names of each fixed effect, use the save[fe] suboption.
This will delete all preexisting variables matching __hdfe*__ and create new ones as required.
Example: reghdfe price weight, absorb(turn trunk, savefe).

### Group FEs

g[roup](groupvar) categorical variable representing each group (eg: patent_id). group() is not required, unless you specify individual().

If only group() is specified, the program will run with one observation per group.

Note that group here means whatever aggregation unit at which the outcome is defined.

i[ndividual](indvar) categorical variable representing each individual (eg: inventor_id).

This variable is not automatically added to absorb(), so you must include it in the absvar list.
This is because the order in which you include it affects the speed of the command, and reghdfe is not smart enough to know the optimal ordering.

If individual() is specified you must also call group().

ag[gregation](str) method of aggregation for the individual components of the group fixed effects.
Valid options are mean (default), and sum.

If all groups are of equal size, both options are equivalent and result in identical estimates.

Note that both options are econometrically valid, and aggregation() should be determined based on the economics behind each specification.
For instance, adding more authors to a paper or more inventors to an invention might not increase its quality proportionally (i.e. its citations), so using "mean" might be the sensible choice.
In contrast, other production functions might scale linearly in which case "sum" might be the correct choice.

Combining options: depending on which of absorb(), group(), and individual() you specify, you will trigger different use cases of reghdfe:

1. If none is specified, reghdfe will run OLS with a constant.

2. If only absorb() is present, reghdfe will run a standard fixed-effects regression.

3. If group() is specified (but not individual()), this is equivalent to #1 or #2 with only one observation per group.
That is, running "bysort group: keep if _n == 1" and then "reghdfe ...".

3. If all are specified, this is equivalent to a fixed-effects regression at the group level and individual FEs.

### Model

vce(vcetype, subopt) specifies the type of standard error reported.

un[adjusted]|ols estimates conventional standard errors, valid under the assumptions of homoscedasticity and no correlation between observations even in small samples.

r[obust] estimates heteroscedasticity-consistent standard errors (Huber/White/sandwich estimators), which still assume independence between observations.

Warning: in a FE panel regression, using r[obust] will
lead to inconsistent standard errors if, for every fixed effect, the other dimension is fixed.
For instance, in a standard panel with individual and time fixed effects, we require both the number of
individuals and periods to grow asymptotically.
If that is not the case, an alternative may be to use clustered errors,
which as discussed below will still have their own asymptotic requirements.
For a discussion, see
[Stock and Watson, "Heteroskedasticity-robust standard errors for fixed-effects panel-data regression," Econometrica 76 (2008): 155-174](http://www.princeton.edu/~mwatson/papers/ecta6489.pdf).

cl[uster] clustervars estimates consistent standard errors even when the observations
are correlated within groups.

Multi-way-clustering is allowed. Thus, you can indicate as many clustervars as desired
(e.g. allowing for intragroup correlation across individuals, time, country, etc).
For instance, vce(cluster firm year) will estimate SEs with firm and year clustering (two-way clustering).

Each clustervar permits interactions of the type var1#var2.
This is equivalent to using egen group(var1 var2) to create a new variable, but more convenient and faster.
For instance, vce(cluster firm#year) will estimate SEs with one-way clustering i.e. where all observations of a given firm and year are clustered together.

Note: do not confuse vce(cluster firm#year) (one-way clustering) with vce(cluster firm year) (two-way clustering).

Warning: it is not recommended to run clustered SEs if any of the clustering variables have too few different levels.
A frequent rule of thumb is that each cluster variable must have at least 50 different categories
(the number of categories for each clustervar appears at the top of the regression table).

dk[raay] [#] estimates Driscoll-Kraay standard errors, robust to both arbitrary cross-sectional (spatial)
correlation and serial (autocorrelation) correlation.
This is equivalent to computing a Newey-West HAC estimator on the cross-sectional averages of the moment conditions,
or paraphrasing ivreg2, to "clustering on the tsset time variable and the bandwidth supplied as #".
The optional integer # specifies the bandwidth used in the Bartlett kernel, where bandwidth = lags + 1
(this follows the convention used by ivreg2 but not xtscc, which specifies lags instead of bandwidth).
If omitted, the default bandwidth is floor(4*(T/100)^(2/9)) + 1 based on Newey-West (1994), where T is the number of time periods.

Note: vce(dkraay) requires the data to be tsset or xtset with a time variable.

Note: Driscoll-Kraay standard errors are asymptotically valid as T (number of time periods) goes to infinity,
regardless of the cross-sectional dimension N. They are particularly useful for macro panels with
a moderate to large number of time periods but possibly strong cross-sectional dependence.

Tip: vce(dkraay 1) (bandwidth=1, i.e., 0 lags) is equivalent to clustering on the time variable, i.e., vce(cluster timevar).

References: Driscoll and Kraay (1998), "Consistent Covariance Matrix Estimation with Spatially Dependent Panel Data",
Review of Economics and Statistics; Hoechle (2007), "Robust Standard Errors for Panel Regressions with Cross-Sectional Dependence", Stata Journal.

res[iduals](newvar) saves the regression residuals in a new variable.

res[iduals] (without parenthesis) saves the residuals
in the variable _reghdfe_resid (overwriting it if it already exists).

This option does not require additional computations and is required for
subsequent calls to predict, d.

su[mmarize](stats) this option is now part of sumhdfe

### IV/2SLS/GMM

The IV functionality of reghdfe has been moved into ivreghdfe.

### Degrees-of-Freedom Adjustments

dof[adjustments](doflist) selects how the degrees-of-freedom, as well as e(df_a), are adjusted due to the absorbed fixed effects.

The problem: without any adjustment, the degrees-of-freedom (DoF) lost due to the fixed effects is equal to the count of all the fixed effects.
For instance, a regression with absorb(firm_id worker_id), and 1000 firms, 1000 workers, would drop 2000 DoF due to the FEs.
This is potentially too aggressive, as many of these fixed effects might be perfectly collinear with each other, and the true number of DoF lost might be lower.
As a consequence, your standard errors might be erroneously too large.

The solution: To address this, reghdfe uses several methods to count instances as possible of collinearities of FEs.
In most cases, it will count all instances (e.g. one- and two-way fixed effects), but in others it will only provide a conservative estimate.
Doing this is relatively slow, so reghdfe might be sped up by changing these options.

all is the default and usually the best alternative. It is equivalent to dof(pairwise clusters continuous).
However, an alternative when using many FEs is to run dof(firstpair clusters continuous), which is faster and might be almost as good.

none assumes no collinearity across the fixed effects (i.e. no redundant fixed effects). This is overtly conservative, although it is the faster method by virtue of not doing anything.

first[pair] will exactly identify the number of collinear fixed effects across the first two sets of fixed effects
(i.e. the first absvar and the second absvar).
The algorithm used for this is described in Abowd et al (1999), and relies on results from graph theory
(finding the number of connected sub-graphs in a bipartite graph).
It will not do anything for the third and subsequent sets of fixed effects.

For more than two sets of fixed effects, there are no known results that provide exact degrees-of-freedom as in the case above.
One solution is to ignore subsequent fixed effects (and thus overestimate e(df_a) and underestimate the degrees-of-freedom).
Another solution, described below, applies the algorithm between pairs of fixed effects to obtain a better (but not exact) estimate:

pair[wise] applies the aforementioned connected-subgraphs algorithm between pairs of fixed effects.
For instance, if there are four sets of FEs, the first dimension will usually have no redundant coefficients (i.e. e(M1)==1), since we are running the model without a constant.
For the second FE, the number of connected subgraphs with respect to the first FE will provide an exact estimate of the degrees-of-freedom lost, e(M2).

For the third FE, we do not know exactly.
However, we can compute the number of connected subgraphs between the first and third G(1,3),
and second and third G(2,3) fixed effects,
and choose the higher of those as the closest estimate for e(M3).
For the fourth FE, we compute G(1,4), G(2,4), and G(3,4) and again choose the highest for e(M4).

Finally, we compute e(df_a) = e(K1) - e(M1) + e(K2) - e(M2) + e(K3) - e(M3) + e(K4) - e(M4);
where e(K#) is the number of levels or dimensions for the #-th fixed effect (e.g. number of individuals or years).
Note that e(M3) and e(M4) are only conservative estimates and thus we will usually be overestimating the standard errors.
However, given the sizes of the datasets typically used with reghdfe, the difference should be small.

Since the gain from pair[wise] is usually minuscule for large datasets, and the computation is expensive, it may be a good practice to exclude this option for speedups.

cont[inuous]
Fixed effects with continuous interactions (i.e. individual slopes, instead of individual intercepts) are dealt with differently.
In an i.categorical#c.continuous interaction, we will do one check: we count the number of categories where c.continuous is always zero.
In an i.categorical##c.continuous interaction, we count the number of categories where c.continuos is always the same constant. If that is the case, then the slope is collinear with the intercept.

Additional methods, such as bootstrap are also possible but not yet implemented.
Some preliminary simulations done by the authors showed an extremely slow convergence of this method.

groupv[ar](newvar) name of the new variable that will contain the first mobility group.
Requires pair[wise], first[pair], or the default all.

### Optimization

tech[nique](str)

technique(map) (default)will partial out variables using the "method of alternating projections" (MAP) in any of its variants. MAP currently does not work with individual & group fixed effects. Fast and stable option

technique(lsmr) use the Fong and Saunders LSMR algorithm. Recommended (default) technique when working with individual fixed effects.
LSMR is an iterative method for solving sparse least-squares problems; analytically equivalent to the MINRES method on the normal equations.
For more information on the algorithm, please reference the [paper](https://stanford.edu/group/SOL/software/lsmr/LSMR-SISC-2011.pdf)

technique(lsqr) use Paige and Saunders LSQR algorithm. Alternative technique when working with individual fixed effects.
LSQR is an iterative method for solving sparse least-squares problems; analytically equivalent to conjugate gradient method on the normal equations.
Fast, but less precise than LSMR at default tolerance (1e-8).
For more information on the algorithm, please reference the [paper](https://web.stanford.edu/group/SOL/software/lsqr/lsqr-toms82a.pdf)

technique(gt) variation of Spielman et al's graph-theoretical (GT) approach (using a spectral sparsification of graphs); currently disabled

acceleration(str) Relevant for tech(map).
Allows for different acceleration techniques, from the simplest case of no acceleration (no[ne]), to steep descent (st[eep_descent] or sd), Aitken (a[itken]),
and finally Conjugate Gradient (co[njugate_gradient] or cg).

Note: Each acceleration is just a plug-in Mata function, so a larger number of acceleration techniques are available, albeit undocumented (and slower).

transf[orm](str) allows for different "alternating projection" transforms.
The classical transform is Kaczmarz (kac[zmarz]), and more stable alternatives are Cimmino (cim[mino]) and Symmetric Kaczmarz (sym[metric_kaczmarz])

Note: The default acceleration is Conjugate Gradient and the default transform is Symmetric Kaczmarz.
Be wary that different accelerations often work better with certain transforms.
For instance, do not use conjugate gradient with plain Kaczmarz, as it will not converge (this is because CG requires a symmetric operator in order to converge,
and plain Kaczmarz is not symmetric).

prec[onditioner](str) LSMR/LSQR require a good preconditioner in order to converge efficiently and in few iterations.
reghfe currently supports right-preconditioners of the following types: no[ne], diag[onal], and block[_diagonal] (default).

prune(str)prune vertices of degree-1; acts as a preconditioner that is useful if the underlying network is very sparse; currently disabled

tol[erance](#) specifies the tolerance criterion for convergence; default is tolerance(1e-8).
In general, high tolerances (1e-8 to 1e-14) return more accurate results, but more slowly.
Similarly, low tolerances (1e-7, 1e-6, ...) return faster but potentially inaccurate results.

Note that tolerances higher than 1e-14 might be problematic, not just due to speed, but because they approach the limit of the computer precision (1e-16).
Thus, using e.g. tol(1e15) might not converge, or take an inordinate amount of time to do so.

At the other end, low tolerances (below 1e-6) are not generally recommended, as the iteration might have been stopped too soon, and thus the reported estimates might be incorrect.
However, with very large datasets, it is sometimes useful to use low tolerances when running preliminary estimates.

Note: detecting perfectly collinear regressors is more difficult with iterative methods (i.e. those used by reghdfe) than with direct methods (i.e. those used by regress).
To spot perfectly collinear regressors that were not dropped, look for extremely high standard errors. In this case, consider using higher tolerances.

Warning: when absorbing heterogeneous slopes without the accompanying heterogeneous intercepts,
convergence is quite poor and a higher tolerance is strongly suggested (i.e. higher than the default).
In other words, an absvar of var1##c.var2 converges easily, but an absvar of var1#c.var2 will converge slowly and may require a higher tolerance.

it[erations](#)
specifies the maximum number of iterations; the default is iterations(16000); set it to missing (.) to run forever until convergence.

nosample will not create e(sample), saving some space and speed.

### Parallel execution

par[allel](#1, cores(#2) options) runs the partialling-out step in #1 separate Stata processeses,
each using #2 cores.
This option requires the parallel package (see [website](https://github.com/gvegayon/parallel)). There are several additional suboptions, discussed here.

Note that parallel() will only speed up execution in certain cases.
First, the dataset needs to be large enough, and/or the partialling-out process needs to be slow enough, that the overhead of opening separate Stata instances will be worth it.
Second, if the computer has only one or a few cores, or limited memory, it might not be able to achieve significant speedups.

### Memory Usage

pool[size](#)
Number of variables that are pooled together into a matrix that will then be transformed.
The default is to pool variables in groups of 10. Larger groups are faster with more than one processor, but may cause out-of-memory errors. In that case, set poolsize to 1.

compact preserve the dataset and drop variables as much as possible on every step

### Reporting

l[evel](#) sets confidence level; default is level(95); see [R] Estimation options

INCLUDE help displayopts_list

nohead[er] suppresses the display of the table of summary
statistics at the top of the output; only the coefficient table is displayed.
This option is often used in programs and ado-files.

notable suppresses display of the coefficient table.

nofoot[note] suppresses display of the footnote table that lists the absorbed fixed effects, including the number of categories/levels of each fixed effect,
redundant categories (collinear or otherwise not counted when computing degrees-of-freedom), and the difference between both.

nocon[stant] suppresses display of the _cons row in the main table. No results or computations change, this is merely a cosmetic option

### Diagnostic

v[erbose](#) orders the command to print debugging information.

Possible values are 0 (none), 1 (some information), 2 (even more), 3 (adds dots for each iteration, and reports parsing details), 4 (adds details for every iteration step)

For debugging, the most useful value is 3. For simple status reports, set verbose to 1.

time[it] shows the elapsed time at different steps of the estimation. Most time is usually spent on three steps: map_precompute(), map_solve() and the regression step.

version(#) reghdfe has had so far two large rewrites, from version 3 to 4, and version 5 to version 6.
Because the rewrites might have removed certain features (e.g. IV/2SLS was available in version 3 but moved to ivreghdfe on version 4),
this option allows you to run the previous versions without having to install them (they are already included in reghdfe installation).

To use them, just add the options version(3) or version(5). You can check their respective help files here: reghdfe3, reghdfe5.

This option is also useful when replicating older papers, or to verify the correctness of estimates under the latest version.

Tip:To avoid the warning text in red, you can add the undocumented nowarn option.

## Postestimation Syntax

Only estat summarize, predict, and test are currently supported and tested.

For additional postestimation tables specifically tailored to fixed effect models, see the [sumhdfe](https://github.com/ed-dehaan/sumhdfe) package.

The syntax of estat summarize and predict is:

estat summarize

| Summarizes depvar and the variables described in _b (i.e. not the excluded instruments)

predict
newvar
[if] [in]
[, statistic]

| May require you to previously save the fixed effects (except for option xb).
| To see how, see the details of the absorb option
| Equation: y = xb + d_absorbvars + e

### Main

- xb: xb fitted values; the default

- xbd: xb + d_absorbvars

- d: d_absorbvars

- r[esiduals]: residual

- sc[ore]: score; equivalent to residuals

- stdp: standard error of the prediction (of the xb component)

although predict type newvar is allowed,
the resulting variable will always be of type double.

test Performs significance test on the parameters, see the stata help

suest Do not use suest. It will run, but the results will be incorrect. See workaround below

If you want to perform tests that are usually run with suest,
such as non-nested models, tests using alternative specifications of the variables,
or tests on different groups, you can replicate it manually, as described
[here](http://www.stata.com/statalist/archive/2009-11/msg01485.html).

## Missing Features

(If you are interested in discussing these or others, feel free to contact us)

- Implement a -bootstrap- option

- Improve/reincorporate tech(gt) and prune options

- Improve DoF adjustments for 3+ HDFEs (e.g. as discussed in the [group3hdfe](https://ideas.repec.org/c/boc/bocode/s458181.html) package)

- More postestimation commands (lincom? margins?)

## Examples

Setup

```stata
. sysuse auto
```

Simple case - one fixed effect

```stata
. reghdfe price weight length, absorb(rep78)
```

As above, but also compute clustered standard errors

```stata
. reghdfe price weight length, absorb(rep78) vce(cluster rep78)
```

Two and three sets of fixed effects

```stata
. webuse nlswork
```

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa south , absorb(idcode year)
```

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa south , absorb(idcode year occ)
```

Driscoll-Kraay standard errors (robust to cross-sectional and serial correlation)

```stata
. webuse nlswork
```

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa south , absorb(idcode) vce(dkraay)
```

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa south , absorb(idcode) vce(dkraay 4)
```

## Advanced examples

Save the FEs as variables

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa south , absorb(FE1=idcode FE2=year)
```

Interactions in the absorbed variables (notice that only the # symbol is allowed)

```stata
. reghdfe ln_w grade age ttl_exp tenure not_smsa , absorb(idcode#occ)
```

## Group Examples

Setup

```stata
. webuse toy-patents-long
```

Individual (inventor) & group (patent) fixed effects

```stata
. reghdfe citations funding, a(inventor_id) group(patent_id) individual(inventor_id)
```

Individual & group fixed effects, with an additional standard fixed effects variable

```stata
. reghdfe citations funding, a(year inventor_id) group(patent_id) individual(inventor_id)
```

Individual & group fixed effects, specifying with a different method of aggregation (sum)

```stata
. reghdfe citations funding, a(inventor_id) group(patent_id) individual(inventor_id) aggreg(sum)
```

If theory suggests that the effect of multiple authors will enter additively, as opposed to the average effect of the group of authors, this would be the appropriate treatment.
Mean is the default method.

Use one observation per group

```stata
. reghdfe citations funding, a(year) group(patent_id)
```

## Stored results

reghdfe stores the following in e():

### Scalars

- e(N): number of observations

- e(num_singletons): number of singleton observations

- e(N_full): number of observations including singletons

- e(N_hdfe): number of absorbed fixed-effects

- e(tss): total sum of squares

- e(tss): total sum of squares after partialling-out

- e(rss): residual sum of squares

- e(rss): model sum of squares (tss-rss)

- e(r2): R-squared

- e(r2_a): adjusted R-squared

- e(r2_within): Within R-squared

- e(r2_a_within): Adjusted Within R-squared

- e(df_a): degrees of freedom lost due to the fixed effects

- e(rmse): root mean squared error

- e(ll): log-likelihood

- e(ll_0): log-likelihood of fixed-effect-only regression

- e(F): F statistic

- e(rank): rank of e(V)

- e(N_clustervars): number of cluster variables

- e(N_clust#): number of clusters for the #th cluster variable

- e(N_clust): number of clusters; minimum of e(clust#)

- e(df_m): model degrees of freedom

- e(df_r): residual degrees of freedom

- e(sumweights): sum of weights

- e(ic): number of iterations

- e(converged): 1 if converged, 0 otherwise

- e(drop_singletons): 1 if singletons were dropped, 0 otherwise

- e(df_a_nested): Redundant due to being nested within clustervars

- e(report_constant): whether _cons was included in the regressions (default)
or as part of the fixed effects

### Macros

- e(cmd): reghdfe

- e(cmdline): command as typed

- e(dofmethod): dofmethod employed in the regression

- e(depvar): name of dependent variable

- e(indepvars): names of independent variables

- e(absvars): name of the absorbed variables or interactions

- e(extended_absvars): name of the extended absorbed variables (counting intercepts and slopes separately)

- e(clustvar): name of cluster variable

- e(clustvar#): name of the #th cluster variable

- e(vce): vcetype specified in vce()

- e(vcetype): title used to label Std. Err.

- e(properties): b V

- e(predict): program used to implement predict

- e(estat_cmd): program used to implement estat

- e(footnote): program used to display footnote

- e(dofmethod): method(s) used to compute degrees-of-freedom lost due the fixed effects

- e(marginsnotok): predictions not allowed by margins

- e(title): title in estimation output

- e(title2): subtitle in estimation output, indicating how many FEs were being absorbed

### Matrices

- e(b): coefficient vector

- e(V): variance-covariance matrix of the estimators

- e(dof_table): degrees-of-freedom table

- r(table): main results table

### Functions

- e(sample): marks estimation sample

## Authors

Sergio Correia

Board of Governors of the Federal Reserve

Email: [sergio.correia@gmail.com](mailto:sergio.correia@gmail.com)

Noah Constantine

Board of Governors of the Federal Reserve

Email: [noahbconstantine@gmail.com](mailto:noahbconstantine@gmail.com)

## Support and updates

reghdfe requires the ftools package
([Github repo](https://github.com/sergiocorreia/ftools)).

## Acknowledgements

This package wouldn't have existed without the invaluable feedback and contributions of Paulo Guimarães, Amine Ouazad, Mark E. Schaffer, Kit Baum, Tom Zylkin, and Matthieu Gomez.
Also invaluable are the great bug-spotting abilities of many users.

In addition, reghdfe is built upon important contributions from the Stata community:

[reg2hdfe](https://ideas.repec.org/c/boc/bocode/s457101.html), from Paulo Guimaraes,
and [a2reg](https://ideas.repec.org/c/boc/bocode/s456942.html) from Amine Ouazad,
were the inspiration and building blocks on which reghdfe was built.

[ivreg2](http://www.repec.org/bocode/i/ivreg2.html), by Christopher F Baum, Mark E Schaffer, and Steven Stillman,
is the package used by default for instrumental-variable regression.

[parallel](https://github.com/gvegayon/parallel) by George Vega Yon and Brian Quistorff, is for parallel processing.

[avar](https://ideas.repec.org/c/boc/bocode/s457689.html) by Christopher F Baum and Mark E Schaffer,
is the package used for estimating the HAC-robust standard errors of ols regressions.

[tuples](http://econpapers.repec.org/software/bocbocode/s456797.htm) by Joseph Lunchman and Nicholas Cox,
is used when computing standard errors with multi-way clustering (two or more clustering variables).

## References

The algorithm underlying reghdfe is a generalization of the works by:

Paulo Guimaraes and Pedro Portugal. "A Simple Feasible Alternative Procedure to Estimate
Models with High-Dimensional Fixed Effects".
Stata Journal, 10(4), 628-649, 2010.
[[link]](http://www.stata-journal.com/article.html?article=st0212)

Simen Gaure. "OLS with Multiple High Dimensional Category Dummies".
Memorandum 14/2010, Oslo University, Department of Economics, 2010.
[[link]](https://ideas.repec.org/p/hhs/osloec/2010_014.html)

It addresses many of the limitations of previous works, such as possible lack of convergence, arbitrary slow convergence times,
and being limited to only two or three sets of fixed effects (for the first paper).
The paper explaining the specifics of the algorithm is a work-in-progress and available upon request.

If you use this program in your research, please cite either
the [REPEC entry](https://ideas.repec.org/c/boc/bocode/s457874.html)
or the aforementioned papers.

## Additional References

For details on the Aitken acceleration technique employed, please see "method 3" as described by:

Macleod, Allan J. "Acceleration of vector sequences by multi-dimensional Delta-2 methods."
Communications in Applied Numerical Methods 2.4 (1986): 385-392.

For details on the Driscoll-Kraay standard errors:

Driscoll, John C., and Aart C. Kraay. "Consistent Covariance Matrix Estimation with Spatially Dependent Panel Data."
Review of Economics and Statistics 80.4 (1998): 549-560.

Hoechle, Daniel. "Robust Standard Errors for Panel Regressions with Cross-Sectional Dependence."
Stata Journal 7.3 (2007): 281-312.
[[link]](https://journals.sagepub.com/doi/10.1177/1536867X0700700301)
