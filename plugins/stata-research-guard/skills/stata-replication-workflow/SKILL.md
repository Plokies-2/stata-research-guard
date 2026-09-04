---
name: stata-replication-workflow
description: Write, refactor, and run researcher-readable Stata workflows with official command help, optional paper context, and independent review of substantive code changes.
---

# Stata Research Workflow

Help the researcher follow data and sample construction through the visible estimator, specification, stored estimates, and outputs. Guard supplies evidence; the model and researcher make the research choices.

Read [general-rules.md](references/general-rules.md) once for the relevant task, from this file or a current complete Guard response. Reuse it while visible and unchanged. [command-evidence.md](references/command-evidence.md) owns lookup, exemption, and reuse details; read it when command evidence is needed.

## Work from the actual project

Inspect the requested files and their direct inputs, callers, and outputs. Preserve the user's scope, research specification, baseline data, and output contracts. A refactor must improve the actual analysis, not just its master file or comments.

Prefer a short master and four coherent stages when needed: integrated preparation and analysis panel; summary statistics and descriptive figures; regression with its estimates, tables, and figures; requested robustness. Smaller work can stay in one file. Keep import, merge, variable construction, and sample preparation together; do not create a file per command, outcome, table, graph, or helper. [workflow-taxonomy.md](references/workflow-taxonomy.md) explains the few reasons to split further. Preserve adequate existing names; use role names for new or approved renamed modules.

## Refactor with concrete independent advice

For an existing-code refactor or substantial structural repair, invoke a fresh read-only peer with `stata-peer-audit` before editing. Give it the user request and actual source so it can identify what to change: affected blocks, native command alternatives, visible loop axes, estimate handoffs, and files to combine. Wait for that advice and use your judgment to implement it. Do not interpret "simplify" or "remove duplication" as permission for a wrapper.

After substantive code authoring or modification, execution, and your own artifact inspection, use an independent peer to read the resulting code and observed results. It should check the requested improvement and earlier findings, not merely successful execution or fewer lines. Address concrete findings; repeat execution only for affected changes or unresolved concerns. Do not create repeated reviewer chains or an approval system.

Read-only explanation, comments, formatting, literal path or label changes with an unchanged interface, verbatim relocation, and unchanged-file execution do not need code-change review. A small local correction need not have a pre-edit review. If a reviewer is unavailable, continue independent work and disclose what remains unreviewed; never claim an explicitly requested independent review occurred.

## Command evidence and execution

1. Confirm current-task Guard and mcpStata are callable before material Stata work. Use Guard for grammar and optional usage context, and mcpStata for execution, data, logs, returned state, and artifacts.
2. When a material command is clear, request its exact help directly. Use discovery only for an unresolved command; do not inventory every token in a block. Expand documentation or selected paper context only for a remaining question.
3. Write direct code using documented native capabilities first. Keep estimator, consequential sample and specification, storage, and exporter visible. A reference paper or existing bad implementation does not authorize a new mode, dispatcher, helper, or manual substitute.
4. Run the requested work and inspect relevant data counts, logs, estimates, tables, and figures. If a selected package is actually missing, install it separately from analysis code using official or maintainer guidance within the user's authority, refresh the runtime as needed, and return to the original command.

## Peer handoff

Pass the phase, user request, exact source files and direct call chain, relevant inputs and outputs, available runtime artifacts and selected evidence, and paths to `stata-peer-audit` and the canonical general rules. Use fresh context (`fork_turns: "none"`); let the peer read the sources itself. Choose model and effort for the judgment required, honoring the user's choice. Do not pass the parent's entire conversation or conclusions as a substitute for the work. For post-review, include concrete pre-review findings and explain intentionally unadopted advice.

Use [authoring-conventions.md](references/authoring-conventions.md) for source-formatting details and [readme-contract.md](references/readme-contract.md) only when a researcher-facing README is needed. Runtime completion is evidence about execution, not research or causal certification. Do not build semantic validators, graders, scores, or audit state.
