// Le moteur du deck : un ciel continu, des escales indépendantes, l'envoyé qui vole de l'une à l'autre.
// Grandes parties : plongée dans l'œil (data-sortie="plongee"). Sinon : vol à travers un banc de nuages.
(() => {
const W = 1920, H = 1080, STEP = 2400, SVGNS = "http://www.w3.org/2000/svg";
const stage = document.getElementById("stage");
const escs = [...document.querySelectorAll(".esc")];
escs.forEach((e, k) => { e.style.left = k * STEP + "px"; });

/* ---------- courbes de temps ---------- */
function bezier(x1, y1, x2, y2) {
  return t => { if (t <= 0) return 0; if (t >= 1) return 1;
    let u = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t;
      const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); if (Math.abs(dx) < 1e-6) break; u -= x / dx; u = Math.min(1, Math.max(0, u)); }
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3; };
}
const SORTIE = "cubic-bezier(0.16, 1, 0.3, 1)";          // expo.out de la charte
const expoOut = bezier(.16, 1, .3, 1);
const panEase = bezier(.42, 0, .12, 1);
const douce = bezier(.45, 0, .25, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lisse = t => t * t * (3 - 2 * t);
const hasard = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);
const el = (tag, cls, parent, ns) => { const n = ns ? document.createElementNS(SVGNS, tag) : document.createElement(tag); if (cls) n.setAttribute("class", cls); if (parent) parent.appendChild(n); return n; };

/* ---------- repères ---------- */
function boite(ref, n) { // rectangle d'un élément dans le repère de ref, hors transformations quand c'est du HTML
  if (n.offsetParent !== undefined && !(n instanceof SVGElement)) {
    let x = 0, y = 0, m = n; while (m && m !== ref) { x += m.offsetLeft; y += m.offsetTop; m = m.offsetParent; }
    if (m === ref) return { x, y, w: n.offsetWidth, h: n.offsetHeight };
  }
  const b = ref.getBoundingClientRect(), r = n.getBoundingClientRect(), k = b.width / ref.offsetWidth;
  return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k };
}
function perche(e) { if (!e.dataset.perche || e.dataset.perche === "aucune") return null; const [x, y, t] = e.dataset.perche.split(",").map(Number); return { x, y, t }; }
const regard = e => (e.dataset.regard || "0,0").split(",").map(Number);
let zones = [];
function relever() {
  zones = escs.map(e => [...e.querySelectorAll("h1, h2, h3, p, li, .pli, .feuille, .carte, .panneau, .champ, .pr, .pilier, .nom, .etape, .noeud, .qr, .legende")].map(n => boite(e, n))
    .concat((p => p ? [{ x: p.x - p.t * .7, y: p.y - p.t * .6, w: p.t * 1.4, h: p.t * 1.2 }] : [])(perche(e))));
}
// au repos, un nuage ne se pose jamais dans le cadre du contenu d'une escale : il n'habite que les marges
function gene(f, x, y, w, h, marge = 40) {
  return escs.some((e, k) => { const sx = x - k * STEP * f;
    if (sx + w < 0 || sx > W) return false;
    if (sx < 0 || sx + w > W) return true;      // jamais un morceau de nuage coupé par le bord au repos
    const z = zones[k], u = { x0: Math.min(...z.map(r => r.x)), y0: Math.min(...z.map(r => r.y)), x1: Math.max(...z.map(r => r.x + r.w)), y1: Math.max(...z.map(r => r.y + r.h)) };
    return sx < u.x1 + marge && sx + w > u.x0 - marge && y < u.y1 + marge && y + h > u.y0 - marge; });
}

/* ---------- le ciel : deux peaux (jour et nuit) en parallaxe, et le plan principal ---------- */
const peauJour = document.getElementById("peau-jour");
const COUCHES = {
  loin: { f: .22, D: 5200 }, milieu: { f: .5, D: 2600 }, banc: { f: .72, D: 1700 },
  principal: { f: 1, D: 1000, els: [document.getElementById("principal")] },
  pres: { f: 2.2, D: 520, els: [document.getElementById("pres")] },
};
const total = (escs.length - 1) * STEP;
const largeur = c => total * c.f + W + 1600;
for (const k of ["loin", "milieu", "banc"]) { COUCHES[k].els = [peauJour.querySelector(`[data-c="${k}"]`)]; }
for (const c of Object.values(COUCHES)) c.els.forEach(n => n.style.width = largeur(c) + "px");

const NUAGE = "M22 58C8 58 2 50 3 42c1-8 8-13 16-12 0-12 10-20 22-18 5-9 18-12 28-7 8 4 12 11 12 18 9-5 22-2 27 6 12-2 22 5 22 16 1 8-6 13-14 13Z";
function nuage(parent, x, y, w, flip) {
  const s = el("svg", "nuage", parent, true); s.setAttribute("viewBox", "0 0 150 62");
  Object.assign(s.style, { left: x + "px", top: y + "px", width: w + "px", height: w * 62 / 150 + "px", transform: flip ? "scaleX(-1)" : "" });
  s.innerHTML = `<path d="${NUAGE}"/>`; return s;
}
function soleilSVG(parent, cx, cy, r) {
  const g = el("div", "astre", parent), R = r * 1.45;
  Object.assign(g.style, { position: "absolute", left: cx - R + "px", top: cy - R + "px", width: 2 * R + "px", height: 2 * R + "px" });
  g.innerHTML = `<svg class="soleil" viewBox="${-R} ${-R} ${2 * R} ${2 * R}" style="width:100%;height:100%;position:absolute;left:0;top:0;overflow:visible"><g class="leve"><g class="rayons"></g><circle r="${r}"/></g></svg>`;
  const ray = g.querySelector(".rayons"), n = Math.round(r / 7);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r2 = i % 2 ? r * 1.27 : r * 1.4, l = el("line", null, ray, true);
    l.setAttribute("x1", (Math.cos(a) * r * 1.1).toFixed(1)); l.setAttribute("y1", (Math.sin(a) * r * 1.1).toFixed(1));
    l.setAttribute("x2", (Math.cos(a) * r2).toFixed(1)); l.setAttribute("y2", (Math.sin(a) * r2).toFixed(1)); }
  return g;
}
const soleils = [];
function decor() {
  for (const e of escs) { ESCALES[e.dataset.anim]?.arriver(e, true); nettoyer(e); }
  relever();
  const lo = COUCHES.loin, mi = COUCHES.milieu, ba = COUCHES.banc, pr = COUCHES.pres;
  const semer = (c, n, taille, yMin, yMax) => { const L = largeur(c);
    for (let i = 0; i < n; i++) { const w = taille[0] + hasard() * (taille[1] - taille[0]), x = -200 + hasard() * L, y = yMin + hasard() * (yMax - yMin);
      if (!gene(c.f, x, y, w, w * .42)) nuage(c.els[0], x, y, w, hasard() > .5); } };
  semer(lo, Math.round(largeur(lo) / 110), [60, 120], 24, 900);
  const et = el("svg", "etoiles", lo.els[0], true), L = largeur(lo);
  Object.assign(et.style, { left: 0, top: 0, width: L + "px", height: H + "px" });
  let html = ""; for (let i = 0; i < L / 8; i++) { const x = hasard() * L, y = hasard() * 940, r = 1.1 + hasard() * 2;
    if (!gene(lo.f, x - 4, y - 4, 8, 8, 16)) html += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" opacity="${(.3 + hasard() * .6).toFixed(2)}"/>`; }
  et.innerHTML = html;
  semer(mi, Math.round(largeur(mi) / 120), [160, 300], 30, 940);
  escs.forEach((e, k) => {
    if (!e.dataset.soleil) return;
    let cx, cy, r;
    if (e.dataset.soleil === "oeil") { const o = boite(e, e.querySelector(".o")); cx = o.x + o.w / 2; cy = o.y + o.h / 2; r = o.w * .86; }
    else [cx, cy, r] = e.dataset.soleil.split(",").map(Number);
    const g = soleilSVG(mi.els[0], cx + k * STEP * mi.f, cy, r); g._k = k; e._soleil = g; soleils.push(g);
  });
  const s = el("svg", "banc", ba.els[0], true), LB = largeur(ba);
  Object.assign(s.style, { left: 0, top: (H - 96) + "px", width: LB + "px", height: "700px" });
  let d = "M0 700V52", x = 0;
  while (x < LB) { const w = 46 + hasard() * 70, h = w * (.5 + hasard() * .25); d += `a${(w / 2).toFixed(1)} ${h.toFixed(1)} 0 0 1 ${w.toFixed(1)} 0`; x += w; }
  s.innerHTML = `<path d="${d}V700H0Z"/>`;
  // entre deux escales, un banc de nuages vertical que la caméra traverse : il cache la couture entre deux ciels
  for (let k = 0; k < escs.length - 1; k++) {
    const xc = (k + .5) * STEP * pr.f + W / 2, mur = el("div", "mur", pr.els[0]);
    for (let y = -760; y < H + 760; y += 150) for (const dx of [-170, 40]) {
      const w = 520 + hasard() * 220; nuage(mur, xc + dx - w / 2 + (hasard() - .5) * 110, y + hasard() * 40, w, hasard() > .5);
    }
    for (let i = 0; i < 12; i++) { const w = 240 + hasard() * 320, a0 = k * STEP * pr.f + W + 80, a1 = (k + 1) * STEP * pr.f - w - 80, x = a0 + hasard() * (a1 - a0);
      if (Math.abs(x + w / 2 - xc) > 420) nuage(mur, x, -120 + hasard() * 1150, w, hasard() > .5); }
  }
  // le pointillé de vol ne passe jamais sur un titre
  const mq = el("mask", null, traceSvg, true); mq.id = "sans-titres"; mq.setAttribute("maskUnits", "userSpaceOnUse");
  Object.entries({ x: -500, y: -500, width: total + W + 1000, height: H + 1000 }).forEach(([k2, v]) => mq.setAttribute(k2, v));
  let mh = `<rect x="-500" y="-500" width="${total + W + 1000}" height="${H + 1000}" fill="#fff"/>`;
  escs.forEach((e, k) => e.querySelectorAll("h1, h2, .slogan, .teste, .par").forEach(n => { const b = boite(e, n);
    mh += `<rect x="${(b.x + k * STEP - 34).toFixed(0)}" y="${(b.y - 34).toFixed(0)}" width="${(b.w + 68).toFixed(0)}" height="${(b.h + 68).toFixed(0)}" rx="30" fill="#000"/>`; }));
  mq.innerHTML = mh; tracePath.setAttribute("mask", "url(#sans-titres)");
  // la peau de nuit : la même scène, nuages cernés d'engobe, étoiles, pas de soleil
  const peauNuit = peauJour.cloneNode(true); peauNuit.id = "peau-nuit"; peauNuit.classList.add("nuit");
  peauJour.after(peauNuit);
  for (const k of ["loin", "milieu", "banc"]) COUCHES[k].els.push(peauNuit.querySelector(`[data-c="${k}"]`));
}

/* ---------- les ciels : un fond par escale, une couture cachée derrière le banc de nuages ---------- */
const CIELS = { lever: "#FBF5E6", ciel: "#E3E0F9", nuit: "#2A2647", aube: "#FFE39A" };
const fondA = document.getElementById("fond-a"), fondB = document.getElementById("fond-b");
const peaux = () => [peauJour, document.getElementById("peau-nuit") || peauJour];
const decoupe = (n, x0, x1) => { x0 = clamp(x0, 0, W); x1 = clamp(x1, 0, W); n.style.display = x1 > x0 ? "" : "none"; n.style.clipPath = `inset(0 ${W - x1}px 0 ${x0}px)`; };
let cielCourant = "lever";
function poserCiel(a, b, X, dir) {
  const [pj, pn] = peaux(), nuitA = a === "nuit";
  fondA.style.background = CIELS[a];
  if (!b) {
    cielCourant = a; decoupe(fondA, 0, W); fondB.style.display = "none";
    decoupe(nuitA ? pn : pj, 0, W); if (pn !== pj) (nuitA ? pj : pn).style.display = "none";
    stage.style.setProperty("--trace", nuitA ? "var(--engobe)" : "var(--encre)"); return;
  }
  fondB.style.background = CIELS[b];
  const dep = dir > 0 ? [0, X] : [X, W], arr = dir > 0 ? [X, W] : [0, X], nuitB = b === "nuit";
  decoupe(fondA, ...dep); decoupe(fondB, ...arr);
  if (nuitA === nuitB) { decoupe(nuitA ? pn : pj, 0, W); (nuitA ? pj : pn).style.display = "none"; }
  else { decoupe(nuitA ? pn : pj, ...dep); decoupe(nuitB ? pn : pj, ...arr); }
  cielCourant = (dir > 0 ? X < W / 2 : X > W / 2) ? b : a;
}

/* ---------- caméra ---------- */
const cam = { x: 0, zc: 0, E: [W / 2, H / 2], off: [0, 0], plans: [], nuees: [] };
function rendre() {
  const [ex, ey] = cam.E;
  for (const c of Object.values(COUCHES)) {
    let s = 1, cache = false;
    if (cam.zc) { const d = c.D - cam.zc; if (d < 30 || (cam.mode === "sortie" && c === COUCHES.pres)) cache = true; else s = c.D / d; }
    for (const n of c.els) {
      n.style.visibility = cache ? "hidden" : "";
      if (!cache) n.style.transform = `translate(${(cam.off[0] + ex).toFixed(2)}px,${(cam.off[1] + ey).toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-ex).toFixed(2)}px,${(-ey).toFixed(2)}px) translateX(${(-cam.x * c.f).toFixed(2)}px)`;
    }
  }
  escs.forEach((e, k) => { e.style.visibility = Math.abs(k * STEP - cam.x) < 2100 ? "" : "hidden"; });
  for (const g of soleils) g.style.visibility = Math.abs(g._k * STEP - cam.x) < STEP * .55 ? "" : "hidden";
  // la plongée : les plans de l'escale qui part ont chacun leur profondeur
  const sMain = 1000 / (1000 - cam.zc);
  for (const p of cam.plans) {
    const d = p.D - cam.zc;
    if (d < 40) { p.n.style.visibility = "hidden"; continue; }
    p.n.style.visibility = ""; p.n.style.transformOrigin = `${ex - p.ox}px ${ey - p.oy}px`; p.n.style.scale = String((p.D / d) / sMain);
  }
  for (const q of cam.nuees) {
    const d = q.D - cam.zc;
    if (d < 40) { q.n.style.visibility = "hidden"; continue; }
    const s = q.D / d, x = ex + cam.off[0] + (q.x - ex) * s, y = ey + cam.off[1] + (q.y - ey) * s;
    q.n.style.visibility = ""; q.n.style.transform = `translate(${(x - q.w / 2).toFixed(1)}px,${(y - q.w * .2).toFixed(1)}px) scale(${s.toFixed(4)})`;
  }
  if (cam.mode === "sortie" && base) placer(ex + (base.x - ex) * sMain, ey + (base.y - ey) * sMain, base.t * sMain, 0, true);
}

/* ---------- l'envoyé ---------- */
const hote = document.getElementById("envoye");
const M = creerMascotte(160); hote.appendChild(M.el);
let pose = { x: -300, y: 300, t: 140 }, base = null;
function placer(x, y, t, rot = 0, projete) {
  if (!projete) pose = { x, y, t };
  hote.style.transform = `translate(${(x - 80).toFixed(1)}px,${(y - 80).toFixed(1)}px) scale(${(t / 160).toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
}
function poser(e) {
  const p = perche(e); base = p;
  if (!p) { hote.style.visibility = "hidden"; return; }
  placer(p.x, p.y, p.t); M.etat(e.dataset.etat || "regarde"); M.regarder(...regard(e)); hote.style.visibility = "";
}

/* ---------- le pointillé d'encre : le chemin parcouru ---------- */
const traceSvg = document.getElementById("trace"), tracePath = traceSvg.querySelector("path");
Object.assign(traceSvg.style, { left: 0, top: 0, width: (total + W) + "px", height: H + "px" });
let points = [];
function tracer() { tracePath.setAttribute("d", points.length ? "M" + points.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") : ""); }

/* ---------- outils des escales ---------- */
let courante = null, transition = null;
const retenir = (e, a) => ((e._anims ||= []).push(a), a);
const anime = (e, n, kf, o) => retenir(e, n.animate(kf, { easing: SORTIE, fill: "both", ...o }));
const plus_tard = (e, ms, fn) => (e._tempo ||= []).push(setTimeout(() => { if (courante === e) fn(); }, ms));
const jetable = (e, n) => ((e._jetables ||= []).push(n), n);
function nettoyer(e) {
  (e._anims || []).forEach(a => a.cancel()); e._anims = [];
  (e._tempo || []).forEach(clearTimeout); e._tempo = [];
  (e._jetables || []).forEach(n => n.remove()); e._jetables = [];
  if (e._boucle) cancelAnimationFrame(e._boucle), e._boucle = 0;
  e.querySelectorAll("svg.marques:not(.chemins)").forEach(s => { if (s.parentElement === e) s.remove(); else s.textContent = ""; });
}
function calque(e) { const s = jetable(e, el("svg", "marques", e, true)); s.setAttribute("viewBox", `0 0 ${W} ${H}`); return s; }
let idMasque = 0;
// un pointillé qui se trace : un chemin à points, révélé par un masque qui avance
function pointille(svg, d, { duree = 1000, delai = 0, classe = "", couleur, instant = false, epaisseur = 6 } = {}) {
  const id = "m" + (++idMasque), m = el("mask", null, svg, true); m.id = id; m.setAttribute("maskUnits", "userSpaceOnUse");
  m.setAttribute("x", -200); m.setAttribute("y", -200); m.setAttribute("width", W + 400); m.setAttribute("height", H + 400);
  const r = el("path", null, m, true); r.setAttribute("d", d); r.setAttribute("pathLength", "1");
  Object.assign(r.style, { fill: "none", stroke: "#fff", strokeWidth: 40, strokeLinecap: "round", strokeDasharray: "1 1", strokeDashoffset: instant ? 0 : 1 });
  const p = el("path", classe, svg, true); p.setAttribute("d", d); p.setAttribute("mask", `url(#${id})`);
  if (couleur) Object.assign(p.style, { fill: "none", stroke: couleur, strokeWidth: epaisseur, strokeLinecap: "round", strokeDasharray: `0 ${epaisseur * 2.4}` });
  const a = instant ? null : r.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: duree, delay: delai, easing: "cubic-bezier(.45,.05,.25,1)", fill: "both" });
  return { p, a };
}
function compter(e, n, fin, { duree = 1000, delai = 0, format = v => String(Math.round(v)) } = {}) {
  const t0 = performance.now() + delai;
  const pas = now => { const t = clamp((now - t0) / duree); n.textContent = format(fin * expoOut(t)); if (t < 1 && courante === e) requestAnimationFrame(pas); else n.textContent = format(fin); };
  requestAnimationFrame(pas);
}

/* ---------- QR code du dépôt, encodé ici (version 3, correction M, octets, masque 0) ---------- */
function qrMatrice(texte) {
  const N = 29, DATA = 44, ECC = 26, bits = [];
  const pousse = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  const octets = [...new TextEncoder().encode(texte)];
  pousse(4, 4); pousse(octets.length, 8); octets.forEach(b => pousse(b, 8));
  pousse(0, Math.min(4, DATA * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0xEC; data.length < DATA; p ^= 0xEC ^ 0x11) data.push(p);
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
  const div = Array(ECC - 1).fill(0).concat([1]); let root = 1;
  for (let i = 0; i < ECC; i++) { for (let j = 0; j < div.length; j++) { div[j] = mul(div[j], root); if (j + 1 < div.length) div[j] ^= div[j + 1]; } root = mul(root, 2); }
  const rest = div.map(() => 0);
  for (const b of data) { const f = b ^ rest.shift(); rest.push(0); div.forEach((c, i) => rest[i] ^= mul(c, f)); }
  const mots = data.concat(rest);
  const mod = [...Array(N)].map(() => Array(N).fill(false)), fn = [...Array(N)].map(() => Array(N).fill(false));
  const set = (x, y, v) => { mod[y][x] = v; fn[y][x] = true; };
  for (let i = 0; i < N; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [N - 4, 3], [3, N - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const dist = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, dist !== 2 && dist !== 4); }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(22 + dx, 22 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  const fmt = 0x5412, bit = i => ((fmt >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(N - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, N - 15 + i, bit(i));
  set(8, N - 8, true);
  let i = 0;
  for (let right = N - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < N; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? N - 1 - v : v;
      if (!fn[y][x] && i < mots.length * 8) { mod[y][x] = ((mots[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!fn[y][x] && (x + y) % 2 === 0) mod[y][x] = !mod[y][x];
  return mod;
}

/* ---------- les escales (chacune se suffit à elle-même) ---------- */
const ESCALES = {
  titre: {
    arriver(e, instant, via) {
      if (instant) return;
      [...e.querySelectorAll(".mot .l")].forEach((l, i) => {
        const dx = (i - 2.5) * 70 + (hasard() - .5) * 160, dy = 150 + hasard() * 120, r = (hasard() - .5) * 34;
        anime(e, l, [
          { opacity: 0, transform: `translate(${dx}px,${dy}px) rotate(${r}deg)`, fontVariationSettings: '"XROT" -45, "YROT" 40' },
          { opacity: 1, offset: .3 },
          { opacity: 1, transform: "none", fontVariationSettings: '"XROT" 0, "YROT" 0' }], { duration: 1000, delay: i * 55, fill: "backwards" });
      });
      anime(e, e.querySelector(".paupiere"), [{ transform: "scaleY(.07)" }, { transform: "scaleY(.07)", offset: .55 }, { transform: "scaleY(1.08)", offset: .85 }, { transform: "scaleY(1)" }],
        { duration: 1250, easing: "linear", fill: "backwards" });
      if (e._soleil) anime(e, e._soleil.querySelector(".leve"), [{ transform: "translateY(480px) scale(.6)" }, { transform: "none" }], { duration: 1200, fill: "none" });
      if (via === "saut") anime(e, hote, [{ opacity: 0, transform: hote.style.transform + " translateY(60px)" }, { opacity: 1, transform: hote.style.transform }], { duration: 1000, delay: 300, fill: "backwards" });
    },
  },
  cibles: {
    arriver(e, instant) {
      // le rythme des livraisons : des pages qui passent, sans que personne les regarde (plus vite chez le marketeur)
      e.querySelectorAll(".rythme").forEach((s, j) => {
        s.innerHTML = ""; const g = el("g", null, s, true);
        for (let i = 0; i < 24; i++) { const r = el("rect", null, g, true); Object.assign(r, {}); r.setAttribute("x", i * 58); r.setAttribute("y", 3); r.setAttribute("width", 30); r.setAttribute("height", 24); r.setAttribute("rx", 4);
          r.setAttribute("fill", "#FFFDF6"); r.setAttribute("stroke", "#1C1C1C"); r.setAttribute("stroke-width", 2.5); }
        if (!instant) retenir(e, g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-696px)" }], { duration: j ? 4200 : 9000, iterations: Infinity }));
      });
      if (instant) return;
      e.querySelectorAll(".carte").forEach((c, i) => anime(e, c, [
        { opacity: 0, transform: "perspective(900px) translate3d(0,120px,-300px) rotateY(-70deg) rotateX(20deg)" },
        { opacity: 1, offset: .25 },
        { opacity: 1, transform: `perspective(900px) translate3d(0,0,0) rotateY(${i ? -8 : 8}deg) rotateX(0deg)` }], { duration: 1150, delay: 120 + i * 160 }));
    },
  },
  quatrecentquatre: {
    arriver(e, instant) {
      const f = e.querySelector(".feuille"), img = f.querySelector("img"), pli = e.querySelector(".pli"), m = calque(e);
      const bi = boite(e, img), k = bi.w / 1280;
      const rect = { x: bi.x + 44 * k, y: bi.y + 312 * k, w: 812 * k, h: 70 * k };      // le lien des portes ouvertes, sur deux lignes
      if (instant) { tracerDefaut(m, rect, { instant: true, epaisseur: 8 }); pli.style.transform = "perspective(800px) rotateY(-12deg) rotateZ(-2.5deg)"; return; }
      anime(e, f, [{ opacity: 0, transform: "translate3d(80px,300px,-700px) rotateX(70deg) rotateY(0deg) rotateZ(8deg)" }, { opacity: 1, offset: .2 },
        { opacity: 1, transform: "translate3d(0,0,0) rotateX(0deg) rotateY(-7deg) rotateZ(-1deg)" }], { duration: 1150 });
      anime(e, pli, [{ opacity: 0, transform: "perspective(800px) translateX(140px) rotateY(-75deg) rotateZ(0deg)" }, { opacity: 1, offset: .25 },
        { opacity: 1, transform: "perspective(800px) translateX(0) rotateY(-12deg) rotateZ(-2.5deg)" }], { duration: 1100, delay: 500 });
      plus_tard(e, 900, () => tracerDefaut(m, rect, { duree: 800, epaisseur: 8 }));
    },
  },
  temps: {
    arriver(e, instant) {
      const ps = [...e.querySelectorAll(".panneau")];
      const c1 = ps[0].querySelector(".curseur"), lien1 = ps[0].querySelector(".lien"), m1 = ps[0].querySelector(".marques"), m2 = ps[1].querySelector(".marques");
      [m1, m2].forEach(s => { s.textContent = ""; s.setAttribute("viewBox", "0 0 556 340"); Object.assign(s.style, { width: "556px", height: "340px" }); });
      const vue2 = ps[1].querySelector(".vue"), mot = ps[1].querySelector(".deborde"), b = boite(vue2, mot);
      const btn = ps[2].querySelector(".choix span"), voulu = ps[2].querySelectorAll(".choix span")[1];
      const lb = boite(ps[0].querySelector(".vue"), lien1), cible = [lb.x + 70, lb.y + 16];
      if (instant) { c1.style.transform = `translate(${cible[0]}px,${cible[1]}px)`; tracerDefaut(m2, { x: b.x, y: b.y, w: b.w, h: b.h }, { instant: true, epaisseur: 7 }); voulu.style.opacity = .4; return; }
      ps.forEach((p, i) => anime(e, p, [{ opacity: 0, transform: "perspective(800px) translate3d(0,220px,-300px) rotateX(75deg) rotateY(0deg)" }, { opacity: 1, offset: .25 },
        { opacity: 1, transform: `perspective(1200px) translate3d(0,0,0) rotateX(0deg) rotateY(${(1 - i) * 9}deg)` }], { duration: 1100, delay: i * 140 }));
      anime(e, c1, [{ transform: "translate(470px,300px)" }, { transform: `translate(${cible[0] + 140}px,${cible[1] + 90}px)`, offset: .6 }, { transform: `translate(${cible[0]}px,${cible[1]}px)` }],
        { duration: 1000, delay: 500 });
      plus_tard(e, 1450, () => { const r = el("circle", null, m1, true); r.setAttribute("cx", cible[0] + 4); r.setAttribute("cy", cible[1] + 4);
        Object.assign(r.style, { fill: "none", stroke: "var(--iris)", strokeWidth: 5 });
        retenir(e, r.animate([{ r: 2, opacity: 1 }, { r: 46, opacity: 0 }], { duration: 700, easing: SORTIE, fill: "both" }));
        anime(e, lien1, [{ color: "#1C1C1C" }, { color: "#7F77DD" }], { duration: 400 }); });
      plus_tard(e, 1150, () => { tracerDefaut(m2, { x: b.x, y: b.y, w: b.w, h: b.h }, { duree: 750, epaisseur: 7 }); M.etat("trouve"); M.regarder(-.4, .8); });
      plus_tard(e, 1900, () => { anime(e, btn, [{ transform: "scale(1)" }, { transform: "scale(.9)", offset: .3 }, { transform: "scale(1)" }], { duration: 600, fill: "none" });
        anime(e, voulu, [{ opacity: 1 }, { opacity: .4 }], { duration: 500 }); M.etat("fini"); M.regarder(-.2, .8); });
    },
  },
  produit: {
    arriver(e, instant) {
      const s = e.querySelector(".chemins"); s.textContent = ""; s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const ch = boite(e, e.querySelector(".champ")), pr = boite(e, e.querySelector(".pr")), so = boite(e, e.querySelector(".sortie")), p = perche(e);
      const a = [ch.x + ch.w + 10, ch.y + ch.h / 2], b = [pr.x + pr.w + 10, pr.y + pr.h / 2], c = [p.x - 50, p.y + 10], o = [so.x - 30, so.y + 40];
      const d1 = `M${a[0]} ${a[1]}C${a[0] + 160} ${a[1]} ${c[0] - 160} ${c[1] - 80} ${c[0]} ${c[1]}`;
      const d2 = `M${b[0]} ${b[1]}C${b[0] + 200} ${b[1]} ${c[0] - 180} ${c[1] + 90} ${c[0]} ${c[1]}`;
      const d3 = `M${p.x + 70} ${p.y}C${p.x + 120} ${p.y - 30} ${o[0] - 60} ${o[1]} ${o[0]} ${o[1]}`;
      const enc = "#1C1C1C";
      pointille(s, d1, { couleur: enc, instant, duree: 800, delai: 500 }); pointille(s, d2, { couleur: enc, instant, duree: 800, delai: 650 });
      if (instant) return;
      const fr = e.querySelector(".frappe"), bt = e.querySelector(".champ .bouton");
      anime(e, fr, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 700, easing: "steps(21, end)" });
      bt.classList.add("vole"); plus_tard(e, 1400, () => bt.classList.remove("vole"));
      anime(e, e.querySelector(".pr"), [{ opacity: 0, transform: "perspective(800px) rotateX(60deg) translateY(80px)" }, { opacity: 1, offset: .3 }, { opacity: 1, transform: "perspective(800px) rotateX(0deg) translateY(0)" }], { duration: 1050, delay: 150 });
      e.querySelectorAll(".sortie li").forEach((li, i) => anime(e, li, [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 1300 + i * 100 }));
    },
  },
  demo: {
    // calées image par image sur la vidéo v2 (30,0 s)
    LEGENDES: [
      [0, "Une PR s'ouvre. Horama part la vérifier."],
      [3.0, "Il visite l'aperçu du site, comme un visiteur."],
      [7.3, "Un texte déborde de sa boîte : <span class=\"cle\">trait rouge</span>."],
      [9.5, "L'agent de H parcourt le site et clique, comme vous."],
      [13.0, "Il lit chaque page, traduite en allemand."],
      [17.3, "Un bloc est resté en français : <span class=\"cle\">trait rouge</span>."],
      [19.0, "« J'ai fini. » 3 défauts prouvés, 2 doutes, 8 pages."],
      [22.4, "Chaque défaut revient : bug, ou voulu ?"],
      [26.3, "Vous tranchez : <span class=\"cle verdict\">c'est un bug</span>."],
      [27.2, "« C'est rangé. » La décision est gardée."],
    ],
    // la caméra dans la vidéo : centre (px de la vidéo 1280×862) et zoom, relevés image par image
    // cadrages choisis pour ne couper ni une colonne ni un bouton, et ne jamais montrer la bande blanche de droite (après 22,4 s)
    CAMERA: [
      [0, 640, 431, 1], [6.7, 640, 431, 1], [7.5, 395, 596, 1.62], [8.9, 395, 596, 1.62], [9.6, 640, 431, 1],
      [10.9, 640, 431, 1], [11.6, 430, 289, 1.49], [12.6, 430, 289, 1.49], [13.2, 640, 431, 1],
      [17.5, 640, 431, 1], [18.15, 330, 500, 2.1], [18.85, 330, 500, 2.1], [19.3, 640, 336, 1.28], [22.1, 640, 336, 1.28],
      [22.45, 540, 431, 1.19], [23.2, 540, 600, 1.45], [26.1, 540, 600, 1.45], [26.6, 540, 300, 1.4], [27.0, 540, 300, 1.4], [27.6, 540, 450, 1.4], [30, 540, 450, 1.4],
    ],
    camera(t) {
      const C = this.CAMERA; let i = 0; while (i < C.length - 2 && t > C[i + 1][0]) i++;
      const [t0, x0, y0, s0] = C[i], [t1, x1, y1, s1] = C[i + 1], u = lisse(clamp((t - t0) / (t1 - t0)));
      return [lerp(x0, x1, u), lerp(y0, y1, u), Math.exp(lerp(Math.log(s0), Math.log(s1), u))];
    },
    arriver(e, instant) {
      const v = e.querySelector("video"), f = e.querySelector(".feuille"), lg = e.querySelector(".legende");
      const Wd = 1210, Hd = 815, k = Wd / 1280;
      v.pause(); try { v.currentTime = 0; } catch {}
      const cadrer = t => {
        const [cx, cy, s] = this.camera(t);
        const tx = clamp(Wd / 2 - cx * k * s, Wd - Wd * s, 0), ty = clamp(Hd / 2 - cy * k * s, Hd - Hd * s, 0);
        v.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
      };
      let cur = -1;
      const montrer = (i, anim) => {
        if (i === cur) return; cur = i; lg.innerHTML = this.LEGENDES[i][1];
        if (!anim) return;
        retenir(e, lg.animate([{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: SORTIE }));
        const cle = lg.querySelector(".cle");
        if (cle) { const s = el("svg", null, cle, true), w = cle.offsetWidth, h = cle.offsetHeight;
          s.setAttribute("viewBox", `0 0 ${w} ${h}`); Object.assign(s.style, { width: w + "px", height: h + "px" });
          setTimeout(() => tracerDefaut(s, { x: 0, y: 2, w, h: h - 4 }, { duree: 700, epaisseur: 7 }), 120);
          if (cle.classList.contains("verdict")) retenir(e, f.animate([{ transform: "rotateZ(0deg) scale(1)" }, { transform: "rotateZ(.6deg) scale(1.025)", offset: .25 }, { transform: "rotateZ(0deg) scale(1)" }], { duration: 700, easing: SORTIE, composite: "add" })); }
      };
      montrer(0, false); cadrer(0);
      if (instant) return;
      anime(e, f, [{ opacity: 0, transform: "translate3d(0,320px,-600px) rotateX(66deg)" }, { opacity: 1, offset: .2 }, { opacity: 1, transform: "translate3d(0,0,0) rotateX(0deg)" }], { duration: 1150 });
      plus_tard(e, 1000, () => { v.play().catch(() => {}); });
      const suivre = () => {
        const t = v.currentTime; let i = 0;
        this.LEGENDES.forEach((L, j) => { if (t >= L[0]) i = j; });
        montrer(i, true); cadrer(t);
        e._boucle = requestAnimationFrame(suivre);
      };
      e._boucle = requestAnimationFrame(suivre);
    },
    quitter(e) { e.querySelector("video").pause(); },
  },
  archi: {
    NOEUDS: [
      ["pr", 250, 370, "PR GitHub", "aperçu Vercel"], ["reveil", 600, 330, "Le réveil", "choisit les tests"],
      ["ext", 250, 740, "Extension Chrome", "ou page d'accueil"], ["service", 600, 770, "Le service", "sur Railway"],
      ["h", 960, 540, "Agent H dans Chrome", "H Company"],
      ["code", 1330, 380, "Le code prouve", "liens, langue"], ["holo", 1330, 720, "Holo doute", "sur la capture"],
      ["vous", 1640, 550, "Vous tranchez", "bug ou voulu"], ["pr2", 1720, 290, "Réponse sur la PR", "vault mis à jour"],
      ["plus", 960, 840, "Plusieurs agents", "en parallèle", 1], ["docs", 250, 560, "Confluence, Notion", "en entrée", 1], ["jira", 1720, 820, "Jira, Linear", "en sortie", 1],
    ],
    LIENS: [["pr", "reveil"], ["reveil", "h"], ["ext", "service"], ["service", "h"], ["h", "code"], ["h", "holo"], ["code", "vous"], ["holo", "vous"], ["vous", "pr2"],
      ["h", "plus", 1], ["docs", "reveil", 1], ["vous", "jira", 1]],
    arriver(e, instant) {
      const s = e.querySelector(".ciel-archi"), box = e.querySelector(".noeuds"); s.textContent = ""; box.textContent = "";
      const P = Object.fromEntries(this.NOEUDS.map(n => [n[0], n]));
      this.LIENS.forEach(([a, b, prevu], i) => {
        const A = P[a], B = P[b], mx = (A[1] + B[1]) / 2, d = `M${A[1]} ${A[2]}C${mx} ${A[2]} ${mx} ${B[2]} ${B[1]} ${B[2]}`;
        pointille(s, d, { classe: "lien" + (prevu ? " prevu" : ""), instant, duree: 700, delai: 250 + Math.min(i * 90, 900) });
      });
      this.NOEUDS.forEach(([id, x, y, nom, petit, prevu], i) => {
        const c = el("circle", "etoile" + (prevu ? " prevu" : ""), s, true); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", id === "h" ? 0 : prevu ? 17 : 14);
        const lab = el("div", "noeud" + (prevu ? " prevu" : ""), box); lab.innerHTML = `${nom}<small>${petit}</small>`;
        Object.assign(lab.style, { left: x + "px", top: (id === "h" ? y + 74 : y + 26) + "px" });
        if (instant) return;
        const dl = 150 + Math.min(i * 80, 900);
        retenir(e, c.animate([{ transform: "scale(0)" }, { transform: "scale(1.8)", offset: .4 }, { transform: "scale(1)" }], { duration: 900, delay: dl, easing: SORTIE, fill: "both" }));
        c.style.transformOrigin = `${x}px ${y}px`; c.style.transformBox = "view-box";
        anime(e, lab, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: dl + 100 });
      });
    },
  },
  prix: {
    arriver(e, instant) {
      e.querySelectorAll(".pilier").forEach((p, i) => {
        const prix = +p.dataset.prix, h = Math.max(26, prix * 2.3), col = p.querySelector(".colonne"), lab = p.querySelector(".prix"), n = p.querySelector(".n");
        col.style.height = h + "px"; lab.style.bottom = h + 18 + "px"; p.style.height = h + "px";
        const mg = col.querySelector(".marge");
        if (mg) { mg.style.height = (h * p.dataset.marge / 100) + "px";
          const hm = h * p.dataset.marge / 100, note = p.querySelector(".note-marge") || el("p", "note-marge", p), cout = p.querySelector(".note-cout") || el("p", "note-marge note-cout", p);
          note.textContent = `marge ${p.dataset.marge} %`; cout.textContent = `coût H ${p.dataset.cout} $`;
          Object.assign(note.style, { left: 0, right: 0, textAlign: "center", top: (hm / 2 - 16) + "px", fontSize: "30px" });
          Object.assign(cout.style, { left: 0, right: 0, textAlign: "center", top: (hm + (h - hm) / 2 - 16) + "px", fontSize: "28px", fontWeight: 500 }); }
        if (instant) { n.textContent = prix; return; }
        anime(e, col, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 1100, delay: 200 + i * 150 });
        col.style.transformOrigin = "50% 100%";
        anime(e, lab, [{ transform: `translateY(${h}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 1100, delay: 200 + i * 150 });
        n.textContent = "0"; compter(e, n, prix, { duree: 1100, delai: 200 + i * 150 });
        if (mg) { anime(e, mg, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 900 + i * 150 }); p.querySelectorAll(".note-marge").forEach(nn => anime(e, nn, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1000 + i * 150 })); }
      });
      if (!instant) e.querySelectorAll(".nom").forEach((n, i) => anime(e, n, [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 300 + i * 150 }));
    },
  },
  chemin: {
    arriver(e, instant) {
      const path = e.querySelector(".trace-c"), L = path.getTotalLength(), etapes = [...e.querySelectorAll(".etape")];
      [.0, .36, .66, 1].forEach((f, i) => { const q = path.getPointAtLength(L * f); Object.assign(etapes[i].style, { left: q.x - 32 + "px", top: q.y - 32 + "px" }); });
      const masque = e.querySelector("svg.courbe"); [...masque.querySelectorAll("mask")].forEach(m => m.remove());
      path.removeAttribute("mask");
      if (instant) return;
      const { p } = pointille(masque, path.getAttribute("d"), { classe: "trace-c", duree: 1400, delai: 200 });
      path.style.visibility = "hidden"; plus_tard(e, 1700, () => { path.style.visibility = ""; p.remove(); });
      // l'envoyé suit le chemin qu'il trace
      const t0 = performance.now() + 200, duree = 1400, ease = bezier(.45, .05, .25, 1), fin = perche(e);
      const vol = now => {
        if (courante !== e) return;
        if (transition) { e._boucle = requestAnimationFrame(vol); return; }
        const t = clamp((now - t0) / duree), q = path.getPointAtLength(L * ease(t)), q2 = path.getPointAtLength(Math.min(L, L * ease(t) + 4));
        M.regarder(q2.x - q.x, q2.y - q.y);
        placer(q.x, q.y - 40, lerp(fin.t, 150, t), (q2.y - q.y) * 4);
        if (t < 1) e._boucle = requestAnimationFrame(vol); else { M.etat("fini"); M.regarder(-1, .3); placer(q.x + 70, q.y - 90, 150); }
      };
      e._boucle = requestAnimationFrame(vol);
      etapes.forEach((s, i) => anime(e, s, [{ opacity: 0, transform: "translateY(30px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 200 + [0, .36, .66, 1][i] * 1300 }));
    },
  },
  route: {
    arriver(e, instant) {
      const zone = e.querySelector(".pages-m"); zone.textContent = "";
      const p = perche(e), cases = [];
      for (let i = 0; i < 8; i++) { const x = 470 + (i % 4) * 172, y = 380 + Math.floor(i / 4) * 150;
        const pg = el("div", "page-m", zone); Object.assign(pg.style, { left: x + "px", top: y + "px" });
        pg.innerHTML = `<i style="top:40px"></i><i style="top:60px;right:46px"></i>`; cases.push([x + 70, y - 6, pg]); }
      const demain = e.querySelector(".demain");
      cases.forEach(([x, y, pg], i) => {
        const m = creerMascotte(84); m.etat("regarde"); m.regarder(0, 1);
        const c = jetable(e, el("div", "clone", e)); c.appendChild(m.el);
        Object.assign(c.style, { transform: `translate(${x - 42}px,${y - 42}px)` });
        if (instant) return;
        anime(e, pg, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 500 + i * 60 });
        anime(e, c, [{ opacity: 0, transform: `translate(${p.x - 42}px,${p.y - 42}px) scale(1.6)` }, { opacity: 1, offset: .15 },
          { opacity: 1, transform: `translate(${x - 42}px,${y - 42}px) scale(1)` }], { duration: 1100, delay: 800 + i * 70 });
      });
      if (instant) return;
      anime(e, demain, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 700 });
      e.querySelectorAll(".listes li").forEach((li, i) => anime(e, li, [{ opacity: 0, transform: "translateX(30px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 300 + i * 90 }));
    },
  },
  cout: {
    arriver(e, instant) {
      const ch = e.querySelector(".chiffre"), n = ch.querySelector(".nombre"), $ = ch.querySelector(".dollar"), pli = e.querySelector(".pli"), m = calque(e);
      n.textContent = "0,25";
      const a = boite(e, n), z = boite(e, $);
      const rect = { x: a.x + 8, y: a.y - 6, w: z.x + z.w - a.x + 20, h: a.h + 12 };
      if (instant) { tracerDefaut(m, rect, { instant: true, epaisseur: 10 }); pli.style.transform = "perspective(800px) rotateY(-12deg) rotateZ(2deg)"; return; }
      compter(e, n, 25, { duree: 1050, delai: 100, format: v => "0," + String(Math.round(v)).padStart(2, "0") });
      anime(e, ch, [{ fontVariationSettings: '"XROT" 0, "YROT" 40' }, { fontVariationSettings: '"XROT" 0, "YROT" 0' }], { duration: 1100, fill: "none" });
      anime(e, pli, [{ opacity: 0, transform: "perspective(800px) translateX(160px) rotateY(-72deg) rotateZ(0deg)" }, { opacity: 1, offset: .25 },
        { opacity: 1, transform: "perspective(800px) translateX(0) rotateY(-12deg) rotateZ(2deg)" }], { duration: 1150, delay: 150 });
      e.querySelectorAll(".pli .bloc").forEach((b, i) => anime(e, b, [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 600 + i * 150 }));
      plus_tard(e, 700, () => tracerDefaut(m, rect, { duree: 820, epaisseur: 10 }));
    },
  },
  fin: {
    arriver(e, instant, via) {
      const q = e.querySelector(".qr");
      if (!q.firstChild) {
        const mat = qrMatrice("https://github.com/Hisseiny/Horama-"), N = mat.length, s = el("svg", null, q, true);
        s.setAttribute("viewBox", `-4 -4 ${N + 8} ${N + 8}`); s.setAttribute("shape-rendering", "crispEdges");
        let h = ""; mat.forEach((row, y) => row.forEach((v, x) => { if (v) h += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="#1C1C1C" data-d="${x + y}"/>`; }));
        s.innerHTML = h;
      }
      if (instant) return;
      q.querySelectorAll("rect").forEach(r => retenir(e, r.animate([{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "none" }],
        { duration: 500, delay: 500 + Math.min(+r.dataset.d * 11, 600), easing: SORTIE, fill: "both" })));
      q.querySelectorAll("rect").forEach(r => { r.style.transformBox = "fill-box"; r.style.transformOrigin = "50% 50%"; });
      if (e._soleil) anime(e, e._soleil.querySelector(".leve"), [{ transform: "translateY(380px)" }, { transform: "none" }], { duration: 1200, fill: "none" });
      anime(e, e.querySelector(".dit"), [{ opacity: 0, transform: "translateY(30px) rotate(-6deg)" }, { opacity: 1, transform: "rotate(-3deg)" }], { duration: 900, delay: 900 });
      anime(e, e.querySelector(".lien-ext"), [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 300 });
    },
  },
};

/* ---------- navigation ---------- */
const idx = e => escs.indexOf(e);
const numero = e => idx(e) + 1;
function arriver(e, instant, via) { courante = e; nettoyer(e); ESCALES[e.dataset.anim]?.arriver(e, instant, via); history.replaceState(null, "", "#" + numero(e)); }
function quitter(e) { if (!e) return; ESCALES[e.dataset.anim]?.quitter?.(e); nettoyer(e); }

function tween(ms, step, done) {
  const t0 = performance.now(); let fini = false, id = 0;
  const tick = now => { const t = Math.min(1, (now - t0) / ms); step(t); if (t < 1 && !fini) id = requestAnimationFrame(tick); else if (!fini) { fini = true; done && done(); } };
  id = requestAnimationFrame(tick);
  return { finir() { if (fini) return; cancelAnimationFrame(id); step(1); fini = true; done && done(); } };
}

function aller(cible, instant) {
  while (transition) transition.finir();
  const depart = courante;
  if (!depart || instant) {
    quitter(depart); cam.x = idx(cible) * STEP; cam.zc = 0; cam.off = [0, 0];
    poserCiel(cible.dataset.ciel); rendre(); poser(cible); points = []; tracer(); arriver(cible, false, "saut"); return;
  }
  if (cible === depart) return;
  const avant = idx(cible) > idx(depart);
  if (avant && depart.dataset.sortie === "plongee" && perche(depart) && hote.style.visibility !== "hidden") plonger(depart, cible); else voler(depart, cible);
}

/* le vol : la caméra traverse le ciel et un banc de nuages, l'envoyé file devant et laisse son pointillé */
function voler(a, b) {
  quitter(a);
  const dir = idx(b) > idx(a) ? 1 : -1, x0 = cam.x, x1 = idx(b) * STEP, fP = COUCHES.pres.f;
  const xs = (Math.min(idx(a), idx(b)) + .5) * STEP * fP + W / 2;
  const B = perche(b) || { x: dir > 0 ? W + 220 : -220, y: 260, t: pose.t };
  const A = hote.style.visibility === "hidden" ? { x: dir > 0 ? -220 : W + 220, y: 300, t: B.t } : { ...pose };
  const P1 = [A.x + dir * 60, A.y - 360], P2 = [B.x - dir * 240, B.y - 560];
  const bez = (u, i) => (1 - u) ** 3 * [A.x, A.y][i] + 3 * (1 - u) ** 2 * u * P1[i] + 3 * (1 - u) * u * u * P2[i] + u ** 3 * [B.x, B.y][i];
  points = []; stage.classList.add("vol"); hote.classList.add("vole"); hote.style.visibility = "";
  COUCHES.pres.els[0].classList.toggle("nuit", a.dataset.ciel === "nuit" && b.dataset.ciel === "nuit");
  traceSvg.getAnimations().forEach(x => x.cancel());
  M.etat("regarde"); M.regarder(dir, -.25);
  cam.mode = "vol"; cam.E = [W / 2, H / 2]; cam.off = [0, 0];
  transition = tween(1150, t => {
    const e = panEase(t), u = douce(t);
    cam.x = lerp(x0, x1, e); cam.zc = -380 * Math.sin(Math.PI * e);
    const sN = 520 / (520 - cam.zc), sM = 1000 / (1000 - cam.zc);
    poserCiel(a.dataset.ciel, b.dataset.ciel, W / 2 + (xs - cam.x * fP - W / 2) * sN, dir); rendre();
    const x = bez(u, 0), y = bez(u, 1), taille = lerp(A.t, B.t, u);
    placer(x, y, taille, dir * 14 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
    points.push([(x - W / 2) / sM + W / 2 + cam.x, (y + taille * .12 - H / 2) / sM + H / 2]); tracer();
  }, () => {
    transition = null; cam.zc = 0; cam.mode = null; stage.classList.remove("vol"); hote.classList.remove("vole");
    poserCiel(b.dataset.ciel); rendre();
    traceSvg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1200, delay: 500, easing: "ease-in-out", fill: "forwards" });
    if (courante === b) { if (perche(b)) { base = perche(b); placer(B.x, B.y, B.t, 0); M.etat(b.dataset.etat || "regarde"); M.regarder(...regard(b)); } else hote.style.visibility = "hidden"; }
  });
  arriver(b);
}

/* la plongée : la caméra entre dans l'œil de l'envoyé (plans en profondeur), traverse la pupille, et l'escale suivante en sort */
const voile = document.getElementById("voile"), plongee = document.getElementById("plongee");
const OEIL = `<g fill="#AFA9EC" stroke="#1C1C1C" stroke-width="2.5" stroke-linejoin="round"><path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z"/><path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z"/></g><circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" stroke-width="3"/><circle cx="48" cy="48" r="10.5" fill="#7F77DD"/><circle cx="48" cy="48" r="4.6" fill="#1C1C1C"/><circle cx="51.6" cy="44.4" r="2.2" fill="#fff"/>`;
function plonger(a, b) {
  quitter(a);
  const A = { ...pose }, centre = [W / 2 - A.x, H / 2 - A.y];
  cam.E = [A.x, A.y];
  // les plans de l'escale qui part : les titres sont plus près de nous que l'œil
  cam.plans = [...a.children].filter(n => !(n instanceof SVGElement) || n.classList.contains("chemins")).map(n => {
    const b0 = boite(a, n), D = n.matches("h1, h2, .slogan") ? 480 : n.matches(".pli, .carte, .panneau, p") ? 720 : 900;
    return { n, D, ox: b0.x, oy: b0.y };
  });
  // des nuages entre nous et l'œil, qui passent de chaque côté
  const nuit = a.dataset.ciel === "nuit"; plongee.className = nuit ? "nuit" : "";
  cam.nuees = Array.from({ length: 18 }, (_, i) => { const ang = i / 18 * Math.PI * 2 + hasard(), r = 220 + hasard() * 640, w = 160 + hasard() * 240;
    return { n: nuage(plongee, 0, 0, w, hasard() > .5), x: A.x + Math.cos(ang) * r, y: A.y + Math.sin(ang) * r * .75, D: 200 + hasard() * 700, w }; });
  cam.nuees.forEach(q => { q.n.style.transformOrigin = "0 0"; q.n.style.left = q.n.style.top = "0px"; });
  voile.innerHTML = `<g>${OEIL}</g>`;
  const g = voile.firstChild, SMAX = Math.max(150, 1180 * 96 / (4.6 * A.t));
  hote.style.visibility = "hidden"; points = []; tracer();
  const accel = bezier(.42, 0, .9, .5);
  transition = tween(820, t => {
    const s = Math.exp(Math.log(SMAX) * accel(t)), k = douce(t);
    cam.zc = 1000 * (1 - 1 / s); cam.off = [centre[0] * k, centre[1] * k]; rendre();
    cam.nuees.forEach(q => q.n.style.opacity = clamp(t / .2));
    g.setAttribute("transform", `translate(${(A.x + cam.off[0]).toFixed(2)} ${(A.y + cam.off[1]).toFixed(2)}) scale(${(s * A.t / 96).toFixed(4)}) translate(-48 -48)`);
  }, () => {
    // dans la pupille : l'ombre, un reflet ; l'escale suivante sort du fond
    cam.plans.forEach(p => { p.n.style.scale = ""; p.n.style.transformOrigin = ""; p.n.style.visibility = ""; }); cam.plans = [];
    cam.nuees.forEach(q => q.n.remove()); cam.nuees = [];
    cam.E = [W / 2, H / 2]; cam.off = [0, 0]; cam.x = idx(b) * STEP; cam.zc = -330; cam.mode = "sortie";
    poserCiel(b.dataset.ciel); poser(b); rendre();
    const R = Math.hypot(W, H) / 2 + 60;
    voile.innerHTML = `<defs><radialGradient id="pup" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#2A2647"/><stop offset=".38" stop-color="#2A2647"/><stop offset="1" stop-color="#1C1C1C"/></radialGradient>
      <filter id="flou" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
      <mask id="ouv" maskUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"><rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="#fff"/><circle id="trou" cx="${W / 2}" cy="${H / 2}" r="0" fill="#000"/></mask></defs>
      <g mask="url(#ouv)"><rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="url(#pup)"/>
      <ellipse id="reflet" cx="${W * .3}" cy="${H * .26}" rx="300" ry="190" fill="#FBF5E6" opacity=".34" filter="url(#flou)"/><circle id="eclat" cx="${W * .33}" cy="${H * .3}" r="46" fill="#FBF5E6" opacity=".85"/></g>
      <path id="iris" fill="#7F77DD" fill-rule="evenodd" stroke="#1C1C1C" stroke-width="7"/>`;
    const trou = voile.querySelector("#trou"), iris = voile.querySelector("#iris"), reflet = voile.querySelector("#reflet"), eclat = voile.querySelector("#eclat");
    const rond = r => `M${W / 2 - r} ${H / 2}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    arriver(b);
    // l'escale sort aussitôt, déjà presque à sa taille : la pupille s'ouvre comme un iris
    transition = tween(900, t => {
      reflet.setAttribute("cx", (W * .3 + t * 160).toFixed(1)); eclat.setAttribute("cx", (W * .33 + t * 220).toFixed(1));
      const u = expoOut(t), r = 170 + u * (R * 1.08 - 170), r2 = r * 1.45 + 26;
      trou.setAttribute("r", r.toFixed(1)); iris.setAttribute("d", rond(r2) + rond(r));
      cam.zc = -330 * (1 - u); rendre();
    }, () => { voile.innerHTML = ""; transition = null; cam.zc = 0; cam.mode = null; rendre(); if (base) placer(base.x, base.y, base.t); });
  });
}

/* ---------- mise à l'échelle et commandes (moteur de l'étalon Dorel) ---------- */
function ajuster() { const k = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(${(innerWidth - W * k) / 2}px,${(innerHeight - H * k) / 2}px) scale(${k})`; }
addEventListener("resize", ajuster); ajuster();
const parNumero = n => escs[(parseInt(n) || 1) - 1];
const suivante = d => escs[Math.min(escs.length - 1, Math.max(0, idx(courante) + d))];
addEventListener("keydown", ev => {
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(ev.key)) { aller(suivante(1)); ev.preventDefault(); }
  if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(ev.key)) { aller(suivante(-1)); ev.preventDefault(); }
  if (ev.key === "f" || ev.key === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});
addEventListener("click", ev => aller(suivante(ev.clientX < innerWidth / 4 ? -1 : 1)));
addEventListener("hashchange", () => { const e = parNumero(location.hash.slice(1)); if (e && e !== courante) aller(e); });

// impression : une escale par page, chaque escale dans son état final
addEventListener("beforeprint", () => {
  for (const e of escs) {
    nettoyer(e); ESCALES[e.dataset.anim]?.arriver(e, true);
    const p = perche(e);
    if (p) { const etat = { regarde: "observe" }[e.dataset.etat] || e.dataset.etat || "observe", t = p.t * 104 / 96;
      const img = jetable(e, new Image()); img.className = "imp-mascotte"; img.src = `assets/${etat}.svg`; img.alt = "";
      Object.assign(img.style, { left: p.x - t / 2 + "px", top: p.y - t / 2 + "px", width: t + "px", height: t + "px" }); e.appendChild(img); }
  }
});
addEventListener("afterprint", () => { const e = courante; courante = null; aller(e, true); });

(document.fonts?.ready ?? Promise.resolve()).then(() => {
  cam.x = 0; rendre(); decor();
  aller(parNumero(location.hash.slice(1)) || escs[0], true);
});
window.__deck = { aller: n => aller(parNumero(n)), qrMatrice };
})();
