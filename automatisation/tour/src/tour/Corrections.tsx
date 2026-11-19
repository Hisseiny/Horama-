// 11.7 Corrections de doc. A correction of a note is a proposal written in the vault, in a decision of decisions/ (block
// ```decision, field correction_de_note { fichier, avant, apres, statut }): the scene proposes one when a human says
// « voulu » there. The screen lists them, the text before and after on the note. Connected to the team account, a
// proposal still « proposee » is accepted (the note corrected) or refused (the note left as it is) by
// POST <service>/tour/doc { note, correction, action } (#238, agent/scripts/tour-service.mjs), where `correction` is
// the name of the decision; the service writes on the branch horama/vault. No proposal: an empty, honest screen.
import { useState } from "react";
import "../../interface/screen-11-7/styles.css";
import { ecrire, oublierSession, type Chargement, type Note } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Erreurs, Markdown, Mascot, RANGE_SUR_HORAMA_VAULT, Sidebar, dateCourte, erreurEcriture, sansSource, useSession, type Route } from "./Commun";

type Action = "accepter" | "refuser";
type Proposition = { correction: string; fichier: string; avant: string; apres: string; statut: string; ecart: string | null; ecran: string | null; par: string | null; le: string | null };

const STATUTS: Record<string, string> = { proposee: "proposée, à trancher", acceptee: "acceptée : la note est corrigée", refusee: "refusée : la note est laissée telle quelle" };

// The proposals of the vault, read as agent/scripts/tour-vault.mjs (readCorrection) reads them.
function propositions(vault: Note[] | null): Proposition[] {
  return (vault ?? []).flatMap((note) => {
    const name = /^decisions\/([\w-][\w.-]*)\.md$/.exec(note.chemin)?.[1];
    const block = name ? /^```decision[ \t]*\n([\s\S]*?)^```[ \t]*$/m.exec(note.contenu.replace(/\r\n/g, "\n")) : null;
    if (!name || !block) return [];
    try {
      const decision = JSON.parse(block[1]);
      const c = decision.correction_de_note;
      if (typeof c?.fichier !== "string" || typeof c.avant !== "string" || typeof c.apres !== "string") return [];
      return [{ correction: name, fichier: c.fichier, avant: c.avant, apres: c.apres, statut: String(c.statut ?? ""), ecart: decision.ecart ?? null, ecran: decision.ecran ?? null, par: decision.par ?? null, le: decision.le ?? null }];
    } catch {
      return [];
    }
  });
}

export default function Corrections({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const session = useSession();
  const liste = propositions(data?.vault ?? null).sort((a, b) => Number(b.statut === "proposee") - Number(a.statut === "proposee"));
  const [envois, setEnvois] = useState<Record<string, Action | undefined>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; texte: string }>>({});
  const muet = sansSource(data) || (data !== null && data.vault === null);

  const envoyer = async (p: Proposition, action: Action) => {
    if (!session) return;
    setEnvois((e) => ({ ...e, [p.correction]: action }));
    setMessages(({ [p.correction]: _, ...m }) => m);
    const { statut, erreur } = await ecrire(session, "doc", { note: p.fichier, correction: p.correction, action });
    setEnvois((e) => ({ ...e, [p.correction]: undefined }));
    if (statut === 401) oublierSession();
    setMessages((m) => ({ ...m, [p.correction]: statut >= 200 && statut < 300
      ? { ok: true, texte: `${action === "accepter" ? "Note corrigée." : "Note laissée telle quelle."} ${RANGE_SUR_HORAMA_VAULT}` }
      : { ok: false, texte: erreurEcriture(statut, erreur, "cette correction") } }));
  };

  const carte = (p: Proposition) => {
    const note = data?.vault?.find((n) => n.chemin === p.fichier) ?? null;
    const envoi = envois[p.correction];
    const ouverte = p.statut === "proposee";
    return (
      <section className="doc-proposal tour-correction" key={p.correction}>
        <header className="proposal-banner">
          <strong>vault-horama/eugenia-clone/{p.fichier}</strong>
          <span>{STATUTS[p.statut] ?? p.statut}</span>
        </header>
        <div className="decision-reminder">
          Décision {p.correction}{p.ecart ? ` : « ${p.ecart} »` : ""}{p.ecran ? ` sur l'écran ${p.ecran}` : ""}, tranchée « voulu »{p.par ? ` par ${p.par}` : ""}{p.le ? `, le ${dateCourte(p.le)}` : ""}.
        </div>
        <div className="proposal-content">
          <div className="markdown-panel tour-note-vault">
            <p className="diff-context">Texte actuel de la note :</p>
            <p className="diff-line is-removed">{p.avant}</p>
            <p className="diff-context">Texte proposé :</p>
            <p className="diff-line is-added">{p.apres}</p>
          </div>
          <div className="markdown-panel tour-note-vault">
            {note ? <Markdown texte={note.contenu} /> : <p className="diff-context">La note {p.fichier} n'est pas dans le vault lu.</p>}
          </div>
        </div>
        {messages[p.correction] && <p className={`tour-message ${messages[p.correction].ok ? "tour-ok" : "tour-erreur-cas"}`} role={messages[p.correction].ok ? "status" : "alert"}>{messages[p.correction].texte}</p>}
        {ouverte && (
          <footer className="proposal-actions">
            {session
              ? <button className="leave-note" type="button" disabled={!!envoi} onClick={() => envoyer(p, "refuser")}>{envoi === "refuser" ? "Envoi…" : "Laisser la note telle quelle"}</button>
              : <a className="tour-lien" href="#connexion">Connectez-vous pour trancher une correction</a>}
            <button className="correct-note" type="button" disabled={!session || !!envoi} onClick={() => envoyer(p, "accepter")}>
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
            <p>Quand un écart est tranché « voulu », Horama peut proposer de corriger la note du vault qui décrit la page : le texte actuel, le texte proposé. On l'accepte ou on la refuse ici.</p>
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement des propositions…</p>}
          {data && muet && <p className="tour-vide">Rien à afficher tant que le vault ne répond pas.</p>}
          {data && !muet && !liste.length && (
            <div className="tour-filtre"><p>Aucune correction de note proposée dans le vault. Une proposition naît quand un écart est tranché « voulu » dans la scène et qu'Horama propose une correction ; trancher dans <a className="tour-lien" href="#relire">À relire</a> n'en propose pas.</p></div>
          )}
          <div className="tour-corrections">{liste.map(carte)}</div>
        </div>
      </main>
      <Mascot etat={data && !muet ? "fini" : undefined} />
    </div>
  );
}
