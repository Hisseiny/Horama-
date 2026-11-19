// The tower of control (#149, #238), online: three screens of the prototype of Axil (11.8, 11.4, 11.6) on real data. The
// screens without a real source yet (11.1, 11.2, 11.3, 11.5, 11.7) are not served: no example data online.
import { useEffect, useState } from "react";
import { charger, type Chargement } from "./donnees";
import { lireRoute } from "./tour/Commun";
import Passages from "./tour/Passages";
import Rapport from "./tour/Rapport";
import ARelire from "./tour/ARelire";

export default function App() {
  const [route, setRoute] = useState(lireRoute);
  const [data, setData] = useState<Chargement | null>(null);
  useEffect(() => {
    const sync = () => {
      setRoute(lireRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    charger().then(setData, (error) => setData({ passages: [], erreurs: [`Chargement impossible (${error.message}).`], source: null, vault: null, agent: null }));
  }, []);
  if (route.ecran === "rapport") return <Rapport route={route} data={data} />;
  if (route.ecran === "relire") return <ARelire route={route} data={data} />;
  return <Passages route={route} data={data} />;
}
