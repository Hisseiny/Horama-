// The showcase (« vitrine »): the scene, enlarged to a whole screen, for an audience. The real Chrome of the scene keeps
// its 1280 × 900 page for the H agent, the captures and the references; this module only retransmits what it shows.
// Page.startScreencast on the tab of the scene gives a JPEG at each change of the screen; a small local server sends
// them to a page shown full screen in a separate Chrome (its own throwaway profile, app mode), never a tab of the
// scene's Chrome, which the H bridge could aim at. If anything fails, the scene goes on in the real Chrome.
// Measured for the report: frames, frames per second, and the delay from the frame drawn by Chrome to the frame shown
// by the showcase (same machine, same clock).
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Horama</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}img{display:block;width:100vw;height:100vh;object-fit:contain}</style></head>
<body><img id="v" alt=""><script>
const image = document.getElementById("v");
const source = new EventSource("/flux");
let pending = null;
// The newest frame only: a frame that arrives while the previous one is still decoding replaces it.
source.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  if (pending) { pending.next = frame; return; }
  show(frame);
};
function show(frame) {
  pending = frame;
  const next = new Image();
  next.onload = () => {
    image.src = next.src;
    requestAnimationFrame(() => {
      navigator.sendBeacon("/mesure", JSON.stringify({ dessinee: frame.dessinee, recue: frame.recue, affichee: Date.now() }));
      const following = pending.next;
      pending = null;
      if (following) show(following);
    });
  };
  next.src = "data:image/jpeg;base64," + frame.img;
}
</script></body></html>`;

// page: the CDP connection of the scene's tab (scene.mjs). Returns { stop(), mesures() }, or null when the showcase
// could not start (said through say).
export async function ouvrirVitrine(page, { port = 9400, chromeBin, profil, debugPort = null, say }) {
  const clients = new Set();
  const delays = []; // per frame shown: from drawn by Chrome to shown, and from received by the server to shown, in ms
  let frames = 0;
  let first = null;
  let last = null;
  let viewer = null;
  const server = createServer((request, response) => {
    if (request.url === "/flux") {
      response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }
    if (request.url === "/mesure" && request.method === "POST") {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        try {
          const { dessinee, recue, affichee } = JSON.parse(body);
          delays.push({ total: affichee - dessinee, transport: affichee - recue });
        } catch {}
        response.end();
      });
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(PAGE);
  });
  try {
    await new Promise((done, fail) => server.once("error", fail).listen(port, "127.0.0.1", done));
    page.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      page.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      const recue = Date.now();
      frames++;
      first ??= recue;
      last = recue;
      const message = `data: ${JSON.stringify({ img: data, dessinee: Math.round(metadata.timestamp * 1000), recue })}\n\n`;
      for (const client of clients) client.write(message);
    });
    await page.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1 });
    // On the largest screen (on Nathan's Mac, the 2560 × 1440 one), where the full screen is taken.
    const { screenInfos = [] } = await page.send("Emulation.getScreenInfos").catch(() => ({}));
    const screen = screenInfos.reduce((best, info) => (!best || info.availWidth * info.availHeight > best.availWidth * best.availHeight ? info : best), null);
    viewer = spawn(chromeBin, [`--user-data-dir=${profil}`, `--app=http://127.0.0.1:${port}/`, "--start-fullscreen",
      ...(screen ? [`--window-position=${screen.availLeft + 40},${screen.availTop + 40}`] : []), "--no-first-run", "--no-default-browser-check",
      "--force-color-profile=srgb", ...(debugPort ? [`--remote-debugging-port=${debugPort}`] : [])], { stdio: "ignore" });
    viewer.on("error", (error) => say(`Vitrine : Chrome non lancé (${error.message}) ; la scène continue dans sa fenêtre.`));
    say(`Vitrine ouverte : http://127.0.0.1:${port}/ en plein écran (Ctrl+Cmd+F pour en sortir, la déplacer d'écran au besoin).`);
  } catch (error) {
    say(`Vitrine indisponible (${error.message}) : la scène continue dans sa fenêtre.`);
    server.close();
    return null;
  }
  const quantile = (values, q) => (values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(q * values.length))] : null);
  return {
    mesures: () => ({
      images_recues: frames,
      images_affichees: delays.length,
      images_par_seconde: frames > 1 ? Math.round(((frames - 1) / ((last - first) / 1000)) * 10) / 10 : null,
      delai_total_ms: { mediane: quantile(delays.map((d) => d.total), 0.5), p95: quantile(delays.map((d) => d.total), 0.95), max: quantile(delays.map((d) => d.total), 1) },
      delai_transport_ms: { mediane: quantile(delays.map((d) => d.transport), 0.5), p95: quantile(delays.map((d) => d.transport), 0.95) },
    }),
    async stop({ fermer = false } = {}) {
      await page.send("Page.stopScreencast").catch(() => {});
      for (const client of clients) client.end();
      server.close();
      if (fermer) viewer?.kill();
    },
  };
}
