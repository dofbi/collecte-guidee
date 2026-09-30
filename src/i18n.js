// Textes de l'interface (le contenu des questions vient du protocole).
const TEXTES = {
  fr: {
    enLigne: "En ligne", horsLigne: "Hors ligne",
    nouvelle: "Nouvelle observation", reprendre: "Reprendre",
    brouillons: "Brouillons", aEnvoyer: "À envoyer", envoyees: "envoyée(s) depuis ce téléphone",
    envoyerMaintenant: "Envoyer maintenant", envoiEnCours: "Envoi…",
    aucuneObs: "Aucune observation en cours.",
    reglages: "Réglages", aPropos: "À propos", retour: "← Retour", retourListe: "← Postes",
    evenement: "Événement", postes: "Postes", fiche: "Fiche",
    terminer: "Terminer et mettre en file d'envoi", supprimer: "Supprimer ce brouillon", confirmerSuppr: "Confirmer la suppression",
    evtIncomplet: "Renseignez d'abord l'événement : il permet de valoriser un poste non observé en détail.",
    aFaire: "à faire", fait: "fait", aVerifier: "à vérifier", rapporte: "rapporté", sansDonnee: "sans donnée",
    question: "Question", precedente: "← Question précédente", continuer: "Continuer",
    champsManquants: "Complétez les champs signalés.", regleNonRespectee: "Les valeurs saisies ne permettent pas de continuer : vérifiez-les.",
    dernierRecours: "Dernier recours",
    enregistre: "Enregistré", posteSuivant: "Poste suivant", voirFiche: "Voir la fiche", refaire: "Refaire ce poste",
    chemin: "Chemin", versAnalyste: "Envoyé à un analyste",
    prov: { C: "Constaté", E: "Rapporté", N: "Non observé" },
    conf: { sur: "Sûr", assez: "Assez sûr", peu: "Peu sûr" },
    statut: { brouillon: "Brouillon", en_attente: "En attente d'envoi", envoye: "Envoyée", erreur: "Erreur d'envoi" },
    code: "Code collecteur", codeAide: "Fourni par votre coordination. Il vous identifie sans votre nom.", codeManquant: "Ajoutez votre code collecteur dans les réglages pour pouvoir envoyer.",
    langue: "Langue", purge: "Effacer du téléphone une observation dès qu'elle est reçue", purgeAide: "Recommandé : un téléphone saisi ne contient alors que les observations pas encore envoyées.",
    enregistrer: "Enregistrer", enregistres: "Réglages enregistrés.",
    protocole: "Protocole", version: "version", source: "Code source (AGPL-3.0)",
    horsLigneInfo: "Vous pouvez tout remplir hors ligne. L'envoi se fera au retour du réseau.",
    erreurCode: "Code collecteur refusé par le serveur.", erreurServeur: "Le serveur n'a pas accepté l'envoi.", erreurReseau: "Réseau indisponible : nouvel essai plus tard.",
    protocoleInvalide: "Le protocole configuré est invalide :",
    maj: "Nouvelle version disponible.", recharger: "Recharger",
    dateObs: "Commencée le"
  },
  en: {
    enLigne: "Online", horsLigne: "Offline",
    nouvelle: "New observation", reprendre: "Resume",
    brouillons: "Drafts", aEnvoyer: "To send", envoyees: "sent from this phone",
    envoyerMaintenant: "Send now", envoiEnCours: "Sending…",
    aucuneObs: "No observation in progress.",
    reglages: "Settings", aPropos: "About", retour: "← Back", retourListe: "← Items",
    evenement: "Event", postes: "Items", fiche: "Record",
    terminer: "Finish and queue for sending", supprimer: "Delete this draft", confirmerSuppr: "Confirm deletion",
    evtIncomplet: "Fill in the event first: it allows valuing an item not observed in detail.",
    aFaire: "to do", fait: "done", aVerifier: "to check", rapporte: "reported", sansDonnee: "no data",
    question: "Question", precedente: "← Previous question", continuer: "Continue",
    champsManquants: "Complete the highlighted fields.", regleNonRespectee: "These values do not allow you to continue: please check them.",
    dernierRecours: "Last resort",
    enregistre: "Saved", posteSuivant: "Next item", voirFiche: "See the record", refaire: "Redo this item",
    chemin: "Path", versAnalyste: "Sent to an analyst",
    prov: { C: "Observed", E: "Reported", N: "Not observed" },
    conf: { sur: "Sure", assez: "Fairly sure", peu: "Not sure" },
    statut: { brouillon: "Draft", en_attente: "Waiting to send", envoye: "Sent", erreur: "Sending error" },
    code: "Collector code", codeAide: "Provided by your coordinator. It identifies you without your name.", codeManquant: "Add your collector code in settings to be able to send.",
    langue: "Language", purge: "Erase an observation from the phone as soon as it is received", purgeAide: "Recommended: a seized phone then only holds observations not yet sent.",
    enregistrer: "Save", enregistres: "Settings saved.",
    protocole: "Protocol", version: "version", source: "Source code (AGPL-3.0)",
    horsLigneInfo: "You can fill in everything offline. Sending will happen when the network returns.",
    erreurCode: "Collector code rejected by the server.", erreurServeur: "The server did not accept the submission.", erreurReseau: "Network unavailable: will retry later.",
    protocoleInvalide: "The configured protocol is invalid:",
    maj: "A new version is available.", recharger: "Reload",
    dateObs: "Started on"
  }
};

let courante = "fr";
export const setLangue = (l) => { courante = TEXTES[l] ? l : "fr"; document.documentElement.lang = courante; };
export const langue = () => courante;
export const langues = () => Object.keys(TEXTES);
export function tr(cle) {
  const parts = cle.split(".");
  let v = TEXTES[courante], d = TEXTES.fr;
  for (const p of parts) { v = v?.[p]; d = d?.[p]; }
  return v ?? d ?? cle;
}
