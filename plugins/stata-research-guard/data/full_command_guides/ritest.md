# ritest complete maintainer help

Maintainer help version: 1.1.8 mar2021

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

- ritest — Randomization inference and permutation tests, allowing for arbitrary randomization procedures

## Syntax

Compute p values for permutation tests, allowing for arbitrary randomization procedures

ritest
resampvar
exp_list
[, options]
: command

### Main

- r[eps](#): perform # random permutations; default is reps(100)

- le[ft]|ri[ght]: compute one-sided p-values; default is two-sided

### Automatic resampling

- str[ata](varlist): permute resampvar within strata

- clu[ster](varlist): keep resampvar constant within clusters

- fix[levels](list): keep resampvar fixed for all listed values

### File-based resampling

- samplings[ourcefile](filename): take permutations of resampvar from Stata data file filename, containing variables named resampvar1, resampvar2, resampvar3, ...

- samplingm[atchvar](varlist): merge permutations in samplingsourcefile with the data using these variables (1:1 or m:1)

### Program-based resampling

- samplingp[rogram](it[programname]): generate permutations of resampvar by calling user-written program programname

- samplingprogramo[ptions](string): optionally pass string as options to programname

### Reporting

- l[evel](#): set confidence level; default is level(95)

- v[erbose]: display full table legend

- nodots: suppress replication dots

- noi[sily]: display any output from command

### Advanced

- null(outcome value): specify a null hypothesis of treatment effect value or varname for outcome outcome

- kdens[ityplot]: plot the densities of each statistic in exp_list

- kdensityo[ptions](string): additional options to be passed on to kdensity

- sav[ing](filename[, replace]): save a data set of estimates from the permutations

- saver[esampling](filename[, replace]): save all permutations of resampvar in a file called filename for later inspection.

- seed(#): set random-number seed to #

- eps(#): numerical tolerance; seldom used, default 1e-7

- strict: computes the strict version of the test. p=c/N, with c = #(|T| > |T(obs)|)

- force: force ritest to accept weights in command

- reject(exp): identify invalid results

## Description

ritest estimates p-values for permutation tests on the basis of Monte Carlo
simulations. Unlike permute, ritest allows to specify more complex permutation
structures, as generated for example by clustered treatment assignments.

### Automatic resampling (permutation)

```stata
. ritest resampvar exp_list, reps(#) strata(stratavar) cluster(clustervar): command
```

randomly permutes the values in resampvar # times, respecting strata and clusters, each time executing
command and collecting the associated values from the expressions in
exp_list. Not specifying strata assumes no strata were used, which is
equivalent to all observations being in one single stratum. Not specifying clusters
assumes no clusters were used, which is equivalent to each observations being a separate cluster.

### File-based resampling

```stata
. ritest resampvar exp_list, reps(#) samplingsourcefile(filename) samplingmatchvar(varlist): command
```

merges the data based on varlist # times using filename (1:1, or if ids are not unique m:1). ).
It executes command each time, replacing resampvar iteratively with resampvar1, resampvar2, resampvar3, ..., resampvar1000,
which have to be stored in filename prior to executing ritest.

### Program-based resampling

```stata
. ritest resampvar exp_list, reps(#) samplingprogram(progname) samplingprogramoptions(string): command
```

permutes resampvar by calling a user-written program progname, and
passing the string samplingprogramoptions as options to this program.
Also, the program will to be passed at two standard arguments: resampvar is
the variable name of the relevant variable and run is an integer containing
the iteration.

### General

left|right computes one sided p-values: Pr(T* < T) or Pr(T* > T).
The default is two-sided: Pr(|T*| > |T|). Here T* denotes the value of
the statistic from a randomly permuted data set, and T denotes the statistic
as computed on the original data.

resampvar identifies the variable for which values will be randomly permuted.

command defines the statistical command to be executed.
Most Stata commands and user-written programs can be used with ritest,
as long as they follow standard Stata syntax.
The by prefix may not be part of command.

exp_list specifies the statistics to be collected from the execution of
command.

## Options

### Main

reps(#) specifies the number of permutations to perform. The
default is 100.

left or right requests that one-sided p-values be computed.
If left is specified, an estimate of Pr(T* < T) is produced, where
T* is the test statistic and T is its observed value. If right is
specified, an estimate of Pr(T* > T) is produced. By default, two-sided
p-values are computed; that is, Pr(|T*| > |T|) is estimated.

### Options

strata(varlist) specifies that the permutations have to be
performed within each stratum defined by the values of varlist.

cluster(varlist) specifies that the permutations have to be
performed treating each cluster as defined by varlist as one unit of assignment.

fixlevel(list) specifies that the permutations have to be
performed holding all observations fixed that have the specified values of the resampling
variable.
This can be used for pairwise testing in experiments with more than two treatment arms.

samplingsourcefile(filename) specifies that permutations of resampvar have to be taken from Stata data-file filename.
This data set should contain variables named [resampvarname]1, [resampvarname]2, [resampvarname]3, ... and a unique id.

samplingmatchvar(varlist) merge permutations in from samplingsourcefile with the data using these variables (1:1 or m:1 merge).

samplingprogram(programname) specifies that permutations of resampvar be generated by calling user-written programname.

samplingprogramoptions(string) specifies that when programname is called string is also passed string as options to programname.

### Reporting

level(#) specifies the confidence level, as a percentage,
for confidence intervals. The default is level(95) or as set by
set level.

nodots suppresses display of the replication dots. By default, one
dot character is displayed for each successful replication. A red 'x'
is displayed if command returns an error or if one of the values in
exp_list is missing.

noisily requests that any output from command be displayed. This
option implies the nodots option.

### Advanced

null(outcome value) allows to test null hypotheses which are different
from zero. value can either be numeric or the name of a variable and will
be deducted from the variable outcome before conducting the randomization
test.

eps(#) defines the numeric tolerance of the test. To account for numeric
imprecisions, the p-value is computed as c/N, with c = #(|T|>=|T(obs)|-eps).
Default is eps(1e-7).

strict computes the strict version of the test. By default the p-value is
computed based on c = #(|T| >= |T(obs)|). When multiple re-samplings
result in the same realization of T, this proceedure yields conservative p-value.
The strict version is based on c = #(|T| > |T(obs)|) and is weakly
overconfident. Requires eps(0).

kdensityplot produces a density plot of the realizations of expressions in
exp_list. The realization for the expression in the original data is drawn
as a vertical line.

reject(exp) identifies an expression that indicates when results should
be rejected. When exp is true, the resulting values are reset to missing
values.

## Examples

Attached to this is help file is a (simulated) data set of schools,
classes, and student test scores. The data consists of observations from 2 schools,
each school has 4 classes of 10 students each. Classes were randomly assigned to
treatment, stratifying by school. The stratification assured that each school had
two treatment and two control classes. The outcome are test scores and the researcher
wants to conduct fisher randomization test test for the sharp null of no treatment
effect based on a regression controlling for age.

### Automatic resampling

```stata
. ritest treatment _b[treatment], cluster(classid) strata(schoolid): reg testscore treatment age
```

### File-based resampling

// start with an empty data sets of classes containing

// only schoolid and classid

use example_classes.dta

forvalues i = 1/100 ( //create and save 100 permutations of treatment

tempvar random cutoff

gen `random'=rnormal()

bys schoolid: egen `cutoff' = median(`random')

gen treatment`i' = `random'> `cutoff'

)

tempfile permutations

save `permutations'

use example_students.dta

//using this file

ritest treatment _b[treatment], r(500) ///

samplingsourcefile("`permutations'") samplingmatchvar(schoolid classid): ///

reg testscore treatment age, cluster(classid)

//redoing the analysis testing the null of the treatment effect being 10(constant)

ritest treatment _b[treatment], r(500) null(testscore 10) ///

samplingsourcefile("`permutations'") samplingmatchvar(schoolid classid): ///

reg testscore treatment age, cluster(classid)

//redoing the same analysis using automatic resampling

ritest treatment _b[treatment], r(500) ///

strata(schoolid) cluster(classid) : ///

reg testscore treatment age, cluster(classid)

The benefit of the file-based approach is that more complicated randomization structures can be implemented. For smaller samples, it is also straightforward to implement complete (non-stochastic) Fisher tests, which exhaust all possible permutations

### Program-based resampling

Define a program to create random permuations:

program permme //define the program

syntax , ///

resampvar(varname) ///<- name of the permutation variable

school(varname) ///<- name of the strata variable

class(varname) ///<- name of the cluster variable

* //<- ritest also passes other things to the permutation procedure (e.g. run(#))

tempvar mr r

// draw one random variable per cluster

qui bys `school' `class': gen `r'=rnormal() if _n==1 // draw one random variable per cluster

// compute median of these random variables within cluster

qui bys `school': egen `mr' = median(`r') if !missing(`r')

// replace the permutation var with the new randomization outcome

replace `resampvar' = cond(`r',`r'>`mr',.,.)

sort `school' `class' `r'

// replace the permutation var with the new randomization outcome for all remaining villages

by `school' `class': replace `resampvar' = `resampvar'[_n-1] if missing(`resampvar')

end

Call ritest using the program:

ritest treatment _b[treatment], r(500) samplingprogram(permme) ///

samplingprogramoptions("school(schoolid) class(classid)") : ///

reg testscore treatment, cluster(classid)

This method can be used implement any kind of re-randomization.

## See also

permute,
simulate,
bootstrap,
jackknife

## Citation

Heß, Simon, "Randomization inference with Stata: A guide and software" Stata Journal 17(3) pp. 630-651.

[BibTeX-file](https://raw.githubusercontent.com/simonheb/ritest/master/ritest.bib).

## Author and acknowledgments

Simon Heß, Goethe University Frankfurt.

The latest version of ritest can always be obtained from [https://github.com/simonheb/ritest](https://github.com/simonheb/ritest) or [http://HessS.org](http://HessS.org). I am happy to receive comments and suggestions regarding bugs or ideas for improvements/extensions via [https://github.com/simonheb/ritest/issues](https://github.com/simonheb/ritest/issues).

The ritest-code is based on the code for permute.
