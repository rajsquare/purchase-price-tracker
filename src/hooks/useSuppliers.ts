import { useCallback, useEffect, useState } from "react";
import {
  createSupplier,
  loadSuppliers,
  moveSupplier,
  removeSupplier,
  updateSupplier,
} from "@/services/supplierService";
import type { Supplier } from "@/types/purchasing";

type SuppliersStatus = "loading" | "ready" | "error";

interface UseSuppliersResult {
  status: SuppliersStatus;
  error: string | null;
  suppliers: Supplier[];
  refresh: () => Promise<void>;
  create: (name: string) => Promise<void>;
  update: (supplierId: string, name: string) => Promise<void>;
  setActive: (supplierId: string, active: boolean) => Promise<void>;
  remove: (supplierId: string) => Promise<"deleted" | "disabled">;
  move: (supplierId: string, direction: "up" | "down") => Promise<void>;
}

export function useSuppliers(): UseSuppliersResult {
  const [status, setStatus] = useState<SuppliersStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setSuppliers(await loadSuppliers({ includeInactive: true }));
      setStatus("ready");
    } catch {
      setError("Failed to load suppliers.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string) => {
      await createSupplier(name);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (supplierId: string, name: string) => {
      await updateSupplier(supplierId, { name });
      await refresh();
    },
    [refresh]
  );

  const setActive = useCallback(
    async (supplierId: string, active: boolean) => {
      await updateSupplier(supplierId, { active });
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (supplierId: string) => {
      const result = await removeSupplier(supplierId);
      await refresh();
      return result;
    },
    [refresh]
  );

  const move = useCallback(
    async (supplierId: string, direction: "up" | "down") => {
      await moveSupplier(supplierId, direction);
      await refresh();
    },
    [refresh]
  );

  return { status, error, suppliers, refresh, create, update, setActive, remove, move };
}
