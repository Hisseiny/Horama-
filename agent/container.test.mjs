import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const run = (args, key = "") => spawnSync(process.execPath, ["agent/scripts/container.mjs", ...args], {
  cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: key },
});

test("service clicked-page default matches the scene and preserves overrides", () => {
  const source = readFileSync(new URL("./scripts/container.mjs", import.meta.url), "utf8");
  const scene = readFileSync(new URL("../automatisation/scene/exploration.mjs", import.meta.url), "utf8");
  const bound = source.match(/function bound\([^]*?\n\}/)?.[0];
  const setting = source.match(/const clicked = bound\([^;]+;/)?.[0];
  const sceneDefault = Number(scene.match(/const CLICKED = Number\(option\("pages-cliquees", (\d+)\)\)/)?.[1]);
  assert.ok(bound && setting);
  for (const value of [undefined, "0", "6"]) {
    const actual = runInNewContext(`${bound}\n${setting}\nclicked`, { process: { env: { HORAMA_PAGES_CLIQUEES: value } } });
    assert.equal(actual, value === undefined ? sceneDefault : Number(value));
  }
});

test("service accepts 380 and 420 seconds and rejects 421", () => {
  for (const seconds of ["380", "420", "421"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import fs from "node:fs/promises";
      import { syncBuiltinESMExports } from "node:module";
      fs.mkdtemp = async () => { throw new Error("SETTINGS_ACCEPTED"); };
      syncBuiltinESMExports();
      process.argv = ["node", "container", "--service"];
      await import("./agent/scripts/container.mjs");
    `], { cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: "not-a-real-key", HORAMA_MAX_SECONDS: seconds } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, seconds === "421" ? /Valeur attendue entre 1 et 420/ : /SETTINGS_ACCEPTED/);
  }
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

test("service rejects invalid clicked-page limits before starting Chrome", () => {
  for (const value of ["-1", "9", "1.5", "invalid"]) {
    const result = spawnSync(process.execPath, ["agent/scripts/container.mjs", "--service"], {
      cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: "not-a-real-key", HORAMA_PAGES_CLIQUEES: value },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Valeur attendue entre 0 et 8/);
  }
});

test("container refuses overrides of its isolated paths and CDP port", () => {
  for (const option of ["--vault", "--sortie", "--chrome-port"]) {
    const result = run([option, "other"], "not-a-real-key");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /réserve CDP 9333/);
  }
});

test("direct screencast failure is optional and the kill switch preserves the old engine", () => {
  for (const direct of ["0", "1"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import childProcess from "node:child_process";
      import { EventEmitter } from "node:events";
      import { syncBuiltinESMExports } from "node:module";
      let spawns = 0;
      let cdpRequests = 0;
      childProcess.spawn = (_bin, args) => {
        const engine = ++spawns === 2;
        const child = Object.assign(new EventEmitter(), {
          exitCode: null, signalCode: null,
          kill(signal) { this.signalCode = signal; this.emit("exit", null, signal); },
        });
        if (engine) {
          assert.equal(args[0], ${JSON.stringify(direct === "0" ? "agent/explorer.ts" : "agent/scripts/explorer-direct.mjs")});
          assert.equal(args.includes("--sans-agent"), ${direct !== "0"});
          assert.ok(args.includes("--reseau-public"));
          process.nextTick(() => child.emit("exit", 0));
        }
        return child;
      };
      syncBuiltinESMExports();
      globalThis.fetch = async url => {
        if (url.endsWith("/json/version")) return { ok: true };
        cdpRequests++;
        throw new Error("Screencast unavailable");
      };
      await import("./agent/scripts/container.mjs");
      assert.equal(spawns, 2);
      assert.equal(cdpRequests, ${direct === "0" ? 0 : 1});
      assert.equal(process.exitCode, 0);
    `], { cwd, encoding: "utf8", env: { ...process.env, HAI_API_KEY: "not-a-real-key",
      HORAMA_DIRECT: direct, HORAMA_SANS_AGENT: "1" }, timeout: 5000 });
    assert.equal(result.status, 0, result.stderr);
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
