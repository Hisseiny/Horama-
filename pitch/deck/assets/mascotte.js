// Mascotte d'Horama : l'œil ailé d'Inès (CDO), son dessin repris tel quel depuis
// automatisation/scene/couche-horama.js (ailes lilas, œil rond, badge par état).
// Seules les couleurs d'état, marquées « provisoires » dans le squelette, prennent les pigments
// de la direction : ocre rouge pour un défaut prouvé, ocre jaune pour un doute, bleu égyptien au travail.
// États exposés : regarde (repos), trouve (défaut), doute (interrogation), fini (conforme).
const ENCRE = "#1C1C1C", AILE = "#AFA9EC", IRIS = "#7F77DD";
const C = { trouve: "#B8321F", doute: "#C48A1E", fini: "#2E7D55", travail: "#2453A0" };

const ailes = `<g class="ailes" fill="${AILE}" stroke="${ENCRE}" stroke-width="2.5" stroke-linejoin="round">
  <path class="aile g" d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z"/>
  <path class="aile d" d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z"/></g>`;
const oeil = `<g class="globe"><circle cx="48" cy="48" r="20" fill="#fff" stroke="${ENCRE}" stroke-width="3"/>
  <g class="pupilles"><circle class="iris" cx="48" cy="48" r="10.5" fill="${IRIS}"/><circle class="pupille" cx="48" cy="48" r="4.6" fill="${ENCRE}"/><circle cx="51.6" cy="44.4" r="2.2" fill="#fff"/></g></g>`;
const cadre = `<path class="cadre" d="M22 31v-9h9M65 22h9v9M74 65v9h-9M31 74h-9v-9" fill="none" stroke="${C.travail}" stroke-width="4"/>`;
const badge = (cls, coul, dedans) => `<g class="badge ${cls}"><rect x="66" y="6" width="22" height="22" fill="${coul}" stroke="${ENCRE}" stroke-width="2.5"/>${dedans}</g>`;
const signe = t => `<text x="77" y="23.5" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="17" font-weight="800" text-anchor="middle">${t}</text>`;

function creerMascotte(taille = 96) {
  const wrap = document.createElement("div");
  wrap.className = "mascotte regarde";
  wrap.style.width = wrap.style.height = taille + "px";
  wrap.innerHTML = `<svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true" overflow="visible"><g class="corps">${ailes}${cadre}${oeil}
    ${badge("b-trouve", C.trouve, signe("!"))}${badge("b-doute", C.doute, signe("?"))}${badge("b-fini", C.fini, `<path d="M71 17.5l4 4 7.5-8" fill="none" stroke="#fff" stroke-width="3"/>`)}</g></svg>`;
  const pup = wrap.querySelector(".pupilles"), iris = wrap.querySelector(".iris");
  return {
    el: wrap,
    etat(e) { wrap.className = "mascotte " + e; iris.setAttribute("fill", e === "trouve" ? C.trouve : e === "doute" ? C.doute : e === "fini" ? C.fini : IRIS); },
    regarder(dx, dy) {
      const k = Math.hypot(dx, dy) > 1 ? 1 / Math.hypot(dx, dy) : 1;
      pup.setAttribute("transform", `translate(${(dx * k * 7).toFixed(2)} ${(dy * k * 7).toFixed(2)})`);
    },
  };
}

const css = `
.mascotte { display:block; position:relative; }
.mascotte svg { display:block; filter: drop-shadow(0 0 1px #F7F3EA) drop-shadow(0 3px 6px rgba(20,24,36,.18)); }
.mascotte .corps { animation: flotte 3.2s ease-in-out infinite; }
.mascotte .aile.g { transform-origin: 30px 46px; animation: battre-g 2.4s ease-in-out infinite; }
.mascotte .aile.d { transform-origin: 66px 46px; animation: battre-d 2.4s ease-in-out infinite; }
.mascotte .pupilles { transition: transform .35s cubic-bezier(.33,1,.68,1); }
.mascotte .iris { transition: fill .3s; }
.mascotte .cadre { opacity: 0; transition: opacity .3s; }
.mascotte .badge { opacity: 0; transform: translateY(4px) scale(.6); transform-origin: 77px 17px; transition: opacity .25s, transform .4s cubic-bezier(.16,1,.3,1); }
.mascotte.trouve .b-trouve, .mascotte.doute .b-doute, .mascotte.fini .b-fini { opacity: 1; transform: none; }
.mascotte.trouve .aile { animation-duration: .5s; }
.mascotte.fini .corps { animation-duration: 4.5s; }
@keyframes flotte { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes battre-g { 0%,100% { transform: rotate(0); } 50% { transform: rotate(9deg); } }
@keyframes battre-d { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-9deg); } }
@media (prefers-reduced-motion: reduce) { .mascotte .corps, .mascotte .aile { animation: none; } }
`;
const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
