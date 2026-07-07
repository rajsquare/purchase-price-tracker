import { normalize } from "./normalize";

/**
 * Splits normalized text into non-empty whitespace-separated tokens.
 * Ported verbatim (behaviorally) from the reference implementation's `tokenize()`.
 */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(Boolean);
}
