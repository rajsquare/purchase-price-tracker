import type { SupplierProductEntry } from "@/hooks/useSupplierProducts";
import type { Supplier } from "@/types/purchasing";
import { formatPrice } from "@/utils/format";

interface SupplierProductListProps {
  supplier: Supplier;
  status: "loading" | "ready" | "error";
  error: string | null;
  entries: SupplierProductEntry[];
  onBack: () => void;
  onSelectProduct: (entry: SupplierProductEntry) => void;
}

export function SupplierProductList({
  supplier,
  status,
  error,
  entries,
  onBack,
  onSelectProduct,
}: SupplierProductListProps) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        ‹ Suppliers
      </button>

      <h2 className="mt-4 text-xl font-semibold text-neutral-900">{supplier.name}</h2>

      {status === "loading" && (
        <p className="mt-6 text-center text-sm text-neutral-400">Loading products…</p>
      )}

      {status === "error" && (
        <p className="mt-6 text-center text-sm font-medium text-brand-red">{error}</p>
      )}

      {status === "ready" && entries.length === 0 && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          No products on file for this supplier yet.
        </p>
      )}

      {status === "ready" && entries.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <button
              key={entry.product.sr}
              type="button"
              onClick={() => onSelectProduct(entry)}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left shadow-card transition hover:border-brand-orange/30 hover:shadow-card-hover"
            >
              <span className="min-w-0 truncate text-base font-medium text-neutral-900">
                {entry.product.productName}
              </span>
              <span className="ml-3 shrink-0 text-lg font-semibold text-neutral-900">
                {formatPrice(entry.price.price, entry.price.currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
