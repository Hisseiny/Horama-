export type Invoice = {
  number: string;
  client: string;
  due: string;
  amount: number;
  lines: { label: string; amount: number }[];
};

export const INVOICES: Invoice[] = [
  {
    number: "F-118",
    client: "Atelier Brun",
    due: "2026-11-05",
    amount: 32000,
    lines: [
      { label: "Création de logo", amount: 20000 },
      { label: "Cartes de visite", amount: 12000 },
    ],
  },
  {
    number: "F-119",
    client: "Studio Lune",
    due: "2026-11-12",
    amount: 48000,
    lines: [
      { label: "Maquette de site", amount: 30000 },
      { label: "Intégration", amount: 18000 },
    ],
  },
  {
    number: "F-120",
    client: "Café Mira",
    due: "2026-11-30",
    amount: 18000,
    lines: [{ label: "Menu imprimé", amount: 18000 }],
  },
  {
    number: "F-121",
    client: "Garage Vélo",
    due: "2026-11-10",
    amount: 44000,
    lines: [
      { label: "Site vitrine", amount: 36000 },
      { label: "Hébergement annuel", amount: 8000 },
    ],
  },
];

export function today(): string {
  return process.env.FACTURO_TODAY || "2026-11-18";
}

export function sum(items: { amount: number }[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function formatAmount(cents: number): string {
  const euros = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+$)/g, "\u00a0");
  return `${euros},${String(cents % 100).padStart(2, "0")}\u00a0€`;
}

export function formatDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}
