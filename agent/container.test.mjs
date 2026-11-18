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
