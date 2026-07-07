import { useCallback, useEffect, useMemo, useState } from "react";
import { normalize } from "@/search";
import { loadSuppliers } from "@/services/supplierService";
import type { Supplier } from "@/types/purchasing";

type SupplierSearchStatus = "loading" | "ready" | "error";

interface UseSupplierSearchResult {
  status: SupplierSearchStatus;
  error: string | null;
  query: string;
  setQuery: (value: string) => void;
  results: Supplier[];
  refresh: () => Promise<void>;
}

/**
 * A simple, separate substring search over active suppliers. This
 * intentionally does NOT use the frozen product search engine (fuzzy
 * matching, scoring, synonyms) — that engine is preserved unchanged for
 * products only, per spec. Supplier search reuses just `normalize()` for
 * consistent case/punctuation handling.
 */
export function useSupplierSearch(): UseSupplierSearchResult {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [status, setStatus] = useState<SupplierSearchStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setSuppliers(await loadSuppliers());
      setStatus("ready");
    } catch {
      setError("Failed to load suppliers.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const results = useMemo(() => {
    const clean = normalize(query);
    if (!clean) return [];
    return suppliers.filter((supplier) => normalize(supplier.name).includes(clean));
  }, [suppliers, query]);

  return { status, error, query, setQuery, results, refresh };
}
