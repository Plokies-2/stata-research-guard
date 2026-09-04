# Stata Research Guard Instructions

Use this plugin as a source of command grammar and real-paper context. The model remains responsible for command choice, project-specific research design, and implementation.

## Evidence flow

Every phase includes complete compact `main_rules`, source path and SHA-256. Read the rules once for the relevant task and revisit affected sections when scope or rules change. Lookup, exemption and reuse boundaries are defined in `skills/stata-replication-workflow/references/command-evidence.md`.

1. Do not call Guard for read-only explanation or review, comment/bookmark/whitespace-only edits, formatting-only source changes, literal path or label replacement that leaves the command interface unchanged, verbatim relocation of an existing command block, or execution of an unchanged file when no command semantic is in question.
2. When the material command is unresolved, call `get_stata_command_evidence` with `request` only and use the compact 115-command index to choose. When the exact material command is already clear, skip Phase 1 and call Phase 2 directly. The index is a curated starting point, not a closed boundary.
3. Call Phase 2 with `request` and nonempty `selected_commands` only for commands whose syntax, material options, returned results, or downstream interface matter. Registered commands return bundled evidence. A registered multiword Stata spelling such as `export excel` is normalized transparently to `export_excel`. The tokens `global`, `local`, `tempfile`, and `tempname` use official `macro` help without changing the requested label. Use `ifcmd` for programming `if` and `if` for the observation qualifier. An exact out-of-dictionary command triggers live installed-help lookup inside Guard.
4. When more context would materially help, call combined Phase 3 with the same `selected_commands` boundary and `expanded: true`. Put only the commands whose longer documentation is actually needed in `expanded_commands`. Independently add exact `block_id` values as `selected_block_ids` when paper context would help. Empty optional arrays mean no selection, but at least one documentation or paper selection must be nonempty. Do not expand every selected command by default or ask the server to choose a command or block.

After reading help, proceed without more evidence when it explains every action required for the current request, the code follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream-interface question remains. Expand when one of those points is unresolved, difficult code would benefit from worked source context, or the user requests explanation or a research-use example beyond syntax. Do not request more context merely because a command is statistical, user-written, data-changing, or connected to an output step.

If bundled or live help is unavailable, or a material syntax or behavior detail remains unclear, state the limitation and stop only that command branch. Do not treat paper code, implementation source, memory, another command, or a manual implementation as grammar authority.

When help or expanded documentation reports explicitly marked StataNow-only features, do not use those options in a base Stata 18 workflow unless the active environment actually provides the relevant StataNow features.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Keep the current project's command and research specification. Surrounding outcomes, samples, controls, estimators, FE, VCE, event windows, output formats, and paths are nonbinding. An `outreg2` example containing `areg` or `reghdfe` does not change a selected `regress`.

When a directly linked log or artifact exists, `paper_log_contexts` carries the stored raw excerpt and direct metadata. Do not reinterpret it into result facts, returned-state classifications, scores, validation labels, or recommendations. When no context exists, accept the empty array; do not rerun the paper or infer missing output.

The product does not use `command_paper_index`, paper-review summaries, integrity audit JSON, INCLUDE/EXCLUDE decisions, pass/fail flags, promotion queues, or project scans. Do not restore them.

## Writing boundary

After Guard and mcpStata are both callable, read-only session lifecycle and structured data, metadata, value, row, log, graph-list, or returned-state inspection may proceed without a fresh Phase 2 lookup for each action. Obtain Phase 2 before writing or revising a material Stata command, changing or saving data, estimation or testing, export, or consequential downstream use of returned state. Reuse it while the command, version, material options, returned-result interface, and downstream use remain unchanged; comments, layout, literal paths, and code location do not invalidate it.

Preserve the user's literal scope and compatible project interfaces. Retaining an existing analysis, robustness check, placebo, permutation, or export does not authorize a new mode, positional argument, dispatcher, conditional branch, `program`, ado, estimator wrapper, exporter wrapper, or generic helper unless the user explicitly requests that reusable interface or the current project already requires it. Repetition and line-count reduction do not supply that authority. Review-only requests authorize no write. For approved edits, inspect the current source and implement the simplest readable solution under `general-rules.md`.

If actual Stata execution shows that a Guard-selected official or maintainer command is not installed, keep installation out of estimation and regression code and do not substitute or reimplement the command. Follow the official or maintainer installation guidance in a separate step, install only the required package within the user's authority, restart Stata, and continue with the original command. Do not restore `which`, `capture which`, `findfile`, `ado dir`, or `confirm command` availability probes.

For newly created `.do` modules, or files renamed within a user-approved structural refactor, use workflow-role names such as `cleaning_data.do`, `summary.do`, `regression.do`, `robustness.do`, `permutation.do`, or `placebo.do` rather than names that embed an outcome, period, or threshold such as `main_early_reaction_share10.do`. Do not retroactively rename existing modules; update master files, call sites, and documentation together only within the approved scope.

Keep samples, models, fixed effects, weights, VCE, event windows, and output destinations visible. In each core regression or estimation call, write the outcome, treatment or event terms, consequential sample, controls, fixed effects, weights, and VCE variable names literally rather than hiding them in macros. For repetition, keep the estimator and exporter inside the shallow readable loop; a parameter-heavy call is not transparent merely because its options are visible. Use the selected command or exporter for every feature it already supports, and add manual code only for a concrete remainder such as assembling native `outreg2` tables into required workbook sheets; do not reconstruct coefficients, standard errors, significance markers, headers, or notes in a second path. Preserve native factor-variable and raw `e(b)` names. Indent only real control-flow scopes and avoid unnecessary programs, deep loops, positional dispatch, speculative options, parameter plumbing, manual coefficient reconstruction, and scratch package or file checks.

Do not build deterministic software that scores, ranks, selects, promotes, grades, classifies, or certifies generated Stata semantics, command choices, research specifications, or code quality. Model reasoning and ordinary source-grounded review remain allowed; there is no `audit_pending` product state or mandatory audit queue.

When execution is requested, report runtime exit, logs, produced files, and returned state as observations. Keep transport checks, runtime completion, substantive interpretation, and causal validity distinct.
