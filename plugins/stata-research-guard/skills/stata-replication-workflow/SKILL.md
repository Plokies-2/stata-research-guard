---
name: stata-replication-workflow
description: Write, revise, execute, and review readable Stata analysis from actual project and command evidence, using an available authorized Stata interface.
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

There is no `phase` or `commands` argument. Request the material commands needed together; reuse visible unchanged help and current section IDs. Send `known_rules_sha256` only while the complete rules remain visible, and use `deduplicate_help: true` for identical help bodies in a combined request. Read the relevant part of [command-evidence.md](references/command-evidence.md) for section selection, foundation reuse, installed-version questions, execution sources, workflow notes, or paper blocks. A catalog is navigation, not a delivered help body; use complete help when material dependencies remain unclear.

## Work from the actual project

Read applicable project instructions and any relevant current handoff, then inspect the requested files and their direct inputs, callers, and outputs. Preserve the user's scope, research specification, baseline data, and output contracts. Keep one maintained `.do` per research work unit: locate its existing file and edit, extend, rerun, or refactor that same file. A changed option, specification, output, or follow-up request is not a new work unit. Follow the general rules for the narrow reasons to create another file; do not create a replacement workflow by default.

When variables are added, removed or renamed, or their definition, coding, units or source mapping changes, update the affected project Excel codebook entries alongside the code, following the general rules' reference layout. Unchanged variable mentions or verbatim moves do not require codebook work. Include changed entries in the final code-and-output review.

Comments state the current operation and research rationale; keep private revision or meeting history in Git or requested documentation. Retain substantive data/event dates and necessary source citations.

For workflow design or restructuring, reconcile the forward data flow with a backward reading from the affected output's meaning, sample, and source transformations. Use what this reveals to choose a useful correction or retain adequate code; a path listing or cosmetic master-file change is not the purpose of a research refactor.

Apply the stage and naming guidance in the general rules. Consult [workflow-taxonomy.md](references/workflow-taxonomy.md) when deciding file boundaries, including whether an independent input, interface, or restart need justifies another file.

## Read actual paper workflows for substantial work

Before authoring or reorganizing a substantial workflow, read [paper-workflow-reading.md](references/paper-workflow-reading.md) and follow a relevant paper's actual data-to-output code path. This applies when the work creates an analysis workflow or materially changes how connected preparation, sample, estimation, or output stages fit together, even when every command's syntax is already clear. Judge scope from the research change, not line counts. Local corrections and interface-preserving edits do not need this reading.

Choose and critically read the connected originals yourself using that reference; a peer's summary does not replace this reading. Briefly explain the useful technique, its relevance to the current files, and consequential differences you will retain or reject. Reuse source material already read and still visible.

## Command evidence and execution

Use Guard for material command grammar and optional usage context. Frame the help question from the block's purpose and actual consumer. A known command goes directly to its help; discovery and expansion address a remaining question. The command-evidence reference owns lookup, exemptions, and reuse.

When execution or result inspection is requested, read [execution-and-results.md](references/execution-and-results.md). Use an available authorized Stata interface: an existing project runner, local batch executable, official Python integration, or callable runtime connection. This plugin does not bundle or require mcpStata. Confirm the selected interface's actual availability, honor explicit tool restrictions, and resolve any running attempt before retrying. If no execution route is available, continue supported authoring and source review and identify what remains unexecuted.

Inspect the actual data, logs, returned results, tables and figures; reproduce the affected outputs and reuse suitable stored estimates. Follow the general rules for package installation, output structure and file lifecycle. Execution success does not establish research validity.

## Independent advice when requested or useful

Honor the user's explicit request about whether and when to use a peer. Otherwise choose a fresh read-only peer with `stata-peer-audit` when independent judgment can materially improve the work: before editing if diagnosis may change the implementation, or after your own code and artifact inspection if a fresh reading can resolve remaining concerns. Refactoring or substantive authoring does not by itself require both a pre-edit and post-edit review.

Use fresh context (`fork_turns: "none"`) and a model suited to the judgment, honoring the user's choice. Give the peer a concrete question, the user request, exact sources and call chain, relevant inputs/outputs and runtime artifacts, selected command/paper evidence and technique choices, and paths to `stata-peer-audit` and the general rules. Include earlier concrete advice and any reason for declining it; the parent's conversation or conclusion does not replace reading the sources. Address findings yourself and rerun only affected work. Do not create a review chain or approval system; disclose an unavailable requested review and continue independent work.

Use [authoring-conventions.md](references/authoring-conventions.md) for source-formatting details and [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
