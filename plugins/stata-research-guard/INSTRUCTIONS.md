# Stata Research Guard Instructions

Use this plugin to obtain command evidence before making a consequential Stata command or output-interface choice. The evidence supports the model's judgment; it does not replace it.

## Evidence request

Call `get_stata_command_evidence` with the user's request. Add `project_path` and project-relative `target_files` when current project facts matter. Treat each task atom separately so estimation, postestimation, export, and graph construction do not borrow one another's candidates.

Read the returned official or maintainer documentation and examples. Use paper usage cards only as contextual evidence. A project observation records what exists at a path and line; it is not a recommendation to preserve an old command or workaround.

If evidence is incomplete, inspect the authoritative source or ask about the material research choice. Do not invent a source, convert a missing record into a prohibition, or let registry membership decide whether a valid Stata command may be used.

## Writing boundary

Preserve the user's literal scope and compatible project interfaces. Review-only requests authorize no project write. For a write, inspect the current source and choose the simplest implementation that satisfies the declared research and output requirements.

Prefer direct, readable Stata. Keep samples, models, fixed effects, weights, VCE, event windows, and output destinations visible. Avoid manual factor-variable substitutes, manual coefficient or standard-error reconstruction, unnecessary programs, positional dispatch, speculative options, and nested control flow that hides research choices.

Preserve native factor-variable and raw `e(b)` names. Preserve raw `outreg2` coefficient, standard-error, omitted/base, and note rows. Use the approved `outreg2_xlsx` helper only as a formatter after the model has decided that its declared interface fits the requested workbook. Do not treat the helper as a general selection exception.

When execution is requested, report runtime exit, log, produced files, and returned state as observations. Keep runtime completion, static diagnostics, and substantive or causal judgment distinct.
