/**
 * Penyimpanan IndexedDB sederhana (key-value) untuk data besar yang tidak muat di localStorage (±5 MB),
 * mis. salinan cadangan lokal. Tidak pernah melempar galat: bila IndexedDB tidak tersedia
 * (mode privat, diblokir, dsb.) fungsi mengembalikan null/false sehingga pemanggil bisa fallback.
 */
const DB_NAME = 'absensi_qr_nesemba_db';
const STORE = 'kv';

function bukaDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await bukaDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => { db.close(); resolve((req.result as T) ?? null); };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      try { db.close(); } catch { /* abaikan */ }
      resolve(null);
    }
  });
}

/** true bila benar-benar tersimpan. */
export async function idbSet(key: string, value: unknown): Promise<boolean> {
  const db = await bukaDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    } catch {
      try { db.close(); } catch { /* abaikan */ }
      resolve(false);
    }
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await bukaDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); resolve(); };
    } catch {
      try { db.close(); } catch { /* abaikan */ }
      resolve();
    }
  });
}
