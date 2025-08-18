import dayjs from 'dayjs';

const provinceTelegramGroupMap: Record<string, string> = {
  "กรุงเทพฯ": process.env.TELEGRAM_GROUP_ID_BKK!,
  "อำนาจเจริญ": process.env.TELEGRAM_GROUP_ID_AMN!,
  "โคราช": process.env.TELEGRAM_GROUP_ID_KOR!,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      provinceName,
      customerName,
      product,
      problemDetail,
      warrantyStatus,
      claimer,
      inspector,
      vehicle,
      claimDate,
      inspectionDate,
      serviceFeeDeducted,
      image,
      notifyType,
      note,
    } = body;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const GROUP_ID = provinceTelegramGroupMap[provinceName as string];

    if (!TELEGRAM_BOT_TOKEN || !GROUP_ID) {
      return new Response(JSON.stringify({ error: 'Missing Telegram credentials or group ID' }), { status: 500 });
    }

    let textMessage = '';

    if (notifyType === 'จบเคลม') {
      const formattedDate = claimDate ? dayjs(claimDate).format('DD/MM/YYYY') : '-';
      textMessage = `
🎉 สถานะการเคลม: เสร็จสิ้น!
━━━━━━━━━━━━━━
🏬 สาขา: ${provinceName || '-'}
👤 ลูกค้า: ${customerName}
📦 สินค้า: ${product}
🔎 ปัญหา: ${problemDetail}
🛡️ สถานะประกัน: ${warrantyStatus}

🧑‍🔧 ผู้เคลม: ${claimer || '-'}
🚙 พาหนะที่ใช้: ${vehicle}
🗓️ วันที่เคลม: ${formattedDate}

💸 สถานะค่าบริการ: ${serviceFeeDeducted ? '✔️ หักแล้ว' : '❌ ยังไม่หัก'}

📌 หมายเหตุ: ${note || '-'}
━━━━━━━━━━━━━━
🔗 ตรวจสอบสถานะ: https://claimsnprogress.vercel.app/
`.trim();

    } else if (notifyType === 'จบการตรวจสอบ') {
      const formattedDate = inspectionDate ? dayjs(inspectionDate).format('DD/MM/YYYY') : '-';
      textMessage = `
📋 สถานะการตรวจสอบ: เสร็จสิ้น!
━━━━━━━━━━━━━━
🏬 สาขา: ${provinceName || '-'}
👤 ลูกค้า: ${customerName}
📦 สินค้า: ${product}
🔎 ปัญหา: ${problemDetail}
🛡️ สถานะประกัน: ${warrantyStatus}

👨‍🔧 ผู้ตรวจสอบ: ${inspector || '-'}
🚙 พาหนะที่ใช้: ${vehicle}
🗓️ วันที่ตรวจสอบ: ${formattedDate}

📌 หมายเหตุ: ${note || '-'}
━━━━━━━━━━━━━━
🔗 ตรวจสอบสถานะ: https://claimsnprogress.vercel.app/
`.trim();
    } else {
      return new Response(
        JSON.stringify({ error: 'notifyType ไม่ถูกต้อง หรือไม่ได้ส่งมา' }),
        { status: 400 }
      );
    }

    // ✅ ส่งข้อความ Telegram
    const messageRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text: textMessage,
      }),
    });

    const messageResult = await messageRes.json();
    if (!messageResult.ok) {
      console.error('❌ Telegram text error:', messageResult);
      throw new Error('ส่งข้อความ Telegram ล้มเหลว');
    }

    // ✅ ส่งรูป (ถ้ามี)
    if (image) {
      const images = Array.isArray(image) ? image : [image];
      for (const img of images) {
        if (img && typeof img === 'string') {
          const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: GROUP_ID,
              photo: img,
            }),
          });

          const photoResult = await photoRes.json();
          if (!photoResult.ok) {
            console.error('❌ Telegram image error:', photoResult);
            throw new Error('ส่งรูป Telegram ล้มเหลว');
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('❌ Telegram Notify Error:', err);
    return new Response(
      JSON.stringify({ error: 'Telegram notify failed', message: err.message }),
      { status: 500 }
    );
  }
}
