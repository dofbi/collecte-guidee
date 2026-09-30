# Collecte guidée

**Une application mobile, libre et hors ligne, pour observer ce que coûte un événement de campagne électorale, sans jamais demander à l'observateur de choisir entre un nombre et une tranche.**

L'observateur répond à des questions fermées, une à la fois. Selon ses réponses, l'app lui présente la bonne saisie : un comptage, une mesure ou une déclaration à un analyste. Les observations sont enregistrées sur le téléphone, puis envoyées à **[KoboToolbox](https://www.kobotoolbox.org/)** dès que le réseau revient.

[![Déployer sur Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/dofbi/collecte-guidee)

> English summary below.

---

## Pourquoi ce projet

Le projet est né au **Mapomo Innovation Lab** (Saly, Sénégal, 29 septembre – 1er octobre 2026), qui a réuni journalistes, data scientists, ingénieurs et praticiens de l'observation électorale pour fixer une méthode d'estimation des dépenses de campagne à partir de ce qui est observable.

L'exercice du premier jour, 25 observateurs devant les mêmes photos, a montré trois choses :

| Constat | Mesure |
|---|---|
| Ce qui arrive par centaines n'est jamais compté | **0 sur 24** ont donné un nombre de chaises sur la scène dense |
| Une tranche saturée ressemble à une réponse | **76 à 88 %** des réponses dans « 10 et plus » pour les chaises et les t-shirts |
| Là où des nombres sortent, ils ne concordent pas | chaises de **20 à 200** sur la même scène dégagée |
| Provenance et certitude étaient confondues | **62 lignes sur 260** combinaient « inconnu » et « je l'ai vu » |

La salle en a tiré une **règle-mère** :

> Comptage exact partout où c'est produisible. Estimation structurée partout ailleurs. Un intervalle en dernier recours.

Cette règle est trop lourde pour être appliquée de mémoire, sous pression, au milieu d'une foule. **C'est la raison d'être de cette app : elle porte la règle à la place de l'observateur.** Plus de détails dans [docs/pourquoi.md](docs/pourquoi.md).

## Ce que fait l'app

- **Une question à la fois**, deux ou trois réponses, de gros boutons.
- **Le formulaire choisit la saisie** : comptage par type (véhicules), structure (rangées × chaises), chaîne de mesures (foule), échantillon de 5 groupes de 10 (objets distribués), intervalle seulement en dernier recours.
- **Règles de preuve intégrées** : vu / rapporté / pas vu ; « absent » distinct de « hors champ » ; hors champ = pas de donnée, jamais zéro ; une information rapportée ou un relevé peu sûr part chez un analyste ; la confiance est une question séparée de la provenance.
- **Aucun prix** n'est demandé sur le terrain, **aucun nom** : l'observateur est identifié par un code collecteur.
- **Hors ligne** (PWA installable) : tout se remplit sans réseau ; une file d'envoi part au retour du réseau.
- **Purge après envoi** (par défaut) : un téléphone saisi ne contient que ce qui n'est pas encore parti.
- **FR / EN**.

## Réutilisable par n'importe qui

Tout le protocole tient dans **un fichier JSON** : [`config/protocole.json`](config/protocole.json). Le même fichier génère **l'interface de l'app et le formulaire KoboToolbox**. Changer de pays, d'élection ou de postes, c'est modifier ce fichier, pas le code.

- Protocole de référence : [`config/exemples/mapomo-v1.json`](config/exemples/mapomo-v1.json) (Méthodologie v1 du Mapomo Lab, 8 postes).
- Exemple minimal : [`config/exemples/porte-a-porte.json`](config/exemples/porte-a-porte.json) (2 postes) : il tourne sans changer une ligne de code.
- Guide : [docs/adapter-le-protocole.md](docs/adapter-le-protocole.md).

Le formulaire XLSForm généré ([`kobo/`](kobo/)) fonctionne aussi **seul** dans KoboCollect ou Enketo, avec les mêmes questions conditionnelles, pour qui ne veut pas héberger l'app.

## Architecture

```
Téléphone (PWA, hors ligne)              Netlify (ou autre)               KoboToolbox
 index.html + src/*.js ── IndexedDB ──► fonction « submit » ──────────► /submission (OpenRosa)
 sw.js : app en cache    brouillons,     vérifie le code collecteur,    formulaire généré depuis
                         file d'envoi    garde le jeton Kobo             config/protocole.json
```

| Dossier | Rôle |
|---|---|
| `lib/` | Cœur sans dépendance, partagé par l'app, les tests et le serveur : moteur de questions, protocole, expressions, XLSForm, XML OpenRosa, proxy |
| `src/` | Interface, stockage local (IndexedDB), file d'envoi, textes FR / EN |
| `config/` | Instance (nom, couleurs, langue) et protocole |
| `netlify/functions/` | Proxy d'envoi (le jeton Kobo ne quitte jamais le serveur) |
| `kobo/` | XLSForm généré (CSV lisibles + `.xlsx`) |
| `scripts/` | Génération du XLSForm et du manifest |
| `tests/` | Tests `node --test` |

Aucune dépendance, aucune étape de build : des modules JavaScript natifs.

## Démarrage rapide

```sh
npm run dev          # sert l'app sur http://localhost:8000 (l'envoi nécessite la fonction Netlify)
npm test             # 19 tests : moteur, protocole, XLSForm, XML, proxy
npm run generer      # régénère kobo/ et manifest.webmanifest après une modification de config/
```

Pour tester l'envoi en local : `netlify dev` (Netlify CLI) avec les variables d'environnement ci-dessous.

## Déployer votre instance

Guide complet : [docs/deployer.md](docs/deployer.md). En bref :

1. Importer `kobo/<protocole>.xlsx` dans KoboToolbox et le déployer ([docs/kobo-setup.md](docs/kobo-setup.md)).
2. Déployer ce dépôt sur Netlify (bouton ci-dessus).
3. Renseigner les variables d'environnement :

| Variable | Exemple |
|---|---|
| `KOBO_SUBMISSION_URL` | `https://kc.kobotoolbox.org/submission` |
| `KOBO_FORM_ID` | `aB3cD4eF5gH6` (uid du projet Kobo) |
| `KOBO_TOKEN` | jeton d'API Kobo (ou `KOBO_USERNAME` + `KOBO_PASSWORD`) |
| `COLLECT_CODES` | `EQ01,EQ02,EQ03` |
| `KOBO_FORM_VERSION`, `KOBO_ROOT_TAG` | facultatifs |

4. **Redéployer** le site pour que les variables soient prises en compte, puis vérifier `https://<votre-site>/.netlify/functions/submit?verifier=1` (aucun secret n'y apparaît).
5. Distribuer l'adresse et les codes collecteurs. Sur le téléphone : « Ajouter à l'écran d'accueil ».

Un envoi qui échoue ? Voir [docs/depannage.md](docs/depannage.md).

Le proxy ([`lib/proxy.js`](lib/proxy.js)) ne dépend pas de Netlify : il prend une `Request` et rend une `Response`, et peut tourner dans un Cloudflare Worker ou un serveur Node.

## Sécurité

Observer les dépenses d'un parti expose. Choix par défaut : pas de GPS, pas de nom, pas de prix, pas de papier, purge après envoi, jeton Kobo côté serveur uniquement, en-têtes restrictifs. Détails et limites : [docs/securite.md](docs/securite.md).

## Limites connues

- L'envoi utilise le point de soumission OpenRosa de KoboToolbox, celui de KoboCollect et Enketo. Il a été **validé de bout en bout avec un projet KoboToolbox réel** le 30 septembre 2026 ; faites tout de même un envoi de test sur votre propre serveur avant une collecte réelle ([docs/depannage.md](docs/depannage.md)).
- Un seul objet distribué par observation (les groupes répétés viendront plus tard).
- Pas de synchronisation en arrière-plan quand l'app est fermée : l'envoi se fait à l'ouverture, au retour du réseau ou à la demande.
- Deux points de méthode restent ouverts au Lab : P9 (une ou deux colonnes pour provenance et confiance ; l'app en garde deux) et P12 (observateurs en désaccord). Le dédoublonnage des convois n'est qu'un signal pour l'analyste.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md). Les contributions de méthode (protocoles pour d'autres pays, postes manquants) comptent autant que le code.

## Licence

[AGPL-3.0](LICENSE), comme KoboToolbox : toute version modifiée mise en ligne doit publier son code. Le protocole Mapomo v1 reprend la méthodologie arrêtée collectivement le 29 septembre 2026 au Mapomo Innovation Lab.

---

## English summary

**Collecte guidée** is a free, offline-first mobile web app (PWA) for observing the cost of campaign events. Observers answer closed questions one at a time; the app decides whether to ask for an exact count, a structured estimate, or a report to an analyst, applying the rule *"exact count wherever it can be produced, structured estimate elsewhere, range as a last resort"*. Records are stored on the phone and sent to **KoboToolbox** through a small server-side proxy that keeps the Kobo token off the device. The whole protocol lives in one JSON file that generates both the app and the Kobo XLSForm, so any organisation can adapt it without touching the code. Licensed under AGPL-3.0.
