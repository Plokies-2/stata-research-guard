"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "data" ? [] : markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

test("relative links in the skills and plugin documents point to existing files", () => {
  const missing = [];
  for (const file of markdownFiles(ROOT)) {
    const text = fs.readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(?:[a-z]+:|#)/i.test(target)) continue;
      const relative = decodeURIComponent(target.split("#")[0]);
      if (!fs.existsSync(path.resolve(path.dirname(file), relative))) {
        missing.push(`${path.relative(ROOT, file)} -> ${target}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});
