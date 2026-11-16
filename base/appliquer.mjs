import { readFileSync } from "node:fs";
import postgres from "postgres";

const TABLES = ["passages", "evenements", "captures", "references_ecran", "resultats", "decisions", "mesures"];
const verifyOnly = process.argv.includes("--verifier");

const url = process.env.SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("SUPABASE_DB_URL est vide. Lancement prévu depuis la racine du repo : node --env-file=.env.local base/appliquer.mjs");
  process.exit(1);
}

let sql;
let connected = false;
try {
  sql = postgres(url, { ssl: "require", prepare: false, connect_timeout: 15, max: 1, onnotice: () => {} });
  await sql`select 1`;
  connected = true;

  if (!verifyOnly) {
    await sql.unsafe(readFileSync(new URL("./migrations/001_init.sql", import.meta.url), "utf8")).simple();
    console.log("Migration 001_init.sql appliquée.");
  }

  const rows = await sql`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname in ${sql(TABLES)}`;
  const [{ bucket }] = await sql`select exists (select 1 from storage.buckets where id = 'captures') as bucket`;

  const missing = TABLES.filter((t) => !rows.some((r) => r.name === t));
  const withoutRls = TABLES.filter((t) => !rows.some((r) => r.name === t && r.rls));
  console.log(`${TABLES.length - missing.length} tables sur ${TABLES.length}${missing.length ? ` (absentes : ${missing.join(", ")})` : ""}`);
  console.log(`Seau captures : ${bucket ? "présent" : "absent"}`);
  console.log(withoutRls.length ? `RLS non activée sur : ${withoutRls.join(", ")}` : `RLS activée sur les ${TABLES.length} tables`);
  if (missing.length || !bucket || withoutRls.length) process.exitCode = 1;
} catch (err) {
  const code = err?.code ?? "inconnu";
  if (!connected) console.error(`Connexion impossible (code ${code}).`);
  else console.error(`Échec (code ${code})${err?.name === "PostgresError" ? ` : ${err.message}` : ""}`);
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 5 });
}
