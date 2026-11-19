# Essais du 19 novembre 2026 : rester sur le site, pont neuf, lien choisi par adresse (#178)

Branche `178-rester-sur-le-site`, depuis `dev` (`268fd28`). Avant = `dev` sans changement, après = la branche.

## Ce qui a été lancé

- Chrome 156 dédié sur la VM Linux, CDP 9333, fenêtre 1280 × 900, `--force-device-scale-factor=1`, profil neuf.
- `node explorer.ts --url <adresse> --max 8 --sans-base --vault <copie du vault> --sortie <dossier>` dans `agent/`,
  clé de développement `HORAMA_HAI_API_KEY` passée en `HAI_API_KEY`, pont `holo local browser` de `~/.venvs/holo`.
- Une seule session H à la fois, les quatre passages l'un après l'autre. Simple visiteur : aucun formulaire, aucune connexion.
- `pnpm -r --if-present run check` : vert, 265 tests de `agent/` réussis, 0 échec.

## Mesures

| Passage | Code | Adresse de départ | Pages | Sessions H | Durée | Coût H | Sorties du site ramenées | Arrivées clic / adresse |
|---|---|---|---|---|---|---|---|---|
| `2026-11-19-01h00-dc13` | avant | `https://www.albertschool.com` (redirigée vers `/en`) | 8/8 | 1 | 244,7 s | 0,1021 $ | non journalisé | 4 / 3 |
| `2026-11-19-00h57-8ea4` | après | `https://www.albertschool.com` (redirigée vers `/en`) | 8/8 | 1 | 222,9 s | 0,0896 $ | 0 | 4 / 3 |
| `2026-11-19-01h10-65c7` | avant | `https://www.albertschool.com/fr` | 8/8 | 1 | 278,6 s | 0,1411 $ | non journalisé | 4 / 3 |
| `2026-11-19-01h05-5a0d` | après | `https://www.albertschool.com/fr` | 8/8 | 1 | 280,8 s | 0,1454 $ | 2 | 4 / 3 |

Référence de l'issue (passage de la scène, avant ce travail) : 4 pages sur 8, 322,7 s, 0,1031 $, arrêt après l'ouverture
de `https://partners.albertschool.com/` (lien « Entreprises partenaires » en `target="_blank"`) puis `invalid session id` du pont.

## Ce qui en est sorti

- Après, départ `/fr` : H a ouvert deux fois le sous-domaine `partners.` depuis le menu. Les deux fois, l'explorateur l'a
  journalisé (`Sortie du site : https://partners.albertschool.com/?_gl=…`), a renvoyé l'onglet sur la dernière page du site
  et prévenu H ; aucun relevé ni contrôle sur le sous-domaine, la page `fr-corp-partners` a ensuite été atteinte par clic.
  Aucun pont mort, une seule session, 8/8.
- Avant, mêmes adresses, le code de `dev` atteint aussi 8/8 aujourd'hui : l'échec 4/8 de l'issue venait du passage par la
  scène (onglet ouvert par `target="_blank"`), corrigé côté scène par Nathan (#177). Le code `dev` ne journalise pas les
  sorties : on ne sait pas si H est sorti du site pendant les passages « avant ».
- Aucun journal de pont des quatre passages ne contient `invalid session id` : la détection du pont mort et la relance avec
  un pont neuf ne sont vérifiées que par les tests sans réseau.
- Durée et coût varient d'un passage à l'autre (12 clics au départ `/fr` dans les deux cas) ; un passage par cas ne permet
  pas de conclure sur un gain de temps ou de coût.
