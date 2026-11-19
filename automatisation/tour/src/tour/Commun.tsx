// What the three screens of the tower share: the shell of the prototype of Axil (logo, sidebar, mascot), stripped of
// everything that was an example (no account, no plan, no « agent disponible »), and the capture of a finding with the
// sign of the charter on its zone.
import { useEffect, useRef } from "react";
import { usePrototype } from "../PrototypeContext";
import { Icon } from "../../interface/screen-11-1/Icons";
import { poserDoute, tracerDefaut } from "../trait.js";
import type { Chargement, Constat } from "../donnees";

export type Route = { ecran: "passages" | "rapport" | "relire"; cle?: string };

export function lireRoute(): Route {
  const [ecran, ...reste] = window.location.hash.replace(/^#/, "").split("/");
  if (ecran === "rapport" && reste.length) return { ecran: "rapport", cle: decodeURIComponent(reste.join("/")) };
  if (ecran === "relire") return { ecran: "relire" };
  return { ecran: "passages" };
}

export function Logo() {
  return (
    <div className="brand" aria-label="Horama">
      <span>H</span>
      <svg className="brand-eye" viewBox="26 26 44 44" aria-hidden="true">
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
      <span>rama</span>
    </div>
  );
}

export function Mascot() {
  return (
    <div className="mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
    </div>
  );
}

const aRelire = (data: Chargement | null) => (data ? data.passages.flatMap((p) => p.constats).filter((c) => !c.decision).length : 0);

export function Sidebar({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode, toggleTheme } = usePrototype();
  const sites = data ? [...new Set(data.passages.map((p) => p.site).filter(Boolean))] : [];
  const items = [
    { icon: "clock" as const, label: "Passages & Rapports", hash: "", active: route.ecran !== "relire" },
    { icon: "document" as const, label: "À relire", hash: "relire", active: route.ecran === "relire", count: aRelire(data) },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <div className="product-select-wrap">
          <div className="product-select" aria-label="Sites suivis">
            <span>{sites.length ? sites.join(", ") : "Tour de contrôle"}</span>
            <small>{data ? `${data.passages.length} passage${data.passages.length > 1 ? "s" : ""}` : "chargement…"}</small>
          </div>
        </div>
        <a className="run-button" href="../">
          <Icon name="play" />
          <span>Envoyer Horama</span>
        </a>
        <nav aria-label="Navigation principale">
          {items.map((item) => (
            <button className={`nav-item${item.active ? " is-active" : ""}`} type="button" key={item.label} aria-current={item.active ? "page" : undefined}
              onClick={() => (window.location.hash = item.hash)}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && <span className="nav-count is-alert">{item.count}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-bottom">
        <button className="theme-toggle" type="button" aria-pressed={lightMode} onClick={toggleTheme}>
          <Icon name={lightMode ? "moon" : "sun"} />
          <span>{lightMode ? "Mode sombre" : "Mode clair"}</span>
        </button>
      </div>
    </aside>
  );
}

export const dateCourte = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " · ");
};
export const dureeCout = (duree: number | null, cout: number | null) =>
  [duree !== null ? `${Math.floor(duree / 60)} min ${String(Math.round(duree % 60)).padStart(2, "0")} s` : null, cout !== null ? `${cout.toFixed(2).replace(".", ",")} $` : null].filter(Boolean).join(" · ") || "non publiés";

// The capture of a finding, its zone in view. Mode développeur: the capture was ringed by the scene. Grand public: the
// raw capture, and the sign of the charter drawn here on its zone (a stroke of miltos, or ochre dots).
export function Capture({ constat }: { constat: Constat }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = box.current;
    if (!host || !constat.capture) return;
    host.replaceChildren();
    const img = new Image();
    img.alt = `Capture : ${constat.texte}`;
    img.style.cssText = "display:block;width:100%;height:auto";
    img.onload = () => {
      if (constat.entouree || !constat.zone) return;
      const scale = host.clientWidth / (constat.taille?.largeur ?? img.naturalWidth);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", String(host.clientWidth));
      svg.setAttribute("height", String(img.clientHeight));
      svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible";
      host.append(svg);
      const rect = { x: constat.zone.x * scale, y: constat.zone.y * scale, w: constat.zone.largeur * scale, h: constat.zone.hauteur * scale };
      if (constat.genre === "defaut") tracerDefaut(svg, rect);
      else poserDoute(svg, rect);
    };
    img.src = constat.capture;
    host.append(img);
  }, [constat]);
  if (!constat.capture) return <p className="tour-sans-capture">Pas de capture pour ce constat.</p>;
  return <div className="tour-capture" ref={box} style={{ position: "relative", overflow: "hidden", borderRadius: 10 }} />;
}

export function Statut({ genre }: { genre: Constat["genre"] }) {
  return genre === "defaut"
    ? <span className="report-status is-defect">[ ! ] Défaut prouvé</span>
    : <span className="report-status is-suspect">[ ? ] Doute</span>;
}

export function Erreurs({ data }: { data: Chargement | null }) {
  if (!data?.erreurs.length) return null;
  return <div className="tour-erreurs" role="status">{data.erreurs.map((e) => <p key={e}>{e}</p>)}</div>;
}
