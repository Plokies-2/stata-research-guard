# Workflow Boundaries

Before adding a branch or argument, read the existing workflow and the proposed workflow from their actual inputs to the saved outputs and downstream consumers. A variation that feeds the same maintained analysis belongs with that analysis. A maintained task with a distinct purpose and its own input-to-output flow belongs in a named `.do`. Workflows can read the same panel and use the same estimator while serving different purposes. A different output filename alone is insufficient to establish a distinct workflow. Keep a small coherent analysis together.

A short master can call established stages in execution order. Each stage shows its own data, research choices, and outputs.

Common stage roles include the following.

| Stage | Keep together |
| --- | --- |
| `cleaning_data.do` | Import, identifiers, merges/appends, variable construction, sample definitions, and a durable integrated analysis dataset or panel. |
| `summary.do` | Basic statistics, sample/missingness descriptions, and descriptive tables and figures. |
| `regression.do` | Main specifications, immediate estimate storage, and their regression tables, postestimation, and figures. |
| `robustness.do` | Requested alternative samples/specifications, placebo or permutation work, and their outputs. |

Preserve adequate existing names and contracts. Create only the stages the work actually needs.

Within a stage, use short labeled sections. Estimation and the code that consumes its saved results should be easy to find together. Splitting estimation, estimate storage, tables, and plots into separate modules usually hides that relationship. Separate outcomes or specifications usually belong in visible blocks or shallow loops, not separate files.

For a one-off comparison or hypothesis check, use temporary code in the work area. If the work ends without a maintained consumer, remove the temporary code after recording the requested results. If the analysis is adopted, retain the smallest readable code path that reproduces it. Reuse a durable dataset or `.ster` when rerunning downstream work.

## Choose a reference that fits the workflow

Choose by the input and output that justify the boundary in the current work. Consider what can be reused after preparation, which analyses need their own data or estimates, and who consumes each result. Start with any relevant example below or find another through [paper workflow reading](paper-workflow-reading.md). Open the original files for the relevant path. The bundled [source archive index](../../../data/source_archive/index.json) maps original paths to full-file snapshots where available. Use the relevant file boundary and keep the current project's research and output choices.

- **Short master with several established stages.** A project master can call `build_analysis_panel.do` for the reusable panel, `build_summary.do` for descriptives, `run_regressions.do` for the main estimates and their tables, and `draft_figures_tables.do` for separate manuscript exhibits. Use this shape when those stages already have distinct responsibilities.
- **A compact preparation-to-analysis handoff.** In *Democracy and Aid Donorship*, the master calls `Prepare data.do` and `Analyse data.do` under `corpus/packages/120068/`. The preparation file saves `new_donors_MAIN.dta`. The analysis file reads it and keeps the related OLS and IV specifications and Table 2 export together. Consider this layout when a reusable dataset feeds one coherent analysis. [Replication package V2](https://doi.org/10.3886/E120068V2)
- **Different source data and grouped research outputs.** In *Vulnerability and Clientelism*, `0. Master.do` under `corpus/packages/173341/dofiles/` calls survey cleaning and variable construction, followed by `3. Voting_Analysis_Cleaning.do`, which combines survey and electoral data into `voting_data.dta`. `4. Main_Tables.do` reads the household data for Table 2 and the electoral data for Table 4. `5. Appendix_Tables.do` reuses these prepared datasets for appendix analyses. Consider separating source-specific preparation and grouping downstream work by purpose. [Replication package V1](https://doi.org/10.3886/E173341V1)
- **One prepared panel feeding distinct estimations.** In *Managers' Productivity and Recruitment in the Public Sector*, `script_dataforregressions.do` under `corpus/packages/191751/` saves `DataForRegressionsADP.dta`. `script_recruitment_regressions.do` reads it for the Table 2 regressions, while `script_recruitment_figures.do` reads it for a separate event-time specification and exports Figure 4. This boundary makes sense when a figure requires its own estimation. For a figure based on the same estimate as a table, reuse that estimate and keep the handoff clear. [Replication package V1](https://doi.org/10.3886/E191751V1)
