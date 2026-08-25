# Template-first researcher authoring

Use this reference for a new end-to-end build, a blind reproduction, or any task where the user asks whether the generated code actually reuses the labeled researcher corpus. The quality rubric is a filter for selecting blocks; passing the rubric is not the final outcome.

## Existing-file clone template

When a requested `.do` file is explicitly a lightly changed sibling of a verified existing `.do` file, the existing file is the canonical template. Call `plan_dictionary_repairs` with `source_reuse.canonical_source`, `destination`, and an ordered `allowed_changes` list. Each change must be a literal replacement, deletion, or insertion after an exact anchor and must declare the expected occurrence count. The planner deterministically computes the only permitted candidate and, when `candidate_path` is supplied, compares it exactly. `blocked_undeclared_change` means discard the candidate and clone again; do not patch around the mismatch.

This path precedes dictionary fallback because the user has already identified the compatible whole-file frame. It does not turn the source into a universal estimator template, and it must not be implemented by adding each newly encountered estimator name to detection regexes. Use planner include/exclude scope to keep unrelated raw data, generated results, archives, and quarantined bad code outside inventory limits. Source reuse does not authorize changing the research file before the normal pre-write approval gate.

## Package-first expansion

Use `data/package_command_catalog.json` to identify the canonical command family before proposing a reusable block. Add coverage by registering the command family and labeling one small input-to-output atom; do not add a detector branch for each estimator spelling. `estpost`/`eststo`/`esttab` and `ivreg2`/`ivreghdfe` remain distinct because they have different state and dependency contracts. A registry entry is discovery evidence only until the source-backed template and identifying input contract are reviewed. Templates may generate Excel, PDF, or a necessary `.ster`; no template installs or probes packages, emits TeX, or manually reconstructs coefficients, standard errors, or final result rows. Preserve the latter as quarantined negative evidence.

## Atomic implementation ledger

Before authoring, identify the smallest substantive state transitions needed for readable code. Record ledger rows only when the user or evaluator requests a persistent template-reuse audit; harmless direct statements and the declared master shell never need rows.

- stable `substep_id`
- input state and producer
- target input signature: data shape, record unit, time structure, keys, and relevant variable traits
- output state and consumer
- distinguishing method, command, and data-shape anchors
- `template` or `native_substep`
- selected label and source provenance when `template`
- project-local `target_path`, one-based inclusive `target_spans`, and `target_span_sha256` for every native row
- exact permitted bindings and edits
- justification and search evidence when `native_substep`

A broad stage may mix genuinely close template blocks with concise direct transitions. A compatible label is preferred evidence, not a compulsory implementation. Composition means placing readable complete transitions in sequence; it never means merging competing templates or preserving template control flow that the target does not need.

After any Stata code creation or revision, write a lightweight project-root `report.md` even when the detailed reuse manifest was not requested. For every selected template and every general-rule fallback, record one row per contiguous target range using `| mode | target | lines | checkpoint | label_id | reason |`. Template rows use the selected label ID. Before a fallback, inject the highest-ranked writable candidate, or the highest-ranked reference candidate when none is writable, as a nonbinding hint. Fallback rows use `general_rule_fallback`, label ID `-`, and `nearest_template_hint=<label_id|none>; fallback_trigger=<no_suitable_template|wrong_selection>; hint_used=<borrowed idea|none>`. Nearest means only highest-ranked among the searched candidates and does not establish absolute similarity or compatibility. The candidate may suggest commands, order, or state handling, but it may also be ignored. Paths are project-relative `.do` files and lines are actual one-based inclusive `start-end` ranges after the final source is frozen. Harmless primitives and the declared master shell are not rows. If neither a template nor fallback was used, state `No template or general-rule fallback spans.` Validate the finished workflow with `audit_stata_project(require_report: true)`.

Harmless direct statements are not a third implementation mode. Write them without template search, ledger, provenance, or `DIRECT FALLBACK` markers. They include contract-declared `sysuse <built-in>, clear`, `use <declared input>, clear` without `if`/`in`, `version`, simple `set`, approved path/name bindings, `confirm`/`describe`/`codebook`/`count`/`assert` checks, option-free `append using`, declared identifier encoding and labels, plain `summarize` or `tabstat`, exact `estimates clear`, approved log open/close, and a requested active-graph save. These never authorize dependency probing. If returned state is used to make a substantive sample, estimand, transform, or reporting choice, review that larger transition normally. Merge retained states, sample restrictions, formulas, estimation, `e(sample)` means, estimate handoffs, figures/PDFs, axis choices, and final saves should be checked against templates first; if no suitable template exists or the selection is wrong, use fallback with a rank-relative nonbinding hint.

The one multi-statement exception is a prompt-only master shell whose log path and complete execution order are already approved. Write exactly one `log using`, a flat list of the caller-declared direct `do` calls in that order, and one `log close`; an exact caller-declared completion display may follow. Immediately above each individual `do` call, add one Korean comment sentence explaining that called file's project-local role; a filename-only comment is insufficient. It is unmarked and has no template, ledger row, or provenance record because it makes no research choice and merely exposes the approved call order. Every target must already exist. Lint a newly created master with `lint_do_file(role: "master")`. Do not infer stages or paths, use a loop, conditional, program, registry, dispatcher, positional string, dependency probe, captured stage failure, alternate route, or setup framework. A stage-level log interface is a different contract and must not be adapted into this shell.

Compare the target input signature with each candidate label's source-evidenced `input_signature` before choosing a variant. Treat a known mismatch as incompatible. When either side is `unknown`, inspect the project or cited source rather than inferring panel length, balance, keys, units, transformations, or variable type from names. Bind names and paths only after the data shape and variable traits are compatible.

In a persistent reuse audit, use `native_substep` for one of these reasons:

1. `project_specific_formula`: the research contract itself defines a substantive formula, sample rule, treatment rule, or variable lineage that no corpus block should decide.
2. `dictionary_gap`: exact state, method, and command-anchor searches found no compatible auto-selectable label after the approved corpus fallback. Record the nearest search-ranked reference candidate as a hint if one exists; otherwise record `nearest_template_hint=none` and the searched anchors. Official documentation may supply mechanics, but it does not turn the row into a researcher template.
3. `template_mismatch_fallback`: record the nearest search-ranked candidate as a hint, set `fallback_trigger` to `no_suitable_template` or `wrong_selection`, and record which command, ordering, state-handling, or output hint was useful, if any. Nearest does not mean genuinely close. Do not preserve incompatible semantics or argue that the fallback is superior to the template.

Keep the native row atomic. State the actual formula or exact missing transition; do not use a reason such as “the schema differs” when only variable, key, folder, estimate, or output names need binding. If a later dictionary build contains a compatible writable label, the native gap is stale and must be replanned.

Before opening a nontrivial fallback row, stop adapting the current template and compare the observed input state, output state, command, and interface. If the selection is wrong, discard it as an implementation and pass it to [general-rule-fallback.md](general-rule-fallback.md) only as a nonbinding hint. Do not splice candidates or progressively rewrite a near miss. Keep the target do-file free of provenance markers and record the final target range, trigger, and hint used in root `report.md`.

The fallback code must be the shortest readable implementation of the current transition. Prefer one active loop and keep indentation shallow and specifications visible. Permit loop depth 2 only for substantial repetition of one mechanical body over two plain named lists or numeric ranges, with sample, estimand, specification, grouping, and output placement still visible at the loop site. Prohibit loop depth 3, positional job records, downstream `word` parsing, registries, dispatchers, one-use programs, unused options, hypothetical extensibility, generic caller interfaces, unnecessary intermediate variables, manual event dummies, coefficient reconstruction, and project-specific framework rules. Run `lint_do_file` on the target immediately.

## Evidence-driven iteration and final freeze

Iteration is allowed; only the final frozen source is judged. Revise in response to concrete lint, runtime, numerical, artifact, or rendered-output evidence, not a vague wish to improve code. When the selected variant remains compatible and the failure is only a declared path, variable, estimate, workbook, sheet, or precision binding, delete the affected target span and cleanly render that atomic substep again from the original selected block. Do not add a second patch to already modified generated code.

Discard the affected span and reselect a complete variant when a fix would change the frame, algorithm, control flow, estimate handoff, caller interface, or output contract; require a wrapper, branch, helper, dispatcher, registry, second loop, or extra fallback marker; splice another variant; or repeat the same structural failure after a clean render. Replace only that atomic transition and preserve compatible neighbors. If the linter rejects an unchanged canonical block, freeze the generated candidate and fix the guard with a plugin-owned fixture rather than reconstructing the canonical block in the research project.

Use these composition-failure hints before freezing:

- keep safe one-statement bindings direct and unmarked; repeated fallback wrappers around them indicate overcomposition
- use the runtime-verified returned-state bridge selected for post-estimation values instead of inventing `e()` or `r()` mutations
- preserve the canonical formatter's raw-table and exact scratch-cleanup contract instead of replacing its internal mechanism
- derive event coefficient order, omitted-reference slot, and policy boundary from the actual stored coefficient state instead of adding placeholder points or coordinates
- treat repeated graph blocks, fallback reasons, cleanup statements, or state attachments as a signal to reselect or cleanly re-render, not as a reason to add another abstraction layer

Before the final freeze, leave exactly one implementation path for each atomic transition. Remove superseded variants, compatibility wrappers, duplicate calculations, dead branches, unused macros/options/temporary variables, commented-out alternatives, and stale fallback markers. Verify that every `do` target called by a master exists and that every declared completion token is produced by one reachable callee. Run lint and the project/template audit on this cleaned source, then execute once from clean generated-results state and inspect the exact outputs. Revision count is never a pass/fail metric; final readability, parsimony, runtime validity, numerical correctness, and output completeness are.

When a persistent audit is requested, give merge retained-state handling, unique-key assertion, panel declaration, CPI transformation, dataset finalization, age/entity collapse, the `e(sample)` mean, each estimation family, named in-memory estimate storage, `.ster` save, `.ster` load, final Excel assembly, and figure assembly separate atomic rows. Search for useful labels for each row. When no suitable template exists or a selection is wrong, allow fallback with `nearest_template_hint`, `fallback_trigger`, and `hint_used`. After each estimate, attach the dependent-variable mean with the runtime-valid command `estadd ysumm, mean` before storing or saving the estimate; `ereturn scalar ymean = r(mean)` from an ordinary do-file is invalid.

In a persistent audit, bind each template selection to one `substep_id` and bind each native row to actual project code with `target_path`, `target_spans`, and `target_span_sha256`. The checker derives command and meaning evidence from those bytes. For `dictionary_gap`, record the dictionary hash and observed candidates; for `project_specific_formula`, retain the declared rule; for `template_mismatch_fallback`, retain the rank-relative nearest template hint, fallback trigger, and any hint used.

When a manifest is requested, use known dictionary checkpoints and declare each broad checkpoint once. Harmless direct statements are excluded from manifest coverage. Minimal identifier, macro, and file-binding substitutions do not make a reused block native.

## Minimal adaptation and integration

For final Excel file types, the direct no-program path must name an explicit `.xls` target. The canonical `outreg2_xlsx` formatter writes `.xlsx` and is available only when one workbook requires two or more sheets, including 2SLS first-stage placements.

Fingerprint each boundary before inserting a block: loaded dataset and key, active or persisted estimate state, macro and filename interface, caller location, output path, workbook/sheet name, and downstream expectations. Bind only fields listed in `minimal_edit_fields` and `required_changes`. Preserve the selected block's command order and control flow. Path layout and master calls come from the prompt or observed interface; manual-root and direct-call references never force a new-project layout.

Treat only intentional cross-do-file macros as public interfaces. Keep shared directory roots in setup, but move a leaf input or output filename used by only one child do-file into a local beside that consumer; use a direct literal when it appears once and is clearer. Preserve a leaf filename global only when two or more do-files intentionally share that exact artifact contract. A private or single-consumer global may likewise be replaced with a local beside its regression or graph consumer: repeated controls, sample conditions, event-study RHS terms, fixed effects, clustering, selectors, coefficient order, axis labels, reference positions, and notes should remain visible at their use site; a one-use list may stay explicit in the command. Use `///` only when the immediately following physical line continues the same command, indent continuation lines beyond the command start, and omit it from the final option or physical line.

Do not add a framework merely because work repeats. Prefer visible stage do-files and direct specification blocks. One flat loop may bind a genuinely long plain list, such as outcomes. Keep sample and specification branches sequential inside that loop rather than opening a second loop. Never encode research specifications, samples, sheets, labels, or graph ranges as positional job strings for downstream `word` parsing. Do not introduce a program, registry, dispatcher, hidden sentinel, or generic coefficient-reconstruction layer when a direct block suffices. A workbook with one sheet uses direct visible `outreg2 replace/append` statements and no program. The only standing program exception is the canonical `outreg2_xlsx` formatter for a workbook with two or more sheets; it accepts only readable ordered estimate names plus the workbook, sheet, and display precision, and performs no estimation, research-data transformation, coefficient reconstruction, header relabeling, group choice, or hidden iteration.

Apply a necessity gate before adapting any selected block. List the exact statements needed to move the current input state to the current output state, then omit everything else. Do not preserve a source option, branch, loop, program argument, or general interface merely because it might support a later outcome, sheet, specification, caller, or reuse case. Keep readable explicit code; do not compress several necessary statements into opaque syntax. For Excel selection, first record every outcome's meaning/label, definition and measurement relationship, unit and transform, sample and estimand, estimate handoff and specification order. Define each reader-facing semantic `sheet_group` once from evidence about what a reader should compare together; no single metadata field must match, and names alone are never grouping evidence. Record workbook, sheet, and sample separately in `sheet_plan`. If each workbook has one sheet, write direct `outreg2 replace/append` calls and keep current model states visible. Only when one workbook has two or more sheets should approved live results or durable `.ster` states be stored under readable names and passed to `outreg2_xlsx`. Every declared program option must be used.

For each `sheet_group` or `axis_group`, use the tool-documented `decision_source` value: `user`, `existing_project`, `model_from_metadata`, or `caller_declared`. Keep the separate `grouping_evidence`; the validator reports and normalizes its documented aliases instead of requiring callers to guess the vocabulary. It also accepts an object wrapper whose `source`, `type`, or `kind` field contains a canonical value or documented alias.

## Estimation mechanics when the dictionary has a documented gap

Keep every requested specification directly inspectable and keep the research choice in the prompt, not in helper control flow. With `reghdfe`, list every fixed effect and heterogeneous slope in `absorb()` and the exact cluster identifier in `vce(cluster ...)`. For example, mechanics supported by the official `reghdfe` help include:

```stata
reghdfe outcome event_terms, absorb(fid year) vce(cluster fid)
reghdfe outcome event_terms, absorb(fid year##c.baseline_control) vce(cluster fid)
reghdfe outcome event_terms, absorb(year fid##c.linear_time) vce(cluster fid)
```

Bind the prompt's actual controls and never infer their inclusion. `group##c.continuous` includes the group intercepts and group-specific continuous slopes and is generally preferred by the command author to a slope-only `group#c.continuous` absorb term. When there are several baseline controls, keep each declared term visible. Use `estimation.reghdfe_fe_clustered.v1` for the ordinary one-command FE-and-cluster shape when its state contract matches; genuinely different heterogeneous-slope or project-formula shapes still require their own compatible label or an atomic native-gap justification. Source: [reghdfe author help](https://scorreia.com/help/reghdfe.html), especially the absorb and VCE syntax.

For a conventional event-study term on the estimation RHS with a declared window, use the selected single-hash block as one flat native term per nonreference level, such as `2015bn.time#1.treatment 2016bn.time#1.treatment`. The declared design reference is absent; do not use plain `i(<numlist>)`, `ibn(<numlist>)`, or another base marker. Do not use `##` for this RHS, because the extra time and treatment main-effect rows are then carried into raw `outreg2` output. Runtime verification must find every declared nonreference level in `e(b)` under the exact raw token Stata returns, including a retained `bn` marker on the first no-base term or an estimator-created `o` marker, before the event selector is frozen. This restriction is confined to the event-study RHS. It does not ban a separately justified heterogeneous slope such as `year##c.baseline_control` inside `absorb()`.

## Stored estimates and paper-readable event figures

For disk estimates, load each required numbered result explicitly and give it a stable in-memory name before plotting. Derive the exact coefficient tokens from `coeflegend` or `e(b)`; do not guess factor-variable names. Keep the omitted reference out of `keep()`, but preserve it as exactly one blank `.` slot in display `order()`. Declare the x-label for every event period, place the zero reference point at that blank slot, and put the policy boundary between the omitted slot and the first post period. A paper-readable comparison figure must declare:

- the named estimates and sample labels
- `keep()` for the intended coefficient family
- explicit `order()` in calendar/event-time order
- explicit `coeflabels()` mapping raw coefficient tokens to short year or event-time labels
- the omitted/reference period, zero line, and policy/event line when applicable
- confidence-interval level and comparison/sample legend below the axis
- the raw outcome variable name alone as the graph title
- fixed graph dimensions and enough plot/graph margin for the first and last labels
- immediate PDF export inside the same single outcome loop; save `.gph` there too only when it is a requested deliverable

For exactly one event-study outcome, start from the direct no-loop automatic-axis label. For two or more outcomes with the same figure interface, start from one complete flat-loop variant: all automatic, one evidenced fixed group, or one evidenced fixed group plus automatic remainder. The mixed variant is valid only when exactly one fixed subset and at least one automatic outcome completely partition the outcome list. It resets one axis-options local each iteration and uses one shallow membership `if`; it may not grow another per-outcome branch, fixed group, job registry, or sample/specification loop. In the loop, load and name the required sample estimates, use the raw outcome token in `title()`, put the legend at `position(6)`, and export the PDF before the loop closes. Render a stratified sample of final PDFs and inspect the first/last labels, title, legend, confidence intervals, and one plot from each axis policy. `nobreak` alone does not prove that labels are unclipped.

Treat event-study `axis_group` as independent of Excel `sheet_group`; it is usually finer. Automatic y-axis scaling is the default. Use one common fixed y-axis only for a declared group of genuinely close, directly comparable outcomes under the same specification and sample comparison, with the same coefficient unit and transformation. Record the substantive grouping evidence and the basis for the numeric minimum, maximum, and step. Voluntary and involuntary unemployment rates can qualify when those conditions hold; unrelated outcomes do not. An automatic-axis plot must not inherit a fixed range merely because it shares a workbook sheet, and no policy may require a fixed range for every event study.

When an unconditional `m:1` complete-match merge is required, select `merge.m1_complete_match_assert.v1`; preserve its full merge–assert–indicator-cleanup transition rather than replacing it with `keep(match)` or `nogen`. When a frozen analysis dataset must be delivered, select `dataset.finalize_declared_inventory_order_sort_save.v1` for the declared `keep`, `order`, `sort`, `compress`, and `save` interface; labels belong beside variable creation, not in this finalizer.

## Summary statistics, sample flow, and machine-readable evidence

Produce one canonical summary dataset, then have both the table and figure read it. A paper-facing summary workbook should show informative decimals for means, standard deviations, standard errors, and confidence intervals; keep counts as integers. Do not let a general display format round every statistic to an integer. For a direct one-sheet regression workbook, compute the dependent-variable mean on `e(sample)` beside each active model and use visible `outreg2 replace/append`; only adjusted R-squared and that mean may be added. For a multi-sheet workbook, let `outreg2` write the complete raw model header, dependent-variable header, coefficient, standard-error, omitted/base, and note rows, then read adjusted R-squared and the stored mean from each named estimate and insert their strings at the explicitly declared precision. Those are the only two added statistic rows.

For 2SLS, use the estimator's native first-stage save/restore state, attach the first-stage dependent-variable mean on its own estimation sample, and pass first-stage estimates through the same canonical raw Excel formatter as an explicitly named model-role group. Do not create a second IV formatter. Do not add a first-stage F statistic or any other diagnostic row to the Excel assembly; requested diagnostics remain visible in estimation or audit code.

Record sample flow at every consequential boundary, not only the start and end: each raw source, time/sample restriction, each retained-state merge, panel/filter restriction, treatment-availability restriction, and each reported estimation or output sample. Keep the exact observation count and a stable checkpoint name in a named dataset or manifest.

Every required arbitrary `.json` file must parse with a real JSON parser after it is written. Existence, byte count, checksum, or a Stata log message is not JSON validation. Stata's `collect save/use` round trip validates collection `.stjson`, not an arbitrary user-defined `.json` schema. This applies only when the research contract itself requests JSON; the plugin must not invent packaging metadata.

The schema-2 checker also reads every project `.do` file as strict UTF-8 and blocks lint errors, loop depth above two, and TeX output even outside selected spans. A depth-2 loop must also pass the readable bounded-loop lint contract. It follows deterministic local and project-global output-format macros across do-files; unresolved dynamic macros used as output format or extension fail closed. It rehashes selected source files and spans from an approved original source when available, or from the installed plugin's SHA-addressed exact-byte archive in an isolated clean room. These are static provenance and policy checks only; fresh Stata execution and independent semantic comparison remain required.

## Acceptance boundary

The target is a readable researcher workflow that produces the complete declared deliverables through genuinely close labeled blocks, harmless direct statements, and concise fallbacks used only when no suitable template exists or a selection is wrong. Do not treat template count, rubric score, file similarity, static lint, artifact count, or authoring attempts as final success.

For a blind forward test, isolate the generation agent from the source do-file, earlier generated code, prior evaluator output, and target answer metrics. Let it use concrete lint, runtime, and output evidence to converge under the iteration rule above, then freeze the cleaned authored project before independent evaluation. Separately verify:

- atomic ledger and template manifest completeness when a persistent audit was requested
- unused compatible templates reported as advisories, or blockers only in explicit strict mode
- selected source and target span hashes and minimal edits when template provenance is claimed
- loop/program/TeX policy
- one final implementation path per atomic transition, with no superseded variant, adapter, duplicate fallback, dead helper, unused interface, or commented-out alternative left in the authored do-files
- a fresh Stata run from clean generated, `ster`, `table`, and `figures` state
- coefficients, standard errors, intervals, N, sample means, and sample-flow checkpoints
- exact workbook, estimate, graph, PDF, log, and manifest counts
- valid machine-readable manifests
- rendered workbook and PDF readability

Semantic and numerical reproduction matter; line-for-line similarity to a prior do-file does not.
