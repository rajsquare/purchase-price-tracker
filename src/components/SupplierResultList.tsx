import type { Supplier } from "@/types/purchasing";

interface SupplierResultListProps {
  results: Supplier[];
  hasQuery: boolean;
  onSelect: (supplier: Supplier) => void;
}

export function SupplierResultList({ results, hasQuery, onSelect }: SupplierResultListProps) {
  if (!hasQuery) return null;

  if (results.length === 0) {
    return <p className="mt-6 text-center text-sm text-neutral-500">No suppliers found.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {results.map((supplier) => (
        <button
          key={supplier.id}
          type="button"
          onClick={() => onSelect(supplier)}
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left shadow-card transition hover:border-brand-orange/30 hover:shadow-card-hover"
        >
          <span className="text-base font-medium text-neutral-900">{supplier.name}</span>
          <span className="text-neutral-300">›</span>
        </button>
      ))}
    </div>
  );
}
