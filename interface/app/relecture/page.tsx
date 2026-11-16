import "./relecture.css";
import type { ResultatVerification } from "@horama/contrats";
import { LOGICIEL } from "../../lib/config";
import { lireCaptures, lireReferences, lireResultats, listerEcrans } from "../../lib/donnees";
import { calculation, value, writtenSum } from "../../lib/format";
import { screenshot } from "../../lib/screenshots";
import { Review, type Case } from "./Review";

const PROOF: Record<ResultatVerification["niveau_de_preuve"], string> = {
  aucun: "Aucune preuve.",
  releve: "Valeurs relevées à l'écran.",
  "releve + calcul": "Valeurs relevées à l'écran, confirmées par le calcul.",
  "deux lecteurs": "Valeurs confirmées par deux lecteurs.",
};

// Step 6. Only the cases that need a human, the most serious first.
export default async function ReviewPage() {
  const l = await listerEcrans(LOGICIEL);
  const id = l.passage_id;
  const [resultats, captures, references] = id
    ? await Promise.all([lireResultats(id), lireCaptures(id), lireReferences(LOGICIEL)])
    : [[], [], []];
  const screenTitle = (ecran: string) => l.ecrans.find((e) => e.id === ecran)?.titre ?? ecran;

  const proven: Case[] = resultats.filter((r) => r.statut === "VERIFIED_FAIL").map((r) => {
    const test = l.tests.find((t) => t.id === r.test_id);
    const shots = captures.filter((c) => c.test_id === r.test_id);
    // "ecran.champ" keys name a screen; when a sum rule of the documentation targets that field, the sum is written out.
    const values = Object.entries(r.valeurs).map(([key, v]) => {
      const [ecran, champ] = key.includes(".") ? [key.slice(0, key.indexOf(".")), key.slice(key.indexOf(".") + 1)] : [undefined, key];
      const sum = l.regles.find((x) => x.regle?.type === "somme" && x.regle.ecran === ecran && x.regle.cible === champ)?.regle;
      const text = shots.find((c) => c.ecran === ecran && c.texte_page)?.texte_page;
      const written = sum?.type === "somme" && text ? writtenSum(text, sum.colonne) : undefined;
      return { libelle: champ, lieu: ecran && screenTitle(ecran), valeur: value(v), written: written && `${champ}, ${screenTitle(ecran!).toLowerCase()} : ${written}` };
    });
    return {
      key: r.test_id,
      test_id: r.test_id,
      etat: "defaut",
      titre: test?.titre ?? r.test_id,
      phrase: test?.phrase,
      note: test && `${l.vault}/${test.source}`,
      valeurs: values.map(({ libelle, lieu, valeur }) => ({ libelle, lieu, valeur })),
      signe: r.regle?.type === "egalite" ? "≠" : undefined,
      calculs: [...values.flatMap((v) => v.written ?? []), ...(r.calcul ? [calculation(r.calcul)] : [])],
      preuve: PROOF[r.niveau_de_preuve],
      images: shots.map((c) => ({ image: screenshot(c.url), legende: `${screenTitle(c.ecran)}, version ${c.version}.`, zones: [] })),
    };
  });

  const suspects: Case[] = resultats.flatMap((r) =>
    r.ecarts_visuels.filter((e) => e.statut === "SUSPECTED").map((e) => {
      const before = references.find((x) => x.ecran === e.ecran && x.vue === e.vue);
      const after = captures.find((c) => c.test_id === r.test_id && c.ecran === e.ecran && c.vue === e.vue);
      return {
        key: `${r.test_id}/${e.id}`,
        test_id: r.test_id,
        ecart_id: e.id,
        etat: "a_trancher",
        titre: e.description,
        valeurs: [],
        calculs: [],
        preuve: "Écart visuel : il ne se prouve pas par le calcul, un humain tranche.",
        images: [
          ...(before ? [{ image: screenshot(before.url), legende: `Avant : ${screenTitle(e.ecran)}, version ${before.version}, la référence.`, zones: [] }] : []),
          ...(after ? [{ image: screenshot(after.url), legende: `Après : ${screenTitle(e.ecran)}, version ${after.version}, zone entourée.`, zones: [{ numero: 1, etat: "a_trancher" as const, ...e.zone }] }] : []),
        ],
      };
    }),
  );

  return <Review passage={id ?? ""} cases={[...proven, ...suspects]} />;
}
