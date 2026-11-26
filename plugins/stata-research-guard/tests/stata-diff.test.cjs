"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const script = path.join(__dirname, "..", "hooks", "stata-diff.cjs");
const reviewConfirmation = "수정 코드 주변과 관련 정의를 읽어 중복 구현을 확인했다.";
const legacyConfirmation = "수정 코드 주변 50줄을 읽어 중복 구현을 확인했다.";
const diffReply = "Changed model.do.\n```diff\n-* Before\n+* After\n```";
const confirmedLine = `${reviewConfirmation} (model.do 1-60행, controls 정의 3-5행)`;
const goodReply = `${diffReply}\n\n${confirmedLine}`;

function fixture(t, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stata-diff-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const transcript = path.join(dir, "turn.jsonl");
  const run = (event) => JSON.parse(execFileSync(process.execPath, [script, ...args], {
    input: JSON.stringify({ session_id: "session", turn_id: "turn", cwd: dir,
      transcript_path: transcript, ...event }),
    env: { ...process.env, PLUGIN_DATA: dir },
  }));
  const writeTranscript = (records) => fs.writeFileSync(transcript, records.map((payload) =>
    JSON.stringify({ type: "event_msg", payload })).join("\n") + "\n");
  return { dir, run, writeTranscript };
}

function fileChange(file, status = "completed") {
  return { type: "item_completed", item: { type: "FileChange", status,
    changes: { [file]: { type: "update" } } } };
}

test("native and shell patch replies remember successful .do writes without a transcript", (t) => {
  const { run } = fixture(t);
  const output = "Success. Updated the following files:\r\nM model.do\r\nM notes.md\r\n";
  for (const tool of ["apply_patch", "Bash"]) {
    const result = run({ hook_event_name: "PostToolUse", tool_name: tool,
      tool_input: { command: "apply_patch ..." }, tool_response: tool === "Bash"
        ? [{ type: "text", text: `Output:\n${output}` }] : output });
    assert.equal(result.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.equal(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." }).decision, "block");
  }
});

test("Stop recovers completed Code Mode changes when no tool callback ran", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  writeTranscript([
    { type: "task_started", turn_id: "previous" }, fileChange("previous.do"),
    { type: "task_started", turn_id: "turn" }, fileChange("failed.do", "failed"),
    fileChange("notes.md"), fileChange(path.join(dir, "model.do")),
  ]);
  assert.equal(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." }).decision, "block");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do.", stop_hook_active: true }), {});
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "No edits.", turn_id: "unknown" }), {});
});

test("an exec callback and the transcript count the same file only once", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(path.join(dir, "model.do"))]);
  const result = run({ hook_event_name: "PostToolUse", tool_name: "exec",
    tool_input: { code: "await tools.apply_patch(patch)" }, tool_response: {} });
  assert.equal(result.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
});

test("Stop asks for a fresh local review even when the diff is already present", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  const file = path.join(dir, "model.do");
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(file)]);
  const result = run({ hook_event_name: "Stop", last_assistant_message: diffReply });
  assert.equal(result.decision, "block");
  assert.ok(result.reason.includes(file));
  assert.match(result.reason, /300 lines or fewer/);
  assert.match(result.reason, /stata-replication-workflow edited-region review/);
  assert.match(result.reason, /supported command already does the same work/);
  // The full procedure lives in the skill, so the hook text stays short.
  assert.ok(result.reason.length < 1200);
  assert.ok(result.reason.includes(reviewConfirmation));
  assert.match(result.reason, /where the macros and variables it uses are defined/);
  assert.doesNotMatch(result.reason, /missing \.do file diffs/);
  assert.match(run({ hook_event_name: "Stop", last_assistant_message: confirmedLine }).reason,
    /missing \.do file diffs/);
});

test("the review confirmation needs the line ranges that were read", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(path.join(dir, "model.do"))]);
  const bare = run({ hook_event_name: "Stop", last_assistant_message: `${diffReply}\n\n${reviewConfirmation}` });
  assert.equal(bare.decision, "block");
  assert.match(bare.reason, /ranges you read/);
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(path.join(dir, "model.do"))]);
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: `${diffReply}\n\n${legacyConfirmation} (model.do 1-60행)` }), {});
});

test("a large edit that states the omitted diff is not asked for diff blocks", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(path.join(dir, "model.do"))]);
  const reply = `Rewrote model.do.\n\ndiff 생략: .do 변경 240줄\n\n${confirmedLine}`;
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: reply }), {});
});

test("a review-only Stop preserves a separate diff reminder preference", (t) => {
  const { run, writeTranscript } = fixture(t, ["--review-only"]);
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange("model.do")]);
  assert.equal(run({ hook_event_name: "Stop", last_assistant_message: diffReply }).decision, "block");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: confirmedLine }), {});
});

test("scratch .do edits are silent in patch callbacks and transcript recovery", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  const scratch = path.join(dir, "work", "TMP", "simulation.do");
  const patch = { hook_event_name: "PostToolUse", tool_name: "apply_patch",
    tool_response: `Success. Updated the following files:\nM ${scratch}\n` };
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(scratch)]);
  assert.deepEqual(run(patch), {});
  assert.deepEqual(run({ hook_event_name: "PostToolUse", tool_name: "exec",
    tool_input: { code: "await tools.apply_patch(patch)" } }), {});
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "Research summary." }), {});

  const maintained = path.join(dir, "work", "vehicle_registration", "model.do");
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange(scratch), fileChange(maintained)]);
  assert.equal(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." }).decision, "block");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
});

test("Stop lists repeated code in the changed file even after a confirmed review", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  const file = path.join(dir, "model.do");
  const base = 'subinstr("`outcome\'", "wins_", "", 1)';
  fs.writeFileSync(file, `local base = ${base}\nregress y x\nlocal base = ${base}\n`);
  // A Code Mode turn: the patch text sits in the tool call, the file in a FileChange record.
  const turn = (added) => fs.writeFileSync(path.join(dir, "turn.jsonl"), [
    { type: "event_msg", payload: { type: "task_started", turn_id: "turn", started_at: 1 } },
    { type: "response_item", payload: { type: "custom_tool_call", name: "exec",
      input: `await tools.apply_patch("*** Begin Patch\\n*** Update File: model.do\\n@@\\n+${added}\\n*** End Patch")` } },
    { type: "event_msg", payload: fileChange(file) },
  ].map((record) => JSON.stringify(record)).join("\n") + "\n");

  turn(`local base = ${base}`);
  const blocked = run({ hook_event_name: "Stop", last_assistant_message: goodReply });
  assert.equal(blocked.decision, "block");
  assert.ok(blocked.reason.includes(`model.do lines 1, 3: repeated expression: ${base}`));
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply, stop_hook_active: true }), {});

  // An edit elsewhere in the file does not bring back a repeat it did not touch.
  turn("regress y x");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
});

test("Codex shell and Code Mode commands that rewrite a .do file are found at Stop", (t) => {
  const { dir, run } = fixture(t);
  const old = path.join(dir, "old.do");
  fs.writeFileSync(old, "* untouched\n");
  const past = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(old, past, past);
  const records = [
    { type: "event_msg", payload: { type: "task_started", turn_id: "previous", started_at: 1 } },
    { type: "event_msg", payload: { type: "task_started", turn_id: "turn", started_at: Math.floor(Date.now() / 1000) } },
    { type: "response_item", payload: { type: "custom_tool_call", name: "exec",
      input: 'await tools.exec_command({cmd:"Set-Content model.do -Value x"})' } },
  ];
  fs.writeFileSync(path.join(dir, "turn.jsonl"), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "model.do"), "* new\n");
  const blocked = run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." });
  assert.ok(blocked.reason.includes(path.join(dir, "model.do")));
  assert.ok(!blocked.reason.includes("old.do"));
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "Done.", turn_id: "previous" }), {});
});

test("Stop names the aligner for an edited command whose /// markers are not in one column", (t) => {
  const { dir, run, writeTranscript } = fixture(t);
  const file = path.join(dir, "model.do");
  fs.writeFileSync(file, "summarize a ///\n  bb\nreg y x ///\n    absorb(fid) ///\n    vce(cluster fid)\n");
  const patch = (body) => run({ hook_event_name: "PostToolUse", tool_name: "apply_patch",
    tool_input: `*** Begin Patch\n*** Update File: model.do\n@@\n${body}\n*** End Patch`,
    tool_response: "Success. Updated the following files:\nM model.do\n" });
  writeTranscript([{ type: "task_started", turn_id: "turn" }]);
  patch("+    absorb(fid) ///");
  const blocked = run({ hook_event_name: "Stop", last_assistant_message: goodReply });
  assert.match(blocked.reason, /stata-align\.cjs" ".*model\.do" --lines 3-4/);
  // The untouched first command is not mentioned.
  assert.doesNotMatch(blocked.reason, /--lines 1-/);
});

function claudeFixture(t, { dataDir = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stata-diff-claude-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const transcript = path.join(dir, "session.jsonl");
  const env = { ...process.env, CLAUDE_PLUGIN_DATA: path.join(dir, "data") };
  delete env.PLUGIN_DATA;
  if (!dataDir) {
    delete env.CLAUDE_PLUGIN_DATA;
    env.TMPDIR = env.TEMP = env.TMP = dir;
  }
  const run = (event) => JSON.parse(execFileSync(process.execPath, [script], {
    input: JSON.stringify({ session_id: "session", cwd: dir, transcript_path: transcript, ...event }),
    env,
  }));
  return { dir, run, transcript };
}

test("Claude Code Edit and Write calls on maintained .do files request the review once", (t) => {
  const { dir, run } = claudeFixture(t);
  const edit = (file, tool = "Edit") => run({ hook_event_name: "PostToolUse", tool_name: tool,
    tool_input: { file_path: path.join(dir, file) } });
  assert.deepEqual(edit("notes.md"), {});
  assert.deepEqual(edit(path.join("tmp", "scratch.do")), {});
  assert.equal(edit("model.do").hookSpecificOutput.hookEventName, "PostToolUse");
  assert.deepEqual(edit("model.do", "Write"), {});
  const blocked = run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." });
  assert.equal(blocked.decision, "block");
  assert.match(blocked.reason, /300 lines or fewer/);
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." }), {});

  edit("model.do");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: goodReply }), {});
  edit("model.do");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: "x", stop_hook_active: true }), {});
});

test("Claude Code shell commands that rewrite a .do file are detected by modification time", (t) => {
  const { dir, run } = claudeFixture(t);
  const old = path.join(dir, "old.do");
  fs.writeFileSync(old, "* untouched\n");
  const past = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(old, past, past);
  const shell = (hook, command) => run({ hook_event_name: hook, tool_name: "PowerShell", tool_input: { command } });

  assert.deepEqual(shell("PreToolUse", "Get-ChildItem"), {});
  assert.deepEqual(shell("PostToolUse", "Get-ChildItem"), {});
  // Commands that do not name a .do file skip the folder scan.
  assert.deepEqual(shell("PreToolUse", "python fix.py"), {});
  fs.writeFileSync(path.join(dir, "unnamed.do"), "* new\n");
  assert.deepEqual(shell("PostToolUse", "python fix.py"), {});
  fs.rmSync(path.join(dir, "unnamed.do"));

  assert.deepEqual(shell("PreToolUse", "Set-Content model.do"), {});
  fs.writeFileSync(path.join(dir, "model.do"), "* new\n");
  assert.equal(shell("PostToolUse", "Set-Content model.do").hookSpecificOutput.hookEventName, "PostToolUse");
  const blocked = run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." });
  assert.ok(blocked.reason.includes(path.join(dir, "model.do")));
  assert.ok(!blocked.reason.includes("old.do"));
});

test("Claude Code Stop reads the final reply from the transcript when the field is absent", (t) => {
  const { dir, run, transcript } = claudeFixture(t);
  run({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: path.join(dir, "model.do") } });
  const lines = [
    { type: "user", message: { content: "Edit model.do" } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit" }] } },
    { type: "user", message: { content: [{ type: "tool_result" }] } },
    { type: "assistant", message: { content: [{ type: "text", text: goodReply }] } },
  ];
  fs.writeFileSync(transcript, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
  assert.deepEqual(run({ hook_event_name: "Stop" }), {});
});

test("Claude Code Stop checks a final reply sent only through a tool call", (t) => {
  const { dir, run, transcript } = claudeFixture(t);
  const finish = (text) => {
    run({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: path.join(dir, "model.do") } });
    fs.writeFileSync(transcript, [
      { type: "user", message: { content: "Edit model.do" } },
      { type: "assistant", message: { content: [{ type: "tool_use", name: "post_message", input: { text } }] } },
      { type: "user", message: { content: [{ type: "tool_result" }] } },
    ].map((line) => JSON.stringify(line)).join("\n") + "\n");
    return run({ hook_event_name: "Stop", last_assistant_message: "" });
  };
  assert.equal(finish("Changed model.do.").decision, "block");
  assert.deepEqual(finish(goodReply), {});
});

test("Claude Code shell commands that edit .do files through a wildcard in another folder are detected", (t) => {
  const { dir, run } = claudeFixture(t);
  // Outside the temp folder, whose name marks scratch work.
  const other = fs.mkdtempSync(path.join(os.homedir(), "stata-diff-other-"));
  t.after(() => fs.rmSync(other, { recursive: true, force: true }));
  const command = `Get-ChildItem "${other}" -Filter "1_*.do" | Add-Content -Value "* note"`;
  run({ hook_event_name: "PreToolUse", tool_name: "PowerShell", tool_input: { command } });
  fs.writeFileSync(path.join(other, "1_cleaning.do"), "* note\n");
  const posted = run({ hook_event_name: "PostToolUse", tool_name: "PowerShell", tool_input: { command } });
  assert.equal(posted.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.ok(run({ hook_event_name: "Stop", last_assistant_message: "Done." }).reason.includes("1_cleaning.do"));
});

test("diff omission is refused below 200 changed lines and new files need no diff", (t) => {
  const { dir, run } = claudeFixture(t);
  const file = path.join(dir, "model.do");
  const omitted = `Rewrote model.do.\n\ndiff 생략: .do 변경 240줄\n\n${confirmedLine}`;
  const edit = (newString) => run({ hook_event_name: "PostToolUse", tool_name: "Edit",
    tool_input: { file_path: file, old_string: "* old", new_string: newString } });

  edit("* new");
  const small = run({ hook_event_name: "Stop", last_assistant_message: omitted });
  assert.equal(small.decision, "block");
  assert.match(small.reason, /only 2 \.do lines changed/);

  edit(Array.from({ length: 250 }, (_, i) => `* line ${i}`).join("\n"));
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: omitted }), {});

  run({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: path.join(dir, "new.do"), content: "* new\n" },
    tool_response: { type: "create" } });
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: `Created new.do.\n\n${confirmedLine}` }), {});
});

test("without a plugin data folder the hook keeps its state in the temp folder", (t) => {
  const { dir, run } = claudeFixture(t, { dataDir: false });
  const posted = run({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: path.join(dir, "model.do") } });
  assert.equal(posted.hookSpecificOutput.hookEventName, "PostToolUse");
  assert.equal(run({ hook_event_name: "Stop", last_assistant_message: "Changed model.do." }).decision, "block");
});

test("Codex patches count their changed lines before a diff can be omitted", (t) => {
  const { run } = fixture(t);
  const patch = (body) => run({ hook_event_name: "PostToolUse", tool_name: "apply_patch",
    tool_input: `*** Begin Patch\n*** Update File: model.do\n@@\n${body}\n*** End Patch`,
    tool_response: "Success. Updated the following files:\nM model.do\n" });
  const omitted = `Rewrote model.do.\n\ndiff 생략: 큰 변경\n\n${confirmedLine}`;
  patch("-* old\n+* new");
  assert.match(run({ hook_event_name: "Stop", last_assistant_message: omitted }).reason, /only 2 \.do lines changed/);
  patch(Array.from({ length: 210 }, (_, i) => `+* line ${i}`).join("\n"));
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: omitted }), {});
});
