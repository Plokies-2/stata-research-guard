# ivreghdfe complete maintainer help

Maintainer help version: 1.1.4 29nov2025

Notation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.

## Title

- ivreghdfe — Extended instrumental variable regressions with multiple levels of fixed effects

## Syntax

ivreghdfe is essentially ivreg2 with an additional absorb() option from reghdfe. See the links above for the detailed help files of each program.

To use ivreghdfe, you must have installed three packages: ftools, reghdfe, and ivreg2
(see the [online guide](https://github.com/sergiocorreia/ivreghdfe#installation)).

You can also pass additional reghdfe optimization options directly:

sysuse auto

ivreghdfe price weight (length=gear), absorb(rep78) tol(1e-6)

ivreghdfe price weight (length=gear), absorb(rep78) accel(none)

## Citation

Please cite the ivreg2 and/or reghdfe commands directly:

Baum, C.F., Schaffer, M.E., Stillman, S. 2010.
ivreg2: Stata module for extended instrumental variables/2SLS, GMM and AC/HAC, LIML and k-class regression.
[http://ideas.repec.org/c/boc/bocode/s425401.html](http://ideas.repec.org/c/boc/bocode/s425401.html)

Correia, Sergio. 2017.
Linear Models with High-Dimensional Fixed Effects: An Efficient and Feasible Estimator (Working Paper)
[https://github.com/sergiocorreia/reghdfe/#citation](https://github.com/sergiocorreia/reghdfe/#citation)

## Support for margins

Note that there is experimental support for the margins postestimation command, but it hasn't been tested with advanced options such as nonlinear expressions.

## Feedback

For any issues or suggestions, please see the [Github](https://github.com/sergiocorreia/ivreghdfe) website, including the [issue tracker](https://github.com/sergiocorreia/ivreghdfe/issues).

## ivreg2 Authors

Christopher F Baum, Boston College, USA
baum@bc.edu

Mark E Schaffer, Heriot-Watt University, UK
m.e.schaffer@hw.ac.uk

Steven Stillman, Motu Economic and Public Policy Research
stillman@motu.org.nz

## reghdfe Author

Sergio Correia

Board of Governors of the Federal Reserve

Email: [sergio.correia@gmail.com](mailto:sergio.correia@gmail.com)
