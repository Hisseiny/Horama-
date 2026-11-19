import { useState } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

type ReportStatus = "defect" | "suspect" | "conform" | "inconclusive";

const rows = [
  {
    status: "defect" as const,
    test: "CA du mois égal au total",
    source: "regles-entre-ecrans.md",
    screens: "Tableau de bord, Liste des factures",
    proof: "mesuré : 1 240,00 € · attendu : 1 420,00 €",
    duration: "52 s · 0,021 $",
  },
  {
    status: "suspect" as const,
    test: "Bouton Exporter visible",
    source: "liste-des-factures.md",
    screens: "Liste des factures",
    proof: "zone déplacée (x : 870, y : 120)",
    duration: "38 s · 0,014 $",
  },
  {
    status: "conform" as const,
    test: "Format des montants TTC",
    source: "_regles-communes.md",
    screens: "Détail facture",
    proof: "12 valeurs conformes",
    duration: "41 s · 0,012 $",
  },
  {
    status: "conform" as const,
    test: "à mesurer",
    source: "à mesurer",
    screens: "à mesurer",
    proof: "à mesurer",
    duration: "à mesurer",
  },
  {
    status: "inconclusive" as const,
    test: "à mesurer",
    source: "à mesurer",
    screens: "à mesurer",
    proof: "session abandonnée après 45 s, aucune capture",
    duration: "à mesurer",
  },
];

function downloadReport() {
  const header = "# Rapport de passage 2026-11-18-14h02\n\n";
  const table = [
    "| Statut | Test | Source | Écrans | Preuve / mesure | Durée & coût |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.status} | ${row.test} | ${row.source} | ${row.screens} | ${row.proof} | ${row.duration} |`,
    ),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([header + table], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "rapport-2026-11-18-14h02.md";
  link.click();
  URL.revokeObjectURL(url);
}

function Logo() {
  return (
    <div className="brand report-brand" aria-label="Horama">
      <span>H</span>
      <svg className="brand-eye" viewBox="26 26 44 44" aria-hidden="true">
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
      <span>rama</span>
    </div>
  );
}

function navigate(label: string) {
  if (label === "Couverture") window.location.hash = "";
  if (label === "Tests à valider") window.location.hash = "screen-11-2";
  if (label === "Passages & Rapports") window.location.hash = "screen-11-8";
  if (label === "À relire") window.location.hash = "screen-11-6";
}

function Navigation() {
  const { reviewCount } = usePrototype();
  const items = [
    { icon: "layers" as const, label: "Couverture" },
    {
      icon: "check" as const,
      label: "Tests à valider",
      count: coverage.navigation.testsToValidate,
    },
    { icon: "clock" as const, label: "Passages & Rapports", active: true },
    {
      icon: "document" as const,
      label: "À relire",
      count: reviewCount,
      alert: true,
    },
  ];

  return (
    <nav aria-label="Navigation principale">
      {items.map((item) => (
        <button
          className={`nav-item${item.active ? " is-active" : ""}`}
          type="button"
          key={item.label}
          aria-current={item.active ? "page" : undefined}
          onClick={() => navigate(item.label)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span className={`nav-count${item.alert ? " is-alert" : ""}`}>{item.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

function Sidebar({ lightMode, onToggleTheme }: { lightMode: boolean; onToggleTheme: () => void }) {
  const [projectOpen, setProjectOpen] = useState(false);
  const { showToast } = usePrototype();
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <div className="product-select-wrap">
          <button
            className="product-select"
            type="button"
            aria-label="Changer de produit"
            aria-expanded={projectOpen}
            onClick={() => setProjectOpen((value) => !value)}
          >
            <span>{coverage.project.name}</span>
            <Icon name="chevron" />
            <small>version testée : {coverage.project.testedVersion}</small>
          </button>
          {projectOpen && (
            <div className="product-menu">
              <button type="button" onClick={() => setProjectOpen(false)}>
                ✓ Facturo
              </button>
            </div>
          )}
        </div>
        <button
          className="run-button"
          type="button"
          onClick={() => (window.location.hash = "screen-11-3")}
        >
          <Icon name="play" />
          <span>Lancer un passage</span>
        </button>
        <Navigation />
      </div>
      <div className="sidebar-bottom">
        <button
          className="theme-toggle"
          type="button"
          aria-pressed={lightMode}
          onClick={onToggleTheme}
        >
          <Icon name={lightMode ? "moon" : "sun"} />
          <span>{lightMode ? "Mode sombre" : "Mode clair"}</span>
        </button>
        <div className="report-subscription">14 / 40 passages · PRO</div>
        <div className="agent-status">
          <span className="agent-dot" aria-hidden="true" />
          <div>
            <strong>Agent disponible</strong>
            <span>Prêt pour un passage</span>
          </div>
        </div>
        <div className="profile">
          <span className="avatar" aria-hidden="true">
            JD
          </span>
          <span className="profile-copy">
            <strong>Jane Doe</strong>
            <span>Équipe produit</span>
          </span>
          <button
            type="button"
            className="logout-button"
            aria-label="Se déconnecter"
            onClick={() => {
              showToast("Vous êtes déconnecté.");
              window.location.hash = "login";
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Fold({
  value,
  label,
  detail,
  status,
}: {
  value: string;
  label: string;
  detail?: string;
  status?: ReportStatus;
}) {
  return (
    <section className="report-fold">
      <strong className={status ? `is-${status}` : ""}>{value}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
    </section>
  );
}

function Status({ status }: { status: ReportStatus }) {
  if (status === "defect") {
    return <span className="report-status is-defect">[ ! ] Défaut prouvé</span>;
  }
  if (status === "suspect") {
    return <span className="report-status is-suspect">[ ? ] Suspect</span>;
  }
  if (status === "inconclusive") {
    return <span className="report-status is-inconclusive">[ - ] Non concluant</span>;
  }
  return <span className="report-status is-conform">✓ Conforme</span>;
}

function ReportTable() {
  return (
    <section className="report-table-card" aria-label="Résultats du passage">
      <div className="report-table-scroll">
        <div className="report-table">
          <div className="report-table-head">
            <span>Statut</span>
            <span>Test & règle source</span>
            <span>Écrans</span>
            <span>Preuve / mesure</span>
            <span>Durée & coût</span>
            <span>Replay</span>
          </div>
          {rows.map((row, index) => (
            <button
              className="report-row is-clickable"
              type="button"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest(".report-replay")) {
                  window.open("https://hub.hcompany.ai", "_blank", "noopener,noreferrer");
                  return;
                }
                window.location.hash =
                  row.status === "defect"
                    ? "screen-11-6"
                    : row.status === "inconclusive"
                      ? "screen-11-8"
                      : "screen-11-5";
              }}
              key={`${row.test}-${index}`}
            >
              <Status status={row.status} />
              <span className="report-test">
                <strong>{row.test}</strong>
                <small>{row.source}</small>
              </span>
              <span>{row.screens}</span>
              <span className={`report-proof is-${row.status}`}>{row.proof}</span>
              <span className="report-measure">{row.duration}</span>
              <span className="report-replay">Replay ↗</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot report-mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#2E7D55" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
        <rect
          x="66"
          y="6"
          width="22"
          height="22"
          fill="#2E7D55"
          stroke="#1C1C1C"
          strokeWidth="2.5"
        />
        <path
          d="M71 17.5l4 4 7.5-8"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Screen() {
  const { lightMode, toggleTheme } = usePrototype();
  return (
    <div className={`app-shell report-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <button
            className="back-to-passages"
            type="button"
            onClick={() => (window.location.hash = "screen-11-8")}
          >
            ← Tous les passages
          </button>
          <header className="report-heading">
            <div>
              <h1>Rapport de passage</h1>
              <p>passage : 2026-11-18-14h02 · écrit dans vault-horama/facturo/passages/</p>
            </div>
            <button className="export-report" type="button" onClick={downloadReport}>
              Exporter au format H (.md)
            </button>
          </header>
          <div className="report-folds">
            <Fold value="5" label="tests joués" />
            <Fold value="2" label="conformes" status="conform" />
            <Fold value="1" label="défaut prouvé" status="defect" />
            <Fold value="1" label="non concluant" status="inconclusive" detail="[ - ] session abandonnée" />
            <Fold value="0,07 $" label="coût total" detail="durée : 4 min 10 s" />
          </div>
          <ReportTable />
        </div>
      </main>
      <Mascot />
    </div>
  );
}
