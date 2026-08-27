# General authoring rules

These rules always apply to every Stata code-writing task. They govern direct implementation, selection and adaptation of a template, composition of several atomic transitions, and revision after lint, runtime, or output evidence. They are the baseline authoring contract, not a fallback path and not a source of substantive research choices.

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

## Concise implementation rule

Write the shortest readable Stata sequence with one final implementation path and shallow indentation. Prefer one active loop. A flat `foreach` or `forvalues` loop may bind a real plain list; Stata's programming manual specifies its brace layout and recommends direct varlist iteration over tokenized numbered macros ([`[P] Programming`](https://www.stata.com/manuals/p.pdf)). Exactly two active loop levels are allowed only when both axes are plain named lists or numeric ranges, the same mechanical body repeats, the reduction is substantial, and sample, estimand, specification, grouping, and output placement remain visible at the loop site. Never use loop depth 3 or hide another loop in a helper.

For long macro varlists and other long enumerations, use whitespace and multiline alignment to expose meaningful groups. A typical shape is:

```stata
global outcomes_all ///
    female_bm       female_bmo       female_bmi       ///
    female_ratio_bm female_ratio_bmo female_ratio_bmi
```

Keep short lists on one line. Do not align or reflow quoted labels, paths, notes, or other strings where whitespace is data. Every `///` must continue on the immediately following physical line, and the final line must omit it.

Reserve `global` for an intentional interface consumed across do-files. Setup may keep shared directory roots, but not a leaf filename used by only one child do-file. Put that binding beside its consumer:

```stata
* setup.do
global table "$project/table"

* 04_export_excel.do
local summary_excel "$table/policy_appointment_summary_definition2.xlsx"
```

Keep a leaf filename global only when two or more do-files intentionally share that exact producer-consumer artifact contract. Keep repeated regression-specific controls, sample conditions, event-study RHS terms, fixed effects, and clustering definitions in `local` macros beside the specifications that consume them; keep a one-use list explicit in the command when that is clearer. Same-file event selectors, coefficient order, axis labels, reference positions, and graph notes are local too; use a direct literal when it is clearer and used once. Stata defines `///` as joining the next line to the current command, so use it only when the immediately following physical line continues that command, indent continuation lines beyond the command start, and omit it from the final option or line ([Stata User's Guide](https://www.stata.com/manuals/u.pdf)). A blank line, comment-only line, closing brace, `end`, or new command must not follow `///`.

Do not add a registry, dispatcher, positional job string with downstream `word` parsing, wrapper, one-use `program`, hidden branch, unused option, future-facing interface, or needless intermediate variable. Repeatedly defining a program inside a `foreach` is also structurally unsafe because Stata parses `end` as the end of the enclosing do-file; the community discussion demonstrates why that definition must be outside the brace block ([Statalist](https://www.statalist.org/forums/forum/general-stata-discussion/general/1681139-writing-a-program-within-a-foreach-loop-in-stata-avoiding-error-r-1)). The one standing program exception is the canonical `outreg2_xlsx` formatter for a workbook with two or more sheets.

These limits favor code a reader can follow, share, and verify, rather than generality for hypothetical callers; this is consistent with the readability goal in the [Google R Style Guide](https://google.github.io/styleguide/Rguide.html). Keep comments to project-local reasons that code alone cannot show.

## Safety and estimation contracts

- Do not probe or install dependencies. Do not use `capture` to swallow a core error; a legitimate narrowly scoped check must immediately handle `_rc` and surface failure.
- Do not use `merge m:m`, force-drop records, or use `force` to silence a merge-type mismatch. Declare and check the intended key and match result instead. Stata documents explicit merge cardinalities and `assert()` expectations in its [merge manual](https://www.stata.com/manuals/dmerge.pdf); its community guidance warns that `m:m` is usually not the intended analysis join ([Statalist archive](https://www.stata.com/statalist/archive/2013-06/msg00077.html)).
- Preserve native factor-variable expressions and the raw `e(b)` coefficient names. Do not create manual event dummies, rename event coefficients, or reconstruct coefficient tables. Inspect exact names with `coeflegend` or `e(b)`; Stata documents `coeflegend` for this purpose in its [factor-variable FAQ](https://www.stata.com/support/faqs/statistics/compute-standard-errors-with-margins/).
- Preserve raw `outreg2` model header, dependent-variable header, coefficient, standard-error, omitted/base, and note rows. Do not filter or synthesize them.

## Output rule

For one sheet in a workbook, use visible direct `outreg2 replace/append` with an explicit `.xls` target and no program. For two or more sheets in the same workbook, use only the canonical `.xlsx` formatter with readable ordered estimate names, workbook, sheet, and precision; it must not estimate, transform research data, reconstruct coefficients, relabel headers, choose groups, or hide iteration. The number of model columns or separate one-sheet workbooks does not trigger the formatter.

Keep figures as PDF and durable estimates as `.ster` only when needed. Do not emit TeX. Lint the completed target, verify runtime state and each declared output, and remove superseded attempts before freezing.

## Required root `report.md` record

After creating or revising substantive Stata code under `report_policy: required`, record each final implementation span in the project-root `report.md`. Use `template` when the selected template still covers the complete atomic transition after permitted adaptation. Use `general_rule` when no complete compatible template was used. Each row contains the actual project-relative `.do` path, one-based inclusive `start-end` lines, checkpoint or `unmapped`, and label ID or `-`.

A `general_rule` row records `nearest_template_hint=<label_id|none>; template_status=<no_suitable_template|wrong_selection|project_specific_contract>; hint_used=<borrowed idea|none>`. This is provenance about template inspection, not a claim that general-rule code is an exception or degraded result. Keep provenance out of the `.do` source.

```markdown
| mode | target | lines | checkpoint | label_id | reason |
| --- | --- | --- | --- | --- | --- |
| general_rule | analysis/02_estimate.do | 18-24 | estimation.conventional | - | nearest_template_hint=estimation.ols_visible_specs_eststo.v1; template_status=wrong_selection; hint_used=regression and vce option ordering. |
```

Do not overlap recorded implementation ranges. Harmless primitives and the declared master shell remain unrecorded. Legacy `general_rule_fallback` rows and `fallback_trigger` fields may be accepted only as read compatibility; new plans, reports, and tool outputs use `general_rule` and `template_status`.
