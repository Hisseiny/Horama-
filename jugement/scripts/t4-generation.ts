// T4: can an open model served by the Hugging Face router write the tests of 3 notes of the vault?
// Run from the root of the repository: node --env-file=<.env.local> jugement/scripts/t4-generation.ts [model ...]
// With models given (a router suffix such as `:fastest` or `:cerebras` included), the run is a new measure: its files get the
// suffix `-rapide` (or `-$T4_RUN`) and the files of the first T4 run (2026-11-16) are left as they are.
// Every figure written by this script is measured by this run; the vault is only read (writes go to a temporary copy).
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import type { Regle, TestPropose } from "@horama/contrats";
import { ecrireTestAccepte, lireNotes, lireTestAccepte, urlDepart } from "@horama/memoire";
import { DEFAULT_MODEL, proposerTests } from "../index.ts";
import type { ModelCall } from "../index.ts";

const ASKED = process.argv.slice(2);
const MODELS = ASKED.length ? ASKED : ["openai/gpt-oss-120b", "Qwen/Qwen3.8-27B"];
const RESERVE = "zai-org/GLM-5.3-Flash"; // measured only when one of the two never answers
const V13 = "notes-de-version/v13.md";
const NOTES = [V13, "produit/liste-des-factures.md", "produit/regles-entre-ecrans.md"];
const PASSES = 3;
const LOGICIEL = "facturo";
const VERSION = "13";
const MAX_MEDIAN_MS = 10_000;

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const VAULT = join(ROOT, "vault-horama");
const OUT = join(ROOT, "jugement/generation");
const RUN = process.env.T4_RUN ?? "rapide"; // name of a run with chosen models: T4_RUN=rapide-2 keeps the files of the run « rapide »
const REPORT = ASKED.length ? `docs/tests/2026-11-17-t4-generation-${RUN}.md` : "docs/tests/2026-11-16-t4-generation.md";
const ESSAIS = ASKED.length ? `essais-${RUN}` : "essais";
const COMPARAISON = ASKED.length ? `comparaison-${RUN}.md` : "comparaison.md";
const COMMAND = ["node", ...process.execArgv, "jugement/scripts/t4-generation.ts", ...ASKED].join(" ");

interface Pass {
  model: string;
  note: string;
  pass: number;
  valid: boolean; // C1 format, after the validation of the code
  rulesRight: boolean;
  written: boolean | null; // v13 only: the 2 tests are written by ecrireTestAccepte and read back
  ms: number;
  tries: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  answered: boolean; // the model returned a content at least once
  problems: string[]; // why the pass failed
  firstRefusal: string[]; // why the first try was refused, when there was a second one
}

const ruleKeys = (rules: Regle[]) => new Set(rules.map((rule) => JSON.stringify(rule)));

// produit/ notes: the set of rules of the generated tests is the set of rules read in the note by lireNotes.
function rulesProblem(tests: TestPropose[], note: string): string | null {
  const written = ruleKeys(lireNotes(VAULT, LOGICIEL).find(({ chemin }) => chemin === note)!.regles.flatMap(({ regle }) => regle ?? []));
  const proposed = ruleKeys(tests.flatMap((test) => test.regles_calculables));
  const missing = [...written].filter((rule) => !proposed.has(rule));
  const extra = [...proposed].filter((rule) => !written.has(rule));
  if (!missing.length && !extra.length) return null;
  return `règles différentes de celles de la note (absentes : ${missing.join(" ") || "aucune"} ; en trop : ${extra.join(" ") || "aucune"})`;
}

// v13: 2 tests, one carries the filter rule with a view other than "defaut" and a question, the other targets the « Exporter » button.
function v13Problem(tests: TestPropose[]): string | null {
  if (tests.length !== 2) return `${tests.length} test(s) au lieu de 2`;
  const filterRule = { type: "filtre", ecran: "liste-des-factures", filtre: "Échéance dépassée", colonne: "Échéance" };
  const filter = tests.find((test) =>
    test.regles_calculables.some((rule) => ["< aujourd_hui", "<= aujourd_hui"].some((condition) => isDeepStrictEqual(rule, { ...filterRule, condition }))),
  );
  if (!filter) return "aucun test ne porte la règle attendue du filtre « Échéance dépassée »";
  if (!filter.releves.some(({ ecran, vue }) => ecran === "liste-des-factures" && vue !== "defaut")) return "le test du filtre ne relève pas liste-des-factures dans une vue autre que defaut";
  if (!filter.questions.length) return "le test du filtre ne pose aucune question";
  const other = tests.find((test) => test !== filter)!;
  if (!other.test_markdown.includes("Exporter")) return "le second test ne vise pas le bouton « Exporter »";
  if (!other.releves.some(({ ecran, vue }) => ecran === "liste-des-factures" && vue === "defaut")) return "le second test ne relève pas liste-des-factures en vue defaut";
  if (other.regles_calculables.length) return "le second test porte une règle calculable";
  return null;
}

// Writes the tests as accepted tests in a temporary copy of the vault, then reads them back.
function writeProblem(tests: TestPropose[]): string | null {
  const copy = mkdtempSync(join(tmpdir(), "horama-t4-"));
  try {
    cpSync(VAULT, copy, { recursive: true });
    if (tests.length !== 2) return `${tests.length} test(s) à écrire au lieu de 2`;
    for (const test of tests) {
      const url_depart = urlDepart(copy, LOGICIEL, VERSION, test.releves[0].ecran);
      const written = ecrireTestAccepte(copy, test, { url_depart, version_cible: VERSION, accepte_par: "T4", accepte_le: new Date().toISOString().slice(0, 10) });
      if (!isDeepStrictEqual(lireTestAccepte(copy, LOGICIEL, test.id), written)) return `le test « ${test.id} » relu diffère du test écrit`;
    }
    return null;
  } catch (error) {
    return `écriture ou relecture impossible (${(error as Error).message})`;
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

async function runPass(model: string, note: string, pass: number): Promise<Pass> {
  const calls: ModelCall[] = [];
  const problems: string[] = [];
  const start = Date.now();
  let tests: TestPropose[] = [];
  let ms: number;
  try {
    const proposal = await proposerTests(VAULT, LOGICIEL, note, { modele: model, version: VERSION, trace: (call) => calls.push(call) });
    tests = proposal.tests;
    ms = proposal.duree_ms;
  } catch (error) {
    problems.push((error as Error).message);
    ms = Date.now() - start;
  }
  const valid = !problems.length;
  const wrongRules = valid ? (note === V13 ? v13Problem(tests) : rulesProblem(tests, note)) : null;
  if (wrongRules) problems.push(wrongRules);
  const unwritten = valid && note === V13 ? writeProblem(tests) : null;
  if (unwritten) problems.push(unwritten);
  const sum = (values: Array<number | undefined>) => (values.some((value) => value !== undefined) ? values.reduce((total: number, value) => total + (value ?? 0), 0) : null);
  const result: Pass = {
    model,
    note,
    pass,
    valid,
    rulesRight: valid && !wrongRules,
    written: valid && note === V13 ? !unwritten : null,
    ms,
    tries: calls.length,
    inputTokens: sum(calls.map((call) => call.inputTokens)),
    outputTokens: sum(calls.map((call) => call.outputTokens)),
    costUsd: sum(calls.map((call) => (call.body as { usage?: { cost?: number } } | undefined)?.usage?.cost)),
    answered: calls.some((call) => call.content !== undefined),
    problems,
    firstRefusal: (calls.length > 1 && calls[0].rejections) || [],
  };
  writeFileSync(join(OUT, ESSAIS, `${model.split("/").pop()!.replace(":", "@")}--${basename(note, ".md")}--${pass}.json`), `${JSON.stringify({ ...result, calls, tests }, null, 2)}\n`);
  console.log(`${model} | ${note} | passe ${pass} : format ${yesNo(valid)}, règles ${yesNo(result.rulesRight)}, ${ms} ms, ${calls.length} essai(s)${problems.length ? ` | ${problems.join(" | ")}` : ""}`);
  return result;
}

async function runModel(model: string): Promise<Pass[]> {
  const passes: Pass[] = [];
  for (const note of NOTES) for (let pass = 1; pass <= PASSES; pass++) passes.push(await runPass(model, note, pass));
  return passes;
}

// ---------- Figures and documents ----------

const yesNo = (value: boolean) => (value ? "oui" : "non");
const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const outOf = (rows: Pass[], test: (pass: Pass) => boolean) => `${rows.filter(test).length} sur ${rows.length}`;
const total = (rows: Pass[], key: "inputTokens" | "outputTokens" | "costUsd") =>
  rows.some((row) => row[key] !== null) ? rows.reduce((sum, row) => sum + (row[key] ?? 0), 0) : null;
const measured = (value: number | null, digits = 0) => (value === null ? "à mesurer" : value.toFixed(digits));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(model: string, passes: Pass[]) {
  const rows = passes.filter((pass) => pass.model === model);
  const notesOk = NOTES.filter((note) => rows.filter((row) => row.note === note).every((row) => row.valid && row.rulesRight)).length;
  const medianMs = median(rows.map((row) => row.ms));
  return { model, rows, notesOk, passesOk: rows.filter((row) => row.valid && row.rulesRight).length, medianMs, holds: notesOk >= 2 && medianMs < MAX_MEDIAN_MS };
}
type Summary = ReturnType<typeof summarize>;

function modelSection({ model, rows, notesOk, medianMs, holds }: Summary): string {
  const v13 = rows.filter((row) => row.note === V13);
  return [
    `## ${model}`,
    "",
    "| Note | Format C1 valide | Règles justes | Temps médian | Passes avec second essai |",
    "|---|---|---|---|---|",
    ...NOTES.map((note) => {
      const mine = rows.filter((row) => row.note === note);
      return `| \`${note}\` | ${outOf(mine, (row) => row.valid)} | ${outOf(mine, (row) => row.rulesRight)} | ${seconds(median(mine.map((row) => row.ms)))} | ${outOf(mine, (row) => row.tries > 1)} |`;
    }),
    `| **Total** | **${outOf(rows, (row) => row.valid)}** | **${outOf(rows, (row) => row.rulesRight)}** | **${seconds(medianMs)}** | **${outOf(rows, (row) => row.tries > 1)}** |`,
    "",
    `- Notes réussies aux ${PASSES} passes (format valide et règles justes) : ${notesOk} sur ${NOTES.length}.`,
    `- Temps médian global (${rows.length} passes, échecs compris) : ${seconds(medianMs)}.`,
    `- \`${V13}\` : passes où les 2 tests s'écrivent (\`ecrireTestAccepte\`) et se relisent (\`lireTestAccepte\`) : ${outOf(v13, (row) => row.written === true)}.`,
    `- Jetons : ${measured(total(rows, "inputTokens"))} en entrée, ${measured(total(rows, "outputTokens"))} en sortie ; coût rendu par le routeur : ${measured(total(rows, "costUsd"), 4)} $.`,
    `- Critère de T4 (au moins 2 notes sur 3 réussies aux ${PASSES} passes, temps médian sous ${MAX_MEDIAN_MS / 1000} s) : **${holds ? "tenu" : "non tenu"}**.`,
  ].join("\n");
}

function verdict(summaries: Summary[]): string {
  const ranked = [...summaries].sort(
    (a, b) => Number(b.holds) - Number(a.holds) || (a.holds ? 0 : b.notesOk - a.notesOk || b.passesOk - a.passesOk) || a.medianMs - b.medianMs,
  );
  const [best, ...others] = ranked;
  const holders = ranked.filter((summary) => summary.holds);
  const facts = `${best.notesOk} note(s) sur ${NOTES.length} réussie(s) aux ${PASSES} passes, temps médian ${seconds(best.medianMs)}`;
  const choice = !best.holds
    ? `**Aucun modèle ne tient le critère de T4.** Le meilleur est \`${best.model}\` (${facts}). Repli prévu par la spec : afficher un test pré-généré, présenté comme tel.`
    : holders.length > 1
      ? `**Modèle retenu : \`${best.model}\`.** ${holders.length} modèles tiennent le critère de T4, il est le plus rapide (${facts} ; ${others.filter((other) => other.holds).map((other) => `\`${other.model}\` : ${seconds(other.medianMs)}`).join(", ")}).`
      : `**Modèle retenu : \`${best.model}\`.** Il est le seul à tenir le critère de T4 (${facts}).`;
  const inCode = DEFAULT_MODEL === best.model ? "c'est bien lui." : "ce n'est pas lui : à corriger dans `jugement/generation/index.ts`.";
  return `${choice}\n\nModèle par défaut de \`proposerTests\` dans le code au moment du lancement : \`${DEFAULT_MODEL}\`, ${inCode}`;
}

const startedAt = new Date();
rmSync(join(OUT, ESSAIS), { recursive: true, force: true });
mkdirSync(join(OUT, ESSAIS), { recursive: true });

const passes = (await Promise.all(MODELS.map(runModel))).flat();
const silent = MODELS.filter((model) => passes.every((pass) => pass.model !== model || !pass.answered));
const reserve = silent.length > 0 && !ASKED.length; // the reserve belongs to the first T4 run only
if (reserve) passes.push(...(await runModel(RESERVE)));
const models = reserve ? [...MODELS, RESERVE] : MODELS;
const summaries = models.map((model) => summarize(model, passes));

const git = (args: string) => execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
const uncommitted = git("status --porcelain -- jugement memoire")
  .split("\n")
  .filter((line) => line && !line.includes(`jugement/generation/${ESSAIS}/`) && !line.endsWith(`jugement/generation/${COMPARAISON}`));
const launch = [
  `- Commande, depuis la racine du repo : \`${COMMAND}\``,
  `- Début : ${startedAt.toISOString()} ; durée totale : ${seconds(Date.now() - startedAt.getTime())}.`,
  `- Code : commit \`${git("rev-parse --short HEAD")}\`, ${uncommitted.length ? `avec ${uncommitted.length} fichier(s) de \`jugement/\` ou \`memoire/\` modifié(s) et non commité(s)` : "sans modification non commitée de `jugement/` ni de `memoire/`"}.`,
  `- Modèles : ${MODELS.map((model) => `\`${model}\``).join(", ")} ; réserve \`${RESERVE}\` : ${ASKED.length ? "sans objet (modèles choisis à la main)" : silent.length ? `lancée, car ${silent.map((model) => `\`${model}\``).join(", ")} n'a rendu aucune réponse` : "non lancée (chaque modèle a répondu au moins une fois)"}.`,
  `- ${NOTES.length} notes (${NOTES.map((note) => `\`${note}\``).join(", ")}), ${PASSES} passes chacune, température 0, délai d'abandon de 45 s par appel, un second essai au plus après un refus du code.`,
].join("\n");
const definitions = [
  "- Format C1 valide : `proposerTests` rend ses tests, c'est-à-dire que le code a validé chaque test (au premier ou au second essai). Un appel en échec ou hors délai donne « non ».",
  `- Règles justes : pour les deux notes de \`produit/\`, l'ensemble des règles des tests est égal à l'ensemble des règles lues dans la note par \`lireNotes\` ; pour \`${V13}\`, il y a 2 tests, l'un porte la règle \`filtre\` attendue (condition \`< aujourd_hui\` ou \`<= aujourd_hui\`) avec un relevé de \`liste-des-factures\` dans une vue autre que \`defaut\` et au moins une question, l'autre cite « Exporter », relève \`liste-des-factures\` en vue \`defaut\` et ne porte aucune règle.`,
  "- Temps : du premier appel à la réponse validée, second essai compris ; pour une passe en échec, du premier appel à l'échec. Les médianes comptent toutes les passes.",
].join("\n");
const sections = summaries.map(modelSection).join("\n\n");
const failures = passes.filter((pass) => pass.problems.length).map((pass) => `- \`${pass.model}\`, \`${pass.note}\`, passe ${pass.pass} : ${pass.problems.join(" ; ")}`);
const retries = passes.filter((pass) => pass.firstRefusal.length).map((pass) => `- \`${pass.model}\`, \`${pass.note}\`, passe ${pass.pass} : ${pass.firstRefusal.join(" ; ")}`);
const generated = "Fichier écrit par `jugement/scripts/t4-generation.ts` : aucun chiffre n'y est écrit à la main.";

writeFileSync(
  join(OUT, COMPARAISON),
  ["# T4 : comparaison des modèles de génération", "", generated, "", verdict(summaries), "", launch, "", definitions, "", sections, "", `Détail de chaque passe et réponses brutes : \`jugement/generation/${ESSAIS}/\` et \`${REPORT}\`.`, ""].join("\n"),
);
writeFileSync(
  join(ROOT, REPORT),
  [
    "# T4 : génération des tests par un modèle ouvert (routeur Hugging Face)",
    "",
    generated,
    "",
    "## Ce qui a été lancé",
    "",
    launch,
    "",
    "Comment chaque mesure est calculée :",
    definitions,
    "",
    "## Ce qui en est sorti",
    "",
    verdict(summaries),
    "",
    sections.replaceAll("\n## ", "\n### ").replace(/^## /, "### "),
    "",
    "### Chaque passe",
    "",
    "| Modèle | Note | Passe | Format C1 valide | Règles justes | Essais | Temps (ms) | Jetons en entrée | Jetons en sortie | Écrits et relus |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...passes.map(
      (pass) =>
        `| \`${pass.model}\` | \`${pass.note}\` | ${pass.pass} | ${yesNo(pass.valid)} | ${yesNo(pass.rulesRight)} | ${pass.tries} | ${pass.ms} | ${measured(pass.inputTokens)} | ${measured(pass.outputTokens)} | ${pass.written === null ? "" : yesNo(pass.written)} |`,
    ),
    "",
    "## Ce qui a échoué",
    "",
    failures.length ? failures.join("\n") : "Aucune passe en échec.",
    "",
    "Premiers essais refusés par le code, puis rattrapés ou non au second :",
    retries.length ? retries.join("\n") : "Aucun.",
    "",
    `Réponses brutes de chaque passe : \`jugement/generation/${ESSAIS}/<modele>--<note>--<passe>.json\`.`,
    "",
  ].join("\n"),
);

console.log(`\n${verdict(summaries)}\n`);
for (const { model, rows } of summaries) {
  console.log(`${model} : ${measured(total(rows, "inputTokens"))} jetons en entrée, ${measured(total(rows, "outputTokens"))} en sortie, ${measured(total(rows, "costUsd"), 4)} $`);
}
