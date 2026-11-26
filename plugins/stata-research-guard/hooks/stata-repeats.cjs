"use strict";

// Finds text that a .do file writes more than once: a value computed again with the same expression,
// runs of identical commands, and macro values that repeat another macro or appear again as literals.
// It also lists loops that look up an item's group with if or a string match instead of looping over the group.
// Options repeated across estimation or output commands are left alone: they belong in each command.
// It reports locations only; whether to share one definition is the author's call.

const fs = require("node:fs");
const path = require("node:path");

const minGroupLength = 25;
const minCommandLength = 12;

// Join /// continuations, drop comments and collapse spaces. Each logical line keeps its first and last physical line numbers.
function logicalLines(text) {
  const result = [];
  let current = null;
  let inBlock = false;
  String(text).split(/\r?\n/).forEach((raw, index) => {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end < 0) return;
      line = line.slice(end + 2);
      inBlock = false;
    }
    line = line.replace(/\/\*.*?\*\//g, " ");
    const open = line.indexOf("/*");
    if (open >= 0) {
      line = line.slice(0, open);
      inBlock = true;
    }
    if (!current && /^\s*\*/.test(line)) return;
    const marker = line.match(/(^|\s)\/\/(\/?)/);
    const continues = Boolean(marker && marker[2]);
    if (marker) line = line.slice(0, marker.index);
    const piece = line.replace(/\s+/g, " ").trim();
    if (current) current.text = `${current.text} ${piece}`.trim();
    else current = { line: index + 1, end: index + 1, text: piece };
    current.end = index + 1;
    if (!continues) {
      if (current.text) result.push(current);
      current = null;
    }
  });
  if (current && current.text) result.push(current);
  return result;
}

// name(...) with balanced parentheses, e.g. subinstr(...), cond(...).
function parenGroups(text) {
  const groups = [];
  for (const match of text.matchAll(/[A-Za-z_]\w*\(/g)) {
    let depth = 0;
    for (let i = match.index + match[0].length - 1; i < text.length; i += 1) {
      if (text[i] === "(") depth += 1;
      if (text[i] === ")" && --depth === 0) {
        groups.push(text.slice(match.index, i + 1));
        break;
      }
    }
  }
  return groups;
}

function repeatedGroups(lines) {
  const seen = new Map();
  // Only commands that compute a value; options of estimation and output commands stay in place.
  const computes = /^(?:(?:local|global|scalar)\s+\w+\s*=|(?:gen|generate|replace|egen)\b)/;
  for (const { line, text } of lines.filter(({ text }) => computes.test(text))) {
    for (const group of new Set(parenGroups(text))) {
      // Reusing a macro such as keep($event_coefficients) is the fix, not a repeat.
      if (group.replace(/\$\w+|`\w+'/g, "").length < minGroupLength) continue;
      if (!seen.has(group)) seen.set(group, []);
      seen.get(group).push(line);
    }
  }
  const repeated = [...seen].filter(([, at]) => at.length > 1).sort((a, b) => b[0].length - a[0].length);
  const kept = [];
  for (const [group, at] of repeated) {
    // An inner group repeated only inside a repeated outer group is the same finding.
    if (kept.some((outer) => outer.text.includes(group) && at.every((line) => outer.lines.includes(line)))) continue;
    kept.push({ kind: "repeated expression", text: group, lines: at });
  }
  return kept;
}

// Two or more consecutive commands written again elsewhere in the same order.
function repeatedRuns(lines) {
  const runs = [];
  const same = (i, j) => lines[i].text === lines[j].text && lines[i].text.length >= minCommandLength;
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!same(i, j) || (i > 0 && same(i - 1, j - 1))) continue;
      let length = 1;
      while (i + length < j && j + length < lines.length && same(i + length, j + length)) length += 1;
      if (length < 2) continue;
      runs.push({ kind: "repeated commands", text: lines[i].text,
        lines: [lines[i].line, lines[j].line], spans: [[lines[i].line, lines[i + length - 1].line], [lines[j].line, lines[j + length - 1].line]] });
    }
  }
  return runs;
}

function macroDefinitions(lines) {
  const definitions = [];
  for (const { line, text } of lines) {
    const match = text.match(/^(local|global)\s+(\w+)\s*(=)?\s*(.*)$/);
    if (!match || match[3] || /[()]/.test(match[4])) continue;
    const value = match[4].replace(/^`?"/, "").replace(/"'?$/, "").trim();
    const items = value.split(" ").filter((item) => item && !/[`'$"]/.test(item));
    definitions.push({ type: match[1], name: match[2], line, value, items });
  }
  return definitions;
}

function repeatedMacroValues(lines) {
  const findings = [];
  const definitions = macroDefinitions(lines);
  const ref = (d) => (d.type === "global" ? `$${d.name}` : `\`${d.name}'`);
  for (const a of definitions) {
    const renamed = a.value.match(/^(\$\w+|`\w+')$/);
    if (renamed) findings.push({ kind: "second name for a macro", text: `${ref(a)} only holds ${renamed[1]}: use ${renamed[1]}`, lines: [a.line] });
    if (a.items.length < 2) continue;
    for (const b of definitions) {
      if (a === b || a.name === b.name || b.items.length < a.items.length) continue;
      if (!a.items.every((item) => b.items.includes(item))) continue;
      const equal = a.items.length === b.items.length;
      if (equal && b.line < a.line) continue; // report an equal pair once
      findings.push({ kind: equal ? "same macro value" : "macro value contained in another",
        text: `${ref(a)} (${a.items.join(" ")}) ${equal ? "equals" : "is inside"} ${ref(b)}`, lines: [a.line, b.line] });
    }
    const literal = a.items.join(" ");
    const elsewhere = lines.filter(({ line, text }) => line !== a.line && !/^(local|global)\s/.test(text) && text.includes(literal));
    if (elsewhere.length) {
      findings.push({ kind: "literal repeats a macro", text: `${literal} is written again instead of ${ref(a)}`,
        lines: [a.line, ...elsewhere.map(({ line }) => line)] });
    }
  }
  return findings;
}

// A loop item checked against a group global, or matched by pattern, to decide what to do with it.
function membershipBranches(lines) {
  const member = /\bif\s+"`\w+'"\s*==\s*"\$\w+"|\b(?:strpos|ustrpos|strmatch|regexm)\(\s*"`\w+'"/;
  return lines.filter(({ text }) => member.test(text))
    .map(({ line, text }) => ({ kind: "membership looked up with if", text, lines: [line] }));
}

// changed: physical line numbers edited in this turn, or null to report every finding.
function findRepeats(text, changed = null) {
  const lines = logicalLines(text);
  const findings = [...repeatedGroups(lines), ...repeatedRuns(lines), ...repeatedMacroValues(lines), ...membershipBranches(lines)];
  if (!changed) return findings;
  const endOf = new Map(lines.map(({ line, end }) => [line, end]));
  const touched = (from, to) => [...changed].some((line) => line >= from && line <= to);
  return findings.filter((finding) => (finding.spans ?? finding.lines.map((line) => [line, endOf.get(line) ?? line]))
    .some(([from, to]) => touched(from, to)));
}

// Physical lines of the file whose text matches a line added in this turn. Braces and blank lines match too much to count.
function changedLineNumbers(text, added) {
  const wanted = new Set(added.map((line) => line.trim()).filter((line) => /[A-Za-z0-9]/.test(line)));
  const changed = new Set();
  String(text).split(/\r?\n/).forEach((line, index) => {
    if (wanted.has(line.trim())) changed.add(index + 1);
  });
  return changed;
}

function formatFinding(file, finding) {
  const where = finding.spans
    ? finding.spans.map(([from, to]) => `${from}-${to}`).join(" and ")
    : finding.lines.join(", ");
  const text = finding.text.length > 120 ? `${finding.text.slice(0, 117)}...` : finding.text;
  return `${path.basename(file)} lines ${where}: ${finding.kind}: ${text}`;
}

module.exports = { changedLineNumbers, findRepeats, formatFinding, logicalLines };

if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    for (const finding of findRepeats(fs.readFileSync(file, "utf8"))) console.log(formatFinding(file, finding));
  }
}
