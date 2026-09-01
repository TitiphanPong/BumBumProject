import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';
import {
  buildUpstreamReadUrl,
  isClaimAggregateResponse,
  isPaginatedResponse,
} from '@/lib/upstream-query';

export async function GET(request: Request) {
  try {
    const GOOGLE_SCRIPT_URL = requireEnv('GOOGLE_SCRIPT_URL');
    const sheetName = process.env.DEFAULT_CLAIM_SHEET || 'ใบเคลม';
    const res = await fetchUpstream(buildUpstreamReadUrl(GOOGLE_SCRIPT_URL, sheetName, request));
    const data = await res.json();

    if (!Array.isArray(data) && !isPaginatedResponse(data) && !isClaimAggregateResponse(data)) {
      const detail =
        data && typeof data === 'object' && 'message' in data
          ? String(data.message)
          : 'Unexpected response shape';
      throw new Error(`Google Apps Script did not return supported claim data: ${detail}`);
    }

    return Response.json(data);
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to fetch claims');
  }
}
