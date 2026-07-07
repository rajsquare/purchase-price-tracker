/**
 * Pure, UI-agnostic and Firestore-agnostic search types.
 *
 * This module has ZERO knowledge of React, the DOM, or Firebase.
 * It only knows about plain data: products in, ranked products out.
 */

/**
 * The minimum shape a product must have to be searchable.
 * Consumers (e.g. the Firestore product service) map their domain
 * model onto this shape before handing products to the search engine.
 */
export interface SearchableProduct {
  id: string;
  productName: string;
  material: string | null;
}

/**
 * A product augmented with precomputed search indexes.
 * Precomputing these once (at load/refresh time) instead of per-keystroke
 * is what keeps search over ~500 products feeling instantaneous, mirroring
 * the reference implementation's behavior.
 */
export interface IndexedProduct<T extends SearchableProduct = SearchableProduct> {
  product: T;
  /** normalize(`${productName} ${material ?? ""}`) */
  searchableText: string;
  /** tokenize(searchableText) */
  searchableTokens: string[];
}

export interface SearchProductsArgs<T extends SearchableProduct = SearchableProduct> {
  /** Raw, unprocessed text straight from the search input. */
  query: string;
  /** Products that have already been run through buildSearchIndex(). */
  products: IndexedProduct<T>[];
  /** Exact material to restrict results to, or null/undefined for no filter. */
  materialFilter?: string | null;
}

export const SEARCH_RESULT_LIMIT = 8;
export const SEARCH_DEBOUNCE_MS = 60;
