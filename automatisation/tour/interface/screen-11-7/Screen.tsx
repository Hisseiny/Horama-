import { useState } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

type NoteDecision = "leave" | "correct" | null;

function Logo() {
  return (
    <div className="brand doc-brand" aria-label="Horama">
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
    { icon: "clock" as const, label: "Passages & Rapports" },
    {
      icon: "document" as const,
      label: "À relire",
      count: reviewCount,
      alert: true,
      active: true,
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
        <div className="doc-subscription">14 / 40 passages · PRO</div>
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

function VersionCapture() {
  return (
    <div className="doc-capture">
      <div className="doc-capture-head">
        <span>v13 · Liste des factures</span>
        <span>Version testée</span>
      </div>
      <div className="doc-capture-toolbar">
        <strong>Factures</strong>
        <span className="captured-export">
          Exporter
          <svg viewBox="0 0 150 52" aria-hidden="true">
            <path d="M7 29C18 8 123 2 142 18C159 30 136 45 108 46C67 48 19 45 9 37C4 33 3 31 7 29Z" />
          </svg>
        </span>
      </div>
      <div className="doc-capture-table">
        <span>Facture</span>
        <span>Client</span>
        <span>Montant TTC</span>
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="doc-capture-row" key={index}>
          <span>à mesurer</span>
          <span>à mesurer</span>
          <span>à mesurer</span>
        </div>
      ))}
    </div>
  );
}

function Mascot() {
  return (
    <div className="mascot doc-mascot" aria-hidden="true">
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
  const [decision, setDecision] = useState<NoteDecision>(null);
  const { lightMode, toggleTheme, showToast, recordNoteDecision } = usePrototype();

  const finishDecision = (value: Exclude<NoteDecision, null>) => {
    setDecision(value);
    recordNoteDecision(value === "correct");
    showToast(
      value === "correct" ? "Note corrigée, PR ouverte sur le vault" : "Note laissée telle quelle",
    );
    window.location.hash = "screen-11-6";
  };

  return (
    <div className={`app-shell doc-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <button
            className="back-to-review"
            type="button"
            onClick={() => (window.location.hash = "screen-11-6")}
          >
            ← Retour à la relecture
          </button>
          <header className="doc-heading">
            <h1>La documentation ne correspond plus à l'écran validé</h1>
            <p>Votre décision « C'est voulu » sur la v13 contredit la note du vault Obsidian.</p>
          </header>

          <section className="doc-proposal">
            <header className="proposal-banner">
              <strong>vault-horama/facturo/produit/liste-des-factures.md</strong>
              <span>Proposition générée par Horama</span>
            </header>

            <div className="decision-reminder">
              Décision enregistrée : bouton « Exporter » déplacé en haut à droite (tranché « voulu »
              par Jane Doe sur la v13).
            </div>

            <div className="proposal-content">
              <div className="markdown-panel">
                <p className="diff-context">
                  Liste toutes les factures du client, la plus récente en premier.
                </p>
                <p className="diff-line is-removed">
                  - Le bouton « Exporter » se trouve en bas du tableau.
                </p>
                <p className="diff-line is-added">
                  + Le bouton « Exporter » se trouve en haut à droite du tableau (depuis la version
                  13).
                </p>
              </div>
              <VersionCapture />
            </div>

            <footer className="proposal-actions">
              <button
                className={`leave-note${decision === "leave" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={decision === "leave"}
                onClick={() => finishDecision("leave")}
              >
                Laisser la note telle quelle
              </button>
              <button
                className={`correct-note${decision === "correct" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={decision === "correct"}
                onClick={() => finishDecision("correct")}
              >
                Corriger la note et ouvrir la PR
              </button>
            </footer>
          </section>
        </div>
      </main>
      <Mascot />
    </div>
  );
}
