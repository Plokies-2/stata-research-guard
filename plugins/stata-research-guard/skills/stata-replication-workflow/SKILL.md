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
3. **Phase 1:** call `get_stata_command_evidence` with only `request`. Read `main_rules` and the 109-command dictionary, then select the exact canonical command that clearly fits. Select multiple commands only when different stages genuinely need them or the current context leaves more than one plausible alternative. If a required command or capability is absent, stop and report it; do not substitute, abbreviate, or hand-implement it.
4. **Phase 2:** send `request` and nonempty exact `selected_commands`. Read the `command_evidence` packets in request order. When multiple packets were requested, compare their documented purpose, inputs, syntax, outputs, tradeoffs, and incompatibilities before choosing the implementation. Each packet independently contains one command's `help_status`, Stata-rendered `command_help`, factual `full_manual_available`, and compact `paper_example_catalog`. Phase 2 does not return the retained full manual. When help fully explains the requested action and the code follows directly from it, proceed without more evidence. Do not expand merely because a command is statistical, user-written, data-changing, or connected to an output step. When help is partial or unavailable, or a material detail remains unclear, state the limitation; do not use the paper catalog, implementation source, memory, another command, or a manual implementation as grammar authority. The future expanded manual-plus-paper phase remains undefined. If a packet's catalog is empty, help-only completion is normal.
5. **Phase 3, only when useful:** select exact catalog `block_id` values from available command packets and send the same command boundary plus nonempty `selected_block_ids`. Read the selected raw blocks, linked occurrences, and `paper_log_contexts`. A context may contain a stored raw log excerpt and direct artifact metadata; otherwise it is empty. An unavailable command does not block selected paper cards for another command. Never ask for all blocks or ask the server to choose one.
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
