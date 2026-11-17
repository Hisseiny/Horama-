import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Shell as ShellType } from "../app/shell.tsx";

// node --test strips the types of .ts files but cannot load .tsx: the shell is transpiled
// (babel bundled in next) to a temporary .mjs next to it, so its relative imports still resolve.
const require = createRequire(import.meta.url);
const babel = require("next/dist/compiled/babel/core") as { transformSync(source: string, options: object): { code: string } };
const compiled = new URL("../app/shell.test-generated.mjs", import.meta.url);
const { code } = babel.transformSync(readFileSync(new URL("../app/shell.tsx", import.meta.url), "utf8"), {
  filename: "shell.tsx",
  presets: [
    require.resolve("next/dist/compiled/babel/preset-typescript"),
    [require.resolve("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }],
  ],
});
writeFileSync(compiled, code);
after(() => rmSync(compiled, { force: true }));
const { Shell } = (await import(compiled.href)) as { Shell: typeof ShellType };

const render = (version: "12" | "13") =>
  renderToStaticMarkup(createElement(Shell, { version, active: "tableau-de-bord", children: "contenu" }));

test("le bouton « Mode sombre » est le dernier élément de l'en-tête, en v12 comme en v13", () => {
  for (const version of ["12", "13"] as const) {
    const markup = render(version);
    assert.match(markup, /<button type="button" class="darkmode" data-darkmode="[^"]*">Mode sombre<\/button>/, version);
    assert.ok(markup.indexOf("Se déconnecter") < markup.indexOf("Mode sombre"), `${version} : « Se déconnecter » à gauche du bouton`);
    assert.ok(markup.lastIndexOf("Mode sombre") < markup.indexOf("</header>"), `${version} : le bouton est dans l'en-tête`);
    assert.ok(!markup.includes(">Revenir au mode clair<"), `${version} : le rendu initial annonce « Mode sombre »`);
  }
});

// Runs the script shipped in the markup against a minimal DOM: a click toggles the theme class
// and the label, a second click restores them, a click elsewhere does nothing.
test("au clic, le thème bascule et le libellé devient « Revenir au mode clair », et revient au second clic", () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(render("13"))?.[1];
  assert.ok(script, "le script de bascule est rendu avec le cadre");
  for (const banned of ["localStorage", "sessionStorage", "cookie", "location", "prefers-color-scheme"]) {
    assert.ok(!script.includes(banned), `le script ne touche pas ${banned}`);
  }

  class Element {
    isButton = false;
    textContent = "";
    closest(selector: string): Element | null {
      return selector === "[data-darkmode]" && this.isButton ? this : null;
    }
  }
  const classes = new Set<string>();
  const listeners: Record<string, (event: { target: unknown }) => void> = {};
  const document = {
    documentElement: {
      classList: {
        toggle: (name: string) => (classes.has(name) ? (classes.delete(name), false) : (classes.add(name), true)),
      },
    },
    addEventListener: (type: string, listener: (event: { target: unknown }) => void) => {
      listeners[type] = listener;
    },
  };
  new Function("document", "Element", script)(document, Element);
  assert.ok(listeners.click, "le script écoute les clics");

  const button = new Element();
  button.isButton = true;
  button.textContent = "Mode sombre";

  listeners.click({ target: new Element() });
  assert.deepEqual([...classes], [], "un clic hors du bouton ne fait rien");

  listeners.click({ target: button });
  assert.ok(classes.has("sombre"), "le thème sombre est posé sur l'élément racine");
  assert.equal(button.textContent, "Revenir au mode clair");

  listeners.click({ target: button });
  assert.deepEqual([...classes], [], "le second clic retire le thème sombre");
  assert.equal(button.textContent, "Mode sombre");
});

test("l'état n'est pas gardé : un chargement repart toujours en thème clair", () => {
  for (const version of ["12", "13"] as const) {
    const markup = render(version);
    assert.ok(!markup.includes('class="sombre"'), `${version} : aucune classe « sombre » au chargement`);
    assert.ok(markup.includes(">Mode sombre<"), `${version} : libellé « Mode sombre » au chargement`);
  }
});
