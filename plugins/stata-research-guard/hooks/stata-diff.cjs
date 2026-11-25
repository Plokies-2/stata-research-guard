"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

// The full procedures live in stata-replication-workflow; hooks only point to them.
const reviewLines = 50;
const reviewConfirmation = `수정 코드 주변 ${reviewLines}줄을 읽어 중복 구현을 확인했다.`;
const reviewRule = `Run the stata-replication-workflow edited-region review: read each changed region and the ${reviewLines} lines before and after it, plus where the macros and variables it uses are defined. Check whether existing code or a supported command already does the same work, such as a new global for what an existing global holds, a second collapse, or if/strpos() reclassifying a fixed list, and fix duplicates in scope. After the review, put this line on its own line in the final reply, followed by the ranges you read:\n${reviewConfirmation} (file.do 260-380행, controls 정의 12-18행)`;
const reportRule = "Show a fenced diff block for each changed .do file, following the stata-replication-workflow final-reply rule. For a large edit, write a line starting with `diff 생략:` instead.";
// The confirmation counts only with at least one line range after it.
const confirmedReview = (line) => line.trim().startsWith(reviewConfirmation) && /\d+\s*[-~–]\s*\d+/.test(line.slice(line.indexOf(reviewConfirmation) + reviewConfirmation.length));

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

function handleCodex(event) {
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
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `${reportRule}\n\n${reviewRule}` } };
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
  return stopReview(draft, changedFiles);
}

function stopReview(draft, changedFiles) {
  const reasons = [];
  const lines = draft.split(/\r?\n/);
  if (!lines.some(confirmedReview)) {
    const files = [...changedFiles].map((file) => `- ${file}`).join("\n");
    reasons.push(`Before ending, perform the missing duplicate-implementation review of these changed .do files:\n${files}\n\n${reviewRule}`);
  }
  // Large edits omit diffs by rule; the reply says so on a line starting with "diff 생략:".
  const diffOmitted = lines.some((line) => line.trim().startsWith("diff 생략:"));
  if (!process.argv.includes("--review-only") && !diffOmitted) {
    const fileNames = [...changedFiles].map((file) => path.basename(file));
    const diffBlocks = [...draft.matchAll(/^[ \t]*(?:`{3,}|~{3,})diff[ \t]*\r?$/gim)];
    const labeled = fileNames.every((name) => draft.includes(name) || draft.includes(encodeURIComponent(name)));
    if (!labeled || diffBlocks.length < changedFiles.size) {
      reasons.push("Before ending, review the final reply for missing .do file diffs. " + reportRule);
    }
  }

  return reasons.length ? { decision: "block", reason: reasons.join("\n\n") } : {};
}

const claudeEditTools = ["Edit", "Write", "MultiEdit"];
const claudeShellTools = ["Bash", "PowerShell"];
const skippedSearchDirs = new Set([".git", "node_modules", "tmp", "temp", "cache", ".cache", "build", "scratch", "__pycache__", ".venv"]);

// Shell commands report no changed paths, so compare .do modification times with the time the call started.
function doFilesModifiedSince(since, cwd, command) {
  const found = new Set();
  const deadline = Date.now() + 3000;
  const stack = [cwd];
  let visited = 0;
  while (stack.length && visited < 20000 && Date.now() < deadline) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      visited += 1;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skippedSearchDirs.has(entry.name.toLowerCase())) stack.push(full);
      } else if (/\.do$/i.test(entry.name)) {
        try {
          if (fs.statSync(full).mtimeMs >= since) found.add(full);
        } catch {}
      }
    }
  }
  // A command can also write a .do file outside cwd by naming it.
  for (const match of String(command ?? "").matchAll(/[A-Za-z]:[\\/][^"'\r\n<>|*?]*?\.do\b|[^\s"'<>|*?]+\.do\b/g)) {
    const full = path.resolve(cwd, match[0]);
    try {
      if (fs.statSync(full).mtimeMs >= since) found.add(full);
    } catch {}
  }
  return [...found];
}

// The final reply is the trailing assistant text after the last tool call or user message.
function lastAssistantText(event) {
  if (typeof event.last_assistant_message === "string") return event.last_assistant_message;
  const lines = readOptionalFile(event.transcript_path).split(/\r?\n/);
  const texts = [];
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!lines[index].trim()) continue;
    let entry;
    try {
      entry = JSON.parse(lines[index]);
    } catch {
      continue;
    }
    if (entry.type === "user") break;
    if (entry.type !== "assistant") continue;
    const content = Array.isArray(entry.message?.content) ? entry.message.content : [];
    if (content.some((part) => part?.type === "tool_use")) break;
    texts.unshift(content.filter((part) => part?.type === "text").map((part) => part.text).join("\n"));
  }
  return texts.length ? texts.join("\n") : null;
}

// Claude Code has no turn id: changes are remembered per session until the next Stop.
function handleClaude(event) {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA || process.env.PLUGIN_DATA;
  if (!dataDir) return {};
  const stateDir = path.join(dataDir, "stata-diff-turns");
  const turnFile = path.join(stateDir, createHash("sha256").update(event.session_id).digest("hex"));
  const startFile = `${turnFile}.shell-start`;
  const cwd = event.cwd || process.cwd();

  if (event.hook_event_name === "PreToolUse") {
    // Scanning the folder costs time on every shell call, so only commands that name a .do file are timed.
    if (!claudeShellTools.includes(event.tool_name) || !/\.do\b/i.test(String(event.tool_input?.command ?? ""))) return {};
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(startFile, String(Date.now()), "utf8");
    return {};
  }

  if (event.hook_event_name === "PostToolUse") {
    let changedFiles = [];
    if (claudeEditTools.includes(event.tool_name) && typeof event.tool_input?.file_path === "string") {
      changedFiles = [path.resolve(cwd, event.tool_input.file_path)];
    } else if (claudeShellTools.includes(event.tool_name)) {
      const since = Number(readOptionalFile(startFile));
      fs.rmSync(startFile, { force: true });
      // Allow for coarse file-system timestamps.
      if (since) changedFiles = doFilesModifiedSince(since - 2000, cwd, event.tool_input?.command);
    }
    changedFiles = changedFiles.filter((file) => isMaintainedDo(file, cwd));
    if (changedFiles.length === 0) return {};

    const firstPatch = !readOptionalFile(turnFile);
    fs.mkdirSync(stateDir, { recursive: true });
    fs.appendFileSync(turnFile, changedFiles.join("\n") + "\n", "utf8");
    if (!firstPatch) return {};
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `${reportRule}\n\n${reviewRule}` } };
  }

  if (event.hook_event_name !== "Stop") return {};
  const remembered = readOptionalFile(turnFile).trimEnd().split("\n").filter(Boolean);
  if (remembered.length) fs.rmSync(turnFile, { force: true });
  if (event.stop_hook_active || remembered.length === 0) return {};
  const draft = lastAssistantText(event);
  if (typeof draft !== "string") return {};
  return stopReview(draft, new Set(remembered));
}

// Codex events carry a turn id; Claude Code events do not.
function handle(event) {
  if (typeof event.session_id !== "string") return {};
  return typeof event.turn_id === "string" ? handleCodex(event) : handleClaude(event);
}

const event = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(handle(event)) + "\n");
