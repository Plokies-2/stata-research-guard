"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(PLUGIN_ROOT, "tests", "fixtures", "event_reference_slot_runtime.do");
const STATA_CANDIDATES = [
  process.env.STATA_EXE,
  "C:\\Program Files\\Stata19\\StataMP-64.exe",
  "C:\\Program Files\\Stata18\\StataMP-64.exe",
  "C:\\Program Files\\Stata17\\StataMP-64.exe",
].filter(Boolean);

function stataExecutable() {
  return STATA_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

function macroValue(text, name) {
  const match = text.match(new RegExp("^local\\s+" + name + "\\s+(.+)$", "m"));
  assert.ok(match, `missing local ${name}`);
  return match[1].trim().replace(/^`?"/, "").replace(/"'?$/, "");
}

test("event runtime fixture declares one generic omitted-base reference slot", () => {
  const fixture = fs.readFileSync(FIXTURE, "utf8");
  const terms = macroValue(fixture, "event_terms");
  const order = macroValue(fixture, "event_order");
  const labels = macroValue(fixture, "event_xlabels");
  const termsTokens = terms.split(/\s+/);
  const orderTokens = order.split(/\s+/);
  const slot = orderTokens.indexOf(".") + 1;

  assert.equal((orderTokens.filter((token) => token === ".")).length, 1);
  assert.equal(termsTokens.includes("."), false);
  assert.deepEqual(orderTokens.filter((token) => token !== "."), termsTokens);
  assert.equal(slot, 5);
  assert.match(labels, /5 "2019"/);
  assert.match(fixture, /^local event_xlabels `".*""'$/m);
  assert.match(fixture, /^local reference_position 5$/m);
  assert.match(fixture, /^local policy_line = `reference_position' \+ 0\.5$/m);
  assert.doesNotMatch(fixture, /^global\s+(?:event_terms|event_order|event_xlabels|reference_position)\b/m);
  const rhs = fixture.match(/^local event_rhs ([\s\S]*?)(?=\r?\n\r?\n)/m)?.[1] || "";
  assert.match(rhs.replace(/\s*\/\/\/\s*/g, " "), /^2015bn\.year#1\.treated .* 2023bn\.year#1\.treated$/);
  assert.equal((rhs.match(/20(?:15|16|17|18|20|21|22|23)bn\.year#1\.treated/g) || []).length, 8);
  assert.doesNotMatch(fixture, /(?:^|\s)i(?:bn)?\(/m);
  assert.equal((fixture.match(/assert strpos\(" `event_colnames' ", " 2015bn\.year#1\.treated "\) > 0/g) || []).length, 2);
  assert.equal((fixture.match(/assert strpos\("`event_colnames'", "20(?:16|17|18|20|21|22|23)\.year#1\.treated"\) > 0/g) || []).length, 14);
  assert.match(fixture, /assert `event_count' == 9/);
  assert.doesNotMatch(fixture, /##/);
  assert.equal((fixture.match(/saving\("`fixture_root'\/figures\/`outcome'_event\.gph", replace\)/g) || []).length, 2);
  assert.equal((fixture.match(/graph export "`fixture_root'\/figures\/`outcome'_event\.pdf", replace/g) || []).length, 2);
  assert.match(fixture, /local automatic_outcomes/);
  assert.match(fixture, /local fixed_outcomes/);
  assert.match(fixture, /yscale\(range\(`axis_min' `axis_max'\) noextend\)/);
});

test("event reference-slot fixture runs in StataMP and creates both PDF and GPH paths", (t) => {
  const stata = stataExecutable();
  if (!stata) t.skip("StataMP-64 is unavailable");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-event-reference-slot-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const completed = childProcess.spawnSync(stata, ["/e", "do", FIXTURE, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
  });
  const logPath = path.join(root, "event_reference_slot_runtime.log");
  const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";

  assert.equal(completed.error, undefined, completed.error?.message);
  assert.equal(completed.status, 0, completed.stderr || completed.stdout || log);
  assert.match(log, /EVENT_REFERENCE_SLOT_RUNTIME_PASSED/);
  assert.match(log, /EVENT_NONREFERENCE_EB_PASSED/);
  assert.doesNotMatch(log, /^r\(\d+\);\s*$/m);
  for (const outcome of ["outcome_auto", "close_outcome_a", "close_outcome_b"]) {
    const pdf = path.join(root, "figures", `${outcome}_event.pdf`);
    const gph = path.join(root, "figures", `${outcome}_event.gph`);
    assert.ok(fs.statSync(pdf).size > 4, pdf);
    assert.ok(fs.statSync(gph).size > 4, gph);
    assert.equal(fs.readFileSync(pdf).subarray(0, 4).toString("ascii"), "%PDF");
  }
});
