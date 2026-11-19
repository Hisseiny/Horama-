// 11.5 Comparer, on the index of the passages only: the captures of one page in two passages by a PR (for instance a PR
// and its copy corrected after the green loop), side by side, the page and the two passages chosen in lists
// (#comparer/<page> chooses the page). The index keeps a capture only for a finding: a page can be compared only when at
// least two passages have a finding on it. Otherwise the screen says why there is nothing, and what it will take.
import { useState } from "react";
import "../../interface/screen-11-5/styles.css";
import type { Chargement, Passage } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Capture, Erreurs, Mascot, Sidebar, Statut, dateCourte, sansSource, type Route } from "./Commun";

const titreCourt = (p: Passage) => p.titre.split(" : ")[0];
const capturesDe = (p: Passage, page: string) => p.constats.filter((c) => c.page === page && c.capture);

function Feuille({ p, page, role }: { p: Passage; page: string; role: string }) {
  const constats = capturesDe(p, page);
  return (
    <section className="invoice-sheet tour-feuille">
      <header className="sheet-heading">
        <span>{titreCourt(p)} · {dateCourte(p.date)}</span>
        <span className="sheet-state">{role}</span>
      </header>
      {constats.map((c) => (
        <figure className="tour-feuille-constat" key={c.id}>
          <Capture constat={c} />
          <figcaption><Statut genre={c.genre} /> {c.texte}</figcaption>
        </figure>
      ))}
    </section>
  );
}

export default function Comparer({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const passages = (data?.passages ?? []).filter((p) => p.mode === "dev"); // the latest first
  const pages = [...new Set(passages.flatMap((p) => p.constats.filter((c) => c.capture).map((c) => c.page)))].sort();
  const avec = (page: string) => passages.filter((p) => capturesDe(p, page).length);
  const comparables = pages.filter((page) => avec(page).length >= 2);
  const [choix, setChoix] = useState<{ page?: string; a?: string; b?: string }>({});
  const page = [choix.page, route.cle].find((x) => x && comparables.includes(x)) ?? comparables[0] ?? null;
  const candidats = page ? avec(page) : [];
  // By default the older of the two latest as the reference, the latest as the one compared.
  const b = candidats.find((p) => p.cle === choix.b) ?? candidats[0] ?? null;
  const a = candidats.find((p) => p.cle === choix.a && p !== b) ?? candidats.find((p) => p !== b) ?? null;
  const muet = sansSource(data);
  return (
    <div className={`app-shell comparison-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <button className="back-to-passages tour-retour" type="button" onClick={() => (window.location.hash = "")}>← Tous les passages</button>
          <header className="comparison-heading">
            <div>
              <h1>{page ? `Page ${page}` : "Comparer"}</h1>
              <p>{a && b ? `${titreCourt(a)} (avant) comparé à ${titreCourt(b)} (après)` : "Les captures d'une même page dans deux passages par une PR"}</p>
            </div>
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement des passages…</p>}
          {muet && <p className="tour-vide">Rien à comparer tant que l'index des passages ne répond pas.</p>}
          {data && !muet && !page && (
            <section className="tour-filtre tour-rien">
              <p><strong>Rien à comparer : aucune page n'a de capture dans deux passages par une PR.</strong></p>
              {route.cle && <p>La page {route.cle} a des captures dans {avec(route.cle).length} passage{avec(route.cle).length > 1 ? "s" : ""}.</p>}
              <p>
                L'index des passages ne garde une capture que pour un constat (défaut prouvé ou doute).
                {pages.length
                  ? ` Aujourd'hui : ${pages.map((x) => `${x}, ${avec(x).map(titreCourt).join(", ")}`).join(" ; ")}.`
                  : passages.length ? " Aucun passage par une PR n'a encore de capture." : " Aucun passage par une PR dans l'index."}
              </p>
              <p>
                Il faudra un second passage par une PR avec un constat sur une de ces pages. Une page corrigée n'a plus de constat, donc plus de capture :
                pour montrer l'avant et l'après d'une correction, le réveil devra aussi publier la capture de chaque page visitée.
              </p>
            </section>
          )}
          {page && a && b && (
            <>
              <div className="tour-selects">
                <label>
                  <span>Page</span>
                  <select value={page} onChange={(e) => setChoix({ page: e.target.value })}>
                    {comparables.map((x) => <option key={x} value={x}>{x} ({avec(x).length} passages)</option>)}
                  </select>
                </label>
                <label>
                  <span>Avant</span>
                  <select value={a.cle} onChange={(e) => setChoix({ ...choix, page, a: e.target.value })}>
                    {candidats.filter((p) => p !== b).map((p) => <option key={p.cle} value={p.cle}>{titreCourt(p)} · {dateCourte(p.date)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Après</span>
                  <select value={b.cle} onChange={(e) => setChoix({ ...choix, page, b: e.target.value, a: e.target.value === a.cle ? undefined : a.cle })}>
                    {candidats.map((p) => <option key={p.cle} value={p.cle}>{titreCourt(p)} · {dateCourte(p.date)}</option>)}
                  </select>
                </label>
              </div>
              <div className="comparison-frames">
                <Feuille p={a} page={page} role="Avant" />
                <Feuille p={b} page={page} role="Après" />
              </div>
              <footer className="pixel-summary">
                Sur {page} : {capturesDe(a, page).length} constat{capturesDe(a, page).length > 1 ? "s" : ""} dans {titreCourt(a)}, {capturesDe(b, page).length} dans {titreCourt(b)}.
                Chaque capture est celle d'un constat, entourée par la scène.
              </footer>
            </>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}
