# Workflow Boundaries

Organize by research stage, not by command, output count, or file length. The usual complete workflow is a short master calling only the stages needed:

| Stage | Keep together |
| --- | --- |
| `cleaning_data.do` | Import, identifiers, merges/appends, variable construction, sample definitions, and a durable integrated analysis dataset or panel. |
| `summary.do` | Basic statistics, sample/missingness descriptions, and descriptive tables and figures. |
| `regression.do` | Main specifications, immediate estimate storage, and their regression tables, postestimation, and figures. |
| `robustness.do` | Requested alternative samples/specifications, placebo or permutation work, and their outputs. |

These are roles and preferred new names, not mandatory files. Keep a small coherent analysis in one `.do`; preserve existing adequate names and contracts. Do not create empty stages or add robustness analyses the user did not request.

Within a stage, use short labeled sections. Estimation and the code that consumes its saved results should be easy to find together. Splitting estimation, estimate storage, tables, and plots into separate modules usually hides that relationship. Separate outcomes or specifications usually belong in visible blocks or shallow loops, not separate files.

An additional file needs a concrete independent purpose: an existing external interface, a separately maintained input pipeline, or a costly operation that genuinely needs independent restart. Explain that reason. A file being long, a command being repeated, or a step having its own name is not sufficient. Reuse a durable dataset or `.ster` when rerunning downstream work; do not add runtime modes or option plumbing merely to skip completed stages.

When using a good project as a reference, adopt its readable data and estimate flow. Its exact globals, formatter, filenames, controls, sample rules, and visual formatting are not a template for every project.
