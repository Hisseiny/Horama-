import { INVOICES, formatAmount, formatDate, sum, today } from "../../../lib/data.ts";
import { openPage } from "../../../lib/session.ts";
import { Shell } from "../../shell.tsx";

export default async function Dashboard({ params }: { params: Promise<{ version: string }> }) {
  const { version, on } = await openPage((await params).version, "/tableau-de-bord");
  const revenue = sum(INVOICES) - (on("ca-mois") ? 18000 : 0);
  const count = INVOICES.length - (on("nombre-factures") ? 1 : 0);
  const late = INVOICES.filter((invoice) => invoice.due < today()).length;
  const upcoming = INVOICES.filter((invoice) => invoice.due >= today());

  return (
    <Shell version={version} active="tableau-de-bord">
      <h1 data-zone="titre-page">{on("titre-tableau-de-bord") ? "Vue d'ensemble" : "Tableau de bord"}</h1>
      <div className="cards">
        <div className="card">
          <div className="card-label">CA du mois</div>
          <div className="card-value" data-zone="valeur-ca-mois">{formatAmount(revenue)}</div>
        </div>
        <div className="card">
          <div className="card-label">Factures du mois</div>
          <div className="card-value" data-zone="valeur-factures-mois">{count}</div>
        </div>
        <div className="card">
          <div className="card-label">Factures en retard</div>
          <div className="card-value">{late}</div>
        </div>
      </div>
      <h2>Prochaines échéances</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: 160 }}>Numéro</th>
            <th style={{ width: 396 }}>Client</th>
            <th style={{ width: 440 }}>Échéance</th>
          </tr>
        </thead>
        <tbody>
          {upcoming.map((invoice) => (
            <tr key={invoice.number}>
              <td>{invoice.number}</td>
              <td>{invoice.client}</td>
              <td>{formatDate(invoice.due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
