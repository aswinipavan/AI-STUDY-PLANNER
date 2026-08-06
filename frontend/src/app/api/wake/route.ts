import { NextResponse } from 'next/server';
import { ENV } from '@/constants/config';

/**
 * GET /api/wake
 * Pings the Render backend to wake it from cold start.
 * Call this on page load so the backend is warm by the time the user logs in.
 */
export async function GET() {
  try {
    const res = await fetch(`${ENV.BACKEND_URL}/actuator/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(50000), // 50s — Render cold start can be slow
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ status: 'awake', backend: data.status ?? 'UP' });
    }

    return NextResponse.json({ status: 'warming', message: 'Backend is starting up...' }, { status: 202 });
  } catch {
    return NextResponse.json({ status: 'sleeping', message: 'Backend is cold, please wait a moment.' }, { status: 503 });
  }
}
