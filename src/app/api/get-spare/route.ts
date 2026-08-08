import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function GET() {
  try {
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';

    const res = await fetchUpstream(
      `${GOOGLE_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`
    );
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch spare parts');
  }
}
