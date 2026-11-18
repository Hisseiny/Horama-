// The Horama service the extension calls (issue #68, step 2). Its address is set in the options; nothing else of the
// service is assumed. Contract: POST /explorations { url } → 202 { id, place } (400, 429, 503: { erreur });
// GET /explorations/:id → { id, etat: "en_file", place } while waiting, then the file horama-exploration-1;
// GET /explorations/:id/<capture> → the image; GET /explorations/:id/direct → the last image of the direct (#164).
// The address: ?service= of the page when given (the report opened from the page of welcome), else the options, else
// DEFAULT_SERVICE.
const DEFAULT_SERVICE = "https://explorations-production-70bf5b38.up.railway.app";
async function serviceAddress() {
  const given = new URLSearchParams(location.search).get("service");
  if (given && /^https?:\/\//.test(given)) return given.replace(/\/+$/, "");
  const { service } = await chrome.storage.local.get("service");
  return (service || DEFAULT_SERVICE).replace(/\/+$/, "");
}
// The answer of the service as { status, body }; a network failure as status 0 with a sentence.
async function ask(url, init) {
  try {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  } catch {
    return { status: 0, body: { erreur: "Le service Horama ne répond pas. Vérifie son adresse dans les options." } };
  }
}
