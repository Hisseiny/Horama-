// T0 (couloir Nathan) : each key answers. Prints only the service name and the HTTP status, never a value.
// Run from the repo root: node scripts/verifier-cles-nathan.mjs
import { spawnSync } from "node:child_process";

process.loadEnvFile(".env.local");
const env = process.env;

const required = ["HAI_API_KEY", "HF_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL"];
const missing = required.filter((name) => !env[name]);
for (const name of missing) console.log(`variable vide : ${name}`);

const bearer = (key) => ({ Authorization: `Bearer ${key}` });
const supabase = (key) => ({ apikey: key, ...bearer(key) });
const base = (env.SUPABASE_URL ?? "").replace(/\/$/, "");

const checks = [
  ["H Agents API (sessions)", "HAI_API_KEY", () => fetch("https://agp.eu.hcompany.ai/api/v2/sessions?size=1", { headers: bearer(env.HAI_API_KEY) })],
  ["Hugging Face (whoami)", "HF_TOKEN", () => fetch("https://huggingface.co/api/whoami-v2", { headers: bearer(env.HF_TOKEN) })],
  ["Hugging Face (routeur, modèles)", "HF_TOKEN", () => fetch("https://router.huggingface.co/v1/models", { headers: bearer(env.HF_TOKEN) })],
  ["Supabase (clé anon, auth)", "SUPABASE_ANON_KEY", () => fetch(`${base}/auth/v1/settings`, { headers: { apikey: env.SUPABASE_ANON_KEY } })],
  ["Supabase (clé de service, REST)", "SUPABASE_SERVICE_ROLE_KEY", () => fetch(`${base}/rest/v1/`, { headers: supabase(env.SUPABASE_SERVICE_ROLE_KEY) })],
  ["Supabase (clé de service, stockage)", "SUPABASE_SERVICE_ROLE_KEY", () => fetch(`${base}/storage/v1/bucket`, { headers: supabase(env.SUPABASE_SERVICE_ROLE_KEY) })],
];

let failures = missing.length;
for (const [label, variable, call] of checks) {
  if (!env[variable] || (label.startsWith("Supabase") && !base)) {
    console.log(`${label} : non testé (variable vide)`);
    continue;
  }
  let status;
  try {
    status = (await call()).status;
  } catch (error) {
    status = `erreur réseau (${error.cause?.code ?? error.name})`;
  }
  if (status !== 200) failures += 1;
  console.log(`${label} : ${status}`);
}

// Vercel: the CLI holds its own token, so we ask the CLI instead of reading it (not an HTTP status).
const vercel = spawnSync("vercel", ["whoami"], { stdio: "ignore" });
if (vercel.status !== 0) failures += 1;
console.log(`Vercel (CLI, whoami) : ${vercel.status === 0 ? "connectée" : `échec, code ${vercel.status}`}`);

console.log(failures === 0 ? "T0 : tout répond" : `T0 : ${failures} échec(s) ou variable(s) vide(s)`);
process.exit(failures === 0 ? 0 : 1);
