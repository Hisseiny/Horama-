# Extension prête pour un jury à distance (#133, 19/11)

Le jury évalue Horama à distance, sans le Mac de Nathan : le mode grand public passe par Railway, la page d'accueil (horama-gold) et l'extension.

## Ce qui change

- `extension/manifest.json` : version 0.2.0 (charte, direct, rapport commun avec la page d'accueil, depuis la 0.1.0).
- `accueil/horama-extension.zip` : le `.zip` de l'extension (`sh extension/empaqueter.sh`, 21 fichiers, 45 305 octets), servi avec la page d'accueil à l'adresse https://horama-gold.vercel.app/horama-extension.zip après la fusion dans `dev` (Vercel redéploie la page d'accueil). Le dépôt Horama est privé : une release GitHub ne serait pas téléchargeable par le jury.
- `accueil/index.html` : sous le champ « Envoyer Horama » du haut de la page, la ligne qui renvoyait vers la page de la marque devient « Ou installez l'extension Chrome (.zip), à charger dans chrome://extensions », le lien téléchargeant le `.zip`. Captures à 1440 et 390 px : `captures/2026-11-19-release-extension/` (aucun débordement à 390 px, émulation mobile).
- `README.md`, « Essayer Horama » : les deux chemins pour un jury à distance, sans rien installer (horama-gold) ou par l'extension (le `.zip` à télécharger) ; l'adresse du service réglée (Railway) ; comment refaire et publier le `.zip`.

## Ce qui a été lancé, et ce qui en est sorti

- Le `.zip` contient `DEFAULT_SERVICE = "https://explorations-production-70bf5b38.up.railway.app"` et la version 0.2.0 (lu dans l'archive).
- `GET /sante` du service Railway : 200.
- L'extension dézippée de ce `.zip`, chargée dans un Chrome d'essai : la fenêtre s'ouvre (« Envoyer Horama ») ; le rapport d'une exploration inconnue interroge Railway par l'adresse par défaut et affiche sa réponse, « Exploration inconnue. ». Aucune exploration envoyée.

## Ce qui n'est pas testé

- Le téléchargement depuis horama-gold : après la fusion dans `dev`.
- Une exploration réelle depuis l'extension : elle consomme la clé H du service (Ali, #208).
- Une release GitHub n'est pas créée : elle attend Nathan, et ne servirait qu'à l'équipe (dépôt privé).
