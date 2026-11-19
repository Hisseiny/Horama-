import assert from "node:assert/strict";
import { test } from "node:test";
import { askHolo, filterFindings, inspectHoloElement, isCutFinding, sameHeaderElement, type HoloFinding } from "./src/exploration/holo.ts";

const empty = { d0: "", d1: "", d2: "", d3: "", d4: "" };
const png = Buffer.alloc(33);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
png.writeUInt32BE(13, 8);
png.write("IHDR", 12);
png.writeUInt32BE(1280, 16);
png.writeUInt32BE(900, 20);
const options = { url: "https://example.org", apiKey: "test-key" };
const reply = (content: string) => Response.json({ choices: [{ message: { content } }] });

test("header identity uses selector or normalized text, never coordinates or a body element", () => {
  const element = { selector: "header > img", text: "logo", header: true, visible: false };
  assert.ok(sameHeaderElement(element, { ...element, text: "other" }));
  assert.ok(sameHeaderElement(element, { ...element, selector: "header > a > img" }));
  assert.ok(!sameHeaderElement(element, { ...element, header: false }));
  assert.ok(!sameHeaderElement(element, { ...element, text: "menu", selector: "header > nav" }));
  assert.ok(!sameHeaderElement({ ...element, selector: "", text: "" }, { ...element, selector: "", text: "" }));
});

test("only cut or hidden doubts can be dismissed, and missing DOM evidence preserves them", async () => {
  const finding: HoloFinding = { status: "SUSPECTED", kind: "cut-off-text", sentence: "Logo.", zone: { x: 0, y: 0, largeur: 90, hauteur: 90 } };
  assert.ok(isCutFinding(finding));
  assert.ok(isCutFinding({ ...finding, kind: "overlapping-text", sentence: "Le premier lien est partiellement masqué." }));
  assert.ok(!isCutFinding({ ...finding, kind: "misaligned-element", sentence: "Le titre est décalé." }));
  const capture = { url: options.url, width: 1280, height: 900, scroll: [0, 0] as [number, number] };
  for (const send of [async () => { throw new Error("CDP"); }, async () => ({ result: { value: null } }), async () => ({ exceptionDetails: {} })]) {
    assert.equal(await inspectHoloElement({ send, on() {} }, finding, capture), null);
  }
  assert.equal(await inspectHoloElement({ send: async () => { throw new Error("unused"); }, on() {} }, { ...finding, status: "INCONCLUSIVE", zone: null, message: "No box" }, capture), null);
});

test("filters bottom and right edges, preserves interior text and different kinds, and keeps the first duplicate", () => {
  const interior: HoloFinding = { status: "SUSPECTED", kind: "cut-off-text", sentence: "Clipped word.", zone: { x: 40, y: 738, largeur: 884, hauteur: 60 } };
  const bottom: HoloFinding = { ...interior, zone: { x: 40, y: 837, largeur: 141, hauteur: 54 } };
  const right: HoloFinding = { ...interior, zone: { x: 1200, y: 40, largeur: 68, hauteur: 60 } };
  const duplicate: HoloFinding = { ...interior, sentence: "Duplicate.", zone: { ...interior.zone!, x: 41 } };
  const different: HoloFinding = { ...interior, kind: "overlapping-text" };
  const invalid: HoloFinding = { status: "INCONCLUSIVE", kind: "cut-off-text", sentence: "Unknown zone.", zone: null, message: "Invalid box" };
  assert.deepEqual(filterFindings([bottom], 1280, 900), []);
  assert.deepEqual(filterFindings([right], 1280, 900), []);
  for (const zone of [{ x: 100, y: 100, largeur: 23, hauteur: 1 }, { x: 100, y: 100, largeur: 3, hauteur: 40 }]) {
    assert.deepEqual(filterFindings([{ status: "SUSPECTED", kind: "misaligned-element", sentence: "Noise.", zone }], 1280, 900), [], "zone de moins de 4 px");
  }
  assert.deepEqual(filterFindings([interior, duplicate], 1280, 900), [interior]);
  assert.deepEqual(filterFindings([interior, different, invalid], 1280, 900), [interior, different, invalid]);
  assert.deepEqual(filterFindings([], 1280, 900), []);
});

test("askHolo applies the edge filter after parsing", async () => {
  const result = await askHolo(png, { ...options, fetch: async () => reply(JSON.stringify({ ...empty,
    d0: "cut-off-text | 0,900,500,100 | At the bottom.",
  })) });
  assert.equal(result.status, "SUSPECTED");
  assert.deepEqual(result.findings, []);
});

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
    assert.match(body.messages[0].content[0].text, /1280x900/);
    assert.match(body.messages[0].content[0].text, /one short sentence in plain French for a non-technical visitor/);
    assert.match(body.messages[0].content[0].text, /normalized to \[0,1000\]/);
    return reply(JSON.stringify({ ...empty, d0: "cut-off-text | 100,200,300,400 | The title is clipped." }));
  } });
  assert.equal(result.status, "SUSPECTED");
  assert.equal(result.model, "holo4-27b");
  assert.ok(result.durationMs >= 0);
  assert.deepEqual(result.findings, [{ status: "SUSPECTED", kind: "cut-off-text", zone: { x: 128, y: 180, largeur: 384, hauteur: 360 }, sentence: "The title is clipped." }]);
});

test("empty keys report no findings without being inconclusive", async () => {
  const result = await askHolo(png, { ...options, fetch: async () => reply(JSON.stringify(empty)) });
  assert.equal(result.status, "SUSPECTED");
  assert.deepEqual(result.findings, []);
});

for (const content of ["not json", "{}", JSON.stringify({ ...empty, d0: 1 }), JSON.stringify({ ...empty, d0: "invented | top | Bad." })]) {
  test(`non-conforming output: ${content}`, async () => {
    const result = await askHolo(png, { ...options, fetch: async () => reply(content) });
    assert.equal(result.status, "INCONCLUSIVE");
    assert.deepEqual(result.findings, []);
  });
}

for (const box of ["900,0,101,100", "0,990,100,20", "top", "", "1,2,3", "1,2,3,4,5", "1.5,2,3,4", "-1,0,20,20", "0,0,0,20", "0,0,20,0", "0,0,9007199254740992,1"]) {
  test(`invalid box preserves finding without inventing a zone: ${box}`, async () => {
    const result = await askHolo(png, { ...options, fetch: async () => reply(JSON.stringify({ ...empty,
      d0: `cut-off-text | ${box} | The title is clipped.`,
      d1: "overlapping-text | 0,0,500,500 | Titles overlap.",
    })) });
    assert.equal(result.status, "SUSPECTED");
    assert.equal(result.findings[0].status, "INCONCLUSIVE");
    assert.equal(result.findings[0].zone, null);
    assert.equal(result.findings[0].sentence, "The title is clipped.");
    if (result.findings[0].status === "INCONCLUSIVE") assert.match(result.findings[0].message, /Invalid box/);
    assert.deepEqual(result.findings[1].zone, { x: 0, y: 0, largeur: 640, hauteur: 450 });
    assert.equal(result.findings[1].status, "SUSPECTED");
  });
}

test("pixel rounding preserves shared edges and rejects boxes rounded to zero", async () => {
  const small = Buffer.from(png);
  small.writeUInt32BE(10, 16);
  small.writeUInt32BE(10, 20);
  const result = await askHolo(small, { ...options, fetch: async () => reply(JSON.stringify({ ...empty,
    d0: "cut-off-text | 150,150,400,400 | Clipped.", d1: "cut-off-text | 0,0,1,1 | Tiny.",
  })) });
  assert.deepEqual(result.findings[0].zone, { x: 2, y: 2, largeur: 4, hauteur: 4 });
  assert.equal(result.findings[1].status, "INCONCLUSIVE");
  assert.equal(result.findings[1].zone, null);
});

test("invalid PNG header or dimensions fail before fetch", async () => {
  const zero = Buffer.from(png);
  zero.writeUInt32BE(0, 16);
  for (const invalid of [Buffer.from("png"), zero]) {
    const result = await askHolo(invalid, { ...options, fetch: async () => { assert.fail("fetch must not run"); } });
    assert.equal(result.status, "INCONCLUSIVE");
    assert.deepEqual(result.findings, []);
  }
});

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

test("usage and known 27b price are returned even for non-conforming content", async () => {
  for (const content of [JSON.stringify(empty), "invalid"]) {
    const result = await askHolo(png, { ...options, fetch: async () => Response.json({
      usage: { prompt_tokens: 1000, completion_tokens: 200 },
      choices: [{ message: { content } }],
    }) });
    assert.deepEqual(result.usage, { prompt_tokens: 1000, completion_tokens: 200 });
    assert.equal(result.cost_usd, 0.001);
  }
});

test("usage is summed when parsing the first body times out; fallback price stays unknown", async () => {
  let calls = 0;
  const result = await askHolo(png, { ...options, timeoutMs: 20, fetch: async (_, init) => {
    calls++;
    if (calls === 1) return { ok: true, json: async () => ({
      usage: { prompt_tokens: 100, completion_tokens: 20 },
      choices: [{ message: { get content() {
        Object.defineProperty(init!.signal, "aborted", { value: true });
        throw new Error("Timeout");
      } } }],
    }) } as unknown as Response;
    return Response.json({ usage: { prompt_tokens: 300, completion_tokens: 40 },
      choices: [{ message: { content: JSON.stringify(empty) } }] });
  } });
  assert.equal(calls, 2);
  assert.equal(result.model, "holo4-35b-a3b");
  assert.equal(result.cost_usd, null);
  assert.deepEqual(result.usage, { prompt_tokens: 400, completion_tokens: 60 });
});

test("missing usage never invents tokens or cost", async () => {
  const result = await askHolo(png, { ...options, fetch: async () => reply(JSON.stringify(empty)) });
  assert.equal(result.usage, null);
  assert.equal(result.cost_usd, null);
});
