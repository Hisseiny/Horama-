// bilanExploration (recapitulatif.mjs): what the summary says when an exploration could not visit (PR #117). No Chrome,
// no network. Run from this folder: node --test recapitulatif.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { bilanExploration, dejaVoulu, revoir } from "./recapitulatif.mjs";

// The site blocked by its anti-robot (as in docs/tests/2026-11-18-a67-anti-robot.md, skema.edu): no page, no H session.
const bloquee = {
  format: "horama-exploration-1", etat: "fini", adresse: "https://www.skema.edu/fr",
  agents: [{ agent: 1, session_id: null, etat: "fini", raison: "ce site bloque les robots (_Incapsula_Resource)." }],
  pages: [{ ecran: "accueil", url: "https://www.skema.edu/fr", etat: "non_visitee", raison: "ce site bloque les robots (_Incapsula_Resource)." }],
  constats: [{ id: "accueil--controle--1", ecran: "accueil", statut: "INCONCLUSIVE", raison: "ce site bloque les robots (_Incapsula_Resource)." }],
  totaux: { pages_trouvees: 1, pages_visitees: 0, defauts: 0, doutes: 0, sans_conclusion: 1, par_sorte: {} },
};

// A run that visited some pages and not others.
const partielle = {
  format: "horama-exploration-1", etat: "interrompu", adresse: "https://www.exemple.fr/",
  agents: [{ agent: 1, etat: "tombe", raison: "Des pages n'ont pas été visitées." }],
  pages: [
    { ecran: "accueil", url: "https://www.exemple.fr/", etat: "visitee", raison: null },
    { ecran: "tarifs", url: "https://www.exemple.fr/tarifs", etat: "non_visitee", raison: "La capture a échoué : CDP sans réponse : Page.captureScreenshot" },
    { ecran: "compte", url: "https://www.exemple.fr/compte", etat: "non_visitee" },
  ],
  constats: [{ id: "compte--controle--1", ecran: "compte", statut: "INCONCLUSIVE", raison: "Cette page demande une connexion." }],
  totaux: { pages_trouvees: 3, pages_visitees: 1, defauts: 0, doutes: 0, sans_conclusion: 1, par_sorte: {} },
};

test("aucune page visitée : la raison de l'agent, en une phrase", () => {
  assert.deepEqual(bilanExploration(bloquee), {
    aucune: true,
    phrase: "Horama n'a pas pu visiter ce site : ce site bloque les robots (_Incapsula_Resource).",
    nonVisitees: [{ chemin: "/fr", raison: "ce site bloque les robots (_Incapsula_Resource)." }],
  });
  // Without a reason of the agent: the reason of a page, with a capital letter put down; without any: the bare sentence.
  const parPage = { ...bloquee, agents: [{ agent: 1, raison: null }], pages: [{ ...bloquee.pages[0], raison: "Page introuvable (404)." }] };
  assert.equal(bilanExploration(parPage).phrase, "Horama n'a pas pu visiter ce site : page introuvable (404).");
  const sans = { ...bloquee, agents: [], pages: [{ ...bloquee.pages[0], raison: null }], constats: [] };
  assert.equal(bilanExploration(sans).phrase, "Horama n'a pas pu visiter ce site.");
});

test("des pages visitées : chaque page non visitée avec sa raison, celle de la page ou celle de son constat", () => {
  assert.deepEqual(bilanExploration(partielle), {
    aucune: false,
    nonVisitees: [
      { chemin: "/tarifs", raison: "La capture a échoué : CDP sans réponse : Page.captureScreenshot" },
      { chemin: "/compte", raison: "Cette page demande une connexion." },
    ],
  });
});

test("exploration en cours : jamais « n'a pas pu visiter »", () => {
  assert.equal(bilanExploration({ ...bloquee, etat: "en_cours" }).aucune, false);
});

test("déjà voulu : même page, même description, zones qui se recoupent ; une décision « bug » ne compte pas", () => {
  const constat = { id: "programmes--controle--2", ecran: "programmes", description: "Le texte est rogné dans sa boîte.", zone: { x: 40, y: 600, largeur: 180, hauteur: 48 } };
  const voulu = { id: "d1", decision: "voulu", ecran: "programmes", ecart: "Le texte est rogné dans sa boîte.", zone: { x: 44, y: 604, largeur: 180, hauteur: 48 } };
  assert.equal(dejaVoulu(constat, [voulu]), voulu);
  const sansZone = { ...voulu, zone: undefined };
  assert.equal(dejaVoulu(constat, [sansZone]), sansZone, "décision sans zone : la page et la description suffisent");
  assert.equal(dejaVoulu(constat, [{ ...voulu, decision: "bug" }]), null);
  assert.equal(dejaVoulu(constat, [{ ...voulu, ecran: "accueil" }]), null);
  assert.equal(dejaVoulu(constat, [{ ...voulu, ecart: "Le bouton déborde." }]), null);
  assert.equal(dejaVoulu(constat, [{ ...voulu, zone: { x: 900, y: 100, largeur: 50, hauteur: 20 } }]), null);
});

// --choix taken again from the start (S9): three questions, two answers given: voulu, bug, then voulu again; every
// question answered, none left to a human. A mascot that reports each choice as the layer does.
test("revoir : --choix repris en boucle quand il y a plus de questions que de réponses", async () => {
  let report = null;
  const asked = [];
  const mascot = async (command, value) => {
    if (command === "choisir") {
      asked.push(value);
      report?.({ choix: value });
    }
  };
  const item = (id) => ({ id, genre: "doute", etat: "doute", texte: id, png: Buffer.from("png"), zones: [], page: null, textes: ["Un texte."], question: "Bug, ou voulu ?" });
  const made = await revoir({ mascot, recap: {}, items: ["a", "b", "c"].map(item), choix: ["voulu", "bug"], presentation: false, witness: async () => {}, say: () => {} },
    () => new Promise((resolve) => (report = resolve)));
  assert.deepEqual(asked, ["voulu", "bug", "voulu"]);
  assert.deepEqual(made.map(({ choix }) => choix), ["voulu", "bug", "voulu"]);
});
