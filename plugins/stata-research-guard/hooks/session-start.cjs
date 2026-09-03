"use strict";

process.stdout.write(
  "For Stata authoring, use stata-replication-workflow. Read complete general-rules before planning and reread the refactoring contract alongside code. Refactoring reduces indirection, not lines: repetition never authorizes a new program, ado, estimator/exporter wrapper, or generic helper. Keep estimator and exporter in a shallow loop. Existing-analysis refactors require fresh read-only stata-peer-audit before edits and after runtime inspection; auditors read the same rules. If a documented command is missing, install it separately, restart Stata, and use the original command. Give new or renamed .do files workflow-role names; update calls and docs together; do not retroactively rename. Exclude read-only, formatting, literal, verbatim moves, and unchanged execution.\n",
);
