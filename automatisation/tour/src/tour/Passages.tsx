// 11.8 Passages et rapports, on real data only: the passages of the public index (entry by a PR, PR of the clone)
// and the explorations sent from this browser (entry by an address), the latest first; then the journal of the decisions taken
// by a human, as the index carries them. No journal of the agent step by step: no source gives it today. Links to 11.3
// (the direct) and to 11.7 (a « voulu » of the journal, as the prototype does).
import "../../interface/screen-11-8/styles.css";
import type { Chargement } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { CHOIX, Erreurs, Mascot, Sidebar, dateCourte, dureeCout, etatLisible, sansSource, type Route } from "./Commun";

export default function Passages({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const vide = sansSource(data) ? "Rien à afficher tant que l'index ne répond pas." : null;
  const decisions = (data?.passages ?? []).flatMap((p) => p.constats.filter((c) => c.decision).map((c) => ({ p, c })));
  return (
    <div className={`app-shell history-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <header className="history-page-heading">
            <h1>Passages et rapports</h1>
            <p>Chaque ligne est une visite d'Horama. Ouvrez-en une pour voir ce qu'il a prouvé, capture à l'appui.</p>
            <p className="tour-liens-ecrans"><a className="tour-lien" href="#direct">En direct</a> <a className="tour-lien" href="#comparer">Comparer deux passages</a></p>
          </header>
          <Erreurs data={data} />
          <section className="history-card passages-card" aria-labelledby="passages-title">
            <h2 id="passages-title">Passages</h2>
            {!data && <p className="tour-vide">Chargement des passages…</p>}
            {data && !data.passages.length && <p className="tour-vide">{vide ?? "Aucun passage pour l'instant."}</p>}
            {data && data.passages.length > 0 && (
              <div className="passages-table tour-passages">
                <div className="passages-head">
                  <span>Date</span>
                  <span>Passage</span>
                  <span>Pages</span>
                  <span>Résultat</span>
                  <span>Durée & coût</span>
                </div>
                {data.passages.map((p) => (
                  <div className="passage-item" key={p.cle}>
                    <div className="passage-line">
                      <button className="passage-row" type="button" onClick={() => (window.location.hash = `rapport/${encodeURIComponent(p.cle)}`)}>
                        <span>{dateCourte(p.date)}</span>
                        <span className="tour-titre">
                          <strong>{p.titre}</strong>
                          <small>{p.mode === "dev" ? "par une PR" : "par une adresse"}{etatLisible(p) ? ` · ${etatLisible(p)}` : ""}</small>
                        </span>
                        <span>{p.pages.visitees ?? "?"}{p.pages.trouvees ? ` / ${p.pages.trouvees}` : ""}</span>
                        <span className="passage-results">
                          {p.defauts > 0 && <span className="is-bug">{p.defauts} {p.defauts > 1 ? "défauts prouvés" : "défaut prouvé"}</span>}
                          {p.doutes > 0 && <span className="is-suspect">{p.doutes} {p.doutes > 1 ? "doutes" : "doute"}</span>}
                          {!p.defauts && !p.doutes && (etatLisible(p) ? <span className="tour-etat">{etatLisible(p)}</span> : <span className="is-conform">rien de prouvé</span>)}
                        </span>
                        <span>{dureeCout(p.duree_s, p.cout_usd) || "Voir le rapport →"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="history-card journal-card" aria-labelledby="journal-title">
            <div className="journal-heading">
              <div>
                <h2 id="journal-title">Journal des décisions</h2>
                <p className="tour-note">Chaque « bug » ou « voulu » tranché par un humain, tel qu'il est écrit dans l'index des passages.</p>
              </div>
              <a className="tour-lien" href="#doc">Corrections de doc</a>
            </div>
            <div className="decision-list">
              {decisions.map(({ p, c }) => (
                <button className="decision-entry" type="button" key={`${p.cle}-${c.id}`} onClick={() => (window.location.hash = c.decision!.choix === "voulu" ? "doc" : `rapport/${encodeURIComponent(p.cle)}`)}>
                  <span className={`timeline-dot is-${c.decision!.choix === "bug" ? "bug" : "wanted"}`} aria-hidden="true" />
                  <span className="decision-date">{c.decision!.le ? dateCourte(c.decision!.le) : dateCourte(p.date)}</span>
                  <span className="decision-copy">
                    <strong>{c.page}</strong>
                    <span className="decision-rule">{c.texte}</span>
                  </span>
                  <span className={`decision-pill is-${c.decision!.choix === "bug" ? "bug" : "wanted"}`}>{CHOIX[c.decision!.choix]}</span>
                  <span className="decision-author">{c.decision!.par ? `par ${c.decision!.par}` : ""}</span>
                  <span className="decision-meta">{p.titre}</span>
                </button>
              ))}
              {data && !decisions.length && <p className="empty-decisions">{vide ?? "Aucune décision pour l'instant."}</p>}
            </div>
          </section>
        </div>
      </main>
      <Mascot />
    </div>
  );
}
