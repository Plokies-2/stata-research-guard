---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using official or maintainer command evidence, project observations, and contextual paper examples. Use for .do-file workflows, data preparation, estimation, robustness, figures, tables, and exports; do not use it as an automatic code grader or research-design certifier.
---

# Stata Research Workflow

Make the project-specific decision yourself. Use `stataResearchGuard` to obtain grammar, examples, and factual context—not a verdict on the code you should write.

## Work from evidence

1. Respect the user's write boundary. Review, diagnosis, explanation, and explicit no-change requests are read-only.
2. Inspect the active project source and preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and output contracts.
3. For a consequential command or interface choice, call `get_stata_command_evidence` with the request and, when useful, the project path and target files.
4. Read the relevant official or maintainer example. Treat paper code and current project usage as context rather than authority.
5. Choose the command and implementation that best fit the user's research requirements, data state, downstream interface, and preference for readable, maintainable Stata.

The registry is not exhaustive. A missing command is not forbidden. A command already present in the project is not automatically preferred; old code may be the reason the user invoked the skill.

For evidence roles and missing-source handling, read [command-evidence.md](references/command-evidence.md). For code-writing conventions, read [authoring-conventions.md](references/authoring-conventions.md).

## Research choices

Do not let a tool choose an unresolved sample, estimand, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, workbook grouping, or append-versus-replace decision. Resolve it from the user's request and project context or ask the user when the choice materially changes the result.

For a new workflow, use the stages actually required by the request. [workflow-taxonomy.md](references/workflow-taxonomy.md) is a checklist, not a mandatory file tree. Preserve a compatible existing structure rather than migrating it to a preferred template.

## Authoring and outputs

Write direct Stata whose active sample, specification, and output can be understood at the point of use. Keep control flow shallow and remove abandoned alternatives after iteration.

Preserve native factor-variable syntax and raw `e(b)` names. Do not replace interactions with `treat_yYYYY` or `_yYYYY` variables, manually rebuild coefficient tables, or suppress omitted/base rows. Use Excel for final tables, PDF for figures, and `.ster` for reusable estimates when those artifacts are required; do not add TeX output unless the user explicitly changes that project contract.

The bundled `outreg2_xlsx` program is a user-approved formatter artifact. Its evidence card describes its inputs and limitations. The model—not the server—decides whether the requested workbook calls for that helper or a direct command.

If the user approves a new project or structural overhaul that needs a researcher-facing README, read [readme-contract.md](references/readme-contract.md).

## Validation claims

Use tests and runtime evidence proportionally to the requested work. Transport, paths, hashes, file creation, exit codes, logs, and returned state are observable facts. Static diagnostics, runtime completion, and substantive or causal validity are different claims. Never present a software check as journal certification or a research-design proof.
