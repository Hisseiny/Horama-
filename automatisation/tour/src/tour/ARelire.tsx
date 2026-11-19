// 11.6 À relire: every finding of the passages, the cases not decided yet first, or those of one passage (#relire/<cle>).
// A case of a passage by a PR (in the index) is decided here, with the buttons of the prototype: connected to the team
// account, POST <service>/tour/decision (#238), which writes the decision in the index and a note in the vault; without
// connection the buttons stay visible, disabled. A decision sent moves the case to « Déjà tranchés » at once, with who
// and when, then the data are read again. An exploration by an address keeps the link to its report. What was decided
// is shown with who and when, as the index of the passages carries it. A case decided « voulu » links to 11.7, as in the
// prototype.
import { useState } from "react";
import "../../interface/screen-11-6/styles.css";
import { oublierSession, trancher, type Chargement, type Constat, type Decision, type Passage } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Capture, Erreurs, Mascot, Sidebar, dateCourte, decisionLisible, dureeCout, sansSource, useSession, type Route } from "./Commun";

type Choix = Decision["choix"];
const cleCas = (p: Passage, c: Constat) => `${p.cle}-${c.id}`;

export default function ARelire({ route, data, onRecharger }: { route: Route; data: Chargement | null; onRecharger: () => void }) {
  const { lightMode } = usePrototype();
  const session = useSession();
  // The decisions sent from this page: they hold until the source carries them (the service keeps its data 10 s).
  const [faits, setFaits] = useState<Record<string, Decision>>({});
  const [enCours, setEnCours] = useState<Record<string, Choix | undefined>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const decider = async (p: Passage, c: Constat, choix: Choix) => {
    if (!session || !p.passage) return;
    const k = cleCas(p, c);
    setEnCours((e) => ({ ...e, [k]: choix }));
    setMessages((m) => ({ ...m, [k]: "" }));
    const statut = await trancher(session, p.passage, c.id, choix);
    setEnCours((e) => ({ ...e, [k]: undefined }));
    if (statut >= 200 && statut < 300) {
      setFaits((f) => ({ ...f, [k]: { choix, par: session.nom, le: new Date().toISOString() } }));
      onRecharger();
    } else if (statut === 401) {
      oublierSession();
      setMessages((m) => ({ ...m, [k]: "Session expirée : reconnectez-vous." }));
    } else if (statut === 409) {
      setMessages((m) => ({ ...m, [k]: "Déjà tranché." }));
      onRecharger();
    } else setMessages((m) => ({ ...m, [k]: "Le service n'a pas pu écrire." }));
  };
  // #relire/<cle>: the cases of one passage only (the wake-up opens it at the end of a passage), the passage at the top.
  const seul = route.cle ? data?.passages.find((p) => p.cle === route.cle) ?? null : null;
  const cas = (route.cle ? (seul ? [seul] : []) : data?.passages ?? [])
    .flatMap((p) => p.constats.map((c) => ({ p, c: c.decision || !faits[cleCas(p, c)] ? c : { ...c, decision: faits[cleCas(p, c)] } })));
  const ouverts = cas.filter(({ c }) => !c.decision);
  const tranches = cas.filter(({ c }) => c.decision);
  const muet = sansSource(data);
  // The buttons of the prototype (DecisionButtons of interface/screen-11-6): the expected answer first in ink, « bug »
  // for a proven defect, « voulu » for a doubt.
  const boutons = (p: Passage, c: Constat) => {
    const attendu: Choix = c.genre === "defaut" ? "bug" : "voulu";
    const envoi = enCours[cleCas(p, c)];
    return (
      <>
        <div className="decision-buttons tour-boutons">
          {(attendu === "bug" ? (["voulu", "bug"] as const) : (["bug", "voulu"] as const)).map((choix) => (
            <button className={`${choix === attendu ? "is-primary" : "is-secondary"} is-${choix === "bug" ? "bug" : "wanted"}`} type="button" key={choix}
              disabled={!session || !!envoi} onClick={() => decider(p, c, choix)}>
              {envoi === choix ? "Envoi…" : choix === "bug" ? "C'est un bug" : "C'est voulu"}
            </button>
          ))}
        </div>
        {!session && <a className="tour-lien" href="#connexion">Connectez-vous pour trancher</a>}
      </>
    );
  };
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
            ? <p className={`decision-pill is-${c.decision.choix === "bug" ? "bug" : "wanted"} tour-decision`}>{decisionLisible(c.decision)}{c.decision.le ? `, le ${dateCourte(c.decision.le)}` : ""}</p>
            : p.mode === "dev" && p.passage ? boutons(p, c) : <p className="tour-note">Pas encore tranché. {p.mode === "dev" ? "Ce passage n'a pas d'identifiant dans l'index : il ne se tranche pas ici." : "Il se tranche dans le rapport de l'exploration."}</p>}
          {messages[cleCas(p, c)] && <p className="tour-erreur-cas" role="alert">{messages[cleCas(p, c)]}</p>}
          {c.decision?.choix === "voulu" && <a className="tour-lien" href="#doc">Corriger la documentation</a>}
          <a className="tour-lien" href={`#rapport/${encodeURIComponent(p.cle)}`}>Le rapport du passage</a>
          {p.reponse && <a className="tour-lien" href={p.reponse} target="_blank" rel="noopener">La réponse sur la PR</a>}
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
              <strong>{!data ? "Chargement…" : muet ? "Rien à afficher tant que l'index ne répond pas." : route.cle && !seul ? "Passage introuvable" : `${ouverts.length} cas à trancher`}</strong>
              {data && !muet && (!route.cle || seul) && <span className="summary-pill is-defect">{cas.filter(({ c }) => c.genre === "defaut").length} défauts prouvés</span>}
              {data && !muet && (!route.cle || seul) && <span className="summary-pill is-suspect">{cas.filter(({ c }) => c.genre === "doute").length} doutes</span>}
            </div>
          </header>
          {route.cle && (
            <div className="tour-filtre">
              {seul
                ? <p><strong>{seul.titre}</strong> · {dateCourte(seul.date)}{dureeCout(seul.duree_s, seul.cout_usd) ? ` · ${dureeCout(seul.duree_s, seul.cout_usd)}` : ""}</p>
                : data && !muet && <p>Ce passage n'est pas encore dans l'index des passages : rechargez la page dans un instant.</p>}
              <a className="tour-lien" href="#relire">Tous les cas à relire</a>
            </div>
          )}
          <Erreurs data={data} />
          <div className="review-cases">
            {ouverts.map(carte)}
            {data && !muet && (!route.cle || seul) && !ouverts.length && <section className="all-resolved"><strong>Tout est tranché.</strong></section>}
          </div>
          {tranches.length > 0 && (
            <>
              <h2 className="tour-sous-titre">Déjà tranchés</h2>
              <div className="review-cases">{tranches.map(carte)}</div>
            </>
          )}
        </div>
      </main>
      <Mascot etat={!data || muet ? undefined : ouverts.length ? "doute" : "fini"} />
    </div>
  );
}
