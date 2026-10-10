---
name: stata-replication-workflow
description: Write, refactor, and run researcher-readable Stata workflows using project and command evidence, required paper reading for substantial work, and peer advice when requested or useful.
---

# Stata Research Workflow

Prioritize code the researcher can comfortably read, inspect, and modify. Help them follow data and sample construction through the visible estimator, specification, stored estimates, and outputs; retain adequate code when a rewrite offers no concrete benefit. Guard supplies evidence; the model and researcher make the research choices.

## Start with what changes

Read the requested block and its direct caller or output before choosing further reading. A Stata filename alone does not require a Guard call.

- For comments, literal labels or spacing, unchanged path interfaces, verbatim relocation, or unchanged-file execution with no semantic issue, make the smallest patch and inspect the affected call or output. This includes display-string or spacing values inside an already-understood option when its syntax and statistical meaning stay unchanged. Preserve call order, macro scope, inputs and stored-result consumers when moving code. Do not load the full general rules, command evidence, paper workflows or peer-review procedure solely for this edit.
- When research meaning or a command interface changes, identify the changed sample, specification, inference, statistic, option, returned result or consumer. Read [general-rules.md](references/general-rules.md) once, locally or in the first complete Guard response; reuse visible unchanged text. Resolve research choices from the user's requirements and project evidence. Read command help only for the affected interface or an unresolved semantic question; a label describing a different statistic is not a cosmetic edit.
- If a small edit reveals a real dependency or semantic problem, expand only to that problem. Reuse suitable stored results for display changes; inspect the actual export rather than rerunning unrelated estimation. Substantial connected workflow changes still require the paper reading below.

For a known command needing evidence, the minimum call is:

```json
{"request":"Read the changed estout output interface","selected_commands":["estout"],"include_paper_catalog":false}
```

There is no `phase` or `commands` argument. Reuse already-read help while its version, material options and use remain applicable. For a narrow unresolved question, use current catalog IDs with `help_sections`; ask for `help_view: "catalog"` only if those IDs are unavailable. Use full help when dependencies remain unclear. Read [command-evidence.md](references/command-evidence.md) only for the needed lookup feature. On later calls, send the actual `known_rules_sha256` only while the complete rules remain visible; use `deduplicate_help: true` for shared help bodies in multi-command calls.

After reading a selected help response's complete foundation, `known_help_foundations` can acknowledge its `foundation_sha256` on later section requests while that text remains visible. Omit it after context loss. Large combined responses may return catalogs for automatic help deliveries; those bodies have not been read. Explicit sections and `help_view: "full"` remain intact. See the command-evidence reference when using these controls.

## Work from the actual project

Inspect the requested files and their direct inputs, callers, and outputs. Preserve the user's scope, research specification, baseline data, and output contracts. Keep one maintained `.do` per research work unit: locate its existing file and edit, extend, rerun, or refactor that same file. A changed option, specification, output, or follow-up request is not a new work unit. Follow the general rules for the narrow reasons to create another file; do not create a replacement workflow by default.

Comments explain the current operation and research rationale. Follow the general rules' comment guidance: omit meeting/agreement dates, revision diaries, professor-advice attributions and other private work history; retain substantive data/event dates and needed source citations.

When variables are added, removed or renamed, or their definition, coding, units or source mapping changes, update the affected project Excel codebook entries alongside the code, following the general rules' reference layout. Unchanged variable mentions or verbatim moves do not require codebook work. Include changed entries in the final code-and-output review.

For workflow design or restructuring, reconcile the forward data flow with a backward reading from the affected output's meaning, sample, and source transformations. Use what this reveals to choose a useful correction or retain adequate code; a path listing or cosmetic master-file change is not the purpose of a research refactor.

Apply the stage and naming guidance in the general rules. Consult [workflow-taxonomy.md](references/workflow-taxonomy.md) when deciding file boundaries, including whether an independent input, interface, or restart need justifies another file.

## Read actual paper workflows for substantial work

Before authoring or reorganizing a substantial workflow, read [paper-workflow-reading.md](references/paper-workflow-reading.md) and follow a relevant paper's actual data-to-output code path. This applies when the work creates an analysis workflow or materially changes how connected preparation, sample, estimation, or output stages fit together, even when every command's syntax is already clear. Judge scope from the research change, not line counts. Local corrections and interface-preserving edits do not need this reading.

Choose and critically read the connected originals yourself using that reference; a peer's summary does not replace this reading. Briefly explain the useful technique, its relevance to the current files, and consequential differences you will retain or reject. Reuse source material already read and still visible.

## Command evidence and execution

1. Use Guard for grammar and optional usage context, following the lookup boundaries below. Prefer mcpStata for execution, data, logs, returned state, and artifacts when it is callable. If mcpStata is unavailable, continue through an available authorized Stata interface, such as the project's existing runner, a local Stata batch executable, or official Python integration. Choose from the actual environment, briefly state the execution route, and inspect its real logs and artifacts; mcpStata absence alone is not a reason to stop or require installation. Preserve the requested estimator and research specification, and honor explicit execution-tool restrictions. If an execution attempt may still be running, resolve its state before retrying through another route. If no Stata execution route is available, continue code authoring and source review where command evidence permits, clearly identify the unexecuted work, and report the missing execution prerequisite without claiming runtime success.
2. Read [command-evidence.md](references/command-evidence.md) when command evidence is needed; it owns lookup, exemptions, and reuse. When a material command is clear, request its exact help directly. Use discovery only for an unresolved command, and expand documentation or command-local examples for a remaining question.
3. Use the block's purpose and actual consumer to frame the help question, following the native-interface guidance and discovery examples in that reference. Apply the general rules when choosing the implementation.
   When an installed version or option differs from bundled help, Phase 2 can explicitly select `help_source: "installed"` and caller-confirmed `execution_sources` with exact ADO spans. Before a long run, inspect imported names and preserve original-name mappings; for extended controls or sample exports, inspect the estimator's learning sample and consumer's observation unit. If later output fails, read that failure separately from estimation completion and reuse appropriate stored results. Request only relevant `workflow_notes` from the IDs in `command-evidence.md`; these optional notes supply authoring guidance, not automatic renames, rank gates or research verdicts.
4. Run the requested work and inspect relevant data counts, logs, estimates, tables, and figures. Also inspect the affected generated files and paths for unnecessary persistent intermediates, duplicate exports, and unclear placement, following the general rules' file-lifecycle guidance. Use `outreg2` first when it preserves the results, following the general rules. If a chosen package is missing, follow the general rules' standing authorization for on-demand installation into the main Stata environment, refresh the runtime as needed, and return to the analysis.

For long background runs, collect the existing task with bounded `stata_task_status(wait=True)` waits suited to its runtime instead of rapidly repeating nonblocking checks. Continue independent work between waits; resolve the actual task state before retrying or changing execution routes. When reading appended logs, reuse the returned `next_offset`; use keyword/context reads for a concrete warning or failure and avoid repeatedly loading the full log. Do not repeatedly narrate identical running counts. Report meaningful completion, failure, findings or required action, honoring any requested progress schedule. Apply the general rules' batch and output guidance without adding a monitor, scheduler or research-result classifier.

For code with substantial quoting or backslashes, prefer the existing saved `.do` through the runtime's file interface over embedding the entire block in a tool string. If only a fragment must run, use a temporary driver in the project's work area. Initialize its needed paths in that execution or use the existing setup; do not assume globals survived another call. On failure, read the expanded path and log and resolve any running task before retrying. This does not require session resets or new permanent runners.

## Independent advice when requested or useful

Honor the user's explicit request about whether and when to use a peer. Otherwise choose a fresh read-only peer with `stata-peer-audit` when independent judgment can materially improve the work: before editing if diagnosis may change the implementation, or after your own code and artifact inspection if a fresh reading can resolve remaining concerns. Refactoring or substantive authoring does not by itself require both a pre-edit and post-edit review.

Give the peer a concrete question about the research flow or implementation. For substantial workflow work, include the selected paper sources and the reasons for adopting or declining their techniques; integrate that comparison into the chosen review. Address useful findings with your own judgment, and repeat execution only for affected changes or unresolved concerns. Do not create a reviewer chain or approval system. If a requested peer is unavailable, continue work that does not depend on that review and disclose the limitation; never claim it occurred.

Pass the review question, user request, exact source files and direct call chain, relevant inputs and outputs, available runtime artifacts and selected evidence, and paths to `stata-peer-audit` and the canonical general rules. Use fresh context (`fork_turns: "none"`) so the peer reads the sources itself. Choose model and effort for the judgment required, honoring the user's choice. Do not pass the parent's entire conversation or conclusions as a substitute for the work. When earlier advice exists, include its concrete findings and explain intentionally unadopted advice.

Use [authoring-conventions.md](references/authoring-conventions.md) for source-formatting details and [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
