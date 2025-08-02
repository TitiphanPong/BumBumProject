// app/line-webhook/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.events?.[0];
    const source = event?.source;

    const type = source?.type;
    const id = source?.userId || source?.groupId || source?.roomId;

    console.log('📩 LINE Webhook Event');
    console.log('🔍 Source Type:', type);
    console.log('🆔 Source ID:', id);

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('❌ Webhook Error:', err);
    return new Response('Error', { status: 500 });
  }
}
