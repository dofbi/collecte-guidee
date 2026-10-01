# Journal des versions

## 1.1.0 — 1er octobre 2026

Règles de collecte du contrat du 1er octobre 2026 (voir `docs/regles-de-collecte.md`). **Le formulaire Kobo change : remplacez-le (*Replace form*) avant de publier l'app.**

- Présence à quatre états et portée du relevé (tronc commun).
- Quatre formes de quantité (exacte, fourchette, minimum seul, inconnue), sans valeur par défaut ; une vue partielle transforme un comptage en minimum.
- Méthode explicite (comptage, structure, témoignage, document, bande de jugement) et type de source.
- Propos ou document rapporté conservé tel quel, même avec un montant.
- Fourniture facultative sur trois axes indépendants, « non recueilli » par défaut.
- Historique : refaire un poste conserve la saisie précédente ; champ « fait à compléter ».
- Contexte facultatif : événement, hors événement ou indéterminé.
- Position GPS facultative, jamais automatique, désactivable (`gps` dans `config/instance.json`).
- Écran « Relire avant envoi » ; une observation en attente peut être reprise en modification.
- Protocole `mapomo_v1` 1.1.0, formulaire Kobo régénéré ; documentation des REST Services de Kobo.

## 1.0.2 — 30 septembre 2026

- Le proxy inscrit lui-même le code collecteur validé dans l'observation envoyée à Kobo : plus d'erreur `code_incoherent` quand le téléphone a préparé l'observation avec une ancienne version de l'app ou sans code.

## 1.0.1 — 30 septembre 2026

- Diagnostic d'envoi : `GET /.netlify/functions/submit` liste les variables manquantes ; `?verifier=1` teste l'accès au serveur Kobo, sans révéler de secret.
- Le message d'erreur renvoyé par KoboToolbox est affiché dans l'app.
- Si le jeton d'API est refusé et qu'un identifiant est configuré, le proxy réessaie en authentification Basic.
- Le code collecteur saisi après la fin d'une observation est bien pris en compte à l'envoi.
- Codes collecteurs : guillemets et espaces tolérés dans `COLLECT_CODES` ; une liste vide est signalée comme erreur de configuration, et le diagnostic indique le nombre de codes lus.

## 1.0.0 — 30 septembre 2026

- Application web progressive (PWA) installable, utilisable hors ligne.
- Moteur générique : le protocole de collecte est décrit en JSON (`config/protocole.json`) ; aucun poste n'est codé en dur.
- Protocole de référence `mapomo_v1` conforme à la Méthodologie v1 du Mapomo Innovation Lab (8 postes, en-tête d'événement type × échelle).
- Exemple minimal `porte_a_porte` pour montrer la réutilisation sans code.
- Génération du formulaire KoboToolbox (XLSForm) à partir du même protocole, utilisable aussi dans KoboCollect et Enketo.
- Envoi vers KoboToolbox (OpenRosa) via un proxy qui garde le jeton côté serveur ; file d'envoi et reprise automatique.
- Code collecteur pseudonyme, purge après envoi, pas de GPS, interface FR / EN.
- Licence AGPL-3.0.

## 0.1.0 — 29 septembre 2026

- Maquette cliquable de la collecte guidée (5 postes, stockage local).
