import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";

export const REAL_VAULT = fileURLToPath(new URL("../../vault-horama", import.meta.url));

// The tests never write in the repository: they work on a copy, removed when the test file ends.
export function temporaryVault(): string {
  const folder = mkdtempSync(join(tmpdir(), "horama-vault-"));
  cpSync(REAL_VAULT, folder, { recursive: true });
  after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
