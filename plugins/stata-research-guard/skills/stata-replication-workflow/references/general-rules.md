# General Rules

Read these rules for every Stata code write or revision. They are concise prospective house style, not a validator, scorecard, or retroactive lint standard.

## Priority and command boundary

1. The user's and project's research choices come first: estimand, sample, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, output grouping, and append-versus-replace decision remain the model's responsibility when the user has specified them. Resolve a material gap from current context or ask the user.
2. While using MCP, use only the 115 commands in the exposed command dictionary. Choose the command yourself from discovery, then request guide and paper evidence for `selected_commands`. If the required command or feature is outside the dictionary, abort and report exactly what is unavailable. Do not manually implement, replace, or abbreviate it.
3. If the appropriate command is clear from the request and project context, select only that command. When multiple commands are genuinely needed for different stages or more than one command remains a plausible alternative, you may request only those relevant evidence packets together and compare their documented purpose, required input state, syntax, output or returned state, tradeoffs, and incompatibilities. Make the final choice yourself; do not ask the server to rank or choose, and do not add candidates without a concrete reason.
4. Official documentation governs official-command syntax, options, returned state, version notes, and incompatibilities. Maintainer documentation governs the corresponding facts for user-written commands. Do not use undocumented manual implementations.
5. A paper occurrence is an exact, command-focused starting example, not syntax authority or a command-selection rule. Keep its source usage unchanged. Use its nearby context only to understand and harmonize the selected command; retain the user's or current code's command choice unless the research decision calls for another one.

## Direct Stata

- Keep code shallow, direct, and readable at the point of use. Avoid registries, dispatchers, positional job strings with `word` parsing, future interfaces, one-use programs, wrappers, speculative branches, and abstraction that has no current repeated use. Do not create a `program` merely to shorten one call or anticipate future reuse.
- Prefer one flat loop. A simple mechanical two-axis repetition may use loop depth two. Do not use depth three or helpers that hide another loop. Indent only inside a real control-flow scope, one level per scope; keep top-level commands unindented and avoid decorative block indentation.
- Use literals for one-use bindings. Locals are allowed for iterators, `tempfile`, `tempvar`, `tempname`, per-iteration scratch values, immediately consumed `r()`/`e()` results, and lexical state of an approved program. Do not hide research specifications, controls, samples, FE, or VCE behind local aliases.
- In each core regression or estimation call, write the outcome, treatment or event terms, consequential `if` or `in` sample, controls, fixed effects, weights, and VCE variable names literally at the call site. Do not replace them with local or global macros, positional lists, or parallel mappings. When an approved flat loop changes one mechanical slot, only that iterator may remain macro-driven; keep every other research-defining term explicit.
- Use a descriptive global only for a shared root or a repeatedly consumed binding that is a cross-`.do`-file contract. A leaf one-use filename is literal.
- A durable artifact, independently rerunnable stage, or real handoff is a module boundary; otherwise keep the work together.
- Do not add one-off manual verification blocks to project `.do` files merely to re-check scratch cleanup or output existence, such as `capture confirm file` followed by `_rc`, `display as error`, and `exit`. Keep the required operation itself direct; when verification is requested, inspect the runtime state or produced artifacts instead of embedding throwaway checks in the research code.

## Pre-final self-review checklist

Apply this checklist to newly written or actively revised Stata code. It is source-grounded model review, not a server-side validator, audit queue, command ranking, numeric score, or research-design certification.

- Reconcile the latest user scope with the candidate: allowed files, paths and folder depth, preserved helpers and reference versions, call order, and table, graph, estimate, workbook, and other output contracts must remain compatible.
- Keep the research specification traceable where estimation occurs. Outcomes, treatment or event terms, consequential samples, controls, fixed effects, weights, VCE, event windows, and model roles must appear literally in each core estimation call except for the single mechanical iterator allowed above; they must not disappear behind cryptic macros, positional lists, dispatchers, or duplicated branches.
- Inspect upstream preparation before accepting downstream exceptions. Do not repeat outcome-specific branches, missingness restrictions, or counters when the established data state already enforces the same contract; retain a branch when it represents a real specification or data difference.
- Before accepting hand-written repetition or a workaround, inspect the currently selected command's official or maintainer evidence for documented native factor-variable, wildcard, range, bulk, or returned-state support. A precise wildcard such as `?` can replace a long selector only when the command's documented matching semantics and the actual names make it exact. This check does not authorize switching to another command or changing the research design.
- Reduce identical estimation, formatting, diagnostic, and export boilerplate with the shallowest readable construct. Do not trade repetition for nested loops, parallel positional mappings, `word` parsing, one-use wrappers, speculative programs, or aliases that hide meaning. Reusing an existing variable as scratch storage is acceptable only inside a verified recovery boundary such as `preserve`/`restore` and when it makes the mapping clearer.
- After an estimator or event-term change, compare native factor-variable names and raw `e(b)` rows with every downstream table, plot, selector, stored estimate, and formatter handoff. Preserve required omitted and base rows and ordering.
- Classify checks by the contract they protect. Preserve data invariants, merge or identifier safeguards, and approved program-internal cleanup checks; remove throwaway counters or post-command existence checks that merely repeat a guarantee already supplied by the command or observed runtime state.
- Keep comments that explain research meaning, a non-obvious transformation, or compact documented syntax. Remove review history, rejected-design narration, personal absolute paths, and verbose interface prose. Preserve user-facing labels and output text unless the user asked to change them.
- Confirm that a compact refactor leaves samples, specifications, row and sheet order, labels, figures, estimates, and output destinations unchanged unless the user requested the difference. Report static observations, runtime results, and substantive or causal validity as separate claims.

## Project contracts and outputs

- A master file has exact comma-separated `* Project Inputs:` and `* Project Outputs:` inventories. Immediately before every `.do` call, add one sentence stating that called file's role.
- Keep factor-variable syntax native and retain raw `e(b)` names for tables and event-study selectors. Do not construct manual interaction variables or reconstruct coefficient rows, standard errors, omitted rows, or base rows yourself.
- Use Excel for tables, PDF for figures, and `.ster` for reusable estimates when required. Do not create TeX output.
- A one-sheet `outreg2` table is a direct explicit `.xls` export with `nor2` and approved `addstat`; do not route it through an unnecessary formatter. For a multi-sheet workbook, preserve the approved formatter contract when one applies.
- Before adding custom statistics, rows, or notes to an export, consult the exporter's guide for what it emits automatically and do not repeat the same fact. When replacing a default row with a custom row, apply the documented suppression and addition options together; do not detach one of those linked options from a paper example.
