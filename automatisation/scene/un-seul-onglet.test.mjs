// One tab only (connectTab of scene.mjs, issue #91): a link with target=_blank (with and without rel=noopener) and a
// window.open, clicked for real as H clicks (Input.dispatchMouseEvent), open in the tab of the scene, which stays in
// front; the capture stays fast. A real Chrome, local pages, no network, no H.
// Run from this folder: node --test un-seul-onglet.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { capture, clickAt, closeChrome, connectTab, evaluate, fitViewport, navigate, openChrome, sleep, waitFor } from "./scene.mjs";

const PORT = 9339;
const START = `<!doctype html><html><body style="margin:0;font:20px sans-serif">
<a id="blank" href="/b" target="_blank" style="position:absolute;left:20px;top:20px;width:200px;height:40px;display:block">Page B</a>
<a id="noopener" href="/c" target="_blank" rel="noopener noreferrer" style="position:absolute;left:20px;top:100px;width:200px;height:40px;display:block">Page C</a>
<button id="open" onclick="window.open('/d')" style="position:absolute;left:20px;top:180px;width:200px;height:40px">Page D</button>
</body></html>`;
const page = (name) => `<!doctype html><html><body><h1>Page ${name}</h1></body></html>`;

test("un lien target=_blank ou un window.open s'ouvre dans l'onglet de la scène, qui reste devant", async () => {
  const server = createServer((request, response) => response.end(request.url === "/" ? START : page(request.url.slice(1).toUpperCase()))).listen(0, "127.0.0.1");
  await new Promise((done) => server.once("listening", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), "horama-un-seul-onglet-"));
  const chrome = await openChrome({ bin: process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port: PORT, profile });
  const tab = await connectTab(PORT);
  const tabs = async () => (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter((item) => item.type === "page");
  try {
    await fitViewport(tab);
    for (const [id, expected] of [["blank", "/b"], ["noopener", "/c"], ["open", "/d"]]) {
      await navigate(tab, `${origin}/`);
      const centre = await evaluate(tab, `(() => { const r = document.getElementById("${id}").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await clickAt(tab, centre);
      assert.ok(await waitFor(tab, `location.pathname === "${expected}" && document.readyState === "complete"`, 10_000), `${id} : la page ${expected} s'ouvre dans l'onglet de la scène`);
      await sleep(300);
      const open = await tabs();
      assert.equal(open.length, 1, `${id} : un seul onglet (${open.map((item) => item.url).join(", ")})`);
      assert.equal(await evaluate(tab, "document.visibilityState"), "visible", `${id} : l'onglet de la scène est devant`);
      const started = Date.now();
      const shot = await capture(tab);
      assert.match(shot.texte_page, new RegExp(`Page ${expected.slice(1).toUpperCase()}`));
      assert.ok(Date.now() - started < 3000, `${id} : capture en ${Date.now() - started} ms`);
    }
    // A tab opened by CDP (not by the page) is left alone.
    const other = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
    await sleep(500);
    assert.equal((await tabs()).length, 2, "un onglet ouvert par CDP n'est pas fermé");
    await fetch(`http://127.0.0.1:${PORT}/json/close/${other.id}`);
  } finally {
    tab.close();
    await closeChrome({ port: PORT, pid: chrome.pid });
    server.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
