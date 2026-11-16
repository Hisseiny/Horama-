import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { INVOICES, formatAmount, sum } from "../lib/data.ts";
import { CHANGES, resolveChanges } from "../regressions.ts";

test("le total de la liste vaut 1 420,00 €", () => {
  assert.equal(formatAmount(sum(INVOICES)), "1\u00a0420,00\u00a0€");
});

test("la somme des lignes de chaque facture vaut son montant", () => {
  for (const invoice of INVOICES) assert.equal(sum(invoice.lines), invoice.amount, invoice.number);
});

test("les identifiants du catalogue sont uniques", () => {
  assert.equal(new Set(CHANGES.map((change) => change.id)).size, CHANGES.length);
});

test("le catalogue compte 10 bugs et 5 changements voulus", () => {
  assert.equal(CHANGES.filter((change) => change.nature === "bug").length, 10);
  assert.equal(CHANGES.filter((change) => change.nature === "voulu").length, 5);
});

test("verite.json est à jour", () => {
  const file = readFileSync(new URL("../verite.json", import.meta.url), "utf8");
  assert.equal(file, `${JSON.stringify(CHANGES, null, 2)}\n`, "relancer : pnpm run verite");
});

test("format des montants", () => {
  assert.equal(formatAmount(0), "0,00\u00a0€");
  assert.equal(formatAmount(5), "0,05\u00a0€");
  assert.equal(formatAmount(18000), "180,00\u00a0€");
  assert.equal(formatAmount(142000), "1\u00a0420,00\u00a0€");
  assert.equal(formatAmount(123456789), "1\u00a0234\u00a0567,89\u00a0€");
});

test("paramètre r", () => {
  assert.deepEqual(resolveChanges("12", null), []);
  assert.deepEqual(resolveChanges("13", null), ["ca-mois", "filtre-echeance", "export-haut"]);
  assert.deepEqual(resolveChanges("13", "aucun"), []);
  assert.deepEqual(resolveChanges("13", "total-liste,ca-mois"), ["ca-mois", "total-liste"]);
  assert.deepEqual(resolveChanges("13", "defaut,total-liste"), ["ca-mois", "filtre-echeance", "total-liste", "export-haut"]);
  assert.equal(resolveChanges("13", "inconnu"), null);
});
