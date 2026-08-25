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
- blocking guards against deep structural nesting and positional job-string dispatch that hides research specifications behind `word` parsing
- derived-reference pruning that removes depth-3-or-greater and TeX-output examples while preserving raw corpus provenance
- cross-file project audits, including a root Makefile that explicitly orders multiple Stata do-files
- a workflow-reproduction contract check over entrypoints, stage roles, call graphs, required files, exact deliverable counts, estimation tokens, and summary-data lineage
- a research-output check over the mandatory template/fallback `report.md`, static audit, researcher-facing README tree and variable descriptions, actual log, exact output counts, and directly calculated hashes

The tool does not claim journal certification. It distinguishes useful spans from unsafe lines within the same deposited package.

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

After any code creation or revision, root `report.md` records every selected template and every general-rule fallback with `mode`, project-relative `.do` target, actual one-based inclusive line range, checkpoint, template label or fallback `-`, and reason. Each fallback reason uses `nearest_template_hint=<label_id|none>; fallback_trigger=<no_suitable_template|wrong_selection>; hint_used=<borrowed idea|none>`. Harmless primitives are omitted. When neither mode was used, the report states that explicitly. `research_output_check` requires this file, while the detailed template-reuse manifest remains opt-in.

The checkpoint contract keeps a stable English machine key and explicit Korean/English display names. Each non-negative label carries a source-evidenced `template_input_profile`: data structure, record unit, required keys, source basis, time structure, and variable characteristics. Compare it with the target before minimal editing; known mismatches block automatic reuse and unresolved facts stay `unknown`. The compact `input_signature` remains supporting evidence. Every annotation build refreshes `review/dictionary_toc.md` and `review/labeling_review.md`, so a researcher can inspect headword maturity, variant counts, profile completeness, state-specific coverage, source spans, and open review questions before labeling is complete. `review/review_queue.md` is the manually maintained priority list and is never overwritten by the builder.

`inspect_dictionary_coverage` keeps corpus accounting separate from dictionary size. It reports each package's `.do` files and lines reviewed, 11-stage judgment, exclusions, unresolved questions, and safe candidates still awaiting labeling. `end_to_end_read` is the reviewer's full-read attestation; the builder separately opens every cataloged `.do`, recomputes its SHA-256 and line count, and validates every cited path and span. This is auditable file coverage, not proof of human attention, input-signature completeness, or a Stata runtime pass. A package can be fully reviewed yet contribute no reusable block, and a frequently represented headword can still have a narrow or underspecified state contract.

`plan_dictionary_repairs` is the entrypoint for an existing project. It scans interfaces and artifacts, keeps review questions read-only, and bounds the requested footprint. It ranks compatible blocks for relevant headwords and marks the rest of the workflow `preserve`. Missing headword coverage is reported rather than thrown as an error, so the model can implement the declared change directly without widening the project. Automatic mode defaults to partial repair; overhaul still requires explicit intent or recorded incompatibility evidence.

Static lint never declares a runtime pass. It returns `static_clean` when no deterministic issue is found. Official syntax examples are passed only after a real Stata run. A workflow is `verified` only when `research_output_check` also validates the requested README, log, output counts, and artifact hashes.

Blind validation keeps the source project outside the generation context. The independent agent receives only the natural-language contract, installed plugin, and declared input paths. `workflow_reproduction_check` judges semantic workflow evidence, required canonical-summary variable names, and shared data lineage; source-code similarity is used only to detect leakage. Numerical equality and fresh-run evidence remain separate checks.

For a new project, strict structure accepts path contracts in the top master or a directly called config, paths, or setup do-file. This keeps a thin master compatible with a centralized configuration stage.

Canonical summary-statistics work searches three dedicated checkpoints first: `descriptives.summary_dataset`, `exports.descriptive_excel_sheet`, and `figures.descriptive_bar`. The deposited AER/AEJ sources provide separate atoms for grouped mean/count, `tabstat` count/mean/SD materialization, grouped percentiles, collapse-to-long structure, first versus additional Excel sheets, and grouped bars. Compose only genuinely compatible atoms whose state contracts connect. Build one named dataset containing the complete declared statistic set for each declared group-period cell, and make both table and figure consumers read it. Mixed-statistic long assembly, workbook styling, or target semantics absent from the source spans remain narrow fallback with the rank-relative nearest template supplied only as a hint; they are not silently promoted to templates.

The fixed table rule is the final regression Excel content, not universal helper use. Preserve complete raw model headers, dependent-variable headers, coefficient rows, standard-error rows, omitted/base rows, and notes; add only adjusted R-squared and the estimation-sample dependent-variable mean. A workbook with one sheet uses visible direct `outreg2 replace/append` statements without a program, regardless of outcome or model-column count: compute the mean with `quietly summarize <depvar> if e(sample), meanonly`, bind `r(mean)` to a local, and use only `adjr2 addstat(Dep. variable mean, <that local>)`. Use the canonical `outreg2_xlsx` formatter only when one workbook requires two or more sheets. The same sheet-cardinality rule applies to separately grouped 2SLS first-stage estimates; do not add F-statistics or build a second IV table system. Generated workflows target Excel, PDF, and `.ster` only when durable estimates are needed. TeX, loop depth 3, unjustified depth-2 loops, deep structural nesting, and encoded research-specification dispatch are blocked.

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
python scripts\build_manual_reference.py
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
