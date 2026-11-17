import type { Capture, EvenementFil, Passage, RapportPassage } from "@horama/contrats";

export interface BasePassages {
  insererPassage(passage: Passage): Promise<void>;
  insererEvenement(evenement: EvenementFil): Promise<void>;
  deposerPng(chemin: string, png: Uint8Array): Promise<string>;
  enregistrerCapture(capture: Capture): Promise<void>;
  terminerPassage(rapport: RapportPassage): Promise<void>;
}

export class BaseMemoire implements BasePassages {
  passages = new Map<string, Passage>();
  evenements: EvenementFil[] = [];
  captures = new Map<string, Capture>();
  fichiers = new Map<string, Uint8Array>();
  rapports = new Map<string, RapportPassage>();

  async insererPassage(passage: Passage) { this.passages.set(passage.id, structuredClone(passage)); }
  async insererEvenement(evenement: EvenementFil) { this.evenements.push(structuredClone(evenement)); }
  async deposerPng(chemin: string, png: Uint8Array) {
    this.fichiers.set(chemin, png.slice());
    return `http://localhost/storage/v1/object/public/captures/${chemin}`;
  }
  async enregistrerCapture(capture: Capture) {
    this.captures.set(JSON.stringify([capture.passage_id, capture.test_id, capture.ecran, capture.vue]), structuredClone(capture));
  }
  async terminerPassage(rapport: RapportPassage) {
    this.passages.set(rapport.passage.id, structuredClone(rapport.passage));
    this.rapports.set(rapport.passage.id, structuredClone(rapport));
  }
}

export function creerBaseSupabase({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, requete = fetch }: {
  url?: string; key?: string; requete?: typeof fetch;
} = {}): BasePassages {
  if (typeof window !== "undefined") throw new Error("La base Supabase est réservée au serveur.");
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises côté serveur.");
  const origin = url.replace(/\/$/, "");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function request(path: string, method: string, body: unknown, prefer?: string) {
    let response: Response;
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
    insererPassage: (passage) => request("/rest/v1/passages", "POST", passage),
    insererEvenement: (event) => request("/rest/v1/evenements", "POST", event),
    async deposerPng(chemin, png) {
      const path = chemin.split("/").map(encodeURIComponent).join("/");
      let response: Response;
      try {
        response = await requete(`${origin}/storage/v1/object/captures/${path}`, {
          method: "POST", headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true" },
          body: new Uint8Array(png), signal: AbortSignal.timeout(15_000),
        });
      } catch { throw new Error("Stockage Supabase inaccessible (erreur réseau)."); }
      if (!response.ok) throw new Error(`Dépôt PNG refusé (HTTP ${response.status}).`);
      return `${origin}/storage/v1/object/public/captures/${path}`;
    },
    enregistrerCapture: (capture) => request("/rest/v1/captures?on_conflict=passage_id,test_id,ecran,vue", "POST", capture, "resolution=merge-duplicates,return=minimal"),
    terminerPassage: (rapport) => request(`/rest/v1/passages?id=eq.${encodeURIComponent(rapport.passage.id)}`, "PATCH", { ...rapport.passage, rapport }),
  };
}
