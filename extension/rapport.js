// The report of one exploration, in a tab of the extension: the file horama-exploration-1 read every 500 ms
// (docs/decisions/2026-11-17-format-exploration.md), the pages one by one, then what is proven, with its capture
// ringed by a line drawn as with a felt pen, and apart what is only a doubt. Nothing here is particular to a site.
const id = new URLSearchParams(location.search).get("id");
const $ = (selector) => document.querySelector(selector);
const element = (tag, className, text) => Object.assign(document.createElement(tag), { className: className ?? "", textContent: text ?? "" });
const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const COLOR = { defaut: "#e5484d", doute: "#e8a33d" };
const STATE = { a_visiter: "à visiter", en_cours: "visite en cours", visitee: "visitée", non_visitee: "non visitée" };
const shown = new Set(); // ids of the findings already on the page

// A capture cropped around its zone (pixels of the capture), the zone ringed; without a zone, the whole capture.
function capture(src, zone, size, genre, w, h) {
  const box = element("div", "capture");
  box.style.cssText = `width:${w}px;height:${h}px`;
  const scale = zone ? Math.min(1, w / (zone.largeur + 200), h / (zone.hauteur + 150)) : Math.min(w / size.largeur, h / size.hauteur);
  const [rw, rh] = [w / scale, h / scale];
  const from = (centre, length, full) => (length >= full ? (full - length) / 2 : Math.max(0, Math.min(centre - length / 2, full - length)));
  const rx = zone ? from(zone.x + zone.largeur / 2, rw, size.largeur) : (size.largeur - rw) / 2;
  const ry = zone ? from(zone.y + zone.hauteur / 2, rh, size.hauteur) : (size.hauteur - rh) / 2;
  const img = Object.assign(document.createElement("img"), { src, alt: "" });
  img.style.cssText = `width:${size.largeur * scale}px;height:${size.hauteur * scale}px;left:${-rx * scale}px;top:${-ry * scale}px`;
  box.append(img);
  let mark = null;
  if (zone) {
    mark = element("div", "zone");
    mark.style.cssText = `left:${(zone.x - rx) * scale}px;top:${(zone.y - ry) * scale}px;width:${zone.largeur * scale}px;height:${zone.hauteur * scale}px`;
    box.append(mark);
  }
  // Drawn once the card is in the page (rough-notation measures the element).
  const ring = () => mark && RoughNotation.annotate(mark, { type: genre === "defaut" ? "circle" : "box", color: COLOR[genre], strokeWidth: genre === "defaut" ? 4 : 3, padding: genre === "defaut" ? 12 : 8, iterations: genre === "defaut" ? 1 : 2, animationDuration: 800 }).show();
  return { box, ring };
}

function proofOf(constat) {
  const proof = constat.preuve ?? {};
  if (constat.source === "controle") return [`Mesuré : ${proof.mesure}`, `Attendu : ${proof.attendu}`, ...(proof.url ? [`Adresse : ${proof.url}`] : [])];
  if (constat.source === "holo") return ["Doute de Holo : rien n'est prouvé."];
  if (constat.source === "comparaison") return ["Écart d'image avec la capture du passage précédent."];
  return [];
}

function card(service, report, constat, genre) {
  const page = report.pages.find((candidate) => candidate.ecran === constat.ecran);
  const path = page ? new URL(page.url).pathname : constat.ecran;
  const size = constat.page ?? (page?.capture ? { largeur: page.capture.largeur, hauteur: page.capture.hauteur } : { largeur: 1280, hauteur: 900 });
  const item = element("article", "carte");
  const title = element("h3", "", constat.description);
  const where = element("p", "second");
  where.append("Page ", Object.assign(element("a", "", path), { href: page?.url ?? "#", target: "_blank", rel: "noopener" }));
  const shot = capture(`${service}/explorations/${encodeURIComponent(id)}/${constat.capture}`, constat.zone, size, genre, 900, 300);
  item.append(title, where, shot.box, ...proofOf(constat).map((line) => element("p", "preuve", line)));
  if (!constat.zone) item.append(element("p", "second", "Emplacement non mesuré sur la capture."));
  return { item, ring: shot.ring };
}

function render(service, report) {
  $("#adresse").textContent = report.adresse;
  const { totaux, trouvees } = report;
  const done = report.etat !== "en_cours";
  $("#etat").textContent = done
    ? report.etat === "fini" ? "Exploration terminée." : "Exploration interrompue : les pages non visitées sont listées."
    : `${count(totaux.pages_visitees, "page visitée", "pages visitées")} sur ${trouvees.nombre}, trouvées par ${trouvees.par === "sitemap" ? "le plan du site" : "les liens"}.`;
  // The pages, one by one.
  $("#pages").hidden = false;
  const list = $("#pages ol");
  list.replaceChildren(...[...report.pages].sort((a, b) => a.ordre - b.ordre).map((page) => {
    const proven = report.constats.filter((constat) => constat.ecran === page.ecran && constat.statut === "VERIFIED_FAIL").length;
    const line = element("li", `${page.etat}${proven ? " defaut" : ""}`);
    const path = element("span", "chemin");
    path.append(element("span", "marque"), new URL(page.url).pathname);
    const note = page.etat === "visitee" ? (proven ? count(proven, "défaut prouvé", "défauts prouvés") : "rien de prouvé") : STATE[page.etat];
    line.append(path, element("span", "second", note));
    return line;
  }));
  // Proven defects as soon as their page is checked; doubts and what could not be checked at the end.
  const add = (section, constat, genre) => {
    if (shown.has(constat.id)) return;
    shown.add(constat.id);
    const { item, ring } = card(service, report, constat, genre);
    $(`${section} .cartes`).append(item);
    $(section).hidden = false;
    ring();
  };
  for (const constat of report.constats.filter((candidate) => candidate.statut === "VERIFIED_FAIL")) add("#prouves", constat, "defaut");
  if (!done) return;
  for (const constat of report.constats.filter((candidate) => candidate.statut === "SUSPECTED" && !candidate.explique_par)) add("#a-verifier", constat, "doute");
  const unchecked = report.constats.filter((constat) => constat.statut === "INCONCLUSIVE");
  if (unchecked.length) {
    $("#non-verifie ul").replaceChildren(...unchecked.map((constat) => element("li", "", `${constat.ecran} : ${constat.raison ?? constat.description}`)));
    $("#non-verifie").hidden = false;
  }
  $("#bilan-texte").textContent = `${count(totaux.defauts, "défaut prouvé", "défauts prouvés")}, ${count(totaux.doutes, "point", "points")} à vérifier${totaux.sans_conclusion ? `, ${count(totaux.sans_conclusion, "point non vérifié", "points non vérifiés")}` : ""}, sur ${count(totaux.pages_visitees, "page visitée", "pages visitées")}.`;
  $("#bilan").hidden = false;
}

async function follow() {
  const service = await serviceAddress();
  for (;;) {
    const { status, body } = await ask(`${service}/explorations/${encodeURIComponent(id)}`);
    if (status === 200 && body.etat === "en_file") $("#etat").textContent = body.place > 0 ? `En attente : ${count(body.place, "exploration passe", "explorations passent")} avant celle-ci.` : "Départ…";
    else if (status === 200 && body.format === "horama-exploration-1") {
      render(service, body);
      if (body.etat !== "en_cours") return;
    } else if (status !== 0 || !$("#etat").textContent) {
      $("#etat").className = "erreur";
      $("#etat").textContent = body.erreur || `Le service a répondu ${status}.`;
      if (status !== 0) return;
    }
    await new Promise((done) => setTimeout(done, 500));
  }
}
follow();
