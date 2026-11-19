import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright-core";
import { verdict } from "../lib/sandbox-check.ts";
import { POST } from "../app/formulaires/route.ts";
import { DELETE, GET } from "../app/recus/route.ts";

test("pages d'essai hors réseau : faux Merci détecté, version saine non signalée", async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", async route => {
      assert.equal(route.request().url(), "https://base.test/formulaires?mode=500");
      const response = await POST(new Request(route.request().url(), { method: "POST", body: route.request().postData() }));
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
    });
    for (const broken of [true, false]) {
      DELETE();
      await page.setContent(`<button>Envoyer</button><p id="success" hidden>Merci !</p><p role="alert" hidden>Erreur de test</p>
        <script>document.querySelector('button').onclick = async () => {
          const response = await fetch('https://base.test/formulaires?mode=500', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ formType: 'test', fields: { email: 'test+horama@example.com' } }) });
          document.querySelector(${JSON.stringify(broken ? "#success" : '[role="alert"]')}).hidden = false;
        };</script>`);
      await page.locator("button").click();
      await page.locator(broken ? "#success" : '[role="alert"]').waitFor();
      const observation = { success: await page.locator("#success").isVisible(), text: await page.locator("p:visible").innerText() };
      const result = verdict(observation, await GET().json());
      assert.equal(result.status, broken ? "VERIFIED_FAIL" : "PASS");
      assert.deepEqual(result.proof.received, []);
      assert.equal(result.proof.text, broken ? "Merci !" : "Erreur de test");
    }
  } finally {
    await browser.close();
  }
});
