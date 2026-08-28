# Changelog

## 2026-08-29 — direct verification boundary

- Prohibited one-off `capture confirm file`/`_rc`/`exit` blocks that manually re-check scratch cleanup or output existence inside project `.do` files; requested verification belongs in runtime or artifact inspection.

## 2026-08-29 — complete selected-command guides

- Added a generic `full_command_guides` response channel that returns a stored complete guide only for exact `selected_commands`, with no character-limit truncation.
- Added the full `reghdfe` v6.14.1 maintainer help pinned to commit `29b2b203`, preserving raw and cleaned hashes while removing SMCL viewer presentation.
- Kept complete guides, short documentation excerpts, paper occurrences, and common general rules as separate evidence roles.
- Made the full-guide index fail closed on noncanonical commands, path escape, invalid authority or format, missing source/content, and raw or cleaned hash mismatch.
- Added deterministic rebuild and coverage checks for syntax, postestimation, examples, stored results, code formatting, and UI-residue removal.

## 2026-08-29 — closed command dictionary and on-demand paper delivery

- Made the command dictionary the hard command boundary while the plugin is in use; unknown, duplicate, or empty selections abort instead of being guessed or substituted.
- Split evidence retrieval into discovery and selected-command phases so guide and paper payloads are returned only for commands the model chose.
- Restored a concise common general-rules contract without restoring generated-code grading, promotion gates, or broad semantic validators.
- Added a locked reviewed-paper bundle with 168 included occurrences, a 109-command exact index, 166 manually bounded high-quality blocks, and a hash-linked review summary.
- Kept paper occurrences unmodified, returned blocks only for the selected focus command, labeled them as high-quality examples rather than templates, and marked surrounding estimators and workflow code as reference context.
- Added exact occurrence/index/block/summary hash and count checks, guide-only fallback for 32 commands without reviewed blocks, and multiple blocks for materially different variants.
- Removed unknown-first-token project-scan fallback and retained exact registry invocation or explicit-alias observations only.

## 2026-08-29 — autonomy-first evidence router

- Replaced the 15-tool selector, promotion, lint, audit, reproduction, and output-checker surface with `get_stata_command_evidence`.
- Removed numeric ranking, semantic pass, automatic selection, template promotion, coverage quotas, and generated-code grading from server responses and plugin data.
- Made official and maintainer documentation excerpts readable to the model and labeled document-derived fixtures as nonverbatim.
- Reduced project scanning to factual path, line, command, option, input/output, call, and estimate-handoff observations.
- Removed legacy mixed-schema paper usage from retrieval and the bundle while preserving the raw source archive and citation/hash provenance.
- Preserved the user-approved `outreg2_xlsx` formatter as a named implementation artifact without a general promotion exception.
- Reduced the skill and references to evidence roles, concise authoring conventions, an optional README contract, and a workflow-stage checklist.
- Replaced form-checking regression tests with transport, schema, path-containment, atom-separation, source-integrity, formatter, runtime-observation, and bundle-integrity tests.

Earlier implementation history remains available in Git.
