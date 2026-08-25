# Quality policy

## Claim boundary

A journal replication deposit shows that a package was supplied under a data and code availability process. It does not establish that every line is portable, safe, elegant, or suitable as a generation template. Describe this tool's result as aligned with practices observed in a reviewed replication corpus. Do not call it journal-certified or journal-approved code.

StataCorp manuals are authoritative for command syntax. The selected clean spans from the collected research-practice code packages are authoritative for the target researcher style and workflow. A style exclusion is therefore recorded as `researcher_style_reference`, not as personal preference and not as a Stata syntax error.

## Evidence tiers

- `gold`: structurally strong packages. Only clean spans without hard flags or noncopyable cautions may be generation references.
- `conditional`: useful recent or partial structure. Only individually labeled spans whose exact source bytes, state contract, input signature, external-evidence rubric, and line-level guards pass may be generation references.
- `reference`: method or workflow context. Explanation only.
- `negative`: known anti-pattern evidence. Never copy.
- `excluded`: vendored code, machine-specific execution, or otherwise unsuitable material. Never copy.

The default generation set is intentionally narrower than the corpus. It contains only labels classified `preferred_candidate` or `conditional_candidate` after the checks above; `reference_only`, `exclude`, vendored ado code, and package-manager trees remain diagnosis or provenance evidence and are never copied automatically. Package identity alone neither admits nor rejects a span.

## Blocking findings

The following findings block a do-file until corrected:

- `merge m:m`
- `duplicates drop ..., force`
- package installation during a do-file run
- active `if 0 {` wrappers around analysis
- direct shell, winexec, Unix, Python, or bang process escapes
- active `erase`, `rm`, or `del` deletion, except the canonical formatter's one exact named `outreg2` scratch-text cleanup with its required postcondition; perform every other cleanup outside the research do-file after resolving exact targets
- malformed sample conditions such as a missing `if`
- dropping `_merge` before validating merge states
- loop depth 3 or greater
- TeX output commands or `.tex` output targets; use Excel for tables, PDF for figures, and `.ster` for stored estimates
- setup or installed-command probes embedded in an analysis do-file, including plain or prefixed `which`, `findfile`, `ado dir`, and related `_rc` branches
- any noncanonical regression-Excel helper program that infers outcomes, samples, specifications, or model roles; rewrites raw `outreg2` rows; adds statistics beyond adjusted R-squared and the dependent-variable mean; or adds unused, future-facing interfaces. The one canonical `outreg2_xlsx` formatter remains allowed for every declared placement, including one outcome and one sheet, when it consumes caller-declared readable estimate names
- an unused program `syntax` option, one-item loop, one-use helper, optional branch, registry, dispatcher, or generic interface added only for hypothetical future expansion
- an encoded research-specification dispatcher that stores outcomes, samples, specifications, sheets, labels, or graph ranges in positional job strings and reconstructs them with `word` parsing
- deep structural nesting, or a second active loop that does not bind two plain named lists or numeric ranges to one repeated mechanical body with substantial code reduction and visible research/output choices

Prefixes such as `capture`, `cap`, `quietly`, `qui`, `noisily`, and `noi` never reduce the severity of these rules.

## Review findings

Warnings require correction or a case-specific written explanation:

- personal or absolute machine paths
- pause or fixed sleep
- broad capture around core research steps; a narrow `capture drop` for known generated variables is ordinary cleanup
- merge without an explicit matching-state contract, either an inline `keep()` policy or a subsequent `_merge` inspection and assertion
- `postfile` or an otherwise undocumented hand-built result bridge; official stored-result access and `putexcel` are not warnings by themselves

`program define` is valid Stata and occurs in selected research-practice code packages, but research logic inside a program remains a review finding because the specification must stay directly inspectable. Loop depth 1 remains the default. Depth 2 is allowed only for two plain repeated axes when one mechanical body removes substantial duplication without hiding sample, estimand, specification, grouping, or output placement. Unreviewed depth-2 source spans remain contextual evidence; explicitly reviewed compatible spans may be reused. Depth 3 blocks authored code and is removed from the derived example layer. Raw corpus files remain unchanged for provenance.

## Label sufficiency

A reusable label is incomplete unless it carries a compact structured `input_signature` supported by the cited source bytes and surrounding context. Record, when observable, the source data shape, record unit, time structure, identifying keys, and variable traits relevant to the block. Time structure may include frequency, observed year or wave span, and balanced or unbalanced status; variable traits may include continuous, binary, categorical, count, share, rate, level, or transformed status. Write `unknown` when the source does not establish a field. Never infer panel length, balance, keys, units, or transformations from a variable name alone.

Template selection compares the target project's observed input signature with the label before ranking readability or generality. A known incompatibility blocks automatic reuse; an unknown field calls for source or project inspection, not a guessed match. Corpus coverage and label count therefore do not establish label sufficiency: the review must also report input-signature completeness and unresolved `unknown` fields.

## Positive evidence

Positive patterns include a single root configuration, derived paths, raw/generated/final/output separation, master or explicit external orchestration, prep/analysis ordering, key assertions, explicit merge cardinality and retained-state policy, panel uniqueness, sample-flow counts, variable labels, explicit estimation contracts, adjacent random seeds, and reproducible exports.
