# Déployer votre instance en 15 minutes

## Ce qu'il vous faut

- Un compte KoboToolbox (voir [kobo-setup.md](kobo-setup.md)).
- Un compte Netlify (gratuit) ou un autre hébergeur capable d'exécuter une fonction HTTP.
- Une liste de codes collecteurs (un par observateur ou par équipe, sans nom).

## Étapes

1. **Copiez le dépôt** (fork) ou utilisez le bouton « Deploy to Netlify » du README.
2. **Adaptez l'instance** dans `config/instance.json` : nom, couleur, langue par défaut, lien vers votre dépôt, et `gps` (`"facultatif"` ou `"desactive"` si la position met vos observateurs en danger).
3. **Choisissez le protocole** : copiez un exemple de `config/exemples/` vers `config/protocole.json`, ou écrivez le vôtre ([adapter-le-protocole.md](adapter-le-protocole.md)).
4. **Générez** : `npm run generer`, puis committez `kobo/` et `manifest.webmanifest`.
5. **Créez le projet Kobo** à partir de `kobo/<id>.xlsx`.
6. **Configurez Netlify** (*Site configuration → Environment variables*) :
   - `KOBO_SUBMISSION_URL`
   - `KOBO_FORM_ID`
   - `KOBO_TOKEN` (ou `KOBO_USERNAME` et `KOBO_PASSWORD`)
   - `COLLECT_CODES`, séparés par des virgules
7. **Redéployez** (les variables ne s'appliquent qu'au déploiement suivant), puis ouvrez `https://<votre-site>/.netlify/functions/submit?verifier=1` : la réponse doit contenir `"configure": true`, un `nombre_codes_collecteurs` supérieur à 0 et `"accepte": true` pour Kobo. Vérifiez aussi que les variables sont disponibles pour les *Functions* dans Netlify.
8. **Testez** une observation de bout en bout (étape 5 de [kobo-setup.md](kobo-setup.md)).
9. **Formez les observateurs** : installer l'app (« Ajouter à l'écran d'accueil »), saisir le code collecteur dans Réglages, faire une observation d'essai.

## En cas de problème

Voir [depannage.md](depannage.md) : chaque message d'erreur de l'app y est expliqué.

## Publier une mise à jour

Incrémentez `VERSION` dans `sw.js`. Les téléphones affichent « Nouvelle version disponible » et se mettent à jour d'un clic, sans perdre les observations en attente.

## Autres hébergeurs

L'app est un site statique : n'importe quel hébergeur HTTPS convient. Seul l'envoi a besoin d'une fonction serveur. [`lib/proxy.js`](../lib/proxy.js) exporte `traiterEnvoi(request, env)` qui prend une `Request` standard et rend une `Response` : quelques lignes suffisent pour l'exposer dans un Cloudflare Worker ou un serveur Node 18+. Indiquez alors son adresse dans `config/instance.json` (`envoi`).
