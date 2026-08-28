# Stata Research Guard Instructions

Use this plugin to obtain command evidence before making a consequential Stata command or output-interface choice. The evidence supports the model's judgment; it does not replace it. The exposed command dictionary is the hard command boundary while the plugin is in use.

## Evidence request

First call `get_stata_command_evidence` without `selected_commands` and read the complete command dictionary. Choose one or more canonical command keys yourself. Then call it again with those `selected_commands`; only their guide and paper evidence should be loaded. Add `project_path` and project-relative `target_files` when current project facts matter.

Do not generate, substitute, abbreviate, or hand-implement a command outside the dictionary. If the requested workflow genuinely needs an absent command, abort and report the missing command or capability. An empty, duplicated, or unknown selection is an error rather than a fallback.

Read the returned complete official or maintainer guide first when `full_command_guides` is nonempty; it is supplied in full so syntax, warnings, examples, postestimation, and returned results can be resolved in the same request. Do not request a shorter excerpt to replace it or silently truncate it. Then apply the accompanying `general-rules.md`. The guide is grammar evidence, not permission to copy every option or change the research design.

A paper usage card contains a manually bounded `high_quality_example` block and any linked unmodified occurrences for the selected focus command. It is not a template. Treat its surrounding estimator, sample, fixed effects, VCE, and downstream code as context only; an `outreg2` example never authorizes replacing the project's chosen estimator. A project observation records what exists at a path and line; it is not a recommendation to preserve an old command or workaround.

If the reviewed occurrence, exact-index, high-quality-block, review-summary, and passing integrity-audit files are not installed together, or a selected command has no reviewed block, use the guide-only path. Never fall back to an unreviewed corpus row. If guide evidence or a material research choice is incomplete, report the gap or ask the user rather than inventing syntax. A close block can guide minimal harmonization around the selected command; a distant block is a hint, not a compulsory template.

## Writing boundary

Preserve the user's literal scope and compatible project interfaces. Review-only requests authorize no project write. For a write, inspect the current source and choose the simplest implementation that satisfies the declared research and output requirements.

Prefer direct, readable Stata under `general-rules.md`. Keep samples, models, fixed effects, weights, VCE, event windows, and output destinations visible. Avoid manual factor-variable substitutes, manual coefficient or standard-error reconstruction, unnecessary programs, positional dispatch, speculative options, and nested control flow that hides research choices. Do not add score, promotion, pass/fail, or generated-code grading logic.

Preserve native factor-variable and raw `e(b)` names. Preserve raw `outreg2` coefficient, standard-error, omitted/base, and note rows. Use the approved `outreg2_xlsx` helper only as a formatter after the model has decided that its declared interface fits the requested workbook. Do not treat the helper as a general selection exception.

When execution is requested, report runtime exit, log, produced files, and returned state as observations. Keep runtime completion, static diagnostics, and substantive or causal judgment distinct.
