# ivregress — Instrumental-variables regression

  ivregress — Single-equation instrumental-variables regression+
    +
        This command includes features that are part of StataNow.
    Description                  Quick start        Menu                        Syntax         Options
    Remarks and examples         Stored results     Methods and formulas        References     Also see


Description
    ivregress fits linear models where one or more of the regressors are endogenously determined.
 ivregress supports estimation via two-stage least squares (2SLS), limited-information maximum like-
 lihood (LIML), and generalized method of moments (GMM).


Quick start
 2SLS estimation of a linear regression of y1 on x1 and endogenous regressor y2 that is instrumented by
    z1
       ivregress 2sls y1 x1 (y2 = z1)
 Same as above, but with two endogenous regressors, y2 and y3 instrumented by z1 and z2
      ivregress 2sls y1 x1 (y2 y3 = z1 z2)
 Same as above, but absorbing indicator variables for the levels of cvar1 and cvar2
      ivregress 2sls y1 x1 (y2 y3 = z1 z2), absorb(cvar1 cvar2)
 With robust standard errors
       ivregress 2sls y1 x1 (y2 y3 = z1 z2), vce(robust)
 Report small-sample statistics
       ivregress 2sls y1 x1 (y2 y3 = z1 z2), small
 Use LIML estimation
       ivregress liml y1 x1 (y2 y3 = z1 z2)
 Use GMM estimation
      ivregress gmm y1 x1 (y2 y3 = z1 z2)
 Also specify a weight matrix that allows for correlation within clusters identified by cvar
       ivregress gmm y1 x1 (y2 y3 = z1 z2), wmatrix(cluster cvar)


Menu
 Statistics > Endogenous covariates > Linear regression with endogenous covariates







Syntax
    ivregress estimator depvar [ varlist 1 ] (varlist 2 = varlist iv ) [ if ] [ in ] [ weight ] [ , options ]

 varlist 1 is the list of exogenous variables.
 varlist 2 is the list of endogenous variables.
 varlist iv is the list of exogenous variables used with varlist 1 as instruments for varlist 2 .



    estimator                      Description
    2sls                           two-stage least squares (2SLS)
    liml                           limited-information maximum likelihood (LIML)
    gmm                            generalized method of moments (GMM)

    options                        Description
Model
  absorb(varlist[ , method ])1 specify categorical variables to be absorbed
+
  absorb(varlist abs [ , method ])1 specify variables to be absorbed, including categorical variables,
                                      continuous variables, and interactions
†
  dfabsorb1                         adjust degrees of freedom for collinearity among absorbed
                                      categorical variables
  noconstant1,5                     suppress constant term
  hascons5                          has user-supplied constant
GMM2
    wmatrix(wmtype)                wmtype may be robust, cluster clustvar, hac hacspec, or
                                     unadjusted
    center                         center moments in weight matrix computation
    igmm                           use iterative instead of two-step GMM estimator
    eps(#)3                        specify parameter convergence criterion; default is eps(1e-6)
    weps(#)3                       specify weight-matrix convergence criterion; default is weps(1e-6)
SE/Robust
    vce(vcetype)                   vcetype may be unadjusted, robust, cluster clustvar, bootstrap,
                                     jackknife, or hac hacspec
+
    vce(vcetype)                   vcetype may also be cluster clustvarlist
Reporting
    level(#)                       set confidence level; default is level(95)
    first                          report first-stage regression
    small                          make degrees-of-freedom adjustments and report small-sample
                                      statistics
  noheader                         display only the coefficient table
  depname(depname)                 substitute dependent variable name
  eform(string )                   report exponentiated coefficients and use string to label them
+
  clustertable                     display table of multiway cluster combinations
  display options                  control columns and column formats, row spacing, line width,
                                      display of omitted variables and base and empty cells, and
                                      factor-variable labeling
Optimization
†
    optimization options4          control the optimization process; seldom used
    perfect                        do not check for collinearity between endogenous regressors and
                                      excluded instruments
    coeflegend                     display legend instead of statistics


    + These features are part of StataNow.
    1 These options may be specified only with 2sls.
    2 These options may be specified only with gmm.
    3 These options may be specified only with igmm.
    4 These options may be specified only with igmm or 2sls and absorb().
    5 These options may not be specified with 2sls and absorb().
    † Ignored if only one absorbed variable is specified.

    varlist 1 , varlist 2 , varlistiv , and varlistabs may contain factor variables; see [U] 11.4.3 Factor variables.
    depvar, varlist 1 , varlist 2 , and varlistiv may contain time-series operators; see [U] 11.4.4 Time-series varlists.
    bayesboot, bootstrap, by, collect, fmm, jackknife, rolling, statsby, and svy are allowed; see [U] 11.1.10 Prefix
        commands. For more details, see [FMM] fmm: ivregress.
    Weights are not allowed with the bootstrap prefix; see [R] bootstrap.
    aweights are not allowed with the jackknife prefix; see [R] jackknife.
    absorb(), dfabsorb, hascons, vce(), noheader, depname(), and weights are not allowed with the svy prefix; see
        [SVY] svy.
    aweights, fweights, iweights, and pweights are allowed; see [U] 11.1.6 weight.
    iweights are not allowed with vce(cluster).
    fweights, iweights, and pweights are not allowed with vce(hac hacspec).
    perfect and coeflegend do not appear in the dialog box.
    See [U] 20 Estimation and postestimation commands for more capabilities of estimation commands.


Options
           
            Model

    absorb(varlist[ , method ]) specifies the categorical variables to be absorbed. The results are adjusted
      as if indicator variables for each level of each variable in varlist were included in the regression.
       The absorption of categorical variables involves projecting depvar and all variables in varlist 1 ,
       varlist 2 , and varlistiv via an alternating projection method (APM) iterative algorithm. method specifies
       the APM and is one of halperin or cimmino.
            halperin, the default, uses the product of the projection matrices.
            cimmino uses the mean of the projection matrices.
       The two methods typically perform similarly. See Stammann (2018) for details.
       method is ignored if only one absorbed variable is specified.
       absorb() may not be combined with vce(cluster clustvarlist ) or vce(hac hacspec).
    absorb(varlist abs [ , method ]) is part of StataNow. It specifies the variables to be absorbed, where
      varlistabs can include categorical variables, continuous variables, and categorical-by-continuous vari-
      able interactions. The results are adjusted as if each variable in varlistabs were included in the regres-
      sion. Categorical variables are included as if indicator variables for each level of the variable were
      included in the regression, for example, ibn.catvar. A categorical variable interacted with a contin-
      uous variable, specified as catvar#c.contvar, is included as ibn.catvar#c.contvar. A continuous
      variable specification must include the c. operator, for example, c.contvar.
       The absorption of variables involves projecting depvar and all variables in varlist 1 , varlist 2 , and
       varlistiv via an alternating projection method (APM) iterative algorithm. method specifies the APM
       and is one of halperin or cimmino.



          halperin, the default, uses the product of the projection matrices.
          cimmino uses the mean of the projection matrices.
       The two methods typically perform similarly. See Stammann (2018) for details.
       method is ignored if only one absorbed variable is specified.
       absorb() may not be combined with vce(cluster clustvarlist ) or vce(hacspec).
       absorb() will allow higher-order interactions, but this capability comes with some costs. Inter-
       nally, ivregress will reduce the higher-order interactions involving both categorical and continuous
       variables to two-way interactions before carrying out the projections. Interactions involving only cat-
       egorical variables will be reduced to a single categorical variable. Although uninteracted continuous
       variables, interactions of continuous variables, and higher-order continuous terms, such as quadratic
       or cubic terms, are allowed within absorb(), this capability is discouraged because they are better
       handled as an independent variables (varlist 1 ) specification.
    dfabsorb adjusts the degrees of freedom to account for collinearity among the absorbed categorical
      variables. The default degrees of freedom assumes that all absorbed variables are independent. This
      option is ignored if only one absorbed variable is specified in absorb(), and the adjustment ignores
      specifications that involve continuous variables.
    noconstant; see [R] Estimation options.
    hascons indicates that a user-defined constant or its equivalent is specified among the independent vari-
      ables.
          
          GMM

    wmatrix(wmtype) specifies the type of weight matrix to be used in conjunction with the GMM estimator.
       wmatrix(robust), the default, requests a weight matrix that is optimal when the error term is het-
         eroskedastic.
       wmatrix(cluster clustvar) requests a weight matrix that accounts for arbitrary correlation among
         observations within clusters identified by clustvar.
       wmatrix(hac hacspec) requests a heteroskedasticity- and autocorrelation-consistent (HAC) weight
         matrix. The full syntax of hacspec is one of the following:
          wmatrix(hac kernel [ # ]) requests a HAC weight matrix using the specified kernel (see below)
            with optional # lags. The bandwidth of a kernel is equal to # + 1. If # is not specified, a kernel
            with 𝑁 − 2 lags is used, where 𝑁 is the sample size.
          wmatrix(hac kernel opt [ # ]) requests a HAC weight matrix using the specified kernel (see be-
            low), and the lag order is selected using Newey and West’s (1994) optimal lag-selection algo-
            rithm. # is an optional tuning parameter that affects the lag order selected; see the discussion
            in Methods and formulas.
          kernel may be one of the following:
              bartlett or nwest requests the Bartlett (Newey–West) kernel.
              parzen or gallant requests the Parzen (Gallant 1987) kernel.
              quadraticspectral or andrews requests the quadratic spectral (Andrews 1991) kernel.
          You must tsset your data before specifying ivregress with wmatrix(hac hacspec).



       wmatrix(unadjusted) requests a weight matrix that is suitable when the errors are homoskedastic.
         The GMM estimator with this weight matrix is equivalent to the 2SLS estimator.
       When wmatrix() is unspecified, wmtype is set equal to vcetype if it has been specified. If multiway
       clustering has been specified in vce(), the weight matrix is also generated by multiway clustering on
       the same cluster variables.
    center requests that the sample moments be centered (demeaned) when computing GMM weight matri-
      ces. By default, centering is not done.
    igmm requests that the iterative GMM estimator be used instead of the default two-step GMM estimator.
      Convergence is declared when the relative change in the parameter vector from one iteration to the
      next is less than eps() or the relative change in the weight matrix is less than weps().
    eps(#) specifies the convergence criterion for successive parameter estimates when the iterative GMM
      estimator is used. The default is eps(1e-6). Convergence is declared when the relative difference
      between successive parameter estimates is less than eps() and the relative difference between suc-
      cessive estimates of the weight matrix is less than weps().
    weps(#) specifies the convergence criterion for successive estimates of the weight matrix when the iter-
      ative GMM estimator is used. The default is weps(1e-6). Convergence is declared when the relative
      difference between successive parameter estimates is less than eps() and the relative difference be-
      tween successive estimates of the weight matrix is less than weps().
          
          SE/Robust

    vce(vcetype) specifies the type of standard error reported, which includes types that are robust to some
      kinds of misspecification (robust), that allow for intragroup correlation (cluster clustvarlist), and
      that use bootstrap or jackknife methods (bootstrap, jackknife); see [R] vce option.
       vce(unadjusted), the default for 2sls and liml, specifies that an unadjusted (nonrobust) VCE
         matrix be used. The default for gmm is based on the wmtype specified in the wmatrix() option;
         see wmatrix() above. If wmatrix() is specified with gmm but vce() is not, then vcetype is set
         equal to wmtype. To override this behavior and obtain an unadjusted (nonrobust) VCE matrix,
         specify vce(unadjusted).
       vce(robust) specifies that standard errors allow for heteroskedasticity in the variance of the obser-
         vations.
       vce(cluster clustvar) specifies that standard errors allow for intragroup correlation within groups
         defined by clustvar, relaxing the usual requirement that the observations be independent. For ex-
         ample, vce(cluster clustvar1) produces cluster–robust standard errors that allow for obser-
         vations that are independent across groups defined by clustvar1 but not necessarily independent
         within groups.
       vce(cluster clustvarlist ) is part of StataNow. It specifies that standard errors allow for intra-
         group correlation within groups defined by one or more variables, relaxing the usual requirement
         that the observations be independent. For example, vce(cluster clustvar1) produces clus-
         ter–robust standard errors that allow for observations that are independent across groups defined
         by clustvar1 but not necessarily independent within groups. You could also type vce(cluster
         clustvar1 clustvar2 ... clustvar𝑝) to account for correlation within groups formed by 𝑝
         variables (multiway clustering).
       vce(hac hacspec) specifies that a HAC covariance matrix be used. The syntax is identical to that for
         wmatrix(). vce(hac hacspec) may not be combined with absorb(). You must tsset your data
         before specifying ivregress with vce(hac hacspec).


          
          Reporting

    level(#); see [R] Estimation options.
    first requests that the first-stage regression results be displayed.
    small requests that a degrees-of-freedom adjustment be made to the variance–covariance matrix of pa-
      rameters and that small-sample 𝐹 and 𝑡 statistics be reported. By default, no degrees-of-freedom ad-
      justment is made, and Wald and 𝑧 statistics are reported. When vce(unadjusted) or vce(robust)
      is also specified, the degrees-of-freedom adjustment multiplies the variance–covariance matrix by
      𝑁 /(𝑁 − 𝑘), where 𝑁 is the sample size and 𝑘 the number of regressors in the main equation. When
      vce(cluster clustvar) is specified with only one cluster variable, the degrees-of-freedom adjust-
      ment multiplies the variance–covariance matrix by 𝑁 𝐺/(𝑁 −𝑘)(𝐺−1), where 𝐺 is the total number
      of clusters. When multiway clustering is requested with multiple variables in vce(cluster clust-
      varlist), the small-sample adjustment is applied separately to each of the cluster–robust VCEs used to
      construct the multiway cluster–robust VCE. See Methods and formulas in [R] regress for more details
      of multiway clustering.
    noheader suppresses the display of the summary statistics at the top of the output, displaying only the
      coefficient table.
    depname(depname) is used only in programs and ado-files that use ivregress to fit models other than
      instrumental-variables regression. depname() may be specified only at estimation time. depname
      is recorded as the identity of the dependent variable, even though the estimates are calculated using
      depvar. This method affects the labeling of the output — not the results calculated — but could affect
      later calculations made by predict, where the residual would be calculated as deviations from dep-
      name rather than depvar. depname() is most typically used when depvar is a temporary variable (see
      [P] macro) used as a proxy for depname.
    eform(string ) is used only in programs and ado-files that use ivregress to fit models other than
      instrumental-variables regression. eform() specifies that the coefficient table be displayed in “ex-
      ponentiated form”, as defined in [R] Maximize, and that string be used to label the exponentiated
      coefficients in the table.
    clustertable is part of StataNow. It displays a table reporting cluster combinations and the number of
      clusters per combination. This option is available only when vce(cluster clustvarlist ) is specified
      with more than one variable to compute multiway cluster–robust standard errors.
    display options: noci, nopvalues, noomitted, vsquish, noemptycells, baselevels,
       allbaselevels, nofvlabel, fvwrap(#), fvwrapon(style), cformat(% fmt ), pformat(% fmt ),
       sformat(% fmt ), and nolstretch; see [R] Estimation options.
          
          Optimization

    optimization options: iterate(#), [no]log, tolerance(#), and apcriterion(max | mean).
       iterate() specifies the maximum number of iterations to perform in conjunction with the itera-
       tive GMM estimator or 2sls with the absorb() option. For the GMM estimator, the default is the
       number set using set maxiter, which is 300 by default; for the 2SLS estimator, the default is 50.
       log/nolog specifies whether to show the iteration log; see set iterlog in [R] set iter. tolerance()
       and apcriterion() are allowed only with 2sls and the absorb() option. tolerance() specifies
       the projection difference tolerance, with default tolerance(1e-8). apcriterion(max | mean) is
       part of StataNow. It specifies the criterion to be used when determining convergence of alternating



    projections. max, the default, terminates iterative projections when the maximum absolute projection
    difference is less than tolerance(#). mean terminates iterative projections when the mean absolute
    projection difference is less than tolerance(#) for all variables. These options are seldom used.

 The following options are available with ivregress but are not shown in the dialog box:
 perfect requests that ivregress not check for collinearity between the endogenous regressors and
   excluded instruments, allowing one to specify “perfect” instruments. This option cannot be used
   with the LIML estimator. This option may be required when using ivregress to implement other
   estimators.
 coeflegend; see [R] Estimation options.


Remarks and examples
     ivregress performs instrumental-variables regression and weighted instrumental-variables regres-
 sion. For a general discussion of instrumental variables, see Baum (2006), Cameron and Trivedi (2005;
 2022, chap. 7) Davidson and MacKinnon (1993), Greene (2018, chap. 8), and Wooldridge (2010, 2020).
 See Hall (2005) for a lucid presentation of GMM estimation. Angrist and Pischke (2009, chap. 4) offer
 a casual yet thorough introduction to instrumental-variables estimators, including their use in estimating
 treatment effects. Some of the earliest work on simultaneous systems can be found in Cowles Com-
 mission monographs — Koopmans and Marschak (1950) and Koopmans and Hood (1953) — with the
 first developments of 2SLS appearing in Theil (1953) and Basmann (1957). However, Stock and Watson
 (2019, 401–402) present an example of the method of instrumental variables that was first published in
 1928 by Philip Wright.
    The syntax for ivregress assumes that you want to fit one equation from a system of equations or
 an equation for which you do not want to specify the functional form for the remaining equations of
 the system. To fit a full system of equations, using either 2SLS equation-by-equation or three-stage least
 squares, see [R] reg3. An advantage of ivregress is that you can fit one equation of a multiple-equation
 system without specifying the functional form of the remaining equations.
    Formally, the model fit by ivregress is

                                         𝑦𝑖 = y𝑖 β1 + x1𝑖 β2 + 𝑢𝑖                                        (1)
                                         y𝑖 = x1𝑖 𝚷1 + x2𝑖 𝚷2 + v𝑖                                       (2)

 Here 𝑦𝑖 is the dependent variable for the 𝑖th observation, y𝑖 represents the endogenous regressors (varlist2
 in the syntax diagram), x1𝑖 represents the included exogenous regressors (varlist1 in the syntax diagram),
 and x2𝑖 represents the excluded exogenous regressors (varlistiv in the syntax diagram). x1𝑖 and x2𝑖 are
 collectively called the instruments. 𝑢𝑖 and v𝑖 are zero-mean error terms, and the correlations between 𝑢𝑖
 and the elements of v𝑖 are presumably nonzero.
    The rest of the discussion is presented under the following headings:
                  2SLS and LIML estimators
                  GMM estimator
                  Video example



2SLS and LIML estimators
    The most common instrumental-variables estimator is 2SLS.

 Example 1: 2SLS estimator
    We have state data from the 1980 census on the median dollar value of owner-occupied housing
 (hsngval) and the median monthly gross rent (rent). We want to model rent as a function of hsngval
 and the percentage of the population living in urban areas (pcturban):

                            rent𝑖 = 𝛽0 + 𝛽1 hsngval𝑖 + 𝛽2 pcturban𝑖 + 𝑢𝑖

 where 𝑖 indexes states and 𝑢𝑖 is an error term.
    Because random shocks that affect rental rates in a state probably also affect housing values, we treat
 hsngval as endogenous. We believe that the correlation between hsngval and 𝑢 is not equal to zero.
 On the other hand, we have no reason to believe that the correlation between pcturban and 𝑢 is nonzero,
 so we assume that pcturban is exogenous.
     Because we are treating hsngval as an endogenous regressor, we must have one or more additional
 variables available that are correlated with hsngval but uncorrelated with 𝑢. Moreover, these excluded
 exogenous variables must not affect rent directly, because if they do then they should be included in the
 regression equation we specified above. In our dataset, we have a variable for family income (faminc)
 and for region of the country (region) that we believe are correlated with hsngval but not the error term.
 Together, pcturban, faminc, and factor variables 2.region, 3.region, and 4.region constitute our
 set of instruments.
    To fit the equation in Stata, we specify the dependent variable and the list of included exogenous vari-
 ables. In parentheses, we specify the endogenous regressors, an equal sign, and the excluded exogenous
 variables. Only the additional exogenous variables must be specified to the right of the equal sign; the
 exogenous variables that appear in the regression equation are automatically included as instruments.



   Here we fit our model with the 2SLS estimator:
      . use https://www.stata-press.com/data/r19/hsng
      (1980 Census housing data)
      . ivregress 2sls rent pcturban (hsngval = faminc i.region)
      Instrumental-variables 2SLS regression                  Number of obs    =          50
                                                              Wald chi2(2)     =       90.76
                                                              Prob > chi2      =      0.0000
                                                              R-squared        =      0.5989
                                                              Root MSE         =      22.166

               rent    Coefficient   Std. err.        z    P>|z|      [95% conf. interval]

            hsngval      .0022398    .0003284       6.82   0.000      .0015961      .0028836
           pcturban       .081516    .2987652       0.27   0.785      -.504053       .667085
              _cons      120.7065    15.22839       7.93   0.000      90.85942      150.5536

      Endogenous: hsngval
      Exogenous: pcturban faminc 2.region 3.region 4.region

    As we would expect, states with higher housing values have higher rental rates. The proportion of a
state’s population that is urban does not have a significant effect on rents.


Technical note
   In a simultaneous-equations framework, we could write the model we just fit as

         hsngval𝑖 = 𝜋0 + 𝜋1 faminc𝑖 + 𝜋2 2.region𝑖 + 𝜋3 3.region𝑖 + 𝜋4 4.region𝑖 + 𝑣𝑖
             rent𝑖 = 𝛽0 + 𝛽1 hsngval𝑖 + 𝛽2 pcturban𝑖 + 𝑢𝑖

which here happens to be recursive (triangular), because hsngval appears in the equation for rent
but rent does not appear in the equation for hsngval. In general, however, systems of simultaneous
equations are not recursive. Because this system is recursive, we could fit the two equations individually
via OLS if we were willing to assume that 𝑢 and 𝑣 were independent. For a more detailed discussion of
triangular systems, see Kmenta (1997, 719–720).
    Historically, instrumental-variables estimation and systems of simultaneous equations were taught
concurrently, and older textbooks describe instrumental-variables estimation solely in the context of
simultaneous equations. However, in recent decades, the treatment of endogeneity and instrumental-
variables estimation has taken on a much broader scope, while interest in the specification of complete
systems of simultaneous equations has waned. Most recent textbooks, such as Cameron and Trivedi
(2005), Davidson and MacKinnon (1993), and Wooldridge (2010, 2020), treat instrumental-variables
estimation as an integral part of the modern economists’ toolkit and introduce it long before shorter dis-
cussions on simultaneous equations.

   In addition to the 2SLS member of the 𝜅-class estimators, ivregress implements the LIML estimator.
Both theoretical and Monte Carlo exercises indicate that the LIML estimator may yield less bias and
confidence intervals with better coverage rates than the 2SLS estimator. See Poi (2006) and Stock, Wright,
and Yogo (2002) (and the papers cited therein) for Monte Carlo evidence.



 Example 2: LIML estimator
    Here we refit our model with the LIML estimator:
       . ivregress liml rent pcturban (hsngval = faminc i.region)
       Instrumental-variables LIML regression                   Number of obs    =          50
                                                                Wald chi2(2)     =       75.71
                                                                Prob > chi2      =      0.0000
                                                                R-squared        =      0.4901
                                                                Root MSE         =      24.992

                rent    Coefficient    Std. err.       z       P>|z|    [95% conf. interval]

             hsngval      .0026686     .0004173      6.39      0.000    .0018507      .0034865
            pcturban     -.1827391     .3571132     -0.51      0.609   -.8826681      .5171899
               _cons      117.6087     17.22625      6.83      0.000    83.84587      151.3715

       Endogenous: hsngval
       Exogenous: pcturban faminc 2.region 3.region 4.region

   These results are qualitatively similar to the 2SLS results, although the coefficient on hsngval is about
 19% higher.



GMM estimator
     Since the celebrated paper of Hansen (1982), the GMM has been a popular method of estimation in
 economics and finance, and it lends itself well to instrumental-variables estimation. The basic principle
 is that we have some moment or orthogonality conditions of the form

                                               𝐸(z𝑖 𝑢𝑖 ) = 0                                            (3)

 From (1), we have 𝑢𝑖 = 𝑦𝑖 − y𝑖 β1 − x1𝑖 β2 . What are the elements of the instrument vector z𝑖 ? By
 assumption, x1𝑖 is uncorrelated with 𝑢𝑖 , as are the excluded exogenous variables x2𝑖 , and so we use
 z𝑖 = [x1𝑖 x2𝑖 ]. The moment conditions are simply the mathematical representation of the assumption
 that the instruments are exogenous—that is, the instruments are orthogonal to (uncorrelated with) 𝑢𝑖 .
    If the number of elements in z𝑖 is just equal to the number of unknown parameters, then we can apply
 the analogy principle to (3) and solve
                             1        1
                               ∑ z 𝑢 = ∑ z𝑖 (𝑦𝑖 − y𝑖 β1 − x1𝑖 β2 ) = 0                                  (4)
                             𝑁 𝑖 𝑖 𝑖  𝑁 𝑖

 This equation is known as the method of moments estimator. Here, where the number of instruments
 equals the number of parameters, the method of moments estimator coincides with the 2SLS estimator,
 which also coincides with what has historically been called the indirect least-squares estimator (Judge et
 al. 1985, 595).



   The “generalized” in GMM addresses the case in which the number of instruments (columns of z𝑖 )
exceeds the number of parameters to be estimated. Here there is no unique solution to the population
moment conditions defined in (3), so we cannot use (4). Instead, we define the objective function
                                                            ′
                                            1             1
                             𝑄(β1 , β2 ) = ( ∑ z𝑖 𝑢𝑖 ) W ( ∑ z𝑖 𝑢𝑖 )                                 (5)
                                            𝑁 𝑖           𝑁 𝑖
where W is a positive-definite matrix with the same number of rows and columns as the number of
columns of z𝑖 . W is known as the weight matrix, and we specify its structure with the wmatrix()
option. The GMM estimator of (β1 , β2 ) minimizes 𝑄(β1 , β2 ); that is, the GMM estimator chooses β1
and β2 to make the moment conditions as close to zero as possible for a given W. For a more general
GMM estimator, see [R] gmm. gmm does not restrict you to fitting a single linear equation, though the
syntax is more complex.
   A well-known result is that if we define the matrix S0 to be the covariance of z𝑖 𝑢𝑖 and set W = S−1
                                                                                                     0 ,
then we obtain the optimal two-step GMM estimator, where by optimal estimator we mean the one that
results in the smallest variance given the moment conditions defined in (3).
   Suppose that the errors 𝑢𝑖 are heteroskedastic but independent among observations. Then
                                    S0 = 𝐸(z𝑖 𝑢𝑖 𝑢𝑖 z′𝑖 ) = 𝐸(𝑢2𝑖 z𝑖 z′𝑖 )
and the sample analogue is
                                            Ŝ = ∑ 𝑢̂2𝑖 z𝑖 z′𝑖                                       (6)
                                                𝑁 𝑖
To implement this estimator, we need estimates of the sample residuals 𝑢̂𝑖 . ivregress gmm obtains the
residuals by estimating β1 and β2 by 2SLS and then evaluates (6) and sets W = S−1̂ . Equation (6) is the
same as the center term of the “sandwich” robust covariance matrix available from most Stata estimation
commands through the vce(robust) option.

Example 3: GMM estimator
   Here we refit our model of rents by using the GMM estimator, allowing for heteroskedasticity in 𝑢𝑖 :
      . ivregress gmm rent pcturban (hsngval = faminc i.region), wmatrix(robust)
      Instrumental-variables GMM regression                      Number of obs      =         50
                                                                 Wald chi2(2)       =     112.09
                                                                 Prob > chi2        =     0.0000
                                                                 R-squared          =     0.6616
      GMM weight matrix: Robust                                  Root MSE           =     20.358

                                      Robust
               rent   Coefficient    std. err.          z       P>|z|        [95% conf. interval]

           hsngval       .0014643    .0004473        3.27       0.001        .0005877     .002341
          pcturban       .7615482    .2895105        2.63       0.009        .1941181    1.328978
             _cons       112.1227    10.80234       10.38       0.000        90.95052    133.2949

      Endogenous: hsngval
      Exogenous: pcturban faminc 2.region 3.region 4.region

Because we requested that a heteroskedasticity-consistent weight matrix be used during estimation but
did not specify the vce() option, ivregress reported standard errors that are robust to heteroskedastic-
ity. Had we specified vce(unadjusted), we would have obtained standard errors that would be correct
only if the weight matrix W does in fact converge to S−1
                                                      0 .



Technical note
   Many software packages that implement GMM estimation use the same heteroskedasticity-consistent
weight matrix we used in the previous example to obtain the optimal two-step estimates but do not use
a heteroskedasticity-consistent VCE, even though they may label the standard errors as being “robust”.
To replicate results obtained from other packages, you may have to use the vce(unadjusted) option.
See Methods and formulas below for a discussion of robust covariance matrix estimation in the GMM
framework.

   By changing our definition of S0 , we can obtain GMM estimators suitable for use with other types of
data that violate the assumption that the errors are independent and identically distributed. For example,
you may have a dataset that consists of multiple observations for each person in a sample. The observa-
tions that correspond to the same person are likely to be correlated, and the estimation technique should
account for that lack of independence. Say that in your dataset, people are identified by the variable
personid and you type
      . ivregress gmm ..., wmatrix(cluster personid)

Here ivregress estimates S0 as
                                            Ŝ = ∑ q𝑐 q′𝑐
                                                𝑁 𝑐∈𝐶
where 𝐶 denotes the set of clusters and
                                             q𝑐 = ∑ 𝑢̂𝑖 z𝑖
                                                   𝑖∈𝑐𝑗

where 𝑐𝑗 denotes the 𝑗th cluster. This weight matrix accounts for the within-person correlation among
observations, so the GMM estimator that uses this version of S0 will be more efficient than the estimator
that ignores this correlation.

Example 4: GMM estimator with clustering
    We have data from the National Longitudinal Survey on young women’s wages as reported in a series
of interviews from 1968 through 1988, and we want to fit a model of wages as a function of each woman’s
age and age squared, job tenure, birth year, and level of education. We believe that random shocks that
affect a woman’s wage also affect her job tenure, so we treat tenure as endogenous. As additional in-
struments, we use her union status, number of weeks worked in the past year, and a dummy indicating
whether she lives in a metropolitan area. Because we have several observations for each woman (corre-
sponding to interviews done over several years), we want to control for clustering on each person.



       . use https://www.stata-press.com/data/r19/nlswork
       (National Longitudinal Survey of Young Women, 14-24 years old in 1968)
       . ivregress gmm ln_wage age c.age#c.age birth_yr grade
       > (tenure = union wks_work msp), wmatrix(cluster idcode)
       Instrumental-variables GMM regression                    Number of obs     =      18,625
                                                                Wald chi2(5)      =     1807.17
                                                                Prob > chi2       =      0.0000
                                                                Root MSE          =      .46951
       GMM weight matrix: Cluster (idcode)
                                        (Std. err. adjusted for 4,110 clusters in idcode)

                                        Robust
             ln_wage    Coefficient    std. err.        z     P>|z|      [95% conf. interval]

              tenure       .099221     .0037764     26.27     0.000      .0918194      .1066227
                 age      .0171146     .0066895      2.56     0.011      .0040034      .0302259

        c.age#c.age      -.0005191      .000111     -4.68     0.000     -.0007366     -.0003016

            birth_yr     -.0085994     .0021932     -3.92     0.000      -.012898     -.0043008
               grade       .071574     .0029938     23.91     0.000      .0657062      .0774417
               _cons      .8575071     .1616274      5.31     0.000      .5407231      1.174291

       Endogenous: tenure
       Exogenous: age c.age#c.age birth_yr grade union wks_work msp

 Both job tenure and years of schooling have significant positive effects on wages.

    Time-series data are often plagued by serial correlation. In these cases, we can construct a weight
 matrix to account for the fact that the error in period 𝑡 is probably correlated with the errors in periods
 𝑡 − 1, 𝑡 − 2, etc. A HAC weight matrix can be used to account for both serial correlation and potential
 heteroskedasticity.
     To request a HAC weight matrix, you specify the wmatrix(hac kernel [ # | opt ]) option. kernel spec-
 ifies which of three kernels to use: bartlett, parzen, or quadraticspectral. kernel determines the
 amount of weight given to lagged values when computing the HAC matrix, and # denotes the maximum
 number of lags to use. Many texts refer to the bandwidth of the kernel instead of the number of lags; the
 bandwidth is equal to the number of lags plus one. If neither opt nor # is specified, then 𝑁 − 2 lags are
 used, where 𝑁 is the sample size.
    If you specify wmatrix(hac kernel opt), then ivregress uses Newey and West’s (1994) algorithm
 for automatically selecting the number of lags to use. Although the authors’ Monte Carlo simulations
 do show that the procedure may result in size distortions of hypothesis tests, the procedure is still useful
 when little other information is available to help choose the number of lags.
    For more on GMM estimation, see Baum (2006); Baum, Schaffer, and Stillman (2003, 2007); Cameron
 and Trivedi (2005); Davidson and MacKinnon (1993); Hayashi (2000); or Wooldridge (2010). See
 Newey and West (1987) and Wang and Wu (2012) for an introduction to HAC covariance matrix estima-
 tion.


Video example
 Instrumental variables regression using Stata



Stored results
   ivregress stores the following in e():
   Scalars
        e(N)                 number of observations
        e(k absorb)          total number of absorbed categories
        e(mss)               model sum of squares
        e(df m)              model degrees of freedom
        e(rss)               residual sum of squares
        e(df r)              residual degrees of freedom
        e(df a)              degrees of freedom for absorbed effect
        e(r2)                𝑅2
        e(r2 a)              adjusted 𝑅2
        e(F)                 𝐹 statistic
        e(rmse)              root mean squared error
        e(N clust)           number of clusters
        e(chi2)              𝜒2
        e(kappa)             𝜅 used in LIML estimator
        e(J)                 value of GMM objective function
        e(wlagopt)           lags used in HAC weight matrix (if Newey–West algorithm used)
        e(vcelagopt)         lags used in HAC VCE matrix (if Newey–West algorithm used)
        e(hac lag)           HAC lag
        e(rank)              rank of e(V)
        e(k endog)           number of endogenous regressors (after factor-variable expansion)
        e(iterations)        number of GMM iterations (0 if not applicable)
   Macros
        e(cmd)               ivregress
        e(cmdline)           command as typed
        e(depvar)            name of dependent variable
        e(endog)             names of endogenous variables
        e(exog)              names of exogenous variables
        e(absvar)            names of absorbed variables
        e(apm)               alternating projection method
        e(constant)          noconstant or hasconstant if specified
        e(wtype)             weight type
        e(wexp)              weight expression
        e(title)             title in estimation output
        e(clustvar)          names of cluster variables
        e(cluster#)          cluster combination #
        e(hac kernel)        HAC kernel
        e(vce)               vcetype specified in vce()
        e(vcetype)           title used to label Std. err.
        e(estimator)         2sls, liml, or gmm
        e(exogr)             exogenous regressors
        e(wmatrix)           wmtype specified in wmatrix()
        e(moments)           centered if center specified
        e(small)             small if small-sample statistics
        e(properties)        b V
        e(estat cmd)         program used to implement estat
        e(predict)           program used to implement predict
        e(footnote)          program used to implement footnote display
        e(marginsok)         predictions allowed by margins
        e(marginsnotok)      predictions disallowed by margins
        e(asbalanced)        factor variables fvset as asbalanced
        e(asobserved)        factor variables fvset as asobserved
   Matrices
        e(b)                 coefficient vector
        e(W)                 weight matrix used to compute GMM estimates



        e(S)                      moment covariance matrix used to compute GMM variance–covariance matrix
        e(V)                      variance–covariance matrix of the estimators
        e(V modelbased)           model-based variance
        e(kabsorb)                number of levels for each absorbed variable
        e(dfabsorb)               adjusted degrees of freedom for each absorbed variable
        e(ksingle)                number of singletons for each absorbed variable
        e(kcluster)               cluster sizes, multiway clustering
    Functions
        e(sample)                 marks estimation sample

 In addition to the above, the following is stored in r():
    Matrices
        r(table)                  matrix containing the coefficients with their standard errors, test statistics, 𝑝-values, and
                                     confidence intervals

 Note that results stored in r() are updated when the command is replayed and will be replaced when any
 r-class command is run after the estimation command.


Methods and formulas
    Methods and formulas are presented under the following headings:
                   Notation
                   Weights
                   2SLS and LIML estimators
                   2SLS estimator with absorb() option GMM estimator


Notation
    Items printed in lowercase and italicized (for example, 𝑥) are scalars. Items printed in lowercase and
 boldfaced (for example, x) are vectors. Items printed in uppercase and boldfaced (for example, X) are
 matrices.
    The model is
                                       y = Yβ1 + X1 β2 + u = Xβ + u
                                    Y = X1 𝚷1 + X2 𝚷2 + V = Z𝚷 + V
 where y is an 𝑁 × 1 vector of the left-hand-side variable; 𝑁 is the sample size; Y is an 𝑁 × 𝑝 matrix of
 𝑝 endogenous regressors; X1 is an 𝑁 × 𝑘1 matrix of 𝑘1 included exogenous regressors; X2 is an 𝑁 × 𝑘2
 matrix of 𝑘2 excluded exogenous variables, X = [Y X1 ], Z = [X1 X2 ]; u is an 𝑁 × 1 vector of errors;
 V is an 𝑁 × 𝑝 matrix of errors; β = [β1 β2 ] is a 𝑘 = (𝑝 + 𝑘1 ) × 1 vector of parameters; and 𝚷 is a
 (𝑘1 + 𝑘2 ) × 𝑝 vector of parameters. If a constant term is included in the model, then one column of X1
 contains all ones.
    The order condition for identification requires that 𝑘2 ≥ 𝑝: the number of excluded exogenous vari-
 ables must be at least as great as the number of endogenous regressors.


Weights
    The weight vector, w, is a function of the 𝑁 × 1 weight vector specified by the user, v, and the weight
 type requested for estimation. The weight type can be one of frequency weights (fweights), analytic
 weights (aweights), sampling weights (pweights), or importance weights (iweights).



    When aweights or pweights are specified, the weights are first normalized to sum up to 𝑁, w =
 (𝑁 /1𝑁 ′ v)v, and then used in calculations.
    When fweights or iweights are specified, the unnormalized weights w = v are used instead. The
 sample size is now assumed to be equal to the sum of the weights; that is, 𝑁 = 1𝑁 ′ w. For iweights,
 this is truncated to an integer. Standard errors and degrees of freedom are calculated using this modified
 sample size.
    Define 𝑐 = 1 if there is a constant in the regression and zero otherwise.
    Let D denote the 𝑁 × 𝑁 matrix with w on the main diagonal and zeros elsewhere. If no weights are
 specified, D is the identity matrix. In the following formulas, if weights are specified, X1 , X, y, and Z
 are replaced with D1/2 X1 , D1/2 X, D1/2 y, and D1/2 Z, respectively. We suppress the D below to simplify
 the notation.


2SLS and LIML estimators
    Define the 𝜅-class estimator of β as

                                  ̂ = {X′ (I − 𝜅MZ )X}−1 X′ (I − 𝜅MZ )y
                                  β

 where MZ = I − Z(Z′ Z)−1 Z′ . The 2SLS estimator results from setting 𝜅 = 1. The LIML estimator
                                                                  ̃ −1/2 Y
                                                           ̃ ′ MZ Y)
 results from selecting 𝜅 to be the minimum eigenvalue of (Y                     ̃ Y
                                                                         ̃ ′ MX Y(        ̃ −1/2 , where
                                                                                   ̃ ′ MZ Y)
 ̃ = [y Y] and MX = I − X1 (X1 X1 ) X1 .
 Y                                 ′    −1 ′

     The total sum of squares (TSS) equals y′ y if there is no intercept and y′ y − {(1′ y)2 /𝑁} otherwise;
                                                                                                   ̂ ′y +
 its associated degrees of freedom is 𝑁 − 𝑐. The error sum of squares (ESS) is defined as y′ y − 2βX
   ′
 ̂ X′ Xβ.
 β       ̂ The model sum of squares (MSS) equals TSS − ESS. The degrees of freedom is 𝑘 − 𝑐.
   The mean squared error, 𝑠2 , is defined as ESS/(𝑁 − 𝑘) if small is specified and ESS/𝑁 otherwise.
 The root mean squared error is 𝑠, its square root.
     If 𝑐 = 1 and small is not specified, a Wald statistic, 𝑊, of the joint significance of the 𝑘−1 parameters
 of β except the constant term is calculated; 𝑊 ∼ 𝜒2 (𝑘 − 1). If 𝑐 = 1 and small is specified, then an 𝐹
 statistic is calculated as 𝐹 = 𝑊 /(𝑘 − 1); 𝐹 ∼ 𝐹 (𝑘 − 1, 𝑁 − 𝑘).
    The 𝑅2 is defined as 𝑅2 = 1 − ESS/TSS.
    The adjusted 𝑅2 is 𝑅a2 = 1 − (1 − 𝑅2 )(𝑁 − 𝑐)/(𝑁 − 𝑘).
    The unadjusted (default) variance estimate is

                                      ̂ unadj = 𝑠2 {X′ (I − 𝜅MZ )X}−1
                                      V

    The robust variance estimator is given by
                                                        𝑁
                     ̂ robust = {X′ (I − 𝜅MZ )X}−1 ( ∑ 𝜖2𝑖̂ x′𝑖̃ x𝑖̃ ){X′ (I − 𝜅MZ )X}−1
                     V
                                                       𝑖=1

                     ̂ x̃𝑖 = Pz𝑖 , and P = (Z′ Z)−1 (Z′ X).
 where 𝜖𝑖̂ = 𝑦𝑖 − x𝑖 β,



    The cluster–robust variance estimator is given by
                                                     𝐺
                  ̂ cluster = {X′ (I − 𝜅MZ )X}−1 ( ∑ X
                  V                                                ̃ 𝑔 ){X′ (I − 𝜅MZ )X}−1
                                                     ̃ ′𝑔 𝑔̂ ′𝑔̂ X
                                                    𝑔=1

                                                                                               ̃ 𝑔 = PZ𝑔 .
 where 𝑔̂ is the 𝑛𝑔 × 1 vector containing the residuals for the observations in cluster 𝑔 and X
    For 𝑝-way clustering in StataNow, with vce(cluster clustvarlist ), a robust covariance matrix is
 formed for each of the 2𝑝 − 1 cluster combinations, and these are then combined; details can be found
 in Multiway clustering in Methods and formulas of [R] regress.
    ivregress 2sls and ivregress liml also support estimation with survey data. For details on VCEs
 with survey data, see [SVY] Variance estimation.


2SLS estimator with absorb() option
     When absorbed variables are specified, we must project the dependent variable, instruments, and
 endogenous variables onto the orthogonal complement of the column space of the absorbed indicator
 matrices. Using the same notation found in the Methods and formulas of [R] areg, we have 𝑚𝑘 categorical
 levels for the 𝑘th absorbed variable, 𝐶𝑘 , and an 𝑁 ×𝑚𝑘 indicator matrix D𝑘 . The orthonormal projection
 matrix for the 𝑘th variable is P𝑘 = D𝑘 (D′𝑘 D𝑘 )−1 D′𝑘 . Thus, the product y𝑘 = P𝑘 y is the projection of
 the dependent variable onto the column space of D𝑘 . That is, y𝑘 is the 𝑁 × 1 vector containing the
 (repeated) means of 𝑦𝑖 for each level of 𝐶𝑘 in the order that these levels appear in the sample. The
 product (I − P𝑘 )y is the vector of the demeaned dependent variable. The same projection (demeaning)
 is applied to the columns of matrices X1 , X2 , and Y. The Halperin or Cimmino iterative algorithm loops
 over the ℎ absorbed variables computing projections as described in Methods and formulas of [R] areg.
    See Methods and formulas in [R] areg for a description of the method used to adjust the degrees of
 freedom to account for collinearity among categorical absorbed variables when the dfabsorb option is
 specified.


GMM estimator
     We obtain an initial consistent estimate of β by using the 2SLS estimator; see above. Using this
 estimate of β, we compute the weight matrix W and calculate the GMM estimator
                                                      −1
                                   ̂
                                   β     = {X′ ZWZ′ X} X′ ZWZ′ y
                                     GMM

                 ̂
 The variance of β     is
                   GMM

                                               −1                      −1
                         ̂
                     Var(β                            ̂
                               ) = 𝑁{X′ ZWZ′ X} X′ ZWSWZ′
                                                          X{X′ ZWZ′ X}
                           GMM

     ̂
 Var(β     ) is of the sandwich form DMD; see [P] robust. If the user specifies the small option,
       GMM
 ivregress implements a small-sample adjustment by multiplying the VCE by 𝑁 /(𝑁 − 𝑘).
    If vce(unadjusted) is specified, then we set Ŝ = W−1 and the VCE reduces to the “optimal” GMM
 variance estimator
                                                               −1
                                  Var(β̂     ) = 𝑁{X′ ZWZ′ X}
                                         GMM

 However, if W−1 is not a good estimator of 𝐸(z𝑖 𝑢𝑖 𝑢𝑖 z′𝑖 ), then the optimal GMM estimator is inefficient,
 and inference based on the optimal variance estimator could be misleading.



   W is calculated using the residuals from the initial 2SLS estimates, whereas S is estimated using the
residuals based on β ̂     . The wmatrix() option affects the form of W, whereas the vce() option
                       GMM
affects the form of S. Except for different residuals being used, the formulas for W−1 and S are identical,
so we focus on estimating W−1 .
   If wmatrix(unadjusted) is specified, then
                                                     𝑠2
                                            W−1 =       ∑ z z′
                                                     𝑁 𝑖 𝑖 𝑖

where 𝑠2 = ∑𝑖 𝑢2𝑖 /𝑁. This weight matrix is appropriate if the errors are homoskedastic.
   If wmatrix(robust) is specified, then
                                           W−1 =      ∑ 𝑢2 z z ′
                                                    𝑁 𝑖 𝑖 𝑖 𝑖
which is appropriate if the errors are heteroskedastic.
   If wmatrix(cluster clustvar) is specified, then
                                            W−1 =      ∑ q q′
                                                     𝑁 𝑐 𝑐 𝑐
where 𝑐 indexes clusters,
                                               q𝑐 = ∑ 𝑢𝑖 z𝑖
                                                     𝑖∈𝑐𝑗

and 𝑐𝑗 denotes the 𝑗th cluster. If vce(cluster clustvarlist ) is specified with multiple cluster variables
and wmatrix() is not specified, then W−1 is computed by summing over the matrices for individual
cluster variables and their combinations in the same way as V in Multiway clustering in Methods and
formulas of [R] regress.
   If wmatrix(hac kernel [ # ]) is specified, then

                         1                1 𝑙=𝑁−1 𝑖=𝑁
                W−1 =      ∑ 𝑢2𝑖 z𝑖 z′𝑖 +    ∑ ∑ 𝐾(𝑙, 𝑚)𝑢𝑖 𝑢𝑖−𝑙 (z𝑖 z′𝑖−𝑙 + z𝑖−𝑙 z′𝑖 )
                         𝑁 𝑖              𝑁 𝑙=1 𝑖=𝑙+1

where 𝑚 = # if # is specified and 𝑚 = 𝑁 − 2 otherwise. Define 𝑧 = 𝑙/(𝑚 + 1). If kernel is nwest,
then
                                              1−𝑧 0≤𝑧 ≤1
                                  𝐾(𝑙, 𝑚) = {
                                              0     otherwise
If kernel is gallant, then

                                        ⎧1 − 6𝑧 2 + 6𝑧 3      0 ≤ 𝑧 ≤ 0.5
                                        {
                               𝐾(𝑙, 𝑚) = 2(1 − 𝑧)3            0.5 < 𝑧 ≤ 1
                                        ⎨
                                        {0                    otherwise
                                        ⎩
If kernel is quadraticspectral, then

                                          1                           𝑧=0
                            𝐾(𝑙, 𝑚) = {
                                          3 {sin(𝜃)/𝜃 − cos(𝜃)} /𝜃2   otherwise

where 𝜃 = 6𝜋𝑧/5.



    If wmatrix(hac kernel opt) is specified, then ivregress uses Newey and West’s (1994) automatic
 lag-selection algorithm, which proceeds as follows. Define h to be a (𝑘1 + 𝑘2 ) × 1 vector containing
 ones in all rows except for the row corresponding to the constant term (if present); that row contains a
 zero. Define

                                          𝑓𝑖 = (𝑢𝑖 z𝑖 )h
                                                  1 𝑁
                                          𝜎̂𝑗 =      ∑ 𝑓𝑓                   𝑗 = 0, . . . , 𝑚∗
                                                  𝑁 𝑖=𝑗+1 𝑖 𝑖−𝑗
                                                    𝑚∗
                                          (𝑞)
                                     𝑠̂         = 2 ∑ 𝜎̂𝑗 𝑗𝑞
                                                    𝑗=1
                                                              𝑚∗
                                     𝑠 ̂(0) = 𝜎̂0 + 2 ∑ 𝜎̂𝑗
                                                              𝑗=1

                                                                     2   1/2𝑞+1
                                                     𝑠 ̂(𝑞)
                                           𝛾̂ = 𝑐𝛾 {( (0) ) }
                                                     𝑠̂
                                               ̂ 1/(2𝑞+1)
                                          𝑚 = 𝛾𝑁

 where 𝑞, 𝑚∗ , and 𝑐𝛾 depend on the kernel specified:

                               Kernel                     𝑞                  𝑚∗                    𝑐𝛾
                               Bartlett                   1         int {20(𝑇 /100)2/9 }         1.1447
                                                                                      4/25
                               Parzen                     2         int {20(𝑇 /100)          }   2.6614
                                                                                      2/25
                        Quadratic spectral                2         int {20(𝑇 /100)          }   1.3221

 where int(𝑥) denotes the integer obtained by truncating 𝑥 toward zero. For the Bartlett and Parzen
 kernels, the optimal lag is min{int(𝑚), 𝑚∗ }. For the quadratic spectral, the optimal lag is min{𝑚, 𝑚∗ }.
   If wmatrix(hac kernel opt #) is specified, then ivregress uses # instead of 20 in the definition of
 𝑚∗ above to select the optimal lag.
    If center is specified, when computing weight matrices ivregress replaces the term 𝑢𝑖 𝑧𝑖 in the
 formulas above with 𝑢𝑖 z𝑖 − 𝑢z, where 𝑢z = ∑𝑖 𝑢𝑖 z𝑖 /𝑁.


References
 Anatolyev, S., and A. Skolkova. 2019. Many instruments: Implementation in Stata. Stata Journal 19: 849–866.
 Andrews, D. W. K. 1991. Heteroskedasticity and autocorrelation consistent covariance matrix estimation. Econometrica
   59: 817–858. https://doi.org/10.2307/2938229.
 Angrist, J. D., and J.-S. Pischke. 2009. Mostly Harmless Econometrics: An Empiricist’s Companion. Princeton, NJ: Prince-
   ton University Press.
 Basmann, R. L. 1957. A generalized classical method of linear estimation of coefficients in a structural equation. Econo-
   metrica 25: 77–83. https://doi.org/10.2307/1907743.
 Bauldry, S. 2014. miivfind: A command for identifying model-implied instrumental variables for structural equation
   models in Stata. Stata Journal 14: 60–75.
 Baum, C. F. 2006. An Introduction to Modern Econometrics Using Stata. College Station, TX: Stata Press.



Baum, C. F., and A. Lewbel. 2019. Advice on using heteroskedasticity-based identification. Stata Journal 19: 757–767.
Baum, C. F., M. E. Schaffer, and S. Stillman. 2003. Instrumental variables and GMM: Estimation and testing. Stata Journal
  3: 1–31.
———. 2007. Enhanced routines for instrumental variables/generalized method of moments estimation and testing. Stata
 Journal 7: 465–506.
Baum, C. F., D. Tommasi, and L. Zhang. 2024. Estimating treatment effects when program participation is misreported.
  Stata Journal 24: 614–629.
Benson, D., M. A. Masten, and A. Torgovitsky. 2022. ivcrc: An instrumental-variables estimator for the correlated
  random-coefficients model. Stata Journal 22: 469–495.
Cameron, A. C., and P. K. Trivedi. 2005. Microeconometrics: Methods and Applications. New York: Cambridge University
  Press.
———. 2022. Microeconometrics Using Stata. 2nd ed. College Station, TX: Stata Press.
Choi, J., and S. Shen. 2019. Two-sample instrumental-variables regression with potentially weak instruments. Stata Jour-
  nal 19: 581–597.
Clarke, D., and B. Matta. 2018. Practical considerations for questionable IVs. Stata Journal 18: 663–691.
Davidson, R., and J. G. MacKinnon. 1993. Estimation and Inference in Econometrics. New York: Oxford University Press.
Deb, P., E. C. Norton, and W. G. Manning. 2017. Health Econometrics Using Stata. College Station, TX: Stata Press.
Desbordes, R., and V. Verardi. 2012. A robust instrumental-variables estimator. Stata Journal 12: 169–181.
D’Haultfœuille, X., A. Maurel, X. Qiu, and Y. Zhang. 2020. Estimating selection models without an instrument with
  Stata. Stata Journal 20: 297–308.
Dippel, C., A. Ferrara, and S. Heblich. 2020. Causal mediation analysis in instrumental-variables regressions. Stata Journal
  20: 613–626.
Du, K., Y. Zhang, and Q. Zhou. 2020. Fitting partially linear functional-coefficient panel-data models with Stata. Stata
  Journal 20: 976–998.
Finlay, K., and L. M. Magnusson. 2009. Implementing weak-instrument robust tests for a general class of instrumental-
   variables models. Stata Journal 9: 398–421.
Gallant, A. R. 1987. Nonlinear Statistical Models. New York: Wiley. https://doi.org/10.1002/9780470316719.
Greene, W. H. 2018. Econometric Analysis. 8th ed. New York: Pearson.
Hall, A. R. 2005. Generalized Method of Moments. Oxford: Oxford University Press.
Hansen, L. P. 1982. Large sample properties of generalized method of moments estimators. Econometrica 50: 1029–1054.
  https://doi.org/10.2307/1912775.
Hayashi, F. 2000. Econometrics. Princeton, NJ: Princeton University Press.
Judge, G. G., W. E. Griffiths, R. C. Hill, H. Lütkepohl, and T.-C. Lee. 1985. The Theory and Practice of Econometrics.
   2nd ed. New York: Wiley.
Kaplan, D. M. 2022. Smoothed instrumental variables quantile regression. Stata Journal 22: 379–403.
Kmenta, J. 1997. Elements of Econometrics. 2nd ed. Ann Arbor: University of Michigan Press. https://doi.org/10.3998/
  mpub.15701.
Koopmans, T. C., and W. C. Hood. 1953. Studies in Econometric Method. New York: Wiley.
Koopmans, T. C., and J. Marschak. 1950. Statistical Inference in Dynamic Economic Models. New York: Wiley.
Kripfganz, S., and V. Sarafidis. 2021. Instrumental-variable estimation of large-T panel-data models with common factors.
  Stata Journal 21: 659–686.
Lee, H., A. Lewbel, S. M. Schennach, and L. Zhang. 2026. Instrument-free estimation of triangular equation systems
  with the trigmm command. Stata Journal 26: 68–89.
Lee, M., and C. Han. 2024. Ordinary least squares and instrumental-variables estimators for any outcome and hetero-
  geneity. Stata Journal 24: 72–92.
Lee, S., S. Lee, J. Owusu, and Y. Shin. 2023. csa2sls: A complete subset approach for many instruments using Stata. Stata
  Journal 23: 932–941.



Lin, A., D. Tommasi, and L. Zhang. 2024. Bounding program benefits when participation is misreported: Estimation and
   inference with Stata. Stata Journal 24: 185–212.
Newey, W. K., and K. D. West. 1987. A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent
  covariance matrix. Econometrica 55: 703–708. https://doi.org/10.2307/1913610.
———. 1994. Automatic lag selection in covariance matrix estimation. Review of Economic Studies 61: 631–653. https:
 //doi.org/10.2307/2297912.
Nichols, A. 2007. Causal inference with observational data. Stata Journal 7: 507–541.
Palmer, T. M., V. Didelez, R. R. Ramsahai, and N. A. Sheehan. 2011. Nonparametric bounds for the causal effect in a
   binary instrumental-variable model. Stata Journal 11: 345–367.
Pinzon, E. 2016. Estimation under omitted confounders, endogeneity, omitted variable bias, and related problems.
   The Stata Blog: Not Elsewhere Classified. https://blog.stata.com/2017/02/20/estimation-under-omitted-confounders-
   endogeneity-omitted-variable-bias-and-related-problems/.
Poi, B. P. 2006. Jackknife instrumental variables estimation in Stata. Stata Journal 6: 364–376.
Stammann, A. 2018. Fast and feasible estimation of generalized linear models with high-dimensional 𝑘-way fixed effects.
   arXiv:1707.01815 [stat.AP], https://doi.org/10.48550/arXiv.1707.01815.
Stock, J. H., and M. W. Watson. 2019. Introduction to Econometrics. 4th ed. New York: Pearson.
Stock, J. H., J. H. Wright, and M. Yogo. 2002. A survey of weak instruments and weak identification in generalized method
   of moments. Journal of Business and Economic Statistics 20: 518–529. https://doi.org/10.1198/073500102288618658.
Sun, L. 2018. Implementing valid two-step identification-robust confidence sets for linear instrumental-variables models.
  Stata Journal 18: 803–825.
Theil, H. 1953. Repeated Least Squares Applied to Complete Equation Systems. Mimeograph from the Central Planning
  Bureau, The Hague.
Wang, Q., and N. Wu. 2012. Long-run covariance and its applications in cointegration regression. Stata Journal 12:
  515–542.
Wooldridge, J. M. 2010. Econometric Analysis of Cross Section and Panel Data. 2nd ed. Cambridge, MA: MIT Press.
———. 2020. Introductory Econometrics: A Modern Approach. 7th ed. Boston: Cengage.
Wright, P. G. 1928. The Tariff on Animal and Vegetable Oils. New York: Macmillan.
Young, A. 2024. Nearly collinear robust procedures for 2SLS estimation. Stata Journal 24: 93–112.



Also see
 [R] ivregress postestimation — Postestimation tools for ivregress
 [R] cfregress — Control-function linear regression
 [R] gmm — Generalized method of moments estimation
 [R] ivprobit — Probit model with continuous endogenous covariates
 [R] ivqregress — Instrumental-variables quantile regression
 [R] ivtobit — Tobit model with continuous endogenous covariates
 [R] reg3 — Three-stage estimation for systems of simultaneous equations
 [R] regress — Linear regression+
 [ERM] eregress — Extended linear regression
 [FMM] fmm: ivregress — Finite mixtures of linear regression models with endogenous covariates
 [SEM] Intro 5 — Tour of models
 [SP] spivregress — Spatial autoregressive models with endogenous covariates
 [SVY] svy estimation — Estimation commands for survey data
 [TS] forecast — Econometric model forecasting
 [XT] xtivreg — Instrumental variables and two-stage least squares for panel-data models
 [U] 20 Estimation and postestimation commands




 Stata, Stata Press, Mata, NetCourse, and NetCourseNow are registered trademarks of StataCorp
                                                                                                    ®
 LLC. Stata and Stata Press are registered trademarks with the World Intellectual Property Or-
 ganization of the United Nations. StataNow is a trademark of StataCorp LLC. Other brand and
 product names are registered trademarks or trademarks of their respective companies. Copyright
 © 1985–2025 StataCorp LLC, College Station, TX, USA. All rights reserved.
 For suggested citations, see the FAQ on citing Stata documentation.
