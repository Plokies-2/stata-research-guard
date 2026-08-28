# General Rules

Read these rules for every Stata code write or revision. They are concise prospective house style, not a validator, scorecard, or retroactive lint standard.

## Priority and command boundary

1. The user's and project's research choices come first: estimand, sample, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, output grouping, and append-versus-replace decision remain the model's responsibility when the user has specified them. Resolve a material gap from current context or ask the user.
2. While using MCP, use only the 109 commands in the exposed command dictionary. Choose the command yourself from discovery, then request guide and paper evidence for `selected_commands`. If the required command or feature is outside the dictionary, abort and report exactly what is unavailable. Do not manually implement, replace, or abbreviate it.
3. Official documentation governs official-command syntax, options, returned state, version notes, and incompatibilities. Maintainer documentation governs the corresponding facts for user-written commands. Do not use undocumented manual implementations.
4. A paper occurrence is an exact, command-focused starting example, not syntax authority or a command-selection rule. Keep its source usage unchanged. Use its nearby context only to understand and harmonize the selected command; retain the user's or current code's command choice unless the research decision calls for another one.

## Direct Stata

- Keep code shallow, direct, and readable at the point of use. Avoid registries, dispatchers, positional job strings with `word` parsing, future interfaces, one-use programs, wrappers, speculative branches, and abstraction that has no current repeated use.
- Prefer one flat loop. A simple mechanical two-axis repetition may use loop depth two. Do not use depth three or helpers that hide another loop. Keep indentation shallow.
- Use literals for one-use bindings. Locals are allowed for iterators, `tempfile`, `tempvar`, `tempname`, per-iteration scratch values, immediately consumed `r()`/`e()` results, and lexical state of an approved program. Do not hide research specifications, controls, samples, FE, or VCE behind local aliases.
- Use a descriptive global only for a shared root or a repeatedly consumed binding that is a cross-`.do`-file contract. A leaf one-use filename is literal.
- A durable artifact, independently rerunnable stage, or real handoff is a module boundary; otherwise keep the work together.
- Do not add one-off manual verification blocks to project `.do` files merely to re-check scratch cleanup or output existence, such as `capture confirm file` followed by `_rc`, `display as error`, and `exit`. Keep the required operation itself direct; when verification is requested, inspect the runtime state or produced artifacts through the execution or audit tools instead of embedding throwaway checks in the research code.

## Project contracts and outputs

- A master file has exact comma-separated `* Project Inputs:` and `* Project Outputs:` inventories. Immediately before every `.do` call, add one sentence stating that called file's role.
- Keep factor-variable syntax native and retain raw `e(b)` names for tables and event-study selectors. Do not construct manual interaction variables or reconstruct coefficient rows, standard errors, omitted rows, or base rows yourself.
- Use Excel for tables, PDF for figures, and `.ster` for reusable estimates when required. Do not create TeX output.
- A one-sheet `outreg2` table is a direct explicit `.xls` export with `nor2` and approved `addstat`; do not route it through an unnecessary formatter. For a multi-sheet workbook, preserve the approved formatter contract when one applies.
