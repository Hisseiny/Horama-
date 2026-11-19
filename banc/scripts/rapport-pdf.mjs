// Regenerates banc/rapport-pole-cdo.pdf from banc/graphiques/ (task 5.4): writes banc/rapport-pole-cdo.html, then prints it with Chrome.
// Usage: node banc/scripts/rapport-pdf.mjs   (CHROME_BIN overrides the Chrome path)
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
const repo = resolve(import.meta.dirname, "../..");
const sortie = repo + "/banc/rapport-pole-cdo.html";
const g = (f) => fs.readFileSync(repo + "/banc/graphiques/" + f, "utf8").replace(/<svg /, '<svg style="width:100%;height:auto" ');
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Horama, pôle CDO</title>
<link href="https://fonts.googleapis.com/css2?family=Tilt+Warp&family=Funnel+Sans:wght@400;600;700&family=Spline+Sans+Mono&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:16mm 15mm}body{font-family:'Funnel Sans',Arial,sans-serif;color:#1C1C1C;background:#FBF5E6;font-size:11pt;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-family:'Tilt Warp',sans-serif;font-weight:400;font-size:28pt;margin:0}h2{font-family:'Tilt Warp',sans-serif;font-weight:400;font-size:16pt;margin:22px 0 8px;break-after:avoid}
.sous{font-family:'Spline Sans Mono',monospace;color:#5C5546;font-size:9pt}table{width:100%;border-collapse:collapse;margin:6px 0 10px;background:#FFFDF6;border:2px solid #1C1C1C;font-size:9.5pt;break-inside:avoid}
th,td{border-bottom:1px solid #E2D6B8;padding:5px 7px;text-align:left;vertical-align:top}th{font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:#5C5546}
code{font-family:'Spline Sans Mono',monospace;font-size:8.5pt}.ok{color:#2E7D55;font-weight:700}.non{color:#B8321F;font-weight:700}.mi{color:#C48A1E;font-weight:700}
.carte{background:#FFFDF6;border:2.5px solid #1C1C1C;border-radius:14px;padding:12px 16px;margin:10px 0;break-inside:avoid}.chiffres{display:flex;gap:10px;margin:10px 0}.chiffres div{flex:1;background:#FFFDF6;border:2.5px solid #1C1C1C;border-radius:12px;padding:10px}
.chiffres b{font-family:'Tilt Warp',sans-serif;font-weight:400;font-size:22pt;display:block}.graph{break-inside:avoid;margin:8px 0}</style>
<h1>Horama · pôle CDO</h1><p class="sous">Vault, mémoire des décisions, base, banc et mesures · état au 19/11/2026 · sources : dépôt git, branche dev</p>
<div class="carte"><b>La mission du pôle, en une phrase.</b> Tenir la mémoire d'Horama (le vault Obsidian et la base de données) et prouver, par des mesures honnêtes, que le produit marche. Le travail du pôle a été fait par plusieurs rôles de l'équipe : ce document fait le point sur le pôle, pas sur les personnes.</div>
<h2>1. Les tâches de la fiche de mission</h2>
<table><tr><th>Tâche</th><th>État</th><th>Ce qui existe, et où</th></tr>
<tr><td>1.11 Vault de départ</td><td class="ok">Fait</td><td>73 fichiers dans <code>vault-horama/</code> pour 3 logiciels : Facturo (faux SaaS), le site d'Eugenia et son clone. Notes d'écran, règles entre écrans, une note de version (v13), tests acceptés (4 Facturo, 3 Eugenia, 3 clone), décisions, passages, références.</td></tr>
<tr><td>2.4 Base de données</td><td class="ok">Fait</td><td>Migration Supabase <code>base/migrations/001_init.sql</code> et script d'application <code>base/appliquer.mjs</code>.</td></tr>
<tr><td>3.3 Test accepté écrit dans le vault</td><td class="ok">Fait</td><td>Paquet <code>memoire/</code> : un test accepté devient un fichier de <code>tests/</code> (contrat C2).</td></tr>
<tr><td>4.9 Mémoire limitée à un écart, retest</td><td class="ok">Fait</td><td><code>memoire/</code> (34 tests sur 34 au dernier contrôle). Mesuré le 17/11 : rejoué après la décision « voulu », le passage Facturo ne repose pas la question (1 doute, puis 0).</td></tr>
<tr><td>5.2 Dérive documentaire</td><td class="ok">Fait</td><td>Correction de note proposée après un « voulu » : 11/15 au premier lancement, 15/15 au dernier (<code>docs/tests/2026-11-17-correction.md</code>).</td></tr>
<tr><td>3.9 Banc : cas et vérité écrite avant</td><td class="ok">Fait le 19/11</td><td><code>banc/cas.md</code> : 18 cas, 13 bugs (5 entre écrans, 5 presque invisibles) et 5 changements voulus (2 contredisent la doc). Vérité écrite les 16 et 17/11, avant toute mesure. <span class="mi">Écart :</span> 1 note de version au lieu de 5.</td></tr>
<tr><td>4.12 Premier passage du banc</td><td class="ok">Fait le 19/11</td><td><code>banc/resultats/passage-1.md</code>, sans l'agent H (voir section 2).</td></tr>
<tr><td>5.4 Mesures complètes et graphiques</td><td class="ok">Fait le 19/11</td><td><code>banc/mesures.md</code> (les mesures de l'équipe avec leur source) et <code>banc/graphiques/</code>.</td></tr>
</table>
<h2>2. Le banc : premier passage (19/11)</h2>
<p>Chaque cas est joué seul sur Facturo en ligne (v13 avec ce seul changement), par la vraie chaîne d'Horama (relevés, règles calculées, comparaison aux références), avec des clics faits par le script au lieu de l'agent H. Un témoin sans changement donne 0 défaut et 0 doute. Coût : 0 $, 615 s pour 19 passages.</p>
<div class="chiffres"><div><b>4 / 4</b>défauts prouvés justes : aucune fausse alarme prouvée</div><div><b>5 / 5</b>changements voulus envoyés à l'humain, 0 faux défaut</div><div><b>4 / 13</b>bugs prouvés ; 9 / 13 vus en comptant les doutes</div></div>
<div class="graph">${g("1-verdicts.svg")}</div>
<div class="graph">${g("2-pixels-contre-horama.svg")}</div>
<p><b>Lecture.</b> Ce qu'Horama prouve, il le prouve juste. Les 4 bugs manqués (<code>format-montant</code>, <code>centime-detail</code>, <code>arrondi-total-liste</code>, <code>echeance-decalee</code>) ne sont couverts par aucune règle du vault et changent moins de 70 pixels : il faut des règles en plus dans la documentation, pas un meilleur agent. Une comparaison de pixels brute lève une alerte sur les 18 cas, sans distinguer un bug d'un changement voulu.</p>
<h2>3. Les mesures clés de l'équipe</h2>
<table><tr><th>Mesure</th><th>Valeur</th><th>Source</th></tr>
<tr><td>Coût d'un passage, agent H réel</td><td>0,026 à 0,103 $</td><td><code>banc/mesures.md</code>, section 3</td></tr>
<tr><td>Durée d'un passage</td><td>64 s (3 tests) à 237 s (15 pages)</td><td>idem</td></tr>
<tr><td>Tour du site d'Eugenia en ligne</td><td>21 règles conformes sur 21, 0 pixel d'écart, 3 tours</td><td><code>docs/tests/2026-11-17-tour-du-site-reel.md</code></td></tr>
<tr><td>Écriture des tests (modèle ouvert)</td><td>9 sur 9 justes, 1,6 s</td><td><code>docs/tests/2026-11-17-t4-generation-rapide-3.md</code></td></tr>
<tr><td>Vision (Holo), faux constats</td><td>75 %, puis 33 % après filtre (1 passage)</td><td><code>docs/tests/2026-11-18-a-holo-faux-constats.md</code></td></tr>
<tr><td>Mode grand public, 15 sites</td><td class="non">35 % de défauts prouvés faux le 18/11</td><td><code>docs/tests/2026-11-18-grand-public-banc.md</code> ; correctif #162 le 19/11, passage complet à refaire</td></tr>
</table>
<div class="graph">${g("3-cout-par-passage.svg")}</div>
<h2>4. Ce qui reste</h2>
<table><tr><th>À faire</th><th>Pourquoi</th></tr>
<tr><td>Le banc Facturo avec l'agent H sur les 18 cas</td><td>Le passage 1 mesure la vérification, pas la navigation de H. Environ 0,03 $ par cas (mesuré sur Facturo).</td></tr>
<tr><td>Ajouter au vault les règles manquantes (format des montants, égalité au centime entre liste et détail, date d'échéance), puis rejouer le banc</td><td>C'est ce qui ferait passer les 4 bugs manqués en bugs prouvés.</td></tr>
<tr><td>4 notes de version de plus dans le vault de Facturo</td><td>La mission en demandait 5.</td></tr>
<tr><td>Un passage complet du mode grand public après le correctif #162</td><td>Pour remplacer le chiffre de 35 % avant de le dire au jury.</td></tr>
<tr><td>Comparer avec des tests écrits à la main, et « sans mémoire » contre « avec mémoire » sur plusieurs passages</td><td>Demandé par la mission (5.4), pas encore mesuré.</td></tr>
</table>
<p class="sous">Tout chiffre de ce document vient d'un fichier du dépôt ; une valeur inconnue s'écrit « à mesurer ». SUSPECTED et INCONCLUSIVE ne comptent jamais comme des réussites.</p></html>`;
fs.writeFileSync(sortie, html);
const chrome = process.env.CHROME_BIN || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000", "--print-to-pdf=" + repo + "/banc/rapport-pole-cdo.pdf", pathToFileURL(sortie).href], { stdio: "ignore" });
console.log("banc/rapport-pole-cdo.pdf régénéré");
