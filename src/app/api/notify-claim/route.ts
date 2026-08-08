import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { formatClaimDateForDisplay } from '@/lib/claim-date';
import { isVideoUrl, toTelegramMediaUrl } from '@/lib/claim-media';

dayjs.extend(utc);
dayjs.extend(timezone);

const provinceTelegramGroupMap: Record<string, string> = {
  กรุงเทพฯ: process.env.TELEGRAM_GROUP_ID_BKK!,
  อำนาจเจริญ: process.env.TELEGRAM_GROUP_ID_AMN!,
  โคราช: process.env.TELEGRAM_GROUP_ID_KOR!,
};

const formatThaiDate = (dateString?: string) => {
  if (!dateString) return '-';
  return formatClaimDateForDisplay(dayjs(dateString).tz('Asia/Bangkok'));
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      provinceName,
      customerName,
      product,
      buyProductDate,
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
      address,
      phone,
    } = body;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const GROUP_ID = provinceTelegramGroupMap[provinceName as string];

    if (!TELEGRAM_BOT_TOKEN || !GROUP_ID) {
      return new Response(JSON.stringify({ error: 'Missing Telegram credentials or group ID' }), {
        status: 500,
      });
    }

    let textMessage = '';

    if (notifyType === 'แจ้งเคลมสินค้า') {
      const formattedDate = formatThaiDate(buyProductDate);
      textMessage = `
    🔔 แจ้งเคลมสินค้า
    ━━━━━━━━━━━━━━
    👤 ชื่อลูกค้า : ${customerName || '-'}
    📍 ที่อยู่ : ${address || '-'}
    📞 เบอร์โทร : ${phone || '-'}
    📦 สินค้า : ${product || '-'}
    🗓️ วันที่ซื้อ : ${formattedDate}
    🛡️ สถานะประกัน : ${warrantyStatus || '-'}
    🔎 ปัญหา : ${problemDetail}
    `.trim();
    } else if (notifyType === 'จบเคลม') {
      const formattedDate = formatThaiDate(claimDate);
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

      📌 หมายเหตุ: ${note}
      ━━━━━━━━━━━━━━
      🔗 ตรวจสอบสถานะ: https://claimsnprogress.vercel.app/
      `.trim();
    } else if (notifyType === 'จบการตรวจสอบ') {
      const formattedDate = formatThaiDate(inspectionDate);
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

      📌 หมายเหตุ: ${note}
      ━━━━━━━━━━━━━━
      🔗 ตรวจสอบสถานะ: https://claimsnprogress.vercel.app/
      `.trim();
    } else if (notifyType === 'อัปเดตรายการเคลม') {
      textMessage = `
      ✏️ อัปเดตรายการเคลม
      ━━━━━━━━━━━━━━
      🏬 สาขา: ${provinceName || '-'}
      👤 ลูกค้า: ${customerName || '-'}
      📦 สินค้า: ${product || '-'}
      🔎 ปัญหา: ${problemDetail || '-'}
      🛡️ สถานะประกัน: ${warrantyStatus || '-'}
      📍 ที่อยู่: ${address || '-'}
      📞 เบอร์โทร: ${phone || '-'}
      📌 หมายเหตุ: ${note || '-'}
      `.trim();
    } else {
      return new Response(JSON.stringify({ error: 'notifyType ไม่ถูกต้อง หรือไม่ได้ส่งมา' }), {
        status: 400,
      });
    }

    const messageRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          text: textMessage,
        }),
      }
    );

    const messageResult = await messageRes.json();
    if (!messageResult.ok) {
      console.error('❌ Telegram text error:', messageResult);
      throw new Error('ส่งข้อความ Telegram ล้มเหลว');
    }

    if (image) {
      const mediaFiles = (Array.isArray(image) ? image : [image]).filter(
        f => typeof f === 'string'
      );

      for (const fileUrl of mediaFiles) {
        if (fileUrl && typeof fileUrl === 'string') {
          const isVideo = isVideoUrl(fileUrl);
          const deliveryUrl = isVideo ? toTelegramMediaUrl(fileUrl) : fileUrl;

          const endpoint = isVideo
            ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`
            : `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

          const payload = {
            chat_id: GROUP_ID,
            [isVideo ? 'video' : 'photo']: deliveryUrl,
          };

          const mediaRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const mediaResult = await mediaRes.json();
          if (!mediaResult.ok) {
            console.error(`❌ Telegram ${isVideo ? 'video' : 'image'} error:`, mediaResult);
            const telegramDescription = mediaResult.description || 'Unknown Telegram error';
            throw new Error(
              `ส่ง${isVideo ? 'วิดีโอ' : 'รูป'} Telegram ล้มเหลว: ${telegramDescription}`
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('❌ Telegram Notify Error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return new Response(JSON.stringify({ error: 'Telegram notify failed', message }), {
      status: 500,
    });
  }
}
