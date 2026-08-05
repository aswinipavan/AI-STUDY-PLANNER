import { NextRequest, NextResponse } from 'next/server';
import { ENV } from '@/constants/config';

// Next.js 15+: dynamic route params are async — must be typed as Promise
async function handleProxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiPath = path.join('/');
  const token = request.cookies.get('access_token')?.value;

  const url = new URL(`${ENV.BACKEND_URL}/api/${apiPath}`);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host'); // prevent host mismatch on backend

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[API Proxy Error Catch-All]', error);
    return NextResponse.json({ error: 'Gateway Error' }, { status: 502 });
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
