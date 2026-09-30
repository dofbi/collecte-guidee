// Application : écrans, navigation et liaison entre le moteur (lib/engine.js),
// le stockage local (src/store.js) et la file d'envoi (src/sync.js).

import { valider, normaliser, t, indexChamps, libelleValeur } from "../lib/protocole.js";
import * as moteur from "../lib/engine.js";
import { versXml, uuid } from "../lib/openrosa.js";
import { observations, reglages, persistant } from "./store.js";
import { envoyerFile } from "./sync.js";
import { h, choix, compteur, segment, texte, boutonConfirme } from "./ui.js";
import { tr, setLangue, langue, langues } from "./i18n.js";

const S = {
  instance: null, proto: null, erreursProto: [],
  vue: "accueil", obs: null, poste: null, etat: null, saisie: {}, invalides: [], message: "", resultat: null,
  enLigne: navigator.onLine, envoi: false, majDispo: null
};
const racine = document.getElementById("app");
const L = () => langue();
const tx = (x) => t(x, L());

// ---------- Démarrage ----------
async function demarrer() {
  try {
    S.instance = await (await fetch("config/instance.json")).json();
    const brut = await (await fetch(S.instance.protocole || "config/protocole.json")).json();
    S.erreursProto = valider(brut);
    if (!S.erreursProto.length) S.proto = normaliser(brut);
  } catch (e) {
    S.erreursProto = [String(e.message || e)];
  }
  setLangue(await reglages.lire("langue", S.instance?.langue_defaut || "fr"));
  document.title = S.instance?.nom || document.title;
  if (S.instance?.couleur && matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.style.setProperty("--accent", S.instance.couleur);
  }
  addEventListener("online", () => { S.enLigne = true; synchroniser(); });
  addEventListener("offline", () => { S.enLigne = false; rendre(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") synchroniser(); });
  enregistrerSW();
  persistant();
  await rendre();
  synchroniser();
}

async function synchroniser() {
  if (!S.instance || !S.proto) return;
  S.envoi = true; if (S.vue === "accueil") rendre();
  await envoyerFile({ url: S.instance.envoi, purge: await reglages.lire("purge", S.instance.purge_apres_envoi !== false) }, (ev) => {
    if (ev.type === "reseau") S.message = tr("erreurReseau");
  });
  S.envoi = false;
  if (S.vue === "accueil") rendre();
}

function enregistrerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) { S.majDispo = w; rendre(); }
      });
    });
  }).catch(() => {});
  let recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recharge) { recharge = true; location.reload(); } });
}

// ---------- Navigation ----------
function aller(vue, patch = {}) {
  Object.assign(S, { vue, message: "", invalides: [] }, patch);
  rendre();
  scrollTo({ top: 0 });
}

async function rendre() {
  const vues = { accueil: vueAccueil, obs: vueObservation, q: vueQuestion, fin: vueFinPoste, reglages: vueReglages, apropos: vueAPropos };
  const contenu = S.erreursProto.length ? vueProtocoleInvalide() : await vues[S.vue]();
  racine.replaceChildren(...[barre(), S.majDispo ? bandeauMaj() : null, contenu].filter(Boolean));
  const focus = racine.querySelector("[data-focus]");
  if (focus && matchMedia("(pointer:fine)").matches) focus.focus({ preventScroll: true });
}

function barre() {
  return h("header", { class: "top" },
    h("button", { class: "brand", type: "button", onclick: () => aller("accueil") },
      h("span", { class: "mark", "aria-hidden": "true" }),
      h("span", {}, h("strong", {}, S.instance?.nom || "Collecte guidée"), h("span", { class: "sub" }, S.proto ? tx(S.proto.titre) : ""))),
    h("span", { class: "pill " + (S.enLigne ? "on" : "off") }, S.enLigne ? tr("enLigne") : tr("horsLigne")));
}

function bandeauMaj() {
  return h("div", { class: "banner" }, tr("maj"), " ",
    h("button", { class: "btn small", type: "button", onclick: () => S.majDispo.postMessage("skipWaiting") }, tr("recharger")));
}

function vueProtocoleInvalide() {
  return h("main", { class: "page" }, h("section", { class: "card" },
    h("h1", { class: "question" }, tr("protocoleInvalide")),
    h("ul", { class: "errors" }, S.erreursProto.map((e) => h("li", {}, e)))));
}

// ---------- Accueil ----------
async function vueAccueil() {
  const toutes = (await observations.lister()).sort((a, b) => (b.maj || "").localeCompare(a.maj || ""));
  const brouillons = toutes.filter((o) => o.statut === "brouillon");
  const file = toutes.filter((o) => o.statut === "en_attente" || o.statut === "erreur");
  const nb = await reglages.lire("nb_envoyees", 0);
  const code = await reglages.lire("code", "");
  const carteObs = (o) => {
    const faits = Object.keys(o.postes || {}).length;
    const typ = S.proto.evenement.champs.find((c) => c.type === "segment");
    const lib = typ ? libelleValeur({ type: "segment", options: typ.options }, o.evenement?.[typ.id], L()) : "";
    return h("button", { class: "obs-card", type: "button", onclick: () => ouvrirObs(o.id) },
      h("span", { class: "obs-title" }, lib || tr("evenement")),
      h("span", { class: "muted" }, `${tr("dateObs")} ${new Date(o.debut).toLocaleString(L() === "en" ? "en-GB" : "fr-FR", { dateStyle: "short", timeStyle: "short" })} · ${faits}/${S.proto.postes.length}`),
      h("span", { class: "chip " + (o.statut === "erreur" ? "E" : o.statut === "brouillon" ? "todo" : "A") }, tr(`statut.${o.statut}`)),
      o.erreur ? h("span", { class: "muted small" }, o.erreur === "code" ? tr("erreurCode") : `${tr("erreurServeur")} (${o.erreur})`) : null);
  };
  return h("main", { class: "page" },
    !code ? h("p", { class: "notice" }, tr("codeManquant"), " ", h("button", { class: "linkish", type: "button", onclick: () => aller("reglages") }, tr("reglages"))) : null,
    h("button", { class: "btn big", type: "button", "data-focus": "", onclick: nouvelleObs }, tr("nouvelle")),
    h("section", { class: "card" }, h("h2", {}, tr("brouillons")),
      brouillons.length ? h("div", { class: "list" }, brouillons.map(carteObs)) : h("p", { class: "muted" }, tr("aucuneObs"))),
    h("section", { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, `${tr("aEnvoyer")} (${file.length})`),
        h("button", { class: "btn small", type: "button", disabled: !file.length || !S.enLigne || S.envoi || !code ? true : null, onclick: synchroniser }, S.envoi ? tr("envoiEnCours") : tr("envoyerMaintenant"))),
      file.length ? h("div", { class: "list" }, file.map(carteObs)) : null,
      h("p", { class: "muted small" }, `${nb} ${tr("envoyees")}`),
      !S.enLigne ? h("p", { class: "muted small" }, tr("horsLigneInfo")) : null,
      S.message ? h("p", { class: "muted small" }, S.message) : null),
    h("nav", { class: "foot" },
      h("button", { class: "linkish", type: "button", onclick: () => aller("reglages") }, tr("reglages")),
      h("button", { class: "linkish", type: "button", onclick: () => aller("apropos") }, tr("aPropos"))));
}

async function nouvelleObs() {
  const id = uuid();
  const obs = { id, instanceID: `uuid:${id}`, protocole: { id: S.proto.id, version: S.proto.version }, statut: "brouillon", debut: new Date().toISOString(), evenement: {}, postes: {} };
  await observations.ecrire(obs);
  aller("obs", { obs });
}
async function ouvrirObs(id) {
  const obs = await observations.lire(id);
  if (obs) aller("obs", { obs });
}
const sauver = () => observations.ecrire(S.obs);

// ---------- Observation ----------
const evtComplet = () => S.proto.evenement.champs.every((c) => c.facultatif || (S.obs.evenement[c.id] !== undefined && S.obs.evenement[c.id] !== ""));

function puce(r) {
  if (!r) return h("span", { class: "chip todo" }, tr("aFaire"));
  if (r.provenance === "N") return h("span", { class: "chip N" }, tr("sansDonnee"));
  if (r.provenance === "E") return h("span", { class: "chip E" }, tr("rapporte"));
  return h("span", { class: "chip " + (r.analyste ? "A" : "C") }, r.analyste ? tr("aVerifier") : tr("fait"));
}

async function vueObservation() {
  const o = S.obs, editable = o.statut === "brouillon";
  const champsEvt = S.proto.evenement.champs.map((c) => {
    const v = o.evenement[c.id];
    const maj = (x) => { o.evenement[c.id] = x; sauver().then(() => { if (c.type === "segment") rendre(); }); };
    if (c.type === "segment") return segment({ label: tx(c.label), valeur: v, options: c.options.map((x) => ({ v: x.v, texte: tx(x.label) })), onchange: maj });
    if (c.type === "compteur") return compteur({ id: `evt-${c.id}`, label: tx(c.label), valeur: v ?? 0, onchange: maj });
    return texte({ id: `evt-${c.id}`, label: tx(c.label), valeur: v ?? "", onchange: (x) => { o.evenement[c.id] = x; sauver(); } });
  });
  const ok = evtComplet();
  return h("main", { class: "page" },
    h("button", { class: "btn ghost small", type: "button", onclick: () => aller("accueil") }, tr("retour")),
    h("section", { class: "card" }, h("h2", {}, tr("evenement")), h("fieldset", { class: "fields", disabled: !editable ? true : null }, champsEvt)),
    h("section", { class: "card" }, h("h2", {}, tr("postes")),
      !ok ? h("p", { class: "muted" }, tr("evtIncomplet")) : null,
      h("ul", { class: "postes" }, S.proto.postes.map((p) => {
        const r = o.postes[p.id];
        return h("li", {}, h("button", { class: "poste", type: "button", disabled: !ok || !editable ? true : null, onclick: () => commencerPoste(p) },
          h("span", { class: "name" }, tx(p.label)), h("span", { class: "hint" }, r ? r.affichage[L()] ?? Object.values(r.affichage)[0] : tx(p.aide)), h("span", { class: "state" }, puce(r))));
      }))),
    ficheResume(),
    editable ? h("div", { class: "actions-col" },
      h("button", { class: "btn big", type: "button", disabled: !ok ? true : null, onclick: terminerObs }, tr("terminer")),
      boutonConfirme(tr("supprimer"), tr("confirmerSuppr"), async () => { await observations.supprimer(o.id); aller("accueil"); })) : null);
}

function ficheResume() {
  const lignes = S.proto.postes.filter((p) => S.obs.postes[p.id]).map((p) => {
    const r = S.obs.postes[p.id];
    return h("tr", {}, h("th", { scope: "row" }, tx(p.label)), h("td", { class: "num" }, r.affichage[L()] ?? ""), h("td", {}, tr(`prov.${r.provenance}`)),
      h("td", {}, r.confiance ? tr(`conf.${r.confiance}`) : "—"), h("td", {}, r.analyste ? tr("versAnalyste") : "—"));
  });
  if (!lignes.length) return null;
  return h("section", { class: "card" }, h("h2", {}, tr("fiche")), h("div", { class: "table-wrap" }, h("table", {}, h("tbody", {}, lignes))));
}

async function terminerObs() {
  const o = S.obs;
  o.fin = new Date().toISOString();
  o.code = await reglages.lire("code", "");
  o.xml = versXml(S.proto, o);
  o.statut = "en_attente";
  await sauver();
  aller("accueil");
  synchroniser();
}

// ---------- Questions ----------
function commencerPoste(p) {
  aller("q", { poste: p, etat: moteur.demarrer(p), saisie: {} });
}

function libelleEtape(p, pas) {
  const [id, v] = pas.split("=");
  const n = p.noeuds[id];
  if (!n) return pas;
  if (v !== undefined) { const o = n.options.find((x) => String(x.v) === v); return o ? tx(o.label) : v; }
  return n.apercu ? moteur.rendre(n.apercu, p, S.etat?.data || {}, L()) : tx(n.question);
}

function vueQuestion() {
  const p = S.poste, n = moteur.courant(p, S.etat);
  let corps;
  if (n.type === "choix") {
    corps = h("div", { class: "choices" }, n.options.map((o, i) => choix(tx(o.label), tx(o.sous), () => choisir(o.v), i === 0 ? { "data-focus": "" } : {})));
  } else {
    const donnees = () => ({ ...S.etat.data, ...S.saisie });
    const apercu = n.apercu ? h("div", { class: "calc", "aria-live": "polite" }) : null;
    const majApercu = () => { if (apercu) apercu.textContent = moteur.rendre(n.apercu, p, donnees(), L()); };
    const champs = (n.champs || []).map((c, i) => {
      const type = n.type === "compteurs" ? "compteur" : c.type;
      const inv = S.invalides.includes(c.id);
      if (!(c.id in S.saisie) && type === "compteur") S.saisie[c.id] = S.etat.data[c.id] ?? 0;
      const set = (x) => { S.saisie[c.id] = x; majApercu(); };
      if (type === "compteur") return compteur({ id: `f-${c.id}`, label: tx(c.label), valeur: S.saisie[c.id], max: c.max ?? null, invalide: inv, onchange: set });
      if (type === "segment") return segment({ label: tx(c.label), valeur: S.saisie[c.id] ?? S.etat.data[c.id], invalide: inv, options: c.options.map((x) => ({ v: x.v, texte: tx(x.label) })), onchange: set });
      return texte({ id: `f-${c.id}`, label: tx(c.label), valeur: S.saisie[c.id] ?? S.etat.data[c.id] ?? "", invalide: inv, onchange: set });
    });
    majApercu();
    corps = h("div", { class: "fields" }, champs, apercu,
      S.message ? h("p", { class: "error", role: "alert" }, S.message) : null,
      h("button", { class: "btn", type: "button", onclick: soumettre }, tr("continuer")));
  }
  return h("main", { class: "page" }, h("section", { class: "card step" },
    h("div", { class: "crumbs" }, h("span", {}, tx(p.label)), S.etat.chemin.map((pas) => h("span", {}, libelleEtape(p, pas)))),
    h("span", { class: "qnum" }, `${tr("question")} ${S.etat.hist.length + 1}`, n.dernier_recours ? h("span", { class: "chip E" }, tr("dernierRecours")) : null),
    h("h1", { class: "question" }, tx(n.question)),
    n.aide ? h("p", { class: "help" }, tx(n.aide)) : null,
    corps,
    h("div", { class: "nav" }, h("button", { class: "btn ghost small", type: "button", onclick: precedent }, S.etat.hist.length ? tr("precedente") : tr("retourListe")))));
}

function choisir(v) {
  const r = moteur.choisir(S.proto, S.poste, S.etat, v);
  if (r.fin) return finirPoste(r.fin);
  aller("q", { etat: r.etat, saisie: {} });
}

function soumettre() {
  const r = moteur.soumettre(S.proto, S.poste, S.etat, S.saisie);
  if (r.erreurs) {
    S.invalides = r.erreurs;
    S.message = r.erreurs.includes("valide") ? tr("regleNonRespectee") : tr("champsManquants");
    return rendre();
  }
  aller("q", { etat: r.etat, saisie: {} });
}

function precedent() {
  const e = moteur.retour(S.etat);
  if (!e) return aller("obs");
  aller("q", { etat: e, saisie: {} });
}

async function finirPoste(res) {
  S.obs.postes[S.poste.id] = res;
  await sauver();
  aller("fin", { resultat: res });
}

function vueFinPoste() {
  const r = S.resultat, p = S.poste;
  const suivant = S.proto.postes.find((x) => !S.obs.postes[x.id]);
  return h("main", { class: "page" }, h("section", { class: "card step" },
    h("span", { class: "qnum" }, `${tx(p.label)} · ${tr("enregistre")}`),
    h("p", { class: "big-result" }, r.affichage[L()] ?? ""),
    h("div", { class: "crumbs" }, h("span", {}, tr(`prov.${r.provenance}`)), r.confiance ? h("span", {}, tr(`conf.${r.confiance}`)) : null, r.analyste ? h("span", {}, tr("versAnalyste")) : null),
    r.analyste && S.instance.analyste ? h("p", { class: "calc" }, tx(S.instance.analyste)) : null,
    r.note ? h("p", { class: "help" }, r.note[L()] ?? "") : null,
    h("p", { class: "muted small" }, `${tr("chemin")} : ${r.chemin.map((x) => libelleEtape(p, x)).join(" → ")}`),
    h("div", { class: "nav" },
      h("button", { class: "btn ghost", type: "button", onclick: () => commencerPoste(p) }, tr("refaire")),
      suivant ? h("button", { class: "btn", type: "button", "data-focus": "", onclick: () => commencerPoste(suivant) }, `${tr("posteSuivant")} : ${tx(suivant.label)}`)
        : h("button", { class: "btn", type: "button", "data-focus": "", onclick: () => aller("obs") }, tr("voirFiche")))));
}

// ---------- Réglages et à propos ----------
async function vueReglages() {
  const code = await reglages.lire("code", "");
  const purge = await reglages.lire("purge", S.instance.purge_apres_envoi !== false);
  const f = { code, purge, langue: L() };
  return h("main", { class: "page" },
    h("button", { class: "btn ghost small", type: "button", onclick: () => aller("accueil") }, tr("retour")),
    h("section", { class: "card" }, h("h2", {}, tr("reglages")),
      h("div", { class: "fields" },
        texte({ id: "code", label: tr("code"), valeur: code, onchange: (x) => { f.code = x.trim(); } }),
        h("p", { class: "muted small" }, tr("codeAide")),
        segment({ label: tr("langue"), valeur: L(), options: langues().filter((l) => (S.proto?.langues || ["fr"]).includes(l)).map((l) => ({ v: l, texte: l.toUpperCase() })), onchange: (x) => { f.langue = x; } }),
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: purge ? true : null, onchange: (e) => { f.purge = e.target.checked; } }), tr("purge")),
        h("p", { class: "muted small" }, tr("purgeAide")),
        S.message ? h("p", { class: "ok", role: "status" }, S.message) : null,
        h("button", { class: "btn", type: "button", onclick: async () => {
          await reglages.ecrire("code", f.code); await reglages.ecrire("purge", f.purge); await reglages.ecrire("langue", f.langue);
          setLangue(f.langue); S.message = tr("enregistres"); rendre(); synchroniser();
        } }, tr("enregistrer")))));
}

function vueAPropos() {
  return h("main", { class: "page" },
    h("button", { class: "btn ghost small", type: "button", onclick: () => aller("accueil") }, tr("retour")),
    h("section", { class: "card prose" },
      h("h2", {}, tr("aPropos")),
      h("p", {}, tx(S.instance.description)),
      h("p", {}, h("b", {}, `${tr("protocole")} : `), `${tx(S.proto.titre)} (${S.proto.id}, ${tr("version")} ${S.proto.version})`),
      S.proto.description ? h("p", { class: "muted" }, tx(S.proto.description)) : null,
      S.instance.depot ? h("p", {}, h("a", { href: S.instance.depot, target: "_blank", rel: "noopener" }, tr("source"))) : h("p", { class: "muted small" }, tr("source"))));
}

demarrer();
