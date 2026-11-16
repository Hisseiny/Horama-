import "./direct.css";
import { notFound } from "next/navigation";
import { LOGICIEL } from "../../../../lib/config";
import { lireFil, lirePassage, lireRapport, listerEcrans } from "../../../../lib/donnees";
import { screenshot } from "../../../../lib/screenshots";
import { Live } from "./Live";

// Step 4. The passage, live: the thread of the agent fills at the pace of the agent.
export default async function DirectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ instant?: string }>;
}) {
  const { id } = await params;
  const { instant } = await searchParams;
  const [passage, evenements, rapport, l] = await Promise.all([lirePassage(id), lireFil(id), lireRapport(id), listerEcrans(LOGICIEL)]);
  if (!passage) notFound();
  return (
    <Live
      passage={passage}
      evenements={evenements}
      images={evenements.flatMap((e) => (e.capture_url ? [screenshot(e.capture_url)] : []))}
      tests={l.tests.map(({ id, titre, etat }) => ({ id, titre, etat }))}
      replays={Object.fromEntries((rapport?.tests ?? []).flatMap((t) => (t.replay_url ? [[t.test_id, t.replay_url]] : [])))}
      nom={l.nom}
      now={Date.now()}
      instant={instant === undefined ? undefined : Number(instant)}
    />
  );
}
