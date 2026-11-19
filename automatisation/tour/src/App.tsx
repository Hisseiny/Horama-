// The tower of control (#149, #238), online: the screens of the prototype of Axil on real data, and its login, for the
// team account that writes. 11.8 Passages et rapports (default), 11.4 Rapport (#rapport/<cle>), 11.6 À relire (#relire,
// #relire/<cle>), 11.1 Couverture (#couverture), 11.2 Tests à valider (#tests, #tests/<id>), 11.3 En direct (#direct),
// 11.5 Comparer (#comparer, #comparer/<page>), 11.7 Corrections de doc (#doc), the login (#connexion). A source that is
// silent says so: no example data online.
import { useCallback, useEffect, useState } from "react";
import { charger, type Chargement } from "./donnees";
import { lireRoute } from "./tour/Commun";
import Passages from "./tour/Passages";
import Rapport from "./tour/Rapport";
import ARelire from "./tour/ARelire";
import Connexion from "./tour/Connexion";
import Couverture from "./tour/Couverture";
import Tests from "./tour/Tests";
import Direct from "./tour/Direct";
import Comparer from "./tour/Comparer";
import Corrections from "./tour/Corrections";

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
    charger().then(setData, () => setData({ passages: [], erreurs: ["Chargement impossible : rechargez la page."], source: null, vault: null, vaultSource: null, manifeste: null, agent: null }));
  }, []);
  useEffect(recharger, [recharger]);
  if (route.ecran === "connexion") return <Connexion retour={retour} />;
  if (route.ecran === "rapport") return <Rapport route={route} data={data} />;
  if (route.ecran === "relire") return <ARelire route={route} data={data} onRecharger={recharger} />;
  if (route.ecran === "couverture") return <Couverture route={route} data={data} />;
  if (route.ecran === "tests") return <Tests route={route} data={data} onRecharger={recharger} />;
  if (route.ecran === "direct") return <Direct route={route} data={data} onRecharger={recharger} />;
  if (route.ecran === "comparer") return <Comparer route={route} data={data} />;
  if (route.ecran === "doc") return <Corrections route={route} data={data} />;
  return <Passages route={route} data={data} />;
}
