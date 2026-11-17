import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { runInNewContext } from "node:vm";
import { ecrireTestAccepte } from "@horama/memoire";
import { BaseMemoire } from "./src/base.ts";
import { construireConsigne } from "./src/consigne.ts";
import { creerCoureur } from "./src/coureur.ts";
import type { Session } from "./src/session.ts";

let vault: string;
const baseUrl = "https://demo.dolibarr.org";
const path = "/compta/facture/list.php";
const id = "liste-factures-total-ttc";
const options = () => ({ vault, logiciel: "dolibarr", version: "24", baseUrl, ids: [id] });
function note(url = path) {
  writeFileSync(join(vault, "dolibarr/produit/liste-des-factures.md"), `---\necran: liste-des-factures\nurl: ${url}\n---\n# Factures clients\n`);
}
function accepted(url = `${path}?lang=fr_FR`) {
  ecrireTestAccepte(vault, {
    id, logiciel: "dolibarr", source: "produit/liste-des-factures.md", passages_de_la_source: [],
    releves: [{ ecran: "liste-des-factures", vue: "defaut" }],
    test_markdown: "# Total TTC\n\n## Setup\nSession déjà ouverte.\n\n## Task\n1. Relever la liste.\n\n## Expected Result\nTotal égal à la somme.\n\n## Verification\nComparer les montants.\n",
    regles_calculables: [{ type: "somme", ecran: "liste-des-factures", colonne: "Montant TTC", cible: "Total" }],
    questions: [], statut: "accepte", modele: "test",
  }, { url_depart: url, version_cible: "24", accepte_par: "test", accepte_le: "2026-11-17" });
}
beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "horama-dolibarr-"));
  mkdirSync(join(vault, "dolibarr/produit"), { recursive: true });
  note();
  accepted();
});
afterEach(() => { rmSync(vault, { recursive: true, force: true }); });

test("Dolibarr sans préfixe de version, query française dans l'adresse et motif here", () => {
  const consigne = construireConsigne(options());
  const step = consigne.course[0];
  assert.equal(consigne.start, `${baseUrl}${path}?lang=fr_FR`);
  assert.equal(step.address, `${path}?lang=fr_FR`);
  assert.ok(consigne.instructions.includes("N'utilise jamais le formulaire de connexion"));
  for (const [address, expected] of [
    [`${path}?lang=fr_FR`, true], [`${path}?page=0&lang=fr_FR`, true],
    [path, false], [`${path}?lang=en_US`, false], [`/v24${path}?lang=fr_FR`, false],
    [`${path}?lang=fr_FR&filtre=autre`, false],
  ] as const) {
    assert.equal(runInNewContext(step.here, { location: new URL(address, baseUrl), URLSearchParams }), expected, address);
  }
});

test("query de la note prioritaire, paramètres hérités et adresses sans query", () => {
  note(`${path}?lang=fr_FR&search_ref=FA001`);
  accepted(`${path}?lang=en_US&page=0`);
  let step = construireConsigne(options()).course[0];
  assert.equal(step.address, `${path}?lang=fr_FR&search_ref=FA001&page=0`);
  assert.equal(runInNewContext(step.here, { location: new URL(step.address, baseUrl), URLSearchParams }), true);
  assert.equal(runInNewContext(step.here, { location: new URL(`${path}?lang=fr_FR&page=0`, baseUrl), URLSearchParams }), false);
  note();
  accepted(path);
  const consigne = construireConsigne({ ...options(), regressions: ["exemple"] });
  step = consigne.course[0];
  assert.equal(step.address, path);
  assert.equal(consigne.start, `${baseUrl}${path}?r=exemple`);
  assert.equal(runInNewContext(step.here, { location: new URL(path, baseUrl), URLSearchParams }), true);
});

test("les paramètres de départ ne sont pas transmis à un autre hôte", () => {
  note(`https://autre.example${path}`);
  const step = construireConsigne(options()).course[0];
  assert.equal(step.address, `https://autre.example${path}`);
});

test("le coureur refuse langue, hôte et écran incorrects puis enregistre le relevé français et son C4", async () => {
  const base = new BaseMemoire();
  let address = "";
  const session: Session = async ({ consigne, onCreated, onTool }) => {
    await onCreated("session-dolibarr");
    return { id: "session-dolibarr", fin: Promise.resolve().then(async () => {
      const step = consigne.course[0];
      for (const url of [`${baseUrl}${path}`, `${baseUrl}${path}?lang=en_US`, `${baseUrl}/autre.php?lang=fr_FR`, `https://autre.example${path}?lang=fr_FR`]) {
        address = url;
        assert.match(await onTool("relever", { ...step }), /écran non atteint/);
        assert.equal(base.captures.size, 0);
      }
      address = `${baseUrl}${path}?page=0&lang=fr_FR`;
      assert.equal(await onTool("relever", { ...step }), "Capture enregistrée.");
      await onTool("terminer", { etat: "reussi" });
      return { id: "session-dolibarr", muted: false, cout_usd: 0, etapes: 1 };
    }) };
  };
  const runner = creerCoureur({ vault, base, baseUrl, session, relever: async () => ({
    png: new Uint8Array([1]), texte: "Réf.\tMontant TTC\nFA001\t100,00\nFA002\t167,20\nTotal\t267,20",
    url_page: address, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Capture enregistrée.",
  }) });
  const { passage_id } = await runner.lancerPassage({ logiciel: "dolibarr", version_testee: "24", version_reference: "24", tests: [id] });
  assert.equal((await runner.attendreFin(passage_id)).passage.etat, "joue");
  assert.equal(base.captures.size, 1);
  assert.equal(base.resultats[0].statut, "PASS");
  assert.match(base.resultats[0].calcul!, /267,20/);
});
