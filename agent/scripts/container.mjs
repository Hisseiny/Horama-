import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHROME_FLAGS, closeChrome } from "../../automatisation/scene/scene.mjs";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  const help = spawn(process.execPath, ["agent/explorer.ts", "--help"], { stdio: "inherit" });
  help.on("exit", code => { process.exitCode = code ?? 1; });
} else {
  if (!process.env.HAI_API_KEY) throw new Error("HAI_API_KEY requise.");
  if (args.some(arg => arg === "--chrome-port" || arg === "--vault" || arg === "--sortie")) {
    throw new Error("Le conteneur réserve CDP 9333 et les sorties /data.");
  }
  const profile = await mkdtemp(join(tmpdir(), "horama-chrome-"));
  const chrome = spawn(process.env.CHROME_BIN ?? "/usr/bin/chromium", [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
    "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9333",
    `--user-data-dir=${profile}`, ...CHROME_FLAGS, "about:blank",
  ], { stdio: ["ignore", "ignore", "inherit"] });
  let engine;
  let cancelled = false;
  const cancel = () => { cancelled = true; engine?.kill("SIGINT"); };
  process.on("SIGTERM", cancel);
  process.on("SIGINT", cancel);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (cancelled) break;
      try { ready = (await fetch("http://127.0.0.1:9333/json/version")).ok; } catch {}
      if (ready) break;
      if (chrome.exitCode !== null) throw new Error("Chrome arrêté avant CDP.");
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (cancelled) process.exitCode = 130;
    else {
      if (!ready) throw new Error("Chrome CDP indisponible.");
      engine = spawn(process.execPath, ["agent/explorer.ts", ...args, "--chrome-port", "9333",
        "--vault", "/data/vault", "--sortie", "/data/exploration"], { stdio: "inherit" });
      process.exitCode = await new Promise((resolve, reject) => {
        engine.on("error", reject);
        engine.on("exit", code => resolve(code ?? 1));
      });
    }
  } finally {
    process.removeListener("SIGTERM", cancel);
    process.removeListener("SIGINT", cancel);
    await closeChrome({ port: 9333, pid: chrome.pid }).catch(() => {});
    if (chrome.exitCode === null && chrome.signalCode === null) {
      await new Promise(resolve => {
        const done = () => { clearTimeout(timer); chrome.removeListener("exit", done); resolve(); };
        const timer = setTimeout(() => { chrome.kill("SIGKILL"); done(); }, 2000);
        chrome.once("exit", done);
        chrome.kill("SIGTERM");
      });
    }
    await rm(profile, { recursive: true, force: true });
  }
}
