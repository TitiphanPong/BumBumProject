// app/api/update-claim/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL!;
    const SHEET_NAME = process.env.DEFAULT_PART_SHEET ?? 'เบิกอะไหล่';

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', // ✅ ต้องใช้ POST เท่านั้น
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        sheetName: body.sheetName || 'เบิกอะไหล่',
        action: 'update', // ✅ สำคัญ ต้องมีเพื่อให้เข้า doPut ใน Google Script
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to update claim',
        message: error.message,
      }),
      { status: 500 }
    );
  }
}
