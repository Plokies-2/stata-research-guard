"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "annotations", "source_snapshots", "default_style_outreg2_xlsx.do");
const EXPECTED_SOURCE_SHA256 = "e98c97dfd21e7e4cffd8a0b0520de256afd36dceae8437cbf8a774a2f2b1a473";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("approved outreg2_xlsx source remains exact", () => {
  const bytes = fs.readFileSync(SOURCE);
  const text = bytes.toString("utf8");
  assert.equal(sha256(bytes), EXPECTED_SOURCE_SHA256);
  assert.match(text, /^program define outreg2_xlsx/m);
  assert.match(text, /syntax, ESTIMATES\(string\) WORKBOOK\(string\) SHEET\(string\)/);
  assert.match(text, /outreg2 using "`scratch'"/);
  assert.match(text, /export excel using "`workbook'", sheet\("`sheet'"/);
  assert.match(text, /erase "`scratch'\.txt"/);
  assert.match(text, /capture confirm file "`scratch'\.txt"/);
});
