from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


def find_stata(explicit: str | None) -> Path:
    candidates = [
        explicit,
        os.environ.get("STATA_EXE"),
        r"C:\Program Files\Stata19\StataMP-64.exe",
        r"C:\Program Files\Stata18\StataMP-64.exe",
        r"C:\Program Files\Stata17\StataMP-64.exe",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate).resolve()
    raise FileNotFoundError("Stata executable not found. Set STATA_EXE or pass --stata.")


def wait_for_log(path: Path, marker: str, timeout: float = 20.0) -> str:
    deadline = time.monotonic() + timeout
    text = ""
    while time.monotonic() < deadline:
        if path.is_file():
            text = path.read_text(encoding="utf-8", errors="replace")
            if marker in text or re.search(r"(?m)^r\(\d+\);\s*$", text):
                return text
        time.sleep(0.1)
    return text


def sanitize_log(text: str) -> str:
    """Keep the reproducible command transcript and remove the licensed Stata banner."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.splitlines()
    start = next(
        (index for index, line in enumerate(lines) if re.match(r"^\.\s+do\s+example\.do\s*$", line, re.IGNORECASE)),
        None,
    )
    if start is None:
        start = next((index for index, line in enumerate(lines) if line.strip().lower() == "version 18.0"), 0)
    return "\n".join(lines[start:]).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stata")
    parser.add_argument("--examples", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "official_examples.json")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "official_example_verification.json")
    parser.add_argument("--logs-dir", type=Path)
    args = parser.parse_args()
    stata = find_stata(args.stata)
    examples = json.loads(args.examples.read_text(encoding="utf-8"))
    logs_dir = (args.logs_dir or args.output.parent / "official_example_logs").resolve()
    logs_dir.mkdir(parents=True, exist_ok=True)
    results = []

    with tempfile.TemporaryDirectory(prefix="stata-official-examples-") as temp_value:
        temp_root = Path(temp_value)
        for position, example in enumerate(examples, start=1):
            case_root = temp_root / f"case_{position:02d}"
            case_root.mkdir()
            marker = f"__OFFICIAL_EXAMPLE_PASS__{example['example_id']}"
            do_path = case_root / "example.do"
            do_text = f"version 18.0\nclear all\nset more off\n{example['code']}\ndisplay \"{marker}\"\n"
            do_path.write_text(do_text, encoding="utf-8", newline="\n")
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            completed = subprocess.run(
                [str(stata), "/e", "do", do_path.name],
                cwd=case_root,
                timeout=60,
                check=False,
                creationflags=creationflags,
            )
            log_path = case_root / "example.log"
            log_text = wait_for_log(log_path, marker)
            sanitized_log = sanitize_log(log_text)
            errors = re.findall(r"(?m)^r\((\d+)\);\s*$", sanitized_log)
            passed = completed.returncode == 0 and marker in sanitized_log and not errors
            version_match = re.search(r"Stata\s+(\d+(?:\.\d+)?)", log_text)
            durable_log = logs_dir / f"{example['example_id']}.log"
            durable_log.write_text(sanitized_log, encoding="utf-8", newline="\n")
            log_relative = durable_log.relative_to(args.output.parent.resolve()).as_posix()
            results.append(
                {
                    **example,
                    "code_sha256": hashlib.sha256(example["code"].encode("utf-8")).hexdigest(),
                    "passed": passed,
                    "return_code": completed.returncode,
                    "stata_version": version_match.group(1) if version_match else None,
                    "error_codes": errors,
                    "log_file": log_relative,
                    "log_sha256": hashlib.sha256(sanitized_log.encode("utf-8")).hexdigest() if sanitized_log else None,
                }
            )

    payload = {
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "stata_executable": str(stata),
        "examples": results,
        "summary": {
            "total": len(results),
            "passed": sum(row["passed"] for row in results),
            "failed": sum(not row["passed"] for row in results),
        },
    }
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(payload["summary"], ensure_ascii=False))
    if payload["summary"]["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
