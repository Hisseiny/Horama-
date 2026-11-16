import type { Version } from "@horama/contrats";
import type { Note } from "@horama/memoire";
import type { Message } from "./router.ts";

const INSTRUCTIONS = `Tu écris des tests de recette pour un logiciel, à partir d'une note de sa documentation (la note source). Un agent jouera chaque test dans un navigateur, puis un programme vérifiera les règles par le calcul, sur les valeurs relevées à l'écran. Un programme assemble ta réponse : tu remplis des cases, rien d'autre.

Réponds par un seul objet JSON, sans aucun texte autour : { "tests": [ { ...les cases d'un test... } ] }

Les cases de chaque test, toutes obligatoires :
- "id" : identifiant en kebab-case (minuscules sans accent, chiffres, tirets), différent pour chaque test.
- "titre" : une ligne, le nom de l'écran puis ce qui est vérifié, par exemple « Fiche client : adresse de livraison ».
- "setup" : une phrase qui dit l'état de départ, par exemple « Connecté avec le compte de démo, sur la fiche client, sans filtre. ». Le test démarre toujours déjà connecté, sur l'écran du premier relevé, dans son état de départ.
- "etapes" : liste de phrases à l'infinitif (majuscule, point final), sans numéro, que l'agent exécute dans l'ordre pour amener chaque écran dans l'état à relever. Cite les libellés de l'interface entre « », tels que la documentation des écrans les donne. N'écris ni la connexion, ni l'ouverture de l'écran de départ, ni l'appel d'un outil : le programme les ajoute.
- "resultat_attendu" : une phrase.
- "verifications" : liste de phrases qui commencent par « FAIL if » et continuent en français, par exemple « FAIL if le total affiché est différent de la somme des montants. ».
- "releves" : les états d'écran à capturer, dans l'ordre, au moins un : { "ecran": identifiant d'un écran documenté, "vue": l'état de l'écran au moment de la capture }. La vue vaut "defaut" quand l'écran est tel qu'il s'ouvre, sans qu'aucune étape l'ait changé ; dès qu'une étape y choisit un filtre, un tri ou un onglet, la vue est un nom court en kebab-case qui dit cet état, par exemple "filtre-payees". L'écran est celui où se trouve ce que le test vérifie, d'après la documentation des écrans. Tout écran cité par une règle doit y figurer.
- "regles_calculables" : liste de règles, selon la grammaire ci-dessous. Liste vide quand rien ne se vérifie par le calcul (un élément déplacé, une couleur, une disposition).
- "passages_de_la_source" : au moins un passage de la note source d'où vient le test, recopié caractère pour caractère (mêmes guillemets, mêmes accents, mêmes espaces), sans le tiret de la puce, sans rien ajouter ni corriger. Jamais un passage de la documentation des écrans.
- "questions" : liste de { "texte": la question, "choix": la liste de ses 2 ou 3 réponses courtes, par exemple ["Oui", "Non"] }. Liste vide seulement quand la note source ne laisse aucun doute. Une phrase qui peut se lire de deux façons qui changent la vérification demande une question. C'est toujours le cas d'une limite de date ou de montant dont la note ne dit pas si elle est incluse (« passée », « avant », « après », « jusqu'à », « à partir de », « plus de ») : demande alors si la limite elle-même compte. Écris quand même le test, avec la lecture la plus stricte.

Grammaire des règles : cinq types, aucun autre champ, aucune autre valeur.
- { "type": "somme", "ecran": E, "colonne": C, "cible": T } : la valeur T affichée est la somme de la colonne C.
- { "type": "egalite", "a": { "ecran": E1, "champ": X }, "b": { "ecran": E2, "champ": Y } } : la valeur X de l'écran E1 est égale à la valeur Y de l'écran E2.
- { "type": "filtre", "ecran": E, "filtre": F, "colonne": C, "condition": K } : quand le filtre F est choisi, chaque ligne affichée respecte la condition K dans la colonne C. K vaut "< aujourd_hui" (date strictement antérieure à aujourd'hui), "<= aujourd_hui" (antérieure ou égale à aujourd'hui) ou "= valeur" (égale au champ supplémentaire "valeur", qui ne s'écrit que dans ce cas).
- { "type": "format", "ecran": E, "colonne": C, "motif": M } : chaque valeur de la colonne C s'écrit comme 1 420,00 € (M vaut "montant-fr") ou comme 05/11/2026 (M vaut "date-fr").
- { "type": "presence", "ecran": E, "colonne": C } : aucune case de la colonne C n'est vide.
E, E1, E2 sont des identifiants d'écran documentés. F, C, T, X, Y sont les libellés exacts de l'interface, sans guillemets : le nom d'une colonne est celui que donne la documentation de l'écran.

Deux cas, selon la note source :
- Elle porte des règles déjà écrites (elles te sont données avec leur phrase) : écris des tests pour ces règles seulement. Recopie chaque règle telle quelle dans "regles_calculables" : toutes, sans en ajouter, sans en changer un caractère. Mets dans un même test les règles qui se vérifient sur les mêmes écrans, sinon un test par règle. Les passages de la source sont les phrases de ces règles.
- Elle ne porte aucune règle écrite (une note de version, en langage courant) : écris exactement un test par changement annoncé. Propose la règle calculable quand le changement en contient une.`;

// `screens`: the notes of produit/ that describe a screen (front matter: ecran, chemin, url).
export function buildMessages(logiciel: string, version: Version, note: Note, screens: Note[]): Message[] {
  const rules = note.regles.filter(({ regle }) => regle);
  return [
    { role: "system", content: INSTRUCTIONS },
    {
      role: "user",
      content: [
        `Logiciel : ${logiciel}. Version testée : ${version}.`,
        "",
        "Documentation des écrans (identifiant « ecran », titre, « url ») :",
        ...screens.map(({ texte }) => `<<<\n${texte.trimEnd()}\n>>>`),
        "",
        rules.length ? "Règles déjà écrites dans la note source :" : "Règles déjà écrites dans la note source : aucune.",
        ...rules.map(({ phrase, regle }) => `- phrase : ${phrase}\n  règle : ${JSON.stringify(regle)}`),
        "",
        `Note source « ${note.chemin} » :`,
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
