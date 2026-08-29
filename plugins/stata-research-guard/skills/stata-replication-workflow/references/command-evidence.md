# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Required flow

Every response includes the common `main_rules` from [general-rules.md](general-rules.md).

1. **Phase 1 — dictionary:** call `get_stata_command_evidence` with only `request`. Read the 109 canonical command records in registry order.
2. **Model selection:** choose one nonempty exact canonical key when the appropriate command is clear. Choose multiple keys only when different implementation stages need them or the current context leaves genuine alternatives. The server and paper examples do not choose for you.
3. **Phase 2 — help and catalog:** call the tool with `request` and exact `selected_commands`. Read one `command_evidence` packet per requested command, in request order. When multiple packets were requested, compare their documented purpose, required inputs, syntax, outputs, tradeoffs, and incompatibilities before deciding which to implement. Each packet contains `help_status`, Stata-rendered official or maintainer `command_help`, factual `expanded_documentation` status, and compact paper profiles. Expanded documents and raw paper code are not returned in Phase 2. No project path or target-file fields are accepted.
4. **Combined Phase 3 — selected expanded documents and optional paper context:** call with the same `selected_commands` boundary and `expanded: true` when more context would materially help. Put only commands that need longer documentation in the nonempty exact `expanded_commands` subset. Independently add exact `selected_block_ids` chosen from the Phase 2 catalogs when paper context is needed. Documentation-only, paper-only, and combined requests are valid, but at least one selection must be present. Read only those commands' Stata 18 manual entries or limited author supplement and the selected slim exact paper blocks with optional raw `paper_log_contexts`.
5. Stop after Phase 2 when the help explains every action the user asks you to take, the implementation follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream-interface question remains. Expand when one of those points is unresolved, when difficult code would benefit from a worked source context, or when the user requests explanation or a research-use example beyond syntax. Do not seek more context merely because the command is statistical, user-written, data-changing, or tied to an output step.

Empty, duplicate, unknown, case-changed, alias-like, out-of-command, and `all` selections are errors. Every `expanded_commands` entry must also be in `selected_commands`; the server never expands the rest automatically. If a required command is outside the dictionary, report the missing command or feature and stop. If a selected command reports `help_status=partial` or `help_status=unavailable`, or a material syntax or behavior detail remains unclear, state the limitation for that command branch. Do not substitute an excerpt, implementation source, paper code, memory, another command, or a manual implementation as grammar authority. The compact catalog remains available as factual context even when help is unavailable. Other selected commands continue independently.

## Evidence roles

- StataCorp help material governs official-command grammar in Phase 2; the combined Phase 3 supplies whole Stata 18 command entries from the installed PDF manuals only for exact `expanded_commands`. Options explicitly marked StataNow-only are not base Stata 18 features and require a matching active StataNow environment.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command grammar.
- For a user-written command whose expanded-document status is `same_source_as_help`, Phase 3 does not duplicate the same maintainer text. A `supplemental` author guide provides concepts or worked examples but does not replace missing syntax help.
- A compact paper profile helps the model decide whether a real block is worth reading without exposing the raw code in Phase 2.
- A selected paper block preserves the actual source span around the focus command. Its linked occurrences preserve the original target context.
- `paper_log_contexts` optionally carries a directly linked raw log excerpt and direct artifact metadata. It is source material, not an interpreted result-fact layer.
- `main_rules` supplies the shared prospective authoring boundary.

These roles do not combine into a score, ranking, winner, pass/fail result, promotion state, or automatic-selection rule.

## Direct lookup boundary

The server uses `command_registry.json` for Phase 1, reads `command_help_guides.json` and its rendered text files for Phase 2, reads `expanded_command_guides.json` only for combined Phase 3, groups `paper_example_profiles.jsonl` and `high_quality_paper_blocks.jsonl` directly by `focus_command`, reads source provenance from the block's named occurrences, and attaches optional contexts by `parent_block_id`.

It does not depend on `command_paper_index`, paper-review summaries, integrity inventories, audit JSON, INCLUDE/EXCLUDE decisions, or coverage queues. It does not scan the user's project in Phase 2. Do not restore those layers or build a parallel validator around the data.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Their surrounding estimator, sample, fixed effects, VCE, output code, and upstream or downstream choices do not own the current design. An `outreg2` block containing `areg` or `reghdfe` does not change a current `regress` specification.

Use a close block only to understand and harmonize code around the already selected focus command. Treat a distant block as reference context and write direct code under the guide and main rules. Multiple blocks may be chosen when the model needs genuinely different variants; the server does not rank or reorder them.

Return raw stored log text and direct artifact metadata without an interpreted result layer. A manually selected exact line range may omit a long nuisance-coefficient region while retaining its source line numbers and hashes; never truncate automatically by length. Do not extract `observed_output_facts`, classify returned state, add factual-limit labels, score output, infer missing results, or rerun papers to fill coverage. An empty `paper_log_contexts` array is normal.
