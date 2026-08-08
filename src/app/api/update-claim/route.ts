import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');

    const res = await fetchUpstream(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        sheetName: body.sheetName || 'ใบเคลม',
        action: 'update',
      }),
    });

    const result = await res.json();

    if (!result || typeof result !== 'object' || result.result !== 'success') {
      return Response.json({ error: 'Google Apps Script rejected the update' }, { status: 502 });
    }

    return Response.json(result);
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to update claim');
  }
}
