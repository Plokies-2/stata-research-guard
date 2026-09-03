"use strict";

process.stdout.write(
  "For material Stata authoring, use stata-replication-workflow. Existing-analysis refactors and structural revisions require fresh read-only stata-peer-audit before edits and after runtime inspection; other material writes require the post-audit. Wait for findings before delivery. If a selected documented command is observed missing, install it separately from official or maintainer guidance, restart Stata, and use the original command. Give new or approved structurally renamed .do modules workflow-role names and update their calls and docs together; do not retroactively rename. Exclude read-only, comment, whitespace, formatting-only, literal path or label, verbatim-move, and unchanged-execution work.\n",
);
