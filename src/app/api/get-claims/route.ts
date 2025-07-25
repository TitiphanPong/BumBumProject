// /app/api/get-claims/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbxwONCRp_3HaD7jY6gmmJnUA9URki5c24d_2-v4KJUpNhmbNsUIEoYZ33-6ciarv4GGRw/exec');
  const data = await res.json();
  return NextResponse.json(data);
}
