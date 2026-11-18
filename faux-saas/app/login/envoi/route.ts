import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_OPTIONS, loginTarget } from "../../../lib/session.ts";

function seeOther(location: string) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const suite = loginTarget(form.get("suite"));
  const { FACTURO_LOGIN: login, FACTURO_PASSWORD: password } = process.env;
  if (!login || !password) return seeOther("/login");
  if (form.get("identifiant") !== login || form.get("mot_de_passe") !== password) {
    return seeOther(`/login?erreur=1&suite=${encodeURIComponent(suite)}`);
  }
  (await cookies()).set(SESSION_COOKIE, "demo", SESSION_OPTIONS);
  return seeOther(suite);
}
