// Régénère tout ce qui dépend de la configuration :
//   - kobo/xlsform/{survey,choices,settings}.csv   (source lisible du formulaire Kobo)
//   - kobo/<id>.xlsx                               (si Python 3 + openpyxl sont installés)
//   - manifest.webmanifest                         (nom, couleurs de l'instance)
// Usage : node scripts/generer.js [chemin/vers/protocole.json]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { valider, normaliser, t } from "../lib/protocole.js";
import { xlsform } from "../lib/formulaire.js";

const racine = new URL("..", import.meta.url).pathname;
const lire = (p) => JSON.parse(readFileSync(racine + p, "utf8"));
const instance = lire("config/instance.json");
const cheminProto = process.argv[2] || instance.protocole;
const brut = JSON.parse(readFileSync(cheminProto.startsWith("/") ? cheminProto : racine + cheminProto, "utf8"));

const erreurs = valider(brut);
if (erreurs.length) {
  console.error("Protocole invalide :\n - " + erreurs.join("\n - "));
  process.exit(1);
}
const proto = normaliser(brut);

// XLSForm en CSV
const csv = (rows) => rows.map((r) => r.map((c) => {
  const s = String(c ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(",")).join("\n") + "\n";
const { survey, choices, settings } = xlsform(proto);
mkdirSync(racine + "kobo/xlsform", { recursive: true });
writeFileSync(racine + "kobo/xlsform/survey.csv", csv(survey));
writeFileSync(racine + "kobo/xlsform/choices.csv", csv(choices));
writeFileSync(racine + "kobo/xlsform/settings.csv", csv(settings));
console.log(`XLSForm CSV : ${survey.length - 1} lignes, ${choices.length - 1} choix`);

// XLSX (facultatif)
const xlsx = `kobo/${proto.id}.xlsx`;
try {
  execFileSync("python3", [racine + "scripts/xlsx_depuis_csv.py", racine + "kobo/xlsform", racine + xlsx], { stdio: "pipe" });
  console.log(`XLSForm XLSX : ${xlsx}`);
} catch (e) {
  console.warn(`XLSX non généré (Python 3 et openpyxl requis). Les CSV de kobo/xlsform/ suffisent pour le relire.\n${e.stderr || e.message}`);
}

// Manifest PWA
const lang = instance.langue_defaut || "fr";
const manifest = {
  name: instance.nom,
  short_name: instance.nom_court || instance.nom,
  description: t(instance.description, lang),
  lang,
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: instance.couleur_fond,
  theme_color: instance.couleur,
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml" }
  ]
};
writeFileSync(racine + "manifest.webmanifest", JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest.webmanifest mis à jour");
