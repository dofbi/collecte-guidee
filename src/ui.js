// Petits composants d'interface, sans dépendance.

export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k);
  return e;
}

// Gros bouton de choix (titre + précision).
export const choix = (titre, sous, onclick, attrs = {}) =>
  h("button", { class: "choice", type: "button", onclick, ...attrs }, h("b", {}, titre), sous ? h("small", {}, sous) : null);

// Compteur − n + ; `onchange(n)` à chaque modification.
export function compteur({ id, label, valeur = 0, max = null, invalide = false, onchange }) {
  const input = h("input", { type: "number", inputmode: "numeric", min: 0, max: max ?? undefined, id, value: valeur, "aria-invalid": invalide ? "true" : null });
  const borne = (x) => Math.max(0, Math.min(max ?? Infinity, Math.round(Number(x) || 0)));
  const set = (x) => { const v = borne(x); input.value = v; onchange(v); };
  input.addEventListener("input", () => onchange(input.value === "" ? "" : borne(input.value)));
  return h("div", { class: "field" + (invalide ? " invalid" : "") },
    h("label", { for: id }, label),
    h("div", { class: "stepper" },
      h("button", { type: "button", "aria-label": `− ${label}`, onclick: () => set(Number(input.value || 0) - 1) }, "−"),
      input,
      h("button", { type: "button", "aria-label": `+ ${label}`, onclick: () => set(Number(input.value || 0) + 1) }, "+")));
}

// Groupe de boutons à sélection unique.
export function segment({ label, options, valeur, invalide = false, onchange }) {
  const box = h("div", { class: "seg", role: "radiogroup", "aria-label": label });
  options.forEach(({ v, texte }) => {
    const b = h("button", { type: "button", role: "radio", "aria-checked": String(String(valeur) === String(v)), onclick: () => {
      box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      onchange(v);
    } }, texte);
    box.append(b);
  });
  return h("div", { class: "field" + (invalide ? " invalid" : "") }, h("span", { class: "flabel" }, label), box);
}

export function texte({ id, label, valeur = "", invalide = false, onchange }) {
  return h("div", { class: "field" + (invalide ? " invalid" : "") },
    h("label", { for: id }, label),
    h("input", { type: "text", id, value: valeur, autocomplete: "off", oninput: (e) => onchange(e.target.value) }));
}

// Bouton en deux temps pour les actions destructives (les boîtes de dialogue natives sont évitées).
export function boutonConfirme(libelle, libelleConfirm, action, cls = "btn danger ghost") {
  let arme = false, timer;
  const b = h("button", { class: cls, type: "button", onclick: () => {
    if (!arme) { arme = true; b.textContent = libelleConfirm; timer = setTimeout(() => { arme = false; b.textContent = libelle; }, 4000); return; }
    clearTimeout(timer); action();
  } }, libelle);
  return b;
}
