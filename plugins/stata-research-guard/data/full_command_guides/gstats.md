# gstats complete maintainer help

Maintainer help version: 0.4.0  09Jun2019

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.







## Title




- gstats —:  Various statistical fucntions and transformations.





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



## Syntax




gstats
subcommand
varlist
[if] [in]
[weight]
[, by(varlist) subcommand_options]



gstats is a wrapper for various statistical functions and
transformations, including:



hdfe
(alias residualize) is a fast utility for residualizing variables (i.e. HDFE transform; accepts weights).




winsor
as a fast winsor2 alternative (accepts weights).




summarize and
tabstat are fast,
by-able alternatives to summarize, detail and tabtsat (accept weights).




transform
to apply various statistical transformations (accepts weights).




## Description




gstats is a wrapper to several statistical fucntions and
transformations. In theory gegen would be the place to expand
gtools; however, gegen's internally implemented functions
were written with two assumptions: first, the output is unique at the
group level; second, there is always a target variable. gstats
is written to be more flexible and allow arbitrary functions and
transformations.



Weights are supported for the following subcommands: winsor, summarize, tabstat, residualize.



## Author



Mauricio Caceres


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gstats is maintained as part of the gtools project at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




gtools was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.




## Also see




help for
gtools


---

# gstats complete maintainer help

Maintainer help version: 0.1.0  14Mar2022

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.








## Title




- gstats hdfe —:  Absorb HDFE (residualize variables)





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



Warning: gstats hdfe is in beta; see missing features.
(To enable beta, define global GTOOLS_BETA = 1.)



## Syntax




gstats hdfe
varlist
[if] [in]
[weight]
[
, absorb(varlist)
-(gen(newvarlist)|prefix(str)|replace)-
options
]


 If none of gen(), prefix(), or replace are
specified then target=source syntax must be supplied
instead of varlist:



target_var=varname
    [target_var=varname ...]



gstats hdfe (alias gstats residualize) provides a fast way of
absorbing high-dimensional fixed effects (HDFE). It saves the number of levels
in each absorbed variable, accepts weights, and optionally takes by()
as an argument (in this case ancillary information is not saved by
default and must be accessed via mata()). Missing values in the
source and absorb variables are skipped row-size (the latter can be
optionally retained via absorbmissing).






### Specify Targets


- pre:fix(str): Generate all variables with prefix (e.g. residualized x saved to prefix_x, etc).



- gen:erate(newvarlist): List of targets; must specify one per source.



- replace: Replace variables as applicable. (If no targets are specified, this replaces the sources.)



- wild:parse: Allow rename-style syntax if target=source is specified (e.g. x*=prefix_x*).




### HDFE Options


- by(varlist): Group by variables.



- mata:save[(str)]: Save by() info (and absorb info by group) in mata object (default name is GtoolsByLevels)



- absorbmi:ssing: Treat missing absorb levels as a group instead of dropping them.



- algorithm(str): Algorithm used to absorb HDFE: CG (conjugate gradient), MAP (alternating projections), SQUAREM (squared extrapolation), IT (Irons and Tuck).



- maxiter(int): Maximum number of algorithm iterations (default 100,000). Pass . for unlimited iterations.



- tol:erance(real): Convergence tolerance (default 1e-8).



- trace:iter: Trace algorithm iterations.



- stan:dardize: Standardize variables before algorithm.




### Gtools Options


- compress: Try to compress strL by() variables to str#.



- forcestrl: Skip binary by() variables check and force gtools to read strL by() variables.



- v:erbose: Print info during function execution.



- bench[(int)]: Benchmark various steps of the plugin. Optionally specify depth level.



- hash:method(str): Hash method for by() variables (default, biject, or spooky). Intended for debugging.



- oncollision(str): Collision handling (fallback or error). Intended for debugging.











aweights, fweights, and pweights are
allowed (see 11.1.6 weight for more on the way Stata
uses weights).



## Description




gstats hdfe (alias gstats residualize) is designed as a
utility to embed in programs that require absorbing high-dimensional
fixed effects, optionally taking in weights. The number of non-missing
observations and the number of levels in each absorb variable are
returned (see stored results).



Mainly as a side-effect of being a gtools program, by() is
also allowed. In this case, the fixed effects are absorbed sepparately
for each group defined by by(). Note in this case the number of
non-missing observations and the number of absorb levels varies by group.
This is NOT saved by default. The user can optionally specify
mata:save[(str)] to save information on the by levels,
including the number of non-missing rows per level and the number of
levels per absorb variable per level.



mata:save[(str)] by default is stored in
GtoolsByLevels but the user may specify any name desired.
Run mata GtoolsByLevels.desc() for details on the stored
objects (also see stored results below).



## Examples




See the
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gstats_hdfe/index.html#examples)
for examples.



## Stored results




gstats hdfe stores the following in r():



- Macros:


- r(algorithm):  algorithm used for HDFE absorption





- Scalars:


- r(N):  number of non-missing observations


- r(J):  number of by() groups


- r(minJ):  largest by() group size


- r(maxJ):  smallest by() group size


- r(iter):  (without by()) iterations of absorption algorithm


- r(feval):  (without by()) function evaluations in absorption algorithm





- Matrices:


- r(nabsorb):  (without by()) vector with number of levels in each absorb variable





With mata:save[(str)], the following data is
stored in the mata object:

        string matrix nj
            non-missing observations in each -by- group

        string matrix njabsorb
            number of absorbed levels in each -by- group by each absorb variable

        real scalar anynum
            1: any numeric by variables; 0: all string by variables

        real scalar anychar
            1: any string by variables; 0: all numeric by variables

        string rowvector byvars
            by variable names

        real scalar kby
            number of by variables

        real scalar rowbytes
            number of bytes in one row of the internal by variable matrix

        real scalar J
            number of levels

        real matrix numx
            numeric by variables

        string matrix charx
            string by variables

        real scalar knum
            number of numeric by variables

        real scalar kchar
            number of string by variables

        real rowvector lens
            > 0: length of string by variables; <= 0: internal code for numeric variables

        real rowvector map
            map from index to numx and charx

        real rowvector charpos
            position of kth character variable

        string matrix printed
            formatted (printf-ed) variable levels (not with option -silent-)



## Missing Features




Check whether it's mathematically OK to apply SQUAREM. In general it's meant
for contractions but my understanding is that it can be applied to any
monotonically convergent algorithm.



Improve convergence criterion. Current criterion may not be sensible.



## Author



Mauricio Caceres


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gstats is maintained as part of the gtools project at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




gtools was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools, and this specific
function was inspired by Sergio Correia's reghdfe:
https: //github.com/sergiocorreia/reghdfe.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.





## References




See
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gstats_hdfe/index.html#references)
for the list of references.


## Also see




help for
gtools


---

# gstats complete maintainer help

Maintainer help version: 0.1.4  23Jan2019

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.







## Title




- gstats winsor —:  Winsorize data using C for speed





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



## Syntax




gstats winsor was written as a fast winsor2 alternative. It
additionally accepts weights.




gstats winsor
varlist
[if] [in]
[weight]
[, by(varlist) options]






### Winsor Options


- p:refix(str):  Generate targets as prefixsource (default empty).



- s:uffix(str):   Generate targets as sourcesuffix (default _w with cut and _tr with trim).



- gen:erate(namelist):  Named targets to generate; one per source.



- c:uts(#.# #.#):  Cut points (detault 1.0 and 99.0 for 1st and 99th percentiles).



- t:rim:  Trim instead of Winsorize (i.e. replace outliers with missing values).



- l:abel:  Add Winsorized/trimming note to target labels.



- replace:  Replace targets if they exist.



- nomiss:ing:  With by(), ignore groups with missing entries.




### Gtools Options


- compress: Try to compress strL to str#.



- forcestrl: Skip binary variable check and force gtools to read strL variables.



- v:erbose: Print info during function execution.



- bench[(int)]: Benchmark various steps of the plugin. Optionally specify depth level.



- hash:method(str): Hash method (default, biject, or spooky). Intended for debugging.



- oncollision(str): Collision handling (fallback or error). Intended for debugging.











aweights, fweights, iweights, and pweights are
allowed (see 11.1.6 weight for more on the way Stata
uses weights).



## Description




gstats winsor winsorizes or trims (if the trim option is specified)
the variables in varlist at particular percentiles specified by option
cuts(#1 #2). By defult, new variables will be generated with a
suffix "_w" or "_tr", respectively. The user can control this via the
suffix() option.  The replace option replaces the variables with
their winsorized or trimmed ones.


### Difference between winsorizing and trimming




Important: This section is nearly verbatim from the equivalent help
section from winsor2.



Winsorizing is not equivalent to simply excluding data, which is
a simpler procedure, called trimming or truncation.  In a trimmed
estimator, the extreme values are discarded; in a Winsorized estimator,
the extreme values are instead replaced by certain percentiles,
specified by option cuts(# #). For details, see winsor (if
installed), and trimmean (if installed).



For example, you type the following commands to get the 1st and 99th
percentiles of the variable wage, 1.930993 and 38.70926.


```stata
 . sysuse nlsw88, clear
```


```stata
 . sum wage, detail
```




By default, gstats winsor winsorizes wage at 1st and 99th percentiles,


```stata
 . gstats winsor wage, replace cuts(1 99)
```




which can be done by hand:


```stata
 . replace wage=1.930993 if wage<1.930993
```


```stata
 . replace wage=38.70926 if wage>38.70926
```





Note that, values smaller than the 1st percentile are repalced by that
value, and similarly with values above the 99th percentile. When the
-trim- option is specified, those values are set to missing instead
(which are discarded by most commands):


```stata
 . gstats winsor wage, replace cuts(1 99) trim
```




which can also be done by hand:


```stata
 . replace wage=. if wage<1.930993
```


```stata
 . replace wage=. if wage>38.70926
```




In this case, we discard values smaller than 1th percentile or greater
than 99th percentile. This is trimming.



## Examples




See the
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gstats_winsor/index.html#examples)
for examples.



## Author



Mauricio Caceres


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gstats is maintained as part of the gtools project at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




gstats winsor was written largely to mimic the functionality of the community-contributed command winsor2.



Yujun,Lian (Arlion) Department of Finance, Lingnan College, Sun Yat-Sen University.

E-mail: [arlionn@163.com](mailto:arlionn@163.com).

Blog: [http://blog.cnfol.com/arlion](http://blog.cnfol.com/arlion).

Homepage: [http://www.lingnan.sysu.edu.cn/lnshizi/faculty_vch.asp?name=lianyj](http://www.lingnan.sysu.edu.cn/lnshizi/faculty_vch.asp?name=lianyj).




This, in turn, had incorporated some code from winsor, by



Nicholas J. Cox, Durham University, U.K.

n.j.cox@durham.ac.uk



and winsorizeJ.ado, by



Judson Caskey



gstats winsor's options and this helpfile borrow heavily from winsor2.





gtools was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.




## Also see




help for
gtools;
winsor2 (if installed)


---

# gstats complete maintainer help

Maintainer help version: 0.2.1  30Jan2020

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.








## Title




- gstats summarize —:  Summary statistics by group using C for speed





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



## Syntax




gstats summarize
varlist
[if] [in]
[weight]
[, by(varlist) options]



gstats tabstat
varlist
[if] [in]
[weight]
[, by(varlist) options]



gstats tabstat and gstats summarize are fast, by-able
alternatives to tabstat and summarize, detail.
If gstats summarize is called with by() or tab, a table
in the style of tabstat is produced that inclues all the summary
statistics included by default in summarize, detail.



Note the prefixes by, rolling, statsby are
not supported. To compute a table of statistics by a group
use the option by(). With by(), gstats tab is also
faster than gcollapse.






### Tabstat Options


- by(varlist): Group statistics by variable.



- s:tatistics:(stat [...]): Report
specified statistics; default for tabstat is count, sum, mean, sd, min, max.



- col:umns(stat|var): Columns are statistics (default) or variables.



- pretty:stats: Pretty statistic header names



- labelw:idth(int): Max by variable label/value width.



- f:ormat[(%fmt)]:
Use format to display summary stats; default %9.0g




### Summarize Options


- nod:etail: Do not display the full set of statistics.



- mean:only: Calculate only the count, sum, mean, min, max.



- by(varlist): Group by variable; all stats are computed but output is in the style of tabstat.



- sep:arator(#): Draw separator line after every # variables; default is separator(5).



- tab:stat: Compute and display statistics in the style of tabstat.




### Common Options


- mata:save[(str)]: Save results in mata object (default name is GstatsOutput)



- pool:ed: Pool varlist



- noprint: Do not print



- f:ormat: Use variable's display format.



- nomiss:ing: With by(), ignore groups with missing entries.




### Gtools Options


- compress: Try to compress strL to str#.



- forcestrl: Skip binary variable check and force gtools to read strL variables.



- v:erbose: Print info during function execution.



- bench[(int)]: Benchmark various steps of the plugin. Optionally specify depth level.



- hash:method(str): Hash method (default, biject, or spooky). Intended for debugging.



- oncollision(str): Collision handling (fallback or error). Intended for debugging.











aweights, fweights, iweights, and pweights are
allowed (see 11.1.6 weight for more on the way Stata
uses weights).



## Description




gstats tab and gstats sum are mainly designed to report
statistics by group. It does not modify the data in memory,
so it is a nice alternative to gcollapse when there are few
groups and you want to compute summary stats more quickly.



gstats sum by default computes the staistics that are reported by
sum, detail and without by() it is anywhere from 5 to 40
times faster. The lower end of the speed gains are for Stata/MP, but
sum, detail is very slow in versions of Stata that are not multi-threaded.
The behavior of plain summarize and summarize, meanonly
can be recovered via options nodetail and meanonly, but Stata
is not specially slow in this case. Hence they are mainly included for
use with by(), where gstats sum is again faster.



gstats tab should be faster than tabstat even without
groups, but the speed gains are largest with even a modest number of
levels in by(). Furthermore, an arbitrary number of grouping
variables are allowed. Note that with a very large numer of groups,
tabstat's runtime seems to scale non-linearly, while gstats tab
will execute in a reasonable time.



gstata tab does not store results in r(). Rather, the option matasave
is provided to store the full set of summary statistics and the by variable
levels in a mata class object called statsOutput (the name of the object
can be changed via matasave(name)). Run mata GstatsOutput.desc()
after gstats tab, matasave for details. The following helper functions are provided:

        string scalar getf(j, l, maxlbl)
            get formatted (j, l) entry from by variables up to maxlbl characters

        real matrix getnum(j, l)
            get (j, l) numeric entry from by variables

        string matrix getchar(j, l,| raw)
            get (j, l) numeric entry from by variables; raw controls whether to null-pad entries

        real rowvector getOutputRow(j)
            get jth output row

        real colvector getOutputCol(j)
            get jth output column by position

        real matrix getOutputVar(var)
            get jth output var by name

        real matrix getOutputGroup(j)
            get jth output group



The following data is stored GstatsOutput:

        summary statistics
        ------------------

            real matrix output
                matrix with output statistics; J x kstats x kvars

            real scalar colvar
                1: columns are variables, rows are statistics; 0: the converse

            real scalar ksources
                number of variable sources (0 if pool is true)

            real scalar kstats
                number of statistics

            real matrix tabstat
                1: used tabstat; 0: used summarize

            string rowvector statvars
                variables summarized

            string rowvector statnames
                statistics computed

            real rowvector scodes
                internal code for summary statistics

            real scalar pool
                pooled source variables

        variable levels (empty if without -by()-)
        -----------------------------------------

            real scalar anyvars
                1: any by variables; 0: no by variables

            real scalar anynum
                1: any numeric by variables; 0: all string by variables

            real scalar anychar
                1: any string by variables; 0: all numeric by variables

            string rowvector byvars
                by variable names

            real scalar kby
                number of by variables

            real scalar rowbytes
                number of bytes in one row of the internal by variable matrix

            real scalar J
                number of levels

            real matrix numx
                numeric by variables

            string matrix charx
                string by variables

            real scalar knum
                number of numeric by variables

            real scalar kchar
                number of string by variables

            real rowvector lens
                > 0: length of string by variables; <= 0: internal code for numeric variables

            real rowvector map
                map from index to numx and charx

        printing options
        ----------------

            void printOutput()
                print summary table

            string matrix formatOutput()
                formatted summary table (as a string mata matrix)

            real scalar maxlbl
                max by variable label/value width

            real scalar pretty
                print pretty statistic names

            real scalar usevfmt
                use variable format for printing

            string scalar dfmt
                fallback printing format

            real scalar maxl
                maximum column length

            void readDefaults()
                reset printing defaults



## Statistics




statistics(statname [...])
   specifies the statistics to be displayed; the default with tabstat
   is equivalent to specifying statistics(mean). (stats()
   is a synonym for statistics().) Multiple statistics
   may be specified and are separated by white space, such as
   statistics(mean sd). Available statistics are




- 4statname: Definition

4

- 4me:an:  mean


- 4geomean: geometric mean (missing if var has any negative values)


- 4co:unt:  count of nonmissing observations


- 4n:  same as count


- 4nmiss:ing:  number of missing observations


- 4perc:ent:  percentage of nonmissing observations


- 4nuniq:ue:  number of unique elements


- 4su:m:  sum


- 4rawsu:m:  sum, ignoring optionally specified weights (note: zero-weighted obs are still excluded)


- 4nansu:m:  sum; returns . instead of 0 if all entries are missing


- 4rawnansu:m:  rawsum; returns . instead of 0 if all entries are missing


- 4med:ian:  median (same as p50)


- 4p#.#:  arbitrary quantiles


- 4p1:  1st percentile


- 4p2:  2nd percentile


- 4...:  3rd-49th percentiles


- 4p50:  50th percentile (same as median)


- 4...:  51st-97th percentiles


- 4p98:  98th percentile


- 4p99:  99th percentile


- 4iqr:  interquartile range = p75 - p25


- 4q:  equivalent to specifying p25 p50 p75


- 4sd:  standard deviation


- 4v:ariance:  variance


- 4cv:  coefficient of variation (sd/mean)


- 4select#:  #th smallest


- 4select-#:  #th largest


- 4mi:n:  minimum (same as select1)


- 4ma:x:  maximum (same as select-1)


- 4r:ange:  range = max - min


- 4first:  first value


- 4last:  last value


- 4firstnm:  first nonmissing value


- 4lastnm:  last nonmissing value


- 4sem:ean:  standard error of mean (sd/sqrt(n))


- 4seb:inomial:  standard error of the mean, binomial (sqrt(p(1-p)/n))


- 4sep:oisson:  standard error of the mean, Poisson (sqrt(mean))


- 4sk:ewness:  skewness


- 4k:urtosis:  kurtosis


- 4gini: Gini coefficient (negative truncated to 0)


- 4gini|dropneg: Gini coefficient (negative values dropped)


- 4gini|keepneg: Gini coefficient (negative values kept; the user is responsible for the interpretation of the Gini in this case)

4




## Examples




See the
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gstats_summarize/index.html#examples)
for examples.



## Author



Mauricio Caceres


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gstats is maintained as part of the gtools project at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




gtools was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.




## Also see




help for
summarize;
tabstat;
gtools


---

# gstats complete maintainer help

Maintainer help version: 0.2.1  30Jan2020

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.








## Title




- gstats transform —:  Apply statistical functions by group using C for speed





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



## Syntax




gstats transform
clist
[if] [in]
[weight]
[,
options]


where clist is either



[(stat)]
varlist
[ [(stat)] ... ]




[(stat)] target_var=varname
        [target_var=varname ...]
        [ [(stat)] ...]


or any combination of the varlist or target_var forms, and
stat is one of




- demean: subtract the mean (default)


- demedian: subtract the median


- normalize: (x - mean) / sd


- standardize: same as normalize


- moving stat [# #]: moving statistic stat; # specify the relative bounds (see below)


- range stat [...]: range statistic stat for observations within specified interval (see below)


- cumsum [+/- [varname]]: cumulative sum, optionally ascending (+) or descending (-) (optionally +/- by varname)


- shift [[+/-]#]: lags (-#) and leads (+#); unsigned numbers are positive (i.e. leads)


- rank: rank observations; use option ties() to specify how ties are handled




 Some of the above transformations allow specifying various
options as part of their name. This is done to allow the user to request
various versions of the same transformation. However, this is not
required.  The user can specify a global option that will be used for
all the corresponding transformations:



- moving stat: window()


- range stat: interval()


- cumsum: cumby()


- shift: shiftby()




 Note gstats moving and gstats range are aliases
for gstats transform. In this case all the requested statistics
are assumed to be moving or range statistics, respectively. Finally,
moving and range may be combined with any one of the
folloing:




- mean: means (default)


- geomean: geometric mean (missing if var has any negative values)


- count: number of nonmissing observations


- nmissing: number of missing observations


- sum: sums


- rawsum: sums, ignoring optionally specified weights (note: zero-weighted obs are still excluded)


- nansum: sum; returns . instead of 0 if all entries are missing


- rawnansum: rawsum; returns . instead of 0 if all entries are missing


- median: medians (same as p50)


- p#.#: arbitrary quantiles


- p1: 1st percentile


- p2: 2nd percentile


- ...: 3rd—49th percentiles


- p50: 50th percentile (same as median)


- ...: 51st—97th percentiles


- p98: 98th percentile


- p99: 99th percentile


- iqr: interquartile range


- sd: standard deviation


- var:iance: variance


- cv: coefficient of variation (sd/mean)


- select#: #th smallest


- select-#: #th largest


- rawselect#: #th smallest, ignoring weights


- rawselect-#: #th largest, ignoring weights


- max: maximums


- min: minimums


- range: range = max - min


- first: first value


- last: last value


- firstnm: first nonmissing value


- lastnm: last nonmissing value


- sem:ean: standard error of the mean (sd/sqrt(n))


- seb:inomial: standard error of the mean, binomial (sqrt(p(1-p)/n)) (missing if source not 0, 1)


- sep:oisson: standard error of the mean, Poisson (sqrt(mean / n)) (result rounded to nearest integer)


- skewness: Skewness


- kurtosis: Kurtosis


- gini: Gini coefficient (negative truncated to 0)


- gini dropneg: Gini coefficient (negative values dropped)


- gini keepneg: Gini coefficient (negative values kept; the user is responsible for the interpretation of the Gini in this case)





### Interval format




range stat must specify an interval or use the interval(...)
option. The interval must be of the form



#[statlow] #[stathigh] [var]



This computes, for each observation i, the summary statistic stat
among all observations j of the source variable such that



var[i] + # * statlow(var) <= var[j] <= var[i] + # * stathigh(var)



if var is not specified, it is taken to be the source variable itself.
statlow and stathigh are summary statistics computed based on
every value of var. If they are not specified, then # is used by
itself to construct the bounds, but # may be missing (.) to mean no
upper or lower bound. For example, given some variable x with N observations,
we have


            Input      ->  Meaning
            -2 2 time  ->  j: time[i] - 2 <= time[j] <= time[i] + 2
                           i.e. stat within a 2-period time window

            -sd sd     ->  j: x[i] - sd(x) <= x[j] <= x[i] + sd(x)
                           i.e. stat for obs within a standard dev



### Moving window format



moving stat must specify a relative range or use the window(# #)
option. The relative range uses a window defined by the observations. This
would be equivalent to computing time series rolling window statistics
using the time variable set to _n. For example, given some variable
x with N observations, we have


            Input  ->  Range
            -3  3  ->  x[i - 3] to x[i + 3]
            -3  .  ->  x[i - 3] to x[N]
```stata
             .  3  ->  x[1]     to x[i + 3]
```
            -3 -1  ->  x[i - 3] to x[i - 1]
            -3  0  ->  x[i - 3] to x[i]
             5 10  ->  x[i + 5] to x[i + 10]


and so on. If the observation is outside of the admisible range
(e.g. -10 10 but i = 5) the output is set to missing. If you
don't specify a range in (moving stat) then the range in window(# #)
is used.



## Options







### Common Options


- by(varlist): Group statistics by variable.



- replace: Allow replacing existing variables.



- wild:parse: Allow rename-style syntax in target naming.



- labelf:ormat: Custom label engine: (#stat#) #sourcelabel# is the default.



- labelp:rogram(str): Program to parse labelformat (see examples).



- auto:rename[()]: Automatically name targets based on requested stats. Default is #source#_#stat#.



- nogreedy: Use slower but memory-efficient (non-greedy) algorithm.



- type:s(str): Override variable types for targets (use with caution).




### Command Options


- window(lower upper): With moving stat. Relative observation range for moving statistics (if not specified in call). E.g. window(-3 1) means from 3 lag to 1 lead. window(. #) and window(# .) mean from the start and through the end.



- interval(#[stat] #[stat] [var]): With range stat. Interval for range statistics that don't specify their own interval.



- cumby([+/- [varname]]): With cumsum. Sort options for cumsum variables that don't specify their own.



- shiftby([+/-]#): With shift. Lag or lead when to use shift is requested without specifying a number.



- ties(str): With rank. How to break ties for rank. d:efault assigns the average rank; u:nique breaks ties arbitrarily; stableunique breaks ties using the order values appear in the data; f:ield counts the number of values greater than; t:rack counts the number of values less than.




### Gtools


- compress: Try to compress strL to str#.



- forcestrl: Skip binary variable check and force gtools to read strL variables.



- v:erbose: Print info during function execution.



- bench[()]: Benchmark various steps of the plugin. Optionally specify depth level.



- hash:method(str): Hash method (default, biject, or spooky). Intended for debugging.



- oncollision(str): Collision handling (fallback or error). Intended for debugging.











aweights, fweights, iweights, and pweights
are allowed.





## Description




gstats transform applies various statistical transformations
to input data. It is similar to gcollapse, merge or gegen but
for individual-level transformations. That is, gcollapse takes an
input variable and procudes a single statistic; gstats transform
applies a function to each element of the input variable. For example,
subtracting the mean.



Every function available to gstats transform can be called via
gegen. Further, note that while not every function will use weights
in their computations (e.g. shift ignores weights in the actual
transformation), if weights are specified they will be used to flag
acceptable observations (i.e. missing, zero, and, except for iweights,
negative observations get excluded).



## Examples




See the
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gstats_transform/index.html#examples)
for examples.



## Author



Mauricio Caceres


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gstats is maintained as part of the gtools project at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




gtools was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.




## Also see




help for
gegen;
gcollapse;
gtools
