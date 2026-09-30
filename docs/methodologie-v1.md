# Méthodologie v1 et protocole `mapomo_v1`

Correspondance entre la méthodologie arrêtée le 29 septembre 2026 au Mapomo Innovation Lab et le protocole [`config/exemples/mapomo-v1.json`](../config/exemples/mapomo-v1.json).

| Méthodologie v1 | Dans l'app |
|---|---|
| Règle-mère : comptage si produisible, estimation structurée ailleurs, intervalle en dernier recours | Chaque poste suit ce principe ; l'intervalle n'existe que pour la foule, marqué « dernier recours » |
| L'observateur ne produit jamais un prix | Aucun champ de prix |
| Ligne « analyste » : file d'un analyste nommé, avec délai | `analyste = oui` quand l'information est rapportée ou le relevé peu sûr ; le texte d'orientation est configurable (`config/instance.json`) |
| Inconnu n'est pas zéro ; pas de donnée : on s'abstient | « Hors champ » enregistre une provenance `N` sans valeur |
| Type d'événement × échelle du lieu | En-tête obligatoire de chaque observation |
| Véhicules : marqués / non marqués, type | Comptage par type (grand bus, minibus, 4x4, voiture légère, moto), marqués puis non marqués |
| Chaises : pas de comptage, rangées × chaises, VIP ou standard | Structure + catégorie ; « vue partielle » signalée comme minimum |
| Foule : type de lieu, dimensions, part occupée, gêne ; intervalle si on ne peut pas entrer | Chaîne de mesures ou intervalle, selon « Pouvez-vous entrer dans la foule ? » |
| Objets distribués : part de la foule, 5 groupes de 10 répartis, après dispersion | Question « dispersion » avant l'échantillon ; 5 groupes avant / milieu / arrière |
| Estrade : dimensions ; sono : classe, opérateur | Formulaire dédié |
| Services : nombre par métier, sinon distance × longueur | Deux parcours |
| Artistes : nombre, nom, notoriété | Nom facultatif |
| Imprimés : affiches et banderoles comptées ; tracts = objets distribués | Compteurs ; les tracts sont dans « Objets distribués » |

## Points encore ouverts dans la méthode

- **P9** (une ou deux colonnes pour provenance et confiance) : l'app garde deux questions séparées ; la salle penchait pour deux colonnes (16 contre 6).
- **P12** (deux observateurs en désaccord) : non traité par l'app ; les deux saisies arrivent séparément dans Kobo.
- **Double comptage** : la question « déjà vus ailleurs aujourd'hui ? » signale un convoi possible ; le dédoublonnage reste à l'analyste.
- **Postes absents** : location du lieu, MC et communicateurs traditionnels, hélicoptères, feux d'artifice.
