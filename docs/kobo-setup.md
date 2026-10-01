# Préparer KoboToolbox

## 1. Générer le formulaire

```sh
npm run generer
```

Produit `kobo/<id-du-protocole>.xlsx` (nécessite Python 3 et `openpyxl`) et les CSV lisibles de `kobo/xlsform/`. Si Python manque, ouvrez les trois CSV dans un tableur et enregistrez-les comme feuilles `survey`, `choices` et `settings` d'un même classeur `.xlsx`.

## 2. Créer le projet

1. Connectez-vous à votre serveur Kobo : global (`kf.kobotoolbox.org`), européen (`eu.kobotoolbox.org`) ou auto-hébergé.
2. **New → Upload an XLSForm**, choisissez le fichier `.xlsx`.
3. **Deploy**.
4. Notez l'**uid** du projet : c'est la partie de l'adresse après `/forms/` (ex. `aB3cD4eF5gH6`). C'est `KOBO_FORM_ID`.

## 3. Choisir l'authentification

- **Jeton d'API (recommandé)** : *Account settings → Security → API key*. C'est `KOBO_TOKEN`. Utilisez de préférence un **compte dédié** à la collecte, avec les seuls droits d'ajout de données sur ce projet.
- **Ou identifiant et mot de passe** de ce compte dédié : `KOBO_USERNAME` et `KOBO_PASSWORD` (authentification Basic).

Laissez l'option « submissions without username and password » **désactivée** : c'est le proxy qui s'authentifie.

## 4. L'adresse de soumission

C'est le point OpenRosa utilisé par KoboCollect :

| Serveur | `KOBO_SUBMISSION_URL` |
|---|---|
| Global | `https://kc.kobotoolbox.org/submission` |
| Europe | `https://kc-eu.kobotoolbox.org/submission` |
| Auto-hébergé | `https://kc.<votre-domaine>/submission` |

## 5. Vérifier avant la collecte

1. Déployez l'app avec un code collecteur de test.
2. Remplissez une observation, envoyez-la.
3. Vérifiez qu'elle apparaît dans **Data** du projet Kobo, avec les bons champs.
4. Renvoyez-la (réglage « purge » désactivé) : Kobo doit la reconnaître comme doublon (même `instanceID`).

Avant ce test, `https://<votre-site>/.netlify/functions/submit?verifier=1` doit indiquer `"accepte": true`. En cas d'échec, chaque message est expliqué dans [depannage.md](depannage.md).

## Mettre à jour le formulaire (par exemple pour la version 1.1)

1. `npm run generer` (ou prenez le `kobo/<id>.xlsx` du dépôt).
2. Dans Kobo : ouvrez le projet → **⋯ → Replace form** → choisissez le nouveau `.xlsx`.
3. **Redeploy**. Kobo garde les anciennes soumissions et ajoute les nouvelles colonnes.
4. Publiez l'app (pensez à incrémenter `VERSION` dans `sw.js`).

Faites-le **avant** que les téléphones passent à la nouvelle version de l'app : sinon Kobo reçoit des champs qu'il ne connaît pas. Les observations préparées avec l'ancienne version restent acceptées.

Les noms de champs restent stables tant que les identifiants du protocole ne changent pas.

## Transmettre les données à une autre plateforme

KoboToolbox sait **transférer automatiquement chaque nouvelle soumission** vers un autre serveur : ce sont les [REST Services](https://support.kobotoolbox.org/rest_services.html) (projet → *Settings → REST Services*).

- Format **JSON** ou **XML**, authentification Basic, sélection des champs à transmettre, enveloppe JSON personnalisable.
- Relances automatiques en cas d'échec (après 1 min, 10 min puis 100 min) et notification par courriel.
- **Seule la création déclenche l'envoi** : une soumission modifiée dans Kobo n'est pas retransmise. C'est pourquoi l'app ne modifie jamais une observation reçue : une correction sera une nouvelle soumission liée.

C'est la voie recommandée pour alimenter la plateforme Mapomo ou tout autre outil d'analyse, sans changer l'app.
