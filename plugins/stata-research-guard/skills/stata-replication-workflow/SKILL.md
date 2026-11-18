---
name: stata-replication-workflow
description: Write, revise, execute, and review readable Stata analysis from actual project and command evidence, using an available authorized Stata interface.
---

# Stata Research Workflow

**The highest implementation priority is for a researcher to read the code from top to bottom and see what actually runs.** Simplicity serves that goal. Take the lines needed to show the path from source data and sample construction to estimates and saved outputs. At each consequential command, show the actual inputs, conditions, and options in the command or immediately nearby. Keep an explicit step or specification when it makes that path easier to follow. Ignore line and character counts as measures of simplicity. Guard supplies evidence. The model and researcher make the research choices.

Protect source data and comparison baselines in the files themselves. Read existing results from saved data, estimates, and outputs. Write new runs to a separate destination when a baseline must be kept, and overwrite only authorized outputs. Keep historical execution paths out of the maintained analysis.

For a concrete authoring choice, read the relevant comparison in [code-examples.md](references/code-examples.md): mechanical repetition versus distinct specifications, native predictions, result ownership and lifetime, or the scope of a local edit. These authored illustrations explain decisions; they are not paper excerpts, required templates, or substitutes for command help and actual paper reading. Skip them when the choice is already clear.

## Start with what changes

Read the requested block and its direct caller or output before choosing further reading. Before writing code or adding settings, check whether the active tool's defaults, native capabilities and supported options already meet the request; use what suffices and implement only the unmet part, preserving explicit user choices and required project or template settings. Reuse visible evidence and resolve only the relevant uncertainty. A Stata filename alone does not require a Guard call. Once connectivity is established, do not turn an exempt follow-up into another connection-check or discovery call.

- For comments, literal labels or spacing, unchanged path interfaces, verbatim relocation, or unchanged-file execution with no semantic issue, make the smallest patch and inspect the affected call or output. This includes display-string or spacing values inside an already-understood option when its syntax and statistical meaning stay unchanged. Preserve call order, macro scope, inputs and stored-result consumers when moving code. Do not load the full general rules, command evidence, paper workflows or peer-review procedure solely for this edit.
- Use familiar basic control syntax directly: ordinary `foreach`/`forvalues`, block `if`/`else`, braces and local-macro expansion need no help lookup. A failed optional lookup does not ban them. Keep short lists explicit in the nearby loop header and use a shallow loop for mechanical repetition; do not copy whole model blocks just to avoid basic syntax. Look up a genuinely unresolved behavior and the material research-command interfaces inside the loop, following the boundary in [command-evidence.md](references/command-evidence.md).
- When research meaning or a command interface changes, identify the changed sample, specification, inference, statistic, option, returned result or consumer. Read [general-rules.md](references/general-rules.md) once, locally or in the first complete Guard response; reuse visible unchanged text. Resolve research choices from the user's requirements and project evidence. Read command help only for the affected interface or an unresolved semantic question; a label describing a different statistic is not a cosmetic edit.
- If a small edit reveals a real dependency or semantic problem, expand only to that problem. Reuse suitable stored results for display changes; inspect the actual export rather than rerunning unrelated estimation. Substantial connected workflow changes still require the paper reading below.

For a known command needing evidence, the minimum call is:

```json
{"request":"Read the changed estout output interface","selected_commands":["estout"],"include_paper_catalog":false}
```

There is no `phase` or `commands` argument. A new follow-up alone does not invalidate visible unchanged evidence. Use [command-evidence.md](references/command-evidence.md) when section selection, explicit evidence reuse, installed-version questions, or paper blocks are needed. A catalog or truncated response is not a complete help body; retrieve the missing material when dependencies remain unclear.

## Work from the actual project

Read applicable project instructions and any relevant current handoff. Preserve the user's scope, research specification, baseline data, and output contracts.

**Before adding a branch or argument to an existing `.do`, reassess the work unit.** Read the real inputs and trace the saved outputs back from their callers or consumers. Keep one maintained `.do` for each coherent workflow. Related variants that extend the same data-to-output flow stay in its existing file. An independent maintained analysis or stage with its own input-to-output flow belongs in a purpose-named file. The project folder, a shared panel, and a common estimator are insufficient reasons to combine them. Use [workflow-taxonomy.md](references/workflow-taxonomy.md) for the decision and an example of a short master.

**Delete obsolete code in the same edit.** Check direct callers and output consumers, then remove superseded or unused blocks in scope, including commented-out alternatives and their unused arguments or helpers. Run one-off exploration in the work area with a temporary driver if needed. At completion, integrate only the code needed to reproduce maintained outputs and delete the remaining scratch code created for the task. Preserve required reproducers, baselines and research records, including unfavorable results. See [general-rules.md](references/general-rules.md) for the cleanup boundary.

Before a project's first research run, ask once whether to create an Excel codebook if no existing codebook, designated workbook or prior decision is available. Continue authorized work that can proceed while the answer is pending. Follow [codebook.md](references/codebook.md) for creation, maintenance and formatting.

Comments state the current operation and research rationale; keep private revision or meeting history in Git or requested documentation. Retain substantive data/event dates and necessary source citations.

For workflow design or restructuring, reconcile the forward data flow with a backward reading from the affected output's meaning, sample, and source transformations. Use what this reveals to choose a useful correction or retain adequate code; a path listing or cosmetic master-file change is not the purpose of a research refactor.

## Read actual paper workflows for substantial work

Before authoring or reorganizing a substantial workflow, read [paper-workflow-reading.md](references/paper-workflow-reading.md) and follow a relevant paper's actual data-to-output code path. This applies when the work creates an analysis workflow or materially changes how connected preparation, sample, estimation, or output stages fit together, even when every command's syntax is already clear. Judge scope from the research change, not line counts. Local corrections and interface-preserving edits do not need this reading.

Choose and critically read the connected originals yourself using that reference; a peer's summary does not replace this reading. Compare the technique and consequential differences with the current workflow before choosing what to use. Reuse source material already read and still visible.

## Command evidence and execution

Use Guard for material command grammar and optional usage context. Frame the help question from the block's purpose and actual consumer. A known command goes directly to its help; discovery and expansion address a remaining question. The command-evidence reference owns lookup, exemptions, and reuse.

For execution or result inspection, use [execution-and-results.md](references/execution-and-results.md). To inspect existing results, read the saved data, logs, estimates, tables or figures relevant to the request. Run the affected work when execution or reproduction is requested or when needed to update an authorized output. Reuse suitable stored estimates.

For a needed run, use an available authorized Stata interface and inspect the affected outputs. If no route is available, continue supported authoring and source review and identify what remains unexecuted. Execution success does not establish research validity.

## Independent peer advice

Honor the user's and project's directions about peer review. Use one fresh read-only review with `stata-peer-audit` when requested or when a second perspective can help resolve a concrete question about the data, sample, specification or outputs. When deciding yourself, identify that question after inspecting the work. Routine edits and reruns usually proceed directly.

Ask the concrete review question. Place the review before an expensive run when the source can answer it, or after execution when actual results are needed. Apply the advice you judge useful and check the affected work.

Use fresh context (`fork_turns: "none"`) and a model suited to the judgment, honoring the user's choice. Give the peer the user request, exact files and diff, directly connected definitions/callers/consumers, relevant inputs/outputs and available runtime artifacts, necessary command/paper sources, and paths to `stata-peer-audit` and the general rules. Do not frame the author's preferred implementation as the answer. Include earlier concrete advice and any reason for declining it without substituting that account for reading the sources. Do not create a review chain or approval system. If delegation is unavailable, complete the supported work and explicitly report the missing independent reading; do not claim it occurred.

## Report results, sources, and edits

In the final reply, say which requested stages ran and which results or output files you inspected. State the reason and consequence for material missing evidence, failed steps, or steps you did not run or verify. Identify a pre-existing output when it could be mistaken for a result of the current run.

When source material informed code you wrote or revised, name what you actually read and the choice it informed. For help, give the exact Stata or maintainer topic and relevant section or option. Identify bundled or installed help when the version matters. For a paper, give its authors, title or year, the replication file or section used, and a DOI or replication link when available. Cite a project file or log when it supplied the relevant evidence. A help-only edit can cite help alone.

For small text edits, include the actual before/after changes in the final reply, grouped by file with a brief explanation and fenced `diff` blocks (`-` removed, `+` added). Show every changed part with only enough unchanged context to locate it; do not reproduce whole files or invent a before version.

- Small means fewer than 100 added plus deleted lines across all maintained source and document files changed for the current request, with no overhaul. Count a one-line replacement as two lines; exclude unchanged context, pre-existing edits and regenerated outputs.
- Large means 100 or more added plus deleted lines, or an overhaul that replaces a workflow or reorganizes its connected stages, even below 100 lines. Several local additions within the existing flow are not by themselves an overhaul. This threshold controls reply length only; apply paper-reading and peer-review requirements separately by research meaning.
- For a large edit, explicitly say the diff was omitted because of its size or overhaul, summarize the changes and link the affected files or commit. Do not silently omit it or present a few excerpts as the complete diff.
- Describe generated tables, figures, data and logs by their actual updates instead of printing their contents as a text diff. If the before text is unavailable, say so and show only the verified addition or resulting text.
- An explicit user request for a full diff or a different reporting format takes precedence over these defaults.

Use [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
