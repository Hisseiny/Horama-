import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Regle, TestAccepte, TestPropose, Version } from "@horama/contrats";
import { FRONT_MATTER, compactJson, listMarkdown, splitFrontMatter, yamlScalar } from "./files.ts";
import { checkRule, text } from "./rules.ts";

const SECTIONS = ["## Setup", "## Task", "## Expected Result", "## Verification"];
const FINAL_STEP =
  "Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.";
const RULES_BLOCK = /^```regles[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;

export interface AcceptOptions {
  url_depart: string;
  version_cible: Version;
  timeout_s?: number;
  accepte_par: string;
  accepte_le: string;
}

export function ecrireTestAccepte(vault: string, propose: TestPropose, options: AcceptOptions): TestAccepte {
  const { id, logiciel, source } = propose;
  const refuse = (reason: string) => new Error(`Test « ${id} » refusé : ${reason}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw refuse("l'id n'est pas en kebab-case");
  if (!propose.releves.length) throw refuse("releves est vide");
  const releves = propose.releves.map(({ ecran, vue }) => ({ ecran, vue }));
  const regles = propose.regles_calculables.map((rule, index) => {
    try {
      return checkRule(rule);
    } catch (error) {
      throw refuse(`règle ${index + 1} invalide, ${(error as Error).message}`);
    }
  });

  const lines = propose.test_markdown.replace(FRONT_MATTER, "").replace(RULES_BLOCK, "").trim().split("\n");
  const at = SECTIONS.map((section) => lines.findIndex((line) => line.trimEnd() === section));
  SECTIONS.forEach((section, index) => {
    if (at[index] < 0) throw refuse(`la section « ${section} » manque`);
    if (index > 0 && at[index] < at[index - 1]) throw refuse(`les sections ne sont pas dans l'ordre ${SECTIONS.join(", ")}`);
  });
  const task = lines.slice(at[1] + 1, at[2]).filter((line) => !line.includes(FINAL_STEP));
  const lastStep = task.filter((line) => /^\d+\. /.test(line)).at(-1);
  let end = task.length;
  while (end > 0 && !task[end - 1].trim()) end--;
  task.splice(end, 0, `${lastStep ? parseInt(lastStep, 10) + 1 : 1}. ${FINAL_STEP}`);
  lines.splice(at[1] + 1, at[2] - at[1] - 1, ...task);

  const timeout_s = options.timeout_s ?? 180;
  const markdown = [
    "---",
    `id: ${yamlScalar(id)}`,
    `logiciel: ${yamlScalar(logiciel)}`,
    `source: ${yamlScalar(source)}`,
    `releves: [${releves.map(({ ecran, vue }) => `{ ecran: ${yamlScalar(ecran, true)}, vue: ${yamlScalar(vue, true)} }`).join(", ")}]`,
    `url_depart: ${yamlScalar(options.url_depart)}`,
    `version_cible: ${JSON.stringify(options.version_cible)}`,
    `timeout_s: ${timeout_s}`,
    "statut: accepte",
    `accepte_par: ${yamlScalar(options.accepte_par)}`,
    `accepte_le: ${yamlScalar(options.accepte_le)}`,
    "---",
    "",
    ...lines,
    "",
    "```regles",
    `[${regles.map(compactJson).join(",\n ")}]`,
    "```",
    "",
  ].join("\n");

  mkdirSync(join(vault, logiciel, "tests"), { recursive: true });
  writeFileSync(join(vault, logiciel, "tests", `${id}.md`), markdown);
  return { id, logiciel, source, releves, url_depart: options.url_depart, version_cible: options.version_cible, timeout_s, markdown, regles };
}

// Returns null when the file is not an accepted test (statut other than "accepte").
function readTest(vault: string, logiciel: string, id: string): TestAccepte | null {
  const path = join(logiciel, "tests", `${id}.md`);
  const markdown = readFileSync(join(vault, path), "utf8");
  try {
    const { header } = splitFrontMatter(markdown);
    if (header.statut !== "accepte") return null;
    if (header.id !== id) throw new Error(`l'id de l'en-tête (${String(header.id)}) n'est pas le nom du fichier`);
    const { releves, version_cible, timeout_s } = header;
    if (!Array.isArray(releves) || !releves.length) throw new Error("champ « releves » manquant ou vide");
    if (typeof version_cible !== "string" && typeof version_cible !== "number") throw new Error("champ « version_cible » manquant");
    if (typeof timeout_s !== "number") throw new Error("champ « timeout_s » manquant ou non numérique");
    const blocks = [...markdown.matchAll(RULES_BLOCK)];
    if (blocks.length !== 1) throw new Error(`un seul bloc \`\`\`regles attendu, ${blocks.length} trouvé(s)`);
    let rules: unknown;
    try {
      rules = JSON.parse(blocks[0][1]);
    } catch (error) {
      throw new Error(`bloc de règles illisible (${(error as Error).message})`);
    }
    if (!Array.isArray(rules)) throw new Error("le bloc de règles n'est pas une liste");
    return {
      id,
      logiciel: text(header, "logiciel"),
      source: text(header, "source"),
      releves: releves.map((releve) => ({ ecran: text(releve, "ecran", "releves.ecran"), vue: text(releve, "vue", "releves.vue") })),
      url_depart: text(header, "url_depart"),
      version_cible: String(version_cible),
      timeout_s,
      markdown,
      regles: rules.map((rule): Regle => checkRule(rule)),
    };
  } catch (error) {
    throw new Error(`${path} : ${(error as Error).message}`);
  }
}

export function lireTestAccepte(vault: string, logiciel: string, id: string): TestAccepte {
  const test = readTest(vault, logiciel, id);
  if (!test) throw new Error(`${join(logiciel, "tests", `${id}.md`)} : le test n'a pas le statut « accepte »`);
  return test;
}

export function lireTestsAcceptes(vault: string, logiciel: string): TestAccepte[] {
  return listMarkdown(join(vault, logiciel, "tests")).flatMap((name) => readTest(vault, logiciel, name.slice(0, -3)) ?? []);
}
