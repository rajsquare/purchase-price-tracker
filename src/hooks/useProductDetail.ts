import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/context/CatalogContext";
import { loadCurrentPricesForProduct } from "@/services/priceService";
import { loadSuppliers } from "@/services/supplierService";
import type { CatalogProduct } from "@/types/catalog";
import type { CurrentPrice, Supplier } from "@/types/purchasing";
import { calculateMargin, findLowestPurchasePrice } from "@/utils/margins";

type ProductDetailStatus = "loading" | "ready" | "error" | "not-found";

export interface SupplierPriceEntry {
  supplier: Supplier;
  price: CurrentPrice;
}

interface UseProductDetailResult {
  status: ProductDetailStatus;
  error: string | null;
  product: CatalogProduct | null;
  /** Suppliers that have a price on file for this product, sorted lowest price first. */
  supplierPrices: SupplierPriceEntry[];
  /** Active suppliers with NO price on file yet for this product — used only to add a first price. */
  unpricedSuppliers: Supplier[];
  lowestPurchasePrice: number | null;
  wholesaleMargin: number | null;
  retailMargin: number | null;
  refresh: () => Promise<void>;
}

export function useProductDetail(sr: string | undefined): UseProductDetailResult {
  const { status: catalogStatus, productsBySr } = useCatalog();
  const [status, setStatus] = useState<ProductDetailStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prices, setPrices] = useState<CurrentPrice[]>([]);

  /**
   * Guards against out-of-order responses. `refresh()` runs automatically on
   * mount AND is called again explicitly right after saving a price. If the
   * mount call is still in flight when the post-save call resolves first
   * (easy to hit by opening "Add Price" quickly, or in dev under
   * React.StrictMode, which double-invokes the mount effect), the slower
   * call's stale (pre-save) result would otherwise land *after* the fresh
   * one and silently overwrite it back to an empty price list. Each
   * refresh() call is stamped with an id here; a call only applies its
   * result if it is still the most recently started one by the time it
   * resolves.
   */
  const latestRequestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!sr) {
      setStatus("not-found");
      return;
    }

    const requestId = ++latestRequestId.current;

    setStatus("loading");
    setError(null);

    try {
      const [loadedSuppliers, loadedPrices] = await Promise.all([
        loadSuppliers(),
        loadCurrentPricesForProduct(sr),
      ]);

      if (latestRequestId.current !== requestId) {
        // A newer refresh() has started since this one began — its result
        // will supersede ours, so applying this stale result would only
        // clobber fresher data (e.g. a price just saved).
        return;
      }

      setSuppliers(loadedSuppliers);
      setPrices(loadedPrices);
      setStatus("ready");
    } catch {
      if (latestRequestId.current !== requestId) return;
      setError("Failed to load product prices.");
      setStatus("error");
    }
  }, [sr]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const product = sr ? productsBySr.get(sr) ?? null : null;

  const supplierPrices = useMemo<SupplierPriceEntry[]>(() => {
    const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

    // Suppliers with no price recorded yet for this product are hidden
    // entirely — Product Detail is always sorted by current price, so
    // there's no meaningful position for a supplier without one.
    const entries: SupplierPriceEntry[] = [];
    for (const price of prices) {
      const supplier = suppliersById.get(price.supplierId);
      if (supplier) {
        entries.push({ supplier, price });
      }
    }

    entries.sort((a, b) => a.price.price - b.price.price);
    return entries;
  }, [suppliers, prices]);

  const unpricedSuppliers = useMemo(() => {
    const pricedSupplierIds = new Set(prices.map((p) => p.supplierId));
    return suppliers.filter((supplier) => !pricedSupplierIds.has(supplier.id));
  }, [suppliers, prices]);

  const lowestPurchasePrice = useMemo(
    () => findLowestPurchasePrice(prices.map((p) => ({ price: p.price }))),
    [prices]
  );

  const wholesaleMargin = product ? calculateMargin(product.wPrice, lowestPurchasePrice) : null;
  const retailMargin = product ? calculateMargin(product.rPrice, lowestPurchasePrice) : null;

  const overallStatus: ProductDetailStatus =
    catalogStatus === "error"
      ? "error"
      : catalogStatus === "loading"
        ? "loading"
        : !sr
          ? "not-found"
          : status === "ready" && !product
            ? "not-found"
            : status;

  return {
    status: overallStatus,
    error,
    product,
    supplierPrices,
    unpricedSuppliers,
    lowestPurchasePrice,
    wholesaleMargin,
    retailMargin,
    refresh,
  };
}
