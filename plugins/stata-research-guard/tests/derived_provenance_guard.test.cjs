const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const { matchingAutoSelectableLabels } = require(path.join(ROOT, "mcp", "template_reuse.cjs"));

const APPROVED_FORMATTER_PROVENANCE = {
  source_path: "plugins/stata-research-guard/annotations/source_snapshots/default_style_outreg2_xlsx.do",
  source_file_sha256: "e98c97dfd21e7e4cffd8a0b0520de256afd36dceae8437cbf8a774a2f2b1a473",
  code_sha256: "a192f7487b4db889b2a656b60d88246c2f02c4d53bf86871d1ef26840ab0d827",
};

function candidate(label_id, source_kind, overrides = {}) {
  return {
    label_id,
    checkpoint: "export.regression_excel",
    command_anchors: ["outreg2"],
    code: "outreg2 using table.xls, replace excel",
    decision: "keep",
    adaptation_mode: "minimal_substitution",
    reuse_scope: "general",
    quality_rubric_review: { classification: "preferred_candidate" },
    source_kind,
    ...overrides,
  };
}

test("only the exact declared outreg2 formatter source tuple can auto-select from derived provenance", () => {
  const labels = [
    candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation", APPROVED_FORMATTER_PROVENANCE),
    candidate("derived.other.v1", "derived_canonical_implementation"),
    candidate("snapshot.paths.v1", "project_canonical_source_snapshot"),
    candidate("unknown.provenance.v1", ""),
    candidate("manual.regress.v1", "official_manual_derived_mechanics"),
    candidate("manual.variant.v1", "official_stata_manual_guide_derived_mechanics"),
    candidate("guide.variant.v1", "official_guide_derived_mechanics"),
    candidate("maintainer.guide.v1", "user_written_command_guide_derived_mechanics"),
    candidate("external.outreg2.v1", "external_research_code"),
  ];

  const matches = matchingAutoSelectableLabels(labels, "export.regression_excel", { commands: ["outreg2"] });
  assert.deepEqual(
    matches.map((label) => label.label_id).sort(),
    [
      "export.regression_excel.from_ster_default_style.v1",
      "external.outreg2.v1",
    ],
  );
});

test("a derived formatter label fails closed when any approved provenance field differs", () => {
  for (const field of Object.keys(APPROVED_FORMATTER_PROVENANCE)) {
    const mismatched = {
      ...APPROVED_FORMATTER_PROVENANCE,
      [field]: `wrong-${field}`,
    };
    const matches = matchingAutoSelectableLabels([
      candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation", mismatched),
    ], "export.regression_excel", { commands: ["outreg2"] });
    assert.equal(matches.length, 0, field);
  }
});
