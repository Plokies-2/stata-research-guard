# Stata Research Guard Instructions

Use this plugin as a source of command grammar and real-paper context. The model remains responsible for command choice, project-specific research design, and implementation.

## Evidence flow

Phase 1 includes the full common `main_rules`; later phases carry its source path and SHA-256 reference without repeating the text.

1. Call `get_stata_command_evidence` with `request` only. Read the registry-ordered compact 115-command index and choose the exact command yourself. The index is a curated starting point, not a closed boundary.
2. Call it with `request` and nonempty exact `selected_commands`. Registered commands return bundled evidence. An exact out-of-dictionary command triggers live installed-help lookup inside Guard and returns no bundled expansion or paper catalog. Read every packet and compare interfaces when multiple commands were genuinely needed.
3. When more context would materially help, call combined Phase 3 with the same `selected_commands` boundary and `expanded: true`. Put only the commands whose longer documentation is actually needed in the nonempty exact `expanded_commands` subset. Independently add one or more exact `block_id` values as `selected_block_ids` when paper context would help. Documentation-only, paper-only, and combined requests are valid, but at least one of those two selections must be present. Read only the returned Stata 18 manual entries or limited author supplement and the selected slim raw paper cards with optional `paper_log_contexts`. Do not expand every selected command by default, request an empty or `all` selection, or ask the server to choose a command or block.

After reading help, proceed without more evidence when it explains every action required for the current request, the code follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream-interface question remains. Expand when one of those points is unresolved, difficult code would benefit from worked source context, or the user requests explanation or a research-use example beyond syntax. Do not request more context merely because a command is statistical, user-written, data-changing, or connected to an output step.

If bundled or live help is unavailable, or a material syntax or behavior detail remains unclear, state the limitation and stop only that command branch. Do not treat paper code, implementation source, memory, another command, or a manual implementation as grammar authority.

When help or expanded documentation reports explicitly marked StataNow-only features, do not use those options in a base Stata 18 workflow unless the active environment actually provides the relevant StataNow features.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Keep the current project's command and research specification. Surrounding outcomes, samples, controls, estimators, FE, VCE, event windows, output formats, and paths are nonbinding. An `outreg2` example containing `areg` or `reghdfe` does not change a selected `regress`.

When a directly linked log or artifact exists, `paper_log_contexts` carries the stored raw excerpt and direct metadata. Do not reinterpret it into result facts, returned-state classifications, scores, validation labels, or recommendations. When no context exists, accept the empty array; do not rerun the paper or infer missing output.

The product does not use `command_paper_index`, paper-review summaries, integrity audit JSON, INCLUDE/EXCLUDE decisions, pass/fail flags, promotion queues, or project scans. Do not restore them.

## Writing boundary

After Guard and mcpStata are both callable, read-only session lifecycle and structured data, metadata, value, row, log, graph-list, or returned-state inspection may proceed without a fresh Phase 2 lookup for each action. Obtain Phase 2 before writing or revising Stata code, changing or saving data, estimation or testing, export, or consequential downstream use of returned state.

Preserve the user's literal scope and compatible project interfaces. Review-only requests authorize no write. For approved edits, inspect the current source and implement the simplest readable solution under `general-rules.md`.

Keep samples, models, fixed effects, weights, VCE, event windows, and output destinations visible. In each core regression or estimation call, write the outcome, treatment or event terms, consequential sample, controls, fixed effects, weights, and VCE variable names literally rather than hiding them in macros. Preserve native factor-variable and raw `e(b)` names. Indent only real control-flow scopes and avoid unnecessary programs, deep loops, positional dispatch, speculative options, manual coefficient reconstruction, and scratch package or file checks.

Do not build deterministic software that scores, ranks, selects, promotes, grades, classifies, or certifies generated Stata semantics, command choices, research specifications, or code quality. Model reasoning and ordinary source-grounded review remain allowed; there is no `audit_pending` product state or mandatory audit queue.

When execution is requested, report runtime exit, logs, produced files, and returned state as observations. Keep transport checks, runtime completion, substantive interpretation, and causal validity distinct.
