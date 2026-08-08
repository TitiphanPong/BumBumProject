import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const SHEET_NAME = process.env.DEFAULT_PART_SHEET ?? 'เบิกอะไหล่';

    const bodyWithSheet = {
      ...body,
      sheetName: body.sheetName || SHEET_NAME,
    };

    const res = await fetchUpstream(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithSheet),
    });

    const text = await res.text();
    return new Response(JSON.stringify({ message: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to submit part');
  }
}
