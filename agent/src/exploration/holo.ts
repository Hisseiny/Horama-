export type HoloKind = "cut-off-text" | "overlapping-text" | "misaligned-element" | "distorted-image" | "unreadable-contrast";
export type HoloModel = "holo4-27b" | "holo4-35b-a3b";
export interface HoloFinding {
  status: "SUSPECTED";
  kind: HoloKind;
  zone: string;
  sentence: string;
}
export interface HoloOptions {
  url: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string;
}
export type HoloResult = {
  status: "SUSPECTED";
  findings: HoloFinding[];
  model: HoloModel;
  durationMs: number;
} | {
  status: "INCONCLUSIVE";
  findings: [];
  model: HoloModel | null;
  durationMs: number;
  message: string;
};

const keys = ["d0", "d1", "d2", "d3", "d4"];
const kinds: HoloKind[] = ["cut-off-text", "overlapping-text", "misaligned-element", "distorted-image", "unreadable-contrast"];

function parseFindings(content: string): HoloFinding[] {
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length) throw new Error("Invalid findings object");
  return keys.flatMap((key): HoloFinding[] => {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item !== "string") throw new Error("Missing finding key");
    if (item === "") return [];
    const parts = item.split("|").map((part) => part.trim());
    if (parts.length !== 3 || !kinds.includes(parts[0] as HoloKind) || !parts[1] || !parts[2]) {
      throw new Error("Invalid finding format");
    }
    return [{ status: "SUSPECTED", kind: parts[0] as HoloKind, zone: parts[1], sentence: parts[2] }];
  });
}

export async function askHolo(png: Buffer, { url, fetch: request = fetch, timeoutMs = 8_000, apiKey = process.env.HAI_API_KEY }: HoloOptions): Promise<HoloResult> {
  const start = Date.now();
  const inconclusive = (model: HoloModel | null, message: string): HoloResult => ({
    status: "INCONCLUSIVE", findings: [], model, durationMs: Date.now() - start, message,
  });
  if (!apiKey) return inconclusive(null, "HAI_API_KEY is required.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return inconclusive(null, "timeoutMs must be positive and finite.");
  for (const model of ["holo4-27b", "holo4-35b-a3b"] as const) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const operation = async () => {
        const response = await request("https://api.hcompany.ai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model, temperature: 0, chat_template_kwargs: { enable_thinking: false }, max_tokens: 700,
            messages: [{ role: "user", content: [
              { type: "text", text: `Inspect only visible visual defects in this screenshot of ${url}. Do not infer anything not visible. Allowed kinds: ${kinds.join(", ")}. Report cut-off or overlapping text, misaligned elements, distorted images, or unreadable contrast only. Return JSON with exactly d0, d1, d2, d3, d4, each a string. Each finding must use "kind | zone | one sentence" with no other pipe characters. Use an empty string for unused keys. These are doubts, not proven defects.` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${png.toString("base64")}` } },
            ] }],
            response_format: { type: "json_schema", json_schema: { name: "visible_defects", schema: {
              type: "object", properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])), additionalProperties: false,
            } } },
          }),
        });
        if (!response.ok) {
          const detail = (await response.text()).replaceAll(apiKey, "[REDACTED]");
          return inconclusive(model, `H Models HTTP ${response.status}: ${detail}`);
        }
        const body = await response.json();
        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Missing content");
        return { status: "SUSPECTED" as const, findings: parseFindings(content), model, durationMs: Date.now() - start };
      };
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Timeout")); }, timeoutMs);
      })]);
    } catch {
      if (controller.signal.aborted) {
        if (model === "holo4-27b") continue;
        return inconclusive(model, `Both Holo models timed out (${timeoutMs} ms each).`);
      }
      return inconclusive(model, "H Models network error or non-conforming response (expected JSON d0…d4 with valid findings).");
    } finally { clearTimeout(timer); }
  }
  return inconclusive(null, "No Holo model answered.");
}
