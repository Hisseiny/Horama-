import { spawn } from "node:child_process";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHROME_FLAGS, closeChrome } from "../../automatisation/scene/scene.mjs";
import { publicProxyChromeFlags, startPublicProxy, writePublicChromePreferences } from "../src/exploration/reseau.ts";
import { createExplorationService, finishAtTimeLimit } from "./exploration-service.mjs";
import { startScreencast } from "./screencast.mjs";

async function runExplorer(args, { signal, vault, output, service = false, onFrame = () => {} }) {
  signal.throwIfAborted();
  const launcher = process.env.HORAMA_CHROME_LAUNCHER;
  const profile = launcher ? undefined : await mkdtemp(join(tmpdir(), "horama-chrome-"));
  let proxy;
  try {
    if (profile) writePublicChromePreferences(profile);
    proxy = await startPublicProxy({ log: service ? undefined : message => console.error(message) });
  } catch (error) {
    if (profile) await rm(profile, { recursive: true, force: true });
    throw error;
  }
  const flags = [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--lang=fr-FR",
    "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9333",
    ...publicProxyChromeFlags(proxy.port), ...CHROME_FLAGS, "about:blank",
  ];
  const chrome = spawn(launcher ? "/usr/bin/sudo" : process.env.CHROME_BIN ?? "/usr/bin/chromium",
    launcher ? ["-n", "-H", "-u", "horama-chrome", "--", launcher, ...flags] : [`--user-data-dir=${profile}`, ...flags],
    { stdio: service ? "ignore" : ["ignore", "ignore", "inherit"],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG } });
  const chromeExit = new Promise(resolve => {
    chrome.once("error", resolve);
    chrome.once("exit", resolve);
  });
  let engine;
  let deadline;
  let ready;
  let screencast;
  const cancel = () => {
    if (!engine?.pid) return;
    engine.kill("SIGINT");
    deadline = setTimeout(() => engine.kill("SIGKILL"), 5000);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    let failure;
    void chromeExit.then(error => { failure = error ?? new Error("Chrome arrêté avant CDP."); });
    for (let attempt = 0; attempt < 100; attempt++) {
      signal.throwIfAborted();
      if (failure) throw failure;
      try { ready = (await fetch("http://127.0.0.1:9333/json/version", { signal: AbortSignal.timeout(500) })).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    signal.throwIfAborted();
    if (!ready) throw new Error("Chrome CDP indisponible.");
    const direct = process.env.HORAMA_DIRECT !== "0";
    if (direct) {
      try {
        screencast = await startScreencast(onFrame);
      } catch { screencast?.close(); screencast = undefined; }
    }
    signal.throwIfAborted();
    engine = spawn(process.execPath, [direct ? "agent/scripts/explorer-direct.mjs" : "agent/explorer.ts", ...args,
      ...(direct && process.env.HORAMA_SANS_AGENT === "1" ? ["--sans-agent"] : []), "--chrome-port", "9333", "--reseau-public",
      "--vault", vault, "--sortie", output], { stdio: service ? "ignore" : "inherit",
      env: service ? { PATH: process.env.PATH, HOME: process.env.HOME, HOLO_BIN: process.env.HOLO_BIN,
        HAI_API_KEY: process.env.HAI_API_KEY } : process.env });
    return await new Promise((resolve, reject) => {
      engine.once("error", reject);
      engine.once("exit", code => resolve(code ?? 1));
    });
  } finally {
    screencast?.close();
    signal.removeEventListener("abort", cancel);
    clearTimeout(deadline);
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const timer = setTimeout(() => chrome.kill("SIGKILL"), 2000);
      if (ready) void closeChrome({ port: 9333, pid: chrome.pid }).catch(() => chrome.kill("SIGTERM"));
      else chrome.kill("SIGTERM");
      await chromeExit;
      clearTimeout(timer);
    }
    await proxy.close();
    if (profile) await rm(profile, { recursive: true, force: true });
  }
}

function bound(value, fallback, min, max) {
  const setting = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(setting) || setting < min || setting > max) throw new Error(`Valeur attendue entre ${min} et ${max}.`);
  return setting;
}

async function main(args) {
  if (args.includes("--help")) {
    spawn(process.execPath, ["agent/explorer.ts", "--help"], { stdio: "inherit" })
      .once("exit", code => { process.exitCode = code ?? 1; });
    return;
  }
  if (!process.env.HAI_API_KEY) throw new Error("HAI_API_KEY requise.");
  if (args.length === 1 && args[0] === "--service") {
    const port = bound(process.env.PORT, 8787, 1, 65535);
    const max = bound(process.env.HORAMA_MAX_PAGES, 8, 1, 8);
    const clicked = bound(process.env.HORAMA_PAGES_CLIQUEES, 4, 0, 8);
    const seconds = bound(process.env.HORAMA_MAX_SECONDS, 240, 1, 420);
    const data = await mkdtemp("/data/explorations-");
    const { server, stop } = createExplorationService({ data, run: async (job, shutdown) => {
      const limit = new AbortController();
      const timeout = setTimeout(() => limit.abort(), seconds * 1000);
      try {
        await runExplorer(["--url", job.url, "--max", String(max), "--sans-base", "--pages-cliquees", String(clicked)],
          { signal: AbortSignal.any([shutdown, limit.signal]), vault: join(job.directory, "vault"), output: job.directory, service: true,
            onFrame: (buffer, at) => { job.frame = { buffer, at }; } });
      } finally {
        clearTimeout(timeout);
        // Stopped by the time limit (not by the service shutting down): the pages visited make a finished run.
        if (limit.signal.aborted && !shutdown.aborted) {
          const file = join(job.directory, "exploration.json");
          const report = finishAtTimeLimit(await readFile(file, "utf8").then(JSON.parse).catch(() => null));
          if (report) await writeFile(`${file}.tmp`, JSON.stringify(report, null, 2)).then(() => rename(`${file}.tmp`, file)).catch(() => {});
        }
      }
    } });
    const shutdown = async () => { server.close(); await stop(); await rm(data, { recursive: true, force: true }); };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
    server.listen(port, "0.0.0.0", () => console.log(`Service d’exploration Horama sur le port ${port}.`));
    return;
  }
  if (args.some(arg => ["--chrome-port", "--vault", "--sortie", "--reseau-public"].includes(arg))) {
    throw new Error("Le conteneur réserve CDP 9333, le réseau public et les sorties /data.");
  }
  const controller = new AbortController();
  process.once("SIGTERM", () => controller.abort());
  process.once("SIGINT", () => controller.abort());
  try {
    process.exitCode = await runExplorer(args, { signal: controller.signal, vault: "/data/vault", output: "/data/exploration" });
  } catch (error) {
    if (!controller.signal.aborted) throw error;
    process.exitCode = 130;
  }
}

await main(process.argv.slice(2));
