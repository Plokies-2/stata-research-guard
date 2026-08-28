"""Convert a complete Stata SMCL help file to content-only Markdown.

The converter removes viewer navigation and presentation markup. It preserves
the visible syntax, option descriptions, warnings, examples, stored results,
references, and external links in source order.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


DROP_TAGS = {
    "marker",
    "p2colreset",
    "p2colset",
    "smcl",
    "synopthdr",
    "synoptline",
    "synoptset",
    "vieweralsosee",
    "viewerjumpto",
}
PARAGRAPH_TAGS = {"p", "phang", "phang2", "pmore", "pstd"}
VISIBLE_MACROS = {"depvar", "ifin", "indepvars", "newvar", "weight"}
INLINE_TAGS = {"bf", "cmd", "cmdab", "inp", "it", "opt", "opth"}


def matching_brace(text: str, start: int) -> int:
    depth = 0
    for index in range(start, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError(f"unclosed SMCL tag at character {start}")


def split_tag(token: str) -> tuple[str, str]:
    match = re.match(r"^([A-Za-z0-9_]+)(?::|\s+)?(.*)$", token, flags=re.DOTALL)
    if not match:
        raise ValueError(f"cannot parse SMCL tag: {{{token}}}")
    return match.group(1).lower(), match.group(2).lstrip()


def visible_help_label(payload: str) -> str:
    rendered = render_inline(payload).strip()
    if ":" in rendered:
        return rendered.rsplit(":", 1)[1].strip()
    return rendered.replace("##", " ").strip()


def visible_stata_syntax(payload: str) -> str:
    rendered = render_inline(payload).strip()
    rendered = re.sub(
        r"\bhelp\s+[A-Za-z0-9_]+##[A-Za-z0-9_]+:([A-Za-z0-9_#]+)",
        r"\1",
        rendered,
    )
    rendered = re.sub(r"([A-Za-z0-9_]+##[A-Za-z0-9_]+):([A-Za-z0-9_#]+)", r"\2", rendered)
    return re.sub(
        r"\b([A-Za-z0-9_]+):([A-Za-z0-9_]*)",
        lambda match: f"{match.group(1)}[{match.group(2)}]" if match.group(2) else match.group(1),
        rendered,
    )


def visible_browse_link(payload: str) -> str:
    match = re.match(r'^"([^"]+)"\s*(?::|\s+)\s*(.*)$', payload, flags=re.DOTALL)
    if not match:
        match = re.match(r'^"([^"]+)"$', payload)
        if not match:
            raise ValueError(f"cannot parse SMCL browse tag: {payload}")
        url, label = match.group(1), match.group(1)
    else:
        url, label = match.group(1), render_inline(match.group(2)).strip().strip('"')
    return f"[{label or url}]({url})"


def render_token(token: str, unknown_tags: set[str]) -> str:
    stripped = token.strip()
    if stripped == "..." or stripped.startswith("*"):
        return ""

    tag, payload = split_tag(stripped)
    if tag in DROP_TAGS:
        return ""
    if tag in PARAGRAPH_TAGS:
        return "\n"
    if tag == "p_end":
        return "\n"
    if tag == "break":
        return "\n"
    if tag == "col":
        return " | "
    if tag == "hline":
        return "—"
    if tag in VISIBLE_MACROS:
        return "[if] [in]" if tag == "ifin" else tag
    if tag == "title":
        return f"\n## {render_inline(payload).strip()}\n"
    if tag in {"dlgtab", "syntab"}:
        visible = render_inline(payload.lstrip(': ')).strip()
        visible = re.sub(r"\s*\[\+\]\s*$", "", visible)
        return f"\n### {visible}\n"
    if tag in {"p2col", "p2coldent"}:
        clean_payload = re.sub(r"^\d+(?:\s+\d+)*\s*:\s*", "", payload.lstrip())
        visible = render_inline(clean_payload.lstrip(': ')).strip()
        if visible == "-":
            return "\n- "
        separator = " " if visible.endswith("—") else ": "
        return f"\n- {visible}{separator}"
    if tag == "synopt":
        visible = render_inline(payload.lstrip(': ')).strip()
        return f"\n- {visible}: " if visible else "\n"
    if tag in INLINE_TAGS:
        return visible_stata_syntax(payload) if tag in {"cmdab", "opt", "opth"} else render_inline(payload)
    if tag in {"help", "helpb"}:
        return visible_help_label(payload)
    if tag == "browse":
        return visible_browse_link(payload)

    unknown_tags.add(tag)
    return ""


def render_inline(text: str, unknown_tags: set[str] | None = None) -> str:
    unknown_tags = unknown_tags if unknown_tags is not None else set()
    output: list[str] = []
    index = 0
    while index < len(text):
        if text[index] != "{":
            output.append(text[index])
            index += 1
            continue
        end = matching_brace(text, index)
        output.append(render_token(text[index + 1 : end], unknown_tags))
        index = end + 1
    return "".join(output)


def normalize_markdown(text: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    output: list[str] = []
    for line in lines:
        if line == "—":
            continue
        if not line:
            if output and output[-1] != "":
                output.append("")
            continue
        output.append(line)
    return "\n".join(output).strip() + "\n"


def fence_stata_code(markdown: str) -> str:
    lines = markdown.splitlines()
    output: list[str] = []
    in_syntax = False
    index = 0
    while index < len(lines):
        line = lines[index]
        if line == "## Syntax":
            in_syntax = True
            output.append(line)
            index += 1
            continue
        if in_syntax and line.startswith("### "):
            in_syntax = False
        if in_syntax and line == "reghdfe":
            block = [line]
            index += 1
            while index < len(lines) and lines[index]:
                block.append(lines[index])
                index += 1
            output.extend(["```stata", *block, "```"])
            continue
        if line.startswith(". "):
            output.extend(["```stata", line, "```"])
            index += 1
            continue
        output.append(line)
        index += 1
    return "\n".join(output).strip() + "\n"


def convert(source: str, title: str) -> str:
    unknown_tags: set[str] = set()
    version_match = re.search(r"\{\*\s*\*!\s*version\s+([^}]+)\}", source)
    body = render_inline(source, unknown_tags)
    if unknown_tags:
        raise ValueError(f"unsupported SMCL tags: {', '.join(sorted(unknown_tags))}")

    heading = f"# {title} complete maintainer help\n"
    if version_match:
        heading += f"\nMaintainer help version: {version_match.group(1).strip()}\n"
    heading += "\nNotation: a[bsorb] means absorb, with a as the minimum accepted abbreviation.\n"
    return fence_stata_code(normalize_markdown(heading + "\n" + body))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--title", required=True)
    args = parser.parse_args()

    source = args.source.read_text(encoding="utf-8")
    rendered = convert(source, args.title)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
