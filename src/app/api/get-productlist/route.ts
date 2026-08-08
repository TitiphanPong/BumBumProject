import { NextResponse } from 'next/server';
import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function GET() {
  try {
    const baseUrl = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_PRODUCTLIST_SHEET || 'รายการสินค้า';

    const fullUrl = `${baseUrl}?sheetName=${encodeURIComponent(sheetName)}`;

    const res = await fetchUpstream(fullUrl);

    const data: Array<Record<string, string>> = await res.json();

    const products = data.map(item => ({
      name: item['สินค้า'] || 'ไม่ทราบชื่อ',
    }));

    return NextResponse.json(products);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch product list');
  }
}
