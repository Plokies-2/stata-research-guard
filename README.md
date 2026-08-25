# Stata Research Guard

Private Codex marketplace for Stata Research Guard `0.2.0+codex.20260824221905`.

## Install

Clone this repository, then run the following commands from any shell. Replace `<repo-root>` with the absolute path to this repository on your machine.

```powershell
codex plugin marketplace add <repo-root>
codex plugin add stata-research-guard@stata-research-guard-team
codex plugin list
```

Start a new Codex task after installation so the skill and MCP tools are loaded.

## Verify the bundle

```powershell
node plugins/stata-research-guard/scripts/verify_plugin_bundle.cjs --plugin-root plugins/stata-research-guard
```

The MCP launcher uses `CODEX_MCP_NODE_PATH` when set, then Codex's bundled Node.js, then `node.exe` on `PATH`.
