import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AddSupplierPricePicker } from "@/components/AddSupplierPricePicker";
import { PriceEditSheet } from "@/components/PriceEditSheet";
import { PriceHistorySheet } from "@/components/PriceHistorySheet";
import { SupplierPriceRow } from "@/components/SupplierPriceRow";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useProductDetail } from "@/hooks/useProductDetail";
import { saveCurrentPrice } from "@/services/priceService";
import type { Supplier } from "@/types/purchasing";
import { formatPrice } from "@/utils/format";

type SaveStatus = "idle" | "saving" | "error";

export function ProductDetailPage() {
  const { sr } = useParams();
  const {
    status,
    error,
    product,
    supplierPrices,
    unpricedSuppliers,
    lowestPurchasePrice,
    wholesaleMargin,
    retailMargin,
    refresh,
  } = useProductDetail(sr);
  const history = usePriceHistory();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPickingSupplier, setIsPickingSupplier] = useState(false);

  const editingPrice = editingSupplier
    ? supplierPrices.find((entry) => entry.supplier.id === editingSupplier.id)?.price
    : undefined;

  async function handleSavePrice(price: number, remarks: string) {
    if (!sr || !editingSupplier) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await saveCurrentPrice({
        productSr: sr,
        supplierId: editingSupplier.id,
        price,
        currency: "INR",
        remarks,
      });
      await refresh();
      setSaveStatus("idle");
      setEditingSupplier(null);
    } catch {
      setSaveStatus("error");
      setSaveError("Price was not saved. Check the connection and try again.");
    }
  }

  function openHistory(supplier: Supplier) {
    if (!sr) return;
    setHistorySupplier(supplier);
    void history.load(sr, supplier.id);
  }

  function closeHistory() {
    setHistorySupplier(null);
    history.reset();
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
          >
            ‹ Search
          </Link>
          <Link
            to="/settings"
            className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
          >
            Settings
          </Link>
        </div>

        {status === "loading" && (
          <p className="mt-16 text-center text-sm text-neutral-500">Loading prices…</p>
        )}

        {status === "error" && (
          <div className="mt-16 text-center">
            <p className="text-brand-red">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
            >
              Retry
            </button>
          </div>
        )}

        {status === "not-found" && (
          <p className="mt-16 text-center text-sm text-neutral-500">Product not found.</p>
        )}

        {status === "ready" && product && (
          <>
            <header className="mb-6">
              {product.material && (
                <span className="inline-flex rounded-full bg-brand-yellow/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-yellow-dark">
                  {product.material}
                </span>
              )}
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                {product.productName}
              </h1>
            </header>

            <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
              <p className="text-sm font-medium text-neutral-500">Lowest Purchase Price</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-neutral-900">
                {formatPrice(lowestPurchasePrice ?? undefined)}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Wholesale Price
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    {formatPrice(product.wPrice)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Margin{" "}
                    <span className="font-medium text-neutral-700">
                      {wholesaleMargin !== null ? formatPrice(wholesaleMargin) : "—"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Retail Price
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    {formatPrice(product.rPrice)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Margin{" "}
                    <span className="font-medium text-neutral-700">
                      {retailMargin !== null ? formatPrice(retailMargin) : "—"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Supplier Prices
              </h2>
              <button
                type="button"
                onClick={() => setIsPickingSupplier(true)}
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
              >
                + Add Price
              </button>
            </div>

            {supplierPrices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-6 text-center text-sm text-neutral-500">
                No supplier prices on file yet. Tap "Add Price" to enter the first one.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
                {supplierPrices.map(({ supplier, price }) => (
                  <SupplierPriceRow
                    key={supplier.id}
                    supplier={supplier}
                    price={price}
                    onEdit={() => {
                      setSaveStatus("idle");
                      setSaveError(null);
                      setEditingSupplier(supplier);
                    }}
                    onHistory={() => openHistory(supplier)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {isPickingSupplier && (
        <AddSupplierPricePicker
          suppliers={unpricedSuppliers}
          onClose={() => setIsPickingSupplier(false)}
          onSelect={(supplier) => {
            setIsPickingSupplier(false);
            setSaveStatus("idle");
            setSaveError(null);
            setEditingSupplier(supplier);
          }}
        />
      )}

      {editingSupplier && (
        <PriceEditSheet
          supplier={editingSupplier}
          currentPrice={editingPrice}
          status={saveStatus}
          error={saveError}
          onClose={() => {
            if (saveStatus !== "saving") {
              setEditingSupplier(null);
              setSaveStatus("idle");
              setSaveError(null);
            }
          }}
          onSave={handleSavePrice}
        />
      )}

      {historySupplier && sr && (
        <PriceHistorySheet
          supplier={historySupplier}
          status={history.status}
          error={history.error}
          entries={history.entries}
          onClose={closeHistory}
          onRetry={() => void history.load(sr, historySupplier.id)}
        />
      )}
    </div>
  );
}
