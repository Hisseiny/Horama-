import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { TestAccepte, TestPropose } from "@horama/contrats";
import { c1TestPropose, c2TestAccepte } from "@horama/contrats/exemples";
import { ecrireTestAccepte, lireTestAccepte, lireTestsAcceptes } from "../index.ts";
import { splitFrontMatter } from "../src/files.ts";
import { REAL_VAULT, temporaryVault } from "./vault.ts";

const vault = temporaryVault();
const VAULT_TESTS = ["ca-du-mois-egal-total", "detail-facture-total-egal-liste", "liste-factures-filtre-echeance"];
const FINAL_STEP =
  "Pour chaque relevé listé dans releves, une fois l'écran dans cet état, la page chargée et en haut de page, appelle l'outil relever avec ecran=<id> et vue=<vue>.";
const options = { url_depart: "/v13/entrer?suite=/v13/factures", version_cible: "13", accepte_par: "Léa", accepte_le: "2026-11-18" };
const file = (root: string, id: string) => readFileSync(join(root, "facturo/tests", `${id}.md`), "utf8");

// Rewrites a test that was read, with the acceptance fields of its own header.
function rewrite(root: string, read: TestAccepte): TestAccepte {
  const { header } = splitFrontMatter(read.markdown);
  return ecrireTestAccepte(
    root,
    { ...c1TestPropose, id: read.id, logiciel: read.logiciel, source: read.source, releves: read.releves, test_markdown: read.markdown, regles_calculables: read.regles },
    { url_depart: read.url_depart, version_cible: read.version_cible, timeout_s: read.timeout_s, accepte_par: String(header.accepte_par), accepte_le: String(header.accepte_le) },
  );
}

const bare: TestPropose = {
  ...c1TestPropose,
  id: "detail-facture-somme",
  source: "produit/detail-facture.md",
  releves: [{ ecran: "detail-facture", vue: "defaut" }],
  test_markdown: [
    "# Détail : le total est la somme des lignes",
    "",
    "## Setup",
    "Connecté avec le compte de démo, sur la liste des factures.",
    "",
    "## Task",
    "1. Cliquer sur le numéro « F-119 ».",
    "2. Attendre le détail de la facture.",
    "",
    "## Expected Result",
    "Le « Total TTC » est la somme des lignes.",
    "",
    "## Verification",
    "- FAIL if le « Total TTC » est différent de la somme des montants.",
  ].join("\n"),
  regles_calculables: [
    { type: "somme", ecran: "detail-facture", colonne: "Montant", cible: "Total TTC" },
    { type: "format", ecran: "detail-facture", colonne: "Montant", motif: "montant-fr" },
  ],
};

test("c1TestPropose (qui contient déjà un en-tête) : écrire puis lire rend le même TestAccepte", () => {
  const written = ecrireTestAccepte(vault, c1TestPropose, options);
  assert.deepEqual(written, c2TestAccepte);
  assert.equal(file(vault, c1TestPropose.id), c2TestAccepte.markdown);
  assert.deepEqual(lireTestAccepte(vault, "facturo", c1TestPropose.id), written);
  assert.equal(written.markdown.split("\n---\n").length, 2, "un seul en-tête");
});

test("un test sans en-tête ni phrase finale reçoit les deux, et l'aller-retour est sans perte", () => {
  const written = ecrireTestAccepte(vault, bare, { ...options, timeout_s: 120, accepte_par: "Léa : relecture #2" });
  assert.equal(written.markdown, [
    "---",
    "id: detail-facture-somme",
    "logiciel: facturo",
    "source: produit/detail-facture.md",
    "releves: [{ ecran: detail-facture, vue: defaut }]",
    "url_depart: /v13/entrer?suite=/v13/factures",
    'version_cible: "13"',
    "timeout_s: 120",
    "statut: accepte",
    'accepte_par: "Léa : relecture #2"',
    "accepte_le: 2026-11-18",
    "---",
    "",
    "# Détail : le total est la somme des lignes",
    "",
    "## Setup",
    "Connecté avec le compte de démo, sur la liste des factures.",
    "",
    "## Task",
    "1. Cliquer sur le numéro « F-119 ».",
    "2. Attendre le détail de la facture.",
    `3. ${FINAL_STEP}`,
    "",
    "## Expected Result",
    "Le « Total TTC » est la somme des lignes.",
    "",
    "## Verification",
    "- FAIL if le « Total TTC » est différent de la somme des montants.",
    "",
    "```regles",
    '[{ "type": "somme", "ecran": "detail-facture", "colonne": "Montant", "cible": "Total TTC" },',
    ' { "type": "format", "ecran": "detail-facture", "colonne": "Montant", "motif": "montant-fr" }]',
    "```",
    "",
  ].join("\n"));
  assert.equal(written.timeout_s, 120);
  const read = lireTestAccepte(vault, "facturo", bare.id);
  assert.deepEqual(read, written);
  assert.equal(splitFrontMatter(read.markdown).header.accepte_par, "Léa : relecture #2");
  assert.deepEqual(rewrite(vault, read), written);
  assert.equal(file(vault, bare.id), written.markdown, "relire puis réécrire ne change pas un octet");
});

test("timeout_s vaut 180 par défaut", () => {
  assert.equal(ecrireTestAccepte(temporaryVault(), bare, options).timeout_s, 180);
});

test("la phrase finale n'est jamais en double et finit toujours la section Task", () => {
  const misplaced = bare.test_markdown.replace("1. Cliquer", `1. ${FINAL_STEP}\n2. Cliquer`).replace("2. Attendre", "3. Attendre");
  const { markdown } = ecrireTestAccepte(temporaryVault(), { ...bare, test_markdown: misplaced }, options);
  assert.equal(markdown.split(FINAL_STEP).length, 2);
  assert.ok(markdown.includes(`3. Attendre le détail de la facture.\n4. ${FINAL_STEP}\n\n## Expected Result`));
});

test("le bloc regles du texte proposé est remplacé par celui du code", () => {
  const stale = `${bare.test_markdown}\n\n\`\`\`regles\n[{ "type": "presence", "ecran": "x", "colonne": "y" }]\n\`\`\`\n`;
  const written = ecrireTestAccepte(temporaryVault(), { ...bare, test_markdown: stale }, options);
  assert.equal(written.markdown.split("```regles").length, 2);
  assert.deepEqual(written.regles, bare.regles_calculables);
  assert.ok(!written.markdown.includes('"presence"'));
});

test("les 3 tests écrits à la main dans le vault se lisent", () => {
  const tests = lireTestsAcceptes(vault, "facturo").filter((read) => VAULT_TESTS.includes(read.id));
  assert.deepEqual(tests.map((read) => read.id), VAULT_TESTS);
  const [caDuMois, detail, filtre] = tests;
  assert.deepEqual(caDuMois.releves, [{ ecran: "tableau-de-bord", vue: "defaut" }, { ecran: "liste-des-factures", vue: "defaut" }]);
  assert.equal(caDuMois.url_depart, "/v13/entrer?suite=/v13/tableau-de-bord");
  assert.equal(caDuMois.version_cible, "13");
  assert.equal(caDuMois.timeout_s, 180);
  assert.equal(caDuMois.source, "produit/regles-entre-ecrans.md");
  assert.deepEqual(caDuMois.regles, [
    { type: "egalite", a: { ecran: "tableau-de-bord", champ: "CA du mois" }, b: { ecran: "liste-des-factures", champ: "Total" } },
  ]);
  assert.deepEqual(detail.regles.map((rule) => rule.type), ["egalite", "somme"]);
  assert.deepEqual(filtre.regles, c1TestPropose.regles_calculables);
});

test("les 3 tests du vault, réécrits, restent identiques à l'octet près", () => {
  const copy = temporaryVault();
  for (const id of VAULT_TESTS) {
    const read = lireTestAccepte(copy, "facturo", id);
    writeFileSync(join(copy, "facturo/tests", `${id}.md`), "");
    assert.deepEqual(rewrite(copy, read), read, id);
    assert.equal(file(copy, id), file(REAL_VAULT, id), id);
  }
});

test("refus : section manquante, sections dans le désordre, releves vide, id hors kebab-case, règle invalide", () => {
  const empty = temporaryVault();
  const refuse = (change: Partial<TestPropose>, reason: RegExp) => assert.throws(() => ecrireTestAccepte(empty, { ...bare, ...change }, options), reason);
  refuse({ test_markdown: bare.test_markdown.replace("## Expected Result", "## Résultat") }, /la section « ## Expected Result » manque/);
  refuse({ test_markdown: bare.test_markdown.replace("## Setup", "## Tmp").replace("## Task", "## Setup").replace("## Tmp", "## Task") }, /ne sont pas dans l'ordre/);
  refuse({ releves: [] }, /releves est vide/);
  refuse({ id: "Detail_Facture" }, /« Detail_Facture » refusé : l'id n'est pas en kebab-case/);
  refuse({ regles_calculables: [{ type: "format", ecran: "detail-facture", colonne: "Montant", motif: "iso" as "date-fr" }] }, /règle 1 invalide, motif « iso » hors du contrat/);
  assert.deepEqual(lireTestsAcceptes(empty, "facturo").map((read) => read.id), VAULT_TESTS, "aucun fichier écrit par un refus");
});

test("lecture : seuls les fichiers statut: accepte sont rendus ; un fichier invalide est nommé", () => {
  const copy = temporaryVault();
  const path = (id: string) => join(copy, "facturo/tests", `${id}.md`);
  const valid = file(copy, VAULT_TESTS[0]);
  writeFileSync(path("refuse"), valid.replace("statut: accepte", "statut: refuse"));
  assert.deepEqual(lireTestsAcceptes(copy, "facturo").map((read) => read.id), VAULT_TESTS);
  assert.throws(() => lireTestAccepte(copy, "facturo", "refuse"), /facturo\/tests\/refuse\.md : le test n'a pas le statut « accepte »/);

  const renamed = valid.replace(`id: ${VAULT_TESTS[0]}`, "id: invalide");
  const invalid: Array<[string, RegExp]> = [
    [renamed.replace("timeout_s: 180\n", ""), /invalide\.md : champ « timeout_s » manquant/],
    [renamed.replace("releves: [", "releves: [[["), /invalide\.md : en-tête YAML invalide/],
    [renamed.replace("releves: [{ ecran: tableau-de-bord, vue: defaut }, ", "releves: [{ ecran: tableau-de-bord }, "), /invalide\.md : champ « releves.vue » manquant/],
    [renamed.replace('"champ": "Total" } }]', '"champ": "Total" }'), /invalide\.md : bloc de règles illisible/],
    [renamed.replace('"type": "egalite"', '"type": "moyenne"'), /invalide\.md : type de règle inconnu « moyenne »/],
    [renamed.replace(/```regles[\s\S]*$/, ""), /invalide\.md : un seul bloc ```regles attendu, 0 trouvé/],
    [valid, /invalide\.md : l'id de l'en-tête \(ca-du-mois-egal-total\) n'est pas le nom du fichier/],
  ];
  for (const [content, reason] of invalid) {
    writeFileSync(path("invalide"), content);
    assert.throws(() => lireTestAccepte(copy, "facturo", "invalide"), reason);
    assert.throws(() => lireTestsAcceptes(copy, "facturo"), reason);
  }
});
