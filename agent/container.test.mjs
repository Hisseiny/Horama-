import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const run = (args, key = "") => spawnSync(process.execPath, ["agent/scripts/container.mjs", ...args], {
  cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: key },
});

test("container help does not require Chrome or a key", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage/);
});

test("container refuses an empty environment before starting Chrome", () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HAI_API_KEY requise/);
});

test("container refuses overrides of its isolated paths and CDP port", () => {
  for (const option of ["--vault", "--sortie", "--chrome-port"]) {
    const result = run([option, "other"], "not-a-real-key");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /réserve CDP 9333/);
  }
});

test("container cancellation during CDP readiness skips the engine and cleans up", () => {
  for (const signal of ["SIGTERM", "SIGINT"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import childProcess from "node:child_process";
      import { EventEmitter } from "node:events";
      import { existsSync } from "node:fs";
      import { syncBuiltinESMExports } from "node:module";
      let profile;
      let spawns = 0;
      let chromeExited = false;
      const kills = [];
      childProcess.spawn = (bin, args) => {
        spawns++;
        profile = args.find(arg => arg.startsWith("--user-data-dir=")).split("=")[1];
        const chrome = Object.assign(new EventEmitter(), {
          exitCode: null, signalCode: null,
          kill(signal) {
            kills.push(signal);
            setTimeout(() => {
              chrome.signalCode = signal;
              chromeExited = true;
              chrome.emit("exit", null, signal);
            }, 20);
            return true;
          },
        });
        return chrome;
      };
      syncBuiltinESMExports();
      let requests = 0;
      globalThis.fetch = async () => {
        if (requests++ === 0) {
          process.emit(${JSON.stringify(signal)});
        }
        throw new Error("Chrome closed");
      };
      await import("./agent/scripts/container.mjs");
      assert.equal(spawns, 1);
      assert.deepEqual(kills, ["SIGTERM"]);
      assert.equal(chromeExited, true);
      assert.equal(existsSync(profile), false);
      assert.equal(process.exitCode, 130);
    `], { cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: "not-a-real-key" }, timeout: 5000 });
    assert.equal(result.status, 130, result.stderr);
  }
});

test("the image launcher starts Chrome as its own user without the engine key", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import childProcess from "node:child_process";
    import { EventEmitter } from "node:events";
    import { syncBuiltinESMExports } from "node:module";
    let spawns = 0;
    childProcess.spawn = (bin, args, options) => {
      spawns++;
      assert.equal(bin, "/usr/bin/sudo");
      assert.deepEqual(args.slice(0, 6), ["-n", "-H", "-u", "horama-chrome", "--", "/usr/local/bin/horama-chrome"]);
      assert.ok(args.includes("--proxy-bypass-list=<-loopback>"));
      assert.ok(!args.some(arg => arg.startsWith("--user-data-dir=")));
      assert.ok(!Object.hasOwn(options.env, "HAI_API_KEY"));
      return Object.assign(new EventEmitter(), {
        exitCode: null, signalCode: null,
        kill(signal) { this.emit("exit", null, signal); },
      });
    };
    syncBuiltinESMExports();
    globalThis.fetch = async () => {
      process.emit("SIGTERM");
      throw new Error("Stopping before the engine starts");
    };
    await import("./agent/scripts/container.mjs");
    assert.equal(spawns, 1);
  `], { cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: "not-a-real-key",
    HORAMA_CHROME_LAUNCHER: "/usr/local/bin/horama-chrome" }, timeout: 5000 });
  assert.equal(result.status, 130, result.stderr);
});
