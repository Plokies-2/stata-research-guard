"""Deterministic inventory contract for every production example surface.

This test deliberately checks counts and provenance at the generated boundaries:
an accidental regeneration that reintroduces hand-written guide code should fail
before it can affect retrieval.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERIC_MANUAL_ROOT = "https://www.stata.com/manuals/"
FORMATTER_LABEL = "export.regression_excel.from_ster_default_style.v1"
FORMATTER_SOURCE = (
    "plugins/stata-research-guard/annotations/source_snapshots/"
    "default_style_outreg2_xlsx.do"
)
FORMATTER_FILE_SHA = "e98c97dfd21e7e4cffd8a0b0520de256afd36dceae8437cbf8a774a2f2b1a473"
FORMATTER_CODE_SHA = "a192f7487b4db889b2a656b60d88246c2f02c4d53bf86871d1ef26840ab0d827"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


class ExampleProvenancePolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = read_json(ROOT / "annotations" / "labeled_checkpoints.json")
        cls.atomic = []
        for path in sorted((ROOT / "annotations" / "atomic_template_sets").glob("*.json")):
            value = read_json(path)
            cls.atomic.extend(value if isinstance(value, list) else value.get("templates", []))
        cls.runtime = read_jsonl(ROOT / "data" / "labeled_checkpoints.jsonl")
        cls.guides = read_jsonl(ROOT / "data" / "guide_mechanics_cards.jsonl")
        cls.usage = read_jsonl(ROOT / "data" / "research_usage_examples.jsonl")
        cls.top100 = read_json(ROOT / "data" / "top100_command_evidence_matrix.json")
        cls.archive = read_json(ROOT / "data" / "source_archive" / "index.json")
        cls.official = read_json(ROOT / "data" / "official_examples.json")
        cls.official_verification = read_json(ROOT / "data" / "official_example_verification.json")

    def test_raw_annotation_inventory_and_formatter_allowlist(self):
        self.assertEqual(len(self.raw), 110)
        derived = [row for row in self.raw if row.get("source_kind") == "derived_canonical_implementation"]
        self.assertEqual(len(derived), 1)
        row = derived[0]
        self.assertEqual(row["label_id"], FORMATTER_LABEL)
        self.assertEqual(row["source_path"], FORMATTER_SOURCE)
        external_prefixes = ("external_research_code", "deposited_research_code", "independent_researcher_code")
        self.assertEqual(sum(str(row.get("source_kind") or "").startswith(external_prefixes) for row in self.raw), 109)
        runtime_row = next(item for item in self.runtime if item["label_id"] == FORMATTER_LABEL)
        self.assertEqual(runtime_row["source_file_sha256"], FORMATTER_FILE_SHA)
        self.assertEqual(runtime_row["code_sha256"], FORMATTER_CODE_SHA)

    def test_atomic_guides_are_code_free_authoritative_metadata(self):
        self.assertEqual(len(self.atomic), 454)
        for row in self.atomic:
            for forbidden in ("code", "template", "source_path", "source_spans", "code_sha256"):
                self.assertNotIn(forbidden, row, row.get("label_id"))
            self.assertEqual(row.get("promotion_status"), "reference_only")
            self.assertEqual(row.get("candidate_disposition"), "reference_only")
            self.assertEqual(row.get("audit_status"), "metadata_only")
            urls = row.get("manual_urls", row.get("source_urls", []))
            self.assertTrue(urls, row.get("label_id"))
            self.assertNotIn(GENERIC_MANUAL_ROOT, urls)

    def test_generated_runtime_and_guide_layers_remain_separate(self):
        self.assertEqual(len(self.runtime), 564)
        self.assertEqual(sum(bool(row.get("code")) for row in self.runtime), 110)
        self.assertEqual(sum(row.get("source_kind") == "derived_canonical_implementation" for row in self.runtime), 1)
        self.assertEqual(len(self.guides), 454)
        for row in self.guides:
            self.assertFalse(row.get("code_available"))
            for forbidden in ("code", "source_path", "source_spans", "code_sha256"):
                self.assertNotIn(forbidden, row, row.get("label_id"))

    def test_research_archive_and_top100_counts(self):
        self.assertEqual(len(self.usage), 166)
        self.assertEqual(sum(bool(row.get("code")) for row in self.usage), 109)
        sources = self.archive["sources"]
        self.assertEqual(len(sources), 49)
        self.assertEqual(sum(path.startswith("corpus/") for path in sources), 48)
        self.assertEqual(sum(path == FORMATTER_SOURCE for path in sources), 1)
        files = list((ROOT / "data" / "source_archive" / "files").glob("*.source"))
        self.assertEqual(len(files), 49)
        self.assertEqual(len(self.top100["rows"]), 100)
        self.assertEqual(sum(len(row["material_contracts"]) for row in self.top100["rows"]), 395)
        self.assertEqual(len(self.top100["all_guide_mechanics_metadata"]), 454)
        self.assertEqual(len(self.top100["all_legacy_paper_code_blocks"]), 109)
        for row in self.top100["all_guide_mechanics_metadata"]:
            self.assertFalse(row.get("code_available"))
            for forbidden in ("code", "source_path", "source_spans", "code_sha256"):
                self.assertNotIn(forbidden, row)

    def test_official_runtime_fixtures_are_isolated_and_nonselectable(self):
        self.assertEqual(len(self.official), 9)
        self.assertEqual(len(self.official_verification["examples"]), 9)
        for row in self.official + self.official_verification["examples"]:
            self.assertEqual(row["example_origin"], "official_document_derived_runtime_fixture")
            self.assertFalse(row["verbatim"])
            self.assertFalse(row["selection_eligible"])
            self.assertFalse(row["independent_support"])


if __name__ == "__main__":
    unittest.main()
