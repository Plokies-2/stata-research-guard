from __future__ import annotations

"""Build the normalized Top-100 command evidence matrix and its Markdown view.

The report keeps three evidence meanings separate:

* guide cards cover command mechanics and determine the complexity-weighted
  display count;
* code-free research-usage records may support an exact contract or only a
  group-level occurrence;
* legacy deposited code is mapped by registry command anchors for context only.
  It is never promoted to exact-contract support by that mapping.
"""

import argparse
import copy
import hashlib
import html
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "1.0"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_CLASSES = {"preferred_candidate", "conditional_candidate"}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def stable_json_sha256(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(payload)


def is_direct_variant(group: dict[str, Any], variant: str) -> bool:
    """Mirror the requirements policy without turning direct primitives into templates."""
    if group["coverage_mode"] == "direct_primitive":
        return True
    if group["coverage_mode"] != "mixed":
        return False
    return variant.startswith("direct_") or any(
        token in variant for token in ("_direct", "_policy", "_forbidden")
    )


def contract_id(group_id: str, variant: str) -> str:
    return f"{group_id}.{variant}"


def normalize_spans(value: Any, field: str) -> list[list[int]]:
    """Normalize the two shipped span encodings to one inclusive pair format."""
    if isinstance(value, int):
        value = str(value)
    if isinstance(value, str):
        spans: list[list[int]] = []
        for item in value.split(","):
            item = item.strip()
            if not item:
                continue
            if not re.fullmatch(r"[1-9][0-9]*(?:-[1-9][0-9]*)?", item):
                raise ValueError(f"invalid {field}: {value!r}")
            start_text, _, end_text = item.partition("-")
            start = int(start_text)
            end = int(end_text or start_text)
            if end < start:
                raise ValueError(f"descending {field}: {value!r}")
            spans.append([start, end])
        if not spans:
            raise ValueError(f"empty {field}")
        return spans
    if isinstance(value, list):
        spans = []
        for item in value:
            if not isinstance(item, list) or len(item) != 2:
                raise ValueError(f"invalid {field} pair: {item!r}")
            start, end = item
            if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
                raise ValueError(f"invalid {field} pair: {item!r}")
            spans.append([start, end])
        if not spans:
            raise ValueError(f"empty {field}")
        return spans
    raise ValueError(f"unsupported {field} encoding: {value!r}")


def normalized_block_text(value: str) -> str:
    """Ignore only blank lines and trailing whitespace in source-span readback."""
    return "\n".join(line.rstrip() for line in value.splitlines() if line.strip())


def _require_sha(value: Any, field: str) -> str:
    if not isinstance(value, str) or not SHA256_RE.fullmatch(value):
        raise ValueError(f"{field} must be a lowercase SHA-256")
    return value


def _local_source_path(plugin: Path, source_path: str) -> Path:
    repo = plugin.parents[1].resolve()
    resolved = (repo / source_path).resolve()
    try:
        resolved.relative_to(repo)
    except ValueError as exc:
        raise ValueError(f"source path escapes repository: {source_path}") from exc
    return resolved


def _validated_source_lines(
    *, plugin: Path, source_path: str, source_hash: str, label_id: str
) -> list[str]:
    """Read a declared source locally, or fail closed on its content-addressed archive copy.

    A present local source is authoritative for development: a changed local file
    must never be hidden by an older archive.  Release bundles intentionally omit
    the raw corpus, so only an archive named for and hashing to the declaration
    can stand in for an absent local source.
    """
    local_source = _local_source_path(plugin, source_path)
    if local_source.is_file():
        if sha256_file(local_source) != source_hash:
            raise ValueError(f"{label_id} source file SHA-256 mismatch")
        source = local_source
    else:
        archive = plugin / "data" / "source_archive" / "files" / f"{source_hash}.source"
        if archive.name != f"{source_hash}.source":
            raise ValueError(f"{label_id} source archive filename does not match declared SHA-256")
        if not archive.is_file():
            raise ValueError(f"{label_id} source archive file does not exist: {archive.name}")
        if sha256_file(archive) != source_hash:
            raise ValueError(f"{label_id} source archive SHA-256 mismatch")
        source = archive
    return source.read_text(encoding="utf-8-sig").splitlines()


def validate_card(
    card: dict[str, Any],
    *,
    plugin: Path,
    layer_name: str,
    code_required: bool,
) -> None:
    label_id = card.get("label_id")
    if not isinstance(label_id, str) or not label_id:
        raise ValueError(f"{layer_name} card has no label_id")
    code = card.get("code")
    if code is not None and not isinstance(code, str):
        raise ValueError(f"{label_id} has invalid code availability")
    if code_required and not code:
        raise ValueError(f"{label_id} has invalid code availability")
    if layer_name == "guide" and (code not in {None, ""} or card.get("code_available") is not False):
        raise ValueError(f"{label_id} guide mechanics must remain code-free")
    provenance = card.get("provenance")
    if not isinstance(provenance, dict):
        raise ValueError(f"{label_id} has no provenance object")
    if layer_name == "guide":
        manual_urls = card.get("manual_urls")
        if (
            not isinstance(manual_urls, list)
            or not manual_urls
            or not all(isinstance(url, str) and url.startswith(("https://", "http://")) for url in manual_urls)
        ):
            raise ValueError(f"{label_id} guide metadata has no authoritative manual URL")
        forbidden_provenance = {
            key
            for key in ("source_path", "file", "source_spans", "line_span", "source_file_sha256", "code_sha256")
            if provenance.get(key) not in (None, [], "")
        }
        if forbidden_provenance:
            raise ValueError(
                f"{label_id} guide metadata carries forbidden code-source provenance: {sorted(forbidden_provenance)}"
            )
        gate = provenance.get("audit_gate") or {}
        if gate.get("passed") is not True or gate.get("basis") != "metadata_only_guide":
            raise ValueError(f"{label_id} guide metadata audit gate is not verified")
        return
    source_path = provenance.get("source_path") or provenance.get("file")
    if not isinstance(source_path, str) or not source_path:
        raise ValueError(f"{label_id} has no source path")
    if layer_name == "research_usage" and not code:
        if card.get("code_available") not in {False, None}:
            raise ValueError(f"{label_id} code-free usage support has inconsistent availability")
        if card.get("evidence_role") not in {"exact_usage_support", "occurrence_support"}:
            raise ValueError(f"{label_id} code-free usage support has no bounded evidence role")
        _require_sha(provenance.get("source_file_sha256"), f"{label_id}.source_file_sha256")
        return
    raw_spans = provenance.get("source_spans", provenance.get("line_span"))
    spans = normalize_spans(raw_spans, f"{label_id}.source_spans")
    source_hash = _require_sha(provenance.get("source_file_sha256"), f"{label_id}.source_file_sha256")
    source_lines = _validated_source_lines(
        plugin=plugin,
        source_path=source_path,
        source_hash=source_hash,
        label_id=label_id,
    )
    line_count = len(source_lines)
    if any(end > line_count for _, end in spans):
        raise ValueError(f"{label_id} source span exceeds source file")
    source_readback = "\n".join(
        "\n".join(source_lines[start - 1 : end]) for start, end in spans
    )
    if code:
        code_hash = _require_sha(provenance.get("code_sha256"), f"{label_id}.code_sha256")
        if sha256_bytes(code.encode("utf-8")) != code_hash:
            raise ValueError(f"{label_id} code SHA-256 mismatch")
        if normalized_block_text(source_readback) != normalized_block_text(code):
            raise ValueError(f"{label_id} code does not match its declared source spans")


def apply_guide_audit(
    guide_cards: list[dict[str, Any]], audit: dict[str, Any]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if audit.get("schema_version") != "1.0":
        raise ValueError("command_example_audit schema_version must be 1.0")
    cards_by_label = {row["label_id"]: row for row in guide_cards}
    overrides = audit.get("label_overrides")
    if not isinstance(overrides, dict):
        raise ValueError("command_example_audit.label_overrides must be an object")
    effective: list[dict[str, Any]] = []
    applied: list[dict[str, Any]] = []
    for label_id, override in overrides.items():
        if label_id not in cards_by_label:
            replacement = override.get("replacement_label_id")
            if override.get("action") == "suppress_semantic_duplicate" and replacement in cards_by_label:
                applied.append({
                    "label_id": label_id,
                    **copy.deepcopy(override),
                    "application_status": "already_suppressed_upstream",
                })
                continue
            raise ValueError(f"command_example_audit names unknown guide label: {label_id}")
    for source in guide_cards:
        row = copy.deepcopy(source)
        override = overrides.get(row["label_id"])
        if not override:
            effective.append(row)
            continue
        action = override.get("action")
        applied_row = {
            "label_id": row["label_id"],
            **copy.deepcopy(override),
            "application_status": "applied_in_report",
        }
        if action == "suppress_semantic_duplicate":
            replacement = override.get("replacement_label_id")
            if replacement not in cards_by_label:
                raise ValueError(f"{row['label_id']} has unknown replacement_label_id")
            applied.append(applied_row)
            continue
        if action in {"override_contracts", "supplemental_only"}:
            contracts = override.get("contract_ids")
            if not isinstance(contracts, list) or len(contracts) != len(set(contracts)):
                raise ValueError(f"{row['label_id']} override contract_ids must be a unique array")
            row["contract_ids"] = contracts
            if "supplemental_contract_id" in override:
                row["supplemental_contract_id"] = override["supplemental_contract_id"]
            effective.append(row)
            applied.append(applied_row)
            continue
        raise ValueError(f"unsupported command_example_audit action for {row['label_id']}: {action}")
    return effective, applied


def normalize_anchor(value: str) -> str:
    normalized = value.strip().lower().replace(":", "")
    normalized = re.sub(r"[.()]+$", "", normalized)
    normalized = re.sub(r"[\s./-]+", "_", normalized)
    aliases = {
        "gen": "generate",
        "ren": "rename",
        "su": "summarize",
        "tab": "tabulate",
        "mat": "matrix",
        "estimate": "estimates",
        "graph_export": "graph_export",
        "graph_combine": "graph_combine",
        "import_excel": "import_excel",
        "export_excel": "export_excel",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized.startswith("label_"):
        return "label"
    if normalized.startswith("estimates_"):
        return "estimates"
    if normalized in {"estadd_obs", "estadd_mean_y"}:
        return "estadd"
    return normalized


def registry_maps(
    requirements: dict[str, Any], registry: dict[str, Any]
) -> tuple[dict[str, set[str]], dict[str, set[str]], list[dict[str, Any]]]:
    ranked = requirements.get("ranked_groups")
    coverage = registry.get("top100_coverage", {}).get("groups")
    if not isinstance(ranked, list) or len(ranked) != 100:
        raise ValueError("requirements must contain 100 ranked groups")
    if not isinstance(coverage, list) or len(coverage) != 100:
        raise ValueError("package registry must contain 100 Top-100 coverage groups")
    command_index = registry.get("command_index")
    if not isinstance(command_index, list):
        raise ValueError("package registry command_index must be an array")
    token_to_groups: dict[str, set[str]] = defaultdict(set)
    group_to_tokens: dict[str, set[str]] = defaultdict(set)
    exemptions: list[dict[str, Any]] = []
    for expected, observed in zip(ranked, coverage):
        for field in ("rank", "group_id", "commands"):
            if observed.get(field) != expected.get(field):
                raise ValueError(f"registry Top-100 {field} mismatch at rank {expected.get('rank')}")
        mappings = observed.get("command_mappings")
        language_exemptions = observed.get("language_element_exemptions")
        if not isinstance(mappings, list) or not isinstance(language_exemptions, list):
            raise ValueError(f"registry mapping arrays missing for {expected['group_id']}")
        accounted = {row.get("source_command") for row in mappings} | {
            row.get("source_command") for row in language_exemptions
        }
        if accounted != set(expected["commands"]):
            raise ValueError(f"registry commands are not fully accounted for: {expected['group_id']}")
        for mapping in mappings:
            token = normalize_anchor(str(mapping.get("registry_token") or ""))
            if not token:
                raise ValueError(f"empty registry token for {expected['group_id']}")
            # Direct diagnostics and language mechanics can have an explicit
            # Top-100 registry token without a standalone detector entry.
            # command_index membership is therefore informative, not a gate.
            token_to_groups[token].add(expected["group_id"])
            group_to_tokens[expected["group_id"]].add(token)
            source_token = normalize_anchor(str(mapping.get("source_command") or ""))
            token_to_groups[source_token].add(expected["group_id"])
        exemptions.extend(
            {"group_id": expected["group_id"], **copy.deepcopy(row)} for row in language_exemptions
        )
    return token_to_groups, group_to_tokens, exemptions


def mapped_groups_for_anchors(anchors: Iterable[str], token_to_groups: dict[str, set[str]]) -> set[str]:
    groups: set[str] = set()
    for anchor in anchors:
        token = normalize_anchor(anchor)
        groups.update(token_to_groups.get(token, set()))
        if token == "frame":
            for candidate, candidate_groups in token_to_groups.items():
                if candidate.startswith("frame_"):
                    groups.update(candidate_groups)
    return groups


def card_source(card: dict[str, Any]) -> dict[str, Any]:
    provenance = card["provenance"]
    raw_spans = provenance.get("source_spans", provenance.get("line_span"))
    return {
        "source_path": provenance.get("source_path") or provenance.get("file"),
        "source_spans": normalize_spans(raw_spans, f"{card['label_id']}.source_spans"),
        "source_file_sha256": provenance.get("source_file_sha256"),
        "source_kind": provenance.get("source_kind"),
    }


def guide_view(card: dict[str, Any], ranked_contracts: set[str], nondirect: set[str]) -> dict[str, Any]:
    covered = sorted(set(card.get("contract_ids", [])) & ranked_contracts)
    return {
        "label_id": card["label_id"],
        "contract_ids": covered,
        "counts_toward_complexity": bool(set(covered) & nondirect),
        "code_available": False,
        "authority_tier": card.get("authority_tier"),
        "manual_urls": list(card.get("manual_urls", [])),
        "command_anchors": list(card.get("command_anchors", [])),
        "state_signature": copy.deepcopy(card.get("state_signature") or {}),
    }


def paper_code_view(card: dict[str, Any], matched_groups: set[str]) -> dict[str, Any]:
    rubric = card.get("rubric_classification")
    if card.get("decision") == "drop" or rubric == "exclude":
        classification = "excluded"
    elif rubric in CANDIDATE_CLASSES:
        classification = "candidate"
    else:
        classification = "reference"
    return {
        "label_id": card["label_id"],
        "classification": classification,
        "decision": card.get("decision"),
        "rubric_classification": rubric,
        "command_anchors": list(card.get("command_anchors", [])),
        "anchor_mapped_group_ids": sorted(matched_groups),
        "mapping_scope": "group_context_only_not_exact_contract_support",
        "code": card["code"],
        "code_line_count": len(card["code"].splitlines()),
        "code_sha256": card["provenance"]["code_sha256"],
        **card_source(card),
    }


def paper_support_view(card: dict[str, Any]) -> dict[str, Any]:
    provenance = card["provenance"]
    return {
        "label_id": card["label_id"],
        "evidence_role": card.get("evidence_role"),
        "code_available": False,
        "contract_ids": list(card.get("contract_ids", [])),
        "command_anchors": list(card.get("command_anchors", [])),
        "runtime_status": card.get("runtime_status") or provenance.get("runtime_status") or "not_checked",
        "selector_status": card.get("selector_status") or provenance.get("selector_status") or "not_checked",
        **card_source(card),
    }


def guide_ledger_view(card: dict[str, Any], override: Any) -> dict[str, Any]:
    """Keep every code-free guide record, including audit-suppressed metadata."""
    view = guide_view(card, set(card.get("contract_ids", [])), set())
    audit_action = override.get("action") if isinstance(override, dict) else None
    view["audit_action"] = audit_action or "retained_no_override"
    view["audit_application_status"] = (
        "applied_or_recorded_in_guide_audit" if audit_action else "not_overridden"
    )
    if audit_action:
        view["audit_override"] = copy.deepcopy(override)
    return view


def build_report(
    *,
    plugin: Path,
    requirements: dict[str, Any],
    registry: dict[str, Any],
    guide_cards: list[dict[str, Any]],
    usage_cards: list[dict[str, Any]],
    command_example_audit: dict[str, Any],
) -> dict[str, Any]:
    plugin = plugin.resolve()
    labels = [row.get("label_id") for row in [*guide_cards, *usage_cards]]
    duplicates = sorted(label for label, count in Counter(labels).items() if label and count > 1)
    if duplicates:
        raise ValueError(f"duplicate evidence label_id(s): {', '.join(duplicates)}")
    if any(not label for label in labels):
        raise ValueError("every evidence row must have a label_id")

    for card in guide_cards:
        validate_card(card, plugin=plugin, layer_name="guide", code_required=False)
    for card in usage_cards:
        validate_card(card, plugin=plugin, layer_name="research_usage", code_required=bool(card.get("code")))
        if card.get("code") and card.get("contract_ids"):
            raise ValueError(
                f"legacy paper code must not claim exact contract_ids: {card['label_id']}"
            )
        if not card.get("code") and card.get("code_available") not in {False, None}:
            raise ValueError(f"code-free paper support has inconsistent code_available: {card['label_id']}")

    effective_guides, applied_overrides = apply_guide_audit(guide_cards, command_example_audit)
    guide_overrides = command_example_audit["label_overrides"]
    token_to_groups, group_to_tokens, exemptions = registry_maps(requirements, registry)
    ranked_groups = requirements["ranked_groups"]
    all_ranked_contracts = {
        contract_id(group["group_id"], variant)
        for group in ranked_groups
        for variant in group["required_variants"]
    }
    group_contracts = {
        group["group_id"]: {contract_id(group["group_id"], variant) for variant in group["required_variants"]}
        for group in ranked_groups
    }

    guide_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    supplemental_guide_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for card in effective_guides:
        mapped_contracts = set(card.get("contract_ids", [])) & all_ranked_contracts
        for group_id in sorted({item.split(".", 1)[0] for item in mapped_contracts}):
            guide_by_group[group_id].append(card)
        supplemental = card.get("supplemental_contract_id")
        if isinstance(supplemental, str) and "." in supplemental:
            group_id = supplemental.split(".", 1)[0]
            if group_id in group_contracts:
                supplemental_guide_by_group[group_id].append(card)

    paper_code_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    paper_code_views: dict[str, dict[str, Any]] = {}
    unmapped_legacy: list[dict[str, Any]] = []
    exact_support_by_contract: dict[str, list[dict[str, Any]]] = defaultdict(list)
    codefree_context_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unmapped_codefree: list[dict[str, Any]] = []
    for card in usage_cards:
        matched_groups = mapped_groups_for_anchors(card.get("command_anchors", []), token_to_groups)
        if card.get("code"):
            view = paper_code_view(card, matched_groups)
            paper_code_views[card["label_id"]] = view
            if not matched_groups:
                unmapped_legacy.append(view)
            for group_id in matched_groups:
                paper_code_by_group[group_id].append(card)
            continue
        ranked_exact = set(card.get("contract_ids", [])) & all_ranked_contracts
        support = paper_support_view(card)
        for exact_contract in ranked_exact:
            exact_support_by_contract[exact_contract].append(support)
        if not ranked_exact:
            if not matched_groups:
                unmapped_codefree.append(support)
            for group_id in matched_groups:
                codefree_context_by_group[group_id].append(support)

    group_findings = command_example_audit.get("group_findings", {})
    if not isinstance(group_findings, dict):
        raise ValueError("command_example_audit.group_findings must be an object")
    rows: list[dict[str, Any]] = []
    missing_nondirect: list[str] = []
    declared_guide_gaps: set[str] = set()
    for group in ranked_groups:
        group_id = group["group_id"]
        contracts = []
        nondirect_contracts: set[str] = set()
        direct_contracts: set[str] = set()
        for variant in group["required_variants"]:
            exact_contract = contract_id(group_id, variant)
            direct = is_direct_variant(group, variant)
            (direct_contracts if direct else nondirect_contracts).add(exact_contract)
            contracts.append({
                "contract_id": exact_contract,
                "variant": variant,
                "policy": "direct_policy" if direct else "guide_required",
            })
        group_guides = sorted(guide_by_group[group_id], key=lambda item: item["label_id"])
        guide_views = [guide_view(card, group_contracts[group_id], nondirect_contracts) for card in group_guides]
        covered = {
            exact_contract
            for view in guide_views
            for exact_contract in view["contract_ids"]
            if exact_contract in nondirect_contracts
        }
        group_missing = sorted(nondirect_contracts - covered)
        missing_nondirect.extend(group_missing)
        finding = copy.deepcopy(group_findings.get(group_id))
        if finding:
            finding_missing = set(finding.get("missing_contract_ids", []))
            if finding.get("status") == "guide_gap":
                if finding_missing != set(group_missing):
                    raise ValueError(f"guide-gap finding does not match computed gaps for {group_id}")
                declared_guide_gaps.update(finding_missing)
            elif finding_missing:
                raise ValueError(f"non-gap finding declares missing contracts for {group_id}")
        counted_guides = [view for view in guide_views if view["counts_toward_complexity"]]
        if not nondirect_contracts:
            complexity = {"example_count": 0, "decision": "direct_policy", "coverage_status": "not_required"}
        elif group_missing:
            complexity = {
                "example_count": len(counted_guides),
                "decision": "gap",
                "coverage_status": "declared_guide_gap" if set(group_missing) <= declared_guide_gaps else "uncovered",
            }
        elif len(counted_guides) == 1:
            complexity = {"example_count": 1, "decision": "simple", "coverage_status": "covered"}
        else:
            complexity = {
                "example_count": len(counted_guides),
                "decision": "multiple",
                "coverage_status": "covered",
            }

        anchored_code = [paper_code_views[card["label_id"]] for card in paper_code_by_group[group_id]]
        anchored_code.sort(key=lambda item: item["label_id"])
        exact_support = {
            exact_contract: sorted(exact_support_by_contract.get(exact_contract, []), key=lambda item: item["label_id"])
            for exact_contract in sorted(nondirect_contracts)
            if exact_support_by_contract.get(exact_contract)
        }
        exact_support_gaps = sorted(
            exact_contract for exact_contract in nondirect_contracts if not exact_support_by_contract.get(exact_contract)
        )
        # Code-bearing paper blocks are intentionally anchor context only.  No exact
        # paper-code template coverage may be inferred from their proximity.
        exact_code_template_gaps = sorted(nondirect_contracts)
        rows.append({
            "rank": group["rank"],
            "group_id": group_id,
            "commands": list(group["commands"]),
            "coverage_mode": group["coverage_mode"],
            "registry_tokens": sorted(group_to_tokens[group_id]),
            "complexity": complexity,
            "material_contracts": contracts,
            "guide_blocks": guide_views,
            "supplemental_guide_context": [
                guide_view(card, set(), set())
                for card in sorted(supplemental_guide_by_group[group_id], key=lambda item: item["label_id"])
            ],
            "guide_gap_contract_ids": group_missing,
            "group_audit_finding": finding,
            "paper_code_context": {
                "candidate": [item for item in anchored_code if item["classification"] == "candidate"],
                "reference": [item for item in anchored_code if item["classification"] == "reference"],
                "excluded": [item for item in anchored_code if item["classification"] == "excluded"],
            },
            "paper_exact_support_code_unavailable": exact_support,
            "paper_codefree_group_context": sorted(
                codefree_context_by_group[group_id], key=lambda item: item["label_id"]
            ),
            "paper_exact_support_gap_contract_ids": exact_support_gaps,
            "paper_code_template_exact_mapping_gap_contract_ids": exact_code_template_gaps,
        })

    undeclared_guide_gaps = sorted(set(missing_nondirect) - declared_guide_gaps)
    if undeclared_guide_gaps:
        raise ValueError(f"non-direct contracts lack guide coverage: {', '.join(undeclared_guide_gaps)}")
    mapped_legacy_ids = {
        item["label_id"]
        for row in rows
        for kind in ("candidate", "reference", "excluded")
        for item in row["paper_code_context"][kind]
    }
    all_legacy_ids = {row["label_id"] for row in usage_cards if row.get("code")}
    unmapped_legacy_ids = {row["label_id"] for row in unmapped_legacy}
    if mapped_legacy_ids | unmapped_legacy_ids != all_legacy_ids:
        raise ValueError("legacy paper-code accounting is incomplete")
    if mapped_legacy_ids & unmapped_legacy_ids:
        raise ValueError("legacy paper-code block is both mapped and unmapped")
    all_guide_mechanics_metadata = sorted(
        (guide_ledger_view(card, guide_overrides.get(card["label_id"])) for card in guide_cards),
        key=lambda item: item["label_id"],
    )
    all_legacy_paper_code_blocks = sorted(
        (paper_code_view(card, mapped_groups_for_anchors(card.get("command_anchors", []), token_to_groups))
         for card in usage_cards if card.get("code")),
        key=lambda item: item["label_id"],
    )

    requirements_path = plugin / "annotations" / "command_template_requirements.json"
    registry_path = plugin / "annotations" / "package_command_registry.json"
    guide_path = plugin / "data" / "guide_mechanics_cards.jsonl"
    usage_path = plugin / "data" / "research_usage_examples.jsonl"
    audit_path = plugin / "annotations" / "command_example_audit.json"
    declared_requirements_hash = registry.get("top100_coverage", {}).get("requirements_sha256")
    actual_requirements_file_hash = sha256_file(requirements_path)
    actual_requirements_contract_hash = stable_json_sha256(requirements)
    return {
        "schema_version": SCHEMA_VERSION,
        "title": "Top 100 Stata command evidence matrix",
        "policy": {
            "complexity_weighted": True,
            "direct_policy_example_count": 0,
            "legacy_paper_anchor_mapping": "group_context_only_not_exact_contract_support",
            "codefree_contract_mapping": "exact_support_or_occurrence_support_only",
            "guide_mechanics_storage": "metadata_only_no_code_body",
            "paper_code_storage": "full_code_embedded_in_this_matrix_and_markdown",
        },
        "source_files": {
            "requirements": {
                "path": requirements_path.relative_to(plugin).as_posix(),
                "sha256": actual_requirements_file_hash,
            },
            "package_command_registry": {"path": registry_path.relative_to(plugin).as_posix(), "sha256": sha256_file(registry_path)},
            "guide_mechanics_cards": {"path": guide_path.relative_to(plugin).as_posix(), "sha256": sha256_file(guide_path)},
            "research_usage_examples": {"path": usage_path.relative_to(plugin).as_posix(), "sha256": sha256_file(usage_path)},
            "command_example_audit": {"path": audit_path.relative_to(plugin).as_posix(), "sha256": sha256_file(audit_path)},
        },
        "registry_requirements_hash_check": {
            "declared_sha256": declared_requirements_hash,
            "actual_canonical_json_sha256": actual_requirements_contract_hash,
            "matches": declared_requirements_hash == actual_requirements_contract_hash,
        },
        "summary": {
            "ranked_groups": len(rows),
            "material_contracts": sum(len(row["material_contracts"]) for row in rows),
            "direct_policy_contracts": sum(
                item["policy"] == "direct_policy" for row in rows for item in row["material_contracts"]
            ),
            "guide_required_contracts": sum(
                item["policy"] == "guide_required" for row in rows for item in row["material_contracts"]
            ),
            "guide_gap_contracts": len(set(missing_nondirect)),
            "declared_guide_gap_contracts": len(declared_guide_gaps),
            "guide_blocks_displayed": sum(len(row["guide_blocks"]) for row in rows),
            "unique_guide_blocks_displayed": len({
                item["label_id"] for row in rows for item in row["guide_blocks"]
            }),
            "guide_mechanics_records_in_complete_ledger": len(all_guide_mechanics_metadata),
            "legacy_paper_code_blocks": len(all_legacy_ids),
            "legacy_paper_code_blocks_anchor_mapped": len(mapped_legacy_ids),
            "legacy_paper_code_blocks_unmapped": len(unmapped_legacy_ids),
            "codefree_exact_support_records": len({
                item["label_id"]
                for row in rows
                for items in row["paper_exact_support_code_unavailable"].values()
                for item in items
            }),
            "codefree_group_context_records": len({
                item["label_id"] for row in rows for item in row["paper_codefree_group_context"]
            }),
        },
        "invariants": {
            "exactly_100_rows": len(rows) == 100,
            "all_undeclared_nondirect_contracts_guide_covered": not undeclared_guide_gaps,
            "declared_guide_gaps": sorted(declared_guide_gaps),
            "direct_missing_guide_allowed": True,
            "code_spans_hashes_validated": True,
            "guide_provenance_hashes_validated_without_outputting_code": True,
            "unique_labels_validated": True,
            "registry_mapping_validated": True,
            "all_legacy_paper_blocks_accounted": mapped_legacy_ids | unmapped_legacy_ids == all_legacy_ids,
            "all_guide_mechanics_metadata_in_complete_ledger": {
                item["label_id"] for item in all_guide_mechanics_metadata
            } == {item["label_id"] for item in guide_cards},
            "all_legacy_paper_blocks_in_complete_ledger": {
                item["label_id"] for item in all_legacy_paper_code_blocks
            } == all_legacy_ids,
        },
        "language_element_exemptions": exemptions,
        "applied_guide_audit_overrides": applied_overrides,
        "rows": rows,
        "all_guide_mechanics_metadata": all_guide_mechanics_metadata,
        "all_legacy_paper_code_blocks": all_legacy_paper_code_blocks,
        "unmapped_legacy_paper_blocks": sorted(unmapped_legacy, key=lambda item: item["label_id"]),
        "unmapped_codefree_research_usage": sorted(unmapped_codefree, key=lambda item: item["label_id"]),
    }


def _cell(value: Any) -> str:
    return html.escape(str(value), quote=True).replace("|", "&#124;").replace("\n", "&#10;")


def _spans(value: list[list[int]]) -> str:
    return ",".join(str(start) if start == end else f"{start}-{end}" for start, end in value)


def _details(item: dict[str, Any], *, title_suffix: str = "") -> str:
    source = f"{item.get('source_path')}:{_spans(item.get('source_spans', []))}"
    label = f"{item['label_id']}{title_suffix}"
    metadata = (
        f"source={source}; source_kind={item.get('source_kind')}; "
        f"source_sha256={item.get('source_file_sha256')}"
    )
    if item.get("code_sha256"):
        metadata += f"; code_sha256={item['code_sha256']}"
    if item.get("manual_urls"):
        metadata += f"; manual_urls={','.join(item['manual_urls'])}"
    if item.get("code_available") is False:
        metadata += "; code_available=false"
        return (
            f"<details><summary><code>{_cell(label)}</code></summary>"
            f"<small>{_cell(metadata)}</small></details>"
        )
    code = _cell(item.get("code", "")) or "(code unavailable)"
    return (
        f"<details><summary><code>{_cell(label)}</code></summary>"
        f"<small>{_cell(metadata)}</small><pre>{code}</pre></details>"
    )


def _items_or_dash(items: list[dict[str, Any]], *, title_key: str | None = None) -> str:
    if not items:
        return "—"
    rendered = []
    for item in items:
        suffix = f" [{item.get(title_key)}]" if title_key else ""
        rendered.append(_details(item, title_suffix=suffix))
    return "<br>".join(rendered)


def render_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Top 100 Stata command evidence matrix",
        "",
        "## 판정 기준",
        "",
        "- `0 direct-policy`는 별도 guide template quota가 필요 없는 언어 primitive 또는 직접 진단 계약이다.",
        "- `1 simple`은 비직접 material contract를 한 개의 비중복 guide atom으로 충분히 덮는다.",
        "- `N multiple`은 입력·문법·추정·추론·returned state·handoff가 달라 여러 guide atom이 필요하다.",
        "- 논문 실제 코드는 registry token/command anchor로 그룹 문맥에만 연결한다. exact contract template support로 승격하지 않는다.",
        "- 코드 비공개 research usage만 명시 `contract_ids`가 있을 때 exact/occurrence support로 별도 표시한다.",
        "- guide mechanics는 manual URL·command·state와 source-span hash 메타데이터만 보존하며 코드 본문을 출력하지 않는다.",
        "- code-free research usage는 원문 코드가 없으므로 exact/occurrence support와 group context만 표시한다.",
        "",
        "## 검증 요약",
        "",
        f"- rows: {summary['ranked_groups']}; material contracts: {summary['material_contracts']}",
        f"- guide-required/direct-policy contracts: {summary['guide_required_contracts']}/{summary['direct_policy_contracts']}",
        f"- declared guide gaps: {summary['declared_guide_gap_contracts']}; legacy paper code mapped/unmapped: {summary['legacy_paper_code_blocks_anchor_mapped']}/{summary['legacy_paper_code_blocks_unmapped']}",
        f"- complete mechanics metadata ledger: guide records {summary['guide_mechanics_records_in_complete_ledger']}; legacy paper blocks {summary['legacy_paper_code_blocks']}",
        f"- registry requirements hash match: `{str(report['registry_requirements_hash_check']['matches']).lower()}`",
        "",
        "## 명령어별 증거",
        "",
        "| rank | group / commands | complexity decision | material contracts | guide blocks | paper candidate code context | paper reference code context | paper excluded code context | code-unavailable exact/occurrence support | exact paper-support gaps |",
        "|---:|---|---|---|---|---|---|---|---|---|",
    ]
    for row in report["rows"]:
        complexity = row["complexity"]
        if complexity["decision"] == "direct_policy":
            decision = "0 direct-policy"
        elif complexity["decision"] == "simple":
            decision = "1 simple"
        elif complexity["decision"] == "gap":
            decision = f"{complexity['example_count']} gap"
        else:
            decision = f"{complexity['example_count']} multiple"
        if row.get("group_audit_finding"):
            decision += f"<br><small>{_cell(row['group_audit_finding']['status'])}: {_cell(row['group_audit_finding']['reason'])}</small>"
        contracts = "<br>".join(
            f"<code>{_cell(item['contract_id'])}</code> ({item['policy']})" for item in row["material_contracts"]
        )
        guide_items = list(row["guide_blocks"])
        guide_cell = _items_or_dash(guide_items)
        if row["supplemental_guide_context"]:
            guide_cell += "<br><small>supplemental-only</small><br>" + _items_or_dash(row["supplemental_guide_context"])
        exact_support_items = [
            item
            for exact_contract, items in row["paper_exact_support_code_unavailable"].items()
            for item in items
        ]
        exact_support_cell = _items_or_dash(exact_support_items, title_key="evidence_role")
        if row["paper_codefree_group_context"]:
            exact_support_cell += "<br><small>group occurrence context</small><br>" + _items_or_dash(
                row["paper_codefree_group_context"], title_key="evidence_role"
            )
        gap_lines = []
        if row["paper_exact_support_gap_contract_ids"]:
            gap_lines.append(
                "support gap: " + ", ".join(f"<code>{_cell(value)}</code>" for value in row["paper_exact_support_gap_contract_ids"])
            )
        else:
            gap_lines.append("support gap: none")
        if row["paper_code_template_exact_mapping_gap_contract_ids"]:
            gap_lines.append(
                "code-template exact gap: "
                + ", ".join(f"<code>{_cell(value)}</code>" for value in row["paper_code_template_exact_mapping_gap_contract_ids"])
            )
        lines.append(
            "| "
            + " | ".join([
                str(row["rank"]),
                f"<code>{_cell(row['group_id'])}</code><br>{', '.join(f'<code>{_cell(command)}</code>' for command in row['commands'])}",
                decision,
                contracts,
                guide_cell,
                _items_or_dash(row["paper_code_context"]["candidate"], title_key="rubric_classification"),
                _items_or_dash(row["paper_code_context"]["reference"], title_key="rubric_classification"),
                _items_or_dash(row["paper_code_context"]["excluded"], title_key="rubric_classification"),
                exact_support_cell,
                "<br>".join(gap_lines),
            ])
            + " |"
        )
    lines.extend(["", "## Complete guide mechanics metadata ledger", ""])
    lines.append(
        "All source-validated guide records are retained here without code bodies, including audit-suppressed and supplemental-only cards. "
        "`audit_action` distinguishes their audit disposition from command-row display eligibility."
    )
    for item in report["all_guide_mechanics_metadata"]:
        lines.append("- " + _details(item, title_suffix=f" [audit_action={item['audit_action']}]"))
    lines.extend(["", "## Guide audit actions", ""])
    lines.append(
        "This audit ledger records every override. `already_suppressed_upstream` rows have no current raw guide block, so they are not part of the 454-block source ledger."
    )
    for item in report["applied_guide_audit_overrides"]:
        replacement = item.get("replacement_label_id", "—")
        lines.append(
            f"- <code>{_cell(item['label_id'])}</code>: action=<code>{_cell(item['action'])}</code>; "
            f"status=<code>{_cell(item['application_status'])}</code>; replacement=<code>{_cell(replacement)}</code>"
        )
    lines.extend(["", "## Complete legacy paper code ledger", ""])
    lines.append(
        "All 109 source-validated code-bearing legacy paper blocks are retained here. Their candidate/reference/excluded class and anchor mapping remain context only."
    )
    for item in report["all_legacy_paper_code_blocks"]:
        lines.append("- " + _details(item, title_suffix=f" [{item['classification']}]"))
    lines.extend(["", "## Anchor-mapped되지 않은 legacy paper code blocks", ""])
    if report["unmapped_legacy_paper_blocks"]:
        for item in report["unmapped_legacy_paper_blocks"]:
            lines.append(f"- {_details(item)}")
    else:
        lines.append("- 없음")
    lines.extend(["", "## Mapping되지 않은 code-free research usage", ""])
    if report["unmapped_codefree_research_usage"]:
        for item in report["unmapped_codefree_research_usage"]:
            suffix = f" [{item.get('evidence_role')}]"
            lines.append(f"- {_details(item, title_suffix=suffix)}")
    else:
        lines.append("- 없음")
    lines.append("")
    return "\n".join(lines)


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    temporary = path.with_name(f"{path.name}.tmp")
    temporary.write_text(payload, encoding="utf-8", newline="\n")
    temporary.replace(path)


def write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.tmp")
    temporary.write_text(value, encoding="utf-8", newline="\n")
    temporary.replace(path)


def main() -> None:
    plugin = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plugin", type=Path, default=plugin)
    parser.add_argument("--requirements", type=Path)
    parser.add_argument("--registry", type=Path)
    parser.add_argument("--guides", type=Path)
    parser.add_argument("--usage", type=Path)
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--markdown-output", type=Path)
    args = parser.parse_args()
    plugin = args.plugin.resolve()
    requirements_path = args.requirements or plugin / "annotations" / "command_template_requirements.json"
    registry_path = args.registry or plugin / "annotations" / "package_command_registry.json"
    guides_path = args.guides or plugin / "data" / "guide_mechanics_cards.jsonl"
    usage_path = args.usage or plugin / "data" / "research_usage_examples.jsonl"
    audit_path = args.audit or plugin / "annotations" / "command_example_audit.json"
    json_output = args.json_output or plugin / "data" / "top100_command_evidence_matrix.json"
    markdown_output = args.markdown_output or plugin / "review" / "top100_command_evidence_matrix.md"
    report = build_report(
        plugin=plugin,
        requirements=load_json(requirements_path),
        registry=load_json(registry_path),
        guide_cards=load_jsonl(guides_path),
        usage_cards=load_jsonl(usage_path),
        command_example_audit=load_json(audit_path),
    )
    write_json(json_output, report)
    write_text(markdown_output, render_markdown(report))
    print(json.dumps(report["summary"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
