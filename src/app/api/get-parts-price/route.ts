import { fetchSheetJson } from '@/lib/sheet-upstream';
import { safeErrorResponse } from '@/lib/upstream';

export async function GET(request: Request) {
  try {
    const defaultSheetName = process.env.DEFAULT_PRICEPART_SHEET || 'ราคาอะไหล่และมอเตอร์';
    const sheetName = new URL(request.url).searchParams.get('sheetName') || defaultSheetName;
    return Response.json(await fetchSheetJson(request, sheetName));
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch parts price');
  }
}
