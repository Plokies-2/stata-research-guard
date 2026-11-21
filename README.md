# Stata Research Guard

<p align="center">
  <img src="assets/research-owl.png" alt="An owl researcher at a desk directs GPT's small working arms as they create code and a results table" width="240">
</p>

<p align="center">
  <a href="https://github.com/Plokies-2/stata-research-guard/releases/latest"><img src="https://img.shields.io/badge/version-0.4.1-245B78?style=flat-square" alt="Version 0.4.1"></a>
  <img src="https://img.shields.io/badge/AI--assisted-Stata-222222?style=flat-square" alt="AI-assisted Stata">
  <img src="https://img.shields.io/badge/developed_with-Stata_18-1A6B70?style=flat-square" alt="Developed with Stata 18">
  <a href="https://hub.xerj.org/contributors/Plokies-2"><img src="https://hub.xerj.org/contributors/Plokies-2/badge.svg" alt="XERJ Corpus Hub contributor"></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-245B78?style=flat-square" alt="English"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/Language-%ED%95%9C%EA%B5%AD%EC%96%B4-245B78?style=flat-square" alt="한국어"></a>
</p>

**Stata code researchers can read, revise, and carry forward.**

Latest release: [`v0.4.1`](https://github.com/Plokies-2/stata-research-guard/releases/tag/v0.4.1+codex.2026111901) (build `0.4.1+codex.2026111901`). See the [changelog](plugins/stata-research-guard/CHANGELOG.md).

The `main` branch currently serves build `0.4.1+codex.2026112101` with [updated authoring and reporting guidance](plugins/stata-research-guard/CHANGELOG.md#unreleased).

Stata Research Guard provides research guidance for AI-assisted Stata: readable analysis code, original command help, real paper code, and independent peer review. It connects data and sample construction to visible regression specifications, saved estimates, tables, and figures. The current installation is a Codex plugin; research choices remain with the user and the model.

[Get started](#get-started) | [Before and after](#see-the-workflow) | [Example requests](#example-requests) | [Release](https://github.com/Plokies-2/stata-research-guard/releases/latest) | [Documentation](#documentation) | [Questions and bug reports](https://github.com/Plokies-2/stata-research-guard/issues)

## Get started

Install Node.js and a Codex version that supports plugins. In PowerShell, register this public repository and install the plugin:

```powershell
codex plugin marketplace add Plokies-2/stata-research-guard --ref main
codex plugin add stata-research-guard@stata-research-guard-team
```

<details>
<summary>Installation paths and connection check</summary>

On Windows, run installation in a regular PowerShell terminal. Use Codex's default user directory (`%USERPROFILE%\.codex`); if you set `CODEX_HOME` separately, choose a short local path outside synced folders to avoid cache-activation and path-length errors.

The marketplace identifier is `stata-research-guard-team`. Start a new Codex chat, check that the plugin is enabled, and ask it to retrieve the official help for `regress` through `get_stata_command_evidence`. A successful help response confirms the MCP connection; installation alone does not. These commands follow the [official Codex CLI documentation](https://learn.chatgpt.com/docs/developer-commands#codex-plugin-marketplace).

</details>

Open your research files and request the `stata-replication-workflow` skill.

```text
$stata-replication-workflow
Read this project's regression.do and connected data, then continue the analysis.
Keep the current sample, estimator, fixed effects, and standard-error settings.
Run it and inspect the sample size and regression table.
```

**Tools needed:** Codex and Node.js. Running the analysis and looking up installed help use your own Stata installation. The plugin was developed with Stata 18. The model selects an available execution route, such as an existing runner, Stata batch mode, or Python integration.

The installation and MCP launcher have been checked on Windows. macOS compatibility still needs implementation and testing.

## See the workflow

### [Without Guard](examples/fresh-session-workflow/before.do)

```stata
local rhs1 "age grade"
local rhs2 "age grade ttl_exp tenure"
local rhs3 "age grade ttl_exp tenure union ib0.south ib0.smsa"
local terms "age grade ttl_exp tenure union 0b.south 1.south 0b.smsa 1.smsa _cons"
local bcols "B D F"
local secols "C E G"

foreach sample in full married {
    local restriction ""
    if "`sample'" == "married" local restriction "if married == 1"
    foreach y in wage ln_wage hours {
        putexcel set "outputs/reg_`y'_`sample'.xlsx", replace sheet("OLS")
        putexcel A1=("Outcome: `y'; sample: `sample'") A2=("Term") B2=("(1) Coef.") C2=("Robust SE") D2=("(2) Coef.") E2=("Robust SE") F2=("(3) Coef.") G2=("Robust SE")
        local row = 3
        foreach term of local terms {
            putexcel A`row'=("`term'")
            local ++row
        }
        putexcel A14=("N") A15=("R-squared") A16=("Outcome mean in e(sample)") A18=("OLS; heteroskedasticity-robust standard errors. Blank = term absent from specification.") A19=("0b.south and 0b.smsa are reference categories: coefficient and SE are zero by normalization.")
        forvalues spec = 1/3 {
            regress `y' `rhs`spec'' `restriction', vce(robust)
            local model_N = e(N)
            local model_R2 = e(r2)
            quietly summarize `y' if e(sample), meanonly
            local model_mean = r(mean)
            estimates save "outputs/`y'_`sample'_m`spec'.ster", replace
            matrix b = e(b)
            matrix V = e(V)
            local bc : word `spec' of `bcols'
            local sc : word `spec' of `secols'
            local row = 3
            foreach term of local terms {
                local j = colnumb(b, "`term'")
                if `j' < . {
                    putexcel `bc'`row'=(b[1,`j']) `sc'`row'=(sqrt(V[`j',`j']))
                }
                local ++row
            }
            putexcel `bc'14=(`model_N') `bc'15=(`model_R2') `bc'16=(`model_mean')
            display "MODEL: `y' `sample' m`spec'; N=" e(N) "; R2=" %10.7f e(r2) "; mean=" %10.7f `model_mean'
        }
        putexcel A1:G2, bold
        putexcel B3:G16, nformat("0.000000")
        putexcel B14:G14, nformat("0")
        putexcel A18:G19, txtwrap
        putexcel A1:G1, merge
        putexcel A18:G18, merge
        putexcel A19:G19, merge
        mata: book = xl()
        mata: book.load_book("outputs/reg_`y'_`sample'.xlsx")
        mata: book.set_sheet("OLS")
        mata: book.set_column_width(1,1,32)
        mata: book.set_column_width(2,7,16)
        mata: book.set_row_height(18,19,30)
        mata: book.close_book()
    }
}
```

### [With Guard](examples/fresh-session-workflow/after.do)

```stata
* Each model stores its own estimation-sample mean before any result reload.
program define store_ymean, eclass
    ereturn scalar ymean = r(mean)
end
foreach sample in full married {
    local restriction ""
    if "`sample'" == "married" local restriction "if married==1"
    foreach outcome in wage ln_wage hours {
        regress `outcome' age grade `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m1.ster", replace

        regress `outcome' age grade ttl_exp tenure `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m2.ster", replace

        regress `outcome' age grade ttl_exp tenure union i.south i.smsa `restriction', vce(robust)
        quietly summarize `outcome' if e(sample), meanonly
        store_ymean
        estimates save "estimates/`outcome'_`sample'_m3.ster", replace
    }
}

* Native combined table retains coefficient identities and base categories.
foreach sample in full married {
    foreach outcome in wage ln_wage hours {
        estimates use "estimates/`outcome'_`sample'_m1.ster"
        estimates store M1
        estimates use "estimates/`outcome'_`sample'_m2.ster"
        estimates store M2
        estimates use "estimates/`outcome'_`sample'_m3.ster"
        estimates store M3
        estimates table M1 M2 M3, b(%10.6f) se(%10.6f) stats(N r2 ymean) allbaselevels nofvlabel
        putexcel set "tables/`outcome'_`sample'.xlsx", replace open sheet(OLS)
        putexcel A1=("`outcome': `sample' sample")
        putexcel A3=etable
        putexcel A32=("OLS; robust SE below coefficients. M1: age grade; M2 adds ttl_exp tenure; M3 adds union i.south i.smsa.")
        putexcel A33=("ymean: dependent-variable mean in each regression sample. Blank: variable absent; base: reference category.")
        putexcel A1:D33, font("Calibri",11)
        putexcel A1:D1, bold
        putexcel A32:D32, merge txtwrap
        putexcel A33:D33, merge txtwrap
        putexcel save
        mata: book.load_book("tables/`outcome'_`sample'.xlsx")
        mata: book.set_sheet("OLS")
        mata: book.set_column_width(1,1,20)
        mata: book.set_column_width(2,4,19)
        mata: book.set_row_height(32,33,32)
        estimates drop M1 M2 M3
    }
}
```

## What it does

| Feature | Use in research |
| --- | --- |
| **Readable analysis code** | Shows the path from data and sample through estimation, saved results, tables, and figures so researchers can change variables and specifications. |
| **Commands grounded in source material** | Checks needed syntax, options, and returned results against official and maintainer help and expanded documentation. |
| **Context from real papers** | Reads a command with the surrounding data and sample preparation, saved estimates, and downstream outputs. |
| **Execution and result inspection** | Inspects relevant saved results and runs Stata when the task needs it. The final report names the sources that informed code choices and identifies material gaps in execution or verification. |
| **Peer review** | When requested or useful for a concrete research question, a colleague in a separate context reads the relevant code and results and offers focused advice. |

Keep related specifications in the `.do` file that owns their data-to-output workflow. Give an independent workflow its own named file. Keep mechanical loops shallow and make the estimator, sample, fixed effects, and inference visible where they are used. The researcher and model assess the evidence retrieved through the tools, separating successful execution from the validity of research conclusions.

Small text edits are reported with file-by-file before/after diffs. At 100 or more added plus deleted lines, or for a workflow overhaul, the reply explains that the diff was omitted and links the changes. Explicit requests for a full diff take precedence; generated outputs are described separately.

## Problems this addresses

The plugin grew out of recurring difficulties while writing and revising real analysis code.

| Difficult code | What to check while writing |
| --- | --- |
| Manual reimplementations and redundant settings | Check the active tool's defaults, native capabilities and supported options first. Use what already meets the request; add only the unsupported part. Preserve explicit user, project and template requirements and reuse visible evidence. |
| Short variable lists and options scattered across `local` macros | Put short lists directly in commands or the surrounding loop. Keep macros with clear purposes, such as shared paths, settings, and loop variables. |
| Regressions and saves hidden inside a helper or `program` | Keep estimation commands, samples, controls, FE, VCE, and output paths visible in the analysis. |
| Rerunning estimation whenever table or figure export fails | Distinguish completed estimation from failed output and restore saved estimates when appropriate to regenerate only what failed. |


## Example requests

These are prompts you can send to Codex. Specify variables, files, and outputs for your own project.

**Review older code or an analysis that needs maintenance**

Use `stata-peer-audit` when you want a focused review of existing code. It reads the analysis and available results as a research colleague, identifies concrete maintenance problems, and suggests corrections without editing the files.

```text
$stata-peer-audit
Read this older analysis.do, its connected code, and available data, logs,
tables, and figures. Identify changes that would make the sample,
regression specifications, saved results, and output easier to follow
and maintain. Give concrete file/line findings and reasons.
Keep the review read-only; preserve the current research choices.
```

**From scattered source data to paper tables and figures**

```text
$stata-replication-workflow
Read the raw-data folder and project README, then continue the analysis.
Check merge keys and observation units before building the analysis panel.
Estimate the sample, regression specifications, and standard errors in the README.
Save estimates as .ster, regression tables as Excel, and figures as PDF.
Make the code traceable from data to tables and figures, and inspect the actual results.
```

**Reproduce core results from a paper replication package**

```text
$stata-replication-workflow
Find the main regression table and event-study figure in this paper's replication package.
Trace the raw data, sample, estimation, and output, then reproduce the original specification.
Check command options and returned results in official or maintainer help.
Compare the paper's reported values with the actual run.
Identify anything blocked by data or package versions.
```

**Recover output when estimation finished but table or figure export failed**

```text
$stata-replication-workflow
The run stopped while saving results after the regressions.
Read the code, log, and saved .ster files to distinguish completed estimates
from failed output. Reuse valid saved estimates and repair only the failed
tables and figures. Keep the regression specifications and source data,
then inspect what was actually saved.
```

## End-to-end execution comparison

Two independent **Codex chats using GPT-6.1 Sol / medium** received the same natural-language task, with no inherited conversation, existing example, or access to each other's code. The baseline was explicitly told to ignore personal/project `AGENTS.md` coding guidance, skills, and memories, and not to use Guard. The other chat used the Guard guidance, help, and paper examples available on 22 October 2026. The shared task did not prescribe an exporter or loop structure.

The task covered loading `nlsw88`, common-sample construction, log wage, **three outcomes × two samples × three robust OLS specifications**, and data, codebook, table, figure, and estimate export. Both complete scripts ran in **native Stata batch mode**.

| Measure | Without Guard | With Guard |
| --- | ---: | ---: |
| Where to read the controls | Numbered macro definitions above the regression loop | Each `regress` command lists its controls |
| Nested loops around regression commands | 3 | 2 |
| Excel table | Writes coefficients and standard errors to individual cells | Exports Stata's combined table with `putexcel A3=etable` |
| Regressions / saved `.ster` files | 18 / 18 | 18 / 18 |
| Full / married sample N | 1,865 / 1,214 | 1,865 / 1,214 |
| Analysis DTA / codebook XLSX / regression XLSX / PDF | 1 / 1 / 6 / 3 | 1 / 1 / 6 / 3 |

The [code comparison](#see-the-workflow) shows how each model is specified and how its results reach Excel. We read all 18 pairs of saved estimates: coefficients, robust standard errors, N, and R² matched when displayed to 15 significant digits. The 11 shared analysis variables had identical values; before saves 11 variables, while after retains all 17 source variables plus log wage.

All 12 regression workbooks were read, and both authors inspected their codebooks and rendered PDFs. Before stores full-precision table values and writes base categories as zero; after exports six-decimal values and marks reference categories as `(base)`. Figure bins and styling differ. This is one observed case, not a guarantee about every generated script.

[Full before](examples/fresh-session-workflow/before.do) · [Full after](examples/fresh-session-workflow/after.do) · [Task and execution notes](examples/fresh-session-workflow/README.md). Publication adds an output-directory argument to before, removes after's personal default path, and translates after's codebook text into English. The estimation and regression-table methods remain as independently written.

<details>
<summary>Run the example</summary>

From the repository root in Stata. These scripts use Stata's bundled data and built-in commands, including Mata's Excel interface; no user-written exporter or Python package is needed.

```stata
local repo "`c(pwd)'"
capture mkdir "`repo'/tmp"
capture mkdir "`repo'/tmp/fresh-before"
capture mkdir "`repo'/tmp/fresh-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

Outputs go into separate folders. Execution was checked with Stata 18 on 2026-10-22.

</details>

## Evidence available to the model

Original paper material and attribution are preserved. For certain concrete transport errors, the plugin also provides separately marked `editorial_adaptation` examples. Read the changes and assumptions before applying one to your research; an original execution log is not the result of running an adapted example. Reuse of original and adapted material is subject to the [third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md).

| Resource | Contents |
| --- | --- |
| Command index | Names, families, stages, and roles for 115 commands |
| Command help | Stata-rendered official and maintainer help: 118 available topics, including 5 base topics; 2 unavailable |
| Live exact help | Exact topics without bundled help, or explicitly requested installed help, from the selected Stata installation |
| Expanded documentation | 69 official Stata 18 PDF entries and 1 author supplement |
| Paper examples | 166 original code blocks with selected-command context |
| Raw logs/artifacts | 12 directly attached original run logs or artifact records |

Beyond command-specific blocks, the [paper workflow reading guide](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md) helps follow original paper files through the entire analysis.

The [short authoring comparisons](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md) illustrate visible specifications, native predictions, result ownership and lifetime, and bounded edits. They distinguish model-specific summaries from intentionally shared statistics while preserving the requested sample policy. Read the relevant comparison when making an implementation choice.

<details>
<summary>Use the MCP tool directly</summary>

Call `get_stata_command_evidence` for help and paper examples relevant to a selected command. For example, to read help for `regress`:

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"],"include_paper_catalog":false}
```

See the [command evidence guide](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) for long-help sections, installed-version lookup, and attached paper code and logs.

</details>

<details>
<summary>Execution environment and package installation</summary>

Installing and enabling this plugin means you agree that supported user-written commands and required dependencies may be downloaded when needed from SSC or an official maintainer source and installed in your primary Stata environment's usual shared ado location. Any scope limits you set take precedence. The plugin does not preinstall every command or create an isolated ado environment, and it does not repeatedly ask about installations within this scope. This does not disable Codex's own approval controls.

For research tables, choose a documented table/export interface that fits the requested output and preserves the results and inference. Use its supported table features before assembling coefficient and standard-error rows by hand. A missing installation alone is not a reason to change estimation or inference.

Read figures in their research context. Keep concise labels that distinguish variables, specifications, axes, statistics, and groups; put definitions and detailed methods in the paper or README. Use short notes where they prevent a specific misreading, and avoid duplicate titles and oversized text.

Developed with Stata 18. `CODEX_MCP_NODE_PATH` can specify the Node executable and `STATA_PATH` the Stata executable for live help. Analysis can use an existing authorized runner, Stata batch mode, or official Python integration. If no execution route is available, the model can still write and review code and should state what it could not run.

After updating the plugin, refresh Codex and call the tool in a new task. A successful CLI install or file readback alone does not show that the running app loaded the new MCP. If connection still fails in a new task, inspect app startup logs and retry after a restart. This connection check is distinct from writing and running research code.

</details>

## Documentation

| Goal | Read |
| --- | --- |
| Start or revise an analysis | [Research workflow](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md) |
| Review code structure and authoring principles | [General rules](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md) |
| Follow a paper's full analysis | [Paper workflow reading](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md) |
| Run Stata and inspect outputs | [Execution and results](plugins/stata-research-guard/skills/stata-replication-workflow/references/execution-and-results.md) |
| Look up MCP options and reuse original material | [Command evidence](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) |
| Request a colleague's review of code and results | [Peer audit](plugins/stata-research-guard/skills/stata-peer-audit/SKILL.md) |
| Check attribution and use conditions | [Third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md) |

## Contributing

We welcome help making this plugin more useful to empirical researchers, especially work on Claude and macOS compatibility.

- **Claude compatibility:** Implement and check how the skills and MCP tools can be connected and installed in Claude Code or a similar environment.
- **macOS compatibility:** Document Mac Stata paths, the MCP startup script, and installation steps, then test them in a real Mac environment.

Neither environment has been verified yet. Reproducible bug reports, documentation improvements, and useful research examples are also welcome. Open an [issue](https://github.com/Plokies-2/stata-research-guard/issues) or a [pull request](https://github.com/Plokies-2/stata-research-guard/pulls).

<details>
<summary>Minimal functional checks for development</summary>

Check affected tool calls, delivery of original source material, and bundle structure. From the repository root:

```powershell
cd plugins/stata-research-guard
node --test tests/server.test.cjs tests/live-help.test.cjs tests/help-sections.test.cjs tests/optional-evidence.test.cjs tests/plugin_bundle_manifest.test.cjs
node scripts/verify_plugin_bundle.cjs
```

These checks cover calls, source delivery, and installation structure. Older runtime fixtures were separated from active tests and the release bundle so ordinary tests do not run Stata and compare research-table values or rows to a prescribed answer. Read actual code, logs, tables, and figures to judge readability and research validity; do not turn that judgment into an automated score or pass decision.

</details>

## License

The original plugin software is licensed under [MIT](LICENSE). Bundled paper excerpts, Stata documentation, maintainer help, and other third-party material retain their own terms, including any noncommercial restrictions. The MIT license does not relicense that material; see the [third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md).
