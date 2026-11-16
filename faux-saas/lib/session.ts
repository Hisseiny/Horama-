import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { VERSIONS, defaultChanges, type ChangeId, type Version } from "../regressions.ts";

export const SESSION_COOKIE = "facturo_session";
export const SESSION_OPTIONS = { httpOnly: true, sameSite: "lax", path: "/" } as const;

export function changesCookie(version: Version): string {
  return `facturo_r_v${version}`;
}

export function parseVersion(segment: string): Version | null {
  return VERSIONS.find((version) => segment === `v${version}`) ?? null;
}

export function loginTarget(suite: unknown): string {
  return typeof suite === "string" && VERSIONS.some((version) => suite.startsWith(`/v${version}/`))
    ? suite
    : "/v13/tableau-de-bord";
}

export async function openPage(segment: string, path: string) {
  const version = parseVersion(segment);
  if (!version) notFound();
  const jar = await cookies();
  if (jar.get(SESSION_COOKIE)?.value !== "demo") {
    redirect(`/login?suite=${encodeURIComponent(`/v${version}${path}`)}`);
  }
  const raw = jar.get(changesCookie(version))?.value;
  const active: string[] = raw === undefined ? defaultChanges(version) : raw.split(",");
  return { version, on: (id: ChangeId) => active.includes(id) };
}
