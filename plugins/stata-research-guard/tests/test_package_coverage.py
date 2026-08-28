from __future__ import annotations

import csv
import copy
import json
import re
import sys
import tempfile
import unittest
from collections import Counter, defaultdict
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_package_coverage import unsafe_candidate_flags  # noqa: E402
from merge_package_reviews import validate  # noqa: E402


class PackageCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.reviews = json.loads(
            (PLUGIN / "annotations" / "package_workflow_reviews.json").read_text(encoding="utf-8")
        )
        cls.coverage = json.loads(
            (PLUGIN / "data" / "package_checkpoint_coverage.json").read_text(encoding="utf-8")
        )
        cls.labels = [
            json.loads(line)
            for line in (PLUGIN / "data" / "labeled_checkpoints.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        cls.catalog_fixture = tempfile.TemporaryDirectory(prefix="stata-package-catalog-")
        catalog_dir = Path(cls.catalog_fixture.name) / "catalog"
        catalog_dir.mkdir(parents=True)
        with (catalog_dir / "code_files.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=["project_id", "project_path", "extension", "lines"],
            )
            writer.writeheader()
            for package in cls.coverage["packages"]:
                for file in package["files"]:
                    writer.writerow(
                        {
                            "project_id": package["package_id"],
                            "project_path": file["path"],
                            "extension": ".do",
                            "lines": file["lines"],
                        }
                    )
        cls.fixture_workspace = Path(cls.catalog_fixture.name)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.catalog_fixture.cleanup()

    def test_canonical_review_document_passes_merge_boundary_validation(self) -> None:
        validate(self.reviews, self.fixture_workspace, PLUGIN)

    def test_merge_boundary_rejects_globbed_workflow_paths(self) -> None:
        broken = copy.deepcopy(self.reviews)
        broken[0]["workflow_order"] = ["*.do"]
        with self.assertRaisesRegex(ValueError, "unknown workflow_order path"):
            validate(broken, self.fixture_workspace, PLUGIN)

    def test_coverage_accounts_for_every_cataloged_do_file(self) -> None:
        summary = self.coverage["summary"]
        self.assertEqual(summary["packages"], 35)
        self.assertEqual(summary["do_files"], 639)
        self.assertEqual(summary["lines"], 183794)
        self.assertEqual(summary["files_opened_and_hashed"], 639)
        self.assertEqual(summary["review_level_counts"], {"end_to_end_read": 35})
        self.assertEqual(summary["unlabeled_reusable_candidates"], 0)
        files = [file for package in self.coverage["packages"] for file in package["files"]]
        self.assertEqual(len(files), 639)
        self.assertEqual(len({file["workspace_path"] for file in files}), 639)
        self.assertTrue(all(re.fullmatch(r"[0-9a-f]{64}", file["sha256"]) for file in files))
        self.assertTrue(
            all(package["review_verification"]["all_cataloged_files_opened_and_hashed_by_builder"] for package in self.coverage["packages"])
        )

    def test_coverage_label_associations_match_current_dictionary_data(self) -> None:
        labels_by_package: dict[str, list[dict]] = defaultdict(list)
        for label in self.labels:
            # Guide metadata and formatter records intentionally have no raw
            # source path; package coverage concerns deposited package code.
            source_path = label.get("source_path", "").replace("\\", "/")
            if source_path.startswith("corpus/packages/"):
                labels_by_package[source_path.split("/", 3)[2]].append(label)

        coverage_by_package = {
            package["package_id"]: package for package in self.coverage["packages"]
        }
        expected_counts = Counter()
        for package_id, labels in labels_by_package.items():
            package = coverage_by_package[package_id]
            expected_counts["packages_with_labels"] += 1
            self.assertEqual(package["label_count"], len(labels), package_id)
            self.assertEqual(
                package["reusable_label_count"],
                sum(label["decision"] != "drop" for label in labels),
                package_id,
            )
            self.assertEqual(
                package["labeled_checkpoints"],
                sorted({label["checkpoint"] for label in labels}),
                package_id,
            )

        self.assertEqual(
            self.coverage["summary"]["packages_with_labels"],
            expected_counts["packages_with_labels"],
        )
        self.assertEqual(
            self.coverage["summary"]["packages_without_labels"],
            len(coverage_by_package) - expected_counts["packages_with_labels"],
        )

    def test_unlabeled_candidates_block_known_unsafe_patterns(self) -> None:
        self.assertIn("nested_loop", unsafe_candidate_flags("foreach x in a {\n foreach y in b {\n di 1\n }\n}"))
        self.assertIn("tex_output", unsafe_candidate_flags('esttab using "table.tex"'))
        self.assertIn("merge_m_m", unsafe_candidate_flags("merge m:m id using other.dta"))
        self.assertIn("merge_m_m", unsafe_candidate_flags("cap merge m:m id using other.dta"))
        self.assertIn("merge_m_m", unsafe_candidate_flags("noi merge m:m id using other.dta"))
        self.assertIn("duplicates_drop_force", unsafe_candidate_flags("duplicates drop id, force"))
        self.assertIn("manual_matrix_bridge", unsafe_candidate_flags("matrix b = e(b)"))
        self.assertEqual(unsafe_candidate_flags("/* merge m:m id using other.dta */"), [])


if __name__ == "__main__":
    unittest.main()
