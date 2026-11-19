import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fingerprintMarker, fingerprintOf } from "../../extension/lib/ticket.mjs";
import { recordTicket } from "./destinations.mjs";

const report = {
  passage_id: "p1", site: "site", adresse: "https://previsualisation.test/", le: "2026-11-19T12:00:00Z",
  agents: [{ agent: 1, pages: ["depart", "faq", "ailleurs", "ecole"], replay_url: "https://replay.test/p1" }],
  pages: [
    { ecran: "depart", url: "https://previsualisation.test/", arrivee: "depart" },
    { ecran: "faq", url: "https://previsualisation.test/faq", arrivee: "clic" },
    { ecran: "ailleurs", url: "https://previsualisation.test/ailleurs", arrivee: "adresse" },
    { ecran: "ecole", url: "https://previsualisation.test/ecole", arrivee: "clic", http: 200, capture: { largeur: 1280, hauteur: 800 } },
  ],
};
const finding = { id: "finding", ecran: "ecole", agent: 1, sorte: "lien-casse", statut: "VERIFIED_FAIL", description: "Le lien renvoie HTTP 404.", textes_a_surligner: ["Portes ouvertes"],
  preuve: { element: "a.portes-ouvertes", mesure: "HTTP 404", attendu: "HTTP < 400", console: "GET 404 <!---->" },
  capture: "/capture.png" };
const decision = { decision: "bug", ecart_id: finding.id, passage_id: report.passage_id, par: "Nathan", le: "2026-11-19T12:05:00Z" };

async function fixture(t, respond) {
  const vault = mkdtempSync(join(tmpdir(), "horama-ticket-"));
  const requests = [];
  const messages = [];
  const server = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const call = { method: request.method, url: request.url, body: raw ? JSON.parse(raw) : undefined };
    requests.push(call);
    const { status = 200, data, headers } = respond(call);
    response.writeHead(status, { "content-type": "application/json", ...headers });
    response.end(JSON.stringify(data));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.close();
    rmSync(vault, { recursive: true, force: true });
  });
  const record = (overrides) => recordTicket({ vault, report, finding, decision, note: "site/passages/p1.md", repository: "o/d",
    api: `http://127.0.0.1:${server.address().port}`, token: "jeton-factice", say: (line) => messages.push(line), ...overrides });
  return { record, vault, requests, messages };
}

test("constat prouvé et décision humaine : note dans le vault et issue étiquetée, sans capture publique", async (t) => {
  const { record, requests } = await fixture(t, ({ method, url }) => {
    if (url.includes("issues?")) return { data: [] };
    if (url.endsWith("/labels/horama")) return { status: 404, data: {} };
    if (method === "POST" && url.endsWith("/labels")) return { status: 201, data: { name: "horama" } };
    return { status: 201, data: { number: 9, html_url: "https://github.test/o/d/issues/9" } };
  });
  const result = await record();
  assert.equal(result.status, "ouverte");
  assert.equal(result.numero, 9);
  assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
    ["GET", "/repos/o/d/issues?state=open&per_page=100&page=1"], ["GET", "/repos/o/d/labels/horama"],
    ["POST", "/repos/o/d/labels"], ["POST", "/repos/o/d/issues"],
  ]);
  const { title, body, labels } = requests.at(-1).body;
  assert.equal(title, "Lien cassé : « Portes ouvertes » — Le lien renvoie HTTP 404");
  assert.deepEqual(labels, ["horama"]);
  assert.match(body, /1\. Commencer.*\n2\. Suivre le lien.*\/faq.*\n3\. Ouvrir directement.*\/ailleurs \(go_to\)\.\n4\. Suivre le lien.*\/ecole/);
  for (const expected of ["HTTP 404", "Console : GET 404", "site/passages/p1.md", "1280 × 800", "Navigateur du passage : à mesurer", "par Nathan", fingerprintMarker(result.empreinte)]) {
    assert.ok(body.includes(expected), expected);
  }
  assert.doesNotMatch(body, /capture\.png|replay\.test|!\[/);
  assert.equal(readFileSync(result.fichier, "utf8"), `# ${title}\n\n${body}`);
});

test("l'empreinte traverse les prévisualisations : issue ouverte trouvée en page 2 et commentée", async (t) => {
  const moved = { ...report, pages: report.pages.map((page) => ({ ...page, url: page.url.replace("previsualisation.test", "autre-previsualisation.test") })) };
  const marker = fingerprintMarker(fingerprintOf(moved, { ...finding, description: "Nouvelle mesure" }));
  const { record, requests } = await fixture(t, ({ method, url }) => {
    if (method === "POST") return { status: 201, data: { html_url: "https://github.test/o/d/issues/9#issuecomment-1" } };
    if (url.endsWith("&page=1")) return { data: [{ number: 8, body: marker, pull_request: {} }], headers: { link: '<http://github.test?page=2>; rel="next"' } };
    return { data: [{ number: 9, body: `Ancien passage\n${marker}\n` }] };
  });
  assert.equal((await record()).status, "commente");
  assert.equal(requests.length, 3);
  assert.equal(requests.at(-1).url, "/repos/o/d/issues/9/comments");
  assert.match(requests.at(-1).body.body, /^Encore présent/);
});

test("doute, non conclu, voulu ou décision non rattachée : aucun ticket, aucun envoi", async (t) => {
  const { record, requests, vault } = await fixture(t, () => ({ data: [] }));
  for (const statut of ["SUSPECTED", "INCONCLUSIVE"]) assert.equal(await record({ finding: { ...finding, statut } }), null);
  for (const other of [null, { ...decision, decision: "voulu" }, { ...decision, ecart_id: "autre" }, { ...decision, passage_id: "ancien" }]) {
    assert.equal(await record({ decision: other }), null);
  }
  assert.deepEqual(requests, []);
  assert.deepEqual(readdirSync(vault), []);
});

test("échec GitHub : statut visible et ticket conservé ; sans dépôt, le vault seul", async (t) => {
  const { record, vault, requests, messages } = await fixture(t, () => ({ status: 500, data: {} }));
  const result = await record();
  assert.equal(result.status, "INCONCLUSIVE");
  assert.equal(result.fichier, join(vault, "site", "tickets", "p1--finding.md"));
  assert.match(readFileSync(result.fichier, "utf8"), /Lien cassé/);
  assert.match(messages[0], /Ticket non envoyé \(GitHub : HTTP 500\.\) : il est dans /);
  assert.equal((await record({ repository: undefined })).status, "vault");
  assert.equal(requests.length, 1);
});
