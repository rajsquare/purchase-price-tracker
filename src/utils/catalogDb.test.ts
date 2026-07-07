import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { readCachedCatalog, writeCachedCatalog } from "./catalogDb";
import type { CatalogProduct } from "@/types/catalog";

const sampleProducts: CatalogProduct[] = [
  { id: "SR-001", sr: "SR-001", productName: "Brass Bowl", material: "Brass", priceType: null, wPrice: 100, rPrice: 150 },
];

describe("catalogDb", () => {
  beforeEach(async () => {
    // Each test gets a clean slate by deleting the database outright.
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("purchasePriceApp");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it("returns null when nothing has been cached yet", async () => {
    await expect(readCachedCatalog()).resolves.toBeNull();
  });

  it("round-trips a written catalog", async () => {
    const fetchedAt = Date.now();
    await writeCachedCatalog({ products: sampleProducts, fetchedAt });

    const result = await readCachedCatalog();
    expect(result).not.toBeNull();
    expect(result?.products).toEqual(sampleProducts);
    expect(result?.fetchedAt).toBe(fetchedAt);
  });

  it("overwrites the previous cache on subsequent writes (single record)", async () => {
    await writeCachedCatalog({ products: sampleProducts, fetchedAt: 1 });
    const updated: CatalogProduct[] = [
      { id: "SR-002", sr: "SR-002", productName: "Copper Pot", material: "Copper", priceType: null, wPrice: 200, rPrice: 260 },
    ];
    await writeCachedCatalog({ products: updated, fetchedAt: 2 });

    const result = await readCachedCatalog();
    expect(result?.products).toEqual(updated);
    expect(result?.fetchedAt).toBe(2);
  });
});
