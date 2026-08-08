import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const SHEET_NAME = process.env.DEFAULT_CLAIM_SHEET ?? 'ใบเคลม';

    const bodyWithSheet = {
      ...body,
      sheetName: body.sheetName || SHEET_NAME,
      image: body.image || '',
    };

    const res = await fetchUpstream(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithSheet),
    });

    const text = await res.text();
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
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to submit claim');
  }
}
