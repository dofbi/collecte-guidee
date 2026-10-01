import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normaliser, valider, verifierQuantite } from "../lib/protocole.js";
import * as m from "../lib/engine.js";

const charger = (f) => JSON.parse(readFileSync(new URL(`../config/exemples/${f}`, import.meta.url), "utf8"));
const proto = normaliser(charger("mapomo-v1.json"));
const poste = (id) => proto.postes.find((p) => p.id === id);

// Enchaîne des actions : une chaîne = choix, un objet = formulaire. Renvoie le résultat final.
function parcours(id, etapes) {
  const p = poste(id);
  let e = m.demarrer(p);
  for (const a of etapes) {
    const r = typeof a === "object" ? m.soumettre(proto, p, e, a) : m.choisir(proto, p, e, a);
    if (r.erreurs) return { erreurs: r.erreurs };
    if (r.fin) return r.fin;
    e = r.etat;
  }
  throw new Error("parcours inachevé");
}
const zeros = (prefixe) => Object.fromEntries(["grand_bus", "minibus", "4x4", "voiture", "moto"].map((t) => [`${prefixe}_${t}`, 0]));

test("les protocoles d'exemple sont valides", () => {
  assert.deepEqual(valider(charger("mapomo-v1.json")), []);
  assert.deepEqual(valider(charger("porte-a-porte.json")), []);
});

test("présence et quantité séparées : absent, non observé, indéterminé sont trois choses différentes", () => {
  const absent = parcours("chaises", ["pas_vu", "absent"]);
  assert.equal(absent.presence, "absente_dans_la_portee");
  assert.deepEqual(absent.quantite, { forme: "exacte", valeur: 0 }, "zéro constaté, déclaré");
  const hors = parcours("chaises", ["pas_vu", "hors_champ"]);
  assert.equal(hors.presence, "non_observee");
  assert.equal(hors.quantite, null, "pas de quantité, jamais zéro");
  assert.equal(parcours("chaises", ["pas_vu", "indetermine"]).presence, "indeterminee");
});

test("information rapportée : quantité inconnue (≠ non observée), propos conservé tel quel, analyste", () => {
  const r = parcours("sono", ["dit", "fournisseur", { propos_texte: "loué 500 000 F pour la journée" }]);
  assert.equal(r.presence, "presente");
  assert.deepEqual(r.quantite, { forme: "inconnue" });
  assert.equal(r.methode, "temoignage");
  assert.equal(r.source_type, "fournisseur");
  assert.equal(r.valeurs.propos_texte, "loué 500 000 F pour la journée");
  assert.equal(r.analyste, true);
  assert.equal(parcours("sono", ["dit", "document", {}]).methode, "document");
});

test("chaises : structure, jamais de comptage, minimum visible si vue partielle", () => {
  const r = parcours("chaises", ["vu", "partielle", { rangees: 8, par_rangee: 20, categorie: "vip" }, "assez"]);
  assert.equal(r.calculs.total_chaises, 160);
  assert.equal(r.affichage.fr, "≈ 160 chaises · VIP · minimum visible");
  assert.equal(r.methode, "structure");
  assert.equal(r.portee, "partielle");
  assert.equal(r.quantite, null, "l'estimation structurée ne déclare pas de quantité : l'analyste la déduit");
  assert.deepEqual(r.chemin, ["source=vu", "vue_portee=partielle", "structure", "confiance=assez"]);
});

test("quatre formes : exacte, fourchette, minimum seul ; vue partielle → minimum", () => {
  const veh = (portee) => parcours("vehicules", ["vu", portee, { ...zeros("m"), m_minibus: 2 }, { ...zeros("u"), u_moto: 3 }, "oui", "sur"]);
  assert.deepEqual(veh("complete").quantite, { forme: "exacte", valeur: 5 });
  assert.deepEqual(veh("partielle").quantite, { forme: "minimum_seul", basse: 5 });
  assert.equal(veh("complete").affichage.fr, "2 marqués + 3 non marqués · doublon possible");
  const f = parcours("foule", ["vu", "complete", "non", "2000_5000", "peu"]);
  assert.deepEqual(f.quantite, { forme: "fourchette", basse: 2000, haute: 5000 });
  assert.equal(f.methode, "bande_de_jugement");
  assert.equal(f.analyste, true);
  const plus = parcours("foule", ["vu", "complete", "non", "plus_10000", "sur"]).quantite;
  assert.deepEqual(plus, { forme: "minimum_seul", basse: 10000 });
  assert.equal("haute" in plus, false, "un minimum seul n'a pas de maximum");
});

test("foule : chaîne de Madagascar calculée", () => {
  const r = parcours("foule", ["vu", "complete", "oui", { type_lieu: "rue", longueur: 200, largeur: 20, part: 50, gene: 2 }, "sur"]);
  assert.equal(r.calculs.estimation, 4000);
  assert.equal(r.methode, "structure");
});

test("validation croisée et bornes", () => {
  assert.deepEqual(parcours("vehicules", ["vu", "complete", zeros("m"), zeros("u")]).erreurs, ["valide"]);
  assert.deepEqual(parcours("objets", ["vu", "complete", "tracts", "oui", { g1: 11, g2: 0, g3: 0, g4: 0, g5: 0 }]).erreurs, ["g1"]);
  assert.deepEqual(verifierQuantite({ forme: "fourchette", basse: 55, haute: 25 }), ["quantité fourchette : `basse` supérieure à `haute`"]);
  assert.ok(verifierQuantite({ forme: "minimum_seul", basse: 3, haute: 9 }).length);
  assert.ok(verifierQuantite({ forme: "approx" }).length);
});

test("objets : trop tôt → à reprendre, sinon part de l'assistance", () => {
  assert.equal(parcours("objets", ["vu", "complete", "tracts", "pas_encore"]).provenance, "N");
  const r = parcours("objets", ["vu", "complete", "tracts", "oui", { g1: 4, g2: 0, g3: 6, g4: 0, g5: 0 }, "sur"]);
  assert.equal(r.calculs.part_assistance, 20);
});

test("retour arrière restaure l'état précédent", () => {
  const p = poste("services");
  let e = m.choisir(proto, p, m.demarrer(p), "vu").etat;
  e = m.choisir(proto, p, e, "complete").etat;
  e = m.choisir(proto, p, e, "non").etat;
  const avant = m.retour(e);
  assert.equal(avant.noeud, "comptable");
  assert.equal(avant.data.comptable, undefined);
});

test("affichage des quantités", () => {
  assert.equal(m.formaterQuantite({ forme: "fourchette", basse: 25, haute: 55 }), "25–55");
  assert.equal(m.formaterQuantite({ forme: "minimum_seul", basse: 3 }), "≥ 3");
  assert.equal(m.formaterQuantite({ forme: "inconnue" }), "inconnue");
});
