import "./notes.css";
import { notFound } from "next/navigation";
import { accepterTest, lireNote, proposerTests } from "../../../../lib/donnees";
import { NoteAndTests } from "./NoteAndTests";

// Steps 2 and 3. From the release note to the test: proposed, then accepted.
export default async function NotePage({ params, searchParams }: {
  params: Promise<{ logiciel: string; version: string }>;
  searchParams: Promise<{ etat?: string }>;
}) {
  const { logiciel, version } = await params;
  const { etat } = await searchParams;
  const tests = await proposerTests(logiciel, version);
  if (!tests.length) notFound();
  const note = await lireNote(logiciel, tests[0].source);

  // ?etat=accepte shows the screen after the answers and "Accepter" on the first test
  // (each question answered with its last choice, the one the accepted test of the vault was written with).
  let accepted;
  if (etat === "accepte") {
    const reponses = Object.fromEntries(tests[0].questions.map((q) => [q.texte, q.choix[q.choix.length - 1]]));
    accepted = { id: (await accepterTest(tests[0], reponses)).id, reponses };
  }

  return <NoteAndTests key={etat ?? "propose"} version={version} note={note} tests={tests} accepted={accepted} />;
}
