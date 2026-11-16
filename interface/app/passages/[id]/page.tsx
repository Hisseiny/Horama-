import "./rapport.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Highlight } from "../../../components/Highlight";
import { LOGICIEL } from "../../../lib/config";
import { lireRapport, lireResultats, listerEcrans } from "../../../lib/donnees";
import { cost, duration, measure, plural } from "../../../lib/format";
import { ETAT_DU_STATUT, LIBELLE_ETAT, parGravite, type EtatRegle } from "../../../lib/states";
import { launch } from "../../actions";

// Step 8. The report of a passage: one line that says it all, then the tests, the most serious first.
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rapport, resultats, l] = await Promise.all([lireRapport(id), lireResultats(id), listerEcrans(LOGICIEL)]);
  if (!rapport) notFound();
  const { passage } = rapport;

  const rows = rapport.tests
    .map((t) => {
      const resultat = resultats.find((r) => r.test_id === t.test_id);
      const etat: EtatRegle = resultat ? ETAT_DU_STATUT[resultat.statut] : t.etat === "non_concluant" ? "non_concluant" : "acceptee";
      return { t, resultat, etat, test: l.tests.find((x) => x.id === t.test_id) };
    })
    .sort((a, b) => parGravite(a.etat, b.etat));
  const count = (etat: EtatRegle) => rows.filter((r) => r.etat === etat).length;
  const suspects = count("a_trancher") + resultats.flatMap((r) => r.ecarts_visuels).filter((e) => e.statut === "SUSPECTED").length;
  const screenTitle = (ecran: string) => l.ecrans.find((e) => e.id === ecran)?.titre ?? ecran;

  return (
    <>
      <header className="rapport-tete">
        <div>
          <h1>Rapport de passage</h1>
          <p>{l.nom}, version {passage.version_testee} contre la référence {passage.version_reference}. <code>{passage.id}</code></p>
        </div>
        <form action={launch}>
          <button className="bouton">Rejouer le passage</button>
        </form>
      </header>

      <p className="rapport-resume">
        {plural(rows.length, "test", "tests")},{" "}
        <Highlight etat="conforme">{plural(count("conforme"), "conforme", "conformes")}</Highlight>,{" "}
        <Highlight etat="defaut">{plural(count("defaut"), "défaut prouvé", "défauts prouvés")}</Highlight>,{" "}
        <Highlight etat="a_trancher">{plural(suspects, "suspect", "suspects")}</Highlight>,{" "}
        {count("non_concluant") > 0 && <><Highlight etat="non_concluant">{plural(count("non_concluant"), "non concluant", "non concluants")}</Highlight>, </>}
        {passage.etat === "en_cours" ? "passage en cours" : duration(passage.duree_s)}, {cost(passage.cout_usd)}
      </p>

      <table className="rapport">
        <thead>
          <tr><th>Statut</th><th>Règle et note source</th><th>Écrans visités</th><th>Durée et coût</th><th>Preuves</th></tr>
        </thead>
        <tbody>
          {rows.map(({ t, resultat, etat, test }) => (
            <tr key={t.test_id}>
              <td className={`rapport-statut bloc-${etat}`}>
                <p className="rapport-verdict">{LIBELLE_ETAT[etat]}</p>
                {resultat && etat !== "non_concluant" && <p className="mono rapport-mesure">{measure(resultat)}</p>}
                {t.raison && <p>{t.raison}</p>}
              </td>
              <td>
                <p className="rapport-regle"><Highlight etat={etat}>{test?.phrase ?? t.test_id}</Highlight></p>
                <p className="mono petit second">{l.vault}/{test?.source}</p>
                <p className="petit">Test : {test?.titre ?? t.test_id}</p>
                {resultat?.ecarts_visuels.map((e) => (
                  <p key={e.id} className="rapport-ecart">
                    <Highlight etat={ETAT_DU_STATUT[e.statut]}>Écart visuel {e.statut === "SUSPECTED" ? "suspect" : "neutralisé"} : {e.description}</Highlight>{" "}
                    {e.statut === "SUSPECTED" && <Link href="/relecture">Trancher</Link>}
                  </p>
                ))}
              </td>
              <td>
                <ul>{t.ecrans_releves.map((ecran) => <li key={ecran}>{screenTitle(ecran)}</li>)}</ul>
              </td>
              <td className="rapport-duree">
                <p className="mono">{t.duree_s ? duration(t.duree_s) : "durée à mesurer"}</p>
                <p className="mono">{t.etapes ? plural(t.etapes, "étape", "étapes") : "étapes à mesurer"}</p>
                <p className="mono">{cost(t.cout_usd)}</p>
              </td>
              <td>
                <ul>
                  {t.ecrans_releves.map((ecran) => (
                    <li key={ecran}><Link href={`/passages/${id}/comparaison/${ecran}`}>Comparer {screenTitle(ecran).toLowerCase()}</Link></li>
                  ))}
                  <li>{t.replay_url ? <a href={t.replay_url}>Voir le replay H</a> : "Pas de replay"}</li>
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
