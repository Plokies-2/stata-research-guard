# Command Evidence

Read this reference only when a material Stata command or output interface requires Guard evidence. Every phase returns the complete compact `main_rules` from [general-rules.md](general-rules.md), with its path and SHA-256.

## Phases

1. **No lookup:** skip Guard for read-only review or explanation, comment or formatting-only edits, literal path or label changes with an unchanged command interface, verbatim relocation, and unchanged-file execution with no semantic issue.
2. **Phase 1 discovery:** when the exact material command is unresolved, send only `request` and use the compact index as a starting point. The server does not choose or rank commands.
3. **Phase 2 help:** when the command is clear, skip Phase 1 and send `request` plus nonempty exact `selected_commands`. Registered commands return bundled official or maintainer help, expanded-document status, and compact paper profiles. An exact outside topic uses active installed help and has no bundled expansion or paper catalog.
4. **Phase 3 context:** send the same `selected_commands`, `expanded: true`, and at least one nonempty exact `expanded_commands` subset or `selected_block_ids` list. Request only the documentation or blocks that materially help; paper-only, documentation-only, and combined requests are valid.
5. Stop after Phase 2 when help fully resolves the action, version, material options, returned interface, and downstream use. Expand only for a remaining question, difficult implementation, or a requested research-use example.

## Exact boundaries

- Empty, duplicate, unsafe, case-changed, compound, and `all` topics are errors. Every expanded command must be registered and already selected. A missing help topic stops only its affected branch.
- Registered multiword spelling such as `export excel` normalizes to `export_excel`. `global`, `local`, `tempfile`, and `tempname` use official `macro` help while retaining their requested labels; use `ifcmd` for programming `if` and `if` for the observation qualifier.
- StataCorp help governs official-command grammar; maintainer help or repository documentation governs user-written commands. A StataNow-only option requires a matching active environment. Never substitute paper code, implementation source, memory, another command, or a manual implementation for missing grammar authority.
- A Phase 2 profile only helps decide whether to read a block. A selected Phase 3 block preserves its raw code and source provenance; optional `paper_log_contexts` contain raw stored excerpts and direct artifact metadata. Empty context is normal.
- Paper code, logs, and surrounding estimator, sample, controls, FE, VCE, event window, output, and paths are nonbinding. Do not summarize them into result facts, infer missing output, score or rank them, rerun papers for coverage, or build a parallel validator.
