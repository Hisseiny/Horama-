import { receipts, cors } from "../../lib/form-receipts.ts";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.get("mode") === "500") {
    return Response.json({ error: "Erreur de test" }, { status: 500, headers: cors });
  }
  try {
    const data = JSON.parse(await request.text());
    if (!data || typeof data.formType !== "string" || !data.fields || typeof data.fields !== "object" || Array.isArray(data.fields)) {
      return Response.json({ error: "Format attendu : { formType, fields }" }, { status: 400, headers: cors });
    }
    receipts.push(data);
    return Response.json({ ok: true }, { status: 201, headers: cors });
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400, headers: cors });
  }
}
