import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(
      'https://script.google.com/macros/library/d/13unaeE6QwLOJlDJqDYfnLuN9KjZQzMr-M3j0XRbaimKJ4IWZPjTJGn8j/27',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();
    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Error sending to Google Apps Script:', error);
    return NextResponse.json({ error: 'ส่งข้อมูลผิดพลาด' }, { status: 500 });
  }
}
