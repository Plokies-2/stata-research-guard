# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Required flow

1. Inspect the exposed discovery dictionary. During MCP use, the allowed command universe is only its 109 listed commands.
2. The model chooses one or more commands from that dictionary based on the user request and current project context. Neither the server nor a scorer selects a winner, ranks one as preferred, or gates the model's choice.
3. Request `get_stata_command_evidence` with those `selected_commands`. The response must include the common [general-rules.md](general-rules.md), plus the selected commands' guide material and any available paper usage cards on demand. When `full_command_guides` is nonempty, read that complete, hash-linked body before relying on a shorter excerpt; it is never silently truncated.
4. Apply the general rules and the official or maintainer guide, then write the simplest code that preserves the user's research choices and real project contracts.

If no listed command supplies a needed command or feature, stop. Do not invent a manual implementation, substitute an unrequested command, or abbreviate the required functionality. Report the missing command or feature to the user. A document-free manual implementation is prohibited.

## Evidence roles

- StataCorp manual and help material governs official-command syntax, options, returned state, version notes, and documented incompatibilities.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command syntax and package behavior.
- Project observations report literal paths, lines, commands, options, input/output bindings, calls, and estimate handoffs. They do not rank candidates.
- `paper_usage_occurrence` preserves a paper's exact target use. A separately reviewed `high_quality_example` block preserves the manually chosen working context around that use. Neither is rewritten to satisfy a house rule. The server accepts them only with the 109-command exact index and hash-linked review summary, and returns blocks only for `selected_commands`.

Do not combine these roles into a numeric score. Documentation establishes grammar; the user and model establish the research design.

## Using the router

The dictionary is a discovery step, not an automatic recommender. First select commands yourself, then call `get_stata_command_evidence` with the request and `selected_commands`. The server may split the request into functional atoms such as `estimation.linear` and `export.regression_excel`, but it does not choose the command.

Read a returned complete guide before using unfamiliar syntax or options. It preserves syntax, option meanings, warnings, examples, postestimation, and stored results in source order while removing viewer-only presentation. It remains grammar evidence under `general-rules.md`, not a template or a reason to add unrelated options. If no complete guide is indexed, use the readable excerpt and `unresolved_facts`; do not fill a material gap from memory. A document-derived runtime fixture is adapted code, not a verbatim quotation.

The server returns factual context only. It never returns a winner, score, pass/fail decision, promotion status, or automatic-selection decision. Do not construct a validator, ranker, or promotion gate around this evidence.

## Choosing a command

Consider:

- the user's current estimand, sample, panel structure, fixed effects, weights, VCE, version, and output requirements;
- the command's documented semantics and returned state;
- compatibility with downstream postestimation, stored estimates, tables, and figures;
- the factual current-project interfaces;
- the nearest useful reviewed paper block, when available; and
- the simplest readable implementation that satisfies the contract.

Existing usage is a continuity consideration only after it passes this substantive comparison. A manual workaround, duplicate loop, fragile export, or outdated command can be evidence in favor of migration.

## Paper boundary

Never search or return an entire raw archive as if it were a reviewed example. A paper card must carry a manually bounded high-quality block with source path, source-file hash, span, exact code, focus command, target spans, boundary rationale, and explicit carry-over limits. The reviewed occurrence, exact index, block, review-summary, and passing final-audit files must be installed together; unreviewed rows and partial data are not a fallback. If that block does not exist, return no paper card and say so.

Use guide-only evidence when no reviewed paper block exists. For an available block, focus on the selected command. Its surrounding estimator and upstream/downstream code are reference context, not an instruction to adopt that paper's design: an `outreg2` block containing `areg` does not change a current `regress` specification into `areg`.

When a block is close to the current task, harmonize only the selected command's immediately surrounding before/after code with the current project and the guide. When it is distant, do not force it into a template; write direct code using model judgment. A complex command may use two or more blocks when material variants differ. In every case, the user-selected or current-code command has priority over a paper example.
