import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CurrentPrice, Supplier } from "@/types/purchasing";

interface PriceEditSheetProps {
  supplier: Supplier;
  currentPrice: CurrentPrice | undefined;
  status: "idle" | "saving" | "error";
  error: string | null;
  onClose: () => void;
  onSave: (price: number, remarks: string) => Promise<void>;
}

export function PriceEditSheet({
  supplier,
  currentPrice,
  status,
  error,
  onClose,
  onSave,
}: PriceEditSheetProps) {
  const [price, setPrice] = useState(currentPrice ? String(currentPrice.price) : "");
  const [remarks, setRemarks] = useState(currentPrice?.remarks ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSaving = status === "saving";

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numericPrice = Number(price);

    if (!price || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setLocalError("Enter a price greater than zero.");
      return;
    }

    setLocalError(null);
    await onSave(numericPrice, remarks);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-neutral-900/40 backdrop-blur-[2px] sm:items-center">
      <button
        type="button"
        aria-label="Close price editor"
        className="absolute inset-0"
        onClick={isSaving ? undefined : onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full rounded-t-3xl border border-neutral-200 bg-white p-5 shadow-sheet sm:max-w-md sm:rounded-3xl sm:p-6"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-neutral-200 sm:hidden" />
        <div className="mx-auto max-w-xl">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-neutral-500">Editing price for</p>
              <h2 className="truncate text-xl font-semibold text-neutral-900">{supplier.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <label className="block text-sm font-medium text-neutral-600" htmlFor="price-input">
            Price
          </label>
          <input
            id="price-input"
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={price}
            disabled={isSaving}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-4 text-2xl font-semibold text-neutral-900 outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60"
          />

          <label className="mt-4 block text-sm font-medium text-neutral-600" htmlFor="remarks-input">
            Remarks
          </label>
          <textarea
            id="remarks-input"
            value={remarks}
            disabled={isSaving}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60"
          />

          {(localError || error) && (
            <p className="mt-3 text-sm font-medium text-brand-red">{localError ?? error}</p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 min-h-12 w-full rounded-xl bg-brand-orange font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save price"}
          </button>
        </div>
      </form>
    </div>
  );
}
