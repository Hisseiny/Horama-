import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ReleveCapture } from "./coureur.ts";
import type { NavigateurSession } from "./session.ts";

export interface Page {
  send(method: string, params?: object): Promise<any>;
  close(): void;
}

export interface Scene {
  connectTab(port: number): Promise<Page>;
  fitViewport(page: Page): Promise<{ largeur: number; hauteur: number; densite: number }>;
  evaluate(page: Page, expression: string): Promise<any>;
}

export interface Bridge {
  failed: string | null;
  ready(timeout: number): Promise<boolean>;
  stop(): void;
}

export interface BrowserRuntime {
  relever(ecran: string, vue: string): Promise<ReleveCapture>;
  capturerZone?(zone: { x: number; y: number; largeur: number; hauteur: number }): Promise<{
    png: Buffer; zone?: { x: number; y: number; largeur: number; hauteur: number }; defilement: [number, number];
  }>;
  navigateur(): Promise<NavigateurSession>;
  close(): void;
}

export async function ouvrirNavigateur({ port, scene, findHolo, startBridge }: {
  port: number;
  scene: Scene;
  findHolo(): string | null;
  startBridge(options: { holo: string; port: number; channel: string; logFile: string }): Bridge;
}): Promise<BrowserRuntime> {
  const holo = findHolo();
  if (!holo) throw new Error("CLI holo introuvable : définir HOLO_BIN ou installer hai-agents[cli,browser].");
  const page = await scene.connectTab(port);
  const bridges = new Set<Bridge>();
  try {
    const area = await scene.fitViewport(page);
    if (area.largeur !== 1280 || area.hauteur !== 900 || area.densite !== 1) throw new Error("Chrome doit afficher 1280 × 900, DPR 1 (--force-device-scale-factor=1).");
  } catch (error) { page.close(); throw error; }
  return {
    async relever() {
      // No hover in a capture: H leaves its pointer where it clicked. Out by the side, not the top (« exit intent »
      // pop-ups watch the top); not put back, H sends the point of each action. Then hover transitions end, 1 s at most.
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: -10, y: 450 });
      const seen = await scene.evaluate(page, `(async () => {
        await document.fonts.ready;
        scrollTo(0, 0);
        const frames = () => new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 300); });
        await frames();
        const transitions = document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => {}));
        await Promise.race([Promise.all(transitions), new Promise((done) => setTimeout(done, 1000))]);
        await frames();
        return { texte: document.body.innerText, url_page: location.href, largeur: innerWidth, hauteur: innerHeight, defilement: [scrollX, scrollY], densite: devicePixelRatio };
      })()`);
      if (seen.largeur !== 1280 || seen.hauteur !== 900 || seen.densite !== 1) throw new Error("Dimensions de capture incompatibles.");
      const { data } = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
      return { texte: seen.texte, url_page: seen.url_page, largeur: seen.largeur, hauteur: seen.hauteur, defilement: seen.defilement,
        png: new Uint8Array(Buffer.from(data, "base64")), phrase: "Capture enregistrée. Continue le parcours." };
    },
    async navigateur() {
      const channel = randomUUID();
      const folder = join(homedir(), ".horama", "ponts");
      mkdirSync(folder, { recursive: true });
      const bridge = startBridge({ holo, port, channel, logFile: join(folder, `${channel}.log`) });
      bridges.add(bridge);
      try {
        if (!await bridge.ready(20_000) || bridge.failed) throw new Error("Le pont H n’est pas prêt ; consulter ~/.horama/ponts/.");
      } catch (error) { bridge.stop(); bridges.delete(bridge); throw error; }
      return { channel, stop() { bridge.stop(); bridges.delete(bridge); }, failed: () => bridge.failed };
    },
    close() { for (const bridge of bridges) bridge.stop(); bridges.clear(); page.close(); },
  };
}

export async function navigateurLocal(port: number): Promise<BrowserRuntime> {
  const scenePath = new URL("../../automatisation/scene/scene.mjs", import.meta.url).href;
  const bridgePath = new URL("../../automatisation/scene/agent-h.mjs", import.meta.url).href;
  const [scene, bridge] = await Promise.all([import(scenePath), import(bridgePath)]);
  return ouvrirNavigateur({ port, scene, findHolo: bridge.findHolo, startBridge: bridge.startBridge });
}
