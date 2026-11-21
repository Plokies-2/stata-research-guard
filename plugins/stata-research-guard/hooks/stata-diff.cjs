"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const reportRule = [
  "Apply the stata-replication-workflow final-reply rule to the actual maintained changes in this turn.",
  "For a small Stata edit, include the actual before/after changes in a separate fenced diff block for each changed .do file.",
  "Summarize accompanying non-Stata files and show their diffs only when the user requests them.",
  "Honor any explicit user format and the existing exception for large edits. Exclude scratch files and changes that were reverted.",
].join(" ");

function handle(event) {
  const dataDir = process.env.PLUGIN_DATA;
  if (!dataDir || typeof event.session_id !== "string" || typeof event.turn_id !== "string") return {};
  const turnKey = createHash("sha256")
    .update(JSON.stringify([event.session_id, event.turn_id]))
    .digest("hex");
  const stateDir = path.join(dataDir, "stata-diff-turns");
  const turnFile = path.join(stateDir, turnKey);

  if (event.hook_event_name === "PostToolUse" && event.tool_name === "apply_patch") {
    // The successful patch response lists actual writes, including files outside the chat cwd.
    const response = event.tool_response;
    if (typeof response !== "string" || !response.startsWith("Success. Updated the following files:")) return {};
    const changedFiles = [...response.matchAll(/^[AMD] (.+\.do)[ \t]*\r?$/gim)].map((match) => match[1]);
    if (changedFiles.length === 0) return {};

    const firstPatch = !fs.existsSync(turnFile);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.appendFileSync(turnFile, changedFiles.join("\n") + "\n", "utf8");
    if (!firstPatch) return {};
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reportRule } };
  }

  if (event.hook_event_name !== "Stop" || !fs.existsSync(turnFile)) return {};
  const changedFiles = new Set(fs.readFileSync(turnFile, "utf8").trimEnd().split("\n"));
  fs.rmSync(turnFile, { force: true });
  const draft = event.last_assistant_message;
  if (event.stop_hook_active || typeof draft !== "string") return {};

  const fileNames = [...changedFiles].map((file) => file.split(/[\\/]/).pop());
  const diffBlocks = [...draft.matchAll(/^[ \t]*(?:`{3,}|~{3,})diff[ \t]*\r?$/gim)];
  const labeled = fileNames.every((name) => draft.includes(name) || draft.includes(encodeURIComponent(name)));
  if (labeled && diffBlocks.length >= changedFiles.size) return {};

  return {
    decision: "block",
    reason: "Before ending, review the final reply for missing .do file diffs. " + reportRule,
  };
}

const event = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(handle(event)) + "\n");
