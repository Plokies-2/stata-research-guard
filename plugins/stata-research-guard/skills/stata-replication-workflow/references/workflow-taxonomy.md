# Workflow Boundaries

Apply the general rules' one-maintained-`.do`-per-work-unit boundary. Continue changes and refactoring in that file. The stage roles below help recognize genuinely distinct work units; they are not a recipe for splitting an existing analysis or creating a new file for each follow-up. A project with several established stages may use a short master:

| Stage | Keep together |
| --- | --- |
| `cleaning_data.do` | Import, identifiers, merges/appends, variable construction, sample definitions, and a durable integrated analysis dataset or panel. |
| `summary.do` | Basic statistics, sample/missingness descriptions, and descriptive tables and figures. |
| `regression.do` | Main specifications, immediate estimate storage, and their regression tables, postestimation, and figures. |
| `robustness.do` | Requested alternative samples/specifications, placebo or permutation work, and their outputs. |

These are roles and preferred new names, not mandatory files. Keep a small coherent analysis in one `.do`; preserve existing adequate names and contracts. Do not create empty stages or add robustness analyses the user did not request.

Within a stage, use short labeled sections. Estimation and the code that consumes its saved results should be easy to find together. Splitting estimation, estimate storage, tables, and plots into separate modules usually hides that relationship. Separate outcomes or specifications usually belong in visible blocks or shallow loops, not separate files.

Before adding a file, apply the new-file exceptions in the general rules. A revised specification or export is normally another edit or section in the same file. Reuse a durable dataset or `.ster` when rerunning downstream work; do not add runtime modes or option plumbing merely to skip completed stages.

When using a good project as a reference, adopt its readable data and estimate flow. Its exact globals, formatter, filenames, controls, sample rules, and visual formatting are not a template for every project.

This file-ownership default is a researcher workflow preference, not an OpenAI requirement for a single file. It follows OpenAI's [skill guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): state a focused decision boundary instead of prescribing an elaborate recipe. Keep file ownership stable while leaving implementation choices within the file to the model; do not turn this preference into a file-count checker or a demand to merge independent work units.
