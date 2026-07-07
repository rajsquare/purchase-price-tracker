import type { Supplier } from "@/types/purchasing";

interface AddSupplierPricePickerProps {
  suppliers: Supplier[];
  onClose: () => void;
  onSelect: (supplier: Supplier) => void;
}

export function AddSupplierPricePicker({ suppliers, onClose, onSelect }: AddSupplierPricePickerProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-neutral-900/40 backdrop-blur-[2px] sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />

      <section className="relative max-h-[70vh] w-full overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-sheet sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto h-full max-w-xl">
          <div className="border-b border-neutral-100 p-5">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-neutral-200 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">Add supplier price</h2>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[54vh] overflow-y-auto p-5">
            {suppliers.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Every active supplier already has a price on file for this product.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {suppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => onSelect(supplier)}
                    className="min-h-14 rounded-xl border border-neutral-200 bg-white px-5 text-left text-base font-medium text-neutral-900 transition hover:border-brand-orange/40 hover:bg-brand-orange/5"
                  >
                    {supplier.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
