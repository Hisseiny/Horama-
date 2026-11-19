import type { CdpClient } from "./controles.ts";

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
export interface HoloElement {
  selector: string;
  text: string;
  header: boolean;
  visible: boolean;
}

export function sameHeaderElement(first: HoloElement, second: HoloElement): boolean {
  return first.header && second.header && (first.selector === second.selector && !!first.selector
    || first.text === second.text && !!first.text);
}

export function isCutFinding(finding: HoloFinding): boolean {
  return finding.kind === "cut-off-text" || /\b(masqu[ée]|coup[ée]|rogn[ée]|tronqu[ée]|hidden|clipped|cut.off|obscured)/i.test(finding.sentence);
}

export async function inspectHoloElement(client: CdpClient, finding: HoloFinding,
  capture: { url: string; width: number; height: number; scroll: [number, number] }): Promise<HoloElement | null> {
  if (!finding.zone) return null;
  function inspect(zone: NonNullable<HoloFinding["zone"]>, expected: typeof capture): HoloElement | null {
    if (location.href !== expected.url || Math.abs(scrollX - expected.scroll[0]) > 1 || Math.abs(scrollY - expected.scroll[1]) > 1
      || innerWidth !== expected.width || innerHeight !== expected.height) return null;
    const candidates = Array.from(document.querySelectorAll("body *")).flatMap(element => {
      if (element.closest("svg") && !element.matches("svg")) return [];
      if (!element.matches("img,svg,canvas,video,input") && !element.hasAttribute("aria-label")
        && !Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return [];
      const box = element.getBoundingClientRect();
      const intersection = Math.max(0, Math.min(box.right, zone.x + zone.largeur) - Math.max(box.left, zone.x))
        * Math.max(0, Math.min(box.bottom, zone.y + zone.hauteur) - Math.max(box.top, zone.y));
      return intersection ? [{ element, box, score: intersection / (box.width * box.height + zone.largeur * zone.hauteur - intersection) }] : [];
    }).sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.score < 0.02 || candidates.some(other => other !== best && Math.abs(other.score - best.score) < 0.01
      && !best.element.contains(other.element) && !other.element.contains(best.element))) return null;
    const { element, box } = best;
    const path: string[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) { path.unshift(`#${CSS.escape(node.id)}`); break; }
      const siblings = node.parentElement ? Array.from(node.parentElement.children).filter(sibling => sibling.localName === node!.localName) : [];
      path.unshift(`${node.localName}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(node) + 1})` : ""}`);
    }
    let visible = box.width > 1 && box.height > 1 && box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.visibility !== "visible" || Number(css.opacity) === 0 || css.clipPath !== "none" || css.clip !== "auto"
        || css.maskImage !== "none" || node === element && (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight)) visible = false;
    }
    for (const x of [box.left + Math.min(1, box.width / 4), box.left + box.width / 2, box.right - Math.min(1, box.width / 4)]) {
      for (const y of [box.top + Math.min(1, box.height / 4), box.top + box.height / 2, box.bottom - Math.min(1, box.height / 4)]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit !== element && !element.contains(hit)) visible = false;
      }
    }
    const text = (element.getAttribute("aria-label") || element.getAttribute("alt") || element.textContent || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
    return { selector: path.join(" > "), text, header: !!element.closest('header,[role="banner"]'), visible };
  }
  try {
    const response = await client.send("Runtime.evaluate", { expression: `(${inspect.toString()})(${JSON.stringify(finding.zone)},${JSON.stringify(capture)})`, returnByValue: true });
    const value = response.result?.value;
    return value && typeof value.selector === "string" && typeof value.text === "string" && typeof value.header === "boolean" && typeof value.visible === "boolean" ? value : null;
  } catch { return null; }
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
