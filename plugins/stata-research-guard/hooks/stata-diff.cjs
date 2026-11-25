"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");

// The full procedures live in stata-replication-workflow; hooks only point to them.
const reviewLines = 50;
const wholeFileLines = 300;
const reviewConfirmation = "수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다.";
// Earlier releases asked for this wording; it still counts.
const legacyConfirmation = `수정 코드 주변 ${reviewLines}줄을 읽어 중복 구현을 확인했다.`;
const reviewRule = `Run the stata-replication-workflow edited-region review: read the whole file when it has ${wholeFileLines} lines or fewer, otherwise each changed region and the ${reviewLines} lines before and after it, plus where the macros and variables it uses are defined. Check whether existing code or a supported command already does the same work, such as a new global for what an existing global holds, a second collapse, or if/strpos() reclassifying a fixed list, and fix duplicates in scope. After the review, put this line on its own line in the final reply, followed by the ranges you read:\n${reviewConfirmation} (file.do 260-380행, controls 정의 12-18행)`;
const largeEditLines = 200;
const reportRule = `Show a fenced diff block for each changed .do file, following the stata-replication-workflow final-reply rule. For an edit of ${largeEditLines} or more changed .do lines, write a line starting with \`diff 생략:\` instead. Newly created files need no diff.`;
// The confirmation counts only with at least one line range after it.
const confirmedReview = (line) => [reviewConfirmation, legacyConfirmation].some((prefix) =>
  line.trim().startsWith(prefix) && /\d+\s*[-~–]\s*\d+/.test(line.slice(line.indexOf(prefix) + prefix.length)));

// Without a plugin data folder (for example a manual install), keep turn state in the system temp folder.
function hookDataDir(...names) {
  for (const name of names) if (process.env[name]) return process.env[name];
  return path.join(os.tmpdir(), "stata-research-guard");
}

// Each changed .do file is remembered as one JSON line: its path, changed line count (null when unknown) and whether it was created.
function rememberChanges(turnFile, changes) {
  fs.mkdirSync(path.dirname(turnFile), { recursive: true });
  fs.appendFileSync(turnFile, changes.map((change) => JSON.stringify(change)).join("\n") + "\n", "utf8");
}

function rememberedChanges(turnFile) {
  return readOptionalFile(turnFile).split("\n").filter(Boolean).map((line) => {
    try {
      const change = JSON.parse(line);
      if (change && typeof change.file === "string") return change;
    } catch {}
    return { file: line, lines: null, created: false };
  });
}

// Count + and - lines in a patch or unified diff; null when the text carries none.
function patchLineCount(text) {
  const lines = String(text ?? "").split(/\r?\n/).filter((line) => /^[+-]/.test(line) && !/^(?:\+\+\+|---)( |$)/.test(line));
  return lines.length ? lines.length : null;
}

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
  return [...output[1].matchAll(/^([AMD]) (.+\.do)[ \t]*\r?$/gim)].map((match) => ({ file: match[2], created: match[1].toUpperCase() === "A" }));
}

function isMaintainedDo(file, cwd) {
  const relative = path.relative(cwd, file);
  const outsideProject = relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  const dirs = path.dirname(outsideProject ? file : relative).toLowerCase().split(/[\\/]/);
  // Some research projects keep their maintained analysis under work/.
  return /\.do$/i.test(file) && !dirs.some((dir) => ["tmp", "temp", "cache", ".cache", "build", "scratch"].includes(dir));
}

function handleCodex(event) {
  const dataDir = hookDataDir("PLUGIN_DATA", "CLAUDE_PLUGIN_DATA");
  const turnKey = createHash("sha256")
    .update(JSON.stringify([event.session_id, event.turn_id]))
    .digest("hex");
  const stateDir = path.join(dataDir, "stata-diff-turns");
  const turnFile = path.join(stateDir, turnKey);
  const cwd = event.cwd || process.cwd();

  if (event.hook_event_name === "PostToolUse") {
    const firstPatch = !readOptionalFile(turnFile);
    const hasPatch = /\bapply_patch\b/.test(JSON.stringify(event.tool_input ?? ""));
    let changes = [];
    if (event.tool_name === "apply_patch" || (hasPatch && ["Bash", "exec_command"].includes(event.tool_name))) {
      const files = successfulPatchFiles(event.tool_response);
      // One patch can touch several files; its total is kept on the first so the sum stays right.
      const total = patchLineCount(typeof event.tool_input === "string" ? event.tool_input : JSON.stringify(event.tool_input ?? "").replace(/\\n/g, "\n"));
      changes = files.map((change, index) => ({ file: path.resolve(event.tool_cwd || cwd, change.file),
        lines: index === 0 ? total : (total === null ? null : 0), created: change.created }));
    } else if (event.tool_name === "exec" && hasPatch && firstPatch) {
      changes = transcriptFiles(event).map((file) => ({ file: path.resolve(cwd, file), lines: null, created: false }));
    }
    changes = changes.filter((change) => isMaintainedDo(change.file, cwd));
    if (changes.length === 0) return {};

    rememberChanges(turnFile, changes);
    if (!firstPatch) return {};
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `${reportRule}\n\n${reviewRule}` } };
  }

  if (event.hook_event_name !== "Stop") return {};
  const remembered = rememberedChanges(turnFile);
  if (remembered.length) fs.rmSync(turnFile, { force: true });
  const draft = event.last_assistant_message;
  if (event.stop_hook_active || typeof draft !== "string") return {};
  const changes = [...remembered, ...transcriptFiles(event).map((file) => ({ file, lines: null, created: false }))]
    .map((change) => ({ ...change, file: path.resolve(cwd, change.file) }))
    .filter((change) => isMaintainedDo(change.file, cwd));
  if (changes.length === 0) return {};
  return stopReview(draft, changes);
}

function stopReview(draft, changes) {
  const reasons = [];
  const lines = draft.split(/\r?\n/);
  const byFile = new Map();
  for (const change of changes) {
    const previous = byFile.get(change.file);
    byFile.set(change.file, {
      lines: previous && (previous.lines === null || change.lines === null) ? null : (previous?.lines ?? 0) + (change.lines ?? 0),
      known: (previous ? previous.known : true) && change.lines !== null && change.lines !== undefined,
      created: previous ? previous.created : Boolean(change.created),
    });
  }
  if (!lines.some(confirmedReview)) {
    const files = [...byFile.keys()].map((file) => `- ${file}`).join("\n");
    reasons.push(`Before ending, perform the missing duplicate-implementation review of these changed .do files:\n${files}\n\n${reviewRule}`);
  }
  // Large edits omit diffs by rule; the reply says so on a line starting with "diff 생략:".
  // Omission counts only when the changed lines reach the threshold or could not be counted.
  const counts = [...byFile.values()];
  const countable = counts.every((entry) => entry.known);
  const changedLines = counts.reduce((sum, entry) => sum + (entry.lines ?? 0), 0);
  const diffOmitted = lines.some((line) => line.trim().startsWith("diff 생략:"));
  const omissionAllowed = !countable || changedLines >= largeEditLines;
  if (!process.argv.includes("--review-only")) {
    const needDiff = [...byFile].filter(([, entry]) => !entry.created).map(([file]) => file);
    const fileNames = needDiff.map((file) => path.basename(file));
    const diffBlocks = [...draft.matchAll(/^[ \t]*(?:`{3,}|~{3,})diff[ \t]*\r?$/gim)];
    const labeled = fileNames.every((name) => draft.includes(name) || draft.includes(encodeURIComponent(name)));
    if (diffOmitted && !omissionAllowed) {
      reasons.push(`The reply omits diffs, but only ${changedLines} .do lines changed (below ${largeEditLines}). ` + reportRule);
    } else if (!diffOmitted && needDiff.length && (!labeled || diffBlocks.length < needDiff.length)) {
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
  const stack = [cwd, ...commandDirectories(cwd, command)];
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

// Folders the command names (including the folder of a wildcard such as code/1_*.do) are scanned too,
// so commands that edit .do files outside cwd are still detected.
function commandDirectories(cwd, command) {
  const dirs = new Set();
  for (const match of String(command ?? "").matchAll(/"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s"'|;&<>()]+)/g)) {
    let token = match[1] ?? match[2] ?? match[3];
    if (/[*?]/.test(token)) token = path.dirname(token);
    if (!token || token === "." || /^-/.test(token)) continue;
    const full = path.resolve(cwd, token);
    const relative = path.relative(cwd, full);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) continue;
    try {
      if (fs.statSync(full).isDirectory()) dirs.add(full);
    } catch {}
  }
  return [...dirs];
}

// The final reply is the trailing assistant text after the last tool call or user message.
function lastAssistantText(event) {
  if (typeof event.last_assistant_message === "string" && event.last_assistant_message.trim()) return event.last_assistant_message;
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
    const content = Array.isArray(entry.message?.content) ? entry.message.content : [];
    if (entry.type === "user") {
      // A reply sent through a tool (for example a chat or post tool) ends with that tool's result.
      if (!texts.length && content.length && content.every((part) => part?.type === "tool_result")) continue;
      break;
    }
    if (entry.type !== "assistant") continue;
    const toolUses = content.filter((part) => part?.type === "tool_use");
    if (toolUses.length) {
      if (!texts.length) texts.unshift(...toolUses.flatMap((part) => stringsIn(part.input)));
      break;
    }
    texts.unshift(content.filter((part) => part?.type === "text").map((part) => part.text).join("\n"));
  }
  return texts.length ? texts.join("\n") : null;
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

// Claude Code has no turn id: changes are remembered per session until the next Stop.
function handleClaude(event) {
  const dataDir = hookDataDir("CLAUDE_PLUGIN_DATA", "PLUGIN_DATA");
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
    let changes = [];
    if (claudeEditTools.includes(event.tool_name) && typeof event.tool_input?.file_path === "string") {
      changes = [{ file: path.resolve(cwd, event.tool_input.file_path), ...claudeEditSize(event) }];
    } else if (claudeShellTools.includes(event.tool_name)) {
      const since = Number(readOptionalFile(startFile));
      fs.rmSync(startFile, { force: true });
      // Allow for coarse file-system timestamps.
      if (since) changes = doFilesModifiedSince(since - 2000, cwd, event.tool_input?.command)
        .map((file) => ({ file, lines: null, created: false }));
    }
    changes = changes.filter((change) => isMaintainedDo(change.file, cwd));
    if (changes.length === 0) return {};

    const firstPatch = !readOptionalFile(turnFile);
    rememberChanges(turnFile, changes);
    if (!firstPatch) return {};
    return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `${reportRule}\n\n${reviewRule}` } };
  }

  if (event.hook_event_name !== "Stop") return {};
  const remembered = rememberedChanges(turnFile);
  if (remembered.length) fs.rmSync(turnFile, { force: true });
  if (event.stop_hook_active || remembered.length === 0) return {};
  const draft = lastAssistantText(event);
  if (typeof draft !== "string") return {};
  return stopReview(draft, remembered);
}

// Changed lines from the Edit/Write input; Write of a new file is a creation and needs no diff.
function claudeEditSize(event) {
  const input = event.tool_input ?? {};
  const lineCount = (text) => (typeof text === "string" && text.length ? text.split(/\r?\n/).length : 0);
  if (event.tool_name === "Write") {
    const created = event.tool_response?.type === "create";
    return { lines: created ? lineCount(input.content) : null, created };
  }
  const edits = event.tool_name === "MultiEdit" ? input.edits : [input];
  if (!Array.isArray(edits) || !edits.every((edit) => typeof edit?.old_string === "string" && typeof edit?.new_string === "string")) {
    return { lines: null, created: false };
  }
  return { lines: edits.reduce((sum, edit) => sum + lineCount(edit.old_string) + lineCount(edit.new_string), 0), created: false };
}

// Codex events carry a turn id; Claude Code events do not.
function handle(event) {
  if (typeof event.session_id !== "string") return {};
  return typeof event.turn_id === "string" ? handleCodex(event) : handleClaude(event);
}

const event = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(handle(event)) + "\n");
