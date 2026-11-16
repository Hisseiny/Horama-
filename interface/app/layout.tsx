import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import "./tokens.css";
import "./globals.css";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Steps } from "../components/Steps";
import { LOGICIEL } from "../lib/config";
import { derniersFichiersVault, FACTICE, lireResultats, listerEcrans } from "../lib/donnees";

// Every screen reads the vault and the passage at request time.
export const dynamic = "force-dynamic";
// No favicon file: an empty data URL keeps the browser from asking for /favicon.ico.
export const metadata = { title: "Horama", icons: { icon: "data:," } };

const time = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [l, fichiers] = await Promise.all([listerEcrans(LOGICIEL), derniersFichiersVault(8)]);
  const resultats = l.passage_id ? await lireResultats(l.passage_id) : [];
  // The comparison opens on the first screen that has a visual gap.
  const comparaison = resultats.flatMap((r) => r.ecarts_visuels)[0]?.ecran ?? l.ecrans[0]?.id;
  return (
    <html lang="fr">
      <body>
        <header className="entete">
          <div className="entete-ligne">
            <Link href="/" className="marque">Horama</Link>
            <p className="contexte">{l.nom}, version {l.version_testee} testée contre la version {l.version_reference}</p>
            {FACTICE && <p className="factice">Données factices</p>}
            <details className="vault">
              <summary>Vault, dernier fichier modifié le {time(fichiers[0].modifie_le)}</summary>
              <div className="vault-panneau">
                <h3>Les {fichiers.length} derniers fichiers modifiés dans le vault</h3>
                <ul>
                  {fichiers.map((f) => (
                    <li key={f.chemin}><code>{f.chemin}</code><span className="mono">{time(f.modifie_le)}</span></li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
          <Suspense>
            <Steps notes={`/notes/${LOGICIEL}/${l.version_testee}`} passage={l.passage_id} comparaison={comparaison} />
          </Suspense>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
