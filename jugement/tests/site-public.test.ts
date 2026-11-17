import assert from "node:assert/strict";
import { test } from "node:test";
import type { Regle } from "@horama/contrats";
import { PNG } from "pngjs";
import { comparerImages, releverValeurs, verifierReleve } from "../index.ts";
import type { ReleveCapture } from "../index.ts";
import { plage } from "../verification/values.ts";

// Excerpts of the real text of the site of Eugenia School (innerText, 2026-11-17): a number is written on the line
// before its label, the reverse of Facturo.
const BACHELOR = ["CANDIDATER →", "TÉLÉCHARGER LA BROCHURE", "1ER", "PROJET IA DÉPLOYÉ EN S1", "3-5", "HACKATHONS PAR AN", "3", "ANS · 180 ECTS", "100+", "ENTREPRISES PARTENAIRES"].join("\n");
const MSC = ["CANDIDATER →", "TÉLÉCHARGER LA BROCHURE", "2", "ANS · 120 ECTS", "3 À 5", "HACKATHONS PAR AN", "100%", "EN ALTERNANCE"].join("\n");

const releve = (ecran: string, texte: string): ReleveCapture => ({ ecran, vue: "defaut", version: "1", png: new Uint8Array(), texte, url: "" });
const hackathons: Regle = { type: "egalite", a: { ecran: "bachelor", champ: "HACKATHONS PAR AN (chiffre au-dessus)" }, b: { ecran: "msc", champ: "HACKATHONS PAR AN (chiffre au-dessus)" } };
const judge = (bachelor: string, msc: string) => {
  const releves = [releve("bachelor", bachelor), releve("msc", msc)];
  return verifierReleve({ releve: releves[1], releves, regles: [hackathons], decisions: [] });
};

test("le nombre écrit juste avant son libellé est gardé à part, sans changer la lecture de Facturo", () => {
  const values = releverValeurs(BACHELOR);
  assert.deepEqual(values.avant["HACKATHONS PAR AN"], ["3-5"]);
  assert.deepEqual(values.avant["ANS · 180 ECTS"], ["3"]);
  assert.deepEqual(values.avant["ENTREPRISES PARTENAIRES"], ["100+"]);
  // The reading « label, then number » is untouched: here it pairs « HACKATHONS PAR AN » with the « 3 » of the next line.
  assert.equal(values.labelled["HACKATHONS PAR AN"], "3");
});

test("une plage s'écrit de plusieurs façons et vaut la même chose", () => {
  for (const written of ["3-5", "3 à 5", "3 À 5", "de 3 à 5", "3 – 5", "3 - 5", "3—5"]) assert.equal(plage(written), "3 à 5", written);
  assert.equal(plage("100+"), "100+");
  assert.equal(plage("2 ANS"), "2 ANS");
});

test("« 3-5 » sur le Bachelor et « 3 À 5 » sur le MSc : même plage, la règle est conforme", () => {
  const [constat] = judge(BACHELOR, MSC);
  assert.equal(constat.statut, "PASS");
  assert.equal(constat.calcul, "3 à 5 = 3 à 5");
});

test("une vraie différence de plage est un défaut prouvé", () => {
  const [constat] = judge(BACHELOR, MSC.replace("3 À 5", "2 à 4"));
  assert.equal(constat.statut, "VERIFIED_FAIL");
  assert.equal(constat.calcul, "3 à 5 ≠ 2 à 4");
});

test("un libellé sans nombre juste avant lui ne se devine pas : non concluant", () => {
  const [constat] = judge(BACHELOR.replace("3-5\n", ""), MSC);
  assert.equal(constat.statut, "INCONCLUSIVE");
});

test("un libellé affiché deux fois avec un chiffre au-dessus ne se départage pas : non concluant", () => {
  const [constat] = judge(`${BACHELOR}\n4\nHACKATHONS PAR AN`, MSC);
  assert.equal(constat.statut, "INCONCLUSIVE");
  assert.match(constat.raison!, /affiché 2 fois/);
});

test("un champ « chiffre au-dessus » introuvable rend toute règle non concluante, jamais conforme", () => {
  const presence: Regle = { type: "presence", ecran: "bachelor", colonne: "HACKATHONS PAR AN (chiffre au-dessus)" };
  const releves = [releve("bachelor", BACHELOR.replace("3-5\n", ""))];
  const [constat] = verifierReleve({ releve: releves[0], releves, regles: [presence], decisions: [] });
  assert.equal(constat.statut, "INCONCLUSIVE");
});

test("une zone déclarée comme changeante n'est pas comparée", () => {
  const image = (fill: (x: number, y: number) => number) => {
    const png = new PNG({ width: 40, height: 40 });
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const i = (y * 40 + x) * 4;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = fill(x, y);
      png.data[i + 3] = 255;
    }
    return new Uint8Array(PNG.sync.write(png));
  };
  const before = image(() => 255);
  const after = image((x, y) => (x >= 10 && x < 30 && y >= 10 && y < 30 ? 0 : 255)); // the photo changed
  assert.equal(comparerImages(after, before).zones.length, 1);
  const ignored = comparerImages(after, before, [{ x: 10, y: 10, largeur: 20, hauteur: 20 }]);
  assert.equal(ignored.zones.length, 0);
  assert.equal(ignored.differentPixels, 0);
  // Outside the declared zone, a change is still seen.
  assert.equal(comparerImages(after, before, [{ x: 10, y: 10, largeur: 10, hauteur: 20 }]).zones.length, 1);
});
