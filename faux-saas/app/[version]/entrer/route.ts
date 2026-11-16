import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_OPTIONS, changesCookie, parseVersion } from "../../../lib/session.ts";
import { CHANGES, resolveChanges } from "../../../regressions.ts";

export async function GET(request: Request, { params }: { params: Promise<{ version: string }> }) {
  const version = parseVersion((await params).version);
  if (!version) return new Response("Version inconnue", { status: 404 });
  const query = new URL(request.url).searchParams;
  const suite = query.get("suite") ?? `/v${version}/tableau-de-bord`;
  if (!suite.startsWith(`/v${version}/`)) {
    return new Response(`Le paramètre suite doit commencer par /v${version}/`, { status: 400 });
  }
  const ids = resolveChanges(version, query.get("r"));
  if (!ids) {
    const valid = ["aucun", "defaut", ...CHANGES.map((change) => change.id)].join(", ");
    return new Response(`Identifiant de changement inconnu dans r. Identifiants valides : ${valid}`, { status: 400 });
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "demo", SESSION_OPTIONS);
  jar.set(changesCookie(version), ids.join(",") || "aucun", SESSION_OPTIONS);
  redirect(suite);
}
