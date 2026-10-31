# Command Evidence

Guard supplies source material for the model's decision. A catalog, path, hash, or installed-plugin listing does not mean the corresponding text was read.

## Lookup and reuse

Decide what changes before calling Guard. Skip it for read-only explanation/review, comments or formatting, literal path/label changes with an unchanged interface, verbatim relocation, and unchanged-file execution with no semantic issue. Inspect the affected source, caller and output directly; do not reread long references just to claim an exemption. Moving code still requires preserving call order, macro scope and returned-result lifetime. Changing a label's statistical meaning, a coefficient selector, sample, VCE or an unfamiliar output option requires the relevant research or interface evidence. Otherwise request evidence for the material command interfaces, not every token in the file.

Familiar language scaffolding does not require a help lookup, including when first introducing it in this task: ordinary `foreach`/`forvalues`, block `if`/`else`, braces, and ordinary local-macro assignment and expansion. Use it directly when its behavior is understood. An optional help timeout or unavailable topic does not prohibit that syntax and is not a reason to unroll a mechanical loop into copied analysis blocks. Resolve an actual uncertainty about loop bounds, varlist expansion, quoting or scope when it matters; do not treat every basic construct as an unresolved interface. This exemption does not waive evidence for the estimator, data transformation, sample definition, inference, returned-result or exporter interface inside the block.

Display-string or spacing values inside an already-understood option remain exempt when syntax and statistical meaning are unchanged. A new or unfamiliar option, unresolved quoting/parsing, or changed statistical content needs its relevant evidence; editing an option value alone is not the trigger. Once connectivity is established, do not replace an exempt lookup with a repeated discovery or connection-check call. A follow-up request alone does not invalidate still-visible evidence; look up only the changed interface or unresolved question.

An invalid section selection returns the rejected IDs, current valid IDs and their titles for that source. Correct `help_sections` (Phase 2) or `expanded_sections` (Phase 3) directly from that response; do not guess option-shaped IDs or repeat the catalog call. Retrieve more navigation only if context is still missing. The error delivers no help body and does not select a replacement.

Use Phase 1 (`request` only) when the command is unresolved. When it is clear, go directly to Phase 2 (`request` and exact `selected_commands`). Complete bundled official/maintainer help is the default up to 24,000 Unicode characters; larger help first returns a section catalog. The exact topics `estimates_save`, `post`, `macro`, `estimates`, and `estimates_store`, including their known aliases, also have bundled Stata 18 help without extending the discovery dictionary. Other outside-dictionary topics use installed help; no paper example is required to use a documented command. Explicit `help_source: "installed"` still reads the selected installation.

Reuse visible evidence while command, version, material options, returned interface, and downstream use remain unchanged. Expand only for a remaining question or useful worked context. A command may share a differently named official help topic: `postfile`, `postclose`, and `postutil` are documented under `post`. Guard resolves known aliases while preserving the requested command label. If an exact topic is absent, follow an identified official help cross-reference before concluding its grammar is unavailable; do not guess syntax or substitute a different analysis command. Stop only a branch whose material interface remains unresolved without the missing evidence; a failed lookup alone does not override the exemptions above or invalidate already-understood basic syntax.

The tool infers the phase from the supplied fields; do not send `phase` or `commands`. Start with this exact shape, adding section controls only when needed:

```json
{"request":"Read the changed output interface","selected_commands":["estout"],"include_paper_catalog":false}
```

For a narrow follow-up, reuse visible help or select known current section IDs directly. If IDs are missing, request the catalog once and choose from it; do not guess IDs or retrieve the full manual first. Required foundation sections still accompany a selection. If they are already sufficient to resolve the question, stop there rather than expanding again. Complete help remains appropriate when material dependencies are unclear.

If the client or tool wrapper reports output truncation, first read the needed original text from a retained complete response or the bundled `content_file` when accessible. Otherwise request the missing relevant sections with an adequate output allowance; repeating the same oversized call does not repair what was unread. Preserve material defaults, qualifiers and returned-result dependencies. Do not acknowledge rules or foundations that were truncated or summarize unseen help as if it had been read.

## Check defaults and supported interfaces before adding work

Start from what the consumer needs and check the active tool's defaults before adding code or settings. Where defaults do not suffice, use the documented native capability or supported option that supplies the missing behavior; preserve explicit user choices and required project or template settings. Reuse visible evidence and read only the relevant help and dependencies needed to resolve uncertainty about defaults, returned results or actual output format. Similar command names, matching coefficients or a familiar file extension do not establish equivalent inference or compatible files. Use existing results where they suffice and retain only the transformation or layout work the consumer still needs. A shorter native operation is not an improvement if it obscures the research meaning. Reconsider an initially chosen command when a concrete mismatch appears; expand evidence only to resolve that mismatch, without inventorying unrelated alternatives or requiring a written justification for every call.

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

Selected-section responses with required foundations also return `foundation_sha256`. After reading the complete foundation text, later Phase 2 or 3 requests may send `known_help_foundations: {"command": "returned foundation_sha256"}` while that text remains visible. A match omits only unrequested duplicate foundation sections, marks `foundation_unchanged: true`, and lists them in `reused_foundation_sections`. Explicitly selected sections still return in full. A changed source or foundation map returns the complete current foundation again. This is separate from `known_rules_sha256`; never use a catalog/source hash or another agent's acknowledgment. Omit the field after context loss. `help_view: "full"` always returns the entire original source.

When the combined Phase 2 or 3 response exceeds 48,000 Unicode characters, the server changes only automatic full-help deliveries to intact source catalogs. `response_navigation` identifies the deferred commands; select the needed sections, split the request, or explicitly request full help. Same-response deduplication is considered before this check. Explicit sections, explicit full help, complete rules and paper material are never shortened. This is a navigation trigger, not a hard response cap or evidence that a deferred body was read; a source without reviewed internal boundaries stays one selectable `whole-source`.

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

Known `estimates save/use/store/restore`, `graph export`, and `matrix rownames` spellings also accept spaces. Save/use read the official `estimates_save` topic; store/restore read `estimates_store`. The response retains the selected command label and identifies its help topic. Exact topics beginning with an underscore, such as `_ms_omit_info`, are accepted; supply the topic without command arguments or options.

Live help is a snapshot of the selected Stata installation. After package installation or an ado-path change, Phase 2 `refresh_live_help: true` bypasses that successful live snapshot. For registered commands and the five bundled basic topics, also select `help_source: "installed"`; otherwise they retain their bundled source and version. Check that version against the installed package when relevant; do not report bundled help as newly read from the installation. INCLUDE expansion checks the source's local directories, then the selected Stata executable's `ado/updates` and `ado/base` roots, recursively; source fragments and their hashes are preserved. Failures and partial live deliveries are not cached. Missing/cyclic INCLUDE fragments are reported as `partial`; resolve a material missing part rather than silently treating the document as complete. Live lookup runs with a bounded timeout without blocking unrelated bundled requests.

StataCorp documentation governs official syntax and maintainer documentation governs user-written syntax. Match version-specific features to the active environment. Do not substitute paper code, implementation source, or a manual algorithm for unavailable grammar authority.

## Selected installation and execution evidence

Phase 2 `help_source: "installed"` explicitly reads installed help for registered commands as well. It uses the registered help topic, retains the selected command label, and reports unavailable help without silently substituting the bundle. Raw `*!` version markers, when readable, accompany the installed source. Longer sources keep the same catalog-first rule; installed sources without a reviewed map expose `whole-source`, so do not reuse bundled section IDs. `refresh_live_help: true` refreshes this selected live snapshot. Bundled expansions and paper examples retain their own versions.

Installed help can itself differ from the execution ADO. For the exact command, use the file path identified by the execution record or actual environment and read its source yourself. Phase 2 `execution_sources` optionally attaches that caller-selected file's path, SHA-256 and exact `line_spans`; omit spans for metadata only. The absolute filename must be the normalized selected command plus `.ado`. Pick meaningful header/target/context spans from the actual source, not fixed windows. An optional `expected_sha256` returns byte equality with that execution-record hash even when it differs; this does not prove the file is loaded or that an option/result is valid. No package update, source scan, option classifier or automatic fallback occurs.

```json
{
  "request": "Read the selected installed help and execution-record source identity",
  "selected_commands": ["did_multiplegt_dyn"],
  "help_source": "installed",
  "help_view": "catalog",
  "include_paper_catalog": false,
  "execution_sources": {
    "did_multiplegt_dyn": {"path": "C:/analysis/ado/did_multiplegt_dyn.ado"}
  }
}
```

The path above is an example: supply the actual known file. Compare the requested option's maintainer documentation with the raw execution source and available logs. Preserve unrelated supported work; resolve a material mismatch before using the affected option. Do not treat a date mismatch alone as proof that previous results are wrong.

## Optional input and estimator notes

Phase 2 `workflow_notes` returns only explicitly selected prospective authoring guidance from `data/command_workflow_notes.json`. It leaves general rules, original help and default responses unchanged. Available exact IDs are:

- `import_delimited`: `input-variable-names` — read the selected input header and actual imported names before a long run; choose collision-free meaningful aliases and document original header → imported name → analysis alias while preserving values.
- `did_multiplegt_dyn`: `control-learning-sample` — read the pre-first-change learning samples separately by baseline treatment, omitted terms and actual support; distinguish rank issues and unsupported comparisons without automatically changing the specification.
- `did_multiplegt_dyn`: `comparison-sample` — distinguish group tags, group×time `_effect` and the donor/weight detail they do not supply before reducing exported data.
- `did_multiplegt_dyn`: `effect-interpretation` — read event time, switcher-out sign conventions and the individual versus joint hypothesis from native evidence.
- `did_multiplegt_dyn`: `output-recovery` — read the failing command and expanded path separately from completed estimation; check loop-iterator lifetime and reuse appropriate stored native results for output recovery. Restoring `.ster` does not restore `e(sample)`.

```json
{
  "request": "Read controls and sample-output evidence",
  "selected_commands": ["did_multiplegt_dyn"],
  "help_sections": {"did_multiplegt_dyn": ["parallel-trends-options", "saved-results"]},
  "include_paper_catalog": false,
  "workflow_notes": {"did_multiplegt_dyn": ["control-learning-sample", "comparison-sample"]}
}
```

These notes do not replace material help sections or inspect user data. Check imported names with Stata, update the existing codebook, and read the estimator's actual sample and results when execution is requested. No automatic alias generator, schema inventory, rank checker, donor reconstruction or expected-output oracle is introduced.
