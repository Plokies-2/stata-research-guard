---
name: stata-replication-workflow
description: Write, refactor, and run researcher-readable Stata workflows; read actual paper workflows for substantial work, consult command help, and obtain concrete peer advice.
---

# Stata Research Workflow

Help the researcher follow data and sample construction through the visible estimator, specification, stored estimates, and outputs. Guard supplies evidence; the model and researcher make the research choices.

Read [general-rules.md](references/general-rules.md) once for the relevant task, from this file or a current complete Guard response. Reuse it while visible and unchanged. [command-evidence.md](references/command-evidence.md) owns lookup, exemption, and reuse details; read it when command evidence is needed.

## Work from the actual project

Inspect the requested files and their direct inputs, callers, and outputs. Preserve the user's scope, research specification, baseline data, and output contracts. A refactor must improve the actual analysis, not just its master file or comments.

Prefer a short master and four coherent stages when needed: integrated preparation and analysis panel; summary statistics and descriptive figures; regression with its estimates, tables, and figures; requested robustness. Smaller work can stay in one file. Keep import, merge, variable construction, and sample preparation together; do not create a file per command, outcome, table, graph, or helper. [workflow-taxonomy.md](references/workflow-taxonomy.md) explains the few reasons to split further. Preserve adequate existing names; use role names for new or approved renamed modules.

## Read actual paper workflows for substantial work

Before authoring or reorganizing a substantial workflow, read [paper-workflow-reading.md](references/paper-workflow-reading.md) and follow a relevant paper's actual data-to-output code path. This applies when the work creates an analysis workflow or materially changes how connected preparation, sample, estimation, or output stages fit together, even when every command's syntax is already clear. Judge scope from the research change, not line counts. Local corrections and interface-preserving edits do not need this reading.

Choose and critically compare sources yourself. Existing bundled examples and prestigious journals are candidates, not canonical implementations; use a better-fitting code set when you find one. Read the original connected code, not just its catalog, master, or our notes. Briefly explain the useful technique, its relevance to the current files, and any consequential difference you will retain or reject. The writing model must understand this flow; a peer's summary is not a substitute. Reuse source material already read and still visible rather than repeatedly retrieving it.

## Refactor with concrete independent advice

For an existing-code refactor or substantial structural repair, invoke a fresh read-only peer with `stata-peer-audit` before editing. Give it the user request and actual source so it can identify what to change: affected blocks, native command alternatives, visible loop axes, estimate handoffs, and files to combine. Wait for that advice and use your judgment to implement it. Do not interpret "simplify" or "remove duplication" as permission for a wrapper.

After substantive code authoring or modification, execution, and your own artifact inspection, use an independent peer to read the resulting code and observed results. It should check the requested improvement and earlier findings, not merely successful execution or fewer lines. For substantial workflow work, include the selected paper sources and compare the actual implementation with the reasons for adopting or declining their techniques. Integrate this into the existing review, without a separate paper reviewer or approval step. Address concrete findings; repeat execution only for affected changes or unresolved concerns. Do not create repeated reviewer chains or an approval system.

Read-only explanation, comments, formatting, literal path or label changes with an unchanged interface, verbatim relocation, and unchanged-file execution do not need code-change review. A small local correction need not have a pre-edit review. If a reviewer is unavailable, continue independent work and disclose what remains unreviewed; never claim an explicitly requested independent review occurred.

## Command evidence and execution

1. Confirm current-task Guard and mcpStata are callable before material Stata work. Use Guard for grammar and optional usage context, and mcpStata for execution, data, logs, returned state, and artifacts.
2. When a material command is clear, request its exact help directly. Use discovery only for an unresolved command; do not inventory every token in a block. Expand command documentation or command-local examples for a remaining question. The substantial-work paper reading above is independent of this command lookup and must not be skipped because help suffices.
3. Write direct code using documented native capabilities first. Keep estimator, consequential sample and specification, storage, and exporter visible. A reference paper or existing bad implementation does not authorize a new mode, dispatcher, helper, or manual substitute.
4. Run the requested work and inspect relevant data counts, logs, estimates, tables, and figures. If a selected package is actually missing, install it separately from analysis code using official or maintainer guidance within the user's authority, refresh the runtime as needed, and return to the original command.

## Peer handoff

Pass the phase, user request, exact source files and direct call chain, relevant inputs and outputs, available runtime artifacts and selected evidence, and paths to `stata-peer-audit` and the canonical general rules. Use fresh context (`fork_turns: "none"`); let the peer read the sources itself. Choose model and effort for the judgment required, honoring the user's choice. Do not pass the parent's entire conversation or conclusions as a substitute for the work. For post-review, include concrete pre-review findings and explain intentionally unadopted advice.

Use [authoring-conventions.md](references/authoring-conventions.md) for source-formatting details and [readme-contract.md](references/readme-contract.md) only when a researcher-facing README is needed. Runtime completion is evidence about execution, not research or causal certification. Do not build semantic validators, graders, scores, or audit state.
