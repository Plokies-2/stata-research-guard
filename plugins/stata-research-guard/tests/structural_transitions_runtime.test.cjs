"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "structural_transitions_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

test("structural-transition fixture stays atomic and parsimonious", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");

  assert.match(fixture, /^reshape wide sales, i\(firm_id\) j\(year\)$/m);
  assert.match(fixture, /^reshape long revenue_ cost_, i\(firm_id\) j\(year\)$/m);
  assert.match(fixture, /^xtset firm_id year$/m);
  assert.match(fixture, /^tsfill$/m);
  assert.doesNotMatch(fixture, /^tsfill\s*,\s*full/m);
  assert.match(fixture, /^foreach v of varlist sales employees \{$/m);
  assert.match(fixture, /^collapse \(mean\) sales employees, by\(firm_id year\)$/m);
  assert.equal((fixture.match(/^foreach v of varlist sales employees \{$/gm) || []).length, 2);
  assert.match(fixture, /^twoway line series_a period, name\(graph_left, replace\)$/m);
  assert.match(fixture, /^twoway scatter series_b period, name\(graph_right, replace\)$/m);
  assert.match(fixture, /^graph combine graph_left graph_right, cols\(2\) name\(graph_combined, replace\)$/m);
  assert.match(fixture, /^graph save "`fixture_root'\/figures\/named_graph_combine\.gph", replace$/m);
  assert.match(fixture, /^graph export "`fixture_root'\/figures\/named_graph_combine\.pdf", replace$/m);
  assert.equal((fixture.match(/^\* SECTION:/gm) || []).length, 5);
  assert.doesNotMatch(fixture, /^\s*(?:program define|forvalues|while)\b/m);
});

test("structural-transition fixture runs in StataMP and creates the composite graph", (t) => {
  const stata = stataExecutable();
  if (!stata) return t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-structural-transitions-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "structural_transitions_runtime.log");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  for (const marker of [
    "RESHAPE_LONG_TO_WIDE_RUNTIME_PASSED",
    "RESHAPE_MULTI_STUB_WIDE_TO_LONG_RUNTIME_PASSED",
    "PANEL_TSFILL_RUNTIME_PASSED",
    "COLLAPSE_LABEL_ROUNDTRIP_RUNTIME_PASSED",
    "NAMED_GRAPH_COMBINE_RUNTIME_PASSED",
    "STRUCTURAL_TRANSITIONS_RUNTIME_PASSED",
  ]) {
    assert.match(log, new RegExp(marker));
  }
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);

  const gph = path.join(root, "figures", "named_graph_combine.gph");
  const pdf = path.join(root, "figures", "named_graph_combine.pdf");
  assert.ok(fs.statSync(gph).size > 4, gph);
  assert.ok(fs.statSync(pdf).size > 4, pdf);
  assert.equal(fs.readFileSync(pdf).subarray(0, 4).toString("ascii"), "%PDF");
});
