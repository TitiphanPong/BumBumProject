export async function GET(req: Request) {
  try {
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    const DEFAULT_PRICEPART_SHEET = process.env.DEFAULT_PRICEPART_SHEET || 'ราคาอะไหล่และมอเตอร์';

    if (!GOOGLE_SCRIPT_URL) {
      return new Response(JSON.stringify({ error: 'Missing GOOGLE_SCRIPT_URL in .env' }), {
        status: 500,
      });
    }

    // อ่าน query string จาก URL เช่น ?sheetName=xxxx
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get('sheetName') || DEFAULT_PRICEPART_SHEET;

    const fullUrl = `${GOOGLE_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`;
    const res = await fetch(fullUrl);

    if (!res.ok) {
      throw new Error(`Google Script responded with ${res.status}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch parts price', message: error.message }),
      { status: 500 }
    );
  }
}
