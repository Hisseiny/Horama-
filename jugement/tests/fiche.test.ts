import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import { lireNotes } from "@horama/memoire";
import { ceQuiChange, proposerTestDepuisFiche } from "../index.ts";
import type { FicheDeChangement } from "../index.ts";
import { validateFicheAnswer } from "../generation/fiche.ts";

// No test reaches the network: fetch is replaced. The model answers are written by hand. The sheet is the example of the
// model of vault-horama/_modeles/ (D7, section 4.1); the vault copy declares the view reached after the click.
const VAULT = mkdtempSync(join(tmpdir(), "horama-fiche-"));
cpSync(fileURLToPath(new URL("../../vault-horama", import.meta.url)), VAULT, { recursive: true });
after(() => rmSync(VAULT, { recursive: true, force: true }));
const LISTE_FILE = join(VAULT, "facturo", "produit", "liste-des-factures.md");
const [, header, body] = readFileSync(LISTE_FILE, "utf8").split(/^---\n|\n---\n/m);
writeFileSync(LISTE_FILE, `---\n${header.replace(/^vues:.*\n?/m, "").trimEnd()}\nvues: [filtre-echeance, apres-relance]\n---\n${body}`);

const CHANGE = "Ce qui change : un bouton « Relancer » sur chaque facture échue ; un clic affiche « Relance envoyée ».";
const FICHE: FicheDeChangement = {
  chemin: "changements/bouton-relancer.md",
  texte: `---\nid: bouton-relancer\npr: 42\necrans_vises: [liste-des-factures]\nne_doit_pas_changer: [tableau-de-bord]\n---\n\n# Bouton « Relancer » sur la liste des factures\n\n${CHANGE}\nCe qui ne doit pas changer : le reste de la liste, le mode sombre, l'export.\n`,
  ecrans_vises: ["liste-des-factures"],
};
const MODEL = "openai/gpt-oss-120b:fastest";

type Slots = Record<string, any>;
const GOOD: Slots = {
  id: "bouton-relancer-liste-factures",
  titre: "Liste des factures : bouton Relancer",
  setup: "Connecté avec le compte de démo, sur la liste des factures, sans filtre.",
  etapes: ["Cliquer sur « Relancer » sur la première facture échue."],
  resultat_attendu: "Le message « Relance envoyée » s'affiche.",
  verifications: ["FAIL if « Relance envoyée » n'apparaît pas après le clic."],
  releves: [{ ecran: "liste-des-factures", vue: "apres-relance" }],
  regles_calculables: [{ type: "etat", ecran: "liste-des-factures", vue: "apres-relance", texte_present: ["Relance envoyée"], texte_absent: [] }],
  passages_de_la_source: [CHANGE],
  questions: [],
};
const answer = (change: (test: Slots) => void = () => {}) => {
  const test = structuredClone(GOOD);
  change(test);
  return JSON.stringify({ tests: [test] });
};
const screens = lireNotes(VAULT, "facturo").filter(({ chemin, entete }) => chemin.startsWith("produit/") && typeof entete.ecran === "string");
const SOURCE = {
  logiciel: "facturo",
  note: { chemin: FICHE.chemin, entete: {}, titre: "", texte: FICHE.texte, regles: [] },
  screens: screens.map(({ entete }) => entete.ecran as string),
  views: { "liste-des-factures": ["filtre-echeance", "apres-relance"] } as Record<string, string[]>,
  modele: MODEL,
};
const reasonsOf = (content: string) => validateFicheAnswer(content, FICHE, SOURCE).reasons;

// ---------- validateFicheAnswer: what the code accepts and refuses ----------

test("la phrase « Ce qui change » est lue telle que le modèle de fiche l'écrit", () => {
  assert.equal(ceQuiChange(FICHE.texte), CHANGE);
  assert.equal(ceQuiChange("# Titre\n\nRien d'autre."), undefined);
});

test("une bonne réponse donne un test avec sa règle etat ; une liste texte_absent vide n'est pas écrite", () => {
  const { tests, reasons } = validateFicheAnswer(answer(), FICHE, SOURCE);
  assert.deepEqual(reasons, []);
  assert.deepEqual(tests[0].regles_calculables, [{ type: "etat", ecran: "liste-des-factures", vue: "apres-relance", texte_present: ["Relance envoyée"] }]);
  assert.deepEqual(tests[0].releves, [{ ecran: "liste-des-factures", vue: "apres-relance" }]);
  assert.ok(tests[0].test_markdown.includes("1. Cliquer sur « Relancer » sur la première facture échue."));
  assert.deepEqual(tests[0].passages_de_la_source, [CHANGE]);
});

test("un texte absent est gardé quand la fiche le cite", () => {
  const { tests, reasons } = validateFicheAnswer(answer((t) => (t.regles_calculables[0].texte_absent = ["Relancer"])), FICHE, SOURCE);
  assert.deepEqual(reasons, []);
  assert.deepEqual((tests[0].regles_calculables[0] as unknown as { texte_absent: string[] }).texte_absent, ["Relancer"]);
});

test("refusé : un texte inventé, un « ; », pas de texte témoin, un même texte présent et absent", () => {
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].texte_present = ["Relance effectuée"])))[0], /« Relance effectuée » n'est pas un libellé écrit entre « » dans la phrase « Ce qui change »/);
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].texte_present = ["Relance envoyée ; Relancer"])))[0], /contient un « ; », le séparateur des textes dans le vault/);
  assert.match(reasonsOf(answer((t) => Object.assign(t.regles_calculables[0], { texte_present: [], texte_absent: ["Relancer"] })))[0], /« texte_present » doit être une liste de textes \(au moins 1\)/);
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].texte_absent = ["Relance envoyée"])))[0], /un même texte est à la fois présent et absent/);
});

test("refusé : un écran non visé, une vue non déclarée, une vue sans relevé, une règle d'un autre type ou en trop", () => {
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].ecran = "tableau-de-bord")))[0], /l'écran de la règle doit être un écran visé par la fiche \(liste-des-factures\)/);
  const undeclared = reasonsOf(answer((t) => ((t.releves[0].vue = "apres-clic"), (t.regles_calculables[0].vue = "apres-clic"))));
  assert.ok(undeclared.some((reason) => /la vue « apres-clic » n'est pas déclarée pour l'écran « liste-des-factures »/.test(reason)), undeclared.join(" | "));
  assert.match(reasonsOf(answer((t) => (t.releves[0].vue = "defaut")))[0], /en vue « apres-relance » de la règle n'est pas dans releves/);
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].type = "presence")))[0], /de type « etat » \(reçu « presence »\)/);
  assert.match(reasonsOf(answer((t) => t.regles_calculables.push(t.regles_calculables[0])))[0], /exactement une règle « etat »/);
  assert.match(reasonsOf(answer((t) => (t.regles_calculables[0].couleur = "rouge")))[0], /champs en trop : couleur/);
});

test("refusé : deux tests, un passage qui n'est pas dans la fiche, une réponse illisible", () => {
  assert.deepEqual(reasonsOf(JSON.stringify({ tests: [GOOD, GOOD] })), ["« tests » doit contenir exactement un test"]);
  assert.match(reasonsOf(answer((t) => (t.passages_de_la_source = ["Un bouton pour relancer."])))[0], /n'est pas recopié mot pour mot de la note/);
  assert.deepEqual(reasonsOf("Voici le test."), ["la réponse n'est pas un objet JSON lisible"]);
});

// ---------- proposerTestDepuisFiche, with the router replaced ----------

process.env.HF_TOKEN = "jeton-de-test";
afterEach(() => mock.restoreAll());

function router(...answers: string[]) {
  const requests: Array<{ model: string; temperature: number; messages: Array<{ role: string; content: string }> }> = [];
  mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    return new Response(JSON.stringify({ choices: [{ message: { content: answers[requests.length - 1] } }] }));
  });
  return requests;
}

test("proposerTestDepuisFiche : la fiche et la note des écrans visés partent au modèle, à température 0", async () => {
  const requests = router(answer());
  const proposal = await proposerTestDepuisFiche(VAULT, "facturo", FICHE);
  assert.deepEqual({ ids: proposal.tests.map(({ id }) => id), modele: proposal.modele, essais: proposal.essais }, { ids: ["bouton-relancer-liste-factures"], modele: MODEL, essais: 1 });
  assert.equal(requests[0].temperature, 0);
  const [system, user] = requests[0].messages;
  assert.ok(system.content.includes(`"type": "etat"`));
  assert.ok(user.content.includes(CHANGE), "la fiche");
  assert.ok(user.content.includes("vues: [filtre-echeance, apres-relance]"), "les vues déclarées de l'écran visé");
  assert.ok(!user.content.includes("ecran: tableau-de-bord"), "seulement les écrans visés");
});

test("proposerTestDepuisFiche : une réponse refusée repart au modèle avec la raison ; deux refus, erreur visible", async () => {
  const invented = answer((t) => (t.regles_calculables[0].texte_present = ["Relance effectuée"]));
  const requests = router(invented, answer());
  assert.equal((await proposerTestDepuisFiche(VAULT, "facturo", FICHE)).essais, 2);
  assert.match(requests[1].messages[3].content, /« Relance effectuée » n'est pas un libellé écrit entre « »/);

  mock.restoreAll();
  router(invented, invented, answer());
  await assert.rejects(proposerTestDepuisFiche(VAULT, "facturo", FICHE), /^Error: Test refusé après 2 essais \(openai\/gpt-oss-120b:fastest, changements\/bouton-relancer\.md\)/);
});

test("proposerTestDepuisFiche : une fiche sans « Ce qui change », sans écran visé ou avec un écran inconnu ne coûte aucun appel", async () => {
  const requests = router(answer());
  await assert.rejects(proposerTestDepuisFiche(VAULT, "facturo", { ...FICHE, texte: "# Titre\n" }), /sans phrase « Ce qui change : »/);
  await assert.rejects(proposerTestDepuisFiche(VAULT, "facturo", { ...FICHE, ecrans_vises: [] }), /sans écran visé/);
  await assert.rejects(proposerTestDepuisFiche(VAULT, "facturo", { ...FICHE, ecrans_vises: ["parametres"] }), /écran\(s\) visé\(s\) sans note dans facturo : parametres/);
  assert.equal(requests.length, 0);
});
