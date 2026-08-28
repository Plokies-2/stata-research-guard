# stackedev complete maintainer help

Maintainer help version: 1.1 18dec2021

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

- stackedev —
implements the stacked event study estimator discussed in Cunningham (2021) and Baker (2021) and implemented in Cengiz et al. (2010). The package appends together individual datasets or stacks. Each stack includes all observations from a cohort of units that receive treatment in the same time period and all units that never received treatment. Effects are identified within each stack by comparing an individual cohort of treated units to never treated units. That approach avoids erroneous comparisons of late to early implementing units that may bias Two-Way Fixed Effects (TWFE) estimates if effects vary across treated cohorts (Goodman-Bacon, 2021). The stacked event study is estimated in three steps. First, individual stacks are created. Second, they are appended together. Finally the package estimates an event study via reghdfe that includes unit by stack fixed effects, time by stack fixed effects, and standard errors clustering on unit by stack.

## Syntax

stackedev
depvar leads_lags_list [if] [in] weight , absorb(absvars) cohort(variable)
control_cohort(variable)
[options covariates(varlist)]

where leads_lags_list} is the list of relative time indicators as you would have included in the canonical two-way fixed effects regression, for example:

[pre3] [pre2] [post1] [post2] [post3] [ref] [...]]

Users should shape their dataset to a long format where each observation is at the unit-time level. See illustration for an example of specifying the syntax. The syntax is similar to reghdfe in specifying fixed effects (with absorb)
and the type of standard error reported (with vcetype). Results stored in e(b), e(V), and e(dof_table).

stackedev requires avar (Baum and Schaffer, 2013), fools (Correia, 2017), reghdfe (Correia, 2017) to be installed.
Installation of stackedev will install avar, ftools, reghdfe (and its dependencies) from ssc if necessary.
Installation of eventstudyinteract will install avar and reghdfe (and its dependencies) from ssc if necessary.

### Must Specify

- cohort(varname): A categorical variable equal to the time that the unit first received treatment. It must be missing for never treated units.

- time(varname): A numerical variable equal to time.

- never_treat(varname): A binary indicator that equals one if a unit never received treatment and zero if it did.

- unit_fe(varname): A variable indicating unit fixed effects.

- clust_unit(varname): A variable indicating the unit by which to cluster variances.

### Optional

- covariates(varlist): A variable list of covariates.

- other_fe(varlist): A additional fixed effects added to reghdfe's absorb option.

- interact_cov(string): A indicate yes to interact covariates with stack.

## Example

Read in simulated state policy dataset.

```stata
. use https://github.com/joshbleiberg/stacked_event/raw/main/state_policy_effect.dta, clear
```

Assigning treatment to states staggered across time. It must be missing for never treated units.

```stata
. gen treat_year=.
```
```stata
. replace treat_year=2006 if inrange(state,13,20)
```
```stata
. replace treat_year=2007 if inrange(state,21,25)
```
```stata
. replace treat_year=2008 if inrange(state,26,40)
```
```stata
. replace treat_year=2009 if inrange(state,40,50)
```
```stata
. label variable treat_year "Cohort"
```

Creating ever treated indicator

```stata
. gen ever=0
```
```stata
. replace ever=1 if inrange(state,13,50)
```
```stata
. label variable ever "Ever Treated"
```

Creating never treated indicator that equals one if a unit never received treatment and zero if it did.

```stata
. gen no_treat=ever
```
```stata
. recode no_treat (0=1) (1=0)
```
```stata
. label variable no_treat "Never Treated"
```

Creating leads and lags

```stata
. gen rel=(year-treat_year)+1
```
```stata
. replace rel=0 if ever==0
```
```stata
. tab rel, gen(rel_)
```
```stata
. label variable rel "Relative Time"
```

```stata
. rename rel_1 pre8
```
```stata
. rename rel_2 pre7
```
```stata
. rename rel_3 pre6
```
```stata
. rename rel_4 pre5
```
```stata
. rename rel_5 pre4
```
```stata
. rename rel_6 pre3
```
```stata
. rename rel_7 pre2
```
```stata
. rename rel_8 ref
```
```stata
. rename rel_9 post1
```
```stata
. rename rel_10 post2
```
```stata
. rename rel_11 post3
```
```stata
. rename rel_12 post4
```
```stata
. rename rel_13 post5
```

```stata
. label variable pre8 "Pre 8"
```
```stata
. label variable pre7 "Pre 7"
```
```stata
. label variable pre6 "Pre 6"
```
```stata
. label variable pre5 "Pre 5"
```
```stata
. label variable pre4 "Pre 4"
```
```stata
. label variable pre3 "Pre 3"
```
```stata
. label variable pre2 "Pre 2"
```
```stata
. label variable ref "Base Year- Pre 1"
```
```stata
. label variable post1 "Post 1"
```
```stata
. label variable post2 "Post 2"
```
```stata
. label variable post3 "Post 3"
```
```stata
. label variable post4 "Post 4"
```
```stata
. label variable post5 "Post 5"
```

Run the stacked event study

```stata
. stackedev outcome pre8 pre7 pre6 pre5 pre4 pre3 pre2 post1 post2 post3 post4 ref, cohort(treat_year) time(year) never_treat(no_treat) unit_fe(state) clust_unit(state) covariates(cov)
```

## Acknowledgements

Thanks to Liyang Sun author of eventstudyinteract, which served as a reference point for the code herein. Thanks also to Edward Jones who help patch a few bugs. Thanks to Samantha Kane and Christopher Cleveland for identifying a bug with how weights were implemented.

## References

Baker, A., Larcker, D. F., & Wang, C. C. (2021). How Much Should We Trust Staggered Difference-In-Differences Estimates?. Available at SSRN 3794018.

Cengiz, D., Dube, A., Lindner, A., & Zipperer, B. (2019). The effect of minimum wages on low-wage jobs. The Quarterly Journal of Economics, 134(3), 1405-1454.

Correia, S. 2017. REGHDFE: Stata module for linear and instrumental-variable/gmm regression absorbing multiple levels of fixed effects. Statistical Software Components s457874, Boston College Department of Economics. https://ideas.repec.org/c/boc/bocode/s457874.html

Cunningham, S. (2021). Causal inference: The mixtape. Yale University Press. https://mixtape.scunning.com/

Goodman-Bacon, A. (2021). Difference-in-differences with variation in treatment timing. Journal of Econometrics.

Sun, L., 2021. eventstudyinteract: interaction weighted estimator for event study. https://github.com/lsun20/eventstudyinteract.

## Author

Joshua Bleiberg

jbleiberg@pitt.edu
