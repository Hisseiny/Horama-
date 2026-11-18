// The mascot of the charter (docs/da/mascotte/, PR #130, copied in mascotte/): its SVG put inline in an element, so that
// its wings and its eye move (commun.css). poserMascotte(element, etat): observe, trouve, doute, bloquee or fini.
const DESSINS = {};
async function poserMascotte(element, etat) {
  if (element.dataset.etat === etat) return;
  element.dataset.etat = etat;
  DESSINS[etat] ??= fetch(`mascotte/${etat}.svg`).then((response) => response.text());
  const svg = await DESSINS[etat];
  if (element.dataset.etat === etat) element.innerHTML = svg.replace(/<title>[^<]*<\/title>/, "");
}
