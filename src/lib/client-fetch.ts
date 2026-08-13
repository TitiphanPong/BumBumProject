const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

const wait = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Request aborted', 'AbortError'));
      },
      { once: true }
    );
  });

export async function fetchJsonArray<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  attempts = 3
): Promise<T[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(input, { cache: 'no-store', ...init });

      if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === attempts - 1) {
          throw error;
        }
        lastError = error;
      } else {
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid response: expected a list');
        return data as T[];
      }
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }

    await wait(750 * 2 ** attempt, init.signal ?? undefined);
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}
