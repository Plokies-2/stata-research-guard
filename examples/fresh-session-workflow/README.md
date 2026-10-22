# A fresh-session, end-to-end Stata comparison

**English** · [한국어](README.ko.md)

On 2026-10-22, two separate Codex chats using **GPT-6.1 Sol / medium** independently wrote and ran the same task. They inherited no conversation, received no example code, and did not read each other's work. The before chat was explicitly instructed to ignore personal/project `AGENTS.md` coding guidance, skills, and memories, and not to use Guard. The after chat read the current Guard guidance, exact help, and paper examples. The shared task did not specify an exporter, cell layout, loop structure, code length, or graph styling.

[before.do](before.do) and [after.do](after.do) are the complete executed scripts. Each author corrected execution errors and inspected the outputs. Publication adds `args output_dir` and `cd` to before and removes after's personal default working path; no analysis or table command was changed. The published versions were rerun in separate empty folders.

## Shared task

Load the bundled `nlsw88` data. Keep observations with all ten inputs observed: `wage hours age grade ttl_exp tenure union south smsa married`, plus `wage > 0` and `hours > 0`. Generate and label `ln_wage = ln(wage)`, save the analysis DTA, and write an Excel codebook documenting definition, source, unit, and missing-value treatment.

For each of `wage ln_wage hours`, estimate three OLS specifications in the full common sample and in its `married == 1` subset. Every regression uses `vce(robust)` and an intercept.

| Model | Regressors |
| --- | --- |
| 1 | `age grade` |
| 2 | `age grade ttl_exp tenure` |
| 3 | `age grade ttl_exp tenure union i.south i.smsa` |

Save 18 STER estimates; six Excel tables, one per outcome/sample, with all three models side by side; and three full-sample distribution PDFs. Tables must show all coefficients and robust standard errors, N, R², and the dependent-variable mean in each regression sample. Write one do-file and execute the full load–process–estimate–organize–export workflow, reading the actual data, logs, tables, codebook, and figures and correcting errors.

## Run

From the repository root in Stata:

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/fresh-before"
capture mkdir "`repo'/tmp/fresh-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

Both scripts use Stata's bundled data and built-in commands, including Mata's Excel interface. Neither requires mcpStata, Python, or a user-written exporter. Execution was checked with Stata 18. Before places outputs under its `outputs/` subfolder; after uses `estimates/`, `tables/`, and `figures/`, with data and codebook in its output root. Workbooks, data, estimates, PDFs, and execution logs are not distributed; run the scripts to regenerate them.

## Observations

Both runs retained 1,865 of 2,246 observations; the married subset had 1,214. Each saved 29 requested deliverables: one DTA, one codebook, six regression XLSX files, three PDFs, and 18 STER files. The 11 shared variables had identical values. Before drops the seven unused source variables; after retains all 17 source variables plus `ln_wage`.

We read all 18 saved-estimate pairs in Stata: coefficients, robust standard errors, N, and R² matched when displayed to 15 significant digits. We read all 12 regression workbooks. Each author read the codebook and inspected the rendered three PDFs. Before writes full-precision coefficients and SEs to paired columns, with reference coefficients/SEs recorded as zero; after exports six-decimal values, stacks SEs below coefficients, and marks reference levels as `(base)`. Tables include the requested model statistics and sample means. Graph bins and styling differ.

The before script nests sample, outcome, and specification loops, then loops over coefficients to map `e(b)` and `e(V)` into Excel cells. The after script uses two loops with three visible `regress` commands. It restores the saved models, calls `estimates table`, and exports Stata's completed table using `putexcel A3=etable`. The small `store_ymean` eclass helper adds the observed regression-sample mean to saved results; it does not hide estimation commands. No exporter was substituted after writing.

## Line counts

| Count | Before | After |
| --- | ---: | ---: |
| Entire published script, including comments and blank lines | 146 | 118 |
| Nonblank lines | 139 | 111 |
| Excluding the codebook construction/formatting block | 107 | 91 |
| Nonblank, excluding that block | 101 | 85 |

The excluded contiguous blocks are before lines 32–70 and after lines 31–57, from the codebook comment through its formatting and following blank line. These are counts of the scripts as written, not a second run with codebook code removed. Total physical lines decreased 19.2%; excluding those blocks, 15.0%. The README excerpts select actual table-construction and regression lines, omitting data preparation, saved-result handling, and formatting; complete definitions and execution order remain in the linked scripts. This is one observed example, not a code-quality score or a guarantee about other tasks.
