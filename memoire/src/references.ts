import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { IdEcran, Version, Vue } from "@horama/contrats";

export interface Reference {
  ecran: IdEcran;
  vue: Vue;
  version: Version;
  chemin: string;
}

export function ecrireReference(vault: string, logiciel: string, ecran: IdEcran, vue: Vue, version: Version, png: Uint8Array): string {
  const folder = `${logiciel}/references/${ecran}`;
  mkdirSync(join(vault, folder), { recursive: true });
  writeFileSync(join(vault, folder, `${vue}--v${version}.png`), png);
  return `${folder}/${vue}--v${version}.png`;
}

export function lireReferences(vault: string, logiciel: string): Reference[] {
  const root = join(vault, logiciel, "references");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      readdirSync(join(root, entry.name)).flatMap((name) => {
        const match = /^(.+)--v(.+)\.png$/.exec(name);
        return match ? [{ ecran: entry.name, vue: match[1], version: match[2], chemin: `${logiciel}/references/${entry.name}/${name}` }] : [];
      }),
    )
    .sort((a, b) => a.chemin.localeCompare(b.chemin));
}
