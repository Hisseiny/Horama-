const state = globalThis as typeof globalThis & { sandboxReceipts?: unknown[] };
export const receipts = state.sandboxReceipts ??= [];
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};
