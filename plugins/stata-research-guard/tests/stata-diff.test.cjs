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
