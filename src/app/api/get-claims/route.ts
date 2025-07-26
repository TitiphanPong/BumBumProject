// /app/api/get-claims/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbwzLBKwaHLOKVdEgAyNhdXev9otwQSpxun5GryMYt8UhApsG32qQE9t7qMn8B-2PqJknw/exec');
  const data = await res.json();
  return NextResponse.json(data);
}
