import assert from "node:assert/strict";
import { test } from "node:test";
import * as agent from "./index.ts";

test("agent package loads without starting a session", () => {
  assert.deepEqual(Object.keys(agent), []);
});
