# Readable Stata: decisions and examples

Read the section relevant to the current choice. These are small, authored illustrations, not original paper code or measured evidence of skill effectiveness. Apply them within the authorized block, using the project's actual specification and the command-evidence rules. A shorter version is useful only when the researcher can more easily follow or change the analysis.

## Mechanical repetition, visible research specifications

Suppose the requested analysis uses the already prepared common sample, outcomes `wage` and `hours`, and two OLS specifications with robust standard errors. The `estimates` output directory already exists; replacing these derived estimates is authorized.

**Harder to follow:** the reader decodes a numbered specification before knowing which controls a saved model contains.

```stata
foreach outcome in wage hours {
    forvalues model = 1/2 {
        local controls "age grade"
        if `model' == 2 local controls "age grade ttl_exp tenure"
        regress `outcome' `controls', vce(robust)
        estimates save "estimates/`outcome'_m`model'.ster", replace
    }
}
```

**More direct for this task:** the outcome is mechanical; the two research specifications remain visible beside their saved estimates, and each group is named once for what it holds.

```stata
global labor "wage hours"
global demographics "age grade"
global work_history "$demographics ttl_exp tenure"

foreach outcome of global labor {
    regress `outcome' $demographics, vce(robust)
    estimates save "estimates/`outcome'_m1.ster", replace

    regress `outcome' $work_history, vce(robust)
    estimates save "estimates/`outcome'_m2.ster", replace
}
```

The loop iterator remains useful. Copying both model blocks once per outcome would add maintenance work without clarifying a research choice. Conversely, do not combine outcomes whose sample restrictions or transformations differ merely because the regression lines look similar. Preserve a real shared configuration or external interface when the project requires it. The robust VCE and common sample here come from the hypothetical request, not from a default recommendation.

## Name each outcome group once and reuse it everywhere

Suppose an event study estimates board, financial and employment outcomes, summarizes them in 2019, and plots each estimate. The prepared panel is loaded.

**Harder to follow:** the same members are retyped for each use, and the figure step keeps its own names for parts of the groups.

```stata
summarize roa roe leverage emp ln_emp if year == 2019
foreach y in roa roe leverage emp ln_emp {
    reghdfe `y' ib2019.year##i.treated, absorb(firm year industry#year) vce(cluster firm)
    estimates store m_`y'
}
local axis_returns "roa roe"
local axis_emp "emp ln_emp"
foreach y of local axis_returns {
    coefplot m_`y', keep(2017.year#1.treated 2018.year#1.treated 2020.year#1.treated)
}
```

**Easier to follow:** one block names the outcome groups; every later step reads them by name, so `$financial` says what is estimated, summarized or plotted without scrolling up. The fixed effects, clustering and the exported coefficient range stay in the commands that use them.

```stata
global financial "roa roe leverage"
global employment "emp ln_emp"
global outcomes "$financial $employment"

summarize $outcomes if year == 2019
foreach y of global outcomes {
    reghdfe `y' ib2019.year##i.treated, absorb(firm year industry#year) vce(cluster firm)
    estimates store `y'
}
foreach y of global financial {
    coefplot `y', keep(2017.year#1.treated 2018.year#1.treated 2020.year#1.treated)
}
```

Moving `absorb()` into `$main_fe` or the `keep()` list into `$event_terms` would shorten the lines but make the reader leave the command to learn the specification and the plotted range. Each model is stored under its outcome name, so no second name is needed to find it. `y` stays a local because it only lives inside its loop. A group used for a shared y-axis is the same `$financial`, not a second macro. When one figure genuinely needs a different subset, name that subset for its contents and build it from the existing globals.

## Use native predictions while preserving the requested sample

Suppose `regress price weight mpg i.foreign if rep78 >= 3 & rep78 < .` has just run successfully on Stata's `auto` data. The user wants fitted prices only for observations used in that regression. `price_hat` does not yet exist.

**Harder to maintain:** manually rebuilding the fitted value duplicates the model and its factor coding.

```stata
generate double price_hat = _b[_cons] + _b[weight]*weight + ///
    _b[mpg]*mpg + _b[1.foreign]*(foreign == 1) if e(sample)
```

**More direct:** after `regress`, the default prediction is the linear fitted value.

```stata
predict double price_hat if e(sample)
```

The prediction follows the active model, including its factor terms. `if e(sample)` is substantive: without it, `predict` can also predict for observations excluded from estimation. Do not add this restriction when the user wants out-of-sample predictions. Another estimator can have a different default statistic; consult that estimator's postestimation help. Compute sample-dependent quantities before another model replaces the active results. Loading a `.ster` with `estimates use` does not recover the original `e(sample)`.

In a real project, keep the new variable's label with the authorized variable change and update its concise definition when the project maintains a codebook; follow [codebook.md](codebook.md) for the initial question and minimal entries. This fragment illustrates prediction, not a complete data-delivery workflow.

## Keep returned results with their producer and lifetime

Suppose the current regression is for `wage`, and the researcher wants to report its estimation-sample mean after inspecting `hours` in the same sample.

**Incorrect handoff:** the second summary replaces the first `r(mean)`.

```stata
summarize wage if e(sample), meanonly
summarize hours if e(sample)
display "Mean wage in estimation sample: " r(mean)
```

**Preserve the needed value near its producer:**

```stata
summarize wage if e(sample), meanonly
local wage_mean = r(mean)
summarize hours if e(sample)
display "Mean wage in estimation sample: " `wage_mean'
```

`wage_mean` is not a redundant alias: it preserves a result across a command that overwrites it. If the mean is consumed immediately, use `r(mean)` directly. If the result must survive the do-file or be combined into a saved-model table, use the relevant documented storage/export interface; a local macro does not persist across sessions.

Preserving a value's lifetime does not make it belong to another result. Suppose the requested regressions use their own available observations, and the report needs an unweighted outcome mean for each estimation sample. The data are already loaded; adding `tenure` may exclude observations with missing values even though both models use `wage` from the same dataset. Computing a mean after only the last regression and reusing it for both models can therefore mislabel the first model's summary.

**Keep the sample and consumer together:**

```stata
regress wage age grade, vce(robust)
summarize wage if e(sample), meanonly
display "Model 1 estimation-sample mean: " r(mean)

regress wage age grade tenure, vce(robust)
summarize wage if e(sample), meanonly
display "Model 2 estimation-sample mean: " r(mean)
```

The display stands in for the immediate consumer. For a table assembled later, retain each summary with its model through the exporter's documented interface before later commands replace it; changing the storage mechanism alone does not preserve the association. A scalar or macro evaluated during later table assembly is not automatically evaluated in each saved model's original sample. Neither the same outcome nor equal N establishes equal observations, weights or definitions. The same reasoning applies to subgroup summaries, transformations and other sample-dependent results, not just means.

Do not recompute identical quantities or impose model-specific summaries when the requested statistic is explicitly common. If the research design requires a common sample and the relevant inputs and definitions coincide, a shared summary is valid. A descriptive mean for a separate population is also valid when labeled as such. Preserve that choice, and revisit the handoff when a changed model, sample, weighting or definition affects it. These unweighted OLS fragments illustrate the association; other estimators and weighted statistics need their relevant help.

## Small edits and justified exceptions

- **A legend label changes:** patch that label in the maintained producer, reuse suitable stored results, and inspect the affected export. A new analysis file, an unrelated estimation rerun, or another paper search does not follow from the label change. An unfamiliar option or a changed statistic still needs relevant help.
- **Two related models have different samples:** keep those restrictions visible. Combining them into a dispatcher to remove similar-looking lines can obscure the comparison.
- **A documented resampling command needs a callback:** retain the narrow statistic callback and the visible model call. Avoiding every `program` by manually implementing the resampling algorithm would defeat the purpose. An estimator wrapper that hides the research specification is a different case.
- **The existing block is already direct:** retain it. The existence of an illustration is not a reason to rewrite adequate code, remove meaningful intermediates, or impose its variable names and estimator.

## Sources and scope

Stata grammar and returned-state behavior are supported by the bundled official help in `data/command_help_guides/` (relative to the plugin root): `regress.txt`, `generate.txt`, `predict.txt`, `summarize.txt`, and `estimates_save.txt`. Use Guard for the affected interface, as described in [command-evidence.md](command-evidence.md); these examples do not replace current command evidence.

The presentation borrows the idea of a bounded comparison from [OpenCode's TypeScript guidance](https://github.com/anomalyco/opencode/blob/dev/AGENTS.md) and [ECC's Python patterns](https://github.com/affaan-m/ECC/blob/main/skills/python-patterns/SKILL.md). [Posit's R style skill](https://github.com/posit-dev/skills/blob/main/r-lib/r-tidyverse-style/SKILL.md) usefully separates style cleanup from behavior changes and preserves meaningful intermediates. All Stata snippets above were written for this reference; no foreign-language code or blanket restrictions on loops, helpers, or error handling were copied.

For original research workflows, use [paper-workflow-reading.md](paper-workflow-reading.md). The public repository's [fresh-session comparison](https://github.com/Plokies-2/stata-research-guard/tree/main/examples/fresh-session-workflow) is a separate observed authoring case. Its scripts and execution account show concrete differences, not a universal improvement estimate or an answer template.
