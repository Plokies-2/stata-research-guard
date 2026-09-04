# Command Evidence

Guard supplies source material for the model's decision. A catalog, path, hash, or installed-plugin listing does not mean the corresponding text was read.

## Lookup and reuse

Skip Guard for read-only explanation/review, comments or formatting, literal path/label changes with an unchanged interface, verbatim relocation, and unchanged-file execution with no semantic issue. Otherwise request evidence for the material command interfaces, not every token in the file.

Use Phase 1 (`request` only) when the command is unresolved. When it is clear, go directly to Phase 2 (`request` and exact `selected_commands`). Full bundled official/maintainer help is the default. Exact outside-dictionary topics use installed help; no paper example is required to use a documented command.

Reuse visible evidence while command, version, material options, returned interface, and downstream use remain unchanged. Expand only for a remaining question or useful worked context. A missing topic stops only the affected branch.

## Complete rules without repetition

By default every response includes `main_rules.content`, its source path, and SHA-256. After reading that complete body, a caller may send `known_rules_sha256` in any phase **only while the complete rules remain visible in its own context**. A matching hash returns `main_rules.unchanged: true` and omits the duplicate body; a mismatch returns current complete rules.

Omit the hash in a fresh task, after compaction/context loss, or whenever the body is unavailable. Do not copy a hash from memory, a handoff, another agent, or a source listing and call that reading. The server is stateless about what a model has read and does not suppress rules on its own.

## Optional original help sections

Keep ordinary complete-help requests for small documents or broad questions. Two large sources also have exact navigation:

- `outreg2`: `reference` contains the complete description, syntax, and all options; `example-0` through `example-20` preserve whole maintainer examples; `faq-and-source` preserves the closing FAQ and source information.
- `collect_style`: each section is one complete official help topic, such as `collect_style_cell` or `collect_style_row`.

Phase 2 with `help_view: "catalog"` returns exact section IDs, headings, and source spans for these commands. Its `content: null` and `delivery: "catalog_only"` mean no help body was delivered. Other commands return complete help rather than an empty catalog.

Request known IDs directly in Phase 2, for example:

```json
{
  "request": "Read outreg2 syntax, options, stored estimates, and Excel use",
  "selected_commands": ["outreg2"],
  "help_sections": {"outreg2": ["reference", "example-3", "example-12"]}
}
```

Selected sections retain original wording, source order, and spans; the source hash identifies the complete underlying help, not a shortened replacement guide. Read the syntax/options reference as well as any relevant example. A section selection is limited evidence: follow material cross-references and option interactions with more sections or complete help. Do not assume omitted sections are irrelevant merely because they were not returned. Omit `help_view` and `help_sections` to retrieve complete help. A stale source map falls back to full current help.

This is source-native navigation, not fixed-length slicing, automatic snippets, or an SA-written substitute. There is no requirement to fetch a catalog first when the exact IDs are known.

## Longer documentation and papers

Phase 3 uses `expanded: true`, the same `selected_commands` boundary, and nonempty `expanded_commands`, `selected_block_ids`, or both. Request only useful longer documents and exact paper blocks; paper-only and documentation-only calls do not repeat Phase 2 help.

A Phase 2 paper profile only helps choose a block. A selected block retains its complete stored upstream/target/downstream code and source provenance, with optional raw log excerpts and artifact metadata. Read it as usage context; surrounding estimators, samples, FE, VCE, paths, nested loops, and helpers are not instructions for the current project. No example or log is required when help suffices. Never rerun papers to fill missing context or turn examples into templates, scores, result-fact layers, or validators.

## Exact names and live help

Registered multiword spelling such as `export excel` normalizes to `export_excel`. `global`, `local`, `tempfile`, and `tempname` use official `macro` help while retaining requested labels. Use `ifcmd` for programming `if` and `if` for the observation qualifier. Unsafe, empty, duplicate, unknown section IDs, and expansion outside selected commands are argument errors; the server never guesses another command.

Live help is a snapshot of the selected Stata installation. After package installation or an ado-path change, use Phase 2 `refresh_live_help: true` to bypass a successful cached snapshot. Failures and partial deliveries are not cached. Missing/cyclic INCLUDE fragments are reported as `partial`; resolve a material missing part rather than silently treating the document as complete. Live lookup runs with a bounded timeout without blocking unrelated bundled requests.

StataCorp documentation governs official syntax and maintainer documentation governs user-written syntax. Match version-specific features to the active environment. Do not substitute paper code, implementation source, or a manual algorithm for unavailable grammar authority.
