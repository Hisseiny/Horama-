import type { AxeResults, ImpactValue } from "axe-core";
import { PNG } from "pngjs";
import type { ExplorationCdp } from "./cdp.ts";

interface Rect { x: number; y: number; width: number; height: number }
interface AxeViolation {
  rule: string; help: string; details: string; target: string; html: string;
  impact: ImpactValue | undefined; needsKeyboardReview: boolean;
}
interface Scan { url: string; violations: AxeViolation[] }
interface ProvenViolation {
  statut: "VERIFIED_FAIL"; impact: "serious" | "critical"; regle: string; aide: string;
  detail: string; element: string; html: string; capture: string;
}

export interface AccessibilityPage {
  url: string; duree_ms: number; statut: "analyse" | "INCONCLUSIVE"; raison?: string;
  mineures_moderees: number; graves_sans_preuve: number; violations: ProvenViolation[];
}

async function scanDocument(): Promise<Scan> {
  const world = globalThis as unknown as { axe: { run(options: object): Promise<AxeResults> }; horamaAxeElements: Array<Element | undefined> };
  const url = location.href;
  const result = await world.axe.run({
    iframes: false, preload: false, elementRef: true, resultTypes: ["violations"],
  });
  world.horamaAxeElements = [];
  return {
    url,
    violations: result.violations.flatMap(rule => rule.nodes.map(node => {
      world.horamaAxeElements.push(node.element);
      return {
        rule: rule.id, help: rule.help, details: node.failureSummary ?? "",
        target: node.target.map(part => Array.isArray(part) ? part.join(" > ") : part).join(" > "),
        html: node.html.slice(0, 500), impact: node.impact ?? rule.impact,
        // Chrome peut donner le focus clavier à une zone défilante même sans tabindex.
        needsKeyboardReview: rule.id === "scrollable-region-focusable" && !node.element?.hasAttribute("tabindex"),
      };
    })),
  };
}

function readTarget(index: number): Rect | null {
  const node = (globalThis as unknown as { horamaAxeElements: Array<Element | undefined> }).horamaAxeElements[index];
  if (!node?.isConnected || !node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
  const { left, top, width, height } = node.getBoundingClientRect();
  return width > 0 && height > 0 ? { x: left + scrollX, y: top + scrollY, width, height } : null;
}

function markedPng(data: string, target: Rect, clip: Rect): Buffer {
  const png = PNG.sync.read(Buffer.from(data, "base64"));
  const scaleX = png.width / clip.width, scaleY = png.height / clip.height;
  const left = Math.max(0, Math.floor((target.x - clip.x) * scaleX) - 3);
  const top = Math.max(0, Math.floor((target.y - clip.y) * scaleY) - 3);
  const right = Math.min(png.width, Math.ceil((target.x + target.width - clip.x) * scaleX) + 3);
  const bottom = Math.min(png.height, Math.ceil((target.y + target.height - clip.y) * scaleY) + 3);
  if (left >= right || top >= bottom) throw new Error("Élément hors capture.");
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const edge = Math.min(x - left, right - x - 1, y - top, bottom - y - 1);
      if (edge >= 4) continue;
      const offset = 4 * (y * png.width + x);
      png.data.set(edge === 0 ? [25, 16, 26, 255] : [255, 42, 104, 255], offset);
    }
  }
  return PNG.sync.write(png);
}

export async function auditAccessibility(
  client: ExplorationCdp | undefined, url: string, saveCapture: (png: Buffer) => string, signal?: AbortSignal,
): Promise<AccessibilityPage> {
  const started = performance.now();
  const page: AccessibilityPage = { url, duree_ms: 0, statut: "analyse", mineures_moderees: 0, graves_sans_preuve: 0, violations: [] };
  try {
    if (!client) throw new Error("Connexion CDP indisponible.");
    const { default: axe } = await import("axe-core");
    const { default: locale } = await import("axe-core/locales/fr.json", { with: { type: "json" } });
    const { frameTree } = await client.send("Page.getFrameTree");
    const { executionContextId } = await client.send("Page.createIsolatedWorld", { frameId: frameTree.frame.id });
    const evaluate = async (expression: string, awaitPromise = false) => {
      signal?.throwIfAborted();
      const response = await client.send("Runtime.evaluate", {
        expression, contextId: executionContextId, awaitPromise, returnByValue: true,
      });
      if (response.exceptionDetails) throw new Error("L’analyse axe-core a échoué dans l’onglet.");
      return response.result?.value;
    };
    if (await evaluate("location.href") !== url) throw new Error("L’onglet a changé de page avant l’analyse.");
    await evaluate(`${axe.source}\n;axe.configure({locale: ${JSON.stringify(locale)}}); void 0`);
    const scan: Scan = await evaluate(`(${scanDocument.toString()})()`, true);
    if (scan.url !== url || await evaluate("location.href") !== url) throw new Error("L’onglet a changé de page pendant l’analyse.");
    const { cssContentSize } = await client.send("Page.getLayoutMetrics");
    const captures = new Map<string, string>();
    for (const [index, violation] of scan.violations.entries()) {
      signal?.throwIfAborted();
      const { impact } = violation;
      if (impact === "minor" || impact === "moderate") page.mineures_moderees++;
      if (impact !== "serious" && impact !== "critical") continue;
      if (violation.needsKeyboardReview) { page.graves_sans_preuve++; continue; }
      try {
        const target = `(${readTarget.toString()})(${index})`;
        const rect: Rect | null = await evaluate(target);
        if (!rect) throw new Error("Élément sans zone visible.");
        const x = Math.max(0, Math.floor(rect.x) - 20), y = Math.max(0, Math.floor(rect.y) - 20);
        const clip = { x, y, width: Math.min(cssContentSize.width - x, Math.ceil(rect.width) + 40, 960),
          height: Math.min(cssContentSize.height - y, Math.ceil(rect.height) + 40, 640), scale: 1 };
        if (Math.min(x + clip.width, rect.x + rect.width) <= Math.max(x, rect.x)
          || Math.min(y + clip.height, rect.y + rect.height) <= Math.max(y, rect.y)) throw new Error("Élément hors page.");
        const key = JSON.stringify([violation.target, rect]);
        let capture = captures.get(key);
        if (!capture) {
          const image = await client.send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
          if (JSON.stringify(await evaluate(`location.href === ${JSON.stringify(url)} ? ${target} : null`)) !== JSON.stringify(rect)) {
            throw new Error("L’élément a bougé pendant la capture.");
          }
          capture = saveCapture(markedPng(image.data, rect, clip));
          captures.set(key, capture);
        }
        page.violations.push({ statut: "VERIFIED_FAIL", impact, regle: violation.rule, aide: violation.help,
          detail: violation.details, element: violation.target, html: violation.html, capture });
      } catch {
        page.graves_sans_preuve++;
      }
    }
  } catch (error) {
    page.statut = "INCONCLUSIVE";
    page.raison = error instanceof Error ? error.message : "L’analyse axe-core n’a pas pu se terminer.";
  }
  page.duree_ms = Math.round(performance.now() - started);
  return page;
}
