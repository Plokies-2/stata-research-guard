# Stata Research Guard Instructions

Use this plugin as a source of command grammar and real-paper context. The model remains responsible for command choice, project-specific research design, and implementation.

## Evidence flow

Every tool response includes the common `main_rules` from `general-rules.md`.

1. Call `get_stata_command_evidence` with `request` only. Read the registry-ordered 115-command dictionary and choose one exact canonical command key when the fit is clear. Choose multiple keys only when different stages need them or genuine alternatives remain.
2. Call it with `request` and nonempty exact `selected_commands`. Read every returned `command_evidence` packet. When multiple packets were requested, compare documented purpose, required inputs, syntax, outputs, tradeoffs, and incompatibilities before choosing the implementation. Each packet independently contains `help_status`, Stata-rendered official or maintainer `command_help`, factual `expanded_documentation` status, and a compact `paper_example_catalog`. Phase 2 contains no expanded document, raw paper code, occurrences, logs, project scan, ranking, or recommendation.
3. When more context would materially help, call combined Phase 3 with the same `selected_commands` boundary and `expanded: true`. Put only the commands whose longer documentation is actually needed in the nonempty exact `expanded_commands` subset. Independently add one or more exact `block_id` values as `selected_block_ids` when paper context would help. Documentation-only, paper-only, and combined requests are valid, but at least one of those two selections must be present. Read only the returned Stata 18 manual entries or limited author supplement and the selected slim raw paper cards with optional `paper_log_contexts`. Do not expand every selected command by default, request an empty or `all` selection, or ask the server to choose a command or block.

After reading help, proceed without more evidence when it explains every action required for the current request, the code follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream-interface question remains. Expand when one of those points is unresolved, difficult code would benefit from worked source context, or the user requests explanation or a research-use example beyond syntax. Do not request more context merely because a command is statistical, user-written, data-changing, or connected to an output step.

If a selected command reports `help_status=partial` or `help_status=unavailable`, or a material syntax or behavior detail remains unclear, state the limitation for that command branch. Do not treat the paper catalog, implementation source, memory, another command, or a manual implementation as grammar authority. The catalog remains available as factual context, including for commands without help, but it does not fill a help gap. If the necessary command is outside the dictionary, report the missing command or capability and stop.

When help or expanded documentation reports explicitly marked StataNow-only features, do not use those options in a base Stata 18 workflow unless the active environment actually provides the relevant StataNow features.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Keep the current project's command and research specification. Surrounding outcomes, samples, controls, estimators, FE, VCE, event windows, output formats, and paths are nonbinding. An `outreg2` example containing `areg` or `reghdfe` does not change a selected `regress`.

When a directly linked log or artifact exists, `paper_log_contexts` carries the stored raw excerpt and direct metadata. Do not reinterpret it into result facts, returned-state classifications, scores, validation labels, or recommendations. When no context exists, accept the empty array; do not rerun the paper or infer missing output.

The product does not use `command_paper_index`, paper-review summaries, integrity audit JSON, INCLUDE/EXCLUDE decisions, pass/fail flags, promotion queues, or project scans. Do not restore them.

## Writing boundary

Preserve the user's literal scope and compatible project interfaces. Review-only requests authorize no write. For approved edits, inspect the current source and implement the simplest readable solution under `general-rules.md`.

Keep samples, models, fixed effects, weights, VCE, event windows, and output destinations visible. In each core regression or estimation call, write the outcome, treatment or event terms, consequential sample, controls, fixed effects, weights, and VCE variable names literally rather than hiding them in macros. Preserve native factor-variable and raw `e(b)` names. Indent only real control-flow scopes and avoid unnecessary programs, deep loops, positional dispatch, speculative options, manual coefficient reconstruction, and scratch package or file checks.

Do not build deterministic software that scores, ranks, selects, promotes, grades, classifies, or certifies generated Stata semantics, command choices, research specifications, or code quality. Model reasoning and ordinary source-grounded review remain allowed; there is no `audit_pending` product state or mandatory audit queue.

When execution is requested, report runtime exit, logs, produced files, and returned state as observations. Keep transport checks, runtime completion, substantive interpretation, and causal validity distinct.
