import "./comparaison.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Highlight } from "../../../../../components/Highlight";
import { Screenshot, type Zone } from "../../../../../components/Screenshot";
import { LOGICIEL } from "../../../../../lib/config";
import { lireCaptures, lirePassage, lireReferences, lireResultats, listerEcrans } from "../../../../../lib/donnees";
import { measure } from "../../../../../lib/format";
import { screenshot } from "../../../../../lib/screenshots";
import { ETAT_DU_STATUT, LIBELLE_STATUT, parGravite } from "../../../../../lib/states";
import { Comparison, type View } from "./Comparison";

const VIEWS: [View, string][] = [["cote", "Côte à côte"], ["rideau", "Rideau"], ["pixels", "Pixels bruts"]];

// Step 5. One screen, the reference version against the tested version, three ways to look at it.
export default async function ComparisonPage({ params, searchParams }: {
  params: Promise<{ id: string; ecran: string }>;
  searchParams: Promise<{ vue?: string }>;
}) {
  const { id, ecran } = await params;
  const { vue } = await searchParams;
  const view = VIEWS.find(([v]) => v === vue)?.[0] ?? "cote";
  const [passage, l, captures, resultats, references] = await Promise.all([
    lirePassage(id), listerEcrans(LOGICIEL), lireCaptures(id), lireResultats(id), lireReferences(LOGICIEL),
  ]);
  const screen = l.ecrans.find((e) => e.id === ecran);
  const reference = references.find((r) => r.ecran === ecran);
  const tested = captures.find((c) => c.ecran === ecran && c.vue === reference?.vue);
  if (!passage || !screen || !reference || !tested) notFound();

  const visuals = resultats.flatMap((r) => r.ecarts_visuels).filter((e) => e.ecran === ecran && e.vue === reference.vue);
  const zones: Zone[] = visuals.map((e, i) => ({ numero: i + 1, etat: ETAT_DU_STATUT[e.statut], ...e.zone }));
  const rules = resultats
    .filter((r) => r.regle && r.ecrans.includes(ecran))
    .sort((a, b) => parGravite(ETAT_DU_STATUT[a.statut], ETAT_DU_STATUT[b.statut]));
  const count = visuals.filter((e) => e.statut !== "PASS").length + rules.filter((r) => r.statut !== "PASS").length;
  // The example result carries "à calculer" instead of a diff image: its zone count is not a measure yet.
  const raw = resultats.find((r) => r.pixels_bruts && r.ecrans.includes(ecran))?.pixels_bruts;
  const rawZones = raw && /^(\/|https?:)/.test(raw.image_url) ? raw.zones : undefined;
  // Views of this screen that have no reference capture: not compared, only verified by their rules.
  const alone = captures.filter((c, i) => c.ecran === ecran && !references.some((r) => r.ecran === ecran && r.vue === c.vue) && captures.findIndex((x) => x.url === c.url) === i);
  const here = `/passages/${id}/comparaison`;

  return (
    <>
      <header className="comparaison-tete">
        <div>
          <h1>{screen.titre}</h1>
          <p>Version {reference.version}, la référence, contre la version {tested.version}, testée. Vue <code>{reference.vue}</code>.</p>
        </div>
        <nav aria-label="Écrans du passage">
          {l.ecrans.map((e) => (
            <Link key={e.id} href={`${here}/${e.id}`} aria-current={e.id === ecran ? "page" : undefined}>{e.titre}</Link>
          ))}
        </nav>
      </header>

      <nav className="onglets" aria-label="Vue de la comparaison">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={`${here}/${ecran}${v === "cote" ? "" : `?vue=${v}`}`} aria-current={v === view ? "page" : undefined}>{label}</Link>
        ))}
      </nav>

      <Comparison
        view={view}
        reference={{ ...screenshot(reference.url), version: reference.version }}
        tested={{ ...screenshot(tested.url), version: tested.version }}
        zones={zones}
        rawZones={rawZones}
        count={count}
      />

      <table className="ecarts">
        <caption>Écarts et règles vérifiées sur cet écran</caption>
        <thead>
          <tr><th>N°</th><th>Ce qu'Horama a relevé</th><th>Statut</th><th>Mesure ou zone</th><th /></tr>
        </thead>
        <tbody>
          {visuals.map((e, i) => (
            <tr key={e.id}>
              <td className="mono ecart-numero">{i + 1}</td>
              <td><Highlight etat={ETAT_DU_STATUT[e.statut]}>{e.description}</Highlight></td>
              <td>{LIBELLE_STATUT[e.statut]}</td>
              <td className="mono">zone x {e.zone.x}, y {e.zone.y}, {e.zone.largeur} × {e.zone.hauteur}</td>
              <td>{e.statut === "SUSPECTED" && <Link href="/relecture">Trancher</Link>}</td>
            </tr>
          ))}
          {rules.map((r) => (
            <tr key={r.test_id}>
              <td />
              <td><Highlight etat={ETAT_DU_STATUT[r.statut]}>{l.tests.find((t) => t.id === r.test_id)?.phrase ?? r.test_id}</Highlight></td>
              <td>{LIBELLE_STATUT[r.statut]}</td>
              <td className="mono ecart-mesure">{measure(r)}</td>
              <td>{r.statut !== "PASS" && <Link href="/relecture">Trancher</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {alone.map((c) => (
        <section key={c.url} className="vue-seule">
          <div>
            <h2>Vue <code>{c.vue}</code></h2>
            <p>Aucune capture de référence en version {reference.version} pour cette vue : elle n'est pas comparée, elle est vérifiée par ses règles seulement.</p>
          </div>
          <Screenshot image={screenshot(c.url)} legende={`Version ${c.version}, testée.`} />
        </section>
      ))}
    </>
  );
}
