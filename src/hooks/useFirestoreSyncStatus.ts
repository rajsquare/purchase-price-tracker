import { useCallback, useEffect, useState } from "react";
import { checkFirestoreSync } from "@/services/syncService";

type SyncStatus = "checking" | "online" | "offline" | "error";

interface UseFirestoreSyncStatusResult {
  status: SyncStatus;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
}

export function useFirestoreSyncStatus(): UseFirestoreSyncStatusResult {
  const [status, setStatus] = useState<SyncStatus>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      setLastCheckedAt(Date.now());
      return;
    }

    setStatus("checking");

    try {
      await checkFirestoreSync();
      setStatus("online");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    } finally {
      setLastCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    void refresh();

    function handleChange() {
      void refresh();
    }

    window.addEventListener("online", handleChange);
    window.addEventListener("offline", handleChange);

    return () => {
      window.removeEventListener("online", handleChange);
      window.removeEventListener("offline", handleChange);
    };
  }, [refresh]);

  return { status, lastCheckedAt, refresh };
}
