// Construction de la soumission OpenRosa (XML) envoyée à KoboToolbox.
// L'élément racine porte un identifiant provisoire : le proxy le remplace par l'identifiant
// réel du formulaire Kobo (KOBO_FORM_ID), connu seulement côté serveur.

import { structure } from "./formulaire.js";

export const RACINE_PROVISOIRE = "__FORM_ID__";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// `obs` : { instanceID, code, debut, fin, evenement: {...}, postes: { [id]: resultat } }
export function versXml(proto, obs) {
  const corps = [];
  const ecrire = (items, indent) => {
    for (const it of items) {
      if (it.kind === "groupe") {
        const avant = corps.length;
        corps.push(`${indent}<${it.name}>`);
        ecrire(it.items, indent + "  ");
        if (corps.length === avant + 1) corps.pop(); // groupe vide : on ne l'écrit pas
        else corps.push(`${indent}</${it.name}>`);
        continue;
      }
      const v = it.valeur(obs);
      if (v === undefined || v === null || v === "" || (typeof v === "number" && !Number.isFinite(v))) continue;
      corps.push(`${indent}<${it.name}>${esc(v)}</${it.name}>`);
    }
  };
  ecrire(structure(proto), "  ");
  if (!/^uuid:[0-9a-f-]{36}$/i.test(obs.instanceID || "")) throw new Error("instanceID invalide (attendu uuid:…)");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<${RACINE_PROVISOIRE} id="${RACINE_PROVISOIRE}">`,
    ...corps,
    `  <meta>`,
    `    <instanceID>${esc(obs.instanceID)}</instanceID>`,
    `  </meta>`,
    `</${RACINE_PROVISOIRE}>`
  ].join("\n");
}

// Inscrit le code collecteur dans le XML (remplace l'existant, ou l'ajoute s'il manque).
// Utilisé par l'app au moment de l'envoi et par le proxy avec le code qu'il vient de valider.
export function avecCode(xml, code) {
  const balise = `<code_collecteur>${esc(code)}</code_collecteur>`;
  const re = /<code_collecteur>[\s\S]*?<\/code_collecteur>|<code_collecteur\s*\/>/;
  if (re.test(xml)) return xml.replace(re, balise);
  return xml.replace(/(\n\s*)<protocole>/, `$1${balise}$1<protocole>`);
}

// Côté serveur : remplace la racine provisoire par le formulaire Kobo réel.
export function finaliserXml(xml, formId, version, racine = formId) {
  const nom = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
  if (!nom.test(formId) || !nom.test(racine)) throw new Error("KOBO_FORM_ID ou KOBO_ROOT_TAG invalide");
  const ouverture = `<${RACINE_PROVISOIRE} id="${RACINE_PROVISOIRE}">`;
  if (!xml.includes(ouverture) || !xml.trimEnd().endsWith(`</${RACINE_PROVISOIRE}>`)) throw new Error("Structure XML inattendue");
  const v = version ? ` version="${esc(version)}"` : "";
  return xml.replace(ouverture, `<${racine} id="${formId}"${v}>`).replace(new RegExp(`</${RACINE_PROVISOIRE}>\\s*$`), `</${racine}>`);
}

export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
