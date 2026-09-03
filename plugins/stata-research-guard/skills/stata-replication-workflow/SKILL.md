---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using compact authoring rules, official or maintainer command evidence, and selected real-paper context; do not use it as a command selector, code grader, or research-design certifier.
---

# Stata Research Workflow

Make project-specific research decisions yourself. Guard supplies rules, grammar, and selected examples, not a verdict.

For every Stata code write or revision, read [general-rules.md](references/general-rules.md). Read [command-evidence.md](references/command-evidence.md) only when a material command interface requires Guard lookup; skip it for the no-lookup actions defined there.

## Flow

1. Respect the user's write boundary and inspect the active project. Preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and outputs.
2. Confirm both `stataResearchGuard` and mcpStata are callable before material Stata work. Use mcpStata for the live session, execution, logs, graphs, returned state, and produced artifacts.
3. Skip Guard for read-only review or explanation, comment or formatting-only edits, literal path or label changes with an unchanged command interface, verbatim relocation, and unchanged-file execution with no semantic issue. When a material command is unresolved, use Phase 1 discovery. When it is clear, call Phase 2 directly for only the commands whose interface matters.
4. Stop after Phase 2 when the help resolves the requested action. Use Phase 3 only for exact selected commands that need longer documentation or exact paper blocks that would materially help. Never expand everything by default.
5. Write the simplest direct implementation consistent with the data, research specification, documented command semantics, and downstream interfaces. Run safe requested work, then inspect the actual data, logs, tables, figures, estimates, and files before revising or concluding.

## Boundaries

- The model and researcher choose the sample, estimand, treatment, merge key, controls, FE, weights, VCE, event axis, model role, workbook grouping, and append or replace decision. Guard, examples, frequency, tests, and servers do not choose them.
- Paper examples and optional raw logs are nonbinding source context. Do not infer missing output, rerun papers for coverage, or turn them into templates, scores, result-fact layers, pass or fail labels, rankings, promotion states, or audit queues.
- Preserve native factor-variable syntax and raw `e(b)` names. The bundled `outreg2_xlsx` program is only an approved formatting interface; it does not choose an estimator or design.
- Use [authoring-conventions.md](references/authoring-conventions.md) only when detailed source formatting is at issue, [workflow-taxonomy.md](references/workflow-taxonomy.md) only when designing a new workflow, and [readme-contract.md](references/readme-contract.md) only for an approved researcher-facing README.
- Keep transport, paths, file creation, exit codes, and returned state separate from substantive interpretation and causal validity. Do not build semantic validators, graders, classifiers, expected-answer oracles, or hidden fallbacks.
