import { levenshtein } from "./levenshtein";
import type { IndexedProduct, SearchableProduct } from "./types";

/**
 * Scores how well a single query token matches a single product token.
 * Ported verbatim (behaviorally) from the reference implementation's `tokenScore()`.
 *
 * Thresholds, in priority order:
 *   - exact match                                   -> 100
 *   - product token starts with query token         ->  40
 *   - product token contains query token            ->  25
 *   - query token length <= 2                       ->   0 (no fuzzy match attempted)
 *   - levenshtein distance === 1                     ->  18
 *   - levenshtein distance === 2 AND query length >=5->  10
 *   - otherwise                                      ->   0
 */
export function tokenScore(queryToken: string, productToken: string): number {
  if (queryToken === productToken) {
    return 100;
  }

  if (productToken.startsWith(queryToken)) {
    return 40;
  }

  if (productToken.includes(queryToken)) {
    return 25;
  }

  if (queryToken.length <= 2) return 0;

  const distance = levenshtein(queryToken, productToken);

  if (distance === 1) {
    return 18;
  }

  if (distance === 2 && queryToken.length >= 5) {
    return 10;
  }

  return 0;
}

/**
 * Scores a single indexed product against the expanded query tokens and the
 * normalized raw query string.
 * Ported verbatim (behaviorally) from the reference implementation's `scoreProduct()`.
 *
 *   - exact full-text match against normalized query -> +500
 *   - normalized query is a substring of searchable text -> +120
 *   - for every expanded query token, add the single best tokenScore()
 *     found against any of the product's searchable tokens
 */
export function scoreProduct<T extends SearchableProduct>(
  indexed: IndexedProduct<T>,
  queryTokens: string[],
  normalizedRawQuery: string
): number {
  let score = 0;

  if (indexed.searchableText === normalizedRawQuery) {
    score += 500;
  }

  if (indexed.searchableText.includes(normalizedRawQuery)) {
    score += 120;
  }

  for (const queryToken of queryTokens) {
    let best = 0;

    for (const productToken of indexed.searchableTokens) {
      const s = tokenScore(queryToken, productToken);
      if (s > best) {
        best = s;
      }
    }

    score += best;
  }

  return score;
}
