import assert from "node:assert/strict";
import { test } from "node:test";
import { askHolo } from "./src/exploration/holo.ts";

const empty = { d0: "", d1: "", d2: "", d3: "", d4: "" };
const png = Buffer.from("png");
const options = { url: "https://example.org", apiKey: "test-key" };
const reply = (content: string) => Response.json({ choices: [{ message: { content } }] });

test("visible findings remain suspected and the request disables thinking without schema arrays", async () => {
  const result = await askHolo(png, { ...options, fetch: async (url, init) => {
    assert.equal(url, "https://api.hcompany.ai/v1/chat/completions");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, "holo4-27b");
    assert.equal(body.temperature, 0);
    assert.equal(body.chat_template_kwargs.enable_thinking, false);
    assert.equal(body.messages[0].content[1].image_url.url, `data:image/png;base64,${png.toString("base64")}`);
    assert.ok(!JSON.stringify(body.response_format).includes("["));
    return reply(JSON.stringify({ ...empty, d0: "cut-off-text | header | The title is clipped." }));
  } });
  assert.equal(result.status, "SUSPECTED");
  assert.equal(result.model, "holo4-27b");
  assert.ok(result.durationMs >= 0);
  assert.deepEqual(result.findings, [{ status: "SUSPECTED", kind: "cut-off-text", zone: "header", sentence: "The title is clipped." }]);
});

test("empty keys report no findings without being inconclusive", async () => {
  const result = await askHolo(png, { ...options, fetch: async () => reply(JSON.stringify(empty)) });
  assert.equal(result.status, "SUSPECTED");
  assert.deepEqual(result.findings, []);
});

for (const content of ["not json", "{}", JSON.stringify({ ...empty, d0: 1 }), JSON.stringify({ ...empty, d0: "invented | top | Bad." }), JSON.stringify({ ...empty, d0: "cut-off-text | | Bad." })]) {
  test(`non-conforming output: ${content}`, async () => {
    const result = await askHolo(png, { ...options, fetch: async () => reply(content) });
    assert.equal(result.status, "INCONCLUSIVE");
    assert.deepEqual(result.findings, []);
  });
}

test("first timeout aborts and retries once with the second model", async () => {
  const models: string[] = [];
  let aborted = false;
  const result = await askHolo(png, { ...options, timeoutMs: 10, fetch: async (_, init) => {
    models.push(JSON.parse(init?.body as string).model);
    if (models.length === 2) return reply(JSON.stringify(empty));
    return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); }));
  } });
  assert.equal(aborted, true);
  assert.deepEqual(models, ["holo4-27b", "holo4-35b-a3b"]);
  assert.equal(result.model, "holo4-35b-a3b");
  assert.equal(result.status, "SUSPECTED");
});

test("both timeouts are inconclusive even if fetch ignores abort", async () => {
  const result = await askHolo(png, { ...options, timeoutMs: 5, fetch: () => new Promise(() => {}) });
  assert.equal(result.status, "INCONCLUSIVE");
  assert.deepEqual(result.findings, []);
  if (result.status === "INCONCLUSIVE") assert.match(result.message, /Both Holo models timed out/);
});

test("HTTP errors are explicit, redact credentials and do not retry", async () => {
  let calls = 0;
  const result = await askHolo(png, { ...options, fetch: async () => { calls++; return new Response("Forbidden test-key", { status: 403 }); } });
  assert.equal(calls, 1);
  assert.equal(result.status, "INCONCLUSIVE");
  assert.deepEqual(result.findings, []);
  if (result.status === "INCONCLUSIVE") assert.equal(result.message, "H Models HTTP 403: Forbidden [REDACTED]");
});

test("network errors do not invent findings or disclose credentials", async () => {
  const result = await askHolo(png, { ...options, fetch: async () => { throw new Error("test-key"); } });
  assert.equal(result.status, "INCONCLUSIVE");
  assert.deepEqual(result.findings, []);
  assert.ok(!JSON.stringify(result).includes("test-key"));
});
