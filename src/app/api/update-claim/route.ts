import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  return handleSheetPostRequest(
    request,
    'ใบเคลม',
    'Failed to update claim',
    { action: 'update' },
    async response => {
      const result = await response.json();

      if (!result || typeof result !== 'object' || result.result !== 'success') {
        return Response.json({ error: 'Google Apps Script rejected the update' }, { status: 502 });
      }

      return Response.json(result);
    }
  );
}
