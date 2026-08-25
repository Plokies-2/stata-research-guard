local components "component_a component_b component_c"
local z_components
local analysis_sample "eligible == 1"

tempvar component_rowmiss
egen `component_rowmiss' = rowmiss(`components')
assert `component_rowmiss' == 0 if `analysis_sample'

foreach v of local components {
    quietly summarize `v' if `analysis_sample', meanonly
    assert r(N) > 1
    assert r(sd) > 0
    gen z_`v' = (`v' - r(mean)) / r(sd) if `analysis_sample'
    local z_components `z_components' z_`v'
}

egen component_index = rowmean(`z_components') if `analysis_sample'
