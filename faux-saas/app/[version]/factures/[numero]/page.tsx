import { notFound } from "next/navigation";
import { INVOICES, formatAmount, formatDate } from "../../../../lib/data.ts";
import { openPage } from "../../../../lib/session.ts";
import { Shell } from "../../../shell.tsx";

export default async function InvoiceDetail({ params }: { params: Promise<{ version: string; numero: string }> }) {
  const { version: segment, numero } = await params;
  const { version, on } = await openPage(segment, `/factures/${numero}`);
  const invoice = INVOICES.find((candidate) => candidate.number === numero);
  if (!invoice) notFound();
  const total = invoice.amount - (on("total-detail") && invoice.number === "F-119" ? 2000 : 0);

  return (
    <Shell version={version} active="factures">
      <h1>{`Facture ${invoice.number}`}</h1>
      <div className="meta">
        <span className="meta-client">{`Client : ${invoice.client}`}</span>
        <span className="meta-due">{`Échéance : ${formatDate(invoice.due)}`}</span>
        <span className={on("badge-statut-detail") ? "badge full" : "badge"} data-zone="badge-statut">En attente de paiement</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 756 }}>Désignation</th>
            <th style={{ width: 240 }} className="amount">Montant</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.label}>
              <td>{line.label}</td>
              <td className="amount">{formatAmount(line.amount)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total TTC</td>
            <td className="amount" data-zone="total-ttc">{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
      <a className="back" href={`/v${version}/factures`}>Retour aux factures</a>
    </Shell>
  );
}
