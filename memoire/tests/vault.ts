import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";

export const REAL_VAULT = fileURLToPath(new URL("../../vault-horama", import.meta.url));

// The tests never write in the repository: they work on a copy, removed when the test file ends.
export function temporaryVault(): string {
  const folder = mkdtempSync(join(tmpdir(), "horama-vault-"));
  cpSync(REAL_VAULT, folder, { recursive: true });
  // The real vault grows as the product runs (references, decisions, reports): the tests start from the notes and tests only.
  for (const grown of ["references", "decisions", "passages"]) {
    for (const entry of readdirSync(join(folder, "facturo", grown))) {
      if (entry !== ".gitkeep") rmSync(join(folder, "facturo", grown, entry), { recursive: true });
    }
  }
  after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
