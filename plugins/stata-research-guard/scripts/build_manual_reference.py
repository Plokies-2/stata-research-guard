from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader


SOURCES = (
    ("01_StataCorp_regress_linear_regression.pdf", "official", ("regress",), "https://www.stata.com/manuals/rregress.pdf"),
    ("02_StataCorp_language_syntax_factor_variables.pdf", "official", ("syntax", "factor_variables"), "https://www.stata.com/manuals/u11.pdf"),
    ("03_StataCorp_foreach_loop.pdf", "official", ("foreach",), "https://www.stata.com/manuals/pforeach.pdf"),
    ("04_StataCorp_forvalues_loop.pdf", "official", ("forvalues",), "https://www.stata.com/manuals/pforvalues.pdf"),
    ("05_StataCorp_macro.pdf", "official", ("macro", "local", "global"), "https://www.stata.com/manuals/pmacro.pdf"),
    ("06_StataCorp_estimates_overview.pdf", "official", ("estimates",), "https://www.stata.com/manuals/restimates.pdf"),
    ("07_StataCorp_estimates_save_use.pdf", "official", ("estimates_save", "estimates_use"), "https://www.stata.com/manuals/restimatessave.pdf"),
    ("08_StataCorp_putexcel.pdf", "official", ("putexcel",), "https://www.stata.com/manuals/rptputexcel.pdf"),
    ("09_StataCorp_putdocx_intro.pdf", "official", ("putdocx",), "https://www.stata.com/manuals/rptputdocxintro.pdf"),
    ("11_Community_outreg2_Roy_Wada_conference_paper.pdf", "community", ("outreg2",), "https://www.stata.com/meeting/wcsug07/Rapid_Formation_article.pdf"),
    ("12_Community_outreg2_SSC_registry.pdf", "community", ("outreg2", "ssc"), "https://ideas.repec.org/c/boc/bocode/s456416.html"),
    ("13_Community_reghdfe_method_paper_Correia.pdf", "community", ("reghdfe", "fixed_effects"), "https://scorreia.com/research/hdfe.pdf"),
    ("14_Community_reghdfe_maintainer_help.pdf", "community", ("reghdfe",), "https://scorreia.com/help/reghdfe.html"),
)

SUPPLEMENTAL_SOURCES = (
    ("10_StataCorp_postfile.pdf", "official", ("postfile", "post", "postclose"), "https://www.stata.com/manuals/ppostfile.pdf"),
)


def normalize_text(value: str) -> str:
    value = value.replace("\x00", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Directory containing the declared official and community reference PDFs.",
    )
    parser.add_argument(
        "--supplemental-source",
        type=Path,
        default=Path(__file__).resolve().parents[3] / "work" / "template_harvest_v1",
    )
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    source = args.source.resolve()
    supplemental_source = args.supplemental_source.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    rows = []
    documents = []
    source_specs = [
        *((source, *row) for row in SOURCES),
        *((supplemental_source, *row) for row in SUPPLEMENTAL_SOURCES),
    ]
    for source_root, filename, authority, commands, url in source_specs:
        path = source_root / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        reader = PdfReader(path)
        extracted_pages = 0
        for page_number, page in enumerate(reader.pages, start=1):
            text = normalize_text(page.extract_text() or "")
            if not text:
                continue
            extracted_pages += 1
            rows.append(
                {
                    "manual_id": hashlib.sha256(f"{file_hash}|{page_number}".encode("utf-8")).hexdigest()[:16],
                    "authority": authority,
                    "commands": commands,
                    "source_file": filename,
                    "source_url": url,
                    "page": page_number,
                    "file_sha256": file_hash,
                    "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
                    "content": text,
                }
            )
        documents.append(
            {
                "source_file": filename,
                "authority": authority,
                "commands": commands,
                "source_url": url,
                "pages": len(reader.pages),
                "extracted_pages": extracted_pages,
                "file_sha256": file_hash,
            }
        )

    with (output / "manual_index.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    summary = {
        "source_root": str(source),
        "supplemental_source_root": str(supplemental_source),
        "documents": documents,
        "page_chunks": len(rows),
        "official_documents": sum(row["authority"] == "official" for row in documents),
        "community_documents": sum(row["authority"] == "community" for row in documents),
    }
    (output / "manual_build_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({key: value for key, value in summary.items() if key != "documents"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
