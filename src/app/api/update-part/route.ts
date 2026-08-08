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
        sheetName: body.sheetName || 'เบิกอะไหล่',
        action: 'update',
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to update spare part');
  }
}
