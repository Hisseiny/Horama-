import { useState } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

type CaptureView = "enter" | "list" | "filters" | "filtered" | "inspected" | "dashboard";
type FeedStep = {
  time: string;
  copy: string;
  url: string;
  screen: string;
  view: CaptureView;
  session?: "relancée";
  live?: boolean;
};

const appUrl = "https://facturo-demo.vercel.app";

const timeline: FeedStep[] = [
  { time: "00:04", copy: "Entre déjà connecté, sans formulaire", url: appUrl + "/v13/entrer?suite=/v13/factures", screen: "Entrée directe", view: "enter" },
  { time: "00:19", copy: "Ouvre « Factures »", url: appUrl + "/v13/factures", screen: "Liste des factures · vue par défaut", view: "list" },
  { time: "00:31", copy: "Ouvre le menu Filtres", url: appUrl + "/v13/factures", screen: "Liste des factures · menu Filtres", view: "filters" },
  { time: "00:42", copy: "Choisit « Échéance dépassée »", url: appUrl + "/v13/factures?filtre=echeance", screen: "Liste des factures · vue filtrée", view: "filtered" },
  { time: "00:55", copy: "Relève 6 lignes dans le tableau", url: appUrl + "/v13/factures?filtre=echeance", screen: "Liste des factures · vue filtrée", view: "inspected" },
  { time: "01:01", copy: "Session figée, relancée après 45 s", url: appUrl + "/v13/tableau-de-bord", screen: "Tableau de bord", view: "dashboard", session: "relancée" },
  { time: "01:52", copy: "Vérifie la règle par le calcul…", url: appUrl + "/v13/tableau-de-bord", screen: "Tableau de bord", view: "dashboard", live: true },
];

const liveIndex = timeline.length - 1;

function Logo() {
  return (
    <div className="brand live-brand" aria-label="Horama">
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
        <div className="live-subscription">14 / 40 passages · PRO</div>
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

function AgentFeed({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section className="live-agent-card" aria-labelledby="agent-title">
      <p className="live-label" id="agent-title">
        Fil de l’agent
      </p>
      <ol className="live-timeline">
        {timeline.map((step, index) => (
          <li
            key={step.time}
            className={
              (step.live ? "is-active" : "") + (index === selected ? " is-selected" : "")
            }
          >
            <button
              type="button"
              className="live-step"
              aria-pressed={index === selected}
              onClick={() => onSelect(index)}
            >
              {step.live ? (
                <span className="live-node" aria-hidden="true" />
              ) : step.session ? (
                <span className="live-node is-relaunched" aria-hidden="true">
                  ↻
                </span>
              ) : (
                <span className="live-node is-complete" aria-hidden="true">
                  ✓
                </span>
              )}
              <time>{step.time}</time>
              <span className="live-step-copy">
                <span>{step.copy}</span>
                {step.session ? (
                  <span className="session-pill is-relancée">{step.session}</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        className="live-report-link"
        type="button"
        onClick={() => (window.location.hash = "screen-11-4")}
      >
        Voir le rapport →
      </button>
    </section>
  );
}

function MockTable({ inspected }: { inspected?: boolean }) {
  return (
    <>
      <div className="mock-head">
        <span>Facture</span>
        <span>Client</span>
        <span>Montant</span>
        <span>Échéance</span>
      </div>
      <div className="mock-row">
        <span>à mesurer</span>
        <span>à mesurer</span>
        <span>à mesurer</span>
        <span>à mesurer</span>
      </div>
      <div className={"mock-row" + (inspected ? " is-inspected" : "")}>
        <span>à mesurer</span>
        <span>à mesurer</span>
        <span>à mesurer</span>
        {inspected ? <strong>Échéance : 24/11/2026</strong> : <span>à mesurer</span>}
        {inspected ? (
          <svg className="live-proof" viewBox="0 0 820 70" aria-hidden="true">
            <path d="M12 39C48 8 735 3 802 27C836 39 796 61 717 62C526 67 72 65 19 51C4 47 3 43 12 39Z" />
          </svg>
        ) : null}
      </div>
      <div className="mock-row">
        <span>à mesurer</span>
        <span>à mesurer</span>
        <span>à mesurer</span>
        <span>à mesurer</span>
      </div>
    </>
  );
}

function Cursor({ className }: { className?: string }) {
  return (
    <svg className={"live-cursor" + (className ? " " + className : "")} viewBox="0 0 30 38" aria-hidden="true">
      <path className="cursor-outline" d="M4 3L24 23L15 24L20 34L14 37L9 27L3 33Z" />
      <path d="M4 3L24 23L15 24L20 34L14 37L9 27L3 33Z" />
    </svg>
  );
}

function CaptureContent({ step }: { step: FeedStep }) {
  if (step.view === "enter") {
    return (
      <>
        <header>
          <strong>Entrée directe</strong>
          <span>Session déjà ouverte</span>
        </header>
        <p className="mock-notice is-neutral">
          Aucun formulaire. L’adresse ouvre la session, puis redirige vers /v13/factures.
        </p>
      </>

    );
  }

  if (step.view === "dashboard") {
    return (
      <>
        <header>
          <strong>Tableau de bord</strong>
          <span>Novembre 2026</span>
        </header>
        <div className="mock-stats">
          <div className={step.live ? "is-inspected" : ""}>
            <span>CA du mois</span>
            <strong>à mesurer</strong>
          </div>
          <div>
            <span>Factures émises</span>
            <strong>à mesurer</strong>
          </div>
        </div>
        {step.session ? (
          <p className="mock-notice">
            Écran figé pendant 45 s. La session a été relancée au même endroit.
          </p>
        ) : null}
        {step.live ? <Cursor className="is-dashboard" /> : null}
      </>
    );
  }

  return (
    <>
      <header>
        <strong>Factures</strong>
        <span>
          {step.view === "filtered" || step.view === "inspected"
            ? "Échéance dépassée"
            : step.view === "filters"
              ? "Filtres"
              : "Toutes les factures"}
        </span>
      </header>
      {step.view === "filters" ? (
        <div className="mock-menu">
          <span>Payées</span>
          <span className="is-hovered">Échéance dépassée</span>
          <span>Brouillons</span>
        </div>
      ) : null}
      <MockTable inspected={step.view === "inspected"} />
      {step.view === "inspected" ? <Cursor /> : null}
      {step.view === "filters" ? <Cursor className="is-menu" /> : null}
    </>
  );
}

function CaptureFrame({
  step,
  onBackToLive,
}: {
  step: FeedStep;
  onBackToLive: () => void;
}) {
  return (
    <section className="live-capture" aria-labelledby="capture-title">
      <div className="live-capture-head">
        <p className="live-label" id="capture-title">
          {step.live ? "Capture en cours" : `Capture de l’étape ${step.time}`}
        </p>
        {step.live ? null : (
          <button className="live-back" type="button" onClick={onBackToLive}>
            Revenir au direct
          </button>
        )}
      </div>
      <div className="live-address">{step.url}</div>
      <p className="live-screen-name">écran reconnu : {step.screen}</p>
      <div className="live-mockup">
        <CaptureContent step={step} />
      </div>
      <button
        className="live-replay"
        type="button"
        onClick={() => window.open("https://hub.hcompany.ai", "_blank", "noopener,noreferrer")}
      >
        Voir le replay public H Company ↗
      </button>
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot live-mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#7F77DD" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
      </svg>
    </div>
  );
}

export default function Screen() {
  const { lightMode, toggleTheme } = usePrototype();
  const [selected, setSelected] = useState(liveIndex);

  return (
    <div className={`app-shell live-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="live-heading">
            <h1>Passage en cours</h1>
            <p>version : v13 · test : 2 / 5 · durée : 01:56</p>
          </header>
          <div className="live-grid">
            <AgentFeed selected={selected} onSelect={setSelected} />
            <CaptureFrame step={timeline[selected]} onBackToLive={() => setSelected(liveIndex)} />
          </div>
        </div>
      </main>
      <Mascot />
    </div>
  );
}
