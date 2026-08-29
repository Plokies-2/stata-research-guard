# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Required flow

Every response includes the common `main_rules` from [general-rules.md](general-rules.md).

1. **Phase 1 — dictionary:** call `get_stata_command_evidence` with only `request`. Read the 109 canonical command records in registry order.
2. **Model selection:** choose one nonempty exact canonical key when the appropriate command is clear. Choose multiple keys only when different implementation stages need them or the current context leaves genuine alternatives. The server and paper examples do not choose for you.
3. **Phase 2 — help and catalog:** call the tool with `request` and exact `selected_commands`. Read one `command_evidence` packet per requested command, in request order. When multiple packets were requested, compare their documented purpose, required inputs, syntax, outputs, tradeoffs, and incompatibilities before deciding which to implement. Each packet contains `help_status`, Stata-rendered official or maintainer `command_help`, factual `full_manual_available`, and compact paper profiles. The retained full manual is not returned in Phase 2. No project path or target-file fields are accepted.
4. **Optional Phase 3 — raw paper context:** choose exact `selected_block_ids` from available Phase 2 packets only when useful. Call the tool with the same command boundary and those IDs. Read the exact raw blocks, linked original occurrences, and optional `paper_log_contexts` in requested order.
5. When help fully explains the requested action and the code follows directly from it, apply the help and main rules and write the simplest code that preserves the user's research choices and project contracts. Do not seek more context merely because the command is statistical, user-written, data-changing, or tied to an output step. The future expanded manual-plus-paper phase is not defined in the current contract.

Empty, duplicate, unknown, case-changed, alias-like, out-of-command, and `all` selections are errors. If a required command is outside the dictionary, report the missing command or feature and stop. If a selected command reports `help_status=partial` or `help_status=unavailable`, or a material syntax or behavior detail remains unclear, state the limitation for that command branch. Do not substitute an excerpt, implementation source, paper code, memory, another command, or a manual implementation as grammar authority. The compact catalog remains available as factual context even when help is unavailable. Other selected commands continue independently.

## Evidence roles

- StataCorp help material governs official-command grammar in Phase 2; retained manuals remain separate material for a later expansion design.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command grammar.
- A compact paper profile helps the model decide whether a real block is worth reading without exposing the raw code in Phase 2.
- A selected paper block preserves the actual source span around the focus command. Its linked occurrences preserve the original target context.
- `paper_log_contexts` optionally carries a directly linked raw log excerpt and direct artifact metadata. It is source material, not an interpreted result-fact layer.
- `main_rules` supplies the shared prospective authoring boundary.

These roles do not combine into a score, ranking, winner, pass/fail result, promotion state, or automatic-selection rule.

## Direct lookup boundary

The server uses `command_registry.json` for Phase 1, reads `command_help_guides.json` and its rendered text files for Phase 2, groups `paper_example_profiles.jsonl` and `high_quality_paper_blocks.jsonl` directly by `focus_command`, links occurrences named by the selected block, and attaches optional contexts by `parent_block_id`.

It does not depend on `command_paper_index`, paper-review summaries, integrity inventories, audit JSON, INCLUDE/EXCLUDE decisions, or coverage queues. It does not scan the user's project in Phase 2. Do not restore those layers or build a parallel validator around the data.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Their surrounding estimator, sample, fixed effects, VCE, output code, and upstream or downstream choices do not own the current design. An `outreg2` block containing `areg` or `reghdfe` does not change a current `regress` specification.

Use a close block only to understand and harmonize code around the already selected focus command. Treat a distant block as reference context and write direct code under the guide and main rules. Multiple blocks may be chosen when the model needs genuinely different variants; the server does not rank or reorder them.

Return raw stored log text and direct artifact metadata as-is. Do not extract `observed_output_facts`, classify returned state, add factual-limit labels, score output, infer missing results, or rerun papers to fill coverage. An empty `paper_log_contexts` array is normal.
