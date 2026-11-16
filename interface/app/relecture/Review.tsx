"use client";

import type { Decision } from "@horama/contrats";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Highlight } from "../../components/Highlight";
import { Screenshot, type ScreenshotImage, type Zone } from "../../components/Screenshot";
import { decide } from "../actions";

export interface Case {
  key: string;
  test_id: string;
  ecart_id?: string;
  etat: "defaut" | "a_trancher";
  titre: string;
  phrase?: string; // the rule, as the documentation writes it
  note?: string;
  valeurs: { libelle: string; lieu?: string; valeur: string }[];
  signe?: string;
  calculs: string[];
  preuve: string;
  images: { image: ScreenshotImage; legende: string; zones: Zone[] }[];
}

export function Review({ passage, cases }: { passage: string; cases: Case[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, Decision["decision"]>>({});
  const count = (etat: Case["etat"]) => cases.filter((c) => c.etat === etat).length;

  async function settle(c: Case, decision: Decision["decision"]) {
    const written = await decide(passage, c.test_id, c.ecart_id, decision);
    setDecisions((d) => ({ ...d, [c.key]: decision }));
    // A "voulu" that contradicts a note opens the documentary drift.
    if (written.correction_de_note) router.push("/derive");
  }

  return (
    <>
      <header className="relecture-tete">
        <h1>À relire : {cases.length - Object.keys(decisions).length}</h1>
        <p>
          <Highlight etat="defaut">Défaut prouvé : {count("defaut")}</Highlight>
          <Highlight etat="a_trancher">Suspect : {count("a_trancher")}</Highlight>
        </p>
      </header>

      {cases.map((c) => (
        <article key={c.key} className={`bloc bloc-${c.etat} cas`}>
          <p className="cas-statut">{c.etat === "defaut" ? "Défaut prouvé" : "Suspect"}</p>
          <h2>{c.titre}</h2>

          {c.valeurs.length > 0 && (
            <div className="cas-valeurs">
              {c.valeurs.map((v, i) => (
                <div key={v.libelle} className="cas-valeur">
                  {i > 0 && c.signe && <span className="cas-signe mono">{c.signe}</span>}
                  <p>
                    <b className="mono">{v.valeur}</b>
                    <span>{v.libelle}{v.lieu && `, ${v.lieu.toLowerCase()}`}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          <dl className="cas-preuve">
            {c.phrase && (
              <div>
                <dt>Règle</dt>
                <dd className="cas-regle">{c.phrase}</dd>
                <dd className="mono petit">{c.note}</dd>
              </div>
            )}
            {c.calculs.length > 0 && (
              <div>
                <dt>Calcul</dt>
                {c.calculs.map((line) => <dd key={line} className="mono cas-calcul">{line}</dd>)}
              </div>
            )}
            <div>
              <dt>Niveau de preuve</dt>
              <dd>{c.preuve}</dd>
            </div>
          </dl>

          <div className="cas-captures">
            {c.images.map((i) => <Screenshot key={i.legende} {...i} />)}
          </div>

          {decisions[c.key] ? (
            <p className="cas-decision">
              Tranché : {decisions[c.key] === "bug" ? "c'est un bug" : "c'est voulu"}. Données factices : la décision n'est pas écrite dans le vault.
            </p>
          ) : (
            <div className="boutons">
              <button className="bouton" onClick={() => settle(c, "bug")}>C'est un bug</button>
              <button className="bouton" onClick={() => settle(c, "voulu")}>C'est voulu</button>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
