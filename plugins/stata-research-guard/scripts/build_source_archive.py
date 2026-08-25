#!/usr/bin/env python3
"""Build the self-contained source-byte archive used by schema-2 provenance checks."""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from pathlib import Path, PurePosixPath


SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
OWNED_ARCHIVE_RE = re.compile(r"^[0-9a-f]{64}\.source$")
PLUGIN_SOURCE_PREFIX = "plugins/stata-research-guard/"
SHARED_FIELDS = (
    "checkpoint",
    "decision",
    "adaptation_mode",
    "source_path",
    "source_spans",
    "source_kind",
)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8", errors="strict"))


def read_jsonl(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8", errors="strict").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"invalid JSONL at {path}:{line_number}: {error}") from error
        if not isinstance(row, dict):
            raise ValueError(f"JSONL row must be an object at {path}:{line_number}")
        rows.append(row)
    return rows


def labels_by_id(rows: object, source: Path) -> dict[str, dict[str, object]]:
    if not isinstance(rows, list):
        raise ValueError(f"label source must be a JSON array: {source}")
    output: dict[str, dict[str, object]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"label row {index} is not an object: {source}")
        label_id = row.get("label_id")
        if not isinstance(label_id, str) or not label_id:
            raise ValueError(f"label row {index} has no label_id: {source}")
        if label_id in output:
            raise ValueError(f"duplicate label_id {label_id}: {source}")
        output[label_id] = row
    return output


def cross_check_labels(
    annotations: dict[str, dict[str, object]],
    runtime: dict[str, dict[str, object]],
) -> None:
    if set(annotations) != set(runtime):
        missing_runtime = sorted(set(annotations) - set(runtime))
        missing_annotations = sorted(set(runtime) - set(annotations))
        raise ValueError(
            "annotation/runtime label_id sets differ: "
            f"missing_runtime={missing_runtime}, missing_annotations={missing_annotations}"
        )
    for label_id in sorted(runtime):
        left = annotations[label_id]
        right = runtime[label_id]
        for field in SHARED_FIELDS:
            if field not in left or field not in right:
                raise ValueError(f"shared field {field} missing for {label_id}")
            if left[field] != right[field]:
                raise ValueError(f"annotation/runtime {field} mismatch for {label_id}")


def is_inside(root: Path, candidate: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def resolve_source(plugin_root: Path, workspace_root: Path, source_path: str) -> Path:
    if "\\" in source_path:
        raise ValueError(f"source_path must use forward slashes: {source_path}")
    relative = PurePosixPath(source_path)
    if relative.is_absolute() or not relative.parts or any(part in ("", ".", "..") for part in relative.parts):
        raise ValueError(f"source_path escapes an approved provenance root: {source_path}")
    if relative.parts[0].endswith(":"):
        raise ValueError(f"source_path must not contain a drive prefix: {source_path}")
    if source_path.startswith("corpus/") or source_path.startswith(PLUGIN_SOURCE_PREFIX):
        approved_root = workspace_root.resolve(strict=True)
    else:
        raise ValueError(f"source_path has no approved provenance prefix: {source_path}")
    candidate = approved_root.joinpath(*relative.parts)
    if not candidate.exists():
        raise FileNotFoundError(f"source file is missing: {source_path}")
    resolved = candidate.resolve(strict=True)
    if not is_inside(approved_root, resolved):
        raise ValueError(f"source symlink escapes approved provenance root: {source_path}")
    if not resolved.is_file():
        raise ValueError(f"source path is not a file: {source_path}")
    return resolved


def atomic_write(path: Path, value: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp", delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(value)
        handle.flush()
        os.fsync(handle.fileno())
    try:
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build() -> dict[str, int]:
    plugin_root = Path(__file__).resolve().parents[1]
    workspace_root = plugin_root.parents[1]
    annotation_path = plugin_root / "annotations" / "labeled_checkpoints.json"
    runtime_path = plugin_root / "data" / "labeled_checkpoints.jsonl"
    archive_root = plugin_root / "data" / "source_archive"
    files_root = archive_root / "files"

    annotation_rows = labels_by_id(read_json(annotation_path), annotation_path)
    runtime_rows = labels_by_id(read_jsonl(runtime_path), runtime_path)
    cross_check_labels(annotation_rows, runtime_rows)

    sources: dict[str, dict[str, object]] = {}
    bytes_by_hash: dict[str, bytes] = {}
    for label_id in sorted(runtime_rows):
        row = runtime_rows[label_id]
        source_path = row.get("source_path")
        expected_hash = row.get("source_file_sha256")
        code_hash = row.get("code_sha256")
        if not isinstance(source_path, str) or not source_path:
            raise ValueError(f"runtime source_path missing for {label_id}")
        if not isinstance(expected_hash, str) or not SHA256_RE.fullmatch(expected_hash):
            raise ValueError(f"runtime source_file_sha256 invalid for {label_id}")
        if not isinstance(code_hash, str) or not SHA256_RE.fullmatch(code_hash):
            raise ValueError(f"runtime code_sha256 invalid for {label_id}")
        source = resolve_source(plugin_root, workspace_root, source_path)
        source_bytes = source.read_bytes()
        observed_hash = sha256_bytes(source_bytes)
        if observed_hash != expected_hash:
            raise ValueError(
                f"source hash mismatch for {label_id}: expected={expected_hash}, observed={observed_hash}, path={source_path}"
            )
        existing = sources.get(source_path)
        if existing and existing["sha256"] != expected_hash:
            raise ValueError(f"source_path collision with different hashes: {source_path}")
        existing_bytes = bytes_by_hash.get(expected_hash)
        if existing_bytes is not None and existing_bytes != source_bytes:
            raise ValueError(f"SHA-256 collision with different bytes: {expected_hash}")
        bytes_by_hash[expected_hash] = source_bytes
        sources[source_path] = {
            "sha256": expected_hash,
            "archive_path": f"data/source_archive/files/{expected_hash}.source",
            "bytes": len(source_bytes),
        }

    files_root.mkdir(parents=True, exist_ok=True)
    real_plugin_root = plugin_root.resolve(strict=True)
    real_files_root = files_root.resolve(strict=True)
    if not is_inside(real_plugin_root, real_files_root):
        raise ValueError("source archive files directory escapes plugin root")
    expected_names = {f"{digest}.source" for digest in bytes_by_hash}
    for digest, source_bytes in sorted(bytes_by_hash.items()):
        destination = files_root / f"{digest}.source"
        if destination.is_symlink():
            raise ValueError(f"source archive destination must not be a symlink: {destination.name}")
        if not destination.exists() or destination.read_bytes() != source_bytes:
            atomic_write(destination, source_bytes)

    index = {
        "schema_version": "1.0",
        "sources": {source_path: sources[source_path] for source_path in sorted(sources)},
    }
    index_bytes = (json.dumps(index, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    index_path = archive_root / "index.json"
    if index_path.is_symlink():
        raise ValueError("source archive index must not be a symlink")
    atomic_write(index_path, index_bytes)

    stale_removed = 0
    for entry in files_root.iterdir():
        if entry.is_file() and OWNED_ARCHIVE_RE.fullmatch(entry.name) and entry.name not in expected_names:
            entry.unlink()
            stale_removed += 1

    return {
        "labels": len(runtime_rows),
        "source_paths": len(sources),
        "archive_files": len(bytes_by_hash),
        "archive_bytes": sum(len(value) for value in bytes_by_hash.values()),
        "stale_removed": stale_removed,
    }


if __name__ == "__main__":
    print(json.dumps(build(), sort_keys=True))
