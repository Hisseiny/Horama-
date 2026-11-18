"use client";

import type { Decision } from "@horama/contrats";
import { useState } from "react";
import { applyCorrection, refuseCorrection } from "../actions";

export function Correction({ decision, vault, screen, date, lines, target }: {
  decision: Decision;
  vault: string;
  screen: string;
  date: string;
  lines: { number: number; text: string }[]; // the note around the sentence, as it is in the vault
  target: number; // line number of the sentence
}) {
  const correction = decision.correction_de_note!;
  const [statut, setStatut] = useState(correction.statut);
  const corrected = (text: string) => text.replace(correction.avant, correction.apres);

  return (
    <>
      <h1>La documentation ne correspond plus à l'écran validé</h1>
      <p className="derive-contexte">
        {decision.par} a tranché « {decision.decision} » le {date} sur l'écran {screen}, version {decision.version} : {decision.ecart}.
        {decision.pourquoi && ` ${decision.pourquoi}.`} La note dit encore l'inverse.
      </p>

      <article className={`bloc ${statut === "proposee" ? "bloc-a_trancher" : "bloc-acceptee"} derive`}>
        <p className="derive-etat">
          {statut === "proposee" ? "Correction proposée, à trancher" : statut === "acceptee" ? "Note corrigée" : "Note laissée telle quelle"}
        </p>
        <p className="mono derive-fichier">{vault}/{correction.fichier}</p>

        {lines.length === 0 ? (
          <p>La phrase à corriger n'est plus dans la note : « {correction.avant} »</p>
        ) : (
          <ol className="diff mono">
            {lines.flatMap(({ number, text }) =>
              number !== target || statut === "refusee" ? [<li key={number}><span>{number}</span><span /><span>{text}</span></li>]
              : statut === "acceptee" ? [<li key={number}><span>{number}</span><span /><span>{corrected(text)}</span></li>]
              : [
                  <li key="retiree" className="diff-retiree"><span>{number}</span><span>-</span><span>{text}</span></li>,
                  <li key="ajoutee" className="diff-ajoutee"><span>{number}</span><span>+</span><span>{corrected(text)}</span></li>,
                ],
            )}
          </ol>
        )}

        {statut === "proposee" ? (
          <div className="boutons">
            <button className="bouton" onClick={async () => setStatut((await applyCorrection(decision)).correction_de_note!.statut)}>Corriger la note</button>
            <button className="bouton bouton-second" onClick={async () => setStatut((await refuseCorrection(decision)).correction_de_note!.statut)}>Laisser la note telle quelle</button>
          </div>
        ) : (
          <p>
            {statut === "acceptee"
              ? "La ligne retirée a laissé la place à la ligne ajoutée. Données factices : le fichier du vault n'est pas modifié."
              : `La note garde sa phrase. L'écart reste validé pour la version ${decision.version}, et la documentation le contredit toujours.`}
          </p>
        )}
      </article>
    </>
  );
}
