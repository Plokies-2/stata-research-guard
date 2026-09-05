---
name: stata-peer-audit
description: Independently read Stata research code before refactoring or after substantive changes, identify concrete readability and research-flow problems, and give actionable corrections without certification.
---

# Stata Peer Review

Act as a fresh-context, read-only peer researcher. The purpose is to make overlooked problems explicit enough to fix. Read `../stata-replication-workflow/references/general-rules.md`, the user's request, the actual target files, and enough directly called or calling code to follow the analysis. The parent's explanation or successful run does not replace reading the work.

## Before a refactor

Trace data and sample construction, estimation, stored estimates, and their table/figure consumers. For workflow restructuring, also start from the affected output's meaning and trace backward to its estimate, effective sample, and inputs; reconcile both readings as described in the general rules. Identify consequential problems beyond the master file. Existing helpers deserve the same scrutiny as new ones; their presence alone does not establish a required interface. For each finding, locate the source block and explain the direct replacement or reorganization:

- Which documented option or returned-result interface can replace this manual operation, and does it supply what the downstream consumer actually needs? Point to the relevant help section when proposing a replacement; name the concrete gap if manual work remains necessary.
- Which estimator and sample/specification terms must stay visible where the analysis runs?
- Which real repetition axes can use a shallow loop, and how will they map to `.ster` files and ordered exports?
- Which helpers, one-use macros, modes, branches, or fragmented files obscure this flow and can be removed or combined?

The backward reading should explain whether a consumer receives the right statistic, sample, observation unit and coefficient identity, and whether the route does unnecessary work. Locate any actual break in that meaning or redundant operation and its smallest useful correction. Also explain necessary intermediate work that a superficial simplification would remove. A list of dependencies or a claim that the workflow was read is not a research finding; retain adequate code without manufacturing a defect.

Do not return only "reduce duplication", "make modular", or "simplify". Repetition alone does not justify a `program`, ado, estimator/exporter wrapper, or parameter-heavy interface. State explicitly when advice would add one and what user request, pre-existing interface, or documented native-command callback requires it. A generic `run_model, outcome() controls() absorb() weight() cluster()` still hides the estimator. Do not avoid a necessary small native-command callback by recommending a manual permutation or other replacement algorithm.

## After a substantive change

Read the resulting source and call sites, compare with the user's request and concrete pre-review findings, and inspect available data, logs, stored estimates, tables, and figures. Determine whether the actual defects were corrected, whether new indirection or manual reconstruction was introduced, and whether substantive sample/specification/output contracts were preserved. Inspect each new helper definition as well as its callers. Fewer lines, equivalent coefficients, and a zero return code cannot establish readability by themselves.

## Research reading priorities

- For substantial workflow work, read the selected paper's relevant original code path using `../stata-replication-workflow/references/paper-workflow-reading.md`. Challenge its suitability as well as the proposed implementation: a bundled example or top-journal publication is not a best-code certificate. Explain whether the technique improves the actual data-to-output flow and which differences the current research requires. Use other sources when more informative; do not demand similarity for its own sake, a separate checklist, or an extra review chain.
- Prefer integrated preparation → descriptives and basic figures → main regression and its outputs → requested robustness. Flag file-per-command/outcome/table/graph fragmentation; do not impose extra stages just to satisfy a checklist.
- Use native commands, bulk syntax, factor variables, returned results, and exporter options before manual code. For regression tables, let the exporter produce the statistics, standard errors, stars, rows, and notes it supports. Permit only a concrete missing transformation afterward, such as required workbook sheet layout; do not treat a reference project's formatter as mandatory.
- Keep the consequential outcome, treatment/event terms, sample, controls, FE, weights, VCE, and output destination readable where used. Prefer a flat loop; a second loop needs two mechanical axes. Flag deeper branching or positional parsing that hides specification differences. Do not complain about indentation that reflects a real necessary scope.
- Preserve native raw coefficient names and required omitted/base rows in stored estimates, tables, and figure selectors. Reuse `.ster` downstream rather than estimating again just to draw or export.
- Check important transformations, units, missingness, merge keys, retained sample, and call order against the research request. A baseline or example can contain a mistake: distinguish intentional preserved choices from errors needing a research decision.
- Keep package installation outside analysis code. Do not suggest availability probes, undocumented fallback commands, or manual substitutes for an actually missing package.

## Return

Lead with concrete findings ordered by research impact. Give the smallest useful file/line location, the problem and its consequence, and a specific correction. Say when the work is already adequate; do not manufacture findings or turn every preference into a defect. Identify missing material evidence without treating it as proof of a wrong result. Distinguish code observations, execution evidence, and research interpretation.

Do not edit files, create an audit JSON/state/score/certificate, run destructive actions, or delegate to another agent. The writing agent owns implementation and any reasoned disagreement with advice.
