// 11.6 À relire, read-only online: every finding of the passages, the cases not decided yet first. A page served on the
// web holds no key: « bug » or « voulu » is decided in the scene (entry by a PR) or on the report, never here; what
// was decided is shown with who and when, as the index of the passages carries it.
import "../../interface/screen-11-6/styles.css";
import "./tour.css";
import type { Chargement } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Capture, Erreurs, Mascot, Sidebar, dateCourte, type Route } from "./Commun";

export default function ARelire({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const cas = (data?.passages ?? []).flatMap((p) => p.constats.map((c) => ({ p, c })));
  const ouverts = cas.filter(({ c }) => !c.decision);
  const tranches = cas.filter(({ c }) => c.decision);
  const carte = ({ p, c }: (typeof cas)[number]) => (
    <article className={`review-case is-${c.genre === "defaut" ? "defect" : "suspect"}`} key={`${p.cle}-${c.id}`}>
      <header className="case-heading">
        <span className={`review-status is-${c.genre === "defaut" ? "defect" : "suspect"}`}>{c.genre === "defaut" ? "[ ! ] Défaut prouvé" : "[ ? ] Doute"}</span>
        <div>
          <h2>{c.page} : {c.texte}</h2>
          <span>{p.titre} · {dateCourte(p.date)}</span>
        </div>
      </header>
      <div className="tour-cas">
        <Capture constat={c} />
        <div className="tour-cas-texte">
          {c.preuve && <p className="tour-preuve">{c.preuve}</p>}
          {c.decision
            ? <p className={`decision-pill is-${c.decision.choix === "bug" ? "bug" : "wanted"} tour-decision`}>{c.decision.choix}{c.decision.par ? `, par ${c.decision.par}` : ""}{c.decision.le ? `, le ${dateCourte(c.decision.le)}` : ""}</p>
            : <p className="tour-note">Pas encore tranché. {p.mode === "dev" ? "Il se tranche dans la scène, au prochain passage de cette PR." : "Il se tranche dans le rapport de l'exploration."}</p>}
          <a className="tour-lien" href={`#rapport/${encodeURIComponent(p.cle)}`}>Le rapport du passage</a>
          {p.reponse && <a className="tour-lien" href={p.reponse} target="_blank" rel="noopener">La réponse sur la PR ↗</a>}
        </div>
      </div>
    </article>
  );
  return (
    <div className={`app-shell review-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <header className="review-heading">
            <h1>À relire</h1>
            <div className="review-summary">
              <strong>{data ? `${ouverts.length} cas à trancher` : "Chargement…"}</strong>
              {data && <span className="summary-pill is-defect">{cas.filter(({ c }) => c.genre === "defaut").length} défauts prouvés</span>}
              {data && <span className="summary-pill is-suspect">{cas.filter(({ c }) => c.genre === "doute").length} doutes</span>}
            </div>
          </header>
          <p className="tour-note">En ligne, cette page se lit sans rien changer : une page publique ne tient aucune clé. Les décisions viennent de l'index des passages.</p>
          <Erreurs data={data} />
          <div className="review-cases">
            {ouverts.map(carte)}
            {data && !ouverts.length && <section className="all-resolved"><strong>Tout est tranché.</strong></section>}
          </div>
          {tranches.length > 0 && (
            <>
              <h2 className="tour-sous-titre">Déjà tranchés</h2>
              <div className="review-cases">{tranches.map(carte)}</div>
            </>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}
