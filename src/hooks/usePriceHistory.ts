import { useCallback, useState } from "react";
import { loadPriceHistory } from "@/services/priceService";
import type { PriceHistoryEntry } from "@/types/purchasing";

type HistoryStatus = "idle" | "loading" | "ready" | "error";

interface UsePriceHistoryResult {
  status: HistoryStatus;
  error: string | null;
  entries: PriceHistoryEntry[];
  load: (productSr: string, supplierId: string) => Promise<void>;
  reset: () => void;
}

export function usePriceHistory(): UsePriceHistoryResult {
  const [status, setStatus] = useState<HistoryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);

  const load = useCallback(async (productSr: string, supplierId: string) => {
    setStatus("loading");
    setError(null);

    try {
      setEntries(await loadPriceHistory(productSr, supplierId));
      setStatus("ready");
    } catch {
      setError("Failed to load price history.");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setEntries([]);
  }, []);

  return { status, error, entries, load, reset };
}
