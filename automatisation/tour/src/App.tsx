// The tower of control (#149, #238), online: three screens of the prototype of Axil (11.8, 11.4, 11.6) on real data, and
// its login, for the team account that decides in 11.6. The screens without a real source yet (11.1, 11.2, 11.3, 11.5,
// 11.7) are not served: no example data online.
import { useCallback, useEffect, useState } from "react";
import { charger, type Chargement } from "./donnees";
import { lireRoute } from "./tour/Commun";
import Passages from "./tour/Passages";
import Rapport from "./tour/Rapport";
import ARelire from "./tour/ARelire";
import Connexion from "./tour/Connexion";

// The screen the login goes back to: the one open before #connexion (passages when the login was opened directly).
let retour = "";

export default function App() {
  const [route, setRoute] = useState(lireRoute);
  const [data, setData] = useState<Chargement | null>(null);
  useEffect(() => {
    const sync = (event: HashChangeEvent) => {
      const next = lireRoute();
      if (next.ecran === "connexion") {
        const avant = new URL(event.oldURL).hash.replace(/^#/, "");
        if (!avant.startsWith("connexion")) retour = avant;
      }
      setRoute(next);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  // Read again after a decision: the data on screen stay until the new ones arrive.
  const recharger = useCallback(() => {
    charger().then(setData, (error) => setData({ passages: [], erreurs: [`Chargement impossible (${error.message}).`], source: null, vault: null, agent: null }));
  }, []);
  useEffect(recharger, [recharger]);
  if (route.ecran === "connexion") return <Connexion retour={retour} />;
  if (route.ecran === "rapport") return <Rapport route={route} data={data} />;
  if (route.ecran === "relire") return <ARelire route={route} data={data} onRecharger={recharger} />;
  return <Passages route={route} data={data} />;
}
