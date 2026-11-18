import { INVOICES, formatAmount, formatDate, sum, today, type Invoice } from "../../../lib/data.ts";
import { openPage } from "../../../lib/session.ts";
import { Shell } from "../../shell.tsx";

export default async function Invoices({
  params,
  searchParams,
}: {
  params: Promise<{ version: string }>;
  searchParams: Promise<{ filtre?: string | string[] }>;
}) {
  const { version, on } = await openPage((await params).version, "/factures");
  const base = `/v${version}/factures`;
  const filters: { id: string; label: string; keep: (invoice: Invoice) => boolean }[] = [
    { id: "", label: "Toutes", keep: () => true },
    { id: "a-venir", label: "À venir", keep: (invoice) => invoice.due >= today() },
  ];
  if (version === "13") {
    filters.push({
      id: "echeance-depassee",
      label: "Échéance dépassée",
      keep: (invoice) => invoice.due < today() || (on("filtre-echeance") && invoice.number === "F-120"),
    });
  }
  const { filtre } = await searchParams;
  const filter = filters.find((candidate) => candidate.id === filtre) ?? filters[0];
  const rows = INVOICES.filter(filter.keep);
  const total = sum(rows) - (on("total-liste") ? 2000 : 0) - (on("arrondi-total-liste") ? 1 : 0);
  const exportButton = <button type="button" className="export" data-zone="bouton-exporter">Exporter</button>;

  return (
    <Shell version={version} active="factures">
      <h1>Factures</h1>
      <div className="toolbar">
        <details className="filter">
          <summary>
            {`Filtrer : ${filter.label}`}
            <svg width="10" height="6" viewBox="0 0 10 6">
              <path d="M0 0h10L5 6z" fill="#5b6878" />
            </svg>
          </summary>
          <div className="filter-menu">
            {filters.map((option) => (
              <a key={option.id} className={option === filter ? "on" : undefined} href={option.id ? `${base}?filtre=${option.id}` : base}>
                {option.label}
              </a>
            ))}
          </div>
        </details>
        {on("bouton-nouvelle-facture") && (
          <button type="button" className="primary new" data-zone="bouton-nouvelle-facture">Nouvelle facture</button>
        )}
        {on("export-haut") && exportButton}
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 160 }}>Numéro</th>
            <th style={{ width: 396 }} data-zone="entete-client">{on("colonne-renommee") ? "Société" : "Client"}</th>
            <th style={{ width: 200 }}>Échéance</th>
            <th style={{ width: 240 }} className="amount">Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((invoice) => (
            <tr key={invoice.number} data-zone={`ligne-${invoice.number}`}>
              <td>
                <a href={`${base}/${invoice.number}`}>{invoice.number}</a>
              </td>
              <td>
                <span className={on("client-tronque") ? "client cut" : "client"} data-zone="cellule-client">{invoice.client}</span>
              </td>
              <td data-zone={`echeance-${invoice.number}`}>
                {on("echeance-vide") && invoice.number === "F-118"
                  ? ""
                  : on("format-date") && invoice.number === "F-121"
                    ? invoice.due
                    : on("echeance-decalee") && invoice.number === "F-119"
                      ? "13/11/2026"
                      : formatDate(invoice.due)}
              </td>
              <td className="amount" data-zone={`montant-${invoice.number}`}>
                {on("format-montant") && invoice.number === "F-119"
                  ? formatAmount(invoice.amount).replace(",", ".")
                  : formatAmount(invoice.amount)}
              </td>
            </tr>
          ))}
          <tr className="total">
            <td>Total</td>
            <td></td>
            <td></td>
            <td className="amount" data-zone="total-liste">{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className={on("chevauchement-total") ? "table-footer up" : "table-footer"} data-zone="pied-tableau">
        <span className="count">{`${rows.length} ${rows.length > 1 ? "factures" : "facture"}`}</span>
        {!on("export-haut") && exportButton}
      </div>
    </Shell>
  );
}
