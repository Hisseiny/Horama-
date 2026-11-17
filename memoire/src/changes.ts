import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listMarkdown, splitFrontMatter } from "./files.ts";

export interface Changement {
  id: string;
  pr: number;
  code: string[];
  ecrans_vises: string[];
  ne_doit_pas_changer: string[];
  titre: string;
  chemin: string;
}

function stringList(header: Record<string, unknown>, key: string): string[] {
  const value = header[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`champ « ${key} » manquant ou n'est pas une liste de chaînes`);
  }
  return value as string[];
}

function readChange(vault: string, logiciel: string, name: string): Changement {
  const path = join(logiciel, "changements", name);
  try {
    const { header, body } = splitFrontMatter(readFileSync(join(vault, path), "utf8"));
    if (typeof header.id !== "string" || !header.id) throw new Error("champ « id » manquant");
    if (header.id !== name.slice(0, -3)) throw new Error(`l'id de l'en-tête (${header.id}) n'est pas le nom du fichier`);
    if (typeof header.pr !== "number") throw new Error("champ « pr » manquant ou non numérique");
    const titre = body.split("\n").find((line) => line.startsWith("# "))?.slice(2).trim() ?? "";
    return {
      id: header.id,
      pr: header.pr,
      code: stringList(header, "code"),
      ecrans_vises: stringList(header, "ecrans_vises"),
      ne_doit_pas_changer: stringList(header, "ne_doit_pas_changer"),
      titre,
      chemin: `changements/${name}`,
    };
  } catch (error) {
    throw new Error(`${path} : ${(error as Error).message}`);
  }
}

// The change sheets of a software (vault-horama/<logiciel>/changements/<id>.md), sorted by file name.
// An absent folder means no sheet: the list is empty, not an error.
export function lireChangements(vault: string, logiciel: string): Changement[] {
  return listMarkdown(join(vault, logiciel, "changements")).map((name) => readChange(vault, logiciel, name));
}
