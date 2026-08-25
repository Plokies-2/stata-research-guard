# Top 50 Stata command coverage: research basis

## Scope

The priority list is a practical coverage contract, not a claim that StataCorp or any public telemetry publishes a universal command-frequency ranking. It triangulates official Stata manuals, maintainer guides for user-written commands, community/package prominence, deposited economics replication code, and the plugin's existing workflow corpus. The contract contains 50 command groups with 203 material variants. Fifteen additional user-written command groups contribute another 48 variants.

## Public-corpus method

The AEA Data Editor describes active use of static code analysis to identify Stata packages in submitted replication packages: <https://aeadataeditor.github.io/projects/project4>. The maintained `Statapackagesearch` documentation explains that the tool scans `.do` files recursively and matches tokens against an SSC-derived list, with `domain(econ)`, `details`, `filesave`, and `excelsave` controls: <https://labordynamicsinstitute.github.io/Statapackagesearch/>.

That method supports reproducible package-level discovery, but it is not execution telemetry or a direct command-call counter. Token matches can be false positives, the documented workflow uses exclusions, and package presence does not establish which option variant ran successfully. Accordingly, the Top 50 order is used only to set audit priorities; it does not determine template selection scores.

## Evidence tiers

- Guide mechanics come from official Stata manuals or maintainers' user-written-command guides. They establish syntax, material options, required state, and returned state. They never supply a research design.
- Research usage comes from independently deposited researcher `.do` code, including bounded AEA/openICPSR examples. It can illustrate a workflow only when the source, span, hash, input profile, and state signature are explicit.
- Direct primitives cover harmless statements that do not require a reusable template.

The current build contains 262 newly audited guide-mechanics atoms. All are `reference_only`, all have `auto_selectable=false`, and all are delivered through the separate guide layer rather than the legacy template ranking. The research-usage layer contains 128 examples, including 19 bounded AEA/openICPSR support rows; nine rejected AEA candidates are retained only in the audit accounting and excluded from generated evidence.

## Promotion and contamination gate

Every new guide atom must match the promotion ledger by candidate SHA-256, source-file SHA-256, exact source span, code SHA-256, contract IDs, six-field input profile, three-field state signature, variant-distinction reason, safety checks, and independent auditor identity. Duplicate label IDs, duplicate variant keys, normalized active-code duplicates, unknown contracts, source mismatches, nested-loop contamination, TeX output, dependency probes, and manual coefficient bridges fail closed.

Guide audit does not make a row executable. `audited_template` promotion additionally requires an isolated Stata runtime pass and both positive and negative selector cases. Until then, the row remains reference-only.

## Retrieval contract

`resolve_transition_evidence` handles one atomic transition. It returns one primary guide card, no more than 12 lines or 600 characters, up to two alternative guide variants as metadata, and at most one independently matched usage example. The guide and usage layers never share a score.

- Exact audited usage: `guide+usage_template`.
- No compatible usage: `guide+fallback` or `guide_informed_fallback`.
- Known input-profile contradiction: no usage auto-selection.
- Unresolved substantive choice: `selection_required`.
- Unrelated multi-command request: `split_required`.
