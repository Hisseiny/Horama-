import "./accueil.css";
import Link from "next/link";
import { Highlight } from "../components/Highlight";
import { LOGICIEL } from "../lib/config";
import { lireResultats, listerEcrans, proposerTests, type RegleDocumentee } from "../lib/donnees";
import { measure, plural } from "../lib/format";
import { cleRegle, GRAVITE, LIBELLE_ETAT, parGravite, type EtatRegle } from "../lib/states";
import { launch } from "./actions";

const COUNTED: Record<EtatRegle, [string, string]> = {
  defaut: ["en défaut prouvé", "en défaut prouvé"],
  a_trancher: ["à trancher", "à trancher"],
  non_concluant: ["non concluante", "non concluantes"],
  acceptee: ["acceptée, pas encore jouée", "acceptées, pas encore jouées"],
  non_testee: ["jamais testée", "jamais testées"],
  conforme: ["conforme", "conformes"],
};

// Tested rules first, most serious first; then the rules nobody tests.
const byCoverage = (regles: RegleDocumentee[]) =>
  [...regles].sort((a, b) => Number(b.tests.length > 0) - Number(a.tests.length > 0) || parGravite(a.etat, b.etat));

export default async function Accueil() {
  const l = await listerEcrans(LOGICIEL);
  const [resultats, propositions] = await Promise.all([
    l.passage_id ? lireResultats(l.passage_id) : [],
    proposerTests(LOGICIEL, l.version_testee),
  ]);
  const resultOf = (r: RegleDocumentee) => resultats.find((x) => r.regle && x.regle && cleRegle(x.regle) === cleRegle(r.regle));
  const questions = propositions.flatMap((p) => p.questions).length;
  const tested = l.regles.filter((r) => r.tests.length).length;

  // What is written in the margin of a rule: its measure, or why it has none.
  const margin = (r: RegleDocumentee) => {
    const resultat = resultOf(r);
    if (resultat) return <b>{measure(resultat)}</b>;
    if (r.etat === "conforme") return "conforme au dernier passage";
    if (r.etat === "acceptee") return "test accepté, pas encore joué";
    return r.ligne ? "aucun test" : "aucune ligne regle:";
  };

  // Screens, most serious first.
  const ecrans = l.ecrans
    .map((e) => {
      const tests = l.tests.filter((t) => e.tests.includes(t.id)).sort((a, b) => parGravite(a.etat, b.etat));
      const failing = resultats.filter((r) => r.statut === "VERIFIED_FAIL" && e.tests.includes(r.test_id));
      return { e, tests, failing, etat: tests[0]?.etat ?? ("non_testee" as EtatRegle) };
    })
    .sort((a, b) => parGravite(a.etat, b.etat) || b.failing.length - a.failing.length);

  return (
    <>
      <section className="couverture">
        <div>
          <h1>{l.nom}</h1>
          <p className="couverture-vault">
            Vault connecté : <code>{l.vault}</code>. Version testée {l.version_testee}, référence {l.version_reference}.
          </p>
          <p className="couverture-phrase">
            {plural(l.regles.length, "règle", "règles")} dans la documentation, {plural(tested, "testée", "testées")}
          </p>
          <ol className="couverture-barre" aria-label="Une case par règle">
            {byCoverage(l.regles).map((r, i) => (
              <li key={i} className={`case case-${r.etat}`} title={r.phrase} />
            ))}
          </ol>
          <p className="couverture-detail">
            {[...new Set(byCoverage(l.regles).map((r) => r.etat))].map((etat) => (
              <Highlight key={etat} etat={etat}>{plural(l.regles.filter((r) => r.etat === etat).length, ...COUNTED[etat])}</Highlight>
            ))}
          </p>
        </div>
        <div className="couverture-actions">
          <form action={launch}>
            <button className="bouton">Lancer un passage</button>
          </form>
          <p>
            {plural(l.tests.length, "test accepté", "tests acceptés")} dans le vault, joués par l'agent H sur la version {l.version_testee}, 3 sessions au plus à la fois.
          </p>
          {propositions.length > 0 && (
            <div className="bloc bloc-a_trancher">
              <p>
                <b>Note de version {l.version_testee} :</b> {plural(propositions.length, "test proposé", "tests proposés")} à valider, {plural(questions, "question", "questions")}.
              </p>
              <Link href={`/notes/${LOGICIEL}/${l.version_testee}`}>Relire les tests proposés</Link>
            </div>
          )}
        </div>
      </section>

      <p className="lecture">
        <span>Lecture du surlignage :</span>
        {GRAVITE.map((etat) => (
          <Highlight key={etat} etat={etat}>{LIBELLE_ETAT[etat].toLowerCase()}</Highlight>
        ))}
      </p>

      {ecrans.map(({ e, tests, etat, failing }) => {
        const suspects = resultats.flatMap((r) => r.ecarts_visuels).filter((v) => v.ecran === e.id && v.statut === "SUSPECTED");
        const notes = [...new Set(e.regles.map((r) => r.note))];
        return (
          <section className="ecran" key={e.id}>
            <div className="ecran-fiche">
              <h2>{e.titre}</h2>
              <div className={`bloc bloc-${etat} verdict`}>
                <p className="verdict-titre">{LIBELLE_ETAT[etat]}</p>
                {failing.map((r) => (
                  <p key={r.test_id} className="verdict-mesure mono">{measure(r)}</p>
                ))}
                {etat === "conforme" && <p>{plural(tests.length, "test joué", "tests joués")} au dernier passage.</p>}
              </div>
              {suspects.map((s) => (
                <div key={s.id} className="bloc bloc-a_trancher">
                  <p><b>Suspect.</b> {s.description}.</p>
                  <Link href="/relecture">Trancher : bug ou voulu</Link>
                </div>
              ))}
              <h3>{plural(tests.length, "test", "tests")}</h3>
              <ul className="ecran-tests">
                {tests.map((t) => (
                  <li key={t.id}>
                    {t.titre} <Highlight etat={t.etat}>{LIBELLE_ETAT[t.etat].toLowerCase()}</Highlight>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ecran-regles">
              {notes.map((note) => (
                <div key={note}>
                  <p className="mono second">{l.vault}/{note}</p>
                  <ul>
                    {e.regles.filter((r) => r.note === note).map((r) => (
                      <li key={r.phrase} className="regle">
                        <div>
                          <p className="regle-phrase"><Highlight etat={r.etat}>{r.phrase}</Highlight></p>
                          {r.ligne && <p className="regle-ligne mono second">{r.ligne}</p>}
                        </div>
                        <p className="regle-marge mono">{margin(r)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
