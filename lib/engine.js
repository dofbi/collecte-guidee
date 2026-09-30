// Moteur générique : fait avancer un observateur dans l'arbre de questions d'un poste.
// Fonctions pures (aucun accès au DOM ni au stockage) : testables avec `node --test`.

import { evaluate } from "./expr.js";
import { t, indexChamps, libelleValeur } from "./protocole.js";
import { versAnalyste } from "./commun.js";

export function demarrer(poste) {
  return { poste: poste.id, noeud: "source", chemin: [], data: {}, hist: [] };
}

export const courant = (poste, etat) => poste.noeuds[etat.noeud];

function avancer(etat, suite, pas, patch) {
  return {
    ...etat,
    hist: [...etat.hist, { noeud: etat.noeud, chemin: etat.chemin, data: etat.data }],
    noeud: suite,
    chemin: [...etat.chemin, pas],
    data: { ...etat.data, ...patch }
  };
}

export function retour(etat) {
  if (!etat.hist.length) return null;
  const h = etat.hist[etat.hist.length - 1];
  return { ...etat, ...h, hist: etat.hist.slice(0, -1) };
}

// Valeurs calculées du poste (ex. rangées × chaises). NaN quand une donnée manque.
export function calculs(poste, data) {
  const out = {};
  for (const [id, expr] of Object.entries(poste.calculs || {})) {
    const v = evaluate(expr, { ...data, ...out });
    out[id] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

// Choix d'une option sur un nœud « choix ».
export function choisir(proto, poste, etat, v) {
  const n = courant(poste, etat);
  if (n.type !== "choix") throw new Error(`Le nœud ${n.id} n'est pas un choix`);
  const o = n.options.find((x) => String(x.v) === String(v));
  if (!o) throw new Error(`Option inconnue ${v} pour ${n.id}`);
  const patch = { [n.id]: o.v, ...(o.set || {}) };
  const suivant = avancer(etat, o.suite || null, `${n.id}=${o.v}`, patch);
  if (o.fin) return { fin: resultat(proto, poste, suivant, o.fin) };
  return { etat: suivant };
}

// Vérifie un nœud « compteurs » ou « formulaire » avant de continuer.
export function erreurs(poste, etat, valeurs) {
  const n = courant(poste, etat);
  const data = { ...etat.data, ...valeurs };
  const errs = [];
  for (const c of n.champs || []) {
    const v = data[c.id];
    const type = n.type === "compteurs" ? "compteur" : c.type;
    if (type === "segment" && !c.facultatif && (v === undefined || v === "")) errs.push(c.id);
    if (type === "compteur" && (v === undefined || v === "" || Number(v) < 0 || (c.max != null && Number(v) > c.max))) errs.push(c.id);
    if (type === "texte" && !c.facultatif && !String(v ?? "").trim()) errs.push(c.id);
  }
  if (!errs.length && n.valide && !evaluate(n.valide, { ...data, ...calculs(poste, data) })) errs.push("valide");
  return errs;
}

export function soumettre(proto, poste, etat, valeurs) {
  const n = courant(poste, etat);
  const errs = erreurs(poste, etat, valeurs);
  if (errs.length) return { erreurs: errs };
  const patch = {};
  for (const c of n.champs || []) {
    const type = n.type === "compteurs" ? "compteur" : c.type;
    const v = valeurs[c.id] ?? etat.data[c.id];
    patch[c.id] = type === "compteur" ? Number(v) : v;
  }
  const suivant = avancer(etat, n.suite, n.id, patch);
  return { etat: suivant };
}

// Texte avec variables : {champ}, {?champ:texte si renseigné}, {?champ=valeur:texte si égal}.
export function rendre(tpl, poste, data, lang = "fr") {
  if (!tpl) return "";
  const idx = indexChamps(poste);
  const calc = calculs(poste, data);
  const nf = (x) => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString(lang === "en" ? "en-GB" : "fr-FR");
  const val = (k) => {
    if (k in calc) return calc[k] == null ? "?" : nf(calc[k]);
    const v = data[k];
    if (v === undefined || v === null || v === "") return "?";
    if (idx[k]?.type === "segment") return libelleValeur(idx[k], v, lang);
    return typeof v === "number" ? nf(v) : String(v);
  };
  return t(tpl, lang).replace(/\{\?([a-z0-9_]+)(?:=([^:}]+))?:([^}]*)\}|\{([a-z0-9_]+)\}/g, (_, ck, cv, txt, k) => {
    if (k) return val(k);
    const v = data[ck] ?? calc[ck];
    const ok = cv === undefined ? v !== undefined && v !== null && v !== "" && v !== "non" : String(v) === cv;
    return ok ? txt : "";
  });
}

// Enregistrement final d'un poste. L'affichage vient de la fin d'option, sinon du dernier nœud visité qui en définit un.
export function resultat(proto, poste, etat, fin = {}) {
  const data = etat.data;
  let tpl = fin.affichage;
  if (!tpl) {
    const visites = [...etat.hist.map((h) => h.noeud), etat.noeud].filter(Boolean).reverse();
    for (const id of visites) { if (poste.noeuds[id]?.affichage) { tpl = poste.noeuds[id].affichage; break; } }
  }
  const langues = proto.langues || ["fr"];
  const affichage = {}, note = {};
  for (const l of langues) {
    affichage[l] = rendre(tpl, poste, data, l);
    if (fin.note) note[l] = t(fin.note, l);
  }
  return {
    poste: poste.id,
    provenance: data.prov || "N",
    confiance: data.confiance || null,
    analyste: versAnalyste(data),
    valeurs: data,
    calculs: calculs(poste, data),
    affichage,
    note: fin.note ? note : null,
    chemin: etat.chemin,
    termine: new Date().toISOString()
  };
}
