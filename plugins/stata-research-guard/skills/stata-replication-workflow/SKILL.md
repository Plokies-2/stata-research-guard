---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using compact authoring rules, official or maintainer command evidence, and selected real-paper context; do not use it as a command selector, code grader, or research-design certifier.
---

# Stata Research Workflow

Make project-specific research decisions yourself. Guard supplies rules, grammar, and selected examples, not a verdict.

Read [general-rules.md](references/general-rules.md) once when beginning the relevant Stata task, from the file or a current complete Guard response. Revisit affected sections when the task scope or rules change. Compare source and changed call sites directly; runtime success or fewer lines alone does not establish research readability. [command-evidence.md](references/command-evidence.md) defines all lookup, exemption, and reuse boundaries.

## Flow

1. Respect the user's write boundary and inspect the active project. Preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and outputs. Apply the role-based `.do` naming rule only to new modules or an approved structural rename, updating related calls and documentation together.
2. For large data construction, complex specification changes, or an explicit review request, use a fresh read-only peer researcher with `stata-peer-audit` when it will add useful independent judgment. Choose pre-edit review for unresolved structural choices or post-run review for implementation and results; do not require both for every change. Prefer `gpt-5.6-terra` at `high` with `fork_turns: "none"` unless current user or project instructions specify otherwise.
3. Confirm both `stataResearchGuard` and mcpStata are callable before material Stata work. Use mcpStata for the live session, execution, logs, graphs, returned state, and produced artifacts.
4. Skip Guard for read-only review or explanation, comment or formatting-only edits, literal path or label changes with an unchanged command interface, verbatim relocation, and unchanged-file execution with no semantic issue. When a material command is unresolved, use Phase 1 discovery. When it is clear, call Phase 2 directly for only the commands whose interface matters.
5. Stop after Phase 2 when the help resolves the requested action. Use Phase 3 only for exact selected commands that need longer documentation or exact paper blocks that would materially help. Never expand everything by default.
6. Write the simplest direct implementation consistent with the data, research specification, documented command semantics, and downstream interfaces. For a refactor, reduce indirection and manual reconstruction rather than lines: repeated calls do not authorize a new `program`, estimator wrapper, exporter wrapper, or parameter-heavy helper. Run safe requested work, then inspect the actual data, logs, tables, figures, estimates, and files. If runtime shows a selected documented command is not installed, use a separate, authority-bounded installation step, restart Stata, and resume with that command; never insert the installation into estimation code or invent a substitute.
7. Review the changed code and observed results proportionately. Address concrete findings and repeat checks only for changes or unresolved concerns. If independent review is unavailable, perform the checks you can and disclose the remaining limitation; do not stop editing or delivery solely because a reviewer could not run. Honor an explicit user requirement for independent review without claiming it was completed.

## Audit handoff

- Do not audit read-only explanation, comments, whitespace, formatting-only work, literal path or label changes with unchanged command interfaces, verbatim relocation, or unchanged-file execution with no semantic issue.
- Give the audit subagent the exact phase, user request, target files, direct call chain, relevant inputs and outputs, observed runtime artifacts, selected Guard evidence, and the canonical `general-rules.md` path. Have it read the relevant rules itself and inspect the actual source and call sites. Name `stata-peer-audit` explicitly. Do not send the parent session history or a rules summary as a substitute.
- The audit is a clean-context peer-researcher review, not a validator. It returns concrete findings and implementation direction without editing files, assigning scores, or issuing pass or fail states.

## Boundaries

- The model and researcher choose the sample, estimand, treatment, merge key, controls, FE, weights, VCE, event axis, model role, workbook grouping, and append or replace decision. Guard, examples, frequency, tests, and servers do not choose them.
- Paper examples and optional raw logs are nonbinding source context. Do not infer missing output, rerun papers for coverage, or turn them into templates, scores, result-fact layers, pass or fail labels, rankings, promotion states, or audit queues.
- Preserve native factor-variable syntax and raw `e(b)` names. Use documented command and exporter capabilities before manual code. The bundled `outreg2_xlsx` program is only an approved post-export formatting interface: `outreg2` still produces the native statistical table, while the formatter supplies required workbook-sheet layout without choosing an estimator, design, or reconstructing statistics.
- Use [authoring-conventions.md](references/authoring-conventions.md) only when detailed source formatting is at issue, [workflow-taxonomy.md](references/workflow-taxonomy.md) only when designing a new workflow, and [readme-contract.md](references/readme-contract.md) only for an approved researcher-facing README.
- Keep transport, paths, file creation, exit codes, and returned state separate from substantive interpretation and causal validity. Do not build semantic validators, graders, classifiers, expected-answer oracles, or hidden fallbacks.
