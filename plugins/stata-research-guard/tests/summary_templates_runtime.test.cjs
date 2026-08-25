"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "summary_templates_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("summary templates stay direct and parsimonious", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");

  assert.match(fixture, /^collapse \/\/\/$/m);
  for (const statistic of ["mean", "sd", "count", "sum", "p25", "p50", "p75"]) {
    assert.match(fixture, new RegExp(`\\(${statistic}\\)`, "i"), statistic);
  }
  assert.match(fixture, /^reshape long mean_ sd_ n_ sum_ p25_ p50_ p75_, \/\/\/$/m);
  assert.match(fixture, /^isid foreign variable$/m);
  assert.match(fixture, /^\s*export excel foreign n mean sd sum p25 p50 p75 using \/\/\/$/m);
  assert.match(fixture, /^\s*putexcel B2:B`last_row', nformat\(number\)$/m);
  assert.match(fixture, /^\s*putexcel C2:H`last_row', nformat\(number_d2\)$/m);
  assert.match(fixture, /^\s*graph bar \(asis\) mean, \/\/\/$/m);
  assert.doesNotMatch(fixture, /^\s*(?:program define|foreach|forvalues|while)\b/m);
  assert.equal((fixture.match(/^\* SECTION:/gm) || []).length, 3);
});

test("summary templates run in StataMP and create DTA Excel and PDF outputs", (t) => {
  const stata = stataExecutable();
  if (!stata) return t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-summary-templates-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "summary_templates_runtime.log");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  for (const marker of [
    "SUMMARY_LONG_RUNTIME_PASSED",
    "SUMMARY_EXCEL_RUNTIME_PASSED",
    "SUMMARY_BAR_RUNTIME_PASSED",
    "SUMMARY_TEMPLATES_RUNTIME_PASSED",
  ]) {
    assert.match(log, new RegExp(marker));
  }
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);

  const dta = path.join(root, "data", "summary_long.dta");
  const xlsx = path.join(root, "tables", "summary.xlsx");
  const pdf = path.join(root, "figures", "summary_price.pdf");
  assert.ok(fs.statSync(dta).size > 100, dta);
  assert.ok(fs.statSync(xlsx).size > 100, xlsx);
  assert.ok(fs.statSync(pdf).size > 100, pdf);
  assert.equal(fs.readFileSync(pdf).subarray(0, 4).toString("ascii"), "%PDF");
});
