import type { CdpClient } from "./controles.ts";

export interface ExplorationCdp extends CdpClient { close(): void }

export async function connecterCdp(port: number, address: string): Promise<ExplorationCdp> {
  const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Liste des onglets CDP inaccessible.");
  const tabs = await response.json() as Array<{ type: string; url: string; webSocketDebuggerUrl: string }>;
  const tab = tabs.find(tab => tab.type === "page" && tab.url === address);
  if (!tab) throw new Error("Onglet du relevé introuvable.");
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  const listeners = new Map<string, (params: any) => void>();
  let id = 0;
  const fail = () => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error("Connexion CDP fermée.")); } pending.clear(); };
  socket.addEventListener("close", fail);
  socket.addEventListener("error", fail);
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id); clearTimeout(item.timer);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    } else listeners.get(message.method)?.(message.params);
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error("Connexion CDP hors délai.")); }, 5000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Connexion CDP impossible.")); }, { once: true });
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const key = ++id;
        const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP hors délai : ${method}`)); }, 15_000);
        pending.set(key, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: key, method, params }));
      });
    },
    on(event, listener) { listeners.set(event, listener); },
    close() { fail(); socket.close(); },
  };
}
