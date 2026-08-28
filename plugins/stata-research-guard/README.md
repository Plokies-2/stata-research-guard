# Stata Research Guard

Local Codex plugin for complete Stata research workflows. It provides:

Current release line: `0.3.x`.

- page-level search over StataCorp official manuals with community authority kept separate
- verified official examples with code hashes and durable sanitized log artifacts
- a self-contained source-byte archive for cited runtime labels, so an installed plugin can rehash selected corpus spans without access to the development workspace
- span-level retrieval from a curated research-practice code corpus
- human-labeled atomic workflow blocks covering setup, preparation, validation, estimation, post-estimation, and export, with input/output contracts and multiple adjudicated researcher variants per checkpoint
- a two-layer resolver that supplies one bounded code-free official/maintainer mechanics card when available, while separately selecting at most one compatible research-usage template
- an audited Top 100 command contract covering 100 ranked groups and 395 material variants, with the frozen Top 50 prefix (50 groups/203 variants) and 15 supplemental groups (48 variants) retained separately; total contracts: 443
- a command-level `inspect_top100_command_examples` view that returns every materially distinct code-free guide record required by a command's complexity, plus separately bounded paper-code context and exact-support gaps
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

`annotations/package_command_registry.json` is the single source of truth for common official Stata command families and community packages. It currently indexes 43 families and 109 canonical command anchors, including separate `estpost`/`eststo`/`esttab`, `ivreg2`/`ivreghdfe`, modern staggered-DiD families, RD, resampling, and high-dimensional fixed-effects workflows. `scripts/build_reference_data.py` compiles it into `data/package_command_catalog.json` with observed corpus counts; the static registry remains the policy source even when a package has not yet appeared in a retained corpus span.

For every registry gap, extend the command index and add a small state-compatible atomic template or explicitly keep the family reference-only until its identifying inputs are known. Do not respond by extending estimator-name detectors. Templates may produce Excel, PDF, or a durable `.ster` when required; they never install or probe packages and never emit TeX. Manual coefficient/standard-error reconstruction and manual result transfer into a final table are quarantined rather than templated.

The target is researcher-readable, executable Stata code, not a distribution or submission package. Before any project write or full execution, the agent inspects the target read-only, lists every folder and file to create or modify plus any move, rename, deletion, or overwrite, states the entrypoint and execution command, and waits for approval. An overhaul preview also shows one proposed tree and every new persistent analysis variable with a reader-facing description, raw source unit plus exact formula or threshold, output unit and observation level, creation file, period/geography, coding/missing rule, use, and the root README action. For a new applied-micro panel project or an explicitly approved overhaul that actually needs preparation, summary, and estimation, the default unnumbered spine is `masters.do`, `do/build_analysis_panel.do`, `do/build_summary.do`, and `do/run_regressions.do`: one labeled and checked analysis-ready panel is completed first, then summary and regression files independently reopen it. Other profiles create only their requested stages and outputs. Summary may generate Excel and descriptive PDFs; regressions may generate Excel, reusable `.ster`, and event-study PDFs. A compatible existing structure is preserved during partial repair.

The evidence layers are independent and never share a ranking score:

- Official Stata manuals and user-written command guides define syntax and command-state mechanics. Their cards are always `auto_selectable=false` and never decide the sample, estimand, model, fixed effects, VCE, key, axis, sheet, or output placement.
- Audited deposited research-code spans show target usage. Only an exact compatible usage row may supply a writable template.
- Replication-safety rules check portability, paths, data lineage, and orchestration.

Generated do-file comments describe the current project, not the plugin's retrieval history. They may explain inputs, variable definitions, retained merge/filter rules, samples or specifications, and output purpose. A newly created `masters.do` starts with exact persistent project input and output file comments. Every individual `do` call is associated with exact `Input: ...`, exact `Output: ...` or `Output: none`, and a concise Korean comment explaining the called file's project-local role. Folder-only or wildcard-only file contracts are insufficient, while sentence completeness, terminal punctuation, and exact blank-line adjacency are not blocking heuristics. Journal/repository names, template/source names, internal IDs, source paths, and provenance markers belong in session or audit evidence, unless a named source is itself part of the project's data-acquisition contract.

`resolve_transition_evidence` is the first retrieval layer for every substantive atomic transition. It deterministically returns one primary code-free guide card containing command, option/state contract, and authoritative manual or maintainer URLs; up to two alternatives remain metadata-only. It may separately match at most one usage example. Exact audited usage produces `guide+usage_template`; missing or incompatible usage produces `guide+general_rule` or `guide_informed_general_rule`. A known six-field profile contradiction prevents usage auto-selection. Unrelated multi-command requests return `split_required`, and unresolved material choices return `selection_required`. Guide and usage scores are never combined.

`inspect_top100_command_examples` is the command-level teaching and coverage view: it returns all materially distinct code-free guide records judged necessary for the requested Top 100 command, rather than applying a fixed one-example quota. Its optional paper-code rows are command-anchor context only and do not become exact reusable templates. `search_labeled_checkpoints`, `search_stata_manual`, and `search_approved_patterns` remain compatibility and diagnosis tools after the atomic resolver reports a gap or mismatch. All 454 guide records are excluded from the legacy selector score and workflow-planner ranking and never return a synthesized code body. Existing deposited research-code labels retain their prior behavior, including the rule that only `preferred_candidate` or `conditional_candidate` rows with `auto_select_allowed: true` are writable.

The generated companion indexes contain 454 code-free guide cards with zero auto-selectable rows and 166 research-usage records, none auto-selectable in that companion layer. The latter comprise 109 deposited code blocks, 19 code-unavailable exact-support records, and 38 paper-occurrence support records. The 100-row `review/top100_command_evidence_matrix.md` lists each command group's complexity decision, guide label and manual URLs, paper candidate/reference/excluded contexts, code-unavailable support, and exact paper-code gaps. Guide code is not shipped or displayed. Deposited paper code remains a separately identified usage layer and never becomes command authority.

The selector returns `general_rule_policy`, which applies to every substantive transition and to template selection, binding, adaptation, and verification. A template is selected only when permitted bindings leave the complete atomic transition intact. If its frame, algorithm, control flow, interface, or output contract must change, the result is no longer a template: split at a natural state boundary when possible, otherwise use `general_rule`. The highest-ranked inspected candidate may be retained only as a nonbinding hint; nearest is rank-relative and may still be absolutely distant or incompatible. Record `nearest_template_hint`, `template_status`, and `hint_used`. General rules cover only an already-declared atomic transition and list hard stops for unresolved substantive, event-axis, output-flow, raw-table, and sheet-cardinality contracts. They require one final path and shallow indentation. One active loop is preferred; depth 2 is allowed only for substantial repetition of one mechanical body over two plain named lists or numeric ranges, with all research and output choices visible. Depth 3, registries, dispatchers, positional job strings, one-use programs, unused interfaces, dependency probes, manual event dummies, and coefficient reconstruction are blocked. See `skills/stata-replication-workflow/references/general-rules.md`.

## Researcher-readable house style

These are this plugin's code-generation and bounded-revision conventions, not universal Stata textbook rules. An AEA-formatted replication package can be valid without following them, and following them alone does not establish AEA compliance.

- Prefer correctness, point-of-use readability, and artifact-based restartability before brevity, DRY, or modularity. A coherent do-file around 1000 lines may remain intact; add section headings before splitting, and never treat the number as a lint threshold.
- For a compatible new workflow, finish one cleaned analysis panel before summary and regression files independently reopen it. A new `masters.do` lists exact persistent project inputs and outputs and the exact input/output contract of every direct `do` call.
- Use a literal once. Otherwise define or redefine a descriptive `global` in the consuming do-file. Keep shared directory roots in `masters.do`, outcome-list globals in `run_regressions.do`, and never build aliases such as `controls_current -> controls_2019 -> controls_base`.
- Newly generated or currently revised regressions use zero substantive reference depth: event window, controls, sample, fixed effects, weights, and VCE remain visible in the estimator block. Untouched existing projects receive bounded advice rather than an automatic error.
- Reserve `local` in authored regression code for lexical cases such as loop or program state, tempfile/tempvar/tempname, per-iteration scratch, and an immediately consumed `r()` or `e()` result. Do not attempt to infer lexical necessity across every Stata context.
- Prefer one active flat loop. Split files only at a durable artifact boundary, an independent rerun, genuine reuse, ownership, or a genuinely distinct responsibility—not merely because a function-sized unit can be named.
- Without Stata runtime support and exact raw `e(b)` readback, generate a level-by-level native event-study list. Compact selected-level syntax is a frozen project form only after runtime confirms support, the omitted level, and exact coefficient names.
- Record named observation counts after consequential filters and retained-state merges. For a direct one-sheet regression table, compute the dependent-variable mean with `quietly summarize <depvar> if e(sample), meanonly` and consume `r(mean)` immediately.

Do-file lint also rejects dangling `///`. Detailed examples and edge conditions live in `skills/stata-replication-workflow/references/general-rules.md`.

Each selected transition is implemented only for the current observed state. The plugin does not add future-facing options, one-item loops, one-use programs, registries, dispatchers, optional branches, or generic caller interfaces. This is a necessity rule, not a code-golf rule: specifications and checks remain explicit and readable.

Harmless direct statements are deliberately not another template system. Contract-declared `sysuse <built-in>, clear`, `use <declared input>, clear`, version/setup, approved path and log bindings, confirm/describe/codebook/count/assert checks, option-free append, identifier encoding and labels, plain summaries, estimates clear, and an active-graph save can be written directly without a label, ledger row, or special marker. This never authorizes dependency probing. All substantive transitions follow the general rules; templates are optional complete specializations of those rules.

After code creation or revision, the planner defaults to `report_policy: required` and writes root `report.md` with every selected template and every substantive `general_rule` span, using `mode`, project-relative `.do` target, actual one-based inclusive line range, checkpoint, template label or `-`, and reason. A standalone read-only audit defaults to `optional`. `report_policy: optional` permits the caller to omit the report; `report_policy: disabled` (including an explicit user no-report request) means the plugin must not create or modify the target `report.md`. The legacy `require_report` option is a compatibility alias for the required policy. Each general-rule reason uses `nearest_template_hint=<label_id|none>; template_status=<no_suitable_template|wrong_selection|project_specific_contract>; hint_used=<borrowed idea|none>`. Harmless primitives are omitted. When neither mode was used, the report states `No template or substantive general-rule spans.` Legacy `general_rule_fallback` rows and `fallback_trigger` fields are read-only compatibility aliases. The detailed template-reuse manifest remains opt-in.

The checkpoint contract keeps a stable English machine key and explicit Korean/English display names. Each non-negative label carries a source-evidenced `template_input_profile`: data structure, record unit, required keys, source basis, time structure, and variable characteristics. Compare it with the target before minimal editing; known mismatches block automatic reuse and unresolved facts stay `unknown`. The compact `input_signature` remains supporting evidence. Every annotation build refreshes `review/dictionary_toc.md` and `review/labeling_review.md`, so a researcher can inspect headword maturity, variant counts, profile completeness, state-specific coverage, source spans, and open review questions before labeling is complete. `review/review_queue.md` is the manually maintained priority list and is never overwritten by the builder.

`inspect_dictionary_coverage` keeps corpus accounting separate from dictionary size. It reports each package's `.do` files and lines reviewed, 11-stage judgment, exclusions, unresolved questions, and safe candidates still awaiting labeling. `end_to_end_read` is the reviewer's full-read attestation; the builder separately opens every cataloged `.do`, recomputes its SHA-256 and line count, and validates every cited path and span. This is auditable file coverage, not proof of human attention, input-signature completeness, or a Stata runtime pass. A package can be fully reviewed yet contribute no reusable block, and a frequently represented headword can still have a narrow or underspecified state contract.

`plan_dictionary_repairs` is the entrypoint for an existing project. It scans interfaces and artifacts, keeps review questions read-only, and bounds the requested footprint. It ranks compatible blocks for relevant headwords and marks the rest of the workflow `preserve`. Missing headword coverage is reported rather than thrown as an error, so the model can implement the declared change directly without widening the project. Automatic mode defaults to partial repair; overhaul still requires explicit intent or recorded incompatibility evidence.

For a requested sibling of an existing canonical `.do` file, the planner exposes the estimator-agnostic `source_reuse` template. The caller declares the source, destination, and exact literal edits with occurrence counts; the planner computes the permitted candidate and blocks any undeclared difference. Planner `scope.include_paths` and `scope.exclude_paths` prune unrelated trees before the 50,000-file inventory limit. This avoids growing a command-name detector merely to preserve a file the user already designated as canonical.

## Scope, intent, and evidence boundaries

`audit_stata_project` defaults to the active reachable workflow: resolve `scope.entrypoints` or the selected top-level master and audit its reachable call graph and declared producers/consumers. Use `scope.mode: all` only when the caller wants the whole tree, or use project-relative `scope.include_paths`/`scope.exclude_paths` for a bounded inventory. Excluded directories are pruned before the discovery cap and call-graph build; remaining call targets use a suffix index rather than a file-by-call scan. Files outside the active graph are listed in a separate inactive advisory section without full lint and do not block the active workflow by default. Explicit all/include scope promotes them into the requested full-lint scope; this is a scope choice, not a project-specific exception. If more than one top-level master remains plausible, the audit returns `needs_review` with no arbitrarily selected active workflow and asks for explicit `scope.entrypoints`.

Intent classification is bilingual and precedence-based. Korean and English review-only signals (for example 검사/점검/평가/진단/검토/발전 가능성, `review`, `audit`, `inspect`, `assess`, `diagnose`, `explain`, and `do not modify`) take precedence over incidental words such as “add,” “improve,” or “feature.” A review-only or no-change request sets `code_required: false` and `write_authorization.status: not_requested`; writable templates, code generation, and project writes are not loaded or planned. A write signal is effective only when it is explicit and not contradicted by the no-change boundary.

Report policy is independent of intent: `required`, `optional`, and `disabled` are the general values, while an explicit no-report request selects `disabled` and prevents creation or modification of `report.md`. `require_report` remains a compatibility alias for `required` when no explicit `report_policy` is supplied.

Master comment and macro-scope findings depend on `authoring_state`. Missing top-level project Input/Output inventory, per-call exact Input/Output, or project-role prose is a blocking error for new authorship, a warning for a modified file, and not a retroactive block in a read-only legacy audit. The same state boundary applies to the new local-scope and regression-indirection rules.

Report coverage is substantive, not provenance-shaped. With `report_policy: required` (including the legacy alias `require_report: true`), the caller supplies `authored_spans` for the substantive transitions it authored or changed; the checker verifies that each confidently identified transition has one contiguous report row and a valid one-based line bound. It does not require provenance markers in research code, a row for harmless primitives, or complete coverage of untouched legacy files. If a transition boundary is uncertain, the result is a pending/advisory finding rather than fabricated coverage.

Project-level output evidence takes precedence over isolated do-file guesses. Multi-sheet and estimate multiplicity checks follow reachable execution order and resolve local macros at each call site. Producer, durable-estimate, macro, workbook, and sheet state is isolated across disconnected workflow components, including under `scope.mode: all`. A later `estimates store` cannot satisfy an earlier consumer, and a durable `.ster` file is not treated as an in-memory stored estimate without an explicit load/store transition. Dynamic names or runtime-only branches remain `context_pending` and nonblocking until runtime evidence resolves them. A single-file lint pass must not block merely because it cannot infer the workbook topology.

Native Stata `python script <declared .py>, args(...)` is an explicit script-integration contract, not a shell/winexec/bang escape or inline Python process escape. It is not a `process_escape` blocker solely for being native integration, but its runtime success, outputs, and substantive effects require separate runtime/output validation. Shell, winexec, Unix, bang, and inline process escapes remain subject to their existing blocking rule.

Runtime success, static audit, and substantive validity are independent verdicts. Static checks may flag only estimability risks that are certain from source structure. Exact omitted or collinear terms, `e(b)` names, and returned estimates require runtime readback; whether an estimand and its interpretation are substantively valid is a separate research judgment. A `static_clean` result never substitutes for either runtime or substantive validity.

Internally authored implementations are excluded from the selector and bundle. The sole explicit exception is `export.regression_excel.from_ster_default_style.v1`, the canonical `outreg2_xlsx` multi-sheet formatter program. Guide mechanics are code-free metadata, not templates. Deposited external packages retain their external evidence class. The tool does not perform target-relative package-lineage comparison, so their `independent_support` flag is not proof that a particular target has a different lineage.

`loop_depth` counts active executable loop nesting only. `structural_depth` counts nested executable/control blocks, including conditionals, loops, and program blocks, whether or not they iterate. `loop_depth >= 3` is blocking; `structural_depth >= 4` is a warning for review and simplification, not an automatic runtime failure. These dimensions are reported separately and must not be conflated.

Static lint never declares a runtime pass. It returns `static_clean` when no deterministic issue is found. Official syntax examples are passed only after a real Stata run. `research_output_check` reports artifact, static, and substantive states separately; when no main log is supplied, `runtime_status` is `not_checked` even if requested output counts and hashes pass.

Blind validation keeps the source project outside the generation context. The independent agent receives only the natural-language contract, installed plugin, and declared input paths. `workflow_reproduction_check` judges semantic workflow evidence, required canonical-summary variable names, and shared data lineage; source-code similarity is used only to detect leakage. Numerical equality and fresh-run evidence remain separate checks.

For a new project, strict structure accepts path contracts in the top master or a directly called config, paths, or setup do-file. This keeps a thin master compatible with a centralized configuration stage.

Canonical summary-statistics work searches three dedicated checkpoints first: `descriptives.summary_dataset`, `exports.descriptive_excel_sheet`, and `figures.descriptive_bar`. The deposited AER/AEJ sources provide separate atoms for grouped mean/count, `tabstat` count/mean/SD materialization, grouped percentiles, collapse-to-long structure, first versus additional Excel sheets, and grouped bars. Compose only genuinely compatible atoms whose state contracts connect. Build one named dataset containing the complete declared statistic set for each declared group-period cell, and make both table and figure consumers read it. Mixed-statistic long assembly, workbook styling, or target semantics absent from the source spans use `general_rule` with the rank-relative nearest template retained only as a hint; they are not silently promoted to templates.

The fixed table rule is the final regression Excel content, not universal helper use. Preserve complete raw model headers, dependent-variable headers, coefficient rows, standard-error rows, omitted/base rows, and notes; add only adjusted R-squared and the estimation-sample dependent-variable mean. A workbook with one sheet uses visible direct `outreg2 replace/append` statements without a program, regardless of outcome or model-column count: compute the mean with `quietly summarize <depvar> if e(sample), meanonly`, bind `r(mean)` to a local, and use only `adjr2 addstat(Dep. variable mean, <that local>)`. Use the canonical `outreg2_xlsx` formatter only when one workbook requires two or more sheets. The same sheet-cardinality rule applies to separately grouped 2SLS first-stage estimates; do not add F-statistics or build a second IV table system. Generated workflows target Excel, PDF, and `.ster` only when durable estimates are needed. TeX, loop depth 3, unjustified depth-2 loops, structural depth 4 or greater (review warning), and encoded research-specification dispatch are reported under their separate severity rules.

File extensions follow the implementation scale: the direct no-program one-sheet path must use an explicit `.xls` target, while the canonical multi-sheet formatter writes `.xlsx`. Extensionless, `.xml`, or `.xlsx` direct `outreg2, excel` output is rejected.

Factor-variable interactions keep their native Stata coefficient names. The plugin blocks renaming and manual `treat_yYYYY`/`_yYYYY` substitutes. A conventional event-study RHS leaves the declared design reference absent and uses native single-`#` syntax. Before runtime confirmation, use a flat level-by-level no-base list. Compact selected levels such as `i(2015/2018 2020/2024).time#1.treatment` become eligible only after Stata confirms factor support, the omitted level, and the exact raw `e(b)` token for every declared nonreference level. `ibn(<numlist>)`, a second base marker, and `##` are invalid on this RHS. A separately justified `year##c.control` heterogeneous slope inside `absorb()` remains valid. Freeze event-study `keep()` selectors only after the same runtime readback. Display `order()` retains one blank slot for the omitted period so the zero reference point, x labels, and policy boundary stay on the correct event-time coordinates. Event-study graph text is English; Korean text in other graphs requires `Malgun Gothic`.

The raw-name contract treats the coefficient/standard-error table emitted by `outreg2` as the source of record. Final assembly preserves its native coefficient and note rows without a packaging-only `keep()`, filtering, synthesis, renaming, or coefficient reconstruction. It may order the presentation, place the table in sheets, add the two separately stored statistics, and set readable formatting. A declared baseline comparison covers all contracted outcomes, samples, and specifications for coefficients, standard errors, and base/omitted status; one representative regression is not a final equivalence check.

Estimate replace/seed, append, numbered `.ster` load, in-memory store, and restore are separate transitions. When the target topology matches, use the labeled reshape, `tsfill`, named `graph combine`, and collapse-with-label-round-trip blocks. A named sample-flow `postfile` is allowed only when the researcher supplies checkpoint meanings and order; it uses typed rows, named counts, and `postclose` without disturbing active data, and never reconstructs coefficients or tables.

One outcome and several outcomes follow the same sheet-cardinality decision. A reader-facing semantic `sheet_group` must be supported by variable labels, definitions, measurement relationships, or research purpose; no one field must match, and similar names are not evidence. Define the group once, record `decision_source` as `user`, `existing_project`, `model_from_metadata`, or `caller_declared` with separate `grouping_evidence`, and map it through `sheet_plan` to workbook, sheet, and sample placements. One sheet per workbook stays direct; two or more sheets in one workbook use `outreg2_xlsx` with each sheet's readable ordered estimate names. The tool also accepts an object wrapper whose `source`, `type`, or `kind` field contains one of those values or a documented alias, then normalizes it to the canonical string. Research do-files contain analysis commands only; they do not create setup files or installation preflight branches.

Event-study axes are planned separately from Excel sheets. Automatic y-axis scaling is the default. A common fixed range is used only for a declared `axis_group` of genuinely close, directly comparable outcomes under the same specification and sample comparison and with the same coefficient unit and transformation. The group and numeric minimum, maximum, and step require explicit evidence. `axis_group` is usually finer than `sheet_group`; neither hierarchy nor sheet membership can force an axis range, and the plugin never requires fixed axes for every event study.

Exactly one event-study outcome uses the direct no-loop automatic-axis variant. Two or more outcomes use one flat outcome loop; the raw outcome variable name appears alone at the top, the comparison/sample legend is below the axis, and PDF export occurs immediately before the loop closes. Automatic outcomes and genuinely close fixed-axis groups use separate complete variants, so no dispatcher or nested loop is needed.

Iteration is allowed and only the final frozen source is judged. If a selected block does not fit, discard it instead of stacking patches or wrappers. Search once more with the observed mismatch, then split at a natural state boundary or use `general_rule` with the rank-relative nearest inspected candidate available only as a hint. Do not infer compatibility from its rank. Harmless primitives stay unmarked. General-rule spans remain narrow: prefer one flat loop and allow depth 2 only for the reviewed substantial-repetition exception; keep shallow indentation, visible specifications, and no positional jobs, one-use programs, unused options, future-facing interfaces, unnecessary variables, or project-specific framework rules.

Reusable indexing has a separate raw-source and external-evidence rubric gate. Scope remains `general`, `method_specific`, `project_specific`, or `negative`; quality is separately recorded as `preferred_candidate`, `conditional_candidate`, `reference_only`, or `exclude`. Variable names, keys, file names, and required data shape are expected bindings, not automatic project-specific defects. A reusable label's source-evidenced `input_signature` is compared with the target before ranking; known mismatches block automatic reuse and `unknown` fields trigger inspection rather than invention. Harmful coupling means hidden sentinels, author-only helpers/globals, scattered coordinated edits, positional job-string dispatch, or project research choices embedded in control flow. Only preferred/conditional rows may be auto-selected; reference-only rows stay visible for gap diagnosis and are never silently copied. Explicit method/state terms are a compatibility gate before generality bonuses. The multi-sheet Excel formatter is the only explicit user-approved canonical exception. See `review/generality_selection_review.md` and `review/generality_rubric_sources.md`.

Selected labels retain source and edit evidence in the session or requested audit. No project manifest is created by default. `template_reuse_check` is an opt-in persistent audit: skipped compatible templates are advisory by default and block only under explicit strict enforcement. `general_rule` rows represent a declared formula, dictionary gap, or template mismatch with `nearest_template_hint`, `template_status`, and `hint_used`. Legacy manifest vocabulary is accepted only for read compatibility.

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
python scripts\build_evidence_layers.py
python scripts\build_command_template_coverage.py --write-review
```

`build_evidence_layers.py` reads and validates the checked-in schema-2 paper-occurrence ledger before producing the non-competing guide and research-usage indexes. The separate `build_corpus_usage_occurrences.py` and `build_template_promotion_audit.py` CLIs rebuild that checked-in evidence only in the development repository when their raw independent-audit inputs are supplied; those raw `work/` and catalog inputs are intentionally excluded from the release. Release-owned regression tests reconstruct sanitized fixtures from the canonical ledgers. `build_command_template_coverage.py` verifies the 100-group/395-variant Top 100 contract and writes `review/command_template_coverage.md`; `build_top100_evidence_report.py` writes the machine-readable and Markdown command-by-command evidence matrices, including a code-free metadata ledger for all 454 guide records and a separate full-code ledger for 109 deposited paper blocks, plus candidate/reference/excluded, unmapped, code-unavailable exact-support, and gap sections. The ranking method, public rank appendix, evidence boundaries, corpus denominators, and primary-source limits are recorded in `review/top100_command_research_basis.md`; `review/top50_command_research_basis.md` remains the frozen-prefix history.

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
