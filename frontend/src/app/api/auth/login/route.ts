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

    try {
      const backendRes = await fetch(`${ENV.BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken }),
        signal: AbortSignal.timeout(30000), // 30s max — Render cold start can take 30-50s
      });

      if (backendRes.ok) {
        const data = await backendRes.json();

        // Set backend-issued tokens
        if (data.accessToken) {
          cookieStore.set('access_token', data.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60, // 1 hour
          });
        }
        if (data.refreshToken) {
          cookieStore.set('refresh_token', data.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
          });
        }

        user = data.user ?? null;
      }
    } catch (backendErr) {
      console.error('[auth/login] Backend unavailable:', backendErr);
      return NextResponse.json(
        { error: 'Backend service unavailable. Please try again later.' },
        { status: 502 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication failed.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });

  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
