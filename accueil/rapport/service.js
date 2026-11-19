// The service of the report served with the page of welcome (issue #164). Its address comes from ?service=, put there
// by the page of welcome (RAPPORT_URL?id=…&service=…, accueil/service.js). Same functions as extension/service.js, the
// only file of accueil/rapport/ that is not a copy of the extension (extension/copier-rapport.sh).
async function serviceAddress() {
  const given = new URLSearchParams(location.search).get("service") ?? "";
  return /^https?:\/\//.test(given) ? given.replace(/\/+$/, "") : "";
}
// The answer of the service as { status, body }; a network failure as status 0 with a sentence.
async function ask(url, init) {
  if (!/^https?:\/\//.test(url)) return { status: 400, body: { erreur: "Adresse du service absente de ce lien : repars de la page d'accueil." } };
  try {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  } catch {
    return { status: 0, body: { erreur: "Le service Horama ne répond pas : réessaie dans un instant." } };
  }
}
