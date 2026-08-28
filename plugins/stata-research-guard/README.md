# Stata Research Guard

Stata Research Guard is a small, closed-dictionary evidence provider for Stata research work. It gives the model the material needed to make a good project-specific decision; it does not grade model-written code or choose a command on the model's behalf.

## What it provides

The `stataResearchGuard` MCP server exposes one tool:

```text
get_stata_command_evidence
```

The tool has two phases:

1. Without `selected_commands`, it returns the complete command dictionary and concise task labels. The model may select one or more canonical command keys.
2. With `selected_commands`, it returns guide and paper evidence only for those selected commands. When a complete cleaned official or maintainer guide is stored, the same response includes its entire body without an excerpt limit.

Every response also carries the common `general-rules.md` authoring contract. An unknown, duplicated, or empty selected-command list aborts instead of being guessed, expanded from an abbreviation, or replaced with an unregistered command.

The response may contain:

- a command dictionary with canonical keys, invocations, functional labels, and guide/paper availability;
- task atoms that keep distinct functions such as estimation and Excel export separate without selecting a winner;
- functional command cards with command, package, aliases, interfaces, and known tradeoffs;
- complete content-only official or maintainer guides for selected commands when available, with version, source commit, raw hash, cleaned hash, and no silent truncation;
- readable StataCorp or maintainer documentation excerpts and examples;
- factual project observations with file, line, statement, options, input/output bindings, calls, and estimate handoffs;
- reviewed high-quality paper example cards when such cards exist; and
- unresolved facts when a source or research choice is not established.

The response never contains a winner, numeric ranking, semantic pass, promotion state, or automatic-selection verdict. Existing project usage is an observation, not a vote. The model considers the user's current requirements, official or maintainer semantics, project facts, paper context, and implementation simplicity, then chooses and writes the code. While the plugin is in use, code generation stays inside the exposed dictionary; if the necessary command is absent, the workflow stops and reports the missing capability.

## Core design: complete guides plus high-quality paper examples

The two evidence layers have different jobs and must not be collapsed into a template system:

| Evidence layer | What it supplies | What it does not decide |
| --- | --- | --- |
| Complete official or maintainer guide | Syntax, options, warnings, examples, postestimation, stored results, and version-specific semantics | The project's estimand, sample, estimator, FE, VCE, or output design |
| Reviewed high-quality paper example | A manually bounded block showing how the selected command operates inside a real research workflow | A reusable answer template or authority to copy surrounding commands and research choices |
| Current-project observation | Literal paths, lines, commands, options, inputs, outputs, calls, and estimate handoffs | Which existing practice should win or be preserved |
| `general-rules.md` | Shared prospective house style for direct, readable Stata | A score, generated-code verdict, or research-design certification |

The model first chooses the command from the user's current requirements and the closed dictionary. It then uses the complete guide as grammar authority, the paper block as working context, current-project observations as facts, and the general rules as the authoring boundary. A nearby paper block may support small edits around the selected command, but it does not replace that command or import the paper's estimator, sample, FE, VCE, or output choices. If an `outreg2` example follows `areg` while the current project has chosen `regress`, the example helps with `outreg2`; it does not change `regress` to `areg`.

The reviewed paper bundle covers all 184 candidate occurrences: 168 are included, 16 excluded, and 166 manually bounded high-quality blocks cover 77 commands. The remaining 32 commands are explicitly guide-only. `outreg2` has four high-quality blocks so materially different real uses can be shown without declaring one template.

## Evidence authority

- StataCorp manual and help material is the syntax authority for official commands.
- Maintainer help, repositories, and SSC/RePEc documentation are the syntax authority for user-written commands.
- Paper code shows how the selected command was used in a particular research workflow. The selected-command region is a practical example; surrounding estimators, samples, fixed effects, VCE choices, and downstream steps remain reference context. Paper code is not syntax authority and is never rewritten offline to match house style.
- Runtime output records what Stata executed and produced. It does not establish causal validity or select a research design.

Documentation examples are readable and nonbinding. A document-derived fixture is labeled as derived rather than presented as a verbatim manual example. Reviewed paper evidence is installed as one locked five-file bundle: `paper_usage_occurrences.jsonl`, `command_paper_index.json`, `high_quality_paper_blocks.jsonl`, `paper_review_summary.json`, and `paper_review_integrity_audit.json`. A partial bundle, nonpassing final audit, or broken exact-ID/hash/count link aborts at server start. When the bundle is absent, or the selected command has no reviewed high-quality block, the tool provides guide-only evidence and reports the gap honestly.

Complete guides are separate from short documentation excerpts and paper occurrences. They are returned only for `selected_commands`; discovery never carries guide bodies. Each indexed complete guide is hash-linked to a preserved raw source and a cleaned Markdown file. Missing files, path escape, invalid UTF-8, or raw/clean hash mismatch aborts at server start. Cleaning removes viewer navigation and presentation markup but preserves source order, syntax and abbreviation boundaries, option descriptions, warnings, examples, postestimation, stored results, references, and external links. The guide supplies command grammar; `general-rules.md`, the user request, and the current project still govern authoring and research choices.

The complete-guide channel is generic, but coverage is added only after command-level source cleaning and independent audit. The current bundled pilot is the complete `reghdfe` maintainer help. Commands whose complete guide has not yet passed that process continue to use the available authoritative excerpts rather than receiving an invented or silently shortened substitute.

## Project observations

When `project_path` is supplied, the server reads project-relative `.do` files and reports literal facts. `target_files` can bound the scan. Real-path containment prevents a target file or symlink from escaping the selected project root.

The scanner does not infer preferred style, rank commands by frequency, or turn the presence of `outreg2`, `reghdfe`, `.ster`, or helper programs into a recommendation.

## Paper and formatter boundaries

Raw paper source files and their citation, path, hash, and span provenance remain preserved. Raw archives, mechanical windows, mixed legacy usage rows, and rejected audit packets are not returned directly. Reviewed evidence keeps unmodified `paper_usage_occurrence` records and a 109-command exact index, while manually bounded `high_quality_example` blocks show the selected command's working context. The server returns only blocks whose `focus_command` is selected and links their target occurrences when available. Materially different variants may therefore supply more than one block.

A close block may guide minimal edits around the selected command so that it harmonizes with the current project and documented syntax. Every block is a high-quality example, never a template. A distant block is reference context only. For example, an `outreg2` block may show a preceding `areg`, but the `outreg2` example does not own the estimator and must not replace a current `regress` choice.

The user-approved `outreg2_xlsx` multi-sheet formatter is preserved as a named implementation artifact. Its card describes its interface and preconditions but does not decide whether a project needs it.

## Authoring guidance

The bundled skill favors readable Stata that exposes the active sample, model, fixed effects, weights, VCE, event axis, and output decisions at the point of use. Existing project interfaces are preserved when compatible. Native factor-variable and raw `e(b)` names are retained; manual event dummies and coefficient reconstruction are avoided. Excel tables, PDF figures, and `.ster` estimates are used when the user requires those artifacts.

These are authoring conventions for the model, not deterministic linter findings. See:

- `skills/stata-replication-workflow/references/command-evidence.md`
- `skills/stata-replication-workflow/references/general-rules.md`
- `skills/stata-replication-workflow/references/authoring-conventions.md`
- `skills/stata-replication-workflow/references/readme-contract.md`
- `skills/stata-replication-workflow/references/workflow-taxonomy.md`

## Validation

Validation is limited to software integrity and source consistency:

```powershell
python -m unittest discover -s tests -p "test_*.py"
Get-ChildItem tests\*.test.cjs | ForEach-Object { node --test $_.FullName }
node scripts\verify_plugin_bundle.cjs
```

The tests cover MCP transport and schema, path containment, task separation, neutral project observations, source hashes, the raw-corpus boundary, the formatter artifact, and bundle integrity. They do not score generated Stata or certify a research result.
