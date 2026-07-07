import type { CatalogProduct } from "@/types/catalog";

/**
 * Minimal, dependency-free IndexedDB persistence for the cached catalog.
 *
 * There is exactly one record ever stored (key `"current"`), matching the
 * single-document nature of `catalog/current` in the Price List project.
 * This is purely a local cache — if it's ever unreadable or unwritable
 * (private browsing, quota, unsupported browser) callers treat that as a
 * cache miss rather than a hard failure, the same way the rest of this
 * codebase already treats `localStorage` as best-effort.
 */
const DB_NAME = "purchasePriceApp";
const DB_VERSION = 1;
const STORE_NAME = "catalog";
const RECORD_KEY = "current";

export interface CachedCatalog {
  products: CatalogProduct[];
  fetchedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function readCachedCatalog(): Promise<CachedCatalog | null> {
  try {
    const db = await openDb();
    return await new Promise<CachedCatalog | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(RECORD_KEY);

      request.onsuccess = () => {
        const value = request.result as CachedCatalog | undefined;
        resolve(value ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to read catalog cache."));
    }).finally(() => db.close());
  } catch {
    return null;
  }
}

export async function writeCachedCatalog(cache: CachedCatalog): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(cache, RECORD_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to write catalog cache."));
    }).finally(() => db.close());
  } catch {
    // Caching is an optimization, not a correctness requirement — silently
    // skip on failure, matching the rest of the codebase's cache handling.
  }
}
