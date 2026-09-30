// File d'envoi : chaque observation terminée attend ici jusqu'à ce que le proxy confirme
// sa réception par KoboToolbox. Déclenchée au démarrage, au retour du réseau, au retour
// sur l'app et à la demande.

import { observations, reglages } from "./store.js";

let enCours = false;

// Le code collecteur peut avoir été saisi (ou corrigé) après la fin de l'observation :
// on inscrit toujours le code actuel dans le XML au moment de l'envoi.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function avecCode(xml, code) {
  const balise = `<code_collecteur>${esc(code)}</code_collecteur>`;
  if (/<code_collecteur>[\s\S]*?<\/code_collecteur>/.test(xml)) return xml.replace(/<code_collecteur>[\s\S]*?<\/code_collecteur>/, balise);
  return xml.replace(/(\n\s*)<protocole>/, `$1${balise}$1<protocole>`);
}

export async function envoyerFile({ url, purge }, notifier = () => {}) {
  if (enCours) return;
  enCours = true;
  try {
    const code = await reglages.lire("code", "");
    const liste = (await observations.lister()).filter((o) => o.statut === "en_attente" || o.statut === "erreur");
    if (!liste.length || !code || !navigator.onLine) return;
    for (const obs of liste) {
      let rep, corps = {};
      try {
        rep = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, instanceID: obs.instanceID, xml: avecCode(obs.xml, code) })
        });
        corps = await rep.json().catch(() => ({}));
      } catch {
        notifier({ type: "reseau" });
        return; // réseau coupé : on garde la file intacte
      }
      if (rep.ok && corps.ok) {
        if (purge) await observations.supprimer(obs.id);
        else await observations.ecrire({ ...obs, statut: "envoye", envoye_le: new Date().toISOString(), erreur: null });
        await reglages.ecrire("nb_envoyees", (await reglages.lire("nb_envoyees", 0)) + 1);
        notifier({ type: "envoye", id: obs.id });
      } else {
        const erreur = rep.status === 401 || rep.status === 403 ? "code"
          : [corps.erreur || `HTTP ${rep.status}`, corps.detail].filter(Boolean).join(" : ");
        await observations.ecrire({ ...obs, statut: "erreur", erreur });
        notifier({ type: "erreur", id: obs.id, erreur });
        if (erreur === "code") return;
      }
    }
  } finally {
    enCours = false;
  }
}
