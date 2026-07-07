import { useCallback, useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { loadCurrentPricesForSupplier } from "@/services/priceService";
import type { CatalogProduct } from "@/types/catalog";
import type { CurrentPrice } from "@/types/purchasing";

type Status = "loading" | "ready" | "error";

export interface SupplierProductEntry {
  product: CatalogProduct;
  price: CurrentPrice;
}

interface UseSupplierProductsResult {
  status: Status;
  error: string | null;
  entries: SupplierProductEntry[];
  refresh: () => Promise<void>;
}

export function useSupplierProducts(supplierId: string | undefined): UseSupplierProductsResult {
  const { productsBySr } = useCatalog();
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supplierId) return;
    setStatus("loading");
    setError(null);
    try {
      setPrices(await loadCurrentPricesForSupplier(supplierId));
      setStatus("ready");
    } catch {
      setError("Failed to load this supplier's products.");
      setStatus("error");
    }
  }, [supplierId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const entries = useMemo(() => {
    const resolved: SupplierProductEntry[] = [];
    for (const price of prices) {
      const product = productsBySr.get(price.productSr);
      if (product) {
        resolved.push({ product, price });
      }
    }
    resolved.sort((a, b) => a.product.productName.localeCompare(b.product.productName));
    return resolved;
  }, [prices, productsBySr]);

  return { status, error, entries, refresh };
}
