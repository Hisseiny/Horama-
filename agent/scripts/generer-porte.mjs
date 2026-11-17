import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export async function genererPorte({ passageId, sortie, url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, requete = fetch }) {
  if (!passageId || !sortie || !url || !key) throw new Error("Passage, dossier de sortie (ex. docs/tests/2026-11-16-porte-agent) et configuration Supabase serveur requis.");
  const origin = url.replace(/\/$/, "");
  const filter = encodeURIComponent(passageId);
  async function rows(table, query) {
    const response = await requete(`${origin}/rest/v1/${table}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Lecture de ${table} refusée (HTTP ${response.status}).`);
    return response.json();
  }
  const [passages, captures, events] = await Promise.all([
    rows("passages", `id=eq.${filter}&select=*`),
    rows("captures", `passage_id=eq.${filter}&order=etape,prise_le`),
    rows("evenements", `passage_id=eq.${filter}&order=horodatage,id`),
  ]);
  const passage = passages[0];
  if (!passage?.rapport) throw new Error("Passage introuvable ou rapport C6 absent.");
  const report = passage.rapport;
  const images = await Promise.all(captures.map(async (capture, index) => {
    const path = capture.chemin.split("/").map(encodeURIComponent).join("/");
    const response = await requete(`${origin}/storage/v1/object/public/captures/${path}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Capture ${index + 1} indisponible (HTTP ${response.status}).`);
    const data = new Uint8Array(await response.arrayBuffer());
    if (Buffer.from(data.subarray(0, 8)).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Capture ${index + 1} : PNG invalide.`);
    return { capture, data, file: `capture-${index + 1}.png` };
  }));
  const cost = passage.cout_usd == null ? "inconnu" : `${passage.cout_usd} USD`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Horama — Porte agent</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#162330;font:16px/1.55 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:36px 24px}h1{font-size:38px;margin:4px 0}h2{margin-top:34px}h3{margin:0 0 8px;font-size:18px}.eyebrow{font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#38536b}.notice{border-left:5px solid #a8670b;background:#fff2d9;padding:18px 22px;margin:24px 0}.meta,.tests,.captures{display:grid;gap:16px}.meta{grid-template-columns:repeat(4,1fr)}.tests{grid-template-columns:repeat(3,1fr)}.captures{grid-template-columns:repeat(2,1fr)}article,figure,.metric{background:white;border:1px solid #d5dfe7;border-radius:10px;padding:18px;margin:0;min-width:0}article p{margin:7px 0}code{overflow-wrap:anywhere;font-size:13px}.metric strong{display:block;font-size:25px}.muted,figcaption{color:#475b6b;font-size:14px}.pill{display:inline-block;background:#e0f0e8;color:#145b3a;border-radius:5px;padding:2px 9px;font-weight:650}.captures img{display:block;width:100%;height:auto;border:1px solid #d5dfe7;margin:12px 0}summary{cursor:pointer}pre{white-space:pre-wrap;max-height:240px;overflow:auto;font:12px/1.5 monospace}table{width:100%;border-collapse:collapse;background:white}th,td{padding:12px;text-align:left;border-bottom:1px solid #d5dfe7;vertical-align:top}th{background:#e6edf3}.table-wrap{overflow:auto}footer{margin-top:36px;border-top:1px solid #d5dfe7;padding-top:18px}@media(max-width:800px){.tests,.captures{grid-template-columns:1fr}.meta{grid-template-columns:repeat(2,1fr)}h1{font-size:30px}}
</style></head><body><main>
<div class="eyebrow">Horama · Porte du couloir Ali</div><h1>Un passage, quatre vues réelles</h1>
<p>Facturo v${escape(passage.version_testee)} · <code>${escape(passage.id)}</code></p>
<div class="notice"><strong>Session agent simulée — aucun appel H.</strong><br>Les captures sont réelles : Facturo v${escape(passage.version_testee)}, Chrome headless, 1280 × 900, DPR 1. Le script navigue vers chaque vue ; cela ne prouve pas qu'un agent H sait effectuer le parcours. Aucun verdict métier n'est démontré ici.</div>
<div class="meta"><div class="metric">État du passage<strong>${escape(passage.etat)}</strong></div><div class="metric">Durée réelle du coureur<strong>${escape(passage.duree_s ?? "inconnue")} s</strong></div><div class="metric">Coût<strong>${escape(cost)}</strong></div><div class="metric">Captures / événements<strong>${captures.length} / ${events.length}</strong></div></div>
<p class="muted">Début : ${escape(passage.debut)} · Fin : ${escape(passage.fin)}. Données lues depuis les lignes Supabase locales ; images copiées dans cette planche statique.</p>
<h2>Les ${report.tests.length} tests du rapport C6</h2><div class="tests">${report.tests.map((test) => `<article><h3>${escape(test.test_id)}</h3><span class="pill">${escape(test.etat)}</span>${test.raison ? `<p>${escape(test.raison)}</p>` : ""}<p>Écrans relevés : ${escape(test.ecrans_releves.join(", "))}</p><p class="muted">Session : <code>${escape(test.session_id)}</code><br>${escape(test.etapes)} étapes · ${escape(test.duree_s)} s · coût ${escape(test.cout_usd == null ? "inconnu" : `${test.cout_usd} USD`)}</p></article>`).join("")}</div>
<h2>Les ${captures.length} captures de Facturo v${escape(passage.version_testee)}</h2><p class="muted">Cliquez sur une capture pour l'ouvrir à sa taille d'origine. Un relevé partagé appartient au premier test qui le demande.</p><div class="captures">${images.map(({ capture, file }) => `<figure><h3>${escape(capture.ecran)} · ${escape(capture.vue)}</h3><div class="muted"><code>${escape(capture.test_id)}</code></div><a href="${file}" target="_blank" rel="noopener"><img src="${file}" alt="Capture réelle de ${escape(capture.ecran)}, vue ${escape(capture.vue)}, Facturo v${escape(capture.version)}" width="${escape(capture.largeur)}" height="${escape(capture.hauteur)}"></a><figcaption>${escape(capture.prise_le)} · ${escape(capture.largeur)} × ${escape(capture.hauteur)}<br><code>${escape(capture.url_page)}</code></figcaption><details><summary>Texte réellement relevé</summary><pre>${escape(capture.texte_page)}</pre></details></figure>`).join("")}</div>
<h2>Fil horodaté du passage simulé</h2><div class="table-wrap"><table><thead><tr><th>Heure (UTC)</th><th>Étape</th><th>Action</th><th>Test / état session</th></tr></thead><tbody>${events.map((event) => `<tr><td><time>${escape(event.horodatage)}</time></td><td>${escape(event.etape)}</td><td>${escape(event.action)}</td><td><code>${escape(event.test_id)}</code><br>${escape(event.etat_session)}</td></tr>`).join("")}</tbody></table></div>
<footer><strong>Porte non validée : en attente du « go » d'Ali.</strong><p class="muted">Construit et vérifié : lecture des tests, captures navigateur, persistance et rapport. À vérifier avec une clé H : navigation autonome, outils réels, sessions muettes et coût mesuré. Aucun replay H disponible pour cette simulation.</p></footer>
</main></body></html>`;
  await mkdir(sortie, { recursive: true });
  await Promise.all(images.map(({ file, data }) => writeFile(resolve(sortie, file), data)));
  await writeFile(resolve(sortie, "index.html"), html.replace(/[ \t]+$/gm, (space) => [...space].map((char) => `&#${char.charCodeAt(0)};`).join("")));
  return { passageId, captures: images.length, evenements: events.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const option = (name) => process.argv[process.argv.indexOf(name) + 1];
  try {
    const result = await genererPorte({ passageId: process.argv.includes("--passage") ? option("--passage") : undefined, sortie: process.argv.includes("--sortie") ? option("--sortie") : undefined });
    console.log(`Planche générée : ${result.passageId}, ${result.captures} captures, ${result.evenements} événements.`);
  } catch (error) {
    console.error(error instanceof Error && !/fetch|network/i.test(error.message) ? error.message : "Génération impossible : erreur réseau Supabase.");
    process.exitCode = 1;
  }
}
