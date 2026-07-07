import { tokenize } from "./tokenize";

/**
 * Synonym map, ported verbatim from the reference implementation.
 *
 * NOTE: this is intentionally a direct, literal port. Entries are not
 * auto-symmetrized — a word only expands to what is explicitly listed
 * under its own key, exactly matching the reference behavior.
 */
export const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  bucket: ["balti", "baldi"],
  balti: ["bucket"],
  baldi: ["bucket"],
  thal: ["thaal", "thali", "thaali"],
  thaal: ["thal", "thali"],
  thali: ["thal", "thaal"],
  hammer: ["mathar"],
  mathar: ["hammer"],
  kansa: ["bronze"],
  bronze: ["kansa"],
  "k+p": ["kalai"],
  kalai: ["k+p"],
};

/**
 * Expands a raw query into a de-duplicated set of tokens: the query's own
 * tokens plus any synonyms registered for each of those tokens.
 * Ported verbatim (behaviorally) from the reference implementation's `expandQuery()`.
 */
export function expandQuery(query: string): string[] {
  const words = tokenize(query);
  const expanded: string[] = [...words];

  words.forEach((word) => {
    const syn = SYNONYMS[word];
    if (syn) {
      expanded.push(...syn);
    }
  });

  return [...new Set(expanded)];
}
