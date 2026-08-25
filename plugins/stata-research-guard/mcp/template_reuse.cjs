"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");
const {
  analyzeEventStudyAxisProfile,
  analyzeOutputFlowProfile,
  expectedOutreg2Calls,
  MIXED_AXIS_RENDERING_MODE,
} = require("./output_flow_contract.cjs");

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function decodeUtf8(bytes, label) {
  try {
    return UTF8_DECODER.decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8: ${error.message}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveExistingInside(root, relativePath, kind) {
  if (typeof relativePath !== "string" || !relativePath.trim()) throw new Error(`${kind} path is required`);
  const resolved = path.resolve(root, relativePath);
  if (!isInside(root, resolved)) throw new Error(`${kind} path escapes project root: ${relativePath}`);
  if (!fs.existsSync(resolved)) throw new Error(`${kind} does not exist: ${relativePath}`);
  const realRoot = fs.realpathSync(root);
  const realResolved = fs.realpathSync(resolved);
  if (!isInside(realRoot, realResolved)) throw new Error(`${kind} symlink escapes project root: ${relativePath}`);
  return realResolved;
}

function validateSpans(spans, lineCount, label) {
  if (!Array.isArray(spans) || spans.length === 0) throw new Error(`${label} spans must be a nonempty array`);
  let previousEnd = 0;
  for (const span of spans) {
    if (!Array.isArray(span) || span.length !== 2 || !span.every(Number.isInteger)) throw new Error(`${label} span must be [start,end] integers`);
    const [start, end] = span;
    if (start < 1 || end < start || end > lineCount || start <= previousEnd) throw new Error(`${label} span is invalid or overlaps: ${JSON.stringify(span)}`);
    previousEnd = end;
  }
}

function extractSpans(content, spans, label) {
  const lines = String(content).split(/\r?\n/);
  validateSpans(spans, lines.length, label);
  return spans.map(([start, end]) => lines.slice(start - 1, end).join("\n")).join("\n/*__SPAN_BOUNDARY__*/\n");
}

// Runtime source provenance must use the same canonical extraction as the
// Python dictionary builder: blank-line-separated spans, trailing whitespace
// removed from the combined block, and exactly one final newline. Target spans
// intentionally continue to use extractSpans so their declared bytes stay exact.
function extractSourceSpans(content, spans, label) {
  // Python str.splitlines() removes one terminal line boundary and recognizes
  // the full set of Unicode line separators, unlike a CRLF-only split.
  const text = String(content);
  const lines = text ? text.split(/\r\n|[\n\v\f\r\x1c-\x1e\x85\u2028\u2029]/) : [];
  if (lines.length && lines.at(-1) === "" && /(?:\r\n|[\n\v\f\r\x1c-\x1e\x85\u2028\u2029])$/.test(text)) lines.pop();
  validateSpans(spans, lines.length, label);
  const combined = spans
    .map(([start, end]) => lines.slice(start - 1, end).join("\n"))
    .join("\n\n")
    .trimEnd();
  return `${combined}\n`;
}

function activeLogicalLines(content) {
  let text = String(content).replace(/\/\*[\s\S]*?\*\//g, "\n");
  const physical = text.split(/\r?\n/);
  const logical = [];
  let buffer = "";
  for (const raw of physical) {
    const left = raw.trimStart();
    if (!buffer && (!left || left.startsWith("*") || left.startsWith("//"))) continue;
    const continuation = /\/\/\/\s*$/.test(raw);
    const piece = raw.replace(/\/\/\/\s*$/, "").trim();
    buffer = buffer ? `${buffer} ${piece}` : piece;
    if (!continuation) {
      const withoutComment = buffer.replace(/\s+\/\/(?!\/)\s.*$/, "").trim();
      if (withoutComment) logical.push(withoutComment);
      buffer = "";
    }
  }
  if (buffer.trim()) logical.push(buffer.trim());
  return logical;
}

function stripStataCommandPrefixes(line) {
  let value = String(line).trim();
  const prefixes = [];
  let colonPrefix = false;
  while (true) {
    const match = value.match(/^(capture|cap|quietly|qui|noisily|noi)(\s*:\s*|\s+)/i);
    if (!match) break;
    prefixes.push(match[1].toLowerCase());
    if (match[2].includes(":")) colonPrefix = true;
    value = value.slice(match[0].length).trimStart();
  }
  return { value, prefixes, colon_prefix: colonPrefix };
}

function normalizeStructuralPrefixes(content) {
  return String(content).split(/\r?\n/).map((line) => {
    const indent = line.match(/^\s*/)?.[0] || "";
    const parsed = stripStataCommandPrefixes(line.slice(indent.length));
    if (!parsed.colon_prefix) return line;
    return `${indent}${parsed.prefixes.join(" ")} ${parsed.value}`;
  }).join("\n");
}

function commandSignature(line) {
  const parsed = stripStataCommandPrefixes(String(line).toLowerCase());
  const value = parsed.value;
  const capture = parsed.prefixes.some((prefix) => prefix === "capture" || prefix === "cap");
  if (/^program\s+define\b/.test(value)) return `program define:${value.match(/^program\s+define\s+([^\s,]+)/)?.[1] || "unknown"}`;
  if (/^program\s+drop\b/.test(value)) return `${capture ? "capture " : ""}program drop`;
  if (/^estimates\s+(use|save|store|restore|clear)\b/.test(value)) return `estimates ${value.match(/^estimates\s+(\w+)/)[1]}`;
  if (/^export\s+excel\b/.test(value)) return `export excel${/\bsheet\s*\(/.test(value) ? ":sheet" : ""}${/\breplace\b/.test(value) ? ":replace" : ""}`;
  if (/^import\s+delimited\b/.test(value)) return "import delimited";
  if (/^merge\s+(1:1|1:m|m:1|m:m)\b/.test(value)) return `merge:${value.match(/^merge\s+(1:1|1:m|m:1|m:m)/)[1]}`;
  if (/^graph\s+export\b/.test(value)) {
    const explicitFormat = value.match(/\bas\s*\(\s*([a-z0-9_]+)\s*\)/i)?.[1];
    const pathFormat = value.match(/\.([a-z0-9_]+)(?=(?:["']|\s|,|$))/i)?.[1];
    return `graph export:${String(explicitFormat || pathFormat || "unspecified").toLowerCase()}`;
  }
  if (/^graph\s+save\b/.test(value)) return "graph save";
  if (/^outreg2\b/.test(value)) return `outreg2:${/\breplace\b/.test(value) ? "replace" : /\bappend\b/.test(value) ? "append" : "unspecified"}`;
  if (/^(foreach|forvalues|while)\b/.test(value)) return value.match(/^(foreach|forvalues|while)\b/)[1];
  if (/^else\b/.test(value)) return "else";
  if (/^if\b/.test(value)) return "if";
  const first = value.match(/^([a-z_][a-z0-9_]*)/);
  if (!first) return null;
  const aliases = { g: "generate", gen: "generate", reg: "regress", su: "summarize", sum: "summarize" };
  return `${capture ? "capture " : ""}${aliases[first[1]] || first[1]}`;
}

function commandSequence(content) {
  return activeLogicalLines(content).map(commandSignature).filter(Boolean);
}

function normalizedLogicalLines(content) {
  return activeLogicalLines(content).map((line) => line.toLowerCase().replace(/\s+/g, " ").trim());
}

function containsExactLogicalBlock(content, sourceCode) {
  const target = normalizedLogicalLines(content);
  const source = normalizedLogicalLines(sourceCode);
  if (!source.length || source.length > target.length) return false;
  for (let start = 0; start <= target.length - source.length; start += 1) {
    if (source.every((line, offset) => target[start + offset] === line)) return true;
  }
  return false;
}

const STRUCTURAL_COMMAND_ALIASES = new Map([
  ["gen", "generate"], ["g", "generate"], ["ren", "rename"],
  ["su", "summarize"], ["sum", "summarize"], ["reg", "regress"],
]);

const STRUCTURAL_RESERVED_WORDS = new Set([
  "if", "in", "using", "by", "bysort", "of", "to", "else", "end",
  "var", "variable", "define", "values", "value", "label", "program", "syntax", "args",
  "clear", "replace", "append", "modify", "force", "firstrow", "sheet", "sheetreplace", "sheetmodify",
  "keep", "drop", "assert", "preserve", "restore", "local", "global", "tempfile", "tempname",
  "foreach", "forvalues", "while", "continue", "break", "capture", "quietly", "noisily",
  "true", "false", "all", "none", "master", "matched", "match", "mean", "sample",
]);

function structuralTokens(line) {
  return String(line).match(/"(?:[^"\\]|\\.)*"|`[a-z_][a-z0-9_]*'|\$\{[a-z_][a-z0-9_]*\}|\$[a-z_][a-z0-9_]*|(?:\d+(?:\.\d*)?|\.\d+)|[a-z_][a-z0-9_]*|==|!=|~=|<=|>=|##|&&|\|\||[^\s]/gi) || [];
}

function canonicalStructuralBlock(lines) {
  const bindings = new Map();
  const counters = { identifier: 0, local: 0, global: 0, file: 0 };
  const bind = (kind, value) => {
    const key = `${kind}:${value}`;
    if (!bindings.has(key)) {
      counters[kind] += 1;
      bindings.set(key, `${kind.toUpperCase()}_${counters[kind]}`);
    }
    return bindings.get(key);
  };
  return lines.map((rawLine) => {
    const parsed = stripStataCommandPrefixes(rawLine);
    const tokens = structuralTokens(parsed.value);
    const commandIndex = tokens.findIndex((token) => /^[a-z_][a-z0-9_]*$/i.test(token));
    const command = commandIndex >= 0
      ? STRUCTURAL_COMMAND_ALIASES.get(tokens[commandIndex].toLowerCase()) || tokens[commandIndex].toLowerCase()
      : "";
    const canonical = parsed.prefixes.map((prefix) => `PREFIX:${prefix === "cap" ? "capture" : prefix === "qui" ? "quietly" : prefix === "noi" ? "noisily" : prefix}`);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const lower = token.toLowerCase();
      if (index === commandIndex) {
        canonical.push(`COMMAND:${command}`);
      } else if (/^`[a-z_][a-z0-9_]*'$/i.test(token)) {
        canonical.push(bind("local", token.slice(1, -1)));
      } else if (/^\$\{?[a-z_][a-z0-9_]*\}?$/i.test(token)) {
        canonical.push(bind("global", token.replace(/^\$\{?/, "").replace(/\}$/, "")));
      } else if (/^"/.test(token)) {
        const prior = tokens.slice(0, index).map((value) => value.toLowerCase());
        const fileBinding = prior.includes("using") || ["use", "save", "do", "run", "include"].includes(command);
        canonical.push(fileBinding ? bind("file", token) : `STRING:${token}`);
      } else if (/^[a-z_][a-z0-9_]*$/i.test(token)) {
        const next = tokens[index + 1];
        if (index === commandIndex + 1 && command === "local") canonical.push(bind("local", token));
        else if (index === commandIndex + 1 && command === "global") canonical.push(bind("global", token));
        else if (STRUCTURAL_RESERVED_WORDS.has(lower) || next === "(" || /^(?:_[nN]|_rc)$/.test(token)) canonical.push(`SYNTAX:${lower}`);
        else canonical.push(bind("identifier", token));
      } else {
        canonical.push(token);
      }
    }
    return canonical.join(" ");
  });
}

function findMinimalSubstitutionBlock(content, label) {
  if (label.adaptation_mode !== "minimal_substitution") return null;
  const sourceLines = activeLogicalLines(label.code);
  const targetLines = activeLogicalLines(content);
  const sourceCommands = commandSequence(label.code);
  const distinctAnchors = new Set(normalizedTerms(label.command_anchors));
  if (sourceLines.length === 0 || sourceCommands.length < 3 || distinctAnchors.size < 2 || sourceLines.length > targetLines.length) return null;
  const sourceFingerprint = canonicalStructuralBlock(sourceLines);
  for (let start = 0; start <= targetLines.length - sourceLines.length; start += 1) {
    const targetFingerprint = canonicalStructuralBlock(targetLines.slice(start, start + sourceLines.length));
    if (sourceFingerprint.every((line, offset) => targetFingerprint[offset] === line)) {
      return {
        start_logical_line: start + 1,
        end_logical_line: start + sourceLines.length,
        source_logical_line_count: sourceLines.length,
        source_command_count: sourceCommands.length,
        command_anchors: [...distinctAnchors].sort(),
        fingerprint_sha256: sha256(Buffer.from(sourceFingerprint.join("\n"), "utf8")),
      };
    }
  }
  return null;
}

function expandDeterministicMacros(line, macros) {
  return String(line)
    .replace(/`([a-z_][a-z0-9_]*)'/gi, (full, name) => macros.get(`local:${name.toLowerCase()}`) ?? full)
    .replace(/\$\{?([a-z_][a-z0-9_]*)\}?/gi, (full, name) => macros.get(`global:${name.toLowerCase()}`) ?? full);
}

function literalMacroValue(rawValue) {
  let value = String(rawValue || "").trim();
  if (!value || value.startsWith("=") || /[`$]/.test(value)) return null;
  const quoted = value.match(/^(["'])([\s\S]*)\1$/);
  if (quoted) value = quoted[2];
  else if (/["']|[+*]|\b(?!tex\s*\(\s*\)$)[a-z_][a-z0-9_]*\s*\(/i.test(value)) return null;
  if (!value || /[`$]/.test(value)) return null;
  return value;
}

function deterministicGlobalValue(rawValue, resolved, root) {
  let value = String(rawValue || "").trim();
  value = value.replace(/`c\(pwd\)'/gi, String(root));
  value = expandDeterministicMacros(value, resolved);
  return literalMacroValue(value);
}

function collectProjectGlobalEnvironment(projectContents, root) {
  const definitions = new Map();
  for (const [file, content] of projectContents.entries()) {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    for (const [index, rawLine] of activeLogicalLines(content).entries()) {
      const line = stripStataCommandPrefixes(rawLine).value;
      const assignment = line.match(/^global\s+([a-z_][a-z0-9_]*)\s+(.+)$/i);
      if (!assignment) continue;
      const name = assignment[1].toLowerCase();
      if (!definitions.has(name)) definitions.set(name, []);
      definitions.get(name).push({ file: relative, logical_line: index + 1, raw_value: assignment[2] });
    }
  }
  const resolved = new Map();
  const ambiguous = new Set();
  const evidence = [];
  for (let pass = 0; pass <= definitions.size; pass += 1) {
    let changed = false;
    for (const [name, definitionRows] of definitions.entries()) {
      if (resolved.has(`global:${name}`)) continue;
      const values = definitionRows.map((row) => deterministicGlobalValue(row.raw_value, resolved, root));
      const known = [...new Set(values.filter((value) => value !== null))];
      if (known.length === 1 && values.every((value) => value === known[0])) {
        resolved.set(`global:${name}`, known[0]);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const [name, rows] of definitions.entries()) {
    const literal = resolved.get(`global:${name}`) || null;
    const status = literal === null ? "ambiguous_or_dynamic" : "resolved_literal";
    if (status !== "resolved_literal") ambiguous.add(name);
    evidence.push({
      name,
      status,
      literal,
      definitions: rows.map((row) => ({
        file: row.file,
        logical_line: row.logical_line,
        literal: deterministicGlobalValue(row.raw_value, resolved, root),
        dynamic: deterministicGlobalValue(row.raw_value, resolved, root) === null,
      })),
    });
  }
  return { resolved, ambiguous, evidence };
}

function collectFileMacroEnvironment(content, projectGlobals) {
  const resolved = new Map(projectGlobals?.resolved || []);
  const evidence = [];
  for (const rawLine of activeLogicalLines(content)) {
    const line = stripStataCommandPrefixes(rawLine).value;
    const assignment = line.match(/^(global|local)\s+([a-z_][a-z0-9_]*)\s+(.+)$/i);
    if (!assignment) continue;
    const scope = assignment[1].toLowerCase();
    const name = assignment[2].toLowerCase();
    const literal = deterministicGlobalValue(assignment[3], resolved, "");
    if (literal === null) continue;
    resolved.set(`${scope}:${name}`, literal);
    evidence.push({ scope, name, literal });
  }
  return { resolved, evidence };
}

function optionLiteral(command, name, projectGlobals) {
  const match = String(command).match(new RegExp(`\\b${name}\\s*\\(\\s*("[^"]*"|'[^']*'|[^)]*?)\\s*\\)`, "i"));
  if (!match) return { value: null, unresolved: true };
  let value = match[1].trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  value = expandDeterministicMacros(value, new Map(projectGlobals?.resolved || []));
  if (/[`$]/.test(value)) return { value: null, unresolved: true };
  return { value: value.trim(), unresolved: false };
}

function canonicalOutreg2HelperMultiplicity(projectContents, projectGlobals, projectComponentIds = new Map(), projectGlobalsByComponent = new Map()) {
  const sheets = new Set();
  const placements = new Set();
  const sheetsByWorkbook = new Map();
  const calls = [];
  let maximumEstimateCount = 0;
  let unresolvedEstimates = false;
  let unresolvedPlacement = false;
  const allProducedEstimates = new Set();
  const allDurableEstimates = new Set();
  const producerEvidence = [];
  const componentStates = new Map();
  for (const [file, content] of projectContents.entries()) {
    const componentId = projectComponentIds.get(file) || "default";
    if (!componentStates.has(componentId)) {
      const baseGlobals = [...(projectGlobalsByComponent.get(componentId)?.resolved || projectGlobals?.resolved || [])]
        .filter(([key]) => String(key).startsWith("global:"));
      componentStates.set(componentId, {
        producedEstimates: new Set(),
        durableEstimates: new Set(),
        globalEnvironment: new Map(baseGlobals),
      });
    }
    const { producedEstimates, durableEstimates, globalEnvironment } = componentStates.get(componentId);
    const resolved = new Map(globalEnvironment);
    for (const [index, line] of activeLogicalLines(content).entries()) {
      const stripped = stripStataCommandPrefixes(line).value;
      const assignment = stripped.match(/^(global|local)\s+([a-z_][a-z0-9_]*)\s+(.+)$/i);
      if (assignment) {
        const scope = assignment[1].toLowerCase();
        const name = assignment[2].toLowerCase();
        const literal = deterministicGlobalValue(assignment[3], resolved, "");
        if (literal !== null) {
          resolved.set(`${scope}:${name}`, literal);
          if (scope === "global") globalEnvironment.set(`global:${name}`, literal);
        }
        continue;
      }
      const command = expandDeterministicMacros(stripped, resolved);
      if (/^estimates?\s+clear\b/i.test(command)) producedEstimates.clear();
      const dropped = command.match(/^estimates?\s+drop\s+([a-z_][a-z0-9_]*)\b/i);
      if (dropped) producedEstimates.delete(dropped[1].toLowerCase());
      const stored = command.match(/^estimates?\s+store\s+([a-z_][a-z0-9_]*)\b/i);
      if (stored) {
        const estimateName = stored[1].toLowerCase();
        producedEstimates.add(estimateName);
        allProducedEstimates.add(estimateName);
        producerEvidence.push({ file, component_id: componentId, logical_line: index + 1, estimate_name: estimateName, command: "estimates store" });
      }
      const saved = command.match(/^estimates?\s+save\s+(?:"([^"]+\.ster)"|'([^']+\.ster)'|([^\s,]+\.ster))/i);
      if (saved) {
        const sterPath = saved[1] || saved[2] || saved[3];
        const estimateName = path.basename(sterPath, path.extname(sterPath)).toLowerCase();
        durableEstimates.add(estimateName);
        allDurableEstimates.add(estimateName);
        producerEvidence.push({ file, component_id: componentId, logical_line: index + 1, estimate_name: estimateName, command: "estimates save", state: "durable_ster" });
      }
      if (!/^outreg2_xlsx\s*,/i.test(command)) continue;
      const environment = { resolved };
      const estimates = optionLiteral(command, "estimates", environment);
      const sheet = optionLiteral(command, "sheet", environment);
      const workbook = optionLiteral(command, "workbook", environment);
      unresolvedEstimates ||= estimates.unresolved;
      unresolvedPlacement ||= sheet.unresolved || workbook.unresolved;
      const estimateNames = estimates.value ? estimates.value.split(/\s+/).filter(Boolean) : [];
      const estimateCount = estimateNames.length;
      maximumEstimateCount = Math.max(maximumEstimateCount, estimateCount);
      if (sheet.value) sheets.add(sheet.value.toLowerCase());
      if (sheet.value && workbook.value) {
        const workbookKey = workbook.value.replace(/\\/g, "/").toLowerCase();
        const componentWorkbookKey = `${componentId}::${workbookKey}`;
        placements.add(`${componentWorkbookKey}::${sheet.value.toLowerCase()}`);
        if (!sheetsByWorkbook.has(componentWorkbookKey)) sheetsByWorkbook.set(componentWorkbookKey, new Set());
        sheetsByWorkbook.get(componentWorkbookKey).add(sheet.value.toLowerCase());
      }
      calls.push({
        file,
        component_id: componentId,
        logical_line: index + 1,
        estimates: estimates.value,
        estimate_names: estimateNames,
        estimate_count: estimateCount,
        unresolved_estimate_names: estimateNames.filter((name) => !producedEstimates.has(name.toLowerCase())),
        durable_only_estimate_names: estimateNames.filter((name) => !producedEstimates.has(name.toLowerCase()) && durableEstimates.has(name.toLowerCase())),
        sheet: sheet.value,
        workbook: workbook.value,
      });
    }
  }
  const maximumSheetCountPerWorkbook = Math.max(0, ...[...sheetsByWorkbook.values()].map((rows) => rows.size));
  const unresolvedProducerNames = [...new Set(calls.flatMap((row) => row.unresolved_estimate_names))].sort();
  const durableOnlyProducerNames = [...new Set(calls.flatMap((row) => row.durable_only_estimate_names))].sort();
  const missingProducerNames = [...new Set(calls.flatMap((row) => row.unresolved_estimate_names
    .filter((name) => !row.durable_only_estimate_names.includes(name))))].sort();
  return {
    calls,
    call_count: calls.length,
    maximum_estimate_count: maximumEstimateCount,
    distinct_sheet_count: sheets.size,
    distinct_placement_count: placements.size,
    maximum_sheet_count_per_workbook: maximumSheetCountPerWorkbook,
    unresolved: unresolvedEstimates || unresolvedPlacement,
    unresolved_estimates: unresolvedEstimates,
    unresolved_placement: unresolvedPlacement,
    produced_estimates: [...allProducedEstimates].sort(),
    durable_estimates: [...allDurableEstimates].sort(),
    producer_evidence: producerEvidence,
    unresolved_producer_names: unresolvedProducerNames,
    durable_only_producer_names: durableOnlyProducerNames,
    missing_producer_names: missingProducerNames,
    producer_consumer_status: unresolvedEstimates
      ? "context_pending"
      : missingProducerNames.length ? "missing_active_producer"
        : durableOnlyProducerNames.length ? "durable_state_requires_load_or_store" : "confirmed",
    necessary: !unresolvedPlacement && calls.length > 0 && maximumSheetCountPerWorkbook >= 2,
  };
}

function manifestOutputFlowDecision(profile) {
  return analyzeOutputFlowProfile(profile);
}

function numericToken(value) {
  const number = Number(String(value || "").trim());
  return Number.isFinite(number) ? number : null;
}

function sameNumber(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-9;
}

function axisOptionsInSpan(content, projectGlobals) {
  const macros = new Map(projectGlobals?.resolved || []);
  const logical = activeLogicalLines(content);
  for (const raw of logical) {
    const command = stripStataCommandPrefixes(raw).value;
    const assignment = command.match(/^local\s+([a-z_][a-z0-9_]*)(?:\s+(.+))?$/i);
    if (!assignment) continue;
    if (assignment[2] === undefined) {
      // Stata의 `local name'은 macro를 빈 값으로 지운다. 선택된 축 분기에서
      // 이를 만나면 자동축 기본값을 유지한다.
      macros.set(`local:${assignment[1].toLowerCase()}`, "");
      continue;
    }
    const expanded = expandDeterministicMacros(assignment[2], macros);
    const literal = literalMacroValue(expanded);
    if (literal !== null) macros.set(`local:${assignment[1].toLowerCase()}`, literal);
  }
  const graphCommands = logical.map((raw) => expandDeterministicMacros(stripStataCommandPrefixes(raw).value, macros))
    .filter((command) => /^(?:coefplot|event_plot|csdid_plot|twoway|marginsplot)\b/i.test(command));
  return graphCommands.map((command) => {
    const scale = command.match(/\byscale\s*\([\s\S]*?\brange\s*\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\)/i);
    const labels = command.match(/\bylabel\s*\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/i);
    return {
      command,
      fixed_scale: scale ? { min: numericToken(scale[1]), max: numericToken(scale[2]) } : null,
      fixed_ticks: labels ? { min: numericToken(labels[1]), step: numericToken(labels[2]), max: numericToken(labels[3]) } : null,
    };
  });
}

function escapedRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loopBlock(lines, start) {
  let depth = 0;
  for (let index = start; index < lines.length; index += 1) {
    depth += (lines[index].match(/\{/g) || []).length;
    depth -= (lines[index].match(/\}/g) || []).length;
    if (index > start && depth === 0) return { start, end: index, body: lines.slice(start + 1, index) };
  }
  return null;
}

function declaredLocalWords(lines, localName) {
  const pattern = new RegExp(`^local\\s+${escapedRegex(localName)}\\s+(.+)$`, "i");
  for (const line of lines) {
    const match = stripStataCommandPrefixes(line).value.match(pattern);
    if (!match) continue;
    const literal = literalMacroValue(match[1]);
    if (literal !== null) return literal.split(/\s+/).filter(Boolean);
  }
  return null;
}

function verifyMixedEventStudyAxisLoop(root, decision, projectGlobals) {
  const findings = [];
  const binding = decision.mixed_loop_binding;
  let spanContent;
  try {
    const target = resolveExistingInside(root, binding.target_path, "mixed_loop_binding target");
    spanContent = extractSpans(decodeUtf8(fs.readFileSync(target), "mixed_loop_binding target"), binding.target_spans, "mixed_loop_binding");
  } catch (error) {
    findings.push({ rule: "event_study_mixed_loop_binding_invalid", message: error.message });
    return { decision, findings };
  }

  const lines = activeLogicalLines(spanContent).map((line) => stripStataCommandPrefixes(line).value);
  if (/\b(?:plot_jobs?|graph_jobs?|plot_job|graph_job)\b/i.test(lines.join("\n"))
      || lines.some((line) => /^local\s+\w+\s*:\s*word\b/i.test(line))) {
    findings.push({ rule: "event_study_mixed_loop_dispatcher_forbidden", target_path: binding.target_path });
  }
  const loops = lines.map((line, index) => ({ line, index }))
    .filter(({ line }) => /^(?:foreach|forvalues|while)\b/i.test(line));
  const foreachLoops = loops.filter(({ line }) => /^foreach\b/i.test(line));
  if (loops.length !== 1 || foreachLoops.length !== 1) {
    findings.push({ rule: "event_study_mixed_loop_count", target_path: binding.target_path, expected_foreach_count: 1, observed_loop_count: loops.length, observed_foreach_count: foreachLoops.length });
    return { decision, findings };
  }
  const header = foreachLoops[0];
  const headerMatch = header.line.match(new RegExp(`^foreach\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+of\\s+local\\s+${escapedRegex(binding.outcome_loop_local)}\\s*\\{`, "i"));
  if (!headerMatch) {
    findings.push({ rule: "event_study_mixed_outcome_loop_binding_mismatch", target_path: binding.target_path, outcome_loop_local: binding.outcome_loop_local });
    return { decision, findings };
  }
  const outcomeIterator = headerMatch[1];
  const loop = loopBlock(lines, header.index);
  if (!loop) {
    findings.push({ rule: "event_study_mixed_loop_unclosed", target_path: binding.target_path });
    return { decision, findings };
  }

  const expectedOutcomes = decision.expected_plots.map((row) => row.outcome);
  const fixedGroup = decision.axis_groups.find((group) => group.axis_mode === "fixed_group");
  const loopOutcomes = declaredLocalWords(lines.slice(0, header.index), binding.outcome_loop_local);
  const fixedOutcomes = declaredLocalWords(lines.slice(0, header.index), binding.fixed_outcomes_local);
  if (!loopOutcomes || loopOutcomes.length !== expectedOutcomes.length
      || expectedOutcomes.some((outcome) => !loopOutcomes.includes(outcome))) {
    findings.push({ rule: "event_study_mixed_loop_outcome_membership_mismatch", target_path: binding.target_path, expected_outcomes: expectedOutcomes, observed_outcomes: loopOutcomes || [] });
  }
  if (!fixedOutcomes || fixedOutcomes.length !== fixedGroup.outcomes.length
      || fixedGroup.outcomes.some((outcome) => !fixedOutcomes.includes(outcome))) {
    findings.push({ rule: "event_study_mixed_fixed_membership_mismatch", target_path: binding.target_path, expected_outcomes: fixedGroup.outcomes, observed_outcomes: fixedOutcomes || [] });
  }

  const body = loop.body;
  const axisName = escapedRegex(binding.axis_options_local);
  const fixedName = escapedRegex(binding.fixed_outcomes_local);
  const iteratorName = escapedRegex(outcomeIterator);
  const blankResetIndexes = body.map((line, index) => ({ line, index }))
    .filter(({ line }) => new RegExp(`^local\\s+${axisName}(?:\\s+(?:""|''))?\\s*$`, "i").test(line))
    .map(({ index }) => index);
  const ifIndexes = body.map((line, index) => ({ line, index }))
    .filter(({ line }) => /^if\b/i.test(line))
    .map(({ index }) => index);
  const membershipPattern = new RegExp(
    "^if\\s+strpos\\(\\s*\"\\s+`" + fixedName + "'\\s+\"\\s*,\\s*\"\\s+`" + iteratorName + "'\\s+\"\\s*\\)\\s*\\{\\s*$",
    "i",
  );
  const membershipIndex = body.findIndex((line) => membershipPattern.test(line));
  if (blankResetIndexes.length !== 1 || (membershipIndex >= 0 && blankResetIndexes[0] > membershipIndex)) {
    findings.push({ rule: "event_study_mixed_automatic_axis_not_cleared", target_path: binding.target_path, axis_options_local: binding.axis_options_local });
  }
  if (ifIndexes.length !== 1 || body.some((line) => /^else\b/i.test(line))) {
    findings.push({ rule: "event_study_mixed_axis_branch_count", target_path: binding.target_path, expected_if_count: 1, observed_if_count: ifIndexes.length });
  }
  if (membershipIndex < 0) {
    findings.push({ rule: "event_study_mixed_fixed_membership_condition_missing", target_path: binding.target_path, fixed_outcomes_local: binding.fixed_outcomes_local });
  }
  const membershipBlock = membershipIndex >= 0 ? loopBlock(body, membershipIndex) : null;
  const fixedAssignments = membershipBlock
    ? membershipBlock.body.filter((line) => new RegExp(`^local\\s+${axisName}\\s+.+\\byscale\\s*\\(.+\\bylabel\\s*\\(`, "i").test(line))
    : [];
  const allAxisAssignments = body.filter((line) => new RegExp(`^local\\s+${axisName}(?:\\s|$)`, "i").test(line));
  if (!membershipBlock || fixedAssignments.length !== 1 || allAxisAssignments.length !== 2) {
    findings.push({ rule: "event_study_mixed_fixed_axis_options_missing", target_path: binding.target_path, axis_options_local: binding.axis_options_local });
  }

  const graphCommands = body.filter((line) => /^(?:coefplot|event_plot|csdid_plot|twoway|marginsplot)\b/i.test(line));
  if (graphCommands.length !== 1) {
    findings.push({ rule: "event_study_mixed_graph_count", target_path: binding.target_path, expected_graph_count: 1, observed_graph_count: graphCommands.length });
  } else {
    const graph = graphCommands[0];
    if (!new RegExp("`" + axisName + "'", "i").test(graph)) findings.push({ rule: "event_study_mixed_graph_axis_binding_missing", target_path: binding.target_path, axis_options_local: binding.axis_options_local });
    if (!new RegExp("\\btitle\\s*\\(\\s*\"?\\s*`" + iteratorName + "'\\s*\"?\\s*\\)", "i").test(graph)) findings.push({ rule: "event_study_mixed_raw_title_missing", target_path: binding.target_path, outcome_iterator: outcomeIterator });
    if (!/\blegend\s*\([\s\S]*?\bposition\s*\(\s*6\s*\)/i.test(graph)) findings.push({ rule: "event_study_mixed_bottom_legend_missing", target_path: binding.target_path });
  }
  const exports = body.filter((line) => /^graph\s+export\b/i.test(line) && /\.pdf(?:["']|\s|,|$)/i.test(line));
  if (exports.length !== 1) findings.push({ rule: "event_study_mixed_pdf_export_scope", target_path: binding.target_path, expected_pdf_export_count: 1, observed_pdf_export_count: exports.length });

  const fixedGraphs = axisOptionsInSpan(spanContent, projectGlobals);
  const mismatched = fixedGraphs.filter((row) => !row.fixed_scale
    || !row.fixed_ticks
    || !sameNumber(row.fixed_scale.min, fixedGroup.range.min)
    || !sameNumber(row.fixed_scale.max, fixedGroup.range.max)
    || !sameNumber(row.fixed_ticks.min, fixedGroup.range.min)
    || !sameNumber(row.fixed_ticks.max, fixedGroup.range.max)
    || !sameNumber(row.fixed_ticks.step, fixedGroup.range.step));
  if (fixedGraphs.length && mismatched.length) findings.push({ rule: "event_study_fixed_axis_mismatch", axis_group_id: fixedGroup.axis_group_id, target_path: binding.target_path, expected_range: fixedGroup.range, mismatched_graph_count: mismatched.length });
  return { decision, findings };
}

function verifyEventStudyAxisBindings(root, profile, projectGlobals) {
  const decision = analyzeEventStudyAxisProfile(profile, { requireBindings: true });
  const findings = [];
  if (decision.failures.length) return { decision, findings };
  if (decision.rendering_mode === MIXED_AXIS_RENDERING_MODE) return verifyMixedEventStudyAxisLoop(root, decision, projectGlobals);
  for (const group of decision.axis_groups) {
    let target;
    let spanContent;
    try {
      target = resolveExistingInside(root, group.target_path, `axis_group ${group.axis_group_id} target`);
      spanContent = extractSpans(decodeUtf8(fs.readFileSync(target), `axis_group ${group.axis_group_id} target`), group.target_spans, `axis_group ${group.axis_group_id}`);
    } catch (error) {
      findings.push({ rule: "event_study_axis_binding_invalid", axis_group_id: group.axis_group_id, message: error.message });
      continue;
    }
    const missingOutcomes = group.outcomes.filter((outcome) => !new RegExp(`(?<![A-Za-z0-9_])${String(outcome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_])`, "i").test(spanContent));
    if (missingOutcomes.length) findings.push({
      rule: "event_study_axis_outcome_binding_missing",
      axis_group_id: group.axis_group_id,
      target_path: group.target_path,
      missing_outcomes: missingOutcomes,
    });
    const graphs = axisOptionsInSpan(spanContent, projectGlobals);
    if (!graphs.length) {
      findings.push({ rule: "event_study_axis_graph_missing", axis_group_id: group.axis_group_id, target_path: group.target_path });
      continue;
    }
    if (group.axis_mode === "automatic") {
      const fixed = graphs.filter((row) => row.fixed_scale || row.fixed_ticks);
      if (fixed.length) findings.push({
        rule: "event_study_automatic_axis_forced",
        axis_group_id: group.axis_group_id,
        target_path: group.target_path,
        fixed_graph_count: fixed.length,
      });
      continue;
    }
    const mismatched = graphs.filter((row) => !row.fixed_scale
      || !row.fixed_ticks
      || !sameNumber(row.fixed_scale.min, group.range.min)
      || !sameNumber(row.fixed_scale.max, group.range.max)
      || !sameNumber(row.fixed_ticks.min, group.range.min)
      || !sameNumber(row.fixed_ticks.max, group.range.max)
      || !sameNumber(row.fixed_ticks.step, group.range.step));
    if (mismatched.length) findings.push({
      rule: "event_study_fixed_axis_mismatch",
      axis_group_id: group.axis_group_id,
      target_path: group.target_path,
      expected_range: group.range,
      mismatched_graph_count: mismatched.length,
    });
  }
  return { decision, findings };
}

function unusedProgramSyntaxOptions(content) {
  const lines = activeLogicalLines(content);
  const syntaxIndex = lines.findIndex((line) => /^syntax\s*,/i.test(stripStataCommandPrefixes(line).value));
  if (syntaxIndex < 0) return [];
  const syntax = stripStataCommandPrefixes(lines[syntaxIndex]).value.replace(/^syntax\s*,/i, "");
  const names = syntax.replace(/\([^)]*\)/g, "").replace(/[\[\]]/g, " ").split(/\s+/)
    .map((value) => value.replace(/[^A-Za-z0-9_].*$/, "").toLowerCase())
    .filter(Boolean);
  const body = lines.filter((_line, index) => index !== syntaxIndex).join("\n");
  return [...new Set(names)].filter((name) => !new RegExp("(?:`" + name + "'|\\bof\\s+local\\s+" + name + "\\b)", "i").test(body));
}

function outputSensitiveGlobalReferences(line) {
  const value = String(line);
  const command = stripStataCommandPrefixes(value).value;
  if (!/^(?:outreg2|esttab|estout|collect\s+export|putdocx|putpdf|graph\s+export)\b/i.test(command)) return [];
  const references = [...command.matchAll(/\$\{?([a-z_][a-z0-9_]*)\}?/gi)];
  const comma = command.indexOf(",");
  return [...new Set(references.filter((match) => {
    const start = match.index || 0;
    const before = command.slice(0, start);
    const after = command.slice(start + match[0].length);
    const extensionBinding = /\.\s*$/.test(before);
    const parenthesisDepth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
    const optionBinding = comma >= 0 && start > comma && parenthesisDepth === 0 && /(?:^|[\s,])$/.test(before) && /^(?:[\s,]|$)/.test(after);
    const wholeOutputBinding = /\busing\s+["']?$/i.test(before) && /^["']?(?:\s*,|\s*$)/.test(after);
    const formatFunctionBinding = /\b(?:style|format|fmt)\s*\([^)]*$/i.test(before);
    return extensionBinding || optionBinding || wholeOutputBinding || formatFunctionBinding;
  }).map((match) => match[1].toLowerCase()))];
}

function analyzeTexOutputContent(content, projectGlobals = null) {
  const macros = new Map(projectGlobals?.resolved || []);
  const ambiguousGlobals = new Set(projectGlobals?.ambiguous || []);
  const outputMacroIssues = [];
  for (const rawLine of activeLogicalLines(content)) {
    const line = stripStataCommandPrefixes(rawLine).value;
    const assignment = line.match(/^(local|global)\s+([a-z_][a-z0-9_]*)\s+(.+)$/i);
    if (assignment) {
      let value = expandDeterministicMacros(assignment[3].trim(), macros);
      const literal = literalMacroValue(value);
      const kind = assignment[1].toLowerCase();
      const name = assignment[2].toLowerCase();
      const key = `${kind}:${name}`;
      if (literal !== null) {
        macros.set(key, literal);
        if (kind === "global") ambiguousGlobals.delete(name);
      } else {
        macros.delete(key);
        if (kind === "global") ambiguousGlobals.add(name);
      }
      continue;
    }
    const expanded = expandDeterministicMacros(line, macros);
    const outputCommand = /^(?:outreg2|esttab|estout|collect\s+export|putdocx|putpdf|graph\s+export)\b/i.test(expanded);
    if (/^(?:texdoc|sutex)\b/i.test(expanded)
      || /\.tex(?:["'\s,)]|$)/i.test(expanded)
      || /\bsty(?:le)?\s*\(\s*tex\s*\)/i.test(expanded)
      || outputCommand && /(?:^|[,\s])tex(?:\s*\(.*\))?(?:[,\s]|$)/i.test(expanded)) {
      return { tex_output: true, output_macro_issues: outputMacroIssues };
    }
    for (const name of outputSensitiveGlobalReferences(line)) {
      if (!macros.has(`global:${name}`)) {
        outputMacroIssues.push({ name, status: ambiguousGlobals.has(name) ? "ambiguous_or_dynamic" : "unresolved" });
      }
    }
  }
  return { tex_output: false, output_macro_issues: [...new Map(outputMacroIssues.map((row) => [row.name, row])).values()] };
}

function hasTexOutputContent(content, projectGlobals = null) {
  return analyzeTexOutputContent(content, projectGlobals).tex_output;
}

function observedCommandAnchors(content) {
  const anchors = new Set(commandSequence(content));
  for (let line of activeLogicalLines(content)) {
    line = stripStataCommandPrefixes(line.toLowerCase()).value;
    const words = line.match(/^[a-z_][a-z0-9_]*(?:\s+[a-z_][a-z0-9_]*)?/i)?.[0];
    if (!words) continue;
    anchors.add(words.split(/\s+/)[0]);
    anchors.add(words);
  }
  if (anchors.has("sum") || anchors.has("su")) {
    anchors.add("summarize");
    anchors.add("su");
  }
  return [...anchors].sort();
}

function commandObserved(declared, observed) {
  const value = String(declared || "").trim().toLowerCase();
  return observed.some((item) => item === value || item.startsWith(`${value}:`) || item.startsWith(`${value} `));
}

const MEANING_STOPWORDS = new Set([
  "stata", "code", "block", "using", "with", "from", "into", "and", "the", "for", "this", "that",
  "project", "specific", "formula", "definition", "mapping", "declared", "visible", "named", "exact",
  "코드", "블록", "프로젝트", "정의", "공식", "단계", "추가", "사용",
]);

function normalizedTargetText(content, observedCommands) {
  return `${String(content).toLowerCase().replace(/[_\-]+/g, " ")} ${observedCommands.join(" ")}`;
}

function termObserved(term, targetText) {
  if (targetText.includes(term)) return true;
  if (/^trends?$/.test(term)) return /\btrend\b|linear[ _]time|##c\./.test(targetText);
  if (/^means?$/.test(term)) return /\bsu(?:m|mmarize)?\b|r\(mean\)|e\(ymean\)/.test(targetText);
  if (/^samples?$/.test(term)) return /e\(sample\)|sample/.test(targetText);
  if (/^labels?$/.test(term)) return /\blabel\b|coeflabels\s*\(/.test(targetText);
  if (/^years?$/.test(term)) return /\byear\b|calendar|event[ _]time/.test(targetText);
  if (term.length > 4 && targetText.includes(term.replace(/(?:ing|ed|es|s)$/, ""))) return true;
  return false;
}

function meaningEvidence(values, content, observedCommands) {
  const terms = [...new Set((Array.isArray(values) ? values : [values])
    .flatMap((value) => queryTerms(value))
    .filter((term) => !MEANING_STOPWORDS.has(term)))];
  const targetText = normalizedTargetText(content, observedCommands);
  const matched = terms.filter((term) => termObserved(term, targetText));
  const minimum = terms.length ? Math.min(2, terms.length) : 0;
  return { terms, matched_terms: matched, minimum_matches: minimum, passed: matched.length >= minimum };
}

function targetDeclaration(row) {
  return {
    path: row?.target_path || row?.target?.path,
    spans: row?.target_spans || row?.target?.spans,
    sha256: row?.target_span_sha256 || row?.target?.span_sha256,
  };
}

function resolveLiveSource(context, sourcePath) {
  const pluginRoot = path.dirname(path.dirname(path.resolve(context.dictionaryPath)));
  const workspaceRoot = path.dirname(path.dirname(pluginRoot));
  const normalized = String(sourcePath || "").replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (!normalized || normalized.startsWith("/") || /^[a-z]:\//i.test(normalized) || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`source path escapes approved provenance roots: ${sourcePath}`);
  }
  const workspaceRelativePluginPrefix = `${path.relative(workspaceRoot, pluginRoot).replaceAll("\\", "/")}/`;
  const root = normalized.startsWith("corpus/")
      || normalized.startsWith(workspaceRelativePluginPrefix)
      || normalized.startsWith("plugins/stata-research-guard/")
    ? workspaceRoot
    : pluginRoot;
  const candidate = path.resolve(root, ...parts);
  if (!isInside(root, candidate)) throw new Error(`source path escapes approved provenance root: ${sourcePath}`);
  const realRoot = fs.realpathSync(root);
  if (fs.existsSync(candidate)) {
    const realCandidate = fs.realpathSync(candidate);
    if (!isInside(realRoot, realCandidate)) throw new Error(`source symlink escapes approved provenance root: ${sourcePath}`);
    if (!fs.statSync(realCandidate).isFile()) throw new Error(`source path is not a file: ${sourcePath}`);
    return { path: realCandidate, resolution: "approved_original" };
  }

  const archiveIndex = path.join(pluginRoot, "data", "source_archive", "index.json");
  if (!fs.existsSync(archiveIndex)) throw new Error(`source is missing and no plugin source archive is available: ${sourcePath}`);
  const realPluginRoot = fs.realpathSync(pluginRoot);
  const realIndex = fs.realpathSync(archiveIndex);
  if (!isInside(realPluginRoot, realIndex)) throw new Error(`source archive index symlink escapes plugin root: ${sourcePath}`);
  let index;
  try {
    index = JSON.parse(decodeUtf8(fs.readFileSync(realIndex), "source archive index"));
  } catch (error) {
    throw new Error(`source archive index is invalid: ${error.message}`);
  }
  if (!index || index.schema_version !== "1.0" || !index.sources || typeof index.sources !== "object" || Array.isArray(index.sources)) {
    throw new Error("source archive index schema is invalid");
  }
  const entry = Object.prototype.hasOwnProperty.call(index.sources, normalized) ? index.sources[normalized] : null;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`source archive has no entry for: ${sourcePath}`);
  if (typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error(`source archive hash is invalid for: ${sourcePath}`);
  const expectedArchivePath = `data/source_archive/files/${entry.sha256}.source`;
  if (entry.archive_path !== expectedArchivePath) throw new Error(`source archive path is invalid for: ${sourcePath}`);
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new Error(`source archive byte count is invalid for: ${sourcePath}`);
  const archiveCandidate = path.resolve(pluginRoot, ...entry.archive_path.split("/"));
  if (!isInside(pluginRoot, archiveCandidate) || !fs.existsSync(archiveCandidate)) throw new Error(`source archive file is missing or escapes plugin root: ${sourcePath}`);
  const realArchive = fs.realpathSync(archiveCandidate);
  if (!isInside(realPluginRoot, realArchive)) throw new Error(`source archive symlink escapes plugin root: ${sourcePath}`);
  const archiveBytes = fs.readFileSync(realArchive);
  if (archiveBytes.length !== entry.bytes) throw new Error(`source archive byte count mismatch for: ${sourcePath}`);
  const archiveHash = sha256(archiveBytes);
  if (archiveHash !== entry.sha256) throw new Error(`source archive hash mismatch for: ${sourcePath}`);
  return { path: realArchive, resolution: "plugin_source_archive", archive_index_path: realIndex };
}

function lcsLength(left, right) {
  const previous = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = 0;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = previous[j];
      previous[j] = left[i - 1] === right[j - 1] ? diagonal + 1 : Math.max(previous[j], previous[j - 1]);
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function listDoFiles(root) {
  const output = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.isFile() && /\.do$/i.test(entry.name)) output.push(full);
    }
  }
  return output.sort();
}

function extractProgramDefinitions(content, relativeFile) {
  const lines = String(content).split(/\r?\n/);
  const definitions = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = stripStataCommandPrefixes(lines[index]).value.match(/^program\s+define\s+([^\s,]+)/i);
    if (!match) continue;
    let end = index;
    while (end + 1 < lines.length && !/^\s*end\s*(?:\/\/.*)?$/i.test(lines[end + 1])) end += 1;
    if (end + 1 < lines.length) end += 1;
    definitions.push({
      name: match[1],
      file: relativeFile,
      line: index + 1,
      end_line: end + 1,
      body: lines.slice(index, end + 1).join("\n"),
    });
    index = end;
  }
  return definitions;
}

function forbiddenProgramBodyCommands(content, projectGlobals = null) {
  const findings = [];
  const outputAnalysis = analyzeTexOutputContent(content, projectGlobals);
  if (outputAnalysis.tex_output) findings.push({ rule: "tex_output", logical_line: null, command: "macro-expanded output format" });
  for (const issue of outputAnalysis.output_macro_issues) {
    findings.push({ rule: "output_format_macro_ambiguous", logical_line: null, command: `$${issue.name}`, status: issue.status });
  }
  for (const [index, line] of activeLogicalLines(content).entries()) {
    const value = stripStataCommandPrefixes(line.toLowerCase()).value;
    let rule = null;
    if (/^(?:reg(?:ress)?|reghdfe|xtreg|xtivreg2|ivreg2|ivreghdfe|ppmlhdfe|jwdid|csdid|did_imputation|eventstudyinteract)\b/.test(value)) rule = "estimation";
    else if (/^(?:merge|append|joinby|reshape|collapse)\b/.test(value)) rule = "research_data_transformation";
    else if (/^label\s+(?:define|values|var(?:iable)?)\b/.test(value)) rule = "label_choice";
    else if (/^(?:mat(?:rix)?|ereturn|svmat|mkmat|postfile|post)\b|\b_b\s*\[|\be\(b\)/.test(value)) rule = "coefficient_reconstruction";
    else if (/^(?:foreach|forvalues|while)\b/.test(value)) rule = "loop";
    if (rule) findings.push({ rule, logical_line: index + 1, command: line });
  }
  return findings;
}

function canonicalOutreg2StatisticsFindings(content) {
  const commands = activeLogicalLines(content).map((line) => stripStataCommandPrefixes(line.toLowerCase()).value);
  const outreg2Commands = commands.filter((line) => /^outreg2\b/.test(line));
  const findings = [];
  for (const command of outreg2Commands) {
    if (/\badjr2\b|\baddstat\s*\(/.test(command)) {
      findings.push({ rule: "statistics_routed_through_outreg2", command });
    }
    if (!/\bnor2\b/.test(command)) findings.push({ rule: "raw_outreg2_table_missing_nor2", command });
  }
  const required = [
    ["caller_supplied_named_estimates", commands.some((line) => /^syntax\b.*\bestimates\s*\(\s*string\s*\)/.test(line))],
    ["one_flat_named_estimate_loop", commands.some((line) => /^foreach\s+estimate\s+of\s+local\s+estimates\b/.test(line))],
    ["restores_caller_named_estimate", commands.some((line) => /^estimates\s+restore\s+`estimate'/.test(line))],
    ["generic_estimate_column_alignment", commands.some((line) => /statistic_num.*statistic_count|statistic_count.*statistic_num/.test(line))],
    ["raw_header_and_row_preservation", outreg2Commands.length >= 1 && !commands.some((line) => /^(?:keep|drop|rename|label|coeflabel)\b/.test(line))],
    ["adjusted_r2_declared_precision", commands.some((line) => /strofreal\s*\(\s*e\(r2_a\).*`adjdec'/.test(line))],
    ["dependent_mean_declared_precision", commands.some((line) => /strofreal\s*\(\s*e\(ymean\).*`meandec'/.test(line))],
    ["adjusted_r2_row", commands.some((line) => /adjusted r-squared/.test(line))],
    ["dependent_mean_row", commands.some((line) => /dep\. variable mean/.test(line))],
    ["exact_standard_error_note_variants", commands.some((line) => /inlist\s*\(\s*v1\s*\[\s*_n\s*-\s*1\s*\]\s*,\s*"standard errors in parentheses"\s*,\s*"robust standard errors in parentheses"\s*\)/.test(line))],
    ["statistics_before_notes", commands.some((line) => /local\s+standard_error_note_row\b/.test(line)) && commands.some((line) => /local\s+significance_note_row\b/.test(line))],
  ];
  for (const [contract, passed] of required) {
    if (!passed) findings.push({ rule: "statistics_contract_missing", contract });
  }
  return findings;
}

// The formatter's scratch file is the one approved deletion in this plugin.
// Keep the contract structural so a prefix match cannot accidentally authorize
// removal of another table or an intermediate research artifact.
function canonicalOutreg2ScratchContractFindings(content) {
  const commands = activeLogicalLines(content).map((line, index) => ({
    command: stripStataCommandPrefixes(line).value,
    logical_line: index + 1,
  }));
  const scratchLocal = /^local\s+scratch\s+"\$table\/__outreg2_`sheet'"\s*$/i;
  const outreg2Scratch = /^outreg2\s+using\s+"`scratch'"/i;
  const importScratch = /^import\s+delimited\s+using\s+"`scratch'\.txt"/i;
  const bareEraseScratch = /^erase\s+"`scratch'\.txt"\s*$/i;
  const confirmScratch = /^(?:(?:capture|cap)\s+)?confirm\s+file\s+"`scratch'\.txt"\s*$/i;
  const findings = [];
  if (!commands.some((row) => scratchLocal.test(row.command))) findings.push({ rule: "named_table_scratch_local" });
  const tempfile = commands.find((row) => /^tempfile\s+scratch\b/i.test(row.command));
  if (tempfile) findings.push({ rule: "tempfile_scratch_not_allowed", logical_line: tempfile.logical_line });
  if (!commands.some((row) => outreg2Scratch.test(row.command))) findings.push({ rule: "outreg2_produces_named_scratch" });
  if (!commands.some((row) => importScratch.test(row.command))) findings.push({ rule: "imports_named_scratch" });
  const erases = commands.map((row, index) => ({ ...row, index })).filter((row) => bareEraseScratch.test(row.command));
  if (erases.length !== 1) {
    findings.push({ rule: "one_bare_named_scratch_erase", observed: erases.length });
    return findings;
  }
  const erase = erases[0];
  if (commands[erase.index - 1]?.command !== "restore") findings.push({ rule: "restore_before_scratch_cleanup", logical_line: erase.logical_line });
  if (!confirmScratch.test(commands[erase.index + 1]?.command || "")) findings.push({ rule: "confirm_named_scratch_after_cleanup", logical_line: erase.logical_line });
  const guard = commands[erase.index + 2];
  if (!/^if\s+!_rc\s*\{$/i.test(guard?.command || "")) {
    findings.push({ rule: "cleanup_postcondition_guard", logical_line: erase.logical_line });
    return findings;
  }
  let guardEnd = -1;
  for (let index = erase.index + 3; index < commands.length; index += 1) {
    if (commands[index].command === "}") {
      guardEnd = index;
      break;
    }
  }
  if (guardEnd < 0 || !commands.slice(erase.index + 3, guardEnd).some((row) => /^exit\s+498\s*$/i.test(row.command))) {
    findings.push({ rule: "cleanup_postcondition_exit_498", logical_line: erase.logical_line });
  }
  return findings;
}

function structuredManifestFailure(root, manifestBytes, dictionarySha256, rule, message) {
  return {
    root,
    status: "needs_revision",
    verification_level: "manifest_parse_and_schema_validation_only",
    provenance_lock: {
      schema_version: null,
      plugin_dictionary_sha256: dictionarySha256,
      manifest_sha256: sha256(manifestBytes),
    },
    headword_checks: [],
    substep_checks: [],
    selection_checks: [],
    project_policy: { files: [] },
    program_policy: { definitions: [], approved_exception_labels: [], allowed_program_definitions: 0 },
    blockers: [{ rule, message }],
    warnings: [],
    claim_boundary: "The manifest could not be decoded and validated, so no provenance or reuse claim is available.",
  };
}

function rubricClassification(label) {
  return label.quality_rubric_review?.classification || (label.decision === "drop" ? "exclude" : "conditional_candidate");
}

function isAutoSelectableLabel(label) {
  return label.decision !== "drop"
    && label.adaptation_mode !== "do_not_reuse"
    && (label.reuse_scope !== "project_specific" || label.explicit_canonical_exception)
    && ["preferred_candidate", "conditional_candidate"].includes(rubricClassification(label));
}

function normalizedTerms(values) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function queryTerms(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9_()]{2,}|[가-힣]{2,}/g) || [];
}

function labelSearchText(label) {
  return JSON.stringify({
    label_id: label.label_id,
    variant_id: label.variant_id,
    checkpoint: label.checkpoint,
    name_en: label.name_en,
    name_ko: label.name_ko,
    aliases: label.aliases,
    command_anchors: label.command_anchors,
    selection_conditions: label.selection_conditions,
    state_signature: label.state_signature,
    input_contract: label.input_contract,
    output_contract: label.output_contract,
    code: label.code,
  }).toLowerCase();
}

function matchingAutoSelectableLabels(labels, checkpoint, match = {}, fallbackQuery = "") {
  const checkpoints = normalizedTerms(match.searched_checkpoints || match.checkpoints);
  if (!checkpoints.length) checkpoints.push(String(checkpoint || "").toLowerCase());
  const commands = normalizedTerms(match.commands);
  const tokens = normalizedTerms(match.tokens);
  const query = String(match.query || fallbackQuery || "").trim();
  const semanticTerms = tokens.length ? tokens : queryTerms(query);
  const explicitIds = new Set(normalizedTerms(match.label_ids));
  return labels.filter((label) => {
    if (!isAutoSelectableLabel(label) || !checkpoints.includes(String(label.checkpoint || "").toLowerCase())) return false;
    const anchors = normalizedTerms(label.command_anchors);
    const commandMatch = commands.length > 0 && commands.every((command) => anchors.includes(command));
    const text = labelSearchText(label);
    const semanticMatch = semanticTerms.length > 0 && semanticTerms.every((term) => text.includes(term));
    const explicitMatch = explicitIds.has(String(label.label_id || "").toLowerCase());
    if (!commands.length && !semanticTerms.length && !explicitIds.size) return true;
    if (commands.length && semanticTerms.length) return (commandMatch && semanticMatch) || explicitMatch;
    return commandMatch || semanticMatch || explicitMatch;
  });
}

const HIGH_SIGNAL_NATIVE_COMMANDS = new Set([
  "collapse", "coefplot", "event_plot", "export excel", "graph export", "import excel",
  "isid", "joinby", "merge", "outreg2", "reghdfe", "reshape", "xtreg", "xtset", "ppmlhdfe",
  "estimates save", "estimates store", "estimates use",
]);

const COMMAND_ONLY_NATIVE_EVIDENCE = new Set([
  "collapse", "coefplot", "event_plot", "export excel", "graph export", "isid", "merge", "outreg2",
  "reshape", "xtset", "estimates save", "estimates store", "estimates use",
]);

function observedNativeCandidates(labels, checkpoint, content, observedCommands, match = {}, fallbackQuery = "", evidence = null) {
  const matches = new Map();
  const add = (rows) => rows.forEach((row) => matches.set(row.label_id, row));
  const exactSourceBlockCandidates = labels.filter((label) => isAutoSelectableLabel(label)
    && String(label.checkpoint || "").toLowerCase() === String(checkpoint || "").toLowerCase()
    && containsExactLogicalBlock(content, label.code));
  add(exactSourceBlockCandidates);
  if (evidence) evidence.exact_source_block_candidate_ids = exactSourceBlockCandidates.map((label) => label.label_id);
  const structuralSourceBlockMatches = labels
    .filter((label) => isAutoSelectableLabel(label)
      && String(label.checkpoint || "").toLowerCase() === String(checkpoint || "").toLowerCase())
    .map((label) => ({ label, fingerprint: findMinimalSubstitutionBlock(content, label) }))
    .filter((row) => row.fingerprint);
  add(structuralSourceBlockMatches.map((row) => row.label));
  if (evidence) {
    evidence.structural_source_block_matches = structuralSourceBlockMatches.map((row) => ({
      label_id: row.label.label_id,
      ...row.fingerprint,
    }));
    evidence.structural_source_block_candidate_ids = structuralSourceBlockMatches.map((row) => row.label.label_id);
  }
  if (/e\(sample\)/i.test(content)) {
    for (const command of ["summarize", "su"].filter((item) => commandObserved(item, observedCommands))) {
      add(matchingAutoSelectableLabels(labels, checkpoint, { commands: [command], tokens: ["e(sample)"] }));
    }
  }
  for (const observed of observedCommands) {
    const command = observed.replace(/^capture\s+/, "").replace(/:.+$/, "");
    if (!HIGH_SIGNAL_NATIVE_COMMANDS.has(command)) continue;
    if (COMMAND_ONLY_NATIVE_EVIDENCE.has(command)) add(matchingAutoSelectableLabels(labels, checkpoint, { commands: [command] }));
    else if (normalizedTerms(match.tokens).length || match.query || fallbackQuery) {
      add(matchingAutoSelectableLabels(labels, checkpoint, { commands: [command], tokens: match.tokens, query: match.query }, fallbackQuery));
    }
  }
  return [...matches.values()];
}

function substepId(row) {
  return typeof row?.substep_id === "string" ? row.substep_id : row?.substep;
}

function selectionSubstepIds(selection) {
  const values = typeof selection?.substep_id === "string" ? [selection.substep_id] : [];
  return normalizedTerms(values);
}

function templateReuseCheck(args, context) {
  const root = fs.realpathSync(path.resolve(args.path));
  if (!fs.statSync(root).isDirectory()) throw new Error(`project path is not a directory: ${args.path}`);
  const manifestPath = resolveExistingInside(root, args.manifest_path, "manifest");
  const manifestBytes = fs.readFileSync(manifestPath);
  const dictionaryBytes = fs.readFileSync(context.dictionaryPath);
  const dictionarySha256 = sha256(dictionaryBytes);
  let manifest;
  try {
    manifest = JSON.parse(decodeUtf8(manifestBytes, "template reuse manifest"));
  } catch (error) {
    return structuredManifestFailure(root, manifestBytes, dictionarySha256, "manifest_invalid_utf8_or_json", error.message);
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return structuredManifestFailure(root, manifestBytes, dictionarySha256, "manifest_schema_invalid", "template reuse manifest must be a JSON object");
  }
  if (!["1.0", "2.0"].includes(manifest.schema_version)) {
    return structuredManifestFailure(root, manifestBytes, dictionarySha256, "manifest_schema_version_invalid", "template reuse manifest schema_version must be 1.0 or 2.0");
  }
  if (!Array.isArray(manifest.selections) || !Array.isArray(manifest.required_headwords)) {
    return structuredManifestFailure(root, manifestBytes, dictionarySha256, "manifest_schema_rows_invalid", "selections and required_headwords must both be arrays");
  }
  const atomicSubstepSchema = manifest.schema_version === "2.0";
  const enforceTemplateReuse = args.enforce_template_reuse === true;

  const blockers = [];
  const warnings = [];
  const requestedMinimumRetention = args.min_command_retention === undefined
    ? undefined
    : Number(args.min_command_retention);
  if (requestedMinimumRetention !== undefined
      && (!Number.isFinite(requestedMinimumRetention)
        || requestedMinimumRetention < 0.75
        || requestedMinimumRetention > 1)) {
    blockers.push({
      rule: "min_command_retention_out_of_range",
      observed: args.min_command_retention,
      minimum: 0.75,
      maximum: 1,
    });
  }
  if (!atomicSubstepSchema) {
    warnings.push({
      rule: "legacy_manifest_schema",
      schema_version: manifest.schema_version,
      message: "schema 1.0 cannot enforce mixed template and native_substep coverage within a broad headword; use schema 2.0 for a new trial",
    });
  }
  const knownCheckpoints = new Set(context.labels.map((row) => String(row.checkpoint || "").trim()).filter(Boolean));
  const manifestCheckpointCounts = new Map();
  for (const [index, row] of manifest.required_headwords.entries()) {
    const valid = typeof row === "string" && row.trim()
      || row && typeof row === "object" && !Array.isArray(row) && typeof row.checkpoint === "string" && row.checkpoint.trim();
    if (!valid) blockers.push({ rule: "required_headword_schema_invalid", headword_index: index });
    else if (atomicSubstepSchema) {
      const checkpoint = (typeof row === "string" ? row : row.checkpoint).trim();
      manifestCheckpointCounts.set(checkpoint, (manifestCheckpointCounts.get(checkpoint) || 0) + 1);
      if (!knownCheckpoints.has(checkpoint)) blockers.push({ rule: "unknown_manifest_checkpoint", checkpoint, headword_index: index });
    }
  }
  if (atomicSubstepSchema) {
    for (const [checkpoint, count] of manifestCheckpointCounts.entries()) {
      if (count > 1) blockers.push({ rule: "duplicate_manifest_checkpoint", checkpoint, count });
    }
  }
  if (manifest.plugin_dictionary_sha256 !== dictionarySha256) {
    blockers.push({ rule: "dictionary_drift", expected: manifest.plugin_dictionary_sha256 || null, observed: dictionarySha256 });
  }

  const labelsById = new Map(context.labels.map((row) => [row.label_id, row]));
  const declaredOutputFlowDecision = manifestOutputFlowDecision(manifest.output_flow_profile);
  const declaredAxisDecision = analyzeEventStudyAxisProfile(manifest.event_study_axis_profile || {});
  const selectedByCheckpoint = new Map();
  const selectionChecks = [];
  for (const [selectionIndex, rawSelection] of manifest.selections.entries()) {
    if (!rawSelection || typeof rawSelection !== "object" || Array.isArray(rawSelection)) {
      blockers.push({ rule: "selection_schema_invalid", selection_index: selectionIndex });
      selectionChecks.push({ label_id: null, checkpoint: null, passed: false, evidence: {}, selection_index: selectionIndex });
      continue;
    }
    const selection = rawSelection;
    const label = labelsById.get(selection.label_id);
    const check = { label_id: selection.label_id || null, checkpoint: label?.checkpoint || null, passed: true, evidence: {}, selection_index: selectionIndex };
    const fail = (rule, details = {}) => {
      check.passed = false;
      blockers.push({ rule, label_id: selection.label_id || null, selection_index: selectionIndex, ...details });
    };
    if (atomicSubstepSchema) {
      if (Object.prototype.hasOwnProperty.call(selection, "substep_ids")) fail("selection_multiple_substeps_not_allowed");
      if (typeof selection.substep_id !== "string" || !selection.substep_id.trim()) fail("selection_substep_id_missing");
    }
    if (!label) {
      fail("unknown_label");
      selectionChecks.push(check);
      continue;
    }
    if (label.decision === "drop" || label.adaptation_mode === "do_not_reuse") fail("drop_label_selected", { decision: label.decision });
    if (selection.source_code_sha256 !== label.code_sha256) fail("source_code_hash_mismatch", { expected: label.code_sha256, observed: selection.source_code_sha256 || null });
    if (!selection.source_file_sha256) {
      if (atomicSubstepSchema) fail("source_file_hash_missing", { expected: label.source_file_sha256 || null });
      else warnings.push({ rule: "legacy_source_file_hash_missing", label_id: selection.label_id, expected: label.source_file_sha256 || null });
    } else if (!label.source_file_sha256) {
      fail("label_source_file_hash_missing", { observed: selection.source_file_sha256 });
    } else if (selection.source_file_sha256 !== label.source_file_sha256) {
      fail("source_file_hash_mismatch", { expected: label.source_file_sha256, observed: selection.source_file_sha256 });
    }
    if (!selection.source?.path) fail("source_path_missing", { expected: label.source_path });
    else if (selection.source.path !== label.source_path) fail("source_path_mismatch", { expected: label.source_path, observed: selection.source.path });
    if (!selection.source?.spans) fail("source_spans_missing", { expected: label.source_spans });
    else if (JSON.stringify(selection.source.spans) !== JSON.stringify(label.source_spans)) fail("source_spans_mismatch", { expected: label.source_spans, observed: selection.source.spans });
    const packageMatch = String(label.source_path || "").replaceAll("\\", "/").match(/^corpus\/packages\/([^/]+)\//);
    if (packageMatch) {
      const expectedPackage = context.packages?.find((row) => String(row.project_id) === packageMatch[1]);
      if (selection.source_package_id !== packageMatch[1]) fail("source_package_id_mismatch", { expected: packageMatch[1], observed: selection.source_package_id || null });
      if (expectedPackage?.repository_doi && selection.repository_doi !== expectedPackage.repository_doi) fail("repository_doi_mismatch", { expected: expectedPackage.repository_doi, observed: selection.repository_doi || null });
    } else if (atomicSubstepSchema && !selection.source_kind) {
      fail("source_kind_missing", { expected: label.source_kind || null });
    } else if (selection.source_kind !== label.source_kind) {
      fail("source_kind_mismatch", { expected: label.source_kind, observed: selection.source_kind || null });
    }

    if (atomicSubstepSchema) {
      try {
        const resolvedSource = resolveLiveSource(context, label.source_path);
        const sourceBytes = fs.readFileSync(resolvedSource.path);
        const liveFileHash = sha256(sourceBytes);
        const sourceText = decodeUtf8(sourceBytes, `source ${label.source_path}`);
        const liveSpanText = extractSourceSpans(sourceText, label.source_spans, `source ${label.label_id}`);
        const liveSpanHash = sha256(Buffer.from(liveSpanText, "utf8"));
        const liveSpanHashCandidates = [liveSpanHash];
        check.evidence.live_source = {
          path: resolvedSource.path,
          resolution: resolvedSource.resolution,
          archive_index_path: resolvedSource.archive_index_path || null,
          source_file_sha256: liveFileHash,
          source_span_sha256: liveSpanHash,
          source_span_sha256_candidates: liveSpanHashCandidates,
        };
        if (liveFileHash !== label.source_file_sha256 || liveFileHash !== selection.source_file_sha256) {
          fail("live_source_file_hash_mismatch", { expected_label: label.source_file_sha256 || null, expected_manifest: selection.source_file_sha256 || null, observed: liveFileHash });
        }
        if (!liveSpanHashCandidates.includes(label.code_sha256) || !liveSpanHashCandidates.includes(selection.source_code_sha256)) {
          fail("live_source_span_hash_mismatch", { expected_label: label.code_sha256 || null, expected_manifest: selection.source_code_sha256 || null, observed_candidates: liveSpanHashCandidates });
        }
      } catch (error) {
        fail("live_source_read_or_decode_error", { message: error.message });
      }
    }

    const editedFields = selection.edited_fields || selection.edits?.map((row) => row.field) || [];
    if (!Array.isArray(editedFields)) fail("edited_fields_not_array");
    else {
      const allowed = new Set(label.minimal_edit_fields || []);
      const unexpected = editedFields.filter((field) => !allowed.has(field));
      if (unexpected.length) fail("undeclared_edit_field", { unexpected, allowed: [...allowed] });
    }
    if (label.decision === "conditional_keep") {
      const declared = new Set(selection.selection_conditions_met || []);
      const missing = (label.selection_conditions || []).filter((condition) => !declared.has(condition));
      if (missing.length) fail("selection_conditions_not_attested", { missing });
    }
    const appliedChanges = new Set(selection.required_changes_applied || []);
    const missingChanges = (label.required_changes || []).filter((change) => !appliedChanges.has(change));
    if (missingChanges.length) fail("required_changes_not_attested", { missing: missingChanges });

    let targetPath;
    let targetText = "";
    try {
      const targetRelative = selection.target_path || selection.target?.path;
      const targetSpans = selection.target_spans || selection.target?.spans;
      targetPath = resolveExistingInside(root, targetRelative, "target");
      const targetContent = decodeUtf8(fs.readFileSync(targetPath), `target ${targetRelative}`);
      targetText = extractSpans(targetContent, targetSpans, `target ${selection.label_id}`);
      const targetRawHash = sha256(Buffer.from(targetText, "utf8"));
      const claimedTargetHash = selection.target_span_sha256 || selection.target?.span_sha256;
      if (!claimedTargetHash) fail("target_span_hash_missing", { observed: targetRawHash });
      else if (claimedTargetHash !== targetRawHash) fail("target_drift", { expected: claimedTargetHash, observed: targetRawHash });
      const sourceSequence = commandSequence(label.code);
      const targetSequence = commandSequence(targetText);
      const retained = sourceSequence.length ? lcsLength(sourceSequence, targetSequence) / sourceSequence.length : 0;
      const minimum = Math.max(
        0.75,
        ...[
          Number(label.reuse_contract?.min_command_retention),
          requestedMinimumRetention,
        ].filter(Number.isFinite),
      );
      check.evidence = {
        ...check.evidence,
        source_file_sha256: label.source_file_sha256 || null,
        source_code_sha256: label.code_sha256 || null,
        target_path: path.relative(root, targetPath).replace(/\\/g, "/"),
        target_spans: targetSpans,
        target_span_sha256: targetRawHash,
        source_command_count: sourceSequence.length,
        target_command_count: targetSequence.length,
        retained_command_count: lcsLength(sourceSequence, targetSequence),
        command_retention: Number(retained.toFixed(4)),
        minimum_command_retention: minimum,
      };
      if (retained < minimum) fail("command_sequence_retention_below_contract", { observed: retained, minimum });
      const lint = context.lintContent(normalizeStructuralPrefixes(targetText), "template_reuse", check.evidence.target_path);
      const helperValidatedAtProjectScope = label.program_justification?.status === "approved_exception"
        && declaredOutputFlowDecision.recommended_label_id === label.label_id;
      const lintBlockers = lint.findings.filter((row) => row.severity === "error"
        && !(helperValidatedAtProjectScope && ["unnecessary_outreg2_program", "destructive_delete"].includes(row.rule)));
      if (lintBlockers.length) fail("target_span_lint_blocked", { findings: lintBlockers });
      if (lint.summary.max_loop_depth > 2) fail("target_nested_loop", { max_loop_depth: lint.summary.max_loop_depth });
    } catch (error) {
      fail("target_read_or_span_error", { message: error.message });
    }

    if (!selectedByCheckpoint.has(label.checkpoint)) selectedByCheckpoint.set(label.checkpoint, []);
    selectedByCheckpoint.get(label.checkpoint).push(selection.label_id);
    selectionChecks.push(check);
  }

  const manifestCheckpoints = manifest.required_headwords
    .map((row) => typeof row === "string" ? row : row?.checkpoint)
    .filter((checkpoint) => typeof checkpoint === "string" && checkpoint.trim())
    .map((checkpoint) => checkpoint.trim());
  const callerRequired = Array.isArray(args.required_headwords)
    ? args.required_headwords.filter((checkpoint) => typeof checkpoint === "string" && checkpoint.trim()).map((checkpoint) => checkpoint.trim())
    : [];
  if (atomicSubstepSchema && callerRequired.length) {
    const callerCounts = new Map();
    for (const checkpoint of callerRequired) {
      callerCounts.set(checkpoint, (callerCounts.get(checkpoint) || 0) + 1);
      if (!knownCheckpoints.has(checkpoint)) blockers.push({ rule: "unknown_caller_checkpoint", checkpoint });
      if (!manifestCheckpointCounts.has(checkpoint)) blockers.push({ rule: "caller_required_headword_missing_from_manifest", checkpoint });
    }
    for (const [checkpoint, count] of callerCounts.entries()) {
      if (count > 1) blockers.push({ rule: "duplicate_caller_checkpoint", checkpoint, count });
    }
  }
  const requiredInput = atomicSubstepSchema
    ? [...new Set([...manifestCheckpoints, ...callerRequired])]
    : callerRequired.length ? callerRequired : manifestCheckpoints;
  const headwordContract = {
    rule: atomicSubstepSchema ? "validate_all_manifest_checkpoints_and_cover_caller_required_headwords" : "legacy_required_headword_check",
    known_manifest_checkpoints: manifestCheckpoints.filter((checkpoint) => knownCheckpoints.has(checkpoint)),
    caller_required_headwords: callerRequired,
  };
  const allowedNative = new Set(args.allow_native_headwords || []);
  const manifestModes = new Map(manifest.required_headwords.filter(Boolean).map((row) => [typeof row === "string" ? row : row.checkpoint, typeof row === "string" ? "template" : row.mode]));
  const headwordChecks = [];
  const substepChecks = [];
  if (atomicSubstepSchema) {
    const templateSubstepIds = new Set(manifest.required_headwords
      .filter((row) => row && typeof row === "object" && Array.isArray(row.substeps))
      .flatMap((row) => row.substeps)
      .filter((substep) => substep?.mode === "template")
      .map((substep) => String(substepId(substep) || "").trim().toLowerCase())
      .filter(Boolean));
    const selectedLabelsByVariantGroup = new Map();
    for (const selection of manifest.selections) {
      if (!selectionSubstepIds(selection).some((id) => templateSubstepIds.has(id))) continue;
      const selectedLabel = labelsById.get(selection?.label_id);
      const variantGroup = String(selectedLabel?.variant_group || "").trim();
      if (!variantGroup) continue;
      if (!selectedLabelsByVariantGroup.has(variantGroup)) selectedLabelsByVariantGroup.set(variantGroup, new Set());
      selectedLabelsByVariantGroup.get(variantGroup).add(selectedLabel.label_id);
    }
    for (const [variantGroup, selectedLabelIds] of selectedLabelsByVariantGroup.entries()) {
      if (selectedLabelIds.size > 1) blockers.push({
        rule: "competing_template_variant_group_selections",
        variant_group: variantGroup,
        selected_label_ids: [...selectedLabelIds],
      });
    }
    const requiredSet = new Set(requiredInput);
    const headwordsByCheckpoint = new Map(manifest.required_headwords
      .filter((row) => row && typeof row === "object")
      .map((row) => [row.checkpoint, row]));
    for (const checkpoint of [...requiredSet]) {
      const headword = headwordsByCheckpoint.get(checkpoint);
      const headwordBlockerStart = blockers.length;
      if (!headword) {
        blockers.push({ rule: "required_headword_missing", checkpoint, selections: [] });
        headwordChecks.push({ checkpoint, mode: null, selections: [], substeps: [], passed: false });
        continue;
      }
      if (!Array.isArray(headword.substeps) || !headword.substeps.length) {
        blockers.push({ rule: "atomic_substeps_missing", checkpoint });
        headwordChecks.push({ checkpoint, mode: headword.mode || null, selections: [], substeps: [], passed: false });
        continue;
      }
      const seenSubsteps = new Set();
      const checkpointSubsteps = [];
      for (const rawSubstep of headword.substeps) {
        const substep = rawSubstep && typeof rawSubstep === "object" && !Array.isArray(rawSubstep) ? rawSubstep : {};
        const id = String(substepId(substep) || "").trim();
        const normalizedId = id.toLowerCase();
        const check = {
          checkpoint,
          substep_id: id || null,
          mode: substep.mode || null,
          selections: [],
          matched_candidate_ids: [],
          passed: true,
        };
        const failSubstep = (rule, details = {}) => {
          check.passed = false;
          blockers.push({ rule, checkpoint, substep_id: id || null, ...details });
        };
        if (substep !== rawSubstep) failSubstep("substep_schema_invalid");
        if (!id) failSubstep("substep_id_missing");
        else if (seenSubsteps.has(normalizedId)) failSubstep("duplicate_substep_id");
        else seenSubsteps.add(normalizedId);
        const assignedSelections = manifest.selections.filter((selection) => selectionSubstepIds(selection).includes(normalizedId));
        check.selections = assignedSelections.map((selection) => selection.label_id);
        const match = substep.match && typeof substep.match === "object" ? substep.match : {};
        const justification = substep.native_justification;
        const fallbackQuery = justification?.search_evidence?.query || "";
        const declaredMatchCheckpoints = normalizedTerms(match.searched_checkpoints || match.checkpoints);
        if (declaredMatchCheckpoints.length && !declaredMatchCheckpoints.includes(String(checkpoint).toLowerCase())) {
          failSubstep("substep_match_checkpoint_mismatch", { searched_checkpoints: declaredMatchCheckpoints });
        }
        const hasDataDrivenMatch = normalizedTerms(match.commands).length > 0
          || normalizedTerms(match.tokens).length > 0
          || typeof match.query === "string" && match.query.trim().length > 0;
        const hasAtomicMatch = hasDataDrivenMatch || normalizedTerms(match.label_ids).length > 0;
        const candidateMap = new Map(matchingAutoSelectableLabels(context.labels, checkpoint, match, fallbackQuery).map((label) => [label.label_id, label]));
        if (substep.mode === "template") {
          const candidates = [...candidateMap.values()];
          check.matched_candidate_ids = candidates.map((label) => label.label_id);
          if (!hasAtomicMatch) failSubstep("template_substep_atomic_match_missing");
          if (assignedSelections.length !== 1) {
            failSubstep(assignedSelections.length ? "competing_templates_for_substep" : "required_template_substep_missing", { selections: check.selections });
          } else {
            const selectedLabel = labelsById.get(assignedSelections[0].label_id);
            if (selectedLabel?.checkpoint !== checkpoint) failSubstep("template_substep_checkpoint_mismatch", { label_id: assignedSelections[0].label_id, observed_checkpoint: selectedLabel?.checkpoint || null });
            if (!candidates.some((label) => label.label_id === assignedSelections[0].label_id)) {
              failSubstep("template_substep_match_mismatch", { label_id: assignedSelections[0].label_id, matched_candidate_ids: check.matched_candidate_ids });
            }
          }
        } else if (substep.mode === "native_substep") {
          const target = targetDeclaration(substep);
          const nativeEvidence = {
            target_path: target.path || null,
            target_spans: target.spans || null,
            target_span_sha256: null,
            declared_target_span_sha256: target.sha256 || null,
            observed_commands: [],
            command_match: null,
            token_match: null,
            query_match: null,
            lint: null,
            tex_output: null,
            program_definitions: [],
          };
          check.native_target_evidence = nativeEvidence;
          if (!target.path || !target.spans || !target.sha256) {
            failSubstep("native_target_declaration_missing", { required: ["target_path", "target_spans", "target_span_sha256"] });
          } else {
            try {
              const targetPath = resolveExistingInside(root, target.path, `native target ${id}`);
              const targetContent = decodeUtf8(fs.readFileSync(targetPath), `native target ${target.path}`);
              const targetText = extractSpans(targetContent, target.spans, `native target ${id}`);
              const observedHash = sha256(Buffer.from(targetText, "utf8"));
              const observedCommands = observedCommandAnchors(targetText);
              nativeEvidence.target_path = path.relative(root, targetPath).replace(/\\/g, "/");
              nativeEvidence.target_span_sha256 = observedHash;
              nativeEvidence.observed_commands = observedCommands;
              if (observedHash !== target.sha256) failSubstep("native_target_drift", { expected: target.sha256, observed: observedHash });

              const declaredCommands = normalizedTerms(match.commands);
              const missingCommands = declaredCommands.filter((command) => !commandObserved(command, observedCommands));
              nativeEvidence.command_match = { declared: declaredCommands, missing: missingCommands, passed: missingCommands.length === 0 };
              if (missingCommands.length) failSubstep("native_target_declared_commands_missing", { missing: missingCommands, observed_commands: observedCommands });

              const tokenEvidence = meaningEvidence(match.tokens || [], targetText, observedCommands);
              nativeEvidence.token_match = tokenEvidence;
              if (normalizedTerms(match.tokens).length && !tokenEvidence.passed) failSubstep("native_target_declared_tokens_missing", tokenEvidence);
              const queryValues = [match.query, justification?.search_evidence?.query].filter(Boolean);
              const queryEvidence = meaningEvidence(queryValues, targetText, observedCommands);
              nativeEvidence.query_match = queryEvidence;
              if (queryValues.length && !queryEvidence.passed) failSubstep("native_target_declared_query_missing", queryEvidence);

              const lint = context.lintContent(normalizeStructuralPrefixes(targetText), "native_substep", nativeEvidence.target_path);
              nativeEvidence.lint = { max_loop_depth: lint.summary.max_loop_depth, error_count: lint.findings.filter((row) => row.severity === "error").length };
              const lintErrors = lint.findings.filter((row) => row.severity === "error");
              if (lintErrors.length) failSubstep("native_target_lint_blocked", { findings: lintErrors });
              if (lint.summary.max_loop_depth > 2) failSubstep("native_target_nested_loop", { max_loop_depth: lint.summary.max_loop_depth });
              nativeEvidence.tex_output = hasTexOutputContent(targetText);
              if (nativeEvidence.tex_output) failSubstep("native_target_tex_output");
              nativeEvidence.program_definitions = targetText.split(/\r?\n/).flatMap((line, index) => {
                const program = stripStataCommandPrefixes(line).value.match(/^program\s+define\s+([^\s,]+)/i);
                return program ? [{ name: program[1], line: index + 1 }] : [];
              });
              if (nativeEvidence.program_definitions.length) failSubstep("native_target_program_definition", { definitions: nativeEvidence.program_definitions });

              const observedCandidates = observedNativeCandidates(context.labels, checkpoint, targetText, observedCommands, match, fallbackQuery, nativeEvidence);
              nativeEvidence.observed_candidate_ids = observedCandidates.map((label) => label.label_id);
              for (const label of observedCandidates) candidateMap.set(label.label_id, label);
            } catch (error) {
              failSubstep("native_target_read_decode_or_span_error", { message: error.message });
            }
          }
          const candidates = [...candidateMap.values()];
          check.matched_candidate_ids = candidates.map((label) => label.label_id);
          if (!hasDataDrivenMatch) failSubstep("native_substep_atomic_match_missing");
          if (assignedSelections.length) failSubstep("native_substep_has_template_selection", { selections: check.selections });
          if (candidates.length) {
            if (enforceTemplateReuse) failSubstep("native_substep_template_available", { matched_candidate_ids: check.matched_candidate_ids });
            else warnings.push({
              rule: "preferred_template_not_selected",
              checkpoint,
              substep_id: id || null,
              matched_candidate_ids: check.matched_candidate_ids,
              message: "A compatible template was available. A native fallback remains advisory when the manifest records the rank-relative nearest template hint, the no_suitable_template or wrong_selection trigger, and any nonbinding hint used.",
            });
          }
          if (!justification || !["project_specific_formula", "dictionary_gap", "template_mismatch_fallback", "direct_implementation"].includes(justification.kind)) {
            failSubstep("native_substep_justification_invalid", { allowed_kinds: ["project_specific_formula", "dictionary_gap", "template_mismatch_fallback", "direct_implementation"] });
          } else if (justification.kind === "project_specific_formula") {
            const definition = justification.formula_or_definition || justification.description;
            if (typeof definition !== "string" || !definition.trim()) failSubstep("project_specific_formula_definition_missing");
          } else if (justification.kind === "dictionary_gap") {
            const evidence = justification.search_evidence;
            if (!evidence || typeof evidence !== "object") failSubstep("dictionary_gap_search_evidence_missing");
            else {
              const evidenceCheckpoints = normalizedTerms(evidence.searched_checkpoints || match.searched_checkpoints || match.checkpoints);
              const hasQuery = typeof evidence.query === "string" && evidence.query.trim().length > 0;
              if (!hasQuery && !hasDataDrivenMatch) failSubstep("dictionary_gap_query_missing");
              if (!evidenceCheckpoints.length) failSubstep("dictionary_gap_searched_checkpoints_missing");
              else if (!evidenceCheckpoints.includes(String(checkpoint).toLowerCase())) failSubstep("dictionary_gap_searched_checkpoint_mismatch", { searched_checkpoints: evidenceCheckpoints });
              if (!Array.isArray(evidence.result_label_ids)) failSubstep("dictionary_gap_result_label_ids_missing");
              else {
                const claimed = [...new Set(evidence.result_label_ids.map(String))].sort();
                const observed = [...check.matched_candidate_ids].sort();
                if (JSON.stringify(claimed) !== JSON.stringify(observed)) failSubstep("dictionary_gap_search_results_stale", { claimed, observed });
              }
              if (evidence.dictionary_sha256 && evidence.dictionary_sha256 !== dictionarySha256) {
                failSubstep("dictionary_gap_search_dictionary_drift", { expected: evidence.dictionary_sha256, observed: dictionarySha256 });
              }
            }
          } else {
            const nearestTemplateHint = justification.nearest_template_hint;
            const fallbackTrigger = justification.fallback_trigger;
            const hintUsed = justification.hint_used;
            if (typeof nearestTemplateHint !== "string" || !nearestTemplateHint.trim()) failSubstep("template_mismatch_nearest_template_hint_missing");
            else {
              const normalizedHint = nearestTemplateHint.trim();
              if (normalizedHint === "none") {
                if (candidates.length) failSubstep("template_mismatch_nearest_template_hint_available", { expected: candidates[0].label_id });
              } else {
                const hintedLabel = labelsById.get(normalizedHint);
                if (!hintedLabel) failSubstep("template_mismatch_nearest_template_hint_unknown", { observed: normalizedHint });
                else if (hintedLabel.checkpoint !== checkpoint) {
                  failSubstep("template_mismatch_nearest_template_hint_checkpoint_mismatch", { observed: normalizedHint, observed_checkpoint: hintedLabel.checkpoint });
                } else if (candidates.length && candidates[0].label_id !== normalizedHint) {
                  failSubstep("template_mismatch_nearest_template_hint_not_ranked_first", { observed: normalizedHint, expected: candidates[0].label_id });
                }
              }
            }
            if (!["no_suitable_template", "wrong_selection"].includes(fallbackTrigger)) failSubstep("template_mismatch_fallback_trigger_invalid", { allowed: ["no_suitable_template", "wrong_selection"] });
            if (typeof hintUsed !== "string" || !hintUsed.trim()) failSubstep("template_mismatch_hint_used_missing");
            if (justification.kind === "direct_implementation") warnings.push({
              rule: "legacy_direct_implementation_kind",
              checkpoint,
              substep_id: id || null,
              message: "Use template_mismatch_fallback for new manifests; the legacy kind is accepted only with nearest_template_hint, fallback_trigger, and hint_used.",
            });
          }
        } else {
          failSubstep("substep_mode_invalid", { observed: substep.mode || null, allowed: ["template", "native_substep"] });
        }
        checkpointSubsteps.push(check);
        substepChecks.push(check);
      }
      const unassignedSelections = manifest.selections
        .filter((selection) => selection && typeof selection === "object" && labelsById.get(selection.label_id)?.checkpoint === checkpoint && selectionSubstepIds(selection).length === 0)
        .map((selection) => selection.label_id);
      if (unassignedSelections.length) blockers.push({ rule: "selection_substep_id_missing", checkpoint, selections: unassignedSelections });
      headwordChecks.push({
        checkpoint,
        mode: headword.mode || (checkpointSubsteps.some((row) => row.mode === "native_substep") ? "mixed" : "template"),
        selections: checkpointSubsteps.flatMap((row) => row.selections),
        substeps: checkpointSubsteps.map((row) => row.substep_id),
        passed: blockers.length === headwordBlockerStart && checkpointSubsteps.every((row) => row.passed),
      });
    }
  } else {
    for (const checkpoint of [...new Set(requiredInput)]) {
      const selections = selectedByCheckpoint.get(checkpoint) || [];
      const mode = manifestModes.get(checkpoint) || "template";
      let passed = true;
      if (mode === "native") {
        const directSingleSheetExcel = checkpoint === "final_excel_assembly"
          && declaredOutputFlowDecision.direct_implementation_allowed;
        if (!allowedNative.has(checkpoint) && !directSingleSheetExcel) {
          passed = false;
          blockers.push({ rule: "native_headword_not_allowed", checkpoint });
        }
      } else if (mode === "not_applicable") {
        passed = false;
        blockers.push({ rule: "required_headword_marked_not_applicable", checkpoint });
      } else if (selections.length !== 1) {
        passed = false;
        blockers.push({ rule: selections.length ? "competing_templates_for_headword" : "required_headword_missing", checkpoint, selections });
      }
      headwordChecks.push({ checkpoint, mode, selections, passed });
    }
  }

  const projectPolicy = { files: [] };
  const projectContents = new Map();
  for (const file of listDoFiles(root)) {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    try {
      const content = decodeUtf8(fs.readFileSync(file), `project do-file ${relative}`);
      projectContents.set(file, content);
    } catch (error) {
      blockers.push({ rule: "project_do_invalid_utf8", file: relative, message: error.message });
      projectPolicy.files.push({ file: relative, decode_error: error.message });
    }
  }
  const projectGlobals = collectProjectGlobalEnvironment(projectContents, root);
  projectPolicy.global_macros = projectGlobals.evidence;
  const outreg2HelperMultiplicity = canonicalOutreg2HelperMultiplicity(projectContents, projectGlobals);
  projectPolicy.outreg2_helper_multiplicity = outreg2HelperMultiplicity;
  const outputFlowDecision = declaredOutputFlowDecision;
  projectPolicy.output_flow_profile = {
    declared: manifest.output_flow_profile || null,
    decision: outputFlowDecision,
    rule: "Final Excel selection is determined from the complete outcome-to-estimate-to-sheet flow, never from a local ster count or variable name alone.",
  };
  const finalExcelSelections = manifest.selections.filter((selection) => labelsById.get(selection?.label_id)?.checkpoint === "final_excel_assembly");
  const finalExcelRequired = requiredInput.includes("final_excel_assembly");
  if (finalExcelRequired || finalExcelSelections.length) {
    if (!outputFlowDecision.selection_ready) blockers.push({ rule: "output_flow_profile_incomplete", failures: outputFlowDecision.failures });
    else if (outputFlowDecision.formatter_required) {
      if (finalExcelRequired && (finalExcelSelections.length !== 1 || finalExcelSelections[0]?.label_id !== "export.regression_excel.from_ster_default_style.v1")) blockers.push({
        rule: "final_excel_canonical_template_missing",
        required_label_id: "export.regression_excel.from_ster_default_style.v1",
        selected_label_ids: finalExcelSelections.map((selection) => selection.label_id),
      });
      for (const selection of finalExcelSelections) if (selection.label_id !== outputFlowDecision.recommended_label_id) blockers.push({
        rule: "output_flow_template_mismatch",
        selected_label_id: selection.label_id,
        recommended_label_id: outputFlowDecision.recommended_label_id,
        selection_class: outputFlowDecision.selection_class,
      });
    } else if (finalExcelSelections.length) {
      blockers.push({
        rule: "unnecessary_outreg2_formatter_for_single_sheet",
        selected_label_ids: finalExcelSelections.map((selection) => selection.label_id),
        selection_class: outputFlowDecision.selection_class,
      });
    }
    if (outputFlowDecision.recommended_label_id === "export.regression_excel.from_ster_default_style.v1") {
      const invalidWorkbookCalls = outreg2HelperMultiplicity.calls.filter((row) => row.workbook && !/\.xlsx$/i.test(row.workbook));
      if (invalidWorkbookCalls.length) blockers.push({
        rule: "canonical_formatter_requires_xlsx",
        calls: invalidWorkbookCalls.map((row) => ({
          file: path.relative(root, row.file).replace(/\\/g, "/"),
          workbook: row.workbook,
          sheet: row.sheet,
        })),
      });
      const outputGlobals = new Map(projectGlobals.resolved || []);
      const expectedCalls = expectedOutreg2Calls(outputFlowDecision, {
        normalizeWorkbook: (value) => expandDeterministicMacros(String(value || ""), outputGlobals),
      });
      const observedCalls = outreg2HelperMultiplicity.calls.map((row) => `${String(row.workbook || "").replace(/\\/g, "/").toLowerCase()}::${String(row.sheet || "").toLowerCase()}::${String(row.estimates || "")}`).sort();
      const remainingObserved = [...observedCalls];
      const unmatchedExpected = [...expectedCalls]
        .sort((left, right) => Number(left.startsWith("*::")) - Number(right.startsWith("*::")))
        .filter((expected) => {
          const expectedParts = expected.split("::");
          const observedIndex = remainingObserved.findIndex((observed) => {
            const observedParts = observed.split("::");
            return (expectedParts[0] === "*" || expectedParts[0] === observedParts[0])
              && expectedParts.slice(1).join("::") === observedParts.slice(1).join("::");
          });
          if (observedIndex < 0) return true;
          remainingObserved.splice(observedIndex, 1);
          return false;
        });
      if (unmatchedExpected.length || remainingObserved.length) blockers.push({
        rule: "output_flow_helper_calls_mismatch",
        expected_calls: expectedCalls,
        observed_calls: observedCalls,
        unmatched_expected_calls: unmatchedExpected,
        unmatched_observed_calls: remainingObserved,
      });
    }
  }
  const eventStudySelections = manifest.selections.filter((selection) => labelsById.get(selection?.label_id)?.checkpoint === "figures.event_study");
  const eventStudyRequired = requiredInput.includes("figures.event_study");
  let axisVerification = { decision: declaredAxisDecision, findings: [] };
  if (eventStudyRequired || eventStudySelections.length || manifest.event_study_axis_profile) {
    axisVerification = verifyEventStudyAxisBindings(root, manifest.event_study_axis_profile || {}, projectGlobals);
    if (!axisVerification.decision.selection_ready) blockers.push({
      rule: "event_study_axis_profile_incomplete",
      failures: axisVerification.decision.failures,
    });
    blockers.push(...axisVerification.findings);
    for (const selection of eventStudySelections) {
      const selectionPath = String(selection.target_path || selection.target?.path || "").replace(/\\/g, "/").toLowerCase();
      const selectionSpans = selection.target_spans || selection.target?.spans || [];
      const mixedBinding = axisVerification.decision.rendering_mode === MIXED_AXIS_RENDERING_MODE
        ? axisVerification.decision.mixed_loop_binding
        : null;
      const covered = mixedBinding
        ? String(mixedBinding.target_path || "").replace(/\\/g, "/").toLowerCase() === selectionPath
          && mixedBinding.target_spans.some((groupSpan) => Array.isArray(groupSpan) && groupSpan.length === 2
            && selectionSpans.some((selectionSpan) => Array.isArray(selectionSpan) && selectionSpan.length === 2
              && groupSpan[0] <= selectionSpan[1] && selectionSpan[0] <= groupSpan[1]))
        : axisVerification.decision.axis_groups.some((group) => {
        if (String(group.target_path || "").replace(/\\/g, "/").toLowerCase() !== selectionPath) return false;
        return group.target_spans.some((groupSpan) => Array.isArray(groupSpan) && groupSpan.length === 2
          && selectionSpans.some((selectionSpan) => Array.isArray(selectionSpan) && selectionSpan.length === 2
            && groupSpan[0] <= selectionSpan[1] && selectionSpan[0] <= groupSpan[1]));
        });
      if (!covered) blockers.push({
        rule: "event_study_selection_axis_binding_missing",
        label_id: selection.label_id,
        target_path: selection.target_path || selection.target?.path || null,
        target_spans: selectionSpans,
      });
    }
  }
  projectPolicy.event_study_axis_profile = {
    declared: manifest.event_study_axis_profile || null,
    decision: axisVerification.decision,
    binding_findings: axisVerification.findings,
    rule: "Automatic axes are the default. A common fixed range is allowed only for an evidence-backed close-related axis_group; axis grouping is independent of Excel sheet grouping.",
  };
  const projectHelperValidated = outputFlowDecision.recommended_label_id === "export.regression_excel.from_ster_default_style.v1"
    && finalExcelRequired
    && finalExcelSelections.length === 1
    && finalExcelSelections[0].label_id === outputFlowDecision.recommended_label_id
    && outreg2HelperMultiplicity.necessary;
  if (outputFlowDecision.direct_implementation_allowed && (finalExcelRequired || finalExcelSelections.length)) {
    let directOutreg2Seen = false;
    for (const [file, content] of projectContents.entries()) {
      if (!/\boutreg2(?:_xlsx)?\b/i.test(content)) continue;
      const relative = path.relative(root, file).replace(/\\/g, "/");
      for (const raw of activeLogicalLines(content)) {
        const command = stripStataCommandPrefixes(raw).value;
        const match = command.match(/^outreg2\s+using\s+(?:"([^"]+)"|([^\s,]+))/i);
        if (!match) continue;
        directOutreg2Seen = true;
        const target = match[1] || match[2] || "";
        if (!/\.xls$/i.test(target)) blockers.push({
          rule: "direct_single_sheet_excel_contract_blocked",
          file: relative,
          findings: [{
            rule: "direct_outreg2_requires_xls",
            command,
            target,
            message: "Direct one-sheet outreg2 output must use an explicit .xls target.",
          }],
        });
      }
      const lint = context.lintContent(normalizeStructuralPrefixes(content), "template_reuse_project", relative);
      const directExcelErrors = lint.findings.filter((row) => row.severity === "error" && [
        "direct_outreg2_requires_xls",
        "outreg2_raw_rows_modified",
        "outreg2_missing_nor2",
        "unnecessary_outreg2_program",
      ].includes(row.rule));
      if (directExcelErrors.length) blockers.push({
        rule: "direct_single_sheet_excel_contract_blocked",
        file: relative,
        findings: directExcelErrors,
      });
    }
    if (!directOutreg2Seen) blockers.push({
      rule: "direct_single_sheet_outreg2_missing",
      message: "A declared direct one-sheet final Excel flow must contain visible outreg2 using replace/append code.",
    });
  }
  if (atomicSubstepSchema) {
    for (const [file, content] of projectContents.entries()) {
      const relative = path.relative(root, file).replace(/\\/g, "/");
      const normalizedForLint = normalizeStructuralPrefixes(content);
      const lint = context.lintContent(normalizedForLint, "template_reuse_project", relative);
      const lintErrors = lint.findings.filter((row) => row.severity === "error"
        && !(projectHelperValidated && row.rule === "unnecessary_outreg2_program"));
      const outputAnalysis = analyzeTexOutputContent(content, projectGlobals);
      projectPolicy.files.push({
        file: relative,
        max_loop_depth: lint.summary.max_loop_depth,
        lint_error_count: lintErrors.length,
        tex_output: outputAnalysis.tex_output,
        output_format_macro_issues: outputAnalysis.output_macro_issues,
        prefix_colon_normalized: normalizedForLint !== content,
      });
      if (lintErrors.length) blockers.push({ rule: "project_do_lint_blocked", file: relative, findings: lintErrors });
      if (lint.summary.max_loop_depth > 2) blockers.push({ rule: "project_nested_loop", file: relative, max_loop_depth: lint.summary.max_loop_depth });
      if (outputAnalysis.tex_output) blockers.push({ rule: "project_tex_output", file: relative });
      if (outputAnalysis.output_macro_issues.length) blockers.push({ rule: "project_output_format_macro_ambiguous", file: relative, issues: outputAnalysis.output_macro_issues });
    }
  }

  const programDefinitions = [];
  for (const [file, content] of projectContents.entries()) {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    programDefinitions.push(...extractProgramDefinitions(content, relative));
  }
  const approvedSelections = manifest.selections
    .filter((selection) => selection && typeof selection === "object")
    .map((selection) => labelsById.get(selection.label_id))
    .filter((label) => label?.program_justification?.status === "approved_exception");
  const publicProgramDefinitions = programDefinitions.map(({ body, ...definition }) => definition);
  const allowedProgramCount = approvedSelections.reduce((count, label) => Math.max(count, Number(label.program_justification.maximum_program_definitions || 0)), 0);
  if (programDefinitions.length > allowedProgramCount) blockers.push({ rule: "program_definition_limit_exceeded", allowed: allowedProgramCount, observed: publicProgramDefinitions });
  for (const definition of programDefinitions) {
    const { body, ...publicDefinition } = definition;
    if (definition.name.toLowerCase() !== "outreg2_xlsx" || approvedSelections.length !== 1) blockers.push({ rule: "unapproved_program_definition", definition: publicDefinition });
    if (definition.name.toLowerCase() === "outreg2_xlsx" && approvedSelections.length === 1) {
      if (!outreg2HelperMultiplicity.necessary) {
        blockers.push({
          rule: "unnecessary_outreg2_program",
          definition: { name: definition.name, file: definition.file, line: definition.line, end_line: definition.end_line },
          multiplicity: outreg2HelperMultiplicity,
          required: "at least one resolved caller-supplied estimates() formatter call",
        });
      }
      const unusedOptions = unusedProgramSyntaxOptions(definition.body);
      if (unusedOptions.length) blockers.push({
        rule: "unused_program_syntax_option",
        definition: { name: definition.name, file: definition.file, line: definition.line, end_line: definition.end_line },
        options: unusedOptions,
      });
      let approvedLoopBudget = activeLogicalLines(approvedSelections[0].code).filter((line) => /^(?:foreach|forvalues|while)\b/i.test(stripStataCommandPrefixes(line).value)).length;
      const forbidden = forbiddenProgramBodyCommands(definition.body, projectGlobals).filter((finding) => {
        if (finding.rule !== "loop") return true;
        if (approvedLoopBudget > 0) {
          approvedLoopBudget -= 1;
          return false;
        }
        return true;
      });
      if (forbidden.length) blockers.push({ rule: "canonical_program_body_forbidden_command", definition: { name: definition.name, file: definition.file, line: definition.line, end_line: definition.end_line }, findings: forbidden });
      const statisticsFindings = canonicalOutreg2StatisticsFindings(definition.body);
      if (statisticsFindings.length) blockers.push({ rule: "canonical_outreg2_statistics_contract", definition: { name: definition.name, file: definition.file, line: definition.line, end_line: definition.end_line }, findings: statisticsFindings });
      const scratchFindings = canonicalOutreg2ScratchContractFindings(definition.body);
      if (scratchFindings.length) blockers.push({ rule: "canonical_outreg2_scratch_contract", definition: { name: definition.name, file: definition.file, line: definition.line, end_line: definition.end_line }, findings: scratchFindings });
    }
  }

  return {
    root,
    status: blockers.length ? "needs_revision" : "pass",
    verification_level: "declared_template_provenance_and_structural_command_retention",
    provenance_lock: {
      schema_version: manifest.schema_version,
      plugin_dictionary_sha256: dictionarySha256,
      manifest_sha256: sha256(manifestBytes),
    },
    template_reuse_enforcement: enforceTemplateReuse ? "strict" : "advisory",
    headword_checks: headwordChecks,
    headword_contract: headwordContract,
    substep_checks: substepChecks,
    selection_checks: selectionChecks,
    project_policy: projectPolicy,
    program_policy: {
      definitions: publicProgramDefinitions,
      approved_exception_labels: approvedSelections.map((label) => label.label_id),
      allowed_program_definitions: allowedProgramCount,
      outreg2_helper_multiplicity: outreg2HelperMultiplicity,
    },
    blockers,
    warnings,
    claim_boundary: atomicSubstepSchema
      ? "This schema-2 static check verifies live source bytes and spans under approved provenance roots, target-bound template and native spans, target-derived dictionary matches, all project do-files for lint/loop/TeX policy, and approved program bodies. It does not prove substantive equivalence or runtime correctness."
      : "Schema 1.0 checks declared registry provenance, allowed edit fields, command-order retention, loop depth, and program exceptions; it does not live-verify source bytes or prove substantive equivalence or runtime correctness.",
  };
}

module.exports = {
  templateReuseCheck,
  commandSequence,
  extractSpans,
  extractSourceSpans,
  sha256,
  matchingAutoSelectableLabels,
  collectProjectGlobalEnvironment,
  canonicalOutreg2HelperMultiplicity,
  canonicalOutreg2ScratchContractFindings,
};
