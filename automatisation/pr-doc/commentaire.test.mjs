import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ecrireCommentaire, publierCommentaire } from "./commentaire.mjs";

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
