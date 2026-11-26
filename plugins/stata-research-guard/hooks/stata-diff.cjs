"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { changedLineNumbers, findRepeats, formatFinding } = require("./stata-repeats.cjs");
const { alignContinuations } = require("./stata-align.cjs");
const alignScript = path.join(__dirname, "stata-align.cjs");

// The full procedures live in stata-replication-workflow references/after-editing.md; hooks only point to them.
const reviewLines = 50;
const wholeFileLines = 300;
const reviewConfirmation = "수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다.";
// Earlier releases asked for this wording; it still counts.
const legacyConfirmation = `수정 코드 주변 ${reviewLines}줄을 읽어 중복 구현을 확인했다.`;
const reviewRule = `Run the stata-replication-workflow edited-region review (references/after-editing.md): read the whole file when it has ${wholeFileLines} lines or fewer, otherwise each changed region and the ${reviewLines} lines before and after it, plus where the macros and variables it uses are defined. Check whether existing code or a supported command already does the same work, such as a new global for what an existing global holds, a second collapse, or if/strpos() reclassifying a fixed list, and fix duplicates in scope. After the review, put this line on its own line in the final reply, followed by the ranges you read:\n${reviewConfirmation} (file.do 260-380행, controls 정의 12-18행)`;
const maxRepeats = 20;
const repeatRule = "Define each repeat once and reuse it, or say in the final reply why the copies differ. Outcome groups become one global; a value derived per iteration is computed once; model and output options stay in each command. Check again with node hooks/stata-repeats.cjs <file>.";
const largeEditLines = 200;
const reportRule = `Show a fenced diff block for each changed .do file, following stata-replication-workflow references/after-editing.md, and under it the line count as \`file.do: +added -removed (net N)\`. For an edit of ${largeEditLines} or more changed .do lines, write a line starting with \`diff 생략:\` instead. Newly created files need no diff.`;
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

// Lines a patch adds, without the leading +. Repeats are reported only where these lines now sit.
function patchAddedLines(text) {
  return String(text ?? "").split(/\r?\n/).filter((line) => /^\+/.test(line) && !/^\+\+\+( |$)/.test(line)).map((line) => line.slice(1));
}

// Added and removed lines for each file section of an apply_patch text, keyed by the path the patch names.
function patchFileCounts(text) {
  const counts = new Map();
  let current = null;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const header = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+?)\s*$/);
    if (header) {
      current = { plus: 0, minus: 0, deleted: line.startsWith("*** Delete") };
      counts.set(header[1], current);
    } else if (current && /^\+/.test(line)) current.plus += 1;
    else if (current && /^-/.test(line)) current.minus += 1;
  }
  return counts;
}

// Added and removed lines between two texts, from their longest common run of lines.
// added lists the new lines so repeats can be reported where they now sit; counts are null for very large changes.
function lineChanges(before, after) {
  const a = before ? before.split(/\r?\n/) : [];
  const b = after ? after.split(/\r?\n/) : [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const oldPart = a.slice(start, endA);
  const newPart = b.slice(start, endB);
  const width = newPart.length + 1;
  if (oldPart.length * newPart.length > 4e6) return { plus: null, minus: null, added: newPart };
  const common = new Uint16Array((oldPart.length + 1) * width);
  for (let i = oldPart.length - 1; i >= 0; i -= 1) {
    for (let j = newPart.length - 1; j >= 0; j -= 1) {
      common[i * width + j] = oldPart[i] === newPart[j] ? common[(i + 1) * width + j + 1] + 1
        : Math.max(common[(i + 1) * width + j], common[i * width + j + 1]);
    }
  }
  const added = [];
  let i = 0;
  let j = 0;
  while (j < newPart.length) {
    if (i < oldPart.length && oldPart[i] === newPart[j]) {
      i += 1;
      j += 1;
    } else if (i < oldPart.length && common[(i + 1) * width + j] >= common[i * width + j + 1]) i += 1;
    else added.push(newPart[j++]);
  }
  return { plus: added.length, minus: oldPart.length - (newPart.length - added.length), added };
}

// Text of the .do files a shell command may write, saved before it runs: the files it names and the
// .do files directly inside cwd and the folders it names. null marks a named file that does not exist yet.
const snapshotFiles = 200;
const snapshotBytes = 2000000;
function snapshotDoFiles(cwd, command) {
  const dirs = commandDirectories(cwd, command);
  const files = new Set(namedDoFiles(cwd, dirs, command));
  for (const dir of [cwd, ...dirs]) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && /\.do$/i.test(entry.name)) files.add(path.join(dir, entry.name));
      }
    } catch {}
  }
  const snapshot = {};
  for (const file of [...files].slice(0, snapshotFiles)) {
    try {
      if (fs.statSync(file).size <= snapshotBytes) snapshot[fileKey(file)] = fs.readFileSync(file, "utf8");
    } catch {
      snapshot[fileKey(file)] = null;
    }
  }
  return snapshot;
}

// Windows paths differ in case and slashes between tools; one key per file.
function fileKey(file) {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

// The change a shell command made to one file, measured against the text saved before it ran.
// Without a saved text the lines are unknown and the whole file is checked.
function shellChange(file, snapshot) {
  const before = snapshot?.[fileKey(file)];
  if (before === undefined) return { file, lines: null, created: false, added: null };
  const after = readOptionalFile(file);
  if (before === after) return null;
  const { plus, minus, added } = lineChanges(before ?? "", after);
  return { file, lines: plus === null ? null : plus + minus, created: before === null, added, plus, minus };
}

// A tool input as text, with escaped newlines restored so patch lines can be read.
// Code Mode often passes the patch as a JavaScript string with \n escapes.
function inputText(input) {
  return (typeof input === "string" ? input : JSON.stringify(input ?? "")).replace(/\\n/g, "\n");
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

// The current turn's start time and the tool-call inputs that name a .do file.
function turnToolCalls(event) {
  if (typeof event.transcript_path !== "string") return null;
  const inputs = [];
  for (const line of readOptionalFile(event.transcript_path).split("\n").reverse()) {
    if (!line.includes('"task_started"') && !line.includes("_call")) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = entry?.payload ?? {};
    if (payload.type === "task_started") {
      return payload.turn_id === event.turn_id ? { startedAt: payload.started_at, inputs } : null;
    }
    const input = String(payload.input ?? payload.arguments ?? "");
    if (entry.type === "response_item" && /_call$/.test(payload.type) && /\.do\b/i.test(input)) inputs.push(input);
  }
  return null;
}

// Shell and Code Mode commands leave no FileChange record, so a turn whose tool calls name a .do file
// is checked by modification time against the turn's start.
function turnShellEdits(calls, cwd) {
  if (!calls || !calls.inputs.length || !calls.startedAt) return [];
  return doFilesModifiedSince(calls.startedAt * 1000 - 2000, cwd, calls.inputs.join("\n"));
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
  const snapshotFile = `${turnFile}.snapshot`;

  // Keep each .do file's text from before the first shell command of the turn that could change it.
  if (event.hook_event_name === "PreToolUse") {
    const command = inputText(event.tool_input);
    if (!/\.do\b/i.test(command)) return {};
    let saved = {};
    try {
      saved = JSON.parse(readOptionalFile(snapshotFile) || "{}");
    } catch {}
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(snapshotFile, JSON.stringify({ ...snapshotDoFiles(event.tool_cwd || cwd, command), ...saved }), "utf8");
    return {};
  }

  if (event.hook_event_name === "PostToolUse") {
    const firstPatch = !readOptionalFile(turnFile);
    const hasPatch = /\bapply_patch\b/.test(JSON.stringify(event.tool_input ?? ""));
    let changes = [];
    if (event.tool_name === "apply_patch" || (hasPatch && ["Bash", "exec_command"].includes(event.tool_name))) {
      const files = successfulPatchFiles(event.tool_response);
      // One patch can touch several files; its total is kept on the first so the sum stays right.
      const patch = inputText(event.tool_input);
      const total = patchLineCount(patch);
      const added = patchAddedLines(patch);
      const sections = [...patchFileCounts(patch)].map(([file, count]) => ({ file: path.resolve(event.tool_cwd || cwd, file), ...count }));
      changes = files.map((change, index) => {
        const file = path.resolve(event.tool_cwd || cwd, change.file);
        // A deleted file's removed lines are not in the patch, so its count stays unknown.
        const count = sections.find((section) => section.file === file && !section.deleted);
        return { file, lines: index === 0 ? total : (total === null ? null : 0), created: change.created, added,
          plus: count ? count.plus : null, minus: count ? count.minus : null };
      });
    } else if (event.tool_name === "exec" && hasPatch && firstPatch) {
      // Code Mode patches are read from the transcript again at Stop, so only the files are kept here.
      changes = transcriptFiles(event).map((file) => ({ file: path.resolve(cwd, file), lines: null, created: false, added: [] }));
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
  let snapshot = {};
  try {
    snapshot = JSON.parse(readOptionalFile(snapshotFile) || "{}");
  } catch {}
  fs.rmSync(snapshotFile, { force: true });
  const draft = event.last_assistant_message;
  if (event.stop_hook_active || typeof draft !== "string") return {};
  const calls = turnToolCalls(event);
  // Lines added by every patch in this turn, including patches sent from Code Mode.
  const turnAdded = (calls?.inputs ?? []).filter((input) => /\bapply_patch\b/.test(input)).flatMap((input) => patchAddedLines(inputText(input)));
  const recorded = [...remembered, ...transcriptFiles(event).map((file) => ({ file, lines: null, created: false, added: turnAdded }))]
    .map((change) => ({ ...change, file: path.resolve(cwd, change.file) }));
  const recordedFiles = new Set(recorded.map((change) => change.file));
  // A shell edit is measured against the text saved before the turn's first shell command;
  // without one its file is checked as a whole.
  const shellEdits = turnShellEdits(calls, cwd).filter((file) => !recordedFiles.has(file))
    .map((file) => shellChange(file, snapshot)).filter(Boolean);
  const changes = [...recorded, ...shellEdits].filter((change) => isMaintainedDo(change.file, cwd));
  if (changes.length === 0) return {};
  return stopReview(draft, changes);
}

// A per-file total that stays null once any edit of the file could not be counted.
function sumKnown(previous, change, key) {
  if ((previous && previous[key] === null) || typeof change[key] !== "number") return null;
  return (previous?.[key] ?? 0) + change[key];
}

// The reply's "file.do: +A -R (net N)" line for a file, with N read as a number.
function statedNet(lines, name) {
  for (const line of lines) {
    const match = line.includes(name) && line.match(/\bnet\s*([+\-−]?)\s*(\d+)/i);
    if (match) return (match[1] === "-" || match[1] === "−" ? -1 : 1) * Number(match[2]);
  }
  return null;
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
      // null means the edit text is unknown (a shell edit), so the whole file is checked.
      added: (previous && previous.added === null) || !Array.isArray(change.added) ? null : [...(previous?.added ?? []), ...change.added],
      plus: sumKnown(previous, change, "plus"),
      minus: sumKnown(previous, change, "minus"),
    });
  }
  if (!lines.some(confirmedReview)) {
    const files = [...byFile.keys()].map((file) => `- ${file}`).join("\n");
    reasons.push(`Before ending, perform the missing duplicate-implementation review of these changed .do files:\n${files}\n\n${reviewRule}`);
  }
  const repeats = [...byFile].flatMap(([file, entry]) => {
    const text = readOptionalFile(file);
    const changed = entry.added === null ? null : changedLineNumbers(text, entry.added);
    return findRepeats(text, changed).map((finding) => formatFinding(file, finding));
  });
  if (repeats.length) {
    const shown = repeats.slice(0, maxRepeats).map((line) => `- ${line}`).join("\n");
    const more = repeats.length > maxRepeats ? `\n- ... ${repeats.length - maxRepeats} more` : "";
    reasons.push(`Lines to fix in the changed .do files:\n${shown}${more}\n\n${repeatRule}`);
  }
  // Only blocks the turn edited are aligned, so untouched code keeps its spacing.
  const unaligned = [...byFile].flatMap(([file, entry]) => {
    if (entry.added === null) return [];
    const changed = [...changedLineNumbers(readOptionalFile(file), entry.added)];
    if (!changed.length) return [];
    const blocks = alignContinuations(readOptionalFile(file), changed.map((line) => [line, line])).changed;
    return blocks.length ? [`node "${alignScript}" "${file}" --lines ${blocks.map(([from, to]) => `${from}-${to}`).join(",")}`] : [];
  });
  if (unaligned.length) {
    reasons.push(`The /// markers of these edited commands are not in one column. Run the aligner, which changes only the spaces before ///, and show the result in the diff:\n${unaligned.join("\n")}`);
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
    // Each changed file gets a "file.do: +A -R (net N)" line; counts known from this turn's edits must match.
    const netProblems = needDiff.flatMap((file) => {
      const name = path.basename(file);
      const { plus, minus } = byFile.get(file);
      const known = plus !== null && minus !== null;
      const stated = statedNet(lines, name);
      if (stated !== null && (!known || stated === plus - minus)) return [];
      const expected = known ? `${name}: +${plus} -${minus} (net ${plus - minus >= 0 ? "+" : ""}${plus - minus})`
        : `${name}: count the + and - lines of its diff`;
      return [stated === null ? `- ${expected}` : `- ${expected}, not net ${stated}`];
    });
    if (netProblems.length) {
      reasons.push(`Under each .do diff, put the file's line count as "file.do: +added -removed (net N)":\n${netProblems.join("\n")}`);
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
  const named = commandDirectories(cwd, command);
  const stack = [cwd, ...named];
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
  for (const full of namedDoFiles(cwd, named, command)) {
    try {
      if (fs.statSync(full).mtimeMs >= since) found.add(full);
    } catch {}
  }
  return [...found];
}

// A command can write a .do file outside cwd by naming it, relative to cwd or to a folder it changes into.
function namedDoFiles(cwd, dirs, command) {
  const files = [];
  for (const match of String(command ?? "").matchAll(/[A-Za-z]:[\\/][^"'\r\n<>|*?]*?\.do\b|[^\s"'<>|*?=]+\.do\b/g)) {
    for (const base of [cwd, ...dirs]) files.push(path.resolve(base, nativePath(match[0])));
  }
  return files;
}

// Git Bash writes C:\Users as /c/Users; Node on Windows needs the drive letter.
function nativePath(token) {
  const drive = process.platform === "win32" && String(token).match(/^\/([A-Za-z])(?:\/(.*))?$/);
  return drive ? `${drive[1].toUpperCase()}:/${drive[2] ?? ""}` : token;
}

// Folders the command names (including the folder of a wildcard such as code/1_*.do) are scanned too,
// so commands that edit .do files outside cwd are still detected.
function commandDirectories(cwd, command) {
  const dirs = new Set();
  for (const match of String(command ?? "").matchAll(/"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s"'|;&<>()]+)/g)) {
    let token = match[1] ?? match[2] ?? match[3];
    if (/[*?]/.test(token)) token = path.dirname(token);
    if (!token || token === "." || /^-/.test(token)) continue;
    const full = path.resolve(cwd, nativePath(token));
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
    const command = event.tool_input.command;
    fs.writeFileSync(startFile, JSON.stringify({ since: Date.now(), files: snapshotDoFiles(cwd, command) }), "utf8");
    return {};
  }

  if (event.hook_event_name === "PostToolUse") {
    let changes = [];
    if (claudeEditTools.includes(event.tool_name) && typeof event.tool_input?.file_path === "string") {
      changes = [{ file: path.resolve(cwd, event.tool_input.file_path), ...claudeEditSize(event) }];
    } else if (claudeShellTools.includes(event.tool_name)) {
      let start = {};
      try {
        start = JSON.parse(readOptionalFile(startFile) || "{}");
      } catch {}
      fs.rmSync(startFile, { force: true });
      // Allow for coarse file-system timestamps.
      if (start.since) changes = doFilesModifiedSince(start.since - 2000, cwd, event.tool_input?.command)
        .map((file) => shellChange(file, start.files)).filter(Boolean);
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
    return { lines: created ? lineCount(input.content) : null, created,
      added: typeof input.content === "string" ? input.content.split(/\r?\n/) : null,
      plus: created ? lineCount(input.content) : null, minus: created ? 0 : null };
  }
  const edits = event.tool_name === "MultiEdit" ? input.edits : [input];
  if (!Array.isArray(edits) || !edits.every((edit) => typeof edit?.old_string === "string" && typeof edit?.new_string === "string")) {
    return { lines: null, created: false, plus: null, minus: null };
  }
  const counts = edits.map((edit) => lineChanges(edit.old_string, edit.new_string));
  const total = (key) => (counts.some((count) => count[key] === null) ? null : counts.reduce((sum, count) => sum + count[key], 0));
  return { lines: edits.reduce((sum, edit) => sum + lineCount(edit.old_string) + lineCount(edit.new_string), 0), created: false,
    added: edits.flatMap((edit) => edit.new_string.split(/\r?\n/)), plus: total("plus"), minus: total("minus") };
}

// Codex events carry a turn id; Claude Code events do not.
function handle(event) {
  if (typeof event.session_id !== "string") return {};
  return typeof event.turn_id === "string" ? handleCodex(event) : handleClaude(event);
}

const event = JSON.parse(fs.readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(handle(event)) + "\n");
