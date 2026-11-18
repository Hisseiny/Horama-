import type { IdEcran, Regle } from "@horama/contrats";

const MOTIFS = ["montant-fr", "date-fr"] as const;
const CONDITIONS = ["< aujourd_hui", "<= aujourd_hui", "= valeur"] as const;

export function text(source: unknown, key: string, label = key): string {
  const value = (source as Record<string, unknown> | null | undefined)?.[key];
  if (typeof value !== "string" || !value) throw new Error(`champ « ${label} » manquant`);
  return value;
}

function oneOf<T extends string>(allowed: readonly T[], source: unknown, key: string): T {
  const value = text(source, key);
  if (!allowed.includes(value as T)) throw new Error(`${key} « ${value} » hors du contrat (${allowed.join(", ")})`);
  return value as T;
}

// Returns the rule with exactly the fields of the contract, in the order of the contract; throws when it is not a Regle.
export function checkRule(rule: unknown): Regle {
  const fields = (rule ?? {}) as Record<string, unknown>;
  const side = (key: string) => ({
    ecran: text(fields[key], "ecran", `${key}.ecran`),
    champ: text(fields[key], "champ", `${key}.champ`),
  });
  switch (fields.type) {
    case "somme":
      return { type: "somme", ecran: text(fields, "ecran"), colonne: text(fields, "colonne"), cible: text(fields, "cible") };
    case "egalite":
      return { type: "egalite", a: side("a"), b: side("b") };
    case "filtre":
      return {
        type: "filtre",
        ecran: text(fields, "ecran"),
        filtre: text(fields, "filtre"),
        colonne: text(fields, "colonne"),
        condition: oneOf(CONDITIONS, fields, "condition"),
        ...(fields.valeur === undefined ? {} : { valeur: text(fields, "valeur") }),
      };
    case "format":
      return { type: "format", ecran: text(fields, "ecran"), colonne: text(fields, "colonne"), motif: oneOf(MOTIFS, fields, "motif") };
    case "presence":
      return { type: "presence", ecran: text(fields, "ecran"), colonne: text(fields, "colonne") };
    case "etat": {
      const list = (key: "texte_present" | "texte_absent") => {
        const value = fields[key];
        if (value === undefined) return undefined;
        if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item))
          throw new Error(`champ « ${key} » attendu comme liste de textes`);
        return value as string[];
      };
      const [texte_present, texte_absent] = [list("texte_present"), list("texte_absent")];
      // A rule that only forbids texts proves nothing without a « texte_present » witness: the state may never have been reached.
      if (!texte_present?.length) throw new Error("une règle etat exige au moins un « texte_present » témoin");
      return { type: "etat", ecran: text(fields, "ecran"), vue: text(fields, "vue"), texte_present, ...(texte_absent?.length ? { texte_absent } : {}) };
    }
    default:
      throw new Error(`type de règle inconnu « ${String(fields.type ?? "")} »`);
  }
}

export function analyserLigneRegle(ligne: string, ecranDeLaNote?: IdEcran): Regle {
  const fields: Record<string, string | undefined> = Object.fromEntries(
    ligne.trim().split(" | ").map((field) => {
      const cut = field.indexOf(":");
      return [field.slice(0, Math.max(cut, 0)).trim(), field.slice(cut + 1).trim()];
    }),
  );
  const side = (value = "") => {
    const dot = value.indexOf(".");
    return { ecran: value.slice(0, Math.max(dot, 0)), champ: value.slice(dot + 1) };
  };
  // In a note, the lists of an « etat » rule are written « present: un texte ; un autre » and « absent: … ».
  const texts = (key: "present" | "absent") => fields[key]?.split(" ; ");
  const present = texts("present");
  const absent = texts("absent");
  try {
    return checkRule(
      fields.regle === "egalite"
        ? { type: "egalite", a: side(fields.a), b: side(fields.b) }
        : fields.regle === "etat"
          ? { type: "etat", ecran: ecranDeLaNote, vue: fields.vue, ...(present && { texte_present: present }), ...(absent && { texte_absent: absent }) }
          : { ...fields, type: fields.regle, ecran: ecranDeLaNote },
    );
  } catch (error) {
    throw new Error(`Ligne de règle invalide « ${ligne.trim()} » : ${(error as Error).message}`);
  }
}
