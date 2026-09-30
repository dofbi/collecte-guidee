import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normaliser } from "../lib/protocole.js";
import * as m from "../lib/engine.js";
import { versXml, finaliserXml } from "../lib/openrosa.js";
import { xlsform, structure } from "../lib/formulaire.js";
import { traiterEnvoi } from "../lib/proxy.js";

const proto = normaliser(JSON.parse(readFileSync(new URL("../config/exemples/mapomo-v1.json", import.meta.url), "utf8")));
const p = proto.postes.find((x) => x.id === "chaises");
let e = m.demarrer(p);
e = m.choisir(proto, p, e, "vu").etat;
e = m.choisir(proto, p, e, "toutes").etat;
e = m.soumettre(proto, p, e, { rangees: 5, par_rangee: 10, categorie: "standard" }).etat;
const fin = m.choisir(proto, p, e, "sur").fin;
const obs = { instanceID: "uuid:3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b", code: "ABC", debut: "2026-09-30T09:00:00Z", fin: "2026-09-30T09:20:00Z", evenement: { type: "meeting", echelle: "ville" }, postes: { chaises: fin } };

test("le XML ne contient que des champs déclarés dans le XLSForm", () => {
  const xml = versXml(proto, obs);
  const noms = new Set(xlsform(proto).survey.slice(1).map((r) => r[1]));
  for (const [, tag] of xml.matchAll(/<([a-z_][a-z0-9_]*)>[^<]/g)) assert.ok(noms.has(tag) || ["instanceID", "meta"].includes(tag), `champ inconnu : ${tag}`);
  assert.match(xml, /<chaises__total_chaises>50<\/chaises__total_chaises>/);
  assert.match(xml, /<chaises__prov>C<\/chaises__prov>/);
  assert.match(xml, /<chaises__analyste>non<\/chaises__analyste>/);
  assert.doesNotMatch(xml, /<p__vehicules>/, "un poste non renseigné n'est pas envoyé");
});

test("la racine provisoire est remplacée par le formulaire Kobo", () => {
  const xml = finaliserXml(versXml(proto, obs), "aB3cD4eF5", "v1");
  assert.match(xml, /<aB3cD4eF5 id="aB3cD4eF5" version="v1">/);
  assert.match(xml, /<\/aB3cD4eF5>$/);
  assert.throws(() => finaliserXml("<x/>", "aB3"));
});

test("XLSForm : noms uniques, listes de choix présentes", () => {
  const { survey, choices } = xlsform(proto);
  const noms = survey.slice(1).filter((r) => !r[0].startsWith("end_group")).map((r) => r[1]);
  assert.equal(new Set(noms).size, noms.length);
  const listes = new Set(choices.slice(1).map((r) => r[0]));
  for (const r of survey) if (r[0].startsWith("select_one ")) assert.ok(listes.has(r[0].slice(11)), r[0]);
  assert.ok(structure(proto).length > 4);
});

test("proxy : code refusé, succès, doublon, erreur Kobo", async () => {
  const env = (k) => ({ COLLECT_CODES: "ABC, XYZ", KOBO_SUBMISSION_URL: "https://kobo.test/submission", KOBO_FORM_ID: "aB3cD4", KOBO_TOKEN: "t" })[k];
  const xml = versXml(proto, obs);
  const req = (corps) => new Request("https://app.test/.netlify/functions/submit", { method: "POST", body: JSON.stringify(corps) });
  const envoye = [];
  const faux = (status) => async (url, init) => { envoye.push({ url, init, xml: await init.body.get("xml_submission_file").text() }); return new Response("", { status }); };

  assert.equal((await traiterEnvoi(req({ code: "NOPE", instanceID: obs.instanceID, xml }), env, faux(201))).status, 401);
  const ok = await traiterEnvoi(req({ code: "ABC", instanceID: obs.instanceID, xml }), env, faux(201));
  assert.equal(ok.status, 200);
  assert.equal(envoye[0].init.headers.Authorization, "Token t");
  assert.match(envoye[0].xml, /<aB3cD4 id="aB3cD4">/);
  assert.equal((await (await traiterEnvoi(req({ code: "ABC", instanceID: obs.instanceID, xml }), env, faux(202))).json()).ok, true);
  assert.equal((await traiterEnvoi(req({ code: "ABC", instanceID: obs.instanceID, xml }), env, faux(500))).status, 502);
  assert.equal((await traiterEnvoi(req({ code: "XYZ", instanceID: obs.instanceID, xml }), env, faux(201))).status, 400, "code différent de celui du XML");
});

test("proxy : repli sur identifiant et mot de passe, message de Kobo relayé", async () => {
  const env = (k) => ({ COLLECT_CODES: "ABC", KOBO_SUBMISSION_URL: "https://kobo.test/submission", KOBO_FORM_ID: "aB3cD4", KOBO_TOKEN: "t", KOBO_USERNAME: "u", KOBO_PASSWORD: "p" })[k];
  const xml = versXml(proto, obs);
  const req = () => new Request("https://app.test/submit", { method: "POST", body: JSON.stringify({ code: "ABC", instanceID: obs.instanceID, xml }) });
  const auths = [];
  const kobo = async (url, init) => { auths.push(init.headers.Authorization.split(" ")[0]); return new Response("", { status: init.headers.Authorization.startsWith("Basic") ? 201 : 401 }); };
  assert.equal((await traiterEnvoi(req(), env, kobo)).status, 200);
  assert.deepEqual(auths, ["Token", "Basic"]);
  const refus = async () => new Response('<OpenRosaResponse><message nature="">Form does not exist on this account</message></OpenRosaResponse>', { status: 404 });
  const corps = await (await traiterEnvoi(req(), env, refus)).json();
  assert.equal(corps.erreur, "kobo_404");
  assert.equal(corps.detail, "Form does not exist on this account");
});

test("proxy : diagnostic de configuration sans révéler de secret", async () => {
  const vide = await (await traiterEnvoi(new Request("https://app.test/submit"), () => undefined)).json();
  assert.equal(vide.configure, false);
  assert.ok(vide.variables_manquantes.includes("KOBO_FORM_ID"));
  const env = (k) => ({ COLLECT_CODES: "ABC", KOBO_SUBMISSION_URL: "https://kobo.test/submission", KOBO_FORM_ID: "aB3cD4", KOBO_TOKEN: "secret" })[k];
  const d = await (await traiterEnvoi(new Request("https://app.test/submit?verifier=1"), env, async () => new Response(null, { status: 204 }))).json();
  assert.deepEqual(d.kobo, [{ authentification: "token", statut: 204, accepte: true }]);
  assert.doesNotMatch(JSON.stringify(d), /secret/);
});

test("envoi : le code collecteur actuel est inscrit dans le XML", async () => {
  const { avecCode } = await import("../src/sync.js");
  const sansCode = versXml(proto, { ...obs, code: "" });
  assert.match(avecCode(sansCode, "ABC"), /<code_collecteur>ABC<\/code_collecteur>\n\s*<protocole>/);
  assert.match(avecCode(versXml(proto, obs), "NEW"), /<code_collecteur>NEW<\/code_collecteur>/);
});
