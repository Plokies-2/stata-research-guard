"use strict";

// Aligns the /// continuation markers of each continued Stata command in one column.
// Only the spaces before a marker change; the code before it and the marker with its comment stay byte for byte.
// Blocks it cannot read safely are left alone: files with #delimit, lines with tabs before the marker,
// comment lines, and lines inside /* */ blocks.
//
// node stata-align.cjs file.do [--lines 10-40,80-90] [--check]

const fs = require("node:fs");

// Index of the /// marker outside strings, or -1. A // comment that is not /// also gives -1.
function markerIndex(line) {
  let inString = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') inString = !inString;
    if (inString || line[i] !== "/" || line[i + 1] !== "/") continue;
    if (i > 0 && !/\s/.test(line[i - 1])) continue;
    return line[i + 2] === "/" ? i : -1;
  }
  return -1;
}

// Runs of consecutive lines ending in ///, as [first, last] 0-based indexes with each line's split point.
function continuationBlocks(lines) {
  const blocks = [];
  let current = null;
  let inComment = false;
  lines.forEach((line, index) => {
    const opens = line.lastIndexOf("/*");
    const closes = line.lastIndexOf("*/");
    const wasInComment = inComment;
    if (opens > closes) inComment = true;
    else if (closes > opens) inComment = false;
    const marker = wasInComment || inComment || (!current && /^\s*\*/.test(line)) ? -1 : markerIndex(line);
    if (marker < 0) {
      current = null;
      return;
    }
    if (!current) {
      current = { first: index, last: index, markers: [] };
      blocks.push(current);
    }
    current.last = index;
    current.markers.push(marker);
  });
  return blocks;
}

// Returns the aligned text and the 1-based line ranges of blocks it changed.
function alignContinuations(text, ranges = null) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  if (lines.some((line) => /^\s*#delimit\b/.test(line))) return { text, changed: [] };
  const wanted = (first, last) => !ranges || ranges.some(([from, to]) => first + 1 <= to && last + 1 >= from);
  const changed = [];
  for (const block of continuationBlocks(lines)) {
    if (!wanted(block.first, block.last)) continue;
    const parts = block.markers.map((marker, offset) => {
      const line = lines[block.first + offset];
      return { code: line.slice(0, marker).trimEnd(), rest: line.slice(marker) };
    });
    if (parts.some(({ code }) => code.includes("\t"))) continue;
    const column = Math.max(...parts.map(({ code }) => code.length)) + 1;
    const aligned = parts.map(({ code, rest }) => code + " ".repeat(column - code.length) + rest);
    if (aligned.every((line, offset) => line === lines[block.first + offset])) continue;
    aligned.forEach((line, offset) => { lines[block.first + offset] = line; });
    changed.push([block.first + 1, block.last + 1]);
  }
  return { text: lines.join(eol), changed };
}

function parseRanges(value) {
  return value.split(",").map((part) => {
    const [from, to = from] = part.split("-").map(Number);
    if (!Number.isInteger(from) || !Number.isInteger(to)) throw new Error(`bad --lines range: ${part}`);
    return [from, to];
  });
}

module.exports = { alignContinuations };

if (require.main === module) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const linesAt = args.indexOf("--lines");
  const ranges = linesAt >= 0 ? parseRanges(args[linesAt + 1]) : null;
  const files = args.filter((arg, index) => !arg.startsWith("--") && (linesAt < 0 || index !== linesAt + 1));
  for (const file of files) {
    const before = fs.readFileSync(file, "utf8");
    const { text, changed } = alignContinuations(before, ranges);
    for (const [from, to] of changed) console.log(`${file} lines ${from}-${to}: ${check ? "not aligned" : "aligned"}`);
    if (!check && changed.length) fs.writeFileSync(file, text, "utf8");
  }
}
