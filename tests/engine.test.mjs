import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normaliser, valider } from "../lib/protocole.js";
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

test("les protocoles d'exemple sont valides", () => {
  assert.deepEqual(valider(charger("mapomo-v1.json")), []);
  assert.deepEqual(valider(charger("porte-a-porte.json")), []);
});

test("chaises : structure, jamais de comptage, minimum si vue partielle", () => {
  const r = parcours("chaises", ["vu", "partie", { rangees: 8, par_rangee: 20, categorie: "vip" }, "assez"]);
  assert.equal(r.calculs.total_chaises, 160);
  assert.equal(r.affichage.fr, "≈ 160 chaises · VIP · minimum visible");
  assert.equal(r.provenance, "C");
  assert.equal(r.analyste, false);
  assert.deepEqual(r.chemin, ["source=vu", "vue=partie", "structure", "confiance=assez"]);
});

test("hors champ : pas de donnée, jamais zéro", () => {
  const r = parcours("chaises", ["pas_vu", "hors_champ"]);
  assert.equal(r.provenance, "N");
  assert.equal(r.valeurs.rangees, undefined);
  assert.equal(r.affichage.fr, "Pas de donnée");
});

test("rapporté : part chez l'analyste", () => {
  const r = parcours("sono", ["dit", "organisateur"]);
  assert.equal(r.provenance, "E");
  assert.equal(r.analyste, true);
});

test("peu sûr : part chez l'analyste même si constaté", () => {
  const r = parcours("foule", ["vu", "non", "2000_5000", "peu"]);
  assert.equal(r.provenance, "C");
  assert.equal(r.analyste, true);
  assert.equal(r.affichage.en, "2,000 to 5,000 people (range)");
});

test("foule : chaîne de Madagascar calculée", () => {
  const r = parcours("foule", ["vu", "oui", { type_lieu: "rue", longueur: 200, largeur: 20, part: 50, gene: 2 }, "sur"]);
  assert.equal(r.calculs.estimation, 4000);
});

test("véhicules : validation croisée entre deux écrans et signal de doublon", () => {
  const vide = { m_grand_bus: 0, m_minibus: 0, m_4x4: 0, m_voiture: 0, m_moto: 0 };
  const videU = { u_grand_bus: 0, u_minibus: 0, u_4x4: 0, u_voiture: 0, u_moto: 0 };
  assert.deepEqual(parcours("vehicules", ["vu", vide, videU]).erreurs, ["valide"]);
  const r = parcours("vehicules", ["vu", { ...vide, m_minibus: 2 }, { ...videU, u_moto: 3 }, "oui", "sur"]);
  assert.equal(r.affichage.fr, "2 marqués + 3 non marqués · doublon possible");
});

test("objets : trop tôt → à reprendre, sinon part de l'assistance", () => {
  assert.equal(parcours("objets", ["vu", "tracts", "pas_encore"]).provenance, "N");
  const r = parcours("objets", ["vu", "tracts", "oui", { g1: 4, g2: 0, g3: 6, g4: 0, g5: 0 }, "sur"]);
  assert.equal(r.calculs.part_assistance, 20);
  assert.deepEqual(parcours("objets", ["vu", "tracts", "oui", { g1: 11, g2: 0, g3: 0, g4: 0, g5: 0 }]).erreurs, ["g1"]);
});

test("retour arrière restaure l'état précédent", () => {
  const p = poste("services");
  let e = m.choisir(proto, p, m.demarrer(p), "vu").etat;
  e = m.choisir(proto, p, e, "non").etat;
  const avant = m.retour(e);
  assert.equal(avant.noeud, "comptable");
  assert.equal(avant.data.comptable, undefined);
});
