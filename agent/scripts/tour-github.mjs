const indexFile = { repo: "Hisseiny/eugenia-school-website", branch: "horama/captures", path: "index.json" };
const vault = { repo: "Hisseiny/Horama-", branch: "dev" };
const vaultBranch = "horama/vault";
const vaultRoot = "vault-horama/eugenia-clone";
const encodePath = path => path.split("/").map(encodeURIComponent).join("/");
const fromBase64 = file => {
  if (file?.encoding !== "base64" || typeof file.content !== "string" || !file.content) {
    throw new Error("Contenu GitHub illisible.");
  }
  return Buffer.from(file.content, "base64").toString("utf8");
};

export const missingToken = "Jeton GitHub du service absent (variable GITHUB_TOKEN_TOUR) : lecture et écriture sur GitHub impossibles.";

export function createTourGitHub({ token, fetchGitHub = fetch, now }) {
  let cache;
  let pending;
  let generation = 0;
  let vaultCache;

  async function api(repo, path, body, { optional = false } = {}) {
    if (!token) throw new Error(missingToken);
    const response = await fetchGitHub(`https://api.github.com/repos/${repo}/${path}`, {
      method: body ? "PUT" : "GET",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Object.assign(new Error("GitHub indisponible."), { status: response.status });
    return response.json();
  }

  function readFile({ repo, branch, path }, optional = false) {
    return api(repo, `contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, undefined, { optional });
  }

  function writeFile({ repo, branch, path }, content, message, sha) {
    return api(repo, `contents/${encodePath(path)}`, {
      message, branch, content: Buffer.from(content).toString("base64"), ...(sha ? { sha } : {}),
    });
  }

  async function readIndex() {
    const file = await readFile(indexFile);
    const index = JSON.parse(fromBase64(file));
    if (index?.format !== "horama-passages-1" || !Array.isArray(index.passages) || !file.sha) {
      throw new Error("Index des passages illisible.");
    }
    return { index, sha: file.sha };
  }

  async function update(file, message, edit) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await edit();
      if (result.content === undefined) return result.value;
      try {
        await writeFile(file, result.content, message, result.sha);
        generation++;
        cache = undefined;
        pending = undefined;
        return result.value;
      } catch (error) {
        if (error.status === 422 && !result.sha && await readFile(file, true)) continue;
        if (error.status !== 409 || attempt === 2) throw error;
      }
    }
    throw new Error("Écriture GitHub en conflit.");
  }

  async function readVault() {
    const directory = await readFile({ ...vault, branch: vaultBranch, path: "vault-horama" }, true) ??
      await readFile({ ...vault, branch: "dev", path: "vault-horama" });
    const root = directory.find(entry => entry.name === "eugenia-clone" && entry.type === "dir");
    if (!root) throw new Error("Vault du clone introuvable.");
    if (vaultCache?.sha === root.sha) return vaultCache.notes;
    const listing = await api(vault.repo, `git/trees/${root.sha}?recursive=1`);
    if (listing.truncated) throw new Error("Liste du vault incomplète.");
    const markdown = listing.tree.filter(entry => entry.type === "blob" && entry.mode === "100644" && entry.path.endsWith(".md"));
    const blobs = new Map(vaultCache?.blobs ?? []);
    const notes = [];
    for (let start = 0; start < markdown.length; start += 6) {
      notes.push(...await Promise.all(markdown.slice(start, start + 6).map(async ({ path, sha }) => {
        if (!blobs.has(sha)) blobs.set(sha, fromBase64(await api(vault.repo, `git/blobs/${sha}`)));
        return { chemin: path, contenu: blobs.get(sha) };
      })));
    }
    vaultCache = { sha: root.sha, notes, blobs: new Map(markdown.map(({ sha }) => [sha, blobs.get(sha)])) };
    return notes;
  }

  function data() {
    if (cache && cache.expires > now()) return cache.payload;
    if (pending) return pending;
    const version = generation;
    const load = Promise.all([readIndex(), readVault()]).then(([{ index }, vault]) => {
      const payload = { index, vault };
      if (version === generation) cache = { payload, expires: now() + 10_000 };
      return payload;
    }).finally(() => { if (pending === load) pending = undefined; });
    pending = load;
    return pending;
  }

  return {
    data,
    updateIndex(edit) {
      return update(indexFile, "Horama : décision dans la tour", async () => {
        const { index, sha } = await readIndex();
        const { changed, value } = edit(index);
        if (!changed) return { value };
        return { content: `${JSON.stringify(index, null, 2)}\n`, sha, value };
      });
    },
    createDecisionNote(id, content) {
      const file = { ...vault, path: `${vaultRoot}/decisions/${id}.md` };
      return update(file, "Horama : note de décision de la tour", async () => {
        if (await readFile(file, true)) return { value: undefined };
        return { content };
      });
    },
    updateTest(id, edit) {
      const file = { ...vault, path: `${vaultRoot}/tests/${id}.md` };
      return update(file, `Horama : mise à jour du test ${id}`, async () => {
        const existing = await readFile(file, true);
        if (!existing) return { value: false };
        if (!existing.sha) throw new Error("Version du test introuvable.");
        const prior = fromBase64(existing);
        const content = edit(prior);
        return { content: content === prior ? undefined : content, sha: existing.sha, value: true };
      });
    },
  };
}
