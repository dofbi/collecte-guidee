# Sécurité des observateurs et des données

Observer les dépenses d'un parti expose. Les choix par défaut visent à réduire ce que perd un observateur si son téléphone est saisi ou inspecté.

| Risque | Mesure |
|---|---|
| Fiche papier trouvée sur l'observateur | Pas de papier : tout est dans l'app |
| Téléphone saisi | Purge après envoi (activée par défaut) : seules les observations pas encore envoyées restent sur l'appareil |
| Identification de l'observateur | Pas de nom : un **code collecteur** attribué par la coordination |
| Localisation | Position **facultative** : uniquement si l'observateur appuie sur « Ajouter ma position », précision affichée, retirable avant l'envoi. Une instance peut la désactiver entièrement (`"gps": "desactive"` dans `config/instance.json`). La caméra et le micro restent interdits (en-tête `Permissions-Policy`) |
| Fuite du jeton Kobo | Le jeton reste dans les variables d'environnement du serveur ; le téléphone ne le voit jamais |
| Envois frauduleux | Le proxy refuse tout envoi sans code collecteur valide, vérifie la structure et la taille, et exige que le code corresponde à celui inscrit dans l'observation |
| Prix sur le terrain | Jamais demandés : l'observateur rapporte des faits, l'analyste chiffre |

## Limites

- Les observations **en attente d'envoi** sont stockées en clair dans le navigateur (IndexedDB). Utilisez un téléphone avec verrouillage d'écran et chiffrement activés.
- Le code collecteur est un secret partagé : changez la liste `COLLECT_CODES` si un code est compromis.
- Le proxy ne limite pas le débit. Pour une collecte à grande échelle, ajoutez une limite côté hébergeur.
- L'entrée dans la foule (méthode de Madagascar) n'est proposée que si l'observateur répond qu'il peut s'y déplacer sans risque ; sinon l'app propose un intervalle.

La sécurité des observateurs reste une question ouverte de la méthode : les contributions sont bienvenues.
