# Stata Research Guard

<p align="center">
  <img src="assets/research-owl.png" alt="An owl researcher at a desk directs GPT's small working arms as they create code and a results table" width="360">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-245B78?style=flat-square" alt="Version 0.4.0">
  <img src="https://img.shields.io/badge/Codex-plugin-222222?style=flat-square" alt="Codex plugin">
  <img src="https://img.shields.io/badge/developed_with-Stata_18-1A6B70?style=flat-square" alt="Developed with Stata 18">
  <a href="https://hub.xerj.org/contributors/Plokies-2"><img src="https://hub.xerj.org/contributors/Plokies-2/badge.svg" alt="XERJ Corpus Hub contributor"></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-245B78?style=flat-square" alt="English"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/Language-%ED%95%9C%EA%B5%AD%EC%96%B4-245B78?style=flat-square" alt="한국어"></a>
</p>

**Stata code researchers can read, revise, and carry forward.**

Stata Research Guard is a Codex plugin that helps write analysis code researchers can follow from data and sample construction through regression specifications, saved estimates, tables, and figures. It supplies a command index, official and maintainer help, real paper code, and independent peer review. Research choices remain with the user and the model.

[Get started](#get-started) · [Example requests](#example-requests) · [End-to-end execution comparison](#end-to-end-execution-comparison) · [Documentation](#documentation) · [Questions and bug reports](https://github.com/Plokies-2/stata-research-guard/issues)

## AI writes Stata code like this

One fresh Codex session built a regression table cell by cell and hid the specifications behind nested macros. Another used Guard to keep the regressions visible and let Stata build the table. Here are the two differences.

**1. From coefficient-cell bookkeeping to a table command**

Before · keep a coefficient roster, map model numbers to Excel columns, and copy estimates into cells:

```stata
local terms "age grade ttl_exp tenure union 0b.south 1.south 0b.smsa 1.smsa _cons"
local bcols "B D F"
local secols "C E G"

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
```

With Guard · restore the three models as `M1`–`M3`, build their combined table, and export it:

```stata
estimates table M1 M2 M3, b(%10.6f) se(%10.6f) stats(N r2 ymean) allbaselevels nofvlabel
putexcel set "tables/`outcome'_`sample'.xlsx", replace open sheet(OLS)
putexcel A1=("`outcome': `sample' sample")
putexcel A3=etable
```

`A3=etable` writes Stata's completed table. It does not extract and lay out every coefficient and standard error by hand.

**2. From macro-expanded specifications to visible regressions**

Before · a third loop selects controls through nested macro expansion:

```stata
local rhs1 "age grade"
local rhs2 "age grade ttl_exp tenure"
local rhs3 "age grade ttl_exp tenure union ib0.south ib0.smsa"

forvalues spec = 1/3 {
    regress `y' `rhs`spec'' `restriction', vce(robust)
}
```

With Guard · the three regression specifications are directly readable:

```stata
regress `outcome' age grade `restriction', vce(robust)
regress `outcome' age grade ttl_exp tenure `restriction', vce(robust)
regress `outcome' age grade ttl_exp tenure union i.south i.smsa `restriction', vce(robust)
```

These are excerpts, with only the regression commands shown in the second pair. In the full scripts, `y`/`outcome` runs over `wage ln_wage hours`; `restriction` selects the full or married sample, and `spec` indexes models 1–3. Data preparation, means, saves, and formatting are in the [complete before](examples/fresh-session-workflow/before.do) and [complete after](examples/fresh-session-workflow/after.do) scripts.

The authors worked in separate Codex chats with no shared conversation or example code. Both ran the full data-to-export task; see the [task and run conditions](examples/fresh-session-workflow/README.md).

## What it does

| Feature | Use in research |
| --- | --- |
| **Readable analysis code** | Shows the path from data and sample through estimation, saved results, tables, and figures so researchers can change variables and specifications. |
| **Commands grounded in source material** | Checks needed syntax, options, and returned results against official and maintainer help and expanded documentation. |
| **Context from real papers** | Reads a command with the surrounding data and sample preparation, saved estimates, and downstream outputs. |
| **Execution and result inspection** | Reads actual data, logs, tables, and figures and makes needed corrections. |
| **Peer review** | When analysis is materially added or restructured, a colleague in a separate context reads the code and results once and suggests concrete improvements. |

Continue an existing analysis in the same `.do` file and keep mechanical loops shallow. Estimators, samples, fixed effects, and inference methods remain visible in the analysis. The researcher and model assess the evidence retrieved through the tools, separating successful execution from the validity of research conclusions.

## Problems this addresses

The plugin grew out of recurring difficulties while writing and revising real analysis code.

| Difficult code | What to check while writing |
| --- | --- |
| Manual reimplementations and redundant settings | Check the active tool's defaults, native capabilities and supported options first. Use what already meets the request; add only the unsupported part. Preserve explicit user, project and template requirements and reuse visible evidence. |
| Short variable lists and options scattered across `local` macros | Put short lists directly in commands or the surrounding loop. Keep macros with clear purposes, such as shared paths, settings, and loop variables. |
| Regressions and saves hidden inside a helper or `program` | Keep estimation commands, samples, controls, FE, VCE, and output paths visible in the analysis. |
| Rerunning estimation whenever table or figure export fails | Distinguish completed estimation from failed output and restore saved estimates when appropriate to regenerate only what failed. |

## Get started

Install Node.js and a Codex version that supports plugins. In PowerShell, register this public repository and install the plugin:

```powershell
codex plugin marketplace add Plokies-2/stata-research-guard --ref main
codex plugin add stata-research-guard@stata-research-guard-team
```

On Windows, run installation in a regular PowerShell terminal. Use Codex's default user directory (`%USERPROFILE%\.codex`); if you set `CODEX_HOME` separately, choose a short local path outside synced folders to avoid cache-activation and path-length errors.

The marketplace identifier is `stata-research-guard-team`. Start a new Codex chat, check that the plugin is enabled, and ask it to retrieve the official help for `regress` through `get_stata_command_evidence`. A successful help response confirms the MCP connection; installation alone does not. These commands follow the [official Codex CLI documentation](https://learn.chatgpt.com/docs/developer-commands#codex-plugin-marketplace).

Open your research files and request the `stata-replication-workflow` skill.

```text
$stata-replication-workflow
Read this project's regression.do and connected data, then continue the analysis.
Keep the current sample, estimator, fixed effects, and standard-error settings.
Run it and inspect the sample size and regression table.
```

**Tools needed:** Codex and Node.js. Running the analysis and looking up installed help use your own Stata installation. The plugin was developed with Stata 18. The model selects an available execution route, such as an existing runner, Stata batch mode, or Python integration.

The installation and MCP launcher have been checked on Windows. macOS compatibility still needs implementation and testing.

## Example requests

These are prompts you can send to Codex. Specify variables, files, and outputs for your own project.

**Review older code or an analysis that needs maintenance**

Use `stata-peer-audit` to review existing code before changing it. It reads the analysis and available results as a research colleague, identifies concrete maintenance problems, and suggests corrections without editing the files.

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

Two independent **Codex chats using GPT-6.1 Sol / medium** received the same natural-language task, with no inherited conversation, existing example, or access to each other's code. The baseline was explicitly told to ignore personal/project `AGENTS.md` coding guidance, skills, and memories, and not to use Guard. The other chat used the current Guard guidance, help, and paper examples. The shared task did not prescribe an exporter or loop structure.

The task covered loading `nlsw88`, common-sample construction, log wage, **three outcomes × two samples × three robust OLS specifications**, and data, codebook, table, figure, and estimate export. Both complete scripts ran in **native Stata batch mode**.

| Measure | Without Guard | With Guard |
| --- | ---: | ---: |
| Published script lines | 146 | 118 |
| Lines excluding codebook construction and formatting | 107 | 91 |
| Nested loops around regression commands | 3 | 2 |
| Manual coefficient/SE cell mapping | Yes | None |
| Regressions / saved `.ster` files | 18 / 18 | 18 / 18 |
| Full / married sample N | 1,865 / 1,214 | 1,865 / 1,214 |
| Analysis DTA / codebook XLSX / regression XLSX / PDF | 1 / 1 / 6 / 3 | 1 / 1 / 6 / 3 |

The difference is visible specifications and automatic table construction. Total code was 19.2% shorter; excluding the codebook block, it was 15.0% shorter. We read all 18 pairs of saved estimates: coefficients, robust standard errors, N, and R² matched when displayed to 15 significant digits. The 11 shared analysis variables had identical values; before saves 11 variables, while after retains all 17 source variables plus log wage.

All 12 regression workbooks were read, and both authors inspected their codebooks and rendered PDFs. Before stores full-precision table values and writes base categories as zero; after exports six-decimal values and marks reference categories as `(base)`. Figure bins and styling differ. This is one observed case, not a guarantee about every generated script.

[Full before](examples/fresh-session-workflow/before.do) · [Full after](examples/fresh-session-workflow/after.do) · [Task, counting boundaries, and execution notes](examples/fresh-session-workflow/README.md). The only publication edits add an output-directory argument to before and remove after's personal default path. The table method was kept as independently written.

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
