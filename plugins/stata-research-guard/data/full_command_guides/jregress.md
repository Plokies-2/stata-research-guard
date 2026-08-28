# jregress – Linear regression with jackknife standard errors

Performs ordinary least-squares linear regression with standard errors calculated by jackknife methods. Non-clustered or clustered (oneway) dependence structures allowed. P-values and confidence intervals are calculated using an adjusted scaled student *t* approximation.

## Examples

Simple linear regression of y on x1

```stata
jregress y x1
```

Regression of y on x1, x2, indicators for categorical variable a, and standard errors clustered by id

```stata
jregress y x1 x2 i.a, cluster(id)
```

Add the interaction between continuous variable x2 and a

```stata
jregress y x1 c.x2##i.a, cluster(id)
```

Estimate the model for observations where v1 is greater than zero

```stata
jregress y x1 x2 i.a if v1>0, cluster(id)
```

Add cluster-level fixed effects to the model

```stata
jregress y x1 x2 i.a, cluster(id) fe
```

Display degree-of-freedom adjustment coefficients

```stata
jregress y x1 x2 i.a, cluster(id) dfdisplay
```

Do not adjust student *t* degree-of-freedom

```stata
jregress y x1 x2 i.a, cluster(id) noadjust
```

## Syntax

```stata
jregress depvar [ indepvars ] [ if ] [ in ] [ , options ]
```

| options | Description |
| --- | --- |
| cluster(varname) | cluster by variable *varname* |
| fe | include cluster-level fixed effects |
| dfdisplay | display adjusted degree-of-freedom and scale coefficients |
| noadjust | do not adjust student *t* degree-of-freedom; calculate p-values and confidence intervals with conventional student *t* distribution |
| level(#) | set confidence level; default is level(95) |
