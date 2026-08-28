# Stata Research Guard

Stata Research Guard is a small evidence provider for Stata research work. It gives the model the material needed to make a good project-specific decision; it does not grade model-written code or choose a command on the model's behalf.

## What it provides

The `stataResearchGuard` MCP server exposes one tool:

```text
get_stata_command_evidence
```

Given a request and an optional project path, it returns:

- task atoms that keep distinct functions such as estimation and Excel export separate;
- functional command cards with command, package, aliases, interfaces, and known tradeoffs;
- readable StataCorp or maintainer documentation excerpts and examples;
- factual project observations with file, line, statement, options, input/output bindings, calls, and estimate handoffs;
- reviewed paper usage cards when such cards exist; and
- unresolved facts when a source or research choice is not established.

The response never contains a winner, numeric ranking, semantic pass, promotion state, or automatic-selection verdict. Existing project usage is an observation, not a vote. The model considers the user's current requirements, official or maintainer semantics, project facts, paper context, and implementation simplicity, then chooses and writes the code.

## Evidence authority

- StataCorp manual and help material is the syntax authority for official commands.
- Maintainer help, repositories, and SSC/RePEc documentation are the syntax authority for user-written commands.
- Paper code shows how a command was used in a particular research workflow. It is not syntax authority, a canonical template, or proof that the same specification fits another project.
- Runtime output records what Stata executed and produced. It does not establish causal validity or select a research design.

Documentation examples are readable and nonbinding. A document-derived fixture is labeled as derived rather than presented as a verbatim manual example. Missing maintainer examples and unavailable paper cards are reported honestly.

## Project observations

When `project_path` is supplied, the server reads project-relative `.do` files and reports literal facts. `target_files` can bound the scan. Real-path containment prevents a target file or symlink from escaping the selected project root.

The scanner does not infer preferred style, rank commands by frequency, or turn the presence of `outreg2`, `reghdfe`, `.ster`, or helper programs into a recommendation.

## Paper and formatter boundaries

Raw paper source files and their citation, path, hash, and span provenance remain preserved. Raw archives, mechanical windows, mixed legacy usage rows, and rejected audit packets are not returned directly. Reviewed paper evidence will use separate `paper_usage_occurrence` and optional `paper_adaptation_card` records.

The user-approved `outreg2_xlsx` multi-sheet formatter is preserved as a named implementation artifact. Its card describes its interface and preconditions but does not decide whether a project needs it.

## Authoring guidance

The bundled skill favors readable Stata that exposes the active sample, model, fixed effects, weights, VCE, event axis, and output decisions at the point of use. Existing project interfaces are preserved when compatible. Native factor-variable and raw `e(b)` names are retained; manual event dummies and coefficient reconstruction are avoided. Excel tables, PDF figures, and `.ster` estimates are used when the user requires those artifacts.

These are authoring conventions for the model, not deterministic linter findings. See:

- `skills/stata-replication-workflow/references/command-evidence.md`
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
