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
  peauJour.after(peauNuit); peauNuitEl = peauNuit;
  for (const k of ["loin", "milieu", "banc"]) COUCHES[k].els.push(peauNuit.querySelector(`[data-c="${k}"]`));
}

/* ---------- les ciels : un fond par escale, une couture cachée derrière le banc de nuages ---------- */
const CIELS = { lever: "#FBF5E6", ciel: "#E3E0F9", nuit: "#2A2647", aube: "#FFE39A" };
const fondA = document.getElementById("fond-a"), fondB = document.getElementById("fond-b");
let peauNuitEl = null;
const peaux = () => [peauJour, peauNuitEl || peauJour];
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
  fusion: {
    // chaque cible mène à son entrée, les deux chemins mènent à l'envoyé, puis aux mêmes preuves
    arriver(e, instant) {
      const s = e.querySelector(".chemins"); s.textContent = ""; s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const pa = boite(e, e.querySelector(".pa")), pb = boite(e, e.querySelector(".pb")), ch = boite(e, e.querySelector(".champ")), pr = boite(e, e.querySelector(".pr"));
      const so = boite(e, e.querySelector(".sortie")), p = perche(e), enc = "#1C1C1C";
      const c = [p.x - 70, p.y + 6], o = [so.x - 24, so.y + 120];
      const d = [
        `M${pa.x + pa.w + 8} ${pa.y + pa.h / 2}C${pa.x + pa.w + 40} ${pa.y + pa.h / 2} ${ch.x - 40} ${ch.y + ch.h / 2} ${ch.x - 8} ${ch.y + ch.h / 2}`,
        `M${pb.x + pb.w + 8} ${pb.y + pb.h / 2}C${pb.x + pb.w + 40} ${pb.y + pb.h / 2} ${pr.x - 40} ${pr.y + pr.h / 2} ${pr.x - 8} ${pr.y + pr.h / 2}`,
        `M${ch.x + ch.w + 10} ${ch.y + ch.h / 2}C${ch.x + ch.w + 80} ${ch.y + ch.h / 2} ${c[0] - 60} ${c[1] - 60} ${c[0]} ${c[1]}`,
        `M${pr.x + pr.w + 10} ${pr.y + pr.h / 2}C${pr.x + pr.w + 80} ${pr.y + pr.h / 2} ${c[0] - 60} ${c[1] + 60} ${c[0]} ${c[1]}`,
        `M${p.x + 70} ${p.y}C${p.x + 100} ${p.y - 20} ${o[0] - 40} ${o[1]} ${o[0]} ${o[1]}`,
      ];
      d.forEach((dd, k) => pointille(s, dd, { couleur: enc, instant, duree: 700, delai: [350, 450, 900, 1000, 1500][k] }));
      if (instant) return;
      e.querySelectorAll(".persona").forEach((n, k) => anime(e, n, [{ opacity: 0, transform: "perspective(900px) translate3d(-60px,40px,-200px) rotateY(60deg)" }, { opacity: 1, offset: .25 },
        { opacity: 1, transform: "perspective(900px) translate3d(0,0,0) rotateY(0deg)" }], { duration: 1100, delay: k * 150 }));
      const fr = e.querySelector(".frappe"), bt = e.querySelector(".champ .bouton");
      anime(e, fr, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 650, delay: 400, easing: "steps(13, end)" });
      bt.classList.add("vole"); plus_tard(e, 1600, () => bt.classList.remove("vole"));
      anime(e, e.querySelector(".pr"), [{ opacity: 0, transform: "perspective(900px) rotateX(-70deg)" }, { opacity: 1, offset: .3 }, { opacity: 1, transform: "perspective(900px) rotateX(0deg)" }], { duration: 1050, delay: 450 });
      e.querySelectorAll(".sortie li").forEach((li, k) => anime(e, li, [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 1500 + k * 100 }));
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
  demo: {
    // la vidéo, ses légendes et sa caméra sont dans assets/demo-moments.js (window.DEMO)
    camera(t) {
      const C = DEMO.camera; let i = 0; while (i < C.length - 2 && t > C[i + 1][0]) i++;
      const [t0, x0, y0, s0] = C[i], [t1, x1, y1, s1] = C[i + 1], u = lisse(clamp((t - t0) / (t1 - t0)));
      return [lerp(x0, x1, u), lerp(y0, y1, u), Math.exp(lerp(Math.log(s0), Math.log(s1), u))];
    },
    arriver(e, instant) {
      const v = e.querySelector("video"), f = e.querySelector(".feuille"), lg = e.querySelector(".legende");
      if (!v.getAttribute("src")) v.src = DEMO.video;
      const Wd = 1210, Hd = 815, k = Wd / DEMO.largeur;
      v.pause(); try { v.currentTime = 0; } catch {}
      const cadrer = (t, cam = this.camera(t)) => {
        const [cx, cy, s] = cam;
        const tx = clamp(Wd / 2 - cx * k * s, Wd - Wd * s, 0), ty = clamp(Hd / 2 - cy * k * s, Hd - Hd * s, 0);
        v.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
      };
      const legende = t => { let i = 0; DEMO.legendes.forEach((L, j) => { if (t >= L[0]) i = j; }); return i; };
      let cur = -1;
      const montrer = (i, anim) => {
        if (i === cur) return; cur = i; lg.innerHTML = DEMO.legendes[i][1];
        if (!anim) return;
        retenir(e, lg.animate([{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: SORTIE }));
        const cle = lg.querySelector(".cle");
        if (cle) { const s = el("svg", null, cle, true), w = cle.offsetWidth, h = cle.offsetHeight;
          s.setAttribute("viewBox", `0 0 ${w} ${h}`); Object.assign(s.style, { width: w + "px", height: h + "px" });
          setTimeout(() => tracerDefaut(s, { x: 0, y: 2, w, h: h - 4 }, { duree: 700, epaisseur: 7 }), 120);
          if (cle.classList.contains("verdict")) retenir(e, f.animate([{ transform: "rotateZ(0deg) scale(1)" }, { transform: "rotateZ(.6deg) scale(1.025)", offset: .25 }, { transform: "rotateZ(0deg) scale(1)" }], { duration: 700, easing: SORTIE, composite: "add" })); }
      };
      // pour le PDF : une image fixe de la vidéo, avec son cadre et sa légende
      e._figer = (tt) => { if (e._boucle) cancelAnimationFrame(e._boucle), e._boucle = 0; const [t, x, y, z] = tt == null ? DEMO.imagePdf : [tt, ...this.camera(tt)];
        v.pause(); v.currentTime = t; cadrer(t, [x, y, z]); cur = -1; montrer(legende(t), true); };
      montrer(0, false); cadrer(0);
      if (instant) return;
      anime(e, f, [{ opacity: 0, transform: "translate3d(0,320px,-600px) rotateX(66deg)" }, { opacity: 1, offset: .2 }, { opacity: 1, transform: "translate3d(0,0,0) rotateX(0deg)" }], { duration: 1150 });
      plus_tard(e, 1000, () => { v.play().catch(() => {}); });
      const suivre = () => { const t = v.currentTime; montrer(legende(t), true); cadrer(t); e._boucle = requestAnimationFrame(suivre); };
      e._boucle = requestAnimationFrame(suivre);
    },
    quitter(e) { e.querySelector("video").pause(); },
  },
  archi: {
    NOEUDS: [
      ["pr", 250, 370, "PR GitHub", "aperçu sur Vercel"], ["reveil", 600, 330, "Le réveil", "choisit les tests"],
      ["ext", 250, 740, "Extension, page d'accueil", "sur Vercel"], ["service", 600, 770, "Notre service", "d'exploration"],
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
    // un pilier par abonnement, hauteur proportionnelle à son prix en dollars ; la part blanche est le coût de l'agent H
    arriver(e, instant) {
      const PX = 2.55, MIN = 74; // pixels par dollar ; hauteur minimale de la barre Gratuit (agrandie, c'est dit sur la page)
      e.querySelectorAll(".pilier").forEach((p, i) => {
        const prix = +p.dataset.prix, cout = +p.dataset.cout, h = prix ? prix * PX : MIN, col = p.querySelector(".colonne"), lab = p.querySelector(".prix");
        col.style.height = h + "px"; lab.style.top = (1080 - 304 - h - 122) + "px";
        const c = col.querySelector(".cout"), mg = col.querySelector(".marge"), et = p.querySelector(".etiq-cout");
        if (prix) { c.style.height = cout * PX + "px"; mg.style.height = (h - cout * PX) + "px"; if (et) et.style.top = (1080 - 304 - cout * PX / 2 - 21) + "px"; }
        else c.style.height = h + "px";
        if (instant) return;
        anime(e, col, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 1100, delay: 150 + i * 150 });
        anime(e, lab, [{ transform: `translateY(${h}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 1100, delay: 150 + i * 150 });
        [...col.querySelectorAll("span"), ...(et ? [et] : [])].forEach(sp => anime(e, sp, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 850 + i * 150 }));
      });
      // l'hypothèse d'usage n'est pas une mesure : points ocre dessous
      const m = calque(e), hys = [...e.querySelectorAll(".hypothese")];
      if (instant) hys.forEach(hy => poserDoute(m, boite(e, hy), { instant: true, pas: 14, rayon: 4.6 }));
      else plus_tard(e, 500, () => hys.forEach(hy => poserDoute(m, boite(e, hy), { pas: 14, rayon: 4.6 })));
      if (!instant) e.querySelectorAll(".nom").forEach((n, i) => anime(e, n, [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 250 + i * 150 }));
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
    // l'envoyé inspecte la salle : il balaie le public du regard, s'arrête, le fixe, cligne, bat des ailes et se repose
    arriver(e, instant) {
      M.etat("fini"); M.regarder(0, 0);
      if (instant) { const q = perche(e); if (courante === e && q) { placer(q.x, q.y, q.t); hote.classList.remove("vole"); } return; }
      if (e._soleil) anime(e, e._soleil.querySelector(".leve"), [{ transform: "translateY(380px)" }, { transform: "none" }], { duration: 1200, fill: "none" });
      anime(e, e.querySelector(".dit"), [{ opacity: 0, transform: "translateY(30px) rotate(-6deg)" }, { opacity: 1, transform: "rotate(-3deg)" }], { duration: 900, delay: 700 });
      const p = perche(e), globe = M.el.querySelector(".globe"); globe.style.transformBox = "fill-box"; globe.style.transformOrigin = "50% 50%";
      const cligner = () => retenir(e, globe.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.08)" }, { transform: "scaleY(1)" }], { duration: 220, easing: "ease-in-out" }));
      // un cycle de 17 s : inspection perchée, vol en courbes sous le texte (jamais dessus), arrêt face au public, retour
      const S1 = [[p.x, p.y, p.t], [1760, 380, 230], [1500, 800, 210], [850, 800, 190], [320, 770, 190]];
      const S2 = [[320, 770, 190], [720, 720, 180], [1300, 720, 200], [1440, 430, 240], [p.x, p.y, p.t]];
      const courbe = (P, u) => { const n = P.length - 1, sg = Math.min(u * n, n - 1e-6), i = Math.floor(sg), f = sg - i, a = P[Math.max(i - 1, 0)], b = P[i], c = P[i + 1], d = P[Math.min(i + 2, n)];
        return [0, 1, 2].map(k => .5 * (2 * b[k] + (-a[k] + c[k]) * f + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f * f + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * f ** 3)); };
      const CYCLE = 17; let t0 = null, clins = new Set();
      const cligne = (cle, t, a) => { if (t > a && t < a + .2 && !clins.has(cle)) { clins.add(cle); cligner(); } };
      const boucle = now => {
        if (courante !== e) return;
        if (transition) { e._boucle = requestAnimationFrame(boucle); return; }
        if (t0 === null) t0 = now;
        const T = (now - t0) / 1000, t = T % CYCLE, tour = Math.floor(T / CYCLE);
        let dx = 0, dy = .05, pos = [p.x, p.y, p.t], vole = false, rot = 0;
        if (t < 4.6) {                                                     // perché : balaie la salle, revient au public, cligne
          if (t < .8) dx = lerp(0, -1, lisse(t / .8)); else if (t < 1.3) dx = -1;
          else if (t < 3.2) { dx = lerp(-1, 1, lisse((t - 1.3) / 1.9)); dy = .05 + .12 * Math.sin(Math.PI * (t - 1.3) / 1.9); }
          else if (t < 3.6) dx = 1; else if (t < 4.1) dx = lerp(1, 0, lisse((t - 3.6) / .5));
          cligne(tour + "a", t, 4.2);
        } else if (t < 9.0) {                                              // vole en courbes, regarde où il va
          const u = lisse((t - 4.6) / 4.4), q = courbe(S1, u), q2 = courbe(S1, Math.min(1, u + .02));
          pos = q; vole = true; dx = q2[0] - q[0]; dy = q2[1] - q[1]; rot = clamp((q2[0] - q[0]) * .8, -14, 14);
        } else if (t < 11.6) {                                             // s'arrête et fixe le public
          pos = [320, 770 - 10 * Math.sin((t - 9) * 2.4), 190]; dx = 0; dy = 0;
          cligne(tour + "b", t, 9.8); cligne(tour + "c", t, 10.4);
        } else if (t < 16.0) {                                             // repart, et revient se poser sur le soleil
          const u = lisse((t - 11.6) / 4.4), q = courbe(S2, u), q2 = courbe(S2, Math.min(1, u + .02));
          pos = q; vole = true; dx = q2[0] - q[0]; dy = q2[1] - q[1]; rot = clamp((q2[0] - q[0]) * .8, -14, 14);
        } else { dx = 0; dy = .05; cligne(tour + "d", t, 16.3); }
        M.regarder(dx, dy);
        placer(pos[0], pos[1], pos[2], rot);
        hote.classList.toggle("vole", vole);
        e._boucle = requestAnimationFrame(boucle);
      };
      e._boucle = requestAnimationFrame(boucle);
    },
    quitter() { hote.classList.remove("vole"); },
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
  const avant = idx(cible) > idx(depart), sortie = depart.dataset.sortie;
  if (!avant) return voler(depart, cible);
  if (sortie === "plongee" && perche(depart) && hote.style.visibility !== "hidden") return plonger(depart, cible);
  (SORTIES[sortie] || voler)(depart, cible);
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

/* ---------- les autres sorties : l'ancienne escale est figée (copie), la nouvelle se révèle selon la fiction ---------- */
const monde = document.getElementById("monde"), dessus = document.getElementById("dessus");
function figer(a) {
  // une copie légère de ce qui est à l'écran : les fonds, les nuages visibles, l'escale qui part, l'envoyé
  const c = el("div", "ancien"); Object.assign(c.style, { position: "absolute", left: 0, top: 0, width: W + "px", height: H + "px", overflow: "hidden" });
  [fondA, fondB].forEach(n => c.appendChild(n.cloneNode(false)));
  for (const peau of peaux()) {
    if (peau.style.display === "none" || c.contains(peau)) continue;
    const pc = c.appendChild(peau.cloneNode(false)); pc.removeAttribute("id");
    for (const couche of peau.children) {
      const cc = pc.appendChild(couche.cloneNode(false)), f = COUCHES[couche.dataset.c]?.f ?? 1;
      for (const ch of couche.children) {
        const x = parseFloat(ch.style.left), w = parseFloat(ch.style.width);
        if (ch.classList.contains("nuage") && (x - cam.x * f > W + 60 || x + w - cam.x * f < -60)) continue;
        cc.appendChild(ch.cloneNode(true));
      }
    }
    if (peaux()[0] === peaux()[1]) break;
  }
  const pr = c.appendChild(document.getElementById("principal").cloneNode(false)); pr.removeAttribute("id");
  const ca = pr.appendChild(a.cloneNode(true));
  const env = c.appendChild(hote.cloneNode(true)); env.removeAttribute("id"); Object.assign(env.style, { position: "absolute", left: 0, top: 0, width: "160px", height: "160px", transformOrigin: "80px 80px" });
  // la vidéo : son image du moment, sur une toile
  a.querySelectorAll("video").forEach((v, i) => { const cv = document.createElement("canvas"); cv.width = v.videoWidth || 1280; cv.height = v.videoHeight || 862;
    try { cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height); } catch {}
    cv.style.cssText = v.style.cssText; Object.assign(cv.style, { position: "absolute", left: 0, top: 0, width: "1210px", height: "815px", transformOrigin: "0 0" }); ca.querySelectorAll("video")[i].replaceWith(cv); });
  // l'état animé de l'escale qui part
  const A = [a, ...a.querySelectorAll("*")], B = [ca, ...ca.querySelectorAll("*")];
  A.forEach((n, i) => { if (!B[i] || !n.getAnimations || !n.getAnimations().length) return; const cs = getComputedStyle(n);
    B[i].style.transform = cs.transform; B[i].style.opacity = cs.opacity; B[i].style.clipPath = cs.clipPath; });
  return c;
}
function sauter(b) {
  cam.x = idx(b) * STEP; cam.zc = 0; cam.off = [0, 0]; cam.E = [W / 2, H / 2]; cam.mode = null;
  poserCiel(b.dataset.ciel); rendre(); poser(b); points = []; tracer(); arriver(b);
}
function reveler(a, b, duree, pas, { dessous = true, place } = {}) {
  const anc = figer(a);
  if (place) place(anc); else if (dessous) stage.insertBefore(anc, monde); else monde.after(anc);
  quitter(a); sauter(b);
  const fin = () => { anc.remove(); Object.assign(monde.style, { clipPath: "", maskImage: "", webkitMaskImage: "", maskSize: "", webkitMaskSize: "", maskRepeat: "", webkitMaskRepeat: "", transform: "", transformOrigin: "" });
    voile.innerHTML = ""; dessus.textContent = ""; hote.style.opacity = ""; transition = null; };
  pas(0, anc);
  transition = tween(duree, t => pas(t, anc), fin);
}
const AILE_D = "M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z";

const SORTIES = {
  // un coup d'aile de l'envoyé balaie l'écran ; derrière l'aile, l'escale suivante
  aile(a, b) {
    voile.innerHTML = `<g><path d="${AILE_D}" fill="#AFA9EC" stroke="#1C1C1C" stroke-width="6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g>`;
    const g = voile.firstChild, k = 52;
    reveler(a, b, 1050, t => {
      const e = douce(t), X = lerp(-80, W + 1500, e), ang = -26 + 44 * Math.sin(Math.PI * Math.min(1, t * 1.2));
      g.setAttribute("transform", `translate(${(X - 66 * k).toFixed(1)} ${(H / 2 - 44 * k).toFixed(1)}) scale(${k}) rotate(${ang.toFixed(2)} 66 46)`);
      monde.style.clipPath = `inset(0 ${Math.max(0, W - X).toFixed(1)}px 0 0)`;
    });
  },
  // la feuille suivante monte du bas en se redressant, l'ancienne bascule vers le fond
  bascule(a, b) {
    reveler(a, b, 1150, (t, anc) => {
      const e = expoOut(t), d = bezier(.5, 0, .3, 1)(t);
      monde.style.transformOrigin = "50% 100%";
      monde.style.transform = `perspective(1500px) translateY(${(H * .92 * (1 - e)).toFixed(1)}px) rotateX(${(38 * (1 - e)).toFixed(2)}deg)`;
      anc.style.transformOrigin = "50% 0"; anc.style.transform = `perspective(1500px) translateY(${(-H * .22 * d).toFixed(1)}px) rotateX(${(-28 * d).toFixed(2)}deg) scale(${(1 - .12 * d).toFixed(4)})`;
      anc.style.filter = `brightness(${(1 - .3 * d).toFixed(3)})`;
    });
  },
  // le pli se lève, se déplie, et devient l'escale suivante
  pli(a, b) {
    const src = a.querySelector(".pli"), r0 = src ? boite(a, src) : { x: W / 2 - 200, y: H / 2 - 130, w: 400, h: 260 };
    const C = { x: W / 2 - 330, y: H / 2 - 200, w: 660, h: 400 }, F = { x: -10, y: -10, w: W + 20, h: H + 20 };
    const carte = el("div", null, dessus), fond = el("div", null, carte), volet = el("div", null, carte);
    Object.assign(carte.style, { border: "3px solid #1C1C1C", borderRadius: "14px", transformStyle: "preserve-3d", boxSizing: "border-box" });
    Object.assign(fond.style, { position: "absolute", inset: 0, background: "#FFFDF6", borderRadius: "11px" });
    Object.assign(volet.style, { position: "absolute", left: "50%", top: "-3px", bottom: "-3px", width: "calc(50% + 3px)", background: "#F3EAD2", border: "3px solid #1C1C1C", borderRadius: "0 14px 14px 0", transformOrigin: "0 50%", boxSizing: "border-box" });
    const pose = r => Object.assign(carte.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    const mix = (p, q, u) => ({ x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), w: lerp(p.w, q.w, u), h: lerp(p.h, q.h, u) });
    reveler(a, b, 1200, t => {
      const t1 = douce(clamp(t / .32)), t2 = douce(clamp((t - .26) / .3)), t3 = expoOut(clamp((t - .55) / .45));
      const r = t < .55 ? mix(r0, C, t1) : mix(C, F, t3), ang = -180 * (1 - t2);
      pose(r); carte.style.transform = `rotateX(${(14 * (1 - t3)).toFixed(2)}deg) rotateZ(${(-3 * (1 - t1) + 1.5 * (1 - t3) * t1).toFixed(2)}deg)`;
      carte.style.clipPath = ang < -90 ? "inset(-6px 50% -6px -6px)" : "none";
      volet.style.transform = `rotateY(${ang.toFixed(2)}deg)`;
      const f = 1 - clamp((t - .55) / .12); fond.style.opacity = f; volet.style.opacity = f;
      carte.style.borderColor = `rgba(28,28,28,${1 - clamp((t - .85) / .15)})`;
      monde.style.clipPath = t < .55 ? "inset(50%)" : `inset(${r.y}px ${W - r.x - r.w}px ${H - r.y - r.h}px ${r.x}px round 14px)`;
    });
  },
  // l'escale se tourne comme une page (page-turn du kit), l'ombre glisse sur la suivante
  page(a, b) {
    let feuillet, ombre;
    reveler(a, b, 1150, t => {
      const e = bezier(.5, 0, .2, 1)(t);
      feuillet.style.transform = `rotateY(${(-178 * e).toFixed(2)}deg) skewY(${(-5 * Math.sin(Math.PI * e)).toFixed(2)}deg)`;
      ombre.style.opacity = (.55 * Math.sin(Math.PI * e)).toFixed(3);
    }, { place: anc => {
      ombre = el("div", null, dessus); Object.assign(ombre.style, { left: 0, top: 0, width: W + "px", height: H + "px", background: "linear-gradient(to right, rgba(28,28,28,.55), rgba(28,28,28,0) 45%)" });
      feuillet = el("div", null, dessus); Object.assign(feuillet.style, { left: 0, top: 0, width: W + "px", height: H + "px", transformOrigin: "0 50%", transformStyle: "preserve-3d" });
      Object.assign(anc.style, { backfaceVisibility: "hidden" }); feuillet.appendChild(anc);
      const dos = el("div", null, feuillet); Object.assign(dos.style, { position: "absolute", inset: 0, background: "#FFFDF6", border: "3px solid #1C1C1C", transform: "rotateY(180deg)", backfaceVisibility: "hidden" });
    } });
  },
  // la trame de points : la nouvelle escale arrive en bulles qui se calent
  trame(a, b) {
    const p = perche(a) || { x: W / 2, y: H / 2 - 60 }, c = 30, R = Math.hypot(W, H);
    reveler(a, b, 1100, t => {
      const r = c * .74 * expoOut(clamp(t / .8)), Rr = R * expoOut(clamp((t - .3) / .7));
      const m = `radial-gradient(circle, #000 ${r.toFixed(2)}px, transparent ${(r + .8).toFixed(2)}px), radial-gradient(circle at ${p.x}px ${p.y}px, #000 ${Rr.toFixed(1)}px, transparent ${(Rr + 1).toFixed(1)}px)`;
      Object.assign(monde.style, { maskImage: m, webkitMaskImage: m, maskSize: `${c}px ${c}px, 100% 100%`, webkitMaskSize: `${c}px ${c}px, 100% 100%`, maskRepeat: "repeat, no-repeat", webkitMaskRepeat: "repeat, no-repeat" });
    });
  },
  // le soleil se lève sur la nuit, grandit, et le jour de l'escale suivante est dedans
  soleil(a, b) {
    voile.innerHTML = `<g class="sol"><g class="rayons-t"></g><circle class="disque" fill="#FFC93C" stroke="#1C1C1C" stroke-width="3"/><circle class="bord" fill="none" stroke="#FFC93C" stroke-width="28"/><circle class="int" fill="none" stroke="#1C1C1C" stroke-width="3"/></g>`;
    const ray = voile.querySelector(".rayons-t"), disque = voile.querySelector(".disque"), bord = voile.querySelector(".bord"), int = voile.querySelector(".int");
    for (let i = 0; i < 36; i++) { const l = el("line", null, ray, true); l.dataset.a = i / 36 * Math.PI * 2; l.dataset.l = i % 2 ? 1.27 : 1.42;
      Object.assign(l.style, { stroke: "#FBF5E6", strokeWidth: 4, strokeLinecap: "round", strokeDasharray: "0 14", opacity: .8 }); }
    const cx = W / 2;
    reveler(a, b, 1200, t => {
      const t1 = douce(clamp(t / .42)), u = expoOut(clamp((t - .36) / .64));
      const cy = lerp(H + 260, H * .56, t1), r = 210 + u * (Math.hypot(W, H) * .78 - 210), ri = Math.max(0, r - 28);
      [disque, bord, int].forEach(c => { c.setAttribute("cx", cx); c.setAttribute("cy", cy.toFixed(1)); });
      disque.setAttribute("r", r.toFixed(1)); bord.setAttribute("r", (r - 14).toFixed(1)); int.setAttribute("r", ri.toFixed(1));
      disque.setAttribute("fill-opacity", (1 - clamp((t - .36) / .16)).toFixed(3));
      ray.querySelectorAll("line").forEach(l => { const an = +l.dataset.a + t * .6, k = +l.dataset.l;
        l.setAttribute("x1", (cx + Math.cos(an) * r * 1.1).toFixed(1)); l.setAttribute("y1", (cy + Math.sin(an) * r * 1.1).toFixed(1));
        l.setAttribute("x2", (cx + Math.cos(an) * r * k).toFixed(1)); l.setAttribute("y2", (cy + Math.sin(an) * r * k).toFixed(1)); });
      monde.style.clipPath = t < .36 ? "circle(0px at 50% 50%)" : `circle(${ri.toFixed(1)}px at ${cx}px ${cy.toFixed(1)}px)`;
    });
  },
  // l'envoyé tire l'escale suivante au bout de son pointillé d'encre
  pointille(a, b) {
    const m = creerMascotte(150), porteur = el("div", null, dessus); porteur.appendChild(m.el); m.regarder(-1, .1);
    const couleur = b.dataset.ciel === "nuit" ? "#FBF5E6" : "#1C1C1C";
    voile.innerHTML = `<path fill="none" stroke="${couleur}" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 17" opacity=".75"/>`;
    const fil = voile.firstChild, ease = bezier(.55, 0, .15, 1);
    reveler(a, b, 1150, (t, anc) => {
      const e = ease(t), L = W * (1 - e), mx = L - 250 - 140 * e, my = 330 + 40 * Math.sin(t * Math.PI * 2);
      monde.style.transformOrigin = "0 50%"; monde.style.transform = `perspective(1600px) translateX(${L.toFixed(1)}px) rotateY(${(-16 * (1 - e)).toFixed(2)}deg)`;
      anc.style.transform = `translateX(${(-W * .28 * e).toFixed(1)}px) scale(${(1 - .08 * e).toFixed(4)})`; anc.style.filter = `brightness(${(1 - .25 * e).toFixed(3)})`;
      porteur.style.transform = `translate(${mx.toFixed(1)}px,${(my - 75).toFixed(1)}px) rotate(${(-10 * Math.sin(Math.PI * e)).toFixed(2)}deg)`;
      fil.setAttribute("d", `M${(mx + 120).toFixed(1)} ${(my + 10).toFixed(1)}Q${((mx + L) / 2 + 60).toFixed(1)} ${(my + 170).toFixed(1)} ${(L + 6).toFixed(1)} 500`);
      hote.style.opacity = t < .95 ? 0 : 1;
    });
  },
  vol: (a, b) => voler(a, b),
};

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
window.__deck = { aller: n => aller(parNumero(n)), figerDemo: t => escs.find(e => e._figer)?._figer(t), instant: n => aller(parNumero(n), true) };
})();
