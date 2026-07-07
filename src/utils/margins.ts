/**
 * Margins are always computed on the fly from the current lowest purchase
 * price and the catalog's wholesale/retail prices. They are never stored.
 */
export function calculateMargin(sellingPrice: number, purchasePrice: number | null): number | null {
  if (purchasePrice === null) return null;
  return sellingPrice - purchasePrice;
}

export function findLowestPurchasePrice(prices: { price: number }[]): number | null {
  if (prices.length === 0) return null;
  return prices.reduce((lowest, entry) => Math.min(lowest, entry.price), Infinity);
}
