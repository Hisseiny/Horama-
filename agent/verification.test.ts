import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { ecrireReference, lireTestsAcceptes } from "@horama/memoire";
import { verifierReleve } from "@horama/jugement";
import { verifierTest } from "./src/verification.ts";
import type { AcquiredCapture } from "./src/verification.ts";

const accepted = lireTestsAcceptes(fileURLToPath(new URL("../vault-horama", import.meta.url)), "facturo").find(({ id }) => id === "ca-du-mois-egal-total")!;
let vault: string;
beforeEach(() => { vault = mkdtempSync(join(tmpdir(), "horama-c4-")); });
afterEach(() => { rmSync(vault, { recursive: true, force: true }); });
function captures(total = "1 420,00 €"): AcquiredCapture[] {
  return accepted.releves.map(({ ecran, vue }, index) => ({ png: new Uint8Array([index]), capture: {
    passage_id: "p", test_id: "autre-test", session_id: "s", ecran, vue, version: "13", chemin: "capture.png", url: `https://example.com/${index}.png`,
    largeur: 1280, hauteur: 900, defilement: [0, 0], texte_page: index === 0 ? "CA du mois\n1 420,00 €" : `Numéro\tMontant TTC\nF-119\t480,00 €\nTotal\t${total}`,
    url_page: `https://example.com/${ecran}`, etape: index, prise_le: "2026-11-17T12:00:00Z",
  } }));
}
function options() { return { vault, logiciel: "facturo", test: accepted, acquired: captures(), passageId: "p", version: "13", referenceVersion: "12", sessionFailed: false }; }

test("les zones ignorées de la note masquent seulement les pixels de cet écran dans C4", () => {
  const reference = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAAI0lEQVR4nGP4P8gBw0A7gBAYdSClYNSBlIJRB1IKRh1IKQAAxLY6GzXsph8AAAAASUVORK5CYII=", "base64");
  const inside = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAALElEQVR4nGP4P8gBw0A7gBCAO5CBgQErHmgw8C4gAEYdSCkYdSClYNSBlAIA8KcoLbZ8MT8AAAAASUVORK5CYII=", "base64");
  const outside = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAKCAYAAADGmhxQAAAALUlEQVR4nGP4P8gBw0A7gBCgugMZGBiwYrLNo6LbaAJGHUgpGHUgpWDUgZQCAPviKC2uLjJ4AAAAAElFTkSuQmCC", "base64");
  const screen = accepted.releves[0].ecran;
  ecrireReference(vault, "facturo", screen, "defaut", "12", reference);
  mkdirSync(join(vault, "facturo/produit"), { recursive: true });
  const note = join(vault, "facturo/produit/screen.md");
  for (const zones of [undefined, "[]", "[{ x: 2, y: 2, largeur: 6, hauteur: 1 }]"]) {
    writeFileSync(note, `---\necran: ${screen}\n${zones ? `zones_ignorees: ${zones}\n` : ""}---\n# Écran\n`);
    for (const [png, ignored] of [[inside, !!zones && zones !== "[]"], [outside, false]] as const) {
      const acquired = captures();
      acquired[0].png = png;
      const output = verifierTest({ ...options(), acquired });
      assert.equal(output.statut, ignored ? "PASS" : "SUSPECTED");
      assert.equal(output.ecarts_visuels.length, ignored ? 0 : 1);
    }
  }
  writeFileSync(note, `---\necran: ${screen}\nzones_ignorees: [\n---\n`);
  assert.equal(verifierTest(options()).statut, "INCONCLUSIVE");
});

test("C4 calculé PASS, captures mutualisées, ordre et préfixes d’acquisition", () => {
  const lengths: number[] = [];
  const output = verifierTest({ ...options(), replayUrl: "https://example.com/replay", verify: (entry) => {
    lengths.push(entry.releves.length);
    assert.equal(entry.releve, entry.releves.at(-1));
    assert.deepEqual(entry.regles, accepted.regles);
    return verifierReleve(entry);
  } });
  assert.equal(output.statut, "PASS");
  assert.equal(output.test_id, accepted.id);
  assert.equal(output.niveau_de_preuve, "releve + calcul");
  assert.ok(output.calcul);
  assert.equal(output.captures.length, 2);
  assert.equal(output.replay_url, "https://example.com/replay");
  assert.deepEqual(lengths, [1, 2]);
});

test("un écart calculé donne VERIFIED_FAIL", () => {
  const output = verifierTest({ ...options(), acquired: captures("1 419,99 €") });
  assert.equal(output.statut, "VERIFIED_FAIL");
  assert.match(output.calcul!, /1420|1 420/);
});

test("un défaut calculé prime sur un constat incomplet ou une règle non évaluée", () => {
  for (const genre of ["visuel", "regle"] as const) {
    const output = verifierTest({ ...options(), acquired: captures("1 419,99 €"), verify: (entry) => [
      ...verifierReleve(entry),
      { id: "incomplet", ecran: entry.releve.ecran, vue: "defaut", genre, statut: "INCONCLUSIVE", valeurs: {},
        description: "Vérification incomplète", textes_a_surligner: [], raison: "Preuve indisponible" },
    ] });
    assert.equal(output.statut, "VERIFIED_FAIL", genre);
    assert.ok(output.calcul);
    assert.equal(output.niveau_de_preuve, "releve + calcul");
  }
  const output = verifierTest({ ...options(), acquired: captures("1 419,99 €"),
    test: { ...accepted, regles: [...accepted.regles, { type: "presence", ecran: "autre-ecran", colonne: "Numéro" }] },
    verify: (entry) => verifierReleve({ ...entry, regles: accepted.regles }),
  });
  assert.equal(output.statut, "VERIFIED_FAIL", "règle non évaluée");
  assert.ok(output.calcul);
});

test("sans défaut prouvé, incomplet prime sur soupçon et PASS exige toutes les preuves", () => {
  for (const calculated of [false, true]) {
    for (const incomplete of [false, true]) {
      const output = verifierTest({ ...options(), verify: (entry) => [
        ...verifierReleve(entry),
        { id: "visuel", ecran: entry.releve.ecran, vue: "defaut", genre: "visuel" as const, statut: "SUSPECTED" as const, valeurs: {},
          description: "Doute visuel", textes_a_surligner: [] },
        ...(incomplete ? [{ id: "incomplet", ecran: entry.releve.ecran, vue: "defaut", genre: "visuel" as const,
          statut: "INCONCLUSIVE" as const, valeurs: {}, description: "Référence absente", textes_a_surligner: [], raison: "Preuve indisponible" }] : []),
      ].map((finding) => calculated ? finding : { ...finding, calcul: undefined }) });
      assert.equal(output.statut, incomplete ? "INCONCLUSIVE" : "SUSPECTED");
    }
  }
  const unproven = verifierTest({ ...options(), verify: (entry) => verifierReleve(entry).map((finding) => ({
    ...finding, statut: "VERIFIED_FAIL" as const, calcul: undefined,
  })) });
  assert.equal(unproven.statut, "INCONCLUSIVE");
});

test("capture manquante, session échouée, règle non évaluée et absence de règle restent INCONCLUSIVE", () => {
  const empty = verifierTest({ ...options(), acquired: [] });
  assert.equal(empty.statut, "INCONCLUSIVE");
  assert.match(empty.raison!, /capture/);
  assert.equal(verifierTest({ ...options(), sessionFailed: true }).statut, "INCONCLUSIVE");
  assert.match(verifierTest({ ...options(), verify: () => [] }).raison!, /pas été évaluée/);
  assert.equal(verifierTest({ ...options(), test: { ...accepted, regles: [] } }).statut, "INCONCLUSIVE");
  const unreadable = captures(); unreadable[0].capture.texte_page = "illisible";
  assert.equal(verifierTest({ ...options(), acquired: unreadable }).statut, "INCONCLUSIVE");
});

test("erreur du vérificateur ne fuit pas le détail et donne INCONCLUSIVE", () => {
  const output = verifierTest({ ...options(), verify: () => { throw new Error("détail privé"); } });
  assert.equal(output.statut, "INCONCLUSIVE");
  assert.match(output.raison!, /échoué/);
  assert.doesNotMatch(JSON.stringify(output), /détail privé/);
});

test("référence chargée, doute visuel adapté et aucune référence promue", () => {
  ecrireReference(vault, "facturo", accepted.releves[0].ecran, "defaut", "12", new Uint8Array([9]));
  const output = verifierTest({ ...options(), verify: (entry) => {
    const findings = verifierReleve({ ...entry, reference: undefined });
    if (entry.reference) {
      assert.deepEqual(entry.reference, new Uint8Array([9]));
      findings.push({ id: "v", ecran: entry.releve.ecran, vue: "defaut", genre: "visuel", statut: "SUSPECTED", valeurs: {},
        description: "Zone changée", textes_a_surligner: [], zone: { x: 1, y: 1, largeur: 2, hauteur: 2 } });
    }
    return findings;
  } });
  assert.equal(output.statut, "SUSPECTED");
  assert.equal(output.ecarts_visuels.length, 1);
  assert.equal(output.version_reference_capture, "12");
});

test("une référence illisible et un constat sans preuve ne produisent jamais PASS", () => {
  ecrireReference(vault, "facturo", accepted.releves[0].ecran, "defaut", "12", new Uint8Array([9]));
  assert.equal(verifierTest(options()).statut, "INCONCLUSIVE");
  const output = verifierTest({ ...options(), verify: (entry) => [{ id: "r", ecran: entry.releve.ecran, vue: "defaut", genre: "regle",
    statut: "PASS", regle: accepted.regles[0], valeurs: {}, description: "Sans calcul", textes_a_surligner: [] }] });
  assert.equal(output.statut, "INCONCLUSIVE");
});

test("un écart visuel ne compte que pour le premier test du passage qui demande l’écran", () => {
  ecrireReference(vault, "facturo", accepted.releves[1].ecran, "defaut", "12", new Uint8Array([9]));
  const verify: typeof verifierReleve = (entry) => [...verifierReleve({ ...entry, reference: undefined }), ...(entry.reference ? [{ id: "v", ecran: entry.releve.ecran,
    vue: "defaut", genre: "visuel" as const, statut: "SUSPECTED" as const, valeurs: {}, description: "Zone changée", textes_a_surligner: [], zone: { x: 1, y: 1, largeur: 2, hauteur: 2 } }] : [])];
  const other = { ...accepted, id: "autre-test" };
  const owner = verifierTest({ ...options(), passageTests: [accepted, other], verify });
  assert.equal(owner.statut, "SUSPECTED");
  assert.equal(owner.ecarts_visuels.length, 1);
  const follower = verifierTest({ ...options(), passageTests: [other, accepted], verify });
  assert.equal(follower.statut, "PASS");
  assert.deepEqual(follower.ecarts_visuels, []);
  assert.ok(follower.calcul);
  assert.equal(follower.version_reference_capture, "12");
});
