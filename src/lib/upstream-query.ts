const READ_QUERY_PARAMETERS = [
  'page',
  'limit',
  'id',
  'aggregate',
  'dateFrom',
  'dateTo',
  'claimerName',
  'search',
  'status',
  'inspectstatus',
  'provinceName',
  'customerName',
  'sort',
  'direction',
] as const;

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function buildUpstreamReadUrl(baseUrl: string, sheetName: string, request: Request): string {
  const incoming = new URL(request.url).searchParams;
  const outgoing = new URLSearchParams({ sheetName });

  for (const name of READ_QUERY_PARAMETERS) {
    const value = incoming.get(name);
    if (value !== null && value !== '') outgoing.set(name, value);
  }

  return `${baseUrl}?${outgoing.toString()}`;
}

export function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PaginatedResponse<T>>;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.page === 'number' &&
    typeof candidate.limit === 'number' &&
    typeof candidate.total === 'number' &&
    typeof candidate.totalPages === 'number'
  );
}
