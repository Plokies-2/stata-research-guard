# Stata Research Guard

Stata Research Guard is a small evidence provider for Stata research work. The model chooses commands and research specifications; the plugin supplies the common main rules, a closed 109-command dictionary, complete selected-command guides, and selected real-paper context.

## One tool, three direct lookups

The `stataResearchGuard` MCP server exposes one stateless tool:

```text
get_stata_command_evidence
```

Every response includes the bundled `general-rules.md` as `main_rules`.

1. **Phase 1 — command dictionary:** send `request` only. The response contains the 109 canonical command records in registry order. Each record describes the command's role, capabilities, required input state, output interface, and tradeoffs. The model chooses exact command keys itself.
2. **Phase 2 — selected guides and paper catalog:** send `request` and nonempty exact `selected_commands`. The response contains only those commands' complete official or maintainer guides and compact paper profiles. If any selected command has no complete guide, the request aborts with `full_command_guide_unavailable`; there is no excerpt, substitute command, paper-only replacement, or manual implementation.
3. **Phase 3 — selected raw paper context:** when a paper profile is useful, send the same command boundary and nonempty exact `selected_block_ids`. The response contains only the exact selected paper blocks, their linked original occurrences, and `paper_log_contexts`. A directly linked raw log excerpt or artifact metadata appears there when available; otherwise the array is empty.

There is no project scanner in the MCP path. Phase 2 does not read user project files or use existing command frequency to influence selection.

## Data shipped

- `command_registry.json`: 109 canonical commands.
- `full_command_guides.json` and guide files: 107 complete guides. `cgmreg` and `jwdidstacked` have no complete guide and therefore fail closed when selected.
- `paper_example_profiles.jsonl`: 166 compact profiles grouped directly by `focus_command`.
- `high_quality_paper_blocks.jsonl`: 166 manually bounded real-paper code blocks.
- `paper_usage_occurrences.jsonl`: original target-command occurrences linked from each block.
- `paper_execution_contexts.jsonl`: 12 optional raw-log or direct-artifact attachments. This is not a coverage target.

The server groups profiles and blocks directly by their canonical command and attaches optional raw contexts by `parent_block_id`. It does not require `command_paper_index`, paper-review summaries, integrity inventories, pass flags, or independent-audit packets.

## Evidence boundaries

The complete StataCorp or maintainer guide is the syntax authority. It does not choose the estimand, sample, estimator, controls, fixed effects, weights, VCE, event window, or output design.

Paper examples are high-quality hints, not templates, answers, or oracles. The current project and the model's selected command and research specification take priority. A nearby block may clarify the selected command's surrounding workflow; a distant block is reference context only. In particular, `areg`, `reghdfe`, or another estimator surrounding an `outreg2` example never replaces a current `regress` choice.

Raw log text and direct artifact metadata report only what the original package stored. The plugin does not extract `observed_output_facts`, infer returned-state claims, score the result, or certify correctness or causal validity. A missing log stays missing; the plugin does not rerun papers to fill coverage.

The server never scores, ranks, recommends, promotes, reorders, or automatically selects a command or paper block. It does not build INCLUDE/EXCLUDE, winner, pass/fail, `audit_pending`, or semantic-validation gates. If a required command is outside the dictionary, the workflow reports the missing command or capability and stops.

## Authoring boundary

The bundled skill favors direct Stata that keeps the active sample, model, fixed effects, weights, VCE, event axis, and output decisions visible near the command. Native factor-variable and raw `e(b)` names are preserved. Unnecessary programs, deep loops, positional dispatch, speculative options, and scratch package/file checks are avoided.

The canonical references are:

- `skills/stata-replication-workflow/references/general-rules.md`
- `skills/stata-replication-workflow/references/command-evidence.md`
- `skills/stata-replication-workflow/references/authoring-conventions.md`
- `skills/stata-replication-workflow/references/readme-contract.md`
- `skills/stata-replication-workflow/references/workflow-taxonomy.md`

## Software checks

The product smoke tests verify only the MCP phase shapes, exact-key selection, full-guide transport, and selected raw block/occurrence/log attachment:

```powershell
node --test tests/server.test.cjs
Get-ChildItem tests\*.test.cjs | ForEach-Object { node --test $_.FullName }
node scripts\verify_plugin_bundle.cjs
```

These are transport and bundle checks. They do not judge paper results, generated Stata meaning, code quality, research specifications, or causal validity.
