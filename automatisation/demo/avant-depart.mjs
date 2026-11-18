// Checks before a real passage of the public mode, at no cost: nothing is started, nothing is written.
// - the H key is there (never shown) and no H session of the organisation is running (3 at most on the free plan);
// - the holo bridge is installed; the port of the scene's Chrome; the screens (the scene needs a 1280 × 900 page).
// Usage, from the root of the repository: node --env-file=.env.local automatisation/demo/avant-depart.mjs
// Exit: 0 ready, 1 something blocks the start (said on its line).
import { execFileSync } from "node:child_process";
import { findHolo } from "../scene/agent-h.mjs";

const API = "https://agp.eu.hcompany.ai/api/v2";
const PORT = 9333;
let ready = true;
const line = (ok, text) => {
  if (!ok) ready = false;
  console.log(`${ok ? "OK  " : "NON "} ${text}`);
};

const key = process.env.HAI_API_KEY;
line(Boolean(key), key ? "Clé H présente (non affichée)." : "Clé H absente : lancer avec node --env-file=.env.local.");
if (key) {
  // Listing the sessions costs nothing (vault, _tech/h-company-agents-api.md, measured on 8/11).
  try {
    const response = await fetch(`${API}/sessions?status=running&owner=organization&size=100`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) line(false, `Sessions H : l'API répond HTTP ${response.status}.`);
    else {
      const body = await response.json();
      const running = body.items ?? body.sessions ?? body.data ?? (Array.isArray(body) ? body : []);
      line(running.length === 0, `Sessions H en cours pour l'organisation : ${running.length}${running.length ? ` (${running.map((session) => session.id).join(", ")})` : ""}.`);
    }
  } catch (error) {
    line(false, `Sessions H : pas de réponse de l'API (${error.message}).`);
  }
}
const holo = findHolo();
line(Boolean(holo), holo ? `Pont holo : ${holo}.` : "Pont holo introuvable (HOLO_BIN, PATH, ~/.venvs/holo/bin/holo).");
const chrome = await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(2000) }).then((response) => response.json(), () => null);
console.log(`INFO Chrome de la scène : ${chrome ? `déjà ouvert sur le port ${PORT} (${chrome.Browser}), il sera réutilisé` : `port ${PORT} libre, la scène lancera son Chrome`}.`);
// The page of the scene is 1280 × 900; the window needs about 90 px more. fitViewport moves it to a screen that fits.
try {
  const screens = [...execFileSync("system_profiler", ["SPDisplaysDataType"], { encoding: "utf8" }).matchAll(/UI Looks like: (\d+) x (\d+)/g)].map(([, w, h]) => [Number(w), Number(h)]);
  const fits = screens.some(([w, h]) => w >= 1280 && h >= 990);
  line(fits, `Écrans : ${screens.map(([w, h]) => `${w} × ${h}`).join(", ") || "inconnus"}${fits ? " (un écran tient la fenêtre de 1280 × 900)" : " : aucun ne tient 1280 × 900 plus la barre de Chrome"}.`);
} catch {
  console.log("INFO Écrans : non lus.");
}
console.log("RAPPEL Souris hors de la fenêtre de la scène pendant toute la visite ; ne cliquer qu'aux boutons du récapitulatif.");
console.log(ready ? "Prêt." : "Pas prêt : voir les lignes NON.");
process.exit(ready ? 0 : 1);
