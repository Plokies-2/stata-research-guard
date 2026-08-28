# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Evidence roles

- StataCorp manual and help material governs official-command syntax, options, returned state, version notes, and documented incompatibilities.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command syntax and package behavior.
- Project observations report literal paths, lines, commands, options, input/output bindings, calls, and estimate handoffs. They do not rank candidates.
- `paper_usage_occurrence` records a paper's exact use and enough upstream/downstream context to understand it. It is non-authoritative context.
- `paper_adaptation_card` is an optional derivative with explicit binding slots and a transformation log. It never replaces its occurrence provenance.

Do not combine these roles into a numeric score. Documentation establishes grammar; the user and model establish the research design.

## Using the router

Call `get_stata_command_evidence` with one natural-language request. The server may split it into functional atoms such as `estimation.linear` and `export.regression_excel`. Compare candidates only within the relevant function.

Read the returned documentation excerpt before using unfamiliar syntax or options. A document-derived runtime fixture is adapted code, not a verbatim quotation. When a maintainer example is not locally stored, use `unresolved_facts` as a cue to inspect the maintainer source rather than filling the gap from memory.

The server returns candidates in stable order for reproducibility, not preference order. It never returns a winner, score, semantic pass, promotion status, or automatic-selection decision.

## Choosing a command

Consider:

- the user's current estimand, sample, panel structure, fixed effects, weights, VCE, version, and output requirements;
- the command's documented semantics and returned state;
- compatibility with downstream postestimation, stored estimates, tables, and figures;
- the factual current-project interfaces;
- the nearest useful paper occurrence, when available; and
- the simplest readable implementation that satisfies the contract.

Existing usage is a continuity consideration only after it passes this substantive comparison. A manual workaround, duplicate loop, fragile export, or outdated command can be evidence in favor of migration.

## Paper boundary

Never search or return an entire raw archive as if it were a reviewed example. A paper card must identify citation or repository, version, source path, source-file hash, span, exact excerpt, prerequisites, options, and downstream consumer. If that record does not exist, return no paper card and say so.
