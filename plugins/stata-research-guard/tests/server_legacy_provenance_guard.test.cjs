const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const { rubricAutoSelectable } = require(path.join(ROOT, "mcp", "server.cjs"));

function candidate(label_id, source_kind) {
  return {
    label_id,
    source_kind,
    source_path: "plugins/stata-research-guard/annotations/source_snapshots/default_style_outreg2_xlsx.do",
    source_file_sha256: "e98c97dfd21e7e4cffd8a0b0520de256afd36dceae8437cbf8a774a2f2b1a473",
    code_sha256: "a192f7487b4db889b2a656b60d88246c2f02c4d53bf86871d1ef26840ab0d827",
    transition_role: "template",
    decision: "keep",
    quality_rubric_review: { classification: "preferred_candidate" },
  };
}

test("legacy selector applies the same provenance boundary as template reuse", () => {
  assert.equal(
    rubricAutoSelectable(candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation")),
    true,
  );
  for (const row of [
    candidate("derived.other.v1", "derived_canonical_implementation"),
    { ...candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation"), code_sha256: "0".repeat(64) },
    { ...candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation"), source_file_sha256: "0".repeat(64) },
    { ...candidate("export.regression_excel.from_ster_default_style.v1", "derived_canonical_implementation"), source_path: "plugins/stata-research-guard/annotations/source_snapshots/impostor.do" },
    candidate("snapshot.paths.v1", "project_canonical_source_snapshot"),
    candidate("official.manual.v1", "official_manual_derived_mechanics"),
    candidate("official.guide.v1", "official_stata_manual_guide_derived_mechanics"),
    candidate("maintainer.guide.v1", "user_written_command_guide_derived_mechanics"),
    candidate("unknown.v1", "unknown_internal_source"),
    candidate("blank.v1", ""),
    candidate("external.manual.v1", "external_research_code_manual_adaptation"),
    candidate("deposited.guide.v1", "deposited_research_code_guide_derived"),
  ]) {
    assert.equal(rubricAutoSelectable(row), false, row.label_id);
  }
  assert.equal(rubricAutoSelectable(candidate("external.research.v1", "external_research_code")), true);
  assert.equal(rubricAutoSelectable(candidate("deposited.research.v1", "deposited_research_code_with_community_command_context")), true);
  assert.equal(rubricAutoSelectable(candidate("independent.research.v1", "independent_researcher_code_reviewed")), true);
});
