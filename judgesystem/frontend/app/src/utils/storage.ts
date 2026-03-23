/**
 * localStorage helpers.
 *
 * Duplicated in useAnnouncementListState and useBidListState -- consolidated here.
 */

/**
 * Safely read a JSON-serialised value from localStorage.
 *
 * Returns `defaultValue` when the key does not exist or the stored value
 * cannot be parsed.
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    /* ignore – corrupt / unavailable storage */
  }
  return defaultValue;
}

/**
 * Safely write a JSON-serialisable value to localStorage.
 *
 * Silently swallows errors (e.g. quota exceeded, private browsing).
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
