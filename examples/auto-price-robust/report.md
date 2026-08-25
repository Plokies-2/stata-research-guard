# Template and fallback record

| mode | target | lines | checkpoint | label_id | reason |
| --- | --- | --- | --- | --- | --- |
| template | price_models.do | 15-15 | estimation.conventional | estimation.ols_explicit_vce.v1 | Compatible general OLS block; bound the declared outcome, covariates, and robust VCE. |
| general_rule_fallback | price_models.do | 17-18 | descriptives.sample_mean | - | nearest_template_hint=descriptives.depvar_mean_esample.v1; fallback_trigger=no_suitable_template; hint_used=e(sample) summarize idiom. |
| general_rule_fallback | price_models.do | 19-19 | final_excel_assembly | - | nearest_template_hint=export.regression_excel.single_outcome_direct.v1; fallback_trigger=no_suitable_template; hint_used=raw outreg2 row contract. |
| template | price_models.do | 22-22 | estimation.conventional | estimation.ols_explicit_vce.v1 | Compatible general OLS block; bound the declared outcome, covariates, and robust VCE. |
| general_rule_fallback | price_models.do | 24-25 | descriptives.sample_mean | - | nearest_template_hint=descriptives.depvar_mean_esample.v1; fallback_trigger=no_suitable_template; hint_used=e(sample) summarize idiom. |
| general_rule_fallback | price_models.do | 26-26 | final_excel_assembly | - | nearest_template_hint=export.regression_excel.single_outcome_direct.v1; fallback_trigger=no_suitable_template; hint_used=raw outreg2 row contract. |
| template | price_models.do | 29-29 | estimation.conventional | estimation.ols_explicit_vce.v1 | Compatible general OLS block; bound the declared outcome, covariates, and robust VCE. |
| general_rule_fallback | price_models.do | 31-32 | descriptives.sample_mean | - | nearest_template_hint=descriptives.depvar_mean_esample.v1; fallback_trigger=no_suitable_template; hint_used=e(sample) summarize idiom. |
| general_rule_fallback | price_models.do | 33-33 | final_excel_assembly | - | nearest_template_hint=export.regression_excel.single_outcome_direct.v1; fallback_trigger=no_suitable_template; hint_used=raw outreg2 row contract. |
| template | price_models.do | 36-36 | estimation.conventional | estimation.ols_explicit_vce.v1 | Compatible general OLS block; bound the declared outcome, covariates, and robust VCE. |
| general_rule_fallback | price_models.do | 38-39 | descriptives.sample_mean | - | nearest_template_hint=descriptives.depvar_mean_esample.v1; fallback_trigger=no_suitable_template; hint_used=e(sample) summarize idiom. |
| general_rule_fallback | price_models.do | 40-40 | final_excel_assembly | - | nearest_template_hint=export.regression_excel.single_outcome_direct.v1; fallback_trigger=no_suitable_template; hint_used=raw outreg2 row contract. |
