import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createExplorationService } from "./scripts/exploration-service.mjs";
import { resolvePublic } from "./src/exploration/reseau.ts";

const url = "https://example.test/";
const png = Buffer.from("test image");

async function setup(t, overrides = {}) {
  const data = await mkdtemp(join(tmpdir(), "horama-http-test-"));
  const { server, stop } = createExplorationService({ data, run: async () => {}, resolveAddress: host =>
    resolvePublic(host, { lookup: (_host, _options, callback) =>
      callback(null, [{ address: host === "private.test" ? "10.23.0.1" : "93.184.216.34", family: 4 }]) }), ...overrides });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await stop();
    await new Promise(resolve => server.close(resolve));
    await rm(data, { recursive: true, force: true });
  });
  return async (route, options) => fetch(`http://127.0.0.1:${server.address().port}${route}`, options);
}

const post = (request, address = url) => request("/explorations", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: address }),
});

test("direct frames are available only during an active job, with JPEG and CORS headers", async t => {
  let current;
  let release;
  let complete;
  const completed = new Promise(resolve => { complete = resolve; });
  const request = await setup(t, { run: async job => {
    current = job;
    await new Promise(resolve => { release = resolve; });
    complete();
  } });
  const { id } = await (await post(request)).json();
  const path = `/explorations/${id}`;
  assert.equal((await request(`${path}/direct`)).status, 404);
  assert.equal((await (await request(path)).json()).direct, undefined);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  current.frame = { buffer: jpeg, at: 1795000000123 };
  const frame = await request(`${path}/direct`);
  assert.equal(frame.status, 200);
  assert.equal(frame.headers.get("Content-Type"), "image/jpeg");
  assert.equal(frame.headers.get("Cache-Control"), "no-store");
  assert.equal(frame.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(frame.headers.get("X-Horama-Image-At"), "1795000000123");
  assert.equal(frame.headers.get("Access-Control-Expose-Headers"), "X-Horama-Image-At");
  assert.deepEqual(Buffer.from(await frame.arrayBuffer()), jpeg);
  assert.equal((await (await request(path)).json()).direct, true);
  await mkdir(current.directory, { recursive: true });
  const file = join(current.directory, "exploration.json");
  await writeFile(file, JSON.stringify({ format: "horama-exploration-1", etat: "en_cours" }));
  assert.equal((await (await request(path)).json()).direct, true);
  await writeFile(file, JSON.stringify({ format: "horama-exploration-1", etat: "fini" }));
  release();
  await completed;
  assert.equal((await request(`${path}/direct`)).status, 410);
  assert.equal(current.frame, undefined);
  assert.equal((await (await request(path)).json()).direct, undefined);
  assert.equal((await request(`/explorations/${"a".repeat(36)}/direct`)).status, 404);
  assert.equal((await request(`${path}/appuis.jsonl`)).status, 404);
});

test("the service validates addresses, rejects DNS-resolved private targets and serves CORS on errors", async t => {
  const request = await setup(t);
  const health = await request("/sante");
  assert.deepEqual(await health.json(), { ok: true });
  const preflight = await request("/explorations", { method: "OPTIONS", headers: {
    Origin: "chrome-extension://extension", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
  } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assert.match(preflight.headers.get("Access-Control-Allow-Headers"), /Content-Type/i);
  for (const address of ["file:///etc/passwd", "https://user@example.test", "http://127.1", "http://[::1]",
    "http://169.254.169.254", "https://private.test", "http://private.internal", undefined, 123]) {
    const response = await post(request, address ?? null);
    assert.equal(response.status, 400, String(address));
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    assert.match((await response.json()).erreur, /Adresse refusée/);
  }
  const malformed = await request("/explorations", { method: "POST", body: "{" });
  assert.equal(malformed.status, 400);
  const large = await post(request, "https://example.test/" + "x".repeat(4096));
  assert.equal(large.status, 400);
  assert.equal((await request("/explorations/" + "a".repeat(36))).status, 404);
});

test("jobs run serially, reports evolve, and only PNG captures are readable", async t => {
  const starts = [];
  const releases = [];
  const request = await setup(t, { pendingLimit: 1, run: async (job, signal) => {
    starts.push(job.id);
    await mkdir(join(job.directory, "captures"), { recursive: true });
    const report = { format: "horama-exploration-1", etat: "en_cours" };
    const file = join(job.directory, "exploration.json");
    await Promise.all([writeFile(file, JSON.stringify(report)), writeFile(join(job.directory, "captures", "accueil.png"), png)]);
    await new Promise(resolve => {
      releases.push(resolve);
      if (signal.aborted) resolve();
      else signal.addEventListener("abort", resolve, { once: true });
    });
    await writeFile(file, JSON.stringify({ ...report, etat: "fini" }));
  } });
  async function until(test) {
    for (let i = 0; i < 100; i++) {
      if (await test()) return;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.fail("job did not reach the expected state");
  }
  const first = await post(request);
  const a = await first.json();
  assert.equal(first.status, 202);
  assert.equal(a.place, 0);
  const b = await (await post(request)).json();
  assert.notEqual(b.id, a.id);
  assert.equal(b.place, 1);
  assert.deepEqual(await (await request(`/explorations/${b.id}`)).json(), { id: b.id, etat: "en_file", place: 1 });
  const overflow = await post(request);
  assert.equal(overflow.status, 503);
  assert.match((await overflow.json()).erreur, /complet/);
  await until(() => releases.length === 1);
  assert.deepEqual(starts, [a.id]);
  const poll = async id => (await request(`/explorations/${id}`)).json();
  assert.equal((await poll(a.id)).etat, "en_cours");
  const capture = await request(`/explorations/${a.id}/captures/accueil.png`);
  assert.equal(capture.status, 200);
  assert.equal(capture.headers.get("Content-Type"), "image/png");
  assert.equal(capture.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(Buffer.from(await capture.arrayBuffer()), png);
  for (const path of ["exploration.json", "captures/%2e%2e%2fexploration.json", "captures/inconnue.png"]) {
    assert.equal((await request(`/explorations/${a.id}/${path}`)).status, 404);
  }
  releases[0]();
  await until(() => releases.length === 2);
  assert.equal((await poll(a.id)).etat, "fini");
  assert.equal((await poll(b.id)).etat, "en_cours");
  assert.deepEqual(starts, [a.id, b.id]);
});

test("global and per-client hourly limits return 429 and expired IDs are forgotten", async t => {
  for (const limits of [{ hourlyLimit: 1 }, { clientHourlyLimit: 1 }]) {
    let time = 0;
    const fakeKey = "test-only-fake-key";
    const request = await setup(t, { ...limits, now: () => time, run: async () => { throw new Error(fakeKey); } });
    const first = await post(request);
    assert.equal(first.status, 202);
    const { id } = await first.json();
    const failure = await request(`/explorations/${id}`);
    assert.equal(failure.status, 503);
    const body = await failure.text();
    assert.match(JSON.parse(body).erreur, /interrompue/);
    assert.ok(!body.includes(fakeKey));
    const limited = await post(request);
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).erreur, /Trop de demandes/);
    time = 3_600_001;
    assert.equal((await request(`/explorations/${id}`)).status, 404);
    assert.equal((await post(request)).status, 202);
  }
});
