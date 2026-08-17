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

    let jwtToken = null;
    try {
      const res = await fetch(`${ENV.BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Firebase-Token': firebaseToken,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        jwtToken = data.data?.token ?? data.token ?? data.accessToken;
      }
    } catch (err) {
      console.warn('[refresh] Backend refresh error, using Firebase token fallback:', err);
    }
    
    // Use either backend JWT token or fresh Firebase token
    const tokenToSet = jwtToken || firebaseToken;
    if (tokenToSet) {
      cookieStore.set('access_token', tokenToSet, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[API Proxy Error /refresh]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
