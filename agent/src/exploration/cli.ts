import { fileURLToPath } from "node:url";
import { BaseMemoire, creerBaseSupabase } from "../base.ts";
import { navigateurLocal } from "../browser.ts";
import { creerSessionH } from "../session.ts";
import { explorer } from "./explorer.ts";
import type { ExplorerOptions } from "./explorer.ts";

export const HELP = `Usage : pnpm --filter @horama/agent explorer -- --url adresse [options]
  --url adresse       Adresse HTTP(S) requise, visite sans connexion ni formulaire
  --max 15            Plafond de pages ; avec --max 8, le passage vise 2 à 3 min
  --pages-cliquees 4  Pages à atteindre par clic (entier ≥ 0)
  --sortie chemin     Sortie (.orchestrateur/exploration du dépôt par défaut)
  --vault chemin      Vault (vault-horama du dépôt par défaut)
  --sans-base         Base en mémoire, aucune écriture Supabase
  --chrome-port 9333  Chrome dédié déjà lancé, 1280 × 900, DPR 1
  --reseau-public     Refuse robots, sitemaps, pages et liens vers une adresse privée,
                      même après résolution DNS (activé par le conteneur)
  --help              Cette aide, sans session
Variables : HAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HOLO_BIN.
Les captures et notes sont conservées dans le vault, même avec --sans-base.`;

export function lireArguments(args: string[]): (ExplorerOptions & { sansBase: boolean }) | null {
  if (args[0] === "--") args = args.slice(1);
  if (args.length === 1 && args[0] === "--help") return null;
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (!["--url", "--max", "--pages-cliquees", "--sortie", "--vault", "--sans-base", "--chrome-port", "--reseau-public"].includes(name) || values.has(name)) throw new Error("Option inconnue ou répétée ; utiliser --help.");
    if (name === "--sans-base" || name === "--reseau-public") { values.set(name, "true"); continue; }
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`Valeur requise pour ${name}.`);
    values.set(name, value);
  }
  const address = values.get("--url");
  if (!address) throw new Error("Option --url requise.");
  const url = new URL(address);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Adresse HTTP(S) sans identifiants requise.");
  const max = Number(values.get("--max") ?? 15), port = Number(values.get("--chrome-port") ?? 9333);
  if (!Number.isSafeInteger(max) || max < 0) throw new Error("--max attend un entier positif ou nul.");
  const pagesCliquees = Number(values.get("--pages-cliquees") ?? 4);
  if (!Number.isSafeInteger(pagesCliquees) || pagesCliquees < 0) throw new Error("--pages-cliquees attend un entier positif ou nul.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port Chrome invalide.");
  return { url: address, max, port, pagesCliquees, sortie: values.get("--sortie") ?? fileURLToPath(new URL("../../../.orchestrateur/exploration", import.meta.url)),
    vault: values.get("--vault") ?? fileURLToPath(new URL("../../../vault-horama", import.meta.url)), sansBase: values.has("--sans-base"), reseauPublic: values.has("--reseau-public") };
}

export async function lancerExploration(options: ExplorerOptions & { sansBase: boolean }) {
  if (!process.env.HAI_API_KEY) throw new Error("HAI_API_KEY requise.");
  const base = options.sansBase ? new BaseMemoire() : creerBaseSupabase();
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Passage annulé par Ctrl+C."));
  process.once("SIGINT", cancel);
  let runtime: Awaited<ReturnType<typeof navigateurLocal>> | undefined;
  try {
    runtime = await navigateurLocal(options.port);
    return await explorer(options, { base, runtime, session: creerSessionH({ navigateur: runtime.navigateur }), signal: controller.signal });
  } finally { process.removeListener("SIGINT", cancel); runtime?.close(); }
}
