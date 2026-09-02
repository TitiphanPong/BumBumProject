type ProductListRow = {
  name?: unknown;
  สินค้า?: unknown;
};

export async function fetchProductNames(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/get-productlist', { signal });
  if (!response.ok) throw new Error(`Product list request failed: ${response.status}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Product list response is not an array');

  return data
    .map(item => {
      if (!item || typeof item !== 'object') return '';
      const row = item as ProductListRow;
      const value = row['สินค้า'] ?? row.name;
      return typeof value === 'string' ? value.trim() : '';
    })
    .filter(Boolean);
}
