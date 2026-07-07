import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildSearchIndex, type IndexedProduct } from "@/search";
import { CatalogUnavailableError, loadCatalog, refreshCatalog } from "@/services/catalogService";
import type { CatalogProduct } from "@/types/catalog";

export type CatalogStatus = "loading" | "ready" | "error";

export interface RefreshOutcome {
  changed: boolean;
  count: number;
}

interface CatalogContextValue {
  status: CatalogStatus;
  error: string | null;
  products: CatalogProduct[];
  /** Precomputed once per catalog load, not per keystroke. */
  index: IndexedProduct<CatalogProduct>[];
  productsBySr: Map<string, CatalogProduct>;
  isFromCache: boolean;
  /** "Refresh Catalog" — the only other permitted Firestore read, user-triggered. */
  refresh: () => Promise<RefreshOutcome>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError(null);
      console.log("[Catalog] [Context] CatalogProvider mounting — starting initial load...");
      try {
        const result = await loadCatalog();
        if (cancelled) {
          console.log("[Catalog] [Context] Load resolved after unmount — ignoring result.");
          return;
        }
        setProducts(result.products);
        setIsFromCache(result.isFromCache);
        setStatus("ready");
        console.log(
          `[Catalog] [Context] Catalog state set to "ready" with ${result.products.length} products (fromCache: ${result.isFromCache}).`
        );
      } catch (err) {
        if (cancelled) return;
        console.error("[Catalog] [Context] Load failed — setting status to \"error\":", err);
        setError(
          err instanceof CatalogUnavailableError
            ? "The product catalog could not be loaded and no offline copy is available. Check your connection and try again."
            : "Failed to load the product catalog."
        );
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (): Promise<RefreshOutcome> => {
    const result = await refreshCatalog();
    setProducts(result.products);
    setIsFromCache(false);
    setStatus("ready");
    setError(null);
    return { changed: result.changed, count: result.products.length };
  }, []);

  const index = useMemo(() => {
    const built = buildSearchIndex(products);
    console.log(`[Catalog] [Search Index] Built search index for ${built.length} products.`);
    return built;
  }, [products]);

  const productsBySr = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const product of products) {
      map.set(product.sr, product);
    }
    return map;
  }, [products]);

  const value = useMemo<CatalogContextValue>(
    () => ({ status, error, products, index, productsBySr, isFromCache, refresh }),
    [status, error, products, index, productsBySr, isFromCache, refresh]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within a CatalogProvider.");
  }
  return ctx;
}
