# General Rules

Read for every Stata write or revision. These are prospective authoring rules, not a validator, scorecard, or retroactive lint.

## Research judgment and evidence

- The user and project, not Guard, determine estimand, sample, treatment, merge key, controls, FE, weights, VCE, event axis, model role, and outputs. Resolve a material gap from current context or ask.
- Choose the command yourself. Official documentation governs official commands and maintainer documentation governs user-written commands; do not invent undocumented syntax. Paper code is contextual, never grammar authority or a template.
- Skip Guard for read-only review or explanation, comment or formatting-only edits, literal path or label changes that leave the command interface unchanged, verbatim relocation, and unchanged-file execution with no semantic issue. For material code, data changes or saves, estimation or tests, exports, or consequential returned-state use, obtain exact-command Phase 2 evidence. Use Phase 1 only when the command is unclear; otherwise call Phase 2 directly. Stop only a branch whose material syntax remains unavailable.
- Request evidence only for interfaces that matter. The command index is a discovery aid, not a closed boundary. Reuse a visible packet only while the command, version, material options, returned interface, and downstream use remain unchanged.

## Direct Stata

- Write shallow, direct code whose sample, specification, and output are visible at use. Do not add registries, modes, dispatchers, positional `word` parsing, future interfaces, wrappers, or speculative branches merely to retain an analysis, robustness check, placebo, permutation, or export.
- Use literals for one-use bindings. At each core estimation, write outcome, treatment or event terms, consequential `if` or `in`, controls, FE, weights, and VCE at the call site. Locals are only for iterators, temporary or scratch values, immediately consumed `r()` or `e()` results, or lexical state of an approved program; globals only for a shared root or real cross-file contract.
- Add a `program` only for a command interface that the user, existing project, or actual repeated calls require, never to shorten one call. Use a `.do` module for a durable rerunnable stage or real handoff that needs no reusable command interface. Keep top-level code unindented and indent once per real scope. Prefer one flat loop; use depth two only for simple mechanical two-axis repetition, never depth three or a helper that hides it.
- Do not multiply `if` or conditional branches for outcome-specific exceptions, missingness, counters, or checks already supplied by established data state. Keep a branch only for a real specification or data difference. Do not test package availability with `which`, `capture which`, `findfile`, `ado dir`, or `confirm command`; do not scratch-install packages or add throwaway file-existence or cleanup checks. Inspect runtime state or artifacts when verification is needed.
- Preserve native factor-variable syntax and raw `e(b)` names through tables, event-study selectors, stored estimates, and formatters, including required estimated rows and actual omitted or base raw rows in their required order. Do not manually create interactions or reconstruct coefficients, standard errors, omitted or base rows, or their ordering.
- Use documented native factor-variable, wildcard, range, bulk, or returned-state support before adding a workaround. Reduce truly identical boilerplate with the shallowest readable construct, never at the cost of hidden specification or deeper control flow.

## Outputs and review

- Preserve requested paths, call order, labels, samples, specifications, row or sheet order, tables, figures, estimates, and output contracts unless the user requests a change. Master files retain exact comma-separated `* Project Inputs:` and `* Project Outputs:` inventories and a role sentence before each `.do` call.
- Use Excel for tables, PDF for figures, and `.ster` for reusable estimates when required; do not create TeX output. Keep a one-sheet `outreg2` table as the approved direct `.xls` export with `nor2` and approved `addstat`, and preserve an approved multi-sheet formatter. Consult the exporter guide before duplicating default statistics, rows, or notes.
- Verify by reading code and observed runtime state, logs, tables, figures, estimates, and artifacts. Keep static observations, runtime completion, and substantive or causal validity distinct. Do not create semantic validators, graders, rankers, classifiers, expected-answer oracles, audit queues, promotion states, or hidden fallbacks.
