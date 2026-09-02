import { fetchSheetJson } from '@/lib/sheet-upstream';
import { safeErrorResponse } from '@/lib/upstream';

export async function GET(request: Request) {
  try {
    const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';
    return Response.json(await fetchSheetJson(request, sheetName));
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch spare parts');
  }
}
