# Stata Research Guard

Local Codex plugin for complete Stata research workflows. It provides:

- page-level search over StataCorp official manuals with community authority kept separate
- verified official examples with code hashes and durable sanitized log artifacts
- a self-contained source-byte archive for cited runtime labels, so an installed plugin can rehash selected corpus spans without access to the development workspace
- span-level retrieval from a curated research-practice code corpus
- human-labeled atomic workflow blocks covering setup, preparation, validation, estimation, post-estimation, and export, with input/output contracts and multiple adjudicated researcher variants per checkpoint
- compact source-evidenced `input_signature` and six-field `template_input_profile` metadata for every non-negative label, so target topology is compared before minimal editing
- structure-aware raw-to-result workflow plans that preserve compatible existing projects and use only the user-approved new-project tree
- overhaul previews that show the exact proposed file tree, new persistent variable names and reader-facing descriptions, source/formula, unit and observation level, creation file, period/geography, coding/missing rule, use, and the root README action before any project write
- deterministic linting of one do-file
- raw factor-variable coefficient-name preservation from estimation through Excel and event-study selectors, including blocks on manually generated `treat_yYYYY` substitutes and event-study RHS `##` expansion
- a blocking maximum loop depth of 2, with depth 2 limited to two plain repeated axes and structural parsing that ignores macro, string, and comment braces
- a review warning at structural nesting depth 4 or greater, plus blocking positional job-string dispatch that hides research specifications behind `word` parsing
- derived-reference pruning that removes depth-3-or-greater and TeX-output examples while preserving raw corpus provenance
- cross-file project audits, including a root Makefile that explicitly orders multiple Stata do-files
- a workflow-reproduction contract check over entrypoints, stage roles, call graphs, required files, exact deliverable counts, estimation tokens, and summary-data lineage
- a research-output check over the code-writing default `report_policy: required` (unless `optional|disabled` applies), static audit, researcher-facing README tree and variable descriptions, actual log, exact output counts, and directly calculated hashes; standalone read-only audit defaults to `optional`

The tool does not claim journal certification. It distinguishes useful spans from unsafe lines within the same deposited package.

## Package-first command catalog

`annotations/package_command_registry.json` is the single source of truth for common official Stata command families and community packages. It currently indexes 39 families and 97 canonical command anchors, including separate `estpost`/`eststo`/`esttab`, `ivreg2`/`ivreghdfe`, modern staggered-DiD families, RD, resampling, and high-dimensional fixed-effects workflows. `scripts/build_reference_data.py` compiles it into `data/package_command_catalog.json` with observed corpus counts; the static registry remains the policy source even when a package has not yet appeared in a retained corpus span.

For every registry gap, extend the command index and add a small state-compatible atomic template or explicitly keep the family reference-only until its identifying inputs are known. Do not respond by extending estimator-name detectors. Templates may produce Excel, PDF, or a durable `.ster` when required; they never install or probe packages and never emit TeX. Manual coefficient/standard-error reconstruction and manual result transfer into a final table are quarantined rather than templated.

The target is researcher-readable, executable Stata code, not a distribution or submission package. Before any project write or full execution, the agent inspects the target read-only, lists every folder and file to create or modify plus any move, rename, deletion, or overwrite, states the entrypoint and execution command, and waits for approval. An overhaul preview also shows one proposed tree and every new persistent analysis variable with a reader-facing description, raw source unit plus exact formula or threshold, output unit and observation level, creation file, period/geography, coding/missing rule, use, and the root README action. The approved actual tree and variable dictionary are retained in that README for researchers, and each persistent variable is labeled in its creation do-file. New-project paths and master calls come from the approved prompt or plan; manual-root and direct-call examples are reference evidence, not forced templates. An existing compatible structure is preserved. The plugin does not add installers, dependency inventories, deployment metadata, or submission checklists. `research_output_check` verifies only the approved local research workflow and outputs.

The evidence layers are independent:

- StataCorp manuals define valid Stata syntax.
- Clean selected spans from the collected research-practice code packages define the target researcher style.
- Replication-safety rules check portability, paths, data lineage, and orchestration.

Generated do-file comments describe the current project, not the plugin's retrieval history. They may explain inputs, variable definitions, retained merge/filter rules, samples or specifications, and output purpose. In a newly created master do-file, every individual `do` call has one Korean comment sentence immediately above it explaining the called file's project-local role. Journal/repository names, template/source names, internal IDs, source paths, and provenance markers belong in session or audit evidence, unless a named source is itself part of the project's data-acquisition contract.

`search_labeled_checkpoints` is the first retrieval layer for substantive reusable transitions. An exact checkpoint narrows the relevant evidence; it does not gate whether GPT may write code. The tool returns small state-transition blocks with `keep`, `conditional_keep`, or `drop` decisions, selection conditions, tradeoffs, minimal edit fields, compatible neighbors, source line spans, and hashes. A genuinely close block follows the existing template path and is minimally bound. When no suitable block exists or the selection proves wrong, GPT enters fallback and receives the rank-relative nearest candidate only as a nonbinding hint. That candidate may still be absolutely distant or incompatible. A variant group contains alternatives for one transition, so generation does not splice them; distinct sequential groups may be composed when their state contracts connect.

The selector keeps the ordinary template-first path: a genuinely close writable block is selected and minimally bound. Beside the candidates it returns a `general_rule_fallback_policy` for cases where no suitable block exists or the selected template proves wrong. That policy injects the highest-ranked writable candidate, or the highest-ranked reference candidate when none is writable, only as a nonbinding hint. Nearest is rank-relative and may still be absolutely distant or incompatible. Record `nearest_template_hint`, `fallback_trigger`, and `hint_used`; do not argue that fallback code is better or preserve a mismatched structure. Fallback writes only an already-declared atomic transition and lists hard stops for unresolved substantive, event-axis, output-flow, raw-table, and sheet-cardinality contracts. It keeps one final path and shallow indentation. One active loop is preferred; depth 2 is allowed only for substantial repetition of one mechanical body over two plain named lists or numeric ranges, with all research and output choices visible. Depth 3, registries, dispatchers, positional job strings, one-use programs, unused interfaces, dependency probes, manual event dummies, and coefficient reconstruction are blocked. See `skills/stata-replication-workflow/references/general-rule-fallback.md` for the source-backed writing rules.

Macro scope follows actual consumption. Shared directory roots and intentional cross-do-file interfaces may remain `global`; a leaf input or output filename used by only one child do-file belongs in a `local` near that consumer's first use, or directly in the command when used once. A leaf filename remains global only for an intentional artifact contract shared by two or more do-files. Repeated regression controls, sample conditions, event-study RHS terms, fixed effects, clustering definitions, and same-file graph selectors or labels likewise stay local to the do-file that uses them, while a one-use list may remain explicit in its command. Long variable and other enumerations use meaningfully grouped, whitespace-aligned multiline blocks; short lists stay on one line, and quoted text is not reflowed. Project audit warns when a specification-style or leaf-file global has only one consuming file. Do-file lint also rejects a dangling `///`: the next physical line must immediately continue the same command, continuation lines are indented beyond the command start, and the final option or line omits the marker.

Each selected transition is implemented only for the current observed state. The plugin does not add future-facing options, one-item loops, one-use programs, registries, dispatchers, optional branches, or generic caller interfaces. This is a necessity rule, not a code-golf rule: specifications and checks remain explicit and readable.

Harmless direct statements are deliberately not another template system. Contract-declared `sysuse <built-in>, clear`, `use <declared input>, clear`, version/setup, approved path and log bindings, confirm/describe/codebook/count/assert checks, option-free append, identifier encoding and labels, plain summaries, estimates clear, and an active-graph save can be written directly without a label, ledger row, or fallback marker. This never authorizes dependency probing. Substantive transitions are checked against templates first; no suitable template or a wrong selection leads to fallback with a rank-relative hint rather than a forced stop.

After code creation or revision, the planner defaults to `report_policy: required` and writes root `report.md` with every selected template and every general-rule fallback, using `mode`, project-relative `.do` target, actual one-based inclusive line range, checkpoint, template label or fallback `-`, and reason. A standalone read-only audit defaults to `optional`. `report_policy: optional` permits the caller to omit the report; `report_policy: disabled` (including an explicit user no-report request) means the plugin must not create or modify the target `report.md`. The legacy `require_report` option is a compatibility alias for the required policy. Each fallback reason uses `nearest_template_hint=<label_id|none>; fallback_trigger=<no_suitable_template|wrong_selection>; hint_used=<borrowed idea|none>`. Harmless primitives are omitted. When neither mode was used, the report states that explicitly. The detailed template-reuse manifest remains opt-in.

The checkpoint contract keeps a stable English machine key and explicit Korean/English display names. Each non-negative label carries a source-evidenced `template_input_profile`: data structure, record unit, required keys, source basis, time structure, and variable characteristics. Compare it with the target before minimal editing; known mismatches block automatic reuse and unresolved facts stay `unknown`. The compact `input_signature` remains supporting evidence. Every annotation build refreshes `review/dictionary_toc.md` and `review/labeling_review.md`, so a researcher can inspect headword maturity, variant counts, profile completeness, state-specific coverage, source spans, and open review questions before labeling is complete. `review/review_queue.md` is the manually maintained priority list and is never overwritten by the builder.

`inspect_dictionary_coverage` keeps corpus accounting separate from dictionary size. It reports each package's `.do` files and lines reviewed, 11-stage judgment, exclusions, unresolved questions, and safe candidates still awaiting labeling. `end_to_end_read` is the reviewer's full-read attestation; the builder separately opens every cataloged `.do`, recomputes its SHA-256 and line count, and validates every cited path and span. This is auditable file coverage, not proof of human attention, input-signature completeness, or a Stata runtime pass. A package can be fully reviewed yet contribute no reusable block, and a frequently represented headword can still have a narrow or underspecified state contract.

`plan_dictionary_repairs` is the entrypoint for an existing project. It scans interfaces and artifacts, keeps review questions read-only, and bounds the requested footprint. It ranks compatible blocks for relevant headwords and marks the rest of the workflow `preserve`. Missing headword coverage is reported rather than thrown as an error, so the model can implement the declared change directly without widening the project. Automatic mode defaults to partial repair; overhaul still requires explicit intent or recorded incompatibility evidence.

For a requested sibling of an existing canonical `.do` file, the planner exposes the estimator-agnostic `source_reuse` template. The caller declares the source, destination, and exact literal edits with occurrence counts; the planner computes the permitted candidate and blocks any undeclared difference. Planner `scope.include_paths` and `scope.exclude_paths` prune unrelated trees before the 50,000-file inventory limit. This avoids growing a command-name detector merely to preserve a file the user already designated as canonical.

## Scope, intent, and evidence boundaries

`audit_stata_project` defaults to the active reachable workflow: resolve `scope.entrypoints` or the selected top-level master and audit its reachable call graph and declared producers/consumers. Use `scope.mode: all` only when the caller wants the whole tree, or use project-relative `scope.include_paths`/`scope.exclude_paths` for a bounded inventory. Excluded directories are pruned before the discovery cap and call-graph build; remaining call targets use a suffix index rather than a file-by-call scan. Files outside the active graph are listed in a separate inactive advisory section without full lint and do not block the active workflow by default. Explicit all/include scope promotes them into the requested full-lint scope; this is a scope choice, not a project-specific exception. If more than one top-level master remains plausible, the audit returns `needs_review` with no arbitrarily selected active workflow and asks for explicit `scope.entrypoints`.

Intent classification is bilingual and precedence-based. Korean and English review-only signals (for example 검사/점검/평가/진단/검토/발전 가능성, `review`, `audit`, `inspect`, `assess`, `diagnose`, `explain`, and `do not modify`) take precedence over incidental words such as “add,” “improve,” or “feature.” A review-only or no-change request sets `code_required: false` and `write_authorization.status: not_requested`; writable templates, code generation, and project writes are not loaded or planned. A write signal is effective only when it is explicit and not contradicted by the no-change boundary.

Report policy is independent of intent: `required`, `optional`, and `disabled` are the general values, while an explicit no-report request selects `disabled` and prevents creation or modification of `report.md`. `require_report` remains a compatibility alias for `required` when no explicit `report_policy` is supplied.

Master-call role findings depend on both `role` and `authoring_state`. A missing project-role sentence above a call is a blocking error for a newly authored master, a warning for a modified master, and not a retroactive block when an existing master is merely audited. This preserves a useful standard for new work without turning legacy review into a rewrite request.

Report coverage is substantive, not provenance-shaped. With `report_policy: required` (including the legacy alias `require_report: true`), the caller supplies `authored_spans` for the substantive transitions it authored or changed; the checker verifies that each confidently identified transition has one contiguous report row and a valid one-based line bound. It does not require provenance markers in research code, a row for harmless primitives, or complete coverage of untouched legacy files. If a transition boundary is uncertain, the result is a pending/advisory finding rather than fabricated coverage.

Project-level output evidence takes precedence over isolated do-file guesses. Multi-sheet and estimate multiplicity checks follow reachable execution order and resolve local macros at each call site. Producer, durable-estimate, macro, workbook, and sheet state is isolated across disconnected workflow components, including under `scope.mode: all`. A later `estimates store` cannot satisfy an earlier consumer, and a durable `.ster` file is not treated as an in-memory stored estimate without an explicit load/store transition. Dynamic names or runtime-only branches remain `context_pending` and nonblocking until runtime evidence resolves them. A single-file lint pass must not block merely because it cannot infer the workbook topology.

Native Stata `python script <declared .py>, args(...)` is an explicit script-integration contract, not a shell/winexec/bang escape or inline Python process escape. It is not a `process_escape` blocker solely for being native integration, but its runtime success, outputs, and substantive effects require separate runtime/output validation. Shell, winexec, Unix, bang, and inline process escapes remain subject to their existing blocking rule.

Runtime success, static audit, and substantive validity are independent verdicts. Static checks may flag only estimability risks that are certain from source structure. Exact omitted or collinear terms, `e(b)` names, and returned estimates require runtime readback; whether an estimand and its interpretation are substantively valid is a separate research judgment. A `static_clean` result never substitutes for either runtime or substantive validity.

Derived or self-lineage canonical/template material is conservatively marked `independent_support=false` and excluded from independent external-evidence counts. It remains usable as lineage/provenance evidence, but it cannot manufacture independent support. Deposited external packages retain their external evidence class. The tool does not perform target-relative package-lineage comparison, so their `independent_support` flag is not proof that a particular target has a different lineage.

`loop_depth` counts active executable loop nesting only. `structural_depth` counts nested executable/control blocks, including conditionals, loops, and program blocks, whether or not they iterate. `loop_depth >= 3` is blocking; `structural_depth >= 4` is a warning for review and simplification, not an automatic runtime failure. These dimensions are reported separately and must not be conflated.

Static lint never declares a runtime pass. It returns `static_clean` when no deterministic issue is found. Official syntax examples are passed only after a real Stata run. `research_output_check` reports artifact, static, and substantive states separately; when no main log is supplied, `runtime_status` is `not_checked` even if requested output counts and hashes pass.

Blind validation keeps the source project outside the generation context. The independent agent receives only the natural-language contract, installed plugin, and declared input paths. `workflow_reproduction_check` judges semantic workflow evidence, required canonical-summary variable names, and shared data lineage; source-code similarity is used only to detect leakage. Numerical equality and fresh-run evidence remain separate checks.

For a new project, strict structure accepts path contracts in the top master or a directly called config, paths, or setup do-file. This keeps a thin master compatible with a centralized configuration stage.

Canonical summary-statistics work searches three dedicated checkpoints first: `descriptives.summary_dataset`, `exports.descriptive_excel_sheet`, and `figures.descriptive_bar`. The deposited AER/AEJ sources provide separate atoms for grouped mean/count, `tabstat` count/mean/SD materialization, grouped percentiles, collapse-to-long structure, first versus additional Excel sheets, and grouped bars. Compose only genuinely compatible atoms whose state contracts connect. Build one named dataset containing the complete declared statistic set for each declared group-period cell, and make both table and figure consumers read it. Mixed-statistic long assembly, workbook styling, or target semantics absent from the source spans remain narrow fallback with the rank-relative nearest template supplied only as a hint; they are not silently promoted to templates.

The fixed table rule is the final regression Excel content, not universal helper use. Preserve complete raw model headers, dependent-variable headers, coefficient rows, standard-error rows, omitted/base rows, and notes; add only adjusted R-squared and the estimation-sample dependent-variable mean. A workbook with one sheet uses visible direct `outreg2 replace/append` statements without a program, regardless of outcome or model-column count: compute the mean with `quietly summarize <depvar> if e(sample), meanonly`, bind `r(mean)` to a local, and use only `adjr2 addstat(Dep. variable mean, <that local>)`. Use the canonical `outreg2_xlsx` formatter only when one workbook requires two or more sheets. The same sheet-cardinality rule applies to separately grouped 2SLS first-stage estimates; do not add F-statistics or build a second IV table system. Generated workflows target Excel, PDF, and `.ster` only when durable estimates are needed. TeX, loop depth 3, unjustified depth-2 loops, structural depth 4 or greater (review warning), and encoded research-specification dispatch are reported under their separate severity rules.

File extensions follow the implementation scale: the direct no-program one-sheet path must use an explicit `.xls` target, while the canonical multi-sheet formatter writes `.xlsx`. Extensionless, `.xml`, or `.xlsx` direct `outreg2, excel` output is rejected.

Factor-variable interactions keep their native Stata coefficient names. The plugin blocks renaming and manual `treat_yYYYY`/`_yYYYY` substitutes. A conventional event-study RHS with a declared window writes a flat list of level-specific native terms, such as `2015bn.time#1.treatment 2016bn.time#1.treatment`: the one declared design reference is absent, every other declared level has one term, and the single `#` avoids the nuisance main-effect rows that `##` would add to raw `outreg2` output. Plain `i(<numlist>)`, `ibn(<numlist>)`, and a second base marker are not valid substitutes. A separately justified `year##c.control` heterogeneous slope inside `absorb()` remains valid. Runtime verification checks every declared nonreference level against the exact raw `e(b)` token Stata returns, including a retained first-term `bn` marker or an estimator-created `o` marker. Event-study `keep()` selectors use those raw names, while display `order()` retains one blank slot for the omitted period so the zero reference point, x labels, and policy boundary stay on the correct event-time coordinates. Event-study graph text is English; Korean text in other graphs requires `Malgun Gothic`.

The raw-name contract treats the coefficient/standard-error table emitted by `outreg2` as the source of record. Final assembly preserves its native coefficient and note rows without a packaging-only `keep()`, filtering, synthesis, renaming, or coefficient reconstruction. It may order the presentation, place the table in sheets, add the two separately stored statistics, and set readable formatting. A declared baseline comparison covers all contracted outcomes, samples, and specifications for coefficients, standard errors, and base/omitted status; one representative regression is not a final equivalence check.

Estimate replace/seed, append, numbered `.ster` load, in-memory store, and restore are separate transitions. When the target topology matches, use the labeled reshape, `tsfill`, named `graph combine`, and collapse-with-label-round-trip blocks. A named sample-flow `postfile` is allowed only when the researcher supplies checkpoint meanings and order; it uses typed rows, named counts, and `postclose` without disturbing active data, and never reconstructs coefficients or tables.

One outcome and several outcomes follow the same sheet-cardinality decision. A reader-facing semantic `sheet_group` must be supported by variable labels, definitions, measurement relationships, or research purpose; no one field must match, and similar names are not evidence. Define the group once, record `decision_source` as `user`, `existing_project`, `model_from_metadata`, or `caller_declared` with separate `grouping_evidence`, and map it through `sheet_plan` to workbook, sheet, and sample placements. One sheet per workbook stays direct; two or more sheets in one workbook use `outreg2_xlsx` with each sheet's readable ordered estimate names. The tool also accepts an object wrapper whose `source`, `type`, or `kind` field contains one of those values or a documented alias, then normalizes it to the canonical string. Research do-files contain analysis commands only; they do not create setup files or installation preflight branches.

Event-study axes are planned separately from Excel sheets. Automatic y-axis scaling is the default. A common fixed range is used only for a declared `axis_group` of genuinely close, directly comparable outcomes under the same specification and sample comparison and with the same coefficient unit and transformation. The group and numeric minimum, maximum, and step require explicit evidence. `axis_group` is usually finer than `sheet_group`; neither hierarchy nor sheet membership can force an axis range, and the plugin never requires fixed axes for every event study.

Exactly one event-study outcome uses the direct no-loop automatic-axis variant. Two or more outcomes use one flat outcome loop; the raw outcome variable name appears alone at the top, the comparison/sample legend is below the axis, and PDF export occurs immediately before the loop closes. Automatic outcomes and genuinely close fixed-axis groups use separate complete variants, so no dispatcher or nested loop is needed.

Iteration is allowed and only the final frozen source is judged. If a selected block does not fit, discard it instead of stacking patches or wrappers. Search once more with the observed mismatch, then use fallback with the rank-relative nearest inspected candidate available only as a hint. Do not infer compatibility from its rank. Harmless primitives stay unmarked. Fallback spans remain narrow: prefer one flat loop and allow depth 2 only for the reviewed substantial-repetition exception; keep shallow indentation, visible specifications, and no positional jobs, one-use programs, unused options, future-facing interfaces, unnecessary variables, or project-specific framework rules.

Reusable indexing has a separate raw-source and external-evidence rubric gate. Scope remains `general`, `method_specific`, `project_specific`, or `negative`; quality is separately recorded as `preferred_candidate`, `conditional_candidate`, `reference_only`, or `exclude`. Variable names, keys, file names, and required data shape are expected bindings, not automatic project-specific defects. A reusable label's source-evidenced `input_signature` is compared with the target before ranking; known mismatches block automatic reuse and `unknown` fields trigger inspection rather than invention. Harmful coupling means hidden sentinels, author-only helpers/globals, scattered coordinated edits, positional job-string dispatch, or project research choices embedded in control flow. Only preferred/conditional rows may be auto-selected; reference-only rows stay visible for gap diagnosis and are never silently copied. Explicit method/state terms are a compatibility gate before generality bonuses. The multi-sheet Excel formatter is the only explicit user-approved canonical exception. See `review/generality_selection_review.md` and `review/generality_rubric_sources.md`.

Selected labels retain source and edit evidence in the session or requested audit. No project manifest is created by default. `template_reuse_check` is an opt-in persistent audit: skipped compatible templates are advisory by default and block only under explicit strict enforcement. Native rows represent a declared formula, dictionary gap, or template-mismatch fallback with `nearest_template_hint`, `fallback_trigger`, and `hint_used`; they do not argue that fallback is better.

Live provenance verification prefers the approved original source when it is available. An installed-cache clean room instead uses `data/source_archive/index.json` and its SHA-addressed exact source bytes. The archive is evidence for the recorded local source hash, not journal certification and not a substitute for source DOI metadata.

For an end-to-end or blind-generation claim, the final audit must judge whether each selected block was the appropriate compatible variant at the point where it was inserted, not merely whether a declared manifest parses. Compare every prompt transition and observed producer/consumer state against all auto-selectable candidates, record rejected alternatives and reasons, and inspect narrowly justified native gaps independently. Fresh runtime, numerical equality, valid JSON, exact artifact counts, and rendered workbook/PDF readability remain separate requirements.

Blind-generation artifacts and any prior runtime output are baselines, not final validation. A final runtime claim requires a new source-isolated clean trial from the current code, with a fresh `do/main.log`, exact output counts, and directly calculated file hashes.

The merge guard recognizes both post-merge `_merge` checks and an inline `keep()` state policy documented by StataCorp. Narrow `capture drop` cleanup of generated variables is not treated as broad error suppression.

## Development checks

Run the reference builder after changing the corpus policy:

```powershell
python scripts\build_reference_data.py
```

After changing runtime labels or any cited source bytes, rebuild the installed provenance archive and commit its deterministic index and owned source files:

```powershell
python scripts\build_source_archive.py
```

Build the human-labeled atomic checkpoint layer after changing annotations or checkpoint contracts:

```powershell
python scripts\build_labeled_checkpoints.py
```

Merge the independently reviewed package batches and rebuild package-by-checkpoint accounting:

```powershell
python scripts\merge_package_reviews.py ..\..\work\package_review_batch_a.json ..\..\work\package_review_batch_b.json ..\..\work\package_review_batch_c.json ..\..\work\package_review_batch_d.json ..\..\work\package_review_batch_e.json ..\..\work\package_review_batch_f.json --output annotations\package_workflow_reviews.json
python scripts\build_package_coverage.py
```

Build the page-level manual index from the local official and community reference folder:

```powershell
python scripts\build_manual_reference.py --source path\to\stata-reference-pdfs
```

Re-run the official easy examples in Stata:

```powershell
python scripts\verify_official_examples.py
```

Run the complete metadata and Node test suites, including fresh Stata runtime fixtures and bundle verification:

```powershell
python -m unittest discover -s tests -p "test_*.py"
Get-ChildItem tests\*.test.cjs | ForEach-Object { node --test $_.FullName }
```
