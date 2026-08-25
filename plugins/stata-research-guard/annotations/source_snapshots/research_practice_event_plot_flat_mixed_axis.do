* Internal canonical source snapshot. One outcome loop applies a fixed axis only to one evidenced close-outcome group.
*
local event_terms "pre_term_2 pre_term_1 post_term_1 post_term_2"
local event_order "pre_term_2 pre_term_1 . post_term_1 post_term_2"
local event_xlabels `"1 "Pre 2" 2 "Pre 1" 3 "Reference" 4 "Post 1" 5 "Post 2""'
local reference_position 3
local policy_line = `reference_position' + 0.5

local all_outcomes "close_outcome_a close_outcome_b other_outcome_a other_outcome_b"
local fixed_outcomes "close_outcome_a close_outcome_b"
local axis_min  -0.10
local axis_max   0.10
local axis_step  0.05

foreach outcome of local all_outcomes {
    local axis_options ""
    if strpos(" `fixed_outcomes' ", " `outcome' ") {
        local axis_options "yscale(range(`axis_min' `axis_max') noextend) ylabel(`axis_min'(`axis_step')`axis_max')"
    }

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
        `axis_options' ///
        xtitle("Year") ytitle("Coefficient (95% CI)") ///
        title("`outcome'") ///
        legend(position(6) rows(1)) ///
        graphregion(color(white)) plotregion(color(white)) ///
        saving("$figures/`outcome'_event.gph", replace)
    graph export "$figures/`outcome'_event.pdf", replace
}
