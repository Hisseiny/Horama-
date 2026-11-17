import type { ReactNode } from "react";
import { formatDate, today } from "../lib/data.ts";
import type { Version } from "../regressions.ts";

const DARK_MODE_SCRIPT =
  'document.addEventListener("click",function(event){var target=event.target;if(!(target instanceof Element))return;var button=target.closest("[data-darkmode]");if(!button)return;var dark=document.documentElement.classList.toggle("sombre");button.textContent=dark?"Revenir au mode clair":"Mode sombre";});';

export function Shell({ version, active, children }: { version: Version; active: "tableau-de-bord" | "factures"; children: ReactNode }) {
  return (
    <>
      <nav className="sidebar">
        <div className="brand">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" fill="#1f4fb5" />
            <rect x="4" y="4" width="8" height="2" fill="#ffffff" />
            <rect x="4" y="8" width="5" height="2" fill="#ffffff" />
          </svg>
          Facturo
        </div>
        <a className={active === "tableau-de-bord" ? "on" : undefined} href={`/v${version}/tableau-de-bord`}>Tableau de bord</a>
        <a className={active === "factures" ? "on" : undefined} href={`/v${version}/factures`}>Factures</a>
      </nav>
      <header className="topbar">
        <span className="account">Compte de démo</span>
        <span className="today">{`Aujourd'hui : ${formatDate(today())}`}</span>
        <a className="logout" href="/deconnexion">Se déconnecter</a>
        <button type="button" className="darkmode" data-darkmode="">
          Mode sombre
        </button>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </header>
      <main className="content">{children}</main>
    </>
  );
}
