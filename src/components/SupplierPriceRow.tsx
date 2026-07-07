import type { CurrentPrice, Supplier } from "@/types/purchasing";
import { formatDate, formatPrice } from "@/utils/format";

interface SupplierPriceRowProps {
  supplier: Supplier;
  price: CurrentPrice | undefined;
  onEdit: () => void;
  onHistory: () => void;
}

export function SupplierPriceRow({ supplier, price, onEdit, onHistory }: SupplierPriceRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-neutral-100 px-5 py-4 transition last:border-b-0 hover:bg-neutral-50/70">
      <button type="button" onClick={onEdit} className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-neutral-500">{supplier.name}</p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">
          {formatPrice(price?.price, price?.currency)}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">Updated {formatDate(price?.updatedAt)}</p>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center rounded-lg bg-brand-orange px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex min-h-10 items-center rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          History
        </button>
      </div>
    </div>
  );
}
