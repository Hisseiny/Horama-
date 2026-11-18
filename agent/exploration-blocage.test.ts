import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { BaseMemoire } from "./src/base.ts";
import { detecterBlocage } from "./src/exploration/blocage.ts";
import { explorer } from "./src/exploration/explorer.ts";

const cases = [
  { html: '<title>Verify you are human</title><div class="h-captcha"></div>', status: 200, reason: /robots.*h-captcha/ },
  { html: '<iframe src="/_Incapsula_Resource"></iframe>', status: 200, reason: /robots.*Incapsula/ },
  { html: '<title>Just a moment</title><script src="/cdn-cgi/challenge-platform"></script>', status: 200, reason: /robots/ },
  { html: '<title>Security verification</title><div class="cf-turnstile"></div>', status: 200, reason: /robots/ },
  { html: "Forbidden", status: 403, reason: /robots.*403/ },
  { html: "Too many requests", status: 429, reason: /robots.*429/ },
  { html: "Missing", status: 404, reason: /introuvable/ },
  { html: '<title>Connexion</title><input type="password">', status: 200, reason: /Connexion demandée/ },
];

for (const rendered of [false, true]) {
  test(`blocages ${rendered ? "rendus Chrome (CDP simulé)" : "découverte HTTP locale"} : fin propre sans contournement`, async () => {
    for (const item of cases) {
      const server = createServer((req, res) => {
        const metadata = req.url === "/robots.txt" || req.url === "/sitemap.xml";
        res.writeHead(metadata ? 404 : rendered ? 200 : item.status, { "Content-Type": "text/html" });
        res.end(metadata ? "" : rendered ? "<title>Accueil</title>Bienvenue" : item.html);
      });
      await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const url = `http://127.0.0.1:${address.port}/`;
      const root = mkdtempSync(join(tmpdir(), "horama-blocage-"));
      let sessions = 0;
      try {
        const result = await explorer({ url, max: 3, port: 9333, sortie: join(root, "out"), vault: join(root, "vault") }, {
          base: new BaseMemoire(), log() {}, urlCourante: async () => url,
          runtime: { relever: async () => { throw new Error("Aucune capture du blocage"); }, navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
          connecter: async () => ({ send: async () => ({ result: { value: { html: item.html, status: item.status } } }), on() {}, close() {} }),
          session: async input => {
            sessions++;
            await input.onCreated("blocked");
            return { id: "blocked", fin: (async () => {
              await input.onTool("relever", { ecran: input.consigne.course[0].ecran, vue: "defaut" });
              return { id: "blocked", muted: false, cout_usd: 0, etapes: 1 };
            })() };
          },
        });
        assert.equal(result.etat, "fini");
        assert.equal(sessions, rendered ? 1 : 0);
        assert.match(result.agents[0].raison!, item.reason);
        assert.ok(result.pages.length > 0);
        assert.ok(result.pages.every(page => page.etat === "non_visitee" && page.statut === "INCONCLUSIVE" && item.reason.test(page.raison!)));
        assert.equal(result.totaux.pages_visitees, 0);
      } finally {
        await new Promise<void>(resolve => server.close(() => resolve()));
        rmSync(root, { recursive: true, force: true });
      }
    }
  });
}

test("contenu normal, vide et widget de contact : aucun blocage", () => {
  for (const html of ["", "<title>Accueil</title>Bienvenue", '<title>Contact</title><form><input name="email"><div class="g-recaptcha">Verify you are human</div></form>', '<title>Contact</title><p>Verify you are human</p>'.repeat(100)]) {
    assert.equal(detecterBlocage(html, 200), null);
  }
});

test("robots HTML protégé et sitemap protégés : arrêt avant session H", async () => {
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const root = mkdtempSync(join(tmpdir(), "horama-policy-"));
    try {
      const result = await explorer({ url: "https://example.org/", max: 3, port: 9333, sortie: join(root, "out"), vault: join(root, "vault") }, {
        base: new BaseMemoire(), log() {},
        fetch: async address => new Response(new URL(String(address)).pathname === path ? '<iframe src="/_Incapsula_Resource"></iframe>' : "", { headers: { "Content-Type": "text/html" } }),
        runtime: { relever: async () => { throw new Error("Capture interdite"); }, navigateur: async () => ({ channel: "fake", stop() {} }), close() {} },
        session: async () => { throw new Error("Session interdite"); },
      });
      assert.equal(result.etat, "fini");
      assert.match(result.agents[0].raison!, /robots.*Incapsula/);
      assert.equal(result.agents[0].session_id, null);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
