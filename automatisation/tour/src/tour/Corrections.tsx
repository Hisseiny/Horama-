// 11.7 Corrections de doc. A correction of a note exists only after a « voulu »: the screen lists the decisions « voulu »
// of the index of the passages, each with the note of the vault that describes its page (field « url ») when there is
// one, and the capture of the finding. Connected to the team account, the correction written here is sent, or the note
// left as it is, by POST <service>/tour/doc {note, correction, action} (#238), which writes on the branch horama/vault;
// its answer (501 while the route is not done) is shown as the service gives it. No « voulu »: an empty, honest screen.
import { useState } from "react";
import "../../interface/screen-11-7/styles.css";
import { ecrire, notesProduit, oublierSession, type Chargement, type Constat, type Passage } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Capture, Erreurs, Markdown, Mascot, RANGE_SUR_HORAMA_VAULT, Sidebar, dateCourte, erreurEcriture, notePourPage, sansSource, useSession, type Route } from "./Commun";

type Action = "accepter" | "refuser";

export default function Corrections({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const session = useSession();
  const notes = notesProduit(data?.vault ?? null);
  const voulus = (data?.passages ?? []).flatMap((p) => p.constats.filter((c) => c.decision?.choix === "voulu").map((c) => ({ p, c })));
  const [textes, setTextes] = useState<Record<string, string>>({});
  const [envois, setEnvois] = useState<Record<string, Action | undefined>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; texte: string }>>({});
  const muet = sansSource(data);

  const envoyer = async (k: string, note: string, action: Action) => {
    if (!session) return;
    setEnvois((e) => ({ ...e, [k]: action }));
    setMessages(({ [k]: _, ...m }) => m);
    const { statut, erreur } = await ecrire(session, "doc", { note, correction: action === "accepter" ? textes[k] ?? "" : "", action });
    setEnvois((e) => ({ ...e, [k]: undefined }));
    if (statut === 401) oublierSession();
    setMessages((m) => ({ ...m, [k]: statut >= 200 && statut < 300
      ? { ok: true, texte: `${action === "accepter" ? "Correction envoyée." : "Note laissée telle quelle."} ${RANGE_SUR_HORAMA_VAULT}` }
      : { ok: false, texte: erreurEcriture(statut, erreur, "cette note") } }));
  };

  const carte = ({ p, c }: { p: Passage; c: Constat }) => {
    const k = `${p.cle}-${c.id}`;
    const note = notePourPage(notes, c.page);
    const envoi = envois[k];
    return (
      <section className="doc-proposal tour-correction" key={k}>
        <header className="proposal-banner">
          <strong>{note ? `vault-horama/eugenia-clone/${note.chemin}` : `Aucune note du vault ne décrit la page ${c.page}`}</strong>
          <span>{p.titre.split(" : ")[0]}</span>
        </header>
        <div className="decision-reminder">
          Décision enregistrée : « {c.texte} » sur {c.page}, tranché « voulu »{c.decision!.par ? ` par ${c.decision!.par}` : ""}{c.decision!.le ? `, le ${dateCourte(c.decision!.le)}` : ""}.
        </div>
        <div className="proposal-content">
          <div className="markdown-panel tour-note-vault">
            {note ? <Markdown texte={note.corps} /> : <p className="diff-context">{data?.vault ? "Pas de note à corriger : aucune note de produit/ n'a cette adresse (champ « url »)." : "Le vault ne répond pas : la note est illisible."}</p>}
          </div>
          <Capture constat={c} />
        </div>
        {note && (
          <label className="tour-champ">
            <span>La correction à apporter à la note</span>
            <textarea rows={4} value={textes[k] ?? ""} disabled={!session || !!envoi} onChange={(e) => setTextes((t) => ({ ...t, [k]: e.target.value }))}
              placeholder={session ? "Ce que la note doit dire désormais." : "Connectez-vous pour écrire une correction."} />
          </label>
        )}
        {messages[k] && <p className={`tour-message ${messages[k].ok ? "tour-ok" : "tour-erreur-cas"}`} role={messages[k].ok ? "status" : "alert"}>{messages[k].texte}</p>}
        {note && (
          <footer className="proposal-actions">
            {session
              ? <button className="leave-note" type="button" disabled={!!envoi} onClick={() => envoyer(k, note.chemin, "refuser")}>{envoi === "refuser" ? "Envoi…" : "Laisser la note telle quelle"}</button>
              : <a className="tour-lien" href="#connexion">Connectez-vous pour corriger une note</a>}
            <button className="correct-note" type="button" disabled={!session || !!envoi || !(textes[k] ?? "").trim()} onClick={() => envoyer(k, note.chemin, "accepter")}>
              {envoi === "accepter" ? "Envoi…" : "Corriger la note"}
            </button>
          </footer>
        )}
      </section>
    );
  };

  return (
    <div className={`app-shell doc-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <button className="back-to-review" type="button" onClick={() => (window.location.hash = "relire")}>← Retour à la relecture</button>
          <header className="doc-heading">
            <h1>Corrections de doc</h1>
            <p>Un « C'est voulu » tranché dans « À relire » dit que l'écran a raison : la note du vault qui décrit sa page est peut-être à corriger.</p>
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement des décisions…</p>}
          {muet && <p className="tour-vide">Rien à afficher tant que l'index des passages ne répond pas.</p>}
          {data && !muet && !voulus.length && (
            <p className="tour-filtre">Aucune décision « voulu » dans l'index des passages : aucune note à corriger. Une correction n'existe qu'après un « C'est voulu » tranché dans <a className="tour-lien" href="#relire">À relire</a>.</p>
          )}
          <div className="tour-corrections">{voulus.map(carte)}</div>
        </div>
      </main>
      <Mascot etat={data && !muet ? "fini" : undefined} />
    </div>
  );
}
