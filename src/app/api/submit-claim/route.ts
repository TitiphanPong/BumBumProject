export async function POST(req: Request) {
  try {
    const body = await req.json();

    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL!;
    const SHEET_NAME = process.env.DEFAULT_CLAIM_SHEET ?? 'ใบเคลม';

    const bodyWithSheet = {
      ...body,
      sheetName: body.sheetName || SHEET_NAME,
      image: body.image || '',
    };

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithSheet),
    });

    const text = await res.text();
    return new Response(JSON.stringify({ message: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to submit claim', message: error.message }),
      { status: 500 }
    );
  }
}
