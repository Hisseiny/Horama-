import { useState } from "react";
import { usePrototype, type QuestionAnswer } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

function Logo() {
  return (
    <div className="brand validation-brand" aria-label="Horama">
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
      active: true,
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
        <div className="validation-subscription">14 / 40 passages · PRO</div>
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

const notePath = "vault-horama/facturo/notes-de-version/v13.md";

const exportTest = {
  id: "liste-factures-bouton-exporter",
  title: "Liste des factures : bouton Exporter en haut à droite",
  setup: "Connecté avec le compte de test, sur la liste des factures.",
  task: "1. Ouvrir la liste des factures. 2. Repérer le bouton « Exporter » et relever sa position.",
  verification: "FAIL if le bouton « Exporter » n'est pas visible en haut à droite de la liste.",
  rule: "regle : présence | élément : bouton Exporter | zone : en haut à droite",
};

function TestPager({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  return (
    <div className="test-pager" role="group" aria-label="Changer de test proposé">
      <button
        type="button"
        aria-label="Test précédent"
        disabled={index === 0}
        onClick={() => onChange(index - 1)}
      >
        ←
      </button>
      <span>Test {index + 1} / 2</span>
      <button
        type="button"
        aria-label="Test suivant"
        disabled={index === 1}
        onClick={() => onChange(index + 1)}
      >
        →
      </button>
    </div>
  );
}

function ProposedTest() {
  const [editing, setEditing] = useState(false);
  const [testIndex, setTestIndex] = useState(0);
  const [exportTask, setExportTask] = useState(exportTest.task);
  const [exportVerification, setExportVerification] = useState(exportTest.verification);
  const {
    showToast,
    taskText: filterTask,
    setTaskText: setFilterTask,
    verificationText: filterVerification,
    setVerificationText: setFilterVerification,
    recordTestDecision,
  } = usePrototype();
  const isExport = testIndex === 1;
  const taskText = isExport ? exportTask : filterTask;
  const setTaskText = isExport ? setExportTask : setFilterTask;
  const verificationText = isExport ? exportVerification : filterVerification;
  const setVerificationText = isExport ? setExportVerification : setFilterVerification;
  const changeTest = (index: number) => {
    setEditing(false);
    setTestIndex(index);
  };

  return (
    <section className="validation-card" aria-label="Test proposé">
      <div className="validation-columns">
        <article className="vault-note">
          <p className="validation-label">Note du vault</p>
          <p className="validation-path">{notePath}</p>
          <button
            className="vault-open-link"
            type="button"
            onClick={() => showToast("Note ouverte dans le vault : " + notePath)}
          >
            Ouvrir la note dans le vault ↗
          </button>
          <div className="vault-copy">
            <p>
              Nouveau filtre « Échéance dépassée » sur la liste des factures : il n&apos;affiche que{" "}
              {isExport ? (
                "les factures dont la date d'échéance est passée"
              ) : (
                <mark className="validation-highlight">
                  les factures dont la date d&apos;échéance est passée
                </mark>
              )}
              .
            </p>
            <p>
              Refonte de la barre d&apos;actions :{" "}
              {isExport ? (
                <mark className="validation-highlight">
                  le bouton « Exporter » passe en haut à droite
                </mark>
              ) : (
                "le bouton « Exporter » passe en haut à droite"
              )}
              .
            </p>
          </div>
        </article>

        <article className="proposed-test">
          <div className="proposed-test-head">
            <p className="validation-label">Test proposé · format H</p>
            <TestPager index={testIndex} onChange={changeTest} />
          </div>
          {isExport ? <p className="test-title">{exportTest.title}</p> : null}
          <p className="test-id">
            id : {isExport ? exportTest.id : "liste-factures-filtre-echeance"}
          </p>
          <div className="test-blocks">
            <p>
              <strong>Setup :</strong> {isExport ? exportTest.setup : "Connecté avec le compte de test, sur la liste des factures."}
            </p>
            <p>
              <strong>Task :</strong>{" "}
              {editing ? (
                <textarea
                  value={taskText}
                  aria-label="Modifier la tâche"
                  onChange={(event) => setTaskText(event.target.value)}
                />
              ) : (
                taskText
              )}
            </p>
            <p>
              <strong>Verification :</strong>{" "}
              {editing ? (
                <textarea
                  value={verificationText}
                  aria-label="Modifier la vérification"
                  onChange={(event) => setVerificationText(event.target.value)}
                />
              ) : (
                <mark className="validation-highlight">{verificationText}</mark>
              )}
            </p>
            <p className="test-rule">
              {isExport
                ? exportTest.rule
                : "regle : filtre | colonne : Échéance | condition : < aujourd'hui"}
            </p>
          </div>
        </article>
      </div>

      <div className="validation-actions">
        <button
          className="validation-action is-refuse"
          type="button"
          onClick={() => {
            recordTestDecision("refused");
            showToast("Test refusé : il ne sera pas joué");
            window.location.hash = "";
          }}
        >
          Refuser
        </button>
        <button
          className="validation-action is-modify"
          type="button"
          onClick={() => setEditing(true)}
        >
          Modifier
        </button>
        <button
          className="validation-action is-accept"
          type="button"
          onClick={() => {
            recordTestDecision("accepted");
            showToast("Test accepté, écrit dans vault-horama/facturo/tests/liste-factures-filtre-echeance.md");
            window.location.hash = "screen-11-3";
          }}
        >
          Accepter le test
        </button>
        {editing && (
          <button
            className="validation-action is-accept"
            type="button"
            onClick={() => {
              setEditing(false);
              showToast("Test modifié");
            }}
          >
            Enregistrer
          </button>
        )}
      </div>
    </section>
  );
}

const answers = [
  { value: "yes" as const, label: "Oui (≤ aujourd'hui)" },
  { value: "no" as const, label: "Non (< aujourd'hui)" },
  { value: "other" as const, label: "Autre réponse" },
];

function RuleQuestion() {
  const {
    showToast,
    questionAnswer,
    setQuestionAnswer,
    setVerificationText,
    customAnswer,
    setCustomAnswer,
  } = usePrototype();

  const chooseAnswer = (answer: QuestionAnswer) => {
    setQuestionAnswer(answer);
    if (answer === "yes") {
      setVerificationText("FAIL if une ligne affichée a une échéance > aujourd'hui.");
    }
    if (answer === "no") {
      setVerificationText("FAIL if une ligne affichée a une échéance >= aujourd'hui.");
    }
    showToast("Réponse enregistrée dans le vault");
  };

  return (
    <section className="rule-question" aria-labelledby="rule-question-title">
      <div className="question-copy">
        <span className="question-badge" aria-hidden="true">
          [ ? ]
        </span>
        <h2 id="rule-question-title">
          Question sur la règle : « échéance passée » inclut-elle le jour même ?
        </h2>
      </div>
      <div className="answer-options" role="group" aria-label="Réponse à la question">
        {answers.map((item) => (
          <button
            className={questionAnswer === item.value ? "is-selected" : ""}
            type="button"
            aria-pressed={questionAnswer === item.value}
            onClick={() => chooseAnswer(item.value)}
            key={item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      {questionAnswer === "other" && (
        <div className="custom-answer">
          <input
            value={customAnswer}
            aria-label="Autre réponse"
            onChange={(event) => setCustomAnswer(event.target.value)}
          />
          <button type="button" onClick={() => showToast("Réponse enregistrée dans le vault")}>
            Envoyer
          </button>
        </div>
      )}
    </section>
  );
}

function Mascot() {
  return (
    <div className="mascot validation-mascot" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 96 66">
        <g fill="#AFA9EC" stroke="#1C1C1C" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M30 46C24 30 10 24 2 28c6 3 7 7 5 10 5 1 7 5 5 8 5 1 8 5 7 9 5-1 9-4 11-9Z" />
          <path d="M66 46C72 30 86 24 94 28c-6 3-7 7-5 10-5 1-7 5-5 8-5 1-8 5-7 9-5-1-9-4-11-9Z" />
        </g>
        <circle cx="48" cy="48" r="20" fill="#fff" stroke="#1C1C1C" strokeWidth="3" />
        <circle cx="48" cy="48" r="10.5" fill="#C48A1E" />
        <circle cx="48" cy="48" r="4.6" fill="#1C1C1C" />
        <circle cx="51.6" cy="44.4" r="2.2" fill="#fff" />
        <rect
          x="66"
          y="6"
          width="22"
          height="22"
          fill="#C48A1E"
          stroke="#1C1C1C"
          strokeWidth="2.5"
        />
        <path
          d="M73.2 13.6Q73.4 10.2 77 10.2Q80.8 10.3 80.7 13.5Q80.6 15.6 78.2 16.8Q77 17.4 77 19.2"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="77" cy="23.6" r="1.8" fill="#fff" />
      </svg>
    </div>
  );
}

export default function Screen() {
  const { lightMode, toggleTheme } = usePrototype();

  return (
    <div className={`app-shell validation-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="validation-heading">
            <h1>Tests à valider</h1>
            <p>Note de version v13 · 2 tests proposés · 1 question</p>
          </header>
          <ProposedTest />
          <RuleQuestion />
        </div>
      </main>
      <Mascot />
    </div>
  );
}
