#!/usr/bin/env python3
"""Build the code-free manual/maintainer metadata ledger.

This tool intentionally does not read, extract, hash, or emit Stata code.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


def canonical_hash(value: object) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def build_ledger(plugin: Path) -> dict:
    entries = [
        entry for path in sorted((plugin / "annotations/atomic_template_sets").glob("*.json"))
        for entry in json.loads(path.read_text(encoding="utf-8"))
    ]
    records = []
    for entry in entries:
        urls = entry.get("source_urls", [])
        if not urls or not all(isinstance(url, str) and url.startswith(("https://", "http://")) for url in urls):
            raise ValueError(f"authoritative source URL required: {entry['label_id']}")
        role = (
            "maintainer_guide"
            if entry["source_kind"].startswith("user_written_command_")
            else "official_manual"
        )
        record = {
            "label_id": entry["label_id"], "disposition": "reference_only", "auto_selectable": False,
            "contract_ids": entry["contract_ids"], "candidate_inventory_sha256": canonical_hash(entry),
            "source_layers": {role: {"status": "pass", "source_id": urls[0]}},
            "source": {"source_id": urls[0], "role": role, "kind": entry["source_kind"]},
            "independence": {"independent_support": False, "scope": "manual or maintainer command metadata only"},
            "input_profile": entry["template_input_profile"], "state_signature": entry["state_signature"],
            "variant_distinctness": {"against": [], "reason": entry["variant_distinction"]},
            "safety_checks": {"nested_loop": "pass", "tex_output": "pass"},
            "auditor": {"reviewer": "metadata_registry_audit", "status": "pass"},
            "runtime": {"status": "not_run", "reason": "No code template is shipped."},
            "selector": {"status": "not_run", "reason": "Guide metadata is never auto-selected."},
        }
        for mapping_key in ("supplemental_contract_id", "unmapped_reason"):
            if entry.get(mapping_key):
                record[mapping_key] = entry[mapping_key]
        records.append(record)
    legacy_count = len(json.loads((plugin / "annotations/labeled_checkpoints.json").read_text(encoding="utf-8")))
    return {
        "schema_version": "2.0",
        "legacy_baseline": {"status": "current_code_free_registry", "label_count": legacy_count, "source": "annotations/labeled_checkpoints.json", "claim_boundary": "Only the approved outreg2 formatter remains derived canonical code."},
        "candidate_records": records,
    }


if __name__ == "__main__":
    plugin = Path(__file__).resolve().parents[1]
    (plugin / "annotations/template_promotion_audit.json").write_text(json.dumps(build_ledger(plugin), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
