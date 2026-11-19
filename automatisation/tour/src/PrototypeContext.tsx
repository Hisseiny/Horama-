import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ReviewDecision = "bug" | "wanted";
export type QuestionAnswer = "yes" | "no" | "other";
export type JournalDecision = "bug" | "wanted";
export type JournalEntry = {
  id: string;
  date: string;
  screen: string;
  rule: string;
  decision: JournalDecision;
  detail?: string;
  author: string;
  version?: string;
  why?: string;
  noteStatus?: "proposée" | "acceptée" | "refusée";
};

type PrototypeContextValue = {
  lightMode: boolean;
  toggleTheme: () => void;
  showToast: (message: string) => void;
  reviewDecisions: Record<string, ReviewDecision | null>;
  decideReview: (
    caseId: string,
    decision: ReviewDecision,
    why?: string,
    source?: { screen: string; rule: string },
  ) => void;
  undoReview: (caseId: string) => void;
  reviewCount: number;
  questionAnswer: QuestionAnswer | null;
  setQuestionAnswer: (answer: QuestionAnswer) => void;
  taskText: string;
  setTaskText: (value: string) => void;
  verificationText: string;
  setVerificationText: (value: string) => void;
  customAnswer: string;
  setCustomAnswer: (value: string) => void;
  journalEntries: JournalEntry[];
  recordTestDecision: (decision: "accepted" | "refused") => void;
  recordNoteDecision: (corrected: boolean) => void;
};

const defaultTask =
  "1. Ouvrir le menu des filtres et choisir « Échéance dépassée ». 2. Relever le numéro et la date d'échéance de chaque ligne.";
const defaultVerification = "FAIL if une ligne affichée a une échéance >= aujourd'hui.";
const PrototypeContext = createContext<PrototypeContextValue | null>(null);

function currentJournalDate() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(":", "h");
  return `${date} ${time}`;
}

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [lightMode, setLightMode] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision | null>>({
    defect: null,
    suspect: null,
  });
  const [questionAnswer, setQuestionAnswer] = useState<QuestionAnswer | null>(null);
  const [taskText, setTaskText] = useState(defaultTask);
  const [verificationText, setVerificationText] = useState(defaultVerification);
  const [customAnswer, setCustomAnswer] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const upsertJournalEntry = useCallback((entry: Omit<JournalEntry, "date" | "author">) => {
    setJournalEntries((current) => [
      { ...entry, date: currentJournalDate(), author: "Jane Doe" },
      ...current.filter((item) => item.id !== entry.id),
    ]);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);
  const toggleTheme = useCallback(() => setLightMode((value) => !value), []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const decideReview = useCallback(
    (
      caseId: string,
      decision: ReviewDecision,
      why?: string,
      source?: { screen: string; rule: string },
    ) => {
      setReviewDecisions((current) => ({ ...current, [caseId]: decision }));
      upsertJournalEntry({
        id: `review-${caseId}`,
        screen:
          source?.screen ??
          (caseId === "defect" ? "Tableau de bord et Liste des factures" : "Liste des factures"),
        rule:
          source?.rule ??
          (caseId === "defect" ? "regles-entre-ecrans.md" : "liste-des-factures.md"),
        decision,
        version: "v13",
        why: why?.trim() || undefined,
      });
    },
    [upsertJournalEntry],
  );
  const undoReview = useCallback((caseId: string) => {
    setReviewDecisions((current) => ({ ...current, [caseId]: null }));
    setJournalEntries((current) => current.filter((item) => item.id !== `review-${caseId}`));
  }, []);
  const reviewCount =
    8 - Object.values(reviewDecisions).filter((decision) => decision !== null).length;

  const recordTestDecision = useCallback(
    (decision: "accepted" | "refused") => {
      upsertJournalEntry({
        id: "test-validation",
        screen: "Liste des factures",
        rule: "liste-des-factures.md",
        decision: decision === "accepted" ? "wanted" : "bug",
        detail: decision === "accepted" ? "test accepté" : "test refusé",
      });
    },
    [upsertJournalEntry],
  );

  const recordNoteDecision = useCallback(
    (corrected: boolean) => {
      upsertJournalEntry({
        id: "note-correction",
        screen: "Liste des factures",
        rule: "liste-des-factures.md",
        decision: "wanted",
        detail: corrected ? "note corrigée" : "note conservée",
      });
    },
    [upsertJournalEntry],
  );

  const value = useMemo(
    () => ({
      lightMode,
      toggleTheme,
      showToast,
      reviewDecisions,
      decideReview,
      undoReview,
      reviewCount,
      questionAnswer,
      setQuestionAnswer,
      taskText,
      setTaskText,
      verificationText,
      setVerificationText,
      customAnswer,
      setCustomAnswer,
      journalEntries,
      recordTestDecision,
      recordNoteDecision,
    }),
    [
      lightMode,
      toggleTheme,
      showToast,
      reviewDecisions,
      decideReview,
      undoReview,
      reviewCount,
      questionAnswer,
      taskText,
      verificationText,
      customAnswer,
      journalEntries,
      recordTestDecision,
      recordNoteDecision,
    ],
  );

  return (
    <PrototypeContext.Provider value={value}>
      {children}
      {toast && (
        <div className="prototype-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("usePrototype must be used inside PrototypeProvider");
  return context;
}
