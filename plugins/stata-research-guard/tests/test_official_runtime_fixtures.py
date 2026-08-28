from __future__ import annotations

import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from verify_official_examples import RUNTIME_FIXTURE_POLICY, validate_runtime_fixture


class OfficialRuntimeFixtureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.inputs = json.loads((ROOT / "data" / "official_examples.json").read_text(encoding="utf-8"))
        cls.verification = json.loads(
            (ROOT / "data" / "official_example_verification.json").read_text(encoding="utf-8")
        )

    def test_all_nine_records_are_isolated_adapted_runtime_fixtures(self) -> None:
        self.assertEqual(len(self.inputs), 9)
        self.assertEqual(len(self.verification["examples"]), 9)
        for collection in (self.inputs, self.verification["examples"]):
            for row in collection:
                with self.subTest(example_id=row["example_id"]):
                    validate_runtime_fixture(row)
                    self.assertEqual(
                        {key: row[key] for key in RUNTIME_FIXTURE_POLICY},
                        RUNTIME_FIXTURE_POLICY,
                    )

    def test_verification_preserves_code_and_durable_log_hashes(self) -> None:
        inputs = {row["example_id"]: row for row in self.inputs}
        for row in self.verification["examples"]:
            with self.subTest(example_id=row["example_id"]):
                source = inputs[row["example_id"]]
                self.assertEqual(row["code"], source["code"])
                self.assertEqual(
                    row["code_sha256"],
                    hashlib.sha256(source["code"].encode("utf-8")).hexdigest(),
                )
                log_path = ROOT / "data" / row["log_file"]
                self.assertTrue(log_path.is_file())
                self.assertEqual(row["log_sha256"], hashlib.sha256(log_path.read_bytes()).hexdigest())

    def test_verifier_rejects_any_fixture_that_can_enter_selection(self) -> None:
        invalid = dict(self.inputs[0], selection_eligible=True)
        with self.assertRaisesRegex(ValueError, "selection_eligible"):
            validate_runtime_fixture(invalid)


if __name__ == "__main__":
    unittest.main()
