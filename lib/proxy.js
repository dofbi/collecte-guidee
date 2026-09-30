// Cœur du proxy, indépendant de l'hébergeur : prend une Request, renvoie une Response.
// Utilisable tel quel dans une fonction Netlify, un Cloudflare Worker ou un serveur Node 18+.

import { finaliserXml } from "./openrosa.js";

const TAILLE_MAX = 256 * 1024;
const json = (status, corps) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// En-têtes d'authentification possibles, dans l'ordre d'essai : jeton d'API, puis identifiant et mot de passe.
function authentifications(env) {
  const out = [];
  if (env("KOBO_TOKEN")) out.push({ mode: "token", valeur: `Token ${env("KOBO_TOKEN")}` });
  if (env("KOBO_USERNAME")) out.push({ mode: "basic", valeur: `Basic ${btoa(`${env("KOBO_USERNAME")}:${env("KOBO_PASSWORD") || ""}`)}` });
  return out;
}

// Message lisible renvoyé par Kobo (réponse OpenRosa en XML, ou texte), sans jamais renvoyer de secret.
async function detail(rep) {
  const txt = await rep.text().catch(() => "");
  const msg = txt.match(/<message[^>]*>([\s\S]*?)<\/message>/i)?.[1] ?? txt;
  return msg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

// Codes autorisés : séparés par des virgules, espaces et guillemets éventuels retirés.
const listeCodes = (env) => String(env("COLLECT_CODES") || "").split(",").map((c) => c.trim().replace(/^["']|["']$/g, "").trim()).filter(Boolean);

function manquantes(env) {
  const m = ["KOBO_SUBMISSION_URL", "KOBO_FORM_ID", "COLLECT_CODES"].filter((k) => !env(k));
  if (!env("KOBO_TOKEN") && !env("KOBO_USERNAME")) m.push("KOBO_TOKEN ou KOBO_USERNAME");
  return m;
}

// GET : état de la configuration. GET ?verifier=1 : teste en plus l'accès à Kobo (requête HEAD OpenRosa).
async function diagnostic(req, env, fetchFn) {
  const m = manquantes(env);
  const corps = { ok: !m.length, service: "collecte-guidee", configure: !m.length, variables_manquantes: m, nombre_codes_collecteurs: listeCodes(env).length };
  if (new URL(req.url).searchParams.get("verifier") && !m.length) {
    corps.kobo = [];
    for (const a of authentifications(env)) {
      try {
        const rep = await fetchFn(env("KOBO_SUBMISSION_URL"), { method: "HEAD", headers: { "X-OpenRosa-Version": "1.0", Authorization: a.valeur } });
        corps.kobo.push({ authentification: a.mode, statut: rep.status, accepte: rep.status >= 200 && rep.status < 300 });
      } catch {
        corps.kobo.push({ authentification: a.mode, statut: null, accepte: false, erreur: "kobo_injoignable" });
      }
    }
    corps.ok = corps.kobo.some((k) => k.accepte);
  }
  return json(200, corps);
}

export async function traiterEnvoi(req, env, fetchFn = fetch) {
  if (req.method === "GET") return diagnostic(req, env, fetchFn);
  if (req.method !== "POST") return json(405, { ok: false, erreur: "methode" });

  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return json(413, { ok: false, erreur: "taille" });
  let corps;
  try { corps = JSON.parse(brut); } catch { return json(400, { ok: false, erreur: "json" }); }
  const { code, instanceID, xml } = corps || {};

  const codes = listeCodes(env);
  // Liste vide : c'est la configuration du serveur qui manque, pas le code de l'observateur.
  if (!codes.length) return json(500, { ok: false, erreur: "configuration", detail: "COLLECT_CODES vide ou invisible pour la fonction (redéployer après avoir ajouté la variable)" });
  if (!code || !codes.includes(String(code).trim())) return json(401, { ok: false, erreur: "code" });
  if (typeof xml !== "string" || !/^uuid:[0-9a-f-]{36}$/i.test(instanceID || "") || !xml.includes(`<instanceID>${instanceID}</instanceID>`)) {
    return json(400, { ok: false, erreur: "soumission" });
  }
  if (!xml.includes(`<code_collecteur>${String(code).trim()}</code_collecteur>`)) return json(400, { ok: false, erreur: "code_incoherent" });

  const m = manquantes(env);
  if (m.length) return json(500, { ok: false, erreur: "configuration", detail: `Variables manquantes : ${m.join(", ")}` });
  let final;
  try { final = finaliserXml(xml, env("KOBO_FORM_ID"), env("KOBO_FORM_VERSION"), env("KOBO_ROOT_TAG") || env("KOBO_FORM_ID")); }
  catch (e) { return json(400, { ok: false, erreur: "xml", detail: e.message }); }

  // Essaie chaque authentification configurée ; passe à la suivante seulement si Kobo refuse l'accès.
  let rep;
  for (const a of authentifications(env)) {
    const form = new FormData();
    form.append("xml_submission_file", new Blob([final], { type: "text/xml" }), "submission.xml");
    try { rep = await fetchFn(env("KOBO_SUBMISSION_URL"), { method: "POST", headers: { "X-OpenRosa-Version": "1.0", Authorization: a.valeur }, body: form }); }
    catch { return json(502, { ok: false, erreur: "kobo_injoignable" }); }
    if (rep.status !== 401 && rep.status !== 403) break;
  }

  // 201 : créée · 202 : déjà reçue (doublon d'instanceID), traitée comme un succès.
  if (rep.status === 201 || rep.status === 202) return json(200, { ok: true, statut: rep.status });
  const erreur = rep.status === 401 || rep.status === 403 ? "kobo_authentification" : `kobo_${rep.status}`;
  return json(502, { ok: false, erreur, detail: await detail(rep) });
}
