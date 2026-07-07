import { normalize } from "./normalize";
import { expandQuery } from "./synonyms";
import { scoreProduct } from "./scoring";
import { SEARCH_RESULT_LIMIT } from "./types";
import type { SearchableProduct, SearchProductsArgs } from "./types";

/**
 * Ranked full-text + fuzzy product search.
 *
 * Pure function: no DOM, no React, no Firestore. Give it products that have
 * already been run through `buildSearchIndex()`, a raw query string, and an
 * optional material filter — get back up to 8 ranked products.
 *
 * Behaviorally ported from the reference implementation's `searchProducts()`:
 *   1. Normalize the raw query; an empty result short-circuits to [].
 *   2. Expand the normalized query into synonym-augmented tokens.
 *   3. Score every product that passes the material filter.
 *   4. Keep only products with score > 0.
 *   5. Sort descending by score.
 *   6. Return the top SEARCH_RESULT_LIMIT (8) products.
 */
export function searchProducts<T extends SearchableProduct>({
  query,
  products,
  materialFilter,
}: SearchProductsArgs<T>): T[] {
  const clean = normalize(query);
  if (!clean) return [];

  const queryTokens = expandQuery(clean);
  const scored: { product: T; score: number }[] = [];

  for (const indexed of products) {
    if (materialFilter && indexed.product.material !== materialFilter) {
      continue;
    }

    const score = scoreProduct(indexed, queryTokens, clean);
    if (score > 0) {
      scored.push({ product: indexed.product, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, SEARCH_RESULT_LIMIT).map((entry) => entry.product);
}
