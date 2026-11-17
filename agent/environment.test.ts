import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadEnvironment } from "./src/environment.ts";

test("charge le fichier local sans remplacer les variables déjà définies", () => {
  const folder = mkdtempSync(join(tmpdir(), "horama-env-"));
  const path = join(folder, ".env.local");
  try {
    writeFileSync(path, "HORAMA_TEST_EXISTING=file\nHORAMA_TEST_EMPTY=file\nHORAMA_TEST_LOADED='local value'\n");
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", `
      import { loadEnvironment } from ${JSON.stringify(new URL("./src/environment.ts", import.meta.url).href)};
      loadEnvironment(${JSON.stringify(path)});
      console.log(JSON.stringify([process.env.HORAMA_TEST_EXISTING, process.env.HORAMA_TEST_EMPTY, process.env.HORAMA_TEST_LOADED]));
    `], { encoding: "utf8", env: { ...process.env, HORAMA_TEST_EXISTING: "shell", HORAMA_TEST_EMPTY: "" } });
    assert.deepEqual(JSON.parse(output), ["shell", "", "local value"]);
    assert.doesNotThrow(() => loadEnvironment(join(folder, "absent")));
    writeFileSync(path, "");
    assert.doesNotThrow(() => loadEnvironment(path));
    assert.throws(() => loadEnvironment(folder));
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
