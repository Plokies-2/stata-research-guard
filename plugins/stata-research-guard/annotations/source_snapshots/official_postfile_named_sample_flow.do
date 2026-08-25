* Mechanics-only sample-flow scaffold derived from StataCorp's postfile manual.
* Repeat the checkpoint row only for sample transitions declared by the study.
tempname sample_flow
postfile `sample_flow' str40 checkpoint long n using "$data/sample_flow.dta", replace

post `sample_flow' ("raw_load") (_N)
post `sample_flow' ("analysis_sample") (_N)

postclose `sample_flow'
