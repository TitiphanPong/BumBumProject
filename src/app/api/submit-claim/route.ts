import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch('https://script.google.com/macros/s/AKfycbxwONCRp_3HaD7jY6gmmJnUA9URki5c24d_2-v4KJUpNhmbNsUIEoYZ33-6ciarv4GGRw/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Error sending to Google Apps Script:', error);
    return NextResponse.json({ error: 'ส่งข้อมูลผิดพลาด' }, { status: 500 });
  }
}