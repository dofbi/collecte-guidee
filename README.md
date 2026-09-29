# Collecte guidée

Maquette d'un formulaire d'observation de rassemblements politiques, dans lequel **l'observateur ne choisit jamais la façon de saisir**.

Il répond à quelques questions fermées (« Comment le connaissez-vous ? », « Voyez-vous tout le dispositif ? », « Y en a-t-il moins de 20 ? »). Selon ses réponses, le formulaire lui propose la bonne interface :

| Situation | Interface |
|---|---|
| Vu, en entier, peu nombreux | Comptage exact |
| Vu, nombreux ou en partie | Mesure propre au poste (rangées × chaises, échantillon sur 10 personnes, dimensions de scène, chaîne lieu × part occupée × densité pour la foule) |
| Rapporté | Source + contenu, envoyé à un analyste |
| Hors champ | Inconnu, jamais zéro |

Chaque ligne enregistre séparément la **provenance** (constaté, rapporté, non observé) et la **confiance** (sûr, assez sûr, peu sûr), ainsi que le **chemin suivi** dans l'arbre de questions. Aucun prix n'est demandé.

## Pourquoi

Lors des exercices d'accord entre observateurs, une grande partie des écarts venait du mode de saisie choisi par chacun (nombre, tranche ou inconnu) plutôt que de l'observation elle-même. En faisant choisir le mode par le formulaire, deux observateurs devant la même scène suivent le même chemin.

## Utilisation

Site statique, sans dépendance ni étape de build. Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```sh
python3 -m http.server 8000
```

Les réponses sont gardées dans le navigateur (localStorage) et exportables en JSON. La photo chargée reste sur l'appareil.

## Déploiement Netlify

Relier le dépôt dans Netlify : aucune commande de build, dossier de publication `.` (déjà configuré dans `netlify.toml`).

## Limites de la maquette

- Seuils (20 objets, classes de scène, densités de foule) donnés à titre d'exemple, à calibrer sur des données réelles.
- Cinq postes seulement : chaises, véhicules, t-shirts et casquettes, sonorisation et estrade, foule.
- Exercice fictif : aucun parti, candidat ou événement réel.
