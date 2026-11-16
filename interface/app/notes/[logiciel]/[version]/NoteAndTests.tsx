"use client";

import type { TestPropose } from "@horama/contrats";
import { useState } from "react";
import { Highlight } from "../../../../components/Highlight";
import { VaultNote } from "../../../../components/VaultNote";
import type { Note } from "../../../../lib/donnees";
import { plural, ruleLine } from "../../../../lib/format";
import { readHTest } from "../../../../lib/markdown";
import type { EtatRegle } from "../../../../lib/states";
import { accept } from "../../../actions";

type Statut = TestPropose["statut"];
interface TestState { statut: Statut; reponses: Record<string, string>; markdown: string; editing: boolean }

const ETAT: Record<Statut, EtatRegle> = { propose: "a_trancher", accepte: "acceptee", refuse: "non_testee" };
const LIBELLE: Record<Statut, string> = {
  propose: "Test proposé, à valider",
  accepte: "Test accepté, pas encore joué",
  refuse: "Test refusé : la phrase reste sans test",
};
const SECTIONS = ["Setup", "Task", "Expected Result", "Verification"];

export function NoteAndTests({ version, note, tests, accepted }: {
  version: string;
  note: Note;
  tests: TestPropose[];
  accepted?: { id: string; reponses: Record<string, string> };
}) {
  const [states, setStates] = useState<Record<string, TestState>>(() =>
    Object.fromEntries(
      tests.map((t) => [t.id, {
        statut: accepted?.id === t.id ? "accepte" : t.statut,
        reponses: accepted?.id === t.id ? accepted.reponses : {},
        markdown: t.test_markdown,
        editing: false,
      }]),
    ),
  );
  const set = (id: string, patch: Partial<TestState>) => setStates((s) => ({ ...s, [id]: { ...s[id], ...patch } }));
  const openQuestions = (t: TestPropose) => t.questions.filter((q) => !states[t.id].reponses[q.texte]).length;

  const count = (statut: Statut) => tests.filter((t) => states[t.id].statut === statut).length;
  const questions = tests.filter((t) => states[t.id].statut === "propose").reduce((n, t) => n + openQuestions(t), 0);
  const summary = [
    count("accepte") && plural(count("accepte"), "test accepté", "tests acceptés"),
    count("propose") && plural(count("propose"), "test proposé", "tests proposés"),
    count("refuse") && plural(count("refuse"), "test refusé", "tests refusés"),
    questions ? plural(questions, "question", "questions") : "aucune question",
  ].filter(Boolean).join(", ");

  async function acceptTest(t: TestPropose) {
    const state = states[t.id];
    await accept({ ...t, test_markdown: state.markdown }, state.reponses);
    set(t.id, { statut: "accepte", editing: false });
    window.history.replaceState(null, "", "?etat=accepte");
  }

  return (
    <>
      <header className="note-tete">
        <div>
          <h1>Note de version {version}</h1>
          <p className="mono second">{tests[0].logiciel}/{note.chemin}</p>
        </div>
        <p className="note-bilan">{summary}</p>
      </header>

      <div className="note-colonnes">
        <aside className="note-source">
          <VaultNote
            contenu={note.contenu}
            passages={tests.flatMap((t) => t.passages_de_la_source.map((texte) => ({ texte, etat: ETAT[states[t.id].statut] })))}
          />
          <p className="petit second">La note telle qu'elle est écrite dans le vault. Chaque phrase surlignée a donné un test, à droite.</p>
        </aside>

        <div>
          {tests.map((t) => {
            const state = states[t.id];
            const etat = ETAT[state.statut];
            const { title, sections } = readHTest(state.markdown);
            return (
              <article className="test" key={t.id}>
                <p><Highlight etat={etat}>{LIBELLE[state.statut]}</Highlight></p>
                <h2>{title}</h2>
                <p className="test-source">
                  Écrit depuis la phrase : {t.passages_de_la_source.map((p) => <Highlight key={p} etat={etat}>{p}</Highlight>)}
                </p>
                <p className="petit second">Modèle qui a écrit ce test : <code>{t.modele}</code></p>

                {state.editing ? (
                  <textarea
                    className="test-edition mono"
                    aria-label="Texte du test"
                    rows={24}
                    value={state.markdown}
                    onChange={(e) => set(t.id, { markdown: e.target.value })}
                  />
                ) : (
                  <dl className="test-h">
                    {SECTIONS.map((name) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd className="mono">
                          {name === "Verification"
                            ? (sections[name] ?? "").split("\n").map((line) => (
                                <p key={line}><Highlight etat={etat}>{line.replace(/^- /, "")}</Highlight></p>
                              ))
                            : sections[name]}
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt>Relevés</dt>
                      <dd className="mono">{t.releves.map((r) => `${r.ecran}, vue ${r.vue}`).join("\n")}</dd>
                    </div>
                    <div>
                      <dt>Règle calculable</dt>
                      <dd className="mono">
                        {t.regles_calculables.length
                          ? t.regles_calculables.map(ruleLine).join("\n")
                          : "Aucune : un écart visuel ne se prouve pas par le calcul, un humain le tranche."}
                      </dd>
                    </div>
                  </dl>
                )}

                {state.statut !== "refuse" && t.questions.map((q) => {
                  const reponse = state.reponses[q.texte];
                  return (
                    <div key={q.texte} className={`bloc ${reponse ? "bloc-acceptee" : "bloc-a_trancher"} question`}>
                      <p className="petit">{reponse ? "Question tranchée" : "Question à trancher avant d'accepter ce test"}</p>
                      <p className="question-texte">{q.texte}</p>
                      {state.statut === "propose" ? (
                        <div className="boutons">
                          {q.choix.map((choix) => (
                            <button
                              key={choix}
                              className={`bouton ${reponse === choix ? "" : "bouton-second"}`}
                              aria-pressed={reponse === choix}
                              onClick={() => set(t.id, { reponses: { ...state.reponses, [q.texte]: choix } })}
                            >
                              {choix}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="question-reponse">{reponse}</p>
                      )}
                    </div>
                  );
                })}

                {state.statut === "propose" && (
                  <div className="boutons test-actions">
                    <button className="bouton" disabled={openQuestions(t) > 0} onClick={() => acceptTest(t)}>Accepter</button>
                    <button className="bouton bouton-second" onClick={() => set(t.id, { editing: !state.editing })}>
                      {state.editing ? "Terminer la modification" : "Modifier"}
                    </button>
                    <button className="bouton bouton-second" onClick={() => set(t.id, { statut: "refuse", editing: false })}>Refuser</button>
                    {openQuestions(t) > 0 && <p className="petit">Répondre à la question pour pouvoir accepter.</p>}
                  </div>
                )}
                {state.statut === "accepte" && (
                  <div className="bloc bloc-acceptee test-fichier">
                    <p>Fichier de ce test dans le vault</p>
                    <p className="mono test-chemin">{t.logiciel}/tests/{t.id}.md</p>
                    <p className="petit">Il sera joué au prochain passage. Données factices : rien n'est écrit dans le vault.</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}
