---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using the common main rules, help-first official or maintainer command evidence, and selected real-paper context. Use for .do-file workflows, data preparation, estimation, robustness, figures, tables, and exports; do not use it as a command selector, code grader, or research-design certifier.
---

# Stata Research Workflow

Make the project-specific decision yourself. Use `stataResearchGuard` to obtain rules, grammar, and selected examples, not a verdict.

For every Stata code write or revision, read [general-rules.md](references/general-rules.md). For the exact MCP contract, read [command-evidence.md](references/command-evidence.md).

## Evidence flow

1. Respect the user's write boundary. Review, diagnosis, explanation, and explicit no-change requests are read-only.
2. Inspect the active project yourself and preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and output contracts. The MCP server does not scan project files or use existing command frequency to choose for you.
3. **Phase 1:** call `get_stata_command_evidence` with only `request`. Read `main_rules` and the 115-command dictionary, then select the exact canonical command that clearly fits. Select multiple commands only when different stages genuinely need them or the current context leaves more than one plausible alternative. If a required command or capability is absent, stop and report it; do not substitute, abbreviate, or hand-implement it.
4. **Phase 2:** send `request` and nonempty exact `selected_commands`. Read the `command_evidence` packets in request order. When multiple packets were requested, compare their documented purpose, inputs, syntax, outputs, tradeoffs, and incompatibilities before choosing the implementation. Each packet independently contains one command's `help_status`, Stata-rendered `command_help`, factual `expanded_documentation` status, and compact `paper_example_catalog`. Phase 2 does not return the expanded document or raw paper code. Stop here when the help explains every action the user is asking you to take, the implementation follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream interface question remains. Do not expand merely because a command is statistical, user-written, data-changing, or connected to an output step. If a packet's catalog is empty, help-only completion is normal.
5. **Combined Phase 3, when more context would materially help:** send the same `request` and `selected_commands` with `expanded: true`. Put only the commands whose longer documentation is actually needed in the nonempty exact `expanded_commands` subset. Independently choose exact `block_id` values from the Phase 2 catalog as `selected_block_ids` when paper context would help. Documentation-only, paper-only, and combined requests are valid, but at least one of the two selections must be present. Expansion is appropriate when help leaves a requested action, unfamiliar option, version-specific behavior, multi-command handoff, returned result, postestimation step, or table/graph/export contract unclear; when the code is difficult enough that a worked source context would reduce a real implementation risk; or when the user asks for explanation or a research-use example beyond syntax. Read only the returned Stata 18 manual entries or limited author supplement and the slim exact paper cards with optional raw log/artifact excerpts. `same_source_as_help` means Phase 2 already supplied the authoritative maintainer text, so no duplicate document is injected. A `supplemental` author document, paper block, or log is not grammar authority. When a packet marks features as StataNow-only, do not use them in base Stata 18 unless the active environment provides those StataNow features. Never expand every selected command by default, ask for all blocks, or ask the server to choose a command or block.
6. Write the simplest implementation that fits the user's research requirements, current data state, downstream interfaces, and the selected command's documented semantics.

Paper examples are high-quality hints, never templates, answers, or oracles. A close block may clarify code immediately around the already selected focus command. A distant block is reference context only. Surrounding estimators, outcomes, samples, treatment, controls, FE, VCE, event windows, formats, and paths do not override the current project. An `outreg2` block surrounded by `areg`, `reghdfe`, or `xtivreg2` does not replace a current `regress` choice.

Raw logs are stored source material, not a derived result-fact layer. Do not infer missing output, rerun a paper for coverage, or create `observed_output_facts`, returned-state classifications, scores, pass/fail labels, rankings, promotion states, or audit queues.

For code-writing conventions, read [authoring-conventions.md](references/authoring-conventions.md).

## Research choices

Do not let a tool choose an unresolved sample, estimand, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, workbook grouping, or append-versus-replace decision. Resolve it from the user's request and project context or ask when the choice materially changes the result.

For a new workflow, use only the stages required by the request. [workflow-taxonomy.md](references/workflow-taxonomy.md) is a checklist, not a mandatory file tree. Preserve a compatible existing structure.

## Authoring and outputs

Write direct Stata whose active sample, specification, and output can be understood at the point of use. In core estimation calls, write outcome, treatment or event terms, consequential samples, controls, fixed effects, weights, and VCE variables literally rather than hiding them in macros. Preserve native factor-variable and raw `e(b)` names. Avoid unnecessary programs, deep loops, positional parsing, speculative options, and scratch installation or file-existence checks.

The bundled `outreg2_xlsx` program is an implementation artifact for its declared formatting interface. It does not choose the estimator or research design.

If the user approves a new project or structural overhaul that needs a researcher-facing README, read [readme-contract.md](references/readme-contract.md).

## Claims

Transport, paths, file creation, exit codes, logs, and returned state are observable facts. Static inspection, runtime completion, substantive interpretation, and causal validity are different claims.

Do not create deterministic validators, graders, rankers, classifiers, expected-answer oracles, or hidden fallbacks for generated Stata meaning, specification, command choice, correctness, or quality. There is no mandatory independent-audit workflow or `audit_pending` state.
