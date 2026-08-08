import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetchUpstream(requireEnv('GOOGLE_SCRIPT_URL'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        sheetName: body.sheetName || 'เบิกอะไหล่',
        action: 'delete', // ✅ สำคัญ เพื่อไม่ให้เข้า doPost()
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Failed to delete spare part');
  }
}
