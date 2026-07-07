import { useState } from "react";
import { Link } from "react-router-dom";
import { SearchBar } from "@/components/SearchBar";
import { MaterialFilterChips } from "@/components/MaterialFilterChips";
import { SuggestionList } from "@/components/SuggestionList";
import { SupplierSearchBar } from "@/components/SupplierSearchBar";
import { SupplierResultList } from "@/components/SupplierResultList";
import { SupplierProductList } from "@/components/SupplierProductList";
import { PriceHistorySheet } from "@/components/PriceHistorySheet";
import { useCatalog } from "@/context/CatalogContext";
import { useSearch } from "@/hooks/useSearch";
import { useSupplierSearch } from "@/hooks/useSupplierSearch";
import { useSupplierProducts, type SupplierProductEntry } from "@/hooks/useSupplierProducts";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import type { Supplier } from "@/types/purchasing";

type HomeTab = "products" | "suppliers";

export function SearchPage() {
  const [tab, setTab] = useState<HomeTab>("products");
  const catalog = useCatalog();
  const search = useSearch(catalog.index);

  const supplierSearch = useSupplierSearch();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const supplierProducts = useSupplierProducts(selectedSupplier?.id);
  const history = usePriceHistory();
  const [historyEntry, setHistoryEntry] = useState<SupplierProductEntry | null>(null);

  function switchTab(next: HomeTab) {
    setTab(next);
  }

  function selectSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
  }

  function backToSupplierResults() {
    setSelectedSupplier(null);
  }

  function openProductHistory(entry: SupplierProductEntry) {
    if (!selectedSupplier) return;
    setHistoryEntry(entry);
    void history.load(entry.product.sr, selectedSupplier.id);
  }

  function closeProductHistory() {
    setHistoryEntry(null);
    history.reset();
  }

  return (
    <div className="relative min-h-screen bg-white px-4 py-10 sm:py-16">
      <Link
        to="/settings"
        aria-label="Settings"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 sm:right-6 sm:top-6"
      >
        ⚙
      </Link>

      <div className="mx-auto w-full max-w-xl">
        <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight text-neutral-900">
          Purchase Price Finder
        </h1>

        <div className="mb-6 flex gap-2 rounded-xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => switchTab("products")}
            className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold transition ${
              tab === "products"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Search Products
          </button>
          <button
            type="button"
            onClick={() => switchTab("suppliers")}
            className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold transition ${
              tab === "suppliers"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Search Suppliers
          </button>
        </div>

        {tab === "products" && (
          <>
            <SearchBar value={search.query} onChange={search.setQuery} onClear={search.clear} />

            <MaterialFilterChips
              visible={search.isMaterialFilterVisible}
              activeMaterial={search.materialFilter}
              onToggle={search.toggleMaterialFilter}
            />

            {catalog.status === "loading" && (
              <p className="mt-6 text-center text-sm text-neutral-400">Loading products…</p>
            )}

            {catalog.status === "error" && (
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-brand-red">{catalog.error}</p>
              </div>
            )}

            {catalog.status === "ready" && (
              <>
                {catalog.isFromCache && (
                  <p className="mt-3 text-center text-xs font-medium text-brand-yellow-dark">
                    Showing the last downloaded catalog — offline.
                  </p>
                )}
                <SuggestionList results={search.results} hasQuery={search.query.trim().length > 0} />
              </>
            )}
          </>
        )}

        {tab === "suppliers" && !selectedSupplier && (
          <>
            <SupplierSearchBar
              value={supplierSearch.query}
              onChange={supplierSearch.setQuery}
              onClear={() => supplierSearch.setQuery("")}
            />

            {supplierSearch.status === "error" && (
              <p className="mt-6 text-center text-sm font-medium text-brand-red">
                {supplierSearch.error}
              </p>
            )}

            <SupplierResultList
              results={supplierSearch.results}
              hasQuery={supplierSearch.query.trim().length > 0}
              onSelect={selectSupplier}
            />
          </>
        )}

        {tab === "suppliers" && selectedSupplier && (
          <SupplierProductList
            supplier={selectedSupplier}
            status={supplierProducts.status}
            error={supplierProducts.error}
            entries={supplierProducts.entries}
            onBack={backToSupplierResults}
            onSelectProduct={openProductHistory}
          />
        )}
      </div>

      {historyEntry && selectedSupplier && (
        <PriceHistorySheet
          supplier={selectedSupplier}
          status={history.status}
          error={history.error}
          entries={history.entries}
          onClose={closeProductHistory}
          onRetry={() => void history.load(historyEntry.product.sr, selectedSupplier.id)}
        />
      )}
    </div>
  );
}
