import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function GET() {
  try {
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_CLAIM_SHEET || 'ใบเคลม';
    const res = await fetchUpstream(
      `${GOOGLE_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`
    );
    const data = await res.json();

    if (!Array.isArray(data)) {
      const detail =
        data && typeof data === 'object' && 'message' in data
          ? String(data.message)
          : 'Unexpected response shape';
      throw new Error(`Google Apps Script did not return a claim list: ${detail}`);
    }

    return Response.json(data);
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch claims');
  }
}
