// /app/api/notify-claim/route.ts

import dayjs from 'dayjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customerName,
      product,
      problemDetail,
      warrantyStatus,
      claimer,
      vehicle,
      claimDate,
      amount,
      serviceFeeDeducted,
    } = body;

    // ✅ แปลงวันที่ให้เป็นรูปแบบ วัน/เดือน/ปี
    const formattedDate = claimDate ? dayjs(claimDate).format('DD/MM/YYYY') : '-';

    const message = `
🎉 *สถานะการเคลม: เสร็จสิ้น!*
━━━━━━━━━━━━━━
👤 *ลูกค้า:* ${customerName}
📦 *สินค้า:* ${product}
🔍 *ปัญหา:* ${problemDetail}
🛡️ *ประกัน:* ${warrantyStatus}

🧑‍🔧 *ผู้เคลม:* ${claimer}
🚗 *พาหนะ:* ${vehicle}
🗓️ *วันที่เคลม:* ${formattedDate}

💰 *จำนวนเงิน:* ${amount}
💸 *ค่าบริการ:* ${serviceFeeDeducted ? '✔️ หักแล้ว' : '❌ ยังไม่หัก'}
━━━━━━━━━━━━━━
📢 สามารถเช็คได้ผ่านลิงค์ https://bum-bum-project.vercel.app/dashboard
`;

    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const GROUP_ID = process.env.LINE_GROUP_ID;

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: GROUP_ID,
        messages: [{ type: 'text', text: message }],
      }),
    });

    const result = await lineResponse.json();

    if (lineResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: result }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('❌ LINE Notify Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
