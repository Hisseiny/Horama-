// 11.3 En direct. An exploration by an address that the service is running or holds in its queue: followed on the
// service, as the page of report does it (accueil/rapport/rapport.js): GET /explorations/:id every second (its pages and
// their state, its place in the queue), and while the service films the tab of the agent (field « direct », #164), the
// last image of /explorations/:id/direct every 300 ms. A passage by a PR is not filmed here: it runs on the machine of
// the demo (the wake-up), and its result arrives in « À relire ». Nothing running: the screen says so.
import { useEffect, useState } from "react";
import "../../interface/screen-11-3/styles.css";
import type { Chargement, Passage } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Erreurs, Mascot, Sidebar, dateCourte, type Route } from "./Commun";

const ETAT_PAGE: Record<string, string> = { a_visiter: "à visiter", en_cours: "en visite", visitee: "visitée", non_visitee: "non visitée" };
const enCours = (p: Passage) => p.mode === "public" && !!p.service && (p.etat === "en_cours" || p.etat === "en_file");
const chemin = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

type Suivi = { etat: string | null; place: number | null; pages: { ecran: string; url: string; etat: string }[]; filme: boolean; erreur: string | null };

// The exploration followed on its service, and the last image of its direct (an object URL), until it is over.
function useSuivi(service: string, id: string, onFin: () => void) {
  const [suivi, setSuivi] = useState<Suivi>({ etat: null, place: null, pages: [], filme: false, erreur: null });
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let fini = false;
    (async () => {
      while (!fini) {
        try {
          const response = await fetch(`${service}/explorations/${encodeURIComponent(id)}`, { cache: "no-store" });
          if (response.status === 404) {
            setSuivi((s) => ({ ...s, filme: false, erreur: "Le service ne garde plus cette exploration." }));
            return;
          }
          const body = await response.json();
          if (!response.ok) {
            setSuivi((s) => ({ ...s, filme: false, erreur: typeof body?.erreur === "string" ? body.erreur : "Le service n'a pas pu lire cette exploration." }));
            return;
          }
          setSuivi({ etat: body.etat ?? null, place: typeof body.place === "number" ? body.place : null, pages: Array.isArray(body.pages) ? body.pages : [], filme: body.direct === true, erreur: null });
          if (body.etat !== "en_cours" && body.etat !== "en_file") {
            onFin();
            return;
          }
        } catch {
          setSuivi((s) => ({ ...s, erreur: "Le service ne répond pas, nouvel essai dans un instant." }));
        }
        await new Promise((done) => setTimeout(done, 1000));
      }
    })();
    return () => {
      fini = true;
    };
  }, [service, id, onFin]);
  // The image is loaded and decoded before it replaces the one shown, so nothing blinks; 410: the direct is over.
  useEffect(() => {
    if (!suivi.filme) return;
    let fini = false;
    let precedente: string | null = null;
    (async () => {
      while (!fini) {
        const debut = Date.now();
        const response = await fetch(`${service}/explorations/${encodeURIComponent(id)}/direct`, { cache: "no-store" }).catch(() => null);
        if (response?.status === 410) break;
        if (response?.ok) {
          const url = URL.createObjectURL(await response.blob());
          const suivante = new Image();
          suivante.src = url;
          if (!fini && (await suivante.decode().then(() => true, () => false))) {
            setImage(url);
            if (precedente) URL.revokeObjectURL(precedente);
            precedente = url;
          } else URL.revokeObjectURL(url);
        }
        await new Promise((done) => setTimeout(done, Math.max(0, 300 - (Date.now() - debut))));
      }
    })();
    return () => {
      fini = true;
    };
  }, [service, id, suivi.filme]);
  return { suivi, image };
}

function Exploration({ p, onRecharger }: { p: Passage; onRecharger: () => void }) {
  const { suivi, image } = useSuivi(p.service!, p.cle.replace(/^public:/, ""), onRecharger);
  const fini = suivi.etat !== null && suivi.etat !== "en_cours" && suivi.etat !== "en_file";
  return (
    <div className="live-grid">
      <section className="live-agent-card" aria-labelledby="pages-title">
        <p className="live-label" id="pages-title">Pages de l'exploration</p>
        {suivi.etat === "en_file" && <p className="tour-note">En attente : {suivi.place ? `${suivi.place} exploration${suivi.place > 1 ? "s passent" : " passe"} avant celle-ci (place ${suivi.place}).` : "départ…"}</p>}
        {!suivi.pages.length && suivi.etat !== "en_file" && <p className="tour-note">{suivi.etat === null && !suivi.erreur ? "Lecture du service…" : "Aucune page trouvée pour l'instant."}</p>}
        {suivi.pages.length > 0 && (
          <ol className="live-timeline tour-pages">
            {suivi.pages.map((page) => (
              <li key={page.ecran} className={page.etat === "en_cours" ? "is-active" : ""}>
                <span className="live-step">
                  {page.etat === "visitee" ? <span className="live-node is-complete" aria-hidden="true">✓</span> : <span className={`live-node${page.etat === "en_cours" ? "" : " tour-node-vide"}`} aria-hidden="true" />}
                  <span className="live-step-copy">
                    <span>{chemin(page.url)}</span>
                    <span className="tour-etat-page">{ETAT_PAGE[page.etat] ?? page.etat}</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <a className="live-report-link" href={`#rapport/${encodeURIComponent(p.cle)}`}>Voir le rapport →</a>
      </section>
      <section className="live-capture" aria-labelledby="capture-title">
        <div className="live-capture-head">
          <p className="live-label" id="capture-title">En direct : ce que l'agent H voit et fait</p>
        </div>
        <div className="live-address">{p.titre}</div>
        {suivi.erreur && <p className="tour-erreur-cas" role="alert">{suivi.erreur}</p>}
        {fini
          ? <p className="tour-note">L'exploration est terminée : son rapport est complet.</p>
          : image && suivi.filme
            ? <img className="tour-direct" src={image} alt="L'onglet que l'agent H pilote, en direct." />
            : <p className="tour-note">{suivi.etat === "en_file" ? "Le direct commence quand l'exploration part." : "Pas encore d'image : le service ne filme pas encore l'onglet de l'agent."}</p>}
      </section>
    </div>
  );
}

export default function Direct({ route, data, onRecharger }: { route: Route; data: Chargement | null; onRecharger: () => void }) {
  const { lightMode } = usePrototype();
  const courants = (data?.passages ?? []).filter(enCours);
  const [choix, setChoix] = useState<string | null>(null);
  const choisi = courants.find((p) => p.cle === choix) ?? courants[0] ?? null;
  const file = data?.agent ? data.agent.file_attente ?? data.agent.file : undefined;
  return (
    <div className={`app-shell live-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <button className="back-to-passages tour-retour" type="button" onClick={() => (window.location.hash = "")}>← Tous les passages</button>
          <header className="live-heading">
            <h1>En direct</h1>
            {data?.agent && <p>agent du service : {data.agent.disponible === false ? "occupé" : data.agent.disponible ? "disponible" : "état non dit"}{typeof file === "number" ? ` · ${file} en file` : ""}</p>}
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement…</p>}
          {data && !courants.length && <p className="tour-filtre">Aucune exploration par une adresse en cours sur le service Horama{data.source === "service" ? "" : " (le service ne répond pas : seules les explorations envoyées depuis ce navigateur sont connues)"}.</p>}
          {courants.length > 1 && (
            <div className="tour-choix" role="group" aria-label="Explorations en cours">
              {courants.map((p) => (
                <button type="button" key={p.cle} className={p === choisi ? "is-active" : ""} aria-pressed={p === choisi} onClick={() => setChoix(p.cle)}>
                  {p.titre} · {dateCourte(p.date)}
                </button>
              ))}
            </div>
          )}
          {choisi && <Exploration key={choisi.cle} p={choisi} onRecharger={onRecharger} />}
          <p className="tour-note tour-pr">
            Un passage par une PR tourne sur la machine de démo (le réveil) : il n'est pas filmé ici. Son résultat arrive dans <a className="tour-lien" href="#relire">À relire</a> dès que le réveil publie l'index des passages.
          </p>
        </div>
      </main>
      <Mascot />
    </div>
  );
}
