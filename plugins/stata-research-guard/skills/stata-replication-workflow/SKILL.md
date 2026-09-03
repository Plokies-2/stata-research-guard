---
name: stata-replication-workflow
description: Create, revise, or review Stata research workflows using the common main rules, help-first official or maintainer command evidence, and selected real-paper context. Use for .do-file workflows, data preparation, estimation, robustness, figures, tables, and exports; do not use it as a command selector, code grader, or research-design certifier.
---

# Stata Research Workflow

Make the project-specific decision yourself. Use `stataResearchGuard` to obtain rules, grammar, and selected examples, not a verdict.

For every Stata code write or revision, read [general-rules.md](references/general-rules.md). For the exact MCP contract, read [command-evidence.md](references/command-evidence.md).

## Evidence flow

1. Respect the user's write boundary. Review, diagnosis, explanation, and explicit no-change requests are read-only.
2. Inspect the active project yourself and preserve compatible paths, names, call order, estimate handoffs, workbook sheets, and output contracts. The MCP server does not scan project files or use existing command frequency to choose for you.
3. **No-lookup boundary:** do not call Guard for read-only explanation or review, comment/bookmark/whitespace-only edits, formatting-only source changes, literal path or label replacement that leaves the command interface unchanged, verbatim relocation of an existing command block, or execution of an unchanged file when no command semantic is in question. These actions still respect the project rules and can use mcpStata for runtime inspection or execution when appropriate.
4. **Optional Phase 1 discovery:** when the material command is not yet clear, call `get_stata_command_evidence` with only `request`, read the returned full `main_rules`, and use the compact 115-command index to choose. When the exact material command is already clear from the user request, current code, or prior evidence in this task, skip Phase 1 and call Phase 2 directly. The index is a curated discovery aid, not a closed command boundary.
5. **Phase 2:** send `request` and nonempty `selected_commands` only for commands whose syntax, material options, returned results, or downstream interface matter to the change. Read and apply the returned full `main_rules`; the server includes them in every phase so skipping discovery cannot omit the common authoring boundary. Do not enumerate incidental scaffolding such as `global`, `local`, `if`, `foreach`, or `do` unless that construct itself is uncertain. Registered multiword Stata spelling such as `export excel` is normalized transparently to the registry key `export_excel`. For language constructs whose written token differs from the official help topic, `global`, `local`, `tempfile`, and `tempname` use `macro`; programming `if` uses `ifcmd`, while the `if` topic is the observation qualifier. Registered commands return bundled official or maintainer help, expanded-documentation status, and a compact paper catalog. An exact command outside the index triggers live lookup from the active Stata installation. If exact live help is unavailable, stop only a branch whose material syntax remains unresolved; do not turn an irrelevant help gap into a reason to stop a syntax-preserving edit.
6. **Combined Phase 3, when more context would materially help:** use Phase 3 only for registered commands because only they have bundled expanded documents and paper catalogs. Send the same `selected_commands` boundary with `expanded: true`; put only registered commands whose longer documentation is actually needed in `expanded_commands`, and independently choose exact `block_id` values from the Phase 2 catalog when paper context would help. Empty optional arrays are treated as no selection, but at least one nonempty documentation or paper selection is required. Read only the returned Stata 18 manual entries or limited author supplement and the selected slim paper cards with optional raw log/artifact excerpts. `same_source_as_help` means Phase 2 already supplied the authoritative maintainer text. A supplemental author document, paper block, or log is not grammar authority. Never expand every selected command by default or ask the server to choose.
7. Write the simplest implementation that fits the user's research requirements, current data state, downstream interfaces, and the selected command's documented semantics. Do not turn a request to retain an existing analysis, robustness check, placebo, permutation, or export into a new mode, positional argument, dispatcher, or conditional branch unless that interface was explicitly requested or already required by the project.

After both Guard and mcpStata are callable, read-only session lifecycle and structured data inspection may proceed without obtaining a new Phase 2 packet for every inspection action. Obtain Phase 2 before writing or revising a material Stata command, changing or saving data, estimation or testing, exports, or consequential downstream use of returned state. Reuse the same packet while the command, version, material options, returned-result interface, and downstream use remain unchanged; comments, layout, literal paths, or code location do not by themselves invalidate it.

Paper examples are high-quality hints, never templates, answers, or oracles. A close block may clarify code immediately around the already selected focus command. A distant block is reference context only. Surrounding estimators, outcomes, samples, treatment, controls, FE, VCE, event windows, formats, and paths do not override the current project. An `outreg2` block surrounded by `areg`, `reghdfe`, or `xtivreg2` does not replace a current `regress` choice.

Raw logs are stored source material, not a derived result-fact layer. Do not infer missing output, rerun a paper for coverage, or create `observed_output_facts`, returned-state classifications, scores, pass/fail labels, rankings, promotion states, or audit queues.

For code-writing conventions, read [authoring-conventions.md](references/authoring-conventions.md).

## Research choices

Do not let a tool choose an unresolved sample, estimand, treatment rule, merge key, fixed effects, weights, VCE, event axis, model role, workbook grouping, or append-versus-replace decision. Resolve it from the user's request and project context or ask when the choice materially changes the result.

For a new workflow, use only the stages required by the request. [workflow-taxonomy.md](references/workflow-taxonomy.md) is a checklist, not a mandatory file tree. Preserve a compatible existing structure.

## Authoring and outputs

Write direct Stata whose active sample, specification, and output can be understood at the point of use. In core estimation calls, write outcome, treatment or event terms, consequential samples, controls, fixed effects, weights, and VCE variables literally rather than hiding them in macros. Preserve native factor-variable and raw `e(b)` names. Avoid unnecessary programs, deep loops, positional parsing, speculative options, and scratch installation or file-existence checks.

The bundled `outreg2_xlsx` program is an implementation artifact for its declared formatting interface. It does not choose the estimator or research design.

If the user approves a new project or structural overhaul that needs a researcher-facing README, read [readme-contract.md](references/readme-contract.md).

## Claims

Transport, paths, file creation, exit codes, logs, and returned state are observable facts. Static inspection, runtime completion, substantive interpretation, and causal validity are different claims.

Do not create deterministic validators, graders, rankers, classifiers, expected-answer oracles, or hidden fallbacks for generated Stata meaning, specification, command choice, correctness, or quality. There is no mandatory independent-audit workflow or `audit_pending` state.
