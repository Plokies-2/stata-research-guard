"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const TIMEOUT_MS = 55000;
const cache = new Map();
const inFlight = new Map();
let queue = Promise.resolve();

function readHelpText(file) {
  const bytes = fs.readFileSync(file);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252", { fatal: true }).decode(bytes);
  }
}

function discoverStataPath() {
  const candidates = process.env.STATA_PATH ? [process.env.STATA_PATH] : [];
  if (process.platform === "win32") {
    for (const name of ["StataMP-64.exe", "StataSE-64.exe", "StataBE-64.exe", "Stata-64.exe"]) {
      candidates.push(path.join("C:\\Program Files\\Stata18", name));
    }
  } else {
    for (const name of ["stata-mp", "stata-se", "stata"]) {
      for (const directory of (process.env.PATH || "").split(path.delimiter)) {
        if (directory) candidates.push(path.join(directory, name));
      }
    }
  }
  return candidates.map((candidate) => path.resolve(candidate)).find((candidate) => {
    try {
      fs.accessSync(candidate, process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) || null;
}

function stataPath(file) {
  return path.resolve(file).replaceAll("\\", "/").replaceAll('"', '""');
}

function timeoutError() {
  return new Error("Live Stata help exceeded its 55-second budget, including queue wait.");
}

// Wait for close after terminating an expired process. The caller has its own
// deadline; keeping this promise pending until close prevents overlapping jobs.
function runStataBatch(stata, doFile, cwd, marker, deadline) {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(timeoutError());
    let child;
    let expired = false;
    let completed = false;
    let timer;
    let poll;
    const finish = (error) => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      clearTimeout(poll);
      if (error) reject(error);
      else resolve();
    };
    try {
      // The working directory already identifies the workspace. Keep its braces
      // out of Stata's command-line parser by passing the script relative to it.
      const script = path.isAbsolute(doFile) ? path.relative(cwd, doFile) : doFile;
      child = childProcess.spawn(stata, process.platform === "win32"
        ? ["/e", "do", script]
        : ["-b", "do", script], { cwd, windowsHide: true, stdio: "ignore" });
    } catch (error) {
      finish(error);
      return;
    }
    timer = setTimeout(() => {
      expired = true;
      try {
        child.kill("SIGKILL");
      } catch (error) {
        finish(error);
      }
    }, remaining);
    child.once("error", (error) => finish(error));
    child.once("close", (code, signal) => {
      if (expired) return finish(timeoutError());
      if (code !== 0) return finish(new Error(`Live Stata help process exited with code ${code}, signal ${signal || "none"}.`));
      const waitForMarker = () => {
        if (completed) return;
        if (Date.now() >= deadline) return finish(timeoutError());
        if (fs.existsSync(marker)) return finish();
        poll = setTimeout(waitForMarker, Math.min(100, deadline - Date.now()));
      };
      // Some Windows Stata launchers return before their output marker arrives.
      clearTimeout(timer);
      waitForMarker();
    });
  });
}

async function locateInstalledHelp(stata, topic, workspace, deadline) {
  const resultFile = path.join(workspace, "located.txt");
  const doFile = path.join(workspace, "locate.do");
  fs.writeFileSync(doFile, [
    "version 18",
    "set more off",
    `capture findfile ${topic}.sthlp`,
    "local lookup_rc = _rc",
    "if `lookup_rc' {",
    `    capture findfile ${topic}.hlp`,
    "    local lookup_rc = _rc",
    "}",
    "if !`lookup_rc' local help_path `\"`r(fn)'\"'",
    `file open guard_help using "${stataPath(resultFile)}", write text replace`,
    "if `lookup_rc' file write guard_help \"NOT_FOUND\"",
    "else {",
    "    file write guard_help \"FOUND\" _n",
    "    file write guard_help `\"`help_path'\"'",
    "}",
    "file close guard_help",
    "exit, clear",
  ].join("\n"), "utf8");
  await runStataBatch(stata, doFile, workspace, resultFile, deadline);
  const [status, ...sourceLines] = readHelpText(resultFile).split(/\r?\n/);
  if (status.trim() === "NOT_FOUND") return null;
  if (status.trim() !== "FOUND") throw new Error("Live Stata help lookup returned an incomplete result.");
  return sourceLines.join("\n").trim();
}

function includeCandidates(sourceFile, name, alias, searchRoots) {
  const sourceDir = path.dirname(sourceFile);
  const parentDir = path.dirname(sourceDir);
  const files = /\.(?:sthlp|hlp|ihlp)$/i.test(name)
    ? [name]
    : alias ? [`${name}.sthlp`, `${name}.hlp`] : [`${name}.ihlp`];
  const local = files.flatMap((file) => [
    path.join(sourceDir, file),
    path.join(sourceDir, file[0].toLowerCase(), file),
    path.join(parentDir, file),
    path.join(parentDir, file[0].toLowerCase(), file),
  ]);
  return local.concat(searchRoots.flatMap((root) => files.flatMap((file) => [
    path.join(root, file),
    path.join(root, file[0].toLowerCase(), file),
  ])));
}

function expandHelpIncludes(sourceFile, searchRoots = [], stack = new Set()) {
  const resolved = fs.realpathSync(sourceFile);
  stack.add(resolved);
  const output = [];
  const unresolved = [];
  const sourceFiles = new Map();
  sourceFiles.set(resolved, crypto.createHash("sha256").update(fs.readFileSync(resolved)).digest("hex"));
  try {
    for (const line of readHelpText(resolved).split(/\r?\n/)) {
      const include = line.match(/^\s*INCLUDE\s+help\s+([A-Za-z0-9_.-]+)\s*$/i);
      const alias = line.match(/^\s*\.h\s+([A-Za-z0-9_.-]+)\s*$/i);
      const name = include?.[1] || alias?.[1];
      if (!name) {
        output.push(line);
        continue;
      }
      const candidate = includeCandidates(resolved, name, !!alias, searchRoots).find((file) => fs.existsSync(file));
      const target = candidate ? fs.realpathSync(candidate) : null;
      if (!target || stack.has(target)) {
        output.push(line);
        unresolved.push(`${target ? "cyclic" : "unresolved"} ${alias ? "help alias" : "INCLUDE help"}: ${name}`);
        continue;
      }
      const expanded = expandHelpIncludes(target, searchRoots, stack);
      output.push(expanded.content);
      unresolved.push(...expanded.unresolved);
      for (const entry of expanded.sourceFiles) sourceFiles.set(...entry);
    }
  } finally {
    stack.delete(resolved);
  }
  return { content: output.join("\n"), unresolved: [...new Set(unresolved)], sourceFiles: [...sourceFiles] };
}

async function renderInstalledHelp(stata, sourceFile, topic, workspace, deadline) {
  const expandedFile = path.join(workspace, `${topic}.sthlp`);
  const renderedFile = path.join(workspace, `${topic}.txt`);
  const statusFile = path.join(workspace, "rendered.status");
  const doFile = path.join(workspace, "render.do");
  const officialAdo = path.join(path.dirname(stata), "ado");
  const expanded = expandHelpIncludes(sourceFile, [
    path.join(officialAdo, "updates"), path.join(officialAdo, "base"),
  ]);
  fs.writeFileSync(expandedFile, expanded.content, "utf8");
  fs.writeFileSync(doFile, [
    "version 18",
    "set more off",
    `capture noisily translate "${stataPath(expandedFile)}" "${stataPath(renderedFile)}", translator(smcl2txt) replace header(off) logo(off) cmdnumber(off) lmargin(0) linesize(255) pagelines(0)`,
    "local translate_rc = _rc",
    `file open guard_status using "${stataPath(statusFile)}", write text replace`,
    "file write guard_status `\"`translate_rc'\"'",
    "file close guard_status",
    "exit, clear",
  ].join("\n"), "utf8");
  await runStataBatch(stata, doFile, workspace, statusFile, deadline);
  const rc = readHelpText(statusFile).trim();
  if (rc !== "0" || !fs.existsSync(renderedFile)) throw new Error(`Live Stata help rendering failed: translate rc=${rc}.`);
  return { content: readHelpText(renderedFile).trim(), unresolved: expanded.unresolved, sourceFiles: expanded.sourceFiles };
}

function unavailable(message) {
  return { status: "unavailable", help: null, limitations: [message] };
}

async function loadHelp(stata, topic, deadline) {
  if (Date.now() >= deadline) return unavailable(timeoutError().message);
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "stata-guard-help-"));
  try {
    const sourceFile = await locateInstalledHelp(stata, topic, workspace, deadline);
    if (!sourceFile || !fs.existsSync(sourceFile)) return unavailable(`help ${topic} was not found on the active Stata ado-path.`);
    const rendered = await renderInstalledHelp(stata, sourceFile, topic, workspace, deadline);
    const limitations = [
      "This exact-topic fallback is a snapshot from the selected Stata installation, not a bundled registry entry. Refresh after changing the installation or ado-path.",
      "No bundled PDF expansion or paper example catalog is attached for an out-of-dictionary topic.",
      ...rendered.unresolved,
    ];
    const officialRoot = path.resolve(path.dirname(stata), "ado");
    const relative = path.relative(officialRoot, sourceFile).replaceAll("\\", "/");
    return {
      status: rendered.unresolved.length ? "partial" : "available",
      help: {
        command: topic,
        authority: /^(?:base|updates)\//i.test(relative)
          ? "StataCorp official help from selected Stata installation"
          : "installed package help from selected Stata ado-path",
        source_kind: "live_installed_help",
        source_version: "selected Stata installation snapshot",
        source_path: sourceFile,
        source_files: rendered.sourceFiles.map(([source_path, source_sha256]) => ({ source_path, source_sha256 })),
        content_sha256: crypto.createHash("sha256").update(rendered.content, "utf8").digest("hex"),
        retrieved_at: new Date().toISOString(),
        help_topics: [topic],
        limitations,
        content: rendered.content,
      },
      limitations,
    };
  } catch (error) {
    return unavailable(error.message);
  } finally {
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
    } catch {
      // Stata can briefly retain its own batch-log handle on Windows.
    }
  }
}

async function lookupLiveStataHelp(command, { refresh = false } = {}) {
  const deadline = Date.now() + TIMEOUT_MS;
  if (typeof command !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(command)) {
    throw new Error(`ABORT invalid_help_topic: ${JSON.stringify(command)}`);
  }
  const stata = discoverStataPath();
  if (!stata) return unavailable("No Stata executable was found through STATA_PATH or the supported Stata installation paths.");
  const key = `${stata}\0${command}`;
  if (refresh) cache.delete(key);
  if (inFlight.has(key)) return inFlight.get(key);
  if (cache.has(key)) return cache.get(key);
  let timer;
  const expired = new Promise((resolve) => {
    timer = setTimeout(() => resolve(unavailable(timeoutError().message)), Math.max(0, deadline - Date.now()));
  });
  const job = queue.then(() => loadHelp(stata, command, deadline)).catch((error) => unavailable(error.message)).then((result) => {
    if (Date.now() < deadline && result.status === "available") cache.set(key, result);
    return result;
  });
  queue = job.catch(() => {});
  const response = Promise.race([job, expired]).finally(() => clearTimeout(timer));
  inFlight.set(key, response);
  // Keep the key occupied until the actual process has closed, even if its
  // caller deadline already returned. Repeated requests must not overlap it.
  job.finally(() => { if (inFlight.get(key) === response) inFlight.delete(key); }).catch(() => {});
  return response;
}

module.exports = { lookupLiveStataHelp, expandHelpIncludes, runStataBatch };
