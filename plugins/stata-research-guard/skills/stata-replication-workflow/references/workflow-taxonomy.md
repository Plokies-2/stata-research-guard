# Workflow taxonomy

Every project should cover the stages that apply to its estimand and data source.

## 1. Import

Record the source, version or collection date, expected unit, and initial observation count. Raw inputs are read-only.

## 2. Integrity audit

Check candidate keys, duplicates, missingness, valid ranges, code values, and exclusions before substantive transformations.

## 3. Cleaning and labels

Make transformations explicit. Define new variables next to their creation, preserve original labels, and label new variables before saving Stata data.

## 4. Merge and reshape

Assert key uniqueness on both inputs and use the correct cardinality. Declare retained states with `merge`'s `keep()` option, or inspect and assert `_merge`; record the change in observation counts.

## 5. Panel construction

Define unit and time, verify unit-time uniqueness, create treatment timing and event time, and check their ranges and never-treated cases.

## 6. Descriptives, balance, and sample flow

Report core distributions, missingness, treatment-control comparisons when applicable, and the full sequence of N from source data to the estimation sample and each output.

## 7. Estimation

For every specification, make outcome, treatment, controls, sample restriction, fixed effects, clustering, weights, and N directly visible.

## 8. Robustness

Connect each check to a concrete identification threat. Pre-specify placebo outcomes, alternative samples, timing tests, and heterogeneity rather than selecting favorable results.

## 9. Figures

Generate figures from named inputs with explicit units, axis labels, reference periods, confidence intervals, and output paths.

## 10. Exports

Keep tables and figures tied to live or stored estimates or named intermediate data. Avoid manual coefficient transfer. Final regression Excel tables use `outreg2`, with wide columns ordered by outcome and control specification and exactly two added statistic rows: adjusted R-squared and the estimation-sample dependent-variable mean. This final assembly rule does not prescribe how estimates were produced or stored. Use PDF for figures and `.ster` only when reusable estimation results are needed. Do not create or recommend TeX outputs.

## 11. Master orchestration

Prefer one top-level master with a Stata version, one user-set project root, derived paths, logging, a preparation master, and an analysis master. Keep setup metadata and installation preflight branches out of the research project. Preserve a root Makefile when the researcher package uses it to expose the do-file execution order. Either orchestrator should fail on substantive errors.

Across all stages, loop depth 1 is preferred and loop depth 2 is the maximum. Use depth 2 only when two plain named lists or numeric ranges repeat the same mechanical body, the code reduction is substantial, and the sample, estimand, specification, grouping, and output placement remain visible. Never use depth 3, positional job records, or nesting hidden inside helper programs.

## Atomic block rule

Split examples into the smallest substantively complete state transitions: load, combine, clean, key audit, merge or reshape, sample construction, treatment timing, estimation, `e(sample)` summary, robustness, table or figure assembly, and export. Each block records its required input state, produced output state, valid neighbors, incompatibilities, minimal edit fields, and provenance.

When researchers use different methods for the same checkpoint, keep them under one variant group with separate conditions and tradeoffs. Select one compatible variant; do not splice variants by default. Blocks adjudicated `drop` remain available only as anti-pattern evidence.
