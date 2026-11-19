import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fingerprintMarker, ticketMarkdown, writeTicket } from "../../extension/lib/ticket.mjs";

async function githubToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  try {
    return (await promisify(execFile)("gh", ["auth", "token"], { timeout: 5_000 })).stdout.trim();
  } catch {
    throw new Error("Authentification GitHub indisponible (gh auth ou GH_TOKEN).");
  }
}

export async function sendToGitHub({ repository, ticket, api = "https://api.github.com", token }) {
  const method = async (verb, path, body) => fetch(`${api}/repos/${repository}/${path}`, {
    method: verb,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const read = async (response) => {
    if (!response.ok) throw new Error(`GitHub : HTTP ${response.status}.`);
    return response.json();
  };
  try {
    token ??= await githubToken();
    const marker = fingerprintMarker(ticket.fingerprint);
    for (let page = 1; ; page += 1) {
      const response = await method("GET", `issues?state=open&per_page=100&page=${page}`);
      const issues = await read(response);
      const match = issues.find((issue) => !issue.pull_request && issue.body?.split(/\r?\n/).includes(marker));
      if (match) {
        const comment = await read(await method("POST", `issues/${match.number}/comments`, { body: `Encore présent (nouveau passage).\n\n${ticket.body}` }));
        return { status: "commente", numero: match.number, url: comment.html_url };
      }
      if (!response.headers.get("link")?.includes('rel="next"')) break;
    }

    const label = await method("GET", "labels/horama");
    if (label.status === 404) await read(await method("POST", "labels", { name: "horama", color: "7354a3" }));
    else await read(label);
    const issue = await read(await method("POST", "issues", { title: ticket.title, body: ticket.body, labels: ["horama"] }));
    return { status: "ouverte", numero: issue.number, url: issue.html_url };
  } catch (error) {
    return { status: "INCONCLUSIVE", raison: error.message };
  }
}

export async function recordTicket({ vault, report, finding, decision, note, environment, repository, api, token, say }) {
  const ticket = writeTicket({ report, finding, decision, note, environment });
  if (!ticket) return null;
  const file = join(vault, report.site, "tickets", `${report.passage_id}--${finding.id}.md`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, ticketMarkdown(ticket));
  const result = repository ? await sendToGitHub({ repository, ticket, api, token }) : { status: "vault" };
  say(result.status === "INCONCLUSIVE" ? `Ticket non envoyé (${result.raison}) : il est dans ${file}.`
    : result.url ? `Ticket ${result.status} : ${result.url} (copie : ${file}).` : `Ticket écrit dans ${file}.`);
  return { ecart_id: finding.id, empreinte: ticket.fingerprint, fichier: file, ...result };
}
