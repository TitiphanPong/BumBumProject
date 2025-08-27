// /app/api/products-from-sheet/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.GOOGLE_SCRIPT_URL;
    const sheetName = process.env.DEFAULT_PRODUCTLIST_SHEET || 'รายการสินค้า';

    const fullUrl = `${baseUrl}?sheetName=${encodeURIComponent(sheetName)}`;

    const res = await fetch(fullUrl);

    if (!res.ok) {
      throw new Error(`Google Sheet API failed: ${res.status}`);
    }

    const data = await res.json();

    // ✅ แก้ตรงนี้ให้ใช้ key `name` เท่านั้น
    const products = data.map((item: any) => ({
      name: item['สินค้า'] || 'ไม่ทราบชื่อ',
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('[PRODUCTS_FROM_SHEET_ERROR]', error);
    return NextResponse.json({ error: 'โหลดข้อมูลสินค้าล้มเหลว' }, { status: 500 });
  }
}
