import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { TestPropose } from "@horama/contrats";
import { ecrireTestAccepte, lireNotes, lireTestAccepte, urlDepart } from "@horama/memoire";
import { proposerTests } from "../index.ts";
import { validateAnswer } from "../generation/validation.ts";

// No test reaches the network: the answers are files of tests/reponses/, and fetch is replaced when proposerTests is called.
// v13.json and v13--choix-invalide.json are answers of openai/gpt-oss-120b of 2026-11-16 (second and first try of the same call),
// transcribed from the trace of the call (same content, JSON layout not guaranteed); liste-des-factures--ecrite-a-la-main.json is written by hand.
// To be replaced by files of generation/essais/ once T4 has run.
const VAULT = fileURLToPath(new URL("../../vault-horama", import.meta.url));
const V13 = "notes-de-version/v13.md";
const LISTE = "produit/liste-des-factures.md";
const MODEL = "openai/gpt-oss-120b:fastest";
const recorded = (name: string) => readFileSync(new URL(`./reponses/${name}.json`, import.meta.url), "utf8");
const notes = lireNotes(VAULT, "facturo");
const source = (chemin: string) => ({
  logiciel: "facturo",
  note: notes.find((note) => note.chemin === chemin)!,
  screens: ["detail-facture", "liste-des-factures", "tableau-de-bord"],
  modele: MODEL,
});
type Slots = Record<string, any>;
// One recorded answer, changed in one place.
const changed = (name: string, change: (tests: Slots[]) => void) => {
  const answer = JSON.parse(recorded(name)) as { tests: Slots[] };
  change(answer.tests);
  return JSON.stringify(answer);
};

const FILTER_TEST: TestPropose = {
  id: "filtre-echeance-depassee-liste-factures",
  logiciel: "facturo",
  source: V13,
  passages_de_la_source: ["Nouveau filtre « Échéance dépassée » sur la liste des factures : il n'affiche que les factures dont la date d'échéance est passée."],
  releves: [{ ecran: "liste-des-factures", vue: "filtre-echeance-depassee" }],
  test_markdown: [
    "# Liste des factures : filtre Échéance dépassée",
    "",
    "## Setup",
    "Connecté avec le compte de démo, sur la liste des factures, sans filtre.",
    "",
    "## Task",
    "1. cliquer sur le menu « Filtrer »",
    "2. choisir le filtre « Échéance dépassée »",
    "",
    "## Expected Result",
    "Seules les factures dont l’échéance est passée sont affichées.",
    "",
    "## Verification",
    "- FAIL if une ligne affichée a une échéance postérieure ou égale à aujourd'hui.",
  ].join("\n"),
  regles_calculables: [{ type: "filtre", ecran: "liste-des-factures", filtre: "Échéance dépassée", colonne: "Échéance", condition: "< aujourd_hui" }],
  questions: [{ texte: "La date d'échéance du jour compte-t-elle comme passée ?", choix: ["Oui", "Non"] }],
  statut: "propose",
  modele: MODEL,
};

test("réponse enregistrée de v13 : 2 tests C1, tout ce qui n'est pas une case est écrit par le code", () => {
  const { tests, reasons } = validateAnswer(recorded("v13"), source(V13));
  assert.deepEqual(reasons, []);
  assert.equal(tests.length, 2);
  assert.deepEqual(tests[0], FILTER_TEST);
  const exporter = tests[1];
  assert.deepEqual(
    { id: exporter.id, logiciel: exporter.logiciel, source: exporter.source, releves: exporter.releves, regles: exporter.regles_calculables, questions: exporter.questions, statut: exporter.statut, modele: exporter.modele },
    { id: "bouton-exporter-deplacement-liste-factures", logiciel: "facturo", source: V13, releves: [{ ecran: "liste-des-factures", vue: "defaut" }], regles: [], questions: [], statut: "propose", modele: MODEL },
  );
  for (const { test_markdown } of tests) {
    assert.deepEqual(test_markdown.split("\n").filter((line) => line.startsWith("#")).map((line) => line.replace(/^# .*/, "#")), ["#", "## Setup", "## Task", "## Expected Result", "## Verification"]);
    assert.ok(!test_markdown.includes("---"), "pas d'en-tête");
    assert.ok(!test_markdown.includes("relever"), "pas de phrase finale");
  }
});

test("les 2 tests de v13 s'écrivent par ecrireTestAccepte dans une copie du vault et se relisent", () => {
  const copy = mkdtempSync(join(tmpdir(), "horama-jugement-"));
  after(() => rmSync(copy, { recursive: true, force: true }));
  cpSync(VAULT, copy, { recursive: true });
  for (const proposed of validateAnswer(recorded("v13"), source(V13)).tests) {
    const url_depart = urlDepart(copy, "facturo", "13", proposed.releves[0].ecran);
    assert.equal(url_depart, "/v13/entrer?suite=/v13/factures");
    const written = ecrireTestAccepte(copy, proposed, { url_depart, version_cible: "13", accepte_par: "Léa", accepte_le: "2026-11-18" });
    assert.deepEqual(lireTestAccepte(copy, "facturo", proposed.id), written);
    assert.deepEqual(written.regles, proposed.regles_calculables);
    assert.match(written.markdown, /\n\d\. Pour chaque relevé listé dans releves, .* appelle l'outil relever avec ecran=<id> et vue=<vue>\.\n\n## Expected Result/);
  }
});

test("réponse enregistrée refusée : « choix » n'est pas une liste, les deux tests sont à refaire", () => {
  const { reasons } = validateAnswer(recorded("v13--choix-invalide"), source(V13));
  assert.deepEqual(reasons, ["test 1 : « questions.choix » doit être une liste d'au moins 2 élément(s)"]);
});

test("une réponse invalide de chaque sorte est refusée, avec sa raison", () => {
  const invalid: Array<[string, RegExp]> = [
    ["Voici les tests demandés.", /^la réponse n'est pas un objet JSON lisible$/],
    ['{ "tests": [] }', /^le champ « tests » manque ou est vide$/],
    [changed("v13", (tests) => (tests[0].id = "Filtre_Echeance")), /^test 1 : id « Filtre_Echeance » n'est pas en kebab-case$/],
    [changed("v13", (tests) => (tests[1].id = tests[0].id)), /^test 2 : l'id « filtre-echeance-depassee-liste-factures » est déjà celui d'un autre test$/],
    [changed("v13", (tests) => (tests[1].releves[0].ecran = "barre-d-actions")), /^test 2 : l'écran « barre-d-actions » n'existe pas dans le vault \(écrans : detail-facture, liste-des-factures, tableau-de-bord\)$/],
    [changed("v13", (tests) => (tests[0].regles_calculables[0].condition = "< aujourd'hui")), /^test 1 : la règle 1 n'est pas une règle du contrat \(condition « < aujourd'hui » hors du contrat/],
    [changed("v13", (tests) => (tests[0].regles_calculables[0] = { type: "tri", ecran: "liste-des-factures", colonne: "Échéance" })), /^test 1 : la règle 1 n'est pas une règle du contrat \(type de règle inconnu « tri »\)$/],
    [changed("v13", (tests) => (tests[0].passages_de_la_source = ["il n'affiche que les factures dont la date d'échéance est dépassée"])), /^test 1 : le passage « il n'affiche .* dépassée » n'est pas recopié mot pour mot de la note$/],
    [changed("v13", (tests) => (tests[0].passages_de_la_source = [])), /^test 1 : « passages_de_la_source » doit être une liste d'au moins 1 élément\(s\)$/],
    [changed("v13", (tests) => (tests[1].releves = [])), /^test 2 : « releves » doit être une liste d'au moins 1 élément\(s\)$/],
    [changed("v13", (tests) => (tests[0].releves[0].vue = "Filtre échéance")), /^test 1 : vue « Filtre échéance » n'est pas en kebab-case$/],
    [changed("v13", (tests) => (tests[0].releves[0].ecran = "tableau-de-bord")), /^test 1 : l'écran « liste-des-factures », cité par une règle, n'est pas dans releves$/],
    [changed("v13", (tests) => (tests[0].verifications = ["Le filtre doit marcher."])), /^test 1 : la vérification « Le filtre doit marcher\. » ne commence pas par « FAIL if »$/],
    [changed("v13", (tests) => delete tests[1].etapes), /^test 2 : « etapes » doit être une liste d'au moins 1 élément\(s\)$/],
    [changed("v13", (tests) => (tests[1].titre = "Liste des factures\n## Task")), /^test 2 : « titre » doit être un texte d'une seule ligne$/],
    [changed("v13", (tests) => ((tests[1].releves as Array<{ vue: string }>)[0].vue = "exporter-en-haut")), /^test 2 : la vue « exporter-en-haut » n'est pas « defaut » alors qu'aucune étape ne choisit/],
    [changed("v13", (tests) => (tests[0].questions = [])), /^test 1 : la règle de filtre \(« < aujourd_hui »\) a une limite dont la note ne dit pas si elle compte : ajoute la question$/],
  ];
  for (const [answer, reason] of invalid) {
    const { reasons } = validateAnswer(answer, source(V13));
    assert.equal(reasons.length, 1, answer);
    assert.match(reasons[0], reason);
  }
  const several = validateAnswer(changed("v13", (tests) => Object.assign(tests[0], { id: "A", setup: "" })), source(V13)).reasons;
  assert.deepEqual(several, ["test 1 : id « A » n'est pas en kebab-case ; « setup » doit être un texte d'une seule ligne"], "toutes les raisons d'un test sont rendues");
});

test("une réponse entourée d'un bloc de code ou d'une phrase est lue ; les numéros des étapes sont ceux du code", () => {
  const numbered = changed("v13", (tests) => (tests[0].etapes = ["1. Ouvrir le menu « Filtrer ».", "2) Choisir « Échéance dépassée »."]));
  const { tests, reasons } = validateAnswer(`Voici le JSON :\n\`\`\`json\n${numbered}\n\`\`\``, source(V13));
  assert.deepEqual(reasons, []);
  assert.ok(tests[0].test_markdown.includes("## Task\n1. Ouvrir le menu « Filtrer ».\n2. Choisir « Échéance dépassée ».\n\n## Expected Result"));
});

test("note qui porte des lignes regle: : les règles des tests sont exactement celles de la note", () => {
  const { tests, reasons } = validateAnswer(recorded("liste-des-factures--ecrite-a-la-main"), source(LISTE));
  assert.deepEqual(reasons, []);
  assert.deepEqual(tests[0].regles_calculables, notes.find((note) => note.chemin === LISTE)!.regles.flatMap(({ regle }) => regle ?? []));

  const refused = (change: (tests: Slots[]) => void) => validateAnswer(changed("liste-des-factures--ecrite-a-la-main", change), source(LISTE)).reasons;
  assert.deepEqual(refused((tests) => tests[0].regles_calculables.pop()), [
    'la règle de la note {"type":"presence","ecran":"liste-des-factures","colonne":"Échéance"} n\'est portée par aucun test',
  ]);
  assert.deepEqual(refused((tests) => tests[0].regles_calculables.push({ type: "presence", ecran: "liste-des-factures", colonne: "Client" })), [
    'la règle {"type":"presence","ecran":"liste-des-factures","colonne":"Client"} n\'est pas une règle écrite dans la note',
  ]);
  assert.deepEqual(refused((tests) => (tests[0].regles_calculables[0].cible = "Total TTC")), [
    'la règle de la note {"type":"somme","ecran":"liste-des-factures","colonne":"Montant TTC","cible":"Total"} n\'est portée par aucun test',
    'la règle {"type":"somme","ecran":"liste-des-factures","colonne":"Montant TTC","cible":"Total TTC"} n\'est pas une règle écrite dans la note',
  ]);
});

// ---------- proposerTests, with the router replaced by recorded answers ----------

process.env.HF_TOKEN = "jeton-de-test";
afterEach(() => mock.restoreAll());

function router(...answers: Array<string | Response>) {
  const requests: Array<{ model: string; temperature: number; messages: Array<{ role: string; content: string }> }> = [];
  mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    const answer = answers[requests.length - 1];
    if (answer instanceof Response) return answer;
    return new Response(JSON.stringify({ choices: [{ message: { content: answer } }], usage: { prompt_tokens: 2203, completion_tokens: 1856 } }));
  });
  return requests;
}

test("proposerTests : la note, les écrans et la grammaire partent au modèle, à température 0 ; réponse valide au premier essai", async () => {
  const requests = router(recorded("v13"));
  const calls: unknown[] = [];
  const proposal = await proposerTests(VAULT, "facturo", V13, { trace: (call) => calls.push(call) });
  assert.deepEqual({ tests: proposal.tests.map(({ id }) => id), modele: proposal.modele, essais: proposal.essais }, {
    tests: ["filtre-echeance-depassee-liste-factures", "bouton-exporter-deplacement-liste-factures"], modele: MODEL, essais: 1,
  });
  assert.ok(proposal.duree_ms >= 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, MODEL);
  assert.equal(requests[0].temperature, 0);
  const [system, user] = requests[0].messages;
  for (const type of ["somme", "egalite", "filtre", "format", "presence"]) assert.ok(system.content.includes(`"type": "${type}"`), type);
  assert.ok(user.content.includes("Version testée : 13."));
  assert.ok(user.content.includes("le bouton « Exporter » passe en haut à droite."), "la note source");
  for (const screen of ["tableau-de-bord", "liste-des-factures", "detail-facture"]) assert.ok(user.content.includes(`ecran: ${screen}\n`), screen);
  assert.ok(user.content.includes("Règles déjà écrites dans la note source : aucune."));
  assert.equal(calls.length, 1);
  assert.deepEqual((calls[0] as { rejections: string[] }).rejections, []);
});

test("proposerTests : les règles déjà écrites dans la note partent au modèle, lues par @horama/memoire", async () => {
  const requests = router(recorded("liste-des-factures--ecrite-a-la-main"));
  const proposal = await proposerTests(VAULT, "facturo", LISTE, { modele: "Qwen/Qwen3.8-27B", version: "12" });
  assert.equal(proposal.tests[0].modele, "Qwen/Qwen3.8-27B");
  assert.equal(requests[0].model, "Qwen/Qwen3.8-27B");
  const user = requests[0].messages[1].content;
  assert.ok(user.includes("Version testée : 12."));
  assert.ok(user.includes('- phrase : Chaque facture a une échéance.\n  règle : {"type":"presence","ecran":"liste-des-factures","colonne":"Échéance"}'));
  assert.equal(user.split("\n  règle : ").length - 1, 4);
});

test("proposerTests : une réponse refusée repart au modèle avec la raison, pour un second essai", async () => {
  const requests = router(recorded("v13--choix-invalide"), recorded("v13"));
  const proposal = await proposerTests(VAULT, "facturo", V13);
  assert.equal(proposal.essais, 2);
  assert.equal(proposal.tests.length, 2);
  assert.deepEqual(requests[1].messages.map(({ role }) => role), ["system", "user", "assistant", "user"]);
  assert.equal(requests[1].messages[2].content, recorded("v13--choix-invalide"));
  assert.ok(requests[1].messages[3].content.includes("- test 1 : « questions.choix » doit être une liste d'au moins 2 élément(s)"));
});

test("proposerTests : deux réponses refusées, erreur visible avec les raisons, pas de troisième appel, aucun test rendu", async () => {
  const requests = router(recorded("v13--choix-invalide"), recorded("v13--choix-invalide"), recorded("v13"));
  await assert.rejects(proposerTests(VAULT, "facturo", V13), /Tests refusés après 2 essais \(openai\/gpt-oss-120b:fastest, notes-de-version\/v13\.md\) : test 1 : « questions\.choix »/);
  assert.equal(requests.length, 2);
});

test("proposerTests : un appel en échec n'est pas masqué (code HTTP et message du service, jamais le jeton), et n'est pas retenté", async () => {
  const requests = router(new Response(JSON.stringify({ error: { message: "Invalid credentials" } }), { status: 401 }), recorded("v13"));
  const calls: Array<{ status: number | null; error?: string }> = [];
  await assert.rejects(proposerTests(VAULT, "facturo", V13, { trace: (call) => calls.push(call) }), (error: Error) => {
    assert.equal(error.message, "Génération impossible (openai/gpt-oss-120b:fastest, notes-de-version/v13.md) : HTTP 401 : Invalid credentials");
    return true;
  });
  assert.equal(requests.length, 1);
  assert.deepEqual(calls.map(({ status, error }) => ({ status, error })), [{ status: 401, error: "HTTP 401 : Invalid credentials" }]);
  assert.ok(!JSON.stringify(calls).includes("jeton-de-test"));

  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  await assert.rejects(proposerTests(VAULT, "facturo", V13), /Génération impossible .* : délai de 45 s dépassé$/);
});

test("proposerTests : une note absente du vault est nommée, sans appel au modèle", async () => {
  const requests = router(recorded("v13"));
  await assert.rejects(proposerTests(VAULT, "facturo", "notes-de-version/v14.md"), /Note « notes-de-version\/v14\.md » introuvable dans facturo/);
  assert.equal(requests.length, 0);
});
