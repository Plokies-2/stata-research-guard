# Changelog

## 2026-08-29 — closed command dictionary and on-demand paper delivery

- Made the command dictionary the hard command boundary while the plugin is in use; unknown, duplicate, or empty selections abort instead of being guessed or substituted.
- Split evidence retrieval into discovery and selected-command phases so guide and paper payloads are returned only for commands the model chose.
- Restored a concise common general-rules contract without restoring generated-code grading, promotion gates, or broad semantic validators.
- Prepared optional command-keyed `paper_usage_occurrence` delivery with guide-only fallback and support for multiple material variants.
- Kept paper occurrences unmodified, focused examples on the selected command, and marked surrounding estimators and workflow code as reference context.
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
