import type { Decision } from "@horama/contrats";
import type { Note } from "@horama/memoire";
import type { Message } from "../generation/router.ts";

const INSTRUCTIONS = `Tu tiens à jour la documentation d'un logiciel. Un humain vient de valider un changement de l'écran comme voulu : l'écran est juste, c'est peut-être la documentation qui ne l'est plus. Un programme vérifie ta réponse puis l'applique : tu remplis des cases, rien d'autre.

Réponds par un seul objet JSON, sans aucun texte autour :
{ "phrase_contredite": ..., "nouvelle_phrase": ..., "raison": ... }

- "phrase_contredite" : la phrase de la note de l'écran que le changement rend fausse, recopiée caractère pour caractère (mêmes guillemets « », mêmes accents, mêmes espaces), sans le tiret d'une puce, sans rien ajouter ni corriger. Une seule phrase. null si aucune phrase de la note ne parle de ce qui a changé.
- "nouvelle_phrase" : la phrase qui la remplace, dans le style de la note, qui dit l'état de l'écran depuis le changement. Écris les libellés de l'interface entre « », tels que la note ou le changement les donnent. N'écris pas la version : le programme l'ajoute. null si "phrase_contredite" est null, ou si rien de ce qu'on te donne ne dit le nouvel état (n'invente jamais une position, une valeur ou un libellé).
- "raison" : une phrase courte qui dit ton choix.

Ne choisis jamais une phrase de la partie « Règles » de la note, ni une ligne « regle: » : une règle ne se corrige pas ici.`;

// `releaseNote`: the release note of the tested version, when the vault has one. `hints`: what the caller knows besides the decision.
export function buildMessages(decision: Decision, note: Note, releaseNote: Note | undefined, hints: string[]): Message[] {
  return [
    { role: "system", content: INSTRUCTIONS },
    {
      role: "user",
      content: [
        `Logiciel : ${decision.logiciel}. Version testée : ${decision.version}. Écran : ${decision.ecran}, vue ${decision.vue}.`,
        `Changement validé comme voulu : ${decision.ecart}`,
        ...(decision.pourquoi ? [`Pourquoi c'est voulu, d'après l'humain : ${decision.pourquoi}`] : []),
        ...hints.map((hint) => `Indice : ${hint}`),
        "",
        releaseNote ? `Note de version « ${releaseNote.chemin} » :\n<<<\n${releaseNote.texte.trimEnd()}\n>>>` : "Note de version : aucune.",
        "",
        `Note de l'écran « ${note.chemin} » :`,
        "<<<",
        note.texte.trimEnd(),
        ">>>",
      ].join("\n"),
    },
  ];
}

export function retryMessage(reasons: string[]): string {
  return `Le programme a refusé ta réponse :\n${reasons.map((reason) => `- ${reason}`).join("\n")}\nRends de nouveau l'objet JSON complet, corrigé.`;
}
