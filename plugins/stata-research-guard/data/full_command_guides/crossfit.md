\# crossfit — complete maintainer help

Source help version: 30aug2024

help crossfit

## crossfit - Stata program for cross-fitting

crossfit fits a supervised machine learner on K-1 folds
and returns the out-of-sample predicted values for the holdout fold.
This is done iteratively to obtain out-of-sample ("cross-fitted") fitted values for the whole sample.

crossfit is an auxiliary program that is internally used by
ddml and qddml, but can be used for other purposes.

## Syntax

crossfit ,
estring(string)
g:enerate(stubname)
[kfolds(integer)
foldvar(varlist)
norandom
reps(integer)
vtype(string)]

- estring(string):
An estimation string, e.g. "reg y x1 x2", that will be
repeatedly invoked. See note on compatible programs
here.

- g:enerate(stubname):
Name of the new variable to be created;
the resample number is appended to the end of the variable name.
Note that if the variable (including the resample number) already exists, it is overwritten.

- kfolds(integer):
Number of randomly drawn folds; ignored if foldvar(varlist) is specified; default=5.

- foldvar(varlist):
Integer variable(s) with user-specified cross-fitting folds; one foldvar per resample.

- norandom:
Use observations in existing order instead of randomizing before splitting into folds;
if multiple resamples, applies to first resample only;
ignored if user-defined fold variables are provided in foldvar(varlist).

- reps(integer):
Number of resampling iterations, i.e., how often the cross-fitting procedure is
repeated on randomly generated folds;
ignored if foldvar(varlist) is specified;
default=1.

- vtype(string):
Variable type of the variable to be created. Defaults to double.
none can be used to leave the type field blank.

## Summary

crossfit fits a supervised machine learner on K-1 folds
and returns the out-of-sample predicted values for the holdout fold.
This process is repeated so that each fold serves once as the holdout fold
for which predictions are created.
At the end of the cross-fitting, a full set of predictions is available
in the new variable specified by the generate option.
The "supervised machine learner" can be any Stata estimator
that supports standard postestimation prediction.

crossfit's default is to generate a single random split into folds.
This can be overridden by specifying user-defined fold variables,
or by the norandom option (indicating that the split use the data in the existing order).

crossfit allows multiple resampling,
meaning that the procedure is applied repeatedly
using multiple fold variables that indicate different fold splits.
This can be done via the reps option,
or by providing multiple user-defined fold variables.
The resample number is appended to the generated predictions.

The output of crossfit can be seen as the intermediate step
of standard K-fold cross-validation.
In a typical cross-validation exercise, a search is conducted across a range of specifications (e.g. values for a tuning parameter).
The prediction errors for the holdout folds are assembled for each specification,
and the specification with the best prediction performance (e.g. smallest mean squared prediction error) is chosen.
A simple example of how to use crossfit to do this is below.

crossfit has integrated support for pystacked (see the help for pystacked if installed).
pystacked is a front-end for the [scikit-learn](https://scikit-learn.org/stable/index.html)
implementation of stacking regression.
Stacking is a way of combining multiple supervised
machine learners (the "base" or "level-0" learners) into
an ensemble or "meta" learner.
When used in conjunction with crossfit, the predictions of the pystacked base learners
are generated along with the ensemble predicted values.

## Compatible programs

See here.

## Examples

```stata
. use http://fmwww.bc.edu/repec/bocode/j/jtpa.dta, clear
```

```stata
. global X sex age married black hispanic
```

```stata
. set seed 42
```

Note that the variable created is called yhat_1 because the number of resamples defaults to 1.

```stata
. crossfit, estring(reg earnings $X) gen(yhat) kfolds(3)
```

```stata
. sum earnings yhat_1
```

As above but using 5 resamples.

```stata
. crossfit, estring(reg earnings $X) gen(yhat) kfolds(3) reps(5)
```

```stata
. sum earnings yhat*
```

As above but using pystacked.
The default base learners are OLS, CV-lasso and gradient boosting.

```stata
. crossfit, estring(pystacked earnings $X) gen(yhat) kfolds(3) reps(5)
```

```stata
. sum earnings yhat*
```

A simple example of 3-fold cross-validation with 5 resamples using crossfit.
The example uses lasso2 from lassopack; click on ssc install lassopack to install.
We estimate using the following values of the lambda parameter: 2000, 1000, 500, 250.
Each time we call crossfit to obtain the predicted values.
These could be used after cross-fitting to calculate the MSPE (mean squared prediction error),
but the MSPE is one of the returned results of crossfit so we just report that.
The specification that minimizes the MSPE for all 5 resamples is lambda=250.

```stata
. crossfit, estring(lasso2 earnings $X, lglmnet lambda(2000)) gen(yhat2000) kfolds(3) reps(5)
```

```stata
. mat list r(mse_list)
```

```stata
. crossfit, estring(lasso2 earnings $X, lglmnet lambda(1000)) gen(yhat1000) kfolds(3) reps(5)
```

```stata
. mat list r(mse_list)
```

```stata
. crossfit, estring(lasso2 earnings $X, lglmnet lambda(500)) gen(yhat500) kfolds(3) reps(5)
```

```stata
. mat list r(mse_list)
```

```stata
. crossfit, estring(lasso2 earnings $X, lglmnet lambda(250)) gen(yhat250) kfolds(3) reps(5)
```

```stata
. mat list r(mse_list)
```

When used as a standalone program, crossfit leaves behind in Mata a eStruct ("equation struct") called "crossfit".
This object contains information about the estimation, stored on associative arrays.
The utility ddml extract can be used to extract this information.
The example below shows how to list the AA keys
and how to extract the pystacked stacking weights for resample 2.
Rows are base learners; columns are the weights for each learner.

```stata
. mata: mata desc crossfit
```

```stata
. ddml extract, ename(crossfit) keys
```

```stata
. ddml extract, ename(crossfit) key1(yhat) key2(stack_base_est)
```

```stata
. ddml extract, ename(crossfit) key1(yhat) key2(stack_weights) key3(2)
```

## Saved results

crossfit saves the following results in r():

Scalars
| r(N) | Number of observations.
| r(mse) | Mean squared prediction error in the last resample.

Macros
| r(cmd_list) | Estimation command

Matrices
| r(N_list) | Sample size; rows are resamples.
| r(mse_list) | MSPE; rows are resamples.
| r(N_folds_list) | Sample size by fold; rows are resamples.
| r(mse_folds_list) | MSPE by fold; rows are resamples.

## References

Ahrens, A., Hansen, C.B. and M.E. Schaffer. 2020.
lassopack: model selection and prediction with regularized regression in Stata.
The Stata Journal, 20(1):176-235.
[https://journals.sagepub.com/doi/abs/10.1177/1536867X20909697](https://journals.sagepub.com/doi/abs/10.1177/1536867X20909697).
Working paper version: [https://arxiv.org/abs/1901.05397](https://arxiv.org/abs/1901.05397).

Chernozhukov, V., Chetverikov, D., Demirer, M.,
Duflo, E., Hansen, C., Newey, W. and Robins, J. (2018),
Double/debiased machine learning for
treatment and structural parameters.
The Econometrics Journal, 21: C1-C68. [https://doi.org/10.1111/ectj.12097](https://doi.org/10.1111/ectj.12097)

## Authors

Achim Ahrens, Public Policy Group, ETH Zurich, Switzerland
achim.ahrens@gess.ethz.ch

Christian B. Hansen, University of Chicago, USA
Christian.Hansen@chicagobooth.edu

Mark E Schaffer, Heriot-Watt University, UK
m.e.schaffer@hw.ac.uk

Thomas Wiemann, University of Chicago, USA
wiemann@uchicago.edu

## Also see (if installed)

Help: ddml, qddml, pystacked, lasso2, cvlasso.
