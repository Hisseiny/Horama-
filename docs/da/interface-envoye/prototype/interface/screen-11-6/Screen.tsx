import { useEffect, useState } from "react";
import { usePrototype, type ReviewDecision } from "../../src/PrototypeContext";
import { Icon } from "../screen-11-1/Icons";
import { coverage } from "../screen-11-1/data";
import "./styles.css";

type Decision = ReviewDecision | null;

function Logo() {
  return (
    <div className="brand review-brand" aria-label="Horama">
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
        <div className="review-subscription">14 / 40 passages · PRO</div>
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

function StatusPill({ status }: { status: "defect" | "suspect" }) {
  return (
    <span className={`review-status is-${status}`}>
      {status === "defect" ? "[ ! ] Défaut prouvé" : "[ ? ] Suspect"}
    </span>
  );
}

function ProofThumbnail({ title, amount }: { title: string; amount: string }) {
  return (
    <div className="proof-thumbnail">
      <span>{title}</span>
      <div className="thumbnail-surface">
        <small>à mesurer</small>
        <strong>
          {amount}
          <svg viewBox="0 0 210 50" aria-hidden="true">
            <path d="M8 28C22 7 177 2 201 18C219 30 192 45 154 46C96 48 24 45 10 37C4 33 4 31 8 28Z" />
          </svg>
        </strong>
      </div>
    </div>
  );
}

function OcreDots() {
  return (
    <span className="review-dots" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function VisualThumbnail({ version, after }: { version: string; after?: boolean }) {
  return (
    <div className="visual-thumbnail">
      <span>{version}</span>
      <div className="visual-surface">
        <span className={`visual-export${after ? " is-after" : ""}`}>
          Exporter
          <OcreDots />
        </span>
        <span className="visual-line" />
        <span className="visual-line is-short" />
      </div>
    </div>
  );
}

function DecisionButtons({
  decision,
  onDecision,
  primary,
}: {
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
  primary: Exclude<Decision, null>;
}) {
  const decisions = primary === "bug" ? (["wanted", "bug"] as const) : (["bug", "wanted"] as const);

  return (
    <div className="decision-buttons">
      {decisions.map((value) => {
        const label = value === "wanted" ? "C'est voulu" : "C'est un bug";
        const isPrimary = value === primary;
        return (
          <button
            className={`${isPrimary ? "is-primary" : "is-secondary"} is-${value}${decision === value ? " is-selected" : ""}`}
            type="button"
            aria-pressed={decision === value}
            onClick={() => onDecision(value)}
            key={value}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DecisionContext({
  why,
  onWhyChange,
}: {
  why: string;
  onWhyChange: (value: string) => void;
}) {
  return (
    <div className="decision-context">
      <label className="why-field">
        <span>Pourquoi ? (facultatif)</span>
        <input
          type="text"
          value={why}
          placeholder="Une phrase suffit"
          onChange={(event) => onWhyChange(event.target.value)}
        />
      </label>
      <p className="decision-scope">Portée : cet écart, cet écran, cette version</p>
    </div>
  );
}

function IssueButton() {
  const { showToast } = usePrototype();
  return (
    <button
      className="issue-button"
      type="button"
      onClick={() => showToast("Issue préparée avec captures et replay")}
    >
      Créer l’issue GitHub
    </button>
  );
}

function DefectCard({
  decision,
  onDecision,
  why,
  onWhyChange,
}: {
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
  why: string;
  onWhyChange: (value: string) => void;
}) {
  return (
    <article className="review-case is-defect">
      <header className="case-heading">
        <StatusPill status="defect" />
        <div>
          <h2>Tableau de bord et Liste des factures</h2>
          <span>regles-entre-ecrans.md</span>
        </div>
      </header>

      <div className="case-layout">
        <div>
          <section className="calculation-proof">
            <h3>Preuve par le calcul</h3>
            <p>Le CA du mois du tableau de bord égale le total des factures du mois.</p>
            <div>
              <span>mesuré (tableau de bord) : 1 240,00 €</span>
              <span>mesuré (liste des factures) : 1 420,00 €</span>
              <strong>attendu : égalité (écart calculé de 180,00 €)</strong>
            </div>
          </section>
          <div className="proof-thumbnails">
            <ProofThumbnail title="Tableau de bord" amount="1 240,00 €" />
            <ProofThumbnail title="Liste des factures" amount="1 420,00 €" />
          </div>
          <button
            className="replay-button"
            type="button"
            onClick={() => window.open("https://hub.hcompany.ai", "_blank", "noopener,noreferrer")}
          >
            Voir le replay H Company ↗
          </button>
        </div>
        <DecisionButtons decision={decision} onDecision={onDecision} primary="bug" />
      </div>
      <DecisionContext why={why} onWhyChange={onWhyChange} />
    </article>
  );
}

function SuspectCard({
  decision,
  onDecision,
  why,
  onWhyChange,
}: {
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
  why: string;
  onWhyChange: (value: string) => void;
}) {
  return (
    <article className="review-case is-suspect">
      <header className="case-heading">
        <StatusPill status="suspect" />
        <div>
          <h2>Liste des factures : bouton Exporter déplacé</h2>
          <p>Ce changement visuel entre la v12 et la v13 est-il un bug, ou voulu ?</p>
        </div>
      </header>
      <div className="case-layout compact">
        <div className="visual-thumbnails">
          <VisualThumbnail version="v12 (avant)" />
          <VisualThumbnail version="v13 (après)" after />
        </div>
        <DecisionButtons decision={decision} onDecision={onDecision} primary="wanted" />
      </div>
      <DecisionContext why={why} onWhyChange={onWhyChange} />
    </article>
  );
}

function Mascot() {
  return (
    <div className="mascot review-mascot" aria-hidden="true">
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

function ResolvedCase({ decision, onUndo }: { decision: ReviewDecision; onUndo: () => void }) {
  return (
    <div className="resolved-case">
      <strong>Tranché : {decision === "bug" ? "bug" : "voulu"}</strong>
      {decision === "bug" && (
        <>
          <span>·</span>
          <button type="button" onClick={onUndo}>
            annuler
          </button>
          <IssueButton />
        </>
      )}
    </div>
  );
}

// ARelire/ancien-contenu : ancienne mise en page de l'écran, gardée masquée pour pouvoir la restaurer.
export function ARelireAncienContenu() {
  const { lightMode, toggleTheme, showToast, reviewDecisions, decideReview, undoReview } =
    usePrototype();
  const decidedCount = Object.values(reviewDecisions).filter(Boolean).length;
  const remaining = 2 - decidedCount;
  const allDecided = remaining === 0;
  const [whys, setWhys] = useState<Record<"defect" | "suspect", string>>({
    defect: "",
    suspect: "",
  });
  const setWhy = (caseId: "defect" | "suspect") => (value: string) =>
    setWhys((current) => ({ ...current, [caseId]: value }));

  const decide = (caseId: "defect" | "suspect", decision: ReviewDecision) => {
    decideReview(caseId, decision, whys[caseId]);
    if (decision === "bug") {
      showToast("Bug enregistré dans le vault");
    } else {
      window.location.hash = "screen-11-7";
    }
  };

  return (
    <div className={`app-shell review-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="review-heading">
            <h1>À relire</h1>
            <div className="review-summary">
              <strong>{remaining} cas à trancher</strong>
              {!reviewDecisions.defect && (
                <span className="summary-pill is-defect">1 défaut prouvé</span>
              )}
              {!reviewDecisions.suspect && (
                <span className="summary-pill is-suspect">1 suspect</span>
              )}
            </div>
          </header>
          {allDecided ? (
            <section className="all-resolved">
              <strong>Tout est tranché. Horama ne reposera pas ces questions.</strong>
              <div className="all-resolved-actions">
                {Object.values(reviewDecisions).includes("bug") && <IssueButton />}
                <button type="button" onClick={() => (window.location.hash = "")}>
                  Retour à la couverture
                </button>
              </div>
            </section>
          ) : (
            <div className="review-cases">
              {reviewDecisions.defect ? (
                <ResolvedCase
                  decision={reviewDecisions.defect}
                  onUndo={() => undoReview("defect")}
                />
              ) : (
                <DefectCard
                  decision={null}
                  onDecision={(decision) => decide("defect", decision)}
                  why={whys.defect}
                  onWhyChange={setWhy("defect")}
                />
              )}
              {reviewDecisions.suspect ? (
                <ResolvedCase
                  decision={reviewDecisions.suspect}
                  onUndo={() => undoReview("suspect")}
                />
              ) : (
                <SuspectCard
                  decision={null}
                  onDecision={(decision) => decide("suspect", decision)}
                  why={whys.suspect}
                  onWhyChange={setWhy("suspect")}
                />
              )}
            </div>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}

type ARelireStatus = "defect" | "suspect";
type ARelireCase = {
  id: string;
  status: ARelireStatus;
  screen: string;
  rule: string;
  ruleFile: string;
  ruleText?: string;
};
type ARelirePassage = {
  id: string;
  name: string;
  meta: string;
  startedAt: string;
  cases: ARelireCase[];
};
type ARelireOpen = { passage: string | null; case: string | null };
type Decisions = Record<string, ReviewDecision | null>;

const aRelirePassages: ARelirePassage[] = [
  {
    id: "liste-des-factures",
    name: "Liste des factures",
    meta: "v13 · 18/11 à 14:02 · 4 min 10 s",
    startedAt: "2026-11-18T14:02",
    cases: [
      {
        id: "defect",
        status: "defect",
        screen: "Tableau de bord et Liste des factures",
        rule: "CA du mois ≠ total des factures",
        ruleFile: "regles-entre-ecrans.md",
      },
      {
        id: "suspect",
        status: "suspect",
        screen: "Liste des factures",
        rule: "bouton « Exporter » déplacé",
        ruleFile: "liste-des-factures.md",
      },
      {
        id: "liste-echeance",
        status: "suspect",
        screen: "Liste des factures",
        rule: "alignement de la colonne « Échéance » modifié",
        ruleFile: "liste-des-factures.md",
      },
    ],
  },
  {
    id: "detail-facture",
    name: "Détail facture",
    meta: "v13 · 18/11 à 13:40 · à mesurer",
    startedAt: "2026-11-18T13:40",
    cases: [
      {
        id: "detail-total",
        status: "defect",
        screen: "Détail facture",
        rule: "Total TTC ≠ somme des lignes",
        ruleFile: "detail-facture.md",
        ruleText: "Le « Total TTC » est la somme de la colonne « Montant » des lignes.",
      },
      {
        id: "detail-tva",
        status: "defect",
        screen: "Détail facture",
        rule: "format de la TVA invalide",
        ruleFile: "règle à préciser",
      },
      {
        id: "detail-paiement",
        status: "suspect",
        screen: "Détail facture",
        rule: "bloc « Paiement » recouvert par la bannière",
        ruleFile: "detail-facture.md",
      },
      {
        id: "detail-regler",
        status: "suspect",
        screen: "Détail facture",
        rule: "libellé du bouton « Régler » modifié",
        ruleFile: "detail-facture.md",
      },
      {
        id: "detail-pied",
        status: "suspect",
        screen: "Détail facture",
        rule: "pied de page décalé",
        ruleFile: "detail-facture.md",
      },
    ],
  },
];

const aRelireCases = aRelirePassages.flatMap((passage) => passage.cases);

const aRelireStates: Record<string, Decisions> = {
  tranche: { defect: "bug" },
  termine: { defect: "bug", suspect: "wanted", "liste-echeance": "wanted" },
  vide: Object.fromEntries(
    aRelireCases.map((item) => [item.id, item.status === "defect" ? "bug" : "wanted"]),
  ),
};

function aRelireState() {
  return new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("etat");
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function firstOpenCase(passage: ARelirePassage, decisions: Decisions) {
  return passage.cases.find((item) => !decisions[item.id])?.id ?? null;
}

function sortPassages(decisions: Decisions) {
  const hasDefect = (passage: ARelirePassage) =>
    passage.cases.some((item) => item.status === "defect" && !decisions[item.id]);
  return [...aRelirePassages]
    .map((passage) => ({
      ...passage,
      cases: [...passage.cases].sort(
        (a, b) => Number(b.status === "defect") - Number(a.status === "defect"),
      ),
    }))
    .sort(
      (a, b) =>
        Number(hasDefect(b)) - Number(hasDefect(a)) || b.startedAt.localeCompare(a.startedAt),
    );
}

function ARelireBadge({ status, label }: { status: ARelireStatus; label?: string }) {
  return (
    <span className={`arelire-badge is-${status}`}>
      <span aria-hidden="true">{status === "defect" ? "[ ! ]" : "[ ? ]"}</span>
      {label ?? (status === "defect" ? "Défaut prouvé" : "Suspect")}
    </span>
  );
}

function ARelireCapture({ title }: { title: string }) {
  return (
    <div className="proof-thumbnail">
      <span>{title}</span>
      <div className="thumbnail-surface">
        <small>capture à mesurer</small>
      </div>
    </div>
  );
}

function ARelireCaseCard({
  item,
  decision,
  onDecision,
  why,
  onWhyChange,
}: {
  item: ARelireCase;
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
  why: string;
  onWhyChange: (value: string) => void;
}) {
  const isDefect = item.status === "defect";
  return (
    <article className={`review-case is-${item.status}`}>
      <header className="case-heading">
        <StatusPill status={item.status} />
        <div>
          <h2>
            {item.screen} : {item.rule}
          </h2>
          {isDefect ? (
            <span>{item.ruleFile}</span>
          ) : (
            <p>Ce changement visuel entre la v12 et la v13 est-il un bug, ou voulu ?</p>
          )}
        </div>
      </header>
      <div className={`case-layout${isDefect ? "" : " compact"}`}>
        <div>
          {isDefect && (
            <section className="calculation-proof">
              <h3>Preuve par le calcul</h3>
              <p>{item.ruleText ?? "Règle à préciser dans le vault."}</p>
              <div>
                <span>mesuré : à mesurer</span>
                <strong>attendu : à mesurer</strong>
              </div>
            </section>
          )}
          <div className={isDefect ? "proof-thumbnails" : "visual-thumbnails"}>
            {isDefect ? (
              <ARelireCapture title={`${item.screen} · v13`} />
            ) : (
              <>
                <ARelireCapture title="v12 (avant)" />
                <ARelireCapture title="v13 (après)" />
              </>
            )}
          </div>
          <button
            className="replay-button"
            type="button"
            onClick={() => window.open("https://hub.hcompany.ai", "_blank", "noopener,noreferrer")}
          >
            Voir le replay H Company ↗
          </button>
        </div>
        <DecisionButtons decision={decision} onDecision={onDecision} primary="wanted" />
      </div>
      <DecisionContext why={why} onWhyChange={onWhyChange} />
    </article>
  );
}

function ARelireEmpty({ hasBug }: { hasBug: boolean }) {
  return (
    <section className="arelire-empty">
      <Icon name="check" className="arelire-empty-icon" />
      <div>
        <strong>Rien à relire</strong>
        <p>Tous les cas sont tranchés. Horama ne reposera pas ces questions.</p>
      </div>
      <div className="all-resolved-actions">
        {hasBug && <IssueButton />}
        <button type="button" onClick={() => (window.location.hash = "")}>
          Retour à la couverture
        </button>
      </div>
    </section>
  );
}

export default function Screen() {
  const { lightMode, toggleTheme, showToast, reviewDecisions, decideReview, undoReview } =
    usePrototype();
  const [state] = useState(aRelireState);
  const [passages] = useState(() =>
    sortPassages({ ...reviewDecisions, ...(state ? aRelireStates[state] : {}) }),
  );
  const [open, setOpen] = useState<ARelireOpen>(() => {
    const decisions = { ...reviewDecisions, ...(state ? aRelireStates[state] : {}) };
    if (state === "fermes") return { passage: null, case: null };
    const passage =
      state === "tranche"
        ? passages.find((item) => item.id === "liste-des-factures")
        : passages.find((item) => firstOpenCase(item, decisions));
    return { passage: passage?.id ?? null, case: passage ? firstOpenCase(passage, decisions) : null };
  });
  const [whys, setWhys] = useState<Record<string, string>>({});

  useEffect(() => {
    const preset = state ? aRelireStates[state] : undefined;
    if (!preset) return;
    for (const item of aRelireCases) {
      const decision = preset[item.id];
      if (decision) decideReview(item.id, decision, undefined, { screen: item.screen, rule: item.ruleFile });
    }
  }, [state, decideReview]);

  const remaining = aRelireCases.filter((item) => !reviewDecisions[item.id]).length;
  const passagesLeft = passages.filter((passage) => firstOpenCase(passage, reviewDecisions)).length;

  const togglePassage = (passage: ARelirePassage) =>
    setOpen((current) =>
      current.passage === passage.id
        ? { passage: null, case: null }
        : { passage: passage.id, case: firstOpenCase(passage, reviewDecisions) },
    );

  const decide = (passage: ARelirePassage, item: ARelireCase, decision: ReviewDecision) => {
    decideReview(item.id, decision, whys[item.id], { screen: item.screen, rule: item.ruleFile });
    showToast(decision === "bug" ? "Bug enregistré dans le vault" : "Décision enregistrée dans le vault");
    const decisions = { ...reviewDecisions, [item.id]: decision };
    const index = passage.cases.indexOf(item);
    const rotated = [...passage.cases.slice(index + 1), ...passage.cases.slice(0, index)];
    const nextCase = rotated.find((candidate) => !decisions[candidate.id]);
    if (nextCase) {
      setOpen({ passage: passage.id, case: nextCase.id });
      return;
    }
    const nextPassage = passages.find((candidate) => firstOpenCase(candidate, decisions));
    setOpen({
      passage: nextPassage?.id ?? null,
      case: nextPassage ? firstOpenCase(nextPassage, decisions) : null,
    });
  };

  return (
    <div className={`app-shell review-screen${lightMode ? " is-light" : ""}`}>
      <Sidebar lightMode={lightMode} onToggleTheme={toggleTheme} />
      <main className="main-content" id="main">
        <div className="content-column">
          <p className="welcome-line">Bonjour, Jane</p>
          <header className="review-heading arelire-heading">
            <h1>À relire</h1>
            {remaining > 0 && (
              <p>
                {plural(remaining, "cas", "cas")}, {plural(passagesLeft, "passage", "passages")}
              </p>
            )}
          </header>
          {remaining === 0 ? (
            <ARelireEmpty hasBug={Object.values(reviewDecisions).includes("bug")} />
          ) : (
            <div className="arelire-passages">
              {passages.map((passage) => {
                const isOpen = open.passage === passage.id;
                const decided = passage.cases.filter((item) => reviewDecisions[item.id]).length;
                const total = passage.cases.length;
                const done = decided === total;
                const left = (status: ARelireStatus) =>
                  passage.cases.filter((item) => item.status === status && !reviewDecisions[item.id])
                    .length;
                return (
                  <section
                    className={`arelire-passage${isOpen ? " is-open" : ""}${done ? " is-done" : ""}`}
                    key={passage.id}
                  >
                    <h2>
                      <button
                        className="arelire-passage-header"
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`arelire-${passage.id}`}
                        onClick={() => togglePassage(passage)}
                      >
                        <Icon name="chevron" className="arelire-chevron" />
                        <span className="arelire-passage-name">
                          <strong>{passage.name}</strong>
                          <span>{passage.meta}</span>
                        </span>
                        <span className="arelire-passage-badges">
                          {done ? (
                            <span className="arelire-done">
                              <Icon name="check" />
                              Terminé
                            </span>
                          ) : (
                            <>
                              {left("defect") > 0 && (
                                <ARelireBadge
                                  status="defect"
                                  label={plural(left("defect"), "défaut prouvé", "défauts prouvés")}
                                />
                              )}
                              {left("suspect") > 0 && (
                                <ARelireBadge
                                  status="suspect"
                                  label={plural(left("suspect"), "suspect", "suspects")}
                                />
                              )}
                            </>
                          )}
                        </span>
                        <span className="arelire-progress">
                          <span>
                            {decided} / {total} tranchés
                          </span>
                          <span className="arelire-progress-bar" aria-hidden="true">
                            <span style={{ width: `${(decided / total) * 100}%` }} />
                          </span>
                        </span>
                      </button>
                    </h2>
                    {isOpen && (
                      <ol className="arelire-cases" id={`arelire-${passage.id}`}>
                        {passage.cases.map((item, index) => {
                          const decision = reviewDecisions[item.id] ?? null;
                          const caseOpen = open.case === item.id;
                          const setWhy = (value: string) =>
                            setWhys((current) => ({ ...current, [item.id]: value }));
                          const onDecision = (value: ReviewDecision) => decide(passage, item, value);
                          const goTo = (target: number) =>
                            setOpen({ passage: passage.id, case: passage.cases[target].id });
                          return (
                            <li
                              className={`arelire-case${caseOpen ? " is-open" : ""}${decision ? " is-decided" : ""}`}
                              key={item.id}
                            >
                              <div className="arelire-case-line">
                                <button
                                  className="arelire-case-row"
                                  type="button"
                                  aria-expanded={caseOpen}
                                  aria-controls={`arelire-case-${item.id}`}
                                  onClick={() =>
                                    setOpen({ passage: passage.id, case: caseOpen ? null : item.id })
                                  }
                                >
                                  <ARelireBadge status={item.status} />
                                  <span className="arelire-case-screen">{item.screen}</span>
                                  <span className="arelire-case-rule">{item.rule}</span>
                                  {decision && (
                                    <span className="arelire-decided">
                                      Tranché : {decision === "bug" ? "bug" : "voulu"}
                                    </span>
                                  )}
                                  <Icon name="chevron" className="arelire-chevron" />
                                </button>
                                {decision && (
                                  <span className="arelire-case-actions">
                                    {decision === "bug" && <IssueButton />}
                                    {decision === "wanted" && item.id === "suspect" && (
                                      <button
                                        type="button"
                                        onClick={() => (window.location.hash = "screen-11-7")}
                                      >
                                        Corriger la documentation
                                      </button>
                                    )}
                                    <button type="button" onClick={() => undoReview(item.id)}>
                                      Annuler
                                    </button>
                                  </span>
                                )}
                              </div>
                              {caseOpen && (
                                <div className="arelire-case-body" id={`arelire-case-${item.id}`}>
                                  {item.id === "defect" ? (
                                    <DefectCard
                                      decision={decision}
                                      onDecision={onDecision}
                                      why={whys[item.id] ?? ""}
                                      onWhyChange={setWhy}
                                    />
                                  ) : item.id === "suspect" ? (
                                    <SuspectCard
                                      decision={decision}
                                      onDecision={onDecision}
                                      why={whys[item.id] ?? ""}
                                      onWhyChange={setWhy}
                                    />
                                  ) : (
                                    <ARelireCaseCard
                                      item={item}
                                      decision={decision}
                                      onDecision={onDecision}
                                      why={whys[item.id] ?? ""}
                                      onWhyChange={setWhy}
                                    />
                                  )}
                                  <nav className="arelire-case-nav" aria-label={`Cas du passage ${passage.name}`}>
                                    <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>
                                      Précédent
                                    </button>
                                    <span>
                                      Cas {index + 1} / {total}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={index === total - 1}
                                      onClick={() => goTo(index + 1)}
                                    >
                                      Suivant
                                    </button>
                                  </nav>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Mascot />
    </div>
  );
}
