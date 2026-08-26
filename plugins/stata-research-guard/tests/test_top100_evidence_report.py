from __future__ import annotations

import copy
import html
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path


PLUGIN = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN / "scripts"))

from build_top100_evidence_report import (  # noqa: E402
    apply_guide_audit,
    build_report,
    load_json,
    load_jsonl,
    render_markdown,
    validate_card,
)


class Top100EvidenceReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.requirements = load_json(PLUGIN / "annotations" / "command_template_requirements.json")
        cls.registry = load_json(PLUGIN / "annotations" / "package_command_registry.json")
        cls.guides = load_jsonl(PLUGIN / "data" / "guide_mechanics_cards.jsonl")
        cls.usage = load_jsonl(PLUGIN / "data" / "research_usage_examples.jsonl")
        cls.audit = load_json(PLUGIN / "annotations" / "command_example_audit.json")
        cls.report = build_report(
            plugin=PLUGIN,
            requirements=cls.requirements,
            registry=cls.registry,
            guide_cards=cls.guides,
            usage_cards=cls.usage,
            command_example_audit=cls.audit,
        )

    def test_matrix_has_exactly_100_normalized_rows_and_all_declared_contracts(self) -> None:
        rows = self.report["rows"]
        expected_contracts = sum(
            len(group["required_variants"]) for group in self.requirements["ranked_groups"]
        )
        self.assertEqual(len(rows), 100)
        self.assertEqual([row["rank"] for row in rows], list(range(1, 101)))
        self.assertEqual(len({row["group_id"] for row in rows}), 100)
        self.assertEqual(sum(len(row["material_contracts"]) for row in rows), expected_contracts)
        self.assertTrue(self.report["invariants"]["exactly_100_rows"])
        self.assertTrue(self.report["invariants"]["code_spans_hashes_validated"])
        self.assertTrue(self.report["invariants"]["code_matches_source_span_readback"])

    def test_complexity_is_zero_for_direct_one_for_simple_and_multiple_for_complex(self) -> None:
        by_group = {row["group_id"]: row for row in self.report["rows"]}
        self.assertEqual(by_group["describe_codebook"]["complexity"]["example_count"], 0)
        self.assertEqual(by_group["describe_codebook"]["complexity"]["decision"], "direct_policy")
        self.assertEqual(by_group["assert_isid"]["complexity"]["example_count"], 1)
        self.assertEqual(by_group["assert_isid"]["complexity"]["decision"], "simple")
        self.assertGreater(by_group["teffects"]["complexity"]["example_count"], 1)
        self.assertEqual(by_group["teffects"]["complexity"]["decision"], "multiple")

    def test_every_nondirect_contract_is_covered_or_an_explicit_audited_gap(self) -> None:
        declared = set(self.report["invariants"]["declared_guide_gaps"])
        observed = {
            contract
            for row in self.report["rows"]
            for contract in row["guide_gap_contract_ids"]
        }
        self.assertEqual(observed, declared)
        self.assertTrue(self.report["invariants"]["all_undeclared_nondirect_contracts_guide_covered"])
        for row in self.report["rows"]:
            covered = {
                contract
                for item in row["guide_blocks"]
                for contract in item["contract_ids"]
            }
            for contract in row["material_contracts"]:
                if contract["policy"] == "guide_required" and contract["contract_id"] not in declared:
                    self.assertIn(contract["contract_id"], covered)

    def test_command_example_audit_suppresses_and_reassigns_without_mutating_sources(self) -> None:
        original_guides = copy.deepcopy(self.guides)
        effective, applied = apply_guide_audit(self.guides, self.audit)
        labels = {row["label_id"] for row in effective}
        self.assertNotIn("data.generate_indicator.v1", labels)
        self.assertNotIn("reporting.graph_export_pdf.separate.v1", labels)
        winsor = next(row for row in effective if row["label_id"] == "reporting.winsor2_pooled_replace.v1")
        self.assertEqual(winsor["contract_ids"], ["winsor2.two_sided_replace"])
        self.assertEqual(self.guides, original_guides)
        self.assertEqual(len(applied), len(self.audit["label_overrides"]))

    def test_legacy_paper_code_is_only_anchor_context_and_all_blocks_are_accounted(self) -> None:
        mapped = {
            item["label_id"]
            for row in self.report["rows"]
            for classification in ("candidate", "reference", "excluded")
            for item in row["paper_code_context"][classification]
        }
        unmapped = {item["label_id"] for item in self.report["unmapped_legacy_paper_blocks"]}
        expected = {item["label_id"] for item in self.usage if item.get("code")}
        self.assertEqual(mapped | unmapped, expected)
        self.assertFalse(mapped & unmapped)
        for row in self.report["rows"]:
            for classification in ("candidate", "reference", "excluded"):
                for item in row["paper_code_context"][classification]:
                    self.assertEqual(item["mapping_scope"], "group_context_only_not_exact_contract_support")
                    source = next(card for card in self.usage if card["label_id"] == item["label_id"])
                    self.assertEqual(item["code"], source["code"])
                    self.assertEqual(item["code_line_count"], len(source["code"].splitlines()))

    def test_all_guide_and_legacy_code_blocks_are_preserved_in_full(self) -> None:
        guide_by_label = {card["label_id"]: card for card in self.guides}
        paper_by_label = {card["label_id"]: card for card in self.usage if card.get("code")}
        rendered_guides = {item["label_id"]: item for item in self.report["all_guide_code_blocks"]}
        rendered_papers = {item["label_id"]: item for item in self.report["all_legacy_paper_code_blocks"]}
        self.assertEqual(len(guide_by_label), 454)
        self.assertEqual(len(paper_by_label), 109)
        self.assertEqual(set(rendered_guides), set(guide_by_label))
        self.assertEqual(set(rendered_papers), set(paper_by_label))
        for label, source in guide_by_label.items():
            self.assertEqual(rendered_guides[label]["code"], source["code"])
        for label, source in paper_by_label.items():
            self.assertEqual(rendered_papers[label]["code"], source["code"])
        self.assertTrue(all(item["audit_action"] for item in rendered_guides.values()))
        self.assertEqual(
            rendered_guides["reporting.winsor2_pooled_replace.v1"]["audit_action"],
            "override_contracts",
        )
        self.assertEqual(
            rendered_guides["official.table_legacy_c_reference.v1"]["audit_action"],
            "supplemental_only",
        )
        self.assertTrue(self.report["invariants"]["all_guide_blocks_in_complete_ledger"])
        self.assertTrue(self.report["invariants"]["all_legacy_paper_blocks_in_complete_ledger"])

    def test_exact_paper_support_is_code_free_and_gaps_are_contract_exact(self) -> None:
        nondirect_contracts = {
            item["contract_id"]
            for row in self.report["rows"]
            for item in row["material_contracts"]
            if item["policy"] == "guide_required"
        }
        exact_supported = set()
        for row in self.report["rows"]:
            for contract, records in row["paper_exact_support_code_unavailable"].items():
                exact_supported.add(contract)
                for record in records:
                    self.assertFalse(record["code_available"])
                    self.assertIn(record["evidence_role"], {"exact_usage_support", "occurrence_support"})
            self.assertEqual(
                set(row["paper_code_template_exact_mapping_gap_contract_ids"]),
                {
                    item["contract_id"]
                    for item in row["material_contracts"]
                    if item["policy"] == "guide_required"
                },
            )
        reported_support_gaps = {
            contract
            for row in self.report["rows"]
            for contract in row["paper_exact_support_gap_contract_ids"]
        }
        self.assertEqual(reported_support_gaps, nondirect_contracts - exact_supported)

    def test_mutated_code_hash_is_rejected(self) -> None:
        broken = copy.deepcopy(self.guides)
        broken[0]["code"] += "\ndisplay 1\n"
        with self.assertRaisesRegex(ValueError, "code SHA-256 mismatch"):
            build_report(
                plugin=PLUGIN,
                requirements=self.requirements,
                registry=self.registry,
                guide_cards=broken,
                usage_cards=self.usage,
                command_example_audit=self.audit,
            )

    def test_clean_plugin_uses_only_hash_verified_source_archive(self) -> None:
        card = copy.deepcopy(self.guides[0])
        provenance = card["provenance"]
        source_hash = provenance["source_file_sha256"]
        source_path = provenance["source_path"]
        source_bytes = (PLUGIN.parents[1] / source_path).read_bytes()
        with tempfile.TemporaryDirectory() as temporary:
            clean_plugin = Path(temporary) / "plugins" / "stata-research-guard"
            archive = clean_plugin / "data" / "source_archive" / "files" / f"{source_hash}.source"
            archive.parent.mkdir(parents=True)
            archive.write_bytes(source_bytes)
            validate_card(card, plugin=clean_plugin, layer_name="guide", code_required=True)

    def test_clean_plugin_rejects_missing_or_tampered_source_archive(self) -> None:
        card = copy.deepcopy(self.guides[0])
        source_hash = card["provenance"]["source_file_sha256"]
        with tempfile.TemporaryDirectory() as temporary:
            clean_plugin = Path(temporary) / "plugins" / "stata-research-guard"
            with self.assertRaisesRegex(ValueError, "source archive file does not exist"):
                validate_card(card, plugin=clean_plugin, layer_name="guide", code_required=True)
            archive = clean_plugin / "data" / "source_archive" / "files" / f"{source_hash}.source"
            archive.parent.mkdir(parents=True)
            archive.write_text("tampered\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source archive SHA-256 mismatch"):
                validate_card(card, plugin=clean_plugin, layer_name="guide", code_required=True)

    def test_tampered_present_local_source_cannot_fall_back_to_archive(self) -> None:
        card = copy.deepcopy(self.guides[0])
        source_hash = card["provenance"]["source_file_sha256"]
        source_path = card["provenance"]["source_path"]
        source_bytes = (PLUGIN.parents[1] / source_path).read_bytes()
        with tempfile.TemporaryDirectory() as temporary:
            clean_plugin = Path(temporary) / "plugins" / "stata-research-guard"
            archive = clean_plugin / "data" / "source_archive" / "files" / f"{source_hash}.source"
            archive.parent.mkdir(parents=True)
            archive.write_bytes(source_bytes)
            local_source = clean_plugin.parents[1] / source_path
            local_source.parent.mkdir(parents=True)
            local_source.write_text("tampered local source\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source file SHA-256 mismatch"):
                validate_card(card, plugin=clean_plugin, layer_name="guide", code_required=True)

    def test_generated_json_and_markdown_are_current_and_table_safe(self) -> None:
        generated = json.loads(
            (PLUGIN / "data" / "top100_command_evidence_matrix.json").read_text(encoding="utf-8")
        )
        self.assertEqual(generated, self.report)
        markdown = render_markdown(self.report)
        stored_markdown = (PLUGIN / "review" / "top100_command_evidence_matrix.md").read_text(encoding="utf-8")
        self.assertEqual(stored_markdown, markdown)
        rows = [line for line in markdown.splitlines() if line.startswith("| ") and line[2:3].isdigit()]
        self.assertEqual(len(rows), 100)
        self.assertTrue(all(line.count(" | ") == 9 for line in rows))
        self.assertNotIn("\ufffd", markdown)
        self.assertNotIn("excerpt", markdown)
        self.assertIn("## Complete guide mechanics code ledger", markdown)
        self.assertIn("## Guide audit actions", markdown)
        self.assertIn("## Complete legacy paper code ledger", markdown)
        self.assertIn("data.generate_indicator.v1", markdown)
        self.assertIn("already_suppressed_upstream", markdown)
        for item in self.report["all_guide_code_blocks"] + self.report["all_legacy_paper_code_blocks"]:
            self.assertIn(html.escape(item["label_id"], quote=True), markdown)
            full_code = html.escape(item["code"], quote=True).replace("|", "&#124;").replace("\n", "&#10;")
            self.assertIn(f"<pre>{full_code}</pre>", markdown)
        source_hashes = {
            (card["label_id"], card["provenance"]["code_sha256"])
            for card in self.guides + [card for card in self.usage if card.get("code")]
        }
        markdown_hashes = set(re.findall(
            r"<summary><code>([^ <]+)(?: \[[^<]*\])?</code></summary><small>[^<]*; code_sha256=([0-9a-f]{64})</small><pre>",
            markdown,
        ))
        self.assertEqual(markdown_hashes, source_hashes)


if __name__ == "__main__":
    unittest.main()
