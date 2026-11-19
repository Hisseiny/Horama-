// Horama, direction « L'envoyé » : la scène du hero, le vol de la mascotte le long de la page,
// le trait qui se trace au défilement, la question « bug ou voulu ».
// La mascotte et le trait viennent des fichiers de l'équipe, importés tels quels.
import { creerMascotte } from "./mascotte.js";
import { tracerDefaut } from "./trait.js";
import { RAPPORT_URL, SERVICE } from "./service.js";
// Each exploration sent from this page, kept in this browser for the tower of control (accueil/tour/, #149): its id,
// its service, the address, the date. 30 at most, the latest first. Nothing leaves the browser.
function garder(id, adresse) {
  try {
    const cle = "horama-explorations";
    const liste = JSON.parse(localStorage.getItem(cle) ?? "[]").filter((e) => e && e.id !== id);
    localStorage.setItem(cle, JSON.stringify([{ id, service: SERVICE, adresse, date: new Date().toISOString() }, ...liste].slice(0, 30)));
  } catch {}
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// pour les captures : ?vh=900 fige la hauteur d'écran, ?sim=1200 simule un défilement (fenêtre de capture pleine hauteur)
const param = new URLSearchParams(location.search);
const VH = +param.get("vh") || 0, SIM = param.has("sim") ? +param.get("sim") : null;
if (VH) document.documentElement.style.setProperty("--vh", VH + "px");
const defile = () => SIM ?? scrollY, hauteurEcran = () => VH || innerHeight;

// ---------- les rayons du soleil : du pointillé, comme tout ce qui est seulement vu ----------
for (const g of $$(".soleil .rayons")) {
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2, r2 = i % 2 ? 250 : 276, l = document.createElementNS(NS, "line");
    l.setAttribute("x1", (Math.cos(a) * 214).toFixed(1)); l.setAttribute("y1", (Math.sin(a) * 214).toFixed(1));
    l.setAttribute("x2", (Math.cos(a) * r2).toFixed(1)); l.setAttribute("y2", (Math.sin(a) * r2).toFixed(1));
    g.appendChild(l);
  }
}

// ---------- la mascotte d'Inès, une seule pour toute la page ----------
const envoye = $("#envoye");
const masc = creerMascotte(184);
envoye.prepend(masc.el);
const arrivee = creerMascotte(112);
arrivee.etat("fini"); arrivee.el.classList.add("arrivee");
$(".final .escale").appendChild(arrivee.el);
let etatCourant = "regarde", etatForce = null;
function etat(e) { if (etatForce) return; if (e !== etatCourant) { etatCourant = e; masc.etat(e); } }
function forcer(e, ms) { etatForce = null; etat(e); etatForce = e; clearTimeout(forcer.t); forcer.t = setTimeout(() => { etatForce = null; maj(); }, ms); }

// ---------- 1. le hero : le titre porte un défaut voulu (« s. » passe sous le soleil), l'envoyé le repère ----------
const LIEN = { x: 466, y: 316, w: 384, h: 30 };          // le lien mort de la capture d'Eugenia (section « La preuve »), en pixels de la capture
const hero = $(".hero"), soleilHero = $("#soleil-hero"), nuageHero = $("#nuage-hero"), escaleHero = $("#escale-hero");
const marquesHero = $("#marques-hero"), pliHero = $("#pli-hero"), cacheHero = $("#cache");
let traitHero = null, cibleHero = null, versS = [-.5, .86], viseHero = false, minuteries = [], heroJoue = false;
const plusTard = (ms, f) => minuteries.push(setTimeout(f, ms));
const compactLayout = matchMedia("(width < 1100px)");
const compactMascotSize = 118;
const epHero = () => compactLayout.matches ? 3.6 : 5.4;
// tout se place à partir de « s. » : le bord du soleil passe sur sa moitié, l'envoyé se pose sur le soleil juste à droite
function placer() {
  const h = hero.getBoundingClientRect(), s = cacheHero.getBoundingClientRect();
  const headingSize = parseFloat(getComputedStyle(cacheHero).fontSize);
  const r = compactLayout.matches
    ? Math.min(118, headingSize * 2.5)
    : headingSize * 236 / 108;
  const P = { x: s.left - h.left + s.width * .26, y: s.top - h.top + s.height * .5 };
  const c = { x: P.x + r * .5, y: P.y + r * .866 }, taille = r * 560 / 196;   // le disque fait 196 sur 560 dans la vue
  Object.assign(soleilHero.style, { left: c.x - taille / 2 + "px", top: c.y - taille / 2 + "px", width: taille + "px", height: taille + "px" });
  Object.assign(nuageHero.style, { left: c.x + r * .78 + "px", top: c.y - r * 1.05 + "px" });
  const e = { x: c.x + r * .3, y: c.y - r * .5 };
  if (compactLayout.matches) e.x = Math.min(e.x, h.width - compactMascotSize / 2);
  Object.assign(escaleHero.style, { left: e.x + "px", top: e.y + "px" });
  cibleHero = { x: s.left - h.left - 4, y: s.top - h.top + s.height * .14, w: s.width + 8, h: s.height * .8 };
  const dx = cibleHero.x + cibleHero.w / 2 - e.x, dy = cibleHero.y + cibleHero.h / 2 - e.y, l = Math.hypot(dx, dy) || 1;
  versS = [dx / l, dy / l];
  hero.classList.add("pret");
}
function poseFinale() {
  minuteries.forEach(clearTimeout); minuteries = [];
  viseHero = true;
  if (!traitHero) traitHero = tracerDefaut(marquesHero, cibleHero, { instant: true, epaisseur: epHero() });
  pliHero.classList.remove("cache");
}
function jouerHero() {
  minuteries.forEach(clearTimeout); minuteries = [];
  traitHero?.remove(); traitHero = null;
  pliHero.classList.add("cache"); viseHero = false; heroJoue = false; etat("regarde"); maj();
  plusTard(700, () => { viseHero = true; maj(); });                  // il tourne l'œil vers « s. »
  plusTard(1300, () => { heroJoue = true; etat("trouve"); traitHero = tracerDefaut(marquesHero, cibleHero, { duree: 850, epaisseur: epHero() }); });
  plusTard(2100, () => pliHero.classList.remove("cache"));
  plusTard(16000, () => { if (scrollY < 60 && !document.hidden) jouerHero(); });
}

// ---------- 3. la preuve : le même trait, tracé par le défilement ----------
const traitPreuve = tracerDefaut($("#marques-preuve"), LIEN, { instant: true, epaisseur: 5.6 });
const quatre = $("#quatre");
function tracerPreuve(p) {
  const e = p * p * (3 - 2 * p);
  for (const c of traitPreuve.children) c.style.strokeDashoffset = (1 - e).toFixed(3);
  quatre.style.setProperty("--xr", ((1 - e) * 30).toFixed(1));
  quatre.style.setProperty("--yr", ((1 - e) * -16).toFixed(1));
}

// ---------- le vol : un chemin en pointillé d'escale en escale, parcouru au défilement ----------
const vol = $("#vol"), svgVol = $("svg", vol), gPts = $(".pts", vol), butin = $$(".butin i", vol);
const PAS = 13;
let T = null, dernierVu = -1;

function construire() {
  const sx = scrollX, sy = scrollY;
  const W = document.documentElement.clientWidth, petit = compactLayout.matches;
  const deux = v => v && !petit ? v.split(",").map(Number) : null;
  const A = $$(".escale").map(e => { const r = e.getBoundingClientRect(), o = e.dataset; return { x: r.left + sx, y: r.top + sy, etat: o.etat, boucle: o.boucle, nom: o.nom, via: "via" in o, c1: deux(o.c1), c2: deux(o.c2), scene: "via" in o ? null : e.closest("[data-scene]") }; });
  const b = $(".hero .champ .bouton").getBoundingClientRect();
  const D = { x: b.right + sx + 22, y: b.top + sy + b.height / 2 };
  const a0 = A[0];
  let d;
  if (petit) d = `M${a0.x} ${a0.y}`;                                   // sur téléphone la page reste figée : le chemin part de l'envoyé
  else {
    // du bouton, il passe sous le pli du hero, puis remonte sur le soleil
    const yb = Math.max(D.y, pliHero.getBoundingClientRect().bottom + sy) + 70;
    d = `M${D.x} ${D.y} C${D.x + 80} ${yb} ${a0.x - 120} ${yb + 20} ${a0.x} ${a0.y}`;
  }
  for (let i = 0; i < A.length - 1; i++) {
    const p = A[i], q = A[i + 1], dy = q.y - p.y, s = Math.sign(q.x - p.x) || 1;
    if (q.c1 || q.c2) {
      const c1 = q.c1 ? [p.x + q.c1[0], p.y + q.c1[1]] : [p.x, p.y + dy * .5], c2 = q.c2 ? [q.x + q.c2[0], q.y + q.c2[1]] : [q.x, q.y - dy * .5];
      d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${q.x} ${q.y}`;
    } else if (q.boucle && dy > 260) {
      const r = 30, mx = (p.x + q.x) / 2, my = p.y + dy * .5 + r;
      d += ` C${p.x} ${p.y + dy * .3} ${mx - s * 90} ${my} ${mx} ${my}`;
      d += ` a${r} ${r} 0 1 ${s > 0 ? 0 : 1} 0 ${-2 * r} a${r} ${r} 0 1 ${s > 0 ? 0 : 1} 0 ${2 * r}`;
      d += ` C${mx + s * 90} ${my} ${q.x} ${q.y - dy * .3} ${q.x} ${q.y}`;
    } else {
      d += ` C${p.x} ${p.y + dy * .5} ${q.x} ${q.y - dy * .5} ${q.x} ${q.y}`;
    }
  }
  const chemin = document.createElementNS(NS, "path"); chemin.setAttribute("d", d);
  const L = chemin.getTotalLength(), n = Math.max(2, Math.floor(L / PAS));
  const pts = [], v = [0];
  for (let i = 0; i <= n; i++) { const pt = chemin.getPointAtLength(i * PAS); pts.push([pt.x, pt.y]); }
  // paramètre de marche : la descente compte plein, le reste (travers, remontées, boucles) pour un tiers
  for (let i = 1; i < pts.length; i++) { const ddx = pts[i][0] - pts[i - 1][0], ddy = pts[i][1] - pts[i - 1][1]; v.push(v[i - 1] + Math.max(ddy, 0) + .34 * (Math.abs(ddx) + Math.max(-ddy, 0))); }
  let depuis = 0; const iA = A.map(a => { let best = depuis, bd = 1e12; for (let i = depuis; i < pts.length; i++) { const dd = (pts[i][0] - a.x) ** 2 + (pts[i][1] - a.y) ** 2; if (dd < bd) { bd = dd; best = i; } } depuis = best; return best; });
  const H = document.documentElement.scrollHeight;
  svgVol.setAttribute("width", W); svgVol.setAttribute("height", H);
  gPts.textContent = "";
  for (const [x, y] of pts) { const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); c.setAttribute("r", W < 700 ? 2.2 : 2.8); gPts.appendChild(c); }
  dernierVu = -1;
  document.body.classList.toggle("fige", reduit || petit);
  const de = nom => iA[A.findIndex(a => a.nom === nom)];
  const scenes = $$("[data-scene]").map(el => ({ el, haut: ($(".art, .piece, .cas", el) || el).getBoundingClientRect().top + sy }));
  T = { A, pts, v, iA, i0: iA[0], n: pts.length, cercles: gPts.children, petit, scenes, iPreuve: de("preuve"), iDoute: de("doute") };
}

function maj() {
  if (!T) return;
  const max = document.documentElement.scrollHeight - hauteurEcran(), sY = defile();
  const fige = reduit || T.petit;
  const f = fige ? 0 : max > 0 ? borne(sY / max) : 0;
  const vT = T.v[T.i0] + f * (T.v[T.n - 1] - T.v[T.i0]);
  let lo = T.i0, hi = T.n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T.v[mid] <= vT) lo = mid; else hi = mid; }
  const t = borne((vT - T.v[lo]) / Math.max(1e-6, T.v[hi] - T.v[lo]));
  const idx = lo + t, x = T.pts[lo][0] + (T.pts[hi][0] - T.pts[lo][0]) * t, y = T.pts[lo][1] + (T.pts[hi][1] - T.pts[lo][1]) * t;
  // taille : grande devant le soleil, plus petite en vol, grande à l'arrivée
  const grand = T.petit ? compactMascotSize : 184, vole = T.petit ? 78 : 104, fin = borne(1 - (T.n - 1 - idx) * PAS / 260);
  const taille = fige ? grand : grand + (vole - grand) * borne(sY / 380) + ((T.petit ? 104 : 136) - vole) * fin;
  masc.el.style.width = masc.el.style.height = taille.toFixed(1) + "px";
  envoye.style.transform = `translate(${(x - taille / 2).toFixed(1)}px, ${(y - taille / 2).toFixed(1)}px)`;
  // le pointillé déjà parcouru
  const vu = reduit && !T.petit ? T.n - 1 : Math.floor(idx) - 2;
  if (vu !== dernierVu) {
    const a = Math.min(vu, dernierVu), z = Math.max(vu, dernierVu);
    for (let i = Math.max(0, a); i <= z && i < T.n; i++) T.cercles[i].classList.toggle("vu", i <= vu);
    dernierVu = vu;
  }
  // les scènes le long du chemin : --p passe de 0 à 1 quand l'envoyé arrive
  const vh = hauteurEcran();
  for (const sc of T.scenes) {
    const p = reduit ? 1 : borne((sY + vh * .92 - sc.haut) / (vh * .5));
    sc.el.style.setProperty("--p", p.toFixed(3));
    if (sc.el.id === "preuve") tracerPreuve(p);
  }
  // l'état et le regard
  const enHaut = sY < 50;
  if (enHaut || fige) { etat(heroJoue ? "trouve" : "regarde"); masc.regarder(...(viseHero ? versS : [.6, .8])); }
  else {
    let e = "regarde";
    T.iA.forEach((i, k) => { if (k > 0 && !T.A[k].via && Math.abs(i - idx) * PAS < 120) e = T.A[k].etat; });
    if (idx > T.iA[T.iA.length - 1] - 6) e = "fini";
    etat(e);
    const q = T.pts[Math.min(T.n - 1, lo + 3)], dx = q[0] - x, dy = q[1] - y, l = Math.hypot(dx, dy) || 1;
    masc.regarder(dx / l, dy / l);
  }
  butin[0].classList.toggle("on", !fige && idx > T.iPreuve + 3);
  butin[1].classList.toggle("on", !fige && idx > T.iDoute + 3);
}

let attente = false;
addEventListener("scroll", () => {
  if (scrollY > 60 && minuteries.length) { poseFinale(); heroJoue = true; }
  if (!attente) { attente = true; requestAnimationFrame(() => { attente = false; maj(); }); }
}, { passive: true });
let tr; addEventListener("resize", () => { clearTimeout(tr); tr = setTimeout(() => {
  placer();
  if (traitHero) { traitHero.remove(); traitHero = tracerDefaut(marquesHero, cibleHero, { instant: true, epaisseur: epHero() }); }
  construire(); maj();
}, 120); });

// ---------- « bug ou voulu » : le doute devient un trait, ou s'efface ----------
const cas = $("#cas"), suite = $(".suite", cas), marquesCas = $(".marques-cas", cas);
let traitCas = null;
function repondre(rep) {
  traitCas?.remove(); traitCas = null;
  if (!rep) { delete cas.dataset.rep; suite.textContent = ""; return; }
  cas.dataset.rep = rep;
  const fin = " <a role=\"button\" tabindex=\"0\">Reposer la question</a>";
  suite.innerHTML = (rep === "bug"
    ? "Noté comme défaut. Horama l'écrit dans la documentation et le revérifie à chaque passage."
    : "Noté comme voulu. Horama l'écrit dans la documentation et ne vous le redemandera plus.") + fin;
  if (rep === "bug") {
    // on mesure une fois la carte à sa taille finale, puis le trait de l'équipe entoure le prix
    const c = cas.getBoundingClientRect(), r = $(".prix.vu", cas).getBoundingClientRect();
    marquesCas.setAttribute("viewBox", `0 0 ${c.width} ${c.height}`);
    traitCas = tracerDefaut(marquesCas, { x: r.left - c.left + 6, y: r.top - c.top + 3, w: r.width - 12, h: r.height - 16 }, { instant: reduit, epaisseur: 3.6 });
  }
  forcer(rep === "bug" ? "trouve" : "fini", 2600);
}
cas.addEventListener("click", e => {
  const b = e.target.closest("button[data-rep]"); if (b) return repondre(b.dataset.rep);
  if (e.target.closest(".suite a")) repondre(null);
});
cas.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest(".suite a")) repondre(null); });

// ---------- les champs : l'adresse part au service (#68) ----------
// Provisoire : sans page de rapport (RAPPORT_URL vide), le suivi est dit en texte sous le champ : la place dans la file,
// la visite, puis la phrase de bilan. Avec RAPPORT_URL, le visiteur y est envoyé dès que le service accepte l'adresse.
const compte = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const pause = (ms) => new Promise(r => setTimeout(r, ms));
async function suivre(id, dire) {
  for (;;) {
    const r = await fetch(`${SERVICE}/explorations/${encodeURIComponent(id)}`);
    const corps = await r.json().catch(() => ({}));
    if (r.status !== 200) { dire(corps.erreur || `Le service a répondu ${r.status}.`); return "fini"; }
    if (corps.etat === "en_file") dire(corps.place > 0 ? `En attente : ${compte(corps.place, "visite passe", "visites passent")} avant la vôtre.` : "Il part…");
    else if (corps.format === "horama-exploration-1") {
      const { totaux } = corps;
      if (corps.etat === "en_cours") dire(`Il visite le site : ${compte(totaux.pages_visitees, "page visitée", "pages visitées")} sur ${totaux.pages_trouvees}.`);
      else if (!totaux.pages_visitees) {
        const raison = (corps.agents?.find(a => a.raison)?.raison ?? corps.pages?.find(p => p.raison)?.raison ?? "").trim().replace(/\.+$/, "");
        dire(raison ? `Horama n'a pas pu visiter ce site : ${raison.charAt(0).toLowerCase()}${raison.slice(1)}.` : "Horama n'a pas pu visiter ce site.");
        return "fini";
      } else {
        dire(`J'ai fini : ${compte(totaux.defauts, "défaut prouvé", "défauts prouvés")}, ${totaux.doutes} à trancher, sur ${compte(totaux.pages_visitees, "page visitée", "pages visitées")}.`);
        return totaux.defauts ? "trouve" : "fini";
      }
    }
    await pause(1000);
  }
}
for (const f of $$("form[data-envoi]")) f.noValidate = true; // « monsite.fr » accepté : https:// est ajouté plus bas
for (const f of $$("form[data-envoi]")) f.addEventListener("submit", async e => {
  e.preventDefault();
  const n = f.parentElement.querySelector(".retour");
  const dire = (texte) => { if (n) n.textContent = texte; };
  const bouton = f.querySelector("button"), champ = f.querySelector("input");
  let adresse = champ.value.trim();
  if (!adresse) { dire("Donnez l'adresse d'un site."); return; }
  if (!/^https?:\/\//i.test(adresse)) adresse = `https://${adresse}`;
  bouton.disabled = true;
  dire("Il part…");
  forcer("regarde", 600000);
  let fin = "fini";
  try {
    const r = await fetch(`${SERVICE}/explorations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: adresse }) });
    const corps = await r.json().catch(() => ({}));
    if (r.status !== 202 || !corps.id) dire(corps.erreur || `Le service a répondu ${r.status}.`);
    else {
      garder(corps.id, adresse);
      if (RAPPORT_URL) { location.href = `${RAPPORT_URL}?id=${encodeURIComponent(corps.id)}&service=${encodeURIComponent(SERVICE)}`; return; }
      fin = await suivre(corps.id, dire);
    }
  } catch {
    dire("Le service ne répond pas : réessayez dans un instant.");
  }
  bouton.disabled = false;
  forcer(fin, 2600);
});

// ---------- départ ----------
function demarrer() {
  placer(); construire(); maj(); document.body.classList.add("vol-pret");
  const y = param.get("y");
  if (y || SIM !== null) { if (y) scrollTo(0, +y); poseFinale(); heroJoue = true; maj(); }
  else if (reduit) { poseFinale(); heroJoue = true; maj(); }
  else jouerHero();
}
(document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(demarrer));
addEventListener("load", () => { placer(); construire(); maj(); });
