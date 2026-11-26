"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { changedLineNumbers, findRepeats, logicalLines } = require("../hooks/stata-repeats.cjs");

// Repeats a user found by hand in an event-study do-file.
const eventStudy = String.raw`local event_axis_vars_emp_n "emp_num_m emp_num_f gender_emp_gap"
local worker_wins ///
    emp_num ln_emp_num ln_gender_emp_gap ///
    emp_num_m emp_num_f gender_emp_gap
foreach outcome of local worker_wins {
    reghdfe ${"`"}outcome' ib2019.year##i.treat2019, ///
        absorb(fid year industry_id2019#year region_id2019#year) vce(cluster fid)
    local base = subinstr("${"`"}outcome'", "wins_", "", 1)
    estimates store m_${"`"}base'
}
foreach outcome of local worker_wins {
    local base = subinstr("${"`"}outcome'", "wins_", "", 1)
    coefplot m_${"`"}base', relocate(2015*.year#1.treat2019 = 1 ///
        2016.year#1.treat2019 = 2) ///
        xlabel(1 "2015" 2 "2016" 3 "2017", labsize(10pt))
}
reghdfe ln_pay treat, absorb(fid year industry_id2019#year region_id2019#year) vce(cluster fid)
coefplot m_pay, relocate(2015*.year#1.treat2019 = 1 2016.year#1.treat2019 = 2) ///
    xlabel(1 "2015" 2 "2016" 3 "2017", labsize(10pt))
`;

test("the event-study repeats are each reported with their lines", () => {
  const findings = findRepeats(eventStudy);
  const found = (fragment) => findings.find((finding) => finding.text.includes(fragment));
  assert.deepEqual(found('subinstr("').lines, [8, 12]);
  assert.equal(found("event_axis_vars_emp_n").kind, "macro value contained in another");
  // absorb(), relocate() and xlabel() repeat across commands but stay in each command.
  for (const option of ["absorb(", "relocate(", "xlabel("]) assert.equal(found(option), undefined);
  assert.equal(findings.filter((finding) => finding.kind === "repeated expression").length, 1);
});

test("comments, a single loop body and macro reuse are not repeats", () => {
  const clean = String.raw`
* absorb(fid year industry_id2019#year region_id2019#year) in a comment
global event_fe fid year industry_id2019#year region_id2019#year
/* absorb(fid year industry_id2019#year region_id2019#year) */
foreach y in roa roe {
    reghdfe ${"`"}y' treat, absorb($event_fe) vce(cluster fid) // absorb(fid year industry_id2019#year region_id2019#year)
    coefplot, keep($event_coefficients_for_figures)
    coefplot, keep($event_coefficients_for_figures)
}
`;
  assert.deepEqual(findRepeats(clean), []);
});

test("repeated command runs and literals that repeat a macro are reported", () => {
  const text = String.raw`
global input_dir "C:/data/v3"
use "C:/data/v3/panel.dta", clear
keep if inrange(year, 2015, 2024)
summarize roa
use "C:/data/v3/panel.dta", clear
keep if inrange(year, 2015, 2024)
`;
  const kinds = findRepeats(text).map((finding) => finding.kind);
  assert.ok(kinds.includes("repeated commands"));
  // A one-item value such as a single path is not compared.
  assert.equal(kinds.includes("literal repeats a macro"), false);
  const twoItems = findRepeats('global controls "age grade"\nregress wage age grade\n');
  assert.deepEqual(twoItems.map((finding) => finding.lines), [[1, 2]]);
});

test("a macro that only holds another macro is reported", () => {
  const findings = findRepeats('global financial "roa roe"\nlocal y_list "$financial"\nforeach y of local y_list {\n}\n');
  assert.deepEqual(findings.map((finding) => [finding.kind, finding.lines]), [["second name for a macro", [2]]]);
});

test("continuation lines join into one command spanning its physical lines", () => {
  assert.deepEqual(logicalLines("regress y ///\n  x1 /// note\n  x2\n* comment\nsummarize y"),
    [{ line: 1, end: 3, text: "regress y x1 x2" }, { line: 5, end: 5, text: "summarize y" }]);
});

test("a loop item checked against a group global or a pattern is reported", () => {
  const text = String.raw`foreach outcomes in "$board_size" "$esg" {
    if "${"`"}outcomes'" == "$board_size" local step 0.1
}
if strmatch("${"`"}outcome'", "female_bm*_any") local step = 0.1
if "${"`"}sample'" == "kospi" keep if market == 1
`;
  const findings = findRepeats(text).filter((finding) => finding.kind === "membership looked up with if");
  assert.deepEqual(findings.map((finding) => finding.lines), [[2], [4]]);
});

test("with changed lines, only repeats that touch them are reported", () => {
  const base = 'local base = subinstr("`y\'", "wins_", "", 1)';
  const text = `${base}\nregress y x\n${base}\nglobal pay "a b"\nglobal labor "a b c"\n`;
  assert.equal(findRepeats(text).length, 2);
  assert.deepEqual(findRepeats(text, changedLineNumbers(text, ["regress y x"])), []);
  assert.deepEqual(findRepeats(text, changedLineNumbers(text, ['global labor "a b c"'])).map((finding) => finding.kind),
    ["macro value contained in another"]);
  // A continuation line inside a command counts for the whole command.
  const wrapped = `${base}\nlocal base = subinstr("\`y'", ///\n    "wins_", "", 1)\n`;
  assert.equal(findRepeats(wrapped, changedLineNumbers(wrapped, ['    "wins_", "", 1)'])).length, 1);
});
