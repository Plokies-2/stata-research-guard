# An independently written, end-to-end analysis comparison

**English** · [한국어](README.ko.md)

This is the earlier, smaller comparison with two specifications. The main README now uses the [fresh-session comparison](../fresh-session-workflow/README.md), which covers three outcomes, two samples, and three specifications. The scripts and observations below describe this original run.

On 2026-10-22, two GPT-6 Sol / high authors received the same natural-language task. Each started in a fresh context and an empty folder, with neither the existing example nor the other author's code. Both were instructed not to read or apply personal or project `AGENTS.md` files or memories. The before author was also instructed not to use Guard skills or tools; the after author read the current Guard workflow guidance, command help, and paper examples. The lead author then reviewed and compared both results.

[before.do](before.do) was written without Guard; [after.do](after.do) was written independently with Guard. Neither version served as input or a correction target for the other. Each author fixed execution errors in the same file and inspected the outputs. The after author also fixed an initial log-file collision in that do-file.

## Shared task

Load Stata's bundled `nlsw88` data and construct a common sample with observed `wage hours age grade ttl_exp tenure union`, `wage > 0`, and `hours > 0`. Generate `ln_wage = ln(wage)`, label the variable, and document its definition, source, unit, and missing-value treatment in an Excel codebook.

Estimate two OLS specifications for each of `wage`, `ln_wage`, and `hours`, both with `vce(robust)`.

| Specification | Regressors |
| --- | --- |
| 1 | `age grade` |
| 2 | `age grade ttl_exp tenure union` |

Save one analysis DTA, one codebook XLSX, three Excel regression tables with both specifications side by side, three distribution PDFs, and six STER estimates. The tables must include coefficients, standard errors, N, R², and the outcome mean in the regression sample. Write the analysis in one do-file, execute it from data loading through export, inspect the data, logs, tables, and figures, and fix what is needed. The task did not specify commands, code length, loop use, Excel cell positions, displayed precision, or figure styling.

## Run the example

In Stata, set the repository root as the working directory and run the following. The source data ships with Stata. Built-in Stata commands handle the analysis, regression tables, and figures. Formatting the after codebook's column widths and row height also requires Python callable as `python` and `openpyxl`. Execution was checked with Stata 18.

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/independent-before"
capture mkdir "`repo'/tmp/independent-after"
do "`repo'/examples/independent-workflow/before.do" "`repo'/tmp/independent-before"
do "`repo'/examples/independent-workflow/after.do" "`repo'/tmp/independent-after"
cd "`repo'"
```

In the published versions, one line setting a personal absolute working path became `args output_dir` and `cd`, and trailing blank lines were trimmed. The analysis and export code stayed the same, and the published versions were also run in separate folders. The original versions had 75 and 62 lines; the published versions have 75 and 63. Execution logs and generated outputs are not included in the public repository.

## Observed results

Both authors selected the same 1,865 observations from 2,246 source observations and saved all 14 requested outputs. The analysis datasets had identical values when read with matching variable order. All coefficients, robust standard errors, N, and R² from the six pairs of saved STER files matched when displayed to 15 significant digits in Stata. The regression-sample outcome means were 7.589755656 for wage, 1.893820732 for log wage, and 37.607506702 for hours.

The before author placed variable rows, coefficients, standard errors, and summary statistics at explicit `putexcel` cell addresses. The after author exported the two saved estimates with `etable`. Published code length fell from 75 to 63 lines, a 16% reduction, and no table-row or cell-coordinate management remained. Both regression specifications remain visible in the after script.

We read the coefficients, standard errors, and summary statistics in all six Excel regression tables and the codebooks, and rendered all six PDFs for inspection. Before uses numeric standard-error cells, while after displays three-decimal standard errors as parenthesized strings. The histograms use percent and frequency vertical axes, respectively. The data and estimates match, but the table contents and figure appearance are not identical. This is one independently written case for one shared task.
