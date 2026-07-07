import { describe, expect, it } from "vitest";
import { calculateMargin, findLowestPurchasePrice } from "./margins";

describe("calculateMargin", () => {
  it("returns sellingPrice - purchasePrice", () => {
    expect(calculateMargin(100, 60)).toBe(40);
    expect(calculateMargin(60, 100)).toBe(-40);
  });

  it("returns null when there is no purchase price yet", () => {
    expect(calculateMargin(100, null)).toBeNull();
  });
});

describe("findLowestPurchasePrice", () => {
  it("returns the minimum price across entries", () => {
    expect(findLowestPurchasePrice([{ price: 120 }, { price: 80 }, { price: 95 }])).toBe(80);
  });

  it("returns null for an empty list", () => {
    expect(findLowestPurchasePrice([])).toBeNull();
  });

  it("handles a single entry", () => {
    expect(findLowestPurchasePrice([{ price: 42 }])).toBe(42);
  });
});
