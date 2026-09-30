// Stockage local (IndexedDB) : observations et réglages. Repli en mémoire si IndexedDB est indisponible
// (navigation privée stricte) ; l'app reste utilisable, mais rien ne survit au rechargement.

const DB = "collecte-guidee", VERSION = 1;
let dbPromise = null;
const memoire = { observations: new Map(), reglages: new Map() };

function ouvrir() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("observations")) db.createObjectStore("observations", { keyPath: "id" });
        if (!db.objectStoreNames.contains("reglages")) db.createObjectStore("reglages", { keyPath: "k" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await ouvrir();
  if (!db) return fn(null, memoire[store]);
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let res;
    Promise.resolve(fn(s, null)).then((r) => { res = r; });
    t.oncomplete = () => resolve(res);
    t.onerror = () => reject(t.error);
  });
}
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

export const observations = {
  lister: () => tx("observations", "readonly", (s, m) => (m ? [...m.values()] : req(s.getAll()))),
  lire: (id) => tx("observations", "readonly", (s, m) => (m ? m.get(id) : req(s.get(id)))),
  ecrire: (obs) => tx("observations", "readwrite", (s, m) => { obs.maj = new Date().toISOString(); if (m) m.set(obs.id, structuredClone(obs)); else s.put(obs); return obs; }),
  supprimer: (id) => tx("observations", "readwrite", (s, m) => (m ? m.delete(id) : s.delete(id)))
};

export const reglages = {
  lire: async (k, defaut = null) => {
    const r = await tx("reglages", "readonly", (s, m) => (m ? m.get(k) : req(s.get(k))));
    return r === undefined || r === null ? defaut : m_val(r);
  },
  ecrire: (k, v) => tx("reglages", "readwrite", (s, m) => (m ? m.set(k, { k, v }) : s.put({ k, v })))
};
const m_val = (r) => (r && typeof r === "object" && "v" in r ? r.v : r);

export const persistant = async () => {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
};
