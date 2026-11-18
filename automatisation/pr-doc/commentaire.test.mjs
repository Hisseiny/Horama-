import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ecrireCommentaire, ecrireSectionExploration, publierCommentaire } from "./commentaire.mjs";

const base = { passage: "2026-11-18-15h00-abcd", rejoues: ["voir-accueil (relève accueil)"], ecartes: ["voir-programmes (page non touchée)"], note: "vault-horama/site/passages/2026-11-18-15h00-abcd.md" };

test("le commentaire dit les tests, les défauts prouvés, les doutes, les décisions et la note", () => {
  const corps = ecrireCommentaire({ ...base, prouves: [{ id: "p1", ecran: "accueil", texte: "« 3 ans » sur l'accueil, « 4 ans » sur la page des programmes." }],
    doutes: [{ id: "d1", ecran: "programmes", texte: "Quelque chose a changé ici." }], decisions: [{ ecart_id: "p1", decision: "bug" }] });
  assert.match(corps, /^## Horama : passage 2026-11-18-15h00-abcd/);
  assert.match(corps, /\*\*1 défaut prouvé, 1 doute\.\*\*/);
  assert.match(corps, /- Rejoué : voir-accueil \(relève accueil\)/);
  assert.match(corps, /- Écarté : voir-programmes \(page non touchée\)/);
  assert.match(corps, /- accueil : « 3 ans » sur l'accueil, « 4 ans » sur la page des programmes\. \(décision : bug\)/);
  assert.match(corps, /### Doutes, rien n'est prouvé\n\n- programmes : Quelque chose a changé ici\. \(décision : pas tranché\)/);
  assert.match(corps, /`vault-horama\/site\/passages\/2026-11-18-15h00-abcd\.md`/);
  assert.doesNotMatch(corps, /[—–]/, "aucun tiret cadratin");
});

test("rien à signaler, ou un passage incomplet, est dit tel quel", () => {
  assert.match(ecrireCommentaire({ ...base, prouves: [], doutes: [], decisions: [] }), /\*\*Aucun défaut prouvé, aucun doute : rien à signaler\.\*\*/);
  assert.match(ecrireCommentaire({ ...base, prouves: [], doutes: [], decisions: [], complet: false }), /\*\*Passage incomplet/);
});

test("publication par gh pr comment ; un échec est rendu, jamais levé", async () => {
  const calls = [];
  const ok = await publierCommentaire("https://github.com/o/d/pull/7", "corps", { run: async (command, args) => {
    calls.push([command, args.slice(0, 3), readFileSync(args[4], "utf8")]);
    return { stdout: "https://github.com/o/d/pull/7#issuecomment-1\n" };
  } });
  assert.deepEqual(ok, { status: "publie", url: "https://github.com/o/d/pull/7#issuecomment-1" });
  assert.deepEqual(calls, [["gh", ["pr", "comment", "https://github.com/o/d/pull/7"], "corps"]]);
  const ko = await publierCommentaire("https://github.com/o/d/pull/7", "corps", { run: async () => { throw new Error("Command failed\nGraphQL: Resource not accessible by integration"); } });
  assert.deepEqual(ko, { status: "INCONCLUSIVE", reason: "GraphQL: Resource not accessible by integration" });
});

test("exploration : défauts prouvés avec page, zone, preuve et décision ; doutes de Holo à part ; déjà voulus ; pages non visitées", () => {
  const corps = ecrireSectionExploration({
    adresse: "https://p.vercel.app/", bilan: { aucune: false, nonVisitees: [{ chemin: "/compte", raison: "Cette page demande une connexion." }] },
    totaux: { pages_visitees: 7, pages_trouvees: 8 },
    prouves: [{ id: "c1", chemin: "/programmes", texte: "Le texte est rogné dans sa boîte.", preuve: "Mesuré : 312 px de texte pour 180 px de boîte. Attendu : le texte tient dans sa boîte.", zone: { x: 40.4, y: 612, largeur: 180, hauteur: 48 } }],
    doutes: [{ id: "h1", chemin: "/", texte: "Un texte semble coupé.", preuve: null, zone: { x: 700, y: 300, largeur: 200, hauteur: 60 } }],
    dejaVoulus: [{ id: "c2", chemin: "/admissions", texte: "Le bouton déborde.", preuve: null, zone: null }],
    decisions: [{ ecart_id: "c1", decision: "bug" }], note: "vault-horama/p-vercel-app/passages/P2.md",
  });
  assert.match(corps, /^### Exploration de tout le site de la prévisualisation\n\nhttps:\/\/p\.vercel\.app\/ : 7 pages visitées sur 8 trouvées\./);
  assert.match(corps, /\*\*1 défaut de mise en page prouvé, 1 doute\.\*\*/);
  assert.match(corps, /#### Défauts prouvés par le code\n\n- \/programmes : Le texte est rogné dans sa boîte\. Mesuré : 312 px de texte pour 180 px de boîte\. Attendu : le texte tient dans sa boîte\. \(zone x 40, y 612, 180 × 48 px sur la capture, décision : bug\)/);
  assert.match(corps, /#### Doutes du regard de Holo, rien n'est prouvé\n\n- \/ : Un texte semble coupé\. \(zone x 700, y 300, 200 × 60 px sur la capture, décision : pas tranché\)/);
  assert.match(corps, /#### Déjà déclarés voulus, non redemandés\n\n- \/admissions : Le bouton déborde\. \(zone non mesurée\)/);
  assert.match(corps, /#### Pages non visitées\n\n- \/compte : Cette page demande une connexion\n/);
  assert.match(corps, /`vault-horama\/p-vercel-app\/passages\/P2\.md`/);
  assert.doesNotMatch(corps, /[—–]/);
});

test("exploration : un site qui n'a pas pu être visité dit seulement pourquoi", () => {
  const corps = ecrireSectionExploration({ adresse: "https://x", bilan: { aucune: true, phrase: "Horama n'a pas pu visiter ce site : ce site bloque les robots (_Incapsula_Resource).", nonVisitees: [] },
    totaux: { pages_visitees: 0, pages_trouvees: 1 }, prouves: [], doutes: [], decisions: [], note: "vault-horama/x/passages/P.md" });
  assert.match(corps, /\*\*Horama n'a pas pu visiter ce site : ce site bloque les robots \(_Incapsula_Resource\)\.\*\*/);
  assert.doesNotMatch(corps, /défaut|pages visitées/);
});
