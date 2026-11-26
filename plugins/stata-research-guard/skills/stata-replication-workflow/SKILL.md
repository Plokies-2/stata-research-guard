---
name: stata-replication-workflow
description: Write, revise, execute, and review readable Stata analysis from actual project and command evidence, using an available authorized Stata interface.
---

# Stata Research Workflow

**The highest implementation priority is for a researcher to read the code from top to bottom and see what actually runs.** Simplicity serves that goal. Take the lines needed to show the path from source data and sample construction to estimates and saved outputs. At each consequential command, show the actual inputs, conditions, and options in the command itself; only outcome groups come from globals named for their contents (`$financial`). Keep an explicit step or specification when it makes that path easier to follow. Ignore line and character counts as measures of simplicity. Guard supplies evidence. The model and researcher make the research choices.

Protect source data and comparison baselines in the files themselves. Read existing results from saved data, estimates, and outputs. Write new runs to a separate destination when a baseline must be kept, and overwrite only authorized outputs. Keep historical execution paths out of the maintained analysis.

For a concrete authoring choice, read the relevant comparison in [code-examples.md](references/code-examples.md): mechanical repetition versus distinct specifications, naming outcome groups as globals and reusing them, native predictions, result ownership and lifetime, or the scope of a local edit. These authored illustrations explain decisions; they are not paper excerpts, required templates, or substitutes for command help and actual paper reading. Skip them when the choice is already clear.

## Start with what changes

Read the requested block and its direct caller or output before choosing further reading. Before writing code or adding settings, check whether the active tool's defaults, native capabilities and supported options already meet the request; use what suffices and implement only the unmet part, preserving explicit user choices and required project or template settings. Reuse visible evidence and resolve only the relevant uncertainty. A Stata filename alone does not require a Guard call. Once connectivity is established, do not turn an exempt follow-up into another connection-check or discovery call.

- For comments, literal labels or spacing, unchanged path interfaces, verbatim relocation, or unchanged-file execution with no semantic issue, make the smallest patch and inspect the affected call or output. This includes display-string or spacing values inside an already-understood option when its syntax and statistical meaning stay unchanged. Preserve call order, macro scope, inputs and stored-result consumers when moving code. Do not load the full general rules, command evidence, paper workflows or peer-review procedure solely for this edit.
- Use familiar basic control syntax directly: ordinary `foreach`/`forvalues`, block `if`/`else`, braces and local-macro expansion need no help lookup. A failed optional lookup does not ban them. Name each outcome group once as a `global` (`$financial`) and use one shallow loop over it for genuinely common work; model and output arguments stay in each command (see the macro rules in [general-rules.md](references/general-rules.md)). Use `if` for conditions that affect the analysis or depend on data or execution state. Look up a genuinely unresolved behavior and the material research-command interfaces inside the loop, following the boundary in [command-evidence.md](references/command-evidence.md).
- When research meaning or a command interface changes, identify the changed sample, specification, inference, statistic, option, returned result or consumer. Read [general-rules.md](references/general-rules.md) once per session: take it from the first Guard response when Guard is available, and read the file directly only when it is not. Do not read it again while it remains visible. Resolve research choices from the user's requirements and project evidence. Read command help only for the affected interface or an unresolved semantic question; a label describing a different statistic is not a cosmetic edit.
- If a small edit reveals a real dependency or semantic problem, expand only to that problem. For display changes, reuse suitable stored results and inspect the affected export.

For a known command needing evidence, the minimum call is:

```json
{"request":"Read the changed estout output interface","selected_commands":["estout"]}
```

There is no `phase` or `commands` argument. A new follow-up alone does not invalidate visible unchanged evidence. Use [command-evidence.md](references/command-evidence.md) when section selection, explicit evidence reuse, installed-version questions, or paper blocks are needed. A catalog or truncated response is not a complete help body; retrieve the missing material when dependencies remain unclear.

## Work from the actual project

Read applicable project instructions and any relevant current handoff. Preserve the user's scope, research specification, baseline data, and output contracts.

**Before adding a branch or argument to an existing `.do`, reassess the work unit.** Read the real inputs and trace the saved outputs back from their callers or consumers. Keep one maintained `.do` for each coherent workflow. Related variants that extend the same data-to-output flow stay in its existing file. An independent maintained analysis or stage with its own input-to-output flow belongs in a purpose-named file. The project folder, a shared panel, and a common estimator are insufficient reasons to combine them. Use [workflow-taxonomy.md](references/workflow-taxonomy.md) for the decision and an example of a short master.

**Offer a workflow choice only for whole-project work.** When starting a project from scratch or restructuring a whole project (new master, folder layout, or several `.do` files merged, split, or renumbered), read [project-workflows.md](references/project-workflows.md) and let the user choose a pattern before creating files. Skip it for partial edits.

**Delete obsolete code in the same edit.** Check direct callers and output consumers, then remove superseded or unused blocks in scope, including commented-out alternatives and their unused arguments or helpers. Run one-off exploration in the work area with a temporary driver if needed. At completion, integrate only the code needed to reproduce maintained outputs and delete the remaining scratch code created for the task. Preserve required reproducers, baselines and research records, including unfavorable results. See [general-rules.md](references/general-rules.md) for the cleanup boundary.

Before a project's first research run, ask once whether to create an Excel codebook if no existing codebook, designated workbook or prior decision is available. Continue authorized work that can proceed while the answer is pending. Follow [codebook.md](references/codebook.md) for creation, maintenance and formatting.

Comments state the current operation and research rationale; keep private revision or meeting history in Git or requested documentation. Retain substantive data/event dates and necessary source citations.

When a change affects a maintained table, figure, or dataset or the path that supplies it, check what the actual consumer reads and follow the affected path back to its input or estimate. Use [the common output guidance](references/general-rules.md#research-purpose) to decide how far upstream to read.

## Use the evidence that resolves the implementation

Use the existing implementation when the request and the active producer, its callers, and its result consumers establish how to make the change. This includes adding a specified outcome to an established table or moving blocks while preserving their inputs, execution order, returned state, and consumers. Check the new outcome's effective sample because its missingness can differ. Use the path called by the current entrypoint and confirm any assumptions about what the stored results contain.

For a new or changed material command interface, confirm the relevant official or maintainer help and reuse evidence that still applies. Read [connected original paper code](references/paper-workflow-reading.md) when the user requests it or when a concrete implementation choice remains and an example can inform it. Read the relevant path yourself and compare it with the current project before adapting it.

## Command evidence and execution

Use Guard for material command grammar and optional usage context. Frame the help question from the block's purpose and actual consumer. A known command goes directly to its help; discovery and expansion address a remaining question. The command-evidence reference owns lookup, exemptions, and reuse.

When writing or revising a descriptive figure or table (trends, group means, shares, distributions, baseline statistics), read [descriptive-outputs.md](references/descriptive-outputs.md).

For execution or result inspection, use [execution-and-results.md](references/execution-and-results.md). To inspect existing results, read the saved data, logs, estimates, tables or figures relevant to the request. Run the affected work when execution or reproduction is requested or when needed to update an authorized output. Reuse suitable stored estimates.

For a needed run, use an available authorized Stata interface and inspect the affected outputs. If no route is available, continue supported authoring and source review and identify what remains unexecuted. Execution success does not establish research validity.

## Independent peer advice

Honor the user's and project's directions about peer review. Use one fresh read-only review with `stata-peer-audit` when requested or when a second perspective can help resolve a concrete question about the data, sample, specification or outputs. A request to clean up, polish or refactor a whole `.do` file starts with one such review of that file; it checks the whole file, including code older than your edit, and you apply the findings you judge useful. When deciding yourself, identify that question after inspecting the work. Routine edits and reruns usually proceed directly.

Ask the concrete review question. Place the review before an expensive run when the source can answer it, or after execution when actual results are needed. Apply the advice you judge useful and check the affected work.

Use a subagent that starts from a fresh context, with no inherited conversation, and a model suited to the judgment, honoring the user's choice. Give the peer the user request, exact files and diff, directly connected definitions/callers/consumers, relevant inputs/outputs and available runtime artifacts, necessary command/paper sources, and paths to `stata-peer-audit` and the general rules. Do not frame the author's preferred implementation as the answer. Include earlier concrete advice and any reason for declining it without substituting that account for reading the sources. Do not create a review chain or approval system. If delegation is unavailable, complete the supported work and explicitly report the missing independent reading; do not claim it occurred.

## After editing

Change maintained `.do` content with `apply_patch` or `Edit`, which show exactly what changed. Use a shell script only for a mechanical change across a file, such as the `///` aligner or a block re-indent, and say so in the final reply.

After the final edit to maintained `.do` files, read [after-editing.md](references/after-editing.md) before the final reply. It holds the edited-region review, the common dirty-code patterns, the review line the reply must end with, and the diff format. The Stop hook lists what it can check mechanically, by line; fix each item or say why it stays.

The plugin's hook sends an edited-region reminder right after the first `.do` edit made with `apply_patch`, `Edit` or `Write` in a turn. If you made such an edit and no reminder arrived, the hooks did not run; Codex skips plugin hooks until they are trusted again after each plugin update. Say so in the final reply, ask the user to trust the stata-research-guard hooks (Codex: Settings → Hooks), and run `node hooks/stata-repeats.cjs` and `node hooks/stata-align.cjs` from the plugin root on the edited files yourself.

## Report results, sources, and edits

In the final reply, say which requested stages ran and which results or output files you inspected. State the reason and consequence for material missing evidence, failed steps, or steps you did not run or verify. Identify a pre-existing output when it could be mistaken for a result of the current run.

When source material informed code you wrote or revised, name what you actually read and the choice it informed. For help, give the exact Stata or maintainer topic and relevant section or option. Identify bundled or installed help when the version matters. For a paper, give its authors, title or year, the replication file or section used, and a DOI or replication link when available. Cite a project file or log when it supplied the relevant evidence. A help-only edit can cite help alone.

Show the `.do` edits as diffs in the final reply, following [after-editing.md](references/after-editing.md).

Use [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
