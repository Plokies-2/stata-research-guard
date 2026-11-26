# After Editing a Maintained .do File

Read this reference after the final edit to maintained `.do` files and before the final reply. The Stop hook checks what it can read mechanically (repeated code, group membership looked up with `if`, `quietly`, model arguments in globals, `merge m:m`, `keep if _merge == 3`, installation probes, conditions inside variable-list globals, a third nested loop, an `if` block inside another, models kept for output without `estimates save`, macros named from a loop item, `e(b)`/`e(V)` copied into matrices, `use ... if ... using`, unaligned `///`, the review line, the diffs and their line counts) and names the lines; the review below covers what text matching cannot see.

## Review the edited region

After the final edit to maintained `.do` files, locate each changed region in the actual diff. Read the whole file when it has 300 lines or fewer; otherwise read each changed region and the 50 lines before and after it, clipped at file boundaries, and merge overlapping ranges. For a deletion, inspect the surviving context, or the before version if the whole file was removed. Then find and read where the globals, locals, variables, and saved files used in the changed region are defined, even when the definition is far above or in another do-file; a new macro or variable that duplicates an existing one is usually visible only there.

- Review every changed operation by its purpose, inputs, effects, and consumers. Ask whether existing code already does the work, an existing command can do it through its default or a supported option, the needed choice or value is already known and can be written directly, or an existing macro, variable, or saved dataset already holds what the new code builds.
- Look for overlapping responsibilities through the affected flow, from inputs to saved and displayed outputs. Follow directly connected producers and consumers outside the nearby lines when needed. Work can be redundant even when it uses different syntax, is split across commands or files, or sits before or after an existing step.
- Name the concrete step that could be removed or reused and check that removing it preserves the required behavior: inputs, sample, group definitions, weights, missing values, execution order, state, side effects, and outputs. Separate operations are justified when they produce distinct required results, apply real conditions, or protect a meaningful invariant.
- Scan the changed files for two common misses: a literal that repeats an existing global or local (a path, varlist or value), and a variable in a `keep`, `drop`, `if` or `missing()` condition that no later code uses, which shrinks the sample for nothing. Use the macro; drop the condition unless the restriction is a stated research choice.
- Run `node hooks/stata-repeats.cjs <changed .do files>` from the plugin root (the Stop hook runs it where hooks are enabled). Define each listed repeat once and reuse it, or say in the final reply why the copies differ. It compares text only, so the checks above still cover repeats in different syntax.
- Align the `///` markers of each edited command in one column with `node hooks/stata-align.cjs <file.do> --lines <edited ranges>`; the Stop hook names the command when an edited block is not aligned.
- Fix duplicates within the requested scope and reread the affected ranges. Report what changed or any duplicate that remains. If a range cannot be read, report the range and reason instead of claiming completion.

Most dirty code comes from two habits: an `if` where a plain list would do, and a hand-written step where existing code, data, or a Stata command already does the work. The groups below illustrate them; they are not a checklist, so react to any redundancy of the same kind. Simple does not mean few characters: a block that shows its specification in each command is simpler than a short one that hides it behind macros. An outcome-group global like `$financial` reveals its members; macros for model or output arguments (`` `spec'_rhs ``, `$main_fe`, `$event_axes`) hide what the command does. Keeping an edit minimal limits its scope; it does not mean keeping duplicated logic inside the flow you are changing.

```stata
* A. Rebuilding what already exists
global financial2 "$financial sales"                    // add the outcome to $financial where it is defined
cap mkdir "$root/data/final"                            // $final already names it: cap mkdir "$final"
collapse (mean) `careers', by(bmo_rule female)
collapse (mean) `careers', by(female)                   // graph bar (mean) ..., over(female) already averages
gen byte cert_list = year >= list_start if !missing(cert)   // rename the column in the saved data and load it
use "panel_v2.dta", clear                               // each do-file reads its own variant; use one combined panel
summarize roa roe tobin_q                               // the group already has a name: summarize $financial

* B. Branching where a list or a block would do
foreach v of varlist ln_* {
    if strpos("`v'", "emp") | strpos("`v'", "pay") local use wins_`v'
}                                                       // global employment wins_ln_emp_num ...; foreach v of global employment
foreach y in out_share ev_share {
    if "`y'" == "out_share" { ... }                     // different inputs and denominators: one block each
}
foreach spec of local specs {
    reghdfe `y' ``spec'_rhs' if ``spec'_sample', absorb(``spec'_fe')
}                                                       // unroll so each block shows sample, treatment, controls, output
if `a' { if `b' { if `c' { ... } } }                    // keep nesting shallow; split by stage

* C. Machinery nobody needs
set varabbrev off                                       // drop settings that do not change the result
quietly estpost summarize $financial                    // never quietly: let the output reach the log
keep if !missing(ln_wage, age, collgrad)                // collgrad is never used later: it only drops observations
gen double a = x * w
gen double b = a / total                                // gen double share = 100 * x * w / total
* Generate share variable                               // comments that repeat the code; keep comments that explain a choice
* Read the v3 datasets for week26                       // internal labels a new reader cannot know: describe the data itself
* Minimum axis ranges and fixed ticks                   // no comments on cosmetic settings
graph export "fig_unused.pdf"                           // outputs the canonical paper no longer uses: delete their code

* D. Mixing stages
foreach y of global financial {
    reghdfe `y' treat, absorb(firm year) vce(cluster firm)
    outreg2 using tmp.txt, replace                      // save .ster here; tables and figures read it with estimates use
}

* E. Doing by hand what Stata does
foreach v of global pay {
    preserve
    collapse (mean) `v', by(group)
    restore
}                                                       // one collapse (mean) $pay, by(group)
forvalues g = 1/50 {
    summarize y if group == `g', meanonly
    replace group_mean = r(mean) if group == `g'
}                                                       // bysort group: egen double group_mean = mean(y)
gen byte region = 0
replace region = 1 if inlist(state, 1, 2, 3)            // recode state (1/3 = 1) (4/5 = 2) (else = 0), gen(region)
merge m:1 id using "firm.dta"
keep if _merge == 3                                     // merge m:1 id using "firm.dta", assert(match master) keep(match)
local step = 10^floor(log10(`span' / 4))               // hand-built tick spacing: yscale(range(`lo' `hi')) ylabel(#5) picks nice values
capture drop x                                          // use capture only where failure is expected; let errors stop the run
merge m:m id using "x.dta"                              // fix the key or use joinby
use id year roa if sample == 1 using "panel.dta", clear // use "panel.dta", clear, then keep if sample == 1 and keep id year roa
matrix main_b = e(b)                                    // estimates use "`y'.ster", number(1), then estimates store main

* F. Outcome groups without one memorable global, and specifications moved out of the command
local event_axis_vars_emp_n "emp_num_m emp_num_f"      // a figure-only name for part of $employment: use $employment
local outcomes1 "roa roe tobin_q"                       // numbered names hide members: global financial roa roe tobin_q
local y_list "$financial"                               // a second name for a global: use $financial itself
global main_fe "firm year industry#year"
reghdfe `y' treat, absorb($main_fe) vce(cluster firm)    // the reader must see the FE here: absorb(firm year industry#year)
global event_axes "xlabel(1 "2015" 2 "2016") xscale(range(.5 2.5))"
coefplot m_`y', keep($event_coefficients) $event_axes   // write keep(...) and the axis options in the coefplot command
local base = subinstr("`y'", "wins_", "", 1)            // computed again in each later loop: compute once per outcome and reuse
estimates store m_`y'                                   // after fitting: estimates save "$ster_dir/`y'.ster"; the figure reads it with estimates use
local fig_`y' = subinstr("`y'", "wins_", "", 1)       // a lookup name per outcome: export "figure/main/`y'.pdf"
local min_`y' = r(min)                                  // a macro named from the outcome: compute it where the figure uses it
```

Only after reading the ranges, put this line on its own in the final reply, followed by the ranges you actually read, by file and line: `수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다. (build_analysis_panel.do 260-380행, controls 정의 12-18행)`

## Show the edits in the final reply

For small Stata code changes, include the actual before/after changes in the final reply in a separate fenced `diff` block for each changed `.do` file (`-` removed, `+` added). Include the blocks even when the reply also summarizes the changes or links to the files. Show every changed part with only enough unchanged context to locate it; do not reproduce whole files or invent a before version. Briefly describe the role of any accompanying Python preprocessing or other non-Stata files. Include diffs for those files when the user asks for them.

Under each `.do` diff, or under the `diff 생략:` line, give the file's line count as `file.do: +added -removed (net N)`, for example `BOK.do: +12 -30 (net -18)`. The Stop hook compares it with the counts of the turn's edits where it knows them.

- Count added and deleted lines only in maintained `.do` files changed for the current request. Count a one-line replacement as two lines and omit unchanged context, pre-existing edits, scratch files, and reverted changes.
- Small means fewer than 200 changed `.do` lines with no overhaul of the Stata workflow. Large means 200 or more changed `.do` lines. A rewrite that replaces a workflow usually creates new files, which need no diff. Choose evidence and peer review based on the research question.
- A newly created `.do` file needs no diff; name it and summarize its stages.
- For a large edit (200 or more changed `.do` lines), put a line starting with `diff 생략:` and the reason (for example, `diff 생략: .do 변경 240줄`), summarize the changes and link the affected files or commit. Do not silently omit it or present a few excerpts as the complete diff.
- Describe generated tables, figures, data and logs by their actual updates instead of printing their contents as a text diff. If the before text is unavailable, say so and show only the verified addition or resulting text.
- An explicit user request for a full diff or a different reporting format takes precedence over these defaults.
