"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const SNAPSHOT_PATH = path.join(
  PLUGIN_ROOT,
  "annotations",
  "source_snapshots",
  "research_practice_event_plot_flat_loops.do",
);
const LABELS_PATH = path.join(PLUGIN_ROOT, "annotations", "labeled_checkpoints.json");

function localValue(snapshot, name) {
  const match = snapshot.match(new RegExp("^local\\s+" + name + "\\s+(.+)$", "m"));
  assert.ok(match, `missing local ${name}`);
  return match[1].trim().replace(/^`?"/, "").replace(/'?"$/, "");
}

function tokenList(value) {
  return value.split(/\s+/).filter(Boolean);
}

function validateReferenceSlot({ terms, order, labels, referencePosition, policyBoundary }) {
  const termTokens = tokenList(terms);
  const orderTokens = tokenList(order);
  const dotSlots = orderTokens
    .map((token, index) => (token === "." ? index + 1 : null))
    .filter((index) => index !== null);
  const expectedPositions = Array.from({ length: orderTokens.length }, (_, index) => index + 1);
  const labelPositions = [...labels.matchAll(/(?:^|\s)(\d+)\s+"/g)].map((match) => Number(match[1]));

  return dotSlots.length === 1
    && !termTokens.includes(".")
    && orderTokens.filter((token) => token !== ".").join(" ") === termTokens.join(" ")
    && labelPositions.join(" ") === expectedPositions.join(" ")
    && referencePosition === dotSlots[0]
    && policyBoundary === referencePosition + 0.5;
}

function eventLabels() {
  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));
  return [
    labels.find((row) => row.label_id === "figure.event_study_flat_loop_automatic.v1"),
    labels.find((row) => row.label_id === "figure.event_study_flat_loop_fixed_group.v1"),
  ];
}

test("event snapshots retain an explicit omitted-base display slot", () => {
  const snapshot = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  const terms = localValue(snapshot, "event_terms");
  const order = localValue(snapshot, "event_order");
  const labels = localValue(snapshot, "event_xlabels");
  const referencePosition = Number(localValue(snapshot, "reference_position"));
  const policyMatch = snapshot.match(/^local\s+policy_line\s+=\s+`reference_position'\s+\+\s+0\.5\s*$/m);

  assert.ok(policyMatch, "policy boundary must be derived from the reference slot");
  assert.doesNotMatch(snapshot, /^\s*global\s+(?:event_terms|event_order|event_xlabels|reference_position)\b/m);
  assert.equal(
    validateReferenceSlot({
      terms,
      order,
      labels,
      referencePosition,
      policyBoundary: referencePosition + 0.5,
    }),
    true,
  );
  assert.equal((order.match(/(?:^|\s)\.(?=\s|$)/g) || []).length, 1);
  assert.doesNotMatch(terms, /(?:^|\s)\.(?=\s|$)/);
  assert.match(snapshot, /keep\(`event_terms'\) order\(`event_order'\) xlabel\(`event_xlabels'\)/);
  assert.match(snapshot, /addplot\(scatteri 0 `reference_position'/);
  assert.match(snapshot, /xline\(`policy_line', lpattern\(dash\)\)/);
  assert.equal((snapshot.match(/saving\("\$figures\/`outcome'_event\.gph", replace\)/g) || []).length, 2);
  assert.doesNotMatch(snapshot, /^\s*graph save\b/m);
});

test("event labels bind the same omitted-base slot contract for automatic and fixed axes", () => {
  for (const label of eventLabels()) {
    assert.ok(label, "event figure label must exist");
    assert.ok(label.required_changes.some((row) => row.includes("exactly one omitted-base '.' slot")));
    assert.ok(label.minimal_edit_fields.includes("reference position equal to the '.' slot"));
    assert.ok(label.minimal_edit_fields.includes("policy boundary between the omitted base and first post period"));
    assert.match(label.template_input_profile.time_structure, /exactly one '.' base slot/);
    assert.ok(label.output_contract.some((row) => row.includes("exactly one '.' base slot")));
    assert.ok(label.output_contract.some((row) => row.includes("coefplot saving()")));
  }
});

test("the v9-style missing reference slot is rejected before a graph can be laid out", () => {
  assert.equal(
    validateReferenceSlot({
      terms: "pre2 pre1 post1 post2",
      order: "pre2 pre1 post1 post2",
      labels: '1 "Pre 2" 2 "Pre 1" 3 "Post 1" 4 "Post 2"',
      referencePosition: 3,
      policyBoundary: 3.5,
    }),
    false,
  );
});
