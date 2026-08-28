# Stata Authoring Conventions

Use these conventions for newly written or actively revised code. They are design guidance for the model, not retroactive errors for untouched legacy files.

## Readability

- Prefer a direct statement or one flat loop when it keeps the sample, model, fixed effects, weights, VCE, event window, and output visible.
- Avoid chained aliases, positional job strings, registries, one-use programs, speculative branches, unused options, and abstraction added only for possible future reuse.
- Keep persistent-variable creation, definition, and label together. Preserve imported source labels unless the user asks to change them.
- Use `///` only when the next physical line continues the same command.

## Data state

- Verify merge keys and retained states. Do not use `merge m:m`, force-drop duplicates, or hide a material failure behind a dependency probe.
- Preserve original inputs and submitted comparison baselines. Save a new or explicitly approved output rather than overwriting evidence.
- Make consequential sample restrictions and missing-data choices visible near the command they affect.

## Estimation

- Keep factor-variable interactions native. Preserve raw `e(b)` names for tables and event-study selectors.
- Do not create manual year-treatment dummies or reconstruct coefficients and standard errors when Stata already returns the required state.
- Choose fixed effects, weights, VCE, clustering, reference periods, and postestimation from the research contract and documented command semantics.

## Outputs

- Preserve raw coefficient, standard-error, omitted/base, header, and note rows in regression tables.
- Use a direct export when it is clearer. Treat the approved `outreg2_xlsx` program as one available formatter with declared inputs, not as a machine-selected requirement.
- Export event-study figures after the estimate they consume. Use stable native coefficient names rather than relabeled synthetic identifiers.
- Create Excel, PDF, and `.ster` artifacts only when they serve the requested workflow. Do not add TeX, installers, dependency inventories, or packaging scaffolds without scope authority.

## Claims

An exit code, log, file hash, workbook sheet, PDF, or returned state is runtime evidence. A static observation is not a syntax result; runtime completion is not a causal-validity finding. Report each claim at its actual level.
