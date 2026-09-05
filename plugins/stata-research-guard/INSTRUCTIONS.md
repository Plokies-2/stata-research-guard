# Stata Research Guard Instructions

Use this plugin to write Stata that a researcher can follow from data and sample through estimation, stored results, and outputs. The researcher and model choose the research design.

Start with `skills/stata-replication-workflow/SKILL.md`. It coordinates concrete peer advice before refactoring, execution with mcpStata, and independent reading after substantive code changes. Read-only and interface-preserving edits do not need code-change review. Existing helpers deserve scrutiny; a successful run or fewer lines does not prove readable code.

Prefer integrated preparation/panel, descriptives and basic figures, regression with its estimates/tables/figures, and requested robustness. Keep sections together rather than creating a file per command, outcome, or output. Preserve the active project's scope and contracts.

For substantial workflow authoring or restructuring, read a relevant paper's actual connected data-to-output code as directed by `skills/stata-replication-workflow/references/paper-workflow-reading.md`, even when command help is sufficient. Choose and challenge the source yourself; existing examples and journal prestige do not make code canonical. Explain what improves the current workflow and what should not be copied. Integrate this reading into existing peer advice, without an executable checker or additional review chain.

Lookup and reuse details are maintained only in `skills/stata-replication-workflow/references/command-evidence.md`. Help over 24,000 Unicode characters returns a source-section catalog first; choose relevant sections with their required foundations, or explicitly request full help. Small help and complete common rules are the defaults. A caller may explicitly reuse the hash of complete rules still visible in its context. No automatic summaries or hidden relevance selection. Selected paper blocks retain their original code and optional raw logs.

Use documented native commands and exporters first. Keep consequential sample/specification and the estimator visible; restrict any manual postprocessing or required native-command callback to its concrete purpose. Do not create semantic validators, scores, audit state, or templates that override research judgment.
