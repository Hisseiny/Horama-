import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IdEcran, Regle, Version } from "@horama/contrats";
import { listMarkdown, splitFrontMatter } from "./files.ts";
import { analyserLigneRegle } from "./rules.ts";

export interface NoteRule {
  phrase: string;
  regle: Regle | null;
  ligne: number;
}

export interface Note {
  chemin: string;
  entete: Record<string, unknown>;
  titre: string;
  texte: string;
  regles: NoteRule[];
}

function readNote(vault: string, logiciel: string, chemin: string): Note {
  const texte = readFileSync(join(vault, logiciel, chemin), "utf8");
  const lines = texte.split("\n");
  const located = (line: number, error: unknown) => new Error(`${logiciel}/${chemin}, ligne ${line} : ${(error as Error).message}`);
  let entete: Record<string, unknown>;
  try {
    entete = splitFrontMatter(texte).header;
  } catch (error) {
    throw located(1, error);
  }
  const ecran = typeof entete.ecran === "string" ? entete.ecran : undefined;
  const regles: NoteRule[] = [];
  let inRules = false;
  lines.forEach((line, index) => {
    if (line.startsWith("#")) inRules = /^## Règles\s*$/.test(line);
    if (!inRules || !line.startsWith("- ")) return;
    const next = lines[index + 1] ?? "";
    let regle: Regle | null = null;
    try {
      if (/^\s*regle:/.test(next)) regle = analyserLigneRegle(next, ecran);
    } catch (error) {
      throw located(index + 2, error);
    }
    regles.push({ phrase: line.slice(2).trim(), regle, ligne: index + 1 });
  });
  const titre = lines.find((line) => line.startsWith("# "))?.slice(2).trim() ?? "";
  return { chemin, entete, titre, texte, regles };
}

export function lireNotes(vault: string, logiciel: string): Note[] {
  return ["produit", "notes-de-version"].flatMap((folder) =>
    listMarkdown(join(vault, logiciel, folder)).map((name) => readNote(vault, logiciel, `${folder}/${name}`)),
  );
}

export function urlDepart(vault: string, logiciel: string, version: Version, ecran: IdEcran): string {
  const url = lireNotes(vault, logiciel).find((note) => note.entete.ecran === ecran)?.entete.url;
  if (typeof url !== "string") throw new Error(`Aucune note de ${logiciel} ne donne l'url de l'écran « ${ecran} »`);
  return `/v${version}/entrer?suite=/v${version}${url}`;
}
