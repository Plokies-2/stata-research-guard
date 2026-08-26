from __future__ import annotations

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_command_template_coverage import validate_promotion_audit  # noqa: E402
from build_template_promotion_audit import build_ledger  # noqa: E402


TOP100_INVENTORIES = (
    ("top100_official_data_programming.json", "top100_official_data_programming_guide_templates.do"),
    ("top100_official_models.json", "top100_official_models_guide_templates.do"),
    ("top100_maintainer_methods.json", "top100_maintainer_methods_guide_templates.do"),
)


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _top100_atoms() -> dict[str, tuple[Path, Path, dict]]:
    atoms = {}
    for inventory_name, snapshot_name in TOP100_INVENTORIES:
        inventory = PLUGIN / "annotations" / "atomic_template_sets" / inventory_name
        snapshot = PLUGIN / "annotations" / "source_snapshots" / snapshot_name
        for entry in json.loads(inventory.read_text(encoding="utf-8")):
            atoms[entry["label_id"]] = (inventory, snapshot, entry)
    return atoms


def _write_release_owned_audit_fixture(directory: Path, ordered_labels: list[str]) -> tuple[Path, Path]:
    """Materialize the minimum independent-audit packet from release-owned evidence.

    This does not recreate an audit decision.  The canonical ledger is checked
    separately for the independent reviewer/model/decision.  It gives the
    deterministic builder exact source readbacks so a clean release can prove
    that the audited records still match the shipped atomic inventories.
    """

    repo = PLUGIN.parents[1]
    atoms = _top100_atoms()
    rows = []
    for label_id in ordered_labels:
        inventory, snapshot, entry = atoms[label_id]
        source_text = snapshot.read_text(encoding="utf-8-sig")
        source_lines = source_text.splitlines()
        readback = "\n".join(
            "\n".join(source_lines[start - 1 : end])
            for start, end in entry["source_spans"]
        )
        rows.append({
            "label_id": label_id,
            "decision": "pass_reference_only",
            "contract_ids": entry["contract_ids"],
            "source_readback": {
                "inventory": inventory.relative_to(repo).as_posix(),
                "snapshot": snapshot.relative_to(repo).as_posix(),
                "source_kind": entry["source_kind"],
                "source_urls": entry["source_urls"],
                "spans": entry["source_spans"],
                "inventory_sha256": _sha256(inventory.read_bytes()),
                "snapshot_sha256": _sha256(snapshot.read_bytes()),
                "readback": readback,
                "span_sha256": _sha256(readback.encode("utf-8")),
            },
            "checks": {
                "field_errors": [],
                "unsafe_hits": {},
                "pseudo_syntax": [],
                "same_group_exact_duplicates": [],
                "existing_exact_duplicates": [],
                "utf8_no_replacement_character": True,
            },
        })
    audit_path = directory / "release_owned_audit_fixture.jsonl"
    audit_path.write_text(
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )
    summary_path = directory / "release_owned_audit_summary.json"
    summary_path.write_text(json.dumps({
        "candidate_count": 178,
        "decision_counts": {"pass_reference_only": 178},
        "all_candidates_pass_reference_only": True,
        "existing_atomic_candidate_count_checked": 262,
    }, sort_keys=True), encoding="utf-8")
    return audit_path, summary_path


class TemplatePromotionAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = json.loads(
            (PLUGIN / "annotations" / "command_template_requirements.json").read_text(encoding="utf-8")
        )
        cls.audit = json.loads(
            (PLUGIN / "annotations" / "template_promotion_audit.json").read_text(encoding="utf-8")
        )
        cls.legacy_count = len(
            json.loads((PLUGIN / "annotations" / "labeled_checkpoints.json").read_text(encoding="utf-8"))
        ) + len(
            json.loads((PLUGIN / "annotations" / "package_first_atomic_templates.json").read_text(encoding="utf-8"))
        )

    @staticmethod
    def good_record() -> dict:
        return {
            "label_id": "guide.audit.fixture.v1",
            "disposition": "audited_template",
            "contract_ids": ["reghdfe.one_fe_clustered"],
            "template_sha256": "a" * 64,
            "candidate_inventory_sha256": "c" * 64,
            "source_layers": {"maintainer_guide": {"status": "pass", "source_id": "reghdfe.sthlp"}},
            "source": {"path": "annotations/source_snapshots/fixture.do", "sha256": "b" * 64, "span": "4-9", "role": "maintainer_guide", "kind": "guide_derived_mechanics"},
            "independence": {"independent_support": False, "scope": "guide_mechanics_only"},
            "input_profile": {"data_structure": "panel"},
            "state_signature": {"requires": ["panel id"], "produces": ["e(b)"]},
            "variant_distinctness": {"against": [], "reason": "one fixed effect and clustered inference"},
            "safety_checks": {"nested_loop": "pass", "tex_output": "pass"},
            "auditor": {"reviewer": "independent", "status": "pass"},
            "runtime": {"case_id": "runtime.reghdfe.cluster.v1", "status": "pass"},
            "selector": {"positive": {"case_id": "selector.reghdfe.positive.v1", "status": "pass"}, "negative": {"case_id": "selector.reghdfe.negative.v1", "status": "pass"}},
        }

    def test_populated_ledger_keeps_legacy_separate_and_guides_reference_only(self) -> None:
        validate_promotion_audit(self.audit, self.requirements, self.legacy_count)
        self.assertEqual(self.audit["legacy_baseline"]["status"], "legacy_pre_policy")
        self.assertEqual(len(self.audit["candidate_records"]), 440)
        self.assertEqual(self.legacy_count, 148)
        self.assertTrue(all(row["disposition"] == "reference_only" for row in self.audit["candidate_records"]))
        self.assertTrue(all(row.get("auto_selectable") is False for row in self.audit["candidate_records"]))

    def test_top100_audit_set_is_exactly_178_and_is_appended(self) -> None:
        audited = set(_top100_atoms())
        records = self.audit["candidate_records"]
        self.assertEqual(len(audited), 178)
        self.assertEqual({row["label_id"] for row in records[262:]}, audited)
        self.assertEqual(len({row["label_id"] for row in records}), 440)

    def test_top100_records_keep_reference_only_gate(self) -> None:
        for row in self.audit["candidate_records"][262:]:
            with self.subTest(label_id=row["label_id"]):
                self.assertEqual(row["disposition"], "reference_only")
                self.assertEqual(row["auditor"]["model"], "gpt-5.6-terra high")
                self.assertEqual(row["auditor"]["decision"], "pass_reference_only")
                self.assertEqual(row["runtime"]["status"], "not_run")
                self.assertEqual(row["selector"]["status"], "not_run")
                self.assertFalse(row["auto_selectable"])

    def test_top100_builder_is_deterministic_and_preserves_legacy_prefix(self) -> None:
        baseline = copy.deepcopy(self.audit)
        baseline["candidate_records"] = baseline["candidate_records"][:262]
        with tempfile.TemporaryDirectory() as temporary:
            temporary_path = Path(temporary)
            existing = temporary_path / "baseline.json"
            existing.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            ordered_labels = [row["label_id"] for row in self.audit["candidate_records"][262:]]
            audit_path, summary_path = _write_release_owned_audit_fixture(temporary_path, ordered_labels)
            args = {
                "existing_path": existing,
                "audit_jsonl_path": audit_path,
                "summary_path": summary_path,
                "requirements_path": PLUGIN / "annotations/command_template_requirements.json",
            }
            first, first_report = build_ledger(**args)
            second, second_report = build_ledger(**args)
        self.assertEqual(first, second)
        self.assertEqual(first_report, second_report)
        self.assertEqual(first["candidate_records"][:262], baseline["candidate_records"])
        self.assertEqual(first_report["candidate_records"], 440)
        self.assertEqual(first, self.audit)

    def test_audited_template_requires_hash_runtime_and_both_selector_cases(self) -> None:
        complete = copy.deepcopy(self.audit)
        complete["candidate_records"] = [self.good_record()]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)
        for mutator, expected in (
            (lambda row: row.pop("template_sha256"), "template_sha256"),
            (lambda row: row.pop("candidate_inventory_sha256"), "candidate_inventory_sha256"),
            (lambda row: row["source_layers"].pop("maintainer_guide"), "source_layers.maintainer_guide"),
            (lambda row: row["source"].pop("sha256"), "source.sha256"),
            (lambda row: row["runtime"].update(status="not_checked"), "runtime.status"),
            (lambda row: row["selector"].pop("negative"), "selector.negative"),
        ):
            broken = copy.deepcopy(complete)
            mutator(broken["candidate_records"][0])
            with self.subTest(expected=expected), self.assertRaisesRegex(ValueError, expected):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_reference_only_never_counts_as_auto_selectable(self) -> None:
        broken = copy.deepcopy(self.audit)
        record = self.good_record()
        record["disposition"] = "reference_only"
        record["auto_selectable"] = True
        broken["candidate_records"] = [record]
        with self.assertRaisesRegex(ValueError, "reference_only"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_reference_only_still_requires_provenance_profile_safety_and_auditor(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "reference_only",
            "auto_selectable": False,
            "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
            "selector": {"status": "not_run", "reason": "reference-only candidates are not auto-selected"},
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)
        for missing in ("template_sha256", "candidate_inventory_sha256", "source", "input_profile", "safety_checks", "auditor"):
            broken = copy.deepcopy(complete)
            broken["candidate_records"][0].pop(missing)
            with self.subTest(missing=missing), self.assertRaisesRegex(ValueError, missing):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_unmapped_reference_may_use_a_named_supplemental_contract(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "reference_only",
            "contract_ids": [],
            "supplemental_contract_id": "reghdfe.group_level_guide_supplement",
            "auto_selectable": False,
            "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
            "selector": {"status": "not_run", "reason": "unmapped references are never selected"},
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)

    def test_unmapped_rejected_candidate_may_record_a_reason(self) -> None:
        complete = copy.deepcopy(self.audit)
        record = self.good_record()
        record.update({
            "disposition": "rejected",
            "contract_ids": [],
            "unmapped_reason": "unsafe option bundle has no reusable requirements contract",
        })
        complete["candidate_records"] = [record]
        validate_promotion_audit(complete, self.requirements, self.legacy_count)

    def test_empty_contracts_are_forbidden_for_audited_template(self) -> None:
        broken = copy.deepcopy(self.audit)
        record = self.good_record()
        record["contract_ids"] = []
        record["supplemental_contract_id"] = "reghdfe.not_coverage"
        broken["candidate_records"] = [record]
        with self.assertRaisesRegex(ValueError, "nonempty for audited_template"):
            validate_promotion_audit(broken, self.requirements, self.legacy_count)

    def test_empty_reference_contracts_require_exactly_one_mapping_explanation(self) -> None:
        for metadata in ({}, {"supplemental_contract_id": "x", "unmapped_reason": "y"}):
            broken = copy.deepcopy(self.audit)
            record = self.good_record()
            record.update({
                "disposition": "reference_only",
                "contract_ids": [],
                "auto_selectable": False,
                "runtime": {"status": "not_run", "reason": "guide mechanics retained as reference"},
                "selector": {"status": "not_run", "reason": "unmapped references are never selected"},
                **metadata,
            })
            broken["candidate_records"] = [record]
            with self.subTest(metadata=metadata), self.assertRaisesRegex(ValueError, "exactly one"):
                validate_promotion_audit(broken, self.requirements, self.legacy_count)


if __name__ == "__main__":
    unittest.main()
