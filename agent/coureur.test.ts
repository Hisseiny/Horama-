import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { BaseMemoire } from "./src/base.ts";
import { creerCoureur } from "./src/coureur.ts";
import type { ReleveCapture } from "./src/coureur.ts";
import type { Session, SessionInput } from "./src/session.ts";
import { creerSessionH } from "./src/session.ts";

const sourceVault = fileURLToPath(new URL("../vault-horama", import.meta.url));
let vault: string;
beforeEach(() => {
  vault = mkdtempSync(join(tmpdir(), "horama-runner-"));
  cpSync(join(sourceVault, "facturo"), join(vault, "facturo"), { recursive: true });
});
afterEach(() => { rmSync(vault, { recursive: true, force: true }); });
const input = { logiciel: "facturo", version_testee: "13", version_reference: "12", tests: ["ca-du-mois-egal-total", "detail-facture-total-egal-liste", "liste-factures-filtre-echeance"] };
const png = new Uint8Array([137, 80, 78, 71]);
const result = { id: "session-1", muted: false, cout_usd: 0.02, etapes: 4 };

function fixture(ecran: string, vue: string): ReleveCapture {
  const path = ecran === "liste-des-factures" ? "/factures" : ecran === "detail-facture" ? "/factures/F-119" : "/tableau-de-bord";
  return { png, texte: `Texte de ${ecran}`, url_page: `http://localhost:3100/v13${path}${vue === "filtre-echeance" ? "?filtre=echeance-depassee" : ""}`, largeur: 1280, hauteur: 900, defilement: [0, 0], phrase: "Continue le parcours." };
}

function fakeSession(run: (input: SessionInput) => Promise<void>, overrides = {}): Session {
  return async (sessionInput) => {
    await sessionInput.onCreated(result.id);
    return { id: result.id, fin: Promise.resolve().then(async () => { await run(sessionInput); return { ...result, ...overrides }; }) };
  };
}

test("un parcours, quatre captures uniques, attribution au premier test et rapport des trois tests", async () => {
  const base = new BaseMemoire();
  let shots = 0;
  let clock = 0;
  const session = fakeSession(async ({ consigne, onStep, onTool }) => {
    for (const [index, step] of consigne.course.entries()) {
      await onStep({ etape: index + 1, horodatage: "2026-11-16T12:00:00Z", action: "Ouvre une page", etat_session: "en_cours" });
      assert.equal(await onTool("relever", { ...step }), "Continue le parcours.");
      assert.equal(await onTool("relever", { ...step }), "Continue le parcours.");
    }
    assert.equal(await onTool("terminer", { etat: "reussi" }), "Parcours terminé. N'effectue plus aucune action.");
  }, { replay_url: "https://agp.eu.hcompany.ai/share/replay" });
  const coureur = creerCoureur({ vault, base, session, baseUrl: "http://localhost:3100", identifiant: () => "passage-test", maintenant: () => clock++ * 1000, relever: async (ecran, vue) => { shots++; return fixture(ecran, vue); } });
  const { passage_id } = await coureur.lancerPassage(input);
  const report = await coureur.attendreFin(passage_id);
  assert.equal(report.passage.etat, "joue");
  assert.equal(report.passage.cout_usd, 0.02);
  assert.ok(report.passage.duree_s! > 0);
  assert.deepEqual(report.tests.map(({ etat, session_id }) => [etat, session_id]), Array(3).fill(["termine", "session-1"]));
  assert.ok(report.tests.every(({ replay_url }) => replay_url === "https://agp.eu.hcompany.ai/share/replay"));
  assert.equal(shots, 4);
  assert.equal(base.captures.size, 4);
  assert.equal(base.fichiers.size, 4);
  assert.deepEqual(base.evenements.map(({ test_id }) => test_id), [input.tests[0], input.tests[0], input.tests[1], input.tests[2]]);
  const shared = [...base.captures.values()].find(({ ecran }) => ecran === "liste-des-factures")!;
  assert.equal(shared.test_id, input.tests[0]);
  assert.equal(shared.texte_page, "Texte de liste-des-factures");
  assert.equal(shared.chemin, "passage-test/ca-du-mois-egal-total/liste-des-factures--defaut.png");
  assert.deepEqual(base.rapports.get(passage_id), report);
  assert.deepEqual(await coureur.attendreFin(passage_id), report);
  const markdown = readFileSync(join(vault, "facturo", "passages", `${passage_id}.md`), "utf8");
  assert.match(markdown, /# Passage passage-test/);
  assert.match(markdown, /version_testee: "13"/);
  assert.match(markdown, /version_reference: "12"/);
  assert.match(markdown, /Aucun résultat de vérification/);
  assert.match(markdown, /Réussites : 0/);
  assert.equal(markdown.split("[session H](https://agp.eu.hcompany.ai/share/replay)").length - 1, 3);
  for (const id of input.tests) assert.ok(markdown.includes(`## ${id}`));
});

test("la création rend la main avant la fin de session", async () => {
  let complete!: () => void;
  const done = new Promise<void>((resolve) => { complete = resolve; });
  const base = new BaseMemoire();
  const session = fakeSession(async () => { await done; });
  const coureur = creerCoureur({ vault, base, session, relever: async (ecran, vue) => fixture(ecran, vue) });
  const { passage_id } = await coureur.lancerPassage(input);
  assert.equal(base.passages.get(passage_id)?.etat, "en_cours");
  complete();
  assert.equal((await coureur.attendreFin(passage_id)).tests[0].raison, "ecran non atteint");
});

test("deux sessions muettes donnent une relance puis un passage en échec", async () => {
  let attempts = 0;
  const messages: string[] = [];
  const base = new BaseMemoire();
  const session: Session = async ({ onCreated }) => {
    const id = `mute-${++attempts}`;
    await onCreated(id);
    return { id, fin: Promise.resolve({ id, muted: true, cout_usd: null, etapes: 0 }) };
  };
  const coureur = creerCoureur({ vault, base, session, signaler: (message) => messages.push(message), relever: async (ecran, vue) => fixture(ecran, vue) });
  const { passage_id } = await coureur.lancerPassage(input);
  const report = await coureur.attendreFin(passage_id);
  assert.equal(attempts, 2);
  assert.equal(messages.length, 1);
  assert.equal(report.passage.etat, "echec");
  assert.equal(report.passage.cout_usd, null);
  assert.ok(report.tests.every((test) => test.etat === "non_concluant" && test.raison === "session muette" && test.session_id === "mute-2"));
});

test("une session muette peut être relancée avec succès", async () => {
  let attempts = 0;
  const success = fakeSession(async ({ consigne, onTool }) => {
    for (const step of consigne.course) await onTool("relever", { ...step });
    await onTool("terminer", { etat: "reussi" });
  });
  const session: Session = async (args) => {
    if (++attempts > 1) return success(args);
    await args.onCreated("mute");
    return { id: "mute", fin: Promise.resolve({ ...result, id: "mute", muted: true }) };
  };
  const coureur = creerCoureur({ vault, base: new BaseMemoire(), session, baseUrl: "http://localhost:3100", signaler: () => {}, relever: async (ecran, vue) => fixture(ecran, vue) });
  const { passage_id } = await coureur.lancerPassage(input);
  const report = await coureur.attendreFin(passage_id);
  assert.equal(report.passage.etat, "joue");
  assert.equal(report.passage.cout_usd, 0.04);
});

test("une session H qui agit puis se fige déclenche une seule relance", async () => {
  let now = 0;
  let attempts = 0;
  let polls = 0;
  let cancelled = 0;
  const session = creerSessionH({
    key: "test-key", maintenant: () => now, pause: async (ms) => { now += ms; },
    navigateur: async () => ({ channel: "channel", stop() {} }),
    requete: async (url, init) => {
      if (String(url).endsWith("/sessions")) { polls = 0; return Response.json({ id: `stalled-${++attempts}` }); }
      if (init?.method === "DELETE") { cancelled++; return new Response(null, { status: 204 }); }
      if (++polls === 1) return Response.json({ status: "running", new_events: [{ type: "AgentEvent", data: { kind: "policy_event", tool_reqs: [] } }] });
      now += 45_000;
      return new Response(null, { status: 204 });
    },
  });
  const base = new BaseMemoire();
  const runner = creerCoureur({ vault, base, session, signaler: () => {}, relever: async (ecran, vue) => fixture(ecran, vue) });
  const { passage_id } = await runner.lancerPassage(input);
  const report = await runner.attendreFin(passage_id);
  assert.equal(attempts, 2);
  assert.equal(cancelled, 2);
  assert.equal(base.evenements.length, 2);
  assert.equal(report.passage.etat, "echec");
  assert.ok(report.tests.every((test) => test.raison === "session muette"));
});

test("adresses incorrectes et outils inconnus ne produisent aucune capture", async () => {
  const base = new BaseMemoire();
  const session = fakeSession(async ({ consigne, onTool }) => {
    assert.equal(await onTool("inconnu", {}), "Outil inconnu.");
    assert.match(await onTool("relever", { ecran: "inconnu", vue: "defaut" }), /Relevé inconnu/);
    for (const step of consigne.course) assert.match(await onTool("relever", { ...step }), /écran non atteint/);
    await onTool("terminer", { etat: "echec", raison: "navigation impossible" });
  });
  const coureur = creerCoureur({ vault, base, session, relever: async (ecran, vue) => ({ ...fixture(ecran, vue), url_page: "http://localhost:3100/v13/mauvais-ecran" }) });
  const { passage_id } = await coureur.lancerPassage(input);
  const report = await coureur.attendreFin(passage_id);
  assert.equal(base.captures.size, 0);
  assert.equal(report.passage.etat, "echec");
  assert.ok(report.tests.every(({ raison }) => raison === "ecran non atteint"));
});

test("une erreur réseau de base est visible sans interrompre les outils", async () => {
  const base = new BaseMemoire();
  base.insererEvenement = async () => { throw new Error("network"); };
  base.deposerPng = async () => { throw new Error("network"); };
  const messages: string[] = [];
  let ended = false;
  const session = fakeSession(async ({ consigne, onStep, onTool }) => {
    await onStep({ etape: 1, horodatage: new Date().toISOString(), action: "Clique", etat_session: "en_cours" });
    assert.match(await onTool("relever", { ...consigne.course[0] }), /base indisponible/);
    await onTool("terminer", { etat: "reussi" });
    ended = true;
  });
  const coureur = creerCoureur({ vault, base, session, baseUrl: "http://localhost:3100", signaler: (message) => messages.push(message), relever: async (ecran, vue) => fixture(ecran, vue) });
  const { passage_id } = await coureur.lancerPassage(input);
  const report = await coureur.attendreFin(passage_id);
  assert.equal(ended, true);
  assert.equal(messages.length, 2);
  assert.equal(report.passage.etat, "echec");
});

test("le détail F-118 est refusé lorsque le test accepté demande F-119", async () => {
  const base = new BaseMemoire();
  let correct = false;
  const session = fakeSession(async ({ consigne, onTool }) => {
    const step = consigne.course.find(({ ecran }) => ecran === "detail-facture")!;
    assert.equal(step.address, "/v13/factures/F-119");
    assert.match(await onTool("relever", { ...step }), /écran non atteint/);
    assert.equal(base.captures.size, 0);
    correct = true;
    assert.equal(await onTool("relever", { ...step }), "Continue le parcours.");
    assert.equal(base.captures.size, 1);
    await onTool("terminer", { etat: "echec" });
  });
  const runner = creerCoureur({ vault, base, session, baseUrl: "http://localhost:3100", relever: async (ecran, vue) => ({ ...fixture(ecran, vue), url_page: `http://localhost:3100/v13/factures/${correct ? "F-119" : "F-118"}` }) });
  const { passage_id } = await runner.lancerPassage(input);
  await runner.attendreFin(passage_id);
  assert.equal([...base.captures.values()][0].url_page, "http://localhost:3100/v13/factures/F-119");
});

test("erreurs de capture, création, session et finalisation restent explicites", async () => {
  const base = new BaseMemoire();
  const session = fakeSession(async ({ consigne, onTool }) => {
    assert.match(await onTool("relever", { ...consigne.course[0] }), /capture a échoué/);
  });
  const coureur = creerCoureur({ vault, base, session, signaler: () => {}, relever: async () => { throw new Error("capture impossible"); } });
  const { passage_id } = await coureur.lancerPassage(input);
  assert.equal((await coureur.attendreFin(passage_id)).passage.etat, "echec");
  await assert.rejects(coureur.attendreFin("absent"), /Passage inconnu/);
  await assert.rejects(coureur.lancerPassage({ ...input, tests: [] }), /Aucun test/);
  const failed = creerCoureur({ vault, base, session: async () => { throw new Error("H indisponible"); }, relever: async () => { throw new Error(); } });
  await assert.rejects(failed.lancerPassage(input), /H indisponible/);
  assert.ok([...base.rapports.values()].every(({ passage }) => passage.etat === "echec"));
  assert.match(readFileSync(join(vault, "facturo", "passages", [...base.rapports.keys()].at(-1)! + ".md"), "utf8"), /non concluante/);
  base.terminerPassage = async () => { throw new Error("network"); };
  const rejected = creerCoureur({ vault, base, signaler: () => {}, session: async ({ onCreated }) => {
    await onCreated("failed");
    return { id: "failed", fin: Promise.reject(new Error("session lost")) };
  }, relever: async (ecran, vue) => fixture(ecran, vue) });
  const launched = await rejected.lancerPassage(input);
  assert.equal((await rejected.attendreFin(launched.passage_id)).passage.etat, "echec");
});

test("un échec d’écriture du rapport dans le vault reste visible et est persisté en base", async () => {
  rmSync(join(vault, "facturo", "passages"), { recursive: true, force: true });
  writeFileSync(join(vault, "facturo", "passages"), "Ce fichier empêche de créer le dossier.");
  const base = new BaseMemoire();
  const messages: string[] = [];
  const session = fakeSession(async ({ consigne, onTool }) => {
    for (const step of consigne.course) await onTool("relever", { ...step });
    await onTool("terminer", { etat: "reussi" });
  });
  const runner = creerCoureur({ vault, base, session, baseUrl: "http://localhost:3100", relever: async (ecran, vue) => fixture(ecran, vue), signaler: (message) => messages.push(message) });
  const { passage_id } = await runner.lancerPassage(input);
  const report = await runner.attendreFin(passage_id);
  assert.equal(report.passage.etat, "echec");
  assert.equal(base.rapports.get(passage_id)!.passage.etat, "echec");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /rapport dans le vault impossible/);
});
