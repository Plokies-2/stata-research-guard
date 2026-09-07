# Conditional illustration: a three-round migration moment

Original research: Costas Meghir, A. Mushfiq Mobarak, Corina Mommaerts and Melanie Morten, *Migration and Informal Insurance: Evidence from a Randomized Controlled Trial and a Structural Model*. [Replication record](https://doi.org/10.5281/zenodo.4602567), `Replication_files/2_structural_get_weighting_matrix.do:89–104`. Original material is available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [third-party notices](../../THIRD_PARTY_NOTICES.md).

This illustration was prepared by Stata Research Guard on 2026-09-07. It is not the authors' code or an endorsed correction to their results.

The original calls `summarize` and then appends `_b[_cons]`, which still belongs to the preceding round-4 regression. Its MATLAB consumer (`computeMoments_2020_4_15.m:20`) uses an equally weighted average over three control-group round means. If that is the intended data moment, preserve each round's control mean and average those three values explicitly:

```stata
reg migrant_r treat if round == 2
local control_rate_r2 = _b[_cons]
matrix `ests' = (_b[_cons], _b[treat])
local mat_lab `mat_lab' mig_r2_c mig_r2_te

reg migrant_r treat if round == 3
local control_rate_r3 = _b[_cons]
matrix `ests' = (`ests', _b[_cons], _b[treat])
local mat_lab `mat_lab' mig_r3_c mig_r3_te

reg migrant_r treat if round == 4
local control_rate_r4 = _b[_cons]
matrix `ests' = (`ests', _b[_cons], _b[treat])
local mat_lab `mat_lab' mig_r4_c mig_r4_te

matrix `ests' = (`ests', (`control_rate_r2' + `control_rate_r3' + `control_rate_r4') / 3)
local mat_lab `mat_lab' mig_r234_c
```

This fragment belongs inside the original moment program, with its existing sample and matrix handle. It assumes a binary treatment with control coded zero and equal weight for the three rounds. A pooled observation-weighted mean is a different statistic when sample sizes vary across rounds. Confirm the intended data moment before using this change in research; the original paper was not rerun and its estimated structural parameters have not been assessed here.
