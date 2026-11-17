// Test of a new feature, from the « Ce qui change » part of a change sheet of the vault (decision D7, sections 3 and 4.1).
// The sheet is read by the caller (couloir Nathan: format, reading, selection of the tests); this file writes its test.
import type { IdEcran, Regle, TestPropose, Vue } from "@horama/contrats";
import { lireNotes } from "@horama/memoire";
import type { Note } from "@horama/memoire";
import { DEFAULT_MODEL, declaredViews } from "./index.ts";
import type { Options, Proposal } from "./index.ts";
import { retryMessage } from "./prompt.ts";
import type { Message } from "./router.ts";
import { callModel } from "./router.ts";
import { validateAnswer } from "./validation.ts";

// Provisional, until « etat » enters contrats/types.ts with the tag contrats-v2 (D7, section 3, condition 4). Same fields as D7.
export interface RegleEtat {
  type: "etat";
  ecran: IdEcran;
  vue: Vue;
  texte_present?: string[];
  texte_absent?: string[];
}

export interface FicheDeChangement {
  chemin: string; // e.g. "changements/bouton-relancer.md", relative to the folder of the software
  texte: string; // the whole file, front matter included
  ecrans_vises: IdEcran[]; // from the front matter, read by the caller
}

const LABEL = /«\s*([^»]+?)\s*»/g;

// The sentence that starts with « Ce qui change : », on one line, as the model of vault-horama/_modeles/ writes it.
export function ceQuiChange(texte: string): string | undefined {
  return texte.split("\n").find((line) => line.startsWith("Ce qui change :"))?.trim();
}

const INSTRUCTIONS = `Tu écris le test de recette d'une nouveauté d'un logiciel, à partir de sa fiche de changement. Un agent jouera le test dans un navigateur, puis un programme vérifiera que certains textes sont présents ou absents à l'écran après l'action. Un programme assemble ta réponse : tu remplis des cases, rien d'autre.

Réponds par un seul objet JSON, sans aucun texte autour : { "tests": [ { ...les cases du test... } ] }, avec exactement un test, tiré de la phrase « Ce qui change » de la fiche.

Les cases du test, toutes obligatoires :
- "id" : identifiant en kebab-case (minuscules sans accent, chiffres, tirets).
- "titre" : une ligne, le nom de l'écran puis ce qui est vérifié, par exemple « Liste des factures : bouton Relancer ».
- "setup" : une phrase qui dit l'état de départ. Le test démarre toujours déjà connecté, sur l'écran du premier relevé, dans son état de départ.
- "etapes" : liste de phrases à l'infinitif (majuscule, point final), sans numéro, que l'agent exécute dans l'ordre : au moins l'action que la fiche décrit (un clic, un choix). Cite les libellés de l'interface entre « », tels que la fiche les donne. N'écris ni la connexion, ni l'ouverture de l'écran de départ, ni l'appel d'un outil.
- "resultat_attendu" : une phrase.
- "verifications" : liste de phrases qui commencent par « FAIL if », par exemple « FAIL if « Relance envoyée » n'apparaît pas après le clic. ».
- "releves" : les états d'écran à capturer : au moins celui d'après l'action, { "ecran": un des écrans visés par la fiche, "vue": "defaut" ou une vue que l'en-tête de la note de l'écran déclare (champ « vues »), recopiée telle quelle ; aucune autre vue n'existe }.
- "regles_calculables" : exactement une règle { "type": "etat", "ecran": E, "vue": V, "texte_present": [...], "texte_absent": [...] }. E et V sont ceux du relevé d'après l'action. "texte_present" : les libellés que la phrase « Ce qui change » dit visibles après l'action, au moins un. "texte_absent" : les libellés qu'elle dit disparus après l'action, sinon une liste vide. Chaque texte est un libellé écrit entre « » dans la phrase « Ce qui change », recopié sans les guillemets, caractère pour caractère ; jamais un texte inventé, jamais un « ; ».
- "passages_de_la_source" : la phrase « Ce qui change » de la fiche, recopiée caractère pour caractère.
- "questions" : liste de { "texte": la question, "choix": 2 ou 3 réponses courtes }. Liste vide seulement quand la fiche ne laisse aucun doute sur ce qui doit être visible après l'action.`;

export function buildFicheMessages(logiciel: string, fiche: FicheDeChangement, screens: Note[]): Message[] {
  return [
    { role: "system", content: INSTRUCTIONS },
    {
      role: "user",
      content: [
        `Logiciel : ${logiciel}. Écrans visés par la fiche : ${fiche.ecrans_vises.join(", ")}.`,
        "",
        "Documentation des écrans visés (identifiant « ecran », vues déclarées, titre) :",
        ...screens.filter(({ entete }) => fiche.ecrans_vises.includes(entete.ecran as string)).map(({ texte }) => `<<<\n${texte.trimEnd()}\n>>>`),
        "",
        `Fiche de changement « ${fiche.chemin} » :`,
        "<<<",
        fiche.texte.trimEnd(),
        ">>>",
      ].join("\n"),
    },
  ];
}

const textList = (value: unknown, label: string, min: number, reasons: string[]): string[] => {
  if (value === undefined && !min) return [];
  if (!Array.isArray(value) || value.length < min || value.some((text) => typeof text !== "string" || !text.trim())) {
    reasons.push(`« ${label} » doit être une liste de textes${min ? ` (au moins ${min})` : ""}`);
    return [];
  }
  return value.map((text: string) => text.trim());
};

// Checks the « etat » rule against the sheet; the rest of the test is checked by validateAnswer, as for a note.
export function checkEtat(raw: unknown, fiche: FicheDeChangement, views: Record<string, string[]>, releves: TestPropose["releves"]): { regle?: RegleEtat; reasons: string[] } {
  const reasons: string[] = [];
  if (!Array.isArray(raw) || raw.length !== 1) return { reasons: ["« regles_calculables » doit contenir exactement une règle « etat »"] };
  const { type, ecran, vue, texte_present, texte_absent, ...others } = (raw[0] ?? {}) as Record<string, unknown>;
  if (type !== "etat") return { reasons: [`la règle doit être de type « etat » (reçu « ${String(type)} »)`] };
  if (Object.keys(others).length) reasons.push(`la règle « etat » a des champs en trop : ${Object.keys(others).join(", ")}`);
  if (typeof ecran !== "string" || !fiche.ecrans_vises.includes(ecran)) reasons.push(`l'écran de la règle doit être un écran visé par la fiche (${fiche.ecrans_vises.join(", ")})`);
  if (typeof vue !== "string" || (vue !== "defaut" && !(views[ecran as string] ?? []).includes(vue))) {
    reasons.push(`la vue « ${String(vue)} » n'est pas déclarée pour l'écran « ${String(ecran)} » (vues : ${["defaut", ...(views[ecran as string] ?? [])].join(", ")})`);
  } else if (!releves.some((releve) => releve.ecran === ecran && releve.vue === vue)) {
    reasons.push(`l'écran « ${String(ecran)} » en vue « ${vue} » de la règle n'est pas dans releves`);
  }
  const present = textList(texte_present, "texte_present", 1, reasons); // D7: a witness proves the action was done
  const absent = textList(texte_absent, "texte_absent", 0, reasons);
  const sentence = ceQuiChange(fiche.texte) ?? "";
  const quoted = new Set([...sentence.matchAll(LABEL)].map((match) => match[1]));
  for (const text of [...present, ...absent]) {
    if (text.includes(";")) reasons.push(`le texte « ${text} » contient un « ; », le séparateur des textes dans le vault`);
    else if (!quoted.has(text)) reasons.push(`le texte « ${text} » n'est pas un libellé écrit entre « » dans la phrase « Ce qui change »`);
  }
  if (present.some((text) => absent.includes(text))) reasons.push("un même texte est à la fois présent et absent");
  if (reasons.length) return { reasons };
  return { regle: { type: "etat", ecran: ecran as IdEcran, vue: vue as Vue, texte_present: present, ...(absent.length && { texte_absent: absent }) }, reasons };
}

export function validateFicheAnswer(content: string, fiche: FicheDeChangement, source: Parameters<typeof validateAnswer>[1]): { tests: TestPropose[]; reasons: string[] } {
  let raws: unknown;
  try {
    raws = (JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)) as { tests?: unknown }).tests;
  } catch {
    return { tests: [], reasons: ["la réponse n'est pas un objet JSON lisible"] };
  }
  if (!Array.isArray(raws) || raws.length !== 1) return { tests: [], reasons: ["« tests » doit contenir exactement un test"] };
  const { regles_calculables, ...rest } = (raws[0] ?? {}) as Record<string, unknown>;
  // The common checks (slots, screens, declared views, passages copied from the sheet), with no rule: « etat » is checked below.
  const common = validateAnswer(JSON.stringify({ tests: [{ ...rest, regles_calculables: [] }] }), source);
  const etat = checkEtat(regles_calculables, fiche, source.views, common.tests[0]?.releves ?? []);
  const reasons = [...common.reasons, ...etat.reasons.map((reason) => `test 1 : ${reason}`)];
  if (reasons.length) return { tests: [], reasons };
  // Cast until contrats-v2: Regle does not have « etat » yet (D7, condition 4). Do not merge this file before the tag.
  return { tests: [{ ...common.tests[0], regles_calculables: [etat.regle as unknown as Regle] }], reasons };
}

export async function proposerTestDepuisFiche(vault: string, logiciel: string, fiche: FicheDeChangement, options: Options = {}): Promise<Proposal> {
  const modele = options.modele ?? DEFAULT_MODEL;
  if (!ceQuiChange(fiche.texte)) throw new Error(`Fiche « ${fiche.chemin} » sans phrase « Ce qui change : »`);
  if (!fiche.ecrans_vises.length) throw new Error(`Fiche « ${fiche.chemin} » sans écran visé (ecrans_vises)`);
  const screens = lireNotes(vault, logiciel).filter(({ chemin, entete }) => chemin.startsWith("produit/") && typeof entete.ecran === "string");
  const ids = screens.map(({ entete }) => entete.ecran as string);
  const unknown = fiche.ecrans_vises.filter((ecran) => !ids.includes(ecran));
  if (unknown.length) throw new Error(`Fiche « ${fiche.chemin} » : écran(s) visé(s) sans note dans ${logiciel} : ${unknown.join(", ")}`);
  const views = Object.fromEntries(screens.map(({ entete }) => [entete.ecran as string, declaredViews(entete.vues)]));
  // The sheet stands for the source note: the passages of the test are copied from it.
  const note: Note = { chemin: fiche.chemin, entete: {}, titre: "", texte: fiche.texte, regles: [] };
  const source = { logiciel, note, screens: ids, views, modele };
  const messages = buildFicheMessages(logiciel, fiche, screens);

  const start = Date.now();
  let reasons: string[] = [];
  for (let essais = 1; essais <= 2; essais++) {
    const call = await callModel(modele, messages);
    const checked = call.content === undefined ? undefined : validateFicheAnswer(call.content, fiche, source);
    options.trace?.({ ...call, rejections: checked?.reasons });
    if (!checked) throw new Error(`Génération impossible (${modele}, ${fiche.chemin}) : ${call.error}`);
    if (!checked.reasons.length) return { tests: checked.tests, modele, duree_ms: Date.now() - start, essais };
    reasons = checked.reasons;
    messages.push({ role: "assistant", content: call.content! }, { role: "user", content: retryMessage(reasons) });
  }
  throw new Error(`Test refusé après 2 essais (${modele}, ${fiche.chemin}) : ${reasons.join(" ; ")}`);
}
