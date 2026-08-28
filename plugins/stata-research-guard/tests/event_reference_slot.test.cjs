"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

// This is deliberately test-local: it verifies the structural invariant without
// treating a Codex-authored event figure as reusable plugin evidence.
const EVENT_FIGURE_FIXTURE = [
  'local event_terms "pre2 pre1 post1 post2"',
  'local event_order "pre2 pre1 . post1 post2"',
  'local event_xlabels `"1 "Pre 2" 2 "Pre 1" 3 "" 4 "Post 1" 5 "Post 2""',
  "local reference_position 3",
  "local policy_line = `reference_position' + 0.5",
  "coefplot model, keep(`event_terms') order(`event_order') xlabel(`event_xlabels') \\",
  "    addplot(scatteri 0 `reference_position') xline(`policy_line', lpattern(dash))",
].join("\n");

function localValue(snapshot, name) {
  const match = snapshot.match(new RegExp("^local\\s+" + name + "\\s+(.+)$", "m"));
  assert.ok(match, `missing local ${name}`);
  return match[1].trim().replace(/^`?"/, "").replace(/'?"$/, "");
}

function validateReferenceSlot({ terms, order, labels, referencePosition, policyBoundary }) {
  const termTokens = terms.split(/\s+/).filter(Boolean);
  const orderTokens = order.split(/\s+/).filter(Boolean);
  const dotSlots = orderTokens.map((token, index) => token === "." ? index + 1 : null).filter(Boolean);
  const labelPositions = [...labels.matchAll(/(?:^|\s)(\d+)\s+"/g)].map((match) => Number(match[1]));
  return dotSlots.length === 1
    && !termTokens.includes(".")
    && orderTokens.filter((token) => token !== ".").join(" ") === termTokens.join(" ")
    && labelPositions.join(" ") === orderTokens.map((_, index) => index + 1).join(" ")
    && referencePosition === dotSlots[0]
    && policyBoundary === referencePosition + 0.5;
}

test("event figures require one explicit omitted-base display slot", () => {
  const terms = localValue(EVENT_FIGURE_FIXTURE, "event_terms");
  const order = localValue(EVENT_FIGURE_FIXTURE, "event_order");
  const labels = localValue(EVENT_FIGURE_FIXTURE, "event_xlabels");
  const referencePosition = Number(localValue(EVENT_FIGURE_FIXTURE, "reference_position"));

  assert.match(EVENT_FIGURE_FIXTURE, /^local\s+policy_line\s+=\s+`reference_position'\s+\+\s+0\.5\s*$/m);
  assert.equal(validateReferenceSlot({ terms, order, labels, referencePosition, policyBoundary: referencePosition + 0.5 }), true);
  assert.match(EVENT_FIGURE_FIXTURE, /keep\(`event_terms'\) order\(`event_order'\) xlabel\(`event_xlabels'\)/);
  assert.match(EVENT_FIGURE_FIXTURE, /addplot\(scatteri 0 `reference_position'\)/);
  assert.match(EVENT_FIGURE_FIXTURE, /xline\(`policy_line', lpattern\(dash\)\)/);
});

test("a missing omitted-base display slot is rejected before graph layout", () => {
  assert.equal(validateReferenceSlot({
    terms: "pre2 pre1 post1 post2",
    order: "pre2 pre1 post1 post2",
    labels: '1 "Pre 2" 2 "Pre 1" 3 "Post 1" 4 "Post 2"',
    referencePosition: 3,
    policyBoundary: 3.5,
  }), false);
});
