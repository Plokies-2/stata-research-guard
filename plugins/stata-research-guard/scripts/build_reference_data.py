from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


STAGES = (
    "import",
    "integrity_audit",
    "cleaning_labels",
    "merge_reshape",
    "panel_construction",
    "descriptives_balance_sample_flow",
    "estimation",
    "robustness",
    "figures",
    "exports",
    "master_orchestration",
)

ROLE_TO_LEVEL = {
    "gold_candidate": "gold",
    "partial_gold": "conditional",
    "conditional_priority": "conditional",
    "method_reference": "reference",
    "partial_reference": "reference",
    "negative_example": "negative",
    "exclude_default": "excluded",
}

GENERATION_PATH_ALLOWLIST = {
    "115162": (
        re.compile(r"^corpus/packages/115162/(?:Master|do/.+)\.do$", re.IGNORECASE),
    ),
    "120068": (
        re.compile(r"^corpus/packages/120068/.+\.do$", re.IGNORECASE),
    ),
    "124641": (
        re.compile(r"^corpus/packages/124641/.+\.do$", re.IGNORECASE),
    ),
    "154781": (
        re.compile(r"^corpus/packages/154781/run_figures_tables\.do$", re.IGNORECASE),
    ),
    "160101": (
        re.compile(r"^corpus/packages/160101/.+\.do$", re.IGNORECASE),
    ),
    "185943": (
        re.compile(r"^corpus/packages/185943/replication code for paper Mar 2023/.+\.do$", re.IGNORECASE),
    ),
    "191751": (
        re.compile(r"^corpus/packages/191751/.+\.do$", re.IGNORECASE),
    ),
    "209030": (
        re.compile(r"^corpus/packages/209030/.+\.do$", re.IGNORECASE),
    ),
    "209484": (
        re.compile(r"^corpus/packages/209484/.+\.do$", re.IGNORECASE),
    ),
    "237291": (
        re.compile(r"^corpus/packages/237291/.+\.do$", re.IGNORECASE),
    ),
    "148522": (
        re.compile(r"^corpus/packages/148522/(?:[2-7]\.|A\.[2-8]\.|A\.4)[^/]+\.do$", re.IGNORECASE),
    ),
    "173341": (re.compile(r"^corpus/packages/173341/dofiles/.+\.do$", re.IGNORECASE),),
    "194561": (
        re.compile(r"^corpus/packages/194561/code/0_master\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/194561/code/10_data_preparation\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/194561/code/20_Figure_[14]\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/194561/code/30_Table_1\.do$", re.IGNORECASE),
    ),
    "202444": (
        re.compile(r"^corpus/packages/202444/code/0\. runall\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/202444/code/(?:cleaning|auxiliary)/.+\.do$", re.IGNORECASE),
    ),
    "z4602567": (
        re.compile(r"^corpus/packages/z4602567/Replication_files/[12]_[^/]+\.do$", re.IGNORECASE),
    ),
    "z5652808": (
        re.compile(r"^corpus/packages/z5652808/ReplicationPackage/EmpiricalAnalysis/(?:master|dofiles/[^/]+)\.do$", re.IGNORECASE),
    ),
    "z5652443": (
        re.compile(r"^corpus/packages/z5652443/qobsims_reverse_engineer\.do$", re.IGNORECASE),
    ),
    "z5338362": (
        re.compile(r"^corpus/packages/z5338362/ReproductionFiles/(?:MASTER|dofiles/[^/]+)\.do$", re.IGNORECASE),
    ),
    "z10611203": (
        re.compile(r"^corpus/packages/z10611203/MS28862/DoFiles/ACGGH_(?:main|appendix)\.do$", re.IGNORECASE),
    ),
    "z7901559": (
        re.compile(r"^corpus/packages/z7901559/Garin_Silverio_replication/.+\.do$", re.IGNORECASE),
    ),
    "z21562174": (
        re.compile(r"^corpus/packages/z21562174/Code/_master\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/z21562174/Code/confidential/.+\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/z21562174/Code/public/.+\.do$", re.IGNORECASE),
    ),
    "z18399359": (
        re.compile(r"^corpus/packages/z18399359/IRZ_replication_package_public/data_[^/]+/setup_[^/]+\.do$", re.IGNORECASE),
        re.compile(r"^corpus/packages/z18399359/IRZ_replication_package_public/section_[345]/.+\.do$", re.IGNORECASE),
    ),
    "z8376886": (
        re.compile(r"^corpus/packages/z8376886/replication package/.+\.do$", re.IGNORECASE),
    ),
    "z4665536": (
        re.compile(r"^corpus/packages/z4665536/Replication files/Stata code/.+\.do$", re.IGNORECASE),
    ),
    "z17712099": (
        re.compile(r"^corpus/packages/z17712099/(?:jregress/example|Meng_create_[12]|Table6)\.do$", re.IGNORECASE),
    ),
    "z4733035": (
        re.compile(r"^corpus/packages/z4733035/Replication Package_MS25930_2May2021/.+\.do$", re.IGNORECASE),
    ),
    "z6976241": (
        re.compile(r"^corpus/packages/z6976241/Replication/Table 1 Section 5/Code/CleanData\.do$", re.IGNORECASE),
    ),
    "z15288849": (
        re.compile(r"^corpus/packages/z15288849/.+\.do$", re.IGNORECASE),
    ),
    "z14968164": (
        re.compile(r"^corpus/packages/z14968164/GxE_metrics_replication_package/0_code/.+\.do$", re.IGNORECASE),
    ),
}

THIRD_PARTY_PATH_PATTERNS = (
    re.compile(r"/(?:vendor|ado|_packages)/", re.IGNORECASE),
    re.compile(r"/data/raw_data/.+(?:-master|/src/|/code/)", re.IGNORECASE),
)

HARD_FLAG_PATTERNS = {
    "runtime_install": re.compile(r"(?im)^\s*(?:ssc|net|github)\s+install\b"),
    "package_presence_probe": re.compile(r"(?im)^\s*(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)*(?:which|findfile|ado\s+dir|confirm\s+(?:command|ado))\b"),
    "merge_m_m": re.compile(r"(?im)^\s*merge\s+m:m\b"),
    "duplicates_drop_force": re.compile(r"(?im)^\s*duplicates\s+drop\b.*\bforce\b"),
    "disabled_if_zero": re.compile(r"(?im)^\s*if\s+0\s*\{"),
    "process_escape": re.compile(r"(?im)^\s*(?:shell|winexec|unix|python|rscript|java|!)\b"),
    "destructive_erase": re.compile(r"(?im)^\s*(?:erase|rm|del)\b"),
    "malformed_rdrobust_sample": re.compile(r"(?im)^\s*rdrobust\b[^\n]*\s&\s*\([^\n]*\)(?:\s*,|\s*$)"),
}

CAUTION_PATTERNS = {
    "machine_path": re.compile(r"(?i)(?:[A-Z]:[\\/]|/Users/|/home/|~[/\\]|\\\\[^\\]+\\|Dropbox)"),
    "manual_pause_or_sleep": re.compile(r"(?im)^\s*(?:pause|sleep)\b"),
    "manual_result_bridge": re.compile(r"(?im)^\s*postfile\b"),
    "program_define": re.compile(r"(?im)^\s*program\s+define\b"),
    "external_dependency_path": re.compile(r"(?im)^\s*(?:adopath\s+\+\+|net\s+from)\b"),
}

CURATED_FILE_EXCLUSIONS = {
    "corpus/packages/202444/code/main_analysis.do": "known_syntax_and_manual_execution_defects",
    "corpus/packages/202444/code/pathnames.do": "stale_machine_specific_path_configuration",
}

COMMAND_PATTERNS = {
    "acreg": re.compile(r"(?im)^\s*acreg\b"),
    "append": re.compile(r"(?im)^\s*append\b"),
    "areg": re.compile(r"(?im)^\s*areg\b"),
    "assert": re.compile(r"(?im)^\s*assert\b"),
    "codebook": re.compile(r"(?im)^\s*codebook\b"),
    "collapse": re.compile(r"(?im)^\s*collapse\b"),
    "coefplot": re.compile(r"(?im)^\s*coefplot\b"),
    "collect_export": re.compile(r"(?im)^\s*collect\s+export\b"),
    "collect_get": re.compile(r"(?im)^\s*collect\s+get\b"),
    "boottest": re.compile(r"(?im)^\s*boottest\b"),
    "csdid": re.compile(r"(?im)^\s*csdid\b"),
    "cgmreg": re.compile(r"(?im)^\s*cgmreg\b"),
    "did_imputation": re.compile(r"(?im)^\s*did_imputation\b"),
    "duplicates": re.compile(r"(?im)^\s*duplicates\b"),
    "egen": re.compile(r"(?im)^\s*egen\b"),
    "esttab": re.compile(r"(?im)^\s*esttab\b"),
    "estout": re.compile(r"(?im)^\s*estout\b"),
    "event_plot": re.compile(r"(?im)^\s*event_plot\b"),
    "eventstudyinteract": re.compile(r"(?im)^\s*eventstudyinteract\b"),
    "export_excel": re.compile(r"(?im)^\s*export\s+excel\b"),
    "graph": re.compile(r"(?im)^\s*(?:graph|twoway)\b"),
    "import": re.compile(r"(?im)^\s*import\b"),
    "isid": re.compile(r"(?im)^\s*isid\b"),
    "ivreg2": re.compile(r"(?im)^\s*(?:ivreg2|ivreghdfe)\b"),
    "ivregress": re.compile(r"(?im)^\s*ivregress\b"),
    "jwdid": re.compile(r"(?im)^\s*jwdid\b"),
    "jwdidstacked": re.compile(r"(?im)^\s*jwdidstacked\b"),
    "jregress": re.compile(r"(?im)^\s*jregress\b"),
    "label": re.compile(r"(?im)^\s*label\b"),
    "marginsplot": re.compile(r"(?im)^\s*marginsplot\b"),
    "merge": re.compile(r"(?im)^\s*merge\b"),
    "outreg2": re.compile(r"(?im)^\s*outreg2\b"),
    "putexcel": re.compile(r"(?im)^\s*putexcel\b"),
    "ppmlhdfe": re.compile(r"(?im)^\s*ppmlhdfe\b"),
    "rdrobust": re.compile(r"(?im)^\s*rdrobust\b"),
    "reghdfe": re.compile(r"(?im)^\s*reghdfe\b"),
    "regress": re.compile(r"(?im)^\s*(?:reg|regress)\b"),
    "reshape": re.compile(r"(?im)^\s*reshape\b"),
    "ritest": re.compile(r"(?im)^\s*ritest\b"),
    "summarize": re.compile(r"(?im)^\s*(?:sum|summarize)\b"),
    "tabstat": re.compile(r"(?im)^\s*tabstat\b"),
    "tabulate": re.compile(r"(?im)^\s*(?:tab|tabulate)\b"),
    "ttest": re.compile(r"(?im)^\s*ttest\b"),
    "xtreg": re.compile(r"(?im)^\s*xtreg\b"),
    "xtivreg": re.compile(r"(?im)^\s*xtivreg\b"),
    "xtset": re.compile(r"(?im)^\s*(?:xtset|tsset)\b"),
}


def active_text(text: str) -> str:
    output = []
    in_block = False
    for line in text.splitlines():
        stripped = line.lstrip()
        if in_block:
            if "*/" in line:
                in_block = False
                line = line.split("*/", 1)[1]
                stripped = line.lstrip()
            else:
                continue
        if stripped.startswith("/*"):
            if "*/" not in stripped[2:]:
                in_block = True
            continue
        if stripped.startswith("*") or stripped.startswith("//"):
            continue
        output.append(line)
    return "\n".join(output)


def structural_syntax(value: str) -> str:
    output = []
    in_double_quote = False
    index = 0
    while index < len(value):
        char = value[index]
        if char == '"':
            in_double_quote = not in_double_quote
            output.append(" ")
            index += 1
            continue
        if not in_double_quote and value[index:index + 2] == "//":
            break
        output.append(" " if in_double_quote else char)
        index += 1
    return "".join(output)


def active_source_lines(text: str) -> list[tuple[int, str]]:
    output = []
    in_block = False
    for line_number, source_line in enumerate(text.splitlines(), start=1):
        line = source_line
        pieces = []
        position = 0
        while position < len(line):
            if in_block:
                end = line.find("*/", position)
                if end < 0:
                    position = len(line)
                    break
                in_block = False
                position = end + 2
                continue
            start = line.find("/*", position)
            if start < 0:
                pieces.append(line[position:])
                break
            pieces.append(line[position:start])
            in_block = True
            position = start + 2
        active_line = "".join(pieces)
        stripped = active_line.lstrip()
        if not stripped or stripped.startswith("*") or stripped.startswith("//"):
            continue
        output.append((line_number, active_line))
    return output


def loop_depth_profile(text: str) -> tuple[dict[int, int], int]:
    block_stack: list[str] = []
    depths: dict[int, int] = {}
    maximum = 0
    for line_number, line in active_source_lines(text):
        structural = structural_syntax(line)
        leading = re.match(r"^\s*(?:}\s*)+", structural)
        close_count = leading.group(0).count("}") if leading else 0
        for _ in range(close_count):
            if block_stack:
                block_stack.pop()
        current_depth = sum(kind == "loop" for kind in block_stack)
        command = normalize_command_prefixes(structural).strip()
        opens_block = structural.strip().removesuffix(";").rstrip().endswith("{")
        if opens_block and re.match(r"^(?:foreach|forvalues|while)\b", command, re.IGNORECASE):
            block_stack.append("loop")
            current_depth += 1
        elif opens_block:
            block_stack.append("block")
        depths[line_number] = current_depth
        maximum = max(maximum, current_depth)
    return depths, maximum


def has_tex_output(text: str) -> bool:
    return bool(re.search(r"(?im)^\s*(?:texdoc|sutex)\b|\.tex(?:[\"'\s,)\]}]|$)|\bsty(?:le)?\s*\(\s*tex\s*\)", text))


def normalize_command_prefixes(text: str) -> str:
    text = re.sub(
        r"(?im)^(\s*)eststo(?:\s+[^:\s]+)?\s*:\s*",
        r"\1",
        text,
    )
    return re.sub(
        r"(?im)^(\s*)(?:(?:capture|cap|quietly|qui|noisily|noi)\s+)+",
        r"\1",
        text,
    )


def detect_commands(text: str) -> list[str]:
    active = normalize_command_prefixes(active_text(text))
    return sorted(name for name, pattern in COMMAND_PATTERNS.items() if pattern.search(active))


def detect_flags(text: str, max_loop_depth: int | None = None) -> tuple[list[str], list[str]]:
    active = normalize_command_prefixes(active_text(text))
    hard = sorted(name for name, pattern in HARD_FLAG_PATTERNS.items() if pattern.search(active))
    cautions = sorted(name for name, pattern in CAUTION_PATTERNS.items() if pattern.search(active))
    if max_loop_depth is None:
        _, max_loop_depth = loop_depth_profile(text)
    if max_loop_depth >= 3:
        hard.append("nested_loop_depth_three")
    elif max_loop_depth == 2:
        cautions.append("two_level_loop_requires_review")
    if re.search(r"(?im)^\s*program\s+define\b", active) and re.search(
        r"(?im)^\s*(?:reg|regress|areg|xtreg|reghdfe|ivreg2|ivreghdfe|rdrobust|merge|keep|drop)\b", active
    ):
        cautions.append("program_wrapped_research_logic")

    lines = [normalize_command_prefixes(line).strip() for line in active.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if not re.match(r"^merge\s+(?:1:1|1:m|m:1|m:m)\b", line, re.IGNORECASE):
            continue
        nearby = "\n".join(lines[index + 1:index + 13])
        validated = bool(re.search(
            r"(?im)^(?:assert\b[^\n]*(?:_merge|matched)|(?:tab|tabulate|count)\b[^\n]*_merge)",
            nearby,
        ))
        drops_marker = bool(re.search(r"(?im)^drop\s+_merge\b", nearby))
        if not validated:
            cautions.append("merge_without_state_check")
        if drops_marker and not validated:
            hard.append("merge_marker_dropped_early")
    structural_lines = [structural_syntax(line).strip() for line in active.splitlines() if structural_syntax(line).strip()]
    brace_balance = sum(int(line.removesuffix(";").rstrip().endswith("{")) - int(bool(re.match(r"^(?:}\s*)+", line))) for line in structural_lines)
    if structural_lines and (structural_lines[0].startswith("}") or brace_balance != 0):
        cautions.append("unbalanced_block_fragment")
    return sorted(set(hard)), sorted(set(cautions))


def detect_stages(path: str, text: str, role: str) -> list[str]:
    value = f"{path}\n{text}".lower()
    commands = set(detect_commands(text))
    stages = set()
    if "import" in commands or re.search(r"raw_data|rawdata|source_data|input", value):
        stages.add("import")
    if commands & {"isid", "duplicates", "assert", "codebook"} or re.search(r"missing|range|integrity|audit", value):
        stages.add("integrity_audit")
    if commands & {"egen", "label"} or re.search(r"clean|construct|recode|variable", value):
        stages.add("cleaning_labels")
    if commands & {"merge", "reshape", "append", "collapse"}:
        stages.add("merge_reshape")
    if "xtset" in commands or re.search(r"panel|cohort|event.?time", value):
        stages.add("panel_construction")
    if commands & {"collapse", "summarize", "tabstat", "tabulate", "ttest"} or re.search(
        r"descriptive|summary|balance|sample.?flow|attrition|table.?1", value
    ):
        stages.add("descriptives_balance_sample_flow")
    if commands & {"acreg", "areg", "cgmreg", "csdid", "did_imputation", "eventstudyinteract", "ivreg2", "ivregress", "jwdid", "jwdidstacked", "ppmlhdfe", "rdrobust", "reghdfe", "regress", "xtivreg", "xtreg"}:
        stages.add("estimation")
    if re.search(r"robust|placebo|heterog|permutation|bootstrap|boottest|ritest", value):
        stages.add("robustness")
    if commands & {"coefplot", "graph", "marginsplot"} or re.search(r"figure|plot", value):
        stages.add("figures")
    if commands & {"collect_export", "esttab", "export_excel", "outreg2", "putexcel"} or re.search(r"export|output|table", value):
        stages.add("exports")
    if role == "entrypoint" or re.search(r"master|runall|run_all|run-all", Path(path).stem.lower()):
        stages.add("master_orchestration")
    if not stages:
        stages.add("cleaning_labels" if role == "data_preparation" else "estimation" if role == "analysis_or_output" else "import")
    return [stage for stage in STAGES if stage in stages]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def read_jsonl(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle]


def parse_calls(text: str) -> list[dict]:
    calls = []
    pattern = re.compile(r'^\s*(do|run|include)\s+(?:"([^"]+)"|([^\s,]+))', re.IGNORECASE)
    for line_number, line in enumerate(text.splitlines(), start=1):
        match = pattern.search(line)
        if match:
            calls.append({"kind": match.group(1).lower(), "target": match.group(2) or match.group(3), "line": line_number})
    return calls


def main() -> None:
    parser = argparse.ArgumentParser()
    default_workspace = Path(__file__).resolve().parents[3]
    parser.add_argument("--workspace", type=Path, default=default_workspace)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "data")
    args = parser.parse_args()
    workspace = args.workspace.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    catalog = workspace / "catalog"

    metadata = {row["project_id"]: row for row in read_csv(catalog / "package_metadata.csv")}
    audits = {row["project_id"]: row for row in read_csv(catalog / "package_audit.csv")}
    code_files = {row["path"]: row for row in read_csv(catalog / "code_files.csv")}
    chunks = read_jsonl(catalog / "code_chunks.jsonl")

    file_wide_flags = {}
    file_metrics = {}
    for path, code_info in code_files.items():
        if code_info["extension"] != ".do":
            continue
        source = workspace / path
        text = source.read_bytes().decode(code_info["encoding"])
        active = active_text(text).lstrip()
        line_depths, max_loop_depth = loop_depth_profile(text)
        tex_output = has_tex_output(text)
        flags = []
        if active.lower().startswith("if 0 {"):
            flags.append("file_disabled_if_zero")
        if path in CURATED_FILE_EXCLUSIONS:
            flags.append(CURATED_FILE_EXCLUSIONS[path])
        if any(pattern.search(path) for pattern in THIRD_PARTY_PATH_PATTERNS):
            flags.append("third_party_or_raw_repository")
        file_wide_flags[path] = flags
        file_metrics[path] = {
            "line_depths": line_depths,
            "max_loop_depth": max_loop_depth,
            "tex_output": tex_output,
        }

    curated = []
    pruned_depth_three_chunks = 0
    pruned_tex_chunks = 0
    for row in chunks:
        project_id = row["project_id"]
        audit = audits[project_id]
        meta = metadata[project_id]
        code_info = code_files[row["path"]]
        evidence_level = ROLE_TO_LEVEL[audit["corpus_role"]]
        metrics = file_metrics.get(row["path"], {"line_depths": {}, "max_loop_depth": 0, "tex_output": False})
        local_depths, local_max_depth = loop_depth_profile(row["content"])
        inherited_max_depth = max(
            (metrics["line_depths"].get(line, 0) for line in range(int(row["line_start"]), int(row["line_end"]) + 1)),
            default=0,
        )
        max_loop_depth = max(local_max_depth, inherited_max_depth)
        tex_output = has_tex_output(row["content"])
        if max_loop_depth >= 3:
            pruned_depth_three_chunks += 1
            continue
        if tex_output:
            pruned_tex_chunks += 1
            continue
        hard_flags, cautions = detect_flags(row["content"], max_loop_depth=max_loop_depth)
        if re.search(r"(?im)^\s*(?:ssc|net|github)\s+install\b", row["content"]):
            hard_flags.append("dependency_install_text_in_reference")
        hard_flags = sorted(set(hard_flags + file_wide_flags.get(row["path"], [])))
        stages = detect_stages(row["path"], row["content"], code_info["role"])
        identifier = hashlib.sha256(
            f"{project_id}|{row['path']}|{row['line_start']}|{row['line_end']}".encode("utf-8")
        ).hexdigest()[:16]
        source_allowed = any(
            pattern.search(row["path"])
            for pattern in GENERATION_PATH_ALLOWLIST.get(project_id, ())
        )
        curated.append(
            {
                "chunk_id": f"stata-{identifier}",
                "package_id": project_id,
                "title": meta["title"],
                "article_doi": meta["article_doi"],
                "repository_doi": meta["repository_doi"],
                "method": meta["method"],
                "corpus_role": audit["corpus_role"],
                "evidence_level": evidence_level,
                "path": row["path"],
                "line_start": row["line_start"],
                "line_end": row["line_end"],
                "role": code_info["role"],
                "stages": stages,
                "commands": detect_commands(row["content"]),
                "hard_flags": hard_flags,
                "cautions": cautions,
                "max_loop_depth": max_loop_depth,
                "tex_output": False,
                "source_allowed_for_generation": source_allowed,
                "approved_for_generation": (
                    source_allowed
                    and not hard_flags
                    and not cautions
                ),
                "content": row["content"],
            }
        )

    with (output / "reference_index.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
        for row in curated:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    workflow_packages = []
    pruned_workflow_files = 0
    package_root = workspace / "corpus" / "packages"
    for project_id in sorted(metadata):
        files = []
        edges = []
        project_code = sorted(
            (row for row in code_files.values() if row["project_id"] == project_id and row["extension"] == ".do"),
            key=lambda row: row["project_path"],
        )
        for code in project_code:
            metrics = file_metrics.get(code["path"], {"max_loop_depth": 0, "tex_output": False})
            if metrics["max_loop_depth"] >= 3 or metrics["tex_output"]:
                pruned_workflow_files += 1
                continue
            path = workspace / code["path"]
            text = path.read_bytes().decode(code["encoding"])
            stages = detect_stages(code["project_path"], text, code["role"])
            calls = parse_calls(active_text(text))
            files.append(
                {
                    "path": code["project_path"],
                    "role": code["role"],
                    "stages": stages,
                    "calls": calls,
                    "lines": int(code["lines"]),
                    "max_loop_depth": metrics["max_loop_depth"],
                    "tex_output": False,
                }
            )
            for call in calls:
                edges.append({"from": code["project_path"], **call})
        directories = sorted(
            path.relative_to(package_root / project_id).as_posix()
            for path in (package_root / project_id).rglob("*")
            if path.is_dir() and not any(part.startswith(".") for part in path.relative_to(package_root / project_id).parts)
        )
        workflow_packages.append(
            {
                "package_id": project_id,
                "title": metadata[project_id]["title"],
                "method": metadata[project_id]["method"],
                "corpus_role": audits[project_id]["corpus_role"],
                "entrypoint": audits[project_id]["entrypoint"],
                "runnability": audits[project_id]["runnability"],
                "directories": directories,
                "files": files,
                "edges": edges,
            }
        )

    (output / "workflow_examples.json").write_text(
        json.dumps({"taxonomy_version": "1.0", "stages": STAGES, "packages": workflow_packages}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    package_records = []
    for project_id in sorted(metadata):
        package_records.append({**metadata[project_id], **audits[project_id], "evidence_level": ROLE_TO_LEVEL[audits[project_id]["corpus_role"]]})
    (output / "reference_packages.json").write_text(
        json.dumps(package_records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )

    summary = {
        "chunks": len(curated),
        "approved_chunks": sum(row["approved_for_generation"] for row in curated),
        "hard_flagged_chunks": sum(bool(row["hard_flags"]) for row in curated),
        "pruned_depth_three_chunks": pruned_depth_three_chunks,
        "pruned_tex_chunks": pruned_tex_chunks,
        "pruned_workflow_files": pruned_workflow_files,
        "max_indexed_loop_depth": max((row["max_loop_depth"] for row in curated), default=0),
        "packages": len(workflow_packages),
        "stage_counts": dict(Counter(stage for row in curated for stage in row["stages"])),
    }
    (output / "reference_build_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
