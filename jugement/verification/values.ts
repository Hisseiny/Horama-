// Reads the values of a screen from its text (document.body.innerText). Cells and values are kept as displayed.

export interface Table {
  headers: string[];
  rows: string[][];
  total?: string[]; // the row whose first cell starts with « Total »
}

export interface ScreenValues {
  tables: Table[];
  labelled: Record<string, string>; // « CA du mois » then « 1 240,00 € », or « Client : Studio Lune »
  today?: string; // from « Aujourd'hui : JJ/MM/AAAA »
  filter?: string; // from « Filtrer : Toutes »
  count?: { value: number; text: string }; // from « 4 factures »
}

// \s covers every Unicode space (no-break, narrow no-break, thin...).
export const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
export const key = (text: string) => normalize(text).toLowerCase();

const STARTS_WITH_NUMBER = /^-?\d/;
const cells = (row: string) => row.split("\t").map((cell) => cell.trim());

export function releverValeurs(texte: string): ScreenValues {
  const lines = texte.split("\n");
  const values: ScreenValues = { tables: [], labelled: {} };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("\t")) {
      const table: Table = { headers: cells(lines[i]), rows: [] };
      let row = "";
      // A cell that holds a block spreads over several lines: a row is complete once it has every tab of the header.
      // The table ends at a line without tab that the next line does not carry on.
      for (i++; i < lines.length; i++) {
        if (!row.trim() && lines[i].trim() && !lines[i].includes("\t") && !lines[i + 1]?.startsWith("\t")) break;
        row += `\n${lines[i]}`;
        if (row.split("\t").length < table.headers.length) continue;
        if (/^total\b/i.test(row.trim())) table.total = cells(row);
        else table.rows.push(cells(row));
        row = "";
      }
      i--;
      values.tables.push(table);
      continue;
    }
    const line = lines[i].trim();
    const previous = i > 0 && !lines[i - 1].includes("\t") ? lines[i - 1].trim() : "";
    const pair = /^(.+?)\s:\s(.+)$/.exec(line);
    const counter = /^(\d+)\sfactures?$/.exec(line);
    if (pair) {
      const label = normalize(pair[1]);
      values.labelled[label] = pair[2];
      if (/^aujourd.hui$/i.test(label)) values.today = pair[2];
      if (/^filtrer$/i.test(label)) values.filter = pair[2];
    } else if (counter) values.count = { value: Number(counter[1]), text: line };
    else if (STARTS_WITH_NUMBER.test(line) && previous && !STARTS_WITH_NUMBER.test(previous)) values.labelled[normalize(previous)] = line;
  }
  return values;
}

// An amount in whole cents, never a float. null when the text is not an amount.
export function readCents(text: string): number | null {
  const amount = /^(-?)(\d{1,3}(?: \d{3})+|\d+),(\d{2})(?: €)?$/.exec(normalize(text));
  return amount ? (amount[1] ? -1 : 1) * (Number(amount[2].replaceAll(" ", "")) * 100 + Number(amount[3])) : null;
}

const parts = (cents: number) => [cents < 0 ? "-" : "", String(Math.trunc(Math.abs(cents) / 100)), String(Math.abs(cents) % 100).padStart(2, "0")];

// 142000 gives « 1 420,00 » (for a sentence) and « 1420.00 » (for ResultatVerification.valeurs).
export function showCents(cents: number): string {
  const [sign, units, rest] = parts(cents);
  return `${sign}${units.replace(/\B(?=(\d{3})+$)/g, " ")},${rest}`;
}

export function plainCents(cents: number): string {
  const [sign, units, rest] = parts(cents);
  return `${sign}${units}.${rest}`;
}

// JJ/MM/AAAA as the number AAAAMMJJ, which sorts like the date. null when the text is not a date.
export function readDate(text: string): number | null {
  const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalize(text));
  if (!date) return null;
  const [day, month, year] = date.slice(1).map(Number);
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 ? year * 10000 + month * 100 + day : null;
}
