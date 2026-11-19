// Charts of task 5.4, in the colours of the brand book « L'envoyé », as plain SVG (no dependency).
// Reads banc/resultats/passage-1.json and banc/mesures.json; writes banc/graphiques/*.svg.
// Usage: node banc/scripts/graphiques.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "../..");
const C = { encre: "#1C1C1C", sec: "#5C5546", engobe: "#FBF5E6", papier: "#FFFDF6", filet: "#E2D6B8", miltos: "#B8321F", ocre: "#C48A1E", olivier: "#2E7D55", aile: "#AFA9EC" };
const police = "'Funnel Sans', Arial, sans-serif";
const titre = "'Tilt Warp', 'Arial Black', sans-serif";
const mono = "'Spline Sans Mono', Consolas, monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svg = (w, h, corps) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="14" fill="${C.papier}" stroke="${C.encre}" stroke-width="2.5"/>${corps}</svg>\n`;
const texte = (x, y, s, { taille = 14, couleur = C.encre, famille = police, poids = 400, ancre = "start" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${famille}" font-size="${taille}" font-weight="${poids}" fill="${couleur}" text-anchor="${ancre}">${esc(s)}</text>`;

const resultats = JSON.parse(readFileSync(join(racine, "banc/resultats/passage-1.json"), "utf8")).filter((r) => r.nature !== "témoin");
const mesures = JSON.parse(readFileSync(join(racine, "banc/mesures.json"), "utf8"));
const sortie = join(racine, "banc/graphiques");
mkdirSync(sortie, { recursive: true });
const compte = (nature, verdict) => resultats.filter((r) => r.nature === nature && r.verdict === verdict).length;

// 1. What Horama said on each kind of case: one stacked bar for the bugs, one for the intended changes.
{
  const lignes = [
    { label: "13 bugs", parts: [["prouvés", compte("bug", "bug prouvé"), C.miltos], ["vus comme doute", compte("bug", "bug vu comme doute"), C.ocre], ["manqués", compte("bug", "bug manqué"), C.filet]] },
    { label: "5 voulus", parts: [["envoyés à l'humain", compte("voulu", "voulu envoyé à l'humain"), C.ocre], ["non signalés", compte("voulu", "voulu non vu"), C.filet], ["faux défauts prouvés", compte("voulu", "faux défaut prouvé"), C.miltos]] },
  ];
  const W = 760, x0 = 120, largeur = 560, pas = largeur / 13;
  let corps = texte(28, 46, "Ce qu'Horama dit sur chaque cas du banc", { taille: 22, famille: titre });
  corps += texte(28, 70, "Passage 1 du 19/11, sans l'agent H (clics du script), 18 cas de faux-saas/verite.json", { taille: 12, couleur: C.sec, famille: mono });
  lignes.forEach((l, i) => {
    const y = 110 + i * 92;
    corps += texte(28, y + 24, l.label, { taille: 15, poids: 700 });
    let x = x0;
    for (const [nom, n, couleur] of l.parts) {
      if (!n) continue;
      corps += `<rect x="${x}" y="${y}" width="${n * pas}" height="36" fill="${couleur}" stroke="${C.encre}" stroke-width="2"/>`;
      corps += texte(x + (n * pas) / 2, y + 24, String(n), { ancre: "middle", poids: 700, couleur: couleur === C.filet ? C.encre : C.engobe });
      x += n * pas;
    }
    corps += texte(x0, y + 58, l.parts.filter((p) => p[1]).map((p) => p[1] + " " + p[0]).join(" · "), { taille: 12, couleur: C.sec });
  });
  writeFileSync(join(sortie, "1-verdicts.svg"), svg(W, 310, corps));
}

// 2. Horama against the simplest comparison (raw pixel difference): how many alerts reach the human, and how many are wrong.
{
  const pixels = { alertes: resultats.filter((r) => r.pixels_differents > 0).length, fausses: resultats.filter((r) => r.nature === "voulu" && r.pixels_differents > 0).length };
  const prouves = resultats.filter((r) => r.prouves > 0).length;
  const fauxProuves = resultats.filter((r) => r.nature === "voulu" && r.prouves > 0).length;
  const W = 760, base = 320, echelle = 10;
  let corps = texte(28, 46, "Ce qui arrive à l'humain", { taille: 22, famille: titre });
  corps += texte(28, 70, "Comparaison de pixels brute contre défauts prouvés par Horama, mêmes 18 cas", { taille: 12, couleur: C.sec, famille: mono });
  const barre = (x, n, faux, nom, detail) => {
    let s = `<rect x="${x}" y="${base - n * echelle}" width="120" height="${n * echelle}" fill="${C.engobe}" stroke="${C.encre}" stroke-width="2"/>`;
    if (faux) s += `<rect x="${x}" y="${base - faux * echelle}" width="120" height="${faux * echelle}" fill="${C.miltos}" stroke="${C.encre}" stroke-width="2"/>`;
    s += texte(x + 60, base - n * echelle - 10, String(n), { ancre: "middle", taille: 22, famille: titre });
    s += texte(x + 60, base + 24, nom, { ancre: "middle", poids: 700 });
    s += texte(x + 60, base + 44, detail, { ancre: "middle", taille: 12, couleur: C.sec });
    return s;
  };
  corps += barre(150, pixels.alertes, pixels.fausses, "Pixels bruts", pixels.fausses + " alarmes sur du voulu");
  corps += barre(470, prouves, fauxProuves, "Horama : prouvés", fauxProuves + " faux défaut prouvé");
  corps += `<line x1="100" y1="${base}" x2="680" y2="${base}" stroke="${C.encre}" stroke-width="2"/>`;
  corps += `<rect x="560" y="96" width="14" height="14" fill="${C.miltos}" stroke="${C.encre}" stroke-width="1.5"/>` + texte(580, 108, "fausse alarme", { taille: 12 });
  writeFileSync(join(sortie, "2-pixels-contre-horama.svg"), svg(W, 390, corps));
}

// 3. Measured cost per run, real H agent (banc/mesures.json).
{
  const runs = mesures.cout_par_passage;
  const W = 760, x0 = 280, max = Math.max(...runs.map((r) => r.max_usd)), echelle = 400 / max;
  let corps = texte(28, 46, "Coût mesuré d'un passage, agent H réel", { taille: 22, famille: titre });
  corps += texte(28, 70, "En dollars, du moins cher au plus cher des passages mesurés ; sources dans banc/mesures.md", { taille: 12, couleur: C.sec, famille: mono });
  runs.forEach((r, i) => {
    const y = 100 + i * 46;
    corps += texte(28, y + 20, r.nom, { taille: 13 });
    corps += `<rect x="${x0}" y="${y + 4}" width="${r.max_usd * echelle}" height="24" fill="${C.aile}" stroke="${C.encre}" stroke-width="2"/>`;
    corps += texte(x0 + r.max_usd * echelle + 10, y + 21, (r.min_usd === r.max_usd ? "" : r.min_usd.toFixed(3) + " à ") + r.max_usd.toFixed(3) + " $", { taille: 12, famille: mono });
  });
  writeFileSync(join(sortie, "3-cout-par-passage.svg"), svg(W, 120 + runs.length * 46, corps));
}
console.log("graphiques écrits dans banc/graphiques/");
