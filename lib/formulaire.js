// Structure du formulaire Kobo dérivée du protocole.
// Source unique pour le XLSForm (scripts/generer.js) et pour le XML envoyé (lib/openrosa.js) :
// les deux ne peuvent donc pas diverger.

import { t, nomChamp, nomGroupe, ordreNoeuds, clesSet, SEP } from "./protocole.js";
import { toXPath } from "./expr.js";

export const GROUPE_EVT = "evenement";
export const nomEvt = (id) => `evt${SEP}${id}`;
const LANGUES = { fr: "Français (fr)", en: "English (en)" };
export const nomLangue = (l) => LANGUES[l] || `${l} (${l})`;

// Condition de pertinence (XPath) de chaque nœud d'un poste, pour l'usage sans l'app (KoboCollect, Enketo).
export function pertinences(poste) {
  const entrants = {};
  for (const id of ordreNoeuds(poste)) {
    const n = poste.noeuds[id];
    const aretes = n.type === "choix"
      ? n.options.filter((o) => o.suite).map((o) => ({ vers: o.suite, cond: `\${${nomChamp(poste, id)}} = '${o.v}'` }))
      : [{ vers: n.suite, cond: "" }];
    for (const a of aretes) (entrants[a.vers] ||= []).push({ de: id, cond: a.cond });
  }
  const memo = {};
  const et = (a, b) => (a && b ? `(${a}) and (${b})` : a || b);
  const rel = (id) => {
    if (id in memo) return memo[id];
    if (id === "source") return (memo[id] = "");
    memo[id] = "";
    const parts = (entrants[id] || []).map((e) => et(rel(e.de), e.cond)).filter((x) => x !== undefined);
    memo[id] = parts.includes("") ? "" : parts.length > 1 ? parts.map((p) => `(${p})`).join(" or ") : parts[0] || "";
    return memo[id];
  };
  const out = {};
  for (const id of ordreNoeuds(poste)) out[id] = rel(id);
  return out;
}

// Liste ordonnée des éléments du formulaire.
// Chaque champ a : name, type (xlsform), label, hint, relevant, calculation, choices, et `valeur(obs)` pour le XML.
export function structure(proto) {
  const langues = proto.langues || ["fr"];
  const items = [];
  items.push({ kind: "champ", type: "start", name: "start", valeur: (o) => o.debut });
  items.push({ kind: "champ", type: "end", name: "end", valeur: (o) => o.fin });
  items.push({ kind: "champ", type: "text", name: "code_collecteur", label: { fr: "Code collecteur", en: "Collector code" }, valeur: (o) => o.code });
  items.push({ kind: "champ", type: "text", name: "protocole", label: { fr: "Protocole", en: "Protocol" }, relevant: "false()", valeur: () => `${proto.id}@${proto.version}` });

  // Événement
  const evt = { kind: "groupe", name: GROUPE_EVT, label: { fr: "Événement", en: "Event" }, items: [] };
  for (const c of proto.evenement.champs) {
    const name = nomEvt(c.id);
    evt.items.push({
      kind: "champ", name, label: c.label, hint: c.aide,
      type: c.type === "segment" ? `select_one l${SEP}${name}` : c.type === "compteur" ? "integer" : "text",
      required: !c.facultatif, choices: c.type === "segment" ? { list: `l${SEP}${name}`, options: c.options } : null,
      valeur: (o) => o.evenement?.[c.id]
    });
  }
  items.push(evt);

  // Postes
  for (const p of proto.postes) {
    const g = { kind: "groupe", name: nomGroupe(p), label: p.label, items: [] };
    const rel = pertinences(p);
    const val = (id) => (o) => o.postes?.[p.id]?.valeurs?.[id];
    for (const id of ordreNoeuds(p)) {
      const n = p.noeuds[id];
      if (n.type === "choix") {
        const name = nomChamp(p, id);
        g.items.push({ kind: "champ", name, label: n.question, hint: n.aide, type: `select_one l${SEP}${name}`, required: true, relevant: rel[id],
          choices: { list: `l${SEP}${name}`, options: n.options }, valeur: val(id) });
      } else {
        for (const c of n.champs || []) {
          const type = n.type === "compteurs" ? "compteur" : c.type;
          const name = nomChamp(p, c.id);
          g.items.push({
            kind: "champ", name, label: c.label, hint: n.aide, relevant: rel[id],
            type: type === "segment" ? `select_one l${SEP}${name}` : type === "compteur" ? "integer" : "text",
            required: !c.facultatif, constraint: c.max != null ? `. <= ${c.max}` : type === "compteur" ? ". >= 0" : "",
            choices: type === "segment" ? { list: `l${SEP}${name}`, options: c.options } : null, valeur: val(c.id)
          });
        }
      }
    }
    for (const [id, expr] of Object.entries(p.calculs || {})) {
      g.items.push({ kind: "champ", type: "calculate", name: nomChamp(p, id), calculation: toXPath(expr, (v) => nomChamp(p, v)),
        valeur: (o) => o.postes?.[p.id]?.calculs?.[id] });
    }
    for (const [k, occ] of clesSet(p)) {
      const expr = occ.reduceRight((acc, x) => `if(\${${nomChamp(p, x.noeud)}} = '${x.v}', '${x.valeur}', ${acc})`, "''");
      g.items.push({ kind: "champ", type: "calculate", name: nomChamp(p, k), calculation: expr, valeur: val(k) });
    }
    g.items.push({ kind: "champ", type: "calculate", name: nomChamp(p, "analyste"),
      calculation: `if(\${${nomChamp(p, "prov")}} = 'E' or \${${nomChamp(p, "confiance")}} = 'peu', 'oui', 'non')`,
      valeur: (o) => (o.postes?.[p.id] ? (o.postes[p.id].analyste ? "oui" : "non") : undefined) });
    g.items.push({ kind: "champ", type: "text", name: nomChamp(p, "chemin"), label: { fr: "Chemin suivi", en: "Path taken" }, relevant: "false()",
      valeur: (o) => o.postes?.[p.id]?.chemin?.join(" > ") });
    g.items.push({ kind: "champ", type: "text", name: nomChamp(p, "affichage"), label: { fr: "Résumé", en: "Summary" }, relevant: "false()",
      valeur: (o) => o.postes?.[p.id]?.affichage?.[langues[0]] });
    items.push(g);
  }
  return items;
}

// Lignes XLSForm (feuilles survey, choices, settings), prêtes à écrire en CSV ou XLSX.
export function xlsform(proto, { formId, titre } = {}) {
  const langues = proto.langues || ["fr"];
  const col = (base) => langues.map((l) => `${base}::${nomLangue(l)}`);
  const surveyCols = ["type", "name", ...col("label"), ...col("hint"), "required", "relevant", "constraint", "calculation"];
  const survey = [surveyCols], choices = [["list_name", "name", ...col("label")]];
  const listes = new Set();
  const lab = (x) => langues.map((l) => t(x, l));
  const ligne = (it) => {
    if (it.kind === "groupe") {
      survey.push(["begin_group", it.name, ...lab(it.label), ...langues.map(() => ""), "", "", "", ""]);
      it.items.forEach(ligne);
      survey.push(["end_group", it.name, ...langues.map(() => ""), ...langues.map(() => ""), "", "", "", ""]);
      return;
    }
    survey.push([it.type, it.name, ...lab(it.label), ...lab(it.hint), it.required ? "yes" : "", it.relevant || "", it.constraint || "", it.calculation || ""]);
    if (it.choices && !listes.has(it.choices.list)) {
      listes.add(it.choices.list);
      for (const o of it.choices.options) choices.push([it.choices.list, String(o.v), ...lab(o.label)]);
    }
  };
  structure(proto).forEach(ligne);
  const settings = [["form_title", "form_id", "version", "default_language"],
    [t(titre || proto.titre, langues[0]), formId || proto.id, proto.version, nomLangue(langues[0])]];
  return { survey, choices, settings };
}
