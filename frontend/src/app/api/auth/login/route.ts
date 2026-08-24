import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ENV } from '@/constants/config';
import { z } from 'zod';
import rateLimit from '@/lib/rateLimit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

const loginSchema = z.object({
  firebaseToken: z.string().min(10, "Token is too short").max(4096, "Token is too long"),
});

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    try {
      await limiter.check({ setHeader: () => {} }, 10, `login_${ip}`); // 10 requests per minute
    } catch {
      return NextResponse.json({ error: 'Too many requests, please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload format', details: result.error.format() }, { status: 400 });
    }
    
    const { firebaseToken } = result.data;

    const cookieStore = await cookies();

    // ── Try to exchange the token with the backend ──────────────────────────
    let user: Record<string, unknown> | null = null;
    const backendUrl = ENV.BACKEND_URL;

    console.log('[auth/login] Backend URL:', backendUrl);

    try {
      const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken }),
        signal: AbortSignal.timeout(30000), // 30s max — Render cold start can take 30-50s
      });

      console.log('[auth/login] Backend response status:', backendRes.status);

      if (backendRes.ok) {
        const data = await backendRes.json();
        console.log('[auth/login] Backend response data keys:', Object.keys(data));

        // Backend returns ApiResponse<AuthResponse>:
        // { success: true, data: { token: "...", student: {...}, isNewUser: false } }
        const authData = data.data ?? data; // handle both wrapped and unwrapped responses

        // Set the backend JWT token as an httpOnly cookie
        const jwtToken = authData.token ?? authData.accessToken;
        if (jwtToken) {
          cookieStore.set('access_token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24, // 24h — matches backend jwt.expiration (86400000ms) and the refresh route
          });
          console.log('[auth/login] JWT token cookie set');
        }

        // student field from backend
        user = authData.student ?? authData.user ?? null;
        console.log('[auth/login] User extracted:', user ? 'YES' : 'NO');
      } else {
        // Backend returned non-ok status - log the error
        const errorText = await backendRes.text();
        console.error('[auth/login] Backend returned error:', backendRes.status, errorText);
        
        // Return the backend error to help diagnose
        return NextResponse.json(
          { 
            error: 'Backend authentication failed', 
            backendStatus: backendRes.status,
            backendError: errorText.substring(0, 200) // Limit error text
          },
          { status: backendRes.status }
        );
      }
    } catch (backendErr) {
      console.error('[auth/login] Backend authentication request failed:', backendErr);
      return NextResponse.json(
        { error: 'Backend authentication is temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    if (!user) {
      console.error('[auth/login] User is null after backend call - this should not happen');
      return NextResponse.json(
        { error: 'Authentication failed - user data not received from backend.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });


  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
