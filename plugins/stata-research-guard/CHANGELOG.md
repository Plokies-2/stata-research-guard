# Changelog

## Unreleased

- Add an audited Top 50 command contract with 50 groups and 203 material variants, plus 48 variants across 15 additional user-written command groups. Independent promotion review retains 262 new guide mechanics as reference-only evidence; none is automatically selectable.
- Add `resolve_transition_evidence`, which always returns one bounded guide-mechanics card when available and independently matches at most one research-usage example. Guide and usage scores never compete; profile contradictions, unresolved choices, and unrelated multi-command requests fail closed into fallback, selection, or split routes.
- Generate 264 guide cards with zero auto-selectable rows and 128 research-usage examples (46 legacy-audited selectable rows). Preserve 19 bounded AEA/openICPSR support rows as explanation-only evidence and exclude nine rejected candidates from generated retrieval data.
- Expand the registry-driven package-first command catalog to 43 official and community Stata families and 109 canonical anchors. `build_reference_data.py` indexes `estpost` and `eststo`, distinguishes `ivreg2` from `ivreghdfe`, preserves canonical names such as `export_excel`, and emits corpus-coverage data in `data/package_command_catalog.json`. The documented expansion path is a command-index plus state-compatible atomic template, not an unbounded estimator-detector list; TeX, install/probe code, and manual coefficient reconstruction remain excluded or quarantined.

- Add an estimator-agnostic existing-file clone template to `plan_dictionary_repairs`: callers declare one canonical `.do` source and exact permitted literal edits, candidates block on every undeclared difference, and planner include/exclude scope prunes unrelated trees before inventory limits.
- Treat an indented continuation line after a comma as an option continuation and recognize `merge ..., assert(...)` as an inline retained-state contract.
- Define `audit_stata_project` active-reachable scope as the default, with explicit `scope.mode: all` and `scope.include_paths`/`scope.exclude_paths` alternatives; prune excluded directories before discovery and indexed call-graph construction, list unreachable files separately without full lint by default, and require an explicit entrypoint instead of choosing arbitrarily among multiple top-level masters.
- Make Korean and English review-only/no-change intent take precedence over incidental write vocabulary and expose the `code_required`/`write_authorization` boundary.
- Separate master-call role findings by `authoring_state`: new-master omissions are errors, modified-master omissions are warnings, and existing audited masters are not retroactively blocked.
- Require report coverage only for caller-authored substantive `authored_spans` under `report_policy: required` (including legacy `require_report: true`); do not force provenance markers or complete untouched-legacy coverage.
- Define `report_policy: required|optional|disabled`, with explicit no-report taking `disabled`; retain `require_report` only as a compatibility alias when no explicit policy is supplied.
- Base multi-sheet and estimate-multiplicity findings on execution-ordered project-level producer-consumer evidence with call-time macro values; isolate state across disconnected workflow components, and do not treat later producers or durable `.ster` files as active stored estimates.
- Distinguish native Stata `python script <declared .py>, args(...)` integration from shell/winexec/bang/inline process escapes; validate its runtime and outputs separately.
- Separate `runtime_success`, `static_audit`, and `substantive_validity`; mark runtime `not_checked` when no log is supplied, require at least one declared nonreference term for `e(b)` estimability readback, and keep interpretation as a substantive judgment.
- Mark same-lineage derived/template evidence `independent_support=false` and exclude it from independent external-evidence counts.
- Define `loop_depth` and `structural_depth` separately: loop depth 3 blocks, while structural depth 4 is a review warning.
- Record the validation diet in `review/validation_policy.md`, including checks retained, merged, downgraded, or excluded by default and the cost-versus-error-detection rationale.
