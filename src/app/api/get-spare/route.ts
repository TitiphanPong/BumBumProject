export async function GET() {
  try {
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL!;
    const sheetName = process.env.DEFAULT_PART_SHEET || 'เบิกอะไหล่';

    const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch spare parts', message: error.message }),
      { status: 500 }
    );
  }
}
