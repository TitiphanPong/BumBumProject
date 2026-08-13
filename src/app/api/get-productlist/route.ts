import { NextResponse } from 'next/server';
import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';
import { buildUpstreamReadUrl, isPaginatedResponse } from '@/lib/upstream-query';

export async function GET(request: Request) {
  try {
    const baseUrl = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_PRODUCTLIST_SHEET || 'รายการสินค้า';

    const fullUrl = buildUpstreamReadUrl(baseUrl, sheetName, request);

    const res = await fetchUpstream(fullUrl);

    const data: unknown = await res.json();

    const toProduct = (item: Record<string, string>) => ({
      name: item['สินค้า'] || 'ไม่ทราบชื่อ',
    });

    if (Array.isArray(data)) return NextResponse.json(data.map(toProduct));
    if (isPaginatedResponse<Record<string, string>>(data)) {
      return NextResponse.json({ ...data, items: data.items.map(toProduct) });
    }

    throw new Error('Google Apps Script did not return a product list');
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch product list');
  }
}
