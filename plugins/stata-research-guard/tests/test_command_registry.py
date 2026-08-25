from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_reference_data import (  # noqa: E402
    COMMAND_REGISTRY,
    build_command_catalog,
    detect_commands,
    load_command_registry,
)


class CommandRegistryTests(unittest.TestCase):
    def test_registry_is_a_large_single_source_of_truth(self) -> None:
        registry = load_command_registry()
        self.assertGreaterEqual(len(registry["families"]), 25)
        families = {row["family_id"]: row for row in registry["families"]}
        self.assertIn("estout", families)
        self.assertIn("ivreg2", families)
        self.assertIn("ivreghdfe", families)
        self.assertNotEqual(families["ivreg2"]["commands"], families["ivreghdfe"]["commands"])
        self.assertEqual(
            registry["global_template_policy"]["quarantine"],
            ["manual coefficient or standard-error reconstruction", "manual result transfer into final tables"],
        )

    def test_detector_uses_canonical_package_command_names(self) -> None:
        commands = detect_commands(
            "quietly eststo main: reghdfe y x, absorb(id)\n"
            "estpost summarize x\n"
            "ivreg2 y (x = z)\n"
            "ivreghdfe y (x = z), absorb(id)\n"
            "export excel using results.xlsx, replace\n"
        )
        self.assertTrue({"eststo", "reghdfe", "estpost", "ivreg2", "ivreghdfe", "export_excel"} <= set(commands))

    def test_catalog_keeps_policy_static_and_adds_observed_coverage(self) -> None:
        catalog = build_command_catalog(
            COMMAND_REGISTRY,
            [{"commands": ["estpost", "eststo", "ivreg2", "ivreghdfe", "export_excel"]}],
        )
        self.assertEqual(catalog["summary"]["families"], len(COMMAND_REGISTRY["families"]))
        families = {row["family_id"]: row for row in catalog["families"]}
        self.assertEqual(families["estout"]["template_policy"], "atomic_template_candidate")
        self.assertEqual(families["ivreg2"]["commands"][0]["corpus_chunk_count"], 1)
        self.assertEqual(families["ivreghdfe"]["commands"][0]["corpus_chunk_count"], 1)

    def test_generated_catalog_matches_registry_shape(self) -> None:
        catalog = json.loads((PLUGIN / "data" / "package_command_catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(catalog["summary"]["families"], len(COMMAND_REGISTRY["families"]))
        self.assertEqual(catalog["summary"]["indexed_commands"], len(COMMAND_REGISTRY["command_index"]))


if __name__ == "__main__":
    unittest.main()
