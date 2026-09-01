const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

export type PaginatedJsonResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortApplied?: string | null;
  directionApplied?: string | null;
  facets?: {
    provinces?: string[];
  };
};

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

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  attempts: number
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(input, { cache: 'no-store', ...init });

      if (response.ok) return response;

      const error = new Error(`Request failed with status ${response.status}`);
      const retryable = RETRYABLE_STATUS_CODES.has(response.status);
      if (!retryable || attempt === attempts - 1) throw error;
      lastError = error;
    } catch (error) {
      if (init.signal?.aborted) throw error;

      // Explicit HTTP errors above are retried only for 502/503/504.
      // Browser network failures are TypeError and are safe to retry.
      if (!(error instanceof TypeError) || attempt === attempts - 1) throw error;
      lastError = error;
    }

    await wait(750 * 2 ** attempt, init.signal ?? undefined);
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export async function fetchJsonArray<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  attempts = 3
): Promise<T[]> {
  const response = await fetchWithRetry(input, init, attempts);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid response: expected a list');
  return data as T[];
}

export async function fetchJsonPage<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  attempts = 3
): Promise<PaginatedJsonResponse<T>> {
  const response = await fetchWithRetry(input, init, attempts);
  const data: unknown = await response.json();

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected a paginated object');
  }

  const page = data as Partial<PaginatedJsonResponse<T>>;
  if (
    !Array.isArray(page.items) ||
    typeof page.page !== 'number' ||
    typeof page.limit !== 'number' ||
    typeof page.total !== 'number' ||
    typeof page.totalPages !== 'number'
  ) {
    throw new Error('Invalid response: expected paginated items');
  }

  return page as PaginatedJsonResponse<T>;
}
