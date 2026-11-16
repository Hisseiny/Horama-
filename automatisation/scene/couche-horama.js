// Horama layer, put in every page by Page.addScriptToEvaluateOnNewDocument (see installLayer in scene.mjs). Two
// characters: the cursor, an arrow that travels to each click of the agent and presses there, and the mascot, which
// floats beside what it talks about, never on it. Plus the bubble tied to the mascot, the zones drawn as with a felt
// pen (rough-notation), the banner, and the end of the course: each finding in the light, « bug » or « voulu ».
// From the cursor layer of the T7 probe (itself from Nami, extension/agent-overlay.js): the closed Shadow DOM, the
// trusted presses followed and reported through the CDP binding horamaPress, the layer hidden for a capture.
// Everything drawn lives in that Shadow DOM, and the whole state lives in sessionStorage: it survives a change of page.
// This file is one function expression: installLayer calls it with the id of the course (a new id forgets what an
// earlier course left), the title of the banner ("" in the probe: the cursor alone, shown at the first click), the
// options ({ direct }: the click is not held) and `annotate` of rough-notation.
(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate) {
  if (window.top !== window || window.__horama) return;
  // rough-notation would add its keyframes to the head of the page: they are in the Shadow DOM below instead.
  window.__rno_kf_s = true;

  // ---------- The mascot: one block per state, each replaceable by an image (see README) ----------
  const M = 96; // side of the box of a state, in px
  const INK = "#232629";
  const PAPER = "#F2EEE5";
  const VIOLET = "#7C3AED";
  const COLORS = { conforme: "#C9EE63", defaut: "#FF6E57", doute: "#F4DF73" };
  const svg = (inside) => `<svg viewBox="0 0 64 64"><path d="M32 6C47 6 58 17 58 32S47 58 32 58 6 47 6 32 17 6 32 6Z" fill="${VIOLET}" stroke="#fff" stroke-width="3"/>${inside}</svg>`;
  // The pupils (class « pupils ») are moved by the layer towards what the mascot looks at.
  const eyes = (r = 3.2) => `<g fill="#fff"><ellipse cx="23" cy="31" rx="6.2" ry="7.4"/><ellipse cx="41" cy="31" rx="6.2" ry="7.4"/></g>
    <g class="pupils" fill="${INK}"><g class="scan"><circle cx="23" cy="31" r="${r}"/><circle cx="41" cy="31" r="${r}"/></g></g>`;
  const lines = (d, colour = "#fff") => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  const badge = (colour, mark) => `<g transform="translate(51 13) scale(1.2) translate(-47 -19)"><circle cx="47" cy="19" r="8.5" fill="${colour}" stroke="#fff" stroke-width="2"/>${lines(mark, INK)}</g>`;
  const SPRITES = {
    repos: svg(eyes() + lines("M27 45q5 3.5 10 0")),
    verification: svg(eyes() + lines("M28 45.5h8")),
    interrogation: svg(eyes() + lines("M28 46q4-2.5 8 0") + badge(COLORS.doute, "M44.4 17a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.2 1-1.2 1.7M47.1 23.6h.01")),
    defaut: svg(eyes(2.2) + lines("M27 47q5-4 10 0") + badge(COLORS.defaut, "M47 14.2v5.6M47 23.4h.01")),
    conforme: svg(lines("M17.5 33q5.5-7 11 0M35.5 33q5.5-7 11 0") + lines("M26 44q6 5.5 12 0") + badge(COLORS.conforme, "M43.2 19.2l2.7 2.7 4.9-5.4")),
  };

  // ---------- Sizes and times ----------
  const TIP = { x: 7, y: 5 }; // point of the cursor arrow in its 40 px box
  const PRESS = 120; // ms the arrow stays pressed before the click is given back to the page
  const STROKE = 800; // ms to draw the line around a zone
  const GAP = 16; // between the mascot and its bubble
  const FONT = '"Avenir Next", "Helvetica Neue", Arial, sans-serif';

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `<style>
    * { pointer-events: none !important; box-sizing: border-box; }
    [hidden] { display: none !important; }
    .zones { position: absolute; left: 0; top: 0; }
    .zone { position: absolute; border-radius: 6px; transition: background-color 300ms ease-out, opacity 300ms ease-out; }
    .zone.done.doute { background: ${COLORS.doute}40; }
    .zone.done.defaut { background: ${COLORS.defaut}30; }
    .zone.old { margin: -7px; padding: 7px; box-sizing: content-box; border: 3px dashed ${INK}; background: none !important; opacity: 0; }
    .zone.old.done { opacity: 0.6; }
    .zone.old::after { content: "avant"; position: absolute; left: 50%; top: 50%; color: ${INK}; font: 600 20px/1 ${FONT}; transform: translate(-50%, -50%); }
    .zone b { position: absolute; right: 100%; top: 50%; min-width: 34px; height: 34px; margin-right: 16px; padding: 0 8px; border-radius: 17px; box-shadow: 0 0 0 2px ${INK};
      color: ${INK}; font: 700 21px/34px ${FONT}; text-align: center; opacity: 0; transform: translateY(-50%) scale(0.4); transition: opacity 200ms ease-out, transform 200ms ease-out, background-color 300ms; }
    .zone.inside b { right: auto; left: 0; top: auto; bottom: 100%; margin: 0 0 14px; transform: scale(0.4); }
    .zone.done b { opacity: 1; transform: translateY(-50%); }
    .zone.inside.done b { transform: none; }
    .zone.doute b { background: ${COLORS.doute}; }
    .zone.defaut b { background: ${COLORS.defaut}; }
    .zone.changed b { animation: bump 600ms ease-out; }
    .rough-annotation { filter: drop-shadow(0 0 0.6px ${INK}) drop-shadow(0 0 0.6px ${INK}); }
    .dim { position: fixed; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 400ms ease-out; }
    .dim.on { opacity: 1; }
    .dim path { fill: ${INK}; fill-opacity: 0.74; transition: d 450ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    .banner { position: fixed; left: 50%; top: 10px; display: flex; align-items: center; gap: 34px; height: 52px; padding: 0 28px; border-radius: 26px;
      background: ${INK}; color: ${PAPER}; font: 600 21px/1 ${FONT}; white-space: nowrap; transform: translateX(-50%); box-shadow: 0 3px 10px #23262940; }
    .banner span { display: inline-flex; align-items: center; gap: 8px; }
    .banner i { width: 14px; height: 14px; border-radius: 50%; }
    .banner .changed { animation: bump 700ms ease-out; }
    .mascot { position: fixed; left: 0; top: 0; width: ${M}px; height: ${M}px; will-change: transform; }
    .body { width: ${M}px; height: ${M}px; transform-origin: 50% 80%; filter: drop-shadow(0 3px 6px #23262966); animation: breathe 4.2s ease-in-out infinite; }
    .body > * { display: block; width: ${M}px; height: ${M}px; transform-origin: 50% 80%; }
    .pupils { transform: translate(var(--look-x, 0px), var(--look-y, 0px)); transition: transform 160ms ease-out; }
    .verification .scan { animation: read 1.1s ease-in-out infinite; }
    .interrogation .body > * { animation: tilt 260ms ease-out forwards; }
    .defaut .body > * { animation: startle 360ms ease-out; }
    .conforme .body > * { animation: nod 420ms ease-out; }
    .bubble { position: absolute; left: 0; top: 0; width: max-content; max-width: 470px; padding: 16px 22px; border-radius: 18px; background: ${INK}; color: ${PAPER};
      font: 600 26px/1.28 ${FONT}; white-space: normal; box-shadow: 0 6px 20px #23262955; opacity: 0; transform: scale(0.96); transition: opacity 180ms ease-out, transform 180ms ease-out; }
    .bubble.on { opacity: 1; transform: none; }
    .bubble::before { content: ""; position: absolute; top: var(--tail); width: 20px; height: 20px; margin-top: -10px; border-radius: 3px; background: inherit; transform: rotate(45deg); }
    .bubble.right::before { left: -8px; }
    .bubble.left::before { right: -8px; }
    .bubble.conforme { background: ${COLORS.conforme}; color: ${INK}; }
    .bubble.defaut { background: ${COLORS.defaut}; color: ${INK}; }
    .bubble.doute { background: ${COLORS.doute}; color: ${INK}; }
    .bubble.ask { max-width: 620px; padding: 24px 28px 28px; font-size: 34px; line-height: 1.2; }
    .rank { margin-bottom: 10px; font-size: 22px; opacity: 0.7; }
    .choices { display: flex; gap: 18px; margin-top: 24px; }
    .choice { flex: 1; padding: 18px 20px; border: 0; border-radius: 16px; color: ${INK}; font: 700 28px/1 ${FONT}; white-space: nowrap; pointer-events: auto !important; cursor: pointer;
      transition: opacity 200ms ease-out, transform 200ms ease-out, box-shadow 200ms ease-out; }
    .choice.bug { background: ${COLORS.defaut}; }
    .choice.voulu { background: ${COLORS.conforme}; }
    .choice:hover { transform: translateY(-2px); }
    .choices.made .choice { opacity: 0.3; pointer-events: none !important; }
    .choices.made .choice.chosen { opacity: 1; transform: scale(1.04); box-shadow: 0 0 0 5px ${PAPER}; }
    .end { position: fixed; left: 50%; top: 50%; width: 860px; padding: 40px 48px; border-radius: 24px; background: ${PAPER}; color: ${INK}; font: 600 22px/1.4 ${FONT};
      box-shadow: 0 10px 40px #23262980; opacity: 0; transform: translate(-50%, -46%); transition: opacity 300ms ease-out, transform 300ms ease-out; }
    .end.on { opacity: 1; transform: translate(-50%, -50%); }
    .end h1 { margin: 0 0 6px; font: 700 48px/1.1 ${FONT}; }
    .end p { margin: 0 0 26px; font: 600 32px/1.25 ${FONT}; }
    .end small { display: block; margin-bottom: 8px; font-size: 20px; opacity: 0.7; }
    .end li { margin: 0 0 6px 22px; font: 500 19px/1.4 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
    .end ul { margin: 0; padding: 0; }
    .cursor { position: fixed; left: 0; top: 0; width: 40px; height: 40px; will-change: transform; filter: drop-shadow(0 2px 3px #23262980); }
    .cursor svg { display: block; width: 40px; height: 40px; transform-origin: ${TIP.x}px ${TIP.y}px; transition: transform 90ms ease-out; }
    .cursor.press svg { transform: scale(0.78); }
    .ripple { position: fixed; width: 28px; height: 28px; margin: -14px; border: 3px solid ${VIOLET}; border-radius: 50%; background: ${VIOLET}33; animation: ripple 460ms ease-out forwards; }
    @keyframes rough-notation-dash { to { stroke-dashoffset: 0; } }
    @keyframes breathe { 50% { transform: translateY(-4px) scale(1.035); } }
    @keyframes read { 0%, 100% { transform: translateX(-2.6px); } 50% { transform: translateX(2.6px); } }
    @keyframes tilt { to { transform: rotate(10deg); } }
    @keyframes startle { 35% { transform: translateY(-12px); } }
    @keyframes nod { 40% { transform: translateY(5px); } }
    @keyframes ripple { from { transform: scale(0.5); opacity: 1; } to { transform: scale(3); opacity: 0; } }
    @keyframes bump { 30% { transform: scale(1.16); } }
  </style>
  <div class="zones"></div><svg class="dim"><path fill-rule="evenodd"/></svg><div class="banner" hidden></div><div class="end"></div>
  <div class="mascot" hidden><div class="body"></div><div class="bubble"></div></div>
  <div class="cursor" hidden><svg viewBox="0 0 24 24"><path d="M4.2 3v16.2l4.3-4 2.9 6.6 2.9-1.3-2.9-6.5h6.1Z" fill="${INK}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`;
  const [zonesBox, dim, banner, mascot, body, bubble, end, cursor] = ["zones", "dim", "banner", "mascot", "body", "bubble", "end", "cursor"].map((name) => shadow.querySelector(`.${name}`));
  const dimPath = dim.firstChild;

  // ---------- State, kept across pages (sessionStorage is refused on about:blank) ----------
  const stored = () => {
    try {
      const found = JSON.parse(sessionStorage.getItem("horama"));
      return found?.passage === PASSAGE ? found : null;
    } catch {
      return null;
    }
  };
  const state = stored() ?? { passage: PASSAGE, cursor: null, travel: null, mascot: null, etat: "repos", bulle: null, compteur: [0, 0, 0], zones: {}, numbers: {}, next: 1, revue: false };
  const save = () => {
    try {
      sessionStorage.setItem("horama", JSON.stringify(state));
    } catch {}
  };
  const here = () => location.pathname + location.search;
  // A bubble talks about the screen it was said on: it does not follow the agent to another one.
  if (state.bulle && state.bulle.page !== here()) state.bulle = null;
  const norm = (text) => (text ?? "").replace(/\s+/g, " ").trim();
  // No line break inside a number, nor between a quote mark or a sign and its word.
  const typo = (text) => text.replace(/« /g, "«\u00a0").replace(/ (?=[»:;?!€])/g, "\u00a0").replace(/(\d) (?=\d)/g, "$1\u00a0");
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text ?? "" });
  // A rectangle of the page (x, y, largeur, hauteur) as a box of the screen, `by` px wider on each side.
  const box = (rect, by = 0, weight = 1) => ({ left: rect.x - scrollX - by, top: rect.y - scrollY - by, right: rect.x - scrollX + rect.largeur + by, bottom: rect.y - scrollY + rect.hauteur + by, weight });
  const rounded = ({ x, y, largeur, hauteur }) => ({ x: Math.round(x), y: Math.round(y), largeur: Math.round(largeur), hauteur: Math.round(hauteur) });

  // ---------- Where things are, each frame: the cursor along its path, the mascot on its spring, its eyes ----------
  if (TITLE && !state.cursor) state.cursor = { x: Math.round(innerWidth * 0.52), y: Math.round(innerHeight * 0.62) };
  let goal = state.mascot ?? { x: innerWidth - M - 70, y: innerHeight - M - 70 };
  const at = { ...goal, vx: 0, vy: 0 };
  let cursorAt = state.cursor;
  let frame = 0;
  let last = 0;
  // A curve from one point to the other, bowed to one side, slow at both ends.
  const along = ({ from, to }, t) => {
    const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    const cx = (from.x + to.x) / 2 - (to.y - from.y) * 0.16;
    const cy = (from.y + to.y) / 2 + (to.x - from.x) * 0.16;
    return { x: (1 - e) ** 2 * from.x + 2 * (1 - e) * e * cx + e * e * to.x, y: (1 - e) ** 2 * from.y + 2 * (1 - e) * e * cy + e * e * to.y };
  };
  const putCursor = (point) => {
    cursorAt = point;
    cursor.style.transform = `translate(${point.x - TIP.x}px, ${point.y - TIP.y}px)`;
  };
  // The arrow presses where it arrives, with a ripple. Once the page has reacted (a menu that opens), the mascot checks
  // that it hides nothing.
  const land = () => {
    state.travel = null;
    save();
    if (TITLE) setTimeout(() => state.revue || stepAside(busy()), PRESS + 350);
    cursor.classList.add("press");
    setTimeout(() => cursor.classList.remove("press"), PRESS + 120);
    const ring = element("div", "ripple");
    ring.style.left = `${cursorAt.x}px`;
    ring.style.top = `${cursorAt.y}px`;
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
    shadow.append(ring);
  };
  // The eyes look at what the mascot talks about; with nothing to say, at the cursor; straight ahead when it talks to us.
  const look = () => {
    const about = state.bulle?.cible;
    const target = about ? { x: about.x - scrollX + about.largeur / 2, y: about.y - scrollY + about.hauteur / 2 } : state.bulle || state.revue ? null : cursorAt;
    const dx = target ? target.x - at.x - M / 2 : 0;
    const dy = target ? target.y - at.y - M / 2 : 0;
    const reach = (4.2 * Math.min(1, Math.hypot(dx, dy) / 80)) / (Math.hypot(dx, dy) || 1);
    mascot.style.setProperty("--look-x", `${dx * reach}px`);
    mascot.style.setProperty("--look-y", `${dy * reach}px`);
  };
  const wake = () => {
    frame ||= requestAnimationFrame(tick);
  };
  function tick(now) {
    frame = 0;
    const dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    let moving = false;
    if (state.travel) {
      const t = Math.min(1, (Date.now() - state.travel.at) / (state.travel.ms || 1));
      putCursor(along(state.travel, t));
      if (t < 1) moving = true;
      else land();
    }
    // A spring a little under critical damping: it settles without bouncing back and forth.
    at.vx += (130 * (goal.x - at.x) - 19 * at.vx) * dt;
    at.vy += (130 * (goal.y - at.y) - 19 * at.vy) * dt;
    at.x += at.vx * dt;
    at.y += at.vy * dt;
    if (Math.abs(goal.x - at.x) + Math.abs(goal.y - at.y) + Math.abs(at.vx) + Math.abs(at.vy) > 0.4) moving = true;
    else Object.assign(at, goal, { vx: 0, vy: 0 });
    mascot.style.transform = `translate(${at.x}px, ${at.y}px)`;
    look();
    if (moving) wake();
  }
  const goTo = (spot) => {
    goal = { x: spot.x, y: spot.y };
    state.mascot = goal;
    save();
    wake();
  };
  const arrived = async () => {
    for (const until = Date.now() + 900; Date.now() < until && Math.hypot(goal.x - at.x, goal.y - at.y) > 3; ) await wait(30);
  };
  const setEtat = (name) => {
    state.etat = name;
    save();
    mascot.className = `mascot ${name}`;
    body.innerHTML = SPRITES[name];
  };

  // ---------- Where the mascot stands: beside what it talks about, hiding as little as it can ----------
  // Room kept free around the cursor, or around the point where it is about to land.
  const clearance = ({ x, y }) => ({ left: x - 70, top: y - 70, right: x + 110, bottom: y + 120, weight: 60 });
  // What must stay readable: the texts and the controls of the page, and far more the zones, what the mascot points at
  // and the cursor.
  const busy = (about) => {
    const boxes = [];
    for (const control of document.querySelectorAll("a, button, summary, input, select, textarea")) {
      for (const { left, top, right, bottom } of control.getClientRects()) boxes.push({ left: left - 6, top: top - 6, right: right + 6, bottom: bottom + 6, weight: 10 });
    }
    const range = document.createRange();
    const walker = document.body && document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker?.nextNode()); ) {
      if (!node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      for (const { left, top, right, bottom } of range.getClientRects()) boxes.push({ left: left - 6, top: top - 6, right: right + 6, bottom: bottom + 6, weight: 10 });
    }
    for (const zone of state.zones[here()] ?? []) boxes.push({ ...box(zone, 24, 60), ...(zone.n && { left: zone.x - scrollX - 74 }) });
    if (about) boxes.push(box(about, 24, 60));
    if (state.cursor && !state.revue) boxes.push(clearance(state.cursor));
    return boxes;
  };
  const hidden = (left, top, width, height, boxes) => boxes.reduce((sum, { left: l, top: t, right, bottom, weight }) =>
    sum + weight * Math.max(0, Math.min(left + width, right) - Math.max(left, l)) * Math.max(0, Math.min(top + height, bottom) - Math.max(top, t)), 0);
  // The best place for the mascot and a bubble of this size on one of its sides: near `about` (failing that the cursor;
  // with `stay`, near where it already is), whole in the screen, under the banner.
  function place(about, width, height, stay) {
    const boxes = busy(about);
    const top = TITLE ? 72 : 8;
    const near = stay ? null : about ? box(about) : state.cursor && { left: state.cursor.x, top: state.cursor.y, right: state.cursor.x, bottom: state.cursor.y };
    let best = null;
    for (let y = top; y <= innerHeight - M - 8; y += 20) {
      for (let x = 8; x <= innerWidth - M - 8; x += 20) {
        for (const side of width ? ["right", "left"] : ["right"]) {
          const bx = side === "right" ? x + M + GAP : x - GAP - width;
          if (bx < 8 || bx + width > innerWidth - 8) continue;
          const by = Math.max(top, Math.min(y + M / 2 - height / 2, innerHeight - height - 8));
          const far = near ? Math.hypot(Math.max(near.left - x - M, x - near.right, 0), Math.max(near.top - y - M, y - near.bottom, 0)) : 0;
          const cost = hidden(x, y, M, M, boxes) + hidden(bx, by, width, height, boxes) + 25 * far + 4 * Math.hypot(x - goal.x, y - goal.y);
          if (!best || cost < best.cost) best = { cost, x, y, side, left: bx - x, top: by - y, tail: Math.max(24, Math.min(y + M / 2 - by, height - 24)) };
        }
      }
    }
    return best;
  }

  // ---------- Bubble: tied to the mascot, one at a time; the mascot moves first, then the bubble appears ----------
  let turn = 0;
  const choices = element("div", "choices");
  for (const [choix, label] of [["bug", "C'est un bug"], ["voulu", "C'est voulu"]]) {
    const button = element("button", `choice ${choix}`, label);
    button.addEventListener("click", (event) => event.isTrusted && window.__horama.choisir(choix));
    choices.append(button);
  }
  function layout() {
    const { bulle } = state;
    bulle.spot = place(bulle.cible, bubble.offsetWidth, bubble.offsetHeight, state.revue && !bulle.cible);
    save();
  }
  async function renderBubble(live) {
    const mine = ++turn;
    const { bulle } = state;
    if (live && bubble.classList.contains("on")) {
      bubble.classList.remove("on");
      await wait(200);
      if (mine !== turn) return;
    }
    if (!bulle) return void bubble.classList.remove("on");
    bubble.className = `bubble ${bulle.genre}${bulle.question ? " ask" : ""}`;
    if (bulle.question) {
      choices.className = "choices";
      for (const button of choices.children) button.classList.remove("chosen");
      bubble.replaceChildren(element("div", "rank", bulle.question.rang), element("div", "", typo(bulle.question.texte)), choices);
    } else bubble.textContent = typo(bulle.texte);
    if (live || !bulle.spot) layout();
    const { spot } = bulle;
    bubble.classList.add(spot.side);
    bubble.style.left = `${spot.left}px`;
    bubble.style.top = `${spot.top}px`;
    bubble.style.setProperty("--tail", `${spot.tail}px`);
    goTo(spot);
    if (live) await arrived();
    if (mine !== turn) return;
    look();
    bubble.classList.add("on");
    if (live) await wait(200);
  }
  // The mascot steps aside when it or its bubble hides one of these boxes: where the cursor is about to land, or what
  // a page shows once it has opened or reacted.
  const stepAside = (boxes) => {
    const spot = state.bulle?.spot;
    if (hidden(goal.x, goal.y, M, M, boxes) + (spot ? hidden(goal.x + spot.left, goal.y + spot.top, bubble.offsetWidth, bubble.offsetHeight, boxes) : 0) === 0) return;
    if (!spot) return goTo(place(null, 0, 0, true));
    layout();
    renderBubble(false);
  };

  // ---------- Zones (page coordinates): a line drawn around each one, then its number ----------
  const drawn = [];
  const zoneClass = (zone) => `zone ${zone.genre}${zone.trait ? " old" : ""}${zone.x < 70 ? " inside" : ""}`;
  async function drawZone(zone, animate) {
    const frameOf = element("div", zoneClass(zone));
    frameOf.style.cssText = `left:${zone.x}px;top:${zone.y}px;width:${zone.largeur}px;height:${zone.hauteur}px`;
    zonesBox.append(frameOf);
    const item = { zone, element: frameOf };
    drawn.push(item);
    if (zone.trait) {
      // Where the thing used to be: a dashed frame, which fades in.
      void frameOf.offsetWidth;
      frameOf.classList.add("done");
      return animate && wait(300);
    }
    frameOf.append(element("b", "", zone.n));
    item.annotation = annotate(frameOf, { type: "box", color: COLORS[zone.genre], strokeWidth: 4.5, padding: 7, iterations: 2, animate, animationDuration: STROKE });
    item.annotation.show();
    if (animate) await wait(STROKE);
    frameOf.classList.add("done");
    if (animate) await wait(250);
  }
  const follow = () => {
    zonesBox.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
    if (state.revue) renderDim();
  };

  // ---------- Banner ----------
  const renderBanner = (before = state.compteur) => {
    banner.hidden = !TITLE;
    const words = [["bon", "bons", COLORS.conforme], ["problème", "problèmes", COLORS.defaut], ["doute", "doutes", COLORS.doute]];
    banner.replaceChildren(element("span", "", TITLE), ...words.map(([one, many, colour], index) => {
      const count = state.compteur[index];
      const item = element("span", count === before[index] ? "" : "changed", ` ${count} ${count > 1 ? many : one}`);
      item.prepend(Object.assign(element("i"), { style: `background:${colour}` }));
      return item;
    }));
  };

  // ---------- End of the course: the page goes dark except the zones of one finding ----------
  let holes = [];
  function renderDim(opening) {
    dim.classList.toggle("on", state.revue);
    const hole = (zone, k) => {
      const w = (zone.largeur + 32) * k;
      const h = (zone.hauteur + 32) * k;
      const r = Math.min(12, w / 2, h / 2);
      return `M${zone.x - scrollX + zone.largeur / 2 - w / 2 + r} ${zone.y - scrollY + zone.hauteur / 2 - h / 2}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
    };
    const path = (k) => `path("M0 0H${innerWidth}V${innerHeight}H0Z${holes.map((zone) => hole(zone, k)).join("")}")`;
    if (opening) {
      dimPath.style.transition = "none";
      dimPath.style.d = path(0.05);
      void dimPath.getBoundingClientRect();
      dimPath.style.transition = "";
    }
    dimPath.style.d = path(1);
  }

  // The script runs before the page has a root element, and the page may replace its content: attach when possible.
  let started = false;
  const attach = () => {
    if (host.isConnected || !document.documentElement) return;
    document.documentElement.append(host);
    follow();
    if (started) return;
    // Once: what the page shows when it opens. The lines of a screen already annotated are there, not drawn again.
    started = true;
    for (const zone of state.zones[here()] ?? []) drawZone(zone, false);
    if (state.bulle) renderBubble(false);
  };
  new MutationObserver(attach).observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => {
    attach();
    if (TITLE && !state.revue) stepAside(busy());
  });
  window.addEventListener("scroll", follow, true);

  renderBanner();
  renderDim();
  setEtat(state.etat);
  mascot.hidden = !TITLE;
  cursor.hidden = !state.cursor || state.revue;
  if (state.cursor) putCursor(state.travel ? state.travel.from : state.cursor);
  mascot.style.transform = `translate(${at.x}px, ${at.y}px)`;
  wake();
  attach();

  // ---------- Commands called by the script (CDP Runtime.evaluate; a promise is awaited) ----------
  window.__horama = {
    // repos, verification, interrogation, defaut, conforme.
    etat: setEtat,
    // One bubble at a time, null to hide it. genre: "", "conforme", "defaut" or "doute" (its colour). cible: the rectangle
    // of the page the mascot talks about and stands beside; none: the cursor. Resolves once the bubble is shown.
    bulle(texte, genre = "", cible = null) {
      state.bulle = texte ? { texte, genre, cible, page: here() } : null;
      save();
      return renderBubble(true);
    },
    compteur(bons, problemes, doutes) {
      const before = state.compteur;
      state.compteur = [bons, problemes, doutes];
      save();
      renderBanner(before);
    },
    // Rectangles of the text of the elements whose displayed text is exactly `texte` (the smallest element that holds it).
    trouver(texte) {
      const wanted = norm(texte);
      if (!wanted) return [];
      return [...document.body.querySelectorAll("*")]
        .filter((candidate) => norm(candidate.innerText) === wanted && ![...candidate.children].some((child) => norm(child.innerText) === wanted))
        .map((candidate) => {
          const range = document.createRange();
          range.selectNodeContents(candidate);
          const { left, top, width, height } = range.getBoundingClientRect();
          return rounded({ x: left + scrollX, y: top + scrollY, largeur: width, hauteur: height });
        })
        .filter((rect) => rect.largeur > 0 && rect.hauteur > 0);
    },
    // The element at the centre of a zone: its displayed text ("" when it is none or a whole block of the page) and the
    // rectangle that holds both the zone and that text, so that a line is drawn around the whole value, not half of it.
    autour(zone) {
      const found = document.elementFromPoint(zone.x + zone.largeur / 2 - scrollX, zone.y + zone.hauteur / 2 - scrollY);
      const texte = norm(found?.innerText);
      if (!texte || texte.length > 40) return { texte: "", cadre: zone };
      const range = document.createRange();
      range.selectNodeContents(found);
      const { left, top, right, bottom } = range.getBoundingClientRect();
      const x = Math.min(zone.x, left + scrollX);
      const y = Math.min(zone.y, top + scrollY);
      return { texte, cadre: rounded({ x, y, largeur: Math.max(zone.x + zone.largeur, right + scrollX) - x, hauteur: Math.max(zone.y + zone.hauteur, bottom + scrollY) - y }) };
    },
    // Draws a line around rectangles of the page `adresse` (pathname and search), for the finding `id`; genre: "doute" or
    // "defaut"; avant: where the thing used to be, framed with dashes. Kept for when the page is that address again;
    // drawn now when it is this page, the line first, then the number. Returns the number.
    async surligner(adresse, rects, genre, id, avant) {
      const n = (state.numbers[id] ??= state.next++);
      if ((state.zones[adresse] ?? []).some((zone) => zone.id === id)) return n;
      const zones = [...rects.map((rect) => ({ id, n, genre, ...rounded(rect) })), ...(avant ? [{ id, genre, trait: "pointille", ...rounded(avant) }] : [])];
      (state.zones[adresse] ??= []).push(...zones);
      save();
      if (adresse !== here()) return n;
      attach();
      // The mascot moves away first when it stands on what is about to be drawn.
      if (hidden(goal.x, goal.y, M, M, zones.map((zone) => box(zone, 14))) > 0) {
        goTo(place(zones[0], 0, 0));
        await arrived();
      }
      await Promise.all(zones.filter((zone) => !zone.trait).map((zone) => drawZone(zone, true)));
      for (const zone of zones.filter((candidate) => candidate.trait)) await drawZone(zone, true);
      return n;
    },
    // A doubt that became a proven defect (or the reverse): its line and its number change colour, on every page.
    requalifier(id, genre) {
      for (const zone of Object.values(state.zones).flat()) if (zone.id === id) zone.genre = genre;
      save();
      for (const item of drawn.filter((candidate) => candidate.zone.id === id)) {
        item.element.className = `${zoneClass(item.zone)} done changed`;
        if (item.annotation) item.annotation.color = COLORS[genre];
      }
    },
    // End of the course. revue(true): the page goes dark, the cursor leaves, clicks on the page are ignored.
    revue(on) {
      state.revue = on;
      holes = [];
      save();
      cursor.hidden = on || !state.cursor;
      renderDim();
    },
    // One finding in the light, its question in large with the two buttons. rang: « 1 sur 3 ». The answer comes back
    // through the CDP binding horamaChoix, from a real click on a button or from choisir().
    async question({ id, texte, rang, etat }) {
      const mine = (state.zones[here()] ?? []).filter((zone) => zone.id === id);
      const about = mine.find((zone) => !zone.trait) ?? null;
      if (about) scrollTo(0, Math.max(0, about.y - innerHeight / 2));
      this.revue(true);
      holes = mine;
      renderDim(true);
      setEtat(etat);
      state.bulle = { question: { id, texte, rang }, genre: "", cible: about, page: here() };
      save();
      await wait(450);
      return renderBubble(true);
    },
    choisir(choix) {
      const id = state.bulle?.question?.id;
      if (!id || choices.classList.contains("made")) return;
      choices.classList.add("made");
      choices.querySelector(`.${choix}`).classList.add("chosen");
      window.horamaChoix?.(JSON.stringify({ id, choix }));
    },
    // Last screen: what was written. { titre, compte, legende, fichiers }.
    async fin({ titre, compte, legende, fichiers }) {
      await this.bulle(null);
      this.revue(true);
      const list = element("ul");
      list.append(...fichiers.map((file) => element("li", "", file)));
      end.replaceChildren(element("h1", "", titre), element("p", "", compte), element("small", "", legende), list);
      end.classList.add("on");
      setEtat("conforme");
      const panel = end.getBoundingClientRect();
      goTo({ x: Math.max(8, innerWidth / 2 - 430 - M * 0.55), y: Math.max(72, innerHeight / 2 - panel.height / 2 - M * 0.6) });
    },
    masquer() {
      host.style.setProperty("display", "none", "important");
    },
    montrer() {
      attach();
      host.style.setProperty("display", "block", "important");
    },
  };

  // ---------- The clicks of the agent ----------
  // They are trusted mouse events, like a real mouse. The layer holds each one in the capture phase, lets the cursor
  // travel to it, then gives it back to the same element at the same point. With OPTIONS.direct nothing is held: the
  // cursor follows. While the human decides (revue), a click on the page is ignored; the buttons of the layer get theirs.
  let held = null;
  const replay = () => {
    const { target, x, y, since, heure } = held;
    clearTimeout(held.timer);
    held = null;
    window.horamaPress?.(JSON.stringify({ rejoue: heure, retard_ms: Math.round(performance.now() - since) }));
    const on = target.isConnected ? target : document.elementFromPoint(x, y);
    const init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0, detail: 1 };
    on?.dispatchEvent(new PointerEvent("pointerdown", { ...init, buttons: 1, pointerId: 1, isPrimary: true }));
    on?.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }));
    on?.closest?.("input, textarea, select, [contenteditable]")?.focus();
    on?.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerId: 1, isPrimary: true }));
    on?.dispatchEvent(new MouseEvent("mouseup", init));
    on?.dispatchEvent(new MouseEvent("click", init));
  };
  const press = (event) => {
    attach();
    if (held) replay();
    const to = { x: event.clientX, y: event.clientY };
    const from = cursorAt ?? to;
    const ms = cursorAt ? Math.round(Math.min(800, 500 + 0.4 * Math.hypot(to.x - from.x, to.y - from.y))) : 0;
    const heure = Date.now();
    state.travel = { from, to, at: heure, ms };
    state.cursor = to;
    save();
    cursor.hidden = false;
    if (TITLE) stepAside([clearance(to)]);
    wake();
    if (!OPTIONS.direct) held = { target: event.target, ...to, heure, since: performance.now(), timer: setTimeout(replay, ms + PRESS) };
    const under = document.elementFromPoint(to.x, to.y);
    const hit = under?.closest("a, summary, button") ?? under;
    window.horamaPress?.(JSON.stringify({
      heure,
      ...to,
      balise: hit ? hit.tagName.toLowerCase() : null,
      texte: hit ? (hit.innerText ?? hit.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) : null,
      zone: under?.closest("[data-zone]")?.getAttribute("data-zone") ?? null,
      href: hit?.closest("a")?.getAttribute("href") ?? null,
      trajet_ms: ms,
    }));
  };
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    window.addEventListener(type, (event) => {
      if (!event.isTrusted || event.button !== 0 || event.target === host) return;
      if (!state.revue && type === "pointerdown") press(event);
      if (state.revue || !OPTIONS.direct) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }
})
