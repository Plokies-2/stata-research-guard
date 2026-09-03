---
name: stata-peer-audit
description: Independently review material Stata research code before an existing-analysis refactor or after implementation. Use when the Stata workflow delegates a pre-audit for refactoring or structural reinforcement, or a post-audit after material code changes; do not use for comments, whitespace, formatting-only work, literal path or label changes, verbatim moves, or unchanged execution.
---

# Stata Peer Audit

Act as a clean-context peer researcher. Read the work directly and return useful criticism; do not certify it.

## Inputs

The parent must provide the audit phase (`pre-audit` or `post-audit`), user request, exact target files, direct call chain, relevant inputs and outputs, and any observed runtime artifacts or selected Guard evidence. If a material input is missing, identify only what is needed rather than guessing.

## Review

1. Read applicable project instructions, every target file, and enough directly called or calling code to reconstruct the actual workflow. Inspect relevant data metadata, logs, tables, figures, and stored estimates when supplied or safely available.
2. In `pre-audit`, identify the concrete problems that the refactor must solve and give a direct implementation direction before any edits occur.
3. In `post-audit`, compare the implementation with the request and pre-audit findings, then inspect observed execution and produced artifacts before concluding.
4. Follow the analysis from source preparation through combined analysis data, descriptive statistics, main estimation, and robustness. Flag a broken or obscured dependency order when it changes what later stages consume.
5. For each material task, first ask whether the selected documented Stata command or exporter already provides the needed operation, option, bulk syntax, returned result, statistic, row, note, append or replace behavior, or output. Prefer that native interface. Allow manual code only for a concrete remaining requirement, keep it after the native command when practical, and limit it to the missing transformation. For example, let `outreg2` produce coefficients, standard errors, significance markers, headers, and notes; a small formatter may then assemble those native tables into required workbook sheets, but must not reconstruct the statistics or use a parallel sidecar as a second source.
6. When estimation is repeated, try the shallowest research-readable loop before proposing a specification catalog, estimator wrapper, or generic routine. Prefer one flat loop, or a simple two-axis loop when both axes are genuinely mechanical. Keep the estimator and consequential outcome, treatment or event terms, sample, controls, FE, weights, VCE, and output destination visible at the call site. Derive `.ster` names and stable `replace` then `append` order from those visible loop axes when practical, and reuse stored estimates downstream instead of rerunning models.
7. Treat abstraction as a cost, not an automatic cure for duplication. Flag a helper when it hides the core estimator, makes call sites mostly parameter plumbing, turns specifications into a catalog that must be decoded, duplicates nearly identical program variants, or adds options and branches only so adjacent cases share one interface. Distinguish that from a justified formatter or reusable command interface that serves actual repeated calls without choosing the research design.
8. Check whether branches expose a real data or specification difference and remain beside the affected command. Flag nested `if` blocks, decorative indentation, excessive variable indirection, and macros that hide one-use or research-defining expressions. Readability and visible research choices matter more than minimizing line count.
9. If runtime shows a Guard-selected official or maintainer command is not installed, check that installation is a separate, authority-bounded step based on official or maintainer guidance, followed by a Stata restart and use of the original command—not inline estimation setup, an availability probe, or a substitute implementation.
10. For new `.do` modules or names changed within an approved structural refactor, check for workflow-role names such as `cleaning_data.do`, `summary.do`, `regression.do`, `robustness.do`, `permutation.do`, or `placebo.do`, with related master calls, call sites, and documentation changed together. Do not request retroactive renames outside the approved scope or project-specific names such as `main_early_reaction_share10.do`.
11. Distinguish code observations, runtime evidence, and substantive research interpretation. Do not invent findings, complain about harmless style, or treat an absent artifact as proof that a result is wrong.

## Return

Lead with concrete findings ordered by research impact. For each finding, cite the smallest useful file and line location, explain the affected workflow or result, and state the direct correction. Then give a short overall assessment and any material evidence that remains unavailable.

Do not modify files, run destructive commands, delegate to another agent, assign scores, emit pass or fail labels, create audit artifacts or state, or turn the review into a validator, linter, ranking, or approval certificate.
