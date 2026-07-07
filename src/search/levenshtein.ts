/**
 * Levenshtein (edit) distance between two strings.
 *
 * Behaviorally identical to the reference implementation, including its
 * early-exit optimization: if the two strings' lengths differ by more than
 * 2, the function short-circuits and returns 3 (an arbitrary "too far to
 * matter" sentinel) rather than computing the real distance. This matches
 * the reference's scoring thresholds, which never care about distances
 * greater than 2 anyway.
 *
 * Implemented as a pure function (no shared mutable buffers) — at the
 * token lengths involved here (a handful of characters), the reference's
 * buffer-reuse micro-optimization has no observable behavioral effect,
 * and a pure function is easier to test and reason about.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;

  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > 2) return 3;

  let prev = new Array<number>(aLen + 1);
  let curr = new Array<number>(aLen + 1);

  for (let j = 0; j <= aLen; j++) prev[j] = j;

  for (let i = 1; i <= bLen; i++) {
    curr[0] = i;
    const bChar = b.charCodeAt(i - 1);

    for (let j = 1; j <= aLen; j++) {
      curr[j] =
        a.charCodeAt(j - 1) === bChar
          ? prev[j - 1]!
          : 1 + Math.min(prev[j - 1]!, curr[j - 1]!, prev[j]!);
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[aLen]!;
}
