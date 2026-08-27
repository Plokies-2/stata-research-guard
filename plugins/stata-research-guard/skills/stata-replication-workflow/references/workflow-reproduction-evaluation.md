# Workflow reproduction evaluation

## Source isolation

Blind validation starts from a natural-language research contract. The generation agent may receive the installed plugin, the contract, and declared input paths. Do not provide the source do-file, previous validation code, earlier output files, project chat history, or copied fragments from the source project.

When the contract declares a source-isolated trial, use only the staged inputs, contract, installed plugin's local data/manual/archive, and exposed `stataResearchGuard` calls. Do not use Browser, web search, external URLs, shell-based reference retrieval, external connectors, prior generated code, or evaluator answer assets. Source isolation is an evidence boundary, not a template-only requirement. Harmless direct primitives and narrow contract-driven implementations may be written after local template and manual checks. Stop only for unresolved substantive choices, unavailable required input or execution capability, or hard safety/output-contract conflicts.

The source project may be inspected only by the prompt author and the final evaluator. Keep its hashes and location in the evaluator's evidence record, outside the generation workspace.

## Prompt contract

Describe the research work without dictating its original code. Record:

- input datasets and their roles
- units of observation, keys, time range, and sample restrictions
- variable construction rules, missing-value rules, and labels for new variables
- merge cardinalities and retained merge states
- sample-flow checkpoints
- outcomes, treatment, controls, fixed effects, clustering, and required specifications
- tables, figures, stored estimates, logs, and exact expected counts
- entrypoint and permitted input-path overrides

The prompt may state required filenames when they are part of the deliverable contract. It must not quote or paraphrase source-code blocks closely enough to become an answer key.

## Independent build

The generation agent follows the normal local evidence sequence and applies the general rules throughout. It uses a genuinely close labeled block only when permitted bindings leave the complete atomic transition intact. When no suitable block exists or a selection proves wrong, it uses `general_rule` and receives the rank-relative nearest candidate only as a nonbinding hint; the rank does not establish compatibility. Existing project layouts are preserved; the standard first-build tree applies only to a confirmed blank project after the pre-write gate. Read [general-rule-authoring.md](general-rule-authoring.md). Keep a ledger only when a persistent reuse audit is requested, and keep nontrivial general-rule spans narrow and visibly bounded.

For grouped summary statistics, create one named canonical summary dataset. Each group-period row must contain at least the mean, standard deviation, and nonmissing observation count. When the prompt declares schema names such as `mean_age`, `sd_age`, and `n_age`, pass them as `required_variables` in the summary dataset contract. The table and figure programs both read this dataset. Do not compute their group definitions independently.

## Evaluation

Call `workflow_reproduction_check` with a machine-readable contract containing the expected entrypoint, stages, required files, required calls, deliverable patterns and counts, shared summary datasets, required summary variable names, and optional estimation tokens or `.ster` counts.

Success requires semantic agreement in stage roles, sample restrictions, variable lineage, estimands, model specifications, output contracts, and orchestration. Source-code or text similarity is not a success measure. It is checked separately as a leakage signal.

After the static contract check, run Stata from a fresh generated and output state. Compare observation counts, sample-flow checkpoints, summary cells, coefficients, standard errors, confidence intervals, p-values, stored-estimate counts, and final artifact hashes against evaluator-held reference metrics. Record every mismatch and whether it comes from the prompt, plugin guidance, authored code, data availability, or runtime environment.

Freeze the independent authored project before evaluation. Validate arbitrary JSON manifests by parsing them, and render stratified workbook sheets and PDFs to inspect rounding, labels, clipping, confidence intervals, and legends. A template-reuse audit reports an eligible labeled substep implemented directly as an advisory by default; it fails that choice only when the evaluator explicitly enables strict template-reuse enforcement. Semantic, runtime, numerical, and output-contract failures remain blocking in every mode.

`reproduced` means only that the declared semantic static contract passed. When execution is requested, run the frozen project from a clean generated-results state and call `research_output_check` with the actual log, approved README tree and variable descriptions, and exact deliverable counts. Neither verdict manages dependencies or certifies submission.
