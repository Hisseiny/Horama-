const TYPES = {
  "lien-casse": "Lien cassé", "page-erreur": "Page en erreur", "image-cassee": "Image cassée",
  "texte-non-traduit": "Texte non traduit", "texte-coupe": "Texte coupé", "texte-rogne": "Texte rogné", debordement: "Débordement",
  "defilement-horizontal": "Défilement horizontal", "texte-erreur": "Texte d'erreur", "erreur-console": "Erreur de console",
};

const singleLine = (value) => String(value ?? "à mesurer").replace(/\s+/g, " ").trim();
const text = (value) => singleLine(value).replace(/[\\`*_{}\[\]<>!@~|]/g, "\\$&");
const pageOf = (report, screen) => report.pages.find((page) => page.ecran === screen);

export function fingerprintOf(report, finding) {
  const page = pageOf(report, finding.ecran);
  return JSON.stringify([page ? new URL(page.url).pathname : finding.ecran, finding.sorte, finding.preuve?.element ?? finding.description]);
}

export const fingerprintMarker = (fingerprint) => `<!-- horama-empreinte: ${encodeURIComponent(fingerprint).replaceAll("-", "%2D")} -->`;
export const ticketMarkdown = ({ title, body }) => `# ${text(title)}\n\n${body}`;

function stepsOf(report, page, agent, proof) {
  const index = agent?.pages?.indexOf(page?.ecran) ?? -1;
  const visited = index < 0 ? [] : agent.pages.slice(0, index + 1).map((screen) => pageOf(report, screen)).filter(Boolean);
  if (page && !visited.includes(page)) visited.push(page);
  const steps = visited[0]?.arrivee === "depart" ? [] : [`Adresse de départ du passage : ${text(report.adresse)}.`];
  for (const visit of visited) {
    const url = text(visit.url);
    if (visit.arrivee === "depart") steps.push(`Commencer sur ${url}.`);
    else if (visit.arrivee === "clic") steps.push(`Suivre le lien utilisé par H vers ${url} (cible exacte du clic : à mesurer).`);
    else if (visit.arrivee === "adresse") steps.push(`Ouvrir directement ${url} (go_to).`);
    else steps.push(`Page visitée : ${url} (mode d'arrivée : à mesurer).`);
  }
  if (proof.element) steps.push(`Observer l'élément ${text(proof.element)}.`);
  return steps.map((step, index) => `${index + 1}. ${step}`);
}

export function writeTicket({ report, finding, decision, note, environment = {} }) {
  if (finding?.statut !== "VERIFIED_FAIL" || decision?.decision !== "bug" || decision.ecart_id !== finding.id || decision.passage_id !== report.passage_id) return null;
  const page = pageOf(report, finding.ecran);
  const agent = report.agents?.find((agent) => agent.agent === finding.agent);
  const proof = finding.preuve ?? {};
  const size = finding.page ?? page?.capture;
  const fingerprint = fingerprintOf(report, finding);
  const kind = Object.hasOwn(TYPES, finding.sorte) ? TYPES[finding.sorte] : singleLine(finding.sorte);
  const target = finding.textes_a_surligner?.[0] || proof.url || proof.element;
  const element = target && singleLine(target);
  const title = `${kind} : ${element ? `« ${element.length > 80 ? element.slice(0, 79) + "…" : element} » — ` : ""}${singleLine(finding.description).replace(/\.$/, "")}`;
  const body = [
    `**Page** : ${text(page?.url)}`, "",
    "### Reproduire", "", ...stepsOf(report, page, agent, proof), "",
    "### Mesuré / attendu", "",
    `- Mesuré : ${text(proof.mesure)}`, `- Attendu : ${text(proof.attendu)}`,
    ...(page?.http == null ? [] : [`- Code HTTP de la page : ${page.http}`]),
    ...(proof.url ? [`- Adresse visée : ${text(proof.url)}`] : []),
    ...(proof.console ? [`- Console : ${text(proof.console)}`] : []), "",
    "### Preuve", "",
    ...(note ? [`- Note du passage (vault Horama) : ${text(note)}`]
      : [agent?.replay_url ? `- Replay H : ${text(agent.replay_url)}` : `- Rapport du passage : ${text(report.passage_id)}`]),
    ...(finding.zone ? [`- Zone sur la capture : x=${finding.zone.x}, y=${finding.zone.y}, ${finding.zone.largeur} × ${finding.zone.hauteur} px`] : []), "",
    "### Environnement", "",
    `- Navigateur du passage : ${text(environment.browser)}`,
    `- Taille de la capture : ${size?.largeur && size.hauteur ? `${size.largeur} × ${size.hauteur} px` : "à mesurer"}`,
    `- Adresse du passage : ${text(report.adresse)}`, `- Date : ${text(report.le)}`,
    ...(environment.commit ? [`- Commit : ${text(environment.commit)}`] : []), "",
    "### Décision humaine", "", `« bug », par ${text(decision.par)}, le ${text(decision.le)}.`, "",
    fingerprintMarker(fingerprint), "",
  ].join("\n");
  return { title, body, fingerprint };
}
