import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { BaseMemoire, creerBaseSupabase } from "../src/base.ts";
import { ouvrirNavigateur } from "../src/browser.ts";
import { HELP, lireArguments } from "../src/exploration/cli.ts";
import { explorer } from "../src/exploration/explorer.ts";
import { creerSessionH, libelleAction } from "../src/session.ts";
import { findHolo, startBridge } from "../../automatisation/scene/agent-h.mjs";
import * as scene from "../../automatisation/scene/scene.mjs";

export function parseArguments(args) {
  return { options: lireArguments(args.filter(arg => arg !== "--sans-agent")), sansAgent: args.includes("--sans-agent") };
}

async function main(args) {
  const { options, sansAgent } = parseArguments(args);
  if (!options) return console.log(HELP);
  const id = randomUUID();
  mkdirSync(options.sortie, { recursive: true });
  const presses = join(options.sortie, "appuis.jsonl");
  appendFileSync(presses, "");
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Passage annulé par Ctrl+C."));
  process.on("SIGINT", cancel);
  const page = await scene.connectTab(options.port);
  let runtime;
  let watching = true;
  let watch;
  let queue = Promise.resolve();
  const mascot = (command, ...values) => scene.layer(page, command, ...values);
  const genres = { VERIFIED_FAIL: "defaut", SUSPECTED: "doute" };
  async function rectsOf(finding, entry) {
    if (finding.preuve?.element) {
      const rects = await mascot("element", finding.preuve.element);
      if (rects.length) return rects;
    }
    for (const text of finding.textes_a_surligner ?? []) {
      const rects = await mascot("trouver", text);
      if (rects.length) return rects;
    }
    if (finding.zone && finding.capture === entry.capture?.fichier) {
      const [dx, dy] = entry.capture.defilement ?? [0, 0];
      return [{ ...finding.zone, x: finding.zone.x + dx, y: finding.zone.y + dy }];
    }
    return [];
  }
  const shown = new Set();
  async function poll() {
    const report = await readFile(join(options.sortie, "exploration.json"), "utf8").then(JSON.parse).catch(() => null);
    for (const entry of report?.pages ?? []) {
      if (entry.etat !== "visitee" || shown.has(entry.ecran)) continue;
      shown.add(entry.ecran);
      queue = queue.then(async () => {
        const mine = report.constats.filter(finding => finding.ecran === entry.ecran && !finding.explique_par);
        await mascot("etat", "observe");
        const live = new URL(await scene.evaluate(page, "location.href"));
        const target = new URL(entry.url);
        if (live.origin === target.origin && live.pathname.replace(/\/+$/, "") === target.pathname.replace(/\/+$/, "") && live.search === target.search) {
          for (const finding of mine.filter(candidate => genres[candidate.statut])) {
            const rects = await rectsOf(finding, entry);
            if (rects.length) await mascot("surligner", live.pathname + live.search, rects, genres[finding.statut], finding.id, null, true);
          }
        }
        const worst = ["VERIFIED_FAIL", "SUSPECTED", "INCONCLUSIVE"].find(status => mine.some(finding => finding.statut === status));
        await mascot("etat", worst === "VERIFIED_FAIL" ? "trouve" : worst === "SUSPECTED" ? "doute" : "observe");
        await scene.sleep(1200);
        await mascot("etat", "observe");
      }).catch(error => console.error(`Mascotte : ${error.message}`));
    }
  }
  try {
    await scene.installLayer(page, payload => appendFileSync(presses, JSON.stringify({ at: Date.now(), ...payload }) + "\n"), { passage: id, titre: "Horama" });
    await scene.navigate(page, options.url);
    await mascot("etat", "observe");
    runtime = await ouvrirNavigateur({ port: options.port, scene: { ...scene, connectTab: async () => page }, findHolo, startBridge });
    runtime.relever = async (_ecran, _vue, beforeCapture) => {
      const shot = await scene.capture(page, beforeCapture);
      return { png: new Uint8Array(shot.png), texte: shot.texte_page, url_page: shot.url_page, largeur: shot.largeur,
        hauteur: shot.hauteur, defilement: shot.defilement, phrase: "Capture enregistrée. Continue le parcours." };
    };
    runtime.capturerZone = zone => scene.captureZone(page, zone);
    const scriptedSession = async ({ consigne, onCreated, onStep, onTool }) => {
      const sessionId = `script-${id}`;
      let etapes = 0;
      const gesture = name => onStep({ horodatage: new Date().toISOString(), etape: ++etapes, action: libelleAction([name]), etat_session: "en_cours" });
      await onCreated(sessionId);
      const fin = (async () => {
        for (const step of consigne.course) {
          controller.signal.throwIfAborted();
          await gesture("go_to");
          await scene.navigate(page, step.address);
          await scene.sleep(2000);
          await gesture("relever");
          await onTool("relever", { ecran: step.ecran, vue: "defaut" });
          await scene.sleep(2000);
        }
        await gesture("terminer");
        await onTool("terminer", { etat: "reussi" });
      })().then(() => ({ id: sessionId, muted: false, cout_usd: null, etapes }), error => ({ id: sessionId, muted: false, cout_usd: null, etapes, erreur: error.message }));
      return { id: sessionId, fin };
    };
    watch = (async () => { while (watching) { await poll(); await scene.sleep(250); } })();
    const noHolo = async () => ({ status: "SUSPECTED", findings: [], model: "holo4-27b", durationMs: 0 });
    const report = await explorer(options, { base: options.sansBase ? new BaseMemoire() : creerBaseSupabase(), runtime,
      session: sansAgent ? scriptedSession : creerSessionH({ navigateur: runtime.navigateur }), signal: controller.signal,
      ...(sansAgent ? { holo: noHolo } : {}) });
    watching = false;
    await watch;
    await poll();
    await queue;
    await mascot("etat", report.pages.some(entry => entry.etat === "visitee") ? "fini" : "bloquee");
    await scene.sleep(1500);
    process.exitCode = report.etat === "fini" ? 0 : 1;
  } finally {
    watching = false;
    await watch;
    await queue;
    runtime ? runtime.close() : page.close();
    process.removeListener("SIGINT", cancel);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
