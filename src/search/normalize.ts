/**
 * Text normalization, ported verbatim (behaviorally) from the reference
 * implementation's `normalize()`.
 *
 * Steps, in order:
 *   1. Coerce to string.
 *   2. Lowercase.
 *   3. Replace any run of non-word/non-space characters with a single space.
 *   4. Collapse repeated whitespace into a single space.
 *   5. Trim leading/trailing whitespace.
 */
export function normalize(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
