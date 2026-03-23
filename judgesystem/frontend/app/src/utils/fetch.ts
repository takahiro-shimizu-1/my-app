/**
 * Fetch helper with AbortController + timeout.
 *
 * The pattern (AbortController + 30 s timeout + AbortError handling) was
 * duplicated across useProgressingCompanies and useRelatedAnnouncements.
 * This utility consolidates it into a single reusable function.
 */

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Wrapper around the native `fetch` that automatically aborts after a timeout.
 *
 * @param url      - The resource URL.
 * @param options  - Standard `RequestInit` options. If `signal` is provided it
 *                   will be respected (the request aborts on *either* the
 *                   caller's signal or the timeout).
 * @param timeoutMs - Timeout in milliseconds (default 30 000).
 * @returns A `Response` promise that rejects with an `AbortError` on timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If the caller already supplied a signal, forward its abort.
  if (options?.signal) {
    const externalSignal = options.signal;
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check whether an error is an `AbortError` (timeout or manual cancellation).
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
