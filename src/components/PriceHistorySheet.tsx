import type { PriceHistoryEntry, Supplier } from "@/types/purchasing";
import { formatDate, formatPrice } from "@/utils/format";

interface PriceHistorySheetProps {
  supplier: Supplier;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  entries: PriceHistoryEntry[];
  onClose: () => void;
  onRetry: () => void;
}

export function PriceHistorySheet({
  supplier,
  status,
  error,
  entries,
  onClose,
  onRetry,
}: PriceHistorySheetProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-neutral-900/40 backdrop-blur-[2px] sm:items-center">
      <button
        type="button"
        aria-label="Close price history"
        className="absolute inset-0"
        onClick={onClose}
      />

      <section className="relative max-h-[82vh] w-full overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-sheet sm:max-w-md sm:rounded-3xl">
        <div className="mx-auto h-full max-w-xl">
          <div className="border-b border-neutral-100 p-5">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-neutral-200 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-500">Price history</p>
                <h2 className="truncate text-xl font-semibold text-neutral-900">{supplier.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto p-5">
            {status === "loading" && <p className="text-sm text-neutral-500">Loading history…</p>}

            {status === "error" && (
              <div>
                <p className="text-sm font-medium text-brand-red">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-orange-dark"
                >
                  Retry
                </button>
              </div>
            )}

            {status === "ready" && entries.length === 0 && (
              <p className="text-sm text-neutral-500">No history yet.</p>
            )}

            {status === "ready" && entries.length > 0 && (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-semibold text-neutral-900">
                        {formatPrice(entry.price, entry.currency)}
                      </p>
                      <p className="text-right text-xs text-neutral-400">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    {entry.remarks && (
                      <p className="mt-2 text-sm text-neutral-500">{entry.remarks}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
