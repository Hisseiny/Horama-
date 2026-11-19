// Bench run (task 4.12): plays every case of faux-saas/verite.json alone (v13 with r=<id>) through the scene
// without the H agent, then counts what Horama says. Never writes in vault-horama/: each case gets its own copy of
// a base vault whose v12 references were taken on the same machine.
// Usage: node banc/scripts/passage-banc.mjs --vault-base <dir> --travail <dir> [--base-url <url>] [--cas id1,id2]
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const racine = resolve(import.meta.dirname, "../..");
const vaultBase = resolve(arg("vault-base"));
const travail = resolve(arg("travail"));
const baseUrl = arg("base-url", "https://facturo-demo.vercel.app");
const verite = JSON.parse(readFileSync(join(racine, "faux-saas/verite.json"), "utf8"));
const positions = Object.fromEntries(
  Object.values(JSON.parse(readFileSync(join(racine, "faux-saas/positions.json"), "utf8"))).map((p) => [p.id, p]),
);
const choisis = arg("cas") ? arg("cas").split(",") : ["aucun", ...verite.map((c) => c.id)];
mkdirSync(travail, { recursive: true });

const chevauche = (a, b) =>
  a && b && a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;
const zoneDe = (c) => c.zone || c.boite || c.rectangle || null;

const lignes = [];
for (const id of choisis) {
  const vault = join(travail, "vault-" + id);
  const sortie = join(travail, "sortie-" + id);
  rmSync(vault, { recursive: true, force: true });
  rmSync(sortie, { recursive: true, force: true });
  cpSync(vaultBase, vault, { recursive: true });
  const debut = Date.now();
  let erreur = null;
  try {
    execFileSync(
      process.execPath,
      [join(racine, "automatisation/scene/parcours.mjs"), "--sans-agent", "--sans-fin", "--sans-base", "--sans-presentation",
        "--base-url", baseUrl, "--logiciel", "facturo", "--version", "13", "--reference", "12", "--r", id,
        "--vault", vault, "--sortie", sortie],
      { stdio: ["ignore", "ignore", "pipe"], timeout: 300000 },
    );
  } catch (e) {
    erreur = String(e.stderr || e.message).split("\n").filter(Boolean).slice(-1)[0];
  }
  const fichier = join(sortie, "passage.json");
  const p = existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : null;
  const cas = verite.find((c) => c.id === id);
  const pos = positions[id];
  const constats = p ? p.constats.filter((c) => c.statut !== "PASS") : [];
  const prouves = constats.filter((c) => c.statut === "VERIFIED_FAIL");
  const doutes = constats.filter((c) => c.statut === "SUSPECTED");
  const sansConclusion = constats.filter((c) => c.statut === "INCONCLUSIVE");
  // A visual doubt is "on the case" when it is on the case's screen and touches its zone (before or after).
  const surLeCas = (c) =>
    pos && c.ecran === pos.ecran && (!zoneDe(c) || chevauche(zoneDe(c), pos.avant) || chevauche(zoneDe(c), pos.apres));
  const doutesSurLeCas = doutes.filter(surLeCas);
  let verdict;
  if (!p) verdict = "passage non joué";
  else if (!cas) verdict = prouves.length || doutes.length ? "faux signal sur le témoin" : "témoin propre";
  else if (cas.nature === "bug") verdict = prouves.length ? "bug prouvé" : doutesSurLeCas.length ? "bug vu comme doute" : "bug manqué";
  else verdict = prouves.length ? "faux défaut prouvé" : doutesSurLeCas.length ? "voulu envoyé à l'humain" : "voulu non vu";
  lignes.push({
    id,
    nature: cas ? cas.nature : "témoin",
    ecran: cas ? cas.ecran : "",
    entre_ecrans: cas ? cas.entre_ecrans : false,
    contredit_la_doc: cas ? cas.contredit_la_doc : false,
    pixels_differents: pos ? pos.pixels_differents : 0,
    verdict,
    prouves: prouves.length,
    doutes: doutes.length,
    doutes_hors_cas: doutes.length - doutesSurLeCas.length,
    sans_conclusion: sansConclusion.length,
    duree_s: Math.round((Date.now() - debut) / 100) / 10,
    erreur,
  });
  console.log(id.padEnd(26), verdict.padEnd(26), "prouvés", prouves.length, "doutes", doutes.length, erreur ? "ERREUR " + erreur : "");
  writeFileSync(join(travail, "resultats.json"), JSON.stringify(lignes, null, 2) + "\n");
}
