# esttab — complete maintainer help

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

help esttab

## Title

esttab
Display formatted regression table

## Table of contents

Syntax
Description
Options
Examples
Backmatter

## Syntax

esttab [ namelist ] [ using filename ] [ ,
options ]

where namelist is a name, a list of names, or _all. The
* and ? wildcards are allowed in namelist. A name may also be .,
meaning the current (active) estimates.

options | description

Main
b(fmt) |
specify format for point estimates
beta[(fmt)] |
display beta coefficients instead of point est's
main(name [fmt]) |
display contents of e(name) instead of point e's
t(fmt) |
specify format for t-statistics
abs |
use absolute value of t-statistics
not |
suppress t-statistics
z[(fmt)] |
display z-statistics (affects label only)
se[(fmt)] |
display standard errors instead of t-statistics
p[(fmt)] |
display p-values instead of t-statistics
ci[(fmt)] |
display confidence intervals instead of t-stat's
aux(name [fmt]) |
display contents of e(name) instead of t-stat's
[no]con:stant |
do not/do report the intercept

Significance stars
[no]star[(list)] |
do not/do report significance stars
staraux |
attach stars to t-stat's instead of point est's

Summary statistics
r2|ar2|pr2[(fmt)] |
display (adjusted, pseudo) R-squared
aic|bic[(fmt)] |
display Akaike's or Schwarz's information crit.
sca:lars:(list) |
display any other scalars contained in e()
sfmt(fmt [...]) |
set format(s) for scalars()
noobs |
do not display the number of observations
obslast |
place the number of observations last

Layout
wide |
place point est's and t-stat's beside one another
one:cell |
combine point est's and t-stat's in a single cell
[no]pa:rentheses |
do not/do print parentheses around t-statistics
br:ackets |
use brackets instead of parentheses
[no]gap:s |
suppress/add vertical spacing
[no]li:nes |
suppress/add horizontal lines
noeqli:nes |
suppress lines between equations
compress |
reduce horizontal spacing
plain |
produce a minimally formatted table

Labeling
l:abel |
make use of variable labels
interact:ion:(str) |
specify interaction operator
ti:tle:(string) |
specify a title for the table
mti:tles[(list)] |
specify model titles to appear in table header
nomti:tles |
disable model titles
[no]dep:vars |
do not/do use dependent variables as model titles
[no]num:bers |
do not/do print model numbers in table header
coef:labels:(list) |
specify labels for coefficients
[no]note:s |
suppress/add notes in the table footer
addn:otes:(list) |
add lines at the end of the table

Document format
smcl | fix:ed | tab | csv | sc:sv | rtf | htm:l | html5 | tex | bookt:abs | md
|
set the document format (smcl is the default)
f:ragment |
suppress table opening and closing (LaTeX, HTML)
[no]float |
whether to use a float environment or not (LaTeX)
page[(string)] |
add page opening and closing (LaTeX, HTML)
stand:alone[(opts)] |
use class standalone rather than article (LaTeX)
align:ment(string) |
set alignment within columns (LaTeX, HTML, RTF)
width(string) |
set width of table (LaTeX, html)
attr:ibutes(string) |
set table attributes (html5)
long:table |
multi-page table (LaTeX)
fonttbl(string) |
set custom font table (RTF)
nortfencode |
do not escape non-ASCII characters (RTF)

Output
r:eplace |
overwrite an existing file
a:ppend |
append the output to an existing file
ty:pe |
force printing the table in the results window
n:oisily |
display the executed estout command

Advanced
d:rop:(list) |
drop individual coefficients
noomit:ted |
drop omitted coefficients
nobase:levels |
drop base levels of factor variables
k:eep:(list) |
keep individual coefficients
o:rder:(list) |
change order of coefficients
eq:uations:(list) |
match the models' equations
eform |
report exponentiated coefficients
uns:tack |
place multiple equations in separate columns
estout_options |
any other estout options

## Description

esttab is a wrapper for estout. It produces a
pretty-looking publication-style regression table from stored
estimates without much typing. The compiled table is displayed in the
Stata results window or, optionally, written to a text file specified
by using filename. If filename is specified without
suffix, a default suffix is added depending on the specified document
format (".smcl" for smcl, ".txt" for fixed and tab, ".csv" for csv
and scsv, ".rtf" for rtf, ".html" for html,
".tex" for tex and booktabs, ".md" for md).

namelist provides the names of the stored estimation sets to be
tabulated. You may use the * and ? wildcards in
namelist. If namelist is omitted, esttab tabulates the
estimation sets stored by eststo (see help eststo)
or, if no such estimates are present, the currently active
estimates (i.e. the model fit last).

See help estimates for information about storing estimation
results. An alternative to the estimates store command is
provided by eststo.

esttab can also be used to tabulate a Stata matrix applying syntax
esttab m:atrix:(name), where name
is the name of the matrix. Furthermore, an e()-matrix or r()-matrix
can be tabulated specifying esttab e(name) or
esttab r(name). Most options under the headings
'Main', 'Significance stars', and 'Summary statistics' are irrelevant
in this case. See help estout for further details on tabulating matrices.

## Options

### Main

b(fmt) sets the numerical display format
for the point estimates. The default format is a3. (See
Numerical formats below for details on available
formats.)

beta[(fmt)] requests that
standardized beta coefficients be displayed in place of the raw point
estimates and, optionally, sets the display format (the default is to
print three decimal places). Note that beta causes the
intercept to be dropped from the table (unless constant is
specified).

main(name [fmt]) requests that
the statistics stored in e(name) be displayed in
place of the point estimates and, optionally, sets the display format
(the default is to use the display format for point estimates). For
example, e(name) may contain statistics added by
estadd (see help estadd).

t(fmt) sets the display format for
t-statistics. The default is to display two decimal places.

abs causes absolute values of t-statistics to be reported.

not suppresses the printing of t-statistics.

z[(fmt)] requests that
z-statistics be displayed. z-statistics are the same as t-statistics. Hence,
specifying z does not change the table contents, it only changes the
label.

se[(fmt)] requests that
standard errors be displayed in place of t-statistics and,
optionally, sets the display format (the default is to use the
display format for point estimates).

p[(fmt)] requests that
p-values be displayed in place of t-statistics and, optionally, sets
the display format (the default is to print three decimal places)

ci[(fmt)] requests that
confidence intervals be displayed in place of t-statistics and,
optionally, sets the display format (the default is to use the
display format for point estimates). level(#)
assigns the confidence level, in percent. The default is
level(95) or as set by set level.

aux(name [fmt]) requests that
the statistics stored in e(name) be displayed in
place of t-statistics and, optionally, sets the display format (the
default is to use the display format for point estimates). For
example, e(name) may contain statistics added by
estadd (see help estadd, if installed).

noconstant causes the intercept be dropped from the table.
Specify constant to include the constant in situations where it
is dropped by default.

### Significance stars

star[(symbol level [...])] causes
stars denoting the significance of the coefficients to be printed
next to the point estimates. This is the default. Type nostar
to suppress the stars. The default symbols and thresholds are:
* for p<.05, ** for p<.01, and *** for p<.001.
Alternatively, for example, type star(+ 0.10 * 0.05) to
set the following thresholds: + for p<.10 and * for
p<.05. Note that the thresholds must lie in the (0,1] interval and
must be specified in descending order.

staraux causes the significance stars be printed next to the
t-statistics (or standard errors, etc.) instead of the point estimates.

### Summary statistics

r2[(fmt)],
ar2[(fmt)], and
pr2[(fmt)]
include the R-squared, the adjusted R-squared, and the
pseudo-R-squared in the table footer and, optionally, set the
corresponding display formats (the default is to display three
decimal places).

aic[(fmt)] and
bic[(fmt)]
include Akaike's and Schwarz's information criterion in the table
footer and, optionally, set the corresponding display formats (the
default is to use the display format for point estimates).

scalars(list) may be used to add other
e()-scalars to the table footer (type ereturn list to
display a list of available e()-scalars after fitting a model;
see help ereturn). For example, scalars(df_m) would
report the model degrees of freedom for each model. list may be
a simple list of names of e()-scalars, e.g.

. esttab, scalars(ll_0 ll chi2)

or, alternatively, a list of quoted name-label pairs, e.g.

. esttab, scalars("ll Log lik." "chi2 Chi-squared")

sfmt(fmt [...]) sets the
display format(s) for the statistics specified in scalars()
(the default is to use the display format for point estimates). If
sfmt() contains less elements than scalars(), the last
specified format is used for the remaining scalars. That is, only one
format needs to be specified if the same format be used for all
scalars.

noobs suppresses displaying information on the number of
observations. The default is to report the number of observations for
each model in the table footer.

obslast displays the number of observations in the last row of
the table footer. The default is to use the first row.

### Layout

wide causes point estimates and t-statistics (or standard errors,
etc.) to be printed beside one another instead of beneath one another.

onecell causes point estimates and t-statistics (or standard errors,
etc.) to be combined in a single table cell. This option is useful primarily
in rtf or html mode. In these modes a line break is
inserted between the two statistics. The benefit from using onecell
in rtf or html mode is that long coefficients labels do not
derange the table layout. The default for other modes is to insert
a blank between the statistics. Use estout's
incelldelimiter() option to change this.

parentheses encloses t-statistics (or standard errors, etc.) in
parentheses. This is the default. Specify noparentheses to
suppress the parentheses.

brackets uses square brackets, [], instead of parentheses. Note
that brackets are the default for confidence intervals.

gaps adds empty rows (or, more generally, additional vertical
space) between coefficients to increase readability (empty rows are
also inserted between the table's header, body, and footer, unless
lines is activated). This is the default unless wide or
not is specified. Type nogaps to suppress the extra
spacing. Gaps are always suppressed if the output
format html5.

lines adds horizontal lines to the table separating the table's
header, body, and footer and, in the case of multiple
equation models, the equations. This is the default. Specify nolines
to suppress the lines. Lines are always suppressed if the output
format is tab, csv, or html5.

noeqlines suppresses the horizontal lines between equations
in the case of multiple equation models.

compress reduces the amount of horizontal spacing (so that more
models fit on screen without line breaking). The option has no effect
in the tab and csv modes. Furthermore, note that in the
TeX and HTML modes the compress option only changes the
arrangement the table's code, but not the look of the compiled
end-product. In rtf, however, compress changes the look
of the formatted table.

plain produces a minimally formatted table. It is a shorthand
to specifying nostar, nodepvars, nonumbers,
noparentheses, nogaps, nolines and nonotes
and setting all formats to %9.0g. Note that the disabled
options can be switched on again. For example, type

. esttab, plain star

to produce a plain table including significance stars.

### Labeling

label specifies that variable labels be used instead of
variable names (and estimation set titles be used instead of
estimation set names). Furthermore, label prints "Constant"
instead of "_cons".

interaction(string) specifies the string to be used
as delimiter for interaction terms (only relevant in Stata 11 or newer). The
default is interaction(" # "). For tex and booktabs the
default is interaction(" $\times$ ").

title(string) may be used to provide a title for the
table. If specified, string is printed at the top of the table.
Note that specifying a title causes the table to be set up as a
floating object in LaTeX mode (unless the nofloat option
is specified). You may want to set a label for
referencing in this case. For example, if you type
title(...\label{tab1}), then "\ref" could be used in the
LaTeX document to point to the table.

mtitles, without argument, specifies that for each model the title
(or, if empty, the name) of the stored estimation set be printed as the model's
title in the table header. If mtitles is omitted, the default is to
use name or label of the dependent variable as the model's title (see the
depvar option). Alternatively, use mtitles(list)
specifies a list of model titles. Enclose the titles
in double quotes if they contain spaces,
e.g. mtitles("Model 1" "Model 2").

nomtitles suppresses printing of model titles.

depvars prints the name (or label) of the (first) dependent
variable of a model as the model's title in the table header. This is
the default. Specify nodepvars to use the names of
the stored estimation sets as titles.

numbers includes a row containing consecutive model numbers in
the table header. This is the default. Specify nonumbers to
suppress printing the model numbers.

coeflabels(name label [...]) specifies labels
for the coefficients. Specify names and labels in pairs and, if
necessary, enclose labels in double quotes,
e.g. coeflabels(mpg Milage rep78 "Repair Record").

notes prints notes at the end of the table explaining the
significance symbols and the type of displayed statistics. This is
the default. Specify nonotes to suppress the notes.

addnotes(list) may be used to add further lines of
text at the bottom of the table. Lines containing blanks must be
enclosed in double quotes,
e.g. addnotes("Line 1" "Line 2").

### Document format

smcl, fixed, tab, csv, scsv, rtf,
html, html5, tex, booktabs, and md choose the table's basic
output format. The default format is smcl unless
using is specified, in which case the default format
depends on the filename's suffix (smcl for ".smcl", csv
for ".csv", rtf for ".rtf",
html for ".htm" or ".html", tex for ".tex", md for ".md" or ".mmd",
and fixed for all other filenames). To override the default behavior, specify one of the
following format options.

smcl produces a SMCL formatted table to be displayed in the
Stata results window or the Stata viewer.

fixed produces a fixed-format ASCII table. This is suitable,
for example, if the table be displayed in a text editor.

tab produces a tab-delimited ASCII table.

csv produces a CSV (Comma Separated Value
format) table for use with Microsoft Excel. Delimiter is a comma. In
order to prevent Excel from interpreting the contents of the table
cells, they are enclosed double quotes preceded by an equal sign
(i.e. ="..."). However, if the plain option is specified, the
table cells are enclosed in double quotes without the leading equal
sign. The first method is appropriate if you want to preserve the
table's formatting. The second method is appropriate if you want to
use the table's contents for further computations in Excel.

scsv is a variant on the CSV format that uses a semicolon as
the delimiter. This is appropriate for some non-English versions of
Excel (e.g. the German version).

rtf produces a Rich Text Format table for use with word
processors.

html produces a simple HTML formatted table.

html5 produces a HTML5 formatted table. The table
header is wrapped in <thead>; each equation in the table body is wrapped in
<tbody>; the section containing the summary statistics is wrapped in
<tbody>; the notes at the bottom of the table are wrapped in
<tfoot>. Options gaps, lines, and width() have no
effect; use CSS for styling.

tex produces a LaTeX formatted table.

booktabs produces a LaTeX formatted table for use with LaTeX's
booktabs package.

md produces a Markdown formatted table. Native
[Markdown](http://daringfireball.net/projects/markdown/) has no specific
support for tables, but for example [GitHub Flavored Markdown](http://github.github.com/gfm/)
and [MultiMarkdown](http://fletcherpenney.net/multimarkdown/) do. Option mmd
can be used as a synonym for md (the default file suffix will be ".mmd" in this case).

fragment causes the table's opening and closing specifications
to be suppressed. This is relevant primarily in LaTeX and HTML mode.

float causes the table to be set up as a floating object in LaTeX mode
(table environment). Providing a title() implies float. Specify
nofloat to omit the float environment in this case (this is useful, e.g.,
for LyX users).

page[(string)] adds opening and closing code
to define a whole LaTeX or HTML document. The default is to produce a
raw table that can then be included into an existing LaTeX or HTML
document. In LaTeX, specifying string in parentheses causes
\usepackage{c -(}string{c )-} to be added to the
document preamble (note that the booktabs package
is automatically loaded if booktabs is specified). In HTML, string
will be copied as is into the document header.

standalone[(opts)] implies page
and uses \documentclass[opts]{c -(}standlone{c )-}
instead of \documentclass{c -(}article{c )-} in the LaTeX header (see
[http://ctan.org/pkg/standalone](http://ctan.org/pkg/standalone)). The default for opts
is varwidth; type standalone("") to suppress [opts].

alignment(string) may be used to specify the
alignment of the models' columns in LaTeX, HTML, or RTF mode.

In LaTeX mode string should be a LaTeX column specifier. The
default is to center the columns. To produce right-aligned columns,
for example, type alignment(r). If the table contains multiple
columns per model/equation, the alignment specification should define
all columns. For example, if the wide option is specified, you
could type alignment(cr) to, say, center the point estimates
and right-align the t-statistics. Note that more sophisticated column
definitions are often needed to produce appealing results. In
particular, LaTeX's dcolumn package proves useful to align
columns on the decimal point.

In HTML mode string should be a HTML alignment specifier. The
default is to omit alignment specification, which results in left
aligned columns. To center the columns in HTML, for example, specify
alignment(center). Other than in LaTeX mode, the same alignment
is used for all columns if the table contains multiple columns per
model/equation in the HTML mode.

In RTF mode string should be one of l, c, r,
and j. The default is to center the columns. To produce
right-aligned columns, for example, type alignment(r). The same
alignment is used for all columns if the table contains multiple
columns per model/equation in the RTF mode.

Note that alignment() does not change the alignment of the
variable names/labels in the left stub of the table. They are always
left-aligned.

width(string) sets the overall width of the table in
LaTeX or html. string should be LaTeX or HTML literal. For
example, specify width(\hsize) in LaTeX or width(100%) in
HTML to span the whole page. The table columns will spread regularly
over the specified width. width() has no effect if the output format
is html5. Note that in RTF mode estout's
varwidth() and modelwidth() options may be used to change
the width of the table columns.

attributes(string) includes string in the
table's start tag if the output format is html5. For example, type
attributes(class="esttab") to set the start tag to
<table class="esttab">.

longtable causes the longtable environment to be used in
LaTeX. Use longtable for tables that are too
long to fit on a single page. longtable cannot be combined
with width(). Make sure to load the longtable package
in the LaTeX document, i.e. include \usepackage{longtable} in the
document's preamble.

fonttbl(string) defines a custom font table in RTF. The
default is "\f0\fnil Times New Roman;". For example, typing

. esttab using example.rtf, ti("\f1 The Auto Data") ///
fonttbl(\f0\fnil Times New Roman;\f1\fnil Arial;)

would add a title in Arial.

nortfencode prevents the translation of non-ASCII characters in RTF
mode (a translated character is encoded as \u#?, where
# is the base 10 character code). This is only relevant in Stata 14 or newer;
no translation is applied in Stata 13 or older.

### Output

replace permits esttab to overwrite an existing file.

append specifies that the output be appended to an existing
file. It may be used even if the file does not yet exist. Specifying
append together with page in TeX or HTML mode causes the
new table to be inserted at the end of the body of an existing
document (esttab seeks a line reading "\end" or
"</body>", respectively, and starts appending from there;
contents after this line will be overwritten). In RTF mode, existing
documents are assumed to end with a line containing a single "}".

type specifies that the assembled table be printed in the
results window and the log file. This is the default unless
using is specified.

noisily displays the executed estout command.

### Advanced

drop(droplist) identifies the coefficients to be
dropped from the table. A droplist comprises one or more
specifications, separated by white space. A specification can be
either a parameter name (e.g. price), an equation name followed
by a colon (e.g. mean:), or a full name
(e.g. mean:price). You may use the * and ? wildcards
in equation names and parameter names. Be sure to refer to the matched
equation names, and not to the original equation names in the models,
when using the equations() option to match equations.

noomitted drops omitted coefficients (only relevant in Stata 11 or
newer).

nobaselevels drops base levels of factor variables (only relevant
in Stata 11 or newer).

keep(keeplist) selects the coefficients to be
included in the table. keeplist is specified analogous to
droplist in drop() (see above).

order(orderlist) changes the order of the
coefficients and equations within the table. orderlist is
specified analogous to droplist in drop() (see above).
Coefficients and equations that do not appear in orderlist are
placed last (in their original order).

equations(eqmatchlist) specifies how the models'
equations are to be matched. This option is passed to the internal
call of estimates table. See help estimates on how to
specify this option. The most common usage is equations(1) to
match all the first equations in the models.

eform displays the regression table in exponentiated form. The
exponent of a coefficient is displayed in lieu of the untransformed
coefficient; standard errors and confidence intervals are transformed
as well. Note that the intercept is dropped in eform-mode, unless
constant is specified.

unstack specifies that the individual equations from
multiple-equation models (e.g. mlogit, reg3,
heckman) be placed in separate columns. The default is to place
the equations below one another in a single column.

estout_options are any other estout options (see help
estout). Note that estout options take precedence over
esttab options. For example,

cells()disables b(), beta(), main(),
t(), abs, not, se(), p(), ci(),
aux(), star, staraux, wide, onecell,
parentheses, and brackets,

stats()disables r2(), ar2(), pr2(),
aic(), bic(), scalars(), sfmt(), noobs,
and obslast.

Other estout options that should be used with care are
begin(), delimiter(), end(), prehead(),
posthead(), prefoot(), postfoot(), mlabels(),
and varlabels(). Furthermore, note that estout's style()
option does not have much effect because most options that would be affected
by style() are set explicitly by esttab.

### Numerical formats

Numerical display formats may be specified in esttab as follows:

1. Official Stata's display formats: You may specify formats, such as
%9.0g or %8.2f. See help format for a list
of available formats. %g or g may be used as a
synonym for %9.0g.

2. Fixed format: You may specify an integer value such as 0,
1, 2, etc. to request a display format with a fixed number
of decimal places. For example, t(3) would display t-statistics
with three decimal places.

3. Automatic format: You may specify a1, a2, ..., or
a9 to cause esttab to choose a reasonable display format for
each number depending on the number's value. a may be used as a
synonym for a3. The # in
a# determines the minimum precision according to the
following rules:

o Absolute numbers smaller than 1 are displayed with #
significant decimal places (i.e. with # decimal places ignoring
any leading zeros after the decimal point). For example,
0.00123456 is displayed as 0.00123 if the format is
a3.

o Absolute numbers greater than 1 are displayed with as many digits
required to retain at least one decimal place and are displayed with
a minimum of (# + 1) digits. For example, if the format is
a3, 1.23456 is displayed as 1.235, 12.3456 is
displayed as 12.35, and 1234.56 is displayed as
1234.6.

o In any case, integers are displayed with zero decimal places, and
very large or very small absolute numbers are displayed in
exponential format.

## Examples

The following examples are intended to illustrate the basic usage of
esttab. Additional examples can be found at
[http://repec.sowi.unibe.ch/stata/estout/](http://repec.sowi.unibe.ch/stata/estout/).

The procedure is to first fit and store some models (see eststo) and then apply
esttab to these stored estimates:

. eststo clear

. sysuse auto
(1978 Automobile Data)

. eststo: quietly regress price weight mpg
(est1 stored)

. eststo: quietly regress price weight mpg foreign
(est2 stored)

. esttab, ar2

(1) (2)
price price

weight 1.747** 3.465***

mpg -49.51 21.85

foreign 3673.1***

_cons 1946.1 -5853.7

N 74 74
adj. R-sq 0.273 0.478

t statistics in parentheses
* p<0.05, ** p<0.01, *** p<0.001

The same table using labels:

. esttab, ar2 label

(1) (2)
Price Price

Weight (lbs.) 1.747** 3.465***

Mileage (mpg) -49.51 21.85

Car type 3673.1***

Constant 1946.1 -5853.7

Observations 74 74
Adjusted R-squared 0.273 0.478

t statistics in parentheses
* p<0.05, ** p<0.01, *** p<0.001

Plain table:

. esttab, ar2 plain

est1 est2
b/t b/t
weight 1.746559 3.464706
2.723238 5.493003
mpg -49.51222 21.8536
-.5746808 .2944391
foreign 3673.06
5.370142
_cons 1946.069 -5853.696
.541018 -1.733408
N 74 74
adj. R-sq .2734846 .4781119

Using standard errors in brackets and suppress significance stars:

. esttab, se nostar brackets

(1) (2)
price price

weight 1.747 3.465

mpg -49.51 21.85

foreign 3673.1

_cons 1946.1 -5853.7

N 74 74

Standard errors in brackets

Printing beta coefficients:

. esttab, beta

(1) (2)
price price

weight 0.460** 0.913***

mpg -0.097 0.043

foreign 0.573***

N 74 74

Standardized beta coefficients; t statistics in parentheses
* p<0.05, ** p<0.01, *** p<0.001

## Author

Ben Jann, Institute of Sociology, University of Bern, jann@soz.unibe.ch

## Also see

Manual: [R] estimates

Online: help for
estimates,
estcom,
estout,
eststo,
estadd,
estpost
