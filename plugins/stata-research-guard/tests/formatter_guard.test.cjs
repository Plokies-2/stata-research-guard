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

test("evidence server presents formatter as an interface, not a selector exception", () => {
  const { buildCommandEvidence } = require(path.join(ROOT, "mcp", "server.cjs"));
  const evidence = buildCommandEvidence({
    request: "Export regression tables to an Excel workbook",
    selected_commands: ["outreg2"],
  });
  const card = evidence.related_artifacts.find((row) => row.artifact === "outreg2_xlsx");
  assert.ok(card);
  assert.equal(card.source_hash, EXPECTED_SOURCE_SHA256);
  assert.ok(card.required_input_state.some((item) => item.includes("already chosen")));
  assert.ok(card.boundaries.some((item) => item.includes("does not choose or replace the estimator")));
  assert.equal(Object.hasOwn(card, "promotion_status"), false);
  assert.equal(Object.hasOwn(card, "auto_selectable"), false);
});
