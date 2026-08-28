# General authoring rules

These rules always apply to every Stata code-writing task. They govern direct implementation, selection and adaptation of a template, composition of several atomic transitions, and revision after lint, runtime, or output evidence. They are the baseline authoring contract, not a fallback path and not a source of substantive research choices.

This is the plugin's researcher-readability house style. In particular, its descriptive-`global` preference is an explicit house convention for researcher-facing generated or currently revised code, not a universal Stata textbook rule. An AEA or other replication-package template may satisfy archive and reproducibility requirements without satisfying these point-of-use readability rules; conversely, this style does not by itself certify journal compliance.

Use this priority order:

1. the user and project contract fixes the sample, estimand, merge key, treatment rule, model, event axis, sheet group, and output placement;
2. these general rules govern every implementation;
3. a genuinely compatible template may provide an optional source-backed implementation for one complete atomic transition.

## Template selection and adaptation

Search the dictionary and approved corpus for each substantive atomic transition. Select a template only when its input state, output state, method, control flow, required interface, input profile, and output contract cover that entire transition after the declared bindings are applied.

Every template adaptation must still follow these general rules. Bind only the declared variable, key, path, estimate, workbook, sheet, precision, and other `minimal_edit_fields` or `required_changes`. Apply a necessity gate: keep only statements needed for the current transition, while preserving the selected template's algorithm, state contract, and required safety checks.

If the requested change would alter the template's frame, algorithm, control flow, estimate handoff, caller interface, or output contract, stop treating it as a template implementation. When a natural state boundary exists, split the work into smaller atomic transitions and retain the template only for the complete compatible transition. Otherwise write the transition under `general_rule`; the nearest inspected template may remain a nonbinding hint for commands, ordering, state handling, or output idioms. Do not splice templates or progressively rewrite a near miss while continuing to claim template provenance.

For a general-rule implementation, record `nearest_template_hint=<label_id|none>`, `template_status=<no_suitable_template|wrong_selection|project_specific_contract>`, and `hint_used=<borrowed idea or none>` when the selected report policy or persistent audit requires provenance. Rank-relative nearest does not establish compatibility, and no argument that the direct implementation is superior is required.

## Research-choice and stop boundary

Implement only an already-declared input-to-output transition. Keep the declared sample, estimand, merge key, treatment rule, model, event axis, sheet group, and output placement. General rules never supply a missing substantive decision or bypass a merge-key, sample, estimator, event-axis, raw-table, sheet-cardinality, or output contract.

Stop and obtain the missing contract rather than improvising when a substantive rule, an event-study axis profile, or the final Excel output flow is unresolved. In particular, a multi-sheet workbook needs the compatible canonical formatter; do not evade it with a new helper or a direct substitute.

## Readability and implementation scale

Use this implementation priority: correctness, point-of-use readability, artifact-based restartability, then brevity, DRY, and modularity. A reader may open a do-file at the relevant section rather than reading every definition from the top. Keep the active transformation, sample, model, and output legible at that point.

For a new applied-micro panel project or an explicitly approved overhaul that actually needs preparation, summary, and estimation, default to this unnumbered execution spine. Other profiles create only the requested stages and outputs:

```text
masters.do
do/build_analysis_panel.do
do/build_summary.do
do/run_regressions.do
```

`build_analysis_panel.do` completes all preprocessing shared by descriptive statistics and regressions, labels and checks persistent variables, and saves one analysis-ready cleaned panel. `build_summary.do` and `run_regressions.do` each reopen that panel independently. They do not rely on an incidental in-memory dataset, estimate, frame, or matrix left by a preceding file. Summary outputs may include Excel and descriptive PDFs such as bar charts. Regression outputs may include Excel, reusable `.ster`, and event-study PDFs.

Do not mechanically apply this layout to a partial repair of a compatible existing project. A coherent do-file around 1000 lines may remain one file: add section headings before splitting it. Split only at a durable artifact boundary, an independently runnable stage, genuine reuse, an ownership boundary, or a genuinely distinct responsibility. A conceptual checkpoint or function-sized idea is not by itself a reason to make another file. The 1000-line figure is guidance, never a lint threshold.

## Concise implementation rule

Write the shortest readable Stata sequence with one final implementation path and shallow indentation. Prefer one active loop. A flat `foreach` or `forvalues` loop may bind a real plain list; Stata's programming manual specifies its brace layout and recommends direct varlist iteration over tokenized numbered macros ([`[P] Programming`](https://www.stata.com/manuals/p.pdf)). Exactly two active loop levels are allowed only when both axes are plain named lists or numeric ranges, the same mechanical body repeats, the reduction is substantial, and sample, estimand, specification, grouping, and output placement remain visible at the loop site. Never use loop depth 3 or hide another loop in a helper.

For long macro varlists and other long enumerations, use whitespace and multiline alignment to expose meaningful groups. A typical shape is:

```stata
global outcomes_all ///
    female_bm       female_bmo       female_bmi       ///
    female_ratio_bm female_ratio_bmo female_ratio_bmi
```

Keep short lists on one line. Do not align or reflow quoted labels, paths, notes, or other strings where whitespace is data. Every `///` must continue on the immediately following physical line, and the final line must omit it.

Use a direct literal for a one-use binding. Otherwise prefer a descriptive `global` defined or redefined in the do-file that consumes it. Setup may keep shared directory roots, but it must not be the remote home of outcome lists, regression controls, samples, event windows, fixed effects, clustering choices, or other specification shortcuts. Outcome-list globals belong in `run_regressions.do`. Put a leaf artifact binding beside its consumer unless two or more files share a real producer-consumer contract:

```stata
* masters.do
global table "$project/table"

* do/build_summary.do
global summary_excel "$table/summary_statistics.xlsx"
```

Never chain aliases such as `controls_current -> controls_2019 -> controls_base`. In newly generated or currently revised regression code, use zero substantive reference depth: treatment or event window, controls, sample, fixed effects, weights, and VCE appear literally in the estimator block. The only normal mechanical indirection is one local outcome iterator in one flat outcome loop. If those substantive choices differ, use separate visible blocks instead of a conditional `current` alias. In a read-only audit of untouched existing code, treat deeper reference structure as an advisory for the relevant repair scope, not an automatic blocking error.

For newly generated or currently revised regression code, reserve `local` for obvious lexical cases such as loop iterators, `program` syntax or internal state, tempfile/tempvar/tempname handling, per-iteration scratch state, and an immediately consumed `r()` or `e()` result. These examples do not authorize hiding a model specification. Do not try to infer lexical necessity across every Stata context or execution state, and do not block an untouched existing project on that basis. Existing approved multi-sheet or graph helpers may retain necessary locals inside their programs and loops. Stata defines `///` as joining the next line to the current command, so use it only when the immediately following physical line continues that command, indent continuation lines beyond the command start, and omit it from the final option or line ([Stata User's Guide](https://www.stata.com/manuals/u.pdf)). A blank line, comment-only line, closing brace, `end`, or new command must not follow `///`.

The following point-of-use example deliberately keeps the two model specifications visible. Its variable names are illustrative bindings, not a required project schema:

```stata
reghdfe female_bm                                      ///
    i(2015/2018 2020/2024).year#1.treat2019           ///
    absorb(fid year##c.(ln_AT_real_2019 DR_2019       ///
                        ln_age_2019 ln_sales_real_2019 ///
                        cashflow_rate_2019))           ///
    vce(cluster fid)

reghdfe sales_growth_real                              ///
    i(2015/2018 2020/2024).year#1.treat2019           ///
    absorb(fid year##c.(ln_AT_real_2019 DR_2019       ///
                        ln_age_2019 cashflow_rate_2019)) ///
    vce(cluster fid)
```

The compact `i(numlist).var` form is official factor-variable syntax and the block above remains a good official example. It is not a general auto-selection rule: use it as the frozen project form only after Stata runtime confirms the actual factor support, omitted level, and exact raw `e(b)` names. Stata factor levels must be nonnegative integers, so recode a signed relative-time variable to a nonnegative index and restore negative relative-time text only in graph labels. A confirmed compact form fits a regular displayed window whose minimum-to-maximum support has exactly one omitted interior reference. Use a level-by-level native no-base list for an irregular window, a boundary reference, or a case whose runtime coefficient contract is not yet confirmed. Use one `#` on the event-study RHS. Source syntax never authorizes guessed coefficient tokens.

Do not add a registry, dispatcher, positional job string with downstream `word` parsing, wrapper, one-use `program`, hidden branch, unused option, future-facing interface, or needless intermediate variable. Repeatedly defining a program inside a `foreach` is also structurally unsafe because Stata parses `end` as the end of the enclosing do-file; the community discussion demonstrates why that definition must be outside the brace block ([Statalist](https://www.statalist.org/forums/forum/general-stata-discussion/general/1681139-writing-a-program-within-a-foreach-loop-in-stata-avoiding-error-r-1)). The one standing program exception is the canonical `outreg2_xlsx` formatter for a workbook with two or more sheets.

These limits favor code a reader can follow, share, and verify, rather than generality for hypothetical callers; this is consistent with the readability goal in the [Google R Style Guide](https://google.github.io/styleguide/Rguide.html). Keep comments to project-local reasons that code alone cannot show.

## Safety and estimation contracts

- Record named observation counts after every consequential restriction and retained-state merge so the sample flow from raw input to each reported table and figure is auditable.
- Do not probe or install dependencies. Do not use `capture` to swallow a core error; a legitimate narrowly scoped check must immediately handle `_rc` and surface failure.
- Do not use `merge m:m`, force-drop records, or use `force` to silence a merge-type mismatch. Declare and check the intended key and match result instead. Stata documents explicit merge cardinalities and `assert()` expectations in its [merge manual](https://www.stata.com/manuals/dmerge.pdf); its community guidance warns that `m:m` is usually not the intended analysis join ([Statalist archive](https://www.stata.com/statalist/archive/2013-06/msg00077.html)).
- Preserve native factor-variable expressions and the raw `e(b)` coefficient names. Do not create manual event dummies, rename event coefficients, or reconstruct coefficient tables. Inspect exact names with `coeflegend` or `e(b)`; Stata documents `coeflegend` for this purpose in its [factor-variable FAQ](https://www.stata.com/support/faqs/statistics/compute-standard-errors-with-margins/).
- Preserve raw `outreg2` model header, dependent-variable header, coefficient, standard-error, omitted/base, and note rows. Do not filter or synthesize them.

## Output rule

For one sheet in a workbook, use visible direct `outreg2 replace/append` with an explicit `.xls` target and no program. For two or more sheets in the same workbook, use only the canonical `.xlsx` formatter with readable ordered estimate names, workbook, sheet, and precision; it must not estimate, transform research data, reconstruct coefficients, relabel headers, choose groups, or hide iteration. The number of model columns or separate one-sheet workbooks does not trigger the formatter.

`build_summary.do` may produce Excel and descriptive PDFs such as bar charts. `run_regressions.do` may produce Excel, event-study PDFs, and durable `.ster` only when reusable estimation states are needed. Do not emit TeX. Lint the completed target, verify runtime state and each declared output, and remove superseded attempts before freezing.

## Required root `report.md` record

After creating or revising substantive Stata code under `report_policy: required`, record each final implementation span in the project-root `report.md`. Use `template` when the selected template still covers the complete atomic transition after permitted adaptation. Use `general_rule` when no complete compatible template was used. Each row contains the actual project-relative `.do` path, one-based inclusive `start-end` lines, checkpoint or `unmapped`, and label ID or `-`.

A `general_rule` row records `nearest_template_hint=<label_id|none>; template_status=<no_suitable_template|wrong_selection|project_specific_contract>; hint_used=<borrowed idea|none>`. This is provenance about template inspection, not a claim that general-rule code is an exception or degraded result. Keep provenance out of the `.do` source.

```markdown
| mode | target | lines | checkpoint | label_id | reason |
| --- | --- | --- | --- | --- | --- |
| general_rule | analysis/02_estimate.do | 18-24 | estimation.conventional | - | nearest_template_hint=estimation.ols_visible_specs_eststo.v1; template_status=wrong_selection; hint_used=regression and vce option ordering. |
```

Do not overlap recorded implementation ranges. Harmless primitives and the declared master shell remain unrecorded. Legacy `general_rule_fallback` rows and `fallback_trigger` fields may be accepted only as read compatibility; new plans, reports, and tool outputs use `general_rule` and `template_status`.
