import { beforeEach, describe, expect, it, vi } from "vitest";

const batchMocks = vi.hoisted(() => ({
  commit: vi.fn(),
  set: vi.fn(),
}));

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((db: unknown, path: string) => ({ db, path })),
  doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => ({
    path:
      segments.length > 0
        ? typeof first === "object" && first && "path" in first
          ? [first.path, ...segments].join("/")
          : segments.join("/")
        : `${typeof first === "object" && first && "path" in first ? first.path : String(first)}/auto-id`,
  })),
  getDocs: vi.fn(),
  orderBy: vi.fn((field: string, direction?: string) => ({ type: "orderBy", field, direction })),
  query: vi.fn((source: unknown, ...constraints: unknown[]) => ({ source, constraints })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  where: vi.fn((field: string, operator: string, value: unknown) => ({
    type: "where",
    field,
    operator,
    value,
  })),
  writeBatch: vi.fn(() => batchMocks),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/firebase/client", () => ({ db: { name: "test-db" } }));

import {
  currentPriceId,
  loadCurrentPricesForProduct,
  loadCurrentPricesForSupplier,
  loadPriceHistory,
  saveCurrentPrice,
  validatePriceValue,
} from "./priceService";

interface FakeDocData {
  productSr?: string;
  supplierId?: string;
  price?: number;
  currency?: string;
  remarks?: string;
  createdAt?: { toMillis: () => number };
}

function fakeTimestamp(millis: number) {
  return { toMillis: () => millis };
}

function docsSnap(docs: { id: string; data: FakeDocData }[]) {
  return {
    docs: docs.map((entry) => ({
      id: entry.id,
      data: () => entry.data,
    })),
  };
}

describe("priceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the approved currentPrices composite document id from sr + supplier", () => {
    expect(currentPriceId("SR-001", "supplier-1")).toBe("SR-001_supplier-1");
  });

  it("rejects empty, zero, negative, and non-finite prices", () => {
    expect(() => validatePriceValue(0)).toThrow("Price must be greater than zero.");
    expect(() => validatePriceValue(-1)).toThrow("Price must be greater than zero.");
    expect(() => validatePriceValue(Number.NaN)).toThrow("Price must be greater than zero.");
  });

  it("loads current prices for a product (by sr) without reading history", async () => {
    firestoreMocks.getDocs.mockResolvedValue(
      docsSnap([
        {
          id: "SR-001_supplier-1",
          data: {
            productSr: "SR-001",
            supplierId: "supplier-1",
            price: 120,
            currency: "INR",
            remarks: "fast",
          },
        },
      ])
    );

    const prices = await loadCurrentPricesForProduct("SR-001");

    expect(prices[0]?.price).toBe(120);
    expect(prices[0]?.productSr).toBe("SR-001");
    expect(firestoreMocks.where).toHaveBeenCalledWith("productSr", "==", "SR-001");
    expect(firestoreMocks.collection).toHaveBeenCalledWith({ name: "test-db" }, "currentPrices");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith(
      { name: "test-db" },
      "priceHistory"
    );
  });

  it("loads current prices for a supplier across all products (Supplier Search)", async () => {
    firestoreMocks.getDocs.mockResolvedValue(
      docsSnap([
        {
          id: "SR-001_supplier-1",
          data: { productSr: "SR-001", supplierId: "supplier-1", price: 120, currency: "INR" },
        },
        {
          id: "SR-002_supplier-1",
          data: { productSr: "SR-002", supplierId: "supplier-1", price: 80, currency: "INR" },
        },
      ])
    );

    const prices = await loadCurrentPricesForSupplier("supplier-1");

    expect(prices).toHaveLength(2);
    expect(firestoreMocks.where).toHaveBeenCalledWith("supplierId", "==", "supplier-1");
  });

  it("atomically updates currentPrices and appends priceHistory, keyed by productSr", async () => {
    await saveCurrentPrice({
      productSr: "SR-001",
      supplierId: "supplier-1",
      price: 145.5,
      currency: "INR",
      remarks: "Delivered",
    });

    expect(batchMocks.set).toHaveBeenCalledTimes(2);
    expect(batchMocks.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: "currentPrices/SR-001_supplier-1" }),
      expect.objectContaining({
        productSr: "SR-001",
        supplierId: "supplier-1",
        price: 145.5,
        currency: "INR",
        remarks: "Delivered",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
    expect(batchMocks.set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: "priceHistory/auto-id" }),
      expect.objectContaining({
        productSr: "SR-001",
        supplierId: "supplier-1",
        price: 145.5,
        effectiveDate: "SERVER_TIMESTAMP",
        enteredAt: "SERVER_TIMESTAMP",
        createdAt: "SERVER_TIMESTAMP",
      })
    );
    expect(batchMocks.commit).toHaveBeenCalledOnce();
  });

  it("loads history filtered by productSr and supplierId, without an orderBy (avoids requiring a composite index)", async () => {
    firestoreMocks.getDocs.mockResolvedValue(docsSnap([]));

    await loadPriceHistory("SR-001", "supplier-1");

    expect(firestoreMocks.where).toHaveBeenCalledWith("productSr", "==", "SR-001");
    expect(firestoreMocks.where).toHaveBeenCalledWith("supplierId", "==", "supplier-1");
    expect(firestoreMocks.orderBy).not.toHaveBeenCalled();
  });

  it("sorts history entries newest first client-side", async () => {
    firestoreMocks.getDocs.mockResolvedValue(
      docsSnap([
        {
          id: "older",
          data: {
            productSr: "SR-001",
            supplierId: "supplier-1",
            price: 100,
            createdAt: fakeTimestamp(1000),
          },
        },
        {
          id: "newest",
          data: {
            productSr: "SR-001",
            supplierId: "supplier-1",
            price: 130,
            createdAt: fakeTimestamp(3000),
          },
        },
        {
          id: "middle",
          data: {
            productSr: "SR-001",
            supplierId: "supplier-1",
            price: 120,
            createdAt: fakeTimestamp(2000),
          },
        },
      ])
    );

    const entries = await loadPriceHistory("SR-001", "supplier-1");

    expect(entries.map((entry) => entry.id)).toEqual(["newest", "middle", "older"]);
  });
});
