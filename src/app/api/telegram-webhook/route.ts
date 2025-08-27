export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('📦 webhook:', JSON.stringify(body, null, 2));

    const message = body.message;
    if (message?.chat?.id && message?.text) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
        }),
      });
    }

    return new Response('OK'); // ✅ ตอบกลับเสมอ
  } catch (err) {
    console.error('❌ Error in Telegram Webhook:', err);
    return new Response('Ignored', { status: 200 });
  }
}
