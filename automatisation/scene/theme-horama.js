// Theme of the Horama layer: the Greek « Musée » art direction of the CDO (scene, mascot, end summary).
// One function expression, like couche-horama.js: called once in the page, it returns what the layer takes from it.
//   css      appended after the layer's own <style>, so its rules win at equal specificity
//   sprites  the five states of the mascot (the reference winged eye, read from the face alone, no badge)
//   stamps   the words of the status tags
//   logo     the CDO's exact logo, as an image on its cream plate
//   numero   n (1, 2, 3…) → the letter of a finding (Α, Β, Γ…)
//   banniere "bas": the banner sits at the bottom, so that the top line of the tested site stays visible
//            (the black announcement line of eugeniaschool.com, the top bar and the date of Facturo)
//   recap    draws the end screen into the layer's `.end` element
// Fonts: system ones only (Georgia, Segoe UI), the layer lives in the tested page and loads nothing from the web.
// Contrast: coral, lime and lavender are only fills, with dark violet text on them; text on the light backgrounds
// uses darker tones, all ≥ 4.5:1 (WCAG AA).
(function horamaTheme() {
  const LOGO_PNG = "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";
  const C = {
    ink: "#2B2B2B", // line of the eye
    night: "#2A2163", // dark violet: text on the coloured fills
    ink2: "#3B3654", // soft violet: banner, titles
    mid: "#544F73", // secondary text (6.5:1 on lilac)
    lilac: "#ECE9F5", // veil
    card: "#E2DDF1", // bubbles, cards
    paper: "#F3EBDD",
    iris: "#7F77DD",
    wing: "#AFA9EC",
    lav: "#C9C4E2",
    ko: "#F26B5B", koT: "#A63E28",
    ok: "#B6E36B", okT: "#4A6B1C",
  };
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const GREEK = ["Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ"];
  const meander = (stroke) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8'%3E%3Cpath d='M0 7.5h12V.5H3v4h5V3' fill='none' stroke='${encodeURIComponent(stroke)}' stroke-width='1.2'/%3E%3C/svg%3E")`;

  // ---------- The mascot: the CDO's reference winged eye (draft.eye.mp4), states read from the face ----------
  const wingShape = "M33 36C29 33.5 25 32.5 21.5 33C18 33.5 16.3 35.5 17 38.3C17.8 41.2 21.5 43.4 25 44.4C21 45.6 19.3 47.8 19.8 50.2C20.3 52.6 23.5 53 27 52.4C29.5 52 31.5 51.6 33 51Z";
  const wings = `<g fill="${C.wing}" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"><path class="wing wing-l" d="${wingShape}"/><g transform="translate(96 0) scale(-1 1)"><path class="wing wing-l" d="${wingShape}"/></g></g>`;
  const eye = (iris, pupil = 5.4, lid = "") => `<g class="eyeball"><circle cx="48" cy="48" r="20" fill="#fff" stroke="${C.ink}" stroke-width="2.4"/>
    <g class="pupils"><g class="scan"><circle cx="48" cy="48" r="11.6" fill="${iris}" stroke="${C.ink}" stroke-width="1.6"/><circle cx="48" cy="48" r="${pupil}" fill="${C.ink}"/><circle cx="44.2" cy="44.2" r="1.9" fill="#fff"/></g></g>${lid}</g>`;
  const brows = (d, width = 3.5) => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="${width}" stroke-linecap="round"/>`;
  const svg = (inside) => `<svg viewBox="0 0 96 96">${wings}${inside}</svg>`;
  const sprites = {
    repos: svg(eye(C.iris)),
    verification: svg(`<path d="M22 31v-9h9M65 22h9v9M74 65v9h-9M31 74h-9v-9" fill="none" stroke="${C.iris}" stroke-width="4"/>`
      + eye(C.iris, 4.6, `<path d="M29.3 41A20 20 0 0 1 66.7 41Z" fill="${C.wing}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`)),
    interrogation: svg(brows("M28 23Q37 13 47 19") + brows("M53 25Q61 23 68 26") + eye(C.iris)),
    defaut: svg(brows("M28 21L45 29", 4) + brows("M68 21L51 29", 4) + eye(C.ko, 3.4)),
    conforme: svg(eye(C.ok, 4.6, `<path d="M30.7 58A20 20 0 0 0 65.3 58Q48 48 30.7 58Z" fill="${C.wing}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>`)),
  };
  const logo = `<img alt="HORAMA" src="data:image/png;base64,${LOGO_PNG}">`;
  const stamps = { conforme: "Conforme", defaut: "Défaut prouvé", doute: "À trancher", bug: "Bug noté", voulu: "Voulu" };

  const css = `
    /* status tags: a filled pill, dark text, no rotation, sentence case */
    .stamp { padding: 5px 12px; border: 0; border-radius: 14px; color: ${C.night}; font: 600 14px/1.2 ${SANS}; letter-spacing: 0; text-transform: none; transform: none; }
    .stamp.conforme, .stamp.voulu { background: ${C.ok}; color: ${C.night}; }
    .stamp.defaut, .stamp.bug { background: ${C.ko}; color: ${C.night}; }
    .stamp.doute { background: ${C.lav}; color: ${C.night}; }
    .zone .stamp.conforme, .zone .stamp.voulu { background: ${C.ok}; }
    .zone .stamp.defaut, .zone .stamp.bug { background: ${C.ko}; }
    .zone .stamp.doute { background: ${C.lav}; }
    @keyframes thunk { from { opacity: 0; transform: translateY(6px) scale(.9); } to { opacity: 1; transform: none; } }
    @keyframes bump-stamp { 30% { transform: scale(1.12); } }
    .banner .stamp { transform: none; }

    /* zones: a thin frame instead of the felt pen; the number is a coin with a Greek letter */
    .rough-annotation { display: none !important; }
    .zone.done.defaut { background: ${C.ko}1f; outline: 2px solid ${C.koT}; outline-offset: 6px; }
    .zone.doute { outline-width: 2px; }
    .zone.done.doute { outline-color: ${C.mid}; background: ${C.lav}40; }
    .zone b { min-width: 34px; width: 34px; height: 34px; padding: 0; border-radius: 50%; color: ${C.paper}; font: 400 19px/34px ${SERIF};
      box-shadow: inset 0 0 0 1.5px ${C.ink2}; outline: 2px dotted ${C.paper}; outline-offset: 1px; }
    .zone.doute b { background: ${C.mid}; }
    .zone.defaut b { background: ${C.koT}; }
    .zone.old { border: 2px dashed ${C.mid}; }
    .zone.old::after { content: "Avant"; padding: 2px 8px; background: ${C.lilac}; color: ${C.mid}; font: 600 14px/1.3 ${SANS}; letter-spacing: 0; }

    /* the veil of the review: lilac, not night */
    .dim path { fill: ${C.lilac}; fill-opacity: .9; }

    /* banner at the bottom: the top line of the site stays visible */
    .banner { top: auto; bottom: 12px; height: 60px; gap: 22px; padding: 0 20px; background: ${C.ink2}; color: ${C.paper}; font: 400 19px/1 ${SERIF}; }
    .banner::before { content: ""; position: absolute; left: 0; right: 0; top: -11px; height: 8px; background: ${meander(C.mid)} repeat-x; opacity: .85; }
    .banner .title { opacity: 1; margin-right: 6px; }
    .logo { display: inline-block; padding: 5px 9px; background: #F2ECDD; line-height: 0; }
    .logo img { display: block; height: 24px; width: auto; }

    /* bubbles: lilac cards, serif voice; the colour of the genre is a left edge, not a fill */
    .bubble { padding: 16px 22px; background: ${C.card}; color: ${C.ink2}; font: 400 24px/1.32 ${SERIF}; border: 1px solid ${C.ink2}22; box-shadow: 0 16px 40px ${C.ink2}26; }
    .bubble.right::before { border-right-color: var(--bg, ${C.card}); }
    .bubble.left::before { border-left-color: var(--bg, ${C.card}); }
    .bubble.conforme { --bg: ${C.card}; background: ${C.card}; color: ${C.ink2}; border-left: 5px solid ${C.okT}; }
    .bubble.defaut { --bg: ${C.card}; background: ${C.card}; color: ${C.ink2}; border-left: 5px solid ${C.koT}; }
    .bubble.doute { --bg: ${C.card}; background: ${C.card}; color: ${C.ink2}; border-left: 5px solid ${C.mid}; }
    .bubble.ask { padding: 34px 30px 28px; font-size: 30px; line-height: 1.22; background: ${C.card} ${meander(C.mid)} repeat-x 0 10px / 16px 8px; }
    .rank { margin-bottom: 12px; color: ${C.mid}; font: 600 15px/1 ${SANS}; letter-spacing: 0; text-transform: none; }
    .choice { padding: 17px 20px; color: ${C.night}; font: 600 19px/1 ${SANS}; letter-spacing: 0; text-transform: none; }
    .choice.loupe { padding: 11px 20px; background: transparent; border: 1.5px solid ${C.ink2}; color: ${C.ink2}; font: 600 15px/1 ${SANS}; }
    .choices.made .choice.chosen { outline: 2px solid ${C.ink2}; outline-offset: 4px; }
    .bubble > .stamp { top: -16px; font-size: 15px; }
    .correction-file { color: ${C.mid}; font: 400 15px/1.4 ui-monospace, Consolas, monospace; }
    .correction-after { color: ${C.okT}; }

    /* the loupe: fine lines */
    .lens { border: 2px solid ${C.ink2}; outline: 1px solid ${C.wing}; outline-offset: 6px; }
    .handle { width: 8px; margin-left: -4px; background: ${C.ink2}; }
    .lens .mark.defaut { outline: 2px solid ${C.koT}; }
    .lens .mark.doute { outline: 2px dashed ${C.mid}; }
    .ripple { border-color: ${C.mid}; }

    /* the end summary: a temple drawn in hairlines, the register of decisions */
    .end { width: 940px; padding: 74px 70px 46px; background: ${C.lilac}; color: ${C.ink2}; font: 400 17px/1.5 ${SANS}; border: 1.5px solid ${C.ink2}; box-shadow: 0 30px 80px ${C.ink2}40; }
    .end .temple { position: absolute; inset: 10px 12px 12px; width: calc(100% - 24px); height: calc(100% - 22px); }
    .end .kick { position: relative; color: ${C.mid}; font: 600 15px/1 ${SANS}; }
    .end .kick i { font: italic 400 19px ${SERIF}; }
    .end h1 { position: relative; margin: 10px 0 8px; font: 400 56px/1.05 ${SERIF}; color: ${C.ink2}; }
    .end h1 em { font-style: italic; }
    .end p { position: relative; margin: 0 0 22px; font: 400 21px/1.4 ${SERIF}; color: ${C.mid}; }
    .end .head { position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
    .end .reg { position: relative; margin-top: 8px; background: ${C.card}; border: 1px solid ${C.ink2}55; padding: 6px 22px; }
    .end .reg .row { display: grid; grid-template-columns: 40px 1fr; gap: 14px; align-items: center; padding: 11px 0; border-bottom: 1px solid ${C.ink2}22; }
    .end .reg .row:last-child { border-bottom: 0; }
    .end .coin { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: ${C.ink2}; color: ${C.paper}; font: 400 17px ${SERIF}; outline: 2px dotted ${C.ink2}; outline-offset: 1px; }
    .end .file { font: 400 15px/1.4 ui-monospace, Consolas, monospace; color: ${C.ink2}; overflow-wrap: anywhere; }
    .end small { position: relative; display: block; margin: 16px 0 0; font: 400 15px/1.4 ${SANS}; letter-spacing: 0; text-transform: none; opacity: 1; color: ${C.mid}; }
  `;

  // The end summary, drawn in the layer's `.end` element. Texts go in with textContent (never as HTML).
  function recap(end, { titre, compte, legende, fichiers }) {
    const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text != null ? { textContent: text } : {});
    const ns = "http://www.w3.org/2000/svg";
    const temple = document.createElementNS(ns, "svg");
    temple.setAttribute("class", "temple");
    temple.setAttribute("viewBox", "0 0 916 600");
    temple.setAttribute("preserveAspectRatio", "none");
    const flute = (x) => `<rect x="${x}" y="40" width="22" height="548"/><line x1="${x + 7}" y1="48" x2="${x + 7}" y2="580"/><line x1="${x + 15}" y1="48" x2="${x + 15}" y2="580"/><rect x="${x - 5}" y="34" width="32" height="6"/><rect x="${x - 6}" y="588" width="34" height="6"/>`;
    temple.innerHTML = `<g fill="none" stroke="${C.mid}" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".7"><path d="M4 26L458 2L912 26Z"/><rect x="4" y="26" width="908" height="8"/>${flute(10)}${flute(884)}</g>`;
    const head = el("div", "head");
    const left = el("div");
    const kick = el("div", "kick");
    kick.append(el("i", "", "ὅραμα"), document.createTextNode(" · ce qui est vu · fin de la visite"));
    left.append(kick);
    const plate = el("span", "logo");
    plate.innerHTML = logo;
    head.append(left, plate);
    const h1 = el("h1", "", titre || "Tout est tranché.");
    const reg = el("div", "reg");
    (fichiers ?? []).forEach((file, index) => {
      const row = el("div", "row");
      row.append(el("span", "coin", GREEK[index] ?? String(index + 1)), el("span", "file", String(file).split(/[\\/]/).pop()));
      reg.append(row);
    });
    end.replaceChildren(temple, head, h1, el("p", "", compte ?? ""), ...(fichiers?.length ? [reg] : []), el("small", "", legende ?? ""));
  }

  return { css, sprites, stamps, logo, numero: (n) => GREEK[n - 1] ?? String(n), banniere: "bas", recap };
})
