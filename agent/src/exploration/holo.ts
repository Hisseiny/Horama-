export type HoloKind = "cut-off-text" | "overlapping-text" | "misaligned-element" | "distorted-image" | "unreadable-contrast";
export type HoloModel = "holo4-27b" | "holo4-35b-a3b";
export type HoloFinding = {
  kind: HoloKind;
  sentence: string;
} & ({ status: "SUSPECTED"; zone: { x: number; y: number; largeur: number; hauteur: number } }
  | { status: "INCONCLUSIVE"; zone: null; message: string });
export interface HoloOptions {
  url: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string;
}
type HoloUsage = { prompt_tokens: number; completion_tokens: number };
export type HoloResult = {
  usage: HoloUsage | null;
  cost_usd: number | null;
} & ({
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
});

const keys = ["d0", "d1", "d2", "d3", "d4"];
const kinds: HoloKind[] = ["cut-off-text", "overlapping-text", "misaligned-element", "distorted-image", "unreadable-contrast"];

function parseFindings(content: string, width: number, height: number): HoloFinding[] {
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== keys.length) throw new Error("Invalid findings object");
  return keys.flatMap((key): HoloFinding[] => {
    const item = (value as Record<string, unknown>)[key];
    if (typeof item !== "string") throw new Error("Missing finding key");
    if (item === "") return [];
    const parts = item.split("|").map((part) => part.trim());
    if (parts.length !== 3 || !kinds.includes(parts[0] as HoloKind) || !parts[2]) {
      throw new Error("Invalid finding format");
    }
    const finding = { kind: parts[0] as HoloKind, sentence: parts[2] };
    const coordinates = parts[1].split(",").map((part) => part.trim());
    const [x, y, boxWidth, boxHeight] = coordinates.map(Number);
    if (coordinates.length !== 4 || !coordinates.every((part) => /^\d+$/.test(part))
      || ![x, y, boxWidth, boxHeight].every(Number.isSafeInteger)
      || x < 0 || y < 0 || boxWidth <= 0 || boxHeight <= 0 || x + boxWidth > 1000 || y + boxHeight > 1000) {
      return [{ ...finding, status: "INCONCLUSIVE", zone: null, message: "Invalid box: expected x,y,width,height integers inside normalized image bounds [0,1000]." }];
    }
    const left = Math.round(x * width / 1000);
    const top = Math.round(y * height / 1000);
    const zone = { x: left, y: top, largeur: Math.round((x + boxWidth) * width / 1000) - left, hauteur: Math.round((y + boxHeight) * height / 1000) - top };
    if (zone.largeur <= 0 || zone.hauteur <= 0 || zone.x + zone.largeur > width || zone.y + zone.hauteur > height) {
      return [{ ...finding, status: "INCONCLUSIVE", zone: null, message: "Invalid box after conversion to screenshot pixels: empty or outside image." }];
    }
    return [{ ...finding, status: "SUSPECTED", zone }];
  });
}

export function filterFindings(findings: HoloFinding[], width: number, height: number): HoloFinding[] {
  const kept: HoloFinding[] = [];
  for (const finding of findings) {
    if (finding.status === "INCONCLUSIVE") { kept.push(finding); continue; }
    const box = finding.zone;
    if (box.y + box.hauteur >= height * 0.99 || box.x + box.largeur >= width * 0.99 || box.largeur < 4 || box.hauteur < 4) continue;
    const duplicate = kept.some(previous => {
      if (previous.status !== "SUSPECTED" || previous.kind !== finding.kind) return false;
      const other = previous.zone;
      const intersection = Math.max(0, Math.min(box.x + box.largeur, other.x + other.largeur) - Math.max(box.x, other.x))
        * Math.max(0, Math.min(box.y + box.hauteur, other.y + other.hauteur) - Math.max(box.y, other.y));
      return intersection / (box.largeur * box.hauteur + other.largeur * other.hauteur - intersection) > 0.5;
    });
    if (!duplicate) kept.push(finding);
  }
  return kept;
}

export async function askHolo(png: Buffer, { url, fetch: request = fetch, timeoutMs = 8_000, apiKey = process.env.HAI_API_KEY }: HoloOptions): Promise<HoloResult> {
  const start = Date.now();
  let usage: HoloUsage | null = null;
  const cost = (model: HoloModel | null) => model === "holo4-27b" && usage
    ? (usage.prompt_tokens * 0.40 + usage.completion_tokens * 3.00) / 1_000_000 : null;
  const inconclusive = (model: HoloModel | null, message: string): HoloResult => ({
    status: "INCONCLUSIVE", findings: [], model, durationMs: Date.now() - start, message, usage, cost_usd: cost(model),
  });
  if (!apiKey) return inconclusive(null, "HAI_API_KEY is required.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return inconclusive(null, "timeoutMs must be positive and finite.");
  if (png.length < 33 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || png.readUInt32BE(8) !== 13 || png.toString("ascii", 12, 16) !== "IHDR") {
    return inconclusive(null, "Invalid PNG IHDR header.");
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height || width > 0x7fffffff || height > 0x7fffffff) return inconclusive(null, "Invalid PNG dimensions.");
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
              { type: "text", text: `Inspect only visible visual defects in this ${width}x${height} screenshot of ${url}. Do not infer anything not visible. Allowed kinds: ${kinds.join(", ")}. Report cut-off or overlapping text, misaligned elements, distorted images, or unreadable contrast only. Return JSON with exactly d0, d1, d2, d3, d4, each a string. Each finding must use "kind | x,y,width,height | one short sentence in plain French for a non-technical visitor" with no other pipe characters. The zone is a tight bounding box around the affected element: four integers normalized to [0,1000] relative to the full image, origin top-left, NOT screenshot pixels. Width and height must be positive and the box fully inside the image. The caller converts these coordinates to screenshot pixels. Use an empty string for unused keys. These are doubts, not proven defects.` },
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
        const tokens = body?.usage;
        if (Number.isFinite(tokens?.prompt_tokens) && tokens.prompt_tokens >= 0
          && Number.isFinite(tokens?.completion_tokens) && tokens.completion_tokens >= 0) {
          usage = { prompt_tokens: (usage?.prompt_tokens ?? 0) + tokens.prompt_tokens,
            completion_tokens: (usage?.completion_tokens ?? 0) + tokens.completion_tokens };
        }
        const content = body?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("Missing content");
        return { status: "SUSPECTED" as const, findings: filterFindings(parseFindings(content, width, height), width, height), model, durationMs: Date.now() - start, usage, cost_usd: cost(model) };
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
