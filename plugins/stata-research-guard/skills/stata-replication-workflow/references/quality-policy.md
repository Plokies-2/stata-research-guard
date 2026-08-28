# Quality policy

## Claim boundary

A journal replication deposit shows that a package was supplied under a data and code availability process. It does not establish that every line is portable, safe, elegant, or suitable as a generation template. Describe this tool's result as aligned with practices observed in a reviewed replication corpus. Do not call it journal-certified or journal-approved code.

StataCorp manuals are authoritative for command syntax. The selected clean spans from the collected research-practice code packages are authoritative for the target researcher style and workflow. A style exclusion is therefore recorded as `researcher_style_reference`, not as personal preference and not as a Stata syntax error.

## Scope, intent, and status separation

The default audit scope is the active reachable workflow from `scope.entrypoints` or the selected top-level master. `scope.mode: all` and project-relative `scope.include_paths`/`scope.exclude_paths` are caller-controlled alternatives. Excluded directories are pruned before discovery limits and call-graph construction. Unreachable files are listed as inactive advisories without full lint and do not block the active workflow unless explicitly included. Multiple plausible top-level masters produce `needs_review` without an arbitrary active selection until an entrypoint is explicit. This scope rule applies uniformly across projects.

Reporting follows `report_policy: required|optional|disabled`. Code-writing plans and final output checks default to `required`; a standalone read-only project audit defaults to `optional`. An explicit no-report request selects `disabled` and prohibits creating or modifying `report.md`; `optional` permits omission. The legacy `require_report` option is a compatibility alias for `required` when no explicit report policy is supplied. Under a required policy, coverage is still limited to caller-authored substantive `authored_spans`, not all legacy lines or provenance markers.

Review-only intent is bilingual and has precedence over incidental write words. Signals such as 검사, 점검, 평가, 진단, 검토, 발전 가능성, 수정하지 않는다 and `review`, `audit`, `inspect`, `assess`, `diagnose`, `explain`, `do not modify` imply `code_required: false` and `write_authorization.status: not_requested`. The planner must not classify such a request as `add_feature` or load writable code. Only an explicit write request without a contradictory no-change signal authorizes a write.

Master file-contract findings are conditioned on `authoring_state`: missing or inconsistent Project Inputs/Outputs and call-level Input/Output inventories are errors for a new master and warnings for a modified master, while read-only existing audits are not retroactively blocked. Role prose is advisory even for a new master; the checker does not grade sentence completeness, punctuation, or exact blank-line adjacency. `report_policy: required` (including the legacy alias `require_report: true`) checks caller-authored substantive `authored_spans` with confident boundaries and does not turn research-code provenance markers, harmless primitives, or all untouched legacy lines into mandatory report rows.

Runtime success, static audit, and substantive validity are independent statuses. Static checks may report only certain structural estimability risks. Exact omitted/collinear terms and native coefficient names require runtime `e(b)` readback with at least one declared nonreference term; an empty declaration is incomplete. A missing main log leaves runtime `not_checked`. Interpretation of the estimand and identification remains substantive validity, not a static or runtime proxy.

Multi-sheet and estimate-multiplicity findings require project-level producer-consumer evidence in reachable execution order, using call-time macro values. State is isolated across disconnected workflow components, including producer names, durable estimates, macros, workbooks, and sheets. A later producer and a durable `.ster` file do not by themselves satisfy an earlier in-memory estimate consumer. Dynamic or runtime-only names are `context_pending` and nonblocking. A per-file lint pass must not infer a blocking workbook contract from missing context.

Derived canonical or template material carries `independent_support=false` and is excluded from independent external-evidence counts. It may support lineage documentation but cannot count as independent evidence. Deposited external packages remain a separate evidence class. The tool does not perform target-relative package-lineage comparison, so their `independent_support` flag is not proof of different target lineage.

`loop_depth` counts active executable loop nesting; `structural_depth` counts nested executable/control blocks, including conditionals, loops, and program blocks. `loop_depth >= 3` blocks. `structural_depth >= 4` is a review warning, not an automatic runtime failure. Record both dimensions separately.

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
- any noncanonical regression-Excel helper program that infers outcomes, samples, specifications, or model roles; rewrites raw `outreg2` rows; adds statistics beyond adjusted R-squared and the dependent-variable mean; or adds unused, future-facing interfaces. The one canonical `outreg2_xlsx` formatter remains allowed only when one workbook has two or more declared sheets and it consumes caller-declared readable in-memory estimate names; a one-sheet workbook uses direct `outreg2`
- an unused program `syntax` option, one-item loop, one-use helper, optional branch, registry, dispatcher, or generic interface added only for hypothetical future expansion
- an encoded research-specification dispatcher that stores outcomes, samples, specifications, sheets, labels, or graph ranges in positional job strings and reconstructs them with `word` parsing
- a second active loop that does not bind two plain named lists or numeric ranges to one repeated mechanical body with substantial code reduction and visible research/output choices

Prefixes such as `capture`, `cap`, `quietly`, `qui`, `noisily`, and `noi` never reduce the severity of these rules.

Native Stata `python script <declared .py>, args(...)` is explicit script integration, not a shell, `winexec`, Unix, bang, or inline Python process escape. It is not a `process_escape` blocker solely for being native integration, but its runtime success, produced outputs, and substantive effects require separate runtime/output validation. The process-escape blocker remains for shell/winexec/bang/inline escapes.

## Review findings

Warnings require correction or a case-specific written explanation:

- personal or absolute machine paths
- pause or fixed sleep
- broad capture around core research steps; a narrow `capture drop` for known generated variables is ordinary cleanup
- merge without an explicit matching-state contract, either an inline `keep()` policy or a subsequent `_merge` inspection and assertion
- `postfile` or an otherwise undocumented hand-built result bridge; official stored-result access and `putexcel` are not warnings by themselves

`program define` is valid Stata and occurs in selected research-practice code packages, but research logic inside a program remains a review finding because the specification must stay directly inspectable. Loop depth 1 remains the default. Depth 2 is allowed only for two plain repeated axes when one mechanical body removes substantial duplication without hiding sample, estimand, specification, grouping, or output placement. Unreviewed depth-2 source spans remain contextual evidence; explicitly reviewed compatible spans may be reused. Loop depth 3 blocks authored code and is removed from the derived example layer. Structural depth 4 or greater is a review warning for simplification, not a loop-depth block. Raw corpus files remain unchanged for provenance.

## Label sufficiency

A reusable label is incomplete unless it carries a compact structured `input_signature` supported by the cited source bytes and surrounding context. Record, when observable, the source data shape, record unit, time structure, identifying keys, and variable traits relevant to the block. Time structure may include frequency, observed year or wave span, and balanced or unbalanced status; variable traits may include continuous, binary, categorical, count, share, rate, level, or transformed status. Write `unknown` when the source does not establish a field. Never infer panel length, balance, keys, units, or transformations from a variable name alone.

Guide coverage is complexity-weighted, not quota-weighted. A simple command may be complete with one source-backed code-free mechanics record. A complex command is incomplete until distinct records cover every material input-state, syntax, estimation, returned-state, and handoff dimension declared by its official manual or maintainer guide. Cosmetic rewrites and placeholder substitutions are duplicates, not variants. An independent pre-insertion audit records the dimensions, removes redundant candidates, and leaves unresolved dimensions as gaps. Guide records never ship synthesized code bodies or enter selector ranking.

Template selection compares the target project's observed input signature with the label before ranking readability or generality. A known incompatibility blocks automatic reuse; an unknown field calls for source or project inspection, not a guessed match. Corpus coverage and label count therefore do not establish label sufficiency: the review must also report input-signature completeness and unresolved `unknown` fields.

## Positive evidence

Positive patterns include a single root configuration, derived paths, raw/generated/final/output separation, master or explicit external orchestration, prep/analysis ordering, key assertions, explicit merge cardinality and retained-state policy, panel uniqueness, sample-flow counts, variable labels, explicit estimation contracts, adjacent random seeds, and reproducible exports.
