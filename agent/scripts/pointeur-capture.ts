// Real Chrome check for issue #48: a capture taken by `relever` with the pointer left on a :hover button equals the one
// taken without pointer. Run: CHROME_BIN=… node agent/scripts/pointeur-capture.ts [output folder]
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ouvrirNavigateur } from "../src/browser.ts";
import type { Bridge, Scene } from "../src/browser.ts";

const output = process.argv[2] ?? mkdtempSync(join(tmpdir(), "pointeur-"));
mkdirSync(output, { recursive: true });
const html = `<!doctype html><style>body{margin:0;font:24px sans-serif}button{position:absolute;left:400px;top:300px;width:480px;height:120px;font-size:32px;background:#fff;color:#123;border:2px solid #123;transition:background .4s,color .4s}button:hover{background:#c00;color:#fff}</style><button>DÉCOUVRIR LE BACHELOR</button>`;
const server = createServer((_, response) => { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(html); }).listen(0);
const site = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
const port = 9555;
const chrome = spawn(process.env.CHROME_BIN ?? "google-chrome", [`--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "profil-"))}`,
  "--force-device-scale-factor=1", "--no-first-run", "--no-default-browser-check", "--window-size=1400,1100", site], { stdio: "ignore" });
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
try {
  const scene: Scene = await import(new URL("../../automatisation/scene/scene.mjs", import.meta.url).href);
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); } }
  const bridge: Bridge = { failed: null, ready: async () => true, stop() {} };
  const runtime = await ouvrirNavigateur({ port, scene, findHolo: () => "/holo-factice", startBridge: () => bridge });
  const page = await scene.connectTab(port);
  const hovered = () => scene.evaluate(page, `document.querySelector("button").matches(":hover")`);
  const raw = async () => Buffer.from((await page.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false })).data, "base64");
  const without = Buffer.from((await runtime.relever("essai", "defaut")).png);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 640, y: 360 });
  await sleep(800);
  const hoverBefore = await hovered();
  const control = await raw();
  const withPointer = Buffer.from((await runtime.relever("essai", "defaut")).png);
  const hoverAfter = await hovered();
  writeFileSync(join(output, "sans-pointeur.png"), without);
  writeFileSync(join(output, "survol-sans-parade.png"), control);
  writeFileSync(join(output, "pointeur-pose-relever.png"), withPointer);
  const result = { hoverBefore, hoverAfter, controlDiffers: !control.equals(without), identical: withPointer.equals(without), output };
  console.log(JSON.stringify(result, null, 2));
  runtime.close(); page.close();
  process.exitCode = result.hoverBefore && !result.hoverAfter && result.controlDiffers && result.identical ? 0 : 1;
} finally { chrome.kill(); server.close(); }
