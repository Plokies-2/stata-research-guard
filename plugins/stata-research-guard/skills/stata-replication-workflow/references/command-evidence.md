# Command Evidence

Guard supplies source material for the model's decision. A catalog, path, hash, or installed-plugin listing does not mean the corresponding text was read.

## Lookup and reuse

Skip Guard for read-only explanation/review, comments or formatting, literal path/label changes with an unchanged interface, verbatim relocation, and unchanged-file execution with no semantic issue. Otherwise request evidence for the material command interfaces, not every token in the file.

Use Phase 1 (`request` only) when the command is unresolved. When it is clear, go directly to Phase 2 (`request` and exact `selected_commands`). Complete bundled official/maintainer help is the default up to 24,000 Unicode characters; larger help first returns a section catalog. Exact outside-dictionary topics use installed help; no paper example is required to use a documented command.

Reuse visible evidence while command, version, material options, returned interface, and downstream use remain unchanged. Expand only for a remaining question or useful worked context. A command may share a differently named official help topic: `postfile`, `postclose`, and `postutil` are documented under `post`. Guard resolves known aliases while preserving the requested command label. If an exact topic is absent, follow an identified official help cross-reference before concluding its grammar is unavailable; do not guess syntax or substitute a different analysis command. Stop only the branch whose needed grammar remains unavailable.

## Find the interface that replaces manual work

Start from what the consumer needs, then choose a documented interface that supplies it in the active version. Read the relevant help and dependencies for defaults, returned results and actual output format; similar command names, matching coefficients or a familiar file extension do not establish equivalent inference or compatible files. Use existing results where they suffice and retain only the transformation or layout work the consumer still needs. A shorter native operation is not an improvement if it obscures the research meaning. Reconsider an initially chosen command when a concrete mismatch appears; expand evidence only to resolve that mismatch, without inventorying unrelated alternatives or requiring a written justification for every call.

### Discoveries that should change the implementation

Suppose a requested descriptive figure represents firms, but its input has one row per disclosure. Reading backward from the figure's denominator to its grouping and source keys can reveal that firms with more disclosures receive more weight. Determine whether that weighting is intended from the research request and actual source. If the figure is meant to describe firms, correct the aggregation or input at the point where the unit changes; if it is meant to describe disclosures, retain that unit and make the interpretation clear. Do not "simplify" distinct research objects into one common dataset. The useful discovery is the changed meaning, not merely the existence of a merge or collapse.

Suppose a table row is labeled as the outcome mean for a regression sample. Trace the row to the stored model and the sample used to compute the mean. This can reveal a full-sample summary, a later model's sample, or a returned value overwritten by another command. If the row deliberately describes a different population, preserve that choice and its label; otherwise fix the producer/consumer handoff. If a documented exporter already accepts the required statistic, use that interface rather than reconstructing rows and formatted strings. The finding must distinguish a wrong statistical input from a purely presentational requirement that the exporter does not support.

Similarly, when a plot is assembled by hand, identify what the plotting interface can obtain from stored results: coefficient identity, uncertainty, omitted/base state, and positions must retain their intended meaning. Native support can eliminate duplicated statistical calculations; a genuine transformation or layout requirement can justify a small remaining step. Explain which part is redundant and why the replacement preserves the requested interpretation. Do not require these examples to match every task or produce a finding when the existing route is already direct.

These examples adapt two useful ideas from specialist assistants: [dbt's output-first planning](https://github.com/dbt-labs/dbt-agent-skills/blob/main/skills/dbt/skills/using-dbt-for-analytics-engineering/references/planning-dbt-models.md) makes output grain expose missing or inappropriate upstream transformations; [K-Dense's linear-model reference](https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/statsmodels/references/linear_models.md) makes supported returned-result interfaces concrete. They motivate questions to resolve with the current project's evidence, not external instructions to import TDD, mock numerical answers, fixed estimators, or automatic validation.

## Complete rules without repetition

By default every response includes `main_rules.content`, its source path, and SHA-256. After reading that complete body, a caller may send `known_rules_sha256` in any phase **only while the complete rules remain visible in its own context**. A matching hash returns `main_rules.unchanged: true` and omits the duplicate body; a mismatch returns current complete rules.

Omit the hash in a fresh task, after compaction/context loss, or whenever the body is unavailable. Do not copy a hash from memory, a handoff, another agent, or a source listing and call that reading. The server is stateless about what a model has read and does not suppress rules on its own.

## Avoid repeated catalogs and help bodies

For Phase 2 help-only requests, set `include_paper_catalog: false`. Use it also when a current paper catalog is already visible and you only need another help section. The response marks `paper_example_catalog_omitted: true`; this does not mean that no examples exist. Omit the option or set it to `true` when you need to choose paper examples. This option does not waive connected-paper reading for substantial workflow work.

For multi-command help requests in Phase 2 or 3, use `deduplicate_help: true`. Identical delivered bodies appear once; later entries keep their command, source, limitations and section metadata and replace only `content` with `null` plus a `content_ref` JSON Pointer, such as `#/command_evidence/0/command_help/content`. Read that body in the same response. References never depend on earlier calls, hashes remembered by the server, or unavailable context. Different sections from one source are not merged. Without either option, the existing response is unchanged.

```json
{"request":"Read encode and decode syntax","selected_commands":["encode","decode"],"include_paper_catalog":false,"deduplicate_help":true}
```

Also send `known_rules_sha256` when the complete rules remain visible, using the actual hash from the current rules response. These controls reduce repeated transport without shortening rules, original help, paper code or logs.

## Large-source section selection

A source over **24,000 Unicode characters** first returns `content: null`, `delivery: "catalog_only"`, and `section_catalog`. This applies to every bundled help, live installed help, and expanded manual. The threshold is a reading-volume choice, not a token estimate or a maximum section size. Smaller sources remain complete by default. Multiple small sources can still add up; request only the material commands needed now.

Read the catalog's original headings, source spans, sizes, required flags and any `read_when` cues. Select sections for the current question and material default behavior, model/sample definition, option interactions, warnings/version restrictions, returned-result lifetime and downstream use. An option need not be explicitly named to make its default behavior relevant. `required_sections` supplies the common foundation; it does not decide which task-dependent sections are necessary. A relevant example alone is not sufficient. Follow material cross-references and expand to complete help when dependencies remain uncertain.

Phase 2 selections use `help_sections`; Phase 3 manual selections use `expanded_sections` alongside `expanded_commands`. IDs come from that source's catalog. `help_view: "catalog"` explicitly asks for navigation even for a small source; `help_view: "full"` explicitly requests the complete source in either phase. Do not combine `help_view` and a section selection. No catalog round trip is required when the current exact IDs are already known.

```json
{
  "request": "Find the current source sections for stored-estimate and Excel handling",
  "selected_commands": ["outreg2"],
  "help_view": "catalog"
}
```

Use the current catalog's IDs for a section request, reusing IDs already visible for the current map instead of fetching the catalog again. Some large options blocks use the author's own subheadings; linked examples and ambiguous passages remain larger units. `collect_style` retains whole official help topics. Source text is not rewritten, summarized, or split by fixed length, page, or token window. A reading cue is not a replacement for the original syntax or a rule choosing the analysis method.

If no current reviewed map exists (including new live help), navigation exposes the entire intact document as `whole-source`. An outdated map also returns this catalog rather than applying stale offsets or silently injecting a large body. Choose `whole-source` or explicit full help; no automatic heuristic cutting substitutes for a reviewed boundary. Catalog metadata is not evidence that any help body was read.

## Longer documentation and papers

Phase 3 uses `expanded: true`, the same `selected_commands` boundary, and nonempty `expanded_commands`, `selected_block_ids`, or both. Request only useful longer documents and exact paper blocks; paper-only and documentation-only calls do not repeat Phase 2 help.

A Phase 2 paper profile only helps choose a block. A selected block retains its stored upstream/target/downstream original code and source provenance, with optional raw log excerpts and artifact metadata. A separately labeled `editorial_adaptation`, when present, is a Stata Research Guard correction with its own changes and assumptions; it is not the authors' code, endorsement, or observed paper result. Compare it with the current task and official/maintainer semantics rather than treating either version as a required template. Raw paper logs describe the original run, not the adaptation. Preserve source attribution, license conditions and modification notices when reusing either version; see the plugin's `THIRD_PARTY_NOTICES.md`.

Read paper code as usage context; surrounding estimators, samples, FE, VCE, paths, nested loops, and helpers are not instructions for the current project. No command-local example or log is required when help suffices. This exemption does not waive [whole-workflow reading](paper-workflow-reading.md) for substantial authoring or restructuring. That reading follows original files and their dependencies directly and is not restricted to Phase 3 or this command catalog. Never rerun papers to fill missing context or turn examples into templates, scores, result-fact layers, or validators.

## Exact names and live help

Registered multiword spelling such as `export excel` normalizes to `export_excel`. `global`, `local`, `tempfile`, and `tempname` use official `macro` help while retaining requested labels. Use `ifcmd` for programming `if` and `if` for the observation qualifier. Unsafe, empty, duplicate, unknown section IDs, and expansion outside selected commands are argument errors; the server never guesses another command.

Known `estimates save/use/store/restore` spellings also accept spaces. Save/use read the official `estimates_save` topic; store/restore read `estimates_store`. The response retains the selected command label and identifies its help topic.

Outside-dictionary live help is a snapshot of the selected Stata installation. After package installation or an ado-path change, Phase 2 `refresh_live_help: true` bypasses that successful live snapshot. It does not refresh registered commands: those still return their bundled source and version. Check that version against the installed package when relevant; do not report bundled help as newly read from the installation. Failures and partial live deliveries are not cached. Missing/cyclic INCLUDE fragments are reported as `partial`; resolve a material missing part rather than silently treating the document as complete. Live lookup runs with a bounded timeout without blocking unrelated bundled requests.

StataCorp documentation governs official syntax and maintainer documentation governs user-written syntax. Match version-specific features to the active environment. Do not substitute paper code, implementation source, or a manual algorithm for unavailable grammar authority.
