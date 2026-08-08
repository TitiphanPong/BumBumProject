import { NextResponse } from 'next/server';
import { fetchUpstream, requireEnv, safeErrorResponse } from '@/lib/upstream';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetchUpstream(requireEnv('GOOGLE_SCRIPT_URL'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        sheetName: body.sheetName || process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่',
      }),
    });

    const text = await response.text();
    return NextResponse.json({ message: text });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to submit spare-part request');
  }
}
