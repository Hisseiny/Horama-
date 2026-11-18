// Horama layer, put in every page by Page.addScriptToEvaluateOnNewDocument (see installLayer in scene.mjs). Two
// characters: the cursor, an arrow that travels to each click of the agent and presses there, and the mascot, which
// waits in a corner and changes its look. While the agent works, nothing else: no text, no label, no counter; a line
// drawn as with a felt pen (rough-notation) rings what is wrong, at the moment it is found. All the text comes at the
// end, in a panel: the summary (the choice of the tests, each defect and doubt with its capture ringed), each question
// « bug » or « voulu », the correction of a note in the bubble of the mascot, and what was written.
// From the cursor layer of the T7 probe (itself from Nami, extension/agent-overlay.js): the closed Shadow DOM, the
// trusted presses followed and reported through the CDP binding horamaPress, the layer hidden for a capture.
// Everything drawn lives in that Shadow DOM, and the whole state lives in sessionStorage: it survives a change of page.
// The script runs in the isolated world « horama » of the page: the page's own code reaches neither window.__horama
// nor the bindings horamaPress and horamaChoix, which only exist in that world.
// This file is one function expression: installLayer calls it with the id of the course (a new id forgets what an
// earlier course left), a title ("" in the probe: the cursor alone, shown at the first click, no mascot), the options
// ({ direct }: the click is not held), `annotate` of rough-notation and the expressions of the mascot (MASCOT: one SVG
// per expression, docs/da/mascotte/, read by installLayer).
(function horamaLayer(PASSAGE, TITLE, OPTIONS, annotate, MASCOT) {
  if (window.top !== window || window.__horama) return;
  // rough-notation would add its keyframes to the head of the page: they are in the Shadow DOM below instead.
  window.__rno_kf_s = true;

  // ---------- The mascot: the eye with wings of Inès (docs/da/mascotte/, PR #116), one drawing per expression ----------
  // Skeleton (issue #69): the colours below are provisional and neutral; the art direction comes after, by /taste.
  const M = 96; // side of the box of an expression, in px: the drawings share its frame, an expression never jumps
  const INK = "#1C1C1C";
  const PAPER = "#FFFFFF";
  const GREY = "#6B6B6B";
  const IRIS = "#7F77DD"; // iris of the mascot, for the ripple of a click
  // One colour for a proven defect, another for a doubt.
  const COLORS = { conforme: "#2E9E5B", defaut: "#E5484D", doute: "#E8A33D" };
  const STAMPS = { bug: "Bug noté", voulu: "Voulu" };
  // observe (the course), hesite (just before a click of the agent), trouve (a proven defect ringed), doute (a finding of
  // Holo), bloquee (the course stops for a reason), fini (the summary opens). The names of the first skeleton still work.
  const ALIASES = { repos: "observe", verification: "observe", interrogation: "doute", defaut: "trouve", conforme: "fini" };
  const expression = (name) => (MASCOT[name] ? name : ALIASES[name] ?? "observe");

  // ---------- Sizes and times ----------
  const TIP = { x: 7, y: 5 }; // point of the cursor arrow in its 40 px box
  const PRESS = 120; // ms the arrow stays pressed before the click is given back to the page
  const STROKE = 800; // ms to draw the line around a zone
  const GAP = 16; // between the mascot and its bubble
  const FONT = '"Segoe UI", "Avenir Next", Arial, sans-serif';
  const PANEL = 1000; // width of the panel of the end

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `<style>
    * { pointer-events: none !important; box-sizing: border-box; }
    [hidden] { display: none !important; }
    .zones { position: absolute; left: 0; top: 0; }
    .zone { position: absolute; }
    .zone.old { margin: -7px; padding: 7px; box-sizing: content-box; border: 3px dashed ${GREY}; opacity: 0; transition: opacity 300ms ease-out; }
    .zone.old.done { opacity: 0.6; }
    .dim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); opacity: 0; transition: opacity 400ms ease-out; }
    .dim.on { opacity: 1; }
    .mascot { position: fixed; left: 0; top: 0; width: ${M}px; height: ${M}px; will-change: transform; }
    .body { width: ${M}px; height: ${M}px; transform-origin: 50% 80%; animation: hover 3.6s ease-in-out infinite; }
    .body.pop { animation: hover 3.6s ease-in-out infinite, pop 350ms cubic-bezier(0.3, 1.6, 0.5, 1); }
    /* The drawings of Inès move (decision of Nathan, 18/11): the wings flap from the rotation each expression gives them,
       the eye blinks around its centre; the pupil follows the arrow (look, below). */
    .wing { transform-box: view-box; transform-origin: 33px 43.5px; animation: flap 480ms ease-in-out infinite alternate; }
    .lid { transform-box: view-box; transform-origin: 48px 48px; animation: blink 4.2s ease-in-out infinite; }
    .body > * { display: block; width: ${M}px; height: ${M}px; transform-origin: 50% 50%; overflow: visible; }
    .bubble { position: absolute; left: 0; top: 0; width: max-content; max-width: 470px; padding: 16px 22px; background: ${PAPER}; color: ${INK};
      font: 600 24px/1.28 ${FONT}; white-space: normal; opacity: 0; transform: scale(0.96); transition: opacity 180ms ease-out, transform 180ms ease-out; }
    .bubble.on { opacity: 1; transform: none; }
    .bubble::before { content: ""; position: absolute; top: var(--tail); width: 0; height: 0; margin-top: -11px; border: 11px solid transparent; }
    .bubble.right::before { left: -22px; border-right-color: ${PAPER}; }
    .bubble.left::before { right: -22px; border-left-color: ${PAPER}; }
    .bubble.ask { max-width: 640px; padding: 24px 28px 28px; }
    .correction-file { margin-bottom: 18px; overflow-wrap: anywhere; color: ${GREY}; font-size: 17px; }
    .correction-before { display: block; opacity: 0.7; text-decoration-thickness: 2px; }
    .correction-after { margin: 18px 0 0; }
    .rank { margin-bottom: 10px; color: ${GREY}; font: 700 15px/1 ${FONT}; letter-spacing: 0.1em; text-transform: uppercase; }
    .choices { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 20px; }
    .choice { flex: 1; padding: 15px 20px; border: 0; color: ${PAPER}; font: 700 20px/1 ${FONT}; white-space: nowrap; pointer-events: auto !important; cursor: pointer;
      transition: opacity 200ms ease-out, transform 200ms ease-out; }
    .choice.bug { background: ${COLORS.defaut}; }
    .choice.voulu { background: ${COLORS.conforme}; }
    .choice:hover { transform: translateY(-2px); }
    .choices.made .choice { opacity: 0.3; pointer-events: none !important; }
    .choices.made .choice.chosen { opacity: 1; }
    .stamp { display: inline-block; padding: 3px 9px; border: 3px solid currentColor; background: ${PAPER}; font: 800 18px/1.2 ${FONT}; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; transform: rotate(-6deg); }
    .stamp.voulu, .stamp.conforme { color: ${COLORS.conforme}; }
    .stamp.bug { color: ${COLORS.defaut}; }
    .bubble > .stamp, .panel > .stamp { position: absolute; right: 24px; top: -18px; animation: thunk 350ms cubic-bezier(0.3, 1.6, 0.5, 1); }
    .panel { position: fixed; left: 50%; top: 50%; width: ${PANEL}px; max-height: calc(100% - 24px); padding: 26px 32px 30px; background: ${PAPER}; color: ${INK};
      font: 500 18px/1.4 ${FONT}; opacity: 0; transform: translate(-50%, -48%); transition: opacity 300ms ease-out, transform 300ms ease-out; }
    .panel.on { opacity: 1; transform: translate(-50%, -50%); }
    .panel h1 { margin: 0 0 8px; font: 700 30px/1.15 ${FONT}; }
    .panel h2 { margin: 18px 0 8px; color: ${GREY}; font: 700 14px/1 ${FONT}; letter-spacing: 0.1em; text-transform: uppercase; }
    .panel p { margin: 0 0 4px; }
    .panel ul { margin: 0; padding: 0 0 0 20px; }
    .panel li { margin: 0 0 2px; }
    .panel .files { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
    .panel .files li { padding: 5px 9px; background: #EEE; font: 500 15px/1.3 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
    .items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 16px; }
    .item p { margin-top: 6px; font-size: 15px; line-height: 1.3; }
    .tag { display: inline-block; width: 12px; height: 12px; margin-right: 7px; border-radius: 50%; vertical-align: 0; }
    .tag.defaut { background: ${COLORS.defaut}; }
    .tag.doute { background: ${COLORS.doute}; }
    .shot { position: relative; overflow: hidden; background: #E9E9E9; }
    .shot img { position: absolute; left: 0; top: 0; max-width: none; }
    .shot .mark { position: absolute; }
    .examen .shot { margin: 4px 0 14px; }
    .examen .texts p { font-size: 20px; }
    .examen .question { margin-top: 10px; font: 700 24px/1.25 ${FONT}; }
    .cursor { position: fixed; left: 0; top: 0; width: 40px; height: 40px; will-change: transform; }
    .cursor svg { display: block; width: 40px; height: 40px; transform-origin: ${TIP.x}px ${TIP.y}px; transition: transform 90ms ease-out; }
    .cursor.press svg { transform: scale(0.78); }
    .ripple { position: fixed; width: 28px; height: 28px; margin: -14px; border: 3px solid ${IRIS}; border-radius: 50%; animation: ripple 460ms ease-out forwards; }
    @keyframes rough-notation-dash { to { stroke-dashoffset: 0; } }
    @keyframes hover { 50% { transform: translateY(-5px); } }
    @keyframes pop { from { scale: 0.82; } to { scale: 1; } }
    @keyframes flap { from { transform: rotate(var(--base)); } to { transform: rotate(calc(var(--base) - 16deg)) scaleY(0.9); } }
    @keyframes blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
    @keyframes thunk { from { opacity: 0; transform: rotate(-6deg) scale(1.8); } to { opacity: 1; transform: rotate(-6deg) scale(1); } }
    @keyframes ripple { from { transform: scale(0.5); opacity: 1; } to { transform: scale(3); opacity: 0; } }
  </style>
  <div class="zones"></div><div class="dim"></div><div class="panel"></div>
  <div class="mascot" hidden><div class="body"></div><div class="bubble"></div></div>
  <div class="cursor" hidden><svg viewBox="0 0 24 24"><path d="M4.2 3v16.2l4.3-4 2.9 6.6 2.9-1.3-2.9-6.5h6.1Z" fill="${INK}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`;
  const [zonesBox, dim, panel, mascot, body, bubble, cursor] = ["zones", "dim", "panel", "mascot", "body", "bubble", "cursor"].map((name) => shadow.querySelector(`.${name}`));

  // ---------- State, kept across pages (sessionStorage is refused on about:blank) ----------
  const stored = () => {
    try {
      const found = JSON.parse(sessionStorage.getItem("horama"));
      return found?.passage === PASSAGE ? found : null;
    } catch {
      return null;
    }
  };
  const state = stored() ?? { passage: PASSAGE, cursor: null, travel: null, mascot: null, etat: "observe", avant_clic: null, bulle: null, zones: {}, revue: false };
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
  const typo = (text) => text.replace(/« /g, "« ").replace(/ (?=[»:;?!€])/g, " ").replace(/(\d) (?=\d)/g, "$1 ");
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text ?? "" });
  // A rectangle of the page (x, y, largeur, hauteur) as a box of the screen, `by` px wider on each side.
  const box = (rect, by = 0, weight = 1) => ({ left: rect.x - scrollX - by, top: rect.y - scrollY - by, right: rect.x - scrollX + rect.largeur + by, bottom: rect.y - scrollY + rect.hauteur + by, weight });
  const rounded = ({ x, y, largeur, hauteur }) => ({ x: Math.round(x), y: Math.round(y), largeur: Math.round(largeur), hauteur: Math.round(hauteur) });

  // ---------- Where things are, each frame: the cursor along its path, the mascot on its spring, its eyes ----------
  if (TITLE && !state.cursor) state.cursor = { x: Math.round(innerWidth * 0.52), y: Math.round(innerHeight * 0.62) };
  // While the agent runs the mascot says nothing and waits in a corner of the page.
  const corners = () => {
    const [left, right, top, bottom] = [24, innerWidth - M - 24, 24, innerHeight - M - 24];
    return [{ x: right, y: bottom }, { x: left, y: bottom }, { x: right, y: top }, { x: left, y: top }];
  };
  let goal = state.mascot ?? corners()[0];
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
    // The click is given: the mascot takes back the expression it had before it.
    if (state.avant_clic) {
      const before = state.avant_clic;
      state.avant_clic = null;
      if (state.etat === "hesite") setEtat(before);
    }
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
  // The drawing of an expression made to move, without changing it: each wing (halo layer and drawn layer) loses its
  // rotate() attribute for the same rotation in CSS (--base), so that it can flap from it; the group of the pupil (the
  // child <g transform="translate(…)"> of the svg) is wrapped in a lid that blinks, and keeps its own position, from
  // which look() moves it.
  let pupil = null;
  const animate = () => {
    const svg = body.querySelector("svg");
    for (const wing of svg.querySelectorAll('g[fill="#AFA9EC"] path')) {
      wing.style.setProperty("--base", `${/rotate\((-?[\d.]+)/.exec(wing.getAttribute("transform") ?? "")?.[1] ?? 0}deg`);
      wing.removeAttribute("transform");
      wing.classList.add("wing");
    }
    pupil = [...svg.children].find((node) => node.tagName === "g" && /^translate/.test(node.getAttribute("transform") ?? "")) ?? null;
    if (!pupil) return;
    const [, x = 0, y = 0] = /translate\((-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(pupil.getAttribute("transform")) ?? [];
    pupil.dataset.x = x;
    pupil.dataset.y = y;
    const lid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    lid.classList.add("lid");
    pupil.replaceWith(lid);
    lid.append(pupil);
  };
  // The pupil looks at the arrow of the agent while it works (4 units at most from its place), straight ahead at the end.
  const look = () => {
    if (!pupil) return;
    const target = state.bulle || state.revue ? null : cursorAt;
    const dx = target ? target.x - at.x - M / 2 : 0;
    const dy = target ? target.y - at.y - M / 2 : 0;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = target ? Math.min(1, distance / 220) * 4 : 0;
    pupil.setAttribute("transform", `translate(${(Number(pupil.dataset.x) + (dx / distance) * reach).toFixed(2)} ${(Number(pupil.dataset.y) + (dy / distance) * reach).toFixed(2)})`);
  };
  const setEtat = (name) => {
    const shown = expression(name);
    const changed = shown !== state.etat || !body.firstChild;
    state.etat = shown;
    save();
    mascot.className = `mascot ${shown}`;
    body.innerHTML = MASCOT[shown];
    animate();
    look();
    // A small jolt when the expression changes; the mascot keeps floating.
    if (changed) {
      body.classList.remove("pop");
      void body.offsetWidth;
      body.classList.add("pop");
    }
  };

  // ---------- Where the mascot stands: hiding as little as it can ----------
  // Room kept free around the cursor, or around the point where it is about to land.
  const clearance = ({ x, y }) => ({ left: x - 70, top: y - 70, right: x + 110, bottom: y + 120, weight: 60 });
  // What must stay readable: the texts and the controls of the page, and far more the zones and the cursor.
  const busy = () => {
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
    for (const zone of state.zones[here()] ?? []) boxes.push(box(zone, 24, 60));
    if (state.cursor && !state.revue) boxes.push(clearance(state.cursor));
    return boxes;
  };
  const hidden = (left, top, width, height, boxes) => boxes.reduce((sum, { left: l, top: t, right, bottom, weight }) =>
    sum + weight * Math.max(0, Math.min(left + width, right) - Math.max(left, l)) * Math.max(0, Math.min(top + height, bottom) - Math.max(top, t)), 0);
  // The best place for the mascot and a bubble of this size on one of its sides: near the cursor (with `stay`, near
  // where it already is), whole in the screen.
  function place(width, height, stay) {
    const boxes = busy();
    const near = stay || !state.cursor ? null : { left: state.cursor.x, top: state.cursor.y, right: state.cursor.x, bottom: state.cursor.y };
    let best = null;
    for (let y = 8; y <= innerHeight - M - 8; y += 20) {
      for (let x = 8; x <= innerWidth - M - 8; x += 20) {
        for (const side of ["right", "left"]) {
          const bx = side === "right" ? x + M + GAP : x - GAP - width;
          if (bx < 8 || bx + width > innerWidth - 8) continue;
          const by = Math.max(8, Math.min(y + M / 2 - height / 2, innerHeight - height - 8));
          const far = near ? Math.hypot(Math.max(near.left - x - M, x - near.right, 0), Math.max(near.top - y - M, y - near.bottom, 0)) : 0;
          const cost = hidden(x, y, M, M, boxes) + hidden(bx, by, width, height, boxes) + 25 * far + 4 * Math.hypot(x - goal.x, y - goal.y);
          if (!best || cost < best.cost) best = { cost, x, y, side, left: bx - x, top: by - y, tail: Math.max(24, Math.min(y + M / 2 - by, height - 24)) };
        }
      }
    }
    return best;
  }
  // The corner that hides the least of these boxes; the nearest one when several hide nothing.
  const corner = (boxes) => corners().reduce((best, spot) => {
    const cost = hidden(spot.x, spot.y, M, M, boxes) + 0.01 * Math.hypot(spot.x - goal.x, spot.y - goal.y);
    return !best || cost < best.cost ? { ...spot, cost } : best;
  }, null);

  // ---------- Bubble (end only): tied to the mascot, one at a time; the mascot moves first, then the bubble ----------
  let turn = 0;
  const choices = element("div", "choices");
  for (const [choix, label] of [["bug", "C'est un bug"], ["voulu", "C'est voulu"]]) {
    const button = element("button", `choice ${choix}`, label);
    button.addEventListener("click", (event) => event.isTrusted && window.__horama.choisir(choix));
    choices.append(button);
  }
  const correctionChoices = element("div", "choices");
  for (const [choice, label, color] of [["accepter", "Accepter", "voulu"], ["refuser", "Refuser", "bug"]]) {
    const button = element("button", `choice ${color} ${choice}`, label);
    button.addEventListener("click", (event) => event.isTrusted && window.__horama.chooseCorrection(choice));
    correctionChoices.append(button);
  }
  function layout() {
    const { bulle } = state;
    bulle.spot = place(bubble.offsetWidth, bubble.offsetHeight, state.revue);
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
    bubble.className = `bubble${bulle.correction ? " ask" : ""}`;
    if (bulle.correction) {
      const correction = bulle.correction;
      correctionChoices.className = `choices${correction.choice ? " made" : ""}`;
      for (const button of correctionChoices.children) button.classList.toggle("chosen", button.classList.contains(correction.choice));
      bubble.replaceChildren(element("div", "rank", "Corriger la note"), element("div", "correction-file", correction.file), element("del", "correction-before", correction.before), element("p", "correction-after", correction.after), correctionChoices);
      if (correction.status) bubble.append(element("div", "stamp conforme", correction.status === "acceptee" ? "Correction acceptée" : "Correction refusée"));
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
    bubble.classList.add("on");
    if (live) await wait(200);
  }
  // The mascot steps aside when it or its bubble hides one of these boxes: where the cursor is about to land, or what
  // a page shows once it has opened or reacted. Without a bubble (all along the course) it only leaves its corner for
  // the cursor or a zone, and goes to the corner that hides the least.
  const stepAside = (boxes) => {
    const spot = state.bulle?.spot;
    if (!spot) {
      if (hidden(goal.x, goal.y, M, M, boxes.filter(({ weight }) => weight >= 60)) > 0) goTo(corner(busy()));
      return;
    }
    if (hidden(goal.x, goal.y, M, M, boxes) + hidden(goal.x + spot.left, goal.y + spot.top, bubble.offsetWidth, bubble.offsetHeight, boxes) === 0) return;
    layout();
    renderBubble(false);
  };

  // ---------- Zones (page coordinates): a line drawn as with a felt pen around each one, no text ----------
  // A proven defect is circled, a doubt boxed, each in its colour; where the thing used to be, a grey dashed frame.
  const pen = (genre, animate) => ({ type: genre === "defaut" ? "circle" : "box", color: COLORS[genre], strokeWidth: genre === "defaut" ? 4 : 3, padding: genre === "defaut" ? 12 : 8, iterations: genre === "defaut" ? 1 : 2, animate, animationDuration: STROKE });
  const drawn = [];
  async function drawZone(zone, animate) {
    const frameOf = element("div", `zone${zone.trait ? " old" : ""}`);
    frameOf.style.cssText = `left:${zone.x}px;top:${zone.y}px;width:${zone.largeur}px;height:${zone.hauteur}px`;
    zonesBox.append(frameOf);
    const item = { zone, element: frameOf };
    drawn.push(item);
    if (zone.trait) {
      void frameOf.offsetWidth;
      frameOf.classList.add("done");
      return animate && wait(300);
    }
    ring(item, animate);
    if (animate) await wait(STROKE + 250);
  }
  function ring(item, animate) {
    item.annotation = annotate(item.element, pen(item.zone.genre, animate));
    item.annotation.show();
  }
  const follow = () => {
    zonesBox.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
  };

  // ---------- The panel of the end: all the text, and the captures with their zone ringed ----------
  // A capture of the course (a data: address), cropped around its zones (pixels of the capture), shown w × h px, the zones
  // ringed as they were on the page. Without a zone, the whole capture.
  function shot({ image, zones = [], page, genre }, w, h) {
    const frameOf = element("div", "shot");
    frameOf.style.cssText = `width:${w}px;height:${h}px`;
    if (!image) return { element: frameOf, show() {} };
    const all = zones.length ? zones.reduce((a, z) => ({ x: Math.min(a.x, z.x), y: Math.min(a.y, z.y), r: Math.max(a.r, z.x + z.largeur), b: Math.max(a.b, z.y + z.hauteur) }), { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity }) : null;
    const scale = all ? Math.min(1, w / (all.r - all.x + 200), h / (all.b - all.y + 150)) : Math.min(w / page.largeur, h / page.hauteur);
    const [rw, rh] = [w / scale, h / scale];
    const from = (centre, size, full) => (size >= full ? (full - size) / 2 : Math.max(0, Math.min(centre - size / 2, full - size)));
    const rx = all ? from((all.x + all.r) / 2, rw, page.largeur) : (page.largeur - rw) / 2;
    const ry = all ? from((all.y + all.b) / 2, rh, page.hauteur) : (page.hauteur - rh) / 2;
    const img = Object.assign(document.createElement("img"), { src: image });
    img.style.cssText = `width:${page.largeur * scale}px;height:${page.hauteur * scale}px;left:${-rx * scale}px;top:${-ry * scale}px`;
    frameOf.append(img);
    const marks = zones.map((zone) => {
      const mark = element("div", "mark");
      mark.style.cssText = `left:${(zone.x - rx) * scale}px;top:${(zone.y - ry) * scale}px;width:${zone.largeur * scale}px;height:${zone.hauteur * scale}px`;
      frameOf.append(mark);
      return mark;
    });
    // rough-notation measures the element: the rings are drawn once the panel is shown.
    return { element: frameOf, show: (animate) => marks.forEach((mark) => annotate(mark, pen(genre, animate)).show()) };
  }
  const placeBeside = () => {
    const card = panel.getBoundingClientRect();
    goTo({ x: Math.max(8, card.left - M - 12), y: Math.max(8, card.top) });
  };
  async function showPanel(children, shots = []) {
    panel.classList.remove("on");
    panel.replaceChildren(...children);
    void panel.offsetWidth;
    panel.classList.add("on");
    placeBeside();
    await wait(320);
    for (const item of shots) item.show(true);
    // Resolves once the rings are drawn.
    if (shots.length) await wait(STROKE + 100);
  }
  const list = (lines) => {
    const ul = element("ul");
    ul.append(...lines.map((line) => element("li", "", typo(line))));
    return ul;
  };

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

  dim.classList.toggle("on", state.revue);
  setEtat(state.etat);
  mascot.hidden = !TITLE;
  cursor.hidden = !state.cursor || state.revue;
  if (state.cursor) putCursor(state.travel ? state.travel.from : state.cursor);
  mascot.style.transform = `translate(${at.x}px, ${at.y}px)`;
  wake();
  attach();

  // ---------- Commands called by the script (CDP Runtime.evaluate; a promise is awaited) ----------
  let examined = null; // id of the finding whose question is asked
  window.__horama = {
    // observe, hesite, trouve, doute, bloquee, fini (or a name of the first skeleton): a clean change, in place.
    etat(name) {
      setEtat(name);
    },
    // One bubble at a time (end only), null to hide it. Resolves once the bubble is shown.
    bulle(texte) {
      state.bulle = texte ? { texte, page: here() } : null;
      save();
      return renderBubble(true);
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
    // The rectangle of the first element the CSS selector finds, in page coordinates; [] when there is none.
    element(selecteur) {
      let found = null;
      try {
        found = document.querySelector(selecteur);
      } catch {}
      const rect = found?.getBoundingClientRect();
      return rect && rect.width > 0 && rect.height > 0 ? [rounded({ x: rect.left + scrollX, y: rect.top + scrollY, largeur: rect.width, hauteur: rect.height })] : [];
    },
    // The element at the centre of a zone: its displayed text ("" when it is none or a whole block of the page) and the
    // rectangle that holds both the zone and that text, so that a line is drawn around the whole value, not half of it.
    autour(zone) {
      const found = document.elementFromPoint(zone.x + zone.largeur / 2 - scrollX, zone.y + zone.hauteur / 2 - scrollY);
      const texte = norm(found?.innerText);
      // Every visible text of the page centred inside the zone, in document order: what the zone says now, for the note
      // correction. A hidden text (closed menu, screen reader only) does not count.
      const textes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const raw = norm(node.textContent);
        if (!raw || !node.parentElement?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const inside = [...range.getClientRects()].some(({ left, top, right, bottom }) => {
          const x = (left + right) / 2 + scrollX;
          const y = (top + bottom) / 2 + scrollY;
          return right - left > 1 && bottom - top > 1 && x >= zone.x && x <= zone.x + zone.largeur && y >= zone.y && y <= zone.y + zone.hauteur;
        });
        if (!inside) continue;
        // As shown on the screen: the case the style imposes, like innerText.
        const transform = getComputedStyle(node.parentElement).textTransform;
        const text = transform === "uppercase" ? raw.toUpperCase() : transform === "lowercase" ? raw.toLowerCase() : raw;
        if (!textes.includes(text)) textes.push(text);
      }
      if (!texte || texte.length > 40) return { texte: "", cadre: zone, textes };
      const range = document.createRange();
      range.selectNodeContents(found);
      const { left, top, right, bottom } = range.getBoundingClientRect();
      const x = Math.min(zone.x, left + scrollX);
      const y = Math.min(zone.y, top + scrollY);
      return { texte, cadre: rounded({ x, y, largeur: Math.max(zone.x + zone.largeur, right + scrollX) - x, hauteur: Math.max(zone.y + zone.hauteur, bottom + scrollY) - y }), textes };
    },
    // Draws a line around rectangles of the page `adresse` (pathname and search), for the finding `id`; genre: "doute" or
    // "defaut"; avant: where the thing used to be, framed with dashes. Kept for when the page is that address again;
    // drawn now when it is this page. voir: a zone out of the screen is first scrolled into view (only where the agent
    // does not read the page after its relevé).
    async surligner(adresse, rects, genre, id, avant, voir) {
      if ((state.zones[adresse] ?? []).some((zone) => zone.id === id)) return;
      const zones = [...rects.map((rect) => ({ id, genre, ...rounded(rect) })), ...(avant ? [{ id, genre, trait: "pointille", ...rounded(avant) }] : [])];
      (state.zones[adresse] ??= []).push(...zones);
      save();
      if (adresse !== here()) return;
      attach();
      const first = zones[0];
      if (voir && first && (first.y < scrollY || first.y + first.hauteur > scrollY + innerHeight)) {
        scrollTo({ top: Math.max(0, first.y - innerHeight / 3), behavior: "smooth" });
        await wait(600);
      }
      // The mascot moves away first when it stands on what is about to be drawn: to another corner.
      if (hidden(goal.x, goal.y, M, M, zones.map((zone) => box(zone, 14))) > 0) {
        goTo(corner(busy()));
        await arrived();
      }
      await Promise.all(zones.filter((zone) => !zone.trait).map((zone) => drawZone(zone, true)));
      for (const zone of zones.filter((candidate) => candidate.trait)) await drawZone(zone, true);
    },
    // A doubt that became a proven defect (or the reverse): its line changes colour and shape, on every page.
    requalifier(id, genre) {
      for (const zone of Object.values(state.zones).flat()) if (zone.id === id) zone.genre = genre;
      save();
      for (const item of drawn.filter((candidate) => candidate.zone.id === id && !candidate.zone.trait)) {
        item.annotation?.remove();
        ring(item, true);
      }
    },
    // End of the course. revue(true): the page goes dark, the cursor leaves, clicks on the page are ignored.
    revue(on) {
      state.revue = on;
      save();
      cursor.hidden = on || !state.cursor;
      dim.classList.toggle("on", on);
    },
    // The summary: { titre, lignes, selection, items }. lignes: sentences; selection: { titre, lignes } or null (the
    // choice of the tests, development mode); items: { id, genre, texte, image, zones, page } for each defect and doubt.
    async recap({ titre, lignes = [], selection = null, items = [] }) {
      this.revue(true);
      setEtat(state.etat === "bloquee" ? "bloquee" : "fini");
      await this.bulle(null);
      // Two rows of three at most: the others come one by one after.
      const first = items.slice(0, 6);
      const shots = first.map((item) => shot(item, 296, 168));
      const children = [element("h1", "", typo(titre)), ...lignes.map((line) => element("p", "", typo(line)))];
      if (selection) children.push(element("h2", "", selection.titre), list(selection.lignes));
      if (items.length) {
        const grid = element("div", "items");
        grid.append(...first.map((item, index) => {
          const card = element("div", "item");
          const caption = element("p", "", typo(item.texte));
          caption.prepend(element("span", `tag ${item.genre}`));
          card.append(shots[index].element, caption);
          return card;
        }));
        children.push(element("h2", "", "À trancher"), grid);
        if (items.length > first.length) children.push(element("p", "", `Et ${items.length - first.length} de plus, montrés un par un ensuite.`));
      }
      await showPanel(children, shots);
    },
    // One finding, its capture ringed in large, what was found, and the question with its two buttons. rang: « 1 sur 3 ».
    // The answer comes back through the CDP binding horamaChoix, from a real click on a button or from choisir().
    async examen({ id, rang, genre, etat, image, zones, page, textes = [], question }) {
      this.revue(true);
      await this.bulle(null);
      setEtat(etat);
      examined = id;
      choices.className = "choices";
      for (const button of choices.children) button.classList.remove("chosen");
      const big = shot({ image, zones, page, genre }, PANEL - 64, 440);
      const texts = element("div", "texts");
      texts.append(...textes.map((text) => element("p", "", typo(text))));
      panel.className = "panel examen";
      await showPanel([element("div", "rank", rang), big.element, texts, element("p", "question", typo(question)), choices], [big]);
    },
    // Hides the panel.
    panneau() {
      panel.className = "panel";
      panel.replaceChildren();
    },
    async correction({ id, file, before, after }) {
      this.revue(true);
      this.panneau();
      setEtat("doute");
      state.bulle = { correction: { id, file, before, after }, page: here() };
      save();
      return renderBubble(true);
    },
    chooseCorrection(choice, id) {
      const correction = state.bulle?.correction;
      if (!correction || correction.choice || (id && correction.id !== id) || !["accepter", "refuser"].includes(choice)) return;
      correction.choice = choice;
      correctionChoices.classList.add("made");
      correctionChoices.querySelector(`.${choice}`).classList.add("chosen");
      save();
      window.horamaChoix?.(JSON.stringify({ id: correction.id, choix: choice }));
    },
    async correctionResult(status) {
      if (!state.bulle?.correction) return;
      state.bulle.correction.status = status;
      setEtat(status === "acceptee" ? "fini" : "observe");
      save();
      return renderBubble(true);
    },
    choisir(choix) {
      const id = examined;
      if (!id || choices.classList.contains("made")) return;
      choices.classList.add("made");
      choices.querySelector(`.${choix}`).classList.add("chosen");
      // The verdict falls as a stamp on the panel: « BUG NOTÉ » or « VOULU ».
      panel.append(element("div", `stamp ${choix}`, STAMPS[choix]));
      examined = null;
      window.horamaChoix?.(JSON.stringify({ id, choix }));
    },
    // Last screen: what leaves. { titre, compte, legende, fichiers }.
    async fin({ titre, compte, legende, fichiers }) {
      await this.bulle(null);
      this.revue(true);
      panel.className = "panel";
      const files = element("ul", "files");
      files.append(...fichiers.map((file) => element("li", "", file.split(/[\\/]/).pop())));
      setEtat("fini");
      await showPanel([element("h1", "", typo(titre)), element("p", "", typo(compte)), element("h2", "", legende), files]);
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
    // Just before the click of the agent, while the arrow travels to it: the mascot hesitates.
    if (TITLE && !state.revue && ms > 0 && state.etat !== "hesite") {
      state.avant_clic = state.etat;
      setEtat("hesite");
    }
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
