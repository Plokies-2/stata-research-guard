# Stata Research Guard: maintained contract

The operational entrypoint is `skills/stata-replication-workflow/SKILL.md`. Before writing or adapting substantive Stata code, apply `skills/stata-replication-workflow/references/general-rules.md`. Load the other references only for the modes named by the skill.

## Scope and authority

- Review, audit, diagnosis, explanation, and explicit no-change requests are read-only. A caller option cannot widen them into a write or overhaul.
- Preserve compatible existing entrypoints, paths, names, call order, estimate handoffs, workbook/sheet names, and output contracts. Partial repair is the default.
- Before a project write, show the exact write footprint, entrypoint, execution command, and overwrite effects. An explicit overhaul also requires the proposed tree, persistent-variable dictionary, and README action.
- Do not add dependency, installation, deployment, submission, manifest, or reporting artifacts unless the applicable user contract requires them.

## Authoring contract

Implement only declared input-to-output transitions. Call `resolve_transition_evidence` first for substantive reusable work. Guide mechanics are non-writable syntax evidence; paper occurrences are context; a usage template is optional and valid only when permitted bindings leave one complete atomic transition intact. If its frame, algorithm, control flow, interface, estimate handoff, or output contract must change, split at a natural state boundary or use `general_rule`. Never let a template or general rule invent a sample, estimand, merge key, treatment, model, event axis, sheet group, or output placement.

Prioritize correctness, point-of-use readability, and restartable artifacts before brevity, DRY, or modularity. For a new compatible applied-micro panel workflow needing preparation, summary, and estimation, default to unnumbered `masters.do`, `do/build_analysis_panel.do`, `do/build_summary.do`, and `do/run_regressions.do`; build one cleaned panel first and reopen it independently for summaries and regressions. Preserve compatible existing layouts. A coherent file around 1000 lines may remain intact; split only for a real artifact, rerun, reuse, ownership, or responsibility boundary.

The following are plugin house style, not universal Stata textbook rules and not retroactive errors for untouched code:

- use a literal once and otherwise a descriptive `global` in the consuming do-file;
- keep shared roots in `masters.do` and outcome-list globals in `run_regressions.do`;
- never chain substantive aliases;
- keep authored regression treatment/event window, controls, sample, fixed effects, weights, and VCE at zero substantive reference depth;
- reserve `local` for lexical loop/program/temp/scratch/immediately consumed returned-state cases;
- prefer visible blocks or one flat loop; allow depth two only for substantial repetition over two plain axes and block depth three;
- do not add one-use programs, one-item loops, registries, dispatchers, unused options, future interfaces, manual event dummies, or coefficient reconstruction;
- align long lists by meaning and use `///` only for an immediately continued command.

## Project and output contracts

A new `masters.do` lists exact persistent `Project Inputs` and `Project Outputs`. Every direct `do` call has exact `Input: ...`, exact `Output: ...` or `Output: none`, and a concise Korean role comment. File inventories are blocking for new code; prose completeness, punctuation, and blank-line adjacency are advisory.

Preserve native factor-variable and raw `e(b)` names. If Stata runtime is not being run or exact raw coefficient names have not been read back, use a level-by-level native no-base list and do not auto-select compact syntax. The event-study RHS uses one `#`, leaves the reference absent, and never substitutes manual dummies. A compact form is eligible only after runtime confirms support, the omitted level, and exact coefficient names.

Final Excel preserves every raw `outreg2` header, coefficient, standard-error, omitted/base, and note row. A one-sheet workbook uses `quietly summarize <depvar> if e(sample), meanonly`, a lexical local for `r(mean)`, and direct visible `.xls` output; it may add only adjusted R-squared and that dependent-variable mean. The canonical `.xlsx` formatter is reserved for two or more sheets in one workbook. Figures are PDF, reusable estimates are `.ster`, and TeX output is prohibited. One event-study outcome uses a direct graph; multiple outcomes use one flat outcome loop with immediate PDF export. Automatic axes are the default.

## Audit, reporting, and claims

Audit the active reachable entrypoint by default. Explicit `scope.mode: all` or bounded include/exclude paths may widen it; multiple plausible masters require explicit entrypoints. Master Input/Output findings follow `authoring_state`: error for new, warning for modified, nonblocking for untouched audit. Keep runtime success, static audit, and substantive validity separate.

Use `report_policy: required|optional|disabled`: code writing defaults to required, standalone audit to optional, and explicit no-report to disabled. Required reports record final template and substantive `general_rule` spans; harmless primitives and the declared master shell are not rows. Keep provenance out of research code.

Lint changed files, remove superseded implementations, and leave one final path per transition. Verify only the approved `.dta`, `.ster`, Excel, PDF, and log outputs. Never claim journal certification.
