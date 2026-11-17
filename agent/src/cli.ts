import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { LancementPassage } from "@horama/contrats";
import { lireTestsAcceptes } from "@horama/memoire";
import { creerBaseSupabase } from "./base.ts";
import type { BasePassages } from "./base.ts";
import { navigateurLocal } from "./browser.ts";
import type { BrowserRuntime } from "./browser.ts";
import { creerCoureur } from "./coureur.ts";
import { creerSessionH } from "./session.ts";
import type { Session } from "./session.ts";

export const HELP = `Usage : pnpm --filter @horama/agent passage -- --logiciel facturo --version 13 --reference 12 [options]

  --tests a,b          Tests acceptés à jouer (tous par défaut)
  --r ca-mois         Régressions à activer, séparées par des virgules
  --cle dev|demo      Clé H (dev par défaut ; demo sélectionne seule la clé de démo)
  --vault chemin      Vault (vault-horama du dépôt par défaut)
  --base-url URL      Origine du SaaS (FAUX_SAAS_URL ou Facturo déployé)
  --chrome-port 9333  Chrome dédié déjà lancé, CDP local, 1280 × 900 et DPR 1
  --help              Afficher cette aide sans démarrer de session

Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HAI_API_KEY, HOLO_BIN.
Le processus affiche l’identifiant puis reste actif jusqu’à la fin des outils.
Code de sortie : 0 si joué, 1 en échec. Aucun verdict métier n’est calculé ici.`;

export interface PassageOptions {
  logiciel: string;
  version: string;
  reference: string;
  tests?: string[];
  regressions?: string[];
  cle: "dev" | "demo";
  vault: string;
  baseUrl?: string;
  port: number;
}

export function lireArguments(args: string[]): PassageOptions | null {
  if (args[0] === "--") args = args.slice(1);
  if (args.length === 1 && args[0] === "--help") return null;
  const values = new Map<string, string>();
  const allowed = ["logiciel", "version", "reference", "tests", "r", "cle", "vault", "base-url", "chrome-port"];
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i].slice(2);
    if (!args[i].startsWith("--") || !allowed.includes(name) || values.has(name)) throw new Error("Option inconnue ou répétée ; utiliser --help.");
    if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Valeur requise pour --${name}.`);
    values.set(name, args[i + 1]);
  }
  for (const name of ["logiciel", "version", "reference"]) if (!values.has(name)) throw new Error(`Option --${name} requise.`);
  const logiciel = values.get("logiciel")!;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(logiciel)) throw new Error("Identifiant de logiciel invalide.");
  const cle = values.get("cle") ?? "dev";
  if (cle !== "dev" && cle !== "demo") throw new Error("--cle attend dev ou demo.");
  const port = Number(values.get("chrome-port") ?? 9333);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port Chrome invalide.");
  for (const name of ["version", "reference"]) if (!/^\d+$/.test(values.get(name)!)) throw new Error(`--${name} attend un numéro de version.`);
  const list = (name: string) => {
    const value = values.get(name);
    if (value === undefined) return undefined;
    const ids = value.split(",").map((id) => id.trim());
    if (ids.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) throw new Error(`Liste --${name} invalide.`);
    return [...new Set(ids)];
  };
  const baseUrl = values.get("base-url");
  if (baseUrl && !/^https?:$/.test(new URL(baseUrl).protocol)) throw new Error("--base-url attend une URL HTTP(S).");
  return { logiciel, version: values.get("version")!, reference: values.get("reference")!, tests: list("tests"), regressions: list("r"), cle,
    vault: values.get("vault") ?? fileURLToPath(new URL("../../vault-horama", import.meta.url)), baseUrl, port };
}

export async function lancerCommande(options: PassageOptions, dependencies: {
  base?: BasePassages; runtime?: BrowserRuntime; session?: Session; env?: NodeJS.ProcessEnv;
  output?: (line: string) => void; createRunner?: typeof creerCoureur; createSession?: typeof creerSessionH;
  exit?: (code: number) => void;
} = {}) {
  const env = dependencies.env ?? process.env;
  const input: LancementPassage = { logiciel: options.logiciel, version_testee: options.version, version_reference: options.reference,
    tests: options.tests ?? lireTestsAcceptes(options.vault, options.logiciel).map(({ id }) => id), regressions: options.regressions, cle: options.cle };
  const key = options.cle === "demo" ? env.HAI_API_KEY_DEMO : env.HAI_API_KEY;
  if (!dependencies.session && !key) throw new Error("Clé H absente pour ce passage.");
  const base = dependencies.base ?? creerBaseSupabase({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
  const runtime = dependencies.runtime ?? await navigateurLocal(options.port);
  let closed = false;
  const close = () => { if (!closed) { closed = true; runtime.close(); } };
  const interrupt = (code: number) => {
    try { close(); } finally { (dependencies.exit ?? process.exit)(code); }
  };
  const onInterrupt = () => interrupt(130);
  const onTerminate = () => interrupt(143);
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  try {
    const runner = (dependencies.createRunner ?? creerCoureur)({ vault: options.vault, base, baseUrl: options.baseUrl ?? env.FAUX_SAAS_URL,
      session: dependencies.session ?? (dependencies.createSession ?? creerSessionH)({ key, navigateur: () => runtime.navigateur() }), relever: (ecran, vue) => runtime.relever(ecran, vue),
      identifiant: () => `${new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "h")}-${randomUUID().slice(0, 4)}` });
    const { passage_id } = await runner.lancerPassage(input);
    (dependencies.output ?? console.log)(passage_id);
    return await runner.attendreFin(passage_id);
  } finally {
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
    close();
  }
}
