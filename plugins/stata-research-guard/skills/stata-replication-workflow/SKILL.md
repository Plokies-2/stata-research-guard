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
- Use familiar basic control syntax directly: ordinary `foreach`/`forvalues`, block `if`/`else`, braces and local-macro expansion need no help lookup. A failed optional lookup does not ban them. When the variables or output names are known, write the list explicitly. Wrap it with `///` or give it a nearby descriptive name if that makes the command easier to read. Keep fixed groups beside their respective operations and use one shallow loop for genuinely common work. Use `if` for conditions that affect the analysis or depend on data or execution state. Look up a genuinely unresolved behavior and the material research-command interfaces inside the loop, following the boundary in [command-evidence.md](references/command-evidence.md).
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

For execution or result inspection, use [execution-and-results.md](references/execution-and-results.md). To inspect existing results, read the saved data, logs, estimates, tables or figures relevant to the request. Run the affected work when execution or reproduction is requested or when needed to update an authorized output. Reuse suitable stored estimates.

For a needed run, use an available authorized Stata interface and inspect the affected outputs. If no route is available, continue supported authoring and source review and identify what remains unexecuted. Execution success does not establish research validity.

## Independent peer advice

Honor the user's and project's directions about peer review. Use one fresh read-only review with `stata-peer-audit` when requested or when a second perspective can help resolve a concrete question about the data, sample, specification or outputs. When deciding yourself, identify that question after inspecting the work. Routine edits and reruns usually proceed directly.

Ask the concrete review question. Place the review before an expensive run when the source can answer it, or after execution when actual results are needed. Apply the advice you judge useful and check the affected work.

Use a subagent that starts from a fresh context, with no inherited conversation, and a model suited to the judgment, honoring the user's choice. Give the peer the user request, exact files and diff, directly connected definitions/callers/consumers, relevant inputs/outputs and available runtime artifacts, necessary command/paper sources, and paths to `stata-peer-audit` and the general rules. Do not frame the author's preferred implementation as the answer. Include earlier concrete advice and any reason for declining it without substituting that account for reading the sources. Do not create a review chain or approval system. If delegation is unavailable, complete the supported work and explicitly report the missing independent reading; do not claim it occurred.

## Review the edited region

After the final edit to maintained `.do` files, locate each changed region in the actual diff and read all code in that region and the 50 lines before and after it, clipped at file boundaries. Merge overlapping ranges. For a deletion, inspect the surviving context, or the before version if the whole file was removed. Then find and read where the globals, locals, variables, and saved files used in the changed region are defined, even when the definition is far above or in another do-file; a new macro or variable that duplicates an existing one is usually visible only there.

- Review every changed operation by its purpose, inputs, effects, and consumers. Ask whether existing code already does the work, an existing command can do it through its default or a supported option, the needed choice or value is already known and can be written directly, or an existing macro, variable, or saved dataset already holds what the new code builds.
- Look for overlapping responsibilities through the affected flow, from inputs to saved and displayed outputs. Follow directly connected producers and consumers outside the nearby lines when needed. Work can be redundant even when it uses different syntax, is split across commands or files, or sits before or after an existing step.
- Name the concrete step that could be removed or reused and check that removing it preserves the required behavior: inputs, sample, group definitions, weights, missing values, execution order, state, side effects, and outputs. Separate operations are justified when they produce distinct required results, apply real conditions, or protect a meaningful invariant.
- Scan the changed files for two common misses: a literal that repeats an existing global or local (a path, varlist or value), and a variable in a `keep`, `drop`, `if` or `missing()` condition that no later code uses, which shrinks the sample for nothing. Use the macro; drop the condition unless the restriction is a stated research choice.
- Fix duplicates within the requested scope and reread the affected ranges. Report what changed or any duplicate that remains. If a range cannot be read, report the range and reason instead of claiming completion.

Most dirty code comes from two habits: an `if` where a plain list would do, and a hand-written step where existing code, data, or a Stata command already does the work. The groups below illustrate them; they are not a checklist, so react to any redundancy of the same kind. Simple does not mean few characters: a longer block that shows its inputs where they are used is simpler than a short one that hides them behind macros. Keeping an edit minimal limits its scope; it does not mean keeping duplicated logic inside the flow you are changing.

```stata
* A. Rebuilding what already exists
global controls2 "$controls ttl_exp"                    // extend $controls where it is defined
cap mkdir "$root/data/final"                            // $final already names it: cap mkdir "$final"
collapse (mean) `careers', by(bmo_rule female)
collapse (mean) `careers', by(female)                   // graph bar (mean) ..., over(female) already averages
gen byte cert_list = year >= list_start if !missing(cert)   // rename the column in the saved data and load it
use "panel_v2.dta", clear                               // each do-file reads its own variant; use one combined panel

* B. Branching where a list or a block would do
foreach v of varlist ln_* {
    if strpos("`v'", "emp") | strpos("`v'", "pay") local use wins_`v'
}                                                       // local winsorized wins_ln_emp_num wins_ln_pay_real ...
foreach y in out_share ev_share {
    if "`y'" == "out_share" { ... }                     // different inputs and denominators: one block each
}
foreach spec of local specs {
    reghdfe `y' ``spec'_rhs' if ``spec'_sample', absorb(``spec'_fe')
}                                                       // unroll so each block shows sample, treatment, controls, output
if `a' { if `b' { if `c' { ... } } }                    // keep nesting shallow; split by stage

* C. Machinery nobody needs
set varabbrev off                                       // drop settings that do not change the result
keep if !missing(ln_wage, age, collgrad)                // collgrad is never used later: it only drops observations
gen double a = x * w
gen double b = a / total                                // gen double share = 100 * x * w / total
* Generate share variable                               // comments that repeat the code; keep comments that explain a choice
graph export "fig_unused.pdf"                           // outputs the canonical paper no longer uses: delete their code

* D. Mixing stages
foreach y of local outcomes {
    reghdfe `y' treat, absorb(firm year) vce(cluster firm)
    outreg2 using tmp.txt, replace                      // save .ster here; build tables in another do-file
}

* E. Doing by hand what Stata does
foreach v of local vars {
    preserve
    collapse (mean) `v', by(group)
    restore
}                                                       // one collapse (mean) `vars', by(group)
forvalues g = 1/50 {
    summarize y if group == `g', meanonly
    replace group_mean = r(mean) if group == `g'
}                                                       // bysort group: egen double group_mean = mean(y)
gen byte region = 0
replace region = 1 if inlist(state, 1, 2, 3)            // recode state (1/3 = 1) (4/5 = 2) (else = 0), gen(region)
merge m:1 id using "firm.dta"
keep if _merge == 3                                     // merge m:1 id using "firm.dta", assert(match master) keep(match)
capture drop x                                          // use capture only where failure is expected; let errors stop the run
merge m:m id using "x.dta"                              // fix the key or use joinby
```

Only after reading the ranges, put this line on its own in the final reply, followed by the ranges you actually read, by file and line: `수정 코드 주변 50줄을 읽어 중복 구현을 확인했다. (build_analysis_panel.do 260-380행, controls 정의 12-18행)`

## Report results, sources, and edits

In the final reply, say which requested stages ran and which results or output files you inspected. State the reason and consequence for material missing evidence, failed steps, or steps you did not run or verify. Identify a pre-existing output when it could be mistaken for a result of the current run.

When source material informed code you wrote or revised, name what you actually read and the choice it informed. For help, give the exact Stata or maintainer topic and relevant section or option. Identify bundled or installed help when the version matters. For a paper, give its authors, title or year, the replication file or section used, and a DOI or replication link when available. Cite a project file or log when it supplied the relevant evidence. A help-only edit can cite help alone.

For small Stata code changes, include the actual before/after changes in the final reply in a separate fenced `diff` block for each changed `.do` file (`-` removed, `+` added). Include the blocks even when the reply also summarizes the changes or links to the files. Show every changed part with only enough unchanged context to locate it; do not reproduce whole files or invent a before version. Briefly describe the role of any accompanying Python preprocessing or other non-Stata files. Include diffs for those files when the user asks for them.

- Count added and deleted lines only in maintained `.do` files changed for the current request. Count a one-line replacement as two lines and omit unchanged context, pre-existing edits, scratch files, and reverted changes.
- Small means fewer than 200 changed `.do` lines with no overhaul of the Stata workflow. Large means 200 or more changed `.do` lines, or Stata changes that replace a workflow or reorganize its connected Stata stages. Several local additions within the existing flow are not by themselves an overhaul. Choose evidence and peer review based on the research question.
- For a large edit, put a line starting with `diff 생략:` and the reason (for example, `diff 생략: .do 변경 240줄`), summarize the changes and link the affected files or commit. Do not silently omit it or present a few excerpts as the complete diff.
- Describe generated tables, figures, data and logs by their actual updates instead of printing their contents as a text diff. If the before text is unavailable, say so and show only the verified addition or resulting text.
- An explicit user request for a full diff or a different reporting format takes precedence over these defaults.

Use [readme-contract.md](references/readme-contract.md) only when the authorized task needs a researcher-facing README.
