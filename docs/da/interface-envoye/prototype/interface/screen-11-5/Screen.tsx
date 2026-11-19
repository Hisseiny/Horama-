import { useState, type CSSProperties } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

type ComparisonMode = "side" | "curtain" | "pixels";

function Logo() {
  return (
    <div className="brand comparison-brand" aria-label="Horama">
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
  if (label === "Couverture") {
    window.location.hash = "";
  }

  if (label === "Tests à valider") {
    window.location.hash = "screen-11-2";
  }

  if (label === "Passages & Rapports") {
    window.location.hash = "screen-11-8";
  }

  if (label === "À relire") {
    window.location.hash = "screen-11-6";
  }
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
        <div className="comparison-subscription">14 / 40 passages · PRO</div>
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

function OcreDots() {
  return (
    <span className="ocre-dots" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function InvoiceSheet({ version }: { version: "reference" | "tested" }) {
  const tested = version === "tested";

  return (
    <section className={`invoice-sheet is-${version}`}>
      <header className="sheet-heading">
        <span>{tested ? "v13 · Version testée" : "v12 · Référence validée"}</span>
        <span className={tested ? "sheet-state is-tested" : "sheet-state is-reference"}>
          {tested ? "[ ? ] À vérifier" : "✓ Validée"}
        </span>
      </header>

      <div className="invoice-toolbar">
        <strong>Factures</strong>
        {tested && (
          <span className="export-marker">
            <span className="capture-export">Exporter</span>
            <OcreDots />
          </span>
        )}
      </div>

      <div className="invoice-table-head">
        <span>Facture</span>
        <span>Client</span>
        <span>Échéance</span>
        <span>Montant TTC</span>
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="invoice-row" key={index}>
          <span>à mesurer</span>
          <span>à mesurer</span>
          <span>à mesurer</span>
          <span>à mesurer</span>
        </div>
      ))}

      <div className="invoice-sheet-footer">
        {!tested && <span className="capture-export">Exporter</span>}
        <span className={`invoice-total${tested ? " is-defect" : ""}`}>
          Total : {tested ? "1 240,00 €" : "1 420,00 €"}
          {tested && (
            <svg viewBox="0 0 250 52" aria-hidden="true">
              <path d="M8 29C23 6 211 3 239 18C260 30 225 47 181 47C114 50 25 47 10 37C5 34 4 32 8 29Z" />
            </svg>
          )}
        </span>
      </div>
    </section>
  );
}

function ModeControl({
  mode,
  onChange,
}: {
  mode: ComparisonMode;
  onChange: (mode: ComparisonMode) => void;
}) {
  const options: Array<[ComparisonMode, string]> = [
    ["side", "Côte à côte"],
    ["curtain", "Rideau"],
    ["pixels", "Pixels bruts"],
  ];

  return (
    <div className="mode-control" aria-label="Mode de comparaison">
      {options.map(([value, label]) => (
        <button
          className={mode === value ? "is-active" : ""}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          key={value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ComparisonView({
  mode,
  curtain,
  onCurtainChange,
}: {
  mode: ComparisonMode;
  curtain: number;
  onCurtainChange: (value: number) => void;
}) {
  if (mode === "curtain") {
    return (
      <div
        className="curtain-comparison"
        style={{ "--curtain-position": `${curtain}%` } as CSSProperties}
      >
        <InvoiceSheet version="tested" />
        <div className="curtain-reference">
          <InvoiceSheet version="reference" />
        </div>
        <span className="curtain-line" aria-hidden="true" />
        <input
          type="range"
          min="10"
          max="90"
          value={curtain}
          aria-label="Position du rideau"
          onChange={(event) => onCurtainChange(Number(event.target.value))}
        />
      </div>
    );
  }

  return (
    <div className={`comparison-frames${mode === "pixels" ? " is-pixels" : ""}`}>
      <InvoiceSheet version="reference" />
      <InvoiceSheet version="tested" />
    </div>
  );
}

function DifferenceSummary() {
  return (
    <section className="difference-summary" aria-label="Synthèse des écarts">
      <button type="button" onClick={() => (window.location.hash = "screen-11-6")}>
        <span className="difference-copy">Écart 1 : bouton Exporter déplacé en haut à droite</span>
        <span className="difference-status is-suspect">[ ? ] Suspect</span>
      </button>
      <button type="button" onClick={() => (window.location.hash = "screen-11-6")}>
        <span className="difference-copy is-measure">
          Écart 2 : mesuré : 1 240,00 € · attendu : 1 420,00 € (écart 180,00 €)
        </span>
        <span className="difference-status is-defect">[ ! ] Défaut prouvé</span>
      </button>
    </section>
  );
}

const measuredValues = [
  {
    label: "Total du mois",
    reference: "1 420,00 €",
    tested: "1 240,00 €",
    expected: "égal au CA du tableau de bord",
    defect: true,
  },
  {
    label: "Position du bouton Exporter",
    reference: "à mesurer",
    tested: "x : 870, y : 120",
    expected: "en bas du tableau (note de la v12)",
  },
];

function MeasuredValues() {
  return (
    <section className="measured-values" aria-labelledby="measured-values-title">
      <p className="measured-values-title" id="measured-values-title">
        Valeurs relevées
      </p>
      <div className="measured-values-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Valeur</th>
              <th scope="col">v12 (référence)</th>
              <th scope="col">v13 (testée)</th>
              <th scope="col">Attendu selon la règle</th>
            </tr>
          </thead>
          <tbody>
            {measuredValues.map((row) => (
              <tr className={row.defect ? "is-defect" : ""} key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.reference}</td>
                <td>{row.tested}</td>
                <td>{row.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot comparison-mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#B8321F" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
        <rect
          x="66"
          y="6"
          width="22"
          height="22"
          fill="#B8321F"
          stroke="#1C1C1C"
          strokeWidth="2.5"
        />
        <path d="M77 11V20" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="77" cy="24" r="1.9" fill="#fff" />
      </svg>
    </div>
  );
}

export default function Screen() {
  const { lightMode, toggleTheme } = usePrototype();
  const [mode, setMode] = useState<ComparisonMode>("side");
  const [curtain, setCurtain] = useState(50);

  return (
    <div className={`app-shell comparison-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="comparison-heading">
            <div>
              <h1>Liste des factures</h1>
              <p>v12 (référence) comparée à v13 (testée)</p>
            </div>
            <ModeControl mode={mode} onChange={setMode} />
          </header>

          <ComparisonView mode={mode} curtain={curtain} onCurtainChange={setCurtain} />
          <DifferenceSummary />
          <MeasuredValues />
          <footer className="pixel-summary">
            Comparaison pixels bruts : 312 zones différentes. Horama : 2 écarts qui comptent.
          </footer>
        </div>
      </main>
      <Mascot />
    </div>
  );
}
