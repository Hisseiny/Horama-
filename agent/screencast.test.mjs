import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import test from "node:test";
import { startScreencast } from "./scripts/screencast.mjs";

test("screencast uses only Page commands, timestamps frames and paces acknowledgements", async t => {
  const calls = [];
  let socket;
  class Socket extends EventTarget {
    constructor(url) {
      super();
      assert.equal(url, "ws://page-target");
      socket = this;
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    send(data) {
      const message = JSON.parse(data);
      calls.push({ ...message, at: Date.now() });
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ id: message.id, result: {} }) })));
    }
    close() { this.closed = true; }
    frame(sessionId) {
      this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ method: "Page.screencastFrame",
        params: { data: Buffer.from("jpeg").toString("base64"), sessionId, metadata: { timestamp: 1795000000.1234 } } }) }));
    }
  }
  t.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, "http://127.0.0.1:9333/json");
    return { json: async () => [{ type: "other" }, { type: "page", webSocketDebuggerUrl: "ws://page-target" }] };
  });
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = originalWebSocket; });
  const frames = [];
  const cast = await startScreencast((buffer, at) => frames.push({ buffer, at }));
  t.after(() => cast.close());
  assert.deepEqual(calls.map(call => call.method), ["Page.enable", "Page.startScreencast"]);
  assert.deepEqual(calls[1].params, { format: "jpeg", quality: 60, maxWidth: 1280, maxHeight: 800 });
  socket.frame(1);
  socket.frame(2);
  socket.frame(3);
  await sleep(470);
  assert.equal(frames.length, 3);
  assert.deepEqual(frames[0], { buffer: Buffer.from("jpeg"), at: 1795000000123 });
  const acks = calls.filter(call => call.method === "Page.screencastFrameAck");
  assert.deepEqual(acks.map(call => call.params.sessionId), [1, 2, 3]);
  assert.ok(acks[1].at - acks[0].at >= 190);
  assert.ok(acks[2].at - acks[1].at >= 190);
  socket.frame(4);
  cast.close();
  await sleep(210);
  assert.equal(socket.closed, true);
  assert.equal(calls.filter(call => call.method === "Page.screencastFrameAck").length, 3);
});

test("screencast rejects missing page targets and CDP startup failures", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ json: async () => [] }));
  await assert.rejects(startScreencast(() => {}), /Onglet/);
  globalThis.fetch = async () => ({ json: async () => [{ type: "page", webSocketDebuggerUrl: "ws://page-target" }] });
  let closed = false;
  class Socket extends EventTarget {
    constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("open"))); }
    send(data) {
      const { id } = JSON.parse(data);
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ id, error: { message: "refused" } }) })));
    }
    close() { closed = true; }
  }
  const originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = Socket;
  t.after(() => { globalThis.WebSocket = originalWebSocket; });
  await assert.rejects(startScreencast(() => {}), /refused/);
  assert.equal(closed, true);
});
