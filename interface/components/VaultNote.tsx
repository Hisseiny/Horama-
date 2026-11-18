import type { ReactNode } from "react";
import { plainText, splitFrontMatter } from "../lib/markdown";
import type { EtatRegle } from "../lib/states";
import { Highlight } from "./Highlight";

// A note as it is in the vault, with the sentences that carry a rule highlighted according to their state.
export function VaultNote({ contenu, passages = [] }: { contenu: string; passages?: { texte: string; etat: EtatRegle }[] }) {
  const { body } = splitFrontMatter(contenu);
  const frontMatter = contenu.slice(0, contenu.length - body.length).trim();
  const mark = (text: string): ReactNode => {
    const passage = passages.find((p) => text.includes(p.texte));
    if (!passage) return plainText(text);
    const i = text.indexOf(passage.texte);
    return (
      <>
        {plainText(text.slice(0, i))}
        <Highlight etat={passage.etat}>{passage.texte}</Highlight>
        {mark(text.slice(i + passage.texte.length))}
      </>
    );
  };
  return (
    <div className="note">
      {frontMatter && <pre className="mono second">{frontMatter}</pre>}
      {body.split("\n").filter((line) => line.trim()).map((line, i) =>
        line.startsWith("# ") ? <p key={i} className="note-titre">{line.slice(2)}</p>
        : line.startsWith("## ") ? <p key={i} className="note-section">{line.slice(3)}</p>
        : line.startsWith("- ") ? <p key={i} className="note-puce">{mark(line.slice(2))}</p>
        : /^\s+regle:/.test(line) ? <p key={i} className="note-regle mono second">{line.trim()}</p>
        : <p key={i}>{mark(line)}</p>,
      )}
    </div>
  );
}
