"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "event_compact_numlist_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("compact selected-level event syntax is direct and leaves the reference absent", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");
  assert.match(fixture, /i\(2015\/2018 2020\/2023\)\.year#1\.treated/);
  assert.doesNotMatch(fixture, /(?:local|global)\s+event_rhs/i);
  assert.doesNotMatch(fixture, /##/);
  const estimator = fixture.match(/^regress[\s\S]*?vce\(cluster firm_id\)/m)?.[0] || "";
  assert.doesNotMatch(estimator, /2019\.year#1\.treated/);
});

test("compact selected-level event syntax runs in Stata and exposes observed raw e(b) names", (t) => {
  const stata = stataExecutable();
  if (!stata) return t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-event-compact-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "event_compact_numlist_runtime.log");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.match(log, /EVENT_COMPACT_NUMLIST_RUNTIME_PASSED/);
  assert.match(log, /COMPACT_EVENT_COLNAMES 2015b\.year#1\.treated .*2023\.year#1\.treated _cons/s);
  assert.doesNotMatch(log, /^\s+2019 1\s+\|/m);
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);
});
