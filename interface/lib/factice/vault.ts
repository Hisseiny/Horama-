// Reads the real vault (VAULT_PATH, default ../vault-horama). Nothing here is fake, and nothing is written.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Regle, Releve } from "@horama/contrats";
import type { FichierVault, Note } from "../donnees";
import { readHTest, splitFrontMatter } from "../markdown";

// The vault lives outside the app: the bundler must not try to trace it.
const root = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.VAULT_PATH ?? "../vault-horama");

export const vaultName = () => path.basename(root());

export function readNote(logiciel: string, chemin: string): Note {
  const file = path.join(root(), logiciel, chemin);
  return { chemin, contenu: readFileSync(file, "utf8"), modifie_le: statSync(file).mtime.toISOString() };
}

const list = (logiciel: string, dossier: string) =>
  readdirSync(path.join(root(), logiciel, dossier))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `${dossier}/${f}`);

// "regle: somme | colonne: Montant TTC | cible: Total" becomes a Regle of the contracts.
function parseRegle(ligne: string, ecran: string): Regle {
  const { regle: type, ...champs } = Object.fromEntries(
    ligne.split("|").map((part) => {
      const i = part.indexOf(":");
      return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }),
  );
  const side = (v: string) => ({ ecran: v.slice(0, v.indexOf(".")), champ: v.slice(v.indexOf(".") + 1) });
  return (type === "egalite" ? { type, a: side(champs.a), b: side(champs.b) } : { type, ecran, ...champs }) as Regle;
}

export interface NoteRule { phrase: string; ligne?: string; regle?: Regle; note: string }
export interface ProductNote { chemin: string; ecran?: string; titre: string; regles: NoteRule[] }

// Every sentence of a "Règles" section is a rule; the "regle:" line under it makes it calculable.
export function readProductNotes(logiciel: string): ProductNote[] {
  return list(logiciel, "produit").map((chemin) => {
    const { meta, body } = splitFrontMatter(readNote(logiciel, chemin).contenu);
    const regles: NoteRule[] = [];
    let inRules = false;
    for (const line of body.split("\n")) {
      if (line.startsWith("## ")) inRules = line.trim() === "## Règles";
      else if (!inRules) continue;
      else if (line.startsWith("- ")) regles.push({ phrase: line.slice(2).trim(), note: chemin });
      else if (/^\s+regle:/.test(line) && regles.length) {
        const last = regles[regles.length - 1];
        last.ligne = line.trim();
        last.regle = parseRegle(last.ligne, meta.ecran);
      }
    }
    return { chemin, ecran: meta.ecran, titre: body.match(/^# (.+)$/m)?.[1] ?? chemin, regles };
  });
}

export interface VaultTest { id: string; titre: string; source: string; attendu: string; releves: Releve[]; regles: Regle[] }

export function readTests(logiciel: string): VaultTest[] {
  return list(logiciel, "tests").map((chemin) => {
    const md = readNote(logiciel, chemin).contenu;
    const { meta } = splitFrontMatter(md);
    const { title, sections } = readHTest(md);
    return {
      id: meta.id,
      titre: title,
      source: meta.source,
      attendu: sections["Expected Result"] ?? "",
      releves: [...meta.releves.matchAll(/ecran:\s*([\w-]+),\s*vue:\s*([\w-]+)/g)].map(([, ecran, vue]) => ({ ecran, vue })),
      regles: JSON.parse(md.match(/```regles\n([\s\S]*?)```/)?.[1] ?? "[]"),
    };
  });
}

// Highest "notes-de-version/vNN.md".
export const latestVersion = (logiciel: string) =>
  String(Math.max(...list(logiciel, "notes-de-version").map((f) => Number(f.match(/v(\d+)\.md$/)?.[1] ?? 0))));

export function latestFiles(n: number): FichierVault[] {
  const files: FichierVault[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else files.push({ chemin: path.relative(root(), file), modifie_le: statSync(file).mtime.toISOString() });
    }
  };
  walk(root());
  return files.sort((a, b) => b.modifie_le.localeCompare(a.modifie_le) || a.chemin.localeCompare(b.chemin)).slice(0, n);
}
