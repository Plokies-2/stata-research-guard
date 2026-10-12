# Stata Execution and Results

Read this reference when executing analysis or inspecting runtime results. Comment, label, spacing and other interface-preserving edits do not need an execution setup merely because the file is Stata code.

## Choose the available interface

Use the project's existing authorized runner, a local Stata batch executable, official Python integration, or a callable runtime connection. This plugin provides command evidence and research guidance; it does not include a Stata execution engine or require mcpStata. If mcpStata is available, it can supply sessions, data, logs and results within this same workflow; do not load a second coordinating skill.

Check the selected route's actual availability, not just installed files, and briefly state it. Honor explicit execution-tool restrictions. Before retrying or switching routes, resolve any attempt that may still be running. If no route is available, continue authoring and source review where command evidence permits, and report the unexecuted work without claiming runtime success.

## Keep code and state understandable

Prefer the existing saved `.do` to a long inline tool string, especially with quoting or Windows backslashes. A fragment can use a temporary driver in the project's work area. Initialize the needed paths in that execution or use the existing setup; do not assume globals survived another call. Read authorized input paths directly; a different drive or folder is not a reason to copy the input. Preserve originals and keep output writes within scope.

With a session interface, reuse the existing session unless isolation or parallel engines are needed; mcpStata's usual session is `default`. Resolve an affected running job before structural edits, rebuild through the requested workflow, and reload the resulting data. Recreate a session only when stale data or ado state cannot reliably be cleared or reloaded. Do not restart unrelated research work.

Record the input path, relevant observation/variable counts, Stata version, panel variables and seed when they matter. Hash only for an actual source-identity or unchanged-input question. If working data changed, use `preserve`/`restore` or reload before an independent specification.

## Run and inspect the affected work

Run a coherent requested block or saved `.do` rather than splitting it into many tiny execution calls. Reuse preparation and suitable stored estimates; a full master rerun is appropriate for structural changes or an explicit reproduction request. Keep package installation separate from estimation under the general rules' standing authorization; refresh the affected runtime state when needed, then return to the analysis.

Read actual logs, errors, relevant `e()`/`r()` results, raw matrices and coefficient names, samples, omitted terms, estimates, tables and exported figures. Request only the additional state needed for the current question; do not repeat a result query when the completed execution response already supplies it. Apply the general rules' output and file-lifecycle guidance, including the actual generated files. Save the requested specifications and exports in the maintained `.do` workflow.

Before a long run, inspect imported variable names and preserve the original-name mapping. For changed controls or sample exports, read the estimator's learning sample and the output consumer's observation unit. Installed-version questions and optional estimator notes belong in the relevant part of `command-evidence.md`.

## Collect background work and recover outputs

Use bounded blocking waits provided by the selected runner instead of rapidly repeating nonblocking status checks. With mcpStata, use `stata_task_status(wait=True)` for the existing task. Continue independent work between waits and resolve the actual task state before retrying. For appended logs, continue from the returned `next_offset` when supported; use keyword/context or tail reads for a concrete warning or failure rather than repeatedly loading the full log. Report meaningful findings, completion, failure or required action under the user's progress schedule.

Separate completed estimation from a later collection, formatting, export or process-exit failure. Read the failing command and expanded path, and reuse appropriate stored results to repair affected outputs. Restoring `.ster` does not restore `e(sample)`; do not claim a recovered sample without evidence. Runtime completion does not establish identification. Explain results and limitations in the research context, without pass markers, promotion states or audit certificates.
