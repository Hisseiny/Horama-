// Counts the rows of one passage in the shared Supabase. Prints only HTTP codes, counts and states, never a key.
// Usage: node --env-file=.env.local automatisation/demo/compter-base.mjs <passage_id>
const id = process.argv[2];
if (!id) { console.log("Usage : compter-base.mjs <passage_id>"); process.exit(2); }
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.log("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente."); process.exit(2); }
const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" };
const get = async (path) => {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = response.ok ? await response.json() : [];
  return { code: response.status, total: response.headers.get("content-range")?.split("/")[1] ?? "?", body };
};
const passage = await get(`passages?id=eq.${encodeURIComponent(id)}&select=etat,duree_s,cout_usd`);
console.log(`passages ${passage.code} : ${passage.total} ligne(s)`, passage.body[0] ? `etat=${passage.body[0].etat} duree_s=${passage.body[0].duree_s} cout_usd=${passage.body[0].cout_usd}` : "");
for (const table of ["evenements", "captures", "resultats", "decisions"]) {
  const select = table === "resultats" ? "test_id,statut" : table === "decisions" ? "id,payload->>decision" : table === "captures" ? "ecran,vue,largeur,hauteur" : "etape";
  const rows = await get(`${table}?passage_id=eq.${encodeURIComponent(id)}&select=${select}`);
  const detail = table === "evenements" ? "" : rows.body.map((row) => Object.values(row).join(" ")).join(" | ");
  console.log(`${table} ${rows.code} : ${rows.total} ligne(s)${detail ? ` : ${detail}` : ""}`);
}
