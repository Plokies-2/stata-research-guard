# winsor2 complete maintainer help

Maintainer help version: 2.0 2020/11/24

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

help for winsor2([blog](https://www.lianxh.cn))

## Winsorizing or Trimming variables

## Syntax

winsor2 varlist [if] [in],
[
s[uffix]:(string)
replace
t[rim]
c[uts](# #)
by(varlist[groupvar])
l[abel]
]

## Description

winsor2 winsorize or trim (if trim option is specified) the variables in varlist
at particular percentiles specified by option cuts(#1 #2).
In defult, new variables will be generated with a suffix "_w" or "_tr", which can be changed by
specifying suffix() option.
The replace option replaces the variables with their winsorized or trimmed ones.

### Difference between winsorizing and trimming

Winsorizing is not equivalent to simply excluding data,
which is a simpler procedure, called trimming or truncation.
In a trimmed estimator, the extreme values are discarded;
in a Winsorized estimator, the extreme values are instead
replaced by certain percentiles, specified by option cuts(# #).
For details, see winsor (if installed), trimmean (if installed).

For example, you type the following commands to get the 1th and 99th
percentiles of variable wage, 1.930993 and 38.70926, respectively.

```stata
. sysuse nlsw88, clear
```

```stata
. sum wage, detail
```

In defult, winsor2 winsorize wage at 1th and 99th percentiles,

```stata
. winsor2 wage, replace cuts(1 99)
```

which can be done by hands:

```stata
. replace wage=1.930993 if wage<1.930993
```

```stata
. replace wage=38.70926 if wage>38.70926
```

Note that, values smaller than the 1th percentile is repalce by the 1th percentile,
and the similar thing is done with the 99th percentile.

Things change when -trim- option is specified:

```stata
. winsor2 wage, replace cuts(1 99) trim
```

which can also be done by hands:

```stata
. replace wage=. if wage<1.930993
```

```stata
. replace wage=. if wage>38.70926
```

In this case, we discard values smaller than 1th percentile or greater than 99th percentile.
This is trimming.

## Options

suffix(string) specifies the suffix of the new
variables. The defult is "_w" or "_tr" (when trim specified).

replace replaces the variables with their winsorized or trimmed counterpart.
Can not be specified with suffix(string).

trim trims the variables.

cuts(# #) specifies the percentiles at which the
data is winsorized or trimmed. cuts(1 99) (the default) means winsor (trim) at 1th and 99th
percentile. Specify cuts(1 99) or cuts(99 1) makes no difference.

by(varlist[groupvar]) the winsor or trim is done within each group specified by
groupvar.

## Examples

*- winsor at (p1 p99), get new variable "wage_w"

```stata
. "sysuse nlsw88, clear": sysuse nlsw88, clear
```

```stata
. "winsor2 wage": winsor2 wage
```

*- winsor 3 variables at 0.5th and 99.5th percentiles, and overwrite the old variables

```stata
. "winsor2 wage age hours, cuts(0.5 99.5) replace": winsor2 wage age hours, cuts(0.5 99.5) replace
```

*- winsor 3 variables at (p1 p99), gen new variables with suffix _win, and add variable labels

```stata
. "winsor2 wage age hours, suffix(_win) label": winsor2 wage age hours, suffix(_win) label
```

*- left-winsorizing only, at 1th percentile

```stata
. "winsor2 age, cuts(1 100)": winsor2 wage, cuts(1 100)
```

*- right-trimming only, at 99th percentile

```stata
. "winsor2 wage, cuts(0 99) trim": winsor2 wage, cuts(0 99) trim
```

*- winsor variables at (p1 p99) by (industry), overwrite the old variables

```stata
. "winsor2 wage age hours, replace by(industry)": winsor2 wage hours, replace by(industry)
```

## References

Anonymous. 1951. In memoriam: Charles P. Winsor.
Biometrics 7: 221.

Barnett, V. and Lewis, T. 1994. Outliers in statistical data.
Chichester: John Wiley. [Previous editions 1978, 1984.]

Tukey, J.W. 1962. The future of data analysis.
Annals of Mathematical Statistics 33: 1-67.

## Acknowledgements

Codes from winsor by Nicholas J. Cox and
-winsorizeJ.ado- by Judson Caskey
have been incorporated.

## Author

Yujun,Lian (arlionn) Department of Finance, Lingnan College, Sun Yat-Sen University.

E-mail: [arlionn@163.com](mailto:arlionn@163.com).

Blog: [https://www.lianxh.cn](https://www.lianxh.cn)

## Other Commands I have written

- lianxh (if installed): ssc install lianxh (to install)

- bdiff (if installed): ssc install bdiff (to install)

- hhi5 (if installed): ssc install hhi5 (to install)

- uall (if installed): ssc install uall (to install)

- xtbalance (if installed): ssc install xtbalance (to install)

## Also see

Online:
summarize,
means,
winsor (if installed),
trimplot (if installed),
trimmean (if installed),
iqr (if installed),
robmean (if installed)
