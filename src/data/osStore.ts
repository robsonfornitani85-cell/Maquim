import { OrdemServico } from '../types';

/**
 * Armazenamento durável das Ordens de Serviço no próprio aparelho (IndexedDB).
 *
 * Por que não localStorage: o localStorage tem limite de ~5 MB e cada OS carrega
 * fotos e assinatura em base64. Depois de algumas OSs o salvamento falhava em
 * silêncio. O IndexedDB guarda centenas de MB, funciona sem internet e
 * sobrevive ao fechamento do navegador. Os PDFs são gerados a partir destes
 * dados, então qualquer OS salva aqui pode ter o PDF refeito a qualquer momento.
 */

const DB_NAME = 'maquim_campo';
const DB_VERSION = 1;
const STORE = 'ordens';
const LEGACY_LS_KEY = 'maquim_ordens_servico_v6_lorena';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/** Migra (uma única vez) as OSs antigas que estavam no localStorage. */
async function migrateLegacy(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_LS_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const legacy = JSON.parse(raw) as OrdemServico[];
    if (Array.isArray(legacy) && legacy.length) {
      await tx('readwrite', (store) => {
        legacy.forEach((os) => os && os.id && store.put(os));
      });
    }
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch (e) {
    console.error('Falha ao migrar OSs antigas:', e);
  }
}

let migrated = false;

export async function loadOrdens(): Promise<OrdemServico[]> {
  if (!migrated) {
    migrated = true;
    await migrateLegacy();
  }
  const all = (await tx<OrdemServico[]>('readonly', (store) => store.getAll())) || [];
  return all.sort((a, b) => (b.dataRegistro || '').localeCompare(a.dataRegistro || ''));
}

export async function putOrdem(os: OrdemServico): Promise<void> {
  await tx('readwrite', (store) => store.put(os));
}

export async function deleteOrdensWhere(pred: (os: OrdemServico) => boolean): Promise<void> {
  const all = await loadOrdens();
  const toDelete = all.filter(pred);
  if (!toDelete.length) return;
  await tx('readwrite', (store) => {
    toDelete.forEach((os) => store.delete(os.id));
  });
}

/**
 * Pede ao navegador para não apagar os dados deste site quando o aparelho
 * estiver com pouco espaço. Retorna true se o armazenamento ficou persistente.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // ignora
  }
  return false;
}
