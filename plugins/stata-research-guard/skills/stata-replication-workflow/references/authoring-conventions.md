# Stata Authoring Conventions

Follow the current [general-rules.md](general-rules.md) already read for this task; do not reread it for every block. Apply it prospectively, not as a retroactive error list for untouched legacy code.

Use this companion only for details that do not replace the common rules:

- Keep persistent-variable creation, definition, and label together; preserve imported source labels unless the user asks to change them.
- Verify merge keys and retained states. Do not use `merge m:m`, force-drop duplicates, or conceal a material failure behind a dependency probe.
- Keep consequential sample restrictions and missing-data choices visible near the command they affect.
- Use `///` only when the next physical line continues the same command.
- Preserve original inputs and submitted comparison baselines; save a new or explicitly approved output rather than overwriting evidence.
- A log, file hash, workbook sheet, PDF, exit code, or returned state is runtime evidence. A static observation is not a syntax result, and runtime completion is not a causal-validity finding.

For command grammar, options, and returned state, consult the official or maintainer guide through [command-evidence.md](command-evidence.md); a paper occurrence remains contextual usage evidence.
