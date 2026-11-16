// Cursor layer of the T7 probe, injected in every page by Page.addScriptToEvaluateOnNewDocument (see scene.mjs).
// From Nami (extension/agent-overlay.js, tag demo-oral-2026-11-08): the closed Shadow DOM with pointer-events none, the
// arrow that glides to each trusted pointerdown and stays there, the ripple.
// New here: no extension; each press is reported to the script through the CDP binding horamaPress (time, point, what
// is under the point); the last point is kept across pages; window.__horamaLayer(visible) hides the layer for captures.
(() => {
  if (window.top !== window || window.__horamaLayer) return;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `<style>
    * { pointer-events: none !important; box-sizing: border-box; }
    .cursor { position: fixed; left: 0; top: 0; width: 24px; height: 24px; opacity: 0;
      transition: transform var(--glide, 450ms) cubic-bezier(0.23, 1, 0.32, 1); filter: drop-shadow(0 1px 3px #3b176e66); }
    .ripple { position: fixed; width: 18px; height: 18px; margin: -9px; border: 2px solid #8b5cf6; border-radius: 50%;
      background: #8b5cf633; animation: ripple 400ms ease-out forwards; }
    @keyframes ripple { from { transform: scale(.5); opacity: 1; } to { transform: scale(3); opacity: 0; } }
  </style>
  <svg class="cursor" viewBox="0 0 24 24"><path d="M2 2 20 12 12 14 9 22Z" fill="#8b5cf6" stroke="white" stroke-width="1.5"/></svg>`;
  const cursor = shadow.querySelector(".cursor");
  // The script runs before the page has a root element, and the page may replace its content: attach when possible.
  const attach = () => {
    if (!host.isConnected && document.documentElement) document.documentElement.append(host);
  };
  const place = (x, y, glide) => {
    cursor.style.setProperty("--glide", glide);
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.style.opacity = "1";
  };
  // sessionStorage is refused on about:blank.
  const stored = (write) => {
    try {
      if (write) sessionStorage.setItem("horamaPoint", write);
      return sessionStorage.getItem("horamaPoint");
    } catch {
      return null;
    }
  };
  const last = (stored() ?? "").split(",").map(Number);
  if (last.length === 2 && last.every(Number.isFinite)) place(...last, "0ms");
  attach();
  document.addEventListener("DOMContentLoaded", attach);
  window.__horamaLayer = (visible) => {
    attach();
    host.style.display = visible ? "" : "none";
  };

  // The agent's clicks are trusted mouse events, like a real mouse: the cursor follows presses only, never hovering.
  window.addEventListener("pointerdown", (event) => {
    if (!event.isTrusted) return;
    attach();
    const x = event.clientX;
    const y = event.clientY;
    place(x, y, "450ms");
    stored(`${x},${y}`);
    const ring = document.createElement("div");
    ring.className = "ripple";
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
    shadow.append(ring);
    const under = document.elementFromPoint(x, y);
    const hit = under?.closest("a, summary, button") ?? under;
    window.horamaPress?.(JSON.stringify({
      heure: Date.now(),
      x,
      y,
      balise: hit ? hit.tagName.toLowerCase() : null,
      texte: hit ? (hit.innerText ?? hit.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : null,
      zone: under?.closest("[data-zone]")?.getAttribute("data-zone") ?? null,
      href: hit?.closest("a")?.getAttribute("href") ?? null,
    }));
  }, true);
})();
