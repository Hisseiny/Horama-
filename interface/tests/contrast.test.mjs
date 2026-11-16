// Every text colour of the tokens must reach a contrast of 4.5 to 1 on the surfaces it is written on.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../app/tokens.css", import.meta.url), "utf8");
const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))[1];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const pairs = [
  // graphite text on the page, on panels and on the three state colours (highlights and verdict blocks)
  ["encre", "fond"], ["encre", "surface"], ["encre", "etat-conforme"], ["encre", "etat-defaut"], ["encre", "etat-a-trancher"],
  // cream text on the graphite button and on the current step
  ["fond", "encre"],
  // secondary text: on the page and on panels only (inside a verdict block it becomes graphite, see .bloc in globals.css)
  ["texte-second", "fond"], ["texte-second", "surface"],
];

for (const [text, background] of pairs) {
  test(`${text} sur ${background} : au moins 4,5 pour 1`, () => {
    const ratio = contrast(text, background);
    assert.ok(ratio >= 4.5, `${ratio.toFixed(2)} pour 1`);
  });
}
