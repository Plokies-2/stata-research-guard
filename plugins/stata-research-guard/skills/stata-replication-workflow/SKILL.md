---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using official or maintainer command evidence, project observations, and contextual paper examples. Use for .do-file workflows, data preparation, estimation, robustness, figures, tables, and exports; do not use it as an automatic code grader or research-design certifier.
---

# Stata Research Workflow

Make the project-specific decision yourself. Use `stataResearchGuard` to obtain grammar, examples, and factual context—not a verdict on the code you should write.

For every Stata code write or revision, read [general-rules.md](references/general-rules.md) first. It is the canonical concise house style; do not reconstruct its rules from this overview or from a paper example.

## Work from evidence

1. Respect the user's write boundary. Review, diagnosis, explanation, and explicit no-change requests are read-only.
2. Inspect the active project source and preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and output contracts.
3. For a consequential command or interface choice, first inspect the exposed command dictionary and choose one or more commands yourself. The allowed universe during MCP use is only its 109 exposed commands. If the needed command or feature is absent, abort rather than substitute, abbreviate, or manually implement it; report the missing command or functionality.
4. Send your chosen `selected_commands` to `get_stata_command_evidence` with the request and, when useful, the project path and target files. For only those commands, read any complete cleaned guide in `full_command_guides` before the shorter documentation excerpts, then read the reviewed, exact-indexed paper occurrences. A complete guide is untruncated grammar evidence, not a command-selection or research-design instruction. If no reviewed pair is installed or the command is a paper gap, continue with guide-only evidence.
5. Choose the implementation that best fits the user's research requirements, data state, downstream interface, and preference for readable, maintainable Stata. The server and any scorer never choose a winner.

A command already present in the project is not automatically preferred; old code may be the reason the user invoked the skill. The user's request and current compatible code remain stronger continuity evidence than a paper's estimator choice.

For evidence roles and missing-source handling, read [command-evidence.md](references/command-evidence.md). For code-writing conventions, read [authoring-conventions.md](references/authoring-conventions.md).

## Research choices

Do not let a tool choose an unresolved sample, estimand, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, workbook grouping, or append-versus-replace decision. Resolve it from the user's request and project context or ask the user when the choice materially changes the result.

For a new workflow, use the stages actually required by the request. [workflow-taxonomy.md](references/workflow-taxonomy.md) is a checklist, not a mandatory file tree. Preserve a compatible existing structure rather than migrating it to a preferred template.

## Authoring and outputs

Write direct Stata whose active sample, specification, and output can be understood at the point of use. The detailed authoring boundary and output contracts are in [general-rules.md](references/general-rules.md).

The bundled `outreg2_xlsx` program is a user-approved formatter artifact. Its evidence card describes its inputs and limitations. The model—not the server—decides whether the requested workbook calls for that helper or a direct command.

If the user approves a new project or structural overhaul that needs a researcher-facing README, read [readme-contract.md](references/readme-contract.md).

## Validation claims

Use tests and runtime evidence proportionally to the requested work. Transport, paths, hashes, file creation, exit codes, logs, and returned state are observable facts. Static diagnostics, runtime completion, and substantive or causal validity are different claims. Never present a software check as journal certification or a research-design proof.
