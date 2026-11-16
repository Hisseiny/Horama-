// Screenshots of the eight steps, with the installed Chrome (never a downloaded browser).
// node interface/scripts/captures.mjs [--base http://localhost:3000] [--sortie <dossier>]
// Exit 1 if a page does not answer 200 or if the browser console shows an error.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values } = parseArgs({ options: { base: { type: "string" }, sortie: { type: "string" } } });
const base = values.base ?? "http://localhost:3000";
const out = path.resolve(values.sortie ?? path.join(import.meta.dirname, "..", "captures"));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (message) => message.type() === "error" && problems.push(`${page.url()} : console : ${message.text()}`));
page.on("pageerror", (error) => problems.push(`${page.url()} : ${error.message}`));

async function shoot(name, url) {
  const response = await page.goto(new URL(url, base).href, { waitUntil: "networkidle" });
  if (response?.status() !== 200) problems.push(`${url} : HTTP ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, name), fullPage: true });
  console.log(`${name}  ${url}`);
}

await shoot("1-accueil.png", "/");
// The header gives the routes of the current software, version and passage.
const step = (n) => page.getAttribute(`[data-etape="${n}"]`, "href");
const [notes, accepted, live, comparison, report] = await Promise.all([2, 3, 4, 5, 8].map(step));

await shoot("2-note-test-propose.png", notes);
await shoot("3-test-accepte.png", accepted);
await shoot("4-passage-direct.png", `${live}?instant=30`);
await shoot("5-comparaison.png", comparison);
await shoot("5b-comparaison-pixels.png", `${comparison}?vue=pixels`);
await shoot("5c-comparaison-rideau.png", `${comparison}?vue=rideau`);
await shoot("6-relecture.png", "/relecture");
await shoot("7-derive.png", "/derive");
await shoot("8-rapport.png", report);

await browser.close();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`10 captures dans ${out}`);
