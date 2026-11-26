# Stata Research Guard

<p align="center">
  <img src="assets/research-owl.png" alt="An owl researcher at a desk directs GPT's small working arms as they create code and a results table" width="240">
</p>

<p align="center">
  <a href="https://github.com/Plokies-2/stata-research-guard/releases/latest"><img src="https://img.shields.io/badge/version-0.5.1-245B78?style=flat-square" alt="Version 0.5.1"></a>
  <img src="https://img.shields.io/badge/works_with-Codex_%7C_Claude_Code-222222?style=flat-square" alt="Works with Codex and Claude Code">
  <img src="https://img.shields.io/badge/developed_with-Stata_18-1A6B70?style=flat-square" alt="Developed with Stata 18">
  <a href="https://hub.xerj.org/contributors/Plokies-2"><img src="https://hub.xerj.org/contributors/Plokies-2/badge.svg" alt="XERJ Corpus Hub contributor"></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-245B78?style=flat-square" alt="English"></a>
  <a href="README.ko.md"><img src="https://img.shields.io/badge/Language-%ED%95%9C%EA%B5%AD%EC%96%B4-245B78?style=flat-square" alt="한국어"></a>
</p>

<h3 align="center">AI-written Stata that reads like a careful coauthor wrote it.</h3>

<p align="center">
  Every regression shows its sample, controls, fixed effects, and standard errors where it runs.<br>
  Every command choice is checked against the real help file. Every edit is reviewed and shown as a diff.
</p>

<p align="center">
  <a href="#install-in-one-minute">Install</a> ·
  <a href="#see-the-difference">Before and after</a> ·
  <a href="#every-edit-comes-back-as-a-diff-checked-line-by-line">Diffs and checks</a> ·
  <a href="#how-it-decides">How it decides</a> ·
  <a href="#what-it-guards">What it guards</a> ·
  <a href="#try-it">Example requests</a> ·
  <a href="#documentation">Docs</a> ·
  <a href="https://github.com/Plokies-2/stata-research-guard/issues">Issues</a>
</p>

---

## Why

AI coding agents write Stata that *runs*. That is not the same as Stata a researcher can check, change, and hand to a replicator. Left alone, an agent tends to:

- hide controls in numbered `local` macros far above the regression, so you cannot see what model `m3` actually is;
- rebuild tables cell by cell with `putexcel` when `etable`, `esttab`, or `collect` already does it;
- invent a new global for a variable list that an existing global already holds, or add a second `collapse` beside the first;
- rerun every regression because a table export failed;
- grow sibling scripts (`analysis_v2.do`, `analysis_fix.do`) instead of editing the file that owns the workflow.

Stata Research Guard is a plugin for **Codex** and **Claude Code** that pushes the agent the other way: visible specifications, documented commands, saved estimates, one maintained `.do` per workflow, and a review of every edited region before it reports back. Research choices stay with you.

Most agent tooling for Stata adds capability: more syntax, a way to run Stata, an automated method. Guard adds restraint. It keeps the agent from doing what you never asked for, and leaves every research decision where you can see it.

## Install in one minute

You need Node.js and a Codex or Claude Code version with plugin support. Both install the same bundle from `plugins/stata-research-guard`.

**Claude Code**

```powershell
claude plugin marketplace add Plokies-2/stata-research-guard
claude plugin install stata-research-guard@stata-research-guard-team
```

Inside a session, `/plugin marketplace add Plokies-2/stata-research-guard` and `/plugin install stata-research-guard@stata-research-guard-team` do the same.

**Codex** (in PowerShell)

```powershell
codex plugin marketplace add Plokies-2/stata-research-guard --ref main
codex plugin add stata-research-guard@stata-research-guard-team
```

**Check it works:** start a new chat and ask for the official help for `regress` through `get_stata_command_evidence`. A help response means the Guard MCP server is connected; a successful install alone does not show that.

<details>
<summary>Codex: paths, hook trust, and troubleshooting</summary>

On Windows, run installation in a regular PowerShell terminal. Use Codex's default user directory (`%USERPROFILE%\.codex`); if you set `CODEX_HOME` separately, choose a short local path outside synced folders to avoid cache-activation and path-length errors. These commands follow the [official Codex CLI documentation](https://learn.chatgpt.com/docs/developer-commands#codex-plugin-marketplace).

To enable the review and diff reminders, review and trust the plugin's `PreToolUse`, `PostToolUse`, and `Stop` hooks in **Settings → Hooks** or with `/hooks` in the CLI. Trust them again after every plugin update: Codex does not warn when the hook files change, it skips them until they are trusted again. If an edit brings no hook reminder, the agent says so and runs the checks itself. The `PreToolUse` entry is used by Claude Code; in Codex it returns nothing. [Codex hook trust](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)

After updating the plugin, refresh Codex and call the tool in a new task. If the connection still fails, inspect app startup logs and retry after a restart.

</details>

<details>
<summary>Claude Code: MCP launch and hooks</summary>

The Claude Code manifest (`.claude-plugin/plugin.json`) starts the MCP server with `node` directly; set `STATA_PATH` if live help should use a specific Stata executable. The hooks detect maintained `.do` changes made with `Edit`, `Write`, and `MultiEdit`, and `.do` files rewritten by `Bash` or `PowerShell` commands (by comparing modification times before and after). Hook state is kept in the plugin data directory. [Claude Code plugins](https://code.claude.com/docs/en/plugins)

</details>

**Stata:** running analyses and live help use your own Stata installation (developed with Stata 18). No particular Stata integration is required: the agent uses whatever route is available, such as an existing runner, Stata batch mode, or official Python integration. With no route at all, it can still write and review code and will say what it could not run. Installation and the MCP launcher are checked on Windows; macOS is not verified yet.

## See the difference

Same task, two fresh AI sessions, one with Guard and one without: load `nlsw88`, fit two robust OLS specifications for three outcomes, and export a regression table per outcome with coefficients, SEs, N, R², and the outcome mean. The task also asked for a codebook, histograms, and saved estimates. Here are both complete scripts.

### [Without Guard](examples/independent-workflow/before.do): every cell placed by hand (75 lines)

```stata
version 18.0
clear all
set more off
args output_dir
cd "`output_dir'"

* Keep one complete, positive-wage and positive-hours sample for every model.
sysuse nlsw88, clear
count
local n_original = r(N)
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) ///
    & wage > 0 & hours > 0
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
order wage ln_wage hours age grade ttl_exp tenure union
count
local n_analysis = r(N)
display as text "Original observations: `n_original'"
display as text "Common analysis observations: `n_analysis'"
assert !missing(wage, ln_wage, hours, age, grade, ttl_exp, tenure, union)
isid idcode
summarize wage ln_wage hours age grade ttl_exp tenure union
save "nlsw88_analysis.dta", replace

* Record the derived variable and the input fields used to construct the sample.
putexcel set "codebook.xlsx", replace
putexcel A1=("Variable") B1=("Definition") C1=("Source") D1=("Unit") E1=("Missing-value treatment")
putexcel A2=("wage") B2=("Hourly wage") C2=("Stata nlsw88.wage") D2=("US dollars per hour") E2=("Required observed and >0")
putexcel A3=("ln_wage") B3=("Natural logarithm of wage") C3=("Generated as ln(wage) from nlsw88.wage") D3=("log US dollars per hour") E3=("Computed only after complete-case selection and wage>0; no missing values remain")
putexcel A4=("hours") B4=("Hours worked per week") C4=("Stata nlsw88.hours") D4=("hours per week") E4=("Required observed and >0")
putexcel A5=("age") B5=("Respondent age") C5=("Stata nlsw88.age") D5=("years") E5=("Required observed")
putexcel A6=("grade") B6=("Highest grade completed") C6=("Stata nlsw88.grade") D6=("years of schooling") E6=("Required observed")
putexcel A7=("ttl_exp") B7=("Total work experience") C7=("Stata nlsw88.ttl_exp") D7=("years") E7=("Required observed")
putexcel A8=("tenure") B8=("Job tenure") C8=("Stata nlsw88.tenure") D8=("years") E8=("Required observed")
putexcel A9=("union") B9=("Union membership") C9=("Stata nlsw88.union") D9=("indicator (0/1)") E9=("Required observed")
putexcel A11=("Sample rule") B11=("Complete on all seven source variables, wage>0, hours>0")
putexcel A12=("Original N") B12=(`n_original')
putexcel A13=("Analysis N") B13=(`n_analysis')

foreach outcome in wage ln_wage hours {
    histogram `outcome', percent title("Distribution of `outcome'") ///
        xtitle("`outcome'") ytitle("Percent") name(g_`outcome', replace)
    graph export "`outcome'_distribution.pdf", replace
    graph drop g_`outcome'

    putexcel set "`outcome'_regression.xlsx", replace
    putexcel A1=("Outcome: `outcome'")
    putexcel A2=("Term") B2=("Model 1: age, grade") C2=("Model 2: age, grade, ttl_exp, tenure, union")
    putexcel A3=("Coefficient followed by robust standard error")
    putexcel A4=("age") A5=("Robust SE") A6=("grade") A7=("Robust SE")
    putexcel A8=("ttl_exp") A9=("Robust SE") A10=("tenure") A11=("Robust SE")
    putexcel A12=("union") A13=("Robust SE") A14=("Constant") A15=("Robust SE")
    putexcel A16=("N") A17=("R-squared") A18=("Outcome mean in regression sample")

    regress `outcome' age grade, vce(robust)
    estimates save "`outcome'_m1.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel B4=(_b[age]) B5=(_se[age]) B6=(_b[grade]) B7=(_se[grade])
    putexcel B14=(_b[_cons]) B15=(_se[_cons])
    putexcel B16=(`model_n') B17=(`model_r2') B18=(`outcome_mean')

    regress `outcome' age grade ttl_exp tenure union, vce(robust)
    estimates save "`outcome'_m2.ster", replace
    local model_n = e(N)
    local model_r2 = e(r2)
    quietly summarize `outcome' if e(sample)
    local outcome_mean = r(mean)
    putexcel C4=(_b[age]) C5=(_se[age]) C6=(_b[grade]) C7=(_se[grade])
    putexcel C8=(_b[ttl_exp]) C9=(_se[ttl_exp]) C10=(_b[tenure]) C11=(_se[tenure])
    putexcel C12=(_b[union]) C13=(_se[union]) C14=(_b[_cons]) C15=(_se[_cons])
    putexcel C16=(`model_n') C17=(`model_r2') C18=(`outcome_mean')
}
```

### [With Guard](examples/independent-workflow/after.do): the table Stata already makes (63 lines)

```stata
version 18.0
clear all
set more off
capture log close _all
args output_dir
cd "`output_dir'"
log using "run_details.log", text replace

* The same complete-case sample supports all three outcomes and both OLS specifications.
sysuse nlsw88, clear
describe wage hours age grade ttl_exp tenure union
count
keep if !missing(wage, hours, age, grade, ttl_exp, tenure, union) & wage > 0 & hours > 0
count
generate double ln_wage = ln(wage)
label variable ln_wage "Natural log of hourly wage"
assert !missing(ln_wage)
save "nlsw88_analysis.dta", replace

* Record the derived variable and its original Stata source in a five-column codebook.
putexcel set "codebook.xlsx", sheet("Variables") replace open
putexcel A1 = "varname"
putexcel B1 = "Item"
putexcel C1 = "Item Name"
putexcel D1 = "format / unit"
putexcel E1 = "note"
putexcel A2 = "ln_wage"
putexcel C2 = "Natural logarithm of hourly wage"
putexcel D2 = "Natural log of wage's original hourly monetary unit"
putexcel E2 = "Source: Stata sysuse nlsw88, wage. Generated as ln(wage) after retaining observations with nonmissing wage, hours, age, grade, ttl_exp, tenure and union, wage>0, hours>0. No missing ln_wage remains in the saved analysis data."
putexcel A1:E1, bold font("Malgun Gothic", 11)
putexcel A2:E2, font("Malgun Gothic", 10) txtwrap
putexcel save
* Set readable widths after Stata has written the five codebook fields.
shell python -c "from openpyxl import load_workbook; p='codebook.xlsx'; w=load_workbook(p); s=w.active; s.column_dimensions['A'].width=17; s.column_dimensions['B'].width=12; s.column_dimensions['C'].width=38; s.column_dimensions['D'].width=55; s.column_dimensions['E'].width=95; s.row_dimensions[2].height=62; s.freeze_panes='A2'; w.save(p)"

* Each outcome uses the identical saved sample; its mean is attached to each fitted model.
foreach y in wage ln_wage hours {
    regress `y' age grade, vce(robust)
    quietly summarize `y' if e(sample), meanonly
    local mean_y = r(mean)
    estimates store `y'_short
    estimates save "`y'_short.ster", replace

    regress `y' age grade ttl_exp tenure union, vce(robust)
    assert e(N) == _N
    estimates store `y'_full
    estimates save "`y'_full.ster", replace

    etable, estimates(`y'_short `y'_full) column(estimates) ///
        mstat(N, label("N")) mstat(r2, label("R-squared")) ///
        mstat(mean_y=`mean_y', label("Outcome mean")) ///
        title("`y': OLS with robust standard errors") ///
        note("Common complete-case sample; standard errors in parentheses.") ///
        export("table_`y'.xlsx", replace)

    histogram `y', frequency bins(30) ///
        title("Distribution of `y'") xtitle("`y'") ytitle("Number of observations") ///
        xsize(8) ysize(5)
    graph export "distribution_`y'.pdf", replace
}

log close
```

<sub>Both scripts in full, as published. [Task and run notes](examples/independent-workflow/README.md)</sub>

Add a control to the left version and you renumber rows by hand in two columns. On the right you add it to the `regress` line. The numbers are the same: both picked the same 1,865 observations, and all six pairs of saved estimates matched in coefficients, robust SEs, N, and R² to 15 significant digits.

**It holds at larger scale.** A second run with 3 outcomes × 2 samples × 3 specifications (18 regressions) showed the same pattern: controls listed in each `regress` line instead of numbered macros, Stata's own table exported with `putexcel A3=etable` instead of cell-by-cell writes, and all 18 estimate pairs matching. [Full before](examples/fresh-session-workflow/before.do) · [Full after](examples/fresh-session-workflow/after.do) · [Task and run notes](examples/fresh-session-workflow/README.md)

These are two observed cases, not a guarantee about every generated script.

<details>
<summary>Run the examples yourself</summary>

From the repository root in Stata. Both pairs use Stata's bundled data. The independent-workflow after script also calls `python` with `openpyxl` to set codebook column widths.

```stata
local repo "`c(pwd)'"
foreach d in tmp tmp/independent-before tmp/independent-after tmp/fresh-before tmp/fresh-after {
    capture mkdir "`repo'/`d'"
}
do "`repo'/examples/independent-workflow/before.do" "`repo'/tmp/independent-before"
do "`repo'/examples/independent-workflow/after.do" "`repo'/tmp/independent-after"
do "`repo'/examples/fresh-session-workflow/before.do" "`repo'/tmp/fresh-before"
do "`repo'/examples/fresh-session-workflow/after.do" "`repo'/tmp/fresh-after"
cd "`repo'"
```

Execution was checked with Stata 18. The published scripts differ from the originals only in output-path handling and, for the fresh-session after script, an English codebook; see each example's notes.

</details>

## Every edit comes back as a diff, checked line by line

When the agent edits a `.do` file, a `Stop` hook reads the lines it changed before the reply reaches you. It does not judge your research; it points at code a careful coauthor would not leave behind. Here the agent's first draft of an event-study loop moved the fixed effects into `$main_fe`, wrapped the regression in `quietly`, computed the same stored-estimate name in two loops, kept the estimates only in memory, and left the `///` markers ragged. This is what the hook sent back, unedited except for shortened paths:

```text
Lines to fix in the changed .do files:
- event_study.do lines 6, 10: repeated expression: subinstr("`y'", "wins_", "", 1)
- event_study.do lines 5: quietly hides log output: quietly reghdfe `y' ib2019.year##i.treated, absorb($main_fe) vce(cluster firm)
- event_study.do lines 5: model argument hidden in a global: write it in the command: quietly reghdfe `y' ...
- event_study.do lines 5: estimates kept only in memory: add estimates save after each model: quietly reghdfe `y' ...

The /// markers of these edited commands are not in one column. Run the aligner, which changes only the spaces before ///:
node hooks/stata-align.cjs event_study.do --lines 11-12
```

And this is the final reply: a diff of exactly what changed, its line count, and the ranges the agent reread.

```diff
 global outcomes "roa roe leverage"
-global main_fe "firm year industry#year"
 
 foreach y of global outcomes {
-    quietly reghdfe `y' ib2019.year##i.treated, absorb($main_fe) vce(cluster firm)
-    local name = subinstr("`y'", "wins_", "", 1)
-    estimates store `name'
+    reghdfe `y' ib2019.year##i.treated, absorb(firm year industry#year) vce(cluster firm)
+    estimates save "$ster_dir/event_`y'.ster", replace
+    estimates store `y'
 }
 foreach y of global outcomes {
-    local name = subinstr("`y'", "wins_", "", 1)
-    coefplot `name', keep(2017.year#1.treated 2018.year#1.treated) ///
-        vertical yline(0) ///
+    coefplot `y', keep(2017.year#1.treated 2018.year#1.treated) ///
+        vertical yline(0)                                       ///
         xtitle("Year")
-    graph export "event_`name'.pdf", replace
+    graph export "event_`y'.pdf", replace
 }
```

event_study.do: +6 -8 (net -2)

> 수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다. (event_study.do 1-13행)

Run on the fixed file, the hook returns nothing. Both outputs above come from running the shipped hooks on this short example; the aligner changed only the spaces before `///`. The hook reports only lines edited in the current turn, so old code you did not touch stays quiet.

## How it decides

In software, repeated code is a smell. In a `.do` file, the regression line *is* the research design: its sample, controls, fixed effects, and standard errors. Guard lets the agent fold away what is mechanical and makes it write out what is a decision.

### Fold the mechanical, write out the decisions

| In the code | Guard's default |
| --- | --- |
| A group of outcomes estimated the same way | One named `global` (`$pay`) and one shallow loop |
| Controls, `absorb()` fixed effects, `vce()`, sample conditions | Written out in each command |
| Regression tables | Stata's own `etable`, `esttab`, or `collect` before hand-placed cells |
| Fitted models | Saved as `.ster` and reused for tables and figures |
| An existing workflow | Edited in place, keeping your sample, estimator, and settings |

### A light touch for small edits, full scrutiny for design changes

A relabeled axis and a new estimator do not deserve the same scrutiny. The skill decides how much to read and check from what the request changes.

| Request | What the agent does |
| --- | --- |
| Comment, label, or spacing | Smallest patch; checks only the affected call or output |
| Moving code | Keeps call order, macro scope, and the consumers of stored results |
| A new control, sample rule, or estimator | Names the changed sample, specification, or inference and reads the help for that interface |
| A table or figure fix after estimation | Restores saved estimates and regenerates only the output |
| A whole-file overhaul | Adds an independent peer review |
| A new project layout | Offers layouts drawn from AEA replication packages and lets you choose |

Evidence already in view is reused, and plain `foreach`, `if`, and local-macro syntax needs no lookup.

### Instructions, then checks, then a second reader

| Layer | What runs | What it holds the agent to |
| --- | --- | --- |
| Skill | `SKILL.md` and its references | When to read what, and the authoring rules above |
| Evidence | `get_stata_command_evidence` | Options and stored results from Stata-rendered help, manual entries, and published paper code, not from memory |
| Hooks | `PreToolUse`, `PostToolUse`, `Stop` | Tracks every `.do` edit, flags changed lines, and sends the reply back when the review line or diff is missing |
| Review | `stata-peer-audit` | A separate, read-only reading of the actual files and results; its findings are advice, and you decide what to apply |

The skill tells the agent what to do, the hooks check that it did, and an independent reviewer reads the result. What to keep is always your call.

### What it does not do

- The line checks are pattern rules over Stata's logical lines, not a full parser. Dynamically built commands, `#delimit ;`, Mata, and control flow across files can slip past or trip them.
- Some flags are context-blind by design, such as `quietly`. The agent may keep a flagged line and say why.
- The `Stop` hook confirms that the reply names the ranges it reread. It cannot confirm how well they were read.
- The evidence for better code is the two cases above, not a benchmark across tasks and models.
- Installation is checked on Windows only, and packages go to your usual ado location rather than an isolated environment.

## What it guards

| | What you get |
| --- | --- |
| 🔍 **Edited-region review** | After the final edit, the agent rereads the whole file (300 lines or fewer) or each changed region with 50 lines on either side, plus where the macros and variables used there are defined. It looks for code that already does the same work, such as a new global for what an existing global holds or a second `collapse`, and ends with a line listing the ranges it read. If that line is missing, a `Stop` hook sends it back for one more pass. [Details](plugins/stata-research-guard/README.md#설치와-개발) |
| 🔁 **Line-level checks** | On lines edited in the turn, `hooks/stata-repeats.cjs` flags values computed twice, repeated command runs, retyped or renamed outcome lists, `if` lookups of group membership, `quietly`, fixed effects or clustering moved into globals, models kept for tables or figures without `estimates save`, saved models copied into `e(b)`/`e(V)` matrices, macros named from a loop item, samples chosen inside `use`, `merge m:m`, `keep if _merge == 3`, package probes, and loops or `if` blocks nested too deep. `hooks/stata-align.cjs` lines up `///` markers by changing only the spaces before them. Options that legitimately repeat across commands are left alone. [See it in action](#every-edit-comes-back-as-a-diff-checked-line-by-line) |
| 🏷️ **Named globals, reused throughout (house style)** | Each outcome group gets one `global` named for what it holds (`$employment`, `$pay`, `$financial`), defined once at the top and reused wherever the group is estimated, summarized, plotted, or tabulated, so the name tells you what is inside without scrolling up. The arguments that build the model and the output (controls, `absorb()` fixed effects, `vce()`, sample conditions, `keep()` ranges, axis options) stay written in each command, so reading `reghdfe` or `coefplot` shows the core implementation. Locals are kept for loop iterators, per-iteration values, tempfiles, and saved returned results. This is the author's preference; change it to your taste in the `Globals for outcome groups` and `Keep what a command does inside the command` rules of [general-rules.md](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md) and the matching examples in [SKILL.md](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md) and [code-examples.md](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md). |
| 🧾 **Diffs you can check** | Each reply shows file-by-file before/after diffs for maintained `.do` files. Edits of 200+ changed lines or whole-workflow overhauls state the omission on a `diff 생략:` line and link the changes instead. Each diff carries its `+added -removed (net N)` line count; hooks track the edits so a missing diff or a wrong count gets flagged. |
| 📚 **Guard MCP: real command evidence** | `get_stata_command_evidence` returns Stata-rendered official and maintainer help, expanded Stata 18 manual entries, and original code blocks from published papers, so options and stored results come from the source, not from memory. |
| 🗂️ **Project layouts from AEA replication packages** | When you start or restructure a whole project, the agent offers two or three of four layouts drawn from AEA replication packages (numbered stages, build/analysis, one file per exhibit, nested masters), recommends one, and lets you choose before creating files. |
| 🧑‍🔬 **Independent peer review** | `stata-peer-audit` reads your code and results in a separate, read-only context, like a colleague, and returns concrete file/line findings without editing anything. |
| ♻️ **Results-aware recovery** | When estimation finished but an export failed, the agent restores saved estimates and regenerates only what failed instead of rerunning everything. |

The bundled evidence:

| Resource | Contents |
| --- | --- |
| Command index | Names, families, stages, and roles for 115 commands |
| Command help | 118 Stata-rendered official and maintainer help topics, including 5 base topics; 2 unavailable |
| Live exact help | Topics not bundled, or explicitly requested installed help, from your own Stata |
| Expanded documentation | 69 official Stata 18 PDF entries and 1 author supplement |
| Paper examples | 166 original code blocks with selected-command context |
| Raw logs/artifacts | 12 directly attached original run logs or artifact records |

Original paper material and attribution are preserved. Separately marked `editorial_adaptation` examples cover a few concrete transport errors; read their changes and assumptions before applying one. Reuse is subject to the [third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md).

## Try it

Open your project and call a skill.

**Continue an analysis**

```text
$stata-replication-workflow
Read this project's regression.do and connected data, then continue the analysis.
Keep the current sample, estimator, fixed effects, and standard-error settings.
Run it and inspect the sample size and regression table.
```

**Reproduce a paper's main table**

```text
$stata-replication-workflow
Find the main regression table and event-study figure in this paper's replication package.
Trace the raw data, sample, estimation, and output, then reproduce the original specification.
Compare the paper's reported values with the actual run and flag anything blocked by data or package versions.
```

**Get a second opinion on old code**

```text
$stata-peer-audit
Read this older analysis.do, its connected code, and available logs, tables, and figures.
Identify changes that would make the sample, specifications, saved results, and output
easier to follow. Give file/line findings and keep the review read-only.
```

<details>
<summary>More requests: raw data to tables, failed exports</summary>

```text
$stata-replication-workflow
Read the raw-data folder and project README, then continue the analysis.
Check merge keys and observation units before building the analysis panel.
Estimate the sample, regression specifications, and standard errors in the README.
Save estimates as .ster, regression tables as Excel, and figures as PDF.
Make the code traceable from data to tables and figures, and inspect the actual results.
```

```text
$stata-replication-workflow
The run stopped while saving results after the regressions.
Read the code, log, and saved .ster files to distinguish completed estimates
from failed output. Reuse valid saved estimates and repair only the failed
tables and figures, then inspect what was actually saved.
```

</details>

<details>
<summary>Call the MCP tool directly</summary>

Call `get_stata_command_evidence` with the commands you need; add `"include_paper_catalog":true` for paper examples.

```json
{"request":"Read the relevant regression syntax","selected_commands":["regress"]}
```

See the [command evidence guide](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) for long-help sections, installed-version lookup, and attached paper code and logs.

</details>

<details>
<summary>Execution environment and package installation</summary>

Installing and enabling this plugin means you agree that supported user-written commands and required dependencies may be downloaded when needed from SSC or an official maintainer source and installed in your primary Stata environment's usual shared ado location. Any scope limits you set take precedence. The plugin does not preinstall every command or create an isolated ado environment, and it does not repeatedly ask about installations within this scope. This does not disable Codex's or Claude Code's own approval controls.

For research tables, the agent chooses a documented table/export interface that fits the requested output and preserves the results and inference, and uses its supported features before assembling coefficient and standard-error rows by hand. A missing installation alone is not a reason to change estimation or inference.

`CODEX_MCP_NODE_PATH` can specify the Node executable and `STATA_PATH` the Stata executable for live help.

</details>

## Documentation

| Goal | Read |
| --- | --- |
| Start or revise an analysis | [Research workflow](plugins/stata-research-guard/skills/stata-replication-workflow/SKILL.md) |
| Code structure and authoring principles | [General rules](plugins/stata-research-guard/skills/stata-replication-workflow/references/general-rules.md) |
| Short authoring comparisons | [Code examples](plugins/stata-research-guard/skills/stata-replication-workflow/references/code-examples.md) |
| Lay out a new project | [Project workflow patterns](plugins/stata-research-guard/skills/stata-replication-workflow/references/project-workflows.md) |
| Follow a paper's full analysis | [Paper workflow reading](plugins/stata-research-guard/skills/stata-replication-workflow/references/paper-workflow-reading.md) |
| Run Stata and inspect outputs | [Execution and results](plugins/stata-research-guard/skills/stata-replication-workflow/references/execution-and-results.md) |
| MCP options and reuse of original material | [Command evidence](plugins/stata-research-guard/skills/stata-replication-workflow/references/command-evidence.md) |
| Ask for a colleague's review | [Peer audit](plugins/stata-research-guard/skills/stata-peer-audit/SKILL.md) |
| Attribution and use conditions | [Third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md) |
| What changed | [Changelog](plugins/stata-research-guard/CHANGELOG.md) |

## Contributing

Help is welcome, especially on **macOS**: documenting Mac Stata paths, the MCP startup script, and installation steps, then testing them on a real Mac. Reproducible bug reports, documentation fixes, and research examples are welcome too. Open an [issue](https://github.com/Plokies-2/stata-research-guard/issues) or a [pull request](https://github.com/Plokies-2/stata-research-guard/pulls).

<details>
<summary>Development checks</summary>

From the repository root:

```powershell
cd plugins/stata-research-guard
node --test tests/*.test.cjs
node scripts/verify_plugin_bundle.cjs
```

These check tool calls, source delivery, and bundle structure. They do not run Stata or score research tables; judge readability and validity by reading actual code, logs, tables, and figures.

</details>

## License

The original plugin software is [MIT](LICENSE). Bundled paper excerpts, Stata documentation, maintainer help, and other third-party material keep their own terms, including any noncommercial restrictions; see the [third-party notices](plugins/stata-research-guard/THIRD_PARTY_NOTICES.md).
