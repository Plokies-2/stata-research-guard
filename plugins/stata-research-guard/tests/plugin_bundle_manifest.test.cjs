"use strict";

const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const VERIFY = path.join(PLUGIN_ROOT, "scripts", "verify_plugin_bundle.cjs");

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function minimalBundle() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-minimal-"));
  fs.mkdirSync(path.join(root, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, ".codex-plugin", "plugin.json"), JSON.stringify({
    name: "stata-research-guard",
    version: "0.0.0-test",
    skills: "./skills/",
  }, null, 2));
  fs.writeFileSync(path.join(root, "README.md"), "# Minimal Stata Research Guard\n");
  fs.writeFileSync(path.join(root, "INSTRUCTIONS.md"), "# Test instructions\n");
  return root;
}

function fullBundle() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-full-"));
  copyTree(PLUGIN_ROOT, root);
  return root;
}

function run(args) {
  return cp.spawnSync(process.execPath, [VERIFY, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function writeManifest(root) {
  const written = run(["--plugin-root", root, "--write-manifest"]);
  assert.equal(written.status, 0, written.stderr || written.stdout);
  const manifestPath = path.join(root, "data", "plugin_bundle_manifest.json");
  assert.ok(fs.existsSync(manifestPath));
  return manifestPath;
}

test("checked-in bundle manifest matches the canonical source tree", () => {
  const checked = run(["--plugin-root", PLUGIN_ROOT]);
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);
  assert.equal(JSON.parse(checked.stdout).status, "pass");
});

test("manifest verification is independent of the current bundle manifest", (t) => {
  const minimal = minimalBundle();
  const full = fullBundle();
  t.after(() => {
    fs.rmSync(minimal, { recursive: true, force: true });
    fs.rmSync(full, { recursive: true, force: true });
  });

  assert.equal(fs.existsSync(path.join(minimal, "data", "plugin_bundle_manifest.json")), false);
  const minimalManifest = writeManifest(minimal);
  const fullManifest = writeManifest(full);
  const minimalJson = JSON.parse(fs.readFileSync(minimalManifest, "utf8"));
  const fullJson = JSON.parse(fs.readFileSync(fullManifest, "utf8"));
  assert.equal(minimalJson.schema_version, "1.0");
  assert.equal(minimalJson.plugin.name, "stata-research-guard");
  assert.ok(minimalJson.inventory.length >= 3);
  assert.ok(minimalJson.semantic_anchors.length >= 2);
  assert.ok(fullJson.inventory.length > minimalJson.inventory.length);
  assert.equal(minimalJson.inventory.some((row) => row.path === "data/plugin_bundle_manifest.json"), false);
  assert.equal(fullJson.inventory.some((row) => /__pycache__\/.*\.pyc$/.test(row.path)), false);

  for (const root of [minimal, full]) {
    const checked = run(["--plugin-root", root]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    assert.equal(JSON.parse(checked.stdout).status, "pass");
  }
});

test("one-byte mutation fails the inventory hash check", (t) => {
  const root = minimalBundle();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeManifest(root);
  const target = path.join(root, "README.md");
  const bytes = fs.readFileSync(target);
  bytes[0] ^= 1;
  fs.writeFileSync(target, bytes);
  const checked = run(["--plugin-root", root]);
  assert.notEqual(checked.status, 0);
  const result = JSON.parse(checked.stdout);
  assert.ok(result.errors.some((error) => error.type === "hash_mismatch" && error.path === "README.md"));
});

test("plugin version mutation fails metadata and inventory checks", (t) => {
  const root = minimalBundle();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeManifest(root);
  const metadataPath = path.join(root, ".codex-plugin", "plugin.json");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  metadata.version = "0.0.1-mutated";
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  const checked = run(["--plugin-root", root]);
  assert.notEqual(checked.status, 0);
  const result = JSON.parse(checked.stdout);
  assert.ok(result.errors.some((error) => error.type === "plugin_version"));
  assert.ok(result.errors.some((error) => error.path === ".codex-plugin/plugin.json"));
});

test("an unexpected bundle file fails the exact inventory check", (t) => {
  const root = minimalBundle();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeManifest(root);
  fs.writeFileSync(path.join(root, "unexpected.txt"), "not part of the bundle\n");
  const checked = run(["--plugin-root", root]);
  assert.notEqual(checked.status, 0);
  const result = JSON.parse(checked.stdout);
  assert.ok(result.errors.some((error) => error.type === "unexpected_file" && error.path === "unexpected.txt"));
});
