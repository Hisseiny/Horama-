import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { genererPorte } from "./scripts/generer-porte.mjs";

const png = Buffer.from("89504e470d0a1a0a", "hex");
const passage = { id: "p1", version_testee: "13", etat: "joue", duree_s: 2, cout_usd: null, debut: "2026-11-16T12:00:00Z", fin: "2026-11-16T12:00:02Z", rapport: { tests: [{ test_id: "test-1", session_id: "simulation-1", etat: "termine", ecrans_releves: ["factures"], etapes: 1, duree_s: 2, cout_usd: null }] } };
const capture = { chemin: "p1/test-1/factures--defaut.png", ecran: "factures", vue: "defaut", test_id: "test-1", largeur: 1280, hauteur: 900, version: "13", url_page: "https://facturo-demo.vercel.app/v13/factures", texte_page: "<script>injection</script>", prise_le: passage.fin };

test("la planche copie les PNG et rend les lignes Supabase sans HTML injecté ni clé", async () => {
  const sortie = await mkdtemp(join(tmpdir(), "horama-gate-"));
  try {
    const requests = [];
    const requete = async (url) => {
      requests.push(String(url));
      if (String(url).includes("/storage/")) return new Response(png);
      const value = String(url).includes("/passages?") ? [passage] : String(url).includes("/captures?") ? [capture] : [{ horodatage: passage.debut, etape: 1, action: "Ouvre les factures", test_id: "test-1", etat_session: "en_cours" }];
      return Response.json(value);
    };
    assert.deepEqual(await genererPorte({ passageId: "p1", sortie, url: "http://localhost:54321", key: "test-key", requete }), { passageId: "p1", captures: 1, evenements: 1 });
    const html = await readFile(join(sortie, "index.html"), "utf8");
    assert.match(html, /Session agent simulée — aucun appel H/);
    assert.match(html, /captures sont réelles/);
    assert.match(html, /inconnu/);
    assert.match(html, /src="capture-1.png"/);
    assert.match(html, /Ouvre les factures/);
    assert.match(html, /&lt;script&gt;injection&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|test-key|src="http/);
    assert.deepEqual(await readFile(join(sortie, "capture-1.png")), png);
    assert.ok(requests.some((url) => url.includes("order=horodatage,id")));
  } finally { await rm(sortie, { recursive: true, force: true }); }
});

test("un rapport vide reste une planche lisible", async () => {
  const sortie = await mkdtemp(join(tmpdir(), "horama-gate-"));
  try {
    await genererPorte({ passageId: "p1", sortie, url: "http://localhost", key: "test-key", requete: async (url) => Response.json(String(url).includes("/passages?") ? [{ ...passage, rapport: { tests: [] } }] : []) });
    const html = await readFile(join(sortie, "index.html"), "utf8");
    assert.match(html, /Les 0 tests/);
    assert.match(html, /Les 0 captures/);
  } finally { await rm(sortie, { recursive: true, force: true }); }
});

test("configuration, passage absent, refus HTTP et PNG invalide échouent explicitement", async () => {
  const args = { passageId: "p1", sortie: "/unused", url: "http://localhost", key: "test-key" };
  await assert.rejects(genererPorte({ ...args, key: "" }), /requis/);
  await assert.rejects(genererPorte({ ...args, requete: async () => Response.json([]) }), /introuvable/);
  await assert.rejects(genererPorte({ ...args, requete: async () => new Response(null, { status: 403 }) }), /HTTP 403/);
  await assert.rejects(genererPorte({ ...args, requete: async (url) => {
    if (String(url).includes("/storage/")) return new Response("pas une image");
    return Response.json(String(url).includes("/passages?") ? [passage] : String(url).includes("/captures?") ? [capture] : []);
  } }), /PNG invalide/);
});
