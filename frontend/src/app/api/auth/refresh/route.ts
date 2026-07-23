import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ENV } from '@/constants/config';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const res = await fetch(`${ENV.BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Firebase-Token': refreshToken,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    
    cookieStore.set('access_token', data.accessToken, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict', 
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API Proxy Error /refresh]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
