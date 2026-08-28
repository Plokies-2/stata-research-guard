---
name: stata-replication-workflow
description: Create, revise, or review complete Stata research workflows using curated research-practice code conventions. Use for master.do or runall design, project paths, raw-to-final data preparation, integrity checks, labels, merges, panels, descriptive statistics, balance and sample flow, regressions, robustness, figures, tables, exports, or audits of one or more .do files.
---

# Stata Research Workflow

Use the `stataResearchGuard` MCP server as the evidence and validation layer. Its reviewed corpus informs implementation; it does not certify a journal submission or make every deposited line reusable.

## Route before acting

1. Classify the request as read-only review, bounded revision, new first build, or explicit overhaul. Review, audit, diagnosis, explanation, and explicit no-change language authorize no write.
2. Inspect the target and active entrypoint read-only. Preserve compatible names, paths, call order, estimate handoffs, workbook/sheet names, and output contracts.
3. Before writing or adapting substantive code, read [general-rules.md](references/general-rules.md). It is the binding authoring contract and includes the plugin's readability house style.
4. Read only the additional reference required by the task:
   - [general-rule-authoring.md](references/general-rule-authoring.md) for end-to-end generation, template adaptation, source-reuse cloning, or a persistent template-reuse audit;
   - [manual-first-policy.md](references/manual-first-policy.md) for official syntax, returned-state, or Top 100 example coverage;
   - [quality-policy.md](references/quality-policy.md) for audit severity, scope, and readiness claims;
   - [readme-contract.md](references/readme-contract.md) for an approved new build or overhaul with a researcher-facing README;
   - [workflow-taxonomy.md](references/workflow-taxonomy.md) when deciding whether a new workflow covers the requested stages;
   - [workflow-reproduction-evaluation.md](references/workflow-reproduction-evaluation.md) for blind or source-isolated forward testing.
5. Resolve only the substantive transitions in scope. Call `resolve_transition_evidence` first; use manual or legacy searches only when its route requires deeper syntax evidence or gap diagnosis.

Harmless primitives such as declared input loading, inspection, assertions, labels, simple setup, logging, and one-off summaries need no checkpoint, ledger row, or provenance marker. A primitive becomes part of a substantive transition when its returned state determines a sample, estimand, transformation, estimate handoff, or output.

## New and existing projects

For a new applied-micro panel project that actually needs preparation, summary, and estimation, the default spine is:

```text
masters.do
do/build_analysis_panel.do
do/build_summary.do
do/run_regressions.do
```

`build_analysis_panel.do` completes all preprocessing shared by summaries and regressions, labels and checks persistent variables, and saves one analysis-ready cleaned panel. The summary and regression files each reopen that panel independently. Summary outputs may include Excel and descriptive PDFs; regression outputs may include Excel, event-study PDFs, and reusable `.ster` estimates.

This is a default for a new compatible workflow, not a migration target. For an existing project, call `plan_dictionary_repairs` with the exact request, preserve completed stages, and change only the bounded defective or requested transitions. Do not split, rename, or reorder a compatible project to resemble the default spine. A coherent do-file around 1000 lines may remain intact: add section headings first and split only at a durable artifact, independent rerun, genuine reuse, ownership boundary, or distinct responsibility. The line count is guidance, never a lint threshold.

When the user identifies an existing `.do` file as the exact frame for a lightly adapted sibling, use `plan_dictionary_repairs.source_reuse`. Declare every allowed literal edit and occurrence count, prune unrelated trees with planner scope, copy first, and accept only `verified_exact` readback.

## Pre-write gate

Before creating or modifying project files, show the exact folders and files to create or modify, any moves, renames, deletions or overwrites, the entrypoint, and the execution command. For an overhaul, also show one exact proposed tree, every new persistent variable and its reader-facing definition/source or formula/unit/observation level/creation file/coding and missing rule/use, and the root README action. State the selected `report_policy`. Wait for explicit approval unless the user's current request already supplies this exact scope and explicitly authorizes the writes.

Do not add dependency inventories, installers, deployment or submission scaffolds, template manifests, or extra reports unless requested by the applicable contract.

## Template and implementation boundary

Apply the general rules to direct implementation and to template selection, binding, adaptation, and verification. A template is optional and valid only when permitted bindings leave its complete atomic transition intact. If its frame, algorithm, control flow, interface, estimate handoff, or output contract must change, stop calling it a template. Split at a natural state boundary or implement the already-declared transition as `general_rule`.

Guide mechanics are code-free, non-writable command/option/state metadata linked to authoritative manuals or maintainer documentation. They never supply an internal synthesized code body. Paper occurrences are context, not generation authority. At most one explicitly promoted, profile-compatible usage row may implement one transition. Never splice competing variants. A search-ranked nearest candidate is only a nonbinding hint and may still be incompatible. General rules never choose an unresolved sample, estimand, merge key, treatment rule, model, event axis, sheet group, or output placement.

Iteration is allowed. Revise from concrete lint, runtime, or output evidence, then leave one final implementation path per transition. Remove patched-over variants, wrappers, dead helpers, unused macros/options, commented alternatives, and stale provenance before freezing.

## Researcher-readable Stata house style

These are strong defaults for newly generated or currently revised code, not universal Stata textbook rules and not retroactive errors for untouched projects.

- Prioritize correctness, point-of-use readability, artifact-based restartability, then brevity, DRY, and modularity. A reader should understand the active transformation, sample, model, and output without tracing aliases upward.
- Use a direct literal for a one-use binding. Otherwise define or redefine a descriptive `global` in the consuming do-file. Keep shared directory roots in `masters.do`; outcome-list globals belong in `run_regressions.do`.
- Never chain substantive aliases such as `controls_current -> controls_2019 -> controls_base`.
- In authored regression code, keep treatment/event window, controls, sample, fixed effects, weights, and VCE at zero substantive reference depth in the estimator block. One local outcome iterator in one flat loop is the normal exception. Use separate visible blocks when specifications differ.
- Reserve `local` for lexical cases: loop/program state, temp objects, per-iteration scratch, or an immediately consumed `r()`/`e()` result. Do not hide a model specification in locals and do not attempt to judge lexical necessity in every Stata context.
- Prefer explicit sequential blocks or one flat loop. Depth two is allowed only when two plain axes repeat one mechanical body and substantially reduce duplication without hiding research or output choices. Loop depth three is blocking. Do not encode research choices in positional job strings or dispatchers.
- Do not add one-use programs, one-item loops, registries, unused options, speculative branches, future-facing interfaces, unnecessary variables, manual event dummies, or coefficient reconstruction. A program is allowed only when a direct block cannot provide a required interface; the standing formatter exception is the approved multi-sheet `outreg2_xlsx` contract.
- Format long lists as meaningfully grouped, aligned multiline blocks. Use `///` only when the next physical line continues the same command and omit it from the final physical line.
- Define and label each new persistent variable near creation. Verify merge keys and retained states; never use `merge m:m`, force-drop duplicates, or suppress a core error with a dependency probe.
- Record named observation counts after consequential filters and retained-state merges so the sample flow from raw input to reported outputs remains visible.

## Master, event-study, and output contracts

A new `masters.do` lists exact persistent files under `Project Inputs` and `Project Outputs`. Each direct `do` call has exact `Input: ...`, exact `Output: ...` or `Output: none`, and a concise Korean role comment. File inventories are blocking for new code; prose completeness, punctuation, and exact blank-line adjacency are advisory. Lint it with `role: "master", authoring_state: "new"`.

Preserve native factor-variable and raw `e(b)` names. Do not generate `treat_yYYYY` or `_yYYYY` aliases. For a conventional event study, leave the declared reference absent and use one `#`. **If Stata runtime is not being run or exact raw coefficient names have not been read back, use a flat level-by-level native no-base list; do not auto-select compact syntax.** A runtime-confirmed compact alternative and its limits are documented in [general-rules.md](references/general-rules.md). Signed relative time must be recoded to a nonnegative factor index and restored only in graph labels.

Preserve every raw `outreg2` header, coefficient, standard-error, omitted/base, and note row. For one sheet in a workbook, run `quietly summarize <depvar> if e(sample), meanonly`, bind `r(mean)` to a lexical local, and use visible direct `outreg2 replace/append` with an explicit `.xls` target; add only adjusted R-squared and that dependent-variable mean. Use the canonical `.xlsx` formatter only when one workbook requires two or more sheets. Do not emit TeX. Export each event-study PDF immediately; one outcome uses a direct no-loop graph, while multiple outcomes use one flat outcome loop. Automatic axes are the default; fixed groups require explicit comparability evidence.

## Validation and reporting

After writing, lint every changed do-file and fix errors. Audit the active reachable workflow; use `scope.mode: all` or bounded include/exclude paths only when requested. Multiple plausible masters require explicit entrypoints rather than an arbitrary choice. Keep `runtime_success`, `static_audit`, and `substantive_validity` separate.

Use `report_policy: required|optional|disabled`. Code writing defaults to `required`, standalone read-only audit to `optional`, and an explicit no-report request to `disabled`. Under `required`, root `report.md` records each final template and substantive `general_rule` span with exact project-relative path and one-based range; harmless primitives and the declared master shell are not rows. Under `disabled`, do not touch the report. Keep provenance out of research `.do` comments.

When execution is requested, run only the approved entrypoint, preserve inputs and baselines, and verify the exact declared `.dta`, `.ster`, Excel, PDF, and log outputs. A static pass is not a syntax or substantive pass. Never claim journal certification.
