// 11.1 Couverture, on the vault of the clone and the index of the passages only: one row per note of a screen
// (produit/*.md with a field « ecran »), with its address, its language, the tests that read it (tests whose « releves »
// name it), its reference capture (references/<ecran>/ in the list of the files of the vault) and the files of code it
// follows (field « code »); then the last passage by a PR with a finding on its page. The notes without a screen (the
// rules between pages) apart. Every figure is counted here from these sources: no percentage, no version.
import "../../interface/screen-11-1/styles.css";
import { notesProduit, testsDuVault, ecransReleves, enAttente, type Chargement, type NoteLue } from "../donnees";
import { Icon } from "../../interface/screen-11-1/Icons";
import { usePrototype } from "../PrototypeContext";
import { Erreurs, Mascot, Sidebar, dateCourte, sansSource, type Route } from "./Commun";

const PREFIX = "vault-horama/eugenia-clone/";
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

// The files of code of a note: its field « code », a JSON list.
function fichiersCode(note: NoteLue): number | null {
  try {
    const liste = JSON.parse(note.champs.code ?? "");
    return Array.isArray(liste) ? liste.length : null;
  } catch {
    return null;
  }
}

// The rules of a note: the items of its section « Règles », and those that carry a line « regle: » the code computes.
function regles(note: NoteLue) {
  const bloc = /^## Règles[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(note.corps)?.[1] ?? "";
  return { toutes: (bloc.match(/^- /gm) ?? []).length, calculees: (bloc.match(/^\s+regle:/gm) ?? []).length };
}

export default function Couverture({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const notes = notesProduit(data?.vault ?? null);
  const ecrans = notes.filter((n) => n.champs.ecran);
  const autres = notes.filter((n) => !n.champs.ecran);
  const tests = testsDuVault(data?.vault ?? null);
  const fichiers = data?.manifeste?.fichiers ?? null;
  const aRelire = (data?.passages ?? []).flatMap((p) => p.constats).filter((c) => !c.decision);
  const muet = sansSource(data);
  const reference = (ecran: string) => (fichiers ? fichiers.some((f) => f.startsWith(`${PREFIX}references/${ecran}/`)) : null);
  // The last passage by a PR with a finding on this page (the index is sorted, the latest first).
  const dernier = (url: string) => {
    const p = (data?.passages ?? []).find((item) => item.mode === "dev" && item.constats.some((c) => c.page === url));
    return p ? { p, n: p.constats.filter((c) => c.page === url).length } : null;
  };
  const vaultMuet = !!data && data.vault === null;
  return (
    <div className={`app-shell coverage-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <header className="page-heading">
            <h1>Couverture</h1>
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement du vault…</p>}
          {vaultMuet && <p className="tour-vide">Le vault ne répond pas (ni le service Horama ni GitHub) : rien à mesurer tant qu'il est illisible. Rechargez la page.</p>}
          {data && !vaultMuet && (
            <>
              <div className="overview-grid">
                <section className="metric-card summary-card">
                  <p className="card-label">Écrans documentés</p>
                  <strong className="key-figure">{ecrans.length}</strong>
                  <ul className="tour-chiffres">
                    <li>{pluriel(ecrans.filter((n) => tests.some((t) => ecransReleves(t).includes(n.champs.ecran))).length, "écran relevé", "écrans relevés")} par au moins un test</li>
                    <li>{pluriel(tests.length, "test", "tests")} dans le vault : {tests.filter((t) => t.champs.statut === "accepte").length} accepté{tests.filter((t) => t.champs.statut === "accepte").length > 1 ? "s" : ""}, {tests.filter(enAttente).length} en attente, {tests.filter((t) => t.champs.statut === "refuse").length} refusé{tests.filter((t) => t.champs.statut === "refuse").length > 1 ? "s" : ""}</li>
                    <li>{fichiers ? `${pluriel(ecrans.filter((n) => reference(n.champs.ecran)).length, "écran a", "écrans ont")} une capture de référence` : "Captures de référence : liste des fichiers du vault illisible"}</li>
                  </ul>
                  <div className="coverage-line">
                    <span>{data.manifeste ? `Fichiers du vault : branche ${data.manifeste.branche}, commit ${data.manifeste.commit}, liste du ${dateCourte(data.manifeste.genere_le)}` : "Notes du vault seulement"}</span>
                    <button type="button" onClick={() => (window.location.hash = "tests")}>Voir les tests</button>
                  </div>
                </section>
                <section className="metric-card review-card">
                  <p className="card-label">À traiter</p>
                  {muet
                    ? <p className="tour-vide">Rien à dire tant que l'index des passages ne répond pas.</p>
                    : aRelire.length
                      ? (
                        <>
                          <h2>{pluriel(aRelire.length, "cas à relire", "cas à relire")}</h2>
                          <p className="review-breakdown">dont {pluriel(aRelire.filter((c) => c.genre === "defaut").length, "défaut prouvé", "défauts prouvés")}, {pluriel(aRelire.filter((c) => c.genre === "doute").length, "doute", "doutes")}</p>
                          <button className="primary-button review-open-button" type="button" onClick={() => (window.location.hash = "relire")}>
                            Ouvrir la relecture
                            <Icon name="arrow" />
                          </button>
                        </>
                      )
                      : (
                        <div className="nothing-to-review">
                          <span><Icon name="check" /></span>
                          <strong>Rien à relire</strong>
                          <p>{data.passages.length ? "Tous les constats des passages sont tranchés." : "Aucun passage pour l'instant."}</p>
                        </div>
                      )}
                </section>
              </div>
              <section className="screens-card tour-ecrans" aria-labelledby="screens-title">
                <header className="screens-heading">
                  <h2 id="screens-title">Écrans suivis</h2>
                  <span>{pluriel(ecrans.length, "écran", "écrans")}</span>
                </header>
                {!ecrans.length && <p className="tour-vide">Aucune note d'écran (champ « ecran ») dans produit/ du vault.</p>}
                <div>
                  {ecrans.map((n) => {
                    const ecran = n.champs.ecran;
                    const releve = tests.filter((t) => ecransReleves(t).includes(ecran));
                    const ref = reference(ecran);
                    const code = fichiersCode(n);
                    const d = n.champs.url ? dernier(n.champs.url) : null;
                    return (
                      <button className="screen-row" type="button" key={n.chemin} onClick={() => (window.location.hash = `comparer/${encodeURIComponent(n.champs.url ?? "")}`)}
                        aria-label={`${n.titre} : comparer les captures de cette page`}>
                        <span className="screen-copy">
                          <strong>{n.titre}</strong>
                          <span>{n.champs.url ?? "adresse non écrite"}{n.champs.langue ? ` · langue : ${n.champs.langue}` : ""}</span>
                        </span>
                        <span className="tour-ecran-chiffres">
                          <span>{pluriel(releve.length, "test", "tests")}{releve.some(enAttente) ? ` (${releve.filter(enAttente).length} en attente)` : ""}</span>
                          <span>{ref === null ? "référence : à mesurer" : ref ? "référence : oui" : "sans référence"}</span>
                          <span>{code === null ? "code : non écrit" : pluriel(code, "fichier de code", "fichiers de code")}</span>
                        </span>
                        <span className="tour-ecran-passage">
                          {d ? <>Dernier constat : {d.p.titre.split(" : ")[0]}, {dateCourte(d.p.date)} ({pluriel(d.n, "constat", "constats")})</> : muet ? "index muet" : "Aucun constat dans les passages par une PR"}
                        </span>
                        <Icon name="chevron" />
                      </button>
                    );
                  })}
                </div>
              </section>
              {autres.length > 0 && (
                <section className="screens-card tour-ecrans" aria-labelledby="rules-title">
                  <header className="screens-heading">
                    <h2 id="rules-title">Règles entre pages</h2>
                    <span>{pluriel(autres.length, "note", "notes")}</span>
                  </header>
                  {autres.map((n) => {
                    const r = regles(n);
                    const source = tests.filter((t) => t.champs.source === n.chemin);
                    return (
                      <div className="screen-row tour-regles" key={n.chemin}>
                        <span className="screen-copy">
                          <strong>{n.titre}</strong>
                          <span>{n.chemin}</span>
                        </span>
                        <span className="tour-ecran-chiffres">
                          <span>{pluriel(r.toutes, "règle", "règles")}</span>
                          <span>{r.calculees} calculée{r.calculees > 1 ? "s" : ""} par le code (ligne « regle: »)</span>
                          <span>{pluriel(source.length, "test", "tests")} tiré{source.length > 1 ? "s" : ""} de cette note</span>
                        </span>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}
