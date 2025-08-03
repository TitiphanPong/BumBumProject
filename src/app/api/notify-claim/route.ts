import dayjs from 'dayjs';

const provinceLineGroupMap: Record<string, string> = {
  "กรุงเทพฯ": process.env.LINE_GROUP_ID_BKK!,
  "อำนาจเจริญ": process.env.LINE_GROUP_ID_AMN!,
  "โคราช": process.env.LINE_GROUP_ID_KOR!,
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
      amount,
      serviceFeeDeducted,
      image,
      notifyType,
    } = body;

    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const GROUP_ID = provinceLineGroupMap[provinceName as string];

    if (!LINE_TOKEN) {
      return new Response(JSON.stringify({ error: 'LINE token not set' }), { status: 500 });
    }

    if (!GROUP_ID) {
    console.log('❌ Debug ก่อน return 400', {
      provinceName,
      notifyType,
      groupId: GROUP_ID,
      body,
    });

    return new Response(
      JSON.stringify({ error: `ไม่พบ groupId ของจังหวัด: ${provinceName}` }),
      { status: 400 }
    );
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

🧑‍🔧 ผู้เคลม: ${claimer}
🚙 พาหนะที่ใช้: ${vehicle}
🗓️ วันที่เคลม: ${formattedDate}

💰 จำนวนเงิน: ${amount}
💸 สถานะค่าบริการ: ${serviceFeeDeducted ? '✔️ หักแล้ว' : '❌ ยังไม่หัก'}
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

👨‍🔧 ผู้ตรวจสอบ: ${inspector || '-'}
🚙 พาหนะ: ${vehicle}
🗓️ วันที่ตรวจสอบ: ${formattedDate}
━━━━━━━━━━━━━━
🔗 ตรวจสอบสถานะ: https://claimsnprogress.vercel.app/
`.trim();
    } else {
      return new Response(
        JSON.stringify({ error: 'notifyType ไม่ถูกต้อง หรือไม่ได้ส่งมา' }),
        { status: 400 }
      );
    }

    const headers = {
      Authorization: `Bearer ${LINE_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // ✅ ส่งข้อความ LINE
    const textRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: GROUP_ID,
        messages: [{ type: 'text', text: textMessage }],
      }),
    });

    if (!textRes.ok) {
      const errorText = await textRes.text();
      throw new Error(`ส่งข้อความล้มเหลว: ${errorText}`);
    }

    // ✅ ส่งรูป LINE ถ้ามี
    if (image) {
      const images = Array.isArray(image) ? image : [image];
      for (const img of images) {
        if (img && typeof img === 'string') {
          const imgRes = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: GROUP_ID,
              messages: [
                {
                  type: 'image',
                  originalContentUrl: img,
                  previewImageUrl: img,
                },
              ],
            }),
          });

          if (!imgRes.ok) {
            const errorText = await imgRes.text();
            throw new Error(`ส่งรูปภาพล้มเหลว: ${errorText}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ LINE Notify Error:', err);
    return new Response(
      JSON.stringify({ error: 'LINE notify failed', message: err.message }),
      { status: 500 }
    );
  }
}
