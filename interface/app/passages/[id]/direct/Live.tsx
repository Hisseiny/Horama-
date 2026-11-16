"use client";

import type { EvenementFil, Passage } from "@horama/contrats";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Highlight } from "../../../../components/Highlight";
import { Screenshot, type ScreenshotImage } from "../../../../components/Screenshot";
import { clock, duration, plural } from "../../../../lib/format";
import type { EtatRegle } from "../../../../lib/states";
import { follow, launch } from "../../../actions";

const SESSION: Record<EvenementFil["etat_session"], string> = {
  en_attente: "en attente",
  en_cours: "en cours",
  attente_outil: "attend la réponse de l'outil relever",
  terminee: "terminée",
  echec: "échec",
  abandonnee: "abandonnée",
};
const ENDED = ["terminee", "echec", "abandonnee"];

export function Live(props: {
  passage: Passage;
  evenements: EvenementFil[];
  images: ScreenshotImage[];
  tests: { id: string; titre: string; etat: EtatRegle }[];
  replays: Record<string, string>;
  nom: string;
  now: number;
  instant?: number; // freezes the screen at this second of the thread
}) {
  const { tests, replays, instant } = props;
  const [passage, setPassage] = useState(props.passage);
  const [all, setAll] = useState(props.evenements);
  const [images, setImages] = useState(props.images);
  const [now, setNow] = useState(props.now);
  const start = Date.parse(passage.debut);
  const running = passage.etat === "en_cours" && instant === undefined;

  // While the passage runs: one tick per second for the clock, and the new events as they arrive. Nothing else moves.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(async () => {
      setNow(Date.now());
      const next = await follow(passage.id, all.length);
      if (next.passage) setPassage(next.passage);
      if (next.evenements.length) {
        setAll((events) => [...events, ...next.evenements.slice(events.length - all.length)]);
        setImages((known) => [...known, ...next.images]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, passage.id, all.length]);

  const elapsed = instant ?? (running ? Math.max(0, (now - start) / 1000) : passage.duree_s ?? 0);
  const offset = (e: EvenementFil) => (Date.parse(e.horodatage) - start) / 1000;
  const events = instant === undefined ? all : all.filter((e) => offset(e) <= instant);
  const live = running || instant !== undefined;

  const sessions = [...new Set(events.map((e) => e.session_id))].map((id) => events.findLast((e) => e.session_id === id)!);
  const done = sessions.filter((s) => ENDED.includes(s.etat_session)).length;
  const last = events.findLast((e) => e.capture_url);
  const image = images.find((i) => i.url === last?.capture_url);
  const titre = (id: string) => tests.find((t) => t.id === id)?.titre ?? id;

  return (
    <>
      <header className="direct-tete">
        <div>
          <h1>{live ? "Passage en direct" : "Passage joué"}</h1>
          <p>
            {props.nom}, version {passage.version_testee} contre la référence {passage.version_reference}. <code>{passage.id}</code>
          </p>
        </div>
        <p className="direct-compteurs">
          <b className="mono">{clock(elapsed)}</b> {live ? "écoulées" : "au total"}
          <b className="mono">{live ? done : tests.length}/{tests.length}</b> {tests.length > 1 ? "tests terminés" : "test terminé"}
        </p>
      </header>

      <div className="direct-colonnes">
        <section>
          <h2>Fil de l'agent</h2>
          <ol className="fil">
            {events.map((e, i) => (
              <li key={`${e.session_id}-${e.etape}`} aria-current={live && i === events.length - 1 ? "step" : undefined}>
                <span className="mono">{clock(offset(e))}</span>
                <div>
                  <p className="fil-action">{e.action}</p>
                  <p className="petit second">{titre(e.test_id)}, étape {e.etape}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="fil-suite">
            {instant !== undefined ? `Écran figé à ${clock(instant)} du fil.`
              : running ? "L'agent H met 8 à 10 s par étape : chaque ligne arrive quand l'étape arrive."
              : <>Passage joué en {duration(passage.duree_s)}. <Link href={`/passages/${passage.id}`}>Voir le rapport</Link></>}
          </p>
          {!live && (
            <form action={launch}>
              <button className="bouton">Rejouer le passage</button>
            </form>
          )}
        </section>

        <section>
          <h2>{live ? "Capture en cours" : "Dernière capture"}</h2>
          {image && last ? (
            <Screenshot image={image} legende={`${titre(last.test_id)}, étape ${last.etape}, à ${clock(offset(last))}.`} />
          ) : (
            <p className="second">Aucune capture reçue pour l'instant.</p>
          )}

          <table className="sessions">
            <caption>{plural(sessions.length, "session ouverte", "sessions ouvertes")}, 3 au plus à la fois</caption>
            <thead>
              <tr><th>Session</th><th>Test</th><th>Étape</th><th>État</th><th>Replay</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.session_id}>
                  <td className="mono">{s.session_id}</td>
                  <td><Highlight etat={live ? "acceptee" : tests.find((t) => t.id === s.test_id)?.etat ?? "acceptee"}>{titre(s.test_id)}</Highlight></td>
                  <td className="mono">{s.etape}</td>
                  <td>{!live && !ENDED.includes(s.etat_session) ? "fin non enregistrée" : SESSION[s.etat_session]}</td>
                  <td>{replays[s.test_id] ? <a href={replays[s.test_id]}>Voir le replay H</a> : "pas de lien"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
