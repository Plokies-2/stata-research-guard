"use strict";

/*
 * Verify the bytes and the small set of semantic invariants that make up an
 * installed Stata Research Guard bundle.  This file intentionally uses only
 * Node's standard library so it can also be used before npm dependencies are
 * available.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const MANIFEST_RELATIVE_PATH = "data/plugin_bundle_manifest.json";
const SCHEMA_VERSION = "1.0";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function relativePath(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

function isExcluded(relative) {
  const parts = relative.split("/");
  return relative === MANIFEST_RELATIVE_PATH
    || (parts.includes("__pycache__") && path.posix.extname(relative) === ".pyc");
}

function walkFiles(root, current = root, output = []) {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walkFiles(root, target, output);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`unsupported non-regular bundle entry: ${relativePath(root, target)}`);
    }
    const relative = relativePath(root, target);
    if (!isExcluded(relative)) output.push(target);
  }
  return output;
}

function inventoryFor(root) {
  return walkFiles(root).map((target) => {
    const bytes = fs.readFileSync(target);
    return {
      path: relativePath(root, target),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
}

function readJson(root, relative) {
  const target = path.join(root, ...relative.split("/"));
  const bytes = fs.readFileSync(target);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function firstHeading(text) {
  return text.split(/\r?\n/).map((line) => line.trim())
    .find((line) => /^#{1,6}\s+\S/.test(line)) || null;
}

function semanticAnchorsFor(root, plugin) {
  const anchors = [
    {
      id: "plugin.name",
      path: ".codex-plugin/plugin.json",
      kind: "json",
      selector: "name",
      value: plugin.name,
    },
    {
      id: "plugin.version",
      path: ".codex-plugin/plugin.json",
      kind: "json",
      selector: "version",
      value: plugin.version,
    },
  ];

  // These anchors are deliberately semantic (rather than another copy of
  // every file hash): they catch a bundle whose declared public entry point
  // was changed while retaining the same file inventory shape.
  for (const relative of ["README.md", "INSTRUCTIONS.md"]) {
    const target = path.join(root, ...relative.split("/"));
    if (!fs.existsSync(target)) continue;
    const heading = firstHeading(new TextDecoder("utf-8", { fatal: true })
      .decode(fs.readFileSync(target)));
    if (heading) {
      anchors.push({
        id: `${relative.replace(/\.md$/i, "").toLowerCase()}.heading`,
        path: relative,
        kind: "text_heading",
        value: heading,
      });
    }
  }

  return anchors;
}

function buildManifest(pluginRoot) {
  const plugin = readJson(pluginRoot, ".codex-plugin/plugin.json");
  if (!plugin || typeof plugin.name !== "string" || typeof plugin.version !== "string") {
    throw new Error(".codex-plugin/plugin.json must declare string name and version");
  }
  return {
    schema_version: SCHEMA_VERSION,
    plugin: { name: plugin.name, version: plugin.version },
    inventory: inventoryFor(pluginRoot),
    semantic_anchors: semanticAnchorsFor(pluginRoot, plugin),
  };
}

function manifestPath(pluginRoot, explicitPath) {
  if (!explicitPath) return path.join(pluginRoot, ...MANIFEST_RELATIVE_PATH.split("/"));
  return path.isAbsolute(explicitPath)
    ? explicitPath
    : path.resolve(pluginRoot, explicitPath);
}

function mapInventory(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row || typeof row.path !== "string") continue;
    map.set(row.path.replaceAll("\\", "/"), row);
  }
  return map;
}

function semanticAnchorValue(root, anchor) {
  if (!anchor || typeof anchor !== "object" || typeof anchor.path !== "string") {
    return { error: "anchor is not an object with a path" };
  }
  const target = path.resolve(root, ...anchor.path.split("/"));
  const rootWithSep = path.resolve(root) + path.sep;
  if (target !== path.resolve(root) && !target.startsWith(rootWithSep)) {
    return { error: `anchor path escapes plugin root: ${anchor.path}` };
  }
  if (!fs.existsSync(target)) return { error: `anchor file is missing: ${anchor.path}` };
  try {
    const bytes = fs.readFileSync(target);
    if (anchor.kind === "json") {
      const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))[anchor.selector];
      return { value };
    }
    if (anchor.kind === "text_heading") return { value: firstHeading(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
    return { error: `unsupported semantic anchor kind: ${anchor.kind}` };
  } catch (error) {
    return { error: `cannot read semantic anchor ${anchor.id || anchor.path}: ${error.message}` };
  }
}

function verifyManifest(pluginRoot, manifest, options = {}) {
  const errors = [];
  const pluginPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  let plugin;
  try {
    plugin = readJson(pluginRoot, ".codex-plugin/plugin.json");
  } catch (error) {
    errors.push({ type: "plugin_metadata", message: `cannot read plugin metadata: ${error.message}` });
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    errors.push({ type: "manifest", message: "manifest must be a JSON object" });
    return result(pluginRoot, errors, { manifest });
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    errors.push({ type: "schema_version", expected: SCHEMA_VERSION, actual: manifest.schema_version });
  }
  if (!manifest.plugin || typeof manifest.plugin !== "object") {
    errors.push({ type: "plugin_metadata", message: "manifest.plugin is missing" });
  } else if (plugin) {
    for (const key of ["name", "version"]) {
      if (manifest.plugin[key] !== plugin[key]) {
        errors.push({ type: `plugin_${key}`, expected: plugin[key], actual: manifest.plugin[key] });
      }
    }
  }

  const expectedInventory = inventoryFor(pluginRoot);
  const declaredInventory = Array.isArray(manifest.inventory)
    ? manifest.inventory
    : (Array.isArray(manifest.files) ? manifest.files : null);
  if (!declaredInventory) {
    errors.push({ type: "inventory", message: "manifest.inventory must be an array" });
  } else {
    const expected = mapInventory(expectedInventory);
    const declared = mapInventory(declaredInventory);
    for (const [file, row] of expected) {
      if (!declared.has(file)) {
        errors.push({ type: "unexpected_file", path: file });
        continue;
      }
      const actual = declared.get(file);
      for (const key of ["bytes", "sha256"]) {
        if (actual[key] !== row[key]) {
          errors.push({ type: key === "bytes" ? "byte_mismatch" : "hash_mismatch", path: file, expected: row[key], actual: actual[key] });
        }
      }
    }
    for (const file of declared.keys()) {
      if (!expected.has(file)) errors.push({ type: "missing_file", path: file });
    }
    if (declared.size !== declaredInventory.length) {
      errors.push({ type: "duplicate_inventory_path", message: "manifest inventory contains duplicate paths" });
    }
  }

  if (!Array.isArray(manifest.semantic_anchors)) {
    errors.push({ type: "semantic_anchors", message: "manifest.semantic_anchors must be an array" });
  } else {
    for (const anchor of manifest.semantic_anchors) {
      const observed = semanticAnchorValue(pluginRoot, anchor);
      if (observed.error) {
        errors.push({ type: "semantic_anchor", id: anchor?.id, message: observed.error });
      } else if (observed.value !== anchor.value) {
        errors.push({ type: "semantic_anchor_mismatch", id: anchor?.id, path: anchor?.path, expected: anchor.value, actual: observed.value });
      }
    }
  }

  return result(pluginRoot, errors, { manifest, pluginPath, options });
}

function result(pluginRoot, errors, extra = {}) {
  return {
    status: errors.length === 0 ? "pass" : "fail",
    plugin_root: path.resolve(pluginRoot),
    errors,
    ...extra,
  };
}

function verifyPluginBundle(pluginRoot, options = {}) {
  const target = manifestPath(pluginRoot, options.manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(target)));
  } catch (error) {
    return result(pluginRoot, [{ type: "manifest_read", message: `cannot read manifest ${relativePath(pluginRoot, target)}: ${error.message}` }], { manifest_path: target });
  }
  return verifyManifest(pluginRoot, manifest, { manifest_path: target });
}

function parseArgs(argv) {
  const options = { pluginRoot: path.resolve(__dirname, ".."), writeManifest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--plugin-root") {
      if (!argv[index + 1]) throw new Error("--plugin-root requires a path");
      options.pluginRoot = path.resolve(argv[++index]);
    } else if (arg === "--write-manifest") {
      options.writeManifest = true;
    } else if (arg === "--manifest-path") {
      if (!argv[index + 1]) throw new Error("--manifest-path requires a path");
      options.manifestPath = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write("Usage: node verify_plugin_bundle.cjs [--plugin-root PATH] [--write-manifest] [--manifest-path PATH]\n");
    return 0;
  }
  if (options.writeManifest) {
    const built = buildManifest(options.pluginRoot);
    const target = manifestPath(options.pluginRoot, options.manifestPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(built, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: "written", manifest_path: target, file_count: built.inventory.length })}\n`);
    return 0;
  }
  const checked = verifyPluginBundle(options.pluginRoot, options);
  process.stdout.write(`${JSON.stringify(checked, null, 2)}\n`);
  return checked.status === "pass" ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  MANIFEST_RELATIVE_PATH,
  SCHEMA_VERSION,
  buildManifest,
  inventoryFor,
  semanticAnchorsFor,
  verifyManifest,
  verifyPluginBundle,
  main,
};
