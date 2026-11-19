export async function startScreencast(onFrame) {
  const targets = await fetch("http://127.0.0.1:9333/json", { signal: AbortSignal.timeout(1000) }).then(response => response.json());
  const target = targets.find(target => target.type === "page");
  if (!target) throw new Error("Onglet du direct introuvable.");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const acknowledgements = [];
  let nextId = 0;
  let timer;
  let lastAck = 0;
  const close = () => {
    clearTimeout(timer);
    for (const request of pending.values()) request.reject(new Error("Direct fermé."));
    pending.clear();
    socket.close();
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("CDP du direct sans réponse.")); }, 3000);
    pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const ack = () => {
    timer = undefined;
    const sessionId = acknowledgements.shift();
    if (sessionId === undefined) return;
    lastAck = Date.now();
    void send("Page.screencastFrameAck", { sessionId }).catch(close);
    if (acknowledgements.length) timer = setTimeout(ack, 200);
  };
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request?.reject(new Error(message.error.message));
      else request?.resolve(message.result);
    } else if (message.method === "Page.screencastFrame") {
      const { data, metadata, sessionId } = message.params;
      onFrame(Buffer.from(data, "base64"), Math.round(metadata.timestamp * 1000));
      acknowledgements.push(sessionId);
      if (!timer) timer = setTimeout(ack, Math.max(0, 200 - (Date.now() - lastAck)));
    }
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connexion du direct expirée.")), 3000);
      socket.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Connexion du direct refusée.")); }, { once: true });
    });
    socket.addEventListener("close", close, { once: true });
    socket.addEventListener("error", close, { once: true });
    await send("Page.enable");
    await send("Page.startScreencast", { format: "jpeg", quality: 60, maxWidth: 1280, maxHeight: 800 });
    return { close };
  } catch (error) { close(); throw error; }
}
