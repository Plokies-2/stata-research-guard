# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Required flow

Every response includes the common `main_rules` from [general-rules.md](general-rules.md).

1. **Phase 1 — dictionary:** call `get_stata_command_evidence` with only `request`. Read the 109 canonical command records in registry order.
2. **Model selection:** choose one or more nonempty exact canonical keys from the user's requirements and current project context. The server and paper examples do not choose for you.
3. **Phase 2 — guide and catalog:** call the tool with `request` and exact `selected_commands`. Read only those commands' complete guides and compact paper profiles. No project path or target-file fields are accepted.
4. **Optional Phase 3 — raw paper context:** choose exact `selected_block_ids` from the Phase 2 catalog only when useful. Call the tool with the same command boundary and those IDs. Read the exact raw blocks, linked original occurrences, and optional `paper_log_contexts` in requested order.
5. Apply the guide and main rules, then write the simplest code that preserves the user's research choices and project contracts.

Empty, duplicate, unknown, case-changed, alias-like, out-of-command, and `all` selections are errors. If a required command is outside the dictionary, report the missing command or feature and stop. If a selected command lacks a complete guide, Phase 2 aborts with `full_command_guide_unavailable`; do not substitute an excerpt, implementation source, paper code, memory, another command, or a manual implementation.

## Evidence roles

- StataCorp manual and help material governs official-command grammar.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command grammar.
- A compact paper profile helps the model decide whether a real block is worth reading without exposing the raw code in Phase 2.
- A selected paper block preserves the actual source span around the focus command. Its linked occurrences preserve the original target context.
- `paper_log_contexts` optionally carries a directly linked raw log excerpt and direct artifact metadata. It is source material, not an interpreted result-fact layer.
- `main_rules` supplies the shared prospective authoring boundary.

These roles do not combine into a score, ranking, winner, pass/fail result, promotion state, or automatic-selection rule.

## Direct lookup boundary

The server uses `command_registry.json` for Phase 1, groups `paper_example_profiles.jsonl` and `high_quality_paper_blocks.jsonl` directly by `focus_command`, links occurrences named by the selected block, and attaches optional contexts by `parent_block_id`.

It does not depend on `command_paper_index`, paper-review summaries, integrity inventories, audit JSON, INCLUDE/EXCLUDE decisions, or coverage queues. It does not scan the user's project in Phase 2. Do not restore those layers or build a parallel validator around the data.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Their surrounding estimator, sample, fixed effects, VCE, output code, and upstream or downstream choices do not own the current design. An `outreg2` block containing `areg` or `reghdfe` does not change a current `regress` specification.

Use a close block only to understand and harmonize code around the already selected focus command. Treat a distant block as reference context and write direct code under the guide and main rules. Multiple blocks may be chosen when the model needs genuinely different variants; the server does not rank or reorder them.

Return raw stored log text and direct artifact metadata as-is. Do not extract `observed_output_facts`, classify returned state, add factual-limit labels, score output, infer missing results, or rerun papers to fill coverage. An empty `paper_log_contexts` array is normal.
