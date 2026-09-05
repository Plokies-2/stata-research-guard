---
name: stata-replication-workflow
description: Write, refactor, and run researcher-readable Stata workflows using project and command evidence, required paper reading for substantial work, and peer advice when requested or useful.
---

# Stata Research Workflow

Help the researcher follow data and sample construction through the visible estimator, specification, stored estimates, and outputs. Guard supplies evidence; the model and researcher make the research choices.

Read [general-rules.md](references/general-rules.md) once for the relevant task, from this file or a current complete Guard response. It contains the research judgment and house rules; reuse it while visible and unchanged.

## Work from the actual project

Inspect the requested files and their direct inputs, callers, and outputs. Preserve the user's scope, research specification, baseline data, and output contracts. Understand the affected research blocks before choosing a rewrite, following the general rules.

For workflow design or restructuring, reconcile the forward data flow with a backward reading from the affected output's meaning, sample, and source transformations. Use what this reveals to choose a useful correction or retain adequate code; a path listing or cosmetic master-file change is not the purpose of a research refactor.

Apply the stage and naming guidance in the general rules. Consult [workflow-taxonomy.md](references/workflow-taxonomy.md) when deciding file boundaries, including whether an independent input, interface, or restart need justifies another file.

## Read actual paper workflows for substantial work

Before authoring or reorganizing a substantial workflow, read [paper-workflow-reading.md](references/paper-workflow-reading.md) and follow a relevant paper's actual data-to-output code path. This applies when the work creates an analysis workflow or materially changes how connected preparation, sample, estimation, or output stages fit together, even when every command's syntax is already clear. Judge scope from the research change, not line counts. Local corrections and interface-preserving edits do not need this reading.

Choose and critically read the connected originals yourself using that reference; a peer's summary does not replace this reading. Briefly explain the useful technique, its relevance to the current files, and consequential differences you will retain or reject. Reuse source material already read and still visible.

## Command evidence and execution

1. Confirm current-task Guard and mcpStata are callable before material Stata work. Use Guard for grammar and optional usage context, and mcpStata for execution, data, logs, returned state, and artifacts.
2. Read [command-evidence.md](references/command-evidence.md) when command evidence is needed; it owns lookup, exemptions, and reuse. When a material command is clear, request its exact help directly. Use discovery only for an unresolved command, and expand documentation or command-local examples for a remaining question.
3. Use the block's purpose and actual consumer to frame the help question, following the native-interface guidance and discovery examples in that reference. Apply the general rules when choosing the implementation.
4. Run the requested work and inspect relevant data counts, logs, estimates, tables, and figures. If a selected package is actually missing, install it separately from analysis code using official or maintainer guidance within the user's authority, refresh the runtime as needed, and return to the original command.

## Independent advice when requested or useful

Honor the user's explicit request about whether and when to use a peer. Otherwise choose a fresh read-only peer with `stata-peer-audit` when independent judgment can materially improve the work: before editing if diagnosis may change the implementation, or after your own code and artifact inspection if a fresh reading can resolve remaining concerns. Refactoring or substantive authoring does not by itself require both a pre-edit and post-edit review.

Give the peer a concrete question about the research flow or implementation. For substantial workflow work, include the selected paper sources and the reasons for adopting or declining their techniques; integrate that comparison into the chosen review. Address useful findings with your own judgment, and repeat execution only for affected changes or unresolved concerns. Do not create a reviewer chain or approval system. If a requested peer is unavailable, continue work that does not depend on that review and disclose the limitation; never claim it occurred.

Pass the review question, user request, exact source files and direct call chain, relevant inputs and outputs, available runtime artifacts and selected evidence, and paths to `stata-peer-audit` and the canonical general rules. Use fresh context (`fork_turns: "none"`) so the peer reads the sources itself. Choose model and effort for the judgment required, honoring the user's choice. Do not pass the parent's entire conversation or conclusions as a substitute for the work. When earlier advice exists, include its concrete findings and explain intentionally unadopted advice.

Use [authoring-conventions.md](references/authoring-conventions.md) for source-formatting details and [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
