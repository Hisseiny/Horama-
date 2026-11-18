import type { QuestionAmbiguite, Regle, Releve, TestPropose } from "@horama/contrats";
import { verifierRegle } from "@horama/memoire";
import type { Note } from "@horama/memoire";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface Source {
  logiciel: string;
  note: Note;
  screens: string[]; // screen ids of the vault
  views: Record<string, string[]>; // per screen, the views its note declares (front matter « vues »), besides « defaut »
  modele: string;
}

function sentence(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.includes("\n")) throw new Error(`« ${label} » doit être un texte d'une seule ligne`);
  return value.trim();
}

function list(value: unknown, label: string, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min) throw new Error(`« ${label} » doit être une liste${min ? ` d'au moins ${min} élément(s)` : ""}`);
  return value;
}

function kebab(value: unknown, label: string): string {
  const name = sentence(value, label);
  if (!KEBAB.test(name)) throw new Error(`${label} « ${name} » n'est pas en kebab-case`);
  return name;
}

const ruleScreens = (rule: Regle) => (rule.type === "egalite" ? [rule.a.ecran, rule.b.ecran] : [rule.ecran]);
const ruleKey = (rule: Regle) => JSON.stringify(rule); // verifierRegle fixes the order of the fields

// The model fills the slots; the code checks them all and writes everything else. Throws with every reason of refusal.
function buildTest(raw: unknown, { logiciel, note, screens, views, modele }: Source): TestPropose {
  const slots = (raw ?? {}) as Record<string, unknown>;
  const reasons: string[] = [];
  const read = <T>(fallback: T, reader: () => T): T => {
    try {
      return reader();
    } catch (error) {
      reasons.push((error as Error).message);
      return fallback;
    }
  };
  const sentences = (key: string, min: number) => list(slots[key], key, min).map((item) => sentence(item, key));

  const id = read("", () => kebab(slots.id, "id"));
  const titre = read("", () => sentence(slots.titre, "titre"));
  const setup = read("", () => sentence(slots.setup, "setup"));
  const etapes = read([], () => sentences("etapes", 1).map((step) => step.replace(/^\d+[.)]\s*/, "")));
  const attendu = read("", () => sentence(slots.resultat_attendu, "resultat_attendu"));
  const verifications = read([], () =>
    sentences("verifications", 1).map((check) => {
      if (!check.startsWith("FAIL if ")) throw new Error(`la vérification « ${check} » ne commence pas par « FAIL if »`);
      return check;
    }),
  );
  const releves = read<Releve[]>([], () =>
    list(slots.releves, "releves", 1).map((item) => {
      const { ecran, vue } = (item ?? {}) as Record<string, unknown>;
      return { ecran: sentence(ecran, "releves.ecran"), vue: kebab(vue, "vue") };
    }),
  );
  const regles = read<Regle[]>([], () =>
    list(slots.regles_calculables, "regles_calculables").map((rule, index) => {
      try {
        return verifierRegle(rule);
      } catch (error) {
        throw new Error(`la règle ${index + 1} n'est pas une règle du contrat (${(error as Error).message})`);
      }
    }),
  );
  const passages = read([], () =>
    sentences("passages_de_la_source", 1).map((passage) => {
      if (!note.texte.includes(passage)) throw new Error(`le passage « ${passage} » n'est pas recopié mot pour mot de la note`);
      return passage;
    }),
  );
  const questions = read<QuestionAmbiguite[]>([], () =>
    list(slots.questions, "questions").map((item) => {
      const { texte, choix } = (item ?? {}) as Record<string, unknown>;
      return { texte: sentence(texte, "questions.texte"), choix: list(choix, "questions.choix", 2).map((choice) => sentence(choice, "questions.choix")) };
    }),
  );

  const cited = new Set(regles.flatMap(ruleScreens));
  for (const ecran of new Set([...releves.map((releve) => releve.ecran), ...cited])) {
    if (!screens.includes(ecran)) reasons.push(`l'écran « ${ecran} » n'existe pas dans le vault (écrans : ${screens.join(", ")})`);
  }
  for (const ecran of cited) {
    // releves is empty when it was refused above: no second reason for the same fault
    if (releves.length && !releves.some((releve) => releve.ecran === ecran)) reasons.push(`l'écran « ${ecran} », cité par une règle, n'est pas dans releves`);
  }
  // A view must be one the scene can reach and compare: « defaut » or a view declared by the note of the screen.
  // Checked once the screens are right, so a wrong screen gives one reason, not two.
  for (const { ecran, vue } of reasons.length ? [] : releves) {
    if (vue !== "defaut" && screens.includes(ecran) && !(views[ecran] ?? []).includes(vue)) {
      reasons.push(`la vue « ${vue} » n'est pas déclarée pour l'écran « ${ecran} » (vues : ${["defaut", ...(views[ecran] ?? [])].join(", ")})`);
    }
  }
  // The prompt asks for it; faster providers forget it (measure of 2026-11-17), so the code checks it.
  const limit = regles.find((rule) => rule.type === "filtre" && /[<>]/.test(rule.condition));
  // slots.questions, not questions: a list refused above is not « no question »
  if (limit?.type === "filtre" && Array.isArray(slots.questions) && !slots.questions.length && !/inclu|strictement|compris/i.test(note.texte)) {
    reasons.push(`la règle de filtre (« ${limit.condition} ») a une limite dont la note ne dit pas si elle compte : ajoute la question`);
  }
  if (reasons.length) throw new Error(reasons.join(" ; "));

  const test_markdown = [
    `# ${titre}`,
    "",
    "## Setup",
    setup,
    "",
    "## Task",
    ...etapes.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Expected Result",
    attendu,
    "",
    "## Verification",
    ...verifications.map((check) => `- ${check}`),
  ].join("\n");
  return { id, logiciel, source: note.chemin, passages_de_la_source: passages, releves, test_markdown, regles_calculables: regles, questions, statut: "propose", modele };
}

// Validates a whole answer of the model. `reasons` is empty when every test is valid; nothing is repaired or invented here.
export function validateAnswer(content: string, source: Source): { tests: TestPropose[]; reasons: string[] } {
  let raws: unknown;
  try {
    // the JSON object, even inside a code fence or a sentence
    raws = (JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1)) as { tests?: unknown }).tests;
  } catch {
    return { tests: [], reasons: ["la réponse n'est pas un objet JSON lisible"] };
  }
  if (!Array.isArray(raws) || !raws.length) return { tests: [], reasons: ["le champ « tests » manque ou est vide"] };

  const tests: TestPropose[] = [];
  const reasons: string[] = [];
  raws.forEach((raw, index) => {
    try {
      const test = buildTest(raw, source);
      if (tests.some((other) => other.id === test.id)) throw new Error(`l'id « ${test.id} » est déjà celui d'un autre test`);
      tests.push(test);
    } catch (error) {
      reasons.push(`test ${index + 1} : ${(error as Error).message}`);
    }
  });

  // A note that carries written rules gives tests with exactly these rules.
  const written = new Set(source.note.regles.flatMap(({ regle }) => (regle ? ruleKey(regle) : [])));
  if (written.size && !reasons.length) {
    const proposed = new Set(tests.flatMap((test) => test.regles_calculables.map(ruleKey)));
    for (const rule of written) if (!proposed.has(rule)) reasons.push(`la règle de la note ${rule} n'est portée par aucun test`);
    for (const rule of proposed) if (!written.has(rule)) reasons.push(`la règle ${rule} n'est pas une règle écrite dans la note`);
  }
  return { tests, reasons };
}
