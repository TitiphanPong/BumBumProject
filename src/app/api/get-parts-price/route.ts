import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function GET(req: Request) {
  try {
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const DEFAULT_PRICEPART_SHEET = process.env.DEFAULT_PRICEPART_SHEET || 'ราคาอะไหล่และมอเตอร์';

    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get('sheetName') || DEFAULT_PRICEPART_SHEET;

    const fullUrl = `${GOOGLE_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`;
    const res = await fetchUpstream(fullUrl);

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch parts price');
  }
}
