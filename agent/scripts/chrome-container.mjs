#!/usr/local/bin/node
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePublicChromePreferences } from "/app/agent/src/exploration/reseau.ts";

const profile = await mkdtemp(join(tmpdir(), "horama-chrome-"));
try {
  writePublicChromePreferences(profile);
  const chrome = spawn("/usr/bin/chromium", [`--user-data-dir=${profile}`, ...process.argv.slice(2)], { stdio: "inherit" });
  let timer;
  const stop = () => {
    if (timer) return;
    chrome.kill("SIGTERM");
    timer = setTimeout(() => chrome.kill("SIGKILL"), 1000);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  try {
    process.exitCode = await new Promise((resolve, reject) => {
      chrome.once("error", reject);
      chrome.once("exit", code => resolve(code ?? 1));
    });
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
} finally {
  await rm(profile, { recursive: true, force: true });
}
