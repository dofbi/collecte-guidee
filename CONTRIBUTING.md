# Contribuer

Merci de votre intérêt. Deux types de contributions comptent autant l'un que l'autre :

- **La méthode** : un protocole pour un autre pays ou une autre élection, un poste manquant, une meilleure question, un retour de terrain.
- **Le code** : moteur, interface, hors ligne, envoi, accessibilité, traductions.

## Principes à respecter

1. **Aucun poste codé en dur.** Tout ce qui est propre à un protocole va dans `config/`. Le code de `lib/` et `src/` doit fonctionner avec n'importe quel protocole valide.
2. **Les règles de preuve ne se négocient pas** : inconnu n'est pas zéro, jamais de prix côté observateur, provenance et confiance séparées, une ligne douteuse part chez un analyste.
3. **Hors ligne d'abord** : aucune ressource externe au chargement de l'app.
4. **Sans dépendance, sans build** : des modules JavaScript natifs, lisibles par tous.
5. **Sécurité des observateurs** : ne pas ajouter de donnée identifiante ou de géolocalisation par défaut.

## Avant d'envoyer une modification

```sh
npm test
npm run generer   # si vous avez touché config/ ou lib/formulaire.js
```

Si vous modifiez un fichier chargé par l'app, ajoutez-le à la liste de `sw.js` et incrémentez `VERSION`.

## Proposer un protocole

Ajoutez-le dans `config/exemples/`, avec une description qui dit d'où vient la méthode (atelier, organisation, pays, date). Les tests vérifient automatiquement que tous les exemples sont valides.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous licence [AGPL-3.0](LICENSE).
