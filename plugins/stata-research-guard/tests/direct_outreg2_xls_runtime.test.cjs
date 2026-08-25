"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PLUGIN_ROOT, "..", "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "direct_outreg2_xls_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("direct one-sheet fixture declares an explicit xls target and no program", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");
  assert.match(fixture, /^outreg2 using "`fixture_root'\/auto_price\.xls", excel replace/m);
  assert.doesNotMatch(fixture, /^program\b/m);
});

test("direct one-sheet outreg2 runs freshly and creates only the named xls workbook", (t) => {
  const stata = stataExecutable();
  if (!stata) return t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-direct-outreg2-xls-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "direct_outreg2_xls_runtime.log");
  const workbookPath = path.join(root, "auto_price.xls");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  assert.match(log, /DIRECT_OUTREG2_XLS_RUNTIME_PASSED/);
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);
  assert.ok(fs.statSync(workbookPath).size > 0, workbookPath);
  assert.equal(fs.existsSync(path.join(root, "auto_price.xml")), false);
  assert.equal(fs.existsSync(path.join(root, "auto_price.xlsx")), false);
});
