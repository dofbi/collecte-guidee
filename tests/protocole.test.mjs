import { test } from "node:test";
import assert from "node:assert/strict";
import { valider, normaliser } from "../lib/protocole.js";
import { xlsform } from "../lib/formulaire.js";
import { parse, evaluate, toXPath } from "../lib/expr.js";

const base = () => ({
  id: "essai", version: "1", postes: [{ id: "a", label: "A", entree: "n", noeuds: { n: { type: "compteurs", question: "Q", champs: [{ id: "x", label: "X" }], suite: "confiance" } } }]
});

test("un protocole minimal est valide et produit un XLSForm", () => {
  assert.deepEqual(valider(base()), []);
  const { survey } = xlsform(normaliser(base()));
  assert.ok(survey.some((r) => r[1] === "a__x" && r[0] === "integer"));
});

test("les erreurs de protocole sont expliquées", () => {
  const b = base();
  b.postes[0].noeuds.n.suite = "inexistant";
  b.postes[0].calculs = { y: "x * z" };
  const err = valider(b).join("\n");
  assert.match(err, /suite inconnue/);
  assert.match(err, /variable inconnue : z/);
  const c = base();
  c.postes[0].noeuds.source = c.postes[0].noeuds.n;
  assert.match(valider(c).join("\n"), /réservé/);
});

test("expressions : évaluation et traduction XPath", () => {
  assert.equal(evaluate("sum(a, b) * 2", { a: 3, b: "" }), 6);
  assert.equal(evaluate("a > 0 and b >= 2", { a: 1, b: 2 }), true);
  assert.equal(toXPath("a / b", (v) => `p__${v}`), "(number(${p__a}) div number(${p__b}))");
  assert.throws(() => parse("alert(1)"));
  assert.throws(() => parse("a +"));
});
