# Dépannage de l'envoi vers KoboToolbox

## Les deux adresses de diagnostic

Elles ne révèlent aucun secret et peuvent être ouvertes dans un navigateur :

| Adresse | Ce qu'elle dit |
|---|---|
| `https://<votre-site>/.netlify/functions/submit` | `configure`, `variables_manquantes`, `nombre_codes_collecteurs` |
| `https://<votre-site>/.netlify/functions/submit?verifier=1` | en plus, pour chaque authentification configurée : le statut renvoyé par Kobo et `accepte: true / false` |

Une page 404 sur ces adresses signifie que la fonction n'est pas déployée : vérifiez `netlify.toml` (`functions = "netlify/functions"`) et les journaux de déploiement.

## Messages affichés dans l'app

| Message | Cause | Solution |
|---|---|---|
| Rien ne part, aucun message | Pas de code collecteur sur le téléphone | Réglages → Code collecteur |
| « Code collecteur refusé par le serveur » | Le code saisi n'est pas dans `COLLECT_CODES` | Vérifiez l'orthographe exacte (majuscules comprises) |
| « … (configuration : COLLECT_CODES vide…) » | La fonction ne voit pas les variables | **Redéployez le site** après avoir ajouté ou modifié une variable ; vérifiez que la variable est disponible pour les *Functions* (portée de la variable dans Netlify) |
| « … (configuration : Variables manquantes : …) » | Une variable Kobo manque | Ajoutez-la, puis redéployez |
| « … (kobo_authentification) » | Kobo refuse le jeton | Vérifiez `KOBO_TOKEN`, ou ajoutez `KOBO_USERNAME` et `KOBO_PASSWORD` : le proxy les essaie ensuite |
| « … (kobo_404 : …) » ou « … (kobo_400 : …) » | Formulaire introuvable ou structure refusée | Vérifiez `KOBO_FORM_ID` (uid du projet), que le formulaire est bien **déployé** et que c'est la version générée par `npm run generer` ; si besoin `KOBO_ROOT_TAG` |
| « … (kobo_injoignable) » | `KOBO_SUBMISSION_URL` erronée ou serveur indisponible | Vérifiez l'adresse (voir [kobo-setup.md](kobo-setup.md)) |
| « Réseau indisponible » | Pas de connexion | L'observation reste en file et repartira seule |

Le texte après les deux-points est le message renvoyé par KoboToolbox.

## Deux pièges rencontrés lors de la première mise en service

1. **Les variables d'environnement ne s'appliquent qu'au déploiement suivant.** Après les avoir ajoutées dans Netlify, relancez un déploiement (*Deploys → Trigger deploy*).
2. **Les téléphones gardent l'ancienne version de l'app en cache** (c'est ce qui permet le hors ligne). Après une mise à jour, l'app affiche « Nouvelle version disponible » : cliquez sur « Recharger ». Le serveur reste compatible avec les anciennes versions : il inscrit lui-même le code collecteur validé dans l'observation.

## Renvoyer une observation en erreur

Les observations en erreur restent dans « À envoyer ». Une fois la cause corrigée, cliquez sur « Envoyer maintenant ». Un renvoi ne crée pas de doublon dans Kobo : chaque observation porte un identifiant unique (`instanceID`).
