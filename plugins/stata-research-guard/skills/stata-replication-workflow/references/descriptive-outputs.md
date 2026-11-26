# Descriptive Figures and Tables

Read this reference when writing or revising descriptive figures or tables: trends, group means, shares, distributions and baseline statistics. The shared rules in [general-rules.md](general-rules.md) still apply (outcome-group globals, options written in each command, no `quietly`, `///` alignment); this file adds what is specific to descriptive output. The examples use Stata's `nlsw88` data and illustrate structure, not any project's variables or styling.

## Build the plotted data next to the figure

- Prepare what a figure plots immediately before it, inside `preserve` and `restore`: one `collapse` with the statistics and groups the figure needs, then the graph and its export. Save the collapsed data only when another step reads it.
- Let the graph command compute the statistic when it can. `graph bar (mean) wage, over(collgrad) over(race)` averages by group without a `collapse`.
- For one series per group, `separate wage, by(collgrad)` creates `wage0` and `wage1` with labels that name the group; plot them as separate layers.

## Figures that differ only by a group

- Draw figures that share everything but one group condition from one loop over that group, with the command written once. Do not copy the block per group.
- When the panels read well side by side, draw one figure with `by(group)` instead of separate files.
- Do not branch inside the loop to change options for one group. A figure whose series, labels or researcher-chosen axis range really differ gets its own block.

## Write the graph command so it reads as a figure

- Put one plot layer per line, then the options grouped by role: axis titles and labels, legend, then size. Indent continuation lines by four spaces and align `///` with the aligner described in the general rules.
- Use full option names, and the same ones throughout the file: `lcolor`, `lpattern`, `msymbol`, `msize`, not a mix with `lcol`, `lp`, `ms`.
- Set the scheme and fonts once at the top of the do-file. Do not switch schemes between figures and back. Restate an option only to change what the scheme gives.
- Let Stata choose axis labels with `ylabel(#5)` or write the values (`ylabel(0(0.1)0.4)`); do not compute tick steps by hand. When figures must share a range, compute the range once and pass it with `yscale(range())`.
- Write legend labels in the command, `legend(order(1 "No college degree" 2 "College degree"))`, or take them from value labels. Keep titles and notes to what the reader needs (see the general rules).
- Export right after drawing, to a file named for what the figure shows, under the project's output global.

## Descriptive tables

- Use the statistics and formats a table command offers (`table`, `dtable`, `tabstat`, or `estpost` with `estout`) instead of assembling rows by hand. Prefer a format option per statistic or per variable over a long positional list of formats.
- List table variables from the outcome-group globals in table order; when the table interleaves members of several groups, write that order once in its own global and say why.

## Example: two figures that differ only by marital status

**Harder to follow:** each figure is a pasted copy, option names switch between short and long forms, continuation lines wander, and the scheme changes midway.

```stata
collapse (mean) wage, by(grade collgrad married)
set scheme s2color
tw (connected wage grade if collgrad == 0 & married == 0, lp(solid) ms(o)) ///
  (connected wage grade if collgrad == 1 & married == 0, lpattern(dash) msymbol(s)), ///
    ytitle("Mean hourly wage") ylabel(0(5)15) legend(lab(1 "No college degree") lab(2 "College degree"))
graph export "wage_single.pdf", replace
tw (connected wage grade if collgrad == 0 & married == 1, lp(solid) ms(o)) ///
 (connected wage grade if collgrad == 1 & married == 1, lpattern(dash) msymbol(s)), ///
   ytitle("Mean hourly wage") ylabel(0(5)15) legend(lab(1 "No college degree") lab(2 "College degree"))
graph export "wage_married.pdf", replace
set scheme stcolor
```

**Easier to follow:** the plotted data are built in one place, the command is written once, and the loop names what differs.

```stata
preserve
collapse (mean) wage, by(grade collgrad married)
separate wage, by(collgrad)
foreach m in 0 1 {
    twoway (connected wage0 grade if married == `m', lpattern(solid) msymbol(circle))  ///
           (connected wage1 grade if married == `m', lpattern(dash)  msymbol(square)), ///
        xtitle("Years of schooling") ytitle("Mean hourly wage")                        ///
        ylabel(#5) legend(order(1 "No college degree" 2 "College degree") position(6) rows(1))
    graph export "$figures/wage_by_degree_married`m'.pdf", replace
}
restore
```

The same comparison as one file with panels: `twoway connected wage grade, by(married, rows(1) note(""))` after a `collapse` by `grade` and `married`. Both versions and the panel figure were run in Stata on `sysuse nlsw88` (after `preserve`, with `$figures` set to an output folder).
