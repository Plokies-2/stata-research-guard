# sdid complete maintainer help

Maintainer help version: 2.0.3 May 14, 2025

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

sdid — Synthetic difference-in-differences estimation, inference, and visualization

## Syntax

sdid depvar groupvar timevar treatment [if] [in], [options]

- vce(vcetype): vcetype may be bootstrap (the default), jackknife, placebo or noinference.

- cluster(varlist): clustered bootstrap, jackknife and placebo standard errors.

- covariates(varlist, [type]): Allows for the inclusion of covariates in the calculation of the synthetic counterfactual.
Optional type can be specified, as either "optimized" (the default) or "projected", which is preferable in certain circumstances.

- seed(#): set random-number seed to #.

- reps(#): repetitions for bootstrap and placebo inference.

- method(type): Allows for an estimation method to be requested. type can be "sdid" (which is estimated by default), "did" (for standard difference-in-differencs) or "sc" (for standard synthetic control).

- zeta_lambda(#): Allows for control of the regularisation parameter (zeta) defined in
Arkhangelsky et al. (2021, equation 5). If not specified, default values described in Arkhangelsky et al. (2021) are used.

- zeta_omega(#): Allows for control of the regularisation parameter (zeta) defined in
Arkhangelsky et al. (2021). If not specified, default values described in Arkhangelsky et al. (2021) are used.

- min_dec(#): Estimation of optimal weights occurs iteratively until a sequential stopping rule is met. By default, a minimum is assumed when consecutive iterations move by no more than the value indicated in min_dec.

- max_iter(#): Defines the maximum number of iterations to be performed when calculating optimal weights. By default, a maximum of 10,000 iterations will be performed.

- level(#): specifies the confidence level, as a percentage, for confidence intervals. The default is the level set by set level (which by default is level(95)).

- graph: if this option is specified, graphs will be displayed in the style of figure 1 from Arkhangelsky et al. (2021).

- g1on: If graphing is requested, this option activates the unit-specific weight graph.

- g1_opt(graph options): option to modify the appearance of the unit-specific weight graph.

- g2_opt(graph options): option to modify the appearance of the outcome trend graphs.

- graph_export(string, type): option allowing for generated graphs to be saved to the disk.

- msize(markersizestyle): markersizestyle allows you to modify the size of the marker for graph 1.

- unstandardized: In the case of "optimized" covariates, by default covariates will be standardized as z-scores,
unless the unstandardized option is specified.

- _not_yet: If covariates are included with the "projected" method, allows for projections to be based off all not yet treated units.

- mattitles: Requests that weights returned in matrices are accompanied by the name
of the groupvar corresponding to each weight.

- verbose: Requests additional output, such as warnings messages if the number of iterations indicated in max_iter is reached.

- returnweights: Indicates that estimated weights omega and lambda should be returned directly in the dataset corresponding to each unit.

- generate(string): Specifies that the variables containing omega and lambda weights returned if the returnweights option is indicated should be named starting with the specified string.

- xline_opts(string): Allows for options to be passed to the vertical line displayed on the trend plot(s) displaying the beginning of treatment.

- yline_opts(string): Allows for options to be passed to the horizontal line displayed on the weight plot(s) displaying the mean treatment effect.

## Description

sdid implements the synthetic difference-in-differences estimation procedure, along with a range of inference and graphing procedures as described in Arkhangelsky et al. (2021).
Synthetic difference-in-differences is based on a panel (group by time) set-up, in which certain units are treated and
remaining units are untreated. The sdid procedure calculates a treatment effect as the pre- versus post-
difference-in-difference
between treated units and synthetic control units, where synthetic control units are chosen as an optimally weighted function
of untreated units (unit-specific weights) and pre-treatment times (time-specific weights). The sdid command exactly implements
the procedures described in Arkhangelsky et al. (2021). The exact estimation procedure implemented by sdid is described in their Algorithm 1.
Further discussion of this procedure and its implementation in Stata is available in "Synthetic Difference-in-Differences Estimation" (Clarke et al., 2023).

Much of Arkhangelsky et al. (2021) focuses on cases with a single time period of adoption, however their Appendix A lays out the
estimation procedure in cases of staggered-adoption designs, where treated units can adopt treatment at different moments of
time, while control units never adopt. sdid seamlessly estimates treatment effects in cases with both single-time periods of treatment and
multiple-time periods of treatment. In the latter case, rather than calculating a single unit and time-specific weight vector,
an optimal unit and time-specific weight vector is calculated for each adoption period. The reported average treatment effect
on the treated (ATT) in the staggered adoption design is the weighted estimand described in Arkhangelsky et al. (2021), Appendix A. Additionally,
adoption-period specific estimates and their standard errors are returned after estimation.

Inference in sdid is based on bootstrap, jackknife, or placebo procedures. Each procedure is clustered by groupvar,
and follows the precise algorithms laid out in Arkhangelsky et al. (2021). Specifically, bootstrap inference follows Algorithm 2,
jackknife inference follows Algorithm 3, and placebo inference follows Algorithm 4. The suitability of each inference procedure
depends on the precise data structure. For example, bootstrap and jackknife procedures are not appropriate with single treated
units, while placebo inference requires at least 1 more control than treated unit. Inference procedures are provided as standard for
both single-treatment and staggered adoption designs. In the case of staggered-adoption designs, resample inference is conducted
over the entire ATT, so provides a valid standard error for the headline treatment effect (under the large sample conditions
laid out in Arkhangelsky et al. (2021).) In very large databases, bootstrap procedures may be computationally expensive, in
which case jackknife will provide a more (computationally) feasible inference procedure.

sdid additionally allows for the inclusion of covariates in a number of ways, and, if requested, provides graphical
output documenting optimal weights, as well as matched treatment and synthetic control trends underlying the synthetic
difference-in-differences framework. Details related to covariates and graphical options are described at more length below.

An accompanying command sdid_event is available which acts as a wrapper and extension
to sdid allowing for the seamless generation of event study style estimates and
confidence intervals. sdid_event can be installed from the SSC. Discussion of SDID-event
study models are provided in Ciccia (2024); Clarke et al, (2023), and formal details of sdid_event are laid out in Ciccia (2024).

## Options

### Main

vce(vcetype) may be either bootstrap (the default), jackknife, placebo, or noinference where in each case inference
proceeds following the specified method (or not conducted if "noinference" is specified). In the case of bootstrap, this is only permitted
if greater than one unit is treated. In the case of jackknife, this is only permitted if greater than one unit is treated in each treatment
period (if multiple treatment periods are considered). In the case of placebo, this requires at least one more control than treated unit
to allow for permutations to be constructed. In each case, inference follows the specific algorithm laid out in Arkhangelsky et al. (2021).

cluster(varlist) adjusts the inference algorithm specified in vce(vcetype) to clusters at the varlist level. The desired cluster
level is specified via varlist. It is possible to specify more than one variable in varlist, as long as their join is coarser than the
group variable (e.g. sdid earnings firm year treatment, ... cluster(region industry)). There is no need to cluster at the group variable,
in that inference is already perfomed at that level. When vce(bootstrap) is selected, bootstrap resampling is performed at the cluster level.
When vce(placebo) is selected, treatment paths of clusters that have at least one treated group are reassigned to fully untreated clusters. In
this case, it is required that (a) there are at least as many fully untreated clusters as clusters with at least one treated group, (b) all
clusters contain the same number of groups. When vce(jackknife) is selected, the leave-one-out procedure is performed at the cluster level,
i.e. iterating through all clusters, SDID is run on the full sample minus the groups included in the cluster at hand. For this reason, it is required
that there are at least two clusters with at least one treated group per cohort.

covariates(varlist, [type]) Covariates should be included as a varlist, and if specified,
treatment and control units will be adjusted based on covariates in the synthetic difference-in-differences procedure. Optionally,
type may be specified, which indicates how covariate adjustment will occur. If the type is indicated as "optimized" (the default)
this will follow the method described in Arkhangelsky et al. (2021), footnote 4, where SDID is applied to the residuals of all units
after regression adjustment. However, this has been observed to be problematic at times (refer to Kranz, 2022), and is also
sensitive to optimization if covariates have high dispersion. Thus, an alternative type is implmented ("projected"), which consists
of conducting regression adjustment based on parameters estimated only in untreated groups.
This type follows the procedure proposed by Kranz, 2022 (xsynth in R), and is observed to be more stable in some implementations (and at times, considerably faster).
sdid will run simple checks on the covariates indicated and return an error if covariates are constant, to avoid multicolineality.
However, prior to running sdid, you are encouraged to ensure that covariates are not perfectly
multicolinear with other covariates and state and year fixed effects, in a simple two-way fixed
effect regression. If perfectly multi-colinear covariates are included sdid will execute
without errors, however where type is "optimized", the procedure may be sensitive to the
inclusion of redundant covariates.

seed(#) seed defined for pseudo-random numbers.

reps(#) repetitions for bootstrap and placebo standard errors. Default is 50 repetitions. Larger values should be preferred where possible.

method(type) this option allows for alternative estimation methods to be performed. Allowed types are "sdid" (synthetic difference-in-differences)
"did" (standard difference-in-differences) or "sc" (standard synthetic control).
If this option is not included, sdid is assumed by default.

zeta_lambda(#) Value used when defining the regularization term for time weight calculations. This value is the scalar prior to the sigma term used to calculate zeta. Default is 1e-6. This is only relevant when method(sdid) is used, as otherwise time weights are equally set.

zeta_omega(#) Value used when defining the regularization term for unit weight calculations. This value is the quantity prior to
the sigma hat term used to calculate zeta defined in Arkhangelsky et al. (2021, equation 5)).
Default is (N_tr*T_post)^1/4. For other methods, default value is 1e-6.

min_dec(#) Estimation of optimal weights occurs iteratively until a sequential stopping rule is met. By default, a minimum is assumed when consecutive
iterations move by no more than the value indicated in min_dec. By default, this value is set at 1e-5.

max_iter(#) Defines the maximum number of iterations to be performed when calculating optimal weights. By default, a maximum of 10,000 iterations will be performed. Larger values can be set to ensure that a minimum is reached.

level(#) specifies the confidence level, as a percentage, for confidence intervals. The default is the level set by set level (which by default is level(95)).

graph if this option is specified, graphs will be displayed showing unit and time weights as well as outcome trends as per figure 1 from Arkhangelsky et al. (2021).

g1on this option activates the unit-specific weight graph. By default g1 is off, as this graph can take considerable time to generate where a large number of control units are present.

g1_opt(graph options) option to modify the appearance of the unit-specific weight graph.
These options adjust the underlying scatter plot, so should be consistent with twoway scatter plots.

g2_opt(graph options) option to modify the appearance of the outcome trend graphs.
These options adjust the underlying line plot, so should be consistent with twoway line plots.

graph_export(string, type) Graphs will be saved as weightsYYYY and trendsYYYY for each of the unit-specific weights and outcome trends respectively, where YYYY refers to each treatment adoption period.
Two graphs will be generated for each treatment adoption period. If this option is specified, type must be specified, which refers to a valid Stata graph type (eg ".eps", ".pdf", and so forth).
Additionally, if type is specified as ".gph" the graph is saved on disk in Stata's ".gph" format which permits editing of the graph.
Optionally, a stub can be specified, in which case this will be prepended to exported graph names.

msize(size of marker) allows you to modify the size of the marker for graph 1.

unstandardized if controls are included and the "optimized" method is specified, controls will be standardized as Z-scores prior to finding optimal weights. This avoids problems with optimization when control variables have very
high dispersion. If unstandardized is specified, controls will simply be entered in their original units.
This option should be used with care.

_not_yet if controls are included and the "projected" method is specified, by default controls will be projected out from estimates based on never treated units only.
If _not_yet is indicated, this projection will also incorporate observations which are eventually treated, but for which treatment has not yet been switched on.

mattitles Requests labels to be added to the returned e(omega) weight matrix providing names (in string) for the unit variables which generate the synthetic control group in each case.
If mattitles is not indicated, the returned weight matrix (e(omega)) will store these
weights with a final column providing the numerical ID of units, where this numerical ID is either
taken from the unit variable (if this variable is a numerical format), or arranged in alphabetical
order based on the unit variable, if this variable is in string format.

verbose Requests additional output, such as warnings messages if the number of iterations indicated in max_iter is reached.

returnweights Indicates that estimated weights omega and lambda should be returned directly in the dataset corresponding to each unit.
By default, these will be returned as variables named omegaYYYY and lambdaYYYY where YYYY is replaced by treatment adoption years.

generate(string) Specifies that the variables containing omega and lambda weights returned if the returnweights option is indicated should be named starting with string.
If returnweights is indicated but generate is not indicated, variables will simply follow default naming.

xline_opts(string) Allows for options to be passed to the vertical line which displays the beginning of treatment on the outcome trend graph(s).
These will be passed to xline() internally, and hence any valid options accepted by added line options such as line colors and line styles are permitted.

yline_opts(string) Allows for options to be passed to the horizontal line which displays the bemean treatment effect on each of the weight graph(s).
These will be passed to yline() internally, and hence any valid options accepted by added line options such as line colors and line styles are permitted.

## Stored results

sdid stores the following in e():

- Scalars:

- e(ATT): Average Treatment Effect on the Treated

- e(ATT_l): Left-hand point of confidence interval on ATT (based on level())

- e(ATT_r): Right-hand point of confidence interval on ATT (based on level())

- e(se): Standard error for the ATT

- e(reps): Number of bootstrap/placebo replications

- e(G): Number of units (groups) observed in the original panel used for sdid

- e(N_clust): Number of clusters observed in the original panel used for sdid

- Macros:

- e(cmd): Returns command name (sdid)

- e(cmdline): Returns command as typed

- e(depvar): Lists name of dependent variable

- e(vce): Provide vcetype specified in vce() (placebo, bootstrap, jackknife or noinference)

- e(clustvar): Provides the name of the unit (group) variable

- Matrices:

- e(tau): tau estimator for each adoption time-period, along with its standard error

- e(lambda): lambda weights (time-specific weights)

- e(omega): omega weights (unit-specific weights)

- e(adoption): A vector containing the list of all treatment adoption times

- e(beta): A vector corresponding to coefficients estimated on covariates included as control (only retuned if the covariates option is used)

- e(series): control and treatment series containing time series trends of outcome means over time

- e(series_resid): control and treatment series containing trends of outcome means over time based on residualised data
(only provided if covariates are included with the optimized method)

- e(difference): difference between treatment and control series over time

- e(b): coefficient estimate returned for ATT

- e(V): variance estimate returned for ATT

The matrices e(b) and e(V) are included to facilite the exportation of results from sdid with routines such as estout.

## Examples

Load data on quotas, women in parliament and maternal mortality (a balanced panel version) from Bhalotra et al., (2023).

```stata
. webuse set www.damianclarke.net/stata/
```

```stata
. webuse quota_example.dta, clear
```

Run SDID estimator without covariates and bootstrap standard error.

```stata
. sdid womparl country year quota, vce(bootstrap) seed(1213)
```

Run SDID estimator using covariates in projected way.

```stata
. drop if lngdp==.
```

```stata
. sdid womparl country year quota, vce(bootstrap) seed(1213) covariates(lngdp, projected)
```

Example with one time adoption and some graphics options. Load data from Abadie et al., (2010).

```stata
. webuse prop99_example.dta, clear
```

```stata
. sdid packspercapita state year treated, vce(placebo) seed(1213) graph g1_opt(xtitle("")) g2_opt(ylabel(0(50)150))
```

## References

A. Abadie, A. Diamond and J. Hainmueller. 2010. [Synthetic Control Methods for Comparative Case Studies: Estimating the Effect of California’s Tobacco Control Program.](https://economics.mit.edu/files/11859) Journal of the American Statistical.

D. Arkhangelsky, S. Athey, D. Hirshberg, G. Imbens and S. Wager. 2021. [Synthetic Difference in Differences.](https://www.aeaweb.org/articles?id=10.1257/aer.20190159)
American Economic Review.

S. Bhalotra, D. Clarke, J. Gomes, and A. Venkataramani. 2023. [Maternal Mortality and Women's Political Power.](https://academic.oup.com/jeea/article/21/5/2172/7060387)
Journal of the European Economic Association.

D. Ciccia. 2024. [A Short Note on Event-Study Synthetic Difference-in-Differences Estimators.](https://arxiv.org/pdf/2407.09565)
arXiv.

D. Clarke, D Pailañir, S. Athey and G. Imbens. 2023. [Synthetic Difference-in-Differences Estimation.](https://docs.iza.org/dp15907.pdf)
IZA Discussion Paper.

S. Kranz. 2022. [Synthetic Difference-in-Differences with Time-Varying Covariates.](https://github.com/skranz/xsynthdid/blob/main/paper/synthdid_with_covariates.pdf)
Working paper.

## Author

Damian Clarke, Universidad de Chile.
Email [dclarke@fen.uchile.cl](mailto:dclarke@fen.uchile.cl)
Website [http://www.damianclarke.net/](http://www.damianclarke.net/)

Daniel Pailañir, Universidad de Chile.
Email [dpailanir@fen.uchile.cl](mailto:dpailanir@fen.uchile.cl)
Website [https://daniel-pailanir.github.io/](https://daniel-pailanir.github.io/)

Diego Ciccia, Kellogg School of Management, Northwestern University.
Email [diego.ciccia@kellogg.northwestern.edu](mailto:diego.ciccia@kellogg.northwestern.edu)
Website [https://diegociccia.github.io/](https://diegociccia.github.io/)

## Website

sdid is maintained at [https://github.com/Daniel-Pailanir/sdid](https://github.com/Daniel-Pailanir/sdid)
