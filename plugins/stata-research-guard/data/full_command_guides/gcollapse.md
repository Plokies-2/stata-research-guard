# gcollapse complete maintainer help

Maintainer help version: 1.2.1 30Jan2020

Notation: bracketed prefixes such as a[bsorb] preserve minimum abbreviations from the source.









## Title




- gcollapse —: Efficiently
make dataset of summary statistics using C.





Important: Please run gtools, upgrade to update gtools to
the latest stable version.



Note: Stata 17+, MP version, introduced significant speed improvements
to the native collapse command, specially with many cores. Depending
on the collapse, it can be up to twice as fast than gcollapse; however,
it remained slower for some use cases. YMMV.



## Syntax




This is a fast option to Stata's collapse (9-300 times faster
in IC and 4-120 times faster in MP), with several additions.



gcollapse
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




- mean: means (default)


- geomean: geometric mean (missing if var has any negative values)


- count: number of nonmissing observations


- nmissing: number of missing observations


- percent: percentage of nonmissing observations


- nunique: number of unique elements


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








### Options


- by(varlist): groups over which stat is to be calculated. Prepend "-" to invert final sort order.



- cw: Drop ocase-wise bservations where sources are missing.



- fast: do not preserve and restore the original dataset;
saves speed but leaves the data in an unusable state shall the
user press Break




### Extras


- rawstat(varlist): Sequence of target names for which to ignore weights.



- merge: Merge statistics back to original data, replacing if applicable.



- wild:parse: Allow rename-style syntax in target naming



- replace: Allow replacing existing variables with output with merge.



- freq(varname): Include frequency count with observations per group in freq.



- labelf:ormat: Custom label engine: (#stat#) #sourcelabel# is the default.



- labelp:rogram(str): Program to parse labelformat (see examples).



- unsorted: Do not sort resulting dataset. Saves speed.




### Switches


- forceio: Use disk temp drive for writing/reading collapsed data.



- forcemem: Use memory for writing/reading collapsed data.



- double: Generate all targets as doubles.



- sumcheck: Check whether byte, int, or long sum will overflow.




### Gtools


- compress: Try to compress strL to str#.



- forcestrl: Skip binary variable check and force gtools to read strL variables.



- v:erbose: Print info during function execution.



- bench[()]: Benchmark various steps of the plugin. Optionally specify depth level.



- hash:method(str): Hash method (default, biject, or spooky). Intended for debugging.



- oncollision(str): Collision handling (fallback or error). Intended for debugging.











aweights, fweights, iweights, and pweights
are allowed and mimic collapse; see weight and
Weights (collapse). pweights may not be used
with sd, variance, cv, semean, sebinomial, or sepoisson.
iweights may not be used with semean, sebinomial, or
sepoisson. aweights may not be used with sebinomial or
sepoisson.




## Description




gcollapse converts the dataset in memory into a dataset of means,
sums, medians, etc. clist can refer only to numeric variables.



first, last, firstnm, lastnm for string variables are not supported.



## Options



### Options




by(varlist) specifies the groups over which the means, etc., are
to be calculated. It can contain any mix of string or numeric variables.



cw specifies casewise deletion.  If cw is not specified, all
possible observations are used for each calculated statistic.



fast specifies that gcollapse not restore the original dataset
should the user press Break.


### Extras




rawstat(varlist)Sequence of target names for which to ignore
weights, except observations with a weight of zero or missing, which are
excluded. This is a generalization of rawsum, but it is specified
for each individual target (if no target is specified, the source
variable name is what we call target).



merge merges the collapsed data back to the original data set.
Note that if you want to replace the source variable(s) then you need
to specify replace.



wildparse specifies that the function call should be parsed
assuming targets are named using rename-stle syntax. For example,
gcollapse (sum) s_x* = x*, wildparse



replace Replace allows replacing existing variables with merge.



freq(varname) stores the group frequency count in freq. It
differs from count because it merely stores the number of occurrences of
the group in the data, rather than the non-missing count. Hence it is
equivalent to summing a dummy variable equal to 1 everywhere.



freq(varname) Specifies that the row count of each group be stored
in freq after the collapse.



labelformat(str) Specifies the label format of the output. #stat#
is replaced with the statistic: #Stat# for titlecase, #STAT#
for uppercase, #stat:pretty# for a custom replacement; #sourcelabel#
for the source label and #sourcelabel:start:nchars# to extract a substring
from the source label. The default is (#stat#) #sourcelabel#. #stat#
palceholders in the source label are also replaced.



labelprogram(str) Specifies the program to use with #stat:pretty#.
This is an rclass that must set prettystat as a return value. The
program must specify a value for each summary stat or return #default# to
use the default engine. The programm is passed the requested stat by gcollapse.



unsorted Do not sort resulting data set. Saves speed.


### Switches




forceio By default, when there are more than 3 additional targets
(i.e. the number of targets is greater than the number of source
variables plus 3) the function tries to be smart about whether adding
empty variables in Stata before the collapse is faster or slower than
collapsing the data to disk and reading them back after keeping only the
first J observations (assuming J is the number of groups). For J small
relative to N, collapsing to disk will be faster. This check involves
some overhead, however, so if J is known to be small forceio will
be faster.



forcemem The opposite of forceio. The check for whether to use
memory or disk check involves some overhead, so if J is known to
be large forcemem will be faster.



double stores data in double precision.



sumcheck Check whether byte, int, or long sum will overflow.  By
default sum targets are double; in this case, sum targets check the
smallest integer type that will be suitable and only assigns a double if
the sum would overflow.


### Gtools




compress Try to compress strL to str#. The Stata Plugin Interface
has only limited support for strL variables. In Stata 13 and earlier
(version 2.0) there is no support, and in Stata 14 and later (version
3.0) there is read-only support. The user can try to compress strL
variables using this option.



forcestrl Skip binary variable check and force gtools to read strL
variables (14 and above only). Gtools gives incorrect results when there is binary data in strL variables.
This option was included because on some windows systems Stata detects
binary data even when there is none. Only use this option if you are
sure you do not have binary data in your strL variables.



verbose prints some useful debugging info to the console.



bench:mark and bench:marklevel(int) print how long in
seconds various parts of the program take to execute. The user can also
pass bench(int) for finer control. bench(1) is the same
as benchmark but bench(2) and bench(3) additionally print
benchmarks for internal plugin steps.



hashmethod(str) Hash method to use. default automagically
chooses the algorithm. biject tries to biject the inputs into the
natural numbers. spooky hashes the data and then uses the hash.



oncollision(str) How to handle collisions. A collision should never
happen but just in case it does gtools will try to use native commands.
The user can specify it throw an error instead by passing oncollision(error).



## Out of memory




(See also Stata's own discussion in help memory.)



There are many reasons for why an OS may run out of memory. The best-case
scenario is that your system is running some other memory-intensive program.
This is specially likely if you are running your program on a server, where
memory is shared across all users. In this case, you should attempt to re-run
gcollapse once other memory-intensive programs finish.



If no memory-intensive programs were running concurrently, the second best-case
scenario is that your user has a memory cap that your programs can use. Again,
this is specially likely on a server, and even more likely on a computing grid.
If you are on a grid, see if you can increase the amount of memory your programs
can use (there is typically a setting for this). If your cap was set by a system
administrator, consider contacting them and asking for a higher memory cap.



If you have no memory cap imposed on your user, the likely scenario is that
your system cannot allocate enough memory for gcollapse. At this point
you have two options: One option is to try fcollapse or collapse,
which are slower but using either should require a trivial one-letter change
to the code; another option is to re-write the code to collapse the data in
segments (the easiest way to do this would be to collapse a portion of all
variables at a time and perform a series of 1:1 merges at the end).



Replacing gcollapse with fcollapse or plain collapse is an
option because gcollapse often uses more memory. This is a consequence
of Stata's inability to create variables via C plugins. This forces
gcollapse to create variables before collapsing, meaning that if there
are J groups and N observations, gcollapse uses N - J
more rows than the ideal collapse program, per variable.



gcollapse was written with this limitation in mind and tries to save
memory in various ways (for example, if J is small relative to N,
gcollapse will use free disk space instead of memory, which not only saves
memory but is also much faster). Nevertheless, it is possible that your system
will allocate enough memory for fcollapse or collapse in situations
where it cannot allocate enough memory for gcollapse.



## Examples




See collapse examples or the
[online documentation](http://gtools.readthedocs.io/en/latest/usage/gcollapse/index.html#examples)
for examples.



## Stored results




gcollapse stores the following in r():



- Scalars:


- r(N):  number of non-missing observations


- r(J):  number of groups


- r(minJ):  largest group size


- r(maxJ):  smallest group size






## Author



Mauricio Caceres Bravo


[mauricio.caceres.bravo@gmail.com](mailto:mauricio.caceres.bravo@gmail.com)


[mcaceresb.github.io](https://mcaceresb.github.io)



## Website



gcollapse is maintained as part of gtools at [github.com/mcaceresb/stata-gtools](https://github.com/mcaceresb/stata-gtools)




## Acknowledgment




This help file was based on StataCorp's own help file
for collapse and Sergio Correia's help file for fcollapse.





This project was largely inspired by Sergio Correia's ftools:
https://github.com/sergiocorreia/ftools.





The OSX version of gtools was implemented with invaluable help from @fbelotti;
see https://github.com/mcaceresb/stata-gtools/issues/11.




## Also see




help for
gcontract,
gtoplevelsof,
gtools;
fcollapse (if installed),
ftools (if installed)
