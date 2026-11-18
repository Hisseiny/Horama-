import { chromium } from "playwright-core";
import { PNG } from "pngjs";

export const WIDTH = 1280;
export const HEIGHT = 900;

export const VIEWS = [
  { ecran: "tableau-de-bord", vue: "defaut", path: "/tableau-de-bord" },
  { ecran: "liste-des-factures", vue: "defaut", path: "/factures" },
  { ecran: "detail-facture", vue: "defaut", path: "/factures/F-119" },
  { ecran: "liste-des-factures", vue: "filtre-echeance", path: "/factures?filtre=echeance-depassee" },
];

export function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

export const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");

export function openBrowser() {
  return chromium.launch({ channel: "chrome", headless: true });
}

export async function visit(browser, version, path, r) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const suite = encodeURIComponent(`/v${version}${path}`);
  const url = `${BASE}/v${version}/entrer?suite=${suite}${r === undefined ? "" : `&r=${r}`}`;
  const response = await page.goto(url, { waitUntil: "load" });
  if (response.status() !== 200) throw new Error(`${url} : statut ${response.status()}`);
  const buffer = await page.screenshot();
  const measures = await page.evaluate(() => {
    const zones = {};
    for (const element of document.querySelectorAll("[data-zone]")) {
      const rect = element.getBoundingClientRect();
      const zone = (zones[element.dataset.zone] ??= { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity, texte: element.textContent });
      zone.left = Math.min(zone.left, rect.left);
      zone.top = Math.min(zone.top, rect.top);
      zone.right = Math.max(zone.right, rect.right);
      zone.bottom = Math.max(zone.bottom, rect.bottom);
    }
    for (const [name, zone] of Object.entries(zones)) {
      zones[name] = {
        boite: { x: zone.left, y: zone.top, largeur: zone.right - zone.left, hauteur: zone.bottom - zone.top },
        texte: zone.texte,
      };
    }
    return { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, zones };
  });
  await context.close();
  return { buffer, image: PNG.sync.read(buffer), ...measures };
}

export function diff(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error("Images de tailles différentes");
  let pixels = 0;
  let left = a.width;
  let top = a.height;
  let right = -1;
  let bottom = -1;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2] && a.data[i + 3] === b.data[i + 3]) continue;
    pixels++;
    const x = (i / 4) % a.width;
    const y = Math.floor(i / 4 / a.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return { pixels, boite: pixels ? { x: left, y: top, largeur: right - left + 1, hauteur: bottom - top + 1 } : null };
}
