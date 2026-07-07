import { normalize } from "./normalize";
import { tokenize } from "./tokenize";
import type { IndexedProduct, SearchableProduct } from "./types";

/**
 * Precomputes searchableText/searchableTokens for a list of products.
 *
 * This mirrors the reference implementation's approach of computing these
 * fields once when products are loaded (in `loadProducts()`), rather than
 * recomputing them on every keystroke. This is what makes searching ~500
 * products feel instantaneous.
 *
 * Call this once whenever the underlying product list changes (e.g. after
 * a Firestore fetch), and reuse the result across searches.
 */
export function buildSearchIndex<T extends SearchableProduct>(
  products: T[]
): IndexedProduct<T>[] {
  return products.map((product) => {
    const searchableText = normalize(`${product.productName} ${product.material ?? ""}`);

    return {
      product,
      searchableText,
      searchableTokens: tokenize(searchableText),
    };
  });
}
