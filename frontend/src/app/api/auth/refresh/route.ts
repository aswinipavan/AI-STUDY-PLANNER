import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ENV } from '@/constants/config';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Get Firebase token from request body (sent by frontend apiClient)
    const body = await request.json().catch(() => ({}));
    const firebaseToken = body.firebaseToken;

    if (!firebaseToken) {
      return NextResponse.json({ error: 'No Firebase token provided' }, { status: 401 });
    }

    const res = await fetch(`${ENV.BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Firebase-Token': firebaseToken,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    
    // Backend returns { token, student, isNewUser }
    const jwtToken = data.data?.token ?? data.token ?? data.accessToken;
    
    if (jwtToken) {
      cookieStore.set('access_token', jwtToken, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        path: '/',
        maxAge: 60 * 60, // 1 hour
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API Proxy Error /refresh]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
