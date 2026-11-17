import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { lireChangements } from "../index.ts";
import { temporaryVault } from "./vault.ts";

const vault = temporaryVault();

function writeChange(folder: string, name: string, content: string): void {
  mkdirSync(join(folder, "facturo", "changements"), { recursive: true });
  writeFileSync(join(folder, "facturo", "changements", name), content);
}

test("sans dossier changements, la liste est vide", () => {
  assert.deepEqual(lireChangements(vault, "facturo"), []);
});

test("une fiche écrite sur le modèle, commentaires compris, est lue entièrement", () => {
  const folder = temporaryVault();
  writeChange(
    folder,
    "bouton-relancer.md",
    `---
# Identifiant court, en minuscules et tirets ; c'est aussi le nom du fichier.
id: bouton-relancer
# Numéro de la pull request qui porte le code et cette fiche.
pr: 42
# Fichiers de code modifiés, entre guillemets (sinon les crochets de [version] cassent l'en-tête).
code: ["faux-saas/app/[version]/factures/page.tsx", "faux-saas/lib/relances.ts"]
# Écrans que le changement veut modifier : Horama y teste la nouveauté.
ecrans_vises: [liste-des-factures]
# Écrans qui ne doivent pas bouger : Horama rejoue leurs tests même si leur code n'a pas changé.
ne_doit_pas_changer: [tableau-de-bord]
---

# Bouton « Relancer » sur la liste des factures

Ce qui change : un bouton « Relancer » sur chaque facture échue ; un clic affiche « Relance envoyée ».
Ce qui ne doit pas changer : le reste de la liste, le mode sombre, l'export.
`,
  );
  assert.deepEqual(lireChangements(folder, "facturo"), [
    {
      id: "bouton-relancer",
      pr: 42,
      code: ["faux-saas/app/[version]/factures/page.tsx", "faux-saas/lib/relances.ts"],
      ecrans_vises: ["liste-des-factures"],
      ne_doit_pas_changer: ["tableau-de-bord"],
      titre: "Bouton « Relancer » sur la liste des factures",
      chemin: "changements/bouton-relancer.md",
    },
  ]);
});

test("une fiche invalide lève une erreur qui nomme le fichier", () => {
  const cases: Array<[string, string, RegExp]> = [
    [
      "sans-id.md",
      "---\npr: 1\ncode: [a]\necrans_vises: []\nne_doit_pas_changer: []\n---\n",
      /champ « id » manquant/,
    ],
    [
      "mauvais-id.md",
      "---\nid: autre-nom\npr: 1\ncode: [a]\necrans_vises: []\nne_doit_pas_changer: []\n---\n",
      /l'id de l'en-tête \(autre-nom\) n'est pas le nom du fichier/,
    ],
    [
      "code-en-texte.md",
      "---\nid: code-en-texte\npr: 1\ncode: faux-saas/lib/data.ts\necrans_vises: []\nne_doit_pas_changer: []\n---\n",
      /champ « code » manquant ou n'est pas une liste de chaînes/,
    ],
    [
      "sans-pr.md",
      "---\nid: sans-pr\ncode: [a]\necrans_vises: []\nne_doit_pas_changer: []\n---\n",
      /champ « pr » manquant ou non numérique/,
    ],
    [
      "sans-ecrans.md",
      "---\nid: sans-ecrans\npr: 1\ncode: [a]\n---\n",
      /champ « ecrans_vises » manquant ou n'est pas une liste de chaînes/,
    ],
    [
      "sans-entete.md",
      "# Une fiche sans en-tête\n",
      /champ « id » manquant/,
    ],
  ];
  for (const [name, content, reason] of cases) {
    const folder = temporaryVault();
    writeChange(folder, name, content);
    assert.throws(
      () => lireChangements(folder, "facturo"),
      (error: Error) => error.message.startsWith(`facturo/changements/${name} : `) && reason.test(error.message),
      name,
    );
  }
});

test("les fiches sont rendues triées par nom de fichier", () => {
  const folder = temporaryVault();
  for (const id of ["z-second", "a-first"]) {
    writeChange(folder, `${id}.md`, `---\nid: ${id}\npr: 1\ncode: [a]\necrans_vises: []\nne_doit_pas_changer: []\n---\n\n# ${id}\n`);
  }
  assert.deepEqual(lireChangements(folder, "facturo").map((change) => change.id), ["a-first", "z-second"]);
});
