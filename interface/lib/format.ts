import type { Regle, ResultatVerification } from "@horama/contrats";

// A calculable rule, written the way the notes write it: "regle: somme | colonne: Montant TTC | cible: Total".
export function ruleLine(regle: Regle): string {
  const side = (s: { ecran: string; champ: string }) => `${s.ecran}.${s.champ}`;
  const fields = regle.type === "egalite"
    ? [`a: ${side(regle.a)}`, `b: ${side(regle.b)}`]
    : Object.entries(regle).filter(([key]) => key !== "type" && key !== "ecran").map(([key, v]) => `${key}: ${v}`);
  return [`regle: ${regle.type}`, ...fields].join(" | ");
}

const NBSP = "\u00a0";

// "1240.00" -> "1 240,00"
const frenchNumber = (value: string) => {
  const [units, cents] = value.split(".");
  return `${units.replace(/\B(?=(\d{3})+$)/g, NBSP)},${cents}`;
};

// 1152000 -> "1 152 000"
export const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, NBSP);

// A read value: amounts ("1240.00") are shown the French way with the euro sign, the rest as read.
export const value = (v: string) => (/^\d+\.\d{2}$/.test(v) ? `${frenchNumber(v)}${NBSP}€` : v);

// "1240.00 != 1420.00, écart 180.00" -> "1 240,00 ≠ 1 420,00, écart 180,00"
export const calculation = (c: string) => c.replace(/\d+\.\d{2}/g, frenchNumber).replace("!=", "≠");

// The measure written next to a rule: "1 240,00 € ≠ 1 420,00 €".
export function measure(r: ResultatVerification): string {
  const values = Object.values(r.valeurs).map(value);
  if (r.regle?.type === "egalite" && values.length === 2) return `${values[0]} ${r.statut === "PASS" ? "=" : "≠"} ${values[1]}`;
  return r.calcul ? calculation(r.calcul) : values.join(", ");
}

// 220 -> "3 min 40" ; 45 -> "45 s" ; 0 or unknown -> "à mesurer"
export const duration = (s?: number) =>
  !s ? "à mesurer" : s < 60 ? `${s}${NBSP}s` : `${Math.floor(s / 60)}${NBSP}min${NBSP}${String(Math.round(s % 60)).padStart(2, "0")}`;

// 30 -> "00:30"
export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const cost = (usd: number | null | undefined) => (usd == null ? "coût inconnu" : `${usd.toFixed(2).replace(".", ",")}${NBSP}$`);

export const plural = (n: number, one: string, many: string) => `${n}${NBSP}${n > 1 ? many : one}`;

// Sum of one column of a page text (a Markdown table), written out: "320,00 + 480,00 + 180,00 + 440,00 = 1 420,00".
export function writtenSum(pageText: string, column: string): string | undefined {
  const rows = pageText.split("\n").map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const i = rows[0]?.indexOf(column) ?? -1;
  const cells = rows.slice(1).filter((row) => row[0] !== "Total" && row[i]).map((row) => row[i].replace(/[^\d,]/g, ""));
  if (i < 0 || !cells.length) return undefined;
  const cents = cells.reduce((sum, cell) => sum + Math.round(Number(cell.replace(",", ".")) * 100), 0);
  return `${cells.join(" + ")} = ${frenchNumber((cents / 100).toFixed(2))}`;
}
