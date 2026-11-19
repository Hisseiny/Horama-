// 11.2 Tests à valider, on the tests of the vault (tests/*.md): the list, those waiting for a human first, then for the
// test chosen (#tests/<id>) its source note on the left and the test in the format of H on the right (Setup, Task,
// Expected Result, Verification, rules), as the prototype lays them. Who accepted it and when, word for word from the
// note. Connected to the team account: « Accepter », « Refuser » and « Modifier » (Task and Verification) send
// POST <service>/tour/test (#238), which writes on the branch horama/vault, then the data are read again. Without
// connection the buttons stay visible, disabled.
import { useEffect, useState } from "react";
import "../../interface/screen-11-2/styles.css";
import { ecrire, enAttente, lireNote, oublierSession, sections, testsDuVault, type Chargement } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Erreurs, Markdown, Mascot, RANGE_SUR_HORAMA_VAULT, Sidebar, erreurEcriture, useSession, type Route } from "./Commun";

type Action = "accepter" | "refuser" | "modifier";
const FAIT: Record<Action, string> = { accepter: "Test accepté.", refuser: "Test refusé.", modifier: "Test modifié." };
const STATUT: Record<string, string> = { accepte: "accepté", refuse: "refusé" };
const REGLES = /```regles\n([\s\S]*?)```/;

export default function Tests({ route, data, onRecharger }: { route: Route; data: Chargement | null; onRecharger: () => void }) {
  const { lightMode } = usePrototype();
  const session = useSession();
  const tests = testsDuVault(data?.vault ?? null).sort((a, b) => Number(enAttente(b)) - Number(enAttente(a)) || a.chemin.localeCompare(b.chemin));
  const idDe = (t: (typeof tests)[number]) => t.champs.id ?? t.chemin.replace(/^tests\/|\.md$/g, "");
  const choisi = tests.find((t) => idDe(t) === route.cle) ?? tests[0] ?? null;
  const id = choisi ? idDe(choisi) : null;
  const [edition, setEdition] = useState<{ task: string; verification: string } | null>(null);
  const [envoi, setEnvoi] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  useEffect(() => {
    setEdition(null);
    setMessage(null);
  }, [id]);

  const parties = choisi ? sections(choisi.corps) : [];
  const partie = (titre: string) => parties.find((p) => p.titre === titre)?.texte ?? null;
  const verification = partie("Verification");
  const regles = verification ? REGLES.exec(verification)?.[1].trim() ?? null : null;
  const source = choisi?.champs.source ? data?.vault?.find((n) => n.chemin === choisi.champs.source) ?? null : null;
  const position = choisi ? tests.indexOf(choisi) : -1;
  const attente = tests.filter(enAttente).length;

  const agir = async (action: Action, champs: Record<string, string> = {}) => {
    if (!session || !id) return;
    setEnvoi(action);
    setMessage(null);
    const { statut, erreur } = await ecrire(session, "test", { test: id, action, ...champs });
    setEnvoi(null);
    if (statut >= 200 && statut < 300) {
      setEdition(null);
      setMessage({ ok: true, texte: `${FAIT[action]} ${RANGE_SUR_HORAMA_VAULT}` });
      onRecharger();
    } else {
      if (statut === 401) oublierSession();
      setMessage({ ok: false, texte: erreurEcriture(statut, erreur, "ce test") });
    }
  };
  const aller = (i: number) => (window.location.hash = `tests/${encodeURIComponent(idDe(tests[i]))}`);

  return (
    <div className={`app-shell validation-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <header className="validation-heading">
            <h1>Tests à valider</h1>
            {data?.vault && <p>{tests.length} test{tests.length > 1 ? "s" : ""} dans le vault · {attente} en attente · {tests.filter((t) => t.champs.statut === "accepte").length} accepté{tests.filter((t) => t.champs.statut === "accepte").length > 1 ? "s" : ""} · {tests.filter((t) => t.champs.statut === "refuse").length} refusé{tests.filter((t) => t.champs.statut === "refuse").length > 1 ? "s" : ""}</p>}
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement des tests…</p>}
          {data && !data.vault && <p className="tour-vide">Le vault ne répond pas (ni le service Horama ni GitHub) : les tests sont illisibles. Rechargez la page.</p>}
          {data?.vault && !tests.length && <p className="tour-vide">Aucun test dans tests/ du vault.</p>}
          {tests.length > 0 && !attente && <p className="tour-filtre">Aucun test en attente de validation. Les tests déjà tranchés restent lisibles ci-dessous.</p>}
          {tests.length > 0 && (
            <nav className="tour-tests" aria-label="Tests du vault">
              {tests.map((t) => (
                <button type="button" key={t.chemin} className={t === choisi ? "is-active" : ""} aria-current={t === choisi ? "true" : undefined}
                  onClick={() => (window.location.hash = `tests/${encodeURIComponent(idDe(t))}`)}>
                  <strong>{t.titre}</strong>
                  <span>{idDe(t)} · {STATUT[t.champs.statut] ?? "en attente"}</span>
                </button>
              ))}
            </nav>
          )}
          {choisi && (
            <section className="validation-card" aria-label="Test choisi">
              <div className="validation-columns">
                <article className="vault-note">
                  <p className="validation-label">Note du vault</p>
                  <p className="validation-path">{choisi.champs.source ? `vault-horama/eugenia-clone/${choisi.champs.source}` : "Ce test ne nomme pas sa note source (champ « source »)."}</p>
                  {choisi.champs.source && (
                    <a className="vault-open-link" href={`https://github.com/Hisseiny/Horama-/blob/dev/vault-horama/eugenia-clone/${choisi.champs.source}`} target="_blank" rel="noopener">
                      Ouvrir la note sur GitHub (dev) ↗
                    </a>
                  )}
                  <div className="vault-copy">
                    {source ? <Markdown texte={lireNote(source).corps} /> : choisi.champs.source && <p className="tour-vide">La note {choisi.champs.source} n'est pas dans le vault lu.</p>}
                  </div>
                </article>
                <article className="proposed-test">
                  <div className="proposed-test-head">
                    <p className="validation-label">Test · format H</p>
                    {tests.length > 1 && (
                      <div className="test-pager" role="group" aria-label="Changer de test">
                        <button type="button" aria-label="Test précédent" disabled={position === 0} onClick={() => aller(position - 1)}>←</button>
                        <span>Test {position + 1} / {tests.length}</span>
                        <button type="button" aria-label="Test suivant" disabled={position === tests.length - 1} onClick={() => aller(position + 1)}>→</button>
                      </div>
                    )}
                  </div>
                  <p className="test-title">{choisi.titre}</p>
                  <p className="test-id">id : {id}{choisi.champs.url_depart ? ` · départ : ${choisi.champs.url_depart}` : ""}</p>
                  <p className="tour-statut-test">
                    {choisi.champs.statut === "accepte"
                      ? `Accepté par ${choisi.champs.accepte_par ?? "(non écrit)"}, le ${choisi.champs.accepte_le ?? "(non écrit)"}`
                      : choisi.champs.statut === "refuse"
                        ? `Refusé par ${choisi.champs.refuse_par ?? "(non écrit)"}, le ${choisi.champs.refuse_le ?? "(non écrit)"}`
                        : "En attente de validation"}
                  </p>
                  <div className="test-blocks">
                    {(["Setup", "Task", "Expected Result", "Verification"] as const).map((titre) => {
                      const texte = titre === "Verification" ? verification?.replace(REGLES, "").trim() ?? null : partie(titre);
                      const champ = titre === "Task" ? "task" : titre === "Verification" ? "verification" : null;
                      return (
                        <div className="tour-bloc" key={titre}>
                          <strong>{titre} :</strong>
                          {edition && champ
                            ? <textarea value={edition[champ]} aria-label={`Modifier : ${titre}`} rows={6} onChange={(e) => setEdition({ ...edition, [champ]: e.target.value })} />
                            : texte ? <Markdown texte={texte} /> : <p className="tour-vide">Section absente du test.</p>}
                        </div>
                      );
                    })}
                    {regles && <pre className="test-rule">{regles}</pre>}
                  </div>
                </article>
              </div>
              <div className="validation-actions tour-actions">
                {message && <p className={message.ok ? "tour-ok" : "tour-erreur-cas"} role={message.ok ? "status" : "alert"}>{message.texte}</p>}
                {!session && <a className="tour-lien" href="#connexion">Connectez-vous pour accepter, refuser ou modifier un test</a>}
                {edition
                  ? (
                    <>
                      <button className="validation-action is-refuse" type="button" disabled={!!envoi} onClick={() => setEdition(null)}>Annuler</button>
                      <button className="validation-action is-accept" type="button" disabled={!session || !!envoi || !edition.task.trim() || !edition.verification.trim()}
                        onClick={() => agir("modifier", { task: edition.task, verification: edition.verification.replace(REGLES, "").trim() })}>
                        {envoi === "modifier" ? "Envoi…" : "Enregistrer"}
                      </button>
                    </>
                  )
                  : (
                    <>
                      <button className="validation-action is-refuse" type="button" disabled={!session || !!envoi} onClick={() => agir("refuser")}>{envoi === "refuser" ? "Envoi…" : "Refuser"}</button>
                      <button className="validation-action is-modify" type="button" disabled={!session || !!envoi}
                        onClick={() => setEdition({ task: partie("Task") ?? "", verification: verification?.replace(REGLES, "").trim() ?? "" })}>
                        Modifier
                      </button>
                      <button className="validation-action is-accept" type="button" disabled={!session || !!envoi} onClick={() => agir("accepter")}>{envoi === "accepter" ? "Envoi…" : "Accepter le test"}</button>
                    </>
                  )}
              </div>
            </section>
          )}
        </div>
      </main>
      <Mascot etat={!data?.vault ? undefined : attente ? "doute" : "fini"} />
    </div>
  );
}
