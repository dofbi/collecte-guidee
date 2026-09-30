// Tronc commun injecté dans chaque poste : il porte les règles de preuve de la méthode.
// - « source » : vu / rapporté / pas vu (provenance)
// - « absent » : absent (zéro constaté) ou hors champ (pas de donnée, jamais zéro)
// - « rapporte » : qui l'a dit ; la ligne part chez un analyste
// - « confiance » : question séparée de la provenance
// Un protocole peut remplacer les textes via `commun` sans toucher au code.

export const NOEUDS_COMMUNS = ["source", "absent", "rapporte", "confiance"];

export function noeudsCommuns(surcharge = {}) {
  const base = {
    source: {
      type: "choix",
      question: { fr: "Comment connaissez-vous ce poste ?", en: "How do you know about this item?" },
      aide: { fr: "Répondez pour ce que vous savez maintenant, sur place.", en: "Answer for what you know now, on site." },
      options: [
        { v: "vu", label: { fr: "Je le vois", en: "I can see it" }, sous: { fr: "de mes yeux, maintenant", en: "with my own eyes, now" }, set: { prov: "C" }, suite: "@entree" },
        { v: "dit", label: { fr: "On me l'a dit", en: "Someone told me" }, sous: { fr: "je ne l'ai pas vu moi-même", en: "I did not see it myself" }, set: { prov: "E" }, suite: "rapporte" },
        { v: "pas_vu", label: { fr: "Je ne le vois pas", en: "I cannot see it" }, sous: { fr: "rien de visible d'où je suis", en: "nothing visible from where I stand" }, suite: "absent" }
      ]
    },
    absent: {
      type: "choix",
      question: { fr: "Est-ce absent, ou hors de votre vue ?", en: "Is it absent, or out of sight?" },
      aide: { fr: "Un objet masqué ou hors champ n'est pas un zéro.", en: "Something hidden or out of frame is not a zero." },
      options: [
        { v: "absent", label: { fr: "Absent, j'en suis sûr", en: "Absent, I am sure" }, sous: { fr: "j'ai une vue complète du lieu", en: "I have a full view of the site" }, set: { prov: "C" },
          fin: { affichage: { fr: "0 (absent)", en: "0 (absent)" } } },
        { v: "hors_champ", label: { fr: "Hors champ ou masqué", en: "Out of frame or hidden" }, sous: { fr: "je ne peux pas savoir", en: "I cannot tell" }, set: { prov: "N" },
          fin: { affichage: { fr: "Pas de donnée", en: "No data" }, note: { fr: "On s'abstient : cette ligne ne sera pas publiée.", en: "We abstain: this line will not be published." } } }
      ]
    },
    rapporte: {
      type: "choix",
      question: { fr: "Qui vous l'a dit ?", en: "Who told you?" },
      aide: { fr: "Vous ne cherchez pas plus loin : la ligne part chez un analyste.", en: "Do not investigate further: the line goes to an analyst." },
      options: [
        { v: "participant", label: { fr: "Un participant", en: "A participant" }, sous: { fr: "présent dans la foule", en: "in the crowd" } },
        { v: "organisateur", label: { fr: "Un organisateur", en: "An organiser" }, sous: { fr: "équipe du parti ou de l'événement", en: "party or event staff" } },
        { v: "commercant", label: { fr: "Un commerçant ou prestataire", en: "A vendor or supplier" }, sous: { fr: "loueur, vendeur, transporteur", en: "rental, seller, transport" } },
        { v: "autre", label: { fr: "Autre source", en: "Other source" }, sous: { fr: "presse, réseaux sociaux…", en: "press, social media…" } }
      ].map((o) => ({ ...o, fin: { affichage: { fr: "Information rapportée", en: "Reported information" } } }))
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
