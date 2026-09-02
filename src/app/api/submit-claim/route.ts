import { handleSheetPostRequest } from '@/lib/sheet-upstream';

export function POST(request: Request) {
  const sheetName = process.env.DEFAULT_CLAIM_SHEET ?? 'ใบเคลม';

  return handleSheetPostRequest(
    request,
    sheetName,
    'Failed to submit claim',
    body => ({ extra: { image: body.image || '' } }),
    async response => {
      const text = await response.text();
      let result: unknown;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error('Google Apps Script returned invalid JSON');
      }

      if (!result || typeof result !== 'object' || !('result' in result)) {
        throw new Error('Google Apps Script returned an invalid claim response');
      }
      if (result.result !== 'success') {
        return Response.json({ error: 'Google Apps Script rejected the claim' }, { status: 502 });
      }

      return Response.json(result);
    }
  );
}
