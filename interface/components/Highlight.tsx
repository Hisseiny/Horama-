import type { ReactNode } from "react";
import type { EtatRegle } from "../lib/states";

// The one signature of Horama: a verifiable sentence, highlighted according to the state of its rule.
export function Highlight({ etat, children }: { etat: EtatRegle; children: ReactNode }) {
  return <mark className={`hl hl-${etat}`}>{children}</mark>;
}
