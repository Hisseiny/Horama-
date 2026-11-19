import { useMemo, useState } from "react";
import { usePrototype, type JournalEntry } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

const passages = [
  {
    date: "2026-11-18 14h02",
    version: "v13",
    tests: "5",
    results: [
      { value: "3 ✓", status: "conform" },
      { value: "1 [ ! ]", status: "bug" },
      { value: "1 [ ? ]", status: "suspect" },
    ],
    measure: "4 min 10 s · 0,07 $",
  },
  {
    date: "2026-11-17 16h40",
    version: "v12",
    tests: "5",
    results: [{ value: "5 ✓", status: "conform" }],
    measure: "3 min 52 s · 0,06 $",
  },
  {
    date: "2026-11-16 11h15",
    version: "v12",
    tests: "4",
    results: [
      { value: "3 ✓", status: "conform" },
      { value: "1 [ ? ]", status: "suspect" },
    ],
    measure: "3 min 05 s · 0,05 $",
  },
];

const exampleEntries: JournalEntry[] = [
  {
    id: "example-note",
    date: "18/11 14h20",
    screen: "Liste des factures",
    rule: "liste-des-factures.md",
    decision: "wanted",
    detail: "note corrigée",
    author: "Jane Doe",
    version: "v13",
    why: "Nouvelle barre d'actions, voulue par le produit",
    noteStatus: "acceptée",
  },
  {
    id: "example-bug",
    date: "18/11 14h18",
    screen: "Tableau de bord et Liste des factures",
    rule: "regles-entre-ecrans.md",
    decision: "bug",
    author: "Jane Doe",
    version: "v13",
    why: "Le CA du mois doit égaler le total des factures",
  },
  {
    id: "example-wanted",
    date: "16/11 11h40",
    screen: "Détail facture",
    rule: "_regles-communes.md",
    decision: "wanted",
    author: "Jane Doe",
    version: "v12",
  },
];

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
        <div className="history-subscription">14 / 40 passages · PRO</div>
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

type LogStatus = "conform" | "suspect" | "bug" | "inconclusive";
type SessionState = "en cours" | "attente d'un outil" | "relancée" | "abandonnée" | "terminée";
type LogStep = {
  time: string;
  step: number;
  test: string;
  action: string;
  url: string;
  screen: string;
  scroll: string;
  session: SessionState;
  result?: { measured: string; expected: string; status: LogStatus };
};

const statusLabel: Record<LogStatus, string> = {
  conform: "✓ conforme",
  suspect: "[ ? ] suspect",
  bug: "[ ! ] défaut prouvé",
  inconclusive: "[ - ] non concluant",
};

const appUrl = "https://facturo-demo.vercel.app";

const passageLogs: Record<string, LogStep[]> = {
  "2026-11-18 14h02": [
    { time: "14:02:04", step: 1, test: "Filtre « Échéance dépassée »", action: "Entre déjà connecté, sans formulaire", url: appUrl + "/v13/entrer?suite=/v13/factures", screen: "Entrée directe", scroll: "0, 0", session: "en cours" },
    { time: "14:02:19", step: 2, test: "Filtre « Échéance dépassée »", action: "Ouvre « Factures »", url: appUrl + "/v13/factures", screen: "Liste des factures · vue par défaut", scroll: "0, 0", session: "en cours" },
    { time: "14:02:31", step: 3, test: "Filtre « Échéance dépassée »", action: "Ouvre le menu Filtres", url: appUrl + "/v13/factures", screen: "Liste des factures · menu Filtres", scroll: "0, 0", session: "attente d'un outil" },
    { time: "14:02:42", step: 4, test: "Filtre « Échéance dépassée »", action: "Choisit « Échéance dépassée »", url: appUrl + "/v13/factures?filtre=echeance", screen: "Liste des factures · vue filtrée", scroll: "0, 0", session: "en cours" },
    { time: "14:02:55", step: 5, test: "Filtre « Échéance dépassée »", action: "Relève 6 lignes et leur date d'échéance", url: appUrl + "/v13/factures?filtre=echeance", screen: "Liste des factures · vue filtrée", scroll: "0, 420", session: "en cours", result: { measured: "6 lignes, échéances toutes passées", expected: "aucune échéance >= aujourd'hui", status: "conform" } },
    { time: "14:03:10", step: 6, test: "CA du mois égal au total", action: "Session figée sur le tableau de bord, relancée après 45 s", url: appUrl + "/v13/tableau-de-bord", screen: "Tableau de bord", scroll: "0, 0", session: "relancée" },
    { time: "14:03:58", step: 7, test: "CA du mois égal au total", action: "Relève « CA du mois » sur le tableau de bord", url: appUrl + "/v13/tableau-de-bord", screen: "Tableau de bord", scroll: "0, 0", session: "en cours", result: { measured: "1 240,00 €", expected: "1 420,00 € (total des factures du mois)", status: "bug" } },
    { time: "14:04:20", step: 8, test: "Bouton Exporter visible", action: "Cherche le bouton « Exporter »", url: appUrl + "/v13/factures", screen: "Liste des factures · vue par défaut", scroll: "0, 0", session: "terminée", result: { measured: "zone déplacée (x : 870, y : 120)", expected: "en bas du tableau (note de la v12)", status: "suspect" } },
  ],
  "2026-11-17 16h40": [
    { time: "16:40:06", step: 1, test: "Filtre « Échéance dépassée »", action: "Entre déjà connecté, sans formulaire", url: appUrl + "/v12/entrer?suite=/v12/factures", screen: "Entrée directe", scroll: "0, 0", session: "en cours" },
    { time: "16:41:12", step: 2, test: "Filtre « Échéance dépassée »", action: "Relève 5 lignes et leur date d'échéance", url: appUrl + "/v12/factures?filtre=echeance", screen: "Liste des factures · vue filtrée", scroll: "0, 380", session: "en cours", result: { measured: "5 lignes, échéances toutes passées", expected: "aucune échéance >= aujourd'hui", status: "conform" } },
    { time: "16:43:58", step: 3, test: "CA du mois égal au total", action: "Compare le CA du tableau de bord au total des factures", url: appUrl + "/v12/tableau-de-bord", screen: "Tableau de bord", scroll: "0, 0", session: "terminée", result: { measured: "1 380,00 € = 1 380,00 €", expected: "égalité", status: "conform" } },
  ],
  "2026-11-16 11h15": [
    { time: "11:15:03", step: 1, test: "Format des montants TTC", action: "Entre déjà connecté, sans formulaire", url: appUrl + "/v12/entrer?suite=/v12/factures", screen: "Entrée directe", scroll: "0, 0", session: "en cours" },
    { time: "11:16:40", step: 2, test: "Format des montants TTC", action: "Relève 12 montants sur le détail d'une facture", url: appUrl + "/v12/factures/F-119", screen: "Détail facture", scroll: "0, 640", session: "en cours", result: { measured: "12 montants au format 0 000,00 €", expected: "format 0 000,00 €", status: "conform" } },
    { time: "11:17:55", step: 3, test: "Bouton Exporter visible", action: "Session sans réponse, abandonnée après 45 s", url: appUrl + "/v12/factures", screen: "Liste des factures", scroll: "0, 0", session: "abandonnée", result: { measured: "aucune capture", expected: "bouton « Exporter » visible", status: "inconclusive" } },
  ],
};

function CapturePreview({ step, large }: { step: LogStep; large?: boolean }) {
  return (
    <span className={"log-capture" + (large ? " is-large" : "")} aria-hidden={!large}>
      <span className="log-capture-bar">{step.url.replace("https://", "")}</span>
      <span className="log-capture-title">{step.screen}</span>
      <span className="log-capture-line" />
      <span className="log-capture-line is-short" />
      {step.result && <span className={"log-capture-mark is-" + step.result.status} />}
    </span>
  );
}

function AgentLog({ date }: { date: string }) {
  const steps = passageLogs[date] || [];
  const tests = Array.from(new Set(steps.map((step) => step.test)));
  const [testFilter, setTestFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<number | null>(null);
  const q = query.trim().toLowerCase();
  const visible = steps.filter(
    (step) =>
      (testFilter === "all" || step.test === testFilter) &&
      (statusFilter === "all" || (step.result && step.result.status === statusFilter)) &&
      (q === "" || (step.action + " " + step.url + " " + step.screen).toLowerCase().includes(q)),
  );

  return (
    <div className="agent-log">
      <div className="agent-log-head">
        <strong>Journal de l'agent</strong>
        <span>{steps.length} étapes · {tests.length} tests</span>
        <button type="button" className="agent-log-report" onClick={() => (window.location.hash = "screen-11-4")}>
          Ouvrir le rapport →
        </button>
      </div>
      <div className="agent-log-filters">
        <label>
          <span className="sr-only">Filtrer par test</span>
          <select value={testFilter} onChange={(event) => setTestFilter(event.target.value)}>
            <option value="all">Tous les tests</option>
            {tests.map((test) => (
              <option value={test} key={test}>{test}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrer par statut</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tous les statuts</option>
            <option value="conform">Conforme</option>
            <option value="suspect">Suspect</option>
            <option value="bug">Défaut prouvé</option>
            <option value="inconclusive">Non concluant</option>
          </select>
        </label>
        <input
          type="search"
          value={query}
          placeholder="Chercher une adresse ou un texte"
          aria-label="Chercher une adresse ou un texte"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ol className="agent-steps">
        {visible.map((step) => (
          <li className="agent-step" key={step.step}>
            <span className="agent-step-time">
              {step.time}
              <small>étape {step.step}</small>
            </span>
            <span className="agent-step-main">
              <strong>{step.action}</strong>
              <span className="agent-step-test">{step.test}</span>
              <span className="agent-step-url">{step.url}</span>
              <span className="agent-step-where">{step.screen} · défilement {step.scroll}</span>
              {step.result && (
                <span className={"agent-step-result is-" + step.result.status}>
                  {statusLabel[step.result.status]} · mesuré : {step.result.measured} · attendu : {step.result.expected}
                </span>
              )}
            </span>
            <button
              type="button"
              className="agent-step-thumb"
              aria-label={"Agrandir la capture de l'étape " + step.step}
              aria-expanded={opened === step.step}
              onClick={() => setOpened(opened === step.step ? null : step.step)}
            >
              <CapturePreview step={step} />
            </button>
            <span className={"session-pill is-" + step.session.replace(/[^a-zé]/g, "")}>{step.session}</span>
            <a className="agent-step-replay" href="https://hub.hcompany.ai" target="_blank" rel="noreferrer">
              Replay ↗
            </a>
            {opened === step.step && (
              <span className="agent-step-zoom">
                <CapturePreview step={step} large />
                <small>Capture d'exemple, prise à l'étape {step.step} ({step.time})</small>
              </span>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="agent-step-empty">Aucune étape pour ces filtres.</li>}
      </ol>
    </div>
  );
}

function PassagesCard() {
  const [openDate, setOpenDate] = useState<string | null>(passages[0].date);
  return (
    <section className="history-card passages-card" aria-labelledby="passages-title">
      <h2 id="passages-title">Passages</h2>
      <div className="passages-table">
        <div className="passages-head">
          <span>Date</span>
          <span>Version</span>
          <span>Tests</span>
          <span>Résultat</span>
          <span>Durée & coût</span>
        </div>
        {passages.map((passage) => (
          <div className="passage-item" key={passage.date}>
            <div className="passage-line">
              <button
                className="passage-expand"
                type="button"
                aria-expanded={openDate === passage.date}
                aria-label={(openDate === passage.date ? "Replier" : "Déplier") + " le journal de l'agent du " + passage.date}
                onClick={() => setOpenDate(openDate === passage.date ? null : passage.date)}
              >
                {openDate === passage.date ? "▾" : "▸"}
              </button>
              <button
                className="passage-row"
                type="button"
                onClick={() => (window.location.hash = "screen-11-4")}
              >
                <span>{passage.date}</span>
                <span>{passage.version}</span>
                <span>{passage.tests}</span>
                <span className="passage-results">
                  {passage.results.map((result, index) => (
                    <span className={"is-" + result.status} key={result.value}>
                      {index > 0 && <i aria-hidden="true"> · </i>}
                      {result.value}
                    </span>
                  ))}
                </span>
                <span>{passage.measure}</span>
              </button>
            </div>
            {openDate === passage.date && <AgentLog date={passage.date} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function DecisionJournal() {
  const { journalEntries } = usePrototype();
  const [screenFilter, setScreenFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const entries = [...journalEntries, ...exampleEntries];
  const rules = Array.from(new Set(entries.map((entry) => entry.rule)));
  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (screenFilter === "all" || entry.screen.includes(screenFilter)) &&
          (ruleFilter === "all" || entry.rule === ruleFilter),
      ),
    [entries, ruleFilter, screenFilter],
  );

  return (
    <section className="history-card journal-card" aria-labelledby="journal-title">
      <div className="journal-heading">
        <div>
          <h2 id="journal-title">Journal des décisions</h2>
          <p>Quand ça a cassé, qui a tranché</p>
        </div>
        <div className="journal-filters">
          <label>
            <span className="sr-only">Filtrer par écran</span>
            <select value={screenFilter} onChange={(event) => setScreenFilter(event.target.value)}>
              <option value="all">Tous les écrans</option>
              <option value="Tableau de bord">Tableau de bord</option>
              <option value="Liste des factures">Liste des factures</option>
              <option value="Détail facture">Détail facture</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par règle</span>
            <select value={ruleFilter} onChange={(event) => setRuleFilter(event.target.value)}>
              <option value="all">Toutes les règles</option>
              {rules.map((rule) => (
                <option value={rule} key={rule}>
                  {rule}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="decision-list">
        {filteredEntries.map((entry) => (
          <button
            className="decision-entry"
            type="button"
            onClick={() =>
              (window.location.hash = entry.decision === "bug" ? "screen-11-6" : "screen-11-7")
            }
            key={entry.id}
          >
            <span className={`timeline-dot is-${entry.decision}`} aria-hidden="true" />
            <span className="decision-date">{entry.date}</span>
            <span className="decision-copy">
              <strong>{entry.screen}</strong>
              <span className="decision-rule">{entry.rule}</span>
            </span>
            <span className={`decision-pill is-${entry.decision}`}>
              {entry.decision === "bug" ? "bug" : "voulu"}
            </span>
            {entry.detail && <span className="decision-detail">{entry.detail}</span>}
            <span className="decision-author">par {entry.author}</span>
            <span className="decision-meta">
              Portée : cet écart, cet écran, cette version · {entry.version || "v13"}
              {entry.why ? " · Pourquoi : " + entry.why : ""}
              {entry.noteStatus ? " · Correction de la note : " + entry.noteStatus : ""}
            </span>
          </button>
        ))}
        {filteredEntries.length === 0 && (
          <p className="empty-decisions">Aucune décision pour ces filtres.</p>
        )}
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
  const { lightMode, toggleTheme } = usePrototype();

  return (
    <div className={`app-shell history-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <header className="history-page-heading">
            <h1>Passages et historique</h1>
            <p>Facturo · données d'exemple</p>
          </header>
          <PassagesCard />
          <DecisionJournal />
        </div>
      </main>
      <Mascot />
    </div>
  );
}
