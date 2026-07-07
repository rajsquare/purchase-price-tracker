import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "@/utils/debounce";
import { SEARCH_DEBOUNCE_MS, searchProducts, type IndexedProduct } from "@/search";
import type { CatalogProduct } from "@/types/catalog";

interface UseSearchResult {
  query: string;
  setQuery: (value: string) => void;
  clear: () => void;
  results: CatalogProduct[];
  materialFilter: string | null;
  toggleMaterialFilter: (material: string) => void;
  /** Chips are hidden until the user starts typing, exactly like the reference app. */
  isMaterialFilterVisible: boolean;
}

export function useSearch(index: IndexedProduct<CatalogProduct>[]): UseSearchResult {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);

  // Kept in a ref so the debounced callback always reads the latest index
  // without needing to be re-created (and thus re-debounced) every time
  // the product list reference changes identity for unrelated reasons.
  const indexRef = useRef(index);
  indexRef.current = index;

  const debouncedSearch = useMemo(
    () =>
      debounce((rawQuery: string, filter: string | null) => {
        setResults(searchProducts({ query: rawQuery, products: indexRef.current, materialFilter: filter }));
      }, SEARCH_DEBOUNCE_MS),
    []
  );

  useEffect(() => debouncedSearch.cancel, [debouncedSearch]);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);

      if (!value.trim()) {
        // Matches the reference behavior: clearing the box cancels any
        // pending debounced search and wipes results immediately, with
        // no delay.
        debouncedSearch.cancel();
        setResults([]);
        return;
      }

      debouncedSearch(value, materialFilter);
    },
    [debouncedSearch, materialFilter]
  );

  const clear = useCallback(() => {
    debouncedSearch.cancel();
    setQueryState("");
    setResults([]);
  }, [debouncedSearch]);

  const toggleMaterialFilter = useCallback(
    (material: string) => {
      setMaterialFilter((current) => {
        const next = current === material ? null : material;

        // Toggling the filter re-runs search immediately against the
        // *existing* query text, with no debounce — the query itself is
        // never touched, matching the reference behavior exactly.
        if (query.trim()) {
          setResults(searchProducts({ query, products: indexRef.current, materialFilter: next }));
        }

        return next;
      });
    },
    [query]
  );

  const isMaterialFilterVisible = query.trim().length > 0;

  return {
    query,
    setQuery,
    clear,
    results,
    materialFilter,
    toggleMaterialFilter,
    isMaterialFilterVisible,
  };
}
