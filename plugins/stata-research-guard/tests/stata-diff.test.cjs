"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const script = path.join(__dirname, "..", "hooks", "stata-diff.cjs");
const goodReply = "Changed model.do.\n```diff\n-* Before\n+* After\n```";

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stata-diff-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const transcript = path.join(dir, "turn.jsonl");
  const run = (event) => JSON.parse(execFileSync(process.execPath, [script], {
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
