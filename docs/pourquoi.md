# Pourquoi une collecte guidée

## Le problème

Dans beaucoup de pays, le coût réel des campagnes électorales est inconnu : peu ou pas de déclarations, beaucoup de paiements en espèces, peu de traces administratives. Une façon d'y répondre est d'**estimer de l'extérieur**, à partir de ce qui est observable sur le terrain : véhicules, chaises, foule, sono, objets distribués.

Encore faut-il que deux observateurs devant la même scène produisent des relevés comparables.

## Ce que le Mapomo Innovation Lab a mesuré (29 septembre 2026)

Vingt-cinq personnes, trois scènes photographiées, huit postes par scène. On n'a pas mesuré qui avait raison, mais **ce qu'un observateur est capable de remplir**.

| Poste | Scène dégagée | Scène dense | Scène ambiguë |
|---|---|---|---|
| Véhicules (ont donné un nombre) | 19 / 25 | 9 / 24 | 16 / 24 |
| Chaises | 15 / 25 | **0 / 24** | 2 / 24 |
| T-shirts portés | 19 / 25 | 2 / 24 | 1 / 24 |
| Supports imprimés | 5 / 25 | 2 / 24 | 4 / 24 |

Trois enseignements :

1. **Le comptage exact ne se dégrade pas doucement : il se vide.** Ce qui arrive par deux ou trois (les véhicules) se compte. Ce qui arrive par centaines n'est jamais compté.
2. **La tranche échoue plus discrètement.** 76 à 88 % des réponses tombaient dans « 10 et plus ». Un champ vide se voit au dépouillement ; une tranche saturée ressemble à une réponse.
3. **Les nombres ne concordaient pas.** Sur la scène la plus dégagée, les chaises allaient de 20 à 200.

Autre constat : 62 lignes sur 260 combinaient « inconnu » et « je l'ai vu moi-même ». La colonne mélangeait deux questions : d'où vient l'information, et à quel point on en est sûr.

## La règle retenue

> Comptage exact partout où c'est produisible. Estimation structurée partout ailleurs. Un intervalle en dernier recours.

- **Produisible** ne veut pas dire facile : cela veut dire qu'une personne présente peut réellement donner ce nombre. Deux bus, oui. Quatre cents chaises dont on voit trois rangs, non.
- **L'estimation structurée** ne demande jamais la quantité : elle demande deux ou trois mesures simples (rangées × chaises, surface × part occupée × densité) dont l'analyste déduit la quantité.
- **L'intervalle** est un dernier recours, pas une solution de confort.

## Pourquoi une app

Cette règle est trop lourde pour être appliquée de mémoire, sous pression, au milieu d'une foule. Le basculement de la journée a été une décision de conception : **construire un outil qui pose les questions dans l'ordre et applique la règle à la place de la personne**. On ne se demande alors plus si une règle est difficile à appliquer sur le terrain, mais seulement si c'est la meilleure règle.

L'expérience de Madagascar allait dans le même sens : pas de fiche papier, une application mobile, une dizaine de minutes par événement.

## Pourquoi KoboToolbox

KoboToolbox est un commun déjà utilisé par des milliers d'organisations humanitaires et de la société civile : serveurs mondiaux et européens, auto-hébergement possible, exports, API, formulaires hors ligne. Plutôt que de créer un nouveau serveur de données, ce projet s'appuie dessus et y contribue un protocole et une interface guidée réutilisables.
