import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, changesCookie } from "../../lib/session.ts";
import { VERSIONS } from "../../regressions.ts";

export async function GET() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  for (const version of VERSIONS) jar.delete(changesCookie(version));
  redirect("/login");
}
