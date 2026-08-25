"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "state_transition_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("state-transition fixture keeps the sample-flow and estimate lifecycle direct", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");
  assert.equal((fixture.match(/^postfile\s/gm) || []).length, 1);
  assert.equal((fixture.match(/^post\s/gm) || []).length, 2);
  assert.equal((fixture.match(/^postclose\s/gm) || []).length, 1);
  assert.match(fixture, /^postfile .*str40 checkpoint long n .*sample_flow\.dta.*, replace$/m);
  assert.equal((fixture.match(/^estimates save .*replace$/gm) || []).length, 1);
  assert.equal((fixture.match(/^estimates save .*append$/gm) || []).length, 1);
  assert.equal((fixture.match(/^estimates use .*number\([12]\)$/gm) || []).length, 2);
  assert.equal((fixture.match(/^estimates store /gm) || []).length, 2);
  assert.equal((fixture.match(/^estimates restore /gm) || []).length, 1);
  assert.doesNotMatch(fixture, /^\s*(?:forvalues|foreach|while)\b/m);
  assert.doesNotMatch(fixture, /^\s*program\b/m);
});

test("state-transition fixture runs in StataMP and preserves ordered states", (t) => {
  const stata = stataExecutable();
  if (!stata) t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-state-transition-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "state_transition_runtime.log");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  assert.match(log, /STATE_TRANSITION_RUNTIME_PASSED/);
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);
  assert.ok(fs.statSync(path.join(root, "sample_flow.dta")).size > 0);
  assert.ok(fs.statSync(path.join(root, "ordered_results.ster")).size > 0);
});
