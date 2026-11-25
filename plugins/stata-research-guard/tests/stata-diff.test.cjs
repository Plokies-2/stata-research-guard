"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const script = path.join(__dirname, "..", "hooks", "stata-diff.cjs");
const reviewConfirmation = "수정 코드 주변 50줄을 읽어 중복 구현을 확인했다.";
const diffReply = "Changed model.do.\n```diff\n-* Before\n+* After\n```";
const goodReply = `${diffReply}\n\n${reviewConfirmation}`;

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
  assert.match(result.reason, /50 lines before and after/);
  assert.match(result.reason, /Review every changed operation/);
  assert.match(result.reason, /directly connected producers and consumers/);
  assert.match(result.reason, /preserves the required behavior/);
  assert.ok(result.reason.includes(reviewConfirmation));
  assert.doesNotMatch(result.reason, /missing \.do file diffs/);
  assert.match(run({ hook_event_name: "Stop", last_assistant_message: reviewConfirmation }).reason,
    /missing \.do file diffs/);
});

test("a review-only Stop preserves a separate diff reminder preference", (t) => {
  const { run, writeTranscript } = fixture(t, ["--review-only"]);
  writeTranscript([{ type: "task_started", turn_id: "turn" }, fileChange("model.do")]);
  assert.equal(run({ hook_event_name: "Stop", last_assistant_message: diffReply }).decision, "block");
  assert.deepEqual(run({ hook_event_name: "Stop", last_assistant_message: reviewConfirmation }), {});
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

function claudeFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stata-diff-claude-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const transcript = path.join(dir, "session.jsonl");
  const env = { ...process.env, CLAUDE_PLUGIN_DATA: path.join(dir, "data") };
  delete env.PLUGIN_DATA;
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
  assert.match(blocked.reason, /50 lines before and after/);
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
