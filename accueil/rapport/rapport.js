// The report of one exploration, in a tab of the extension, in the charter « L'envoyé »: the file horama-exploration-1
// read every 500 ms (docs/decisions/2026-11-17-format-exploration.md), the pages one by one with the square of their
// state, then what is proven, on its sheet with the stroke of miltos of the charter (trait.js), and apart what is only a
// doubt, with its ochre dots. While the service films the tab of the agent (field direct, #164), the last image of
// /direct on top, every 300 ms. Nothing here is particular to a site. The same file serves the page of welcome
// (accueil/rapport/, copied by extension/copier-rapport.sh).
import { poserDoute, tracerDefaut } from "./lib/trait.js";

const id = new URLSearchParams(location.search).get("id");
const $ = (selector) => document.querySelector(selector);
const element = (tag, className, text) => Object.assign(document.createElement(tag), { className: className ?? "", textContent: text ?? "" });
const count = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const STATE = { a_visiter: "à visiter", en_cours: "en visite", visitee: "visitée", non_visitee: "non visitée" };
// How the H agent reached the page, when the service says it (optional field arrivee of horama-exploration-1, #91).
const ARRIVAL = { depart: "page de départ", clic: "atteinte par un clic de l'agent", adresse: "ouverte par son adresse" };
const shown = new Set(); // ids of the findings already on the page
const mascot = (etat) => poserMascotte($("#mascotte"), etat);

// A capture on its sheet: the whole width of the page, a band of its height centred on the zone, the sign of the charter
// on the zone (a stroke of miltos for a proven defect, ochre dots for a doubt). Laid out once the card is in the page,
// at the width it gets there.
function capture(src, zone, size, genre) {
  const box = element("div", "capture");
  // A margin of the sheet above and below the image: the stroke of the charter goes round the zone, beyond its box.
  const PAD = 30;
  const lay = () => {
    const scale = box.clientWidth / size.largeur;
    const band = Math.min(size.hauteur, 420);
    const top = zone ? Math.max(0, Math.min(zone.y + zone.hauteur / 2 - band / 2, size.hauteur - band)) : 0;
    const height = Math.round(band * scale) + 2 * PAD;
    box.style.height = `${height}px`;
    const view = element("div", "vue");
    view.style.cssText = `top:${PAD}px;height:${Math.round(band * scale)}px`;
    const img = Object.assign(document.createElement("img"), { src, alt: "" });
    img.style.cssText = `width:${size.largeur * scale}px;height:${size.hauteur * scale}px;top:${-top * scale}px`;
    view.append(img);
    box.replaceChildren(view);
    if (!zone) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "marques");
    svg.setAttribute("width", box.clientWidth);
    svg.setAttribute("height", height);
    box.append(svg);
    const rect = { x: zone.x * scale, y: (zone.y - top) * scale + PAD, w: zone.largeur * scale, h: zone.hauteur * scale };
    if (genre === "defaut") tracerDefaut(svg, rect);
    else poserDoute(svg, rect);
  };
  return { box, ring: lay };
}

function proofOf(constat) {
  const proof = constat.preuve ?? {};
  if (constat.source === "controle") return [`mesuré : ${proof.mesure}`, `attendu : ${proof.attendu}`, ...(proof.url ? [`adresse : ${proof.url}`] : [])];
  if (constat.source === "holo") return ["Doute de Holo : rien n'est prouvé."];
  if (constat.source === "comparaison") return ["Écart d'image avec la capture du passage précédent."];
  return [];
}

// Bug, or intended? The answer of the reader on each finding, kept in this browser only (no account, nothing sent):
// localStorage « horama-decisions:<id of the exploration> » = { <id of the finding>: "bug" | "voulu" }.
const KEY = `horama-decisions:${id}`;
const readDecisions = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { return {}; } };
function decide(constat) {
  const box = element("div", "trancher");
  const said = element("p", "dit second");
  const buttons = [["voulu", "C'est voulu"], ["bug", "C'est un bug"]].map(([value, label]) =>
    Object.assign(element("button", `choix ${value}`, label), { type: "button", onclick: () => show(readDecisions()[constat.id] === value ? null : value) }));
  const show = (value) => {
    const all = readDecisions();
    if (value === undefined) value = all[constat.id] ?? null;
    else {
      if (value) all[constat.id] = value; else delete all[constat.id];
      try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* shown anyway, not kept */ }
    }
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.classList.contains(value ?? "")));
    said.textContent = value ? `Tranché : ${value === "bug" ? "un bug" : "voulu"}. Gardé dans ce navigateur ; cliquez à nouveau pour annuler.` : "Bug, ou voulu ? À vous de trancher.";
  };
  box.append(...buttons, said);
  show(undefined);
  return box;
}

function card(service, report, constat, genre) {
  const page = report.pages.find((candidate) => candidate.ecran === constat.ecran);
  const path = page ? new URL(page.url).pathname : constat.ecran;
  const size = constat.page ?? (page?.capture ? { largeur: page.capture.largeur, hauteur: page.capture.hauteur } : { largeur: 1280, hauteur: 900 });
  const item = element("article", "carte feuille");
  const bar = element("div", "barre");
  bar.append(element("i"), element("span", "", page?.url ?? path));
  const where = element("p", "ou second");
  // Only an http(s) address becomes a link: the report comes from a service, and a page served on the web reads it too.
  where.append("Page ", Object.assign(element("a", "", path), { href: /^https?:\/\//.test(page?.url ?? "") ? page.url : "#", target: "_blank", rel: "noopener" }));
  const shot = capture(`${service}/explorations/${encodeURIComponent(id)}/${constat.capture}`, constat.zone, size, genre);
  item.append(bar, shot.box, element("h3", "", constat.description), where, ...proofOf(constat).map((line) => element("p", "preuve", line)));
  if (!constat.zone) item.append(element("p", "ou second", "Emplacement non mesuré sur la capture."));
  item.append(decide(constat));
  return { item, ring: shot.ring };
}

// The square of the state of a page: tick olivier (nothing proven), « ! » miltos (a proven defect), « ? » ocre (a doubt
// to decide), lilac circle that beats (in visit), dashed (to visit), ink (not visited).
function square(report, page) {
  const of = (statut) => report.constats.some((constat) => constat.ecran === page.ecran && constat.statut === statut && !constat.explique_par);
  if (page.etat === "en_cours") return element("i", "etat v");
  if (page.etat === "a_visiter") return element("i", "etat a");
  if (page.etat === "non_visitee") return element("i", "etat n", "-");
  if (of("VERIFIED_FAIL")) return element("i", "etat t", "!");
  if (of("SUSPECTED") && report.etat !== "en_cours") return element("i", "etat d", "?");
  return element("i", "etat c", "✓");
}

// The reason of a page not visited (pages[].raison since PR #117, else its INCONCLUSIVE finding), without its final dot.
const reasonOf = (report, page) => (page.raison ?? report.constats.find((constat) => constat.ecran === page.ecran && constat.raison)?.raison ?? "").trim().replace(/\.+$/, "");
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);

function render(service, report) {
  $("#adresse").textContent = report.adresse;
  const { totaux, trouvees } = report;
  const done = report.etat !== "en_cours";
  const proven = report.constats.some((constat) => constat.statut === "VERIFIED_FAIL");
  $("#titre").textContent = !done ? "Il visite le site." : report.etat === "fini" ? "J'ai fini." : "Je n'ai pas pu finir.";
  mascot(done ? "fini" : proven ? "trouve" : "observe");
  // No page visited (site that blocks robots, address not found, login asked): the reason only, no empty list and no
  // « 0 défaut ».
  if (done && totaux.pages_visitees === 0) {
    const raison = (report.agents?.find((agent) => agent.raison)?.raison ?? "").trim().replace(/\.+$/, "")
      || report.pages.map((page) => reasonOf(report, page)).find(Boolean) || "";
    $("#titre").textContent = "Je n'ai pas pu entrer.";
    mascot("bloquee");
    $("#etat").textContent = raison ? `Horama n'a pas pu visiter ce site : ${lowerFirst(raison)}.` : "Horama n'a pas pu visiter ce site.";
    for (const section of ["#pages", "#bilan", "#non-verifie", "#prouves", "#a-verifier"]) $(section).hidden = true;
    return;
  }
  $("#etat").textContent = done
    ? report.etat === "fini"
      // A run stopped by the time limit of the service is finished: its reason says so (« Limite de temps atteinte, 7 pages sur 8 »).
      ? ((raison) => raison ? `Exploration terminée : ${lowerFirst(raison)}.` : "Exploration terminée.")((report.agents?.find((agent) => agent.raison)?.raison ?? "").trim().replace(/\.+$/, ""))
      : "Exploration interrompue : les pages non visitées sont listées."
    : `${count(totaux.pages_visitees, "page visitée", "pages visitées")} sur ${trouvees.nombre}, trouvées par ${trouvees.par === "sitemap" ? "le plan du site" : "les liens"}.`;
  // The pages, one by one.
  $("#pages").hidden = false;
  const list = $("#pages ol");
  list.replaceChildren(...[...report.pages].sort((a, b) => a.ordre - b.ordre).map((page) => {
    const provenHere = report.constats.filter((constat) => constat.ecran === page.ecran && constat.statut === "VERIFIED_FAIL").length;
    const line = element("li", `${page.etat}${provenHere ? " defaut" : ""}`);
    const path = element("code", "", new URL(page.url).pathname);
    const state = page.etat === "non_visitee" && reasonOf(report, page) ? `${STATE.non_visitee} : ${lowerFirst(reasonOf(report, page))}` : STATE[page.etat];
    const doubts = done ? report.constats.filter((constat) => constat.ecran === page.ecran && constat.statut === "SUSPECTED" && !constat.explique_par).length : 0;
    const found = [provenHere && count(provenHere, "défaut prouvé", "défauts prouvés"), doubts && `${doubts} à trancher`].filter(Boolean).join(", ");
    const note = [page.etat === "visitee" ? found || "rien de prouvé" : state, ARRIVAL[page.arrivee]].filter(Boolean).join(" · ");
    line.append(square(report, page), path, element("span", "second", note));
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
  // Three figures, as in the summary of the charter: proven in miltos, to decide in ochre with its dots, pages visited.
  const figure = (value, label, kind) => {
    const cell = element("div", kind);
    const big = element("b");
    big.append(element("span", "", String(value)));
    cell.append(big, label);
    return cell;
  };
  $("#chiffres").replaceChildren(figure(totaux.defauts, totaux.defauts > 1 ? "défauts prouvés" : "défaut prouvé", "t"), figure(totaux.doutes, "à trancher", "d"),
    figure(totaux.pages_visitees, `${totaux.pages_visitees > 1 ? "pages visitées" : "page visitée"} sur ${trouvees.nombre}`, ""));
  $("#bilan-texte").textContent = totaux.sans_conclusion ? `${count(totaux.sans_conclusion, "point non vérifié", "points non vérifiés")}, listés plus bas.` : "";
  $("#bilan").hidden = false;
}

// The direct (#164): while the service says direct, its last image every 300 ms. The next image is loaded and decoded
// before it replaces the one shown, so nothing blinks. 404: no image yet, the place stays hidden; 410 or the end of the
// exploration: the direct goes and the place goes back to the report.
const live = { on: false, over: false };
async function watch(service) {
  if (live.on || live.over) return;
  live.on = true;
  const shown = $("#direct img");
  let previous = null;
  while (!live.over) {
    const started = Date.now();
    const response = await fetch(`${service}/explorations/${encodeURIComponent(id)}/direct`, { cache: "no-store" }).catch(() => null);
    if (response?.status === 410) break;
    if (response?.ok) {
      const url = URL.createObjectURL(await response.blob());
      const next = new Image();
      next.src = url;
      if (!live.over && (await next.decode().then(() => true, () => false))) {
        shown.src = url;
        $("#direct").hidden = false;
        if (previous) URL.revokeObjectURL(previous);
        previous = url;
      } else URL.revokeObjectURL(url);
    }
    await new Promise((done) => setTimeout(done, Math.max(0, 300 - (Date.now() - started))));
  }
  stopLive();
}
function stopLive() {
  live.over = true;
  $("#direct").hidden = true;
}

// Served on the web (accueil/rapport/, next to the tower of control accueil/tour/): a link to the tower under the
// title. Not in the extension, where the tower is not.
if (/^https?:$/.test(location.protocol)) {
  const lien = Object.assign(element("a", "site", "Tous les passages : la tour de contrôle"), { href: "../tour/" });
  $("#adresse")?.after(lien);
}

async function follow() {
  const service = await serviceAddress();
  for (;;) {
    const { status, body } = await ask(`${service}/explorations/${encodeURIComponent(id)}`);
    if (status === 200 && body.direct === true) watch(service);
    else if (live.on && (status !== 200 || body.etat !== "en_cours")) stopLive();
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
