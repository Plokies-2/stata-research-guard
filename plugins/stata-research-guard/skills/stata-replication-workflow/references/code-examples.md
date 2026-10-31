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

**More direct for this task:** the outcome is mechanical; the two research specifications remain visible beside their saved estimates.

```stata
foreach outcome in wage hours {
    regress `outcome' age grade, vce(robust)
    estimates save "estimates/`outcome'_m1.ster", replace

    regress `outcome' age grade ttl_exp tenure, vce(robust)
    estimates save "estimates/`outcome'_m2.ster", replace
}
```

The loop iterator remains useful. Copying both model blocks once per outcome would add maintenance work without clarifying a research choice. Conversely, do not combine outcomes whose sample restrictions or transformations differ merely because the regression lines look similar. Preserve a real shared configuration or external interface when the project requires it. The robust VCE and common sample here come from the hypothetical request, not from a default recommendation.

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

In a real project, keep the new variable's label and codebook definition with the authorized variable change. This fragment illustrates prediction, not a complete data-delivery workflow.

## Keep an intermediate value when returned results will change

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

`wage_mean` is not a redundant alias: it preserves a result across a command that overwrites it. If the mean is consumed immediately, use `r(mean)` directly. If the result must survive the do-file or be combined into a saved-model table, use the relevant documented storage/export interface; a local macro does not persist across sessions. Keep distinct samples distinct rather than replacing each model's sample mean with one full-sample mean.

## Small edits and justified exceptions

- **A legend label changes:** patch that label in the maintained producer, reuse suitable stored results, and inspect the affected export. A new analysis file, an unrelated estimation rerun, or another paper search does not follow from the label change. An unfamiliar option or a changed statistic still needs relevant help.
- **Two related models have different samples:** keep those restrictions visible. Combining them into a dispatcher to remove similar-looking lines can obscure the comparison.
- **A documented resampling command needs a callback:** retain the narrow statistic callback and the visible model call. Avoiding every `program` by manually implementing the resampling algorithm would defeat the purpose. An estimator wrapper that hides the research specification is a different case.
- **The existing block is already direct:** retain it. The existence of an illustration is not a reason to rewrite adequate code, remove meaningful intermediates, or impose its variable names and estimator.

## Sources and scope

Stata grammar and returned-state behavior are supported by the bundled official help in `data/command_help_guides/` (relative to the plugin root): `regress.txt`, `generate.txt`, `predict.txt`, `summarize.txt`, and `estimates_save.txt`. Use Guard for the affected interface, as described in [command-evidence.md](command-evidence.md); these examples do not replace current command evidence.

The presentation borrows the idea of a bounded comparison from [OpenCode's TypeScript guidance](https://github.com/anomalyco/opencode/blob/dev/AGENTS.md) and [ECC's Python patterns](https://github.com/affaan-m/ECC/blob/main/skills/python-patterns/SKILL.md). [Posit's R style skill](https://github.com/posit-dev/skills/blob/main/r-lib/r-tidyverse-style/SKILL.md) usefully separates style cleanup from behavior changes and preserves meaningful intermediates. All Stata snippets above were written for this reference; no foreign-language code or blanket restrictions on loops, helpers, or error handling were copied.

For original research workflows, use [paper-workflow-reading.md](paper-workflow-reading.md). The public repository's [fresh-session comparison](https://github.com/Plokies-2/stata-research-guard/tree/main/examples/fresh-session-workflow) is a separate observed authoring case. Its scripts and execution account show concrete differences, not a universal improvement estimate or an answer template.
