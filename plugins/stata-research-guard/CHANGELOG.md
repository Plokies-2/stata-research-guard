# Changelog

## 2026-08-30 — help-first Phase 2

- Replaced Phase 2 full-manual delivery with Stata-rendered plain-text help for all 109 dictionary commands: 106 available, `collect_style` partial, and `jregress` plus `jwdidstacked` unavailable.
- Rendered 63 official Stata 18 command topics and 43 stored maintainer help sources with Stata's documented `smcl2txt` translator after resolving their visible `INCLUDE help` sources in order.
- Added the public maintained-distribution `cgmreg.hlp` pinned to repository commit `1e3006e54d51ebf75077e0f969367bb4b4250cb9`; its packet states that this is not the original authors' archived distribution alone.
- Kept all 107 full manuals in the bundle for a later expansion design but stopped returning them in Phase 2. The combined expanded manual-plus-paper phase remains deferred.
- Kept compact paper catalogs visible even when help is unavailable, while explicitly prohibiting their use as command-grammar authority.
- Preserved the existing exact raw-paper Phase 3 interface without adding a new Phase 3–4 router, trigger, score, or semantic validator.

## 2026-08-30 — independent multi-command evidence packets

- Changed Phase 2 to return one ordered `command_evidence` packet per selected command so a missing full guide no longer aborts unrelated available commands.
- Kept unavailable commands explicit with `guide_status=full_command_guide_unavailable`, a null guide, and an empty paper catalog without substitution.
- Allowed Phase 3 paper cards for available commands to return when another selected command has no full guide.
- Allowed the model to request and compare multiple command packets only when different stages need them or genuine alternatives remain; a clear command choice stays single-command to limit context.
- Made core estimation calls literal at the call site: research-defining variables may not be hidden in macros, positional mappings, unnecessary programs, decorative indentation, or speculative abstractions.

## 2026-08-30 — direct guide and paper-context lookup

- Removed `command_paper_index`, paper review summary, paper integrity audit, project scanning, and exhaustive paper hash/span gates from the product path.
- Reduced the MCP contract to the common main rules plus three direct lookups: the 109-command dictionary, selected full guides with compact profiles, and exact selected paper blocks with linked occurrences and optional raw log or artifact context.
- Kept 166 paper profiles and blocks and 12 optional raw-context attachments without turning attachment count into a coverage target.
- Replaced the broad paper-audit and semantic tests with narrow Node smoke tests for transport shape and raw-material attachment. No Python command-evidence validator, audit queue, scoring, ranking, winner, promotion, or `audit_pending` state remains.
- Preserved the nonbinding paper boundary: surrounding estimators in an `outreg2` example cannot replace the model's current `regress` selection.

## 2026-08-29 — stateless three-phase exact evidence routing

- Replaced the two-phase payload with one public tool and three exact stateless input shapes: request-only neutral discovery, model-selected command guides and compact profile catalog, and optional model-selected raw paper blocks.
- Kept Phase 1 in canonical registry order and removed paper availability, counts, profiles, code, project observations, frequency, score, rank, recommendations, and winner signals from command discovery.
- Made Phase 2 return every selected command's complete untruncated guide, fail the entire request closed with `reason=full_command_guide_unavailable` for `cgmreg` or `jwdidstacked`, and stop normally at guide-only evidence when no paper profile exists.
- Added exact one-to-one ID, focus-command, source-block-hash, registry-order, and raw-order readback for all 166 compact profiles without grading their prose or generated Stata semantics.
- Made Phase 3 reject empty, unknown, duplicate, case-changed, all-block, mixed-phase, and command-mismatched selections, preserve requested block order, and return only the selected raw blocks and linked occurrences without repeating Phase 2 payloads.
- Added optional raw `paper_log_contexts` to a selected Phase 3 paper block when a directly linked deposited log or isolated run exists; no result-fact extraction, returned-state inference, score, or validation layer is exposed.
- Repeated the model-autonomy, closed-dictionary, guide-priority, nonbinding-paper, direct-authoring, and deterministic-semantic-validation boundaries in every response. The validation prohibition does not restrict model reasoning, user review, or the exact independent read-only final audit.
- Documented that surrounding `areg`, `reghdfe`, or `xtivreg2` in an `outreg2` example never replaces the current selected estimator, and that the model may select multiple materially different blocks for a complex variant.

## 2026-08-29 — audited 107-command full-guide bundle

- Bundled complete cleaned official or maintainer guides for 107 of the 109 closed-dictionary commands and preserved every indexed primary source plus nine required supplemental sources.
- Recorded `cgmreg` and `jwdidstacked` as independently confirmed unavailable instead of reconstructing help from implementation code or inventing a substitute.
- Added exact registry-order, ready/unavailable status, source/content/supplemental hash, UTF-8, final-audit, and authority-file checks at server startup and in regression tests.
- Kept discovery body-free and selected-command delivery untruncated; complete guides remain syntax authority while reviewed paper blocks remain nonbinding high-quality examples rather than templates.

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
