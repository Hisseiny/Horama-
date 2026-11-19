import { receipts, cors } from "../../lib/form-receipts.ts";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export function GET() {
  return Response.json(receipts, { headers: cors });
}

export function DELETE() {
  receipts.length = 0;
  return Response.json({ ok: true }, { headers: cors });
}
