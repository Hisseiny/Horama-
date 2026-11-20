// Les deux marques d'Horama sur la page.
// Défaut prouvé : UN trait d'ocre rouge, d'un seul geste, comme la ligne d'un peintre de vase
// (pas le gribouillis double d'un feutre). Doute : une rangée de points d'ocre jaune sous
// l'élément, le point souscrit des épigraphistes pour une lecture incertaine.
// Les deux portent un liseré de marbre dessous : ils restent lisibles sur n'importe quel site
// (le rouge d'Eugenia compris).
const NS = "http://www.w3.org/2000/svg";

function aleatoire(graine) { let s = graine; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function boucle(x, y, w, h, graine = 3) {
  const r0 = aleatoire(graine), ph0 = r0() * 6; const r = () => ph0 / 6;
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2 * 1.07 + 22, ry = h / 2 + 10;
  const debut = Math.PI * 0.97, fin = debut - Math.PI * 2.03, n = 46; // part de la gauche et descend : le premier geste passe sous l'élément
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = debut + (fin - debut) * t;
    const ph = r() * 6; // une seule onde lente par geste, pas de bruit point par point (qui fait des bosses)
    const derive = 1 + 0.012 * Math.sin(2 * a + ph) + (t > 0.94 ? (t - 0.94) * 0.4 : 0); // la fin du geste déborde un peu
    const c = Math.cos(a), sn = Math.sin(a), q = 0.72; // superellipse : épouse le rectangle sans couper ses coins
    pts.push([cx + Math.sign(c) * Math.abs(c) ** q * rx * derive, cy + Math.sign(sn) * Math.abs(sn) ** q * ry * derive + t * 2]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function tracerDefaut(svg, rect, { duree = 750, epaisseur = 3.4, instant = false } = {}) {
  const d = boucle(rect.x, rect.y, rect.w, rect.h, Math.round(rect.x + rect.y) || 5);
  const g = document.createElementNS(NS, "g");
  for (const [couleur, larg, op] of [["#F7F3EA", epaisseur + 6, 1], ["var(--miltos)", epaisseur, 1]]) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d); p.setAttribute("pathLength", "1");
    Object.assign(p.style, { fill: "none", stroke: couleur, strokeWidth: larg, strokeLinecap: "round", strokeLinejoin: "round", opacity: op,
      strokeDasharray: "1 1", strokeDashoffset: instant ? "0" : "1" });
    g.appendChild(p);
    if (!instant) p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: duree, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" });
  }
  svg.appendChild(g);
  return g;
}

function poserDoute(svg, rect, { pas = 10, rayon = 3.4, instant = false } = {}) {
  const g = document.createElementNS(NS, "g");
  const y = rect.y + rect.h + 9, n = Math.max(3, Math.floor(rect.w / pas));
  const x0 = rect.x + (rect.w - (n - 1) * pas) / 2;
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", x0 + i * pas); c.setAttribute("cy", y); c.setAttribute("r", rayon);
    Object.assign(c.style, { fill: "var(--ocre)", stroke: "#F7F3EA", strokeWidth: 2.8, paintOrder: "stroke" });
    g.appendChild(c);
    if (!instant) c.animate([{ opacity: 0, transform: "translateY(-5px)" }, { opacity: 1, transform: "none" }],
      { duration: 380, delay: Math.min(i * 22, 600), easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
  }
  svg.appendChild(g);
  return g;
}
