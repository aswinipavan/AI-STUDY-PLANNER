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

    try {
      const res = await fetch(`${ENV.BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 
          'Firebase-Token': firebaseToken,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Your sign-in session has expired. Please sign in again.' }, { status: 401 });
      }
      const data = await res.json();
      const jwtToken = data.data?.token ?? data.token ?? data.accessToken;
      if (!jwtToken) {
        return NextResponse.json({ error: 'Session refresh returned an invalid response.' }, { status: 502 });
      }

      cookieStore.set('access_token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    } catch (err) {
      console.error('[refresh] Backend refresh request failed:', err);
      return NextResponse.json({ error: 'Session refresh is temporarily unavailable. Please try again.' }, { status: 503 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[API Proxy Error /refresh]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
