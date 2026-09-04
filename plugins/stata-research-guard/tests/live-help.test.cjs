"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { lookupLiveStataHelp, expandHelpIncludes, runStataBatch } = require("../mcp/live-help.cjs");

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "guard-live-help-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("help expansion retains repeated fragments, aliases, and Windows-1252 source text", (t) => {
  const directory = workspace(t);
  const root = path.join(directory, "topic.sthlp");
  fs.writeFileSync(root, "Before\nINCLUDE help fragment\nBetween\nINCLUDE help fragment\n.h linked\nAfter");
  fs.writeFileSync(path.join(directory, "fragment.ihlp"), "Original fragment");
  fs.writeFileSync(path.join(directory, "linked.hlp"), Buffer.from([0x63, 0x61, 0x66, 0xe9]));
  const result = expandHelpIncludes(root);
  assert.equal(result.content, "Before\nOriginal fragment\nBetween\nOriginal fragment\ncafé\nAfter");
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.sourceFiles.length, 3);
});

test("cyclic and missing help references retain the original directive and report it", (t) => {
  const directory = workspace(t);
  const root = path.join(directory, "topic.sthlp");
  fs.writeFileSync(root, "Start\nINCLUDE help fragment\nINCLUDE help absent\nEnd");
  fs.writeFileSync(path.join(directory, "fragment.ihlp"), "Fragment\n.h topic");
  const result = expandHelpIncludes(root);
  assert.equal(result.content, "Start\nFragment\n.h topic\nINCLUDE help absent\nEnd");
  assert.deepEqual(result.unresolved, ["cyclic help alias: topic", "unresolved INCLUDE help: absent"]);
});

test("help expansion preserves a source chain longer than eight includes", (t) => {
  const directory = workspace(t);
  for (let index = 0; index < 12; index++) {
    fs.writeFileSync(path.join(directory, `part${index}.ihlp`), index === 11 ? "Last original section" : `INCLUDE help part${index + 1}`);
  }
  const result = expandHelpIncludes(path.join(directory, "part0.ihlp"));
  assert.equal(result.content, "Last original section");
  assert.deepEqual(result.unresolved, []);
});

test("failed and partial help retries recover; success is cached, refreshed, and concurrent calls are deduplicated", async (t) => {
  const directory = workspace(t);
  const executable = path.join(directory, "stata-test");
  fs.writeFileSync(executable, "");
  fs.chmodSync(executable, 0o755);
  const previousPath = process.env.STATA_PATH;
  process.env.STATA_PATH = executable;
  t.after(() => {
    if (previousPath === undefined) delete process.env.STATA_PATH;
    else process.env.STATA_PATH = previousPath;
  });
  const source = path.join(directory, "fixture.sthlp");
  fs.writeFileSync(source, "Original help body");
  let missing = true;
  let launches = 0;
  let active = 0;
  let maximumActive = 0;
  t.mock.method(childProcess, "spawn", (_executable, args, options) => {
    assert.equal(options.windowsHide, true);
    launches++;
    active++;
    maximumActive = Math.max(maximumActive, active);
    const child = new EventEmitter();
    child.kill = () => { setImmediate(() => child.emit("close", null, "SIGKILL")); return true; };
    setImmediate(() => {
      if (path.basename(args[2]) === "locate.do") {
        fs.writeFileSync(path.join(options.cwd, "located.txt"), missing ? "NOT_FOUND" : `FOUND\n${source}`);
      } else {
        const staged = fs.readdirSync(options.cwd).find((name) => name.endsWith(".sthlp"));
        fs.copyFileSync(path.join(options.cwd, staged), path.join(options.cwd, staged.replace(/\.sthlp$/, ".txt")));
        fs.writeFileSync(path.join(options.cwd, "rendered.status"), "0");
      }
      active--;
      child.emit("close", 0, null);
    });
    return child;
  });
  assert.equal((await lookupLiveStataHelp("guardfixture")).status, "unavailable");
  assert.equal(launches, 1);
  missing = false;
  const [first, duplicate] = await Promise.all([
    lookupLiveStataHelp("guardfixture"), lookupLiveStataHelp("guardfixture"),
  ]);
  assert.deepEqual(first, duplicate);
  assert.equal(first.help.content, "Original help body");
  assert.equal(first.status, "available");
  assert.equal(launches, 3);
  await lookupLiveStataHelp("guardfixture");
  assert.equal(launches, 3);
  fs.writeFileSync(source, "Changed original body\nINCLUDE help missing_fragment");
  const partial = await lookupLiveStataHelp("guardfixture", { refresh: true });
  assert.equal(partial.status, "partial");
  assert.match(partial.help.content, /INCLUDE help missing_fragment/);
  assert.equal(launches, 5);
  fs.writeFileSync(path.join(directory, "missing_fragment.ihlp"), "Recovered original fragment");
  const recovered = await lookupLiveStataHelp("guardfixture");
  assert.equal(recovered.status, "available");
  assert.equal(recovered.help.content, "Changed original body\nRecovered original fragment");
  assert.equal(launches, 7);
  await Promise.all([lookupLiveStataHelp("guardotherone"), lookupLiveStataHelp("guardothertwo")]);
  assert.equal(maximumActive, 1);
});

test("the batch runner allows event-loop progress and reports process failure and deadline expiry", async (t) => {
  const directory = workspace(t);
  const marker = path.join(directory, "complete.txt");
  const originalSpawn = childProcess.spawn;
  let behavior = "success";
  t.mock.method(childProcess, "spawn", (_executable, _args, options) => {
    assert.equal(options.windowsHide, true);
    const script = behavior === "success"
      ? "setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'done'), 150)"
      : behavior === "failure" ? "process.exit(7)" : "setTimeout(() => {}, 60000)";
    return originalSpawn(process.execPath, ["-e", script, marker], options);
  });
  let ticks = 0;
  const interval = setInterval(() => ticks++, 10);
  t.after(() => clearInterval(interval));
  await runStataBatch("unused", "unused", directory, marker, Date.now() + 5000);
  assert.ok(ticks > 0);
  assert.equal(fs.readFileSync(marker, "utf8"), "done");
  behavior = "failure";
  await assert.rejects(runStataBatch("unused", "unused", directory, marker, Date.now() + 5000), /code 7/);
  behavior = "timeout";
  await assert.rejects(runStataBatch("unused", "unused", directory, marker, Date.now() + 100), /55-second budget/);
});
