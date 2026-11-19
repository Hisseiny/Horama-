export function assertAllowed(address: string, hosts = process.env.SANDBOX_ALLOWED_HOSTS ?? ""): URL {
  const url = new URL(address);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const allowed = hosts.split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      hostname === "eugeniaschool.com" || hostname.endsWith(".eugeniaschool.com") ||
      !allowed.includes(url.hostname.toLowerCase())) {
    throw new Error(`Hôte refusé : ${url.hostname}`);
  }
  return url;
}

export type Observation = { success: boolean; text: string };

export function verdict(observation: Observation, received: unknown[]) {
  const proof = { text: observation.text, received };
  if (observation.success && received.length === 0) {
    return { status: "VERIFIED_FAIL", message: "Succès affiché mais aucun envoi reçu.", proof };
  }
  if (!observation.success && observation.text && received.length === 0) {
    return { status: "PASS", message: "Erreur affichée et aucun envoi reçu.", proof };
  }
  return { status: "INCONCLUSIVE", message: "Résultat inattendu pour le scénario erreur 500.", proof };
}

export async function checkSandbox(target: string, base: string, observe: () => Promise<Observation>, fetcher = fetch) {
  // Validate both addresses before clearing the base or opening the page.
  assertAllowed(target);
  const receiptsUrl = new URL("/recus", assertAllowed(base));
  try {
    const cleared = await fetcher(receiptsUrl, { method: "DELETE", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!cleared.ok) throw new Error(`DELETE /recus : HTTP ${cleared.status}`);
    const observation = await observe();
    const response = await fetcher(receiptsUrl, { redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`GET /recus : HTTP ${response.status}`);
    const received: unknown = await response.json();
    if (!Array.isArray(received)) throw new Error("GET /recus : liste attendue");
    return verdict(observation, received);
  } catch (error) {
    return { status: "INCONCLUSIVE", message: `Vérification impossible : ${error instanceof Error ? error.message : String(error)}` };
  }
}
