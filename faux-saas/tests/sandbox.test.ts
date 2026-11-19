import assert from "node:assert/strict";
import { test } from "node:test";
import { POST, OPTIONS as formOptions } from "../app/formulaires/route.ts";
import { GET, DELETE, OPTIONS as receiptOptions } from "../app/recus/route.ts";
import { assertAllowed, checkSandbox, verdict } from "../lib/sandbox-check.ts";

test("routes : enregistrement, erreur forcée, JSON invalide, lecture et suppression avec CORS", async () => {
  DELETE();
  const data = { formType: "contact", fields: { email: "test+horama@example.com" } };
  const post = (body: string, query = "") => POST(new Request(`http://base.test/formulaires${query}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body }));
  const responses = [await post(JSON.stringify(data)), await post(JSON.stringify(data), "?mode=500"), await post("{"), await post("{}")];
  assert.deepEqual(responses.map(response => response.status), [201, 500, 400, 400]);
  assert.deepEqual(await GET().json(), [data]);
  responses.push(GET(), DELETE(), formOptions(), receiptOptions());
  assert.deepEqual(await GET().json(), []);
  assert.equal(formOptions().status, 204);
  assert.equal(receiptOptions().status, 204);
  for (const response of responses) assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
});

test("pages d'essai : confirmation plantée et alerte saine, preuve conservée", () => {
  const brokenPage = { success: true, text: "Merci ! Votre demande a été envoyée." };
  const healthyPage = { success: false, text: "L’envoi vers la base de test a échoué. Réessayez." };
  assert.deepEqual(verdict(brokenPage, []), { status: "VERIFIED_FAIL", message: "Succès affiché mais aucun envoi reçu.", proof: { text: brokenPage.text, received: [] } });
  assert.equal(verdict(healthyPage, []).status, "PASS");
  assert.equal(verdict({ success: false, text: "" }, []).status, "INCONCLUSIVE");
  assert.equal(verdict(brokenPage, [{}]).status, "INCONCLUSIVE");
});

test("refus des deux hôtes avant tout appel, y compris domaine réel explicitement listé", async () => {
  const previous = process.env.SANDBOX_ALLOWED_HOSTS;
  process.env.SANDBOX_ALLOWED_HOSTS = "page.test,base.test,eugeniaschool.com,www.eugeniaschool.com,eugeniaschool.com.";
  let calls = 0;
  const observe = async () => { calls++; return { success: true, text: "Merci !" }; };
  const fetcher = async () => { calls++; return Response.json([]); };
  try {
    for (const [target, base] of [["https://outside.test", "https://base.test"], ["https://page.test", "https://outside.test"], ["https://eugeniaschool.com", "https://base.test"], ["https://page.test", "https://www.eugeniaschool.com"], ["https://eugeniaschool.com.", "https://base.test"]]) {
      await assert.rejects(checkSandbox(target!, base!, observe, fetcher), /Hôte refusé/);
    }
    assert.equal(calls, 0);
    assert.throws(() => assertAllowed("https://page.test", ""), /Hôte refusé/);
    assert.throws(() => assertAllowed("https://sub.page.test", "page.test"), /Hôte refusé/);
    const pass = await checkSandbox("https://page.test", "https://base.test", async () => ({ success: false, text: "Erreur de test" }), fetcher);
    assert.equal(pass.status, "PASS");
    const failed = await checkSandbox("https://page.test", "https://base.test", observe, async () => { throw new Error("Réseau indisponible"); });
    assert.equal(failed.status, "INCONCLUSIVE");
    assert.match(failed.message, /Réseau indisponible/);
    for (const response of [new Response(null, { status: 500 }), Response.json({})]) {
      assert.equal((await checkSandbox("https://page.test", "https://base.test", observe, async () => response.clone())).status, "INCONCLUSIVE");
    }
  } finally {
    if (previous === undefined) delete process.env.SANDBOX_ALLOWED_HOSTS;
    else process.env.SANDBOX_ALLOWED_HOSTS = previous;
  }
});
