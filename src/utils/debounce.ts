/**
 * A minimal, generic trailing-edge debouncer.
 *
 * Returned function schedules `fn` to run `delayMs` after the last call;
 * every call resets the timer. `.cancel()` clears any pending invocation
 * without running it — used when a search box is cleared, matching the
 * reference implementation's immediate-clear-without-firing behavior.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): { (...args: Args): void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
