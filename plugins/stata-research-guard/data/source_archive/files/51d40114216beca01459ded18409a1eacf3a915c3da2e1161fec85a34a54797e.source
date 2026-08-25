local event_terms "pre_term_2 pre_term_1 post_term_1 post_term_2"
local event_order "pre_term_2 pre_term_1 . post_term_1 post_term_2"
local event_xlabels `"1 "Pre 2" 2 "Pre 1" 3 "Reference" 4 "Post 1" 5 "Post 2""'
local reference_position 3
local policy_line = `reference_position' + 0.5

estimates clear
estimates use "$ster/sample_a/outcome_spec.ster"
estimates store plot_sample_a
estimates use "$ster/sample_b/outcome_spec.ster"
estimates store plot_sample_b

coefplot ///
    (plot_sample_a, label("Sample A")) ///
    (plot_sample_b, label("Sample B")), ///
    keep(`event_terms') order(`event_order') xlabel(`event_xlabels') ///
    vertical levels(95) ///
    addplot(scatteri 0 `reference_position', msymbol(O) mcolor(black)) ///
    yline(0, lcolor(gs8)) xline(`policy_line', lpattern(dash)) ///
    xtitle("Year") ytitle("Coefficient (95% CI)") ///
    title("outcome") ///
    legend(position(6) rows(1)) ///
    graphregion(color(white)) plotregion(color(white)) ///
    saving("$figures/outcome_event.gph", replace)
graph export "$figures/outcome_event.pdf", replace
