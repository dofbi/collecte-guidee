// Proxy d'envoi vers KoboToolbox.
// Le jeton Kobo reste ici, côté serveur : il n'est jamais envoyé aux téléphones.
//
// Variables d'environnement (Netlify > Site configuration > Environment variables) :
//   KOBO_SUBMISSION_URL  URL OpenRosa de soumission, ex. https://kc.kobotoolbox.org/submission
//   KOBO_FORM_ID         identifiant du formulaire déployé (uid de l'asset Kobo, ex. aB3cD4...)
//   KOBO_FORM_VERSION    (facultatif) version du formulaire déployé
//   KOBO_ROOT_TAG        (facultatif) nom de l'élément racine, par défaut KOBO_FORM_ID
//   KOBO_TOKEN           jeton d'API Kobo (Compte > Security > API key)  — ou —
//   KOBO_USERNAME / KOBO_PASSWORD pour une authentification Basic
//   COLLECT_CODES        codes collecteurs autorisés, séparés par des virgules

import { traiterEnvoi } from "../../lib/proxy.js";

export default async (req) => {
  const env = (k) => (typeof Netlify !== "undefined" ? Netlify.env.get(k) : process.env[k]);
  return traiterEnvoi(req, env);
};

