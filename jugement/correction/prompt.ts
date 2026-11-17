import type { Decision } from "@horama/contrats";
import type { Note } from "@horama/memoire";
import type { Message } from "../generation/router.ts";

const INSTRUCTIONS = `Tu tiens à jour la documentation d'un logiciel. Un humain vient de valider un changement de l'écran comme voulu : l'écran est juste, c'est peut-être la documentation qui ne l'est plus. Un programme vérifie ta réponse puis l'applique : tu remplis des cases, rien d'autre.

Réponds par un seul objet JSON, sans aucun texte autour :
{ "phrase_contredite": ..., "nouvelle_phrase": ..., "raison": ... }

- "phrase_contredite" : la phrase de la note de l'écran que le changement rend fausse (un indice peut dire ce qu'il y avait avant à cet endroit : cherche aussi la phrase qui cite cet ancien texte), recopiée caractère pour caractère (mêmes guillemets « », mêmes accents, mêmes espaces), sans le tiret d'une puce, sans rien ajouter ni corriger. Une seule phrase. null si aucune phrase de la note ne parle de ce qui a changé.
- "nouvelle_phrase" : la phrase qui la remplace, dans le style de la note, qui dit l'état de l'écran depuis le changement. Écris les libellés de l'interface entre « », tels que la note ou le changement les donnent. N'écris pas la version : le programme l'ajoute. null si "phrase_contredite" est null, ou si rien de ce qu'on te donne ne dit le nouvel état (n'invente jamais une position, une valeur ou un libellé).
- "raison" : une phrase courte qui dit ton choix.

Ne corrige que ce qui concerne ce changement-ci. La note de version peut annoncer d'autres changements : ils ne te regardent pas ici, même si la note de l'écran les contredit.

Ne décris jamais un état visuel (couleur, taille, position, « n'est plus », « est désormais ») qu'aucune des sources suivantes ne dit en toutes lettres : l'écart, le pourquoi de l'humain, les indices, la phrase remplacée. Un ancien état ne prouve pas sa disparition : « le bouton est gris » et un changement autour de ce bouton ne prouvent pas « le bouton n'est plus gris ». Ne déduis pas un état d'un libellé lu. Si ces sources ne disent pas ce qui est affiché maintenant, réponds avec "nouvelle_phrase": null : aucune correction plutôt qu'un état inventé.

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

// Sent once when the model answers null although the editable part of the note cites a label of the change.
export function nudgeMessage(cited: string[]): string {
  return `Tu as répondu null, mais la note cite ${cited.map((label) => `« ${label} »`).join(", ")}, qui fait partie de ce changement. Relis la phrase qui le cite : si le changement la rend fausse, corrige-la ; sinon, réponds de nouveau null. Rends l'objet JSON complet.`;
}
