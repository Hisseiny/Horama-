import { useState } from "react";
import { usePrototype } from "../../src/PrototypeContext";
import { Icon } from "./Icons";
import {
  coverage,
  getPrototypeState,
  statusLabels,
  type CoverageScreen,
  type PrototypeState,
  type StatusCounts,
  type StatusKey,
} from "./data";

const statusOrder: StatusKey[] = ["conform", "suspect", "provenDefect", "inconclusive"];

const statusIcons = {
  conform: "check",
  suspect: "warning",
  provenDefect: "error",
  inconclusive: "minus",
} as const;

const countLabels: Record<StatusKey, [string, string]> = {
  conform: ["conforme", "conformes"],
  suspect: ["suspect", "suspects"],
  provenDefect: ["défaut prouvé", "défauts prouvés"],
  inconclusive: ["non concluant", "non concluants"],
};

function pluralizedStatus(status: StatusKey, count: number) {
  return countLabels[status][count > 1 ? 1 : 0];
}

function Logo() {
  return (
    <div className="brand" aria-label="Horama">
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

function Navigation() {
  const { reviewCount } = usePrototype();
  const items = [
    { icon: "layers" as const, label: "Couverture", active: true },
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
          onClick={
            item.label === "Tests à valider"
              ? () => (window.location.hash = "screen-11-2")
              : item.label === "Passages & Rapports"
                ? () => (window.location.hash = "screen-11-8")
                : item.label === "À relire"
                  ? () => (window.location.hash = "screen-11-6")
                  : () => (window.location.hash = "")
          }
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

function Sidebar({
  state,
  onRun,
  lightMode,
  onToggleTheme,
}: {
  state: PrototypeState;
  onRun: () => void;
  lightMode: boolean;
  onToggleTheme: () => void;
}) {
  const running = state === "running";
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
        <button className="run-button" type="button" onClick={onRun} disabled={running}>
          {running ? <span className="button-spinner" aria-hidden="true" /> : <Icon name="play" />}
          <span>{running ? "Passage en cours…" : "Lancer un passage"}</span>
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

        <div className="coverage-subscription">14 / 40 passages · PRO</div>

        <div className={`agent-status${running ? " is-running" : ""}`}>
          <span className="agent-dot" aria-hidden="true" />
          <div>
            <strong>
              {running ? `Run ${coverage.project.testedVersion} en cours…` : "Agent disponible"}
            </strong>
            <span>{running ? "Passage en cours…" : "Prêt pour un passage"}</span>
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

function StatusBadge({ status, label }: { status: StatusKey; label?: string }) {
  return (
    <span className={`status-badge is-${status}`}>
      <Icon name={statusIcons[status]} />
      {label ?? statusLabels[status]}
    </span>
  );
}

function SegmentedBar({ counts, label }: { counts: StatusCounts; label: string }) {
  const total = statusOrder.reduce((sum, status) => sum + counts[status], 0);

  if (total === 0) {
    return <span className="bar-unknown">à mesurer</span>;
  }

  return (
    <span className="segmented-bar" role="img" aria-label={label}>
      {statusOrder.map(
        (status) =>
          counts[status] > 0 && (
            <span
              className={`bar-segment is-${status}`}
              style={{ width: `${(counts[status] / total) * 100}%` }}
              key={status}
            />
          ),
      )}
    </span>
  );
}

const modifiedScreens = ["Liste des factures"];

const untestedRules = [
  {
    rule: "Chaque facture a une échéance.",
    note: "vault-horama/facturo/produit/liste-des-factures.md",
  },
  {
    rule: "Sous le tableau, le nombre de factures affichées est indiqué.",
    note: "vault-horama/facturo/produit/liste-des-factures.md",
  },
  {
    rule: "L'en-tête de chaque écran rappelle la date du jour.",
    note: "vault-horama/facturo/produit/_regles-communes.md",
  },
];

function UntestedRulesPanel({ onClose }: { onClose: () => void }) {
  return (
    <section className="untested-panel" aria-labelledby="untested-title">
      <header>
        <p id="untested-title">{coverage.summary.withoutTest} règles sans test</p>
        <button type="button" aria-label="Fermer" onClick={onClose}>
          ×
        </button>
      </header>
      <ul>
        {untestedRules.map((item) => (
          <li key={item.rule}>
            <span>
              <strong>{item.rule}</strong>
              <small>{item.note}</small>
            </span>
            <button type="button" onClick={() => (window.location.hash = "screen-11-2")}>
              Proposer un test
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummaryCard({ state }: { state: PrototypeState }) {
  const [untestedOpen, setUntestedOpen] = useState(false);

  if (state === "empty") {
    return (
      <section className="metric-card summary-card">
        <p className="card-label">Règles conformes</p>
        <strong className="key-figure is-unknown">à mesurer</strong>
        <SegmentedBar
          counts={{ conform: 0, suspect: 0, provenDefect: 0, inconclusive: 0 }}
          label="Répartition à mesurer"
        />
        <p className="empty-help">Lancez un premier passage pour mesurer la couverture.</p>
      </section>
    );
  }

  const counts: StatusCounts = {
    conform: coverage.summary.conform,
    suspect: coverage.summary.suspect,
    provenDefect: coverage.summary.provenDefect,
    inconclusive: coverage.summary.inconclusive,
  };

  return (
    <section className="metric-card summary-card">
      <p className="card-label">Règles conformes</p>
      <strong className="key-figure">
        {coverage.summary.conform} <small>/ {coverage.summary.tested}</small>
      </strong>
      <SegmentedBar
        counts={counts}
        label={`${coverage.summary.conform} conformes, ${coverage.summary.suspect} suspects, ${coverage.summary.provenDefect} défauts prouvés, ${coverage.summary.inconclusive} non concluant`}
      />
      <div className="status-legend">
        {statusOrder.map((status) => (
          <span className={`legend-item is-${status}`} key={status}>
            <Icon name={statusIcons[status]} />
            <span>
              <strong>{counts[status]}</strong> {pluralizedStatus(status, counts[status])}
            </span>
          </span>
        ))}
      </div>
      <div className="coverage-line">
        <span>
          {coverage.summary.tested} règles testées sur {coverage.summary.documented} documentées
        </span>
        <button
          type="button"
          aria-expanded={untestedOpen}
          onClick={() => setUntestedOpen((open) => !open)}
        >
          {coverage.summary.withoutTest} règles sans test
        </button>
      </div>
      {untestedOpen && <UntestedRulesPanel onClose={() => setUntestedOpen(false)} />}
    </section>
  );
}

function ReviewCard({ state }: { state: PrototypeState }) {
  const noReview = state === "empty";
  const { reviewCount } = usePrototype();

  return (
    <section className="metric-card review-card">
      <p className="card-label">À traiter</p>
      {noReview ? (
        <div className="nothing-to-review">
          <span>
            <Icon name="check" />
          </span>
          <strong>Rien à relire</strong>
          <p>Un passage doit d’abord être mesuré.</p>
        </div>
      ) : (
        <>
          <h2>{reviewCount} cas à relire</h2>
          <p className="review-breakdown">
            dont {coverage.summary.provenDefect} défauts prouvés, {coverage.summary.suspect}{" "}
            suspects
          </p>
          <div className="review-list">
            {coverage.reviewItems.map((item) => (
              <button
                className="review-item"
                type="button"
                onClick={() => (window.location.hash = "screen-11-6")}
                key={item.rule}
              >
                <StatusBadge status={item.status} />
                <span>
                  <strong>{item.screen}</strong>
                  <span>{item.rule}</span>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
          <button
            className="primary-button review-open-button"
            type="button"
            onClick={() => (window.location.hash = "screen-11-6")}
          >
            Ouvrir la relecture
            <Icon name="arrow" />
          </button>
        </>
      )}
    </section>
  );
}

function ScreenRow({ screen, empty }: { screen: CoverageScreen; empty: boolean }) {
  const counts = empty
    ? { conform: 0, suspect: 0, provenDefect: 0, inconclusive: 0 }
    : screen.counts;
  const modified = !empty && modifiedScreens.includes(screen.name);

  return (
    <button
      className={`screen-row${modified ? " is-modified" : ""}`}
      type="button"
      onClick={() => (window.location.hash = "screen-11-5")}
    >
      <span className="screen-copy">
        <strong>{screen.name}</strong>
        {modified && <em className="modified-pill">modifiée depuis le dernier passage</em>}
        <span>{screen.path}</span>
      </span>
      <span className="screen-results">
        <SegmentedBar
          counts={counts}
          label={
            empty
              ? `${screen.name}, résultats à mesurer`
              : `${counts.conform} conformes, ${counts.suspect} suspects, ${counts.provenDefect} défauts prouvés`
          }
        />
      </span>
      {empty ? (
        <span className="unknown-status">à mesurer</span>
      ) : (
        <StatusBadge status={screen.worstStatus} />
      )}
      <Icon name="chevron" />
    </button>
  );
}

function ScreensCard({ state }: { state: PrototypeState }) {
  const empty = state === "empty";

  return (
    <section className="screens-card" aria-labelledby="screens-title">
      <header className="screens-heading">
        <h2 id="screens-title">Écrans suivis</h2>
        <span>{coverage.screens.length} écrans</span>
      </header>
      <div>
        {coverage.screens.map((screen) => (
          <ScreenRow screen={screen} empty={empty} key={screen.name} />
        ))}
      </div>
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot" aria-hidden="true">
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
  const initialState = getPrototypeState();
  const [state, setState] = useState<PrototypeState>(initialState);
  const { lightMode, toggleTheme } = usePrototype();

  const launchRun = () => {
    setState("running");
    window.location.hash = "screen-11-3";
  };

  return (
    <div className={`app-shell coverage-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar state={state} onRun={launchRun} lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="page-heading">
            <h1>Couverture</h1>
          </header>

          {state === "error" && (
            <div className="error-banner" role="alert">
              <Icon name="warning" />
              <strong>Dernier passage non concluant</strong>
              <span>Les résultats affichés sont ceux du dernier passage mesuré.</span>
              <button type="button" onClick={launchRun}>
                <Icon name="refresh" />
                Relancer
              </button>
            </div>
          )}

          <div className="overview-grid">
            <SummaryCard state={state} />
            <ReviewCard state={state} />
          </div>
          <ScreensCard state={state} />
        </div>
      </main>
      <Mascot />
    </div>
  );
}
