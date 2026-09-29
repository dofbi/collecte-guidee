(() => {
  "use strict";

  // ---------- Configuration des postes ----------
  // seuil : en dessous, et si tout est visible, on compte. Sinon, on mesure.
  // seuil null : pas de comptage direct possible, on passe directement à la mesure.
  const POSTES = [
    { id: "chaises", label: "Chaises", hint: "Installées pour le rassemblement", seuil: 20, mesure: "structure", unite: "chaises" },
    { id: "vehicules", label: "Véhicules", hint: "Bus, minibus, voitures, motos mobilisés", seuil: 20, mesure: "vehicules", unite: "véhicules" },
    { id: "tshirts", label: "T-shirts et casquettes", hint: "Portés au moment de l'observation", seuil: 20, mesure: "echantillon", unite: "personnes équipées" },
    { id: "sono", label: "Sonorisation et estrade", hint: "Scène, enceintes, tours de relais", seuil: null, mesure: "scene", unite: "" },
    { id: "foule", label: "Foule", hint: "Personnes présentes", seuil: null, mesure: "foule", unite: "personnes" }
  ];

  const DENSITES = [
    { v: 1, label: "Clairsemée", sub: "on circule sans gêne · ~1 pers./m²" },
    { v: 2, label: "Dense", sub: "on se frôle · ~2 pers./m²" },
    { v: 4, label: "Très dense", sub: "on ne peut plus avancer · ~4 pers./m²" }
  ];
  const PARTS = [25, 50, 75, 100];
  const CONFIANCE = [
    { v: "sur", label: "Sûr", sub: "je referais le même relevé" },
    { v: "assez", label: "Assez sûr", sub: "petite marge d'erreur" },
    { v: "peu", label: "Peu sûr", sub: "à vérifier par un analyste" }
  ];
  const PROV = { C: "Constaté", E: "Rapporté", N: "Non observé" };

  // ---------- État ----------
  const KEY = "collecte-guidee-v1";
  let fiche = {};
  try { fiche = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { fiche = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(fiche)); } catch (e) {} };

  let cur = null; // { poste, node, path: [], data: {}, history: [] }

  const $ = (s) => document.querySelector(s);
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }
  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");

  // ---------- Arbre de questions ----------
  function start(poste) {
    cur = { poste, node: "source", path: [], data: {}, history: [] };
    render();
  }
  function go(node, crumb, patch) {
    cur.history.push({ node: cur.node, path: cur.path.slice(), data: { ...cur.data } });
    if (crumb) cur.path.push(crumb);
    if (patch) Object.assign(cur.data, patch);
    cur.node = node;
    render();
  }
  function back() {
    const prev = cur.history.pop();
    if (!prev) { cur = null; render(); return; }
    cur.node = prev.node; cur.path = prev.path; cur.data = prev.data;
    render();
  }

  const NODES = {
    source(p) {
      return ask("Comment connaissez-vous ce poste ?", "Répondez pour ce que vous savez maintenant, sur place.", [
        ["Je le vois", "de mes yeux, maintenant", () => go("visible", "vu", { prov: "C" })],
        ["On me l'a dit", "je ne l'ai pas vu moi-même", () => go("rapporte", "rapporté", { prov: "E" })],
        ["Je ne le vois pas", "rien de visible d'où je suis", () => go("absent", "pas vu")]
      ]);
    },
    absent(p) {
      return ask("Est-ce absent, ou hors de votre vue ?", "Un objet masqué ou hors champ n'est pas un zéro.", [
        ["Absent, j'en suis sûr", "j'ai une vue complète du lieu", () => finish({ valeur: 0, affichage: "0", prov: "C", conf: "sur", crumb: "absent" })],
        ["Hors champ ou masqué", "je ne peux pas savoir", () => finish({ valeur: null, affichage: "Inconnu", prov: "N", conf: null, crumb: "hors champ" })]
      ]);
    },
    visible(p) {
      return ask("Voyez-vous tout le dispositif ?", `Tout ce qui concerne « ${p.label.toLowerCase()} », d'un bout à l'autre.`, [
        ["Oui, en entier", "rien n'est caché", () => go(p.seuil ? "petit" : "mesure", "vue complète", { partiel: false })],
        ["En partie seulement", "une partie est masquée ou hors champ", () => go("mesure", "vue partielle", { partiel: true })]
      ]);
    },
    petit(p) {
      return ask(`Y en a-t-il moins de ${p.seuil} ?`, "Un coup d'œil suffit, ne comptez pas encore.", [
        [`Moins de ${p.seuil}`, "je peux les compter un par un", () => go("comptage", `< ${p.seuil}`)],
        [`${p.seuil} ou plus`, "trop pour compter un par un", () => go("mesure", `≥ ${p.seuil}`)]
      ]);
    },
    comptage(p) {
      const n = num("n", 0);
      return form("Comptez-les un par un.", "Interface : comptage exact.", [stepper("n", "Nombre compté", n)], () => {
        const v = num("n", 0);
        cur.data.mesure = { type: "comptage", n: v };
        go("confiance", `comptage : ${v}`, { valeur: v, affichage: `${fmt(v)} ${p.unite}`.trim() });
      });
    },
    mesure(p) { return MESURES[p.mesure](p); },
    rapporte(p) {
      const qui = cur.data.qui || "";
      return form("Qui vous l'a dit ?", "L'information sera envoyée à un analyste. Rien n'est chiffré ici.", [
        seg("qui", "Source", ["Participant", "Organisateur", "Commerçant", "Autre"], qui),
        text("quoi", "Ce qui a été dit", "ex. des bus sont venus de Louga ce matin", cur.data.quoi || "")
      ], () => {
        const quoi = val("quoi");
        finish({ valeur: null, affichage: quoi ? `« ${quoi} »` : "Information rapportée", prov: "E", conf: null, analyste: true, crumb: `source : ${cur.data.qui || "?"}`, extra: { qui: cur.data.qui || null, quoi } });
      }, () => !!cur.data.qui);
    },
    confiance(p) {
      return ask("Êtes-vous sûr de votre relevé ?", "Cette question est séparée de la provenance : vous pouvez avoir vu et douter du nombre.",
        CONFIANCE.map((c) => [c.label, c.sub, () => finish({ conf: c.v, crumb: c.label.toLowerCase(), analyste: c.v === "peu" })]));
    }
  };

  // Interfaces de mesure : c'est le poste qui décide, pas l'observateur.
  const MESURES = {
    structure(p) {
      return form("Relevez la structure des rangées.", "Interface : mesure. Deux nombres faciles, le total est calculé.", [
        h("div", { class: "row2" }, stepper("rangees", "Nombre de rangées", num("rangees", 0)), stepper("parRangee", "Chaises dans une rangée", num("parRangee", 0))),
        calc(() => { const r = num("rangees", 0), c = num("parRangee", 0); return r && c ? `${r} × ${c} = ${fmt(r * c)} chaises` : "Renseignez les deux nombres."; })
      ], () => {
        const r = num("rangees", 0), c = num("parRangee", 0);
        cur.data.mesure = { type: "structure", rangees: r, parRangee: c };
        go("confiance", `structure : ${r} × ${c}`, { valeur: r * c, affichage: `≈ ${fmt(r * c)} chaises` });
      }, () => num("rangees", 0) > 0 && num("parRangee", 0) > 0);
    },
    vehicules(p) {
      return form("Séparez les véhicules marqués des autres.", "Interface : mesure. Marqués = affiche, autocollant ou couleur du candidat.", [
        h("div", { class: "row2" }, stepper("marques", "Marqués", num("marques", 0)), stepper("nonMarques", "Non marqués, peut-être liés", num("nonMarques", 0))),
        seg("typeMaj", "Type le plus fréquent", ["Bus", "Minibus", "Voiture", "Moto"], cur.data.typeMaj || "")
      ], () => {
        const m = num("marques", 0), n = num("nonMarques", 0);
        cur.data.mesure = { type: "vehicules", marques: m, nonMarques: n, typeMaj: cur.data.typeMaj || null };
        go("confiance", `marqués ${m} · autres ${n}`, { valeur: m, affichage: `${fmt(m)} marqués + ${fmt(n)} incertains` });
      }, () => num("marques", 0) + num("nonMarques", 0) > 0);
    },
    echantillon(p) {
      const foule = fiche.foule && typeof fiche.foule.valeur === "number" ? fiche.foule.valeur : null;
      return form("Regardez dix personnes au hasard.", "Interface : échantillon. Combien portent un t-shirt ou une casquette du candidat ?", [
        stepper("surDix", "Sur 10 personnes", num("surDix", 0), 0, 10),
        calc(() => {
          const k = num("surDix", 0);
          return foule ? `${k}/10 × foule ${fmt(foule)} ≈ ${fmt(foule * k / 10)} personnes équipées` : `${k}/10 · la foule n'est pas encore relevée : l'analyste fera le calcul`;
        })
      ], () => {
        const k = Math.min(10, num("surDix", 0));
        cur.data.mesure = { type: "echantillon", surDix: k, foule };
        const est = foule ? foule * k / 10 : null;
        go("confiance", `échantillon : ${k}/10`, { valeur: est, affichage: est != null ? `≈ ${fmt(est)} (${k}/10)` : `${k} sur 10` });
      });
    },
    scene(p) {
      return form("Mesurez la scène et comptez les enceintes.", "Interface : mesure. Estimez les dimensions en pas ou en mètres.", [
        h("div", { class: "row2" }, number("largeur", "Largeur de la scène (m)", cur.data.largeur), number("profondeur", "Profondeur (m)", cur.data.profondeur)),
        h("div", { class: "row2" }, stepper("enceintes", "Enceintes visibles", num("enceintes", 0)), stepper("tours", "Tours de relais sonores", num("tours", 0))),
        calc(() => { const s = num("largeur", 0) * num("profondeur", 0); return s ? `Surface ≈ ${fmt(s)} m² · classe ${classeScene(s)} (seuils à calibrer)` : "Renseignez les dimensions."; })
      ], () => {
        const l = num("largeur", 0), pr = num("profondeur", 0), s = l * pr;
        cur.data.mesure = { type: "scene", largeur: l, profondeur: pr, surface: s, enceintes: num("enceintes", 0), tours: num("tours", 0) };
        go("confiance", `scène ${l}×${pr} m`, { valeur: s, affichage: `${fmt(s)} m² · ${num("enceintes", 0)} enceintes · ${num("tours", 0)} tours` });
      }, () => num("largeur", 0) > 0 && num("profondeur", 0) > 0);
    },
    foule(p) {
      const part = cur.data.part || null, dens = cur.data.densite || null;
      return form("Décrivez le lieu occupé.", "Interface : mesure. Aucun effectif à deviner : le nombre est calculé.", [
        text("lieu", "Lieu précis", "ex. quai Roume, entre le pont et la gouvernance", cur.data.lieu || ""),
        h("div", { class: "row2" }, number("longueur", "Longueur (m)", cur.data.longueur), number("largeurF", "Largeur (m)", cur.data.largeurF)),
        seg("part", "Part occupée", PARTS.map((x) => `${x} %`), part),
        segRich("densite", "Densité", DENSITES, dens),
        seg("bande", "Contrôle : taille ressentie", ["Petite", "Moyenne", "Grande"], cur.data.bande || ""),
        calc(() => {
          const s = num("longueur", 0) * num("largeurF", 0), pc = parseInt(cur.data.part || "0", 10) / 100, d = Number(cur.data.densite || 0);
          return s && pc && d ? `${fmt(s)} m² × ${pc * 100} % × ${d} pers./m² ≈ ${fmt(s * pc * d)} personnes` : "Renseignez dimensions, part occupée et densité.";
        })
      ], () => {
        const s = num("longueur", 0) * num("largeurF", 0), pc = parseInt(cur.data.part, 10) / 100, d = Number(cur.data.densite);
        cur.data.mesure = { type: "foule", lieu: val("lieu"), longueur: num("longueur", 0), largeur: num("largeurF", 0), part: pc, densite: d, bande: cur.data.bande || null };
        go("confiance", `chaîne : ${fmt(s)} m² · ${pc * 100} % · ${d}/m²`, { valeur: s * pc * d, affichage: `≈ ${fmt(s * pc * d)} personnes` });
      }, () => num("longueur", 0) > 0 && num("largeurF", 0) > 0 && !!cur.data.part && !!cur.data.densite && !!cur.data.bande);
    }
  };
  const classeScene = (s) => (s < 20 ? "petite" : s < 60 ? "moyenne" : "grande");

  // ---------- Fin d'un poste ----------
  function finish(o) {
    const p = cur.poste, d = cur.data;
    if (o.crumb) cur.path.push(o.crumb);
    const partiel = !!d.partiel;
    const prov = o.prov || d.prov || "C";
    const conf = o.conf !== undefined ? o.conf : d.conf || null;
    const analyste = !!o.analyste || prov === "E" || partiel && conf === "peu";
    fiche[p.id] = {
      poste: p.id,
      libelle: p.label,
      valeur: o.valeur !== undefined ? o.valeur : d.valeur !== undefined ? d.valeur : null,
      affichage: (o.affichage || d.affichage || "") + (partiel && prov === "C" && o.valeur !== null ? " · vue partielle" : ""),
      provenance: prov,
      confiance: conf,
      vuePartielle: partiel,
      fileAnalyste: analyste,
      mesure: d.mesure || null,
      details: o.extra || null,
      chemin: cur.path.slice(),
      horodatage: new Date().toISOString()
    };
    save();
    const next = POSTES.find((x) => !fiche[x.id]);
    cur = { poste: p, node: "__done", path: cur.path, data: {}, history: [], next };
    render();
  }

  // ---------- Composants de formulaire ----------
  function ask(question, help, options) {
    return { question, help, body: h("div", { class: "choices" }, options.map(([t, s, fn]) => h("button", { class: "choice", type: "button", onclick: fn }, h("b", {}, t), h("small", {}, s)))) };
  }
  function form(question, help, fields, onSubmit, isValid) {
    const ok = h("button", { class: "btn", type: "button", onclick: () => { if (!isValid || isValid()) onSubmit(); } }, "Continuer");
    const refresh = () => { ok.disabled = isValid ? !isValid() : false; document.querySelectorAll("[data-calc]").forEach((c) => c._update && c._update()); };
    const body = h("div", { class: "fields", oninput: refresh, onclick: () => setTimeout(refresh) }, fields, h("div", {}, ok));
    setTimeout(refresh);
    return { question, help, body };
  }
  const val = (k) => (cur.data[k] ?? "").toString().trim();
  function num(k, d) { const n = Number(cur.data[k]); return Number.isFinite(n) && n >= 0 ? n : d; }
  function stepper(k, label, v, min = 0, max = 9999) {
    const input = h("input", { type: "number", inputmode: "numeric", min, max, value: v, id: `f-${k}`, oninput: (e) => { cur.data[k] = clamp(e.target.value, min, max); } });
    const set = (x) => { cur.data[k] = clamp(x, min, max); input.value = cur.data[k]; input.dispatchEvent(new Event("input", { bubbles: true })); };
    cur.data[k] = v;
    return h("label", { class: "field", for: `f-${k}` }, h("span", {}, label),
      h("div", { class: "stepper" },
        h("button", { type: "button", "aria-label": "moins un", onclick: () => set(num(k, 0) - 1) }, "−"),
        input,
        h("button", { type: "button", "aria-label": "plus un", onclick: () => set(num(k, 0) + 1) }, "+")));
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, Math.round(Number(x) || 0)));
  function number(k, label, v) {
    return h("label", { class: "field", for: `f-${k}` }, h("span", {}, label),
      h("input", { type: "number", inputmode: "decimal", min: 0, step: "0.5", id: `f-${k}`, value: v ?? "", oninput: (e) => { cur.data[k] = e.target.value === "" ? "" : Math.max(0, Number(e.target.value)); } }));
  }
  function text(k, label, ph, v) {
    return h("label", { class: "field", for: `f-${k}` }, h("span", {}, label),
      h("input", { type: "text", id: `f-${k}`, placeholder: ph, value: v, oninput: (e) => { cur.data[k] = e.target.value; } }));
  }
  function seg(k, label, opts, sel) {
    const box = h("div", { class: "seg", role: "group", "aria-label": label });
    opts.forEach((o) => box.append(h("button", { type: "button", "aria-pressed": String(sel === o), onclick: (e) => {
      cur.data[k] = o; box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
    } }, o)));
    return h("div", { class: "field" }, h("span", {}, label), box);
  }
  function segRich(k, label, opts, sel) {
    const box = h("div", { class: "choices", role: "group", "aria-label": label });
    opts.forEach((o) => box.append(h("button", { class: "choice", type: "button", "aria-pressed": String(Number(sel) === o.v),
      style: Number(sel) === o.v ? "border-color:var(--accent);background:var(--accent-soft)" : null,
      onclick: (e) => {
        cur.data[k] = o.v;
        box.querySelectorAll("button").forEach((b) => { const on = b === e.currentTarget; b.setAttribute("aria-pressed", String(on)); b.style.cssText = on ? "border-color:var(--accent);background:var(--accent-soft)" : ""; });
      } }, h("b", {}, o.label), h("small", {}, o.sub))));
    return h("div", { class: "field" }, h("span", {}, label), box);
  }
  function calc(fn) {
    const el = h("div", { class: "calc", "data-calc": "" });
    el._update = () => { el.textContent = fn(); };
    el._update();
    return el;
  }

  // ---------- Rendu ----------
  function render() { renderPostes(); renderStep(); renderSheet(); }

  function chipFor(r) {
    if (!r) return h("span", { class: "chip todo" }, "à faire");
    if (r.provenance === "N") return h("span", { class: "chip N" }, "inconnu");
    if (r.provenance === "E") return h("span", { class: "chip E" }, "rapporté");
    return h("span", { class: `chip ${r.fileAnalyste ? "A" : "C"}` }, r.fileAnalyste ? "à vérifier" : "fait");
  }

  function renderPostes() {
    const ul = $("#postes"); ul.innerHTML = "";
    POSTES.forEach((p) => {
      const r = fiche[p.id];
      ul.append(h("li", {}, h("button", { class: "poste", type: "button", "aria-current": String(!!cur && cur.poste.id === p.id), onclick: () => start(p) },
        h("span", { class: "name" }, p.label), h("span", { class: "hint" }, r ? r.affichage || PROV[r.provenance] : p.hint), h("span", { class: "state" }, chipFor(r)))));
    });
    $("#progress").textContent = `${Object.keys(fiche).length}/${POSTES.length}`;
  }

  function renderStep() {
    const box = $("#step"); box.innerHTML = "";
    if (!cur) {
      const next = POSTES.find((x) => !fiche[x.id]);
      box.append(
        h("span", { class: "qnum" }, "Mode d'emploi"),
        h("h1", { class: "question" }, "Répondez, le formulaire choisit la saisie."),
        h("p", { class: "help" }, "Pour chaque poste, quelques questions à deux ou trois réponses. Selon ce que vous voyez, le formulaire vous propose un comptage, une mesure ou vous demande qui vous a informé. Aucun prix n'est demandé."),
        h("div", { class: "nav" }, next ? h("button", { class: "btn", type: "button", onclick: () => start(next) }, `Commencer : ${next.label}`) : h("p", { class: "help" }, "Tous les postes sont renseignés. Relisez la fiche ci-dessous."))
      );
      return;
    }
    const p = cur.poste;
    if (cur.node === "__done") {
      const r = fiche[p.id];
      box.append(
        h("span", { class: "qnum" }, p.label),
        h("div", { class: "done" },
          h("span", { class: "big" }, r.affichage || PROV[r.provenance]),
          h("div", { class: "crumbs" }, h("span", {}, PROV[r.provenance]), r.confiance && h("span", {}, CONFIANCE.find((c) => c.v === r.confiance).label), r.fileAnalyste && h("span", {}, "envoyé à un analyste")),
          h("p", { class: "help" }, "Enregistré. Vous pouvez reprendre ce poste à tout moment depuis la liste.")),
        h("div", { class: "nav" },
          h("button", { class: "btn ghost", type: "button", onclick: () => start(p) }, "Refaire ce poste"),
          cur.next ? h("button", { class: "btn", type: "button", onclick: () => start(cur.next) }, `Poste suivant : ${cur.next.label}`) : h("button", { class: "btn", type: "button", onclick: () => { cur = null; render(); } }, "Terminer"))
      );
      return;
    }
    const step = NODES[cur.node](p);
    box.append(
      h("div", { class: "crumbs" }, h("span", {}, p.label), cur.path.map((c) => h("span", {}, c))),
      h("span", { class: "qnum" }, `Question ${cur.history.length + 1}`),
      h("h1", { class: "question" }, step.question),
      step.help && h("p", { class: "help" }, step.help),
      step.body,
      h("div", { class: "nav" }, h("button", { class: "btn ghost small", type: "button", onclick: back }, cur.history.length ? "← Question précédente" : "← Retour à la liste"))
    );
    const first = box.querySelector(".choice, input, .seg button");
    if (first && matchMedia("(pointer:fine)").matches) first.focus({ preventScroll: true });
  }

  function renderSheet() {
    const tb = $("#rows"); tb.innerHTML = "";
    const rows = POSTES.map((p) => fiche[p.id]).filter(Boolean);
    if (!rows.length) { tb.append(h("tr", { class: "empty" }, h("td", { colspan: 6 }, "Aucun poste renseigné pour l'instant."))); return; }
    rows.forEach((r) => tb.append(h("tr", {},
      h("td", {}, h("b", {}, r.libelle)),
      h("td", {}, h("span", { class: "num" }, r.affichage || "—")),
      h("td", {}, PROV[r.provenance]),
      h("td", {}, r.confiance ? CONFIANCE.find((c) => c.v === r.confiance).label : "—"),
      h("td", {}, r.fileAnalyste ? "File analyste" : "—"),
      h("td", { class: "path" }, r.chemin.join(" → ")))));
  }

  // ---------- Photo, export, remise à zéro ----------
  $("#photo").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const box = $("#photoBox"); box.innerHTML = ""; box.classList.add("has-img");
    const img = h("img", { src: URL.createObjectURL(f), alt: "Scène observée" });
    img.addEventListener("click", () => box.classList.toggle("zoom"));
    box.append(img);
  });
  $("#export").addEventListener("click", () => {
    const data = { exporte: new Date().toISOString(), postes: POSTES.map((p) => fiche[p.id] || { poste: p.id, libelle: p.label, statut: "non renseigné" }) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = h("a", { href: url, download: `fiche-observation-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let armed = false;
  $("#reset").addEventListener("click", (e) => {
    if (!armed) { armed = true; e.currentTarget.textContent = "Confirmer l'effacement"; setTimeout(() => { armed = false; $("#reset").textContent = "Tout effacer"; }, 4000); return; }
    armed = false; fiche = {}; save(); cur = null; e.currentTarget.textContent = "Tout effacer"; render();
  });

  render();
})();
