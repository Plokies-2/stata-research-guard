# fmerge complete maintainer help

Maintainer help version: 2.10.0 3apr2017

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

- fmerge — Merge datasets

fmerge is a wrapper for join,
supporting m:1 and 1:1 joins.

The syntax is identical to merge, except for the extra option
verbose, that will show debug information and the underlying join
command.

## Syntax

One-to-one merge on specified key variables

fmer[ge] 1:1 varlist
using filename [, options]

Many-to-one merge on specified key variables

fmer[ge] m:1 varlist
using filename [, options]

### Options

- keepus[ing](varlist): variables to keep from using data;
default is all

- gen[erate](newvar): name of new variable to mark merge
results; default is _merge

- nogen[erate]: do not create _merge variable

- nol[abel]: do not copy value-label definitions from using

- nonote[s]: do not copy notes from using

- update: update missing values of same-named variables in master
with values from using (not allowed)

- replace: replace all values of same-named variables in master
with nonmissing values from using (requires update) (not allowed)

- norep[ort]: do not display match result summary table

- force: allow string/numeric variable type mismatch without error (ignored)

- verbose: show debug information and the join command used (new)

### Results

- assert(results): specify required match results

- keep(results): specify which match results to keep

- sorted: do not sort; datasets already sorted (ignored)

## Author

Sergio Correia

Board of Governors of the Federal Reserve System, USA

[sergio.correia@gmail.com](mailto:sergio.correia@gmail.com)

## More Information

To report bugs, contribute, ask for help, etc. please see the project URL in Github:

[https://github.com/sergiocorreia/ftools](https://github.com/sergiocorreia/ftools)
