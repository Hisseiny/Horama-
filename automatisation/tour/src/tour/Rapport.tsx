// 11.4 Rapport de passage, on real data only: the figures of one passage, the table of its findings, then each finding on
// its capture with the sign of the charter. Links to the PR and to the answer of Horama (entry by a PR), or to the
// page of report of the service (entry by an address). Links to 11.5 (compare a page with another passage, entry by a
// PR) and to 11.3 (an exploration still running).
import "../../interface/screen-11-4/styles.css";
import type { Chargement } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Capture, Erreurs, Mascot, Sidebar, Statut, dateCourte, decisionLisible, dureeCout, estFini, etatLisible, type Route } from "./Commun";

function Fold({ value, label, detail, status }: { value: string; label: string; detail?: string; status?: string }) {
  return (
    <section className="report-fold">
      <strong className={status ? `is-${status}` : ""}>{value}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
    </section>
  );
}

export default function Rapport({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const p = data?.passages.find((item) => item.cle === route.cle) ?? null;
  const aTrancher = p ? p.constats.filter((c) => c.genre === "doute" && !c.decision).length : 0;
  return (
    <div className={`app-shell report-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <button className="back-to-passages" type="button" onClick={() => (window.location.hash = "")}>← Tous les passages</button>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement du passage…</p>}
          {data && !p && <p className="tour-vide">Ce passage n'est plus dans les sources (index des passages, ou exploration que le service ne garde plus).</p>}
          {p && (
            <>
              <header className="report-heading">
                <div>
                  <h1>Rapport de passage</h1>
                  <p>{p.titre} · {dateCourte(p.date)}{etatLisible(p) ? ` · ${etatLisible(p)}` : ""}{p.commit ? ` · commit ${p.commit.slice(0, 7)}` : ""}</p>
                </div>
                <div className="tour-liens">
                  {p.lien && <a className="export-report" href={p.lien} target={p.mode === "dev" ? "_blank" : undefined} rel="noopener">{p.mode === "dev" ? "La PR" : "Le rapport complet"}</a>}
                  {p.reponse && <a className="export-report" href={p.reponse} target="_blank" rel="noopener">La réponse d'Horama sur la PR</a>}
                  {p.mode === "public" && (p.etat === "en_cours" || p.etat === "en_file") && <a className="export-report" href="#direct">En direct</a>}
                </div>
              </header>
              <div className="report-folds">
                <Fold value={String(p.defauts)} label={p.defauts > 1 ? "défauts prouvés" : "défaut prouvé"} status="defect" />
                <Fold value={String(p.doutes)} label={p.doutes > 1 ? "doutes" : "doute"} detail={aTrancher ? `${aTrancher} à trancher` : p.doutes ? (p.doutes > 1 ? "tous tranchés" : "tranché") : undefined} status="suspect" />
                <Fold value={p.pages.visitees !== null ? String(p.pages.visitees) : "?"} label="pages visitées" detail={p.pages.trouvees ? `sur ${p.pages.trouvees} trouvées` : undefined} />
                {p.duree_s !== null && <Fold value={p.duree_s < 60 ? `${Math.round(p.duree_s)} s` : `${Math.round(p.duree_s / 60)} min`} label="durée" />}
                {p.cout_usd !== null && <Fold value={dureeCout(null, p.cout_usd)} label="coût" />}
              </div>
              <section className="report-table-card" aria-label="Constats du passage">
                <div className="report-table-scroll">
                  <div className="report-table tour-table">
                    <div className="report-table-head">
                      <span>Statut</span>
                      <span>Constat</span>
                      <span>Page</span>
                      <span>Preuve / mesure</span>
                      <span>Décision</span>
                    </div>
                    {p.constats.map((c) => (
                      <a className="report-row is-clickable" href={`#rapport/${encodeURIComponent(p.cle)}`} key={c.id}
                        onClick={(event) => { event.preventDefault(); document.getElementById(`constat-${c.id}`)?.scrollIntoView({ behavior: "auto", block: "start" }); }}>
                        <Statut genre={c.genre} />
                        <span className="report-test"><strong>{c.texte}</strong></span>
                        <span>{c.page}</span>
                        <span className={`report-proof is-${c.genre === "defaut" ? "defect" : "suspect"}`}>{c.preuve ?? ""}</span>
                        <span className="report-measure">{decisionLisible(c.decision)}</span>
                      </a>
                    ))}
                    {!p.constats.length && <p className="tour-vide">{estFini(p) ? "Aucun défaut prouvé ni doute sur ce passage." : "Rien de prouvé pour l'instant : ce passage n'est pas allé au bout."}</p>}
                  </div>
                </div>
              </section>
              <section className="tour-captures" aria-label="Captures des constats">
                {p.constats.map((c) => (
                  <article className="tour-constat" id={`constat-${c.id}`} key={c.id}>
                    <header>
                      <Statut genre={c.genre} />
                      <strong>{c.page}</strong>
                      <span>{c.texte}</span>
                    </header>
                    <Capture constat={c} />
                    {c.preuve && <p className="tour-preuve">{c.preuve}</p>}
                    <p className="tour-note">Décision : {decisionLisible(c.decision)}</p>
                    {p.mode === "dev" && (c.capture || p.vues.some((v) => v.page === c.page && v.capture)) && <a className="tour-lien" href={`#comparer/${encodeURIComponent(c.page)}`}>Comparer cette page avec un autre passage</a>}
                  </article>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
      <Mascot etat={!p ? undefined : p.defauts ? "trouve" : estFini(p) ? "fini" : undefined} />
    </div>
  );
}
