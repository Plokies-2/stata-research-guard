# Top 100 Stata command coverage: research basis

## Scope and ranking claim

The requirements schema is version 2. The ranked Top 100 contains 100 command groups and 381 material variants. Its first 50 groups/203 variants are a frozen prefix; 15 supplemental groups add 48 variants, for 429 contracts in total. The priority list is an editorial coverage ranking, not a claim of universal command-frequency telemetry. Its public rank research is recorded in `review/top100_rank_research_appendix.md` (SHA-256 `e00129788bf0d7655e8b2760709a0dd06f630054ed2024bdedf6f59f49ed639b`).

Rank research uses official Stata documentation and maintainer documentation as mechanics evidence, plus deposited economics packages as a separate usage-support source. The public method context is the [AEA Data Editor package-analysis project](https://aeadataeditor.github.io/projects/project4) and the documented recursive `.do` token scan in [Statapackagesearch](https://labordynamicsinstitute.github.io/Statapackagesearch/). These methods support reproducible discovery but do not measure execution, distinguish every command facet, or establish that a call completed successfully. Token matches may be false positives and package presence is not a command-call count. They therefore never determine a template score or a generation decision.

## Sources and sufficiency

Official Stata manuals are primary mechanics sources, including the [Base Reference Manual](https://www.stata.com/manuals/r.pdf), [User's Guide](https://www.stata.com/manuals/u.pdf), and command-specific manuals linked in the source matrices. Maintainer sources are used only for their own packages' syntax and state contracts, for example [reghdfe](https://scorreia.com/help/reghdfe.html), [ivreg2](https://ideas.repec.org/c/boc/bocode/s425401.html), and [coefplot](https://github.com/benjann/coefplot). The source matrices for ranks 51–74, 75–94, and 95–100 preserve the individual primary URLs and source hashes.

The contract uses complexity-weighted sufficiency, not a fixed quota per command. One bounded guide atom is sufficient only for a simple command state. Multiple atoms are required when a material input/declaration state, command grammar/subcommand, estimator or inference choice, weight/exposure/offset/support, or output/persistence handoff changes. Cosmetic spelling, abbreviation, variable-name, and formatting differences are not material variants.

The package registry remains a different object: 43 families and 109 canonical anchors. The separate Top 100 coverage map has 100 groups and 208 source elements (201 mappings and seven explicit language/operator exemptions). Neither registry nor map is a universal usage denominator.

## Two evidence layers and promotion boundary

Guide mechanics and research usage do not compete on a score. When the exact command contract and facet, together with any declared machine-readable Stata compatibility boundary, leave one guide mechanic, the resolver returns it as a non-writable companion. Free-text manual-edition notes remain provenance rather than runtime-version gates. If material guide ambiguity remains, the resolver returns no code and `selection_required`. Independently deposited paper occurrences are separate support evidence; they never become guide authority or generation authority.

The completed guide promotion audit contains 440 records: 262 historical and 178 newly audited Top 51–100 atoms. All are `reference_only`, all have `auto_selectable=false`, and runtime/selector status is `not_run`. The new batch proceeded from 179 pre-audit candidates through 154 pass and 25 revision records, repaired to 178, then passed a final independent re-audit 178/178 as `pass_reference_only`. Generated indexes contain 442 guide cards and 166 research-usage examples, all with auto-selection disabled. The 46 legacy implicit autos are now reference-only.

An audited template can be promoted only after source/hash/state checks plus an isolated runtime pass, a selector-positive case, and a sibling-negative selector case. The new Top 51–100 guides have source/static audit evidence, not runtime validation. Runtime success, static/source audit, and substantive validity remain separate statuses.

## Paper-occurrence support and corpus denominators

The normal `build_evidence_layers.py` build reads the schema-2 `annotations/corpus_usage_occurrences.jsonl` ledger. Its 132 audited occurrence rows contain 38 `pass_reference_only`, 13 follow-up, and 81 rejected rows, with 21 exact-contract proposals. The generated usage layer adds only the 38 pass-reference-only rows to the historical 128 examples, which include 19 AEA/openICPSR exact-support rows; nine historical AEA candidates remain rejected audit accounting only. All occurrence rows are `reference_only`, `promotion_prohibited=true`, `auto_selectable=false`, and retain provenance instead of raw paper code.

Do not combine corpus denominators. The corpus has 35 deposited packages; the catalog filter identifies 636 author `.do` files, while package-review accounting covers 639 `.do` files, 183,794 reviewed lines, and 2,875 line-addressable chunks. The reference builder's separate derived index has 2,428 chunks, of which 829 are approved. The dictionary has 588 labeled checkpoints across 72 checkpoints (497 reference-only); this is neither a corpus-file count nor a runtime count.

The Top100 data products are auditable but intentionally conservative: 442 guide cards and 166 usage examples are all non-auto-selectable, and source evidence does not establish successful execution or substantive suitability. See `corpus_usage_extraction_report.md` for ledger hashes and `command_template_coverage.md` for contract coverage.
