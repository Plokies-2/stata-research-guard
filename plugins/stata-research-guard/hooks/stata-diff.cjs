"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const reportRule = [
  "Apply the stata-replication-workflow final-reply rule to the actual maintained changes in this turn.",
  "For a small Stata edit, include the actual before/after changes in a separate fenced diff block for each changed .do file.",
  "For the 100-line threshold, count added and deleted lines only in maintained .do files.",
  "Summarize accompanying non-Stata files and show their diffs only when the user requests them.",
  "Honor any explicit user format and the existing exception for large edits. Exclude scratch files and changes that were reverted.",
].join(" ");

function readOptionalFile(file) {
  if (!file) return "";
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code)) return "";
    throw error;
  }
}

function transcriptFiles(event) {
  if (typeof event.transcript_path !== "string") return [];
  const transcript = readOptionalFile(event.transcript_path);
  const files = [];
  // Code mode can record a completed FileChange even when no patch hook was emitted.
  for (let end = transcript.length; end > 0;) {
    const start = transcript.lastIndexOf("\n", end - 1);
    const line = transcript.slice(start + 1, end);
    end = start;
    if (!line.includes('"task_started"') && !line.includes('"FileChange"')) continue;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      continue; // The transcript may still be receiving its final line.
    }
    if (entry?.type !== "event_msg" || !entry.payload) continue;
    const { type, turn_id, item } = entry.payload;
    if (type === "task_started") return turn_id === event.turn_id ? files : [];
    if (type === "item_completed" && item?.type === "FileChange" && item.status === "completed") {
      files.push(...Object.keys(item.changes ?? {}).filter((file) => /\.do$/i.test(file)));
    }
  }
  return [];
}

function successfulPatchFiles(response) {
  const content = Array.isArray(response) ? response : response?.content;
  const text = typeof response === "string" ? response
    : Array.isArray(content) ? content.map((part) => part?.text ?? "").join("\n")
    : "";
  const output = text.match(/^Success\. Updated the following files:\r?\n((?:[AMD] [^\r\n]+(?:\r?\n|$))+)/m);
  if (!output) return [];
  return [...output[1].matchAll(/^[AMD] (.+\.do)[ \t]*\r?$/gim)].map((match) => match[1]);
}

function isMaintainedDo(file, cwd) {
  const relative = path.relative(cwd, file);
  const outsideProject = relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  const dirs = path.dirname(outsideProject ? file : relative).toLowerCase().split(/[\\/]/);
  // Some research projects keep their maintained analysis under work/.
  return /\.do$/i.test(file) && !dirs.some((dir) => ["tmp", "temp", "cache", ".cache", "build", "scratch"].includes(dir));
}

function handle(event) {
  if (typeof event.session_id !== "string" || typeof event.turn_id !== "string") return {};
  const dataDir = process.env.PLUGIN_DATA || process.env.CLAUDE_PLUGIN_DATA;
  const turnKey = createHash("sha256")
    .update(JSON.stringify([event.session_id, event.turn_id]))
    .digest("hex");
  const stateDir = dataDir && path.join(dataDir, "stata-diff-turns");
  const turnFile = stateDir && path.join(stateDir, turnKey);
  const cwd = event.cwd || process.cwd();

  if (event.hook_event_name === "PostToolUse") {
    const firstPatch = !readOptionalFile(turnFile);
    const hasPatch = /\bapply_patch\b/.test(JSON.stringify(event.tool_input ?? ""));
    let changedFiles = [];
    if (event.tool_name === "apply_patch" || (hasPatch && ["Bash", "exec_command"].includes(event.tool_name))) {
      changedFiles = successfulPatchFiles(event.tool_response)
        .map((file) => path.resolve(event.tool_cwd || cwd, file));
    } else if (event.tool_name === "exec" && hasPatch && firstPatch) {
      changedFiles = transcriptFiles(event).map((file) => path.resolve(cwd, file));
    }
    changedFiles = changedFiles.filter((file) => isMaintainedDo(file, cwd));
    if (changedFiles.length === 0) return {};

    if (turnFile) {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.appendFileSync(turnFile, changedFiles.join("\n") + "\n", "utf8");
    }
    if (!firstPatch) return {};
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reportRule } };
  }

  if (event.hook_event_name !== "Stop") return {};
  const remembered = readOptionalFile(turnFile).trimEnd().split("\n").filter(Boolean);
  if (remembered.length) fs.rmSync(turnFile, { force: true });
  const draft = event.last_assistant_message;
  if (event.stop_hook_active || typeof draft !== "string") return {};
  const changedFiles = new Set([...remembered, ...transcriptFiles(event)]
    .map((file) => path.resolve(cwd, file))
    .filter((file) => isMaintainedDo(file, cwd)));
  if (changedFiles.size === 0) return {};

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
