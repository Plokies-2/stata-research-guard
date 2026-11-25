"use strict";

const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const VERIFY = path.join(PLUGIN_ROOT, "scripts", "verify_plugin_bundle.cjs");

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
  fs.cpSync(PLUGIN_ROOT, root, { recursive: true });
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

test("byte, version and extra-file mutations each fail verification", (t) => {
  const mutations = [
    ["hash_mismatch", "README.md", (root) => {
      const target = path.join(root, "README.md");
      const bytes = fs.readFileSync(target);
      bytes[0] ^= 1;
      fs.writeFileSync(target, bytes);
    }],
    ["plugin_version", ".codex-plugin/plugin.json", (root) => {
      const metadataPath = path.join(root, ".codex-plugin", "plugin.json");
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      metadata.version = "0.0.1-mutated";
      fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    }],
    ["unexpected_file", "unexpected.txt", (root) => {
      fs.writeFileSync(path.join(root, "unexpected.txt"), "not part of the bundle\n");
    }],
  ];
  for (const [type, relative, mutate] of mutations) {
    const root = minimalBundle();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    writeManifest(root);
    mutate(root);
    const checked = run(["--plugin-root", root]);
    assert.notEqual(checked.status, 0, type);
    const result = JSON.parse(checked.stdout);
    assert.ok(result.errors.some((error) => error.type === type), type);
    assert.ok(result.errors.some((error) => error.path === relative), relative);
  }
});

test("Codex and Claude Code manifests describe the same plugin release", () => {
  const readManifest = (relative) => JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, relative), "utf8"));
  const codex = readManifest(".codex-plugin/plugin.json");
  const claude = readManifest(".claude-plugin/plugin.json");
  const marketplace = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "..", "..", ".claude-plugin", "marketplace.json"), "utf8"));
  const coreVersion = (version) => version.split("+")[0];
  assert.equal(claude.name, codex.name);
  assert.equal(claude.description, codex.description);
  assert.equal(coreVersion(claude.version), coreVersion(codex.version));
  assert.deepEqual(marketplace.plugins.map((plugin) => plugin.name), [codex.name]);
  assert.equal(claude.mcpServers.stataResearchGuard.args[0], "${CLAUDE_PLUGIN_ROOT}/mcp/server.cjs");
});

test("the MCP server reports the build of the host that started it", () => {
  const init = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } } }) + "\n";
  const version = (host) => {
    const env = { ...process.env };
    if (host) env.STATA_GUARD_HOST = host; else delete env.STATA_GUARD_HOST;
    const output = cp.spawnSync(process.execPath, [path.join(PLUGIN_ROOT, "mcp", "server.cjs")], { input: init, env, encoding: "utf8", timeout: 10000 });
    return JSON.parse(output.stdout.trim().split("\n")[0]).result.serverInfo.version;
  };
  const read = (relative) => JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, relative), "utf8")).version;
  assert.equal(version("claude"), read(".claude-plugin/plugin.json"));
  assert.equal(version(null), read(".codex-plugin/plugin.json"));
});
