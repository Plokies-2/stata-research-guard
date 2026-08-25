* Internal canonical source snapshot. Each labeled span is a complete axis-group loop.
*
* Bind the event display once, before either loop. `event_terms' contains the
* raw e(b) event tokens, including estimator-created actual omissions; it
* excludes only the design reference. `event_order' is the same calendar order
* with exactly one literal . slot where that design reference belongs. `event_xlabels' supplies
* one explicit display label for every slot, including the reference. The
* reference marker and policy boundary are derived from that blank slot, rather
* than from a hard-coded coefficient count or row order.
local event_terms "pre_term_2 pre_term_1 post_term_1 post_term_2"
local event_order "pre_term_2 pre_term_1 . post_term_1 post_term_2"
local event_xlabels `"1 "Pre 2" 2 "Pre 1" 3 "Reference" 4 "Post 1" 5 "Post 2""'
local reference_position 3
local policy_line = `reference_position' + 0.5

* Outcomes that keep Stata's automatic y-axis
local automatic_outcomes "outcome_a outcome_b"
foreach outcome of local automatic_outcomes {
    estimates clear
    estimates use "$ster/sample_a/`outcome'_spec.ster"
    estimates store plot_sample_a
    estimates use "$ster/sample_b/`outcome'_spec.ster"
    estimates store plot_sample_b

    coefplot ///
        (plot_sample_a, label("Sample A")) ///
        (plot_sample_b, label("Sample B")), ///
        keep(`event_terms') order(`event_order') xlabel(`event_xlabels') ///
        vertical levels(95) ///
        addplot(scatteri 0 `reference_position', msymbol(O) mcolor(black)) ///
        yline(0, lcolor(gs8)) xline(`policy_line', lpattern(dash)) ///
        xtitle("Year") ytitle("Coefficient (95% CI)") ///
        title("`outcome'") ///
        legend(position(6) rows(1)) ///
        graphregion(color(white)) plotregion(color(white)) ///
        saving("$figures/`outcome'_event.gph", replace)
    graph export "$figures/`outcome'_event.pdf", replace
}

* A separately evidenced group of closely comparable outcomes
local fixed_outcomes "close_outcome_a close_outcome_b"
local axis_min  -0.10
local axis_max   0.10
local axis_step  0.05
foreach outcome of local fixed_outcomes {
    estimates clear
    estimates use "$ster/sample_a/`outcome'_spec.ster"
    estimates store plot_sample_a
    estimates use "$ster/sample_b/`outcome'_spec.ster"
    estimates store plot_sample_b

    coefplot ///
        (plot_sample_a, label("Sample A")) ///
        (plot_sample_b, label("Sample B")), ///
        keep(`event_terms') order(`event_order') xlabel(`event_xlabels') ///
        vertical levels(95) ///
        addplot(scatteri 0 `reference_position', msymbol(O) mcolor(black)) ///
        yline(0, lcolor(gs8)) xline(`policy_line', lpattern(dash)) ///
        yscale(range(`axis_min' `axis_max') noextend) ///
        ylabel(`axis_min'(`axis_step')`axis_max') ///
        xtitle("Year") ytitle("Coefficient (95% CI)") ///
        title("`outcome'") ///
        legend(position(6) rows(1)) ///
        graphregion(color(white)) plotregion(color(white)) ///
        saving("$figures/`outcome'_event.gph", replace)
    graph export "$figures/`outcome'_event.pdf", replace
}
