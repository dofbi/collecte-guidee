// Tronc commun injecté dans chaque poste : il porte les règles de preuve de la méthode
// (voir docs/regles-de-collecte.md).
// - « source »      : je le vois / on me l'a dit / je ne le vois pas
// - « vue_portee »  : ce que couvre l'observation (tout le dispositif ou une partie)
// - « absent »      : absent dans la portée, non observé, ou indéterminé (jamais un zéro par défaut)
// - « rapporte »    : type de source d'une information rapportée
// - « propos »      : ce qui a été dit ou écrit, tel quel (un montant peut y figurer, il n'est jamais demandé)
// - « confiance »   : question séparée de la provenance
// Un protocole peut remplacer les textes via `commun` sans toucher au code.

export const NOEUDS_COMMUNS = ["source", "vue_portee", "absent", "rapporte", "propos", "confiance"];

// Identifiants réservés : produits par le tronc commun ou par l'app pour chaque poste.
export const RESERVES = [
  "prov", "presence", "portee", "methode", "source_type", "propos_texte", "analyste", "chemin", "affichage",
  "quantite_forme", "quantite_valeur", "quantite_basse", "quantite_haute", "historique", "complement",
  "fournisseur", "fournisseur_lien", "fournisseur_origine", "contrepartie", "contrepartie_origine", "reglement", "reglement_origine"
];

export const PRESENCES = ["presente", "absente_dans_la_portee", "non_observee", "indeterminee"];
export const FORMES = ["exacte", "fourchette", "minimum_seul", "inconnue"];
export const METHODES = ["comptage", "structure", "temoignage", "document", "bande_de_jugement"];

export function noeudsCommuns(surcharge = {}) {
  const base = {
    source: {
      type: "choix",
      question: { fr: "Comment connaissez-vous ce poste ?", en: "How do you know about this item?" },
      aide: { fr: "Répondez pour ce que vous savez maintenant, sur place.", en: "Answer for what you know now, on site." },
      options: [
        { v: "vu", label: { fr: "Je le vois", en: "I can see it" }, sous: { fr: "de mes yeux, maintenant", en: "with my own eyes, now" },
          set: { prov: "C", presence: "presente", source_type: "observation_directe" }, suite: "vue_portee" },
        { v: "dit", label: { fr: "On me l'a dit, ou je l'ai lu", en: "I was told, or read it" }, sous: { fr: "je ne l'ai pas vu moi-même", en: "I did not see it myself" },
          set: { prov: "E", presence: "presente" }, suite: "rapporte" },
        { v: "pas_vu", label: { fr: "Je ne le vois pas", en: "I cannot see it" }, sous: { fr: "rien de visible d'où je suis", en: "nothing visible from where I stand" }, suite: "absent" }
      ]
    },
    vue_portee: {
      type: "choix",
      question: { fr: "Que voyez-vous de ce poste ?", en: "How much of this item can you see?" },
      aide: { fr: "Votre relevé ne vaut que pour ce que vous voyez.", en: "Your record only covers what you can see." },
      options: [
        { v: "complete", label: { fr: "Tout le dispositif", en: "All of it" }, sous: { fr: "d'un bout à l'autre", en: "from end to end" }, set: { portee: "complete" }, suite: "@entree" },
        { v: "partielle", label: { fr: "Une partie seulement", en: "Only part of it" }, sous: { fr: "le reste est masqué ou hors champ : votre chiffre sera un minimum", en: "the rest is hidden or out of frame: your figure will be a minimum" }, set: { portee: "partielle" }, suite: "@entree" }
      ]
    },
    absent: {
      type: "choix",
      question: { fr: "Pourquoi ne le voyez-vous pas ?", en: "Why can't you see it?" },
      aide: { fr: "Une absence ne vaut que pour ce que vous voyez. Un objet masqué n'est pas un zéro.", en: "An absence only holds for what you can see. Something hidden is not a zero." },
      options: [
        { v: "absent", label: { fr: "Il n'y en a pas", en: "There is none" }, sous: { fr: "je vois tout le lieu et il n'y en a aucun", en: "I can see the whole site and there is none" },
          set: { prov: "C", presence: "absente_dans_la_portee", portee: "complete", source_type: "observation_directe" },
          fin: { affichage: { fr: "Absent (constaté)", en: "Absent (observed)" }, quantite: { forme: "exacte", valeur: 0 } } },
        { v: "hors_champ", label: { fr: "Hors de ma vue", en: "Out of my sight" }, sous: { fr: "masqué, trop loin, hors champ", en: "hidden, too far, out of frame" },
          set: { prov: "N", presence: "non_observee" },
          fin: { affichage: { fr: "Non observé", en: "Not observed" }, note: { fr: "Pas de donnée : cette ligne ne sera pas chiffrée.", en: "No data: this line will not be valued." } } },
        { v: "indetermine", label: { fr: "Je ne peux pas dire", en: "I cannot tell" }, sous: { fr: "je ne sais pas si c'est présent", en: "I don't know whether it is there" },
          set: { prov: "N", presence: "indeterminee" },
          fin: { affichage: { fr: "Indéterminé", en: "Undetermined" } } }
      ]
    },
    rapporte: {
      type: "choix",
      question: { fr: "D'où vient l'information ?", en: "Where does the information come from?" },
      aide: { fr: "Vous ne cherchez pas plus loin : la ligne part chez un analyste.", en: "Do not investigate further: the line goes to an analyst." },
      options: [
        { v: "participant", label: { fr: "Un participant", en: "A participant" }, sous: { fr: "présent sur place", en: "on site" }, set: { source_type: "participant", methode: "temoignage" } },
        { v: "organisateur", label: { fr: "Un organisateur", en: "An organiser" }, sous: { fr: "équipe du parti ou de l'événement", en: "party or event staff" }, set: { source_type: "organisateur", methode: "temoignage" } },
        { v: "fournisseur", label: { fr: "Un fournisseur ou prestataire", en: "A supplier or vendor" }, sous: { fr: "loueur, vendeur, transporteur", en: "rental, seller, transport" }, set: { source_type: "fournisseur", methode: "temoignage" } },
        { v: "document", label: { fr: "Un document", en: "A document" }, sous: { fr: "affiche, devis, message, presse", en: "poster, quote, message, press" }, set: { source_type: "document", methode: "document" } }
      ].map((o) => ({ ...o, suite: "propos" }))
    },
    propos: {
      type: "formulaire",
      question: { fr: "Qu'est-ce qui a été dit ou écrit ?", en: "What was said or written?" },
      aide: { fr: "Notez-le tel quel, même s'il contient un montant. Facultatif.", en: "Write it down as is, even if it contains an amount. Optional." },
      champs: [{ id: "propos_texte", type: "texte", facultatif: true, label: { fr: "Tel quel", en: "Verbatim" } }],
      fin: { affichage: { fr: "Information rapportée", en: "Reported information" }, quantite: { forme: "inconnue" } }
    },
    confiance: {
      type: "choix",
      question: { fr: "Êtes-vous sûr de votre relevé ?", en: "How sure are you of this record?" },
      aide: { fr: "Question séparée de la provenance : on peut avoir vu et douter du nombre.", en: "Separate from the source: you can have seen it and still doubt the number." },
      options: [
        { v: "sur", label: { fr: "Sûr", en: "Sure" }, sous: { fr: "je referais le même relevé", en: "I would record the same again" }, fin: {} },
        { v: "assez", label: { fr: "Assez sûr", en: "Fairly sure" }, sous: { fr: "petite marge d'erreur", en: "small margin of error" }, fin: {} },
        { v: "peu", label: { fr: "Peu sûr", en: "Not sure" }, sous: { fr: "à vérifier par un analyste", en: "to be checked by an analyst" }, fin: {} }
      ]
    }
  };
  for (const [id, s] of Object.entries(surcharge || {})) {
    if (base[id]) base[id] = { ...base[id], ...s };
  }
  return base;
}

// Règle d'envoi à l'analyste, commune à tous les protocoles.
export function versAnalyste(data) {
  return data.prov === "E" || data.confiance === "peu";
}

// Informations de fourniture : trois axes indépendants, facultatifs, chacun « observé ou rapporté ».
// L'état par défaut est « non recueilli » (différent de « inconnu »).
const ORIGINE = { id: "origine", options: [
  { v: "observe", label: { fr: "Observé", en: "Observed" } },
  { v: "rapporte", label: { fr: "Rapporté", en: "Reported" } }
] };
export const FOURNITURE = [
  { id: "fournisseur_lien", texte: "fournisseur", origine: "fournisseur_origine",
    label: { fr: "Qui fournit ?", en: "Who supplies it?" },
    aideTexte: { fr: "Nom ou description du fournisseur, propriétaire ou contrôleur (facultatif)", en: "Name or description of supplier, owner or controller (optional)" },
    options: [
      { v: "candidat", label: { fr: "Lié au candidat", en: "Linked to the candidate" } },
      { v: "parti", label: { fr: "Lié au parti", en: "Linked to the party" } },
      { v: "aucun_lien_declare", label: { fr: "Aucun lien déclaré", en: "No declared link" } },
      { v: "inconnu", label: { fr: "Je ne sais pas", en: "I don't know" } },
      { v: "non_recueilli", label: { fr: "Non recueilli", en: "Not collected" } }
    ] },
  { id: "contrepartie", origine: "contrepartie_origine",
    label: { fr: "Contrepartie annoncée", en: "Announced consideration" },
    options: [
      { v: "facture", label: { fr: "Facturé", en: "Invoiced" } },
      { v: "offert", label: { fr: "Offert", en: "Free of charge" } },
      { v: "partiellement_offert", label: { fr: "Partiellement offert", en: "Partly free" } },
      { v: "inconnue", label: { fr: "Je ne sais pas", en: "I don't know" } },
      { v: "non_recueillie", label: { fr: "Non recueillie", en: "Not collected" } }
    ] },
  { id: "reglement", origine: "reglement_origine",
    label: { fr: "Règlement rapporté", en: "Reported payment" },
    options: [
      { v: "regle", label: { fr: "Réglé", en: "Paid" } },
      { v: "partiellement_regle", label: { fr: "Partiellement réglé", en: "Partly paid" } },
      { v: "non_regle", label: { fr: "Non réglé", en: "Not paid" } },
      { v: "inconnu", label: { fr: "Je ne sais pas", en: "I don't know" } },
      { v: "non_recueilli", label: { fr: "Non recueilli", en: "Not collected" } }
    ] }
];
export const ORIGINE_FOURNITURE = ORIGINE;
export const NON_RECUEILLI = { fournisseur_lien: "non_recueilli", contrepartie: "non_recueillie", reglement: "non_recueilli" };
