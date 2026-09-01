# Command Evidence

Use this reference when choosing a consequential Stata command or output interface.

## Decision flow

Phase 1 includes the full common `main_rules` from [general-rules.md](general-rules.md). Later phases include its source path and SHA-256 reference without repeating the full text.

1. **Decide whether lookup is needed:** skip Guard for read-only explanation or review and for syntax-preserving comment, formatting, literal, or relocation changes. When a material command interface is at issue, continue.
2. **Discovery only when needed:** if the exact command is unresolved, call Phase 1 with only `request` and use the compact index. If the exact material command is already clear, skip Phase 1 and call Phase 2 directly. The server and paper examples do not choose for you.
3. **Phase 2 — help and catalog:** call the tool with `request` and exact `selected_commands`. Registered commands return bundled official or maintainer help and compact paper profiles. An exact out-of-dictionary topic is looked up from the active Stata ado-path and rendered by Guard; it returns `registry_status=outside_dictionary`, no bundled expanded document, and no paper profile. Read packets in request order. No project path or target-file fields are accepted.
4. **Combined Phase 3 — selected expanded documents and optional paper context:** call with the same `selected_commands` boundary and `expanded: true` when more context would materially help. Put only commands that need longer documentation in the nonempty exact `expanded_commands` subset. Independently add exact `selected_block_ids` chosen from the Phase 2 catalogs when paper context is needed. Documentation-only, paper-only, and combined requests are valid, but at least one selection must be present. Read only those commands' Stata 18 manual entries or limited author supplement and the selected slim exact paper blocks with optional raw `paper_log_contexts`.
5. Stop after Phase 2 when the help explains every action the user asks you to take, the implementation follows directly and is not difficult, and no material version, option interaction, returned-result, or downstream-interface question remains. Expand when one of those points is unresolved, when difficult code would benefit from a worked source context, or when the user requests explanation or a research-use example beyond syntax. Do not seek more context merely because the command is statistical, user-written, data-changing, or tied to an output step.

Empty, duplicate, unsafe, case-changed, compound, and `all` topics are errors. A registered multiword Stata spelling such as `export excel` is normalized to its registry key such as `export_excel` and reported in `topic_normalizations`. The live-help aliases `global`, `local`, `tempfile`, and `tempname` preserve the requested command label while resolving the official `macro` help topic. Use `ifcmd` for programming `if` and `if` for the observation qualifier. Every nonempty `expanded_commands` entry must be registered and also appear in `selected_commands`; empty optional Phase 3 arrays are equivalent to omission, while the combined Phase 3 request still needs at least one nonempty selection. If live or bundled help is unavailable or a material behavior detail remains unclear, state the limitation for that command branch. Do not substitute implementation source, paper code, memory, another command, or a manual implementation as grammar authority. Other selected commands continue independently.

## Evidence roles

- StataCorp help material governs official-command grammar in Phase 2; the combined Phase 3 supplies whole Stata 18 command entries from the installed PDF manuals only for exact `expanded_commands`. Options explicitly marked StataNow-only are not base Stata 18 features and require a matching active StataNow environment.
- Maintainer help, repositories, and SSC/RePEc documentation governs user-written-command grammar.
- For a user-written command whose expanded-document status is `same_source_as_help`, Phase 3 does not duplicate the same maintainer text. A `supplemental` author guide provides concepts or worked examples but does not replace missing syntax help.
- A compact paper profile helps the model decide whether a real block is worth reading without exposing the raw code in Phase 2.
- A selected paper block preserves the actual source span around the focus command. Its linked occurrences preserve the original target context.
- `paper_log_contexts` optionally carries a directly linked raw log excerpt and direct artifact metadata. It is source material, not an interpreted result-fact layer.
- Phase 1 `main_rules` supplies the shared prospective authoring boundary; later `main_rules` objects identify that exact text by path and hash.

These roles do not combine into a score, ranking, winner, pass/fail result, promotion state, or automatic-selection rule.

## Direct lookup boundary

The server uses `command_registry.json` for the compact Phase 1 index, reads `command_help_guides.json` and its rendered text files for registered Phase 2 commands, and performs an exact active-Stata `.sthlp` or `.hlp` lookup only for out-of-dictionary Phase 2 topics. It reads `expanded_command_guides.json` only for registered Phase 3 commands, groups paper data directly by `focus_command`, and attaches optional contexts by `parent_block_id`.

It does not depend on `command_paper_index`, paper-review summaries, integrity inventories, audit JSON, INCLUDE/EXCLUDE decisions, or coverage queues. It does not scan the user's project in Phase 2. Do not restore those layers or build a parallel validator around the data.

## Paper boundary

Paper examples are high-quality hints, not templates, answers, or oracles. Their surrounding estimator, sample, fixed effects, VCE, output code, and upstream or downstream choices do not own the current design. An `outreg2` block containing `areg` or `reghdfe` does not change a current `regress` specification.

Use a close block only to understand and harmonize code around the already selected focus command. Treat a distant block as reference context and write direct code under the guide and main rules. Multiple blocks may be chosen when the model needs genuinely different variants; the server does not rank or reorder them.

Return raw stored log text and direct artifact metadata without an interpreted result layer. A manually selected exact line range may omit a long nuisance-coefficient region while retaining its source line numbers and hashes; never truncate automatically by length. Do not extract `observed_output_facts`, classify returned state, add factual-limit labels, score output, infer missing results, or rerun papers to fill coverage. An empty `paper_log_contexts` array is normal.
