import { chromium } from "playwright-core";
import { assertAllowed, checkSandbox } from "../lib/sandbox-check.ts";

const [target, base] = process.argv.slice(2);
const started = performance.now();
let browser;
try {
  const result = await checkSandbox(target, base, async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    let blocked;
    await context.route("**/*", async route => {
      try {
        const request = route.request();
        const url = assertAllowed(request.url());
        if (request.method() === "POST" && (url.origin !== new URL(base).origin || url.pathname !== "/formulaires" || url.searchParams.get("mode") !== "500")) {
          throw new Error("Envoi refusé : seule la fausse base en mode 500 est autorisée.");
        }
        const response = await route.fetch({ maxRedirects: 0, timeout: 10000 });
        if (response.status() >= 300 && response.status() < 400) {
          throw new Error("Redirection refusée dans le bac à sable.");
        }
        await route.fulfill({ response });
      } catch (error) {
        blocked = error;
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const response = await page.goto(target);
    if (!response?.ok()) throw new Error(`Page : HTTP ${response?.status()}`);
    const form = page.locator("form[data-premium-form]").first();
    for (let step = 0; step < 10; step++) {
      const panel = form.locator("[data-pf-panel]:visible");
      const radios = panel.locator('input[type="radio"]');
      if (await radios.count()) await radios.first().locator("..").click();
      for (const select of await panel.locator("select").all()) {
        await select.selectOption({ index: 1 });
      }
      const values = { firstname: "Horama", lastname: "Test", email: "test+horama@example.com", phone: "0600000000", jobtitle: "Test", message: "Données factices Horama" };
      for (const [name, value] of Object.entries(values)) {
        const field = panel.locator(`[name="${name}"]`);
        if (await field.count()) await field.fill(value);
      }
      const submit = form.locator("[data-pf-submit]");
      if (await submit.isVisible()) {
        const posted = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/formulaires");
        await submit.click();
        const sent = await posted;
        if (sent.status() !== 500) throw new Error(`Scénario attendu : HTTP 500, reçu ${sent.status()}`);
        break;
      }
      await form.locator("[data-pf-next]").click();
    }
    const done = form.locator("[data-pf-done]");
    const alert = form.locator('[role="alert"]:visible');
    await form.locator('[data-pf-done]:visible, [role="alert"]:visible').first().waitFor({ state: "visible" });
    if (blocked) throw blocked;
    const success = await done.isVisible();
    return { success, text: await (success ? done : alert.first()).innerText() };
  });
  console.log(JSON.stringify({ ...result, durationMs: Math.round(performance.now() - started) }, null, 2));
  if (result.status === "INCONCLUSIVE") process.exitCode = 1;
} catch (error) {
  console.error(`REFUSED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
