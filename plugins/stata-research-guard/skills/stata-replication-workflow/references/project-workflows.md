# Project Workflow Patterns

Read this only when starting a Stata project from scratch or restructuring a whole project: a new master, a new folder layout, or several `.do` files merged, split, or renumbered. Do not read it for adding a regression, table, or figure, fixing an error, or editing one file; [workflow-taxonomy.md](workflow-taxonomy.md) covers those boundaries.

## Offer a choice before building

1. If a project exists, read its master, inputs, saved datasets, and outputs first. If the current structure already separates preparation from analysis and runs from one entrypoint, recommend keeping it and change only what the task needs.
2. Otherwise pick the two or three patterns below that fit the data sources and outputs. Give each in one line: stage order, folder shape, and why it fits. Recommend one and let the user choose before creating files.
3. Ask about an order variant only when the data do not settle it.

## Patterns

All four run from one master that calls stages in order; preparation saves an analysis dataset and analysis reads it. They differ in how preparation and analysis are split.

| Pattern | Stage order | Folder and file shape | Fits | Examples |
| --- | --- | --- | --- | --- |
| A. Numbered stages | master → 1 cleaning → 2 variable construction → 3 other-source preparation and merge → 4 main tables → 5 appendix | `code/0_master.do`, `1_cleaning.do` …; `data/raw`, `data/intermediate`, `data/final`; `output/tables`, `output/figures` | One to three sources; outputs grouped as main text and appendix | 173341, 195983, 115162 |
| B. Build / analysis | build each source (raw → tmp → processed), merge → analysis | `1_build/<source>/{raw,tmp,proc}`, `2_analysis/`; small version: `prepare_data.do` + `analyse_data.do` | Many sources in different formats (downloads, spreadsheets, surveys) | 193441, 209030, 120068 |
| C. One file per exhibit | one preparation file → one file per table or figure, a log per step | `10_data_preparation.do`, `20_figure_1.do`, `30_table_1.do` (sub-steps `30_table_1a_*.do`); `results/{logs,tables,figures}` | Exhibits need different samples or estimations and are rerun separately | 194561, 148522, 196012 |
| D. Nested masters | top master → data-preparation master → analysis master → main-text and appendix folders | `code/master.do`, shared `paths.do` included by each stage, `code/analysis/tables_main/` …; optional `code/confidential/` and `code/public/` | Large projects, restricted data, several people working on stages | 175582, z21562174 |

A common middle form keeps a separate regression panel and splits analysis by purpose: build datasets → data for regressions → descriptives, regressions, figures, appendix (191751). The stage table in [workflow-taxonomy.md](workflow-taxonomy.md) is this form.

## Order variants

| Choice | Variant 1 | Variant 2 | Examples |
| --- | --- | --- | --- |
| Merge and construction | clean → merge → construct variables on the merged data | clean and construct per source → merge | 191751 / 173341, 193441 |
| Analysis split | by stage: descriptives → main estimates → robustness | by exhibit: Figure 1, Table 1 … | 173341, 191751 / 194561, 148522 |
| Figures and tables | tables first; figures reuse stored estimates | a figure carries its own estimation (for example an event study) | 197984 / 194561, 191751 |

Use variant 2 for merge and construction when sources have different observation units. Otherwise construct once after the merge.

## Master contents

- Reset and version: `clear all`, `version`, `set more off`; `set seed` and `set sortseed` when results depend on randomness.
- One root path the user edits, or `global rootdir : pwd`. Every other path is a global built from it; create output folders with `cap mkdir`. Raw data stay read-only.
- Required community packages listed in one place (an install toggle or a project `ado/` folder).
- Stage calls with `do` in execution order, optionally a log per stage.
- Remove temporary datasets at the end if later stages do not read them.

## Sources

Examples are AEA replication packages bundled with this plugin, cited by project ID; see [THIRD_PARTY_NOTICES.md](../../../THIRD_PARTY_NOTICES.md) for authors, DOIs, and licenses. The patterns describe structure only. Open the original files through [paper workflow reading](paper-workflow-reading.md) when a concrete choice needs them. Stage order and layout also follow [AEA Data Editor guidance](https://aeadataeditor.github.io/aea-de-guidance/preparing-for-data-deposit) and [Julian Reif's Stata Coding Guide](https://julianreif.com/guide/).
