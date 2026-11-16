"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// The eight steps of the loop, the current one marked.
export function Steps({ notes, passage, comparaison }: { notes: string; passage?: string; comparaison?: string }) {
  const path = usePathname();
  const accepted = useSearchParams().get("etat") === "accepte";
  const current =
    path === "/" ? 1
    : path.startsWith("/notes/") ? (accepted ? 3 : 2)
    : path.endsWith("/direct") ? 4
    : path.includes("/comparaison/") ? 5
    : path === "/relecture" ? 6
    : path === "/derive" ? 7
    : path.startsWith("/passages/") ? 8
    : 0;
  const steps = [
    ["Couverture", "/"],
    ["Tests proposés", notes],
    ["Test accepté", `${notes}?etat=accepte`],
    ["Passage en direct", `/passages/${passage}/direct`],
    ["Comparaison", `/passages/${passage}/comparaison/${comparaison}`],
    ["Relecture", "/relecture"],
    ["Dérive documentaire", "/derive"],
    ["Rapport", `/passages/${passage}`],
  ];
  return (
    <nav className="etapes" aria-label="Étapes de la boucle">
      <ol>
        {steps.map(([label, href], i) => (
          <li key={label}>
            <Link href={href} aria-current={current === i + 1 ? "step" : undefined} data-etape={i + 1}>
              <span className="mono">{i + 1}</span>
              {label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
