import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((db: unknown, path: string) => ({ db, path })),
  deleteDoc: vi.fn(),
  doc: vi.fn((db: unknown, path: string, id: string) => ({ db, path, id })),
  getDocs: vi.fn(),
  limit: vi.fn((count: number) => ({ type: "limit", count })),
  orderBy: vi.fn((field: string, direction?: string) => ({ type: "orderBy", field, direction })),
  query: vi.fn((source: unknown, ...constraints: unknown[]) => ({ source, constraints })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  updateDoc: vi.fn(),
  where: vi.fn((field: string, operator: string, value: unknown) => ({
    type: "where",
    field,
    operator,
    value,
  })),
  writeBatch: vi.fn(() => ({
    commit: vi.fn(),
    update: vi.fn(),
  })),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/firebase/client", () => ({ db: { name: "test-db" } }));

import {
  createSupplier,
  loadSuppliers,
  removeSupplier,
  updateSupplier,
} from "./supplierService";

interface FakeDocData {
  name?: string;
  displayOrder?: number;
  active?: boolean;
}

function docsSnap(docs: { id: string; data: FakeDocData }[]) {
  return {
    docs: docs.map((entry) => ({
      id: entry.id,
      data: () => entry.data,
    })),
    empty: docs.length === 0,
  };
}

describe("supplierService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads suppliers in displayOrder and filters inactive suppliers by default", async () => {
    firestoreMocks.getDocs.mockResolvedValue(
      docsSnap([
        { id: "a", data: { name: "A", displayOrder: 1, active: true } },
        { id: "b", data: { name: "B", displayOrder: 2, active: false } },
      ])
    );

    const suppliers = await loadSuppliers();

    expect(suppliers.map((supplier) => supplier.id)).toEqual(["a"]);
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith("displayOrder");
  });

  it("creates a supplier with the next displayOrder", async () => {
    firestoreMocks.getDocs.mockResolvedValue(
      docsSnap([{ id: "current-last", data: { displayOrder: 7 } }])
    );
    firestoreMocks.addDoc.mockResolvedValue({ id: "new-supplier" });

    await expect(createSupplier("  Metal House  ")).resolves.toBe("new-supplier");

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "suppliers" }),
      expect.objectContaining({
        name: "Metal House",
        displayOrder: 8,
        active: true,
        createdAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });

  it("updates supplier fields without accepting an empty name", async () => {
    await updateSupplier("supplier-1", { name: "  Updated  ", active: false });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "suppliers", id: "supplier-1" }),
      expect.objectContaining({
        name: "Updated",
        active: false,
        updatedAt: "SERVER_TIMESTAMP",
      })
    );

    await expect(updateSupplier("supplier-1", { name: " " })).rejects.toThrow(
      "Supplier name is required."
    );
  });

  it("deletes suppliers with no price records", async () => {
    firestoreMocks.getDocs.mockResolvedValue(docsSnap([]));

    await expect(removeSupplier("supplier-1")).resolves.toBe("deleted");

    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "suppliers", id: "supplier-1" })
    );
  });

  it("disables suppliers that have current or historical prices", async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce(
      docsSnap([{ id: "price-1", data: { displayOrder: 1 } }])
    );

    await expect(removeSupplier("supplier-1")).resolves.toBe("disabled");

    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "suppliers", id: "supplier-1" }),
      expect.objectContaining({ active: false })
    );
  });
});
