// Cœur du proxy, indépendant de l'hébergeur : prend une Request, renvoie une Response.
// Utilisable tel quel dans une fonction Netlify, un Cloudflare Worker ou un serveur Node 18+.

import { finaliserXml } from "./openrosa.js";

const TAILLE_MAX = 256 * 1024;
const json = (status, corps) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function traiterEnvoi(req, env, fetchFn = fetch) {
  if (req.method === "GET") {
    return json(200, { ok: true, service: "collecte-guidee", configure: Boolean(env("KOBO_SUBMISSION_URL") && env("KOBO_FORM_ID") && (env("KOBO_TOKEN") || env("KOBO_USERNAME"))) });
  }
  if (req.method !== "POST") return json(405, { ok: false, erreur: "methode" });

  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return json(413, { ok: false, erreur: "taille" });
  let corps;
  try { corps = JSON.parse(brut); } catch { return json(400, { ok: false, erreur: "json" }); }
  const { code, instanceID, xml } = corps || {};

  const codes = String(env("COLLECT_CODES") || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (!code || !codes.includes(String(code).trim())) return json(401, { ok: false, erreur: "code" });
  if (typeof xml !== "string" || !/^uuid:[0-9a-f-]{36}$/i.test(instanceID || "") || !xml.includes(`<instanceID>${instanceID}</instanceID>`)) {
    return json(400, { ok: false, erreur: "soumission" });
  }
  if (!xml.includes(`<code_collecteur>${String(code).trim()}</code_collecteur>`)) return json(400, { ok: false, erreur: "code_incoherent" });

  const url = env("KOBO_SUBMISSION_URL"), formId = env("KOBO_FORM_ID");
  if (!url || !formId) return json(500, { ok: false, erreur: "configuration" });
  let final;
  try { final = finaliserXml(xml, formId, env("KOBO_FORM_VERSION"), env("KOBO_ROOT_TAG") || formId); } catch { return json(400, { ok: false, erreur: "xml" }); }

  const headers = { "X-OpenRosa-Version": "1.0" };
  if (env("KOBO_TOKEN")) headers.Authorization = `Token ${env("KOBO_TOKEN")}`;
  else if (env("KOBO_USERNAME")) headers.Authorization = `Basic ${btoa(`${env("KOBO_USERNAME")}:${env("KOBO_PASSWORD") || ""}`)}`;
  const form = new FormData();
  form.append("xml_submission_file", new Blob([final], { type: "text/xml" }), "submission.xml");

  let rep;
  try { rep = await fetchFn(url, { method: "POST", headers, body: form }); }
  catch { return json(502, { ok: false, erreur: "kobo_injoignable" }); }

  // 201 : créée · 202 : déjà reçue (doublon d'instanceID), traitée comme un succès.
  if (rep.status === 201 || rep.status === 202) return json(200, { ok: true, statut: rep.status });
  if (rep.status === 401 || rep.status === 403) return json(502, { ok: false, erreur: "kobo_authentification" });
  return json(502, { ok: false, erreur: `kobo_${rep.status}` });
}
