import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';
import { buildUpstreamReadUrl } from '@/lib/upstream-query';

export async function GET(request: Request) {
  try {
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';

    const res = await fetchUpstream(buildUpstreamReadUrl(GOOGLE_SCRIPT_URL, sheetName, request));
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch spare parts');
  }
}
