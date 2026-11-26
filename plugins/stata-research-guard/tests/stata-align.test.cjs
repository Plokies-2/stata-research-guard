"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { alignContinuations } = require("../hooks/stata-align.cjs");

const squash = (text) => text.replace(/\s+/g, " ");

test("the markers of one command line up one space after its longest line", () => {
  const before = 'reghdfe y x, ///\n    absorb(fid year) ///\n    vce(cluster fid)\nsummarize y ///\n  , detail\n';
  const { text, changed } = alignContinuations(before);
  assert.equal(text, `reghdfe y x,${" ".repeat(9)}///\n    absorb(fid year) ///\n    vce(cluster fid)\nsummarize y ///\n  , detail\n`);
  assert.deepEqual(changed, [[1, 2]]);
  assert.equal(squash(text), squash(before));
  assert.deepEqual(alignContinuations(text).changed, []);
});

test("only the requested ranges change", () => {
  const before = "a ///\n  bbbb\nc ///\n  dddd ///\n  e\n";
  const { text, changed } = alignContinuations(before, [[4, 4]]);
  assert.deepEqual(changed, [[3, 4]]);
  assert.ok(text.startsWith("a ///\n"));
});

test("strings, comments, tabs and #delimit are left alone", () => {
  const strings = 'display "a /// b" ///\n  "c"\n';
  assert.deepEqual(alignContinuations(strings).changed, []);
  const comments = "* note ///\n* more ///\n/* block ///\n inside */\nx // not a marker\n";
  assert.equal(alignContinuations(comments).text, comments);
  // A tab in the code makes the visible column unknown.
  const tabs = "\ta ///\n  bbbb ///\n  c\n";
  assert.equal(alignContinuations(tabs).text, tabs);
  const delimit = "#delimit ;\nreg y x ///\n  z ///\n;\n";
  assert.equal(alignContinuations(delimit).text, delimit);
  const markerComment = "reg y x /// main\n    z /// controls\n  , robust\n";
  assert.equal(alignContinuations(markerComment).text, "reg y x /// main\n    z   /// controls\n  , robust\n");
});

test("a line past column 100 keeps one space and does not push the others", () => {
  const long = `twoway (connected y x, ${"lcolor(blue) ".repeat(8)})`;
  const { text } = alignContinuations(`${long} ///\n    xtitle("x") ///\n    ytitle("y")\n`);
  assert.equal(text, `${long} ///\n    xtitle("x") ///\n    ytitle("y")\n`);
  const mixed = alignContinuations(`${long} ///\n    xtitle("Years") ///\n    yline(0) ///\n    ytitle("y")\n`).text;
  assert.equal(mixed, `${long} ///\n    xtitle("Years") ///\n    yline(0)        ///\n    ytitle("y")\n`);
});

test("Windows line endings are kept", () => {
  const { text } = alignContinuations("a ///\r\n  bbbb ///\r\n  c\r\n");
  assert.equal(text, "a      ///\r\n  bbbb ///\r\n  c\r\n");
});
