"""Build the optional Stata 18 expanded-documentation layer.

Official commands are extracted as whole command entries from the PDF manuals
installed with Stata 18.  User-written commands do not receive a second,
duplicated rendering when Phase 2 already supplies the same maintainer help.
The exceptional jregress author guide is retained as supplemental context and
is explicitly not treated as syntax authority.

The script consumes layout-preserving Poppler text with one form-feed per PDF
page.  Entry boundaries come from Stata's own repeated page header, never from
a character, token, or fixed-page window.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = PLUGIN_ROOT / "data"
OUTPUT_ROOT = DATA_ROOT / "expanded_command_guides"
OUTPUT_INDEX = DATA_ROOT / "expanded_command_guides.json"


ENTRY_TOPICS = {
    "collect_style": [
        "collect style autolevels",
        "collect style cell",
        "collect style clear",
        "collect style column",
        "collect style cons",
        "collect style header",
        "collect style html",
        "collect style notes",
        "collect style putdocx",
        "collect style putpdf",
        "collect style row",
        "collect style save",
        "collect style showbase",
        "collect style showempty",
        "collect style showomit",
        "collect style table",
        "collect style tex",
        "collect style title",
        "collect style use",
    ],
    "decode": ["encode"],
    "export_delimited": ["import delimited"],
    "export_excel": ["import excel"],
    "import_delimited": ["import delimited"],
    "import_excel": ["import excel"],
    "replace": ["generate"],
    "tabulate": ["tabulate oneway", "tabulate twoway"],
    "testparm": ["test"],
    "tostring": ["destring"],
    "twoway": ["graph twoway"],
}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manual_code(source_url: str) -> str:
    stem = Path(source_url).stem.lower()
    for code in ("tables", "rpt", "xt", "st", "ts"):
        if stem.startswith(code):
            return code
    if stem.startswith("g-") or stem.startswith("g2"):
        return "g"
    if stem.startswith("d"):
        return "d"
    if stem.startswith("r"):
        return "r"
    raise ValueError(f"Cannot map official source URL to a Stata 18 manual: {source_url}")


def normalized_header(line: str) -> str:
    value = re.sub(r"\s+", " ", line.strip()).casefold()
    value = value.replace("–", "-").replace("—", "-")
    return value


def page_header(page: str) -> str:
    for line in page.splitlines():
        if line.strip():
            return normalized_header(line)
    return ""


def topic_header_prefix(topic: str) -> str:
    return f"{normalized_header(topic)} -"


def extract_entry(pages: list[str], topic: str) -> tuple[str, int, int]:
    prefix = topic_header_prefix(topic)
    starts = [index for index, page in enumerate(pages) if page_header(page).startswith(prefix)]
    if not starts:
        raise ValueError(f"Stata 18 manual entry not found: {topic}")

    start = starts[0]
    end = start
    while end + 1 < len(pages) and page_header(pages[end + 1]).startswith(prefix):
        end += 1

    rendered_pages = []
    for index in range(start, end + 1):
        lines = pages[index].replace("\r\n", "\n").splitlines()
        if index > start:
            for line_index, line in enumerate(lines):
                if line.strip():
                    del lines[line_index]
                    break
        rendered_pages.append("\n".join(lines).strip())
    return "\n\n".join(rendered_pages).strip() + "\n", start + 1, end + 1


def plugin_relative(path: Path) -> str:
    return path.relative_to(DATA_ROOT).as_posix()


def build(manual_text_dir: Path, stata_docs_dir: Path) -> dict:
    registry = read_json(DATA_ROOT / "command_registry.json")["commands"]
    full_guides = read_json(DATA_ROOT / "full_command_guides.json")["guides"]
    help_guides = read_json(DATA_ROOT / "command_help_guides.json")["guides"]
    full_by_command = {row["command"]: row for row in full_guides}
    help_by_command = {row["command"]: row for row in help_guides}

    manual_pages: dict[str, list[str]] = {}
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    guides = []

    for command_row in registry:
        command = command_row["command"]
        full = full_by_command.get(command)
        help_entry = help_by_command[command]

        if full and str(full.get("authority", "")).startswith("StataCorp"):
            code = manual_code(full["source_url"])
            if code not in manual_pages:
                text_path = manual_text_dir / f"{code}.txt"
                manual_pages[code] = text_path.read_text(encoding="utf-8", errors="replace").split("\f")
            topics = ENTRY_TOPICS.get(command, [command.replace("_", " ")])
            parts = []
            components = []
            for topic in topics:
                content, first_page, last_page = extract_entry(manual_pages[code], topic)
                parts.append(content if len(topics) == 1 else f"===== Stata 18 entry: {topic} =====\n\n{content}")
                components.append(
                    {
                        "entry_title": topic,
                        "physical_pdf_pages": [first_page, last_page],
                    }
                )
            content = "\n".join(parts).rstrip() + "\n"
            output = OUTPUT_ROOT / f"{command}.txt"
            output.write_text(content, encoding="utf-8", newline="\n")
            pdf_path = stata_docs_dir / f"{code}.pdf"
            guides.append(
                {
                    "record_type": "expanded_command_guide",
                    "command": command,
                    "expanded_documentation_status": "available",
                    "authority": "StataCorp official",
                    "source_kind": "installed Stata PDF manual",
                    "source_version": "Stata 18 installation",
                    "source_relation_to_help": "same Stata 18 release; expanded manual entry",
                    "source_path": f"Stata18/docs/{code}.pdf",
                    "source_sha256": sha256(pdf_path),
                    "components": components,
                    "content_file": plugin_relative(output),
                    "content_sha256": sha256(output),
                    "content_format": "layout-preserving plain text",
                    "transformation": (
                        "Poppler -layout text, split on PDF page boundaries; selected whole contiguous "
                        "command entries by Stata's repeated entry header; removed only the repeated "
                        "running header from continuation pages."
                    ),
                    "limitations": [],
                }
            )
            continue

        if command == "jregress" and full:
            source = DATA_ROOT / full["content_file"]
            output = OUTPUT_ROOT / "jregress.txt"
            content = source.read_text(encoding="utf-8")
            output.write_text(content, encoding="utf-8", newline="\n")
            guides.append(
                {
                    "record_type": "expanded_command_guide",
                    "command": command,
                    "expanded_documentation_status": "supplemental",
                    "authority": full.get("authority"),
                    "source_kind": full.get("source_kind"),
                    "source_version": full.get("source_version"),
                    "source_relation_to_help": "author supplement; authoritative command help unavailable",
                    "source_path": full.get("source_file"),
                    "source_sha256": full.get("source_sha256"),
                    "components": [],
                    "content_file": plugin_relative(output),
                    "content_sha256": sha256(output),
                    "content_format": "markdown text extracted from author PDF",
                    "transformation": full.get("transformation"),
                    "limitations": [
                        "Use for conceptual and worked-example context only; it does not replace missing authoritative syntax help."
                    ],
                }
            )
            continue

        if help_entry.get("content_file"):
            guides.append(
                {
                    "record_type": "expanded_command_guide",
                    "command": command,
                    "expanded_documentation_status": "same_source_as_help",
                    "authority": help_entry.get("authority"),
                    "source_kind": help_entry.get("source_kind"),
                    "source_version": help_entry.get("source_version"),
                    "source_relation_to_help": "Phase 2 already contains the authoritative maintainer help",
                    "source_path": None,
                    "source_sha256": None,
                    "components": [],
                    "content_file": None,
                    "content_sha256": None,
                    "content_format": None,
                    "transformation": None,
                    "limitations": ["No duplicate text is injected in the expanded phase."],
                }
            )
            continue

        guides.append(
            {
                "record_type": "expanded_command_guide",
                "command": command,
                "expanded_documentation_status": "unavailable",
                "authority": full.get("authority") if full else None,
                "source_kind": None,
                "source_version": None,
                "source_relation_to_help": "no authoritative help or expanded documentation available",
                "source_path": None,
                "source_sha256": None,
                "components": [],
                "content_file": None,
                "content_sha256": None,
                "content_format": None,
                "transformation": None,
                "limitations": ["Do not infer command syntax from paper examples or implementation code."],
            }
        )

    index = {
        "schema_version": "1.0",
        "target_runtime": "Stata 18",
        "guides": guides,
    }
    OUTPUT_INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    return index


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manual-text-dir", type=Path, required=True)
    parser.add_argument("--stata-docs-dir", type=Path, default=Path(r"C:\Program Files\Stata18\docs"))
    args = parser.parse_args()
    result = build(args.manual_text_dir.resolve(), args.stata_docs_dir.resolve())
    counts: dict[str, int] = {}
    for guide in result["guides"]:
        status = guide["expanded_documentation_status"]
        counts[status] = counts.get(status, 0) + 1
    print(json.dumps({"commands": len(result["guides"]), "status_counts": counts}, indent=2))


if __name__ == "__main__":
    main()
