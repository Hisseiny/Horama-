// What the screens of the tower share: the shell of the prototype of Axil (logo, sidebar, mascot), stripped of
// everything that was an example (no example account, no plan, no « agent disponible »), with the team account of the
// service at its foot (#238), the capture of a finding with the sign of the charter on its zone, and a minimal reading
// of the Markdown of the notes of the vault.
import { Fragment, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../../interface/screen-11-1/Icons";
import { poserDoute, tracerDefaut } from "../trait.js";
import { SESSION_EVENT, enAttente, oublierSession, sessionBrute, testsDuVault, type Chargement, type Constat, type Decision, type Passage, type Session } from "../donnees";

export type Route = { ecran: "passages" | "rapport" | "relire" | "connexion" | "couverture" | "tests" | "direct" | "comparer" | "doc"; cle?: string };

// #<ecran> or #<ecran>/<cle>: the key names a passage (rapport, relire), a test (tests) or a page (comparer).
export function lireRoute(): Route {
  const [ecran, ...reste] = window.location.hash.replace(/^#/, "").split("/");
  const cle = reste.length ? decodeURIComponent(reste.join("/")) : undefined;
  if (ecran === "rapport" && cle) return { ecran: "rapport", cle };
  if (ecran === "connexion" || ecran === "couverture" || ecran === "direct" || ecran === "doc") return { ecran };
  if (ecran === "relire" || ecran === "tests" || ecran === "comparer") return cle ? { ecran, cle } : { ecran };
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

// The iris says what the page holds, as the mascot of the welcome page does (accueil/mascotte.js): miltos for a proven
// defect, ochre for a doubt, olive when all is done; iris of the charter while it only looks.
const IRIS = { trouve: "#B8321F", doute: "#C48A1E", fini: "#2E7D55" };

export function Mascot({ etat }: { etat?: keyof typeof IRIS }) {
  return (
    <div className="mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill={etat ? IRIS[etat] : "#7F77DD"} />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
    </div>
  );
}

// The session of the team account (#238), null when not connected; follows the connection and the disconnection.
const ecouter = (f: () => void) => {
  window.addEventListener(SESSION_EVENT, f);
  return () => window.removeEventListener(SESSION_EVENT, f);
};
export function useSession(): Session | null {
  const brute = useSyncExternalStore(ecouter, sessionBrute);
  return useMemo(() => (brute ? JSON.parse(brute) : null), [brute]);
}

const aRelire = (data: Chargement | null) => (data ? data.passages.flatMap((p) => p.constats).filter((c) => !c.decision).length : 0);

export function Sidebar({ route, data }: { route: Route; data: Chargement | null }) {
  const session = useSession();
  const sites = data ? [...new Set(data.passages.map((p) => p.site).filter(Boolean))] : [];
  // The order of the prototype. The screens it reaches by a link (11.3, 11.5 from the passages; 11.7 from « À relire »)
  // light the item they come from.
  const items = [
    { icon: "layers" as const, label: "Couverture", hash: "couverture", active: route.ecran === "couverture" },
    { icon: "check" as const, label: "Tests à valider", hash: "tests", active: route.ecran === "tests", count: testsDuVault(data?.vault ?? null).filter(enAttente).length, alert: false },
    { icon: "clock" as const, label: "Passages et rapports", hash: "", active: ["passages", "rapport", "direct", "comparer"].includes(route.ecran) },
    { icon: "document" as const, label: "À relire", hash: "relire", active: route.ecran === "relire" || route.ecran === "doc", count: aRelire(data), alert: true },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <div className="product-select-wrap">
          <div className="product-select" aria-label="Sites suivis">
            <span>{sites.length > 1 ? `${sites.length} sites suivis` : sites[0] ?? "Tour de contrôle"}</span>
            <small>{!data ? "chargement…" : sansSource(data) ? "index muet" : `${data.passages.length} passage${data.passages.length > 1 ? "s" : ""}`}</small>
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
              {item.count !== undefined && item.count > 0 && <span className={`nav-count${item.alert ? " is-alert" : ""}`}>{item.count}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="sidebar-bottom">
        {session
          ? (
            <div className="profile">
              <span className="avatar" aria-hidden="true">{session.nom.trim().charAt(0).toUpperCase()}</span>
              <span className="profile-copy">
                <strong>{session.nom}</strong>
                <button type="button" className="tour-deconnexion" onClick={oublierSession}>Se déconnecter</button>
              </span>
            </div>
          )
          : <a className="theme-toggle tour-connexion" href="#connexion"><Icon name="arrow" /><span>Se connecter</span></a>}
        {data?.source && <p className="tour-source">Données : {data.source === "service" ? "service Horama" : "GitHub (service injoignable)"}</p>}
        {data && <p className="tour-source">Vault : {data.vaultSource ?? "illisible"}</p>}
      </div>
    </aside>
  );
}

export const dateCourte = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(" ", " · ");
};
export const dureeCout = (duree: number | null, cout: number | null) =>
  [duree !== null ? `${Math.floor(duree / 60)} min ${String(Math.round(duree % 60)).padStart(2, "0")} s` : null, cout !== null ? `${cout.toFixed(2).replace(".", ",")} $` : null].filter(Boolean).join(" · ");

// No source at all: the index did not answer and no exploration was read. Nothing can be said then, not even « 0 ».
export const sansSource = (data: Chargement | null) => !!data && data.erreurs.length > 0 && data.passages.length === 0;

// The state of a passage that is not over, in words; "" once it is over.
const ETATS: Record<string, string> = { en_file: "en attente", en_cours: "visite en cours", echec: "visite interrompue", interrompu: "visite interrompue" };
export const estFini = (p: Passage) => p.etat === "termine" || p.etat === "fini";
export const etatLisible = (p: Passage) => (estFini(p) ? "" : ETATS[p.etat ?? ""] ?? p.etat ?? "état inconnu");

// A decision as the source carries it (« Bug, par Nathan »), or « à trancher » while nobody decided.
export const CHOIX = { bug: "Bug", voulu: "Voulu" };
export const decisionLisible = (d: Decision | null) => (d ? `${CHOIX[d.choix]}${d.par ? `, par ${d.par}` : ""}` : "à trancher");

// The capture of a finding, its zone in view. Entry by a PR: the capture was ringed by the scene. Entry by an address: the
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
      // A viewBox: the sign follows the capture when its width changes (rotation, window resized; review of #222).
      svg.setAttribute("viewBox", `0 0 ${host.clientWidth} ${img.clientHeight}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
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

// The note of the vault that describes a page of the clone (its field « url »), or null.
export const notePourPage = <T extends { champs: Record<string, string> }>(notes: T[], page: string) => notes.find((n) => n.champs.url === page) ?? null;

// Markdown, the little the notes of the vault use, drawn as React elements (no HTML injected): titles, paragraphs,
// lists, tables, code blocks, `code`, **bold**, [[link]] (its name) and [text](address).
function enLigne(texte: string): ReactNode[] {
  return texte.split(/(`[^`]+`|\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)\s]+\))/g).map((bout, i) => {
    if (/^`.+`$/.test(bout)) return <code key={i}>{bout.slice(1, -1)}</code>;
    if (/^\*\*.+\*\*$/.test(bout)) return <strong key={i}>{bout.slice(2, -2)}</strong>;
    if (/^\[\[.+\]\]$/.test(bout)) return <em key={i}>{bout.slice(2, -2).split("|").pop()}</em>;
    const lien = /^\[(.+)\]\((.+)\)$/.exec(bout);
    if (lien) return /^https?:\/\//.test(lien[2]) ? <a key={i} href={lien[2]} target="_blank" rel="noopener">{lien[1]}</a> : <Fragment key={i}>{lien[1]}</Fragment>;
    return <Fragment key={i}>{bout}</Fragment>;
  });
}

export function Markdown({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  const lignes = texte.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lignes.length; ) {
    const ligne = lignes[i];
    const prendre = (test: (l: string) => boolean) => {
      const pris: string[] = [];
      while (i < lignes.length && test(lignes[i])) pris.push(lignes[i++]);
      return pris;
    };
    if (!ligne.trim()) { i++; continue; }
    if (ligne.startsWith("```")) {
      i++;
      const code = prendre((l) => !l.startsWith("```"));
      i++;
      blocs.push(<pre key={i}>{code.join("\n")}</pre>);
    } else if (/^#{1,6} /.test(ligne)) {
      const Titre = `h${Math.min(6, ligne.indexOf(" ") + 2)}` as "h3"; // # becomes h3: the screen keeps its h1 and h2
      blocs.push(<Titre key={i}>{enLigne(ligne.replace(/^#+ /, ""))}</Titre>);
      i++;
    } else if (/^\s*[-*] /.test(ligne)) {
      // An indented line under an item belongs to it (« regle: … » under a rule): kept, on its own line.
      const items: string[][] = [];
      for (const l of prendre((l) => /^\s*[-*] /.test(l) || /^\s+\S/.test(l))) {
        if (/^\s*[-*] /.test(l)) items.push([l.replace(/^\s*[-*] /, "")]);
        else items[items.length - 1].push(l.trim());
      }
      blocs.push(<ul key={i}>{items.map(([tete, ...suite], k) => <li key={k}>{enLigne(tete)}{suite.map((l, j) => <code className="tour-md-suite" key={j}>{l}</code>)}</li>)}</ul>);
    } else if (/^\d+\. /.test(ligne)) {
      const items = prendre((l) => /^\d+\. /.test(l));
      blocs.push(<ol key={i}>{items.map((l, k) => <li key={k}>{enLigne(l.replace(/^\d+\. /, ""))}</li>)}</ol>);
    } else if (ligne.startsWith("|")) {
      const rangs = prendre((l) => l.startsWith("|")).filter((l) => !/^\|[\s|:-]+\|$/.test(l)).map((l) => l.slice(1, l.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim()));
      blocs.push(
        <div className="tour-md-table" key={i}>
          <table>
            <tbody>{rangs.map((r, k) => <tr key={k}>{r.map((c, j) => (k === 0 ? <th key={j}>{enLigne(c)}</th> : <td key={j}>{enLigne(c)}</td>))}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else {
      const para = prendre((l) => !!l.trim() && !/^(```|#{1,6} |\s*[-*] |\d+\. |\|)/.test(l));
      blocs.push(<p key={i}>{enLigne(para.join(" "))}</p>);
    }
  }
  return <div className="tour-md">{blocs}</div>;
}

// After a write of 11.2 or 11.7 (#238, decision of 19/11): the service writes on the branch horama/vault, never on dev.
export const RANGE_SUR_HORAMA_VAULT = "Rangé sur la branche horama/vault : le vault de dev ne le reçoit que par une PR relue.";

// The error of a write of 11.2 or 11.7, in French; the 501 of /tour/doc as the service wrote it.
export function erreurEcriture(statut: number, erreur: string | null, quoi: string): string {
  if (statut === 0) return "Le service ne répond pas : réessayez dans un instant.";
  if (statut === 401) return "Session expirée : reconnectez-vous.";
  if (statut === 501) return erreur ?? "Cette fonction n'est pas encore disponible sur le service.";
  if (statut === 404) return `Le service ne trouve pas ${quoi}.`;
  if (statut === 400) return "Le service a refusé la demande : vérifiez les champs et réessayez.";
  if (statut === 429) return "Trop de demandes, réessayez dans une minute.";
  return `Le service n'a pas pu écrire ${quoi} : réessayez dans un instant.`;
}
