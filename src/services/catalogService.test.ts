import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  doc: vi.fn((db: unknown, ...segments: string[]) => ({ db, path: segments.join("/") })),
}));

const priceListClientMocks = vi.hoisted(() => ({
  ensurePriceListSession: vi.fn().mockResolvedValue(undefined),
  priceListDb: { name: "price-list-db" },
}));

const catalogDbMocks = vi.hoisted(() => ({
  readCachedCatalog: vi.fn(),
  writeCachedCatalog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/firebase/priceListClient", () => priceListClientMocks);
vi.mock("@/utils/catalogDb", () => catalogDbMocks);

import { CatalogUnavailableError, loadCatalog, refreshCatalog } from "./catalogService";

function fakeSnap(products: unknown[]) {
  return { exists: () => true, data: () => ({ products }) };
}

const rawA = { sr: "SR-001", productName: "Brass Bowl", material: "Brass", priceType: "wholesale", wPrice: 100, rPrice: 150 };
const rawB = { sr: "SR-002", productName: "Copper Pot", material: "Copper", priceType: "wholesale", wPrice: 200, rPrice: 260 };

describe("catalogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogDbMocks.writeCachedCatalog.mockResolvedValue(undefined);
  });

  it("performs exactly one Firestore document read against catalog/current", async () => {
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA]));

    await loadCatalog();

    expect(firestoreMocks.getDoc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.doc).toHaveBeenCalledWith(priceListClientMocks.priceListDb, "catalog", "current");
  });

  it("maps products, always setting id = sr, and drops entries with no sr", async () => {
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA, { productName: "No serial" }]));

    const result = await loadCatalog();

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({ id: "SR-001", sr: "SR-001", wPrice: 100, rPrice: 150 });
    expect(result.isFromCache).toBe(false);
  });

  it("accepts sr stored as a Firestore number instead of a string, rather than silently discarding the product", async () => {
    firestoreMocks.getDoc.mockResolvedValue(
      fakeSnap([{ ...rawA, sr: 1001, productName: "Numeric SR product" }])
    );

    const result = await loadCatalog();

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({ id: "1001", sr: "1001" });
  });

  it("writes the freshly fetched catalog to the local cache", async () => {
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA]));

    await loadCatalog();

    expect(catalogDbMocks.writeCachedCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ products: expect.arrayContaining([expect.objectContaining({ sr: "SR-001" })]) })
    );
  });

  it("falls back to the IndexedDB cache when the remote read fails", async () => {
    firestoreMocks.getDoc.mockRejectedValue(new Error("offline"));
    catalogDbMocks.readCachedCatalog.mockResolvedValue({
      products: [{ id: "SR-001", sr: "SR-001", productName: "Brass Bowl", material: "Brass", priceType: null, wPrice: 100, rPrice: 150 }],
      fetchedAt: 123,
    });

    const result = await loadCatalog();

    expect(result.isFromCache).toBe(true);
    expect(result.products).toHaveLength(1);
  });

  it("throws CatalogUnavailableError when the remote read fails and there is no cache", async () => {
    firestoreMocks.getDoc.mockRejectedValue(new Error("offline"));
    catalogDbMocks.readCachedCatalog.mockResolvedValue(null);

    await expect(loadCatalog()).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it("refreshCatalog performs one more read and reports changed:false when identical", async () => {
    catalogDbMocks.readCachedCatalog.mockResolvedValue({ products: [rawA].map((p) => ({ ...p, id: p.sr })), fetchedAt: 1 });
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA]));

    const result = await refreshCatalog();

    expect(firestoreMocks.getDoc).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(false);
  });

  it("refreshCatalog reports changed:true when the catalog is different", async () => {
    catalogDbMocks.readCachedCatalog.mockResolvedValue({ products: [{ ...rawA, id: rawA.sr }], fetchedAt: 1 });
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA, rawB]));

    const result = await refreshCatalog();

    expect(result.changed).toBe(true);
    expect(result.products).toHaveLength(2);
  });

  it("signs in to the Price List project before reading the catalog", async () => {
    firestoreMocks.getDoc.mockResolvedValue(fakeSnap([rawA]));

    await loadCatalog();

    expect(priceListClientMocks.ensurePriceListSession).toHaveBeenCalled();
  });
});
