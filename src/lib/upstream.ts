// Google Apps Script can take longer to wake up after being idle.  The old
// 15-second timeout routinely aborted a healthy cold-start response.
const UPSTREAM_TIMEOUT_MS = 30_000;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export async function fetchUpstream(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    cache: init?.cache ?? 'no-store',
    signal: init?.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  return response;
}

export function safeErrorResponse(error: unknown, operation: string): Response {
  console.error(`[${operation}]`, error instanceof Error ? error.message : 'Unknown error');
  const status = error instanceof DOMException && error.name === 'TimeoutError' ? 504 : 502;
  return Response.json({ error: operation }, { status });
}
