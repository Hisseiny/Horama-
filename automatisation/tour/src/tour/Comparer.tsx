// 11.5 Comparer, on the index of the passages only: one page in two passages by a PR (for instance a PR and its copy
// corrected after the green loop), in the three modes of the mock-up of Axil: side by side, a curtain to drag, and the raw
// pixels that differ. The capture of a page is the raw one the wake-up publishes for every page visited (field « pages »
// of the index, since 19/11 evening); an older entry has only the captures of its findings, ringed by the scene, used
// instead. The findings of each passage on that page are drawn on its capture with the sign of the charter.
// #comparer/<page> chooses the page. When no page has a capture in two passages, the screen says why.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import "../../interface/screen-11-5/styles.css";
import type { Chargement, Constat, Passage } from "../donnees";
import { usePrototype } from "../PrototypeContext";
import { Erreurs, Mascot, Sidebar, dateCourte, sansSource, type Route } from "./Commun";

// The noise threshold of the engine (jugement/verification/images.ts, docs/decisions/2026-11-16-seuil-de-bruit.md): a pixel
// differs when one channel (red, green, blue) is further apart than this, out of 255.
const TOLERANCE = 24;

type Mode = "side" | "curtain" | "pixels";
// The capture of a page in a passage, its size in its own pixels when the index writes it.
type Cliche = { src: string; largeur: number | null; hauteur: number | null; entouree: boolean };

const titreCourt = (p: Passage) => p.titre.split(" : ")[0];
const nombre = (n: number) => n.toLocaleString("fr-FR");
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
const aUneCapture = (n: number) => (n ? `a une capture dans ${pluriel(n, "passage", "passages")}` : "n'a de capture dans aucun passage");

// The raw capture of the page in « pages »; for an older entry (no « pages »), the capture of a finding on that page.
function clicheDe(p: Passage, page: string): Cliche | null {
  const vue = p.vues.find((v) => v.page === page && v.capture);
  if (vue) return { src: vue.capture!, largeur: vue.largeur, hauteur: vue.hauteur, entouree: false };
  if (p.vues.length) return null;
  const c = p.constats.find((x) => x.page === page && x.capture);
  return c ? { src: c.capture!, largeur: null, hauteur: null, entouree: true } : null;
}

const constatsDe = (p: Passage, page: string) => p.constats.filter((c) => c.page === page);
// The capture of the page, as it is. The findings are not drawn on it: their zone is measured on their own capture,
// taken where the defect is (scrolled to it), not on the capture of the top of the page; drawn here, a sign would fall
// on the wrong text. Each finding is shown under it on its own capture, ringed by the scene.
function Planche({ cliche, alt }: { cliche: Cliche; alt: string }) {
  const [illisible, setIllisible] = useState(false);
  useEffect(() => setIllisible(false), [cliche.src]);
  return (
    <>
      {illisible && <p className="tour-sans-capture">Capture illisible : son serveur ne répond pas ou refuse la lecture depuis cette page.</p>}
      <div className="tour-capture tour-planche"><img src={cliche.src} alt={alt} style={{ display: "block", width: "100%", height: "auto" }} onError={() => setIllisible(true)} /></div>
    </>
  );
}

function Feuille({ p, page, cliche, role }: { p: Passage; page: string; cliche: Cliche; role: string }) {
  const constats = constatsDe(p, page);
  return (
    <section className="invoice-sheet tour-feuille">
      <header className="sheet-heading">
        <span>{titreCourt(p)} · {dateCourte(p.date)}</span>
        <span className="sheet-state">{role}</span>
      </header>
      <div className="tour-planche-corps">
        <Planche cliche={cliche} alt={`Page ${page}, ${titreCourt(p)} (${role.toLowerCase()})`} />
        {cliche.entouree && <p className="tour-note">Capture d'un constat, déjà entourée par la scène : cette entrée de l'index n'a pas la capture brute de ses pages.</p>}
        {!constats.length && <p className="tour-note">Aucun constat de {titreCourt(p)} sur cette page.</p>}
        {constats.length > 0 && !cliche.entouree && (
          <div className="tour-constats-feuille">
            <p className="tour-note">{pluriel(constats.length, "constat", "constats")} de {titreCourt(p)} sur cette page, chacun sur sa capture prise à l'endroit du défaut :</p>
            {constats.map((c) => (
              <figure key={c.id} className="tour-constat-vignette">
                {c.capture ? <img src={c.capture} alt={`${page} : ${c.texte}`} loading="lazy" /> : <span className="tour-note">Pas de capture pour ce constat.</span>}
                <figcaption>{c.genre === "defaut" ? "[ ! ]" : "[ ? ]"} {c.texte}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// The curtain of the mock-up: the « after » below, the « before » above, cut at the handle. The handle follows the mouse,
// the finger and the arrows of the keyboard.
function Rideau({ a, b, page, avant, apres }: { a: Passage; b: Passage; page: string; avant: Cliche; apres: Cliche }) {
  const [position, setPosition] = useState(50);
  const glisser = (el: HTMLElement, x: number) => {
    const r = el.getBoundingClientRect();
    setPosition(Math.round(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100))));
  };
  const clavier = (e: KeyboardEvent) => {
    const pas = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    setPosition((x) => Math.min(100, Math.max(0, x + pas)));
  };
  return (
    <section className="invoice-sheet tour-feuille">
      <header className="sheet-heading">
        <span>Avant : {titreCourt(a)} · {dateCourte(a.date)}</span>
        <span>Après : {titreCourt(b)} · {dateCourte(b.date)}</span>
      </header>
      <div className="tour-planche-corps">
        <div className="curtain-comparison tour-rideau" style={{ "--curtain-position": `${position}%` } as CSSProperties}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); glisser(e.currentTarget, e.clientX); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) glisser(e.currentTarget, e.clientX); }}>
          <Planche cliche={apres} alt={`Page ${page}, ${titreCourt(b)} (après)`} />
          <div className="curtain-reference">
            <Planche cliche={avant} alt={`Page ${page}, ${titreCourt(a)} (avant)`} />
          </div>
          <span className="curtain-line" aria-hidden="true" />
          <span className="tour-rideau-etiquette is-avant" aria-hidden="true">Avant</span>
          <span className="tour-rideau-etiquette is-apres" aria-hidden="true">Après</span>
          <span className="tour-rideau-poignee" role="slider" tabIndex={0} aria-label="Position du rideau : l'avant à gauche, l'après à droite"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={position} aria-valuetext={`${position} % de la largeur montre l'avant`} onKeyDown={clavier}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5M15 7l5 5-5 5" /></svg>
          </span>
        </div>
        <p className="tour-note">Glissez la poignée, ou utilisez les flèches gauche et droite une fois la poignée choisie.</p>
      </div>
    </section>
  );
}

type Mesure = { etat: "calcul" } | { etat: "fait"; differents: number; total: number } | { etat: "erreur"; message: string };

// The raw pixels: every pixel further apart than the noise threshold in miltos, the others pale (the « after », in grey).
function Pixels({ a, b, avant, apres }: { a: Passage; b: Passage; avant: Cliche; apres: Cliche }) {
  const sortie = useRef<HTMLCanvasElement>(null);
  const [mesure, setMesure] = useState<Mesure>({ etat: "calcul" });
  useEffect(() => {
    let abandon = false;
    setMesure({ etat: "calcul" });
    const charger = (src: string) => new Promise<HTMLImageElement>((ok, ko) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // without it, the canvas of an image from raw.githubusercontent.com cannot be read
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = src;
    });
    Promise.all([charger(avant.src), charger(apres.src)]).then(([ia, ib]) => {
      const el = sortie.current;
      if (abandon || !el) return;
      const w = ia.naturalWidth, h = ia.naturalHeight;
      if (w !== ib.naturalWidth || h !== ib.naturalHeight)
        return setMesure({ etat: "erreur", message: `Les deux captures n'ont pas la même taille (${w} × ${h} et ${ib.naturalWidth} × ${ib.naturalHeight} pixels) : comme le moteur, la tour ne les compare pas pixel par pixel.` });
      let pa: Uint8ClampedArray, pb: Uint8ClampedArray;
      try {
        const lecture = document.createElement("canvas");
        lecture.width = w;
        lecture.height = h;
        const ctx = lecture.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(ia, 0, 0);
        pa = ctx.getImageData(0, 0, w, h).data;
        ctx.drawImage(ib, 0, 0);
        pb = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return setMesure({ etat: "erreur", message: "Le navigateur refuse de lire les pixels de ces captures : leur serveur n'autorise pas la lecture depuis cette page. Côte à côte et Rideau restent possibles." });
      }
      el.width = w;
      el.height = h;
      const ctx = el.getContext("2d")!;
      const image = ctx.createImageData(w, h);
      const px = image.data;
      let differents = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (Math.abs(pa[i] - pb[i]) > TOLERANCE || Math.abs(pa[i + 1] - pb[i + 1]) > TOLERANCE || Math.abs(pa[i + 2] - pb[i + 2]) > TOLERANCE) {
          differents++;
          px[i] = 184; px[i + 1] = 50; px[i + 2] = 31; // miltos, #B8321F
        } else {
          const gris = 235 + (0.299 * pb[i] + 0.587 * pb[i + 1] + 0.114 * pb[i + 2]) * (20 / 255);
          px[i] = gris; px[i + 1] = gris; px[i + 2] = gris;
        }
        px[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      setMesure({ etat: "fait", differents, total: w * h });
    }, () => {
      if (!abandon) setMesure({ etat: "erreur", message: "Une des deux captures ne se charge pas pour le calcul : son serveur ne répond pas ou n'autorise pas la lecture depuis cette page." });
    });
    return () => { abandon = true; };
  }, [avant.src, apres.src]);
  const part = mesure.etat === "fait" ? (mesure.differents / mesure.total) * 100 : 0;
  return (
    <section className="invoice-sheet tour-feuille tour-pixels-feuille">
      <header className="sheet-heading">
        <span>{titreCourt(a)} · {dateCourte(a.date)} → {titreCourt(b)} · {dateCourte(b.date)}</span>
        <span className="sheet-state">Pixels bruts</span>
      </header>
      <div className="tour-planche-corps">
        {mesure.etat === "erreur" ? <p className="tour-erreur-cas">{mesure.message}</p> : <canvas className="tour-pixels" ref={sortie} aria-label="Pixels qui diffèrent entre les deux captures, en rouge" />}
        <p className="pixel-summary tour-pixels-somme" role="status">
          {mesure.etat === "calcul" && "Calcul des pixels qui diffèrent…"}
          {mesure.etat === "fait" && <>
            {nombre(mesure.differents)} pixel{mesure.differents > 1 ? "s" : ""} sur {nombre(mesure.total)} diffère{mesure.differents > 1 ? "nt" : ""}
            {" "}({mesure.differents && part < 0.01 ? "moins de 0,01" : part.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %), au-delà de {TOLERANCE} sur 255 sur une couleur, le seuil de bruit du moteur.
            {(avant.entouree || apres.entouree) && " Une des captures est celle d'un constat, entourée par la scène : le trait compte parmi ces pixels."}
          </>}
          {mesure.etat === "erreur" && "Pas de comptage de pixels pour ces deux captures."}
        </p>
      </div>
    </section>
  );
}

const MODES: [Mode, string][] = [["side", "Côte à côte"], ["curtain", "Rideau"], ["pixels", "Pixels bruts"]];

export default function Comparer({ route, data }: { route: Route; data: Chargement | null }) {
  const { lightMode } = usePrototype();
  const [mode, setMode] = useState<Mode>("side");
  const [choix, setChoix] = useState<{ a?: string; b?: string }>({});
  const passages = (data?.passages ?? []).filter((p) => p.mode === "dev"); // the latest first
  const pages = [...new Set(passages.flatMap((p) => [...p.vues.filter((v) => v.capture).map((v) => v.page), ...(p.vues.length ? [] : p.constats.filter((c) => c.capture).map((c) => c.page))]))].sort();
  const avec = (page: string) => passages.filter((p) => clicheDe(p, page));
  const comparables = pages.filter((page) => avec(page).length >= 2);
  const page = route.cle && comparables.includes(route.cle) ? route.cle : comparables[0] ?? null;
  const candidats = page ? avec(page) : [];
  // By default the two latest that have the page: the older as « before », the latest as « after ».
  const b = candidats.find((p) => p.cle === choix.b) ?? candidats[0] ?? null;
  const a = candidats.find((p) => p.cle === choix.a && p !== b) ?? candidats.find((p) => p !== b && p.date <= (b?.date ?? "")) ?? candidats.find((p) => p !== b) ?? null;
  const avant = a && page ? clicheDe(a, page) : null;
  const apres = b && page ? clicheDe(b, page) : null;
  const avecPages = passages.filter((p) => p.vues.length).length;
  const muet = sansSource(data);
  const memes = (c: Constat, autre: Passage) => autre.constats.some((x) => x.page === c.page && x.texte === c.texte);
  return (
    <div className={`app-shell comparison-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar route={route} data={data} />
      <main className="main-content" id="main">
        <div className="content-column">
          <button className="back-to-passages tour-retour" type="button" onClick={() => (window.location.hash = "")}>← Tous les passages</button>
          <header className="comparison-heading">
            <div>
              <h1>{page ? `Page ${page}` : "Comparer"}</h1>
              <p>{a && b ? `${titreCourt(a)} (avant) comparé à ${titreCourt(b)} (après)` : "Une même page dans deux passages par une PR"}</p>
            </div>
            {page && a && b && (
              <div className="mode-control" role="group" aria-label="Mode de comparaison">
                {MODES.map(([valeur, nom]) => (
                  <button className={mode === valeur ? "is-active" : ""} type="button" aria-pressed={mode === valeur} onClick={() => setMode(valeur)} key={valeur}>{nom}</button>
                ))}
              </div>
            )}
          </header>
          <Erreurs data={data} />
          {!data && <p className="tour-vide">Chargement des passages…</p>}
          {muet && <p className="tour-vide">Rien à comparer tant que l'index des passages ne répond pas.</p>}
          {data && !muet && !page && (
            <section className="tour-filtre tour-rien">
              <p><strong>Rien à comparer : aucune page n'a de capture dans deux passages par une PR.</strong></p>
              {route.cle && <p>La page {route.cle} {aUneCapture(avec(route.cle).length)}.</p>}
              <p>
                Le réveil publie maintenant la capture de chaque page visitée (champ « pages » de l'index, depuis le 19/11 au soir) :
                {!passages.length ? " aucun passage par une PR dans l'index."
                  : !avecPages ? ` aucune entrée de l'index ne l'a encore (${pluriel(passages.length, "passage", "passages")} par une PR), ${passages.length > 1 ? "elles n'ont" : "elle n'a"} que les captures de ${passages.length > 1 ? "leurs" : "ses"} constats.`
                  : ` ${avecPages} entrée${avecPages > 1 ? "s" : ""} sur ${passages.length} l'${avecPages > 1 ? "ont" : "a"} ; les plus anciennes n'ont que les captures de leurs constats.`}
                {pages.length ? ` Aujourd'hui : ${pages.map((x) => `${x}, ${avec(x).map(titreCourt).join(", ")}`).join(" ; ")}.` : passages.length ? " Aucun passage par une PR n'a encore de capture." : ""}
              </p>
              <p>Il faut deux passages par une PR qui ont une capture de la même page, par exemple une PR rejouée après une correction.</p>
            </section>
          )}
          {page && route.cle && route.cle !== page && (
            <p className="tour-note">La page {route.cle} {aUneCapture(avec(route.cle).length)} : il en faut deux. Voici {page}.</p>
          )}
          {page && a && b && avant && apres && (
            <>
              <div className="tour-selects">
                <label>
                  <span>Page</span>
                  <select value={page} onChange={(e) => { setChoix({}); window.location.hash = `comparer/${encodeURIComponent(e.target.value)}`; }}>
                    {comparables.map((x) => <option key={x} value={x}>{x} ({avec(x).length} passages)</option>)}
                  </select>
                </label>
                <label>
                  <span>Avant</span>
                  <select value={a.cle} onChange={(e) => setChoix({ ...choix, a: e.target.value })}>
                    {candidats.filter((p) => p !== b).map((p) => <option key={p.cle} value={p.cle}>{titreCourt(p)} · {dateCourte(p.date)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Après</span>
                  <select value={b.cle} onChange={(e) => setChoix({ a: e.target.value === a.cle ? undefined : a.cle, b: e.target.value })}>
                    {candidats.map((p) => <option key={p.cle} value={p.cle}>{titreCourt(p)} · {dateCourte(p.date)}</option>)}
                  </select>
                </label>
              </div>
              {mode === "side" && (
                <div className="comparison-frames">
                  <Feuille p={a} page={page} cliche={avant} role="Avant" />
                  <Feuille p={b} page={page} cliche={apres} role="Après" />
                </div>
              )}
              {mode === "curtain" && <Rideau a={a} b={b} page={page} avant={avant} apres={apres} />}
              {mode === "pixels" && <Pixels a={a} b={b} avant={avant} apres={apres} />}
              {constatsDe(a, page).length + constatsDe(b, page).length > 0 && (
                <section className="difference-summary" aria-label={`Constats sur ${page}`}>
                  {constatsDe(a, page).map((c) => (
                    <button type="button" key={`a-${c.id}`} onClick={() => (window.location.hash = `relire/${encodeURIComponent(a.cle)}`)}>
                      <span className="difference-copy">{titreCourt(a)} (avant) : {c.texte}</span>
                      <span className="tour-statuts">
                        <span className={`difference-status ${c.genre === "defaut" ? "is-defect" : "is-suspect"}`}>{c.genre === "defaut" ? "[ ! ] Défaut prouvé" : "[ ? ] Doute"}</span>
                        {/* « Corrigé » only with its proof: no finding of the same text on the same page in a later passage. */}
                        <span className={`difference-status ${memes(c, b) ? "is-toujours" : "is-corrige"}`}>
                          {memes(c, b) ? `Toujours là dans ${titreCourt(b)}` : b.date > a.date ? "Corrigé : absent du nouveau passage" : `Absent de ${titreCourt(b)}`}
                        </span>
                      </span>
                    </button>
                  ))}
                  {constatsDe(b, page).filter((c) => !memes(c, a)).map((c) => (
                    <button type="button" key={`b-${c.id}`} onClick={() => (window.location.hash = `relire/${encodeURIComponent(b.cle)}`)}>
                      <span className="difference-copy">{titreCourt(b)} (après) : {c.texte}</span>
                      <span className="tour-statuts">
                        <span className={`difference-status ${c.genre === "defaut" ? "is-defect" : "is-suspect"}`}>{c.genre === "defaut" ? "[ ! ] Défaut prouvé" : "[ ? ] Doute"}</span>
                        <span className="difference-status is-toujours">Absent de {titreCourt(a)}</span>
                      </span>
                    </button>
                  ))}
                </section>
              )}
              <footer className="pixel-summary">
                Sur {page} : {pluriel(constatsDe(a, page).length, "constat", "constats")} dans {titreCourt(a)}, {constatsDe(b, page).length} dans {titreCourt(b)}.
                {avant.entouree || apres.entouree ? " Une entrée ancienne n'a que la capture d'un constat, entourée par la scène." : " Captures brutes du haut de la page, publiées par le réveil ; chaque constat est montré sur sa propre capture, entourée par la scène."}
              </footer>
            </>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}
