import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments } from "./scripts/explorer-direct.mjs";

test("direct arguments reuse CLI defaults and strip the scripted mode flag", () => {
  const { options, sansAgent } = parseArguments(["--sans-agent", "--url", "https://example.test/", "--max", "3"]);
  assert.equal(sansAgent, true);
  assert.equal(options.max, 3);
  assert.equal(options.port, 9333);
  assert.equal(options.reseauPublic, false);
  assert.equal(parseArguments(["--url", "https://example.test/", "--reseau-public"]).options.reseauPublic, true);
  assert.equal(parseArguments(["--url", "https://example.test/"]).sansAgent, false);
  assert.equal(parseArguments(["--sans-agent", "--help"]).options, null);
});

test("direct arguments reject missing and invalid CLI options", () => {
  assert.throws(() => parseArguments([]), /--url requise/);
  assert.throws(() => parseArguments(["--sans-agent", "--url", "file:///private"]), /HTTP/);
  assert.throws(() => parseArguments(["--url", "https://example.test/", "--unknown"]), /Option inconnue/);
});
