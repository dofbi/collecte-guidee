// Lecture, normalisation et validation d'un protocole de collecte.
// Un protocole décrit l'événement et les postes ; tout le reste (app, XLSForm, XML) en découle.

import { noeudsCommuns, NOEUDS_COMMUNS } from "./commun.js";
import { parse, variables } from "./expr.js";

export const SEP = "__";
export const TYPES_NOEUD = ["choix", "compteurs", "formulaire"];
export const TYPES_CHAMP = ["segment", "compteur", "texte"];
const ID = /^[a-z][a-z0-9_]*$/;

// Texte dans la langue demandée, repli sur le français puis sur la première langue disponible.
export function t(txt, lang = "fr") {
  if (txt == null) return "";
  if (typeof txt === "string") return txt;
  return txt[lang] ?? txt.fr ?? Object.values(txt)[0] ?? "";
}

export function nomChamp(poste, id) {
  return `${typeof poste === "string" ? poste : poste.id}${SEP}${id}`;
}
export const nomGroupe = (poste) => `p${SEP}${typeof poste === "string" ? poste : poste.id}`;

// Injecte le tronc commun dans chaque poste et résout « @entree ».
export function normaliser(brut) {
  const commun = noeudsCommuns(brut.commun);
  const postes = (brut.postes || []).map((p) => {
    const noeuds = {};
    for (const [id, n] of Object.entries(commun)) {
      noeuds[id] = { ...n, id, commun: true, options: n.options.map((o) => ({ ...o, suite: o.suite === "@entree" ? p.entree : o.suite })) };
    }
    for (const [id, n] of Object.entries(p.noeuds || {})) noeuds[id] = { ...n, id };
    return { calculs: {}, ...p, noeuds };
  });
  return { langues: ["fr"], ...brut, postes, evenement: brut.evenement || { champs: [] } };
}

// Retourne la liste des erreurs (vide si le protocole est valide).
export function valider(brut) {
  const err = [];
  const add = (m) => err.push(m);
  if (!brut || typeof brut !== "object") return ["Le protocole doit être un objet JSON."];
  if (!brut.id || !ID.test(brut.id)) add("`id` du protocole manquant ou invalide (minuscules, chiffres, _).");
  if (!brut.version) add("`version` du protocole manquante.");
  if (!Array.isArray(brut.postes) || !brut.postes.length) add("Le protocole doit contenir au moins un poste.");
  const idsEvt = new Set();
  for (const c of brut.evenement?.champs || []) {
    if (!ID.test(c.id || "")) add(`Champ d'événement invalide : ${c.id}`);
    if (idsEvt.has(c.id)) add(`Champ d'événement en double : ${c.id}`);
    idsEvt.add(c.id);
    if (!TYPES_CHAMP.includes(c.type)) add(`Type de champ inconnu (${c.id}) : ${c.type}`);
    if (c.type === "segment" && !(c.options || []).length) add(`Le champ d'événement ${c.id} n'a pas d'options.`);
  }
  const idsPostes = new Set();
  for (const p of brut.postes || []) {
    const ou = `poste « ${p.id} »`;
    if (!ID.test(p.id || "") || p.id.includes(SEP)) add(`Identifiant de poste invalide : ${p.id}`);
    if (idsPostes.has(p.id)) add(`Poste en double : ${p.id}`);
    idsPostes.add(p.id);
    if (!p.label) add(`${ou} : libellé manquant.`);
    if (!p.entree || !p.noeuds?.[p.entree]) add(`${ou} : \`entree\` doit désigner un nœud du poste.`);
    const locaux = new Set();
    const declare = (id, quoi) => {
      if (!ID.test(id || "") || id.includes(SEP)) add(`${ou} : identifiant invalide (${quoi}) : ${id}`);
      else if (locaux.has(id) || NOEUDS_COMMUNS.includes(id) || ["prov", "analyste", "chemin", "affichage"].includes(id)) add(`${ou} : identifiant réservé ou en double : ${id}`);
      locaux.add(id);
    };
    for (const [id, n] of Object.entries(p.noeuds || {})) {
      declare(id, "nœud");
      if (!TYPES_NOEUD.includes(n.type)) add(`${ou}, nœud ${id} : type inconnu « ${n.type} ».`);
      if (!n.question) add(`${ou}, nœud ${id} : question manquante.`);
      if (n.type === "choix") {
        if (!(n.options || []).length) add(`${ou}, nœud ${id} : aucune option.`);
        for (const o of n.options || []) if (!o.fin && !o.suite) add(`${ou}, nœud ${id}, option ${o.v} : ni \`suite\` ni \`fin\`.`);
      } else {
        if (!n.suite) add(`${ou}, nœud ${id} : \`suite\` manquante.`);
        for (const c of n.champs || []) {
          declare(c.id, "champ");
          if (n.type === "formulaire" && !TYPES_CHAMP.includes(c.type)) add(`${ou}, champ ${c.id} : type inconnu « ${c.type} ».`);
          if (c.type === "segment" && !(c.options || []).length) add(`${ou}, champ ${c.id} : aucune option.`);
        }
      }
    }
    for (const [id, expr] of Object.entries(p.calculs || {})) {
      declare(id, "calcul");
      try { parse(expr); } catch (e) { add(`${ou}, calcul ${id} : ${e.message}`); }
    }
    // Vérifications après déclaration de tous les identifiants
    const cibles = new Set([...Object.keys(p.noeuds || {}), ...NOEUDS_COMMUNS]);
    for (const [id, n] of Object.entries(p.noeuds || {})) {
      const suites = n.type === "choix" ? (n.options || []).map((o) => o.suite).filter(Boolean) : [n.suite];
      for (const s of suites) if (s && !cibles.has(s)) add(`${ou}, nœud ${id} : suite inconnue « ${s} ».`);
      if (n.valide) {
        try { for (const v of variables(n.valide)) if (!locaux.has(v)) add(`${ou}, nœud ${id} : variable inconnue dans \`valide\` : ${v}`); }
        catch (e) { add(`${ou}, nœud ${id}, valide : ${e.message}`); }
      }
      for (const o of n.options || []) for (const k of Object.keys(o.set || {})) if (locaux.has(k)) add(`${ou}, nœud ${id} : la clé \`set.${k}\` masque un identifiant.`);
    }
    for (const [id, expr] of Object.entries(p.calculs || {})) {
      try { for (const v of variables(expr)) if (!locaux.has(v)) add(`${ou}, calcul ${id} : variable inconnue : ${v}`); } catch { /* déjà signalé */ }
    }
  }
  return err;
}

// Parcours en largeur depuis « source » : ordre stable des nœuds atteignables.
export function ordreNoeuds(poste) {
  const vus = [], file = ["source"];
  while (file.length) {
    const id = file.shift();
    if (vus.includes(id) || !poste.noeuds[id]) continue;
    vus.push(id);
    const n = poste.noeuds[id];
    const suites = n.type === "choix" ? n.options.map((o) => o.suite).filter(Boolean) : [n.suite];
    file.push(...suites);
  }
  return vus;
}

// Clés posées par les options (`set`), par exemple « prov » ou « partiel ».
export function clesSet(poste) {
  const cles = new Map();
  for (const id of ordreNoeuds(poste)) {
    for (const o of poste.noeuds[id].options || []) {
      for (const [k, v] of Object.entries(o.set || {})) {
        if (!cles.has(k)) cles.set(k, []);
        cles.get(k).push({ noeud: id, v: o.v, valeur: v });
      }
    }
  }
  return cles;
}

// Description d'un champ saisi (pour libellés et types), indexée par identifiant local.
export function indexChamps(poste) {
  const idx = {};
  for (const id of ordreNoeuds(poste)) {
    const n = poste.noeuds[id];
    if (n.type === "choix") idx[id] = { id, type: "segment", options: n.options, label: n.question, noeud: id };
    else for (const c of n.champs || []) idx[c.id] = { type: n.type === "compteurs" ? "compteur" : c.type, ...c, noeud: id };
  }
  return idx;
}

export function libelleValeur(champ, v, lang) {
  if (!champ || champ.type !== "segment") return v;
  const o = (champ.options || []).find((x) => String(x.v) === String(v));
  return o ? t(o.label, lang) : v;
}
