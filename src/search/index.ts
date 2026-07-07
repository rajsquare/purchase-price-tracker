/**
 * Public entry point for the search engine.
 *
 * Everything in this module is pure and framework-agnostic:
 * no React, no DOM, no Firestore. It can be unit-tested in complete
 * isolation and reused from any UI layer.
 */
export { normalize } from "./normalize";
export { tokenize } from "./tokenize";
export { SYNONYMS, expandQuery } from "./synonyms";
export { levenshtein } from "./levenshtein";
export { tokenScore, scoreProduct } from "./scoring";
export { buildSearchIndex } from "./buildSearchIndex";
export { searchProducts } from "./searchProducts";
export {
  SEARCH_RESULT_LIMIT,
  SEARCH_DEBOUNCE_MS,
} from "./types";
export type {
  SearchableProduct,
  IndexedProduct,
  SearchProductsArgs,
} from "./types";
