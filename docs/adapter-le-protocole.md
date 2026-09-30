# Adapter le protocole

Tout ce que l'observateur voit vient de `config/protocole.json`. Le même fichier génère le formulaire KoboToolbox. **Aucune modification de code n'est nécessaire.**

Après chaque modification :

```sh
npm test            # vérifie aussi que les protocoles d'exemple restent valides
npm run generer     # valide votre protocole, régénère kobo/ et le manifest
```

`npm run generer` refuse un protocole invalide et explique pourquoi (suite inconnue, variable inconnue, identifiant en double…). Le schéma [`config/schema.json`](../config/schema.json) aide aussi les éditeurs de code à compléter le fichier.

## Structure

```json
{
  "id": "mon_protocole",
  "version": "1.0.0",
  "titre": { "fr": "…", "en": "…" },
  "langues": ["fr", "en"],
  "evenement": { "champs": [ … ] },
  "postes": [ … ]
}
```

- Les **identifiants** (`id`) sont en minuscules, chiffres et `_`. Ils deviennent les noms de champs Kobo : ne les changez plus une fois la collecte lancée.
- Les **textes** sont soit une chaîne, soit un objet par langue (`{ "fr": "…", "en": "…" }`).

## Un poste

```json
{
  "id": "chaises",
  "label": { "fr": "Chaises" },
  "aide": { "fr": "Rangées × chaises" },
  "entree": "vue",
  "calculs": { "total_chaises": "rangees * par_rangee" },
  "noeuds": { "vue": { … }, "structure": { … } }
}
```

Chaque poste commence automatiquement par le **tronc commun** (`source`, `absent`, `rapporte`, `confiance`) : « Je le vois » mène à votre nœud `entree`, « On me l'a dit » et « Je ne le vois pas » sont gérés pour vous. Terminez vos parcours par `"suite": "confiance"`.

## Les trois types de nœuds

### `choix` : une question à boutons

```json
"vue": {
  "type": "choix",
  "question": { "fr": "Voyez-vous toutes les rangées ?" },
  "aide": { "fr": "…" },
  "options": [
    { "v": "toutes", "label": { "fr": "Oui, toutes" }, "sous": { "fr": "…" }, "set": { "partiel": "non" }, "suite": "structure" },
    { "v": "partie", "label": { "fr": "En partie" }, "set": { "partiel": "oui" }, "suite": "structure" }
  ]
}
```

- `suite` : nœud suivant. Ou bien `fin` pour terminer le poste sur cette option : `{ "affichage": {…}, "note": {…} }`.
- `set` : valeurs posées quand l'option est choisie (utilisables dans les textes ; exportées dans Kobo).
- `"dernier_recours": true` signale un intervalle de dernier recours.

### `compteurs` : des nombres avec − et +

```json
"par_metier": {
  "type": "compteurs",
  "question": { "fr": "Un nombre par métier." },
  "champs": [ { "id": "securite", "label": { "fr": "Sécurité" } }, { "id": "g1", "max": 10, "label": "Groupe 1" } ],
  "valide": "securite > 0",
  "suite": "confiance"
}
```

### `formulaire` : plusieurs champs sur un écran

Champs `segment` (boutons, avec `options`), `compteur` ou `texte` (`"facultatif": true` possible).

## Calculs, validation et textes

- `calculs` (au niveau du poste) : expressions avec `+ - * /`, parenthèses, `sum(a, b, …)`, `round(x)`. Elles sont calculées dans l'app **et** traduites en `calculate` dans Kobo.
- `valide` (sur un nœud) : condition pour continuer, avec en plus `> >= < <= ==`, `and`, `or`.
- `apercu` : texte affiché en direct pendant la saisie. `affichage` : résumé enregistré à la fin du poste.
- Dans les textes : `{champ}` affiche une valeur (le libellé pour un segment), `{?champ:texte}` affiche le texte si le champ est renseigné, `{?champ=valeur:texte}` s'il vaut cette valeur.

## Exemples

- [`config/exemples/mapomo-v1.json`](../config/exemples/mapomo-v1.json) : les 8 postes de la Méthodologie v1.
- [`config/exemples/porte-a-porte.json`](../config/exemples/porte-a-porte.json) : exemple minimal à 2 postes.

Partagez vos protocoles (autres pays, autres postes) en ouvrant une contribution : c'est la meilleure façon d'améliorer la méthode commune.
