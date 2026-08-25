"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PLUGIN_ROOT, "..", "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "outreg2_excel_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("outreg2 Excel fixture keeps every runtime output under the supplied root", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");

  assert.match(fixture, /^args fixture_root$/m);
  assert.match(fixture, /^global ster\s+"`fixture_root'\/estimates"$/m);
  assert.match(fixture, /^global table\s+"`fixture_root'\/tables"$/m);
  assert.match(fixture, /^log using "`fixture_root'\/outreg2_excel_runtime\.log", replace text$/m);
  assert.match(fixture, /^confirm file "\$table\/all\.xlsx"$/m);
});

test("outreg2 Excel fixture runs freshly in StataMP and preserves raw-output markers", (t) => {
  const stata = stataExecutable();
  if (!stata) return t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-outreg2-excel-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "outreg2_excel_runtime.log");
  const workbookPath = path.join(root, "tables", "all.xlsx");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  for (const marker of [
    "OUTREG2_XLSX_FIRST_STAGE_PASSED",
    "OUTREG2_XLSX_2SLS_AND_FIRST_STAGE_PASSED",
    "OUTREG2_XLSX_POISSON_MISSING_R2_PASSED",
    "OUTREG2_XLSX_RUNTIME_PASSED",
  ]) {
    assert.match(log, new RegExp(marker));
  }
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);
  assert.ok(fs.statSync(workbookPath).size > 0, workbookPath);
});
