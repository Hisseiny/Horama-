// Horama layer, put in every page by Page.addScriptToEvaluateOnNewDocument (see installLayer in scene.mjs): the mascot
// that lands where the agent clicks, its bubble, the highlighted zones and the banner.
// From the cursor layer of the T7 probe (itself from Nami, extension/agent-overlay.js): the closed Shadow DOM with
// pointer-events none, the glide to each trusted pointerdown, the ripple, each press reported through the CDP binding
// horamaPress, the layer hidden for the time of a capture.
// New here: the mascot and its states, the bubble, the zones kept per page address, the banner, the commands of
// window.__horama, and the whole state kept in sessionStorage so that it survives a change of page.
// This file is one function expression: installLayer calls it with the id of the course (a new id forgets what an
// earlier course left in sessionStorage) and the title of the banner ("" in the probe: no banner, and the mascot only
// appears at the first click).
(function horamaLayer(PASSAGE, TITLE) {
  if (window.top !== window || window.__horama) return;

  // ---------- The mascot: one block per state, each replaceable by an image (see README) ----------
  const SIZE = 56; // side of the box of a state, in px
  const ANCHOR = { x: 2, y: 2 }; // point of that box put exactly on the click: the tip of the drop
  const GLIDE = 450;
  const INK = "#232629";
  const COLORS = { conforme: "#C9EE63", defaut: "#FF6E57", doute: "#F4DF73" };
  const svg = (inside) => `<svg viewBox="0 0 56 56" width="${SIZE}" height="${SIZE}"><path d="M2 2 33.3 16.1A19 19 0 1 1 16.1 33.3Z" fill="#7C3AED" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>${inside}</svg>`;
  const eyes = (dx, dy, r = 2.4) => `<g fill="#fff"><ellipse cx="28.5" cy="34" rx="4.6" ry="5.6"/><ellipse cx="41.5" cy="34" rx="4.6" ry="5.6"/></g>
    <g class="pupils" fill="${INK}"><circle cx="${28.5 + dx}" cy="${34 + dy}" r="${r}"/><circle cx="${41.5 + dx}" cy="${34 + dy}" r="${r}"/></g>`;
  const lines = (d, colour = "#fff") => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const badge = (colour, mark) => `<circle cx="47" cy="19" r="8.5" fill="${colour}" stroke="#fff" stroke-width="2"/><g class="mark">${lines(mark, INK)}</g>`;
  const SPRITES = {
    repos: svg(eyes(0, 0)),
    deplacement: svg(eyes(-2, -2.2)),
    clic: svg(lines("M25 31.5l6 2.5-6 2.5M45 31.5l-6 2.5 6 2.5")),
    verification: svg(eyes(0, 1.9)),
    interrogation: svg(eyes(1.9, -2.4) + badge(COLORS.doute, "M44.4 17a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.2 1-1.2 1.7M47.1 23.6h.01")),
    defaut: svg(eyes(0, 0, 1.6) + badge(COLORS.defaut, "M47 14.2v5.6M47 23.4h.01")),
    conforme: svg(lines("M24.5 36q4-5.5 8 0M37.5 36q4-5.5 8 0") + badge(COLORS.conforme, "M43.2 19.2l2.7 2.7 4.9-5.4")),
  };

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `<style>
    * { pointer-events: none !important; box-sizing: border-box; }
    [hidden] { display: none !important; }
    .zones { position: absolute; left: 0; top: 0; }
    .zone { position: absolute; border: 3px solid; border-radius: 6px; box-shadow: 0 0 0 1.5px ${INK}; }
    .zone.doute { border-color: ${COLORS.doute}; background: ${COLORS.doute}47; }
    .zone.defaut { border-color: ${COLORS.defaut}; background: ${COLORS.defaut}33; }
    .zone.new { animation: pose 240ms ease-out; }
    .zone b { position: absolute; right: 100%; top: 50%; min-width: 24px; height: 24px; margin-right: 8px; padding: 0 6px; border-radius: 12px;
      box-shadow: 0 0 0 1.5px ${INK}; color: ${INK}; font: 700 15px/24px "Avenir Next", "Helvetica Neue", Arial, sans-serif; text-align: center; transform: translateY(-50%); }
    .zone.inside b { right: auto; left: 4px; top: 4px; margin: 0; transform: none; }
    .zone.doute b { background: ${COLORS.doute}; }
    .zone.defaut b { background: ${COLORS.defaut}; }
    .banner { position: fixed; left: 50%; top: 10px; display: flex; align-items: center; gap: 12px; height: 34px; padding: 0 14px; border-radius: 17px;
      background: ${INK}; color: #F2EEE5; font: 600 13px/1 "Avenir Next", "Helvetica Neue", Arial, sans-serif; white-space: nowrap; transform: translateX(-50%); box-shadow: 0 2px 8px #23262940; }
    .banner i { display: inline-block; width: 9px; height: 9px; margin-right: 5px; border-radius: 50%; }
    .mascot { position: fixed; left: 0; top: 0; width: ${SIZE}px; height: ${SIZE}px; transition: transform ${GLIDE}ms cubic-bezier(0.23, 1, 0.32, 1); filter: drop-shadow(0 2px 4px #23262966); }
    .side, .body { width: ${SIZE}px; height: ${SIZE}px; transform-origin: ${ANCHOR.x}px ${ANCHOR.y}px; }
    .mirror .side, .mirror .mark { transform: scaleX(-1); }
    .mark { transform-origin: 47px 19px; }
    .body > * { display: block; width: ${SIZE}px; height: ${SIZE}px; }
    .repos .body { animation: breathe 3.2s ease-in-out infinite; }
    .clic .body { animation: squash 260ms ease-out; }
    .verification .pupils { animation: read 1.1s ease-in-out infinite; }
    .interrogation .body { animation: tilt 220ms ease-out forwards; }
    .defaut .body { animation: startle 320ms ease-out; }
    .conforme .body { animation: nod 380ms ease-out; }
    .ripple { position: fixed; width: 22px; height: 22px; margin: -11px; border: 2.5px solid #7C3AED; border-radius: 50%; background: #7C3AED33; animation: ripple 420ms ease-out forwards; }
    .bubble { position: fixed; left: 0; top: 0; max-width: 440px; padding: 12px 16px 12px 14px; border-left: 6px solid #F2EEE5; border-radius: 12px; background: ${INK}; color: #F2EEE5;
      font: 600 20px/1.3 "Avenir Next", "Helvetica Neue", Arial, sans-serif; white-space: normal; box-shadow: 0 4px 14px #23262955; opacity: 0; transition: opacity 180ms ease-out; }
    .link { position: fixed; left: 0; top: -2px; height: 4px; border-radius: 2px; background: ${INK}; transform-origin: 0 50%; opacity: 0; transition: opacity 180ms ease-out; }
    .bubble.on, .link.on { opacity: 1; }
    @keyframes breathe { 50% { transform: scale(1.04); } }
    @keyframes squash { 40% { transform: scale(1.14, 0.8); } }
    @keyframes read { 0%, 100% { transform: translateX(-2.2px); } 50% { transform: translateX(2.2px); } }
    @keyframes tilt { to { transform: rotate(11deg); } }
    @keyframes startle { 35% { transform: translateY(-9px); } }
    @keyframes nod { 40% { transform: translateY(3px); } }
    @keyframes ripple { from { transform: scale(0.5); opacity: 1; } to { transform: scale(3); opacity: 0; } }
    @keyframes pose { from { opacity: 0; transform: scale(1.08); } }
  </style>
  <div class="zones"></div><div class="banner" hidden></div><div class="link"></div><div class="mascot" hidden><div class="side"><div class="body"></div></div></div><div class="bubble"></div>`;
  const [zonesBox, banner, link, mascot, bubble] = ["zones", "banner", "link", "mascot", "bubble"].map((name) => shadow.querySelector(`.${name}`));
  const body = mascot.querySelector(".body");

  // ---------- State, kept across pages (sessionStorage is refused on about:blank) ----------
  const stored = () => {
    try {
      const found = JSON.parse(sessionStorage.getItem("horama"));
      return found?.passage === PASSAGE ? found : null;
    } catch {
      return null;
    }
  };
  const state = stored() ?? { passage: PASSAGE, point: null, from: null, pressedAt: 0, etat: "repos", until: 0, bulle: null, compteur: [0, 0, 0], zones: {}, next: 1 };
  const save = () => {
    try {
      sessionStorage.setItem("horama", JSON.stringify(state));
    } catch {}
  };
  const here = () => location.pathname + location.search;
  const norm = (text) => (text ?? "").replace(/\s+/g, " ").trim();

  // ---------- Mascot ----------
  let shown = "";
  let moving = 0;
  let reverting = 0;
  let mirror = false;
  const show = (name) => {
    shown = name;
    mascot.className = `mascot ${name}${mirror ? " mirror" : ""}`;
    body.innerHTML = SPRITES[name];
  };
  // What must stay readable: the texts displayed by the page, and the zones (which weigh ten times more).
  const busy = () => {
    const boxes = [];
    const keep = (box) => boxes.push({ left: box.left - 4, top: box.top - 4, right: box.right + 4, bottom: box.bottom + 4, weight: 1 });
    const range = document.createRange();
    const walker = document.body && document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker?.nextNode()); ) {
      if (!node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      for (const box of range.getClientRects()) keep(box);
    }
    for (const zone of state.zones[here()] ?? []) {
      boxes.push({ left: zone.x - scrollX - 40, top: zone.y - scrollY - 8, right: zone.x - scrollX + zone.largeur + 8, bottom: zone.y - scrollY + zone.hauteur + 8, weight: 10 });
    }
    return boxes;
  };
  const hidden = (left, top, width, height, boxes) => boxes.reduce((sum, box) =>
    sum + box.weight * Math.max(0, Math.min(left + width, box.right) - Math.max(left, box.left)) * Math.max(0, Math.min(top + height, box.bottom) - Math.max(top, box.top)), 0);
  // The round body hangs to the right of the click, or to the left (the image mirrored) when the right side hides more.
  const settle = () => {
    if (!state.point) return;
    const boxes = busy();
    const { x, y } = state.point;
    const before = mirror;
    mirror = x - SIZE >= 0 && hidden(x - SIZE + ANCHOR.x, y + 12, 40, 42, boxes) < hidden(x + 14 - ANCHOR.x, y + 12, 40, 42, boxes);
    if (mirror !== before) mascot.classList.toggle("mirror", mirror);
    placeBubble(boxes);
  };
  const moveTo = ({ x, y }) => {
    mascot.style.transform = `translate(${x - ANCHOR.x}px, ${y - ANCHOR.y}px)`;
  };
  const jumpTo = (point) => {
    mascot.style.transition = "none";
    moveTo(point);
    void mascot.offsetWidth;
    mascot.style.transition = "";
  };
  // Glides to the point of the press, squashes there with a ripple, then takes back the state asked by the script.
  const travel = () => {
    clearTimeout(moving);
    mascot.hidden = false;
    show("deplacement");
    moveTo(state.point);
    placeBubble();
    moving = setTimeout(() => {
      show("clic");
      const ring = document.createElement("div");
      ring.className = "ripple";
      ring.style.left = `${state.point.x}px`;
      ring.style.top = `${state.point.y}px`;
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      shadow.append(ring);
      settle();
      moving = setTimeout(() => show(state.etat), 260);
    }, state.from ? GLIDE : 0);
  };
  const setEtat = (name) => {
    state.etat = name;
    state.until = name === "conforme" ? Date.now() + 1000 : 0;
    save();
    if (shown !== "deplacement" && shown !== "clic") show(name);
    revertLater();
  };
  const revertLater = () => {
    clearTimeout(reverting);
    if (state.until) reverting = setTimeout(() => setEtat("repos"), Math.max(0, state.until - Date.now()));
  };

  // ---------- Bubble: as near the mascot as it can be without hiding a text or a zone, never out of the screen ----------
  let fading = 0;
  function placeBubble(boxes = busy()) {
    if (!state.point || !bubble.classList.contains("on")) return;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const left = mirror ? state.point.x + ANCHOR.x - SIZE : state.point.x - ANCHOR.x;
    const top = state.point.y - ANCHOR.y;
    const all = [...boxes, { left: left - 8, top: top - 8, right: left + SIZE + 8, bottom: top + SIZE + 8, weight: 50 }];
    let best = [8, TITLE ? 52 : 8];
    let least = Infinity;
    for (let y = best[1]; y <= innerHeight - height - 8; y += 16) {
      for (let x = 8; x <= innerWidth - width - 8; x += 16) {
        const away = Math.hypot(Math.max(left - x - width, x - left - SIZE, 0), Math.max(top - y - height, y - top - SIZE, 0));
        const cost = hidden(x, y, width, height, all) + 4 * away + 0.02 * away * away;
        if (cost < least) [best, least] = [[x, y], cost];
      }
    }
    bubble.style.transform = `translate(${best[0]}px, ${best[1]}px)`;
    // A line ties the bubble to the round body of the mascot when it had to go further.
    const from = { x: left + (mirror ? SIZE - 35 : 35), y: top + 35 };
    const to = { x: Math.max(best[0], Math.min(from.x, best[0] + width)), y: Math.max(best[1], Math.min(from.y, best[1] + height)) };
    link.style.width = `${Math.hypot(to.x - from.x, to.y - from.y)}px`;
    link.style.transform = `translate(${from.x}px, ${from.y}px) rotate(${Math.atan2(to.y - from.y, to.x - from.x)}rad)`;
  }
  function renderBubble() {
    clearTimeout(fading);
    const { bulle } = state;
    const on = Boolean(bulle) && (!bulle.fin || bulle.fin > Date.now());
    if (on) {
      bubble.textContent = bulle.texte;
      bubble.style.borderColor = COLORS[bulle.genre] ?? "#F2EEE5";
      if (bulle.fin) fading = setTimeout(renderBubble, bulle.fin - Date.now());
    }
    bubble.classList.toggle("on", on);
    link.classList.toggle("on", on);
    settle();
  }

  // ---------- Zones (page coordinates) and banner ----------
  const zoneElement = (zone, isNew) => {
    const element = document.createElement("div");
    element.className = `zone ${zone.genre}${isNew ? " new" : ""}${zone.x < 44 ? " inside" : ""}`;
    element.style.cssText = `left:${zone.x - 4}px;top:${zone.y - 4}px;width:${zone.largeur + 8}px;height:${zone.hauteur + 8}px`;
    element.append(Object.assign(document.createElement("b"), { textContent: zone.n }));
    return element;
  };
  const follow = () => {
    zonesBox.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
    settle();
  };
  const renderBanner = () => {
    banner.hidden = !TITLE;
    const item = (colour, count, one, many) => `<span><i style="background:${colour}"></i>${count} ${count > 1 ? many : one}</span>`;
    banner.innerHTML = `<span></span>${item(COLORS.conforme, state.compteur[0], "conforme", "conformes")}${item(COLORS.defaut, state.compteur[1], "défaut prouvé", "défauts prouvés")}${item(COLORS.doute, state.compteur[2], "doute", "doutes")}`;
    banner.firstChild.textContent = TITLE;
  };

  // The script runs before the page has a root element, and the page may replace its content: attach when possible.
  const attach = () => {
    if (host.isConnected || !document.documentElement) return;
    document.documentElement.append(host);
    follow();
  };
  new MutationObserver(attach).observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => {
    attach();
    settle();
  });
  window.addEventListener("load", settle);
  window.addEventListener("scroll", follow, true);
  window.addEventListener("resize", settle);

  // ---------- What the page shows when it opens ----------
  if (TITLE && !state.point) state.point = { x: innerWidth - 150, y: innerHeight - 150 };
  zonesBox.replaceChildren(...(state.zones[here()] ?? []).map((zone) => zoneElement(zone, false)));
  renderBanner();
  if (state.point) {
    // A press that opened this page: the glide it started is played again here, from where the mascot was.
    const arriving = state.from && Date.now() - state.pressedAt < 1200;
    jumpTo(arriving ? state.from : state.point);
    mascot.hidden = false;
    show(state.until && state.until < Date.now() ? (state.etat = "repos") : state.etat);
    revertLater();
    if (arriving) requestAnimationFrame(() => requestAnimationFrame(travel));
  }
  attach();
  renderBubble();

  // ---------- Commands called by the script (CDP Runtime.evaluate) ----------
  window.__horama = {
    // repos, verification, interrogation, defaut, conforme (back to repos after 1 s). deplacement and clic are played by the presses.
    etat: setEtat,
    etatAffiche: () => shown,
    // One bubble at a time. genre: "", "conforme", "defaut" or "doute" (colour of its edge). ms: time before it fades, none: it stays.
    bulle(texte, genre, ms) {
      state.bulle = texte ? { texte, genre, fin: ms ? Date.now() + ms : 0 } : null;
      save();
      renderBubble();
    },
    compteur(conformes, defauts, doutes) {
      state.compteur = [conformes, defauts, doutes];
      save();
      renderBanner();
    },
    // Rectangles of the text of the elements whose displayed text is exactly `texte` (the smallest element that holds it).
    trouver(texte) {
      const wanted = norm(texte);
      if (!wanted) return [];
      return [...document.body.querySelectorAll("*")]
        .filter((element) => norm(element.innerText) === wanted && ![...element.children].some((child) => norm(child.innerText) === wanted))
        .map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const box = range.getBoundingClientRect();
          return { x: Math.round(box.left + scrollX), y: Math.round(box.top + scrollY), largeur: Math.round(box.width), hauteur: Math.round(box.height) };
        })
        .filter((box) => box.largeur > 0 && box.hauteur > 0);
    },
    // Displayed text of the element at the centre of a zone, "" when it is none or a whole block of the page.
    autour(zone) {
      const text = norm(document.elementFromPoint(zone.x + zone.largeur / 2 - scrollX, zone.y + zone.hauteur / 2 - scrollY)?.innerText);
      return text.length <= 40 ? text : "";
    },
    // Highlights a rectangle of this page; genre: "doute" or "defaut". Returns the number of the zone.
    surligner(rect, genre) {
      const zone = { n: state.next++, genre, x: Math.round(rect.x), y: Math.round(rect.y), largeur: Math.round(rect.largeur), hauteur: Math.round(rect.hauteur) };
      (state.zones[here()] ??= []).push(zone);
      save();
      attach();
      zonesBox.append(zoneElement(zone, true));
      settle();
      return zone.n;
    },
    surlignerTexte(texte, genre) {
      const rects = this.trouver(texte);
      for (const rect of rects) this.surligner(rect, genre);
      return rects;
    },
    masquer() {
      host.style.setProperty("display", "none", "important");
    },
    montrer() {
      attach();
      host.style.setProperty("display", "block", "important");
    },
  };

  // The agent's clicks are trusted mouse events, like a real mouse: the mascot follows presses only, never hovering.
  window.addEventListener("pointerdown", (event) => {
    if (!event.isTrusted) return;
    attach();
    const x = event.clientX;
    const y = event.clientY;
    state.from = state.point;
    state.point = { x, y };
    state.pressedAt = Date.now();
    save();
    if (!state.from) jumpTo(state.point);
    travel();
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
})
