// The images of the direct for the fake service (issue #164), made without H nor network: each page of the recorded
// exploration (its capture, shown as a page of 1280 × 800) in a Chrome without window, with the layer of the scene
// (automatisation/scene: the cursor of the agent that goes and clicks, the mascot, the stroke of miltos or the dots of
// ochre on a finding of the page). Four JPEG images per page, as the screencast of the real service would send:
// <ordre>-<n>.jpg, n from 0 to 3.
//
// Usage, from the root of the repository: node extension/faux-service/enregistrer-direct.mjs [--dossier <exploration>]
//   [--sortie extension/faux-service/direct-enregistre] [--port 9353]
// The output folder is ignored by Git (about 5 MB); the fake service reads it with --direct.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { connectTab, installLayer, layer, navigate, sleep } from "../../automatisation/scene/scene.mjs";

const option = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const FOLDER = resolve(option("dossier", fileURLToPath(new URL("rapport-enregistre", import.meta.url))));
const OUT = resolve(option("sortie", fileURLToPath(new URL("direct-enregistre", import.meta.url))));
const PORT = Number(option("port", 9353));
const [WIDTH, HEIGHT] = [1280, 800];
const RECORD = JSON.parse(readFileSync(join(FOLDER, "exploration.json"), "utf8"));
const pages = [...RECORD.pages].sort((a, b) => a.ordre - b.ordre);

// Each page of the site is its capture, at its natural size, on a page of the same address path.
const server = createServer((request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  const page = pages.find((candidate) => `/${candidate.ecran}` === pathname);
  if (pathname.startsWith("/captures/")) {
    try {
      return response.writeHead(200, { "Content-Type": "image/png" }).end(readFileSync(join(FOLDER, decodeURIComponent(pathname))));
    } catch {
      return response.writeHead(404).end();
    }
  }
  response.writeHead(page ? 200 : 404, { "Content-Type": "text/html; charset=utf-8" });
  response.end(page?.capture ? `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${page.ecran}</title></head><body style="margin:0;background:#fff"><img src="/${page.capture.fichier}" alt="" style="display:block"></body></html>` : "");
}).listen(0, "127.0.0.1");
await new Promise((done) => server.once("listening", done));
const base = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), "horama-direct-"));
const chrome = spawn(process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--force-device-scale-factor=1", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
let page = null;
try {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (await fetch(`http://127.0.0.1:${PORT}/json/version`).then(() => true, () => false)) break;
  }
  page = await connectTab(PORT);
  await page.send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await installLayer(page, () => {}, { passage: "direct-faux-service", titre: "Horama" });
  mkdirSync(OUT, { recursive: true });
  const shot = async (ordre, n) => writeFileSync(join(OUT, `${ordre}-${n}.jpg`), Buffer.from((await page.send("Page.captureScreenshot", { format: "jpeg", quality: 60 })).data, "base64"));
  const click = async (x, y) => {
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  };
  for (const [index, visited] of pages.entries()) {
    await navigate(page, `${base}/${visited.ecran}`);
    await layer(page, "etat", "observe");
    await sleep(700);
    await shot(visited.ordre, 0);
    // The agent goes to a point of the page and clicks: the cursor travels there (a different point on each page).
    await click(260 + ((index * 173) % 760), 220 + ((index * 97) % 420));
    await sleep(500);
    await shot(visited.ordre, 1);
    await sleep(900);
    await shot(visited.ordre, 2);
    // The findings of the page, drawn as the scene draws them when the page is checked.
    const findings = RECORD.constats.filter((constat) => constat.ecran === visited.ecran && constat.zone && (constat.statut === "VERIFIED_FAIL" || constat.statut === "SUSPECTED"));
    for (const constat of findings) {
      const genre = constat.statut === "VERIFIED_FAIL" ? "defaut" : "doute";
      await layer(page, "etat", genre === "defaut" ? "trouve" : "doute");
      await layer(page, "surligner", `/${visited.ecran}`, [constat.zone], genre, constat.id, null, true);
    }
    await sleep(findings.length ? 900 : 300);
    await shot(visited.ordre, 3);
    console.log(`${visited.ordre}. ${visited.ecran} : 4 images${findings.length ? `, ${findings.length} constat(s) tracé(s)` : ""}`);
  }
  console.log(`${pages.length * 4} images dans ${OUT}`);
} finally {
  page?.close();
  chrome.kill();
  server.close();
  await sleep(800);
  rmSync(profile, { recursive: true, force: true });
}
