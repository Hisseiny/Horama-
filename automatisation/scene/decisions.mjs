// What the scene writes in the base at the end of a course (J2): one `decisions` row per « bug » or « voulu »
// choice of the human (contract C5, the whole Decision as payload), then `passages.etat = "verifie"` (contract C3:
// « Nathan writes verifie »). A decision id is the date, the screen and the gap: replaying the same day rewrites
// the same line, like the file of the vault. The runner of Ali stays the only writer of `resultats`.
// Same calls in both modes: with Supabase the writes are REST calls with the service key (the same pattern as
// agent/src/base.ts: the key in the headers, a 15 s timeout, and a refused write only gives the HTTP code); with
// the in-memory base the same rows are kept in memory and counted under `base` in passage.json.
export function creerEcrivainSupabase({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, requete = fetch } = {}) {
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises côté serveur.");
  const origin = url.replace(/\/$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function request(path, method, body, prefer) {
    let response;
    try {
      response = await requete(`${origin}${path}`, {
        method,
        headers: { ...headers, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new Error("Base Supabase inaccessible (erreur réseau)."); }
    if (!response.ok) throw new Error(`Écriture Supabase refusée (HTTP ${response.status}).`);
  }
  return {
    ecrireDecision: (decision) =>
      request("/rest/v1/decisions?on_conflict=id", "POST", { id: decision.id, passage_id: decision.passage_id, payload: decision }, "resolution=merge-duplicates,return=minimal"),
    marquerVerifie: (passage_id) =>
      request(`/rest/v1/passages?id=eq.${encodeURIComponent(passage_id)}`, "PATCH", { etat: "verifie" }),
  };
}

// The same two writes kept in memory: one `decisions` row per id in `decisions` (a replay rewrites the same line),
// and the etat of the passage row of `base` (a BaseMemoire) set to « verifie », like the PATCH of the Supabase mode.
export function creerEcrivainMemoire(base) {
  const decisions = new Map();
  return {
    decisions,
    ecrireDecision: async (decision) => {
      decisions.set(decision.id, { id: decision.id, passage_id: decision.passage_id, payload: structuredClone(decision) });
    },
    marquerVerifie: async (passage_id) => {
      const passage = base.passages.get(passage_id);
      if (passage) passage.etat = "verifie";
    },
  };
}
