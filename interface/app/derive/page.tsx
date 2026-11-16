import "./derive.css";
import { LOGICIEL } from "../../lib/config";
import { lireDecisions, lireNote, listerEcrans } from "../../lib/donnees";
import { Correction } from "./Correction";

const CONTEXT = 3; // lines of the note shown around the sentence

// Step 7. A "voulu" that contradicts a note: Horama proposes the correction of the note, a human accepts it.
export default async function DriftPage() {
  const l = await listerEcrans(LOGICIEL);
  const decision = (l.passage_id ? await lireDecisions(l.passage_id) : []).find((d) => d.correction_de_note);
  if (!decision?.correction_de_note) {
    return (
      <>
        <h1>Dérive documentaire</h1>
        <p className="derive-contexte">Aucune note ne contredit un écran validé. Une correction est proposée ici quand un écart tranché « voulu » contredit une phrase de la documentation.</p>
      </>
    );
  }

  const { fichier, avant } = decision.correction_de_note;
  const lines = (await lireNote(decision.logiciel, fichier)).contenu.split("\n");
  const target = lines.findIndex((line) => line.includes(avant));
  const first = Math.max(0, target - CONTEXT);

  return (
    <Correction
      decision={decision}
      vault={l.vault}
      screen={l.ecrans.find((e) => e.id === decision.ecran)?.titre ?? decision.ecran}
      date={new Date(decision.le).toLocaleDateString("fr-FR")}
      lines={target < 0 ? [] : lines.slice(first, target + CONTEXT + 1).map((text, i) => ({ number: first + i + 1, text }))}
      target={target + 1}
    />
  );
}
