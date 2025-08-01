export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(process.env.GOOGLE_SCRIPT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        sheetName: body.sheetName || 'ใบเคลม',
        action: 'delete'  // ✅ สำคัญ เพื่อไม่ให้เข้า doPost()
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'ลบไม่สำเร็จ', message: error.message }), {
      status: 500,
    });
  }
}
