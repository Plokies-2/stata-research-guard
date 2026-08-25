# Official-manual fallback policy

The workflow dictionary and all collected approved researcher examples are searched first. The official manual is the fallback for syntax, returned results, and command-state mechanics. It does not supply a researcher-style choice when the corpus has none.

## Three independent questions

1. Is the command valid Stata syntax? Use StataCorp manuals.
2. Does it match the target researcher style? Use only clean selected spans from the collected research-practice code packages.
3. Is it portable and auditable? Use replication-safety checks.

If the dictionary, corpus, and official manual still do not resolve the request, ask the user. Ask immediately when the unresolved point is a substantive estimator, sample, comparison group, control, fixed-effect, clustering, or reporting choice; do not manufacture that choice from a manual example.

Never collapse these questions. `foreach`, `forvalues`, macros, factor variables, `program define`, `_b[]`, `_se[]`, `putexcel`, and `putdocx` can be valid Stata syntax even when a specific use does not match the target research-code style.

## Pass boundary

- `search_stata_manual` supplies evidence, not a pass.
- `lint_do_file` can return `static_clean`, but static clean is not a syntax pass.
- `get_verified_stata_examples` returns only simple official examples that reached a pass marker in a real Stata run with no `r(#)` error.
- When no verified example exists, report `not validated`. Do not infer a pass from similar syntax.

## Local official manuals

The indexed local set covers `regress`, factor variables, `foreach`, `forvalues`, macros, estimates store/save/use, `putexcel`, and `putdocx`. Page-level results preserve the source filename, official URL, page, file hash, and extracted-text hash.

## Official web fallback

If the local official set has no match, browse official StataCorp or Stata Press sources. Core verified URLs include:

- `merge`: https://www.stata.com/manuals/dmerge.pdf
- `isid`: https://www.stata.com/manuals/disid.pdf
- `duplicates`: https://www.stata.com/manuals/dduplicates.pdf
- `assert`: https://www.stata.com/manuals/dassert.pdf
- `save`: https://www.stata.com/manuals/dsave.pdf
- `use`: https://www.stata.com/manuals/duse.pdf
- `label`: https://www.stata.com/manuals/dlabel.pdf
- `xtset`: https://www.stata.com/manuals/xtxtset.pdf
- `summarize`: https://www.stata.com/manuals/rsummarize.pdf
- `tabstat`: https://www.stata.com/manuals/rtabstat.pdf
- `import delimited`: https://www.stata.com/manuals/dimportdelimited.pdf
- `graph export`: https://www.stata.com/manuals/g-2graphexport.pdf
- `suest`: https://www.stata.com/manuals/rsuest.pdf

The official `duplicates` manual confirms that `duplicates drop` retains the first occurrence, but it does not provide a substantive rule for which conflicting record should represent a key. The official `isid` manual checks uniqueness but does not choose or repair records. Therefore neither command can turn adjacency-based first-row retention into a reusable researcher-style block without a user-declared equality, aggregation, or deterministic priority rule.

The official `suest` manual allows stored models fit on the same, overlapping, or different samples and combines their covariance structure. It does not declare that a target comparison should use the intersection of model samples. A common-support comparison therefore still needs a user-declared estimand and sample rule; do not infer one from `suest` syntax.

Community maintainer documentation may define commands such as `reghdfe` and `outreg2`. Mark those results as community authority and never present them as StataCorp commands. Do not add installation or preflight material to the research project.
